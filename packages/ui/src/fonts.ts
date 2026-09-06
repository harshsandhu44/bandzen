import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { GeistPixelCircle } from 'geist/font/pixel';

/**
 * Every app's typefaces, in one place. All four apps set the same three
 * Geist faces on <html> — Sans for body and headings, Mono for the
 * instrumentation layer, Pixel (Circle) for the 0–9 band ruler and the
 * error-page glyph. The token chains in ./styles/globals.css read these
 * `--font-geist-*` variables.
 */
export const fontClassName = `${GeistSans.variable} ${GeistMono.variable} ${GeistPixelCircle.variable}`;
