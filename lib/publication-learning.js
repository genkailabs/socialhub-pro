// Regras puras do ultimo trecho do fluxo: publicar, medir e aprender.
// Mantidas fora das Server Actions para que a decisao seja testavel e nao dependa
// de uma chamada a rede social.
export function validatePublication({ connected, mediaUrls, format = 'image', approvalStatus, scheduledAt, now = new Date() } = {}) {
  const errors = [];
  if (!connected) errors.push('Conecte o Instagram antes de publicar.');
  const media = (mediaUrls || []).filter(Boolean);
  if (!media.length) errors.push('Adicione uma mídia antes de publicar.');
  if (format === 'carousel' && media.length < 2) errors.push('Um carrossel precisa de pelo menos duas mídias.');
  if (approvalStatus === 'waiting_approval') errors.push('Aguarde a aprovação antes de publicar.');
  if (scheduledAt && new Date(scheduledAt).getTime() <= now.getTime()) errors.push('Escolha uma data futura para agendar.');
  return { ok: errors.length === 0, errors };
}

export function learningComparison({ baseline, observed }) {
  if (!Number.isFinite(baseline) || !Number.isFinite(observed) || baseline === 0) return null;
  return Math.round(((observed - baseline) / Math.abs(baseline)) * 1000) / 10;
}

export function feedbackForLearning({ topic, format, metric = 'resultado', comparison }) {
  if (!Number.isFinite(comparison)) return null;
  const label = format || 'conteúdo';
  const subject = topic ? ` sobre ${topic}` : '';
  if (comparison > 0) return `A recomendação funcionou: o ${label}${subject} teve ${comparison}% a mais de ${metric} que a média anterior. Vamos considerar isso nas próximas decisões.`;
  if (comparison < 0) return `O ${label}${subject} ficou ${Math.abs(comparison)}% abaixo da média anterior em ${metric}. Vamos ajustar a próxima recomendação.`;
  return `O ${label}${subject} ficou próximo da média anterior em ${metric}. Continuaremos acompanhando os próximos resultados.`;
}
