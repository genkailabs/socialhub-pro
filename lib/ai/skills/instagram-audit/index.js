import { z } from 'zod';
import { defineSkill } from '@/lib/ai/skills/registry';

// Skill "Auditor de Instagram" (PRD §9.2): interpreta o diagnóstico já calculado
// por lib/meta/audit.js. Não recebe post cru nem calcula nada — só lê o resumo.
//
// Restrição central: não inventar métrica indisponível. O resumo lista o que a
// Meta não entregou; a skill precisa tratar isso como ausência, não como zero.

const ponto = z.object({
  title: z.string().min(1),
  detail: z.string().min(1)
});

export const inputSchema = z.object({
  summary: z.object({
    profile: z.object({
      username: z.string(),
      biography: z.string().optional().default(''),
      followers: z.number(),
      mediaCount: z.number()
    }),
    frequency: z.object({ perWeek: z.number(), total: z.number(), days: z.number() }),
    formats: z.array(z.object({ format: z.string(), count: z.number(), share: z.number() })),
    posts: z.object({
      average: z.number(),
      top: z.array(z.object({ caption: z.string(), format: z.string(), interactions: z.number() })),
      below: z.array(z.object({ caption: z.string(), format: z.string(), interactions: z.number() }))
    }),
    growth: z.object({ start: z.number(), end: z.number(), delta: z.number(), pct: z.number().nullable() }).nullable(),
    bestTimes: z.array(z.object({ weekday: z.number(), hour: z.number(), basis: z.string() })),
    insights: z.record(z.string(), z.number()).nullable(),
    unavailable: z.array(z.string()),
    lowData: z.boolean()
  })
});

// Máximo 3 de cada: a tela mostra 3 (§8-E4).
export const outputSchema = z.object({
  strengths: z.array(ponto).max(3),
  attention: z.array(ponto).max(3),
  opportunities: z.array(ponto).max(3),
  priorities: z.array(z.string()).max(3),
  openQuestions: z.array(z.string()).max(3),
  confidence: z.enum(['baixa', 'media', 'alta'])
});

const SYSTEM = [
  'Voce analisa o perfil de Instagram de um pequeno negocio.',
  'Escreva em portugues do Brasil, direto, sem jargao de marketing.',
  'Evite termos como "topo de funil", "taxa de retencao" ou "arquetipo".',
  'Use SOMENTE os numeros recebidos. Nunca cite metrica listada em "Indisponivel".',
  'Nao estime, nao arredonde para cima e nao compare com "media do mercado".',
  'Se os dados forem poucos, diga isso e use confidence "baixa".',
  'No maximo 3 itens por lista. Cada ponto precisa citar o dado que o sustenta.',
  'Responda apenas com JSON valido no formato:',
  '{"strengths":[{"title":string,"detail":string}],"attention":[...],"opportunities":[...],',
  '"priorities":string[],"openQuestions":string[],"confidence":"baixa"|"media"|"alta"}'
].join(' ');

const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function buildUser({ summary: s }) {
  const linhas = [
    `Perfil: @${s.profile.username}`,
    s.profile.biography && `Bio: ${s.profile.biography}`,
    `Seguidores: ${s.profile.followers}`,
    `Publicacoes: ${s.profile.mediaCount}`,
    `Frequencia: ${s.frequency.perWeek} posts por semana (${s.frequency.total} posts em ${s.frequency.days} dias)`
  ].filter(Boolean);

  if (s.formats.length) {
    linhas.push(`Formatos: ${s.formats.map((f) => `${f.format} ${f.count}x (${f.share}%)`).join(', ')}`);
  }

  linhas.push(`Media de interacoes por post: ${s.posts.average}`);
  if (s.posts.top.length) {
    linhas.push('Melhor desempenho:');
    for (const p of s.posts.top) linhas.push(`- [${p.format}] ${p.interactions} interacoes: ${p.caption}`);
  }
  if (s.posts.below.length) {
    linhas.push('Abaixo da media:');
    for (const p of s.posts.below) linhas.push(`- [${p.format}] ${p.interactions} interacoes: ${p.caption}`);
  }

  if (s.growth) {
    const pct = s.growth.pct === null ? 'sem base para percentual' : `${s.growth.pct}%`;
    linhas.push(`Seguidores no periodo: ${s.growth.start} -> ${s.growth.end} (${s.growth.delta}, ${pct})`);
  } else {
    linhas.push('Evolucao de seguidores: ainda sem historico suficiente.');
  }

  // Horário heurístico não é dado do perfil: dizer isso evita a IA afirmar que
  // "os posts das terças rendem mais" quando ninguém mediu nada.
  if (s.bestTimes.length) {
    const base = s.bestTimes[0].basis === 'heuristic' ? ' (referencia geral, nao medida deste perfil)' : ' (medido neste perfil)';
    linhas.push(`Horarios com mais interacao${base}: ${s.bestTimes.map((t) => `${DIAS[t.weekday]} ${t.hour}h`).join(', ')}`);
  }

  if (s.insights) {
    linhas.push(`Metricas do Insights: ${Object.entries(s.insights).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }
  if (s.unavailable.length) {
    linhas.push(`Indisponivel (a Meta nao forneceu; NAO cite nem estime): ${s.unavailable.join(', ')}.`);
  }
  if (s.lowData) {
    linhas.push('Atencao: ha poucos posts para concluir com seguranca. Use confidence "baixa".');
  }

  return linhas.join('\n');
}

export const instagramAuditSkill = defineSkill({
  id: 'instagram-audit',
  version: 1,
  description: 'Interpreta o diagnostico calculado do Instagram em pontos fortes, atencao e prioridades.',
  inputSchema,
  outputSchema,
  temperature: 0.5,
  buildPrompt: (input) => ({ system: SYSTEM, user: buildUser(input) })
});
