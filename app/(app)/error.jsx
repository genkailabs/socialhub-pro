'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';
import { EmptyState } from '@/components/ui/EmptyState';

// Boundary de rota: um erro dentro do app cai aqui e o usuário continua com a
// navegação do SocialHub em volta, em vez de perder a tela inteira. O
// global-error.jsx só entra quando nem o layout raiz sobrevive.
//
// A mensagem técnica não vai para a tela — mesma regra do Composer: texto
// amigável na frente, detalhe só no Sentry.
export default function AppError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="p-8">
      <EmptyState
        title="Não foi possível carregar esta tela"
        icon={AlertTriangle}
        action={
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white"
          >Tentar novamente</button>
        }
      >
        O erro foi registrado. Tente de novo; se continuar, troque de tela e volte.
      </EmptyState>
    </div>
  );
}
