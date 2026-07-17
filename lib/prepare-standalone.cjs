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
}

module.exports = { copyNextStaticFiles };
