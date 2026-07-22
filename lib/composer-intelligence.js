import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { activeStrategy, itemWithinWeek, weekStartOf } from '@/lib/strategy-plan';

const PUBLISHED_POST_STATUSES = ['published', 'posted_manually'];
const USABLE_PLAN_ITEM_STATUSES = ['approved'];

const FALLBACK_SLOTS = [
  { weekday: 1, time: '12:00', label: 'Segunda, 12:00' },
  { weekday: 3, time: '18:00', label: 'Quarta, 18:00' },
  { weekday: 5, time: '11:00', label: 'Sexta, 11:00' }
];

const FORMAT_LABELS = {
  CAROUSEL_ALBUM: 'carrossel',
  CAROUSEL: 'carrossel',
  REELS: 'Reels',
  REEL: 'Reels',
  VIDEO: 'videos',
  IMAGE: 'posts de imagem',
  PHOTO: 'posts de imagem'
};

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function formatLabel(format) {
  const key = normalize(format).replace(/[ -]/g, '_').toUpperCase();
  return FORMAT_LABELS[key] || (String(format || '').trim() || 'posts');
}

function weekEndIso(weekStart) {
  return new Date(new Date(`${weekStart}T00:00:00.000Z`).getTime() + 7 * 24 * 3600 * 1000).toISOString();
}

export function filterCurrentWeekPublishedPosts(posts = [], now = new Date()) {
  const weekStart = weekStartOf(now);
  const start = new Date(`${weekStart}T00:00:00.000Z`).getTime();
  const end = new Date(weekEndIso(weekStart)).getTime();

  return posts.filter((post) => {
    if (!PUBLISHED_POST_STATUSES.includes(post?.status)) return false;
    const publishedAt = new Date(post.scheduled_at || post.published_at || post.created_at).getTime();
    return !Number.isNaN(publishedAt) && publishedAt >= start && publishedAt < end;
  });
}

export function getStrategyObjective(strategy = null) {
  const objectives = strategy?.objectives;
  if (typeof objectives === 'string') return objectives.trim() || null;
  if (Array.isArray(objectives)) return String(objectives[0] || '').trim() || null;
  if (!objectives || typeof objectives !== 'object') return null;

  return String(objectives.main || objectives.primary || objectives.proposal || objectives.secondary?.[0] || objectives.secondary || '').trim() || null;
}

export function filterUsablePlanItems(items = [], weekStart) {
  return items.filter((item) => (
    USABLE_PLAN_ITEM_STATUSES.includes(item?.status)
    && itemWithinWeek(item.date, weekStart)
  ));
}

function auditOpportunities(audit) {
  const analysis = audit?.ai_analysis || audit?.analysis || {};
  const raw = [
    ...(analysis.opportunities || []),
    ...(analysis.attention || []),
    ...(analysis.priorities || [])
  ];
  const seen = new Set();

  return raw
    .map((item) => ({
      title: String(typeof item === 'string' ? item : item?.title || '').trim(),
      detail: String(typeof item === 'object' ? item?.detail || '' : '').trim()
    }))
    .filter((item) => item.title && !seen.has(item.title.toLowerCase()) && seen.add(item.title.toLowerCase()))
    .slice(0, 2)
    .map((item, index) => ({
      id: `audit-${index}`,
      label: `Aproveitar uma oportunidade do diagnostico: ${item.title}`,
      description: item.detail || 'Sugestao baseada na analise mais recente do seu Instagram',
      topic: item.title,
      format: 'Post para Instagram',
      goal: 'melhorar o desempenho do perfil'
    }));
}

