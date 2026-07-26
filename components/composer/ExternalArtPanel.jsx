'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink, RotateCcw, Upload } from 'lucide-react';
import { EXTERNAL_ART_MIME, GEMINI_URL, artFormatLabel, buildExternalArtPrompt } from '@/lib/composer-ai-prompt';
import styles from './VisualComposer.module.css';

// .button do Composer não é flex: sem isto o ícone descola do rótulo quando o
// botão ocupa a largura toda do painel.
const ACTION = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6
};

const FIELDS = [
  ['subject', 'Assunto da publicação', 'Do que a arte fala', true],
  ['headline', 'Texto principal', 'Frase de destaque (opcional)', false],
  ['subheadline', 'Texto secundário', 'Apoio da frase (opcional)', false],
  ['cta', 'Chamada para ação', 'Ex.: Solicite um orçamento (opcional)', false],
  ['notes', 'Instruções adicionais', 'Detalhes que a arte deve respeitar (opcional)', false]
];

// Área de transferência sem depender de contexto seguro: em http o
// navigator.clipboard não existe e o fallback mantém o botão útil.
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function ExternalArtPanel({
  value, onChange, onBack, onUpload, brandKit, brandName, format, ratio,
  busy = false, error = '', warning = '', progress = null
}) {
  const [copied, setCopied] = useState(false);
  const fields = value.fields || {};

  const generated = useMemo(
    () => buildExternalArtPrompt({ fields, format, ratio, brandKit, brandName }),
    [fields, format, ratio, brandKit, brandName]
  );
  const prompt = value.promptEdited ? value.prompt : generated;
  const ready = Boolean(String(fields.subject || '').trim());

  function patch(next) {
    onChange({ ...value, ...next });
  }

  function setField(key, text) {
    patch({ fields: { ...fields, [key]: text } });
  }

  async function copyPrompt() {
    const ok = await copyText(prompt);
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 2000);
    return ok;
  }

  async function openGemini() {
    await copyPrompt();
    // Aba nova, sem opener: o SocialHub continua vivo nesta aba.
    window.open(GEMINI_URL, '_blank', 'noopener,noreferrer');
    patch({ stage: 'return' });
  }

  return (
    <>
      <button type="button" className={`${styles.button} ${styles.outline}`} style={ACTION} onClick={onBack}>
        <ArrowLeft size={14} /> Voltar
      </button>

      <div className={styles.sectionLabel}>ARTE COM IA EXTERNA · {artFormatLabel(format, ratio).toUpperCase()}</div>
      <p style={{ fontSize: 11, color: 'var(--vc-faint)', lineHeight: 1.5, margin: '0 0 10px' }}>
        O SocialHub escreve o prompt com os dados da sua marca. Você gera a imagem no Gemini,
        baixa e envia aqui.
      </p>

      {FIELDS.map(([key, label, placeholder, required]) => (
        <div key={key} style={{ marginBottom: 9 }}>
          <label htmlFor={`ai-art-${key}`} style={{ display: 'block', fontSize: 11, fontWeight: 650, marginBottom: 4 }}>
            {label}{required ? ' *' : ''}
          </label>
          {key === 'subject' || key === 'notes' ? (
            <textarea
              id={`ai-art-${key}`}
              className={styles.textarea}
              style={{ minHeight: 58 }}
              value={fields[key] || ''}
              placeholder={placeholder}
              onChange={(event) => setField(key, event.target.value)}
            />
          ) : (
            <input
              id={`ai-art-${key}`}
              className={styles.field}
              value={fields[key] || ''}
              placeholder={placeholder}
              onChange={(event) => setField(key, event.target.value)}
            />
          )}
        </div>
      ))}

      <div className={styles.sectionLabel}>
        PROMPT
        {value.promptEdited && (
          <button
            type="button"
            style={{ float: 'right', border: 0, background: 'transparent', color: 'var(--vc-accentText)', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            onClick={() => patch({ promptEdited: false, prompt: '' })}
          >
            <RotateCcw size={11} /> Restaurar
          </button>
        )}
      </div>
      <textarea
        aria-label="Prompt para o Gemini"
        className={styles.textarea}
        style={{ minHeight: 170, fontFamily: 'ui-monospace, monospace', fontSize: 11 }}
        value={prompt}
        onChange={(event) => patch({ prompt: event.target.value, promptEdited: true })}
      />

      <div style={{ display: 'grid', gap: 7, marginTop: 10 }}>
        <button type="button" className={`${styles.button} ${styles.outline}`} style={ACTION} disabled={!ready} onClick={copyPrompt}>
          {copied ? <><Check size={14} /> Prompt copiado</> : <><Copy size={14} /> Copiar prompt</>}
        </button>
        <button type="button" className={`${styles.button} ${styles.primary}`} style={ACTION} disabled={!ready} onClick={openGemini}>
          <ExternalLink size={14} /> {value.stage === 'return' ? 'Abrir Gemini novamente' : 'Abrir Gemini'}
        </button>
      </div>
      {!ready && (
        <p style={{ fontSize: 10.5, color: 'var(--vc-faint)', marginTop: 7 }}>
          Preencha o assunto da publicação para liberar o prompt.
        </p>
      )}

      {value.stage === 'return' && (
        <>
          <div className={styles.sectionLabel}>ARTE GERADA</div>
          <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: '0 0 9px' }}>
            Gere a imagem no Gemini, faça o download e volte aqui.
          </p>
          <label role="button" tabIndex={0} className={`${styles.button} ${styles.soft}`} style={{ ...ACTION, position: 'relative', overflow: 'hidden' }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.currentTarget.querySelector('input')?.click();
              }
            }}
          >
            <Upload size={14} /> {busy ? 'Enviando…' : 'Enviar imagem gerada'}
            <input
              type="file"
              accept={EXTERNAL_ART_MIME.join(',')}
              disabled={busy}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) onUpload(file);
              }}
            />
          </label>
          <p style={{ fontSize: 10.5, color: 'var(--vc-faint)', marginTop: 6 }}>
            PNG, JPG, JPEG ou WEBP · até 15 MB
          </p>
          {value.mediaName && (
            <p style={{ fontSize: 11, marginTop: 8, color: 'var(--vc-sub)' }}>
              Última arte enviada: <strong>{value.mediaName}</strong>
            </p>
          )}
        </>
      )}

      {progress != null && <div className={styles.progress}><span style={{ width: `${progress}%` }} /></div>}
      {warning && (
        <div className={styles.error} style={{ color: 'var(--vc-text)', background: 'var(--vc-hover)' }}>{warning}</div>
      )}
      {error && <div className={styles.error}>{error}</div>}
    </>
  );
}
