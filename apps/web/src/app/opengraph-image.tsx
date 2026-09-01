import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

import { brand } from '@/content/sections';

/**
 * The link preview for every page on this site.
 *
 * Deliberately brand-level rather than page-level: a root opengraph-image is
 * inherited by /pricing, /terms and /refunds alike, so anything that reads as
 * a landing-page promise would be wrong on the refund policy. The tagline is
 * read from `content/sections.ts` for the same reason the rest of the copy
 * lives there — the words have to be editable without touching layout.
 *
 * The bottom edge is the favicon's device at another scale: the 0–9 band
 * ruler, with the chrome tick under the 9.
 *
 * Fonts are committed, subset ASCII-only copies (11KB the pair). next/font's
 * downloads land in .next under hashed names and satori cannot read woff2, so
 * neither is reachable from here.
 */

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const VOID = '#09090f';
const PAPER = '#ffffff';
const CHROME = '#ffc13b';
const BANDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const WORDMARK_SIZE = 46;

const asset = (file: string) =>
  readFile(join(process.cwd(), 'src/assets', file));

export default async function OpengraphImage() {
  const [archivo, mono] = await Promise.all([
    asset('Archivo-SemiBold-subset.ttf'),
    asset('IBMPlexMono-Medium-subset.ttf'),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: VOID,
        padding: 76,
        fontFamily: 'Archivo',
      }}
    >
      {/* Wordmark, with the tick sitting under "band" exactly as the
            component does it: 0.32em in, 1.62em wide. */}
      <div style={{ display: 'flex', position: 'relative' }}>
        <div
          style={{
            fontSize: WORDMARK_SIZE,
            letterSpacing: '-0.045em',
            color: PAPER,
            lineHeight: 1,
          }}
        >
          {brand.name.toLowerCase()}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0.32 * WORDMARK_SIZE,
            top: WORDMARK_SIZE + 8,
            width: 1.62 * WORDMARK_SIZE,
            height: 4,
            background: CHROME,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: 128,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: PAPER,
        }}
      >
        {brand.tagline}
      </div>

      {/* The band ruler. Each numeral sits in an equal cell above its own
            segment, so the 9 and the chrome tick line up exactly. */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div style={{ display: 'flex', width: '100%' }}>
          {BANDS.map((band) => (
            <div
              key={band}
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                fontFamily: 'IBM Plex Mono',
                fontSize: 26,
                color: band === 9 ? PAPER : 'rgba(255,255,255,0.34)',
              }}
            >
              {band}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', width: '100%', marginTop: 16 }}>
          {BANDS.map((band) => (
            <div
              key={band}
              style={{
                flex: 1,
                height: 6,
                marginRight: band === 9 ? 0 : 5,
                background: band === 9 ? CHROME : 'rgba(255,255,255,0.13)',
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Archivo', data: archivo, weight: 600, style: 'normal' },
        { name: 'IBM Plex Mono', data: mono, weight: 500, style: 'normal' },
      ],
    },
  );
}
