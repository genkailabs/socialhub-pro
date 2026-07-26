import 'server-only';
import { researchContext } from '@/lib/ai/research';
import { validateContentSources } from '@/lib/content-source-contract';

function opportunityBrief(opportunity = {}) {
  return {
    topic: String(opportunity.topic || '').trim(),
    objective: String(opportunity.objective || opportunity.goal || '').trim(),
    format: String(opportunity.format || '').trim(),
    research: true
  };
}

// Uses the existing search/cache adapter once, then turns unverified provider
// output into an explicit unavailable state instead of prompt-ready "facts".
export async function researchForOpportunity({ opportunity, kit = {}, supabase } = {}) {
  try {
    const research = await researchContext({ supabase, brief: opportunityBrief(opportunity), kit });
    const sources = validateContentSources({ sources: research?.sources, images: research?.images || [] });
    if (!sources.ok) return { status: 'unavailable', reason: sources.reason, research: null };
    return {
      status: 'available',
      reason: null,
      research: {
        ...research,
        sources: sources.sources,
        images: sources.images
      }
    };
  } catch {
    return { status: 'unavailable', reason: 'research-unavailable', research: null };
  }
}
