'use client';

// SocialHub decide contexto, pesquisa e aprovação. O Studio só recebe o
// roteiro editorial já aprovado para edição visual e exportação.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { ArrowRight, CalendarClock, Camera, CheckCircle2, ChevronLeft, ExternalLink, FileText, ImagePlus, Loader2, PanelLeft, RotateCcw, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { removeTempMedia, uploadTempMedia } from '@/lib/posts-media';
import { deleteComposerDraft, saveDraft } from '@/lib/posts-actions';
import { gptUrl, headlinePrompt } from '@/lib/carrossel-gpts';
import { legendaDoRoteiro } from '@/lib/carrossel-legenda';
import { preparePastedCarouselScript, serializeCarouselBrief } from '@/lib/carrossel-script-import';
import { GENERIC_AVOID, imageHintsForBlocks, imageHintsForSlides } from '@/lib/carrossel-image-hint';
import { TIPO_PADRAO, templateDoTipo } from '@/lib/carrossel-tipos';
import { assuntoParaEntrada } from '@/lib/carrossel-assuntos';
import { MascotTip } from '@/components/onboarding/MascotTip';
import { CarouselStudioFrame } from './CarouselStudioFrame';
import { IdeiaWizard } from './IdeiaWizard';
import { StudioStepper, currentStudioStep } from './StudioStepper';

function dataUrlToFile(dataUrl, name) {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(header)?.[1] || 'image/png';
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) buffer[index] = bytes.charCodeAt(index);
  return new File([buffer], name, { type: mime });
}

function sourceList(sources) {
  if (!sources?.length) return null;
  return <ul className="mt-2 list-inside list-disc text-muted">
    {sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="underline">{source.title}</a></li>)}
  </ul>;
}

// Uma chamada editorial custa entre 25 e 31 segundos medidos, e `runSkill`
// ainda pode tentar de novo — o teto real passa de um minuto. O limite antigo
// era 65s, então toda segunda tentativa virava "demorou mais que o esperado" e
// escondia o erro de verdade. 120s cobre as duas tentativas com folga.
const EDITORIAL_TIMEOUT_MS = 120_000;

// Silêncio de meio minuto parece travamento. Estas falas não são estimativa
// inventada: são os tempos que medimos.
const EDITORIAL_PROGRESS = [
  [12_000, 'Escrevendo… costuma levar uns 30 segundos.'],
  [40_000, 'Passou do normal. A IA está numa segunda tentativa.'],
  [80_000, 'Ainda esperando o modelo responder.']
];

const STEP_LABEL = {
  cover: 'Capa',
  traction: 'Chamar atenção',
  context: 'Explicar o problema',
  teach: 'Ensinar',
  apply: 'Mostrar como fazer',
  recap: 'Resumo',
  cta: 'Próximo passo'
};

