'use server';

import { createClient } from '@/lib/supabase/server';
import { getBrandKit } from '@/lib/brand-kit-data';
import { getRecentLayoutUsage, listLayoutTemplates } from '@/lib/layouts-data';
import { composeSmartPost, composeSmartCarousel } from '@/lib/layouts/index';
import { layoutTemplateFromSurface } from '@/lib/layouts/templates';
import { friendlyGenerationError } from '@/lib/layouts/errors';
import { favorsForObjective } from '@/lib/composer-strategy';
import { generatePost } from '@/lib/ai-actions';

async function brandContext(brandId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  // `niche` NÃO é coluna de brands — mora no Brand Kit. Pedir por ela fazia o
  // PostgREST devolver 42703, `data` vinha null e o código traduzia isso como
  // "Marca inválida": toda geração de arte falhava, sempre, com uma mensagem
  // que apontava para o lugar errado.
  const { data: brand, error } = await supabase
    .from('brands')
    .select('id, name, color')
    .eq('id', brandId)
    .maybeSingle();
  // Erro do banco não pode virar "marca inválida" — são diagnósticos opostos.
  // O código do PostgREST (42703 = coluna inexistente) é o que aponta para o
  // schema; sem ele o detalhe técnico não serve para diagnosticar.
  if (error) return { error: 'Não foi possível ler a marca.', detail: [error.code, error.message].filter(Boolean).join(' · ') };
  if (!brand) return { error: 'Marca inválida.' };

  const kit = await getBrandKit(brandId);
  const recent = await getRecentLayoutUsage(brandId);
  return {
    supabase,
    user,
    kit,
    recent,
    brand: {
      name: brand.name,
      color: brand.color || '',
      niche: kit?.niche || '',
      tone: kit?.tone || '',
      visualStyle: kit?.visual_style || ''
    }
  };
}

// §13: sem registro, a antirrepetição morre ao recarregar a página. Falha aqui
// não pode derrubar a geração — o pior caso é repetir um layout.
async function recordUsage({ supabase, brandId, plan, format, contentType }) {
  try {
    await supabase.from('layout_usage').insert({
      brand_id: brandId,
      structure_id: plan.structure.id,
      style_id: plan.style.id,
      format,
      content_type: contentType
    });
  } catch { /* histórico é acessório */ }
}

/**
 * Monta a peça a partir de um conteúdo que o usuário já tem em mãos.
 * Não chama IA de texto nem gera imagem: é o caminho barato do §18.
 */
export async function buildLayoutForContent({
  brandId, content = {}, format = 'post', ratio = null, media = null,
  structureId = null, styleId = null, objective = null
}) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  const context = await brandContext(brandId);
  if (context.error) return { error: context.error, detail: context.detail || null };

  // §4: o objetivo escolhido na Estratégia inclina a escolha da estrutura. Vira
  // lista de categorias aqui, no servidor, para o cliente não precisar conhecer
  // a taxonomia do catálogo de layouts.
  const objectiveFavors = favorsForObjective(objective);

  const result = format === 'carrossel' && Array.isArray(content.bullets) && content.bullets.length
    ? composeSmartCarousel({
      content, brand: context.brand, kit: context.kit, ratio: ratio || '1:1', media,
      recentStructures: context.recent.recentStructures, recentStyles: context.recent.recentStyles,
      styleId, objectiveFavors
    })
    : composeSmartPost({
      content, brand: context.brand, kit: context.kit, format, ratio, media,
      recentStructures: context.recent.recentStructures, recentStyles: context.recent.recentStyles,
      structureId, styleId, objectiveFavors
    });

  const first = result.slides ? result.slides[0] : result;
  await recordUsage({
    supabase: context.supabase, brandId, plan: first.plan, format,
    contentType: first.plan.contentType
  });

  return {
    ok: true,
    slides: result.slides ? result.slides.map(serializeSlide) : [serializeSlide(first)],
    mascot: result.mascot,
    issues: result.issues.map((issue) => ({ id: issue.id, message: issue.message, fix: issue.fix }))
  };
}

function serializeSlide(slide) {
  return {
    surface: slide.surface,
    canvas: slide.canvas,
    ratio: slide.ratio,
    structureId: slide.plan.structure.id,
    structureLabel: slide.plan.structure.label,
    styleId: slide.plan.style.id,
    styleLabel: slide.plan.style.label,
    contentType: slide.plan.contentType,
    ok: slide.ok
  };
}

