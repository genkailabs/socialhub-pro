// Painel Mídia quando o formato é Reel (PRD Reels §1, §2, §5). Só cuida de
// vídeo, áudio e capa — texto, elementos, legenda e configurações continuam
// nos painéis compartilhados.
import { Music, Trash2, Upload } from 'lucide-react';
import { formatTimecode } from '@/lib/composer-reel';
import styles from './VisualComposer.module.css';

export function ReelVideoPanel({
  duration, current, video, audio, cover,
  onVideo, onAudio, onCover, onAudioFile, onCoverFile, onFitCanvas
}) {
  return <>
    <div className={styles.sectionLabel}>ENQUADRAMENTO</div>
    <button type="button" className={styles.preset} onClick={onFitCanvas}>Ajustar enquadramento 9:16</button>
    <p className={styles.hint}>Arraste o vídeo no canvas para reposicionar e use a roda do mouse para dar zoom.</p>

    <div className={styles.sectionLabel}>ÁUDIO ORIGINAL</div>
    <div className={styles.toggle}><span>Remover áudio original</span>
      <button type="button" className={`${styles.switch} ${video.muted ? styles.switchOn : ''}`} aria-label="Remover áudio original" onClick={() => onVideo({ muted: !video.muted })}><span /></button>
    </div>
    <div className={styles.propRow}><span>Volume</span>
      <input type="range" min="0" max="1" step="0.05" value={video.volume ?? 1} aria-label="Volume do vídeo" disabled={video.muted} onChange={(event) => onVideo({ volume: Number(event.target.value) })} />
      <em>{Math.round((video.volume ?? 1) * 100)}%</em>
    </div>

    <div className={styles.sectionLabel}>ÁUDIO PRÓPRIO</div>
    {audio?.url ? <>
      <div className={styles.currentMedia}>
        <div className={styles.mediaPreview}><Music size={20} /></div>
        <div className={styles.mediaInfo}><strong>{audio.name || 'Áudio enviado'}</strong><small>Substitui o áudio original no arquivo final</small></div>
      </div>
      <div className={styles.propRow}><span>Volume</span>
        <input type="range" min="0" max="1" step="0.05" value={audio.volume ?? 1} aria-label="Volume do áudio" onChange={(event) => onAudio({ volume: Number(event.target.value) })} />
        <em>{Math.round((audio.volume ?? 1) * 100)}%</em>
      </div>
      <div className={styles.propRow}><span>Início</span>
        <input type="range" min="0" max={Math.max(1, duration)} step="0.5" value={audio.start ?? 0} aria-label="Início do áudio" onChange={(event) => onAudio({ start: Number(event.target.value) })} />
        <em>{formatTimecode(audio.start ?? 0)}</em>
      </div>
      <button type="button" className={`${styles.button} ${styles.removeMedia}`} aria-label="Remover áudio próprio" onClick={() => onAudio(null)}><Trash2 size={14} /> Remover áudio próprio</button>
    </> : <label className={styles.upload}>
      <Music size={20} /><strong>Enviar áudio</strong><small>MP3, M4A ou WAV</small>
      <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav" aria-label="Enviar áudio próprio" onChange={(event) => onAudioFile(event.target.files?.[0] || null)} />
    </label>}

    <div className={styles.sectionLabel}>CAPA</div>
    {cover.mode === 'upload' && cover.url
      ? <>
          <img className={styles.coverPreview} src={cover.url} alt="Capa personalizada do Reel" />
          <button type="button" className={styles.preset} onClick={() => onCover({ mode: 'frame' })}>Usar frame do vídeo</button>
        </>
      : <>
          <p className={styles.hint}>A capa é gravada a partir do vídeo final, com textos e elementos já aplicados. Agora em {formatTimecode(cover.timeMs / 1000)}.</p>
          <button type="button" className={styles.preset} onClick={() => onCover({ mode: 'frame', timeMs: Math.round(current * 1000) })}>Usar este frame como capa</button>
        </>}
    <label className={styles.upload}>
      <Upload size={20} /><strong>Enviar capa própria</strong><small>JPG ou PNG · 1080x1920</small>
      <input type="file" accept="image/jpeg,image/png" aria-label="Enviar capa personalizada" onChange={(event) => onCoverFile(event.target.files?.[0] || null)} />
    </label>
    <div className={styles.coverProfile}>
      <span className={styles.coverProfileThumb} style={cover.url ? { backgroundImage: `url("${cover.url}")` } : undefined} />
      <small>Prévia do recorte que aparece na grade do perfil.</small>
    </div>
  </>;
}
