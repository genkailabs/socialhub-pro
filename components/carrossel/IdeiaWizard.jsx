'use client';

// A etapa "Ideia", uma pergunta por vez.
//
// Antes isto era uma tela só: oito tipos, o campo de assunto, a busca de
// tendência e o material colado, tudo empilhado em 380px de gaveta. Quem abria
// via um formulário longo e não sabia por onde começar — e o pior: a busca
// oferecia estratégia de conteúdo ("conteúdo humanizado") como se fosse
// tendência, misturando o que a marca FAZ com o que ACONTECEU.
//
// O método das aulas tem uma ordem: tipo → assunto → promessa → roteiro. Aqui
// ficam os dois primeiros passos; promessa e roteiro seguem no cliente, porque
// dependem do que a IA devolveu.
import { ArrowLeft, ArrowRight, ClipboardPaste, ExternalLink, Link2, Search, Sparkles } from 'lucide-react';
import { carouselPrompt, gptUrl } from '@/lib/carrossel-gpts';
import { modosDeAssunto, rotuloDeFonte } from '@/lib/carrossel-assuntos';
import { tipoPorId, tiposPorObjetivo } from '@/lib/carrossel-tipos';
import { Mascot } from '@/components/onboarding/Mascot';

const TITULO_DA_ETAPA = {
  tipo: 'Qual tipo de carrossel você quer criar?',
  assunto: 'Sobre qual assunto?'
};

function CartaoDeTipo({ tipo, escolhido, destaque, onEscolher }) {
  return (
    <button
      type="button"
      onClick={() => onEscolher(tipo.id)}
      aria-pressed={escolhido}
      className={`rounded-xl border px-3 text-left transition-colors ${destaque ? 'py-2.5' : 'py-2'} ${escolhido ? 'border-accent bg-accent-tint' : 'border-line bg-surface-2 hover:border-accent/40'}`}
    >
      <span className="flex items-center gap-1.5">
        <span className={`font-bold ${destaque ? 'text-sm' : 'text-xs'} ${escolhido ? 'text-accent-ink' : 'text-ink'}`}>{tipo.label}</span>
        {tipo.carroChefe && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Carro-chefe</span>}
      </span>
      <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{tipo.promessa}</span>
      {tipo.limite && <span className="mt-0.5 block text-[10px] leading-relaxed text-faint">Limite: {tipo.limite}</span>}
    </button>
  );
}

function CartaoDeAssunto({ assunto, escolhido, onEscolher }) {
  return (
    <button
      type="button"
      onClick={() => onEscolher(assunto)}
      aria-pressed={escolhido}
      className={`block w-full rounded-xl border px-2.5 py-2 text-left transition-colors ${escolhido ? 'border-accent bg-accent-tint' : 'border-line bg-surface hover:border-accent/40'}`}
    >
      <span className="flex items-start gap-1.5">
        <span className="text-[11px] font-bold leading-snug text-ink">{assunto.titulo}</span>
        {assunto.confirmado === false && <span className="shrink-0 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink">Não confirmado</span>}
      </span>
      <span className="mt-1 block text-[10px] leading-relaxed text-muted">{assunto.resumo}</span>
      {assunto.angulo && <span className="mt-1 block text-[10px] leading-relaxed text-ink"><strong className="font-semibold">Ângulo:</strong> {assunto.angulo}</span>}
      {assunto.relacaoComNicho && <span className="mt-1 block text-[10px] leading-relaxed text-muted">Para esta marca: {assunto.relacaoComNicho}</span>}
      {/* Fonte e data sempre visíveis: notícia sem procedência é boato com
          tipografia bonita. */}
      <span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-wide text-faint">{rotuloDeFonte(assunto)}</span>
    </button>
  );
}

