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
  if (format === 'carousel') {
    const pages = Array.isArray(supplied.pages) && supplied.pages.length
      ? supplied.pages.map((p, idx, arr) => ({
        title: p.title || `Slide ${idx + 1}`,
        text: p.text || '',
        visualDirection: p.visualDirection || p.artDirection || spec.imagePrompt || '',
        isLast: idx === arr.length - 1,
        cta: idx === arr.length - 1 ? (p.cta || spec.cta || 'Salve este post para consultar depois.') : ''
      }))
      : [
        { title: spec.headline || 'Slide 1', text: spec.subtext || 'A ideia principal deste conteúdo.', visualDirection: spec.imagePrompt || '', isLast: false, cta: '' },
        ...bullets.map((text, index) => ({
          title: `Slide ${index + 2}`,
          text,
          visualDirection: spec.imagePrompt || '',
          isLast: index === bullets.length - 1,
          cta: index === bullets.length - 1 ? (spec.cta || 'Salve este post para consultar depois.') : ''
        }))
      ].slice(0, 10);
    return { kind: 'carousel', pages, globalCaption: spec.caption || '' };
  }
  if (format === 'reel') {
    return {
      kind: 'reel',
      topic: supplied.topic || spec.headline || 'Ideia de Reel',
      hook: supplied.hook || spec.headline || 'Gancho inicial (3s)',
      script: supplied.script || bullets.map((text, index) => `Cena ${index + 1}: ${text}`).join('\n') || spec.subtext || '',
      spokenText: supplied.spokenText || spec.caption || '',
      onScreenText: supplied.onScreenText || bullets.join(' • ') || spec.headline || '',
      coverSuggestion: supplied.coverSuggestion || spec.imagePrompt || 'Capa com título em destaque na parte superior',
      scenes: Array.isArray(supplied.scenes) && supplied.scenes.length ? supplied.scenes : bullets
    };
  }
  if (format === 'stories') {
    return {
      kind: 'stories',
      overlayText: supplied.overlayText || spec.imageTitle || spec.headline || '',
      ctaVisual: supplied.ctaVisual || 'Enquete, caixa de perguntas ou link interativo',
      stories: Array.isArray(supplied.stories) && supplied.stories.length
        ? supplied.stories
        : [{ text: spec.headline || '', interaction: supplied.ctaVisual || 'Enquete ou caixa de perguntas' }, ...bullets.map((text) => ({ text, interaction: '' }))]
    };
  }
  return {
    kind: 'post',
    idea: supplied.idea || spec.headline || spec.subtext || 'Post de imagem',
    artDirection: supplied.artDirection || spec.imagePrompt || spec.subtext || '',
    feedCaption: spec.caption || '',
    hashtags: spec.hashtags || [],
    cta: spec.cta || ''
  };
}
