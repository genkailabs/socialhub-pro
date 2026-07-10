import React from 'react';

/**
 * Captura erros de renderização em qualquer componente filho e mostra uma
 * tela amigável em vez de uma tela branca (equivalente a uma página 500 para SPA).
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log estruturado — trocar por Sentry/LogRocket em produção
    console.error('[ErrorBoundary] Erro de renderização capturado:', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0F172A] text-white font-sans p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-5">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">Algo deu errado</h1>
        <p className="text-sm text-gray-400 max-w-md leading-relaxed mb-6">
          Encontramos um erro inesperado ao carregar esta tela. Nossa equipe foi notificada.
          Você pode tentar recarregar a página.
        </p>
        <button
          onClick={this.handleReload}
          className="px-6 py-3 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white rounded-xl font-extrabold text-sm shadow-lg shadow-[#F26526]/30 transition-all"
        >
          Recarregar aplicação
        </button>
        {import.meta.env.DEV && this.state.error && (
          <pre className="mt-6 max-w-lg overflow-auto text-left text-[11px] text-red-300 bg-black/40 p-4 rounded-xl border border-red-500/20">
            {String(this.state.error?.message || this.state.error)}
          </pre>
        )}
      </div>
    );
  }
}
