import React, { useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { 
  Building2, 
  AtSign, 
  Tag, 
  Palette, 
  X, 
  Sparkles, 
  Check
} from 'lucide-react';

const CATEGORIES = [
  'E-commerce',
  'Tecnologia & Inovação',
  'Saúde & Bem-Estar',
  'Moda & Varejo',
  'Educação & Infoprodutos',
  'Finanças & Fintech',
  'Geral'
];

const COLOR_SWATCHES = [
  { name: 'Laranja SocialHub', hex: '#F26526' },
  { name: 'Azul Tech', hex: '#1A73E8' },
  { name: 'Roxo IA', hex: '#8B5CF6' },
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Rosa Vibrante', hex: '#EC4899' },
  { name: 'Âmbar Dourado', hex: '#F59E0B' },
  { name: 'Ciano Moderno', hex: '#06B6D4' }
];

const LOGO_PRESETS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&auto=format&fit=crop&q=80'
];

export default function NewBrandModal({ isOpen, onClose }) {
  const { addBrand } = useWorkspace();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [category, setCategory] = useState('E-commerce');
  const [color, setColor] = useState('#F26526');
  const [selectedLogo, setSelectedLogo] = useState(LOGO_PRESETS[0]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!handle || handle.startsWith('@')) {
      const formattedHandle = `@${val.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      setHandle(formattedHandle);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await addBrand({
        name: name.trim(),
        handle: handle.trim() || `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        category: category || 'Geral',
        color: color || '#F26526',
        logo: selectedLogo
      });
      onClose();
      // Reset form
      setName('');
      setHandle('');
      setCategory('E-commerce');
      setColor('#F26526');
    } catch (err) {
      console.error('Erro ao adicionar marca:', err);
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

        {/* Header */}
        <div className="p-7 pb-5 text-center border-b border-gray-800 bg-gradient-to-b from-[#1F2937]/50 to-transparent">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F26526] to-[#FF8A50] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#F26526]/30">
            <Building2 className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Adicionar Nova Marca
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Cadastre uma nova marca ou cliente para gerenciar no SocialHub PRO.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-7 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Nome da Marca */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Nome da Marca *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="Ex: Nova Loja Brasil"
                className="w-full bg-[#1F2937] border border-gray-700 focus:border-[#F26526] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Handle */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Handle / Usuário
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@novalojabrasil"
                className="w-full bg-[#1F2937] border border-gray-700 focus:border-[#F26526] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Categoria / Segmento
            </label>
            <div className="relative mb-2">
              <Tag className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: E-commerce, Saúde, Tecnologia"
                className="w-full bg-[#1F2937] border border-gray-700 focus:border-[#F26526] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                    category === cat
                      ? 'bg-[#F26526]/20 text-[#F26526] border-[#F26526]'
                      : 'bg-[#1F2937] text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cor Primária */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Cor de Destaque da Marca
            </label>
            <div className="flex items-center gap-2 mb-2.5">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  title={swatch.name}
                  onClick={() => setColor(swatch.hex)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    color === swatch.hex ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                >
                  {color === swatch.hex && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              ))}
            </div>
            <div className="relative">
              <Palette className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#F26526"
                className="w-full bg-[#1F2937] border border-gray-700 focus:border-[#F26526] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 font-mono focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Preset de Logo */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Ícone / Logo de Apresentação
            </label>
            <div className="flex items-center gap-2.5">
              {LOGO_PRESETS.map((logoUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedLogo(logoUrl)}
                  className={`relative rounded-xl overflow-hidden w-11 h-11 border-2 transition-all ${
                    selectedLogo === logoUrl ? 'border-[#F26526] scale-105 shadow-md shadow-[#F26526]/20' : 'border-gray-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={logoUrl} alt="Preset" className="w-full h-full object-cover" />
                  {selectedLogo === logoUrl && (
                    <div className="absolute inset-0 bg-[#F26526]/40 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-[#1F2937] hover:bg-gray-800 text-gray-300 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#e0561b] hover:to-[#F26526] text-white font-extrabold text-xs shadow-lg shadow-[#F26526]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>Salvar Marca</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
