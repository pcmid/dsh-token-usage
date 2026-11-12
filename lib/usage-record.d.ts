/**
 * Pure record vocabulary of the token-usage plugin: the JSONL row type, its
 * projections from session events (assistant messages, compaction
 * summaries, turn-ending LLM failures, and retried failed attempts), and
 * lenient line parsing for the dedupe scan. No I/O and no runtime imports,
 * so every consumer shares
 * one wire format. Rows stay minimal: request id, model, the four base
 * token buckets, time, session id, and the optional origin kind — absent
 * optional buckets are omitted, never null.
 *
 * @module token-usage/usage-record
 */
import type { TokenUsage } from '@deepseek-ai/dsh-llm';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { CompactionAttributionItem } from './compaction-attribution.ts';
/** Provider-reported token buckets; absent optional buckets are omitted. */
export interface UsageFields {
    /** Uncached input tokens (billed input = this + cacheRead + cacheWrite). */
    inputTokens: number;
    /** Output tokens. */
    outputTokens: number;
    /** Cache-hit input tokens; omitted when the provider reported none. */
    cacheReadTokens?: number;
    /** Cache-write input tokens; omitted when the provider reported none. */
    cacheWriteTokens?: number;
}
/**
 * Where a record came from: a plain model request (the default), a
 * compaction summarize request (a provider-billed call of its own), a
 * failed model request (a turn that ended in an LLM error, or a provider
 * attempt that `dsh-llm-retry` scheduled a retry for — counted in its own
 * `failures` dimension, never in `requests`), or an auxiliary request (a
 * bypass model call that is not part of the conversation turn: the Auto
 * review authorization gate, session-title generation, or reasoning
 * translation).
 */
export type UsageRecordKind = 'request' | 'compaction' | 'failure' | 'aux';
/**
 * The origin of one auxiliary (bypass) model request. These calls are
 * issued by host packages directly through `ctx.llm.stream()` and do not
 * produce an `assistant/message` usage event, so the recorder captures them
 * on the `llm/stream` waterfall instead:
 *
 * - `auto-review` — the per-tool-call authorization reviewer of
 *   `@deepseek-ai/dsh-experimental-auto-review`.
 * - `session-title` — the logged `session/title-llm-request` generation
 *   (`purpose: 'session-title'` on the request).
 * - `translation` — the reasoning/CoT translator
 *   (`@deepseek-ai/dsh-experimental-translator`).
 * - `other` — any other unmarked bypass request. A defensive bucket: DSH
 *   gives Auto review and the translator no purpose marker, so their
 *   identification is prompt-text based and a host upgrade can move them
 *   here without dropping the usage data.
 */