/**
 * Caminho completo do §3: a IA escreve o conteúdo e o sistema monta a peça.
 * A geração de imagem fica desligada de propósito — a peça é montada com
 * componentes, e o custo por post cai para o de uma chamada de texto.
 */
export async function generateLayoutFromBrief({
  brandId, brandName, brief = {}, format = 'post', ratio = null, media = null,
  structureId = null, styleId = null, objective = null, highlight = ''
}) {
  if (!brandId) return { error: 'Marca não selecionada.' };

  const generated = await generatePost({ brandId, brandName, brief, generateImages: false });
  if (generated.error) return friendlyGenerationError(generated);

  const spec = generated.spec || {};
  // A IA escreve o texto; quem manda na forma continua sendo a pessoa. Antes
  // esta chamada omitia estrutura e estilo, então escolher "Editorial" e pedir
  // para a IA escrever devolvia a peça com outro estilo, sem aviso.
  const built = await buildLayoutForContent({
    brandId,
    format,
    ratio,
    media,
    structureId,
    styleId,
    objective,
    content: {
      title: spec.imageTitle || spec.headline,
      subtitle: spec.subtext,
      bullets: spec.bullets,
      cta: spec.cta,
      // §1.2: sem esta linha o destaque morria aqui — o prompt passou a pedir a
      // palavra, mas quem monta a arte nunca a recebia, e `texto-destaque` e
      // `trend-alert` continuavam inelegíveis por falta de campo.
      highlight: String(highlight || '').trim() || spec.highlight,
      caption: spec.caption,
      hashtags: spec.hashtags
    }
  });
  if (built.error) return built;

  return { ...built, spec, cost: generated.cost };
}

/** §11: transforma a peça aberta no Composer num layout reutilizável. */
export async function saveLayoutTemplate({
  brandId, name, surface, canvas, format = 'post', ratio = '1:1',
  roles = {}, structureId = null, styleId = null, category = null
}) {
  if (!brandId) return { error: 'Marca não selecionada.' };
  if (!surface?.layers?.length) return { error: 'Não há nada no canvas para salvar como layout.' };
  const cleanName = String(name || '').trim();
  if (!cleanName) return { error: 'Dê um nome para o layout.' };

  const context = await brandContext(brandId);
  if (context.error) return { error: context.error, detail: context.detail || null };

  const template = layoutTemplateFromSurface(surface, {
    canvas: canvas || [430, 430], name: cleanName, format, ratio, structureId, styleId, roles
  });

  const { data, error } = await context.supabase
    .from('layout_templates')
    .insert({
      brand_id: brandId,
      name: cleanName,
      format,
      ratio,
      category,
      // O catálogo interno é a fonte dos ids; um layout salvo a partir de uma
      // peça montada à mão não tem estrutura nem estilo de origem.
      structure_id: structureId,
      style_id: styleId,
      template
    })
    .select('id, name, format, ratio, structure_id, style_id, template, updated_at')
    .maybeSingle();

  if (error) return { error: error.message };
  return { ok: true, template: data };
}

export async function getLayoutTemplates(brandId) {
  if (!brandId) return { templates: [] };
  return { templates: await listLayoutTemplates(brandId) };
}

/** §12: renomear reaproveita a mesma linha — nada de segunda estrutura. */
export async function renameLayoutTemplate({ brandId, templateId, name }) {
  if (!brandId || !templateId) return { error: 'Layout não informado.' };
  const cleanName = String(name || '').trim().slice(0, 80);
  if (!cleanName) return { error: 'Dê um nome para o layout.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { error } = await supabase
    .from('layout_templates')
    .update({ name: cleanName, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('brand_id', brandId);

  if (error) return { error: error.message };
  return { ok: true, name: cleanName };
}

export async function deleteLayoutTemplate({ brandId, templateId }) {
  if (!brandId || !templateId) return { error: 'Layout não informado.' };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };

  const { error } = await supabase
    .from('layout_templates')
    .update({ status: 'inativo', updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('brand_id', brandId);

  if (error) return { error: error.message };
  return { ok: true };
}
