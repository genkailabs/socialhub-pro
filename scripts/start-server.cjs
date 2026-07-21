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

loadLocalEnvironment();
require('../.next/standalone/server.js');
