import {
  filterCurrentWeekPublishedPosts,
  filterUsablePlanItems,
  getRecommendedSlots
} from '@/lib/composer-intelligence';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function currentWeekStart(now) {
  const date = new Date(now);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return date.toISOString().slice(0, 10);
}

function topicOf(item) {
  return String(item?.topic || item?.title || '').trim();
}

function objectiveOf(item) {
  return String(item?.objective || item?.goal || '').trim();
}

function staticDailyFormat(value) {
  const format = normalize(value);
  if (/carross|carousel/.test(format)) return 'Carrossel';
  if (/reel|video/.test(format)) return null;
  if (/stor/.test(format)) return null;
  if (/post|feed|image|imagem|foto|news|noticia/.test(format)) return 'Post';
  return null;
}

function hasApprovedProvenance(item) {
  const status = item?.status || item?.provenance?.status;
  const source = item?.provenance?.source;
  return status === 'approved'
    && ['editorial-plan', 'content-strategy', 'brand-dna'].includes(source);
}

function contextualCandidates(context) {
  const opportunities = context.contextualOpportunities || context.opportunities || [];
  return Array.isArray(opportunities)
    ? opportunities.filter((item) => (
      hasApprovedProvenance(item)
      && topicOf(item)
      && objectiveOf(item)
      && item?.format
    ))
    : [];
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = normalize(item?.[key]);
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
    return counts;
  }, new Map());
}

function recommendedAt(audit) {
  const { recommendedSlots, hasMetricSignal } = getRecommendedSlots(audit);
  const slot = recommendedSlots[0];
  if (!slot) return null;

  return {
    weekday: slot.weekday,
    time: slot.time,
    source: hasMetricSignal ? 'measured' : 'fallback'
  };
}

function toPackage(candidate, reason, slot, avoidReasons) {
  return {
    topic: topicOf(candidate),
    objective: objectiveOf(candidate),
    format: staticDailyFormat(candidate.format),
    reason,
    sourceRequirement: reason === 'approved-calendar'
      ? 'approved-calendar'
      : 'approved-strategy-and-brand-dna',
    recommendedAt: slot,
    avoidReasons
  };
}

/**
 * Selects a daily opportunity from already-loaded Composer context.
 * It deliberately has no database or network dependency.
 */
export function selectDailyOpportunity(context = {}) {
  const now = context.now || new Date();
  const publishedPosts = filterCurrentWeekPublishedPosts(context.posts || context.recentPosts || [], now);
  const publishedTopics = new Set(publishedPosts.map(topicOf).map(normalize).filter(Boolean));
  const excludedTopics = new Set();
  const excludedFormats = new Set();
  const safe = (candidate) => {
    const topic = normalize(topicOf(candidate));
    if (!topic || !objectiveOf(candidate) || !candidate?.format) return false;
    if (!staticDailyFormat(candidate.format)) {
      excludedFormats.add(/reel|video/.test(normalize(candidate.format)) ? 'format-requires-video' : 'format-not-supported-by-daily-generator');
      return false;
    }
    if (!publishedTopics.has(topic)) return true;
    excludedTopics.add(topic);
    return false;
  };
  const slots = recommendedAt(context.audit);
  const planItems = context.planItems || context.calendarItems || [];
  const approvedPlans = filterUsablePlanItems(planItems, context.weekStart || currentWeekStart(now)).filter(safe);
  const avoidReasons = () => [
    ...(excludedTopics.size ? ['topic-published-this-week'] : []),
    ...excludedFormats
  ];

  if (approvedPlans.length) {
    return toPackage(approvedPlans[0], 'approved-calendar', slots, avoidReasons());
  }

  const objectives = countBy(publishedPosts, 'objective');
  const formats = countBy(publishedPosts.map((post) => ({
    format: staticDailyFormat(post.format || post.media_type)
  })), 'format');
  const opportunity = contextualCandidates(context)
    .filter(safe)
    .map((candidate, index) => ({
      candidate,
      index,
      objectiveCount: objectives.get(normalize(objectiveOf(candidate))) || 0,
      formatCount: formats.get(normalize(staticDailyFormat(candidate.format))) || 0
    }))
    .sort((a, b) => (
      a.objectiveCount - b.objectiveCount
      || a.formatCount - b.formatCount
      || a.index - b.index
    ))[0]?.candidate;

  return opportunity ? toPackage(opportunity, 'contextual-opportunity', slots, avoidReasons()) : null;
}

export function buildDailyPackageDraft(context = {}) {
  return selectDailyOpportunity(context);
}
