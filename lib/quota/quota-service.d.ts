/**
 * Quota orchestration service (node half): resolve the current provider,
 * route it through the adapter registry, resolve credentials, and serve
 * normalized {@link QuotaPayload}s with a per-provider TTL cache and
 * in-flight dedupe so N open sessions polling never hammer a provider's
 * quota endpoint.
 *
 * Cache policy: ok results cache per provider for `cacheTtlMs` (default
 * 45s — under the client's poll cadence, so a poll usually hits memory).
 * Error results do not cache, so the panel's retry / open-to-refresh
 * actually re-queries; in-flight callers still collapse into one outbound
 * request. `no-provider` / `unsupported` resolutions are pure settings
 * reads and never cache. A provider CHANGE invalidates by key (cache is
 * keyed by route), so switching providers serves fresh at once.
 *
 * @module token-usage/quota/quota-service
 */
import type { QuotaPayload } from '../wire.ts';
import { MagpieDetector } from './adapters/magpie.ts';
import type { ProviderSighting } from './provider-tracking.ts';
import { type ResolvedQuotaCredentials } from './credentials.ts';
import type { AccountBalanceReader } from './types.ts';
/** The seams the service runs over (index.ts wires the host services in). */
export interface QuotaServiceDeps {
    /** Route key + model of the provider the asking session uses, if
     * determinable (the request tracker's latest sighting, else the default
     * selection). The model rides along for adapters that scope a whole
     * gateway's report by it (magpie). */
    resolveSighting: (sessionId: string | undefined) => ProviderSighting | undefined;
    /** Credential chain seam; see credentials.ts. */
    resolveCredentials: (provider: string) => Promise<ResolvedQuotaCredentials>;
    /** Transport (global fetch in production, a stub in tests). */
    fetchFn?: typeof fetch;
    /** The poll cadence stamped on every payload (seconds). */
    intervalSec?: number;
    /** Ok-result cache lifetime; tests shrink it. Errors never cache. */
    cacheTtlMs?: number;
    /** Clock seam; tests freeze it. */
    now?: () => number;
    /** DeepSeek account wallets. Absent readers make that route `signed-out`. */
    readAccountBalance?: AccountBalanceReader;
    /** The magpie-gateway probe consulted when no registry adapter matches
     * a route; tests stub it. Defaults to a plain detector instance. */
    magpieDetector?: MagpieDetector;
}
/** The quota orchestration service. */
export declare class QuotaService {
    #private;
    constructor(deps: QuotaServiceDeps);
    /** The poll cadence every payload carries. */
    get intervalSec(): number;
    /**
     * The payload for one asking session: hidden variants short-circuit
     * without any network; a supported provider serves its cached window
     * set or queries it (deduped per provider while in flight).
     * @param sessionId - the asking conversation session ('' / undefined
     * when the caller has no session context).
     * @param providerHint - the provider the session's model chip currently
     * selects (the host-reported NEXT selection), when the browser could read
     * one. It wins over the request tracker: the chip is the user's live
     * intent.
     * @param modelHint - that chip selection's model, paired with the live
     * provider. Without a provider hint, only the tracker's model is trusted.
     */
    snapshot(sessionId?: string, providerHint?: string, modelHint?: string): Promise<QuotaPayload>;
}
//# sourceMappingURL=quota-service.d.ts.map