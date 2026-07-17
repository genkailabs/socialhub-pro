// Rotas de cron que o worker do Railway pode acionar. Whitelist: a tarefa vem
// de env/argv, entao nao pode virar caminho arbitrario na URL do painel.
const TASKS = {
  'publish-due': '/api/cron/publish-due',
  'youtube-sync': '/api/cron/youtube-sync'
};

const DEFAULT_TASK = 'publish-due';

function buildCronRequest({ appUrl, secret, task = DEFAULT_TASK }) {
  const baseUrl = String(appUrl || '').replace(/\/+$/, '');
  if (!baseUrl || !secret) throw new Error('APP_URL e CRON_SECRET sao obrigatorios no Railway.');
  if (!/^https:\/\//.test(baseUrl)) throw new Error('APP_URL deve usar HTTPS no Railway.');

  const path = TASKS[task];
  if (!path) throw new Error(`Tarefa de cron desconhecida: ${task}. Use ${Object.keys(TASKS).join(' ou ')}.`);

  return {
    url: `${baseUrl}${path}`,
    options: { headers: { authorization: `Bearer ${secret}` } }
  };
}

async function runCron(env = process.env, fetcher = fetch, task = env.CRON_TASK || DEFAULT_TASK) {
  const request = buildCronRequest({ appUrl: env.APP_URL, secret: env.CRON_SECRET, task });
  const response = await fetcher(request.url, request.options);
  const body = await response.text();
  if (!response.ok) throw new Error(`Cron ${task} respondeu ${response.status}: ${body}`);
  return body;
}

module.exports = { buildCronRequest, runCron, TASKS, DEFAULT_TASK };
