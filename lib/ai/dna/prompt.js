// Prompt do Brand DNA: 1 chamada de texto com 6 lentes destiladas no system.
//
// O posicionamento (território, ICP, dor, tese e editorias) vem das respostas
// do questionário, não do feed: essas coisas não se leem em legenda. Quando o
// usuário não responder, o campo volta vazio — inventar tese é o erro caro.
const SYSTEM = `Você é um comitê de especialistas de marca brasileiro. Analise a marca SOMENTE com base nas fontes fornecidas — não invente fatos. Aplique estas 6 lentes:
- Branding: tom de voz, personalidade, emoções, posicionamento, formalidade.
- Instagram: padrão de bio/legendas, uso de CTA, hashtags, emojis, storytelling, frequência aparente.
- Copywriting: qualidade de títulos e legendas, clareza, chamada para ação.
- Design: estilo visual declarado, paleta, consistência (sem análise de pixel).
- Growth: oportunidades de alcance/engajamento visíveis nas fontes.
- Concorrência: só se houver dados; senão marque como não avaliado.

Responda SEMPRE com um único JSON válido, sem texto fora do JSON:
{"dna":{"tone":"","personality":[""],"emotions":[""],"formality":"baixa|média|alta","emoji_usage":"nunca|poucos|muitos","cta_policy":"sempre|só vendas|nunca","storytelling":true,"visual_style":"premium|moderno|minimalista|criativo","caption_length":"curta|média|longa","pillars":[""],"audience":"","niche":"","territory":"","icp":"","pain":"","bigIdea":"","editorias":[{"nome":"","promessa":""}]},
"report":{"disclaimer":"Avaliação qualitativa da IA baseada nas fontes analisadas. Não são métricas oficiais do Instagram.","overall":0.0,"categories":[{"key":"branding|instagram|copy|design|growth|competitor","score":0.0,"confidence":"alta|média|baixa","basis":""}],"strengths":[""],"weaknesses":[""],"opportunities":[""]}}
Regras: notas 0–10 com base explícita ("basis"); confidence reflete o volume/qualidade de evidência da fonte; só pontue o que viu; português do Brasil.
Posicionamento (territory, icp, pain, bigIdea, editorias): use as respostas do questionário do criador como fonte principal — elas valem mais que a leitura do feed. Escreva no idioma e nas palavras dele, cortando o genérico ("todo mundo", "quem quiser crescer") e mantendo o que é específico. "pain" deve soar como a pessoa falando, não como diagnóstico técnico. "bigIdea" é uma frase de tese que a marca sustenta e repete. Em "editorias", proponha até 5, cada uma com nome curto e a promessa que ela cumpre para o público. Se o questionário não trouxer base para um desses campos, devolva ele vazio (ou lista vazia) — não preencha por dedução.`;

export function buildDnaPrompt({ brandName, sources = {} } = {}) {
  const { manual = {}, ig, website, pasted, signals } = sources;
  const parts = [`Marca: ${brandName || '—'}`, ''];

  // Rotulado pergunta a pergunta: um JSON cru fazia o modelo tratar a tese do
  // criador como mais um campo solto, no mesmo peso da leitura do feed.
  parts.push('== Respostas do criador (questionário de posicionamento) ==');
  const rotulos = {
    competencia: 'No que é bom de verdade',
    grupo: 'Quem sente a dor',
    territorio: 'Território (assunto que quer ocupar)',
    nicho: 'Nicho',
    icp: 'Cliente ideal',
    dor: 'Dor, nas palavras do cliente',
    tese: 'Tese que defende (Big Ideia)',
    objetivo: 'Objetivo com o conteúdo'
  };
  const respondidas = Object.entries(manual || {})
    .filter(([, valor]) => String(valor || '').trim())
    .map(([chave, valor]) => `${rotulos[chave] || chave}: ${String(valor).trim()}`);
  parts.push(respondidas.length ? respondidas.join('\n') : 'Não respondido.');

  parts.push('', '== Instagram próprio ==');
  if (ig) {
    parts.push(`Bio: ${ig.bio || '—'}`);
    parts.push('Legendas recentes:');
    (ig.captions || []).forEach((c, i) => parts.push(`${i + 1}. ${c}`));
  } else parts.push('Não analisado (sem conexão/erro).');

  parts.push('', '== Website ==', website ? website : 'Não analisado.');
  parts.push('', '== Texto colado ==', pasted ? pasted : 'Não fornecido.');

  if (signals && (signals.approve || signals.reject || signals.edit)) {
    parts.push('', '== Histórico de preferência (sinais leves) ==',
      `${signals.approve || 0} aprovados, ${signals.reject || 0} rejeitados, ${signals.edit || 0} editados. Considere como pista de preferência, não como fato absoluto.`);
  }

  return { system: SYSTEM, user: parts.join('\n') };
}
