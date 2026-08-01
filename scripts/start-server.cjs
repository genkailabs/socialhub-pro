const fs = require('node:fs');
const path = require('node:path');

// O servidor standalone do Next não carrega .env.local sozinho. Em ambiente
// hospedado as variáveis vêm da plataforma; localmente, usamos o arquivo sem
// substituir valores já fornecidos pelo sistema.
function loadLocalEnvironment() {
  const envPath = path.resolve('.env.local');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!match || match[1] in process.env) continue;
    const [, name, rawValue] = match;
    const value = rawValue.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, '$1$2');
    process.env[name] = value;
  }
}

// O servidor standalone do Next escolhe o endereço com `process.env.HOSTNAME`,
// e HOSTNAME é justamente a variável que o Docker preenche com o id do
// container. Quando isso acontece o processo escuta só no endereço IPv6 do
// container, o healthcheck da plataforma bate em /login e recebe "service
// unavailable" até desistir — foi o que derrubou o deploy de 2026-08-01, com o
// build inteiro verde e `Ready in 93ms` no log.
//
// Dentro de um container o endereço certo é sempre 0.0.0.0. Quem precisar de
// outro (um bind local, um teste) passa BIND_HOST explicitamente.
process.env.HOSTNAME = process.env.BIND_HOST || '0.0.0.0';

loadLocalEnvironment();
require('../.next/standalone/server.js');
