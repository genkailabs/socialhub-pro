import { addLayer, makeComposerDocument, makeSurface } from '@/lib/composer-editor';

function asText(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(' ');
  return typeof value === 'string' ? value.trim() : '';
}

function composerFormat(value) {
  const format = String(value || '').toLowerCase();
  if (format.includes('carrossel') || format.includes('carousel')) return 'carrossel';
  if (/post|feed|image|imagem|foto|news|noticia/.test(format)) return 'post';
  return null;
}

function media(url, index) {
  return { url, kind: 'image', name: `Arte gerada por IA ${index + 1}`, width: 1080, height: 1080 };
}

// Adaptador deliberadamente efemero: entrega o conteudo real ao Composer sem
// criar uma linha de post. O usuario decide salvar um rascunho depois de editar.
export function dailyPackageToComposerDraft(pkg) {
  if (!pkg) return null;
  const generated = pkg.generated_content && typeof pkg.generated_content === 'object'
    ? pkg.generated_content
    : {};
  const format = composerFormat(pkg.format);
  if (!format) return null;
  const doc = makeComposerDocument();
  const urls = Array.isArray(pkg.media_urls) ? pkg.media_urls.filter(Boolean) : [];
  const headline = asText(generated.headline || generated.imageTitle || generated.title);

  if (format === 'carrossel') {
    doc.carrossel.slides = (urls.length ? urls : [null, null]).map((url, index) => makeSurface(url ? media(url, index) : null));
    doc.carrossel.active = 0;
  } else if (urls[0]) {
    doc[format].media = media(urls[0], 0);
  }

  const surface = format === 'carrossel' ? doc.carrossel.slides[0] : doc[format];
  if (headline) addLayer(surface, { text: headline, fill: 'transparent', color: '#FFFFFF' });

  return {
    id: null,
    status: 'draft',
    isEphemeral: true,
    editor_state: {
      format,
      ratio: format === 'story' || format === 'reel' ? '9:16' : '1:1',
      doc,
      caption: asText(generated.caption || generated.legenda),
      hashtags: asText(generated.hashtags),
      firstComment: asText(generated.firstComment || generated.first_comment),
      altText: asText(pkg.alt_text)
    }
  };
}
