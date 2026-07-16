import 'server-only';
import React from 'react';
import { ImageResponse } from 'next/og';
import { titleAlignment } from '@/lib/ai/news-image';

export async function renderNewsTitleOverlay({ sourceUrl, title, position = 'bottom' }) {
  const response = await fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível abrir a imagem escolhida.');

  const contentType = response.headers.get('content-type') || 'image/png';
  const bytes = Buffer.from(await response.arrayBuffer());
  const source = `data:${contentType};base64,${bytes.toString('base64')}`;
  const justifyContent = titleAlignment(position);

  const image = new ImageResponse(
    React.createElement('div', {
      style: { width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: '#0a0a0c' }
    }, [
      React.createElement('img', {
        key: 'image', src: source,
        style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
      }),
      React.createElement('div', {
        key: 'shade',
        style: {
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 20%, rgba(0,0,0,0.8) 100%)'
        }
      }),
      React.createElement('div', {
        key: 'title',
        style: {
          position: 'relative', zIndex: 1, width: '100%', height: '100%', padding: '76px', display: 'flex',
          alignItems: justifyContent, color: 'white', fontSize: 76, fontWeight: 800, lineHeight: 1.08,
          letterSpacing: '-3px', textShadow: '0 4px 18px rgba(0,0,0,0.55)'
        }
      }, String(title).trim())
    ]),
    { width: 1080, height: 1080 }
  );

  return { bytes: Buffer.from(await image.arrayBuffer()), contentType: 'image/png' };
}
