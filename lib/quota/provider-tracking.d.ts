/**
 * Live provider tracking (node half): which LLM provider route the active
 * session is using, fed from the session events the host already emits.
 * `request/context` arrives when a request dispatches (provider known
 * before the first token); `assistant/message` re-confirms it from the
 * message provenance. The map is deliberately in-memory: quota is about
 * the provider in use NOW, and a restart re-seeds from the next event or
 * the default-model selection.
 *
 * @module token-usage/quota/provider-tracking
 */
/** One observed provider use of a session. */
export interface ProviderSighting {
    /** Provider route key (`zai-coding-cn`, `deepseek-official`, …). */
    provider: string;
    /** Model id the request used. */
    model: string;
    /** When the sighting happened, epoch ms. */
    at: number;
}
/** In-memory session → latest sighting map with a global fallback. */
export declare class ProviderTracker {
    #private;
    /** Record that a session used a provider (later sightings win). */
    observe(sessionId: string, provider: string, model: string, at?: number): void;
    /** The session's latest sighting, else the most recent sighting of any
     * session (a brand-new session inherits the last provider in use — the
     * shell's own default-then-remembered behavior). */
    sightingOf(sessionId: string | undefined): ProviderSighting | undefined;
}
/**
 * Resolve the provider sighting a quota query should target: the
 * tracker's latest (the active session's or the global last), else the
 * host's default model selection (the `agent-default-model` settings
 * section — what a brand-new, never-requesting session would use) as a
 * model-less sighting.
 * @param input - the tracker, the asking session, and a thunk reading the
 * default selection's `provider` (undefined when no default is stored).
 * @returns the sighting (its model scopes gateway adapters' cards), or
 * undefined when nothing determinable exists.
 */
export declare function resolveCurrentSighting(input: {
    tracker: ProviderTracker;
    sessionId?: string;
    defaultProvider?: () => string | undefined;
}): ProviderSighting | undefined;
/**
 * Resolve the provider ROUTE KEY alone — the key-only projection of
 * {@link resolveCurrentSighting} for callers that do not scope by model.
 */
export declare function resolveCurrentProvider(input: {
    tracker: ProviderTracker;
    sessionId?: string;
    defaultProvider?: () => string | undefined;
}): string | undefined;
//# sourceMappingURL=provider-tracking.d.ts.map