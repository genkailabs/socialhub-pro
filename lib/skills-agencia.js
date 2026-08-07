// Skills GenkaiLabs dentro do Hub. Puro, sem I/O.
//
// São métodos de agência que rodam no Claude, não no servidor: o Hub não tem
// como executá-las (elas produzem deck, HTML e documento longo, e o motor de
// texto daqui é outro). Fingir que rodam aqui seria mentira cara.
//
// O que o Hub faz de útil é o que só ele pode fazer: montar o briefing com os
// dados REAIS da marca — nome, nicho, público, tom, o que a marca evita — para
// a pessoa não recomeçar do zero a cada uso. Mesma mecânica assumida da ponte
// com GPT próprio em `lib/carrossel-gpts`: saída manual, não integração.
//
// `escopo`:
//   'nucleo'   — o método alimenta o produto (posicionamento vira Brand Kit e pauta);
//   'avancado' — trabalho de agência que não faz parte do fluxo diário do Hub.

const MAX_URL = 6000;

function trim(value, max) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function linhasDaMarca(marca = {}) {
  const kit = marca.kit || {};
  const lista = (valor) => (Array.isArray(valor) ? valor.filter(Boolean).join(', ') : String(valor || ''));
  return [
    marca.name && `Marca: ${trim(marca.name, 80)}`,
    (kit.niche || marca.niche) && `Nicho: ${trim(kit.niche || marca.niche, 160)}`,
    kit.audience && `Público: ${trim(kit.audience, 300)}`,
    kit.tone && `Tom de voz: ${trim(kit.tone, 200)}`,
    lista(kit.pillars) && `Pilares de conteúdo: ${trim(lista(kit.pillars), 300)}`,
    lista(kit.donts) && `A marca evita: ${trim(lista(kit.donts), 300)}`,
    marca.description && `Descrição: ${trim(marca.description, 400)}`
  ].filter(Boolean);
}

export const SKILLS_AGENCIA = [
  {
    id: 'genkailabs-diagnostico-marca',
    label: 'Diagnóstico de Marca',
    escopo: 'nucleo',
    resumo: 'Método BlueprintPRO: do questionário ao posicionamento completo — nicho, ICP, dor, Big Ideia, narrativa, linguagem, 5 editorias e 15 ideias.',
    quando: 'Definir ou revisar posicionamento, achar nicho, ICP ou a tese da marca.',
    entrega: 'Documento estratégico + deck',
    // Por que está no núcleo: as 5 editorias e as 15 ideias são exatamente o
    // que falta para abastecer o Planejamento, e nicho/ICP/tom são campos que
    // o Brand Kit já tem e hoje se preenche na mão.
    aplicacaoNoHub: 'O resultado preenche o Brand Kit e vira fila de pautas — as 15 ideias entram como assunto de carrossel.',
    pedido: 'Diagnostica esta marca pelo método BlueprintPRO e me devolve o posicionamento completo.'
  },
  {
    id: 'genkailabs-propostas',
    label: 'Apresentações e Propostas',
    escopo: 'avancado',
    resumo: 'Pitch de captação, apresentação comercial, proposta de trabalho ou pesquisa de mercado. Começa por briefing; identidade sempre do cliente.',
    quando: 'Levar uma proposta a investidor, parceiro ou prospect.',
    entrega: 'PPTX e/ou PDF',
    aplicacaoNoHub: 'Fora do fluxo de publicação: o Hub cuida do que vai ao ar nas redes, não do material comercial.',
    pedido: 'Monta uma apresentação para esta marca. Roda o briefing comigo antes de montar.'
  },
  {
    id: 'landing-page-machine',
    label: 'Landing Page Machine',
    escopo: 'avancado',
    resumo: 'Página de venda de ponta a ponta: copy sem cheiro de IA, HTML mobile-first de arquivo único e o prompt pronto pro Lovable.',
    quando: 'Página de venda, de oferta ou de captura para uma campanha.',
    entrega: 'Copy + HTML + prompt',
    aplicacaoNoHub: 'Fora do fluxo de publicação: a página vive fora das redes. O Hub entra depois, divulgando o link.',
    pedido: 'Cria a landing page desta oferta. Roda o briefing comigo antes de escrever.'
  },
  {
    id: 'lead-copy',
    label: 'Lead Copy',
    escopo: 'avancado',
    resumo: 'Disparo pra base já formatado pro canal: e-mail, WhatsApp ou stories. 7 objetivos, 3 modos de voz e 6 lentes de storytelling.',
    quando: 'Avisar a lista sobre aula, oferta, cupom ou novidade.',
    entrega: 'Copy pronta pra colar',
    aplicacaoNoHub: 'Só o stories toca a rede social; e-mail e WhatsApp são canais que o Hub não publica.',
    pedido: 'Escreve um disparo para a base desta marca. Pergunta o canal e o objetivo antes.'
  }
];

export function skillAgenciaPorId(id) {
  if (typeof id !== 'string' || !id) return null;
  return SKILLS_AGENCIA.find((skill) => skill.id === id) || null;
}

export function skillsPorEscopo(escopo) {
  return SKILLS_AGENCIA.filter((skill) => skill.escopo === escopo);
}

/**
 * Briefing pronto para colar no Claude, já com os dados reais da marca.
 *
 * O texto começa pelo pedido em linguagem natural porque é assim que a skill
 * dispara — nome de arquivo ou id não acionam nada do outro lado.
 */
export function briefingDaSkill(id, marca = {}, extra = '') {
  const skill = skillAgenciaPorId(id);
  if (!skill) return '';
  const contexto = linhasDaMarca(marca);
  const partes = [skill.pedido];
  if (contexto.length) partes.push('', 'Contexto da marca (vindo do Brand Kit do SocialHub):', ...contexto);
  const observacao = trim(extra, 1200);
  if (observacao) partes.push('', `Observação: ${observacao}`);
  return partes.join('\n');
}

/** Abre o Claude com o briefing na caixa. Null quando não há o que mandar. */
export function claudeUrl(briefing) {
  const texto = String(briefing || '').trim();
  if (!texto) return null;
  const url = `https://claude.ai/new?q=${encodeURIComponent(texto)}`;
  return url.length > MAX_URL ? 'https://claude.ai/new' : url;
}
