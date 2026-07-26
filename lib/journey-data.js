import { createClient } from '@/lib/supabase/server';
import { resolveJourney } from '@/lib/journey';
import { listConnectedPlatforms } from '@/lib/social-tokens-data';
import { countPlanItemsForBrand, listStrategies } from '@/lib/planning-data';
import { activeStrategy } from '@/lib/strategy-plan';

// Fatos da jornada, lidos do banco. A decisão mora em lib/journey.js — aqui só
// se busca o que ela precisa.
//
// Isto roda no layout, ou seja, em TODA navegação do grupo (app). Duas defesas
// contra o custo e contra o desastre:
//
//   1. curto-circuito: quem já concluiu paga 1 query, não 6;
//   2. falha aberta: qualquer erro devolve `conducting: false`. Um timeout de
//      banco não pode prender a pessoa numa tela.

async function readKit(supabase, brandId) {
  const { data } = await supabase
    .from('brand_kits')
    .select('onboarding_status, onboarding_step, onboarding_answers, dna_generated_at')
    .eq('brand_id', brandId)
    .maybeSingle();
  return data || null;
}

export async function getJourney(brandId) {
  // Sem marca a jornada começa do zero — e devolvemos objeto, nunca null, para
  // quem chama não precisar de dois caminhos.
  if (!brandId) return resolveJourney({ hasBrand: false }, null);

  try {
    const supabase = await createClient();
    const kit = await readKit(supabase, brandId);

    // Concluído é o caso comum de quem já usa o app: sai daqui barato.
    if (kit?.onboarding_status === 'completed') {
      return { ...resolveJourney({ hasBrand: true }, kit), conducting: false, completed: true };
    }

    const [platforms, strategies, planItems, audit] = await Promise.all([
      listConnectedPlatforms(brandId),
      listStrategies(brandId),
      countPlanItemsForBrand(brandId),
      supabase
        .from('instagram_audits')
        .select('id')
        .eq('brand_id', brandId)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => data)
    ]);

    return resolveJourney(
      {
        hasBrand: true,
        igConnected: !!platforms?.instagram,
        hasAudit: !!audit,
        dnaApproved: !!kit?.dna_generated_at,
        strategyApproved: !!activeStrategy(strategies),
        hasPlanItems: planItems > 0
      },
      kit
    );
  } catch {
    // Falha aberta, sempre.
    const j = resolveJourney({ hasBrand: true }, null);
    return { ...j, conducting: false };
  }
}
