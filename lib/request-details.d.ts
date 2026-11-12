/**
 * Pure rules of the conversation usage tab's live request pool (最新请求 /
 * 实时请求): the settled per-request speed gate, the per-request cache
 * assessment (the 50%/80% request-area policy with every exclusion reason),
 * and the route-sequence walk that marks a session's first request and
 * model-switch firsts. No I/O and no runtime imports beyond types, so the
 * stats route, its tests, and any future consumer share one implementation.
 *
 * The assessment NEVER touches the global hit-rate color scale
 * (client/format.ts bandOf) — that one keeps summarizing whole sessions and
 * models; this module judges one request at a time.
 *
 * @module token-usage/request-details
 */
import type { RequestCacheExclusion, RequestDetailCache, RequestDetailState } from './wire.ts';
/** Inputs of one request's cache assessment: the merged attempt's trusted
 * facts, plus the route-sequence exclusion the caller walked beforehand. */
export interface CacheAssessInput {
    state: RequestDetailState;
    kind: 'request' | 'compaction' | 'failure' | 'aux';
    /** Provider route key, used only for the documented minimum-input rule. */
    provider?: string;
    /** Uncached input count reported by the provider. */
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    /** `cold-start` / `model-switch` when the route sequence walk excluded
     * this request; other exclusions derive from the fields above. */
    sequenceExclusion?: 'cold-start' | 'model-switch';
}
/**
 * Assess one request's cache hit for the request-area policy. The rules,
 * in evaluation order:
 *
 * 1. **State**: waiting/streaming rows are `in-flight`; failed / cancelled /
 *    interrupted rows are `not-success`; compaction rows are excluded by
 *    their kind. None of them ever carry the loss label.
 * 2. **Data**: a missing/invalid input side, or a denominator that is zero /
 *    non-finite, renders the rate absent — never 0%.
 * 3. **Reporting**: the cache-read field must have been explicitly reported
 *    (a 0 included); a missing field is `cache-unreported`, never 0%.
 * 4. **Sequence**: the session's first request (`cold-start`) and the first
 *    request after a model change (`model-switch`) are excluded by the
 *    caller's walk — regardless of their rate.
 * 5. **Input qualification**: on the documented DeepSeek routes only, a
 *    cacheable input side below one 64-token block is `insufficient-input`.
 * 6. **Policy bands**: all routes with valid reported data use rate < 50% → `loss` (the 「缓存过低」 label),
 *    50% ≤ rate < 80% → `low` (no label), ≥ 80% → `normal`.
 *    Numeric colours follow the shared summary-card scale independently.
 *    Boundaries use the raw value: exactly 80% is `normal`, exactly 50% is
 *    `low` (no label).
 *
 * A `loss` band is a low-hit heuristic hint, never proof of a server-side
 * cache failure — the client copy says so.
 */
export declare function assessRequestCache(input: CacheAssessInput): RequestDetailCache;
/**
 * One entry of a session's request sequence, in start order: the session it
 * belongs to, the model name the route/display folds under (the effective
 * model — response model when the adapter reported one), and the provider
 * route key when the row carries one.
 */
export interface RouteSequenceEntry {
    sessionId: string;
    model: string;
    kind?: 'request' | 'compaction' | 'failure' | 'aux';
    /** Provider route key; absent on legacy rows (recorded before the field
     * existed) and on failure rows whose session never named a route. */
    provider?: string;
}
/**
 * Walk a session's request sequence in start order and mark the exclusion
 * each entry's cache label would carry: the session's very first request is
 * a `cold-start`, and any entry whose immediate predecessor in the same
 * session named a different route is a `model-switch`. The route identity is
 * provider + model when BOTH sides carry a provider (the cache lineage is
 * per-route: switching `deepseek-official` → `deepseek-account` at the same
 * model name starts a new cache context); when either side lacks the
 * provider key (legacy rows, unattributed failures) the walk falls back to
 * the model-only comparison those rows have always had — an absent key never
 * widens the exclusion. Switching BACK to an earlier route is still a switch
 * first — conservative. Entries outside this vocabulary (unknown future
 * reasons) yield undefined. The walk always covers the FULL sequence the
 * caller filtered to scope — never just the display window — so a first
 * request that fell out of the 20-item pool is still correctly marked, and
 * the marks do not move as the window slides.
 *
 * Predecessors are by adjacent conversation request regardless of kind: a
 * compaction summarize call is a real provider request of the same session
 * and takes part in the cache lineage. Auxiliary work is a separate prompt
 * lineage and is skipped.
 */
export declare function routeExclusionsOf(entries: readonly RouteSequenceEntry[]): ReadonlyMap<object, 'cold-start' | 'model-switch'>;
/**
 * The settled single-request decode speed: output tokens over the generation
 * span (latency − first token), in tokens/second. The gate mirrors the
 * global performance accumulators: the generation span must be a real
 * streaming sample (≥ {@link PERF_STREAM_MIN_GEN_MS}) and the output must be
 * positive. A whole-body (non-streaming) response has no first-token figure
 * and stays undefined — its tiny arrival interval would fabricate enormous
 * tok/s. Never returns Infinity/NaN.
 */
export declare function settledSpeedOf(outputTokens: number | undefined, latencyMs: number | undefined, firstTokenLatencyMs: number | undefined): number | undefined;
/** All exclusion reasons, for locale-key coverage tests. */
export declare const CACHE_EXCLUSION_REASONS: readonly RequestCacheExclusion[];
//# sourceMappingURL=request-details.d.ts.map