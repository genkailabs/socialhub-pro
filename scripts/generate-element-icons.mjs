// Gera data/element-icons.js a partir do lucide-react instalado, garantindo
// que canvas e render final usem exatamente o mesmo markup vetorial (PRD §8).
// Rodar de novo apenas se a lista de ícones mudar: node scripts/generate-element-icons.mjs
import { writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as lucide from 'lucide-react';

const pick = (...names) => {
  const found = names.map((name) => lucide[name]).find(Boolean);
  if (!found) throw new Error(`Ícone lucide não encontrado: ${names.join(', ')}`);
  return found;
};

// O <svg> raiz do lucide carrega stroke/fill; ao removê-lo, os atributos
// precisam ser reaplicados num <g> para o traço não sumir.
const inner = (component) => renderToStaticMarkup(createElement(component))
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>$/, '');
const wrap = (content) => `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</g>`;
const body = (component) => wrap(inner(component));

// WhatsApp não existe no lucide (sem ícones de marca): balão do MessageCircle
// com um fone reduzido dentro. stroke-width maior compensa a escala.
const whatsappBody = wrap(`${inner(pick('MessageCircle'))}<g transform="translate(7.7 7.7) scale(0.36)" stroke-width="5">${inner(pick('Phone'))}</g>`);

const ICONS = [
  ['telefone', 'Telefone', ['telefone', 'ligar', 'contato', 'fone'], body(pick('Phone'))],
  ['whatsapp', 'WhatsApp', ['whatsapp', 'zap', 'mensagem', 'contato'], whatsappBody],
  ['instagram', 'Instagram', ['instagram', 'insta', 'rede social'], body(pick('Instagram'))],
  ['localizacao', 'Localização', ['localizacao', 'endereco', 'mapa', 'pin'], body(pick('MapPin'))],
  ['calendario', 'Calendário', ['calendario', 'data', 'agenda'], body(pick('Calendar'))],
  ['relogio', 'Relógio', ['relogio', 'hora', 'horario', 'tempo'], body(pick('Clock'))],
  ['link', 'Link', ['link', 'url', 'site'], body(pick('Link'))],
  ['carrinho', 'Carrinho', ['carrinho', 'compras', 'comprar'], body(pick('ShoppingCart'))],
  ['dinheiro', 'Dinheiro', ['dinheiro', 'preco', 'pagamento', 'valor'], body(pick('Banknote'))],
  ['promocao', 'Promoção', ['promocao', 'desconto', 'porcentagem', 'oferta'], body(pick('BadgePercent', 'Percent'))],
  ['atencao', 'Atenção', ['atencao', 'aviso', 'alerta', 'importante'], body(pick('TriangleAlert', 'AlertTriangle'))],
  ['check', 'Check', ['check', 'confirmado', 'feito', 'ok'], body(pick('Check'))],
  ['estrela', 'Estrela', ['estrela', 'favorito', 'avaliacao'], body(pick('Star'))],
  ['coracao', 'Coração', ['coracao', 'amor', 'curtir', 'like'], body(pick('Heart'))],
  ['play', 'Play', ['play', 'assistir', 'video'], body(pick('Play'))],
  ['pause', 'Pause', ['pause', 'pausar'], body(pick('Pause'))],
  ['volume', 'Volume', ['volume', 'som', 'audio'], body(pick('Volume2'))],
  ['camera', 'Câmera', ['camera', 'foto'], body(pick('Camera'))],
  ['mensagem', 'Mensagem', ['mensagem', 'chat', 'conversa'], body(pick('MessageSquare'))],
  ['email', 'E-mail', ['email', 'correio', 'contato'], body(pick('Mail'))],
  ['usuario', 'Usuário', ['usuario', 'perfil', 'pessoa', 'cliente'], body(pick('User'))],
  ['seta', 'Seta', ['seta', 'direcao', 'proximo'], body(pick('ArrowRight'))],
  ['grafico', 'Gráfico', ['grafico', 'resultado', 'crescimento', 'dados'], body(pick('ChartColumn', 'BarChart3'))],
  ['loja', 'Loja', ['loja', 'comercio', 'negocio'], body(pick('Store'))]
];

const entries = ICONS.map(([id, label, keywords, iconBody]) => ({ id, label, keywords, body: iconBody }));

const file = `// Arquivo gerado por scripts/generate-element-icons.mjs — não editar à mão.
// Ícones vetoriais do painel Elementos (PRD §8), viewBox 0 0 24 24. O markup
// usa currentColor: no canvas a cor vem do CSS, no render final é substituída.

export const ELEMENT_VECTOR_ICONS = ${JSON.stringify(entries, null, 2)};

export const ELEMENT_ICON_MAP = Object.fromEntries(ELEMENT_VECTOR_ICONS.map((icon) => [icon.id, icon]));

export function iconLayerPreset(icon) {
  return { type: 'icon', icon: icon.id, text: '', w: 64, h: 64, fill: 'transparent', color: '#FFFFFF' };
}
`;

await writeFile('data/element-icons.js', file);
console.log(`data/element-icons.js gerado com ${entries.length} ícones.`);
