// Contrato comum das skills de IA.
//
// Uma skill descreve O QUE pedir e o QUE aceitar de volta — nunca COMO chamar o
// modelo. Ela não importa provedor, não chama fetch e não grava custo: quem faz
// isso é lib/ai/skills/run.js. Assim trocar DeepSeek por Gemini não toca skill
// nenhuma (ver lib/ai/provider).
//
// Campos:
//   id           identificador estável (entra no log de custo)
//   version      inteiro; suba ao mudar prompt ou schema, para separar o custo
//                e o desempenho de cada versão
//   description  para humanos
//   inputSchema  Zod — validado ANTES de gastar IA
//   outputSchema Zod — validado depois; o executor tenta de novo se não bater
//   buildPrompt  (input) => { system, user }
//   provider     opcional; só quando a skill exige um provedor específico.
//                O normal é omitir e deixar a configuração decidir.
//   model        opcional
//   temperature  opcional
//   maxTokens    opcional; teto de resposta quando o schema exige muitos dados.
export function defineSkill(skill) {
  const problems = [];
  const need = (field, ok) => { if (!ok) problems.push(field); };

  need('id', typeof skill?.id === 'string' && skill.id.length > 0);
  need('version (inteiro)', Number.isInteger(skill?.version));
  need('description', typeof skill?.description === 'string' && skill.description.length > 0);
  need('inputSchema', typeof skill?.inputSchema?.safeParse === 'function');
  need('outputSchema', typeof skill?.outputSchema?.safeParse === 'function');
  need('buildPrompt', typeof skill?.buildPrompt === 'function');

  if (problems.length) {
    throw new Error(`Skill ${skill?.id || '(sem id)'}: campos invalidos ou ausentes: ${problems.join(', ')}.`);
  }

  return Object.freeze({ temperature: undefined, provider: undefined, model: undefined, ...skill });
}
