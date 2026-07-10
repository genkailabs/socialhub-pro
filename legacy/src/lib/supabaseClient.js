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
  supabaseUrl || 'https://geoqbbrlyepmhwgdbjmz.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdlb3FiYnJseWVwbWh3Z2Riam16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NjYzNTMsImV4cCI6MjA5OTA0MjM1M30.n7258I3YtCpF3pq6VlYkgYJ_z04fSnNVSEDKRT5tc1Q'
);
