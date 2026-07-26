import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { processarFila } from '@/lib/publish-scheduler';

// Disparo manual (ou por cron externo) da fila de publicação.
//
// O caminho normal é o agendador interno em lib/publish-scheduler.js, que roda
// dentro do processo do app. Esta rota existe para forçar uma varredura sem
// esperar o próximo minuto — útil para testar e para o dia em que um cron
// externo fizer mais sentido que o timer interno.
//
// Sem sessão de usuário de propósito: /api/social/publish exige uma e por isso
// nunca serviu como worker. Aqui a autorização é um segredo compartilhado e o
// banco é acessado com service role, o que torna esta a rota mais sensível do
// app. Sem CRON_SECRET configurado ela se recusa a funcionar, em vez de ficar
// aberta.

export const dynamic = 'force-dynamic';

function autorizado(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, status: 503, error: 'CRON_SECRET não configurado no servidor.' };

  const header = request.headers.get('authorization') || '';
  const enviado = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(enviado);
  const b = Buffer.from(secret);
  // Tempo constante: o tamanho já vaza pelo length, então comparamos só quando
  // bate; o que não pode vazar é o conteúdo, byte a byte.
  const igual = a.length === b.length && timingSafeEqual(a, b);
  if (!igual) return { ok: false, status: 401, error: 'Não autorizado.' };
  return { ok: true };
}

export async function POST(request) {
  const auth = autorizado(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const resultado = await processarFila();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// Agendadores externos costumam só saber fazer GET. Mesmo segredo, mesmo trabalho.
export const GET = POST;
