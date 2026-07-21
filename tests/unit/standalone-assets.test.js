import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const modulePath = path.resolve('lib/prepare-standalone.cjs');
const { copyNextStaticFiles = () => undefined } = fs.existsSync(modulePath)
  ? await import(modulePath)
  : {};

const temporaryFolders = [];

afterEach(() => {
  temporaryFolders.splice(0).forEach((folder) => fs.rmSync(folder, { recursive: true, force: true }));
});

describe('arquivos estáticos do pacote standalone', () => {
  it('copia o CSS gerado pelo Next.js para o servidor de produção', () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'socialhub-standalone-'));
    temporaryFolders.push(folder);

    const buildDir = path.join(folder, '.next');
    const standaloneDir = path.join(buildDir, 'standalone');
    const cssFile = path.join(buildDir, 'static', 'css', 'app.css');
    fs.mkdirSync(path.dirname(cssFile), { recursive: true });
    fs.mkdirSync(standaloneDir, { recursive: true });
    fs.writeFileSync(cssFile, 'body { color: rebeccapurple; }');

    copyNextStaticFiles({ buildDir, standaloneDir });

    expect(fs.readFileSync(path.join(standaloneDir, '.next', 'static', 'css', 'app.css'), 'utf8'))
      .toBe('body { color: rebeccapurple; }');
  });
});
