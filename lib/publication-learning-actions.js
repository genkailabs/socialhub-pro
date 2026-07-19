'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { feedbackForLearning, learningComparison } from '@/lib/publication-learning';

export async function recordPublicationLearning({ postId, observedValue, metricName }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada.' };
  const { data: learning, error } = await supabase.from('publication_learning').select('*').eq('post_id', postId).maybeSingle();
  if (error || !learning) return { error: 'Não foi possível encontrar o aprendizado deste conteúdo.' };
  const observed = Number(observedValue);
  if (!Number.isFinite(observed)) return { error: 'Informe uma métrica válida.' };
  const comparison = learningComparison({ baseline: Number(learning.baseline_value), observed });
  const status = comparison === null ? 'inconclusive' : 'measured';
  const feedback = feedbackForLearning({ topic: learning.topic, format: learning.format, metric: metricName || learning.metric_name, comparison });
  const { error: updateError } = await supabase.from('publication_learning').update({
    metric_name: metricName || learning.metric_name, observed_value: observed,
    comparison_percent: comparison, result_status: status, user_feedback: feedback, measured_at: new Date().toISOString()
  }).eq('id', learning.id);
  if (updateError) return { error: 'Não foi possível registrar o resultado.' };
  revalidatePath('/composer'); revalidatePath('/metrics');
  return { ok: true, feedback, comparison };
}
