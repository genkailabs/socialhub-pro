// Dica de imagem por slide: o que fotografar e como procurar.
//
// Quem escreve a dica boa é a IA, no mesmo passo do roteiro (`imageIdea` em
// lib/ai/skills/carousel-brief). Este módulo existe para os dois casos em que
// não há dica escrita: roteiro salvo antes desta mudança e roteiro colado de
// fora. Nesses casos a dica sai daqui, montada só com o texto do slide.
//
// Regra dos idiomas, herdada de lib/photo-direction.js: a cena é descrita em
// português, porque é a pessoa que lê; os termos de busca vão em inglês,
// porque o acervo do Pexels é indexado em inglês e "escritório pequeno"
// devolve menos e pior que "small office".

import { searchQuery } from '@/lib/photo-direction';

// Direção padrão da busca. Editorial e fundo desfocado porque o texto do
// carrossel entra por cima: foto ocupada compete com a manchete.
const DEFAULT_DIRECTION = Object.freeze({ estilo: 'editorial', fundo: 'desfocado' });

// Vale para todo slide, então a tela mostra esta regra uma vez só, acima da
// lista — repetir em cada card vira ruído e a pessoa para de ler.
export const GENERIC_AVOID = 'foto com texto, logo ou gráfico dentro da imagem — o texto do slide entra por cima.';

// Conceitos reconhecidos no texto do slide. Cada um leva a cena em PT-BR e o
// assunto da busca em inglês. Lista curta de propósito: cobre o que aparece
// nos carrosséis desta base e erra de forma previsível quando não cobre.
const CONCEPTS = [
  { test: /\b(ia|i\.a|inteligencia artificial|chatgpt|gpt|prompt|automacao|automatizar|algoritmo)\b/, scene: 'alguém no computador com uma ferramenta de IA aberta na tela', subject: 'person using laptop artificial intelligence screen' },
  { test: /\b(escritorio|empresa|equipe|time|reuniao|colaborador|funcionario|gestao)\b/, scene: 'um escritório pequeno com duas pessoas olhando a mesma tela', subject: 'small office team meeting' },
  { test: /\b(venda|vendas|vender|cliente|clientes|comprador|faturamento|conversao)\b/, scene: 'atendimento real: alguém fechando negócio com um cliente', subject: 'customer buying handshake store' },
  { test: /\b(dinheiro|preco|precos|custo|custos|lucro|investimento|financeiro|caixa)\b/, scene: 'mesa com calculadora, papéis e alguém fazendo conta', subject: 'money calculator finance desk' },
  { test: /\b(erro|erros|falha|falhas|problema|problemas|armadilha|engano)\b/, scene: 'alguém frustrado diante do computador, cabeça na mão', subject: 'frustrated person laptop' },
  { test: /\b(tempo|prazo|rotina|agenda|produtividade|organizacao|planejamento)\b/, scene: 'agenda aberta e relógio na mesa de trabalho', subject: 'planner clock desk' },
  { test: /\b(instagram|rede social|redes sociais|post|posts|conteudo|marketing|engajamento|seguidores)\b/, scene: 'celular na mão com rede social aberta', subject: 'smartphone social media content creator' },
  { test: /\b(dado|dados|grafico|metrica|metricas|resultado|resultados|relatorio|analise)\b/, scene: 'tela com painel de números e alguém apontando para ele', subject: 'analytics dashboard screen' },
  { test: /\b(estudo|estudar|aprender|aprendizado|curso|aula|treinamento)\b/, scene: 'alguém estudando com caderno e computador abertos', subject: 'person studying notebook laptop' },
  { test: /\b(loja|ecommerce|e-commerce|produto|produtos|estoque|entrega)\b/, scene: 'produto na bancada de uma loja pequena', subject: 'small shop product display' },
  { test: /\b(saude|treino|academia|exercicio|alimentacao|dieta)\b/, scene: 'rotina saudável em movimento, luz natural', subject: 'healthy lifestyle training' },
  { test: /\b(comida|restaurante|receita|cozinha|chef)\b/, scene: 'prato montado na bancada da cozinha', subject: 'food restaurant plate kitchen' },
  { test: /\b(casa|imovel|imoveis|aluguel|apartamento|obra|reforma)\b/, scene: 'ambiente da casa arrumado, luz entrando pela janela', subject: 'modern home interior daylight' }
];

