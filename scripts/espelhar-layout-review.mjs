/**
 * Espelha `lib/layout-review/` no Carrossel Studio.
 *
 * Os dois repos são separados e têm deploys separados: o Hub no Railway, o
 * Studio na Vercel. Sem um espelho automático o núcleo de revisão viraria dois
 * núcleos — foi o que aconteceu com o contrato do embed, que hoje existe em
 * `lib/carrossel-studio-contract.js` e em `src/lib/embed/protocol.ts` e é
 * mantido à mão. Dá para conviver com isso em 200 linhas de contrato; não dá
 * em centenas de linhas de regra que decidem se uma arte vai ao ar.
 *
 * O destino é gerado e marcado como tal. Editar lá é trabalho perdido: a
 * próxima execução sobrescreve, e `scripts/conferir-espelho.mjs` no Studio
 * reprova o build se os dois lados divergirem.
 *
 *   node scripts/espelhar-layout-review.mjs [caminho-do-studio]
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const origem = resolve(aqui, "..", "lib", "layout-review");
const studio = process.argv[2] ?? resolve(aqui, "..", "..", "criador de carrossel", "carrossel-studio");
const destino = join(studio, "src", "lib", "layout-review");

const CABECALHO = `/* ARQUIVO GERADO — NÃO EDITE.
 *
 * Espelho de \`lib/layout-review/\` do Hub (GERENCIADOR REDES SOCIAIS).
 * Para mudar uma regra, mude lá e rode:
 *
 *   node scripts/espelhar-layout-review.mjs
 *
 * O núcleo é o mesmo nos dois lados de propósito: é o que faz o mesmo defeito
 * ter o mesmo nome, a mesma severidade e a mesma nota na geração e na edição.
 */
`;

/** O Hub resolve `@/lib/...`; o Studio resolve `@/...` a partir de `src`. */
function reescreverImports(codigo) {
  return codigo.replace(/from "@\/lib\/layout-review\/([a-z-]+)"/g, 'from "@/lib/layout-review/$1"');
}

const arquivos = (await readdir(origem)).filter((n) => n.endsWith(".js"));
await mkdir(destino, { recursive: true });

const resumo = createHash("sha256");
for (const nome of arquivos.sort()) {
  const codigo = await readFile(join(origem, nome), "utf8");
  resumo.update(nome);
  resumo.update(codigo);
  await writeFile(join(destino, nome), CABECALHO + reescreverImports(codigo), "utf8");
  console.log(`  ${nome}`);
}

const impressao = resumo.digest("hex").slice(0, 16);
await writeFile(
  join(destino, "ESPELHO.json"),
  `${JSON.stringify({ origem: "GERENCIADOR REDES SOCIAIS/lib/layout-review", arquivos: arquivos.sort(), impressao }, null, 2)}\n`,
  "utf8",
);

console.log(`\n${arquivos.length} arquivos espelhados em ${destino}`);
console.log(`impressão: ${impressao}`);
