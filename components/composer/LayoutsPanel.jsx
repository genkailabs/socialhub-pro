'use client';

import { useEffect, useState } from 'react';
import { LayoutTemplate, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { STRUCTURES } from '@/lib/layouts/structures';
import { VISUAL_STYLES } from '@/lib/layouts/styles';
import { applyLayoutTemplate } from '@/lib/layouts/templates';
import {
  buildLayoutForContent, generateLayoutFromBrief, getLayoutTemplates,
  saveLayoutTemplate, deleteLayoutTemplate
} from '@/lib/layout-actions';
import styles from './VisualComposer.module.css';

const EMPTY_FIELDS = { title: '', subtitle: '', bullets: '', cta: '' };

// A legenda costuma ser o único texto que já existe quando o usuário abre o
// painel. A primeira linha vira título e a segunda, apoio — é a leitura que
// qualquer pessoa faria, e continua totalmente editável nos campos.
function fieldsFromCaption(caption = '') {
  const lines = String(caption || '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  return { title: lines[0].slice(0, 90), subtitle: (lines[1] || '').slice(0, 160), bullets: '', cta: '' };
}

export function LayoutsPanel({
  brandId, brandName, format, ratio, canvas, surface, caption,
  onApplySurfaces, onToast
}) {
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [structureId, setStructureId] = useState('');
  const [styleId, setStyleId] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [mascot, setMascot] = useState([]);
  const [issues, setIssues] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    let alive = true;
    getLayoutTemplates(brandId).then((result) => {
      if (alive) setTemplates(result?.templates || []);
    }).catch(() => {});
    return () => { alive = false; };
  }, [brandId]);

  function contentFromFields() {
    return {
      title: fields.title,
      subtitle: fields.subtitle,
      bullets: fields.bullets.split('\n').map((line) => line.trim()).filter(Boolean),
      cta: fields.cta,
      brand: brandName,
      caption
    };
  }

  function applyResult(result) {
    setMascot(result.mascot || []);
    setIssues(result.issues || []);
    onApplySurfaces(result.slides.map((slide) => slide.surface));
    onToast?.(result.slides.length > 1 ? `${result.slides.length} slides montados` : 'Arte montada no canvas');
  }

  async function montar() {
    setError('');
    if (!fields.title.trim()) { setError('Escreva ao menos um título.'); return; }
    setBusy('montar');
    try {
      const result = await buildLayoutForContent({
        brandId,
        content: contentFromFields(),
        format,
        ratio,
        media: surface?.media || null,
        structureId: structureId || null,
        styleId: styleId || null
      });
      if (result.error) setError(result.error);
      else applyResult(result);
    } catch (e) {
      setError(e.message || 'Não foi possível montar a arte.');
    } finally {
      setBusy('');
    }
  }

  async function escreverEMontar() {
    setError('');
    const topic = fields.title.trim() || String(caption || '').trim();
    if (!topic) { setError('Escreva um tema ou uma legenda para a IA partir de algum lugar.'); return; }
    setBusy('ia');
    try {
      const result = await generateLayoutFromBrief({
        brandId,
        brandName,
        brief: { topic, format },
        format,
        ratio,
        media: surface?.media || null
      });
      if (result.error) setError(result.error);
      else {
        const spec = result.spec || {};
        setFields({
          title: spec.imageTitle || spec.headline || '',
          subtitle: spec.subtext || '',
          bullets: (spec.bullets || []).join('\n'),
          cta: spec.cta || ''
        });
        applyResult(result);
      }
    } catch (e) {
      setError(e.message || 'Não foi possível gerar o conteúdo.');
    } finally {
      setBusy('');
    }
  }

  async function salvarLayout() {
    setError('');
    if (!templateName.trim()) { setError('Dê um nome para o layout.'); return; }
    setBusy('salvar');
    try {
      const result = await saveLayoutTemplate({
        brandId,
        name: templateName,
        surface,
        canvas,
        format,
        ratio,
        structureId: structureId || null,
        styleId: styleId || null
      });
      if (result.error) setError(result.error);
      else {
        setTemplates((current) => [result.template, ...current]);
        setTemplateName('');
        onToast?.('Layout salvo');
      }
    } catch (e) {
      setError(e.message || 'Não foi possível salvar o layout.');
    } finally {
      setBusy('');
    }
  }

  function aplicarLayout(template) {
    const built = applyLayoutTemplate(template.template, {
      content: contentFromFields(),
      canvas,
      media: surface?.media || null
    });
    onApplySurfaces([built]);
    setMascot([`Apliquei o layout "${template.name}" com o conteúdo atual.`]);
    setIssues([]);
  }

  async function removerLayout(template) {
    const result = await deleteLayoutTemplate({ brandId, templateId: template.id });
    if (result.error) setError(result.error);
    else setTemplates((current) => current.filter((item) => item.id !== template.id));
  }

  const caption1 = fieldsFromCaption(caption);

  return (
    <>
      <div className={styles.sectionLabel}>CONTEÚDO</div>
      <input
        className={styles.field}
        value={fields.title}
        maxLength={90}
        onChange={(e) => setFields((v) => ({ ...v, title: e.target.value }))}
        placeholder="Título da arte"
        aria-label="Título da arte"
      />
      <textarea
        className={styles.textarea}
        value={fields.subtitle}
        maxLength={160}
        onChange={(e) => setFields((v) => ({ ...v, subtitle: e.target.value }))}
        placeholder="Texto de apoio"
        aria-label="Texto de apoio"
      />
      <textarea
        className={styles.textarea}
        value={fields.bullets}
        onChange={(e) => setFields((v) => ({ ...v, bullets: e.target.value }))}
        placeholder="Um item por linha (vira lista, comparação ou carrossel)"
        aria-label="Itens"
      />
      <input
        className={styles.field}
        value={fields.cta}
        maxLength={32}
        onChange={(e) => setFields((v) => ({ ...v, cta: e.target.value }))}
        placeholder="Chamada para ação"
        aria-label="Chamada para ação"
      />
      {caption1 && <button type="button" className={styles.preset} onClick={() => setFields({ ...EMPTY_FIELDS, ...caption1 })}>
        Preencher com a legenda
      </button>}

      <div className={styles.sectionLabel}>ESTRUTURA</div>
      <select
        className={styles.field}
        value={structureId}
        aria-label="Estrutura"
        onChange={(e) => setStructureId(e.target.value)}
      >
        <option value="">A IA escolhe pelo conteúdo</option>
        {STRUCTURES.map((structure) => <option key={structure.id} value={structure.id}>{structure.label}</option>)}
      </select>

      <div className={styles.sectionLabel}>ESTILO VISUAL</div>
      <select
        className={styles.field}
        value={styleId}
        aria-label="Estilo visual"
        onChange={(e) => setStyleId(e.target.value)}
      >
        <option value="">A IA escolhe pela marca</option>
        {VISUAL_STYLES.map((style) => <option key={style.id} value={style.id}>{style.label}</option>)}
      </select>

      <button
        type="button"
        className={`${styles.button} ${styles.primary}`}
        style={{ width: '100%', marginTop: 10 }}
        onClick={montar}
        disabled={Boolean(busy)}
      >
        <LayoutTemplate size={14} /> {busy === 'montar' ? 'Montando…' : 'Montar arte'}
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.soft}`}
        style={{ width: '100%', marginTop: 7 }}
        onClick={escreverEMontar}
        disabled={Boolean(busy)}
      >
        <Wand2 size={14} /> {busy === 'ia' ? 'Escrevendo…' : 'Escrever com IA e montar'}
      </button>

      {error && <div className={styles.error} role="alert">{error}</div>}

      {mascot.length > 0 && <>
        <div className={styles.sectionLabel}>O QUE EU FIZ</div>
        {mascot.map((line) => (
          <div className={styles.check} key={line}><Sparkles size={13} />{line}</div>
        ))}
      </>}

      {issues.length > 0 && <>
        <div className={styles.sectionLabel}>AINDA PRECISA DE VOCÊ</div>
        {issues.map((issue) => (
          <div className={styles.error} key={`${issue.id}-${issue.message}`}>{issue.message} {issue.fix}</div>
        ))}
      </>}

      <div className={styles.sectionLabel}>SALVAR COMO LAYOUT</div>
      <input
        className={styles.field}
        value={templateName}
        maxLength={80}
        onChange={(e) => setTemplateName(e.target.value)}
        placeholder="Nome do layout"
        aria-label="Nome do layout"
      />
      <button
        type="button"
        className={`${styles.button} ${styles.outline}`}
        style={{ width: '100%', marginTop: 7 }}
        onClick={salvarLayout}
        disabled={Boolean(busy) || !surface?.layers?.length}
      >
        {busy === 'salvar' ? 'Salvando…' : 'Salvar peça atual como layout'}
      </button>

      {templates.length > 0 && <>
        <div className={styles.sectionLabel}>LAYOUTS DA MARCA</div>
        {templates.map((template) => (
          <div key={template.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <button type="button" className={styles.preset} style={{ flex: 1 }} onClick={() => aplicarLayout(template)}>
              {template.name}
            </button>
            <button type="button" className={styles.preset} aria-label={`Remover layout ${template.name}`} onClick={() => removerLayout(template)}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </>}
    </>
  );
}