export function IdeiaWizard({
  brand,
  etapa, onEtapa,
  contentType, onContentType,
  entryMode, onEntryMode,
  modo, onModo,
  topic, onTopic,
  sourceMaterial, onSourceMaterial,
  material, onMaterial,
  assuntos, assuntosBusy, assuntosErro, assuntoEscolhidoId,
  onBuscarAssuntos, onUsarAssunto, onGerarPromessas,
  pastedScript, onPastedScript, pastedPreview, onAplicarColado,
  briefBusy, busy
}) {
  const tipo = tipoPorId(contentType);
  const pesquisa = Boolean(tipo?.exigePesquisa);
  const grupos = tiposPorObjetivo();
  const carrosChefe = grupos.flatMap((grupo) => grupo.tipos).filter((item) => item.carroChefe);
  // Os outros continuam disponíveis, só que sem o palco: vender todos como
  // iguais seria mentira, e a aula é explícita sobre onde apostar primeiro.
  const outros = grupos
    .map((grupo) => ({ ...grupo, tipos: grupo.tipos.filter((item) => !item.carroChefe) }))
    .filter((grupo) => grupo.tipos.length);
  const modos = modosDeAssunto(contentType).filter((item) => item.id !== 'buscar' || pesquisa);
  const modoAtual = modos.some((item) => item.id === modo) ? modo : modos[0].id;
  const podeAvancar = Boolean(topic.trim());
  const promptDoGpt = gptUrl('carrossel', carouselPrompt({ brandName: brand?.name, topic, context: sourceMaterial }));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (entryMode === 'paste') return onAplicarColado(event);
        if (etapa === 'tipo') return onEtapa('assunto');
        if (podeAvancar) onGerarPromessas(event);
      }}
      className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
    >
      <div className="flex gap-3">
        <Mascot mood="guide" className="h-16 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint">
            {entryMode === 'paste' ? 'Roteiro pronto' : `Passo ${etapa === 'tipo' ? 1 : 2} de 4`}
          </p>
          <p className="font-semibold text-ink">{entryMode === 'paste' ? 'Cole o seu roteiro' : TITULO_DA_ETAPA[etapa]}</p>
          {/* O seletor só existe onde ele decide alguma coisa: no primeiro
              passo. No passo do assunto ele repetia uma escolha já feita e
              roubava a linha de cima da pergunta da vez. */}
          <div className={`mt-3 grid-cols-2 rounded-xl bg-surface-2 p-1 ${etapa === 'assunto' && entryMode === 'ai' ? 'hidden' : 'grid'}`} aria-label="Como criar o roteiro">
            <button type="button" onClick={() => onEntryMode('ai')} aria-pressed={entryMode === 'ai'} className={`rounded-lg px-2 py-2 text-xs font-bold transition-colors ${entryMode === 'ai' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>Gerar com IA</button>
            <button type="button" onClick={() => onEntryMode('paste')} aria-pressed={entryMode === 'paste'} className={`rounded-lg px-2 py-2 text-xs font-bold transition-colors ${entryMode === 'paste' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>Colar roteiro pronto</button>
          </div>

          {entryMode === 'paste' ? <div className="mt-3">
            <label htmlFor="carousel-pasted-script" className="text-xs font-semibold text-ink">Cole o texto aqui</label>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">Use pares: <strong>texto 1</strong> é o título da capa, <strong>texto 2</strong> é o apoio; depois título e texto de cada slide.</p>
            <textarea
              id="carousel-pasted-script"
              value={pastedScript}
              onChange={(event) => onPastedScript(event.target.value)}
              maxLength={12000}
              rows={10}
              placeholder={'texto 1 - MANCHETE DA CAPA\n\ntexto 2 - Linha de apoio\n\ntexto 3 - TÍTULO DO SLIDE 2\n\ntexto 4 - Explicação do slide 2'}
              className="mt-2 w-full resize-y rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink"
            />
            {pastedPreview && <p role={pastedPreview.ok ? undefined : 'alert'} className={`mt-2 text-[11px] ${pastedPreview.ok ? 'text-success' : 'text-danger'}`}>{pastedPreview.ok ? `${pastedPreview.blockCount} campos encontrados · ${pastedPreview.slideCount} slides` : pastedPreview.error}</p>}
            <button type="submit" disabled={busy || !pastedPreview?.ok} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Aplicando…' : 'Aplicar texto no Studio'} <ClipboardPaste size={14} /></button>
          </div> : etapa === 'tipo' ? <div className="mt-3">
            <fieldset>
              <legend className="text-[10px] font-bold uppercase tracking-[0.08em] text-faint">Comece por um destes</legend>
              <div className="mt-1.5 grid gap-1.5">
                {carrosChefe.map((item) => (
                  <CartaoDeTipo key={item.id} tipo={item} destaque escolhido={contentType === item.id} onEscolher={onContentType} />
                ))}
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted">São os dois que alcançam quem ainda não segue a marca — e os únicos em que o Hub pesquisa o assunto para você.</p>
            </fieldset>

            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] font-semibold text-muted hover:text-ink">Outros tipos</summary>
              <div className="mt-2 space-y-2.5">
                {outros.map((grupo) => (
                  <div key={grupo.objetivo}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted">{grupo.label} · <span className="font-medium normal-case tracking-normal text-faint">{grupo.resumo}</span></p>
                    <div className="mt-1 grid gap-1.5">
                      {grupo.tipos.map((item) => (
                        <CartaoDeTipo key={item.id} tipo={item} escolhido={contentType === item.id} onEscolher={onContentType} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>

            <button type="submit" className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white">
              Escolher o assunto <ArrowRight size={14} />
            </button>
          </div> : <div className="mt-3">
            <p className="rounded-lg bg-surface-2 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
              Tipo escolhido: <strong className="text-ink">{tipo?.label}</strong>. {pesquisa ? 'Este tipo só sai com fonte: todo assunto vem com veículo e data.' : 'Este tipo não depende de notícia; o assunto é seu.'}
            </p>

            <div className="mt-2 grid gap-1" role="group" aria-label="De onde vem o assunto">
              {modos.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onModo(item.id)}
                  aria-pressed={modoAtual === item.id}
                  className={`rounded-xl border px-2.5 py-2 text-left transition-colors ${modoAtual === item.id ? 'border-accent bg-accent-tint' : 'border-line bg-surface-2 hover:border-accent/40'}`}
                >
                  <span className={`block text-xs font-bold ${modoAtual === item.id ? 'text-accent-ink' : 'text-ink'}`}>{item.label}</span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">{item.resumo}</span>
                </button>
              ))}
            </div>

            {modoAtual === 'buscar' && <div className="mt-3">
              <button
                type="button"
                onClick={() => onBuscarAssuntos()}
                disabled={assuntosBusy || briefBusy}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-[11px] font-bold text-ink hover:border-accent/40 disabled:opacity-50"
              >
                {assuntosBusy ? 'Procurando…' : contentType === 'case-sucesso' ? 'Buscar cases agora' : 'Buscar tendências agora'} <Search size={13} />
              </button>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted">A busca olha o nicho da sua marca e só traz o que tem fonte publicada.</p>
            </div>}

            {modoAtual === 'fonte' && <div className="mt-3">
              <label htmlFor="carousel-material" className="text-xs font-semibold text-ink">Sua fonte</label>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">Cole o link, a notícia, a transcrição do vídeo ou o texto. Arquivo de vídeo e documento ainda não entram por aqui — cole a transcrição.</p>
              <textarea
                id="carousel-material"
                value={material}
                onChange={(event) => onMaterial(event.target.value)}
                maxLength={6000}
                rows={5}
                placeholder="Cole aqui o link, a notícia ou a transcrição do que você viu."
                className="mt-2 w-full resize-y rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs leading-relaxed text-ink"
              />
              <button
                type="button"
                onClick={() => onBuscarAssuntos(material)}
                disabled={assuntosBusy || briefBusy || material.trim().length < 40}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-[11px] font-bold text-ink hover:border-accent/40 disabled:opacity-50"
              >
                {assuntosBusy ? 'Lendo o material…' : 'Tirar assuntos daqui'} <Link2 size={13} />
              </button>
            </div>}

            {assuntosErro && <p role="alert" className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-2 text-[10px] leading-relaxed text-ink">{assuntosErro}</p>}

            {assuntos && modoAtual !== 'proprio' && <div className="mt-2 space-y-1.5">
              {assuntos.length === 0 && <p className="text-[10px] text-muted">Nada com fonte verificável agora. Tente de novo ou escreva o assunto você mesmo.</p>}
              {assuntos.map((assunto) => (
                <CartaoDeAssunto
                  key={assunto.id}
                  assunto={assunto}
                  escolhido={assuntoEscolhidoId === assunto.id}
                  onEscolher={onUsarAssunto}
                />
              ))}
            </div>}

            {/* O campo do assunto fica visível em qualquer modo: buscar e colar
                material terminam escrevendo AQUI, e ver o texto chegar é o que
                mostra que a escolha pegou. */}
            <div className="mt-3">
              <label htmlFor="carousel-topic" className="text-xs font-semibold text-ink">Assunto do carrossel</label>
              <textarea
                id="carousel-topic"
                value={topic}
                onChange={(event) => onTopic(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (podeAvancar) onGerarPromessas(event);
                  }
                }}
                rows={3}
                placeholder={pesquisa
                  ? 'Ex.: O casamento do jogador que dominou as redes esta semana'
                  : 'Ex.: Como pequenas empresas podem usar IA sem perder qualidade'}
                className="mt-1.5 w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink"
              />
            </div>

            <details className="mt-2 text-xs text-muted">
              <summary className="cursor-pointer hover:text-ink">Contexto da marca (opcional)</summary>
              <textarea
                value={sourceMaterial}
                onChange={(event) => onSourceMaterial(event.target.value)}
                maxLength={6000}
                rows={3}
                placeholder="Público, serviço, exemplo, restrição ou tom de voz."
                className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink"
              />
            </details>

            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={() => onEtapa('tipo')} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-surface-2">
                <ArrowLeft size={14} /> Voltar
              </button>
              {/* Avançar só funciona com a etapa cumprida: sem assunto não há
                  promessa possível, e um botão que aceita o clique e não faz
                  nada ensina a pessoa a desconfiar da tela. */}
              <button type="submit" disabled={briefBusy || !podeAvancar} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {briefBusy ? 'Criando…' : 'Gerar 5 promessas de capa'} <Sparkles size={14} />
              </button>
            </div>

            {promptDoGpt && <a
              href={promptDoGpt}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
            ><ExternalLink size={13} /> Pedir também ao meu GPT</a>}
          </div>}
        </div>
      </div>
    </form>
  );
}
