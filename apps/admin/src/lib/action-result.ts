/**
 * What a mutating server action hands back so the client can say whether it
 * worked. `ok: true` with no message is a silent success (the revalidated
 * RSC is feedback enough); a message becomes a toast. See ../components/toast.
 */
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export const ok = (message?: string): ActionResult => ({ ok: true, message });
export const fail = (message: string): ActionResult => ({ ok: false, message });
