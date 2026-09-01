import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * The home-screen icon. iOS ignores SVG favicons and falls back to a
 * screenshot of the page without this, so it has to be a PNG — which is the
 * only reason this is generated rather than another flat file.
 *
 * It renders `icon.svg` verbatim so the two marks cannot drift. The tile is
 * already opaque and square-cornered, which is what iOS wants: it applies its
 * own mask, and any transparency here would come back as black.
 */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  const svg = await readFile(join(process.cwd(), 'src/app/icon.svg'), 'utf8');
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  return new ImageResponse(
    <img
      src={src}
      width={size.width}
      height={size.height}
      alt=""
      style={{ display: 'flex' }}
    />,
    size,
  );
}
