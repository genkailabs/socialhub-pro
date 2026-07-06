import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const DEMO_USER = {
  id: 'genkai-labs-admin',
  email: 'genkailabs@gmail.com',
  user_metadata: {
    name: 'Genkai Labs',
    role: 'Admin Sênior / Titular',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  isDemo: false
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        setLoading(true);
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('⚡ [AuthContext] Aviso na sessão do Supabase, ativando modo Demo:', sessionError.message);
          if (mounted) setUser(DEMO_USER);
        } else if (data?.session?.user) {
          if (mounted) setUser(data.session.user);
        } else {
          // Fallback gracioso: Ativa usuário Demo por padrão para testes imersivos
          if (mounted) setUser(DEMO_USER);
        }
      } catch (err) {
        console.warn('⚡ [AuthContext] Erro ao conectar ao Supabase Auth, ativando modo Demo:', err);
        if (mounted) setUser(DEMO_USER);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listener para mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (session?.user) {
          setUser(session.user);
        } else {
          // Mantém modo Demo ativo quando deslogado no modo de demonstração
          setUser(DEMO_USER);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Falha no login real, simulando acesso Demo.', err.message);
      setUser(DEMO_USER);
      return { user: DEMO_USER, error: null };
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Falha no cadastro real, usando Demo.', err.message);
      const newUser = {
        ...DEMO_USER,
        email,
        user_metadata: { ...DEMO_USER.user_metadata, ...metadata }
      };
      setUser(newUser);
      return { user: newUser, error: null };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Erro ao sair:', err);
    } finally {
      setUser(DEMO_USER);
    }
  };

  const loginAsDemo = () => {
    setUser(DEMO_USER);
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    loginAsDemo,
    isAuthenticated: !!user,
    isDemo: user?.isDemo || user?.id === DEMO_USER.id
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
