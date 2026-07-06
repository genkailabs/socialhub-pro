import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

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
          console.error('⚡ [AuthContext] Erro na sessão do Supabase:', sessionError.message);
          if (mounted) setUser(null);
        } else if (data?.session?.user) {
          if (mounted) setUser(data.session.user);
        } else {
          if (mounted) setUser(null);
        }
      } catch (err) {
        console.error('⚡ [AuthContext] Erro ao conectar ao Supabase Auth:', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listener para mudanças de estado de autenticação (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
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
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      throw error;
    }
    return data;
  };

  const signUp = async (email, password, metadata = {}) => {
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) {
      setError(error.message);
      throw error;
    }
    return data;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Erro ao sair do Supabase:', err);
    } finally {
      setUser(null);
      try {
        localStorage.clear();
      } catch (e) {
        // Ignora erros ao limpar storage em iframes
      }
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
