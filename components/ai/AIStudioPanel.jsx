'use client';
import { useEffect, useState } from 'react';
import {
  Sparkles, Wand2, Send, Clock, FileText, Link2, Copy, Check,
  CheckCircle2, AlertCircle, Image as ImageIcon, RefreshCw, Type
} from 'lucide-react';
import { generatePost, generateNewsImages, finalizeNewsImage, getContentSuggestions, getBrandPreferenceSuggestions } from '@/lib/ai-actions';
import { publishNow, schedulePost, saveDraft, submitForApproval } from '@/lib/posts-actions';
import { formatUsd } from '@/lib/ai/cost';
import { Button } from '@/components/ui/Button';
import { FreeInput } from '@/components/ai/FreeInput';
import { SuggestionChips } from '@/components/ai/SuggestionChips';

const TOPIC_DEBOUNCE_MS = 800;

const TITLE_POSITION = {
  top: 'items-start',
  center: 'items-center',
  bottom: 'items-end'
};

export function AIStudioPanel({ brandId, brandName = 'sua_marca', hasBrandKit }) {
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('');
  const [tone, setTone] = useState('');
  const [goal, setGoal] = useState('engajar a audiência');
  const [ignoreDna, setIgnoreDna] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [formatHistory, setFormatHistory] = useState([]);
  const [toneHistory, setToneHistory] = useState([]);
  const [gen, setGen] = useState(null);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [visualDirection, setVisualDirection] = useState('');
  const [imageOptions, setImageOptions] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [finalImageUrl, setFinalImageUrl] = useState('');
  const [textEnabled, setTextEnabled] = useState(true);
  const [imageTitle, setImageTitle] = useState('');
  const [titlePosition, setTitlePosition] = useState('bottom');
  const [imageCost, setImageCost] = useState(0);
  const [mode, setMode] = useState('now');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [approvalLink, setApprovalLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getBrandPreferenceSuggestions({ brandId, type: 'format' }).then((r) => setFormatHistory(r?.values || []));
    getBrandPreferenceSuggestions({ brandId, type: 'tone' }).then((r) => setToneHistory(r?.values || []));
  }, [brandId]);

  useEffect(() => {
    if (!topic.trim()) { setSuggestions([]); return; }
    setSuggestLoading(true);
    const timer = setTimeout(async () => {
      const res = await getContentSuggestions({ brandId, topic });
      setSuggestions(res?.suggestions || []);
      setSuggestLoading(false);
    }, TOPIC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [topic, brandId]);

  function pickSuggestion(s) {
    setFormat(s.impliedFormat || '');
    setTone(s.impliedTone || '');
  }

  async function generate() {
    setBusy('gen'); setMsg(null); setApprovalLink('');
    try {
      const res = await generatePost({ brandId, brandName, brief: { topic, format, tone, goal }, ignoreDna });
      if (res?.error) throw new Error(res.error);
      setGen(res);
      setCaption(res.spec.caption || '');
      setHashtags((res.spec.hashtags || []).join(' '));
      setImageTitle(res.spec.headline || topic);
      setImageOptions([]); setSelectedImage(''); setFinalImageUrl(''); setImageCost(0);
      setMsg({ type: 'ok', text: `Texto criado! Agora escolha como a imagem da notícia deve ficar. Custo do texto: ${formatUsd(res.textCost || 0)}.` });
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally { setBusy(''); }
  }

  async function createImageOptions() {
    if (!gen) return;
    setBusy('images'); setMsg(null); setFinalImageUrl('');
    try {
      const res = await generateNewsImages({
        brandId,
        topic: topic.trim() || gen.spec.headline,
        caption,
        direction: visualDirection,
        basePrompt: gen.spec.imagePrompt
      });
      if (res?.error) throw new Error(res.error);
      setImageOptions(res.imageUrls || []);
      setSelectedImage(res.imageUrls?.[0] || '');
      setImageCost(res.imageCost || 0);
      setMsg({
        type: 'ok',
        text: res.failedCount ? `${res.imageUrls.length} opções ficaram prontas. Algumas não puderam ser geradas.` : 'Quatro opções de imagem foram criadas. Escolha a que combina melhor com a notícia.'
      });
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally { setBusy(''); }
  }

  function chooseImage(url) {
    setSelectedImage(url);
    setFinalImageUrl('');
  }

  async function useSelectedImage() {
    if (!selectedImage) return;
    setBusy('finalize'); setMsg(null);
    try {
      const res = await finalizeNewsImage({
        brandId,
        sourceUrl: selectedImage,
        title: imageTitle,
        textEnabled,
        position: titlePosition
      });
      if (res?.error) throw new Error(res.error);
      setFinalImageUrl(res.imageUrl);
      setMsg({ type: 'ok', text: textEnabled && imageTitle.trim() ? 'Imagem final com título está pronta para publicar.' : 'Imagem escolhida está pronta para publicar.' });
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally { setBusy(''); }
  }

  async function run(action) {
    const imageUrl = finalImageUrl || selectedImage;
    if (!imageUrl) { setMsg({ type: 'err', text: 'Crie e escolha uma imagem antes de publicar.' }); return; }
    if (!finalImageUrl) { setMsg({ type: 'err', text: 'Clique em “Usar esta imagem” para preparar a arte final.' }); return; }
    if (action === 'schedule' && !when) { setMsg({ type: 'err', text: 'Escolha data e hora.' }); return; }
    setBusy(action); setMsg(null); setApprovalLink('');
    try {
      const payload = { brandId, caption, hashtags, imageUrls: [imageUrl] };
      let res;
      if (action === 'now') res = await publishNow(payload);
      else if (action === 'schedule') res = await schedulePost({ ...payload, scheduledAt: new Date(when).toISOString() });
      else if (action === 'draft') res = await saveDraft(payload);
      else if (action === 'approval') res = await submitForApproval(payload);
      if (res?.error) throw new Error(res.error);
      if (action === 'approval' && res.token) {
        setApprovalLink(`${window.location.origin}/approve/${res.token}`);
        setMsg({ type: 'ok', text: 'Enviado para aprovação! Copie o link para o cliente.' });
      } else if (res?.warning) {
        setMsg({ type: 'warn', text: res.warning });
      } else {
        setMsg({ type: 'ok', text: { now: 'Publicado no Instagram!', schedule: 'Post agendado!', draft: 'Rascunho salvo!' }[action] });
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message });
    } finally { setBusy(''); }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(approvalLink);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  const field = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15';
  const tab = (active) => `flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${active ? 'bg-surface text-accent shadow-soft' : 'text-muted hover:text-ink'}`;
  const previewImage = finalImageUrl || selectedImage;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-5">
        {!hasBrandKit && (
          <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-ink">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>Configure o <a href="/brand-kit" className="font-bold text-accent hover:underline">Brand Kit</a> desta marca para a IA gerar conteúdo mais alinhado à marca.</span>
          </div>
        )}

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-extrabold tracking-tight text-ink">Crie um post com IA</p>
              <p className="mt-1 text-xs text-muted">Texto pelo DeepSeek e imagens pelo Pollinations.</p>
            </div>
            <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent">Novo</span>
          </div>
          <label className="mb-1.5 block text-xs font-bold text-slate-200">Tema / assunto do post</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: Vibe Coding, LGPD, sono, arquitetura…" className={field} />

          <div className="mt-3">
            <SuggestionChips suggestions={suggestions} loading={suggestLoading} onPick={pickSuggestion} />
          </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <FreeInput
            label="Formato de conteúdo"
            value={format}
            onChange={setFormat}
            placeholder="Ex: Tutorial, Caso Clínico, Antes & Depois…"
            suggestions={formatHistory}
          />
          <FreeInput
            label="Tom de voz"
            value={tone}
            onChange={setTone}
            placeholder="Do Brand DNA, ou digite o seu"
            suggestions={toneHistory}
          />
        </div>
        <div className="mt-3">
          <label className="mb-1.5 block text-xs font-bold text-slate-200">Objetivo</label>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="engajar, educar, gerar leads…" className={field} />
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={ignoreDna} onChange={(e) => setIgnoreDna(e.target.checked)} className="h-4 w-4" />
          Ignorar Brand DNA (geração genérica)
        </label>

        <Button onClick={generate} disabled={busy === 'gen'} className="mt-4 w-full !rounded-xl">
          <Wand2 className="h-4 w-4" /> {busy === 'gen' ? 'Criando notícia…' : gen ? 'Gerar outra ideia' : 'Gerar com IA'}
        </Button>
        </div>

        {!gen && (
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-extrabold text-ink"><Sparkles className="h-4 w-4 text-accent" /> Imagem da notícia</div>
            <p className="mt-2 text-xs leading-relaxed text-muted">Depois de criar o texto, escolha a direção visual e gere quatro opções de imagem pelo Pollinations.</p>
            <div className="mt-4 grid grid-cols-4 gap-2 opacity-40">
              {[0, 1, 2, 3].map((item) => <div key={item} className="aspect-square rounded-xl border border-line bg-surface-2" />)}
            </div>
          </section>
        )}

        {gen && (
          <>
            <div className="border-t border-line pt-4">
              <label className="mb-1.5 block text-xs font-bold text-ink">Legenda (edite à vontade)</label>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} className={field} />
              <label className="mb-1.5 mt-3 block text-xs font-bold text-ink">Hashtags</label>
              <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} className={field} />
            </div>

            <section className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-extrabold text-ink"><Sparkles className="h-4 w-4 text-accent" /> Imagem da notícia</h2>
                  <p className="mt-1 text-xs text-muted">O Pollinations cria imagens ligadas ao assunto, sem texto.</p>
                </div>
                <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent">Tema: {topic.trim() || gen.spec.headline}</span>
              </div>

              <div className="flex gap-2">
                <input value={visualDirection} onChange={(e) => { setVisualDirection(e.target.value); setFinalImageUrl(''); }} placeholder="Direção visual: moderno, esportivo, sem pessoas…" className={field} />
                <Button onClick={createImageOptions} disabled={busy === 'images'} className="shrink-0 !rounded-xl">
                  <RefreshCw className="h-4 w-4" /> {busy === 'images' ? 'Criando…' : 'Criar opções'}
                </Button>
              </div>

              {imageOptions.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {imageOptions.map((url, index) => (
                    <button key={url} type="button" onClick={() => chooseImage(url)} className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${selectedImage === url ? 'border-accent ring-2 ring-accent/30' : 'border-transparent hover:border-line'}`}>
                      <img src={url} alt={`Opção ${index + 1} gerada para a notícia`} className="h-full w-full object-cover" />
                      {selectedImage === url && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-accent text-ink"><Check className="h-4 w-4" /></span>}
                    </button>
                  ))}
                </div>
              )}

              {selectedImage && (
                <div className="space-y-3 border-t border-line pt-4">
                  <label className="flex items-center justify-between gap-3 text-sm font-bold text-ink">
                    <span className="flex items-center gap-2"><Type className="h-4 w-4 text-accent" /> Adicionar título na imagem</span>
                    <input type="checkbox" checked={textEnabled} onChange={(e) => { setTextEnabled(e.target.checked); setFinalImageUrl(''); }} className="h-5 w-5 accent-accent" />
                  </label>
                  {textEnabled && (
                    <>
                      <input value={imageTitle} maxLength={90} onChange={(e) => { setImageTitle(e.target.value); setFinalImageUrl(''); }} placeholder="Título curto para a imagem" className={field} />
                      <div className="grid grid-cols-3 gap-2">
                        {[['top', 'Topo'], ['center', 'Centro'], ['bottom', 'Base']].map(([position, label]) => (
                          <button key={position} type="button" onClick={() => { setTitlePosition(position); setFinalImageUrl(''); }} className={`rounded-lg border px-3 py-2 text-xs font-bold ${titlePosition === position ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted'}`}>{label}</button>
                        ))}
                      </div>
                    </>
                  )}
                  <Button onClick={useSelectedImage} disabled={busy === 'finalize'} className="w-full !rounded-xl">
                    <ImageIcon className="h-4 w-4" /> {busy === 'finalize' ? 'Preparando imagem…' : finalImageUrl ? 'Imagem pronta para publicar' : 'Usar esta imagem'}
                  </Button>
                  <p className="text-right text-[11px] text-muted">Custo estimado das opções: <strong className="text-ink">{formatUsd(imageCost)}</strong></p>
                </div>
              )}
            </section>

            <div className="inline-flex w-full gap-1 rounded-xl bg-surface-2 p-1">
              <button type="button" onClick={() => setMode('now')} className={tab(mode === 'now')}><Send className="h-3.5 w-3.5" /> Publicar agora</button>
              <button type="button" onClick={() => setMode('schedule')} className={tab(mode === 'schedule')}><Clock className="h-3.5 w-3.5" /> Agendar</button>
            </div>
            {mode === 'schedule' && <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => run(mode)} disabled={!!busy}>{busy === mode ? 'Processando…' : mode === 'now' ? 'Publicar no Instagram' : 'Agendar'}</Button>
              <Button variant="outline" onClick={() => run('approval')} disabled={!!busy}><Link2 className="h-4 w-4" /> {busy === 'approval' ? 'Enviando…' : 'Enviar p/ aprovação'}</Button>
              <Button variant="ghost" onClick={() => run('draft')} disabled={!!busy}><FileText className="h-4 w-4" /> {busy === 'draft' ? 'Salvando…' : 'Rascunho'}</Button>
            </div>
          </>
        )}

        {msg && <p className={`flex items-center gap-1.5 text-xs font-semibold ${msg.type === 'ok' ? 'text-success' : msg.type === 'warn' ? 'text-warning' : 'text-danger'}`}>{msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{msg.text}</p>}
        {approvalLink && (
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-2">
            <Link2 className="ml-1 h-4 w-4 shrink-0 text-accent" />
            <input readOnly value={approvalLink} className="min-w-0 flex-1 bg-transparent text-[11px] text-muted outline-none" />
            <button onClick={copyLink} className="shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-ink">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-4">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted"><Sparkles className="h-3.5 w-3.5 text-accent" /> Prévia da publicação</p>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="relative aspect-square w-full bg-surface-2">
            {previewImage ? (
              <>
                <img src={previewImage} alt="Prévia da notícia" className="h-full w-full object-cover" />
                {textEnabled && imageTitle.trim() && !finalImageUrl && (
                  <div className={`absolute inset-0 flex p-6 ${TITLE_POSITION[titlePosition]}`}>
                    <div className="w-full bg-gradient-to-t from-black/80 via-black/25 to-transparent px-2 py-6 text-3xl font-extrabold leading-tight tracking-tight text-ink drop-shadow-lg">{imageTitle}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="grid h-full place-items-center px-6 text-center text-xs text-faint">{busy === 'images' ? 'Criando opções de imagem…' : 'A imagem escolhida para a notícia aparece aqui'}</div>
            )}
          </div>
          <div className="space-y-1.5 border-t border-line bg-surface-2 p-4 text-[11px]">
            <p className="text-muted">{gen ? 'Escolha uma das opções e use a prévia antes de publicar.' : 'Gere a notícia para começar.'}</p>
            {finalImageUrl && <p className="font-bold text-success">Imagem final pronta.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