function nicheOpportunities(niche) {
  const normalized = normalize(niche);
  if (/arquitet|interior|design/.test(normalized)) {
    return [
      { label: 'Mostrar um processo de projeto', topic: 'Uma decisao de projeto explicada de forma simples', format: 'Carrossel', goal: 'educar' },
      { label: 'Inspirar com uma solucao visual', topic: 'Uma inspiracao visual aplicada a um ambiente real', format: 'Carrossel', goal: 'engajar' },
      { label: 'Mostrar um detalhe que faz diferenca', topic: 'Um detalhe funcional ou estetico de um projeto', format: 'Post para Instagram', goal: 'fortalecer autoridade' },
      { label: 'Explicar uma escolha de materiais', topic: 'Como uma escolha de materiais apoia um projeto', format: 'Reel', goal: 'educar' }
    ];
  }
  if (/advoca|juridic|direito/.test(normalized)) {
    return [
      { label: 'Explicar uma duvida comum', topic: 'Uma duvida frequente explicada com linguagem acessivel', format: 'Carrossel', goal: 'educar' },
      { label: 'Traduzir um tema importante', topic: 'Um tema juridico relevante no dia a dia', format: 'Post educativo', goal: 'fortalecer autoridade' },
      { label: 'Comentar uma situacao do dia a dia', topic: 'Uma situacao cotidiana que merece atencao juridica', format: 'Carrossel', goal: 'educar' },
      { label: 'Organizar perguntas frequentes', topic: 'Perguntas frequentes sobre um servico ou area de atuacao', format: 'Post para Instagram', goal: 'engajar' }
    ];
  }
  if (/medic|saude|odonto|dent|psic|clinic/.test(normalized)) {
    return [
      { label: 'Responder uma duvida frequente', topic: 'Uma duvida frequente explicada de forma educativa', format: 'Carrossel', goal: 'educar' },
      { label: 'Falar de prevencao e cuidado', topic: 'Um habito de cuidado que ajuda no dia a dia', format: 'Post educativo', goal: 'construir confianca' },
      { label: 'Desfazer um mito comum', topic: 'Um mito comum explicado com responsabilidade', format: 'Carrossel', goal: 'educar' },
      { label: 'Mostrar um bastidor acolhedor', topic: 'Um bastidor que ajuda o publico a entender seu atendimento', format: 'Reel', goal: 'aproximar' }
    ];
  }
  return [
    { label: 'Responder uma duvida frequente', topic: 'Uma duvida frequente do seu publico', format: 'Carrossel', goal: 'educar' },
    { label: 'Mostrar como voce trabalha', topic: 'Um bastidor ou processo que aproxima sua marca', format: 'Reel', goal: 'aproximar' },
    { label: 'Explicar um servico importante', topic: 'Um servico que merece ser conhecido pelo seu publico', format: 'Post para Instagram', goal: 'fortalecer autoridade' },
    { label: 'Criar uma lista pratica', topic: 'Dicas praticas que ajudam seu publico no dia a dia', format: 'Carrossel', goal: 'engajar' }
  ];
}

function planOpportunities(planItems = []) {
  return planItems
    .filter((item) => item?.topic || item?.title)
    .slice(0, 3)
    .map((item, index) => ({
      id: `plan-${item.id || index}`,
      label: item.title || `Seguir o plano: ${item.topic}`,
      description: 'Sugestao do seu plano editorial',
      topic: item.topic || item.title,
      format: item.format || 'Post para Instagram',
      goal: item.objective || 'engajar'
    }));
}

