// Regras do Brand DNA versionado (PRD §8-E6 / RF-04). Puro, sem I/O.
//
// A IA PROPÕE, o usuário APROVA. Antes disto cada regeneração sobrescrevia o
// brand_kits e o DNA anterior desaparecia — não dava para comparar, nem voltar.
//
// brand_kits continua sendo o cache da versão ativa: todo leitor atual (prompt,
// autopilot, studio) segue lendo de lá sem saber que existe versionamento.

// Colunas de DNA do brand_kits que a análise da IA pode preencher.
// `objective` fica de fora de propósito: é resposta do wizard, do usuário — a
// IA não sobrescreve o que a pessoa respondeu.
export const DNA_COLUMNS = [
  'niche', 'audience', 'tone', 'pillars', 'personality', 'emotions',
  'formality', 'emoji_usage', 'cta_policy', 'storytelling', 'visual_style', 'caption_length'
];

export function pickDnaColumns(dna = {}) {
  const out = {};
  for (const k of DNA_COLUMNS) {
    if (dna[k] !== undefined && dna[k] !== null) out[k] = dna[k];
  }
  return out;
}

// Sempre acima da maior já usada, inclusive arquivadas: reaproveitar número
// faria "versão 2" significar duas coisas diferentes no histórico.
export function nextVersionNumber(versions = []) {
  return versions.reduce((max, v) => Math.max(max, Number(v.version) || 0), 0) + 1;
}

export function activeDna(versions = []) {
  return versions.find((v) => v.status === 'approved') || null;
}

// Restaurar uma versão anterior é aprová-la de novo.
export function canApprove(version) {
  if (!version) return false;
  return version.status === 'proposed' || version.status === 'archived';
}

const ESTADO = {
  approved: 'em uso',
  proposed: 'aguardando sua aprovacao',
  archived: 'anterior'
};

export function versionLabel(version) {
  return `Versao ${version.version} · ${ESTADO[version.status] || version.status}`;
}
