import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// A renderização final usa sharp/librsvg, que resolve fontes via fontconfig.
// Este módulo aponta o fontconfig para public/fonts, garantindo que o arquivo
// publicado use as mesmas fontes licenciadas exibidas no canvas.
// Precisa rodar antes do primeiro render de texto do processo.

let configured = false;

export function ensureComposerFontconfig() {
  setupFontconfig();
}

function setupFontconfig() {
  if (configured) return;
  configured = true;
  try {
    const fontsDir = path.join(process.cwd(), 'public', 'fonts');
    const configDir = path.join(os.tmpdir(), 'socialhub-fontconfig');
    const cacheDir = path.join(configDir, 'cache');
    mkdirSync(cacheDir, { recursive: true });
    const configPath = path.join(configDir, 'fonts.conf');
    writeFileSync(configPath, `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontsDir}</dir>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
  <cachedir>${cacheDir}</cachedir>
</fontconfig>
`);
    if (!process.env.FONTCONFIG_FILE) process.env.FONTCONFIG_FILE = configPath;
    if (!process.env.FONTCONFIG_PATH) process.env.FONTCONFIG_PATH = configDir;
  } catch {
    // Sem fontconfig o render continua com a fonte padrão do sistema.
  }
}

// Efeito colateral no import: precisa acontecer antes de o binário nativo do
// sharp carregar, senão o fontconfig ignora a configuração. No Windows o CRT
// do binário não enxerga env alterada em runtime — para testar o render local
// com as fontes reais, exporte FONTCONFIG_FILE antes de iniciar o processo.
// Em Linux (produção/Railway) o setenv em runtime é suficiente.
setupFontconfig();