export type AuxKind = 'auto-review' | 'session-title' | 'translation' | 'other';
/** Every auxiliary kind, in the fixed display order the tables use. */
export declare const AUX_KINDS: readonly AuxKind[];
/** One JSONL row: one provider model call (successful or failed). */
export interface UsageRecord {
    /** Stable request identity: the assistant message id (dedupe key), a
     * synthesized `failure:<session>:<seq>` for a failed-request row, or
     * `aux:<kind>:<startedAt>:<seq>` for an auxiliary row. */
    requestId: string;
    /** Session-event wall time, epoch milliseconds. */
    time: number;
    /** Owning session id; '' for an auxiliary row whose host call cannot be
     * attributed safely (for example Auto review on older hosts). */
    sessionId: string;
    /** Provider model id that produced the message; a failure row carries the
     * session's last-known route model ('' when none was ever observed). */
    model: string;
    /** Provider-reported model id of the response body — the model that
     * actually served the request, which a routed alias may differ from
     * (e.g. `auto/GLM-5.3-Flash` → `glm-5.3-flash`). Parsed defensively from
     * the adapter's private replay envelope, so it is absent whenever the
     * adapter reports none or its shape is unrecognized; the routed `model`
     * stays the billing identity either way. */
    responseModel?: string;
    /** Token buckets; omitted when the provider reported no usage at all. */
    usage?: UsageFields;
    /** Record origin; absent means a plain request (legacy rows predate the
     * key, so the on-disk default is omission, never `'request'`). */
    kind?: UsageRecordKind;
    /** Auxiliary row only: which bypass call produced it. Absent on every
     * other kind; a future unknown value normalizes to `'other'` on read. */
    auxKind?: AuxKind;
    /** Failure row only: the provider-neutral `LlmFailure.code` the attempt
     * failed with (RATE_LIMIT, TRANSPORT, QUOTA, …). Absent on every other
     * kind; a future code renders verbatim. */
    failureCode?: string;
    /** Wall time in milliseconds from request dispatch (`step/start`) to message settlement (`assistant/message`). */
    latencyMs?: number;
    /** Wall time in milliseconds from request dispatch (`step/start`) to the first non-empty token delta chunk. */
    firstTokenLatencyMs?: number;
    /** Provider route key the message's own provenance named
     * (`assistant/message` source.provider). Optional route metadata for
     * switch detection and documented minimum-input rules. Legacy rows may
     * omit it without disabling cache hints. Never part of the
     * dedupe or billing identity. */
    provider?: string;
    /** Settled-with-partial-output cancellation: the assistant message was
     * finalized from a mid-stream abort (`assistant/message` `interrupted: true`
     * — the host marks a turn the user cancelled AFTER content was delivered,
     * an acknowledged cancellation, not an unknown interruption). The row
     * keeps its kind/usage (billing facts unchanged); this only lets the
     * request pool show 已取消 instead of 已完成. Absent on legacy rows and
     * on ordinary completions. */
    interrupted?: true;
    /** Absolute epoch ms when the request was dispatched (`step/start`), on
     * rows recorded with timing. The start-order anchor for the request pool;
     * absent on legacy rows, failure and compaction rows (they order by
     * `time`). */
    startedAt?: number;
    /** Exact waterfall attempt clock, when observed live. Kept separately
     * from the legacy step-level timing so aggregate statistics do not change. */
    attemptTiming?: {
        startedAt: number;
        settledAt: number;
        firstTokenAt?: number;
    };
    /** Plain-request rows only: the compaction events (prune clusters and
     * summaries) that landed since the session's previous plain request —
     * the request pool's tooltip explanation that the host's own
     * rewrite may have disturbed the prefix cache (never a cache verdict).
     * Absent on legacy rows and unattributed requests (same omission
     * philosophy as `kind`); never written on compaction / failure / aux
     * rows. */
    compactionAttribution?: CompactionAttributionItem[];
}
/** Optional timing figures for one model request. */
export interface RequestTiming {
    /** Wall time in milliseconds from request dispatch (`step/start`) to message settlement (`assistant/message`). */
    latencyMs?: number;
    /** Wall time in milliseconds from request dispatch (`step/start`) to the first non-empty token delta chunk. */
    firstTokenLatencyMs?: number;
    /** Absolute epoch ms of the request dispatch (`step/start`): the row's
     * start-order anchor, so the pool sorts by when requests BEGAN even after
     * a reload (the row's `time` alone would sort by settlement order). */
    startedAt: number;
}
/** Whether a stream chunk carries a non-empty first-token delta. */
export declare function isTokenDelta(chunk: unknown): boolean;
/**
 * Extract the timestamp of the first token delta from an assistant stream run/chunks array.
 * Mirrors DSH llm assistantStreamFirstTokenTime for durable compact streams.
 */
export declare function extractFirstTokenTimeFromStream(stream: unknown): number | undefined;
/**
 * Project the event's optional provider usage into the four base buckets.
 * A missing record or an invalid required bucket renders the whole usage
 * absent: the row still records the request, but its numbers are not trusted.
 */
export declare function projectUsage(usage: TokenUsage | undefined): UsageFields | undefined;
/**
 * The provider-reported model of one settled response, read defensively from
 * the adapter's private replay envelope (`finish` chunk / assistant source).
 * Only the known pi-ai shape (`kind: 'pi-ai'`, `version: 2`) is interpreted:
 * its optional `responseModel` is the model id the provider's own response
 * named, which a routed alias may differ from. Every other envelope —
 * including the official deepseek-messages shape, which carries no response
 * model — reads as absent rather than guessed.
 * @param replayState - the opaque `ReplayEnvelope`, straight off the wire.
 * @returns the reported model id, or undefined when absent/unrecognized.
 */
export declare function responseModelOfReplay(replayState: unknown): string | undefined;
/**
 * The model name every consumer side (pricing resolution, canonical folding,
 * display grouping) reads off a record: the provider-reported response model
 * when the adapter named one, the routed request name otherwise. The response
 * id usually matches the pricing feed directly, so the alias chain resolves
 * fewer guesses; rows without the field (older logs, adapters without a
 * reported model) behave exactly as before.
 * @param record - one usage record.
 * @returns the name to resolve, fold, and display under ('' stays '' — an
 * unattributed failure row keeps staying out of the model dimensions).
 */
export declare function effectiveModelOf(record: Pick<UsageRecord, 'model' | 'responseModel'>): string;
/** Build the log row for one assistant/message session event. */
export declare function recordFromEvent(event: SessionEvent<'assistant/message'>, sessionId: string, timing?: RequestTiming): UsageRecord;
/**
 * Build the log row for one `compaction/summary` session event — the
 * summarize provider call that reads the compacted history and writes the
 * summary. The row is billed exactly like a plain request: `model` is the
 * event's summarize model, and the usage buckets are the provider-reported
 * figures for the call. A missing or invalid usage renders the record null:
 * an unusage compaction cannot be priced, and `shadowedTokenCount` (the
 * shadow price of the replaced context) is not a billing figure, so the
 * event is skipped rather than recorded unpriced.
 *
 * The request id is `compaction:<sessionId>:<seq>` — the event's persistent
 * seq is monotonic and unique within the session (the compactionId is an
 * opaque, unvalidated string), so one row lands per compaction and repeated
 * syncs dedupe.
 * @returns the record, or null when the event carries no usable usage.
 */
