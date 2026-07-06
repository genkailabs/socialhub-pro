import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Share2, 
  Lock, 
  Mail, 
  User, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  X,
  ShieldCheck
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { signIn, signUp, user, isDemo } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!email || !password || !fullName) {
          throw new Error('Por favor, preencha seu nome, e-mail e senha.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }

        const res = await signUp(email, password, {
          full_name: fullName,
          agency_name: agencyName || 'Agência Principal'
        });

        if (res.error) throw res.error;

        setSuccessMsg('🎉 Conta criada e autenticada com sucesso no banco real do Supabase! Seus dados estão salvos na nuvem.');
        setTimeout(() => {
          onClose();
        }, 2500);
      } else {
        if (!email || !password) {
          throw new Error('Informe e-mail e senha para entrar.');
        }

        const res = await signIn(email, password);
        if (res.error) throw res.error;

        setSuccessMsg('✨ Login bem-sucedido! Bem-vindo de volta ao seu painel.');
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setError(err.message || 'Ocorreu um erro na comunicação com o Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#111827] rounded-3xl max-w-md w-full border border-gray-800 shadow-2xl overflow-hidden relative">
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Institucional */}
        <div className="p-7 pb-5 text-center border-b border-gray-800 bg-gradient-to-b from-[#1F2937]/50 to-transparent">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#F26526]/30">
            <Share2 className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {isSignUp ? 'Criar Sua Conta Real no SaaS' : 'Acessar Seu Painel PRO'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {isSignUp 
              ? 'Cadastre-se para gravar suas marcas, clientes e posts no seu banco Supabase real na nuvem.' 
              : 'Entre com seu e-mail e senha cadastrados no Supabase.'}
          </p>
        </div>

        {/* Abas de Alternância */}
        <div className="flex border-b border-gray-800 bg-[#0B0F19]/60">
          <button
            onClick={() => { setIsSignUp(true); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-3.5 text-xs font-extrabold transition-all border-b-2 ${
              isSignUp 
                ? 'border-[#F26526] text-white bg-[#F26526]/10' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Criar Conta Grátis
          </button>
          <button
            onClick={() => { setIsSignUp(false); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-3.5 text-xs font-extrabold transition-all border-b-2 ${
              !isSignUp 
                ? 'border-[#1A73E8] text-white bg-[#1A73E8]/10' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Já Tenho Conta (Entrar)
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="p-7 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 animate-in shake duration-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-green-500/15 border border-green-500/30 text-green-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {isSignUp && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Seu Nome Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    className="w-full bg-[#1F2937] border border-gray-700 focus:border-[#F26526] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Nome da Agência / Empresa
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Ex: Marketing Digital 360"
                    className="w-full bg-[#1F2937] border border-gray-700 focus:border-[#F26526] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              E-mail Profissional *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="genkailabs@gmail.com"
                className="w-full bg-[#1F2937] border border-gray-700 focus:border-[#1A73E8] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Senha de Acesso *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="No mínimo 6 caracteres"
                className="w-full bg-[#1F2937] border border-gray-700 focus:border-[#1A73E8] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || successMsg}
            className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
              isSignUp
                ? 'bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white shadow-[#F26526]/25'
                : 'bg-gradient-to-r from-[#1A73E8] to-[#60A5FA] hover:from-[#1557b0] hover:to-[#1A73E8] text-white shadow-[#1A73E8]/25'
            } disabled:opacity-50 disabled:cursor-not-allowed mt-2`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Conectando ao Supabase...</span>
              </span>
            ) : (
              <>
                <span>{isSignUp ? 'Criar Conta e Salvar no Banco' : 'Acessar Meu Painel'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer de Segurança */}
        <div className="p-4 bg-[#0B0F19] border-t border-gray-800 text-center flex items-center justify-center gap-2 text-[11px] text-gray-500">
          <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
          <span>Autenticação com criptografia JWT ponta a ponta na nuvem.</span>
        </div>
      </div>
    </div>
  );
}
