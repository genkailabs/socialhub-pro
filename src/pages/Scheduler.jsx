import React, { useState, useRef } from 'react';
import {
  Instagram,
  Linkedin,
  Facebook,
  Image as ImageIcon,
  Calendar as CalendarIcon,
  Clock,
  Send,
  Save,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Hash,
  Smile,
  Youtube,
  Video,
  Music,
  MessageSquare,
  Info,
  Upload,
  X,
  Link as LinkIcon
} from 'lucide-react';
import LivePreview from '../components/scheduler/LivePreview';
import { useWorkspace } from '../contexts/WorkspaceContext';

export default function Scheduler({ setCurrentTab }) {
  const { activeBrand, addPost } = useWorkspace();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80');
  const [selectedNetworks, setSelectedNetworks] = useState(['instagram', 'linkedin']);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('18:00');
  const [status, setStatus] = useState('scheduled'); // scheduled, draft, waiting_approval
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // Upload de imagem local (converte para data URL exibível no navegador)
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

  const processImageFile = (file) => {
    setUploadError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Arquivo inválido. Envie uma imagem (JPG, PNG, WEBP ou GIF).');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('Imagem muito grande. Limite de 5 MB por arquivo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setMediaUrl(ev.target.result);
      setUploadedFileName(file.name);
    };
    reader.onerror = () => setUploadError('Falha ao ler o arquivo. Tente novamente.');
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    processImageFile(file);
    e.target.value = ''; // permite re-selecionar o mesmo arquivo
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processImageFile(file);
  };

  const clearUploadedImage = () => {
    setMediaUrl('');
    setUploadedFileName(null);
    setUploadError(null);
  };

  // Lista expandida com todas as 7 redes sociais conectadas e suas regras específicas
  const networksList = [
    { id: 'instagram', label: 'Instagram', icon: Instagram, maxChars: 2200, tip: 'Ideal até 30 hashtags, foco em visual e Reels.', color: 'from-purple-500 to-pink-500', bg: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, maxChars: 3000, tip: 'Tom profissional, insights de mercado e networking.', color: 'bg-[#0A66C2]', bg: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
    { id: 'facebook', label: 'Facebook', icon: Facebook, maxChars: 5000, tip: 'Engajamento comunitário e compartilhamento ativo.', color: 'bg-[#1877F2]', bg: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' },
    { id: 'youtube', label: 'YouTube', icon: Youtube, maxChars: 5000, tip: 'Limite de descrição 5000. Ótimo para SEO, links e timestamps.', color: 'bg-[#FF0000]', bg: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
    { id: 'tiktok', label: 'TikTok', icon: Video, maxChars: 2200, tip: 'Vídeos dinâmicos verticais, tendências virais e áudios originais.', color: 'bg-[#000000]', bg: 'bg-slate-100 text-slate-900 border-slate-300 hover:bg-slate-200' },
    { id: 'spotify', label: 'Spotify', icon: Music, maxChars: 4000, tip: 'Ideal para descrição do episódio (Show Notes) e links de referência.', color: 'bg-[#1DB954]', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, maxChars: 1024, tip: '1024 caracteres com suporte a formatação *negrito* e _itálico_.', color: 'bg-[#25D366]', bg: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
  ];

  const toggleNetwork = (netId) => {
    if (selectedNetworks.includes(netId)) {
      if (selectedNetworks.length > 1) {
        setSelectedNetworks(selectedNetworks.filter((id) => id !== netId));
      }
    } else {
      setSelectedNetworks([...selectedNetworks, netId]);
    }
  };

  const insertHashtags = () => {
    const defaultTags = " #Marketing #Inovacao #" + (activeBrand?.name?.replace(/\s+/g, '') || "SocialHub") + " #Trending";
    setContent((prev) => prev + defaultTags);
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('Por favor, insira pelo menos uma legenda para sua postagem.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg(null);

    const fullDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();

    const postData = {
      title: title || 'Postagem Agendada Multi-Canal',
      content,
      media_url: mediaUrl,
      networks: selectedNetworks,
      scheduled_at: fullDateTime,
      status: status
    };

    try {
      await addPost(postData);
      setSuccessMsg('✨ Postagem salva e sincronizada com sucesso para ' + activeBrand?.name + '!');
      
      setTimeout(() => {
        setSuccessMsg(null);
        if (setCurrentTab) setCurrentTab('calendar');
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar postagem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redes atualmente selecionadas para cálculo de limite de caracteres
  const selectedConfigs = networksList.filter(n => selectedNetworks.includes(n.id));
  const currentLimit = selectedConfigs.length > 0 
    ? Math.min(...selectedConfigs.map(c => c.maxChars)) 
    : 2200;

  return (
    <div className="p-8 bg-[#F9FAFB] min-h-full font-sans select-none animate-in fade-in duration-300">
      {/* Header com Ações Rápida */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Estúdio de Publicação Multi-Redes
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Crie, programe e visualize suas postagens para a marca: <strong className="text-gray-800 font-bold">{activeBrand?.name}</strong>
          </p>
        </div>

        {successMsg && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 border border-green-300 text-green-800 rounded-xl text-xs font-bold animate-bounce shadow-md">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna da Esquerda: Formulário de Criação (7 Colunas) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-gray-200/80 shadow-xl space-y-6">
          <form onSubmit={handleSavePost} className="space-y-6">
            {/* Seletor de Redes */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-3">
                1. Selecione os Canais de Destino ({selectedNetworks.length} selecionados)
              </label>
              <div className="flex flex-wrap gap-2.5">
                {networksList.map((net) => {
                  const Icon = net.icon;
                  const isSelected = selectedNetworks.includes(net.id);
                  return (
                    <button
                      key={net.id}
                      type="button"
                      onClick={() => toggleNetwork(net.id)}
                      className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 font-bold text-xs ${
                        isSelected 
                          ? `${net.bg} shadow-md scale-105 ring-2 ring-offset-1 ring-blue-500` 
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{net.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Título Interno */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">
                2. Título de Controle Interno / Título do Vídeo
              </label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Lançamento de Produto • Curta metragem no YouTube / Shorts" 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 outline-none text-sm text-gray-800 transition-all bg-gray-50/50 focus:bg-white"
              />
            </div>

            {/* Textarea para Legenda com Contador e Dicas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                  3. Legenda & Copywriting
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={insertHashtags}
                    className="text-[11px] font-bold text-[#1A73E8] bg-[#1A73E8]/10 hover:bg-[#1A73E8]/20 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Hash className="w-3 h-3" /> Inserir Hashtags
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContent("🔥 " + content + "\n\n👉 Aproveite esta oportunidade única para transformar seus resultados hoje mesmo com nossa tecnologia de ponta. Confira o link ou mande mensagem no WhatsApp! 🚀");
                    }}
                    className="text-[11px] font-bold text-[#F26526] bg-[#F26526]/10 hover:bg-[#F26526]/20 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" /> IA Refinar
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows="5"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva algo incrível para sua audiência... Suporta formatação *negrito* no WhatsApp ou timestaps 0:00 no YouTube / Spotify!"
                  maxLength={currentLimit}
                  className={`w-full p-4 rounded-2xl border transition-all outline-none text-sm text-gray-800 bg-gray-50/50 focus:bg-white resize-y ${
                    content.length > currentLimit * 0.9 ? 'border-amber-500 focus:border-amber-600 focus:ring-amber-500/20' : 'border-gray-300 focus:border-[#F26526] focus:ring-2 focus:ring-[#F26526]/20'
                  }`}
                ></textarea>
                <div className={`absolute bottom-3 right-3 text-[11px] font-extrabold px-2 py-0.5 rounded-md backdrop-blur-sm border ${
                  content.length > currentLimit * 0.9 ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse' : 'bg-white/80 text-gray-500 border-gray-100'
                }`}>
                  {content.length} / {currentLimit}
                </div>
              </div>

              {/* Dicas e Regras Específicas dos Canais Selecionados */}
              {selectedConfigs.length > 0 && (
                <div className="mt-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-900">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Dicas & Limites dos Canais Selecionados:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedConfigs.map((net) => (
                      <div key={net.id} className="text-[11px] bg-white p-2.5 rounded-xl border border-blue-100 shadow-sm flex items-start gap-2">
                        <span className="font-extrabold text-gray-900 uppercase shrink-0">{net.label}:</span>
                        <span className="text-gray-600 leading-tight">{net.tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Upload / Input de Mídia */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">
                4. Mídia do Post (Imagem / Vídeo URL / Capa do Podcast)
              </label>

              {/* Área de Upload de Imagem (arraste ou clique) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleFileInput}
                className="hidden"
              />

              {mediaUrl && uploadedFileName ? (
                // Preview do arquivo enviado
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 bg-gray-50/70">
                  <img
                    src={mediaUrl}
                    alt="Pré-visualização"
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-gray-800 truncate flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      {uploadedFileName}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Imagem carregada do seu dispositivo</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-bold text-[#1A73E8] hover:underline"
                      >
                        Trocar imagem
                      </button>
                      <button
                        type="button"
                        onClick={clearUploadedImage}
                        className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Remover
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Dropzone
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`w-full flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-2xl border-2 border-dashed transition-all ${
                    isDragging
                      ? 'border-[#F26526] bg-[#F26526]/5'
                      : 'border-gray-300 bg-gray-50/50 hover:border-[#F26526]/60 hover:bg-[#F26526]/5'
                  }`}
                >
                  <div className="p-2.5 rounded-xl bg-[#F26526]/10 text-[#F26526]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold text-gray-700">
                    Arraste uma imagem aqui ou <span className="text-[#F26526]">clique para enviar</span>
                  </span>
                  <span className="text-[10px] text-gray-400">PNG, JPG, WEBP ou GIF · até 5 MB</span>
                </button>
              )}

              {uploadError && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {uploadError}
                </div>
              )}

              {/* Alternativa: colar URL */}
              <div className="mt-3">
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="url"
                    value={uploadedFileName ? '' : mediaUrl}
                    onChange={(e) => { setMediaUrl(e.target.value); setUploadedFileName(null); }}
                    disabled={!!uploadedFileName}
                    placeholder="… ou cole a URL de uma imagem/vídeo externo"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 outline-none text-xs text-gray-800 transition-all bg-gray-50/50 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Sugestões Rápidas de Imagens */}
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">SUGESTÕES RÁPIDAS:</span>
                {[
                  { label: 'Tecnologia / Vídeo', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80' },
                  { label: 'Capa Podcast', url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=80' },
                  { label: 'TikTok Vertical', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80' },
                  { label: 'Negócios', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setMediaUrl(item.url); setUploadedFileName(null); }}
                    className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#F26526]/10 hover:text-[#F26526] text-[11px] font-bold text-gray-600 transition-colors shrink-0 border border-gray-200"
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de Data, Hora e Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#F26526]" /> Data
                </label>
                <input 
                  type="date" 
                  value={scheduledDate} 
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 bg-gray-50 focus:bg-white outline-none focus:border-[#F26526]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#1A73E8]" /> Horário
                </label>
                <input 
                  type="time" 
                  value={scheduledTime} 
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 bg-gray-50 focus:bg-white outline-none focus:border-[#1A73E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Status Inicial
                </label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 bg-gray-50 focus:bg-white outline-none focus:border-gray-500"
                >
                  <option value="scheduled">🟢 Agendar Publicação</option>
                  <option value="waiting_approval">🟠 Aguardar Aprovação</option>
                  <option value="draft">🟡 Salvar como Rascunho</option>
                </select>
              </div>
            </div>

            {/* Botões de Submissão */}
            <div className="pt-4 flex items-center justify-end space-x-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setTitle('');
                  setContent('');
                }}
                className="px-5 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-600 text-xs font-bold transition-colors"
              >
                Limpar
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-gradient-to-r from-[#F26526] to-[#FF8A50] hover:from-[#d9551c] hover:to-[#F26526] text-white rounded-xl font-extrabold text-sm shadow-xl shadow-[#F26526]/30 hover:shadow-2xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirmar Publicação</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Coluna da Direita: LivePreview (5 Colunas) */}
        <div className="lg:col-span-5 h-[640px] sticky top-8">
          <LivePreview 
            title={title} 
            content={content} 
            mediaUrl={mediaUrl} 
            selectedNetworks={selectedNetworks} 
          />
        </div>
      </div>
    </div>
  );
}
