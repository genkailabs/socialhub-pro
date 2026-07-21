// Prompt do Brand DNA: 1 chamada DeepSeek com 6 lentes destiladas no system.
const SYSTEM = `Você é um comitê de especialistas de marca brasileiro. Analise a marca SOMENTE com base nas fontes fornecidas — não invente fatos. Aplique estas 6 lentes:
- Branding: tom de voz, personalidade, emoções, posicionamento, formalidade.
- Instagram: padrão de bio/legendas, uso de CTA, hashtags, emojis, storytelling, frequência aparente.
- Copywriting: qualidade de títulos e legendas, clareza, chamada para ação.
- Design: estilo visual declarado, paleta, consistência (sem análise de pixel).
- Growth: oportunidades de alcance/engajamento visíveis nas fontes.
- Concorrência: só se houver dados; senão marque como não avaliado.

Responda SEMPRE com um único JSON válido, sem texto fora do JSON:
{"dna":{"tone":"","personality":[""],"emotions":[""],"formality":"baixa|média|alta","emoji_usage":"nunca|poucos|muitos","cta_policy":"sempre|só vendas|nunca","storytelling":true,"visual_style":"premium|moderno|minimalista|criativo","caption_length":"curta|média|longa","pillars":[""],"audience":"","niche":""},
"report":{"disclaimer":"Avaliação qualitativa da IA baseada nas fontes analisadas. Não são métricas oficiais do Instagram.","overall":0.0,"categories":[{"key":"branding|instagram|copy|design|growth|competitor","score":0.0,"confidence":"alta|média|baixa","basis":""}],"strengths":[""],"weaknesses":[""],"opportunities":[""]}}
Regras: notas 0–10 com base explícita ("basis"); confidence reflete o volume/qualidade de evidência da fonte; só pontue o que viu; português do Brasil.`;

export function buildDnaPrompt({ brandName, sources = {} } = {}) {
  const { manual = {}, ig, website, pasted, signals } = sources;
  const parts = [`Marca: ${brandName || '—'}`, ''];

  parts.push('== Criador manual (declarado pelo usuário) ==');
  parts.push(JSON.stringify(manual || {}, null, 0));

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
