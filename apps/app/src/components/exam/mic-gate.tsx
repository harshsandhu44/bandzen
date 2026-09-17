'use client';

import { useState } from 'react';
import { ArrowRight, Mic } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';

/**
 * The microphone check before a mock's spoken part. In a mock each spoken
 * answer starts by itself when its stimulus ends, so a microphone the browser
 * has not been allowed to use would silently cost every answer in the part.
 * The candidate grants it here, once, before the clock is anywhere near them;
 * until they do, the part cannot be entered.
 */
export function MicGate() {
  const [state, setState] = useState<
    'unchecked' | 'checking' | 'ok' | 'denied'
  >('unchecked');

  const check = async () => {
    setState('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setState('ok');
    } catch {
      setState('denied');
    }
  };

  if (state === 'ok') {
    return (
      <Button type="submit">
        Continue <ArrowRight />
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={check} disabled={state === 'checking'}>
        <Mic aria-hidden /> Check microphone
      </Button>
      {state === 'denied' ? (
        <p role="alert" className="text-sm text-destructive">
          No microphone access. Allow the microphone for this site in your
          browser, then check again. Every answer in this part is spoken.
        </p>
      ) : null}
    </div>
  );
}
