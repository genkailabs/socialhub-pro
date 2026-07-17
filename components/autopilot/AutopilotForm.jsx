'use client';
import { useState } from 'react';
import {
  Wand2, CheckCircle2, AlertCircle, CalendarClock, Plus, X,
  Sliders, LayoutTemplate, Sparkles, Clock, Layers, ShieldAlert
} from 'lucide-react';
import { saveContentPlan, setAutopilotActive } from '@/lib/content-plan-actions';
import { TEMPLATES, TEMPLATE_LABELS } from '@/lib/ai/templates';
import { Button } from '@/components/ui/Button';

const COMMON_PILLARS = [
  'Dicas Práticas',
  'Bastidores da Empresa',
  'Prova Social / Depoimentos',
  'Curiosidades do Setor',
  'Frase Motivacional'
];

export function AutopilotForm({ brandId, plan, hasBrandKit }) {
  const [active, setActive] = useState(!!plan?.active);
  const [postsPerDay, setPostsPerDay] = useState(plan?.posts_per_day || 1);
  const [format, setFormat] = useState(plan?.format || 'news');
  const [pillarsList, setPillarsList] = useState(plan?.pillars || []);
  const [newPillar, setNewPillar] = useState('');
  const [times, setTimes] = useState((plan?.preferred_times || []).join(', '));
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [msg, setMsg] = useState(null);

  // Ativa/pausa em 1 clique e salva na hora (independente do botão "Salvar").
  async function toggleActive() {
    if (toggling) return;
    const next = !active;
    setActive(next); // otimista
    setToggling(true);
    setMsg(null);
    const res = await setAutopilotActive({ brandId, active: next });
    setToggling(false);
    if (res?.error) {
      setActive(!next); // reverte se falhar
      setMsg({ type: 'err', text: res.error });
    } else {
      setMsg({
        type: 'ok',
        text: next
          ? 'Piloto ATIVADO ✓ A IA vai gerar posts diários (execução às 09:00) na sua fila de Aprovações.'
          : 'Piloto pausado. A IA não vai gerar novos posts.'
      });
    }
  }

  function addPillar(text) {
    const val = text.trim();
    if (!val || pillarsList.includes(val)) return;
    setPillarsList([...pillarsList, val]);
    setNewPillar('');
  }

  function removePillar(idx) {
    setPillarsList(pillarsList.filter((_, i) => i !== idx));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await saveContentPlan({
      brandId,
      active,
      postsPerDay,
      format,
      pillars: pillarsList.join('\n'),
      preferredTimes: times
    });
    setBusy(false);
    setMsg(res?.error ? { type: 'err', text: res.error } : { type: 'ok', text: 'Configuração do Piloto Automático salva com sucesso!' });
  }

  const field =
    'w-full rounded-xl glass px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs leading-relaxed text-muted">
        O piloto gera conteudo uma vez por dia e envia para aprovacao. Ao aprovar, o post e agendado para o proximo horario da lista abaixo (horario de Sao Paulo). Sem horarios definidos, usa 09:00.
      </div>
      {/* Alerta caso não tenha Brand Kit configurado */}
      {!hasBrandKit && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-xs text-ink">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="font-extrabold text-ink">Atenção: Brand Kit não configurado</p>
            <p className="text-muted leading-relaxed">
              Sem o <a href="/brand-kit" className="font-bold text-accent hover:underline">Brand Kit</a>, a IA não saberá sua paleta de cores nem o tom de voz da marca. Configure o Brand Kit primeiro para que os posts gerados tenham a cara do seu negócio.
            </p>
          </div>
        </div>
      )}

      {/* 1. Ativação Principal — salva na hora */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleActive}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleActive(); } }}
        aria-busy={toggling}
        className={`cursor-pointer rounded-2xl border p-5 transition-all shadow-soft ${toggling ? 'opacity-70' : ''} ${
          active
            ? 'border-accent bg-accent/5 dark:bg-accent/10'
            : 'border-line bg-surface hover:border-line-strong'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-bold transition-colors ${
                active ? 'bg-accent text-white' : 'bg-surface-2 text-muted'
              }`}
            >
              <Wand2 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-extrabold text-ink">Ativar Piloto Automático</p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                    active
                      ? 'bg-success/20 text-success'
                      : 'bg-surface-2 text-muted'
                  }`}
                >
                  {active ? 'ATIVADO' : 'PAUSADO'}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                Quando ativado, nosso servidor gerará novos posts diários para sua fila de aprovação. Você não precisará clicar em nada no dia a dia.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={active}
            className={`relative h-7 w-13 shrink-0 rounded-full transition-colors ${
              active ? 'bg-accent' : 'bg-line-strong'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                active ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Quantidade e Formato */}
      <div className="grid gap-6 rounded-2xl glass p-5 shadow-soft sm:grid-cols-2">
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink">
            <Sliders className="h-3.5 w-3.5 text-accent" /> Ritmo de Geração Diária
          </label>
          <select
            value={postsPerDay}
            onChange={(e) => setPostsPerDay(Number(e.target.value))}
            className={field}
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n} post{n > 1 ? 's' : ''} por dia ({n * 7} posts/semana)
              </option>
            ))}
          </select>
          <p className="text-[11px] text-faint">
            Recomendamos 1 post/dia para manter o engajamento sem saturar sua audiência.
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink">
            <LayoutTemplate className="h-3.5 w-3.5 text-accent" /> Formato Visual Principal
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={field}
          >
            {TEMPLATES.map((t) => (
              <option key={t} value={t}>
                {TEMPLATE_LABELS[t]}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-faint">
            A IA priorizará esse formato visual nas artes geradas automaticamente.
          </p>
        </div>
      </div>

      {/* 3. Rodízio de Pilares de Conteúdo */}
      <div className="rounded-2xl glass p-5 shadow-soft space-y-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink">
            <Layers className="h-3.5 w-3.5 text-accent" /> Rodízio de Pilares de Conteúdo
          </label>
          <p className="mt-1 text-xs text-muted">
            Defina os temas que a IA irá alternar ao longo da semana (ex: Segunda dica técnica, Terça depoimento, Quarta bastidores).
          </p>
        </div>

        {/* Lista de tags / pilares */}
        <div className="flex flex-wrap items-center gap-2">
          {pillarsList.length === 0 ? (
            <span className="text-xs italic text-faint">
              Nenhum pilar específico adicionado. A IA usará os pilares gerais do Brand Kit.
            </span>
          ) : (
            pillarsList.map((p, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink"
              >
                {p}
                <button
                  type="button"
                  onClick={() => removePillar(idx)}
                  className="rounded-full text-muted hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Adicionar novo pilar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newPillar}
            onChange={(e) => setNewPillar(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPillar(newPillar);
              }
            }}
            placeholder="Digite um novo pilar de conteúdo e pressione Enter..."
            className={field}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addPillar(newPillar)}
          >
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>

        {/* Sugestões rápidas */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-bold text-faint uppercase tracking-wider">
            Sugestões rápidas para adicionar:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_PILLARS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => addPillar(sug)}
                className="rounded-lg border border-line/60 bg-surface px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-accent hover:text-ink"
              >
                + {sug}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Horários preferidos */}
      <div className="rounded-2xl glass p-5 shadow-soft space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink">
          <Clock className="h-3.5 w-3.5 text-accent" /> Horários de Agendamento Preferidos (Opcional)
        </label>
        <input
          value={times}
          onChange={(e) => setTimes(e.target.value)}
          placeholder="Ex: 09:00, 18:00"
          className={field}
        />
        <p className="text-[11px] text-faint">
          Se preenchido, os rascunhos criados virão sugerindo estes horários de publicação.
        </p>
      </div>

      {/* Status da última execução */}
      {plan?.last_run_at && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <CalendarClock className="h-4 w-4 text-accent" /> Última geração automática realizada em:{' '}
          <strong className="text-ink">{new Date(plan.last_run_at).toLocaleString('pt-BR')}</strong>
        </p>
      )}

      {/* Mensagem de sucesso ou erro */}
      {msg && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3.5 text-xs font-bold ${
            msg.type === 'ok'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger'
          }`}
        >
          {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <Button onClick={save} disabled={busy} className="w-full py-3 text-base font-bold shadow-soft">
        <Sparkles className="h-4 w-4 mr-1.5" />
        {busy ? 'Salvando configurações…' : 'Salvar e Ativar Piloto Automático'}
      </Button>

      {/* Card informativo sobre transparência */}
      <div className="rounded-2xl border border-line bg-surface-2/60 p-4 text-xs text-muted leading-relaxed">
        <p className="font-bold text-ink mb-1">🔍 Transparência Total de Custo & Controle</p>
        <p>
          Cada post gerado pelo Piloto registra o consumo de texto (DeepSeek) e imagem (deAPI/Render) no seu novo dashboard de <a href="/ai-costs" className="font-bold text-accent hover:underline">Custos IA</a>. Nenhum post é publicado sem que você valide na aba Aprovações.
        </p>
      </div>
    </div>
  );
}
