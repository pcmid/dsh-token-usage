/**
 * The session usage tab's request-pool builder (node half): merge the
 * persisted usage records with the observer's live attempts into one
 * filtered, deduped, sorted, windowed `SessionRequestDetails` snapshot.
 *
 * The merge order is fixed and load-bearing: scope filter FIRST (the caller
 * already handed over only the scoped records), then dedupe against the
 * durable rows, then the route-sequence walk over the FULL merged sequence
 * (cold-start / model-switch marks never depend on the display window),
 * then sort by the order anchor descending, promote the newest active request
 * (or a just-settled live request during its one-second handoff window) to
 * the panel seat, and only then cut to REQUEST_POOL_LIMIT.
 * The window limits DISPLAY — totals, trends, and the log never shrink.
 *
 * @module token-usage/session-request-details
 */
import type { ModelRates } from './wire.ts';
import type { RateKey } from './wire.ts';
import { type UsageRecord } from './usage-record.ts';
import type { LiveAttempt } from './request-observe.ts';
import { type ConversationStatus, type SessionRequestDetails } from './wire.ts';
/** How per-record pricing reaches the builder: the route's own resolver
 * (request-time pricing, context tiers, currency stay the server's job). */
export interface RequestPricing {
    /** The rate identity one record bills at (the stats route's resolver). */
    resolve: (record: UsageRecord) => RateKey;
    /** The model's rate rules under the current table; undefined = unpriced. */
    rulesOf: (model: string) => ModelRates | undefined;
    /** Canonical model id after pricing aliases / regexes are resolved. */
    modelIdOf?: (model: string) => string;
    /** Whether the pricing layer is ready at all (else costs read unknown). */
    ready: boolean;
}
/**
 * Build the session request pool snapshot. `records` must already be scoped
 * to the requested session ids (the full filtered set, in day-file order —
 * the sequence walk needs the complete history, not a window); `live` is
 * the observer's snapshot over the same ids.
 */
export declare function buildSessionRequestDetails(input: {
    records: readonly UsageRecord[];
    live: {
        attempts: readonly LiveAttempt[];
        activeCount: number;
        conversations?: ReadonlyMap<string, ConversationStatus>;
    };
    pricing: RequestPricing;
    asOf: number;
    liveCapability: SessionRequestDetails['liveCapability'];
}): SessionRequestDetails;
//# sourceMappingURL=session-request-details.d.ts.map