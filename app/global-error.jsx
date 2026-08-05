'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// Último anteparo do App Router: erro de render que escapa de todos os
// boundaries cai aqui. Sem este arquivo o usuário via a tela padrão do Next e
// o Sentry não recebia nada — era o aviso que o build repetia a cada compilação.
//
// Precisa trazer <html> e <body> próprios: quando ele aparece, substitui o
// layout raiz inteiro.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#080B12',
        color: '#F5F7FB',
        fontFamily: 'Manrope,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
      }}>
        <main style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Algo quebrou nesta tela</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#93A0B5', margin: '0 0 20px' }}>
            O erro foi registrado. Tente de novo — se continuar, recarregue a página.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: 10,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: '#7566FF',
              cursor: 'pointer'
            }}
          >Tentar novamente</button>
        </main>
      </body>
    </html>
  );
}
