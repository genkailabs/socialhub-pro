/**
 * Teste ao vivo do fallback Groq. Roda uma vez, antes de armar o fallback em
 * produção — o teste automatizado prova a lógica, este prova que a chave e o
 * modelo existem do outro lado.
 *
 *   node scripts/testar-fallback-groq.mjs
 *
 * Lê GROQ_API_KEY e GROQ_MODEL de .env.local. Não escreve nada no banco, não
 * mexe em produção e não liga o fallback: só faz uma chamada real ao Groq com
 * o mesmo formato de pedido que a aplicação faz.
 */

import { readFileSync } from 'node:fs';

const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function lerEnv() {
  try {
    return Object.fromEntries(
      readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
        .split(/\r?\n/)
        .filter((linha) => linha && !linha.startsWith('#') && linha.includes('='))
        .map((linha) => {
          const i = linha.indexOf('=');
          return [linha.slice(0, i).trim(), linha.slice(i + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const env = { ...lerEnv(), ...process.env };
const key = env.GROQ_API_KEY;
const model = env.GROQ_MODEL || DEFAULT_MODEL;

if (!key) {
  console.error('GROQ_API_KEY não encontrada em .env.local nem no ambiente.');
  console.error('Crie a chave em console.groq.com e adicione GROQ_API_KEY=gsk_... em .env.local.');
  process.exit(1);
}

console.log(`Modelo: ${model}`);
console.log('Pedindo ao Groq exatamente o que uma skill pede: JSON obedecendo a um formato.\n');

const inicio = Date.now();
let res;
try {
  res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 400,
      messages: [
        { role: 'system', content: 'Você responde somente com o objeto JSON pedido, sem wrapper nem Markdown.' },
        { role: 'user', content: 'Devolva {"titulo": string, "itens": string[] com 3 itens} sobre organizar processos antes de usar IA.' }
      ],
      response_format: { type: 'json_object' }
    }),
    signal: AbortSignal.timeout(45_000)
  });
} catch (erro) {
  console.error(`FALHOU na conexão: ${erro.message}`);
  process.exit(1);
}

const dados = await res.json().catch(() => ({}));
const decorrido = ((Date.now() - inicio) / 1000).toFixed(1);

if (!res.ok || dados.error) {
  console.error(`FALHOU: HTTP ${res.status} — ${dados.error?.message || res.statusText}`);
  if (/model/i.test(dados.error?.message || '')) {
    console.error(`\nO modelo "${model}" pode ter saído do catálogo.`);
    console.error('Veja os disponíveis em console.groq.com/docs/models e ajuste GROQ_MODEL.');
  }
  process.exit(1);
}

const escolha = dados.choices?.[0] || {};
const conteudo = escolha.message?.content || '';

let objeto;
try {
  objeto = JSON.parse(conteudo);
} catch {
  console.error('FALHOU: o modelo respondeu, mas não em JSON válido.');
  console.error(conteudo.slice(0, 400));
  process.exit(1);
}

const temFormato = typeof objeto.titulo === 'string' && Array.isArray(objeto.itens);
const uso = dados.usage || {};

console.log(`Respondeu em ${decorrido}s — HTTP ${res.status}, finish_reason: ${escolha.finish_reason}`);
console.log(`Tokens: ${uso.prompt_tokens || 0} entrada / ${uso.completion_tokens || 0} saída`);
console.log(`JSON válido: sim. Formato pedido obedecido: ${temFormato ? 'sim' : 'NÃO'}`);
console.log(`\n${JSON.stringify(objeto, null, 2).slice(0, 500)}`);

if (!temFormato) {
  console.error('\nO modelo devolveu JSON, mas não o formato pedido. Não sirva de fallback assim.');
  process.exit(1);
}

console.log('\nPASSOU. Agora é seguro adicionar no Railway:');
console.log(`  GROQ_API_KEY=<a mesma chave>`);
console.log(`  GROQ_MODEL=${model}`);
console.log(`  AI_TEXT_FALLBACK=groq`);
