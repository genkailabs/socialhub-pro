// Linha do tempo do Reel (PRD Reels §3): régua de tempo, corte e faixas de
// vídeo, áudio e elementos. Não guarda tempo próprio — quem manda é o relógio
// do vídeo no canvas, para prévia e timeline nunca divergirem.
import { Pause, Play } from 'lucide-react';
import { clampTrim, formatTimecode, reelClipDuration } from '@/lib/composer-reel';
import { ELEMENT_ICON_MAP } from '@/data/element-icons';
import styles from './VisualComposer.module.css';

const LAYER_LABELS = { arrow: 'Seta', line: 'Linha', shape: 'Forma', icon: 'Ícone', sticker: 'Figurinha' };

function layerLabel(layer) {
  return layer.text || ELEMENT_ICON_MAP[layer.icon]?.label || LAYER_LABELS[layer.type] || 'Elemento';
}

export function ReelTimeline({ duration, current, playing, video, audio, layers = [], onSeek, onTrim, onTogglePlay }) {
  if (!duration) {
    return <div className={styles.timeline}><p className={styles.timelineEmpty}>Adicione um vídeo para ver a linha do tempo.</p></div>;
  }
  const trim = clampTrim(video || {}, duration);
  const clip = reelClipDuration(video || {}, duration);
  const percent = (value) => `${(value / duration) * 100}%`;
  const audioName = audio?.url
    ? `Faixa de áudio ${audio.name || 'própria'}`
    : `Faixa de áudio original${video?.muted ? ' (silenciado)' : ''}`;

  return <div className={styles.timeline}>
    <div className={styles.timelineHead}>
      <button type="button" className={styles.iconButton} aria-label={playing ? 'Pausar' : 'Reproduzir'} onClick={onTogglePlay}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <span className={styles.timelineClock}>{formatTimecode(current)}</span>
      <input
        type="range"
        min="0"
        max={duration}
        step="0.1"
        value={Math.min(current, duration)}
        aria-label="Posição na linha do tempo"
        onChange={(event) => onSeek(Number(event.target.value))}
      />
      <span className={styles.timelineClock}>Trecho {formatTimecode(clip)}</span>
    </div>

    <ul className={styles.timelineTracks}>
      <li className={styles.timelineTrack} aria-label="Faixa de vídeo">
        <span className={styles.timelineTrackName}>Vídeo</span>
        <span className={styles.timelineBar}>
          <span className={styles.timelineClip} style={{ left: percent(trim.start), width: percent(trim.end - trim.start) }} />
          <span className={styles.timelinePlayhead} style={{ left: percent(Math.min(current, duration)) }} />
        </span>
      </li>
      <li className={styles.timelineTrack} aria-label={audioName}>
        <span className={styles.timelineTrackName}>Áudio</span>
        <span className={`${styles.timelineBar} ${video?.muted && !audio?.url ? styles.timelineMuted : ''}`}>
          <span className={styles.timelineClip} style={{ left: percent(trim.start), width: percent(trim.end - trim.start) }} />
        </span>
      </li>
      {layers.map((layer) => <li key={layer.id} className={styles.timelineTrack} aria-label={`Faixa do elemento ${layerLabel(layer)}`}>
        <span className={styles.timelineTrackName}>{layerLabel(layer)}</span>
        <span className={styles.timelineBar}>
          <span className={styles.timelineClip} style={{ left: percent(trim.start), width: percent(trim.end - trim.start) }} />
        </span>
      </li>)}
    </ul>

    <div className={styles.timelineTrim}>
      <label>Início
        <input type="range" min="0" max={duration} step="0.1" value={trim.start} aria-label="Início do corte"
          onChange={(event) => onTrim(clampTrim({ start: Number(event.target.value), end: trim.end }, duration))} />
        <em>{formatTimecode(trim.start)}</em>
      </label>
      <label>Fim
        <input type="range" min="0" max={duration} step="0.1" value={trim.end} aria-label="Fim do corte"
          onChange={(event) => onTrim(clampTrim({ start: trim.start, end: Number(event.target.value) }, duration))} />
        <em>{formatTimecode(trim.end)}</em>
      </label>
    </div>
  </div>;
}