export function buildLocalOpportunities({ planItems = [], strategy = null, recentPosts = [], audit = null, niche = '' } = {}) {
  const planned = planOpportunities(planItems);
  const diagnostic = auditOpportunities(audit);
  const base = nicheOpportunities(niche).map((item, index) => ({
    id: `local-${index}`,
    description: 'Sugestao pronta para adaptar a sua marca',
    ...item
  }));
  const objective = getStrategyObjective(strategy);
  const recentTopic = recentPosts.find((post) => post?.title || post?.content)?.title
    || recentPosts.find((post) => post?.content)?.content?.slice(0, 80);
  const contextual = [];

  if (objective) {
    contextual.push({
      id: 'strategy-objective',
      label: `Avancar o objetivo: ${objective}`,
      description: 'Baseado na sua estrategia de conteudo',
      topic: objective,
      format: 'Post para Instagram',
      goal: objective
    });
  }
  if (recentTopic) {
    contextual.push({
      id: 'recent-topic',
      label: 'Dar continuidade a um tema recente',
      description: 'Uma forma de manter a conversa com seu publico',
      topic: `Aprofunde o tema: ${recentTopic}`,
      format: 'Carrossel',
      goal: 'engajar'
    });
  }

  return [
    ...planned,
    ...diagnostic,
    ...contextual,
    ...base,
    {
      id: 'suggest-for-me',
      label: 'Não sei. Me sugira algo.',
      description: 'Escolha uma ideia local para comecar',
      topic: 'Sugira um tema util dentro dos pilares da marca',
      format: 'Post para Instagram',
      goal: 'engajar'
    }
  ];
}

