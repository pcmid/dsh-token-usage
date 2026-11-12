/**
 * Auxiliary (bypass) model requests of the token-usage plugin: classification
 * and record projection for provider calls that are NOT part of a
 * conversation turn — the Auto review authorization gate, session-title
 * generation, and reasoning translation. Those calls are issued through
 * `ctx.llm.stream()` by their owning host packages and do not produce an
 * `assistant/message` usage event, so the plugin records them on the
 * `llm/stream` waterfall every streaming call passes through
 * (see `LlmRuntime.stream`).
 *
 * Classification never relies on host exports that older DSH builds may not
 * ship: the conversation loop always carries a `sessionId`, compaction and
 * title requests carry their `purpose`, and the two remaining bypass callers
 * (Auto review, translator) are recognized by their fixed system prompts.
 * Anything else lands in the defensive `other` bucket rather than being
 * dropped, so a future host feature still shows up in the runtime-overhead
 * totals.
 *
 * @module token-usage/aux-request
 */
import { projectUsage } from "./usage-record.js";
/**
 * First word of the Auto review fixed policy (`dsh-experimental-auto-review`
 * sends the REVIEW_POLICY text verbatim as the request's system prompt).
 * The rest of that prompt is prose, so the marker stays the first token.
 */
export const AUTO_REVIEW_PROMPT_PREFIX = 'REVIEW_POLICY';
/**
 * First words of the translator's system prompt
 * (`dsh-experimental-translator` composes `Translate the following text …`).
 */
export const TRANSLATION_PROMPT_PREFIX = 'Translate the following text';
/**
 * Classify one streaming request as an auxiliary (bypass) model call.
 * @param options - the request observed at the `llm/stream` waterfall.
 * @returns the auxiliary kind, or undefined when the request is already
 * covered by a conversation event (agent loop) or the compaction summary
 * (which logs its own `compaction/summary` event carrying usage).
 */
export function classifyAuxRequest(options) {
    // Compaction summaries are already recorded from `compaction/summary`.
    if (options.purpose === 'compaction')
        return undefined;
    // Title generation is a bypass call, but its purpose marker is explicit.
    if (options.purpose === 'session-title')
        return 'session-title';
    // Newer Auto-review hosts may stamp the owning session while older hosts
    // still omit it.  The fixed policy remains authoritative in either shape.
    const system = options.system;
    if (typeof system === 'string' && system.startsWith(AUTO_REVIEW_PROMPT_PREFIX))
        return 'auto-review';
    // Every conversation-loop request is marked with the session it serves
    // (dsh-agent-loop freezes `sessionId` into its request); the loop records
    // the call through `assistant/message`. A hand-built request without a
    // session is the bypass shape.
    if (options.sessionId !== undefined)
        return undefined;
    if (typeof system === 'string') {
        if (system.startsWith(TRANSLATION_PROMPT_PREFIX))
            return 'translation';
    }
    return 'other';
}
/**
 * Build the log row for one settled auxiliary model request. The row carries
 * `kind: 'aux'`; when the host supplies a session owner, that id is retained
 * so per-session views can include the attributable running overhead. Legacy
 * unowned bypass calls keep an empty `sessionId`.
 * @param input - kind, identity, timing, route, and usage of the call.
 * @returns the persistable record (usage omitted when unusable).
 */
export function recordFromAuxRequest(input) {
    const usage = projectUsage(input.usage);
    return {
        requestId: input.requestId,
        time: input.time,
        sessionId: input.sessionId ?? '',
        model: input.model,
        ...(input.responseModel !== undefined ? { responseModel: input.responseModel } : {}),
        ...(usage !== undefined ? { usage } : {}),
        kind: 'aux',
        auxKind: input.auxKind,
        ...(input.provider !== undefined && input.provider !== '' ? { provider: input.provider } : {}),
    };
}
//# sourceMappingURL=aux-request.js.map