export declare function recordFromCompaction(event: SessionEvent<'compaction/summary'>, sessionId: string): UsageRecord | null;
/** One JSONL line without the trailing newline. */
export declare function serializeRecord(record: UsageRecord): string;
/**
 * Build the log row for one `turn/end` session event whose reason is an LLM
 * error — the terminal failed model request of a turn. Only
 * `reason.kind === 'error'` counts: an aborted turn was cancelled by the
 * user/parent (not a provider failure), `max-tokens` truncated a request
 * that otherwise succeeded, and `blocked`/`interrupted` never reached the
 * provider. Intermediate attempts that `dsh-llm-retry` recovered are
 * recorded separately via {@link recordFromRetry}. The row carries no
 * usage (a failed call bills nothing), the `model` the caller tracked for
 * the session's route — `turn/end` itself names no model, so the recorder
 * follows `request/context` / `assistant/message` events to keep one
 * last-known model id per session — and the provider-neutral
 * `failureCode` (the `LlmFailure.code`, e.g. RATE_LIMIT / TRANSPORT /
 * QUOTA) the failure classifier assigned. `turn/end` names no route
 * either, so `provider` is the same walk's last-known route key (empty
 * when none was observed — the field is then omitted, never guessed).
 * @returns the record, or null when the turn ended for a non-error reason.
 */
export declare function recordFromTurnEnd(event: SessionEvent<'turn/end'>, sessionId: string, model: string, provider?: string): UsageRecord | null;
/**
 * Build the log row for one `llm/retry` session event — a provider attempt
 * that failed and that `dsh-llm-retry` scheduled another try for. Every
 * such event is a real failed call (the plugin writes it before the wait,
 * so a later cancel during backoff still counts the original attempt).
 * The row carries no usage; `model` is the session's last-known route
 * (the event names the provider, not the model); the route key is this
 * attempt's own `data.provider`, not the session's last-known route.
 * `failureCode` is the `LlmFailure.code` on the payload.
 * `llm/retry-started` is the wait-complete marker and is not a failure —
 * the caller ignores it.
 */
export declare function recordFromRetry(event: SessionEvent<'llm/retry'>, sessionId: string, model: string): UsageRecord;
/**
 * Project one session event into a log row, or null when the event is not
 * a recorded origin. Live listening and history sync share this so a new
 * origin cannot land on only one path. `lastModel` is the session's last
 * known model and `lastProvider` its last known route key (a `turn/end`
 * error names neither; compaction and `llm/retry` carry their own route
 * on the event). Compaction recording follows the same `recordCompaction`
 * switch both callers take.
 */
export declare function recordOfEvent(event: SessionEvent, sessionId: string, lastModel: string, recordCompaction?: boolean, timing?: RequestTiming, lastProvider?: string): UsageRecord | null;
/**
 * The model id an event reveals about the session's current route, when it
 * does: `request/context` announces route changes before dispatch (it logs
 * only on change), and `assistant/message` confirms the model that actually
 * produced a message. Both fold into the same last-known value, so a turn
 * that ends in an error can still attribute its failure row to a model.
 */
export declare function modelOfEvent(event: SessionEvent): string | undefined;
/**
 * The route key an event reveals about the session's current route, when
 * it does. Same two sources as {@link modelOfEvent}: `request/context`
 * announces a route change before dispatch, and `assistant/message`
 * confirms the route that produced a message. An empty key reveals
 * nothing — it must not wipe a route already known. Compaction and
 * `llm/retry` name their own route on the row, but they do not move this
 * last-known value; a later `turn/end` keeps following the request route.
 */
export declare function providerOfEvent(event: SessionEvent): string | undefined;
/**
 * Coerce an unknown value into a record, normalizing extra fields and null
 * buckets to omission, so rows written by older field sets still dedupe
 * (their request id is absorbed) without being rewritten.
 * @returns the record, or null when the value is not a valid row.
 */
export declare function coerceRecord(value: unknown): UsageRecord | null;
/**
 * Parse one JSONL line back into a record. Extra fields are ignored and null
 * buckets are normalized to omission (see {@link coerceRecord}).
 * @returns the record, or null when the line is not a valid row.
 */
export declare function parseRecord(line: string): UsageRecord | null;
//# sourceMappingURL=usage-record.d.ts.map