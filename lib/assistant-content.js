// Contrato pequeno e puro entre a recomendacao unica e o editor do assistente.
// Mantem o contexto da decisao junto da primeira versao, sem abrir escolhas novas.
export function assistantFormat(value = '') {
  const normalized = String(value).toLowerCase();
  if (/reel|video/.test(normalized)) return 'reel';
  if (/stor/.test(normalized)) return 'stories';
  if (/carross|carousel/.test(normalized)) return 'carousel';
  return 'post';
}

export function recommendationBrief(recommendation = {}) {
  const plan = recommendation.contentPlan || {};
  const format = assistantFormat(plan.format);
  return {
    format: format === 'carousel' ? 'Carrossel para Instagram' : format === 'reel' ? 'Reel para Instagram' : format === 'stories' ? 'Stories para Instagram' : 'Post de imagem para Instagram',
    topic: plan.topic || recommendation.recommendation || recommendation.title || 'Conteudo alinhado a marca',
    tone: 'claro, acolhedor e profissional',
    goal: plan.objective || 'engajar a audiencia'
  };
}

export function formatDetails(spec = {}, format = 'post') {
  const bullets = Array.isArray(spec.bullets) ? spec.bullets.filter(Boolean) : [];
  const supplied = spec.contentDetails && typeof spec.contentDetails === 'object' ? spec.contentDetails : {};
  if (format === 'carousel') return { kind: 'carousel', pages: Array.isArray(supplied.pages) && supplied.pages.length ? supplied.pages : [{ title: spec.headline, text: spec.subtext || 'A ideia principal deste conteudo.' }, ...bullets.map((text, index) => ({ title: `Pagina ${index + 2}`, text }))] };
  if (format === 'reel') return { kind: 'reel', hook: supplied.hook || spec.headline, script: supplied.script || bullets.map((text, index) => `Cena ${index + 1}: ${text}`).join('\n') || spec.subtext, scenes: Array.isArray(supplied.scenes) && supplied.scenes.length ? supplied.scenes : bullets };
  if (format === 'stories') return { kind: 'stories', stories: Array.isArray(supplied.stories) && supplied.stories.length ? supplied.stories : [{ text: spec.headline, interaction: 'Enquete ou caixa de perguntas' }, ...bullets.map((text) => ({ text, interaction: '' }))] };
  return { kind: 'post', artDirection: supplied.artDirection || spec.imagePrompt || spec.subtext };
}
