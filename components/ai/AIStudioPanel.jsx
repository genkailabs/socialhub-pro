'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Image as ImageIcon,
  Instagram,
  Link2,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Target,
  Type,
  Wand2
} from 'lucide-react';
import {
  finalizeNewsImage,
  generateNewsImages,
  generatePost,
  getBrandPreferenceSuggestions
} from '@/lib/ai-actions';
import { publishNow, saveDraft, schedulePost, submitForApproval } from '@/lib/posts-actions';
import { Button } from '@/components/ui/Button';
import { FreeInput } from '@/components/ai/FreeInput';

const TITLE_POSITION = {
  top: 'items-start',
  center: 'items-center',
  bottom: 'items-end'
};

const FALLBACK_OPPORTUNITIES = [
  {
    id: 'fallback-question',
    label: 'Responder uma dúvida frequente',
    description: 'Transforme uma pergunta comum em conteúdo útil.',
    topic: 'Uma dúvida frequente do público',
    format: 'Carrossel',
    tone: 'claro, acolhedor e profissional',
    goal: 'educar'
  },
  {
    id: 'fallback-process',
    label: 'Mostrar como você trabalha',
    description: 'Aproxime o público com um processo ou bastidor.',
    topic: 'Um processo ou bastidor da marca',
    format: 'Reel',
    tone: 'próximo, claro e profissional',
    goal: 'aproximar'
  },
  {
    id: 'suggest-for-me',
    label: 'Não sei. Me sugira algo.',
    description: 'Escolha uma ideia local para começar.',
    topic: 'Uma sugestão útil para o público da marca',
    format: 'Post para Instagram',
    tone: 'claro, acolhedor e profissional',
    goal: 'engajar'
  }
];

const FALLBACK_SLOTS = [
  { weekday: 1, time: '12:00', label: 'Segunda, 12:00' },
  { weekday: 3, time: '18:00', label: 'Quarta, 18:00' },
  { weekday: 5, time: '11:00', label: 'Sexta, 11:00' }
];

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildScheduleDates(slots, now = new Date()) {
  const groups = new Map();

  slots.forEach((slot) => {
    const weekday = Number(slot?.weekday);
    const [hour, minute] = String(slot?.time || '').split(':').map(Number);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return;
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) return;

    const daysAhead = (weekday - now.getDay() + 7) % 7;
    const candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysAhead,
      hour,
      minute,
      0,
      0
    );
    if (candidate <= now) candidate.setDate(candidate.getDate() + 7);

    const key = dateKey(candidate);
    const current = groups.get(key) || {
      key,
      date: candidate,
      weekday: candidate.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      day: candidate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''),
      fullLabel: candidate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
      }),
      times: []
    };

    if (!current.times.includes(slot.time)) current.times.push(slot.time);
    current.times.sort();
    groups.set(key, current);
  });

  return [...groups.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 6);
}

function localScheduledDate(date, time) {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(value.getTime()) ? null : value;
}

function opportunityBrief(opportunity) {
  return {
    topic: opportunity?.topic || opportunity?.label || '',
    format: opportunity?.format || 'Post para Instagram',
    tone: opportunity?.tone || 'claro, acolhedor e profissional',
    goal: opportunity?.goal || 'engajar'
  };
}

function validRecommendedSlot(slot) {
  const weekday = Number(slot?.weekday);
  const [hour, minute] = String(slot?.time || '').split(':').map(Number);
  return Number.isInteger(weekday)
    && weekday >= 0
    && weekday <= 6
    && Number.isInteger(hour)
    && hour >= 0
    && hour <= 23
    && Number.isInteger(minute)
    && minute >= 0
    && minute <= 59;
}

