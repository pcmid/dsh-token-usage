/**
 * The quota HTTP route of the token-usage plugin: a webServer exact route
 * serving the current provider's quota payload at `/token-usage/quota`.
 * The browser half's input-bar button polls it (`?session=<id>`); the
 * same-origin guard mirrors the stats route's.
 *
 * @module token-usage/quota/quota-route
 */
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import { type QuotaPayload } from '../wire.ts';
/** The quota endpoint path, exported for tests and the client half. */
export { QUOTA_PATH } from '../wire.ts';
/**
 * Build the quota route over the orchestration service.
 * @param snapshot - resolves the payload for one asking session (the
 * `session` query parameter, undefined when absent) and its model chip's
 * current selection (`provider` + `model`, undefined when the browser
 * could not read them).
 * @returns the exact GET route answering the quota JSON.
 */
export declare function createQuotaRoute(snapshot: (sessionId: string | undefined, providerHint: string | undefined, modelHint: string | undefined) => Promise<QuotaPayload>): WebRoute;
//# sourceMappingURL=quota-route.d.ts.map