export function buildWeeklyMemory(posts = [], now = new Date()) {
  const publishedPosts = filterCurrentWeekPublishedPosts(posts, now);
  if (!publishedPosts.length) {
    return 'Ainda nao ha conteudos recentes nesta semana. Este pode ser um bom momento para criar o primeiro conteudo.';
  }

  const counts = new Map();
  for (const post of publishedPosts) {
    const label = formatLabel(post.format || post.media_type);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  const formatSummary = [...counts.entries()]
    .map(([label, count]) => `${count} ${label}`)
    .join(', ');
  const topics = publishedPosts
    .map((post) => String(post.title || post.content || '').trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((topic) => topic.slice(0, 60));
  const topicSummary = topics.length ? ` Os temas recentes foram ${topics.join(' e ')}.` : '';

  return `Nesta semana, voce publicou ${publishedPosts.length} conteudos: ${formatSummary}.${topicSummary}`;
}

export function getRecommendedSlots(audit = null) {
  const metrics = audit?.calculated_metrics || audit?.metrics || audit || {};
  const bestTimes = Array.isArray(metrics?.bestTimes) ? metrics.bestTimes : [];
  const measuredTimes = bestTimes.filter((slot) => (
    Number.isInteger(slot?.weekday)
    && Number.isInteger(slot?.hour)
    && slot.weekday >= 0
    && slot.weekday <= 6
    && slot.hour >= 0
    && slot.hour <= 23
    && slot.basis !== 'heuristic'
  ));

  if (!measuredTimes.length) {
    return { recommendedSlots: FALLBACK_SLOTS, hasMetricSignal: false };
  }

  return {
    hasMetricSignal: true,
    recommendedSlots: measuredTimes.slice(0, 4).map((slot) => ({
      weekday: slot.weekday,
      time: `${String(slot.hour).padStart(2, '0')}:00`,
      label: `${['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'][slot.weekday]}, ${String(slot.hour).padStart(2, '0')}:00`
    }))
  };
}

async function safeQuery(query) {
  try {
    const { data } = await query();
    return data || [];
  } catch {
    return [];
  }
}

export async function getComposerContext({ brandId, brand = {}, audit = null } = {}) {
  const now = new Date();
  const currentWeek = weekStartOf(now);
  const currentWeekEnd = weekEndIso(currentWeek);
  const today = now.toISOString().slice(0, 10);
  const slots = getRecommendedSlots(audit);
  const fallback = {
    opportunities: buildLocalOpportunities({ audit, niche: brand.niche || brand.category }),
    weeklyMemory: buildWeeklyMemory([], now),
    ...slots
  };
  if (!brandId) return fallback;

  try {
    const supabase = await createClient();
    const [recentPosts, strategies, plans] = await Promise.all([
      safeQuery(() => supabase.from('posts')
        .select('id, title, content, format, media_type, status, scheduled_at, created_at')
        .eq('brand_id', brandId)
        .in('status', PUBLISHED_POST_STATUSES)
        .gte('scheduled_at', `${currentWeek}T00:00:00.000Z`)
        .lt('scheduled_at', currentWeekEnd)
        .order('scheduled_at', { ascending: false })
        .limit(12)),
      safeQuery(() => supabase.from('content_strategies')
        .select('id, objectives, pillars, status, created_at')
        .eq('brand_id', brandId)
        .eq('status', 'approved')
        .lte('period_start', today)
        .gte('period_end', today)
        .limit(1)),
      safeQuery(() => supabase.from('editorial_plans')
        .select('id, created_at')
        .eq('brand_id', brandId)
        .eq('week_start', currentWeek)
        .in('status', USABLE_PLAN_ITEM_STATUSES)
        .limit(1))
    ]);
    const plan = plans[0];
    const planItems = plan?.id
      ? await safeQuery(() => supabase.from('editorial_plan_items')
        .select('id, title, topic, format, objective, status, date')
        .eq('plan_id', plan.id)
        .in('status', USABLE_PLAN_ITEM_STATUSES)
        .order('date', { ascending: true })
        .limit(6))
      : [];

    return {
      opportunities: buildLocalOpportunities({
        planItems: filterUsablePlanItems(planItems, currentWeek),
        strategy: activeStrategy(strategies),
        recentPosts: filterCurrentWeekPublishedPosts(recentPosts, now),
        audit,
        niche: brand.niche || brand.category
      }),
      weeklyMemory: buildWeeklyMemory(recentPosts, now),
      ...slots
    };
  } catch {
    return fallback;
  }
}

export function getFormatStructurePrompt(format = 'post') {
  const clean = normalize(format);
  if (/carross|carousel/.test(clean)) {
    return `Para Carrossel: retorne 'slides' entre 2 e 10, 'template':'tips_carousel', e em 'content_details' retorne 'pages': um array onde cada item tem {'title':'título do slide', 'text':'texto do slide', 'visualDirection':'orientação visual do slide'}. No último slide, adicione também a chamada para ação (CTA). Em 'caption' retorne a legenda global do carrossel.`;
  }
  if (/stor/.test(clean)) {
    return `Para Story: gere texto curto para overlay na imagem em 'image_title' (até 8 palavras) e uma CTA visual para interação na tela (enquete, caixa de perguntas ou link) em 'content_details.ctaVisual' e 'content_details.overlayText'. IMPORTANTE: Stories não têm legenda no feed, portanto deixe 'caption' vazio ('') e 'hashtags' vazio ([]).`;
  }
  if (/reel|video/.test(clean)) {
    return `Para Reel: em 'content_details' retorne {'topic':'tema e ideia do reel', 'hook':'gancho impactante dos primeiros 3 segundos', 'script':'desenvolvimento em cenas sequenciais', 'spokenText':'texto falado/narrado', 'onScreenText':'texto visual exibido na tela', 'coverSuggestion':'sugestão detalhada de imagem/arte para a capa do reel'}.`;
  }
  return `Para Post de imagem: em 'content_details' retorne {'idea':'ideia principal e ângulo do post', 'artDirection':'direção visual detalhada para a arte', 'feedCaption':'legenda de feed em pt-BR', 'hashtags':['#tag1'], 'cta':'chamada para ação'}.`;
}

export function formatStructureSuggestions(format = 'post') {
  const clean = normalize(format);
  if (/carross|carousel/.test(clean)) {
    return { kind: 'carousel', minSlides: 2, maxSlides: 10, requiresSlideTitle: true, requiresGlobalCaption: true, hasFeedCaption: true };
  }
  if (/stor/.test(clean)) {
    return { kind: 'stories', hasFeedCaption: false, requiresOverlayText: true, requiresVisualCta: true };
  }
  if (/reel|video/.test(clean)) {
    return { kind: 'reel', requiresHook: true, requiresScenes: true, requiresCoverSuggestion: true, hasFeedCaption: true };
  }
  return { kind: 'post', hasFeedCaption: true, requiresArtDirection: true };
}
