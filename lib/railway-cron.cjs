function buildCronRequest({ appUrl, secret }) {
  const baseUrl = String(appUrl || '').replace(/\/+$/, '');
  if (!baseUrl || !secret) throw new Error('APP_URL e CRON_SECRET sao obrigatorios no Railway.');
  if (!/^https:\/\//.test(baseUrl)) throw new Error('APP_URL deve usar HTTPS no Railway.');

  return {
    url: `${baseUrl}/api/cron/publish-due`,
    options: { headers: { authorization: `Bearer ${secret}` } }
  };
}

async function runCron(env = process.env, fetcher = fetch) {
  const request = buildCronRequest({ appUrl: env.APP_URL, secret: env.CRON_SECRET });
  const response = await fetcher(request.url, request.options);
  const body = await response.text();
  if (!response.ok) throw new Error(`Cron respondeu ${response.status}: ${body}`);
  return body;
}

module.exports = { buildCronRequest, runCron };
