import 'server-only';

// Cliente da deAPI (deapi.ai) para geração de IMAGEM a partir de texto.
// Só imagem — o texto/prompt continua vindo do DeepSeek. Server-side.
//
// Suporta os dois tipos de chave da deAPI:
//  - Chave "dpn-sk-..."  -> endpoint compatível com OpenAI, SÍNCRONO (oai.deapi.ai/v1).
//  - Chave "<id>|<token>" (nativa) -> API nativa ASSÍNCRONA: cria job e faz polling.
const OAI_BASE = 'https://oai.deapi.ai/v1';
const NATIVE_BASE = 'https://api.deapi.ai';
export const DEAPI_DEFAULT_MODEL = process.env.DEAPI_IMAGE_MODEL || 'Flux1schnell';

const DIM = Number(process.env.DEAPI_IMAGE_SIZE) || 1024;
const STEPS = Number(process.env.DEAPI_IMAGE_STEPS) || 4;     // Flux schnell é rápido (poucos passos)
const GUIDANCE = Number(process.env.DEAPI_IMAGE_GUIDANCE) || 3.5;
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_TRIES = 45; // ~90s de teto

const isOpenAiKey = (key) => key.startsWith('dpn-sk-');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function hasDeapiKey() {
  const key = process.env.DEAPI_API_KEY;
  return typeof key === 'string' && key.trim().length > 0;
}

async function fetchBytes(url) {
  const img = await fetch(url, { cache: 'no-store' });
  if (!img.ok) throw new Error('deAPI: falha ao baixar a imagem gerada.');
  const contentType = img.headers.get('content-type') || (url.includes('.png') ? 'image/png' : 'image/jpeg');
  return { bytes: Buffer.from(await img.arrayBuffer()), contentType };
}

// Endpoint compatível com OpenAI (chave dpn-sk-): resposta síncrona.
async function generateOpenAiCompat({ key, prompt, model }) {
  const res = await fetch(`${OAI_BASE}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, prompt, size: `${DIM}x${DIM}`, n: 1, response_format: 'b64_json' }),
    cache: 'no-store'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`deAPI: ${data.error?.message || res.statusText || 'falha na geração'}`);
  const item = data.data?.[0] || {};
  if (item.b64_json) return { bytes: Buffer.from(item.b64_json, 'base64'), model, contentType: 'image/png' };
  if (item.url) return { ...(await fetchBytes(item.url)), model };
  throw new Error('deAPI: resposta sem imagem.');
}

// API nativa (chave <id>|<token>): cria job e faz polling até status "done".
async function generateNative({ key, prompt, model }) {
  const headers = { Authorization: `Bearer ${key}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  const res = await fetch(`${NATIVE_BASE}/api/v2/images/generations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt, model, width: DIM, height: DIM,
      guidance: GUIDANCE, steps: STEPS, seed: Math.floor(Math.random() * 1e9)
    }),
    cache: 'no-store'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`deAPI: ${data.error?.message || data.message || res.statusText || 'falha ao criar job'}`);
  const requestId = data.data?.request_id;
  if (!requestId) throw new Error('deAPI: resposta sem request_id.');

  for (let i = 0; i < POLL_MAX_TRIES; i++) {
    await sleep(POLL_INTERVAL_MS);
    const jr = await fetch(`${NATIVE_BASE}/api/v2/jobs/${requestId}`, { headers, cache: 'no-store' });
    const jd = await jr.json().catch(() => ({}));
    const job = jd.data || {};
    if (job.status === 'done') {
      const url = job.result_url || job.results_alt_formats?.jpg || job.results_alt_formats?.webp;
      if (!url) throw new Error('deAPI: job concluído sem URL de imagem.');
      return { ...(await fetchBytes(url)), model };
    }
    if (job.status === 'error') throw new Error(`deAPI: job falhou (${job.error || 'sem detalhe'}).`);
  }
  throw new Error('deAPI: tempo esgotado esperando a imagem.');
}

// Gera 1 imagem e devolve os bytes prontos p/ subir no storage.
export async function deapiGenerateImage({ prompt, model = DEAPI_DEFAULT_MODEL }) {
  const key = (process.env.DEAPI_API_KEY || '').trim();
  if (!key) throw new Error('DEAPI_API_KEY não configurada no servidor.');
  if (!prompt || !String(prompt).trim()) throw new Error('deAPI: prompt de imagem vazio.');
  const args = { key, prompt: String(prompt), model };
  return isOpenAiKey(key) ? generateOpenAiCompat(args) : generateNative(args);
}