export function AIStudioPanel({
  brandId,
  brandName = 'sua_marca',
  hasBrandKit,
  niche = '',
  composerContext = null
}) {
  const [uiMode, setUiMode] = useState('guided');
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [wasSuggested, setWasSuggested] = useState(false);
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('');
  const [tone, setTone] = useState('');
  const [goal, setGoal] = useState('engajar a audiência');
  const [ignoreDna, setIgnoreDna] = useState(false);
  const [formatHistory, setFormatHistory] = useState([]);
  const [toneHistory, setToneHistory] = useState([]);
  const [gen, setGen] = useState(null);
  const [caption, setCaption] = useState('');
  const [cta, setCta] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [visualDirection, setVisualDirection] = useState('');
  const [imageOptions, setImageOptions] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [finalImageUrl, setFinalImageUrl] = useState('');
  const [textEnabled, setTextEnabled] = useState(true);
  const [imageTitle, setImageTitle] = useState('');
  const [titlePosition, setTitlePosition] = useState('bottom');
  const [mode, setMode] = useState('now');
  const [scheduleDates, setScheduleDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [approvalLink, setApprovalLink] = useState('');
  const [copied, setCopied] = useState(false);

  const opportunities = useMemo(() => {
    const local = Array.isArray(composerContext?.opportunities)
      ? composerContext.opportunities.filter((item) => item?.label)
      : [];
    const hasSuggestionCard = local.some((item) => item.label === 'Não sei. Me sugira algo.');
    const suggestionCard = FALLBACK_OPPORTUNITIES.find((item) => item.id === 'suggest-for-me');
    return local.length
      ? hasSuggestionCard ? local : [...local, suggestionCard]
      : FALLBACK_OPPORTUNITIES;
  }, [composerContext]);

  const recommendedSlots = useMemo(() => {
    const slots = Array.isArray(composerContext?.recommendedSlots)
      ? composerContext.recommendedSlots.filter(validRecommendedSlot)
      : [];
    return slots.length ? slots : FALLBACK_SLOTS;
  }, [composerContext]);

  const hasMetricSignal = composerContext?.hasMetricSignal === true;
  const weeklyMemory = composerContext?.weeklyMemory
    || 'Ainda não há conteúdos recentes nesta semana. Este pode ser um bom momento para começar.';
  const previewImage = finalImageUrl || selectedImage;
  const publishCaption = [caption.trim(), cta.trim()].filter(Boolean).join('\n\n');
  const effectiveTopic = uiMode === 'guided'
    ? opportunityBrief(selectedOpportunity).topic
    : topic.trim();
  const selectedScheduleDay = scheduleDates.find((item) => item.key === selectedDate);

  useEffect(() => {
    getBrandPreferenceSuggestions({ brandId, type: 'format' })
      .then((result) => setFormatHistory(result?.values || []));
    getBrandPreferenceSuggestions({ brandId, type: 'tone' })
      .then((result) => setToneHistory(result?.values || []));
  }, [brandId]);

  useEffect(() => {
    setScheduleDates(buildScheduleDates(recommendedSlots));
  }, [recommendedSlots]);

  useEffect(() => {
    if (!scheduleDates.length) return;
    const activeDate = scheduleDates.some((item) => item.key === selectedDate)
      ? selectedDate
      : scheduleDates[0].key;
    const activeDay = scheduleDates.find((item) => item.key === activeDate);
    setSelectedDate(activeDate);
    setSelectedTime((current) => activeDay?.times.includes(current) ? current : activeDay?.times[0] || '');
  }, [scheduleDates, selectedDate]);

  function clearGeneratedContent() {
    setGen(null);
    setCaption('');
    setCta('');
    setHashtags('');
    setVisualDirection('');
    setImageOptions([]);
    setSelectedImage('');
    setFinalImageUrl('');
    setImageTitle('');
    setMsg(null);
    setApprovalLink('');
    setCopied(false);
  }

  function applyOpportunity(opportunity, suggested) {
    const currentKey = selectedOpportunity?.id || selectedOpportunity?.label || '';
    const nextKey = opportunity?.id || opportunity?.label || '';
    if (currentKey !== nextKey) clearGeneratedContent();
    setSelectedOpportunity(opportunity);
    setWasSuggested(suggested);
  }

  function selectOpportunity(opportunity) {
    const isSuggestionRequest = opportunity?.label === 'Não sei. Me sugira algo.'
      || opportunity?.id === 'suggest-for-me';

    if (isSuggestionRequest) {
      const pool = opportunities.filter((item) => (
        item?.label !== 'Não sei. Me sugira algo.' && item?.id !== 'suggest-for-me'
      ));
      const suggestion = pool[suggestionIndex % Math.max(pool.length, 1)]
        || FALLBACK_OPPORTUNITIES[0];
      setSuggestionIndex((current) => current + 1);
      applyOpportunity(suggestion, true);
      void generate(suggestion);
      return;
    }

    applyOpportunity(opportunity, false);
    void generate(opportunity);
  }

  async function generate(opportunityOverride = null) {
    const guidedOpportunity = opportunityOverride || selectedOpportunity;
    const isGuided = uiMode === 'guided';
    const brief = isGuided
      ? opportunityBrief(guidedOpportunity)
      : { topic: topic.trim(), format, tone, goal };
    if (!brief.topic) return;

    setBusy('gen');
    setMsg(null);
    setApprovalLink('');
    try {
      const res = await generatePost({ brandId, brandName, brief, ignoreDna, composerContext });
      if (res?.error) throw new Error(res.error);
      setGen(res);
      const nextCaption = res.spec.caption || '';
      const nextCta = res.spec.cta || '';
      const nextDirection = (
        (isGuided ? guidedOpportunity?.visualDirection : '')
        || res.spec.visualDirection
        || res.spec.visual_direction
        || ''
      );
      setCaption(nextCaption);
      setCta(nextCta);
      setHashtags((res.spec.hashtags || []).join(' '));
      setVisualDirection(nextDirection);
      setImageTitle(res.spec.headline || brief.topic);
      setImageOptions([]);
      setSelectedImage('');
      setFinalImageUrl('');
      if (isGuided) {
        await createImageOptions({
          generation: res,
          topicValue: brief.topic,
          captionValue: [nextCaption, nextCta].filter(Boolean).join('\n\n'),
          directionValue: nextDirection,
          automatic: true
        });
      } else {
        setMsg({ type: 'ok', text: 'Conteúdo criado. Revise o texto e prepare a imagem.' });
      }
    } catch (error) {
      setMsg({ type: 'err', text: error.message });
    } finally {
      setBusy('');
    }
  }

  async function createImageOptions({
    generation = gen,
    topicValue = effectiveTopic,
    captionValue = publishCaption,
    directionValue = visualDirection,
    automatic = false
  } = {}) {
    if (!generation) return;
    if (!String(captionValue || '').trim() || !String(cta || '').trim() && !automatic) {
      setMsg({ type: 'err', text: 'Inclua uma CTA antes de gerar as imagens.' });
      return;
    }
    setBusy('images');
    setMsg(null);
    setFinalImageUrl('');
    try {
      const res = await generateNewsImages({
        brandId,
        topic: topicValue || generation.spec.headline,
        caption: captionValue,
        direction: directionValue,
        basePrompt: generation.spec.imagePrompt
      });
      if (res?.error) throw new Error(res.error);
      if (!Array.isArray(res.imageUrls) || res.imageUrls.length !== 4) {
        throw new Error('Não foi possível gerar as quatro imagens. Tente novamente.');
      }
      setImageOptions(res.imageUrls || []);
      setSelectedImage(res.imageUrls?.[0] || '');
      if (automatic) {
        setTextEnabled(false);
        setFinalImageUrl(res.imageUrls[0]);
      }
      setMsg({
        type: 'ok',
        text: automatic
          ? 'Conteúdo e quatro opções de imagem estão prontos. A primeira já está preparada; ajustes são opcionais.'
          : 'Quatro opções de imagem foram criadas. Escolha a que combina melhor com o conteúdo.'
      });
    } catch (error) {
      setMsg({ type: 'err', text: error.message });
    } finally {
      setBusy('');
    }
  }

  function chooseImage(url) {
    setSelectedImage(url);
    setFinalImageUrl('');
  }

  async function useSelectedImage() {
    if (imageOptions.length !== 4) {
      setMsg({ type: 'err', text: 'Gere exatamente quatro imagens antes de finalizar a arte.' });
      return;
    }
    if (!selectedImage) return;
    setBusy('finalize');
    setMsg(null);
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
      setMsg({
        type: 'ok',
        text: textEnabled && imageTitle.trim()
          ? 'Imagem final com título pronta para publicar.'
          : 'Imagem escolhida pronta para publicar.'
      });
    } catch (error) {
      setMsg({ type: 'err', text: error.message });
    } finally {
      setBusy('');
    }
  }

  async function run(action) {
    if (imageOptions.length !== 4) {
      setMsg({ type: 'err', text: 'São necessárias exatamente quatro imagens para publicar.' });
      return;
    }
    if (!cta.trim()) {
      setMsg({ type: 'err', text: 'Inclua uma CTA antes de publicar.' });
      return;
    }
    const imageUrl = finalImageUrl || selectedImage;
    if (!imageUrl) {
      setMsg({ type: 'err', text: 'Crie e escolha uma imagem antes de publicar.' });
      return;
    }
    if (!finalImageUrl) {
      setMsg({ type: 'err', text: 'Clique em “Usar esta imagem” para preparar a arte final.' });
      return;
    }

    const scheduledDate = localScheduledDate(selectedDate, selectedTime);
    if (action === 'schedule' && !scheduledDate) {
      setMsg({ type: 'err', text: 'Escolha um dia e um horário.' });
      return;
    }
    if (action === 'schedule' && scheduledDate <= new Date()) {
      setMsg({ type: 'err', text: 'Escolha um horário futuro.' });
      return;
    }

    setBusy(action);
    setMsg(null);
    setApprovalLink('');
    try {
      const payload = {
        brandId,
        caption: publishCaption,
        hashtags,
        imageUrls: [imageUrl]
      };
      let res;
      if (action === 'now') res = await publishNow(payload);
      else if (action === 'schedule') {
        res = await schedulePost({ ...payload, scheduledAt: scheduledDate.toISOString() });
      } else if (action === 'draft') res = await saveDraft(payload);
      else if (action === 'approval') res = await submitForApproval(payload);
      if (res?.error) throw new Error(res.error);

      if (action === 'approval' && res.token) {
        setApprovalLink(`${window.location.origin}/approve/${res.token}`);
        setMsg({ type: 'ok', text: 'Enviado para aprovação. Copie o link para o cliente.' });
      } else if (res?.warning) {
        setMsg({ type: 'warn', text: res.warning });
      } else {
        setMsg({
          type: 'ok',
          text: {
            now: 'Publicado no Instagram!',
            schedule: 'Post agendado!',
            draft: 'Rascunho salvo!'
          }[action]
        });
      }
    } catch (error) {
      setMsg({ type: 'err', text: error.message });
    } finally {
      setBusy('');
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(approvalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const field = 'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15';
  const tab = (active) => `flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${active ? 'bg-surface text-accent shadow-soft' : 'text-muted hover:text-ink'}`;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
      <div className="space-y-6">
        {!hasBrandKit && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-ink">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              Configure o <a href="/brand-kit" className="font-bold text-accent hover:underline">Brand Kit</a> desta marca para gerar conteúdo mais alinhado.
            </span>
          </div>
        )}

        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-accent">
                <Sparkles className="h-4 w-4" />
                Assistente de conteúdo
              </p>
              <h2 className="mt-2 break-words text-xl font-extrabold text-ink">Olá, {brandName}.</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                {weeklyMemory}
              </p>
            </div>
            <div className="inline-flex shrink-0 gap-1 self-start rounded-lg bg-surface-2 p-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setUiMode('guided')}
                className={`flex min-h-8 items-center gap-1 rounded-md px-2.5 py-1 ${uiMode === 'guided' ? 'bg-surface text-accent shadow-soft' : 'text-muted hover:text-ink'}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Guiado
              </button>
              <button
                type="button"
                onClick={() => setUiMode('advanced')}
                className={`flex min-h-8 items-center gap-1 rounded-md px-2.5 py-1 ${uiMode === 'advanced' ? 'bg-surface text-accent shadow-soft' : 'text-muted hover:text-ink'}`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Avançado
              </button>
            </div>
          </div>

          {uiMode === 'guided' ? (
            <>
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-extrabold text-ink">O que você quer fazer agora?</h3>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {opportunities.map((opportunity, index) => {
                    const isSuggestionRequest = opportunity.label === 'Não sei. Me sugira algo.'
                      || opportunity.id === 'suggest-for-me';
                    const isSelected = !isSuggestionRequest
                      && selectedOpportunity
                      && (selectedOpportunity.id || selectedOpportunity.label) === (opportunity.id || opportunity.label);
                    return (
                      <button
                        key={opportunity.id || `${opportunity.label}-${index}`}
                        type="button"
                        onClick={() => selectOpportunity(opportunity)}
                        disabled={!!busy}
                        aria-pressed={isSelected}
                        className={`min-h-24 rounded-lg border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? 'border-accent bg-accent/10'
                            : isSuggestionRequest
                              ? 'border-dashed border-accent/50 bg-accent/5 hover:border-accent'
                              : 'border-line bg-surface hover:border-accent/50 hover:bg-surface-2'
                        }`}
                      >
                        <span className="block break-words text-sm font-extrabold text-ink">
                          {opportunity.label}
                        </span>
                        <span className="mt-1 block break-words text-xs leading-relaxed text-muted">
                          {opportunity.description || 'Sugestão pronta para adaptar à sua marca.'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedOpportunity && (
                <div className="flex items-start gap-3 rounded-lg border border-accent/25 bg-accent/5 p-3.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-ink">
                      {wasSuggested ? 'Sugestão escolhida para você: ' : 'Oportunidade escolhida: '}
                      {selectedOpportunity.label}
                    </p>
                    <p className="mt-1 break-words text-xs text-muted">
                      {opportunityBrief(selectedOpportunity).format} · {opportunityBrief(selectedOpportunity).goal}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 border-t border-line pt-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink">Assunto</label>
                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Ex: Nova lei trabalhista, dicas de saúde bucal..."
                  className={field}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FreeInput
                  label="Formato de conteúdo"
                  value={format}
                  onChange={setFormat}
                  placeholder="Ex: Carrossel, Reel, tutorial..."
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
              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink">Objetivo</label>
                <input
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="Engajar, educar, gerar leads..."
                  className={field}
                />
              </div>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={ignoreDna}
              onChange={(event) => setIgnoreDna(event.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Ignorar Brand DNA
          </label>

          <Button
            onClick={() => generate()}
            disabled={busy === 'gen' || !effectiveTopic}
            className="w-full !rounded-lg sm:w-auto"
          >
            <Wand2 className="h-4 w-4" />
            {busy === 'gen' ? 'Preparando conteúdo...' : gen ? 'Gerar novamente' : 'Preparar conteúdo'}
          </Button>
        </section>

        {gen && (
          <>
            <section className="space-y-3 border-t border-line pt-5">
              <div>
                <h2 className="text-base font-extrabold text-ink">Revise o conteúdo</h2>
                <p className="mt-1 text-xs text-muted">Ajuste o texto antes de criar a imagem.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink">Legenda</label>
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  rows={5}
                  className={field}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink">Chamada para ação (CTA) obrigatória</label>
                <input
                  value={cta}
                  onChange={(event) => setCta(event.target.value)}
                  placeholder="Ex: Salve este post para consultar depois."
                  className={field}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-ink">Hashtags</label>
                <input
                  value={hashtags}
                  onChange={(event) => setHashtags(event.target.value)}
                  className={field}
                />
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-line bg-surface p-4 shadow-soft sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-extrabold text-ink">
                    <ImageIcon className="h-4 w-4 text-accent" />
                    Imagem do conteúdo
                  </h2>
                  <p className="mt-1 text-xs text-muted">Crie quatro opções e escolha a melhor.</p>
                </div>
                <span className="max-w-full break-words text-xs font-semibold text-accent">
                  {effectiveTopic || gen.spec.headline}
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={visualDirection}
                  onChange={(event) => {
                    setVisualDirection(event.target.value);
                    setFinalImageUrl('');
                  }}
                  placeholder="Direção visual: moderno, esportivo, sem pessoas..."
                  className={field}
                />
                <Button
                  onClick={() => createImageOptions()}
                  disabled={busy === 'images'}
                  className="shrink-0 !rounded-lg"
                >
                  <RefreshCw className={`h-4 w-4 ${busy === 'images' ? 'animate-spin' : ''}`} />
                  {busy === 'images' ? 'Criando...' : 'Criar opções'}
                </Button>
              </div>

              {imageOptions.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {imageOptions.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => chooseImage(url)}
                      aria-label={`Escolher opção ${index + 1}`}
                      aria-pressed={selectedImage === url}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                        selectedImage === url
                          ? 'border-accent ring-2 ring-accent/30'
                          : 'border-transparent hover:border-line'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Opção ${index + 1} gerada para o conteúdo`}
                        className="h-full w-full object-cover"
                      />
                      {selectedImage === url && (
                        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-accent text-white">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedImage && (
                <div className="space-y-3 border-t border-line pt-4">
                  <label className="flex items-center justify-between gap-3 text-sm font-bold text-ink">
                    <span className="flex min-w-0 items-center gap-2">
                      <Type className="h-4 w-4 shrink-0 text-accent" />
                      <span className="break-words">Adicionar título na imagem</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={textEnabled}
                      onChange={(event) => {
                        setTextEnabled(event.target.checked);
                        setFinalImageUrl('');
                      }}
                      className="h-5 w-5 shrink-0 accent-accent"
                    />
                  </label>
                  {textEnabled && (
                    <>
                      <input
                        value={imageTitle}
                        maxLength={90}
                        onChange={(event) => {
                          setImageTitle(event.target.value);
                          setFinalImageUrl('');
                        }}
                        placeholder="Título curto para a imagem"
                        className={field}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ['top', 'Topo'],
                          ['center', 'Centro'],
                          ['bottom', 'Base']
                        ].map(([position, label]) => (
                          <button
                            key={position}
                            type="button"
                            onClick={() => {
                              setTitlePosition(position);
                              setFinalImageUrl('');
                            }}
                            className={`min-h-9 rounded-lg border px-2 py-2 text-xs font-bold ${
                              titlePosition === position
                                ? 'border-accent bg-accent/10 text-accent'
                                : 'border-line text-muted hover:text-ink'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <Button
                    onClick={useSelectedImage}
                    disabled={busy === 'finalize'}
                    className="w-full !rounded-lg"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {busy === 'finalize'
                      ? 'Preparando imagem...'
                      : finalImageUrl
                        ? 'Imagem pronta para publicar'
                        : 'Usar esta imagem'}
                  </Button>
                </div>
              )}
            </section>

            <section className="space-y-4 border-t border-line pt-5">
              <div className="inline-flex w-full gap-1 rounded-lg bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => setMode('now')}
                  className={tab(mode === 'now')}
                >
                  <Send className="h-3.5 w-3.5" />
                  Publicar agora
                </button>
                <button
                  type="button"
                  onClick={() => setMode('schedule')}
                  className={tab(mode === 'schedule')}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Agendar
                </button>
              </div>

              {mode === 'schedule' && (
                <div className="space-y-4 rounded-lg border border-line bg-surface p-4">
                  <div className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <p className="text-sm font-bold text-ink">Escolha o melhor momento</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {hasMetricSignal
                          ? 'Horários recomendados com base nas métricas recentes do Instagram.'
                          : 'Sugestões iniciais para você começar. Elas melhoram conforme chegam novas métricas.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-ink">Próximos dias</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {scheduleDates.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSelectedDate(item.key)}
                          aria-pressed={selectedDate === item.key}
                          className={`min-h-16 rounded-lg border px-2 py-2 text-center ${
                            selectedDate === item.key
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-line text-muted hover:border-accent/50 hover:text-ink'
                          }`}
                        >
                          <span className="block text-[11px] font-bold uppercase">{item.weekday}</span>
                          <span className="mt-0.5 block text-xs font-extrabold">{item.day}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedScheduleDay && (
                    <div>
                      <p className="mb-2 break-words text-xs font-bold text-ink">
                        Horários para {selectedScheduleDay.fullLabel}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedScheduleDay.times.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setSelectedTime(time)}
                            aria-pressed={selectedTime === time}
                            className={`min-h-9 min-w-20 rounded-lg border px-3 py-2 text-xs font-bold ${
                              selectedTime === time
                                ? 'border-accent bg-accent/10 text-accent'
                                : 'border-line text-muted hover:border-accent/50 hover:text-ink'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  onClick={() => run(mode)}
                  disabled={!!busy}
                  className="!rounded-lg"
                >
                  {mode === 'now' ? <Send className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  {busy === mode
                    ? 'Processando...'
                    : mode === 'now'
                      ? 'Publicar no Instagram'
                      : 'Agendar publicação'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => run('approval')}
                  disabled={!!busy}
                  className="!rounded-lg"
                >
                  <Link2 className="h-4 w-4" />
                  {busy === 'approval' ? 'Enviando...' : 'Enviar para aprovação'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => run('draft')}
                  disabled={!!busy}
                  className="!rounded-lg"
                >
                  <FileText className="h-4 w-4" />
                  {busy === 'draft' ? 'Salvando...' : 'Salvar rascunho'}
                </Button>
              </div>
            </section>
          </>
        )}

        {msg && (
          <p className={`flex items-start gap-1.5 text-xs font-semibold ${
            msg.type === 'ok'
              ? 'text-success'
              : msg.type === 'warn'
                ? 'text-warning'
                : 'text-danger'
          }`}>
            {msg.type === 'ok'
              ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="break-words">{msg.text}</span>
          </p>
        )}

        {approvalLink && (
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 p-2">
            <Link2 className="ml-1 h-4 w-4 shrink-0 text-accent" />
            <input
              readOnly
              value={approvalLink}
              aria-label="Link de aprovação"
              className="min-w-0 flex-1 bg-transparent text-[11px] text-muted outline-none"
            />
            <button
              type="button"
              onClick={copyLink}
              title="Copiar link"
              aria-label="Copiar link de aprovação"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>

      <aside className="order-first lg:order-none lg:sticky lg:top-4">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase text-muted">
          <Instagram className="h-3.5 w-3.5 text-accent" />
          Prévia da publicação
        </p>
        <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-extrabold text-accent">
              {String(brandName || 'S').trim().charAt(0).toUpperCase()}
            </div>
            <p className="min-w-0 truncate text-xs font-bold text-ink">{brandName}</p>
          </div>

          <div className="relative aspect-square w-full bg-surface-2">
            {previewImage ? (
              <>
                <img src={previewImage} alt="Prévia da publicação" className="h-full w-full object-cover" />
                {textEnabled && imageTitle.trim() && !finalImageUrl && (
                  <div className={`absolute inset-0 flex p-5 ${TITLE_POSITION[titlePosition]}`}>
                    <div className="w-full bg-gradient-to-t from-black/80 via-black/25 to-transparent px-2 py-5 text-2xl font-extrabold leading-tight text-white drop-shadow-lg">
                      {imageTitle}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="grid h-full place-items-center px-6 text-center">
                <div>
                  <ImageIcon className="mx-auto h-7 w-7 text-faint" />
                  <p className="mt-3 break-words text-xs leading-relaxed text-muted">
                    {busy === 'images'
                      ? 'Criando opções de imagem...'
                      : selectedOpportunity
                        ? `A imagem de “${selectedOpportunity.label}” aparecerá aqui.`
                        : uiMode === 'guided'
                          ? 'Escolha uma oportunidade para começar.'
                          : 'Preencha o assunto e prepare o conteúdo para começar.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-line p-3.5 text-xs">
            <p className="break-words leading-relaxed text-ink">
              <strong>{brandName}</strong>{' '}
              {caption || 'Sua legenda aparecerá aqui conforme o conteúdo for preparado.'}
            </p>
            {cta && <p className="break-words font-semibold text-ink">{cta}</p>}
            {hashtags && <p className="break-words text-accent">{hashtags}</p>}
            {finalImageUrl && <p className="font-bold text-success">Imagem final pronta.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
