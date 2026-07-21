// Pipeline da arte (§19): gerar → validar → aplicar correções → refazer →
// entregar. Puro, sem I/O.
//
// A regra do PRD é dura: o usuário só recebe a arte DEPOIS de passar na
// validação. Este módulo não desenha nem rasteriza — ele decide o conteúdo, o
// layout e a paleta, checa o resultado e corrige o que dá para corrigir sem
// gastar IA de novo. Quem rasteriza chama `buildArt` e usa `node`.
//
// Por que corrigir em vez de só reprovar: quase toda falha do checklist tem
// conserto determinístico (encurtar título, escurecer texto, trocar layout).
// Refazer com IA por causa de contraste seria caro e ainda poderia falhar de
// novo pelo mesmo motivo.

import { selectLayout, layoutById, shapeOf } from '@/lib/ai/art/layouts';
import { composeArt } from '@/lib/ai/art/compose';
import { resolveArtPalette, resolveSize, ensureReadableInk } from '@/lib/ai/art/palette';
import { typeScale, densityFor, framePadding } from '@/lib/ai/art/style';
import { checkArt, describeIssues, MAX_TITLE_CHARS, MAX_SUBTITLE_CHARS } from '@/lib/ai/art/quality';

export const MAX_ART_ATTEMPTS = 3;

// Corta no limite sem partir palavra ao meio nem deixar reticências órfãs.
function trimTo(texto, limite) {
  const s = String(texto || '').trim();
  if (s.length <= limite) return s;
  const corte = s.slice(0, limite - 1);
  const espaco = corte.lastIndexOf(' ');
  return `${(espaco > limite * 0.6 ? corte.slice(0, espaco) : corte).replace(/[\s,;:.-]+$/, '')}…`;
}

/**
 * Aplica a correção de um problema do checklist.
 * Devolve `null` quando o problema não tem conserto automático — aí a arte
 * precisa voltar para a IA, e quem chama decide.
 */
export function applyFix({ issue, content, palette, layout, sizeId, recentLayouts }) {
  switch (issue.id) {
    case 'titulo_longo':
      return { content: { ...content, title: trimTo(content.title, MAX_TITLE_CHARS) } };
    case 'subtitulo_longo':
      return { content: { ...content, subtitle: trimTo(content.subtitle, MAX_SUBTITLE_CHARS) } };
    case 'contraste_baixo':
      return { palette: { ...palette, ink: ensureReadableInk(palette.ink, palette.bg) } };
    case 'acento_invisivel':
      // O acento perdido no fundo vira texto normal: melhor sem destaque do que
      // com destaque ilegível.
      return { palette: { ...palette, accent: palette.ink } };
    case 'imagem_ausente': {
      // Sem imagem, troca para um layout que não depende dela.
      const alternativo = selectLayout({
        content: { ...content, hasImage: false, bullets: content.bullets, subtext: content.subtitle },
        recentLayouts: [...(recentLayouts || []), layout?.id].filter(Boolean),
        shape: sizeId === 'story' ? 'story' : 'square'
      });
      return alternativo && alternativo.id !== layout?.id ? { layout: alternativo } : null;
    }
    case 'peca_vazia':
      // Conteúdo curto demais não se resolve inventando texto: a peça sobe no
      // layout que aguenta título sozinho (painel de cor no lugar do vazio) e o
      // problema fica registrado.
      return { layout: layoutById('declaracao') || layout };
    default:
      // titulo_ausente, paleta_invalida, sem_hierarquia e fora_do_brand_kit não
      // têm conserto honesto aqui.
      return null;
  }
}

/**
 * Monta a arte já validada.
 *
 * @returns {{ node, layout, palette, content, size, ok, issues, attempts, report }}
 */
export function buildArt({
  content = {},
  kit = null,
  brandColor = '',
  niche = '',
  size = 'square',
  recentLayouts = [],
  seed = 0
} = {}) {
  const dim = resolveSize(size);

  let paleta = resolveArtPalette({ kit, brandColor, niche });
  let conteudo = {
    title: String(content.title || '').trim(),
    subtitle: String(content.subtitle || '').trim(),
    eyebrow: String(content.eyebrow || '').trim(),
    bullets: Array.isArray(content.bullets) ? content.bullets.filter(Boolean) : [],
    cta: String(content.cta || '').trim(),
    brand: String(content.brand || '').trim(),
    imageUrl: content.imageUrl || null
  };

  let layout = selectLayout({
    content: { hasImage: Boolean(conteudo.imageUrl), bullets: conteudo.bullets, subtext: conteudo.subtitle },
    recentLayouts,
    seed,
    shape: shapeOf(dim)
  });

  const historico = [];
  let resultado = { ok: false, issues: [] };

  for (let tentativa = 1; tentativa <= MAX_ART_ATTEMPTS; tentativa++) {
    const density = densityFor([conteudo.title, conteudo.subtitle, ...conteudo.bullets].join(' '));
    const scale = typeScale({ width: dim.width, height: dim.height, density });

    resultado = checkArt({
      title: conteudo.title,
      subtitle: conteudo.subtitle,
      bullets: conteudo.bullets,
      palette: paleta,
      scale,
      layout,
      hasImage: Boolean(conteudo.imageUrl),
      followsBrandKit: paleta.followsBrandKit
    });

    if (resultado.ok) break;

    historico.push({ attempt: tentativa, issues: resultado.issues.map((i) => i.id) });

    // Aplica todas as correções possíveis desta rodada antes de revalidar.
    let mudou = false;
    for (const issue of resultado.issues) {
      const fix = applyFix({ issue, content: conteudo, palette: paleta, layout, sizeId: dim.id, recentLayouts });
      if (!fix) continue;
      if (fix.content) conteudo = fix.content;
      if (fix.palette) paleta = fix.palette;
      if (fix.layout) layout = fix.layout;
      mudou = true;
    }
    // Nada corrigível: insistir só repetiria o mesmo resultado.
    if (!mudou) break;
  }

  return {
    node: composeArt({ layout, content: conteudo, palette: paleta, size: dim }),
    layout,
    palette: paleta,
    content: conteudo,
    size: dim,
    ok: resultado.ok,
    issues: resultado.issues,
    attempts: historico.length + (resultado.ok ? 1 : 0) || 1,
    report: describeIssues(resultado.issues),
    padding: framePadding(dim)
  };
}
