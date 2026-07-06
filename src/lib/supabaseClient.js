import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Se as chaves ainda não estiverem preenchidas no .env, avisa no console
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'sua_url_aqui') {
  console.warn(
    '⚠️ Supabase não configurado no arquivo .env. Algumas funcionalidades de banco de dados e login funcionarão em modo simulado/local.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
