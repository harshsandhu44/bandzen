import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * The link preview for every page on this site.
 *
 * Brand-level rather than per-page, the same choice `apps/web` makes and for
 * the same reason: a root `opengraph-image` is inherited by every route beneath
 * it, so anything specific to one page would be wrong on the other twenty-five.
 *
 * Same void ground, wordmark and band ruler as the marketing site's, so a link
 * to the docs and a link to the product read as one product. Only the line in
 * the middle differs — this is documentation, and it should say so.
 *
 * Fonts are committed, subset ASCII-only copies (11KB the pair), the same ones
 * apps/web carries. next/font's downloads land in .next under hashed names and
 * satori cannot read woff2, so neither is reachable from here.
 */

export const alt = 'Bandzen documentation';
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
      {/* Wordmark, with the tick under "band" exactly as the component does
          it: 0.32em in, 1.62em wide. The mono tag matches `Wordmark tag`. */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ display: 'flex', position: 'relative' }}>
          <div
            style={{
              fontSize: WORDMARK_SIZE,
              letterSpacing: '-0.045em',
              color: PAPER,
              lineHeight: 1,
            }}
          >
            bandzen
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
            fontFamily: 'IBM Plex Mono',
            fontSize: 18,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
            paddingTop: 8,
          }}
        >
          Docs
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: 104,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: PAPER,
        }}
      >
        How Bandzen works.
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
