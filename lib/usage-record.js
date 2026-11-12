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
/** Every auxiliary kind, in the fixed display order the tables use. */
export const AUX_KINDS = ['auto-review', 'session-title', 'translation', 'other'];
/** Whether a stream chunk carries a non-empty first-token delta. */
export function isTokenDelta(chunk) {
    if (typeof chunk !== 'object' || chunk === null)
        return false;
    const c = chunk;
    switch (c.type) {
        case 'text-delta':
        case 'reasoning-delta':
            return typeof c.text === 'string' && c.text !== '';
        case 'tool-call-delta':
            return (typeof c.argumentsDelta === 'string' && c.argumentsDelta !== '') || c.name !== undefined;
        default:
            return false;
    }
}
/**
 * Extract the timestamp of the first token delta from an assistant stream run/chunks array.
 * Mirrors DSH llm assistantStreamFirstTokenTime for durable compact streams.
 */
export function extractFirstTokenTimeFromStream(stream) {
    if (!Array.isArray(stream))
        return undefined;
    for (const record of stream) {
        if (typeof record !== 'object' || record === null)
            continue;
        const r = record;
        if (r.type === 'chunk') {
            if (typeof r.time === 'number' && isTokenDelta(r.chunk)) {
                return r.time;
            }
        }
        else if (r.type === 'tool-call-chunks') {
            if (typeof r.time0 === 'number' && r.name !== undefined) {
                return r.time0;
            }
            if (typeof r.time0 === 'number' && Array.isArray(r.args)) {
                let time = r.time0;
                for (let i = 0; i < r.args.length; i++) {
                    if (i > 0 && Array.isArray(r.dt) && typeof r.dt[i - 1] === 'number') {
                        time += r.dt[i - 1];
                    }
                    if (typeof r.args[i] === 'string' && r.args[i] !== '')
                        return time;
                }
            }
        }
        else if (r.type === 'text-chunks' || r.type === 'reasoning-chunks') {
            if (typeof r.time0 === 'number' && Array.isArray(r.texts)) {
                let time = r.time0;
                for (let i = 0; i < r.texts.length; i++) {
                    if (i > 0 && Array.isArray(r.dt) && typeof r.dt[i - 1] === 'number') {
                        time += r.dt[i - 1];
                    }
                    if (typeof r.texts[i] === 'string' && r.texts[i] !== '')
                        return time;
                }
            }
        }
    }
    return undefined;
}
function isCount(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
/**
 * Project the event's optional provider usage into the four base buckets.
 * A missing record or an invalid required bucket renders the whole usage
 * absent: the row still records the request, but its numbers are not trusted.
 */
export function projectUsage(usage) {
    if (usage === undefined)
        return undefined;
    if (!isCount(usage.inputTokens) || !isCount(usage.outputTokens))
        return undefined;
    return {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        ...(isCount(usage.cacheReadTokens) ? { cacheReadTokens: usage.cacheReadTokens } : {}),
        ...(isCount(usage.cacheWriteTokens) ? { cacheWriteTokens: usage.cacheWriteTokens } : {}),
    };
}
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
export function responseModelOfReplay(replayState) {
    if (typeof replayState !== 'object' || replayState === null)
        return undefined;
    const envelope = replayState;
    const response = envelope['response'];
    if (typeof response !== 'object' || response === null)
        return undefined;
    const body = response;
    if (body['kind'] !== 'pi-ai' || body['version'] !== 2)
        return undefined;
    const model = body['responseModel'];
    return typeof model === 'string' && model !== '' ? model : undefined;
}
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
export function effectiveModelOf(record) {
    return record.responseModel ?? record.model;
}
/** Build the log row for one assistant/message session event. */
export function recordFromEvent(event, sessionId, timing) {
    const usage = projectUsage(event.data.usage);
    const latency = isCount(timing?.latencyMs) ? { latencyMs: timing.latencyMs } : {};
    const firstToken = isCount(timing?.firstTokenLatencyMs) ? { firstTokenLatencyMs: timing.firstTokenLatencyMs } : {};
    const responseModel = responseModelOfReplay(event.data.message.source.replayState);
    const provider = event.data.message.source.provider !== ''
        ? { provider: event.data.message.source.provider } : {};
    const interrupted = event.data.interrupted === true ? { interrupted: true } : {};
    const started = isCount(timing?.startedAt) ? { startedAt: timing.startedAt } : {};
    return {
        requestId: event.data.message.id,
        time: event.time,
        sessionId,
        model: event.data.message.source.model,
        ...(usage !== undefined ? { usage } : {}),
        ...(responseModel !== undefined ? { responseModel } : {}),
        ...latency,
        ...firstToken,
        ...started,
        ...provider,
        ...interrupted,
    };
}
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
export function recordFromCompaction(event, sessionId) {
    const usage = projectUsage(event.data.usage);
    if (usage === undefined)
        return null;
    return {
        requestId: `compaction:${sessionId}:${String(event.seq)}`,
        time: event.time,
        sessionId,
        model: event.data.model,
        usage,
        kind: 'compaction',
        // The summarize call names its own route. An empty key is omitted, same
        // as a plain request that never reported one.
        ...routeKey(event.data.provider),
    };
}
/** One JSONL line without the trailing newline. */
export function serializeRecord(record) {
    return JSON.stringify(record);
}
/**
 * Build the log row for one failed provider attempt. Shared by a terminal
 * `turn/end` error and an `llm/retry` (a failed attempt that the retry
 * plugin then scheduled another try for). The request id is
 * `failure:<sessionId>:<seq>` — the event's persistent seq is monotonic
 * and unique within the session, so the two sources never collide and
 * repeated syncs dedupe.
 */
function failureRow(event, sessionId, model, code, provider) {
    return {
        requestId: `failure:${sessionId}:${String(event.seq)}`,
        time: event.time,
        sessionId,
        model,
        kind: 'failure',
        // The classifier always names a code (an unclassified throw flattens to
        // 'UNKNOWN'); keep the row honest even if a future event omits it.
        ...(code !== undefined && code !== '' ? { failureCode: code } : {}),
        ...routeKey(provider),
    };
}
/** Omit an empty route key. The field is never stored as `""`. */
function routeKey(provider) {
    return provider !== undefined && provider !== '' ? { provider } : {};
}
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
export function recordFromTurnEnd(event, sessionId, model, provider = '') {
    if (event.data.reason.kind !== 'error')
        return null;
    return failureRow(event, sessionId, model, event.data.reason.error.code, provider);
}
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
export function recordFromRetry(event, sessionId, model) {
    return failureRow(event, sessionId, model, event.data.failure.code, event.data.provider);
}
/**
 * Project one session event into a log row, or null when the event is not
 * a recorded origin. Live listening and history sync share this so a new
 * origin cannot land on only one path. `lastModel` is the session's last
 * known model and `lastProvider` its last known route key (a `turn/end`
 * error names neither; compaction and `llm/retry` carry their own route
 * on the event). Compaction recording follows the same `recordCompaction`
 * switch both callers take.
 */
export function recordOfEvent(event, sessionId, lastModel, recordCompaction = true, timing, lastProvider = '') {
    switch (event.type) {
        case 'assistant/message':
            return recordFromEvent(event, sessionId, timing);
        case 'compaction/summary':
            return recordCompaction ? recordFromCompaction(event, sessionId) : null;
        case 'turn/end':
            return recordFromTurnEnd(event, sessionId, lastModel, lastProvider);
        case 'llm/retry':
            return recordFromRetry(event, sessionId, lastModel);
        default:
            return null;
    }
}
/**
 * The model id an event reveals about the session's current route, when it
 * does: `request/context` announces route changes before dispatch (it logs
 * only on change), and `assistant/message` confirms the model that actually
 * produced a message. Both fold into the same last-known value, so a turn
 * that ends in an error can still attribute its failure row to a model.
 */
export function modelOfEvent(event) {
    if (event.type === 'request/context')
        return event.data.model;
    if (event.type === 'assistant/message')
        return event.data.message.source.model;
    return undefined;
}
/**
 * The route key an event reveals about the session's current route, when
 * it does. Same two sources as {@link modelOfEvent}: `request/context`
 * announces a route change before dispatch, and `assistant/message`
 * confirms the route that produced a message. An empty key reveals
 * nothing — it must not wipe a route already known. Compaction and
 * `llm/retry` name their own route on the row, but they do not move this
 * last-known value; a later `turn/end` keeps following the request route.
 */
export function providerOfEvent(event) {
    if (event.type === 'request/context')
        return nonEmpty(event.data.provider);
    if (event.type === 'assistant/message')
        return nonEmpty(event.data.message.source.provider);
    return undefined;
}
function nonEmpty(value) {
    return value !== undefined && value !== '' ? value : undefined;
}
function normalizeCount(value) {
    return isCount(value) ? value : undefined;
}
/** Whether a raw value names a known auxiliary kind. */
function isAuxKind(value) {
    return typeof value === 'string' && AUX_KINDS.includes(value);
}
/** Read one stored auxiliary kind, falling back to the defensive bucket. */
function normalizeAuxKind(value) {
    return isAuxKind(value) ? value : 'other';
}
/** Whether a raw value is a trustworthy non-negative finite count. */
function isNonNegativeCount(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
/**
 * Read one stored compaction attribution: display-side evidence only, so a
 * malformed entry drops individually (never the whole row) — a wrong `kind`,
 * a non-positive count, or a negative shadow figure is omitted, and an empty
 * survivor set reads as unattributed. Legacy rows without the field stay
 * unattributed without being rewritten.
 */
function normalizeAttribution(value) {
    if (!Array.isArray(value))
        return {};
    const items = [];
    for (const entry of value) {
        if (typeof entry !== 'object' || entry === null)
            continue;
        const item = entry;
        if (item['kind'] !== 'prune' && item['kind'] !== 'summary')
            continue;
        const count = item['count'];
        const shadowedTokenCount = item['shadowedTokenCount'];
        if (typeof count !== 'number' || !Number.isInteger(count) || count < 1)
            continue;
        if (!isNonNegativeCount(shadowedTokenCount))
            continue;
        items.push({ kind: item['kind'], count, shadowedTokenCount });
    }
    return items.length > 0 ? { compactionAttribution: items } : {};
}
function isUsageFields(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const fields = value;
    return isCount(fields.inputTokens) && isCount(fields.outputTokens);
}
function isRecord(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const record = value;
    return typeof record.requestId === 'string'
        && isCount(record.time)
        && typeof record.sessionId === 'string'
        && typeof record.model === 'string'
        && (record.responseModel === undefined || record.responseModel === null || typeof record.responseModel === 'string')
        && (record.usage === undefined || record.usage === null || isUsageFields(record.usage));
}
/**
 * Coerce an unknown value into a record, normalizing extra fields and null
 * buckets to omission, so rows written by older field sets still dedupe
 * (their request id is absorbed) without being rewritten.
 * @returns the record, or null when the value is not a valid row.
 */
export function coerceRecord(value) {
    if (!isRecord(value))
        return null;
    // The guard already validated the structure; this cast only enables field access.
    const record = value;
    // Kind normalization: only a compaction, failure, or auxiliary row keeps
    // the key — plain rows (and unknown future kinds) read as requests, so a
    // newer row set never drops. A stored auxiliary row without a recognized
    // `auxKind` normalizes to `other` instead of losing the row.
    const isFailure = record.kind === 'failure';
    const isAux = !isFailure && record.kind === 'aux';
    const kind = record.kind === 'compaction' ? { kind: 'compaction' }
        : isFailure ? { kind: 'failure' }
            : isAux ? { kind: 'aux' }
                : {};
    const auxKind = isAux ? { auxKind: normalizeAuxKind(record.auxKind) } : {};
    // Failure classification survives the round trip on failure rows only
    // (a non-string or foreign-kind code normalizes to omission).
    const failureCode = isFailure && typeof record.failureCode === 'string' && record.failureCode !== ''
        ? { failureCode: record.failureCode } : {};
    const latency = isCount(record.latencyMs) ? { latencyMs: record.latencyMs } : {};
    const firstToken = isCount(record.firstTokenLatencyMs) ? { firstTokenLatencyMs: record.firstTokenLatencyMs } : {};
    // The response model survives the round trip on any row kind: it is
    // display-side metadata only, never part of the dedupe or billing identity.
    const responseModel = typeof record.responseModel === 'string' && record.responseModel !== ''
        ? { responseModel: record.responseModel } : {};
    // The request-pool evidence fields round-trip the same way (display-side
    // only): the provider route key and the interrupted-cancellation hint.
    // The cache-read evidence needs no extra flag — the bucket's own presence
    // inside `usage` IS the report (a 0 survives projection as 0).
    const provider = typeof record.provider === 'string' && record.provider !== ''
        ? { provider: record.provider } : {};
    const interrupted = record.interrupted === true ? { interrupted: true } : {};
    const startedAt = isCount(record.startedAt) ? { startedAt: record.startedAt } : {};
    const clock = record.attemptTiming;
    const attemptTiming = typeof clock === 'object' && clock !== null
        && isCount(clock.startedAt) && isCount(clock.settledAt) && clock.settledAt >= clock.startedAt
        ? { attemptTiming: {
                startedAt: clock.startedAt,
                settledAt: clock.settledAt,
                ...(isCount(clock.firstTokenAt) && clock.firstTokenAt >= clock.startedAt && clock.firstTokenAt <= clock.settledAt
                    ? { firstTokenAt: clock.firstTokenAt } : {}),
            } }
        : {};
    const attribution = normalizeAttribution(record.compactionAttribution);
    if (record.usage === undefined || record.usage === null) {
        return {
            requestId: record.requestId,
            time: record.time,
            sessionId: record.sessionId,
            model: record.model,
            ...kind,
            ...auxKind,
            ...failureCode,
            ...latency,
            ...firstToken,
            ...startedAt,
            ...attemptTiming,
            ...attribution,
            ...responseModel,
            ...provider,
            ...interrupted,
        };
    }
    const fields = record.usage;
    const cacheRead = normalizeCount(fields.cacheReadTokens);
    const cacheWrite = normalizeCount(fields.cacheWriteTokens);
    return {
        requestId: record.requestId,
        time: record.time,
        sessionId: record.sessionId,
        model: record.model,
        ...kind,
        ...auxKind,
        ...failureCode,
        ...latency,
        ...firstToken,
        ...startedAt,
        ...attemptTiming,
        ...attribution,
        ...responseModel,
        ...provider,
        ...interrupted,
        usage: {
            inputTokens: fields.inputTokens,
            outputTokens: fields.outputTokens,
            ...(cacheRead !== undefined ? { cacheReadTokens: cacheRead } : {}),
            ...(cacheWrite !== undefined ? { cacheWriteTokens: cacheWrite } : {}),
        },
    };
}
/**
 * Parse one JSONL line back into a record. Extra fields are ignored and null
 * buckets are normalized to omission (see {@link coerceRecord}).
 * @returns the record, or null when the line is not a valid row.
 */
export function parseRecord(line) {
    let value;
    try {
        value = JSON.parse(line);
    }
    catch {
        // JSON.parse throws SyntaxError on malformed lines; the caller skips the line.
        return null;
    }
    return coerceRecord(value);
}
//# sourceMappingURL=usage-record.js.map