export function CarouselStudioClient({
  brandId, brand, draft, initialContentType = null, initialTemplateId = null,
  // Controle que o Composer injeta no começo desta barra (o seletor de
  // formato). Ele vinha numa faixa própria logo acima, e duas faixas de cromo
  // seguidas comiam a altura que faltava para a arte 1080×1350 aparecer.
  leading = null,
  embedded = false, onClose
}) {
  const router = useRouter();
  const editorial = draft?.editorial || null;
  const [doc, setDoc] = useState(draft?.doc || null);
  const [draftId, setDraftId] = useState(draft?.id || null);
  const [, setMediaUrls] = useState(draft?.mediaUrls || []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [topic, setTopic] = useState('');
  const [sourceMaterial, setSourceMaterial] = useState('');
  // Qual dos 8 tipos de carrossel será gerado. Rascunho salvo manda primeiro;
  // depois vem o tipo que a URL pediu (atalho da Visão geral, Biblioteca); e o
  // padrão é o carro-chefe de tendência, que alcança quem ainda não segue.
  const [contentType, setContentType] = useState(editorial?.contentType || initialContentType || TIPO_PADRAO);
  const [entryMode, setEntryMode] = useState(editorial?.source === 'pasted-script' ? 'paste' : 'ai');
  // Qual pergunta da etapa "Ideia" está na tela. Uma por vez: tipo, depois
  // assunto. Promessa e roteiro se deduzem do que a IA já devolveu.
  const [ideiaEtapa, setIdeiaEtapa] = useState('tipo');
  // De onde vem o assunto: busca do Hub, material da pessoa, ou escrito à mão.
  const [modoAssunto, setModoAssunto] = useState('buscar');
  const [material, setMaterial] = useState('');
  // Assuntos pesquisados na hora — acontecimentos com fonte e data, não dica de
  // conteúdo. Ficam aqui e não numa tela à parte: quem está montando o carrossel
  // não deveria ter que sair, copiar e voltar.
  const [assuntos, setAssuntos] = useState(null);
  const [assuntoEscolhidoId, setAssuntoEscolhidoId] = useState(null);
  const [assuntosBusy, setAssuntosBusy] = useState(false);
  // Erro da busca fica ao lado do botão, e não só na barra do topo: quem clica
  // está olhando para o botão, e uma frase cinza a uma tela de distância fazia
  // a falha parecer que o clique não fez nada.
  const [assuntosErro, setAssuntosErro] = useState('');
  const [pastedScript, setPastedScript] = useState(editorial?.rawScript || '');
  const [directions, setDirections] = useState(editorial?.directions || null);
  const [brief, setBrief] = useState(editorial?.brief || null);
  const [sources, setSources] = useState(editorial?.sources || []);
  const [selectedHeadlineId, setSelectedHeadlineId] = useState(editorial?.selectedHeadlineId || null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [approvedEditorial, setApprovedEditorial] = useState(editorial);
  const [briefMedia, setBriefMedia] = useState(Array.isArray(editorial?.media) ? editorial.media : []);
  const [imageBusyOrder, setImageBusyOrder] = useState(null);
  const [initialScript, setInitialScript] = useState(scriptForEditorial(editorial));
  const [initialSlideCount, setInitialSlideCount] = useState(slideCountForEditorial(editorial));
  const [studioKey, setStudioKey] = useState(0);
  const [editorialOpen, setEditorialOpen] = useState(!editorial?.approvedAt);
  const [showEntry, setShowEntry] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const changeTimer = useRef(null);
  // Último documento que chegou do Studio e ainda não foi gravado.
  const docPendente = useRef(null);
  const saveChain = useRef(Promise.resolve());
  const draftIdRef = useRef(draft?.id || null);
  const mediaUrlsRef = useRef(draft?.mediaUrls || []);
  const briefRequest = useRef(null);

  useEffect(() => () => {
    clearTimeout(changeTimer.current);
    briefRequest.current?.abort();
  }, []);

  // A guia cobre parte do canvas. Esc é o gesto que qualquer pessoa tenta para
  // tirar um painel da frente — sem isso só o botão da barra fecha.
  useEffect(() => {
    if (!editorialOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') setEditorialOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editorialOpen]);

  function saveEditorDoc(nextDoc, nextMediaUrls = mediaUrlsRef.current, nextEditorial = approvedEditorial) {
    const save = async () => {
      // A legenda do post é a que o roteiro escreveu para o feed. A manchete da
      // capa só entra como reserva, para o carrossel montado à mão.
      const reserva = firstHeadline(nextDoc) || nextDoc?.name || nextEditorial?.headline || 'Rascunho de carrossel';
      const { caption, hashtags } = legendaDoRoteiro(nextEditorial, reserva);
      const result = await saveDraft({
        brandId,
        draftId: draftIdRef.current,
        caption,
        hashtags,
        imageUrls: nextMediaUrls,
        format: 'carousel',
        // Autosave não revalida rota: revalidar remonta o <iframe> do editor e
        // a arte pisca no meio da edição. Ver o comentário em saveDraft.
        revalidate: false,
        editorState: {
          source: 'carrossel-studio',
          version: 1,
          doc: nextDoc,
          ...(nextEditorial ? { editorial: nextEditorial } : {})
        }
      });
      if (result?.error) throw new Error(result.error);
      const nextId = result?.id || draftIdRef.current;
      if (nextId) {
        draftIdRef.current = nextId;
        setDraftId(nextId);
      }
      mediaUrlsRef.current = nextMediaUrls;
      setMediaUrls(nextMediaUrls);
      setSavedAt(new Date());
      return { draftId: nextId };
    };
    const queued = saveChain.current.then(save, save);
    saveChain.current = queued.catch(() => {});
    return queued;
  }

  function handleChange(nextDoc) {
    setDoc(nextDoc);
    docPendente.current = nextDoc;
    clearTimeout(changeTimer.current);
    return new Promise((resolve, reject) => {
      changeTimer.current = setTimeout(() => {
        docPendente.current = null;
        saveEditorDoc(nextDoc).then(resolve, reject);
      }, 700);
    });
  }

  // O autosave junta as mudanças por 700ms antes de gravar. Fechar a aba nesse
  // intervalo levava a última edição junto. Quando a página some de vista, a
  // espera acaba na hora e o que está pendente vai para o banco.
  useEffect(() => {
    function gravarPendente() {
      const pendente = docPendente.current;
      if (!pendente) return;
      docPendente.current = null;
      clearTimeout(changeTimer.current);
      saveEditorDoc(pendente).catch(() => {});
    }
    function aoEsconder() {
      if (document.visibilityState === 'hidden') gravarPendente();
    }
    document.addEventListener('visibilitychange', aoEsconder);
    window.addEventListener('pagehide', gravarPendente);
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder);
      window.removeEventListener('pagehide', gravarPendente);
    };
  });

  async function handleExport(images, exportedDoc) {
    clearTimeout(changeTimer.current);
    setBusy(true);
    setMessage(`Subindo ${images.length} slides…`);
    try {
      const supabase = createClient();
      const urls = [];
      for (const [index, image] of images.entries()) {
        setMessage(`Subindo slide ${index + 1} de ${images.length}…`);
        const { publicUrl } = await uploadTempMedia(supabase, brandId, dataUrlToFile(image.dataUrl, image.name));
        urls.push(publicUrl);
      }
      setMessage('Salvando rascunho…');
      await saveChain.current;
      const saved = await saveEditorDoc(exportedDoc, urls);
      setDoc(exportedDoc);
      // "Usar no post" terminava com uma mensagem e a pessoa parada no editor,
      // sem saber para onde ir. Agora ela cai na tela de revisão do próprio
      // post, que é onde se aprova, escolhe o dia e a hora — ou se decide que
      // ainda não.
      const postId = saved?.draftId || draftIdRef.current;
      if (postId) {
        setMessage(`${urls.length} slides prontos. Abrindo a revisão para você aprovar…`);
        router.push(`/content/${postId}/review`);
        return;
      }
      setMessage(`${urls.length} slides no rascunho. Ele está no Calendário, em "Sem data ainda".`);
    } catch (error) {
      setMessage(error.message || 'Falha ao enviar para o post.');
    } finally {
      setBusy(false);
    }
  }

  async function handleMediaUpload(file) {
    const supabase = createClient();
    const uploaded = await uploadTempMedia(supabase, brandId, file);
    return {
      url: uploaded.publicUrl,
      path: uploaded.path,
      kind: file.type === 'application/zip' ? 'archive' : file.type.startsWith('video/') ? 'video' : 'image',
      name: file.name
    };
  }

  async function handleMediaDelete(path) {
    return removeTempMedia(createClient(), [path]);
  }

  async function requestEditorial(stage, extra = {}) {
    const controller = new AbortController();
    briefRequest.current = controller;
    const requestTimeout = window.setTimeout(() => controller.abort(), EDITORIAL_TIMEOUT_MS);
    const progressTimers = EDITORIAL_PROGRESS.map(([delay, text]) => window.setTimeout(() => setMessage(text), delay));
    try {
      const response = await fetch('/api/carrossel/brief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brandId, contentType, topic: topic.trim(), sourceMaterial: sourceMaterial.trim(), stage, ...extra }),
        signal: controller.signal
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || 'Não foi possível preparar o material editorial.');
      return result;
    } finally {
      window.clearTimeout(requestTimeout);
      progressTimers.forEach((timer) => window.clearTimeout(timer));
      if (briefRequest.current === controller) briefRequest.current = null;
    }
  }

  // Procura o ASSUNTO — acontecimento ou case recente, com fonte publicada e
  // data. Não é a busca de estratégia de conteúdo da tela de Padrões de conteúdo: aquela
  // devolve "eduque e humanize", que não é assunto de carrossel nenhum.
  //
  // Com material, a mesma rota lê o que a pessoa trouxe em vez de pesquisar.
  async function buscarAssuntos(materialDoUsuario = '') {
    const trazido = String(materialDoUsuario || '').trim();
    setAssuntosBusy(true);
    setAssuntosErro('');
    setMessage(trazido ? 'Lendo o material que você trouxe…' : 'Procurando assuntos com fonte…');
    try {
      const response = await fetch('/api/carrossel/assuntos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brandId, contentType, ...(trazido ? { material: trazido } : {}) })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.state !== 'ready') {
        throw new Error(result?.error || 'A pesquisa não encontrou assuntos com fonte agora.');
      }
      setAssuntos(result.assuntos || []);
      setMessage('');
    } catch (error) {
      setAssuntos(null);
      setAssuntosErro(error.message);
      setMessage('');
    } finally {
      setAssuntosBusy(false);
    }
  }

  // Escolher o assunto preenche o campo e leva a evidência junto — resumo,
  // ângulo, relação com a marca e as fontes com data. O gerador exige a fonte
  // logo adiante; recusar depois da escolha pareceria defeito da escolha.
  function usarAssunto(assunto) {
    const entrada = assuntoParaEntrada(assunto);
    setTopic(entrada.topic);
    setSourceMaterial(entrada.sourceMaterial);
    setAssuntoEscolhidoId(assunto?.id || null);
    setMessage(entrada.sources.length
      ? `Assunto escolhido, com ${entrada.sources.length} ${entrada.sources.length === 1 ? 'fonte' : 'fontes'}.`
      : 'Assunto escolhido.');
  }

  async function createDirections(event) {
    event.preventDefault();
    if (!topic.trim()) return;
    setBriefBusy(true);
    setMessage('Escrevendo as promessas de capa…');
    try {
      const result = await requestEditorial('directions');
      setDirections(result.directions);
      setSources(result.sources || []);
      setBrief(null);
      setSelectedHeadlineId(result.directions?.headlineOptions?.[0]?.id || null);
      setMessage('Escolha a promessa que abre a conversa.');
    } catch (error) {
      setMessage(error?.name === 'AbortError' ? 'A criação das promessas demorou mais que o esperado. Tente novamente.' : error.message || 'Não foi possível criar as promessas.');
    } finally {
      setBriefBusy(false);
    }
  }

  async function createFullBrief() {
    if (!directions || !selectedHeadlineId) return;
    setBriefBusy(true);
    setMessage('Buscando fontes confiáveis e escrevendo o roteiro…');
    try {
      const result = await requestEditorial('full-brief', { directions, selectedHeadlineId });
      setBrief(result.brief);
      setBriefMedia([]);
      setSources(result.sources || sources);
      setMessage('Roteiro pronto para sua revisão. Nada foi aplicado ao Studio ainda.');
    } catch (error) {
      setMessage(error?.name === 'AbortError' ? 'A busca de fontes demorou mais que o esperado. Tente novamente.' : error.message || 'Não foi possível criar o roteiro.');
    } finally {
      setBriefBusy(false);
    }
  }

  async function applyPastedScript(event) {
    event.preventDefault();
    const prepared = preparePastedCarouselScript(pastedScript);
    if (!prepared.ok) {
      setMessage(prepared.error);
      return;
    }

    const nextEditorial = {
      version: 2,
      source: 'pasted-script',
      rawScript: pastedScript.trim(),
      script: prepared.script,
      headline: prepared.blocks[0],
      blockCount: prepared.blockCount,
      slideCount: prepared.slideCount,
      approvedAt: new Date().toISOString()
    };

    clearTimeout(changeTimer.current);
    changeTimer.current = null;
    const previousMediaUrls = [...mediaUrlsRef.current];
    setBusy(true);
    setMessage(`Aplicando ${prepared.blockCount} campos em ${prepared.slideCount} slides…`);
    try {
      await saveChain.current;
      await saveEditorDoc(null, [], nextEditorial);
      setApprovedEditorial(nextEditorial);
      setDirections(null);
      setBrief(null);
      setSources([]);
      setSelectedHeadlineId(null);
      setBriefMedia([]);
      setDoc(null);
      setInitialScript(prepared.script);
      setInitialSlideCount(prepared.slideCount);
      setStudioKey((value) => value + 1);
      setShowEntry(false);
      setEditorialOpen(false);
      setMessage(`${prepared.slideCount} slides preenchidos com o texto colado. Abra "Roteiro" para ver que foto usar em cada um.`);
      if (previousMediaUrls.length) {
        try {
          await removeTempMedia(createClient(), previousMediaUrls);
        } catch {
          // O roteiro já foi salvo. Falha de limpeza não desfaz a importação.
        }
      }
    } catch (error) {
      setMessage(error.message || 'Não foi possível aplicar o roteiro no Studio.');
    } finally {
      setBusy(false);
    }
  }

  async function generateSlideImage(slide) {
    if (!slide?.headline || imageBusyOrder !== null) return;
    const order = Number(slide.order);
    const current = briefMedia.find((item) => item.slideOrder === order);
    setImageBusyOrder(order);
    setMessage(current ? `Gerando outra imagem para o slide ${order}…` : `Gerando imagem para o slide ${order}…`);
    try {
      const response = await fetch('/api/carrossel/image', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brandId,
          slide: { headline: slide.headline, body: slide.body || slide.readerTakeaway || '' },
          style: brand?.category ? `editorial premium para ${brand.category}` : 'editorial premium alinhado à marca',
          aspectRatio: '4:5'
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || 'Não foi possível gerar a imagem.');
      if (!result?.url || !result?.path || !result?.altText) throw new Error('A imagem gerada chegou incompleta. Tente novamente.');

      const next = { slideOrder: order, url: result.url, path: result.path, altText: result.altText };
      setBriefMedia((items) => [...items.filter((item) => item.slideOrder !== order), next].sort((a, b) => a.slideOrder - b.slideOrder));
      if (current?.path && current.path !== next.path) {
        await removeTempMedia(createClient(), [current.path]).catch(() => null);
      }
      setMessage(`Imagem de exemplo pronta para o slide ${order}.`);
    } catch (error) {
      setMessage(error.message || 'Não foi possível gerar a imagem.');
    } finally {
      setImageBusyOrder(null);
    }
  }

  // Dois painéis sobre o mesmo canvas é o que espremia a tela. Clicar no espaço
  // da foto abre o painel Mídia lá dentro, então a gaveta do roteiro sai da
  // frente.
  function handleSelection(next) {
    if (next?.elementType === 'image') setEditorialOpen(false);
  }

  async function removeSlideImage(item) {
    if (!item?.path || imageBusyOrder !== null) return;
    setImageBusyOrder(item.slideOrder);
    try {
      const result = await removeTempMedia(createClient(), [item.path]);
      if (!result?.ok) throw new Error(result?.error || 'Não foi possível remover a imagem.');
      setBriefMedia((items) => items.filter((media) => media.slideOrder !== item.slideOrder));
      setMessage(`Imagem do slide ${item.slideOrder} removida.`);
    } catch (error) {
      setMessage(error.message || 'Não foi possível remover a imagem.');
    } finally {
      setImageBusyOrder(null);
    }
  }

  async function applyApprovedBrief() {
    if (!brief?.slides?.length || !directions || !selectedHeadlineId) return;
    const nextEditorial = {
      version: 2,
      // O tipo acompanha o roteiro: a revisão e a arte precisam saber qual
      // receita foi seguida, e reabrir o rascunho tem de voltar no mesmo tipo.
      contentType,
      directions,
      brief,
      sources,
      selectedHeadlineId,
      media: briefMedia.map(({ slideOrder, url, path, altText }) => ({ slideOrder, url, path, altText })),
      approvedAt: new Date().toISOString()
    };
    const nextMediaUrls = [...new Set([...mediaUrlsRef.current, ...briefMedia.map((item) => item.url)])];
    setBusy(true);
    try {
      await saveEditorDoc(null, nextMediaUrls, nextEditorial);
      setApprovedEditorial(nextEditorial);
      setDoc(null);
      setInitialScript(scriptForBrief(brief));
      setInitialSlideCount(brief.slides.length);
      setStudioKey((value) => value + 1);
      setShowEntry(false);
      setEditorialOpen(false);
      setMessage('Roteiro no Studio. Abra "Roteiro" para ver que foto usar em cada slide.');
    } catch (error) {
      setMessage(error.message || 'Não foi possível registrar a aprovação.');
    } finally {
      setBusy(false);
    }
  }

  // O carrossel nasce como rascunho salvo, e até aqui não havia como jogar fora
  // o que não presta: a barra do Composer que traz "Excluir rascunho" some
  // quando o formato é carrossel, e o rascunho do carrossel é deste componente,
  // não do Composer. Descartar limpa o roteiro, o documento e remonta o Studio
  // do zero — senão o iframe continuaria mostrando a arte que acabou de sumir.
  async function discardDraft() {
    if (!draftId) return;
    setBusy(true);
    setConfirmDiscard(false);
    try {
      const result = await deleteComposerDraft({ brandId, draftId });
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      draftIdRef.current = null;
      mediaUrlsRef.current = [];
      setDraftId(null);
      setDoc(null);
      setDirections(null);
      setBrief(null);
      setSources([]);
      setSelectedHeadlineId(null);
      setApprovedEditorial(null);
      setBriefMedia([]);
      setInitialScript('');
      setInitialSlideCount(undefined);
      setTopic('');
      setSourceMaterial('');
      setMaterial('');
      setAssuntos(null);
      setAssuntoEscolhidoId(null);
      setAssuntosErro('');
      setIdeiaEtapa('tipo');
      setModoAssunto('buscar');
      setEntryMode('ai');
      setPastedScript('');
      setSavedAt(null);
      setShowEntry(false);
      setEditorialOpen(true);
      setStudioKey((value) => value + 1);
      setMessage('Rascunho descartado. Comece um novo carrossel.');
    } catch (error) {
      setMessage(error.message || 'Não foi possível descartar o rascunho.');
    } finally {
      setBusy(false);
    }
  }

  const selectedHeadline = directions?.headlineOptions?.find((item) => item.id === selectedHeadlineId);
  // Índice do passo atual (0–3) na barra Ideia → Roteiro → Visual → Revisão.
  // "Revisão" só acende quando o carrossel virou rascunho de post: antes disso
  // não há o que revisar fora do editor.
  const applied0 = Boolean(approvedEditorial?.approvedAt);
  const step = currentStudioStep({ applied: applied0, hasBrief: Boolean(brief), hasDraft: Boolean(draftId) });
  const pastedPreview = pastedScript.trim() ? preparePastedCarouselScript(pastedScript) : null;
  // Com o roteiro no Studio a gaveta é consulta. Só volta a ser formulário
  // quando a pessoa pede outro roteiro.
  const applied = Boolean(approvedEditorial?.approvedAt) && !showEntry;
  const studioSlides = appliedItems(approvedEditorial);
  const appliedSlides = applied ? studioSlides : [];
  // As dicas de foto atravessam a ponte e são desenhadas dentro do painel
  // Mídia do editor. Antes elas abriam num cartão flutuante ancorado no canto
  // do iframe, que cobria a barra de ferramentas e o começo do canvas.
  const dicasDeFoto = studioSlides.map((item) => ({
    order: item.order,
    headline: item.headline,
    scene: item.hint?.scene,
    query: item.hint?.query,
    queryPt: item.hint?.queryPt,
    avoid: item.hint?.avoid || GENERIC_AVOID
  })).filter((item) => item.scene);

  return (
    <div className={`flex ${embedded ? 'h-full' : 'h-[calc(100dvh-56px)]'} flex-col`}>
      <div className="flex items-center gap-3 border-b border-line px-4 py-2 text-sm">
        {leading}
        <button
          type="button"
          onClick={() => setEditorialOpen((open) => !open)}
          aria-expanded={editorialOpen}
          aria-controls="carousel-editorial"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-semibold text-ink hover:bg-surface-2"
        >
          <PanelLeft size={15} /> Roteiro
        </button>
        {/* O passo virou barra: "3/4" dizia quanto falta, não o que é cada
            etapa. Aqui a pessoa vê o caminho inteiro e volta clicando. */}
        <StudioStepper
          current={step}
          onOpenEditorial={() => setEditorialOpen(true)}
          onFocusCanvas={() => setEditorialOpen(false)}
        />
        <span className="hidden text-muted xl:inline">{brand?.name || 'Sem marca selecionada'}{draftId ? ' · rascunho salvo' : ''}</span>
        <div className="ml-auto flex items-center gap-3">
          {(busy || briefBusy) && <Loader2 className="animate-spin" size={16} />}
          {!busy && !briefBusy && savedAt && <CheckCircle2 size={16} className="text-success" />}
          {message && <span className="max-w-md text-muted">{message}</span>}
          {draftId && <button
            type="button"
            onClick={() => setConfirmDiscard(true)}
            disabled={busy}
            title="Descartar este rascunho"
            aria-label="Descartar este rascunho"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-muted hover:border-danger/40 hover:bg-surface-2 hover:text-danger disabled:opacity-50"
          ><Trash2 size={15} /></button>}
          <Link href="/calendar" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-ink hover:bg-surface-2"><CalendarClock size={15} /> Calendário</Link>
        </div>
      </div>

      {confirmDiscard && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="descartar-carrossel">
        <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl">
          <h2 id="descartar-carrossel" className="text-base font-semibold text-ink">Descartar este rascunho?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">O roteiro aprovado, os slides e as imagens enviadas somem. Não dá para desfazer.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmDiscard(false)} className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-surface-2">Manter</button>
            <button type="button" onClick={discardDraft} disabled={busy} className="rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Descartando…' : 'Descartar'}</button>
          </div>
        </div>
      </div>}

      {/* O Studio ocupa o palco inteiro e a guia editorial entra por cima. Antes
          a guia era uma faixa empilhada aqui: com cinco cards de ideia ou oito
          slides de roteiro ela comia a altura, e a arte 1080×1350 saía cortada
          embaixo. Sobrepor devolve a altura ao canvas em todos os passos. */}
      <div className="relative min-h-0 flex-1">
        {/* O tipo escolhido também escolhe a arte de partida: tendência abre no
            editorial escuro, case no papel, lista na numerada. Trocar continua
            possível dentro do Studio. */}
        <CarouselStudioFrame key={studioKey} title={doc?.name || 'Novo carrossel'} brandId={brandId} brand={brand} initialDoc={doc} initialScript={initialScript} initialMedia={approvedEditorial?.media || []} imageHints={dicasDeFoto} slideCount={initialSlideCount} templateId={(!approvedEditorial && initialTemplateId) || templateDoTipo(approvedEditorial?.contentType || contentType) || undefined} onChange={handleChange} onExport={handleExport} onMediaUpload={handleMediaUpload} onMediaDelete={handleMediaDelete} onSelection={handleSelection} onDraftSaved={(id) => setDraftId(id)} onError={setMessage} onClose={onClose} />

        {/* Enquanto o roteiro não existe, a guia cobre a barra de frames e o
            começo da capa — e o rótulo "FRAMES" aparecia cortado, como se a
            tela estivesse quebrada. Este véu diz que há um painel na frente, e
            de quebra vira o gesto de fechar clicando fora. Ele só existe neste
            passo: com o roteiro aplicado a guia é consulta, e clicar na imagem
            de um slide atrás dela é o que abre a dica de foto. */}
        {editorialOpen && !applied && (
          <button
            type="button"
            aria-label="Fechar a guia editorial"
            onClick={() => setEditorialOpen(false)}
            className="absolute inset-0 z-10 cursor-default bg-app/60 backdrop-blur-[1px]"
          />
        )}

        <aside
          id="carousel-editorial"
          aria-label="Guia editorial do carrossel"
          aria-hidden={!editorialOpen}
          className={`absolute inset-y-0 left-0 z-20 flex w-[380px] max-w-[92vw] flex-col border-r border-line bg-surface shadow-2xl transition-transform duration-200 ${editorialOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full'}`}
        >
          {/* As pílulas de etapa saíram daqui: elas repetiam, dentro da gaveta,
              a barra que agora fica no topo do Studio — e as duas discordavam
              quando o roteiro já estava aplicado. */}
          <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-[11px] font-semibold">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-faint">Guia editorial</span>
            <button type="button" onClick={() => setEditorialOpen(false)} aria-label="Fechar a guia" className="ml-auto rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-ink"><ChevronLeft size={16} /></button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
            {/* Roteiro já aplicado: a gaveta vira consulta, não formulário.
                Antes ela mostrava o formulário de novo, com o texto colado
                ainda dentro e a dica de foto escondida num acordeão lá
                embaixo — duas telas de entrada para um roteiro que já estava
                no Studio. Aqui em cima fica o que serve nesta hora: qual foto
                procurar para cada slide. */}
            {applied ? <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">Roteiro no Studio</p>
                  <p className="mt-0.5 text-xs text-muted">{appliedSlides.length} slides · {approvedEditorial?.source === 'pasted-script' ? 'colado por você' : 'aprovado por você'}</p>
                </div>
                <button type="button" onClick={() => { setShowEntry(true); setIdeiaEtapa('tipo'); }} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-surface-2">Trocar roteiro</button>
              </div>
              <p className="mt-2 flex gap-1.5 rounded-lg bg-surface-2 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
                <Camera size={13} className="mt-[2px] shrink-0 text-accent" />
                <span>Clique na imagem de um slide no editor: a foto sugerida abre aqui do lado.</span>
              </p>
              <ol className="mt-3 grid gap-2">{appliedSlides.map((slide) => <li key={slide.order} className="rounded-xl border border-line bg-surface-2 p-2.5 text-xs">
                <span className="text-muted">{String(slide.order).padStart(2, '0')}{slide.role ? ` · ${STEP_LABEL[slide.role] || 'Página'}` : ''}</span>
                <strong className="mt-1 block text-ink">{slide.headline}</strong>
              </li>)}</ol>
            </div> : null}

            {!applied && !directions && !brief && <IdeiaWizard
              brand={brand}
              etapa={ideiaEtapa}
              onEtapa={setIdeiaEtapa}
              contentType={contentType}
              onContentType={setContentType}
              entryMode={entryMode}
              onEntryMode={setEntryMode}
              modo={modoAssunto}
              onModo={(proximo) => { setModoAssunto(proximo); setAssuntosErro(''); }}
              topic={topic}
              onTopic={setTopic}
              sourceMaterial={sourceMaterial}
              onSourceMaterial={setSourceMaterial}
              material={material}
              onMaterial={setMaterial}
              assuntos={assuntos}
              assuntosBusy={assuntosBusy}
              assuntosErro={assuntosErro}
              assuntoEscolhidoId={assuntoEscolhidoId}
              onBuscarAssuntos={buscarAssuntos}
              onUsarAssunto={usarAssunto}
              onGerarPromessas={createDirections}
              pastedScript={pastedScript}
              onPastedScript={setPastedScript}
              pastedPreview={pastedPreview}
              onAplicarColado={applyPastedScript}
              briefBusy={briefBusy}
              busy={busy}
            />}

            {!applied && directions && !brief && <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint">Passo 3 de 4</p>
                  <p className="font-semibold text-ink">Escolha a promessa da capa</p>
                  <p className="mt-1 max-w-3xl text-xs text-muted">A promessa é o motivo de continuar deslizando. {directions.problem} <span aria-hidden="true">·</span> Você vai ensinar: {directions.learningOutcome}</p>
                </div>
                <button type="button" onClick={() => { setDirections(null); setSelectedHeadlineId(null); setIdeiaEtapa('assunto'); }} className="text-xs font-semibold text-muted hover:text-ink">Alterar assunto</button>
              </div>
              <div className="mt-3 grid gap-2">
                {directions.headlineOptions.map((option) =><label key={option.id} className={`relative cursor-pointer rounded-xl border p-3 transition-colors ${selectedHeadlineId === option.id ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/40'}`}>
                  <input type="radio" name="carousel-headline" className="sr-only" checked={selectedHeadlineId === option.id} onChange={() => setSelectedHeadlineId(option.id)} />
                  {selectedHeadlineId === option.id && <span className="absolute right-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">Selecionada</span>}
                  <span className="block pr-20 text-sm font-bold text-ink">{option.headline}</span>
                  {option.subheadline && <span className="mt-1 block text-xs text-muted">{option.subheadline}</span>}
                  {selectedHeadlineId === option.id && <span className="mt-2 block text-[11px] leading-relaxed text-muted">Por que funciona: {option.rationale}</span>}
                </label>)}
              </div>
              {selectedHeadline && <a
                href={gptUrl('headline', headlinePrompt({ headline: selectedHeadline.headline, subheadline: selectedHeadline.subheadline, topic }))}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
              ><ExternalLink size={13} /> Diagnosticar esta capa no meu GPT</a>}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted"><span className="mr-1 font-semibold text-ink">Sequência:</span>{directions.narrative.map((slide) => <span key={slide.order} className="rounded-full bg-surface-2 px-2 py-1">{STEP_LABEL[slide.role] || 'Página'}</span>)}</div>
              {message && <p role="alert" className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">{message}</p>}
              {/* O roteiro só sai com promessa escolhida: sem ela o gerador não
                  sabe o que o carrossel prometeu cumprir. */}
              <div className="mt-3 flex justify-end"><button type="button" onClick={createFullBrief} disabled={briefBusy || !selectedHeadlineId} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{briefBusy ? 'Criando roteiro…' : 'Gerar roteiro com esta promessa'} <ArrowRight size={14} /></button></div>
            </div>}

            {!applied && brief && <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint">Passo 4 de 4</p><p className="font-semibold text-ink">Confira o roteiro antes de enviar ao Studio</p>{selectedHeadline && <p className="mt-1 text-xs text-muted">Promessa escolhida: <strong className="text-ink">{selectedHeadline.headline}</strong></p>}</div>{sources.length > 0 ? <span className="rounded-full bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">Fontes verificadas</span> : <span className="rounded-full bg-surface-2 px-2 py-1 text-[11px] font-semibold text-muted">Roteiro prático, sem dados factuais</span>}</div>
              <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-2 text-[11px] leading-relaxed text-muted">Depois de enviar ao Studio, clique na imagem de um slide para ver que foto procurar.</p>
              <ol className="mt-3 grid gap-2">{brief.slides.map((slide) => {
                const media = briefMedia.find((item) => item.slideOrder === Number(slide.order));
                const imageBusy = imageBusyOrder === Number(slide.order);
                return <li key={slide.order} className="rounded-xl border border-line bg-surface-2 p-2.5 text-xs">
                  <span className="text-muted">{String(slide.order).padStart(2, '0')} · {STEP_LABEL[slide.role]}</span>
                  <strong className="mt-1 block text-ink">{slide.headline}</strong>
                  <span className="mt-1 block leading-relaxed text-muted">{slide.readerTakeaway}</span>
                  {media && <div className="relative mt-2 overflow-hidden rounded-xl border border-line bg-surface">
                    <NextImage src={media.url} alt={media.altText} width={320} height={400} unoptimized className="h-36 w-full object-cover" />
                    <button type="button" onClick={() => removeSlideImage(media)} disabled={imageBusyOrder !== null} aria-label={`Remover imagem do slide ${slide.order}`} className="absolute right-1.5 top-1.5 rounded-full bg-black/65 p-1 text-white disabled:opacity-50"><X size={13} /></button>
                  </div>}
                  <button
                    type="button"
                    onClick={() => generateSlideImage(slide)}
                    disabled={imageBusyOrder !== null}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 font-semibold text-ink hover:border-accent/40 disabled:opacity-50"
                  >
                    {imageBusy ? <Loader2 size={13} className="animate-spin" /> : media ? <RotateCcw size={13} /> : <ImagePlus size={13} />}
                    {imageBusy ? 'Gerando…' : media ? 'Gerar novamente' : 'Gerar imagem de exemplo'}
                  </button>
                </li>;
              })}</ol>
              {sourceList(sources)}
              <div className="mt-3 flex flex-wrap justify-between gap-2"><button type="button" onClick={() => setBrief(null)} className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-surface-2">Voltar às promessas</button><button type="button" onClick={applyApprovedBrief} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Usar roteiro no Studio <FileText size={14} /></button></div>
            </div>}

            {/* O Hub explicava esta tela numa bolha fixa no canto inferior
                direito, e ela cobria as miniaturas dos slides do Studio. Aqui
                dentro ele só aparece com a gaveta aberta, e no rodapé: quem já
                sabe usar não precisa rolar por cima da explicação. */}
            {/* `step` passou a ser índice de 0 a 3 (Ideia…Revisão): a dica que
                aparecia "da capa em diante" agora aparece do Roteiro em
                diante, que é o mesmo momento do fluxo. */}
            {step >= 1 && <div className="mt-3">
              <MascotTip
                id="carrossel-studio"
                title="Como esta tela funciona"
                lines={[
                  'Aqui você escreve; ao lado, o Studio monta a arte.',
                  'Em "Usar no post" os slides viram rascunho — a data você escolhe no Calendário.'
                ]}
                cta={{ label: 'Abrir Calendário', href: '/calendar' }}
              />
            </div>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function firstHeadline(doc) {
  const cover = doc?.slides?.find((slide) => slide.role === 'cover') || doc?.slides?.[0];
  const headline = cover?.elements?.find((element) => element.type === 'text' && (element.role === 'headline' || element.role === 'hook'));
  return headline?.content || '';
}

// Os slides que estão no Studio agora, já com a dica de foto de cada um. O
// roteiro colado não tem papéis de narrativa: só a capa é conhecida, pela
// posição. O gerado pela IA traz papel e dica escrita.
function appliedItems(editorial) {
  if (editorial?.source === 'pasted-script') {
    const prepared = preparePastedCarouselScript(editorial.script || editorial.rawScript || '');
    if (!prepared.ok) return [];
    return imageHintsForBlocks(prepared.blocks).map((hint) => ({
      order: hint.order,
      role: hint.order === 1 ? 'cover' : null,
      headline: prepared.blocks[(hint.order - 1) * 2],
      hint
    }));
  }
  const slides = editorial?.brief?.slides || [];
  const hints = imageHintsForSlides(slides);
  return slides.map((slide, index) => ({
    order: slide.order,
    role: slide.role,
    headline: slide.headline,
    hint: hints[index]
  }));
}

function scriptForBrief(brief) {
  return serializeCarouselBrief(brief);
}

function scriptForEditorial(editorial) {
  if (editorial?.source === 'pasted-script') return editorial.script || editorial.rawScript || '';
  return scriptForBrief(editorial?.brief);
}

function slideCountForEditorial(editorial) {
  const count = editorial?.source === 'pasted-script'
    ? editorial.slideCount
    : editorial?.brief?.slides?.length;
  return Number.isInteger(count) && count >= 3 && count <= 10 ? count : undefined;
}
