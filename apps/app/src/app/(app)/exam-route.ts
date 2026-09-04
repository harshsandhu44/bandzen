/**
 * An exam runner path: a module plus one attempt id, and nothing after it
 * (so `/reading/abc/review` is not one). The runner is a full-bleed
 * `-m-6 sm:-m-10` surface with its own chrome — the top bar and the mobile
 * tab bar both step aside for it.
 */
export const EXAM_RUNNER = /^\/(reading|writing|listening|speaking)\/[^/]+$/;
