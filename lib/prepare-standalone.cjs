const fs = require('node:fs');
const path = require('node:path');

function copyNextStaticFiles({
  buildDir = path.resolve('.next'),
  standaloneDir = path.join(buildDir, 'standalone')
} = {}) {
  const sourceDir = path.join(buildDir, 'static');
  const destinationDir = path.join(standaloneDir, '.next', 'static');

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Arquivos estáticos do Next.js não encontrados em ${sourceDir}`);
  }

  fs.mkdirSync(path.dirname(destinationDir), { recursive: true });
  fs.cpSync(sourceDir, destinationDir, { recursive: true });

  // O servidor standalone faz chdir para .next/standalone e só enxerga o que
  // está lá dentro: public/ (fontes do Composer via @font-face) e assets/
  // (Twemoji e fontes usadas pelo render no servidor) precisam ser copiados.
  for (const dir of ['public', 'assets']) {
    const source = path.resolve(dir);
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, path.join(standaloneDir, dir), { recursive: true });
  }
}

module.exports = { copyNextStaticFiles };
