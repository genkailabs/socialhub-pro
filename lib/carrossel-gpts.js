// Segunda consulta em GPT próprio.
//
// GPT customizado não tem API: não dá para o Hub chamar e receber a resposta.
// O que dá é abrir o GPT já com o material escrito, e a pessoa traz de volta o
// que gostar. É uma saída manual e assumida como tal — não uma integração.
//
// O `?q=` preenche a caixa do ChatGPT. URL longa demais é cortada pelo
// navegador, então o texto é curto de propósito e o botão de copiar existe
// como rede de segurança.

export const GPTS = {
  carrossel: {
    id: 'g-6a6df245f5388191a38880b901975ddc-content-machine-carrosseis',
    label: 'Content Machine'
  },
  headline: {
    id: 'g-6a6df6c166bc81918316d84180574e20-headline-generator',
    label: 'Headline Generator'
  }
};

// Teto conservador: acima disso navegador e servidor começam a cortar, e um
// prompt cortado no meio é pior do que um prompt curto.
const MAX_URL = 1800;

function trim(value, max) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Prompt para pedir ideias de carrossel a partir do assunto digitado. */
export function carouselPrompt({ brandName = '', topic = '', context = '' } = {}) {
  return [
    topic && `Assunto: ${trim(topic, 280)}`,
    brandName && `Marca: ${trim(brandName, 80)}`,
    context && `Contexto: ${trim(context, 600)}`
  ].filter(Boolean).join('\n');
}

/** Prompt para diagnosticar uma capa já escolhida. */
export function headlinePrompt({ headline = '', subheadline = '', topic = '' } = {}) {
  return [
    'Diagnostique esta capa e proponha versões melhores.',
    headline && `Headline: ${trim(headline, 200)}`,
    subheadline && `Apoio: ${trim(subheadline, 200)}`,
    topic && `Tema do carrossel: ${trim(topic, 280)}`
  ].filter(Boolean).join('\n');
}

/**
 * URL do GPT com a caixa já preenchida. Devolve null quando não há o que
 * mandar — botão sem conteúdo só gera clique frustrado.
 */
export function gptUrl(gpt, prompt) {
  const target = GPTS[gpt];
  const text = String(prompt || '').trim();
  if (!target || !text) return null;
  const baseUrl = `https://chatgpt.com/g/${target.id}`;
  const url = `${baseUrl}?q=${encodeURIComponent(text)}`;
  return url.length > MAX_URL ? baseUrl : url;
}
