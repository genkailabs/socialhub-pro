'use client';

// SocialHub decide contexto, pesquisa e aprovação. O Studio só recebe o
// roteiro editorial já aprovado para edição visual e exportação.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarClock, CheckCircle2, ChevronLeft, ExternalLink, FileText, Loader2, PanelLeft, Sparkles, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadTempMedia } from '@/lib/posts-media';
import { deleteComposerDraft, saveDraft } from '@/lib/posts-actions';
import { carouselPrompt, gptUrl, headlinePrompt } from '@/lib/carrossel-gpts';
import { Mascot } from '@/components/onboarding/Mascot';
import { CarouselStudioFrame } from './CarouselStudioFrame';

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

export function CarouselStudioClient({ brandId, brand, draft, embedded = false, onClose }) {
  const editorial = draft?.editorial || null;
  const [doc, setDoc] = useState(draft?.doc || null);
  const [draftId, setDraftId] = useState(draft?.id || null);
  const [, setMediaUrls] = useState(draft?.mediaUrls || []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [topic, setTopic] = useState('');
  const [sourceMaterial, setSourceMaterial] = useState('');
  const [directions, setDirections] = useState(editorial?.directions || null);
  const [brief, setBrief] = useState(editorial?.brief || null);
  const [sources, setSources] = useState(editorial?.sources || []);
  const [selectedHeadlineId, setSelectedHeadlineId] = useState(editorial?.selectedHeadlineId || null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [approvedEditorial, setApprovedEditorial] = useState(editorial);
  const [initialScript, setInitialScript] = useState(scriptForBrief(editorial?.brief));
  const [studioKey, setStudioKey] = useState(0);
  const [editorialOpen, setEditorialOpen] = useState(!editorial?.approvedAt);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const changeTimer = useRef(null);
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
      const caption = firstHeadline(nextDoc) || nextDoc?.name || 'Rascunho de carrossel';
      const result = await saveDraft({
        brandId,
        draftId: draftIdRef.current,
        caption,
        hashtags: '',
        imageUrls: nextMediaUrls,
        format: 'carousel',
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
    clearTimeout(changeTimer.current);
    return new Promise((resolve, reject) => {
      changeTimer.current = setTimeout(() => saveEditorDoc(nextDoc).then(resolve, reject), 700);
    });
  }

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
      await saveEditorDoc(exportedDoc, urls);
      setDoc(exportedDoc);
      setMessage(`${urls.length} slides no rascunho. Agende no Calendário.`);
    } catch (error) {
      setMessage(error.message || 'Falha ao enviar para o post.');
    } finally {
      setBusy(false);
    }
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
        body: JSON.stringify({ brandId, topic: topic.trim(), sourceMaterial: sourceMaterial.trim(), stage, ...extra }),
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

  async function createDirections(event) {
    event.preventDefault();
    if (!topic.trim()) return;
    setBriefBusy(true);
    setMessage('Criando ideias de capa…');
    try {
      const result = await requestEditorial('directions');
      setDirections(result.directions);
      setSources(result.sources || []);
      setBrief(null);
      setSelectedHeadlineId(result.directions?.headlineOptions?.[0]?.id || null);
      setMessage('Escolha a ideia que mais combina com você.');
    } catch (error) {
      setMessage(error?.name === 'AbortError' ? 'A criação das ideias demorou mais que o esperado. Tente novamente.' : error.message || 'Não foi possível criar as ideias.');
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
      setSources(result.sources || sources);
      setMessage('Roteiro pronto para sua revisão. Nada foi aplicado ao Studio ainda.');
    } catch (error) {
      setMessage(error?.name === 'AbortError' ? 'A busca de fontes demorou mais que o esperado. Tente novamente.' : error.message || 'Não foi possível criar o roteiro.');
    } finally {
      setBriefBusy(false);
    }
  }

  async function applyApprovedBrief() {
    if (!brief?.slides?.length || !directions || !selectedHeadlineId) return;
    const nextEditorial = {
      version: 2,
      directions,
      brief,
      sources,
      selectedHeadlineId,
      approvedAt: new Date().toISOString()
    };
    setBusy(true);
    try {
      await saveEditorDoc(null, mediaUrlsRef.current, nextEditorial);
      setApprovedEditorial(nextEditorial);
      setDoc(null);
      setInitialScript(scriptForBrief(brief));
      setStudioKey((value) => value + 1);
      setEditorialOpen(false);
      setMessage('Roteiro aprovado por você e enviado ao Studio para edição.');
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
      setInitialScript('');
      setTopic('');
      setSourceMaterial('');
      setSavedAt(null);
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
  const step = brief ? 3 : directions ? 2 : 1;

  return (
    <div className={`flex ${embedded ? 'h-full' : 'h-[calc(100dvh-56px)]'} flex-col`}>
      <div className="flex items-center gap-3 border-b border-line px-4 py-2 text-sm">
        <button
          type="button"
          onClick={() => setEditorialOpen((open) => !open)}
          aria-expanded={editorialOpen}
          aria-controls="carousel-editorial"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-semibold text-ink hover:bg-surface-2"
        >
          <PanelLeft size={15} /> Roteiro
          <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-muted">{step}/4</span>
        </button>
        <span className="text-muted">{brand?.name || 'Sem marca selecionada'}{draftId ? ' · rascunho salvo' : ''}</span>
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
        <CarouselStudioFrame key={studioKey} title={doc?.name || 'Novo carrossel'} brand={brand} initialDoc={doc} initialScript={initialScript} onChange={handleChange} onExport={handleExport} onDraftSaved={(id) => setDraftId(id)} onError={setMessage} onClose={onClose} />

        <aside
          id="carousel-editorial"
          aria-label="Guia editorial do carrossel"
          aria-hidden={!editorialOpen}
          className={`absolute inset-y-0 left-0 z-20 flex w-[380px] max-w-[92vw] flex-col border-r border-line bg-surface shadow-2xl transition-transform duration-200 ${editorialOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full'}`}
        >
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-2 text-[11px] font-semibold">
            {[
              ['1', 'Tema', step === 1],
              ['2', 'Capa', step === 2],
              ['3', 'Roteiro', step === 3],
              ['4', 'Studio', false]
            ].map(([number, label, active]) => <span key={number} className={`rounded-full border px-2 py-0.5 ${active ? 'border-accent bg-accent text-white' : 'border-line bg-surface-2 text-muted'}`}>{number}. {label}</span>)}
            <button type="button" onClick={() => setEditorialOpen(false)} aria-label="Fechar a guia" className="ml-auto rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-ink"><ChevronLeft size={16} /></button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
            {!directions && !brief && <form onSubmit={createDirections} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex gap-3">
                <Mascot mood="guide" className="h-16 w-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">Vamos montar o seu carrossel</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">Me diga o assunto. Eu proponho as capas e só envio o roteiro ao Studio depois da sua aprovação.</p>
                  <label className="sr-only" htmlFor="carousel-topic">Assunto do carrossel</label>
                  {/* Empilhado sempre: `sm:flex-row` olhava a largura da JANELA,
                      não a da gaveta. Numa tela larga ele punha campo e botão
                      lado a lado dentro de 380px e sobrava um campo de dedo. */}
                  <div className="mt-3 flex flex-col gap-2">
                    {/* Textarea e não input: o assunto aceita 280 caracteres e
                        numa linha só eles rolavam para o lado, escondendo o que
                        a pessoa acabou de escrever. */}
                    <textarea
                      id="carousel-topic"
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          createDirections(event);
                        }
                      }}
                      maxLength={280}
                      rows={3}
                      placeholder="Ex.: Como pequenas empresas podem usar IA sem perder qualidade"
                      className="w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink"
                    />
                    <button type="submit" disabled={briefBusy || !topic.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{briefBusy ? 'Criando…' : 'Gerar 5 ideias'} <Sparkles size={14} /></button>
                  </div>
                  {/* Saída manual para o GPT próprio: não gasta token do Hub,
                      porque GPT customizado não tem API e quem conversa é a
                      pessoa, não o servidor. */}
                  {gptUrl('carrossel', carouselPrompt({ brandName: brand?.name, topic, context: sourceMaterial })) && <a
                    href={gptUrl('carrossel', carouselPrompt({ brandName: brand?.name, topic, context: sourceMaterial }))}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
                  ><ExternalLink size={13} /> Pedir também ao meu GPT</a>}

                  <details className="mt-2 text-xs text-muted">
                    <summary className="cursor-pointer hover:text-ink">Adicionar contexto da marca (opcional)</summary>
                    <textarea value={sourceMaterial} onChange={(event) => setSourceMaterial(event.target.value)} maxLength={6000} rows={2} placeholder="Público, serviço, exemplo, restrição ou tom de voz." className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink" />
                  </details>
                </div>
              </div>
            </form>}

            {directions && !brief && <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-semibold text-ink">Escolha a capa que abre a conversa</p><p className="mt-1 max-w-3xl text-xs text-muted">{directions.problem} <span aria-hidden="true">·</span> Você vai ensinar: {directions.learningOutcome}</p></div>
                <button type="button" onClick={() => { setDirections(null); setSelectedHeadlineId(null); }} className="text-xs font-semibold text-muted hover:text-ink">Alterar assunto</button>
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
              <div className="mt-3 flex justify-end"><button type="button" onClick={createFullBrief} disabled={briefBusy || !selectedHeadlineId} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{briefBusy ? 'Criando roteiro…' : 'Criar roteiro com esta ideia'} <ArrowRight size={14} /></button></div>
            </div>}

            {brief && <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-ink">Confira o roteiro antes de enviar ao Studio</p>{selectedHeadline && <p className="mt-1 text-xs text-muted">Capa escolhida: <strong className="text-ink">{selectedHeadline.headline}</strong></p>}</div>{sources.length > 0 ? <span className="rounded-full bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">Fontes verificadas</span> : <span className="rounded-full bg-surface-2 px-2 py-1 text-[11px] font-semibold text-muted">Roteiro prático, sem dados factuais</span>}</div>
              <ol className="mt-3 grid gap-2">{brief.slides.map((slide) => <li key={slide.order} className="rounded-xl border border-line bg-surface-2 p-2.5 text-xs"><span className="text-muted">{String(slide.order).padStart(2, '0')} · {STEP_LABEL[slide.role]}</span><strong className="mt-1 block text-ink">{slide.headline}</strong><span className="mt-1 block leading-relaxed text-muted">{slide.readerTakeaway}</span></li>)}</ol>
              {sourceList(sources)}
              <div className="mt-3 flex flex-wrap justify-between gap-2"><button type="button" onClick={() => setBrief(null)} className="rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-surface-2">Voltar às ideias</button><button type="button" onClick={applyApprovedBrief} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Usar roteiro no Studio <FileText size={14} /></button></div>
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

function scriptForBrief(brief) {
  if (!brief?.slides?.length) return '';
  return brief.slides.map((slide) => [slide.headline, slide.body].filter(Boolean).join('\n')).join('\n\n');
}
