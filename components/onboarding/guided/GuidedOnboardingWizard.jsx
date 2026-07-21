'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ArrowLeft, Instagram, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { saveOnboardingProgress, completeOnboarding } from '@/lib/onboarding-actions';
import { analyzeBrandDNA, approveDnaVersion } from '@/lib/dna-actions';
import { generateWeekPlan } from '@/lib/planning-actions';
import { classifyInstagramData, derivePalettePriority } from '@/lib/onboarding-helpers';
import { GUIDED_STEPS, OBJECTIVES, FREQUENCIES, CLASSIFICATION_BADGES } from './guided-options';

const fieldClass = 'w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15';

export function GuidedOnboardingWizard({ brandId, brandName, kit = {}, connectedPlatforms = {} }) {
  const router = useRouter();
  const draft = kit.onboarding_answers || {};
  const resuming = kit.onboarding_status === 'in_progress' && Number(kit.onboarding_step) > 0;

  const [step, setStep] = useState(resuming ? Math.min(Number(kit.onboarding_step), 6) : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Campos de dados
  const [isNewAccountFallback, setIsNewAccountFallback] = useState(Boolean(draft.isNewAccountFallback));
  const [brandNameInput, setBrandNameInput] = useState(draft.name || brandName || '');
  const [segmentInput, setSegmentInput] = useState(draft.segment || kit.niche || '');
  const [serviceInput, setServiceInput] = useState(draft.service || '');
  const [cityInput, setCityInput] = useState(draft.city || '');
  const [audienceInput, setAudienceInput] = useState(draft.audience || kit.audience || '');
  const [toneInput, setToneInput] = useState(draft.tone || kit.tone || 'Profissional, Amigável, Consultiva');
  const [styleInput, setStyleInput] = useState(draft.style || kit.visual_style || 'Moderno e Limpo');
  const [paletteInput, setPaletteInput] = useState(draft.palette || derivePalettePriority(kit.palette, null, null));

  // Objetivos e Frequência
  const [mainObjective, setMainObjective] = useState(draft.mainObjective || 'vender');
  const [secObjectives, setSecObjectives] = useState(draft.secObjectives || []);
  const [frequency, setFrequency] = useState(draft.frequency || '5x_semana');

  // DNA e Planejamento gerados
  const [generatedDna, setGeneratedDna] = useState(draft.generatedDna || null);
  const [dnaProposalId, setDnaProposalId] = useState(draft.dnaProposalId || null);
  const [planSummary, setPlanSummary] = useState(null);

  const igConnected = Boolean(connectedPlatforms?.instagram?.is_active);
  const pct = Math.round(((step + 1) / 7) * 100);

  function getDraftAnswers() {
    return {
      name: brandNameInput,
      segment: segmentInput,
      service: serviceInput,
      city: cityInput,
      audience: audienceInput,
      tone: toneInput,
      style: styleInput,
      palette: paletteInput,
      mainObjective,
      secObjectives,
      frequency,
      isNewAccountFallback,
      generatedDna,
      dnaProposalId
    };
  }

  function go(nextStep) {
    setError(null);
    setStep(nextStep);
    saveOnboardingProgress({ brandId, step: nextStep, answers: getDraftAnswers() }).catch(() => {});
  }

  function toggleSecObjective(val) {
    if (val === mainObjective) return;
    if (secObjectives.includes(val)) {
      setSecObjectives(secObjectives.filter((x) => x !== val));
    } else if (secObjectives.length < 2) {
      setSecObjectives([...secObjectives, val]);
    }
  }

  async function runStep3Analysis() {
    setError(null);
    const profileData = connectedPlatforms?.instagram?.platform_data || {};
    const classified = classifyInstagramData(profileData, [], getDraftAnswers());
    if (!brandNameInput) setBrandNameInput(classified.name);
    if (!segmentInput) setSegmentInput(classified.segment);
    if (!audienceInput) setAudienceInput(classified.audience);
    if (!toneInput) setToneInput(classified.tone);
    if (!styleInput) setStyleInput(classified.style);
    go(2);
  }

  async function generateAndPreviewDna() {
    setBusy(true);
    setError(null);
    try {
      const allObjectives = [mainObjective, ...secObjectives].join(', ');
      const manual = {
        niche: segmentInput,
        audience: audienceInput,
        objetivo: allObjectives,
        tone: toneInput,
        visual_style: styleInput
      };
      const res = await analyzeBrandDNA({
        brandId,
        brandName: brandNameInput,
        wantIg: igConnected,
        manual
      });
      setBusy(false);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setGeneratedDna(res.dna);
      if (res.version?.id) setDnaProposalId(res.version.id);
      const updatedAnswers = { ...getDraftAnswers(), generatedDna: res.dna, dnaProposalId: res.version?.id || null };
      saveOnboardingProgress({ brandId, step: 5, answers: updatedAnswers }).catch(() => {});
      setStep(5);
    } catch (e) {
      setBusy(false);
      setError('Erro ao gerar o Brand DNA. Tente novamente.');
    }
  }

  async function confirmDnaAndGeneratePlan() {
    setBusy(true);
    setError(null);
    try {
      if (dnaProposalId) {
        const appRes = await approveDnaVersion({ brandId, versionId: dnaProposalId });
        if (appRes?.error) {
          setError(appRes.error);
          setBusy(false);
          return;
        }
      }
      const planRes = await generateWeekPlan({ brandId });
      setBusy(false);
      if (planRes?.error) {
        setError(`Brand DNA aprovado, mas aviso no planejamento: ${planRes.error}`);
        setPlanSummary({ ok: true, note: 'DNA ativado! O plano poderá ser gerado a qualquer momento em Planejamento.' });
      } else {
        setPlanSummary({ ok: true, count: planRes.count || 5 });
      }
      await completeOnboarding({ brandId }).catch(() => {});
      setStep(6);
    } catch (e) {
      setBusy(false);
      setError('Erro ao finalizar. Tente novamente.');
    }
  }

  const stepInfo = GUIDED_STEPS[step] || GUIDED_STEPS[0];

  return (
    <div className="mx-auto max-w-2xl py-6 space-y-6">
      {/* Barra de Progresso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-accent">{stepInfo.title} — Passo {step + 1} de 7</span>
          <span className="text-faint">{pct}%</span>
        </div>
        <div className="flex gap-1">
          {GUIDED_STEPS.map((s, i) => (
            <div key={s.step} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      {/* Hero */}
      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">{stepInfo.title}</h1>
        <p className="text-sm text-muted">{stepInfo.subtitle}</p>
      </div>

      {/* Cartão de Conteúdo Principal */}
      <div className="rounded-3xl glass p-6 shadow-soft space-y-6">
        {step === 0 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-surface-2 p-5 space-y-3">
              <h3 className="font-bold text-ink">O que faremos agora:</h3>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Conectamos seu Instagram para leitura automática de bio, tom e visual</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Você confirma apenas o nome da marca e o segmento principal</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> A IA gera o Brand DNA e as 5 primeiras ideias de post da semana</li>
              </ul>
            </div>
            <p className="text-xs text-faint">Sem perguntas técnicas complexas. Você poderá personalizar paleta manual, fontes ou logo depois, no Brand Kit avançado.</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            {igConnected ? (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Instagram className="h-6 w-6 text-success" />
                  <div>
                    <p className="text-sm font-bold text-ink">Instagram Conectado</p>
                    <p className="text-xs text-muted">@{connectedPlatforms?.instagram?.platform_username || 'conta_ativa'}</p>
                  </div>
                </div>
                <span className="rounded-full bg-success px-3 py-1 text-xs font-bold text-white">Pronto</span>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  type="button"
                  className="w-full justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-95"
                  onClick={() => router.push(`/connections?return_to=/onboarding`)}
                >
                  <Instagram className="h-5 w-5" /> Conectar conta do Instagram
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsNewAccountFallback(!isNewAccountFallback)}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    {isNewAccountFallback ? 'Esconder preenchimento manual' : 'Conta nova ou sem Instagram? Preencher básico manualmente'}
                  </button>
                </div>
              </div>
            )}

            {isNewAccountFallback && (
              <div className="rounded-2xl border border-line bg-surface-2 p-5 space-y-4">
                <p className="text-xs font-bold text-ink">Preenchimento Básico (Contas Novas ou Sem Instagram)</p>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Nome da Marca *</label>
                  <input value={brandNameInput} onChange={(e) => setBrandNameInput(e.target.value)} placeholder="Ex: Clínica Sorrir" className={fieldClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Segmento *</label>
                  <input value={segmentInput} onChange={(e) => setSegmentInput(e.target.value)} placeholder="Ex: Odontologia e Estética" className={fieldClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Serviço Principal</label>
                    <input value={serviceInput} onChange={(e) => setServiceInput(e.target.value)} placeholder="Ex: Clareamento e Implantes" className={fieldClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Cidade</label>
                    <input value={cityInput} onChange={(e) => setCityInput(e.target.value)} placeholder="Ex: São Paulo - SP" className={fieldClass} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>Revise os dados detectados pela IA:</span>
              <span className="rounded-md bg-accent/10 px-2 py-0.5 text-accent">Edite apenas se necessário</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-ink">Nome da Marca *</label>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${CLASSIFICATION_BADGES.CONFIRMED.className}`}>
                    {CLASSIFICATION_BADGES.CONFIRMED.label}
                  </span>
                </div>
                <input value={brandNameInput} onChange={(e) => setBrandNameInput(e.target.value)} className={fieldClass} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-ink">Segmento / Mercado *</label>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${CLASSIFICATION_BADGES.INFERRED.className}`}>
                    {CLASSIFICATION_BADGES.INFERRED.label}
                  </span>
                </div>
                <input value={segmentInput} onChange={(e) => setSegmentInput(e.target.value)} className={fieldClass} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-ink">Público-alvo sugerido</label>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${CLASSIFICATION_BADGES.INFERRED.className}`}>
                    {CLASSIFICATION_BADGES.INFERRED.label}
                  </span>
                </div>
                <input value={audienceInput} onChange={(e) => setAudienceInput(e.target.value)} className={fieldClass} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-ink">Tom de voz sugerido</label>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${CLASSIFICATION_BADGES.INFERRED.className}`}>
                    {CLASSIFICATION_BADGES.INFERRED.label}
                  </span>
                </div>
                <input value={toneInput} onChange={(e) => setToneInput(e.target.value)} className={fieldClass} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-ink mb-2">Selecione 1 Objetivo Principal:</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {OBJECTIVES.map((o) => {
                  const on = mainObjective === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setMainObjective(o.value)}
                      className={`rounded-xl border p-3.5 text-left transition-colors ${on ? 'border-accent bg-accent/10 ring-2 ring-accent/20' : 'border-line bg-surface-2 hover:border-accent/50'}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-bold text-ink">
                        {on && <Check className="h-4 w-4 text-accent" />} {o.label}
                      </span>
                      <span className="mt-1 block text-xs text-muted">{o.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-line">
              <p className="text-sm font-bold text-ink mb-1">Objetivos Secundários (Até 2 opcionais):</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {OBJECTIVES.filter((o) => o.value !== mainObjective).map((o) => {
                  const on = secObjectives.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleSecObjective(o.value)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${on ? 'border-accent bg-accent text-white' : 'border-line bg-surface-2 text-ink hover:border-accent/40'}`}
                    >
                      {on && <Check className="mr-1 inline h-3 w-3" />} {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-ink">Com que frequência deseja publicar por semana?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FREQUENCIES.map((f) => {
                const on = frequency === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFrequency(f.value)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${on ? 'border-accent bg-accent/10 ring-2 ring-accent/20' : 'border-line bg-surface-2 hover:border-accent/50'}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-ink">
                      {on && <Check className="h-4 w-4 text-accent" />} {f.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted">{f.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            {generatedDna ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-accent">
                    <Sparkles className="h-4 w-4" /> Brand DNA Gerado pela IA
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="font-bold text-muted">Tom de Voz:</dt>
                      <dd className="text-ink font-semibold mt-0.5">{generatedDna.tone || toneInput}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-muted">Público-alvo:</dt>
                      <dd className="text-ink font-semibold mt-0.5">{generatedDna.audience || audienceInput}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-bold text-muted">Pilares de Conteúdo Recomendados:</dt>
                      <dd className="text-ink font-semibold mt-0.5">
                        {Array.isArray(generatedDna.pillars) ? generatedDna.pillars.join(', ') : 'Dicas de valor, Bastidores e dia a dia, Prova social e resultados'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <p className="text-xs text-muted">Confirme para salvar este Brand DNA como a identidade ativa da sua marca e gerar o primeiro planejamento.</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="mx-auto h-8 w-8 animate-pulse text-accent" />
                <p className="mt-3 text-sm font-bold text-ink">A IA está pronta para sintetizar o Brand DNA</p>
                <p className="text-xs text-muted mt-1">Com base nos seus dados e escolhas de objetivo e frequência.</p>
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5 text-center py-6">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/20 text-success">
              <Check className="h-7 w-7" strokeWidth={3} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-ink">Tudo configurado com sucesso!</h3>
              <p className="text-sm text-muted">
                {planSummary?.note || `Seu Brand DNA está ativo e geramos ${planSummary?.count || 5} ideias iniciais no planejamento da semana.`}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface-2 p-4 text-xs text-muted text-left space-y-1">
              <p className="font-bold text-ink">O que acontece agora:</p>
              <p>• As ideias geradas estão na aba de Planejamento como sugestões (`status: idea`).</p>
              <p>• Você pode aprovar ou editar cada post no Calendário de Aprovações.</p>
              <p>• O Dashboard principal agora está totalmente liberado!</p>
            </div>
          </div>
        )}

        {/* Mensagem de Erro */}
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3.5 flex items-center justify-between text-xs text-danger font-semibold">
            <span className="flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> {error}</span>
            <button type="button" onClick={() => setError(null)} className="underline hover:opacity-80">Fechar</button>
          </div>
        )}

        {/* Botões de Navegação */}
        <div className="flex items-center justify-between pt-4 border-t border-line">
          {step > 0 && step < 6 ? (
            <Button type="button" variant="ghost" onClick={() => go(step - 1)} disabled={busy}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          ) : <div />}

          {step === 0 && (
            <Button type="button" onClick={() => go(1)} className="ml-auto">
              Começar configuração automática <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 1 && (
            <Button
              type="button"
              onClick={runStep3Analysis}
              disabled={(!igConnected && !isNewAccountFallback) || (isNewAccountFallback && (!brandNameInput.trim() || !segmentInput.trim()))}
              className="ml-auto"
            >
              Avançar para Análise <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 2 && (
            <Button type="button" onClick={() => go(3)} disabled={!brandNameInput.trim() || !segmentInput.trim()} className="ml-auto">
              Confirmar dados <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 3 && (
            <Button type="button" onClick={() => go(4)} className="ml-auto">
              Continuar com Objetivo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 4 && (
            <Button type="button" onClick={generateAndPreviewDna} disabled={busy} className="ml-auto">
              <Sparkles className="h-4 w-4 mr-1" /> {busy ? 'Sintetizando DNA...' : 'Gerar Brand DNA'}
            </Button>
          )}

          {step === 5 && generatedDna && (
            <Button type="button" onClick={confirmDnaAndGeneratePlan} disabled={busy} className="ml-auto">
              {busy ? 'Gerando ideias de posts...' : 'Aprovar Brand DNA e Planejar'} <Check className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 6 && (
            <Button type="button" onClick={() => router.push('/dashboard')} className="w-full justify-center">
              Ir para o Dashboard <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
