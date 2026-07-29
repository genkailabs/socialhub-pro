// Gera o seed SQL do catálogo de layouts (PRD §8) a partir dos catálogos em
// código. O código é a fonte de verdade: escrever os INSERT à mão deixaria o
// banco e a biblioteca divergirem em silêncio na primeira estrutura nova.
//
//   node scripts/generate-layout-seed.cjs > supabase/migrations/<data>_layout_catalog_seed.sql

const path = require('node:path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');

// Os três catálogos são puros e sem dependência; o bundle existe só para
// converter ESM em algo que este script CommonJS consegue avaliar.
function loadCatalog(entry) {
  const result = esbuild.buildSync({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false
  });
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require);
  return module.exports;
}

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function json(value) {
  return `${quote(JSON.stringify(value))}::jsonb`;
}

const { STRUCTURES } = loadCatalog('lib/layouts/structures.js');
const { COMPONENTS } = loadCatalog('lib/layouts/components.js');
const { VISUAL_STYLES } = loadCatalog('lib/layouts/styles.js');

const lines = [
  '-- GERADO POR scripts/generate-layout-seed.cjs — não editar à mão.',
  '-- Catálogo interno (§8). `is_builtin` marca o que veio da biblioteca do produto;',
  '-- o administrador pode desativar uma linha mudando `status`, sem perder a origem.',
  ''
];

lines.push('INSERT INTO public.layout_structures (id, name, category, format, width, height, slides, status, structure, is_builtin) VALUES');
lines.push(STRUCTURES.map((structure) => (
  `  (${quote(structure.id)}, ${quote(structure.label)}, ${quote(structure.category)}, `
  + `${quote(structure.shapes.includes('story') ? 'todos' : 'feed')}, 1080, 1080, ${structure.slides || 1}, 'ativo', `
  + `${json({ description: structure.description, density: structure.density, shapes: structure.shapes, requires: structure.requires, uses: structure.uses, contentTypes: structure.contentTypes, cover: Boolean(structure.cover), slots: structure.slots })}, TRUE)`
)).join(',\n'));
lines.push('ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, structure = EXCLUDED.structure, updated_at = NOW();');
lines.push('');

lines.push('INSERT INTO public.layout_components (id, name, type, behavior, text_limits, default_position, default_style, properties, is_builtin) VALUES');
lines.push(COMPONENTS.map((component) => (
  `  (${quote(component.id)}, ${quote(component.label)}, ${quote(component.layerType)}, ${quote(component.behavior)}, `
  + `${json(component.limits || {})}, ${json({ styleRole: component.styleRole, safeMarginFactor: component.safeMarginFactor || 1 })}, `
  + `${json(component.defaults || {})}, ${json({ field: component.field || null, required: Boolean(component.required), index: Boolean(component.index) })}, TRUE)`
)).join(',\n'));
lines.push('ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, text_limits = EXCLUDED.text_limits, default_style = EXCLUDED.default_style, updated_at = NOW();');
lines.push('');

lines.push('INSERT INTO public.visual_styles (id, name, rules, typography, spacing, contrast, image_config, effects, is_builtin) VALUES');
lines.push(VISUAL_STYLES.map((style) => (
  `  (${quote(style.id)}, ${quote(style.label)}, `
  + `${json({ intensity: style.intensity, highlight: style.highlight, radius: style.radius, keywords: style.keywords })}, `
  + `${json({ fonts: style.fonts, typeScale: style.typeScale, titleWeight: style.titleWeight, letterSpacing: style.letterSpacing, uppercaseEyebrow: style.uppercaseEyebrow })}, `
  + `${json({ factor: style.spacing })}, ${quote(style.contrast)}, ${json({ mode: style.imageMode })}, ${json({ shadow: style.shadow })}, TRUE)`
)).join(',\n'));
lines.push('ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, rules = EXCLUDED.rules, typography = EXCLUDED.typography, updated_at = NOW();');
lines.push('');

process.stdout.write(`${lines.join('\n')}\n`);
