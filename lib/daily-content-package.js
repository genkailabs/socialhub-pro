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

function hasApprovedProvenance(item) {
  if (item?.status) return item.status === 'approved';
  return item?.provenance?.status === 'approved';
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
    format: String(candidate.format || '').trim(),
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
  const safe = (candidate) => {
    const topic = normalize(topicOf(candidate));
    if (!topic || !objectiveOf(candidate) || !candidate?.format) return false;
    if (!publishedTopics.has(topic)) return true;
    excludedTopics.add(topic);
    return false;
  };
  const slots = recommendedAt(context.audit);
  const planItems = context.planItems || context.calendarItems || [];
  const approvedPlans = filterUsablePlanItems(planItems, context.weekStart || currentWeekStart(now)).filter(safe);
  const avoidReasons = excludedTopics.size ? ['topic-published-this-week'] : [];

  if (approvedPlans.length) {
    return toPackage(approvedPlans[0], 'approved-calendar', slots, avoidReasons);
  }

  const objectives = countBy(publishedPosts, 'objective');
  const formats = countBy(publishedPosts, 'format');
  const opportunity = contextualCandidates(context)
    .filter(safe)
    .map((candidate, index) => ({
      candidate,
      index,
      objectiveCount: objectives.get(normalize(objectiveOf(candidate))) || 0,
      formatCount: formats.get(normalize(candidate.format)) || 0
    }))
    .sort((a, b) => (
      a.objectiveCount - b.objectiveCount
      || a.formatCount - b.formatCount
      || a.index - b.index
    ))[0]?.candidate;

  return opportunity ? toPackage(opportunity, 'contextual-opportunity', slots, avoidReasons) : null;
}

export function buildDailyPackageDraft(context = {}) {
  return selectDailyOpportunity(context);
}
