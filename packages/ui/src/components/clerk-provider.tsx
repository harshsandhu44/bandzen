'use client';

import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

/**
 * ClerkProvider with the app's theme applied to Clerk's own UI.
 *
 * Clerk renders sign-in, sign-up and the user button from its own stylesheet,
 * which knows nothing about `.dark`. Left bare it ships a light card on every
 * surface, so a user who picks Dark gets a white box on a dark page.
 *
 * Two consequences worth knowing before moving this:
 *
 * 1. It must sit INSIDE `ThemeProvider` — `useTheme` is what drives it. That
 *    is why the apps nest `ThemeProvider > ClerkThemeProvider` inside `<body>`
 *    rather than wrapping `<html>` with Clerk the way its docs suggest.
 * 2. The key is `theme`, not `baseTheme` — the latter is deprecated in
 *    @clerk/types and typechecks only on older versions.
 * 3. `colorPrimary` is handed `var(--primary)`, not a literal, so the CMS gets
 *    its plum and both apps get their lifted dark ramp without a second copy
 *    of a token that could drift from globals.css.
 *
 * `resolvedTheme` is undefined on the server, so the card renders light for
 * one paint before a dark user's theme lands. That is the same trade every
 * class-attribute theme makes, and Clerk's card is never above the fold on a
 * cold load.
 */
export function ClerkThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <ClerkProvider
      appearance={{
        theme: resolvedTheme === 'dark' ? dark : undefined,
        variables: { colorPrimary: 'var(--primary)' },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
