'use server';

import { createClient } from '@/lib/supabase/server';
import { getComposerContext } from '@/lib/composer-intelligence';
import { getLatestAudit } from '@/lib/instagram-audit-data';
import { selectDailyOpportunity } from '@/lib/daily-content-package';
import { researchForOpportunity } from '@/lib/content-research';
import { needsResearch } from '@/lib/ai/research';
import { generateCreative } from '@/lib/ai/generate';
import {
  createDailyContentService,
  getDailyContentPackage,
  getDailyContentPackageById,
  getOwnedBrand,
  markDailyContentFailed,
  markDailyContentReady,
  reserveDailyContentPackage,
  transitionDailyContentPackage
} from '@/lib/daily-content-data';

function altTextFrom(spec = {}) {
  const explicit = spec.altText || spec.alt_text || spec.imageAlt || spec.image_alt;
  if (explicit) return String(explicit).trim().slice(0, 1000);
  const title = spec.imageTitle || spec.image_title || spec.headline || spec.title;
  return title ? `Arte para ${String(title).trim()}`.slice(0, 1000) : null;
}

async function serviceForRequest() {
  const supabase = await createClient();
  const now = () => new Date();
  return createDailyContentService({
    now,
    authenticate: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user || null;
    },
    getOwnedBrand: ({ brandId }) => getOwnedBrand({ supabase, brandId }),
    getPackageForDate: ({ brandId, contentDate }) => getDailyContentPackage({ supabase, brandId, contentDate }),
    getPackageById: ({ packageId }) => getDailyContentPackageById({ supabase, packageId }),
    reservePackage: (input) => reserveDailyContentPackage({ supabase, ...input }),
    markReady: (input) => markDailyContentReady({ supabase, ...input }),
    markFailed: (input) => markDailyContentFailed({ supabase, ...input }),
    transitionPackage: (input) => transitionDailyContentPackage({ supabase, ...input, now: now() }),
    loadContext: async ({ brandId, brand }) => {
      const [{ data: kit, error: kitError }, audit] = await Promise.all([
        supabase.from('brand_kits').select('*').eq('brand_id', brandId).maybeSingle(),
        getLatestAudit(brandId)
      ]);
      if (kitError) throw kitError;
      const composer = await getComposerContext({ brandId, brand, audit });
      return { ...composer, audit, kit: kit || null };
    },
    selectOpportunity: selectDailyOpportunity,
    requiresResearch: needsResearch,
    researchOpportunity: async ({ opportunity, context }) => {
      const result = await researchForOpportunity({ opportunity, kit: context.kit || {}, supabase });
      // Task 2 calls the fully validated outcome "available". The persistence
      // boundary names that same guarantee "verified" and rejects all others.
      return result.status === 'available' && result.research
        ? { status: 'verified', reason: null, research: result.research }
        : result;
    },
    generateContent: async ({ brand, opportunity, context, verifiedResearch }) => {
      const generated = await generateCreative({
        supabase,
        brandId: brand.id,
        brandName: brand.name,
        brandColor: brand.color,
        kit: context.kit || null,
        brief: {
          topic: opportunity.topic,
          objective: opportunity.objective || opportunity.goal || '',
          format: opportunity.format
        },
        composerContext: context,
        verifiedResearch,
        allowResearch: false,
        generateImages: true
      });
      return {
        generatedContent: generated.spec,
        mediaUrls: generated.imageUrls || [],
        altText: altTextFrom(generated.spec)
      };
    }
  });
}

export async function prepareDailyContent(input) {
  const service = await serviceForRequest();
  return service.prepare(input);
}

export async function approveDailyContent(input) {
  const service = await serviceForRequest();
  return service.approve(input);
}

export async function scheduleDailyContent(input) {
  const service = await serviceForRequest();
  return service.schedule(input);
}
