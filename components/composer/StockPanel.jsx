'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { PHOTO_GROUPS, directionCount, impliesPerson } from '@/lib/photo-direction';
import { searchStockPhotos } from '@/lib/stock-actions';
import styles from './VisualComposer.module.css';

// Orientação sugerida pelo formato da peça: procurar retrato para um story e
// paisagem para um post quadrado devolve foto que vai ser cortada de qualquer
// jeito. Continua trocável — é sugestão, não trava.
const ORIENTATION_BY_FORMAT = { post: 'square', carrossel: 'square', story: 'portrait', reel: 'portrait' };

const ORIENTATIONS = [
  ['', 'Qualquer'],
  ['square', 'Quadrada'],
  ['portrait', 'Vertical'],
  ['landscape', 'Horizontal']
];

const PERSONS = [['', 'Tanto faz'], ['com', 'Com pessoa'], ['sem', 'Sem pessoa']];

/**
 * Banco de imagens no Composer (PRD 02 §2/§3/§4).
 *
 * O que a tela promete e o que não promete: orientação é filtro real da API;
 * "com/sem pessoa" e a direção de foto entram como termos na busca, então
 * inclinam o resultado sem garantir. O texto embaixo do filtro diz isso.
 */
export function StockPanel({ format, subject: subjectInicial = '', onPick }) {
  const [subject, setSubject] = useState(subjectInicial);
  const [orientation, setOrientation] = useState(ORIENTATION_BY_FORMAT[format] || '');
  const [person, setPerson] = useState('');
  const [direction, setDirection] = useState({});
  const [openFilters, setOpenFilters] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const escolhas = directionCount(direction);

  async function buscar(event) {
    event?.preventDefault();
    if (!subject.trim()) {
      setStatus({ state: 'error', message: 'Escreva o que você procura.' });
      return;
    }
    setStatus({ state: 'loading', message: '' });
    const result = await searchStockPhotos({
      subject,
      direction,
      orientation,
      // Direção que fala de pessoa já implica gente na foto.
      person: person || (impliesPerson(direction) ? 'com' : '')
    });
    if (result?.error) {
      setPhotos([]);
      setStatus({ state: 'error', message: result.error });
      return;
    }
    setPhotos(result.photos || []);
    setStatus({
      state: 'done',
      message: result.photos?.length ? '' : 'Nada encontrado. Tente palavras mais simples.'
    });
  }

  function alternar(groupId, optionId) {
    setDirection((atual) => ({ ...atual, [groupId]: atual[groupId] === optionId ? '' : optionId }));
  }

  return (
    <>
      <div className={styles.sectionLabel}>BANCO DE IMAGENS</div>
      <form onSubmit={buscar}>
        <input
          className={styles.field}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex.: padaria artesanal, advogada, escritório"
          aria-label="O que você procura"
        />

        <div className={styles.chipGrid}>
          {ORIENTATIONS.map(([id, label]) => (
            <button key={id || 'any'} type="button"
              className={orientation === id ? styles.chipActive : styles.chip2}
              onClick={() => setOrientation(id)}
            >{label}</button>
          ))}
        </div>
        <div className={styles.chipGrid}>
          {PERSONS.map(([id, label]) => (
            <button key={id || 'any'} type="button"
              className={person === id ? styles.chipActive : styles.chip2}
              onClick={() => setPerson(id)}
            >{label}</button>
          ))}
        </div>

        <button type="button" className={styles.linkButton} onClick={() => setOpenFilters((v) => !v)}>
          <SlidersHorizontal size={13} /> Direção da foto{escolhas ? ` (${escolhas})` : ''}
        </button>

        {openFilters && PHOTO_GROUPS.map((group) => (
          <div key={group.id}>
            <div className={styles.sectionLabel}>{group.label.toUpperCase()}</div>
            <div className={styles.chipGrid}>
              {group.options.map((option) => (
                <button key={option.id} type="button"
                  className={direction[group.id] === option.id ? styles.chipActive : styles.chip2}
                  onClick={() => alternar(group.id, option.id)}
                >{option.label}</button>
              ))}
            </div>
          </div>
        ))}

        <button type="submit" className={`${styles.button} ${styles.primary}`} style={{ marginTop: 10, width: '100%' }} disabled={status.state === 'loading'}>
          <Search size={14} /> {status.state === 'loading' ? 'Buscando…' : 'Buscar fotos'}
        </button>
      </form>

      {/* Honestidade do filtro: orientação a API respeita; o resto inclina. */}
      <p className={styles.fieldHint}>
        A orientação é filtro do acervo. Pessoa e direção da foto entram como
        termos de busca — melhoram o resultado, não garantem.
      </p>

      {status.state === 'error' && <div className={styles.error}>{status.message}</div>}
      {status.state === 'done' && status.message && <p className={styles.fieldHint}>{status.message}</p>}

      {photos.length > 0 && (
        <>
          <div className={styles.sectionLabel}>{photos.length} RESULTADOS</div>
          <div className={styles.stockGrid}>
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className={styles.stockThumb}
                style={{ backgroundImage: `url(${photo.thumb})`, backgroundColor: photo.avgColor || '#222' }}
                title={`${photo.alt || 'Foto'} — ${photo.photographer}`}
                onClick={() => onPick(photo)}
              ><span>{photo.photographer}</span></button>
            ))}
          </div>
          <p className={styles.fieldHint}>
            Fotos do Pexels: uso comercial permitido, crédito não obrigatório.
            A origem e o autor ficam gravados na peça.
          </p>
        </>
      )}
    </>
  );
}