// Papel do slide manda quando o texto não entrega conceito nenhum — e na capa
// manda sempre: capa precisa de área vazia para a manchete caber.
const ROLE_HINT = {
  cover: { scene: 'uma cena que resume o tema com bastante espaço vazio em cima, onde a manchete vai entrar', subject: 'minimal background copy space' },
  cta: { scene: 'pessoa olhando o celular, decidindo o próximo passo', subject: 'person using smartphone decision' },
  recap: { scene: 'anotações e um caderno fechado sobre a mesa', subject: 'notebook desk overhead' }
};

const FALLBACK = { scene: 'uma cena simples do dia a dia ligada ao assunto, sem gente falando com a câmera', subject: 'workspace desk flat lay' };

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function text(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// A dica da IA só vale se vier inteira. Meia dica (cena sem termos) confunde
// mais do que ajuda, então cai para o gerador local.
function fromAi(imageIdea) {
  const scene = text(imageIdea?.scene, 180);
  const terms = Array.isArray(imageIdea?.searchTerms)
    ? imageIdea.searchTerms.map((term) => text(term, 40)).filter(Boolean).slice(0, 4)
    : [];
  if (!scene || terms.length < 2) return null;
  return { scene, subject: terms.join(' '), avoid: text(imageIdea?.avoid, 120) || GENERIC_AVOID, source: 'ai' };
}

function fromText(slide) {
  const haystack = normalize(`${slide?.headline || ''} ${slide?.body || ''} ${slide?.readerTakeaway || ''}`);
  const role = ROLE_HINT[slide?.role];
  const matched = CONCEPTS.filter((concept) => concept.test.test(haystack)).slice(0, 2);

  if (role && !matched.length) return { ...role, avoid: GENERIC_AVOID, source: 'local' };
  if (!matched.length) return { ...FALLBACK, avoid: GENERIC_AVOID, source: 'local' };

  // Na capa a cena vem do tema, mas o espaço para a manchete continua sendo
  // requisito — por isso os dois assuntos entram na busca.
  const scene = slide?.role === 'cover' ? `${matched[0].scene}, com espaço vazio em cima para a manchete` : matched[0].scene;
  const subject = [matched[0].subject, slide?.role === 'cover' ? ROLE_HINT.cover.subject : matched[1]?.subject]
    .filter(Boolean)
    .join(' ');
  return { scene, subject, avoid: GENERIC_AVOID, source: 'local' };
}

/**
 * Dica de imagem de um slide do roteiro.
 *
 * @param {object} slide  { role, headline, body, readerTakeaway, imageIdea? }
 * @returns {{ scene: string, searchTerms: string[], query: string, avoid: string, source: 'ai'|'local' }}
 */
export function imageHintForSlide(slide) {
  const base = fromAi(slide?.imageIdea) || fromText(slide);
  const query = searchQuery(base.subject, DEFAULT_DIRECTION);
  return {
    scene: base.scene,
    searchTerms: query.split(' ').filter(Boolean),
    query,
    avoid: base.avoid,
    source: base.source
  };
}

/**
 * Dicas para um roteiro colado de fora: os blocos vêm em pares
 * (título, texto) por slide, como `preparePastedCarouselScript` devolve.
 *
 * @param {string[]} blocks
 * @returns {Array<{ order: number } & ReturnType<typeof imageHintForSlide>>}
 */
export function imageHintsForBlocks(blocks) {
  if (!Array.isArray(blocks) || blocks.length < 2) return [];
  const hints = [];
  for (let index = 0; index + 1 < blocks.length; index += 2) {
    const order = hints.length + 1;
    hints.push({
      order,
      ...imageHintForSlide({
        role: order === 1 ? 'cover' : undefined,
        headline: blocks[index],
        body: blocks[index + 1]
      })
    });
  }
  return hints;
}
