import { toast } from '@bandzen/ui/components/sonner';

import type { ActionResult } from '@/lib/action-result';

/**
 * The one place the CMS says "that worked" or "that failed". Every server
 * action returns an ActionResult (see ./action-result.ts); `toastResult` turns
 * one into a toast. The Toaster itself is the shared one apps/app mounts,
 * wired once in (cms)/layout.tsx.
 */
export { Toaster, toast } from '@bandzen/ui/components/sonner';

/** Turn an ActionResult into a toast. No-op on a silent success. */
export function toastResult(result: ActionResult) {
  if (result.ok) {
    if (result.message) toast.success(result.message);
  } else {
    toast.error(result.message);
  }
}
