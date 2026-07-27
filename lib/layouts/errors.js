// §8: falha da IA nunca sobe como mensagem técnica. A superfície recebe o
// texto amigável; o diagnóstico vai em `detail`, que a interface só mostra
// quando o usuário abre "ver detalhes técnicos".
//
// Módulo puro e separado do layout-actions porque um arquivo "use server" só
// pode exportar funções async.

export const FRIENDLY_GENERATION_ERROR = 'Não foi possível montar a arte. Tente novamente.';

// Erros que o usuário resolve sozinho (sessão, marca, limite do plano)
// continuam explícitos — trocá-los por "tente novamente" esconderia a saída.
const ACTIONABLE_CODES = new Set([
  'production_limit_reached',
  'production_governance_unavailable',
  'research_unavailable'
]);

export function friendlyGenerationError(generated = {}) {
  const technical = String(generated.error || '');
  const actionable = !generated.code || ACTIONABLE_CODES.has(generated.code);
  return {
    error: actionable ? technical : FRIENDLY_GENERATION_ERROR,
    code: generated.code || null,
    detail: [technical, generated.detail].filter(Boolean).join(' · ') || null
  };
}
