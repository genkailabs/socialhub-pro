// Cálculos do diagnóstico do Instagram (PRD Etapa 4). Puro, sem I/O.
//
// Regra do produto (§6.3): o código calcula, a IA só interpreta. Nada aqui
// chama modelo, e o resumo diz explicitamente o que a Meta NÃO entregou — a
// skill de auditoria é proibida de inventar métrica ausente (§9.2).
import { suggestBestTimes, MIN_HISTORY } from '@/lib/youtube/best-times';

const round = (n, casas = 0) => {
  const f = 10 ** casas;
  return Math.round(n * f) / f;
};

const interactionsOf = (m) => (m.like_count || 0) + (m.comments_count || 0);

export function postingFrequency(media = [], now = new Date()) {
  const dated = media.filter((m) => m.timestamp);
  if (!dated.length) return { perWeek: 0, total: 0, days: 0 };

  const oldest = dated.reduce((min, m) => Math.min(min, new Date(m.timestamp).getTime()), Infinity);
  const days = Math.max(1, Math.round((now.getTime() - oldest) / (24 * 3600 * 1000)));

  return { perWeek: round((dated.length / days) * 7, 1), total: dated.length, days };
}

export function formatBreakdown(media = []) {
  if (!media.length) return [];

  const counts = new Map();
  for (const m of media) {
    const format = m.media_type || 'DESCONHECIDO';
    counts.set(format, (counts.get(format) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([format, count]) => ({ format, count, share: round((count / media.length) * 100) }))
    .sort((a, b) => b.count - a.count);
}

// Acima/abaixo da média de interações — é o que a Etapa 4 pede para mostrar o
// que funcionou sem depender de alcance (que a Meta pode não fornecer).
export function rankPosts(media = []) {
  if (!media.length) return { average: 0, top: [], below: [] };

  const scored = media
    .map((m) => ({
      id: m.id,
      caption: (m.caption || '').slice(0, 140),
      format: m.media_type || 'DESCONHECIDO',
      permalink: m.permalink,
      timestamp: m.timestamp,
      interactions: interactionsOf(m)
    }))
    .sort((a, b) => b.interactions - a.interactions);

  const average = round(scored.reduce((sum, p) => sum + p.interactions, 0) / scored.length, 1);

  return {
    average,
    top: scored.filter((p) => p.interactions >= average).slice(0, 3),
    below: scored.filter((p) => p.interactions < average).slice(-3)
  };
}

export function followerGrowth(history = []) {
  if (history.length < 2) return null;

  const start = history[0].followers || 0;
  const end = history[history.length - 1].followers || 0;

  return {
    start,
    end,
    delta: end - start,
    // Sem base não existe percentual: null é honesto, 100% seria invenção.
    pct: start ? round(((end - start) / start) * 100, 1) : null
  };
}

// Métricas do Instagram Insights que exigem permissão extra da Meta. Quando não
// vierem, entram em `unavailable` para a skill saber que faltam, em vez de supor.
const INSIGHT_FIELDS = [
  ['reach', 'alcance'],
  ['impressions', 'impressoes'],
  ['saves', 'salvamentos'],
  ['shares', 'compartilhamentos'],
  ['profileViews', 'visitas ao perfil']
];

export function buildAuditSummary({ profile = {}, media = [], followerHistory = [], insights = null, now = new Date() }) {
  const unavailable = INSIGHT_FIELDS
    .filter(([campo]) => insights?.[campo] === undefined || insights?.[campo] === null)
    .map(([, label]) => label);

  const frequency = postingFrequency(media, now);

  return {
    profile: {
      username: profile.username || '',
      biography: profile.biography || '',
      followers: profile.followers || 0,
      mediaCount: profile.mediaCount || media.length
    },
    frequency,
    formats: formatBreakdown(media),
    posts: rankPosts(media),
    growth: followerGrowth(followerHistory),
    // Reusa o cálculo do YouTube: mesma pergunta (quando publicar rendeu mais),
    // trocando views por interações.
    bestTimes: suggestBestTimes({
      videoStats: media.filter((m) => m.timestamp).map((m) => ({ published_at: m.timestamp, views: interactionsOf(m) }))
    }),
    insights: insights || null,
    unavailable,
    // RF-03: o produto precisa avisar quando a conclusão vem de pouca coisa.
    lowData: frequency.total < MIN_HISTORY
  };
}
