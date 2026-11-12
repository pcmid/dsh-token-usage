/**
 * Live request observation (node half): a passive, pass-through watcher on
 * the `llm/stream` waterfall that tracks one entry per real provider attempt
 * (per `sessionId` + turn/step + attempt ordinal) so the conversation usage
 * tab can show 请求池 rows WHILE a request waits, streams, fails, or is
 * cancelled — not only after its usage record lands.
 *
 * Registration is INDEPENDENT of the auxiliary-recording switch: the
 * listener is installed unconditionally whenever the llm service exists, so
 * `recordAux: false` cannot silently disable the pool. The listener is
 * strictly passive — every chunk is yielded unchanged, nothing is buffered,
 * awaited on disk, or pre-read; cancel, backpressure, and listener-chain
 * semantics are the caller's own (same shape as the auxiliary recorder).
 * Prompt text, reasoning, tool arguments, and credentials never leave this
 * module: only counts, timings, model ids, and failure codes cross to the
 * stats route.
 *
 * Lifecycle facts this module relies on (verified against the host source):
 * - Every provider attempt dispatches its own `llm/stream` waterfall call —
 *   dsh-llm-retry retries on the agent loop's `agent/request-error` seam,
 *   and the loop re-dispatches through `llm.stream()` within the SAME
 *   turn/step, so the Nth waterfall call of one (session, turn, step) is
 *   the Nth attempt.
 * - The streaming protocol carries `usage` exactly once, just before the
 *   terminal `finish` — there is NO in-generation token progress route, so
 *   live rows show lifecycle only (capability `lifecycle`), never a
 *   fabricated tok/s.
 * - A mid-stream abort settles as `assistant/message` (interrupted, partial
 *   usage) or `assistant/attempt` (nothing delivered, which this plugin does
 *   not record); a retried failure settles as `assistant/attempt` then
 *   `llm/retry` / `llm/retry-started`. Every settlement the plugin records a
 *   row for is LINKED here by its durable id: `assistant/message` names the
 *   turn/step's completing attempt, `llm/retry` (appended before the
 *   backoff, so the cell's latest dispatch is the attempt that just failed)
 *   and a turn-ending error map to `failure:<session>:<seq>`, and a
 *   `compaction/summary` maps to its summarize call via the compaction lock
 *   window (`compaction/start` holds the per-session lock through `end`, so
 *   the window's compaction attempt is the summarized one). `turn/end`
 *   resolves whatever the stream never did.
 * - Compaction summarize calls carry `purpose: 'compaction'` and the owning
 *   session id but no step. Title calls carry their owning session id on
 *   current hosts and enter the pool as `aux`; unowned review/translation
 *   calls stay out because the stats route cannot safely attribute them.
 *
 * @module token-usage/request-observe
 */
import type { Context } from '@deepseek-ai/cordis';
import type { AuxKind } from './usage-record.ts';
import { type UsageFields, type UsageRecord } from './usage-record.ts';
import type { ConversationStatus, RequestDetailState } from './wire.ts';
/** One live attempt observed at the waterfall: the runtime-state shape the
 * stats route merges against the persisted records. */
export interface LiveAttempt {
    /** Stable attempt identity: `<epoch>:<sessionId>:t<turn>:s<step>:a<n>`
     * (turn/step `-1` when the attempt ran outside a step, e.g. compaction).
     * Unique per process; a restarted process gets a new epoch. */
    readonly id: string;
    sessionId: string;
    kind: 'request' | 'compaction' | 'failure' | 'aux';
    /** Auxiliary subtype when the host stamped an owning session. */
    auxKind?: AuxKind;
    state: RequestDetailState;
    /** True for attempts that entered the waiting/streaming lifecycle. Used
     * to distinguish a just-finished live request from a synthetic settled
     * snapshot supplied by a caller. */
    wasActive?: boolean;
    provider: string;
    requestedModel: string;
    /** Absolute epoch ms of the waterfall dispatch (the attempt's start). */
    startedAt: number;
    /** Absolute epoch ms when the attempt settled (finish/abort/turn-end). */
    settledAt?: number;
    /** Absolute epoch ms of the first non-empty token delta. */
    firstTokenAt?: number;
    /** The attempt's provider usage (the single pre-finish chunk); a reported
     * 0 cache-read bucket survives the copy as 0 — presence IS the evidence. */
    usage?: UsageFields;
    failureCode?: string;
    /** The durable request id once a settlement named it — `assistant/message`
     * for the turn/step's completing attempt, `failure:<session>:<seq>` for a
     * retried-failed or turn-ending attempt, `compaction:<session>:<seq>` for
     * a summarize call. The merge key against the persisted rows. */
    durableRequestId?: string;
    /** The compaction this summarize call belongs to (`compaction/start`'s
     * id, observed when the call dispatched inside the compaction's lock
     * window); the summary event's linking key. */
    compactionId?: string;
    /** The loop turn/step the attempt dispatched inside (`-1` when outside a
     * step, e.g. compaction); the settlement-linking key. */
    turn: number;
    step: number;
}
/** Everything the stats route needs from the observer for one scope. */
export interface LiveSnapshot {
    /** Live attempts belonging to the scope (settled ones included — the
     * route merges/dedupes them against the persisted records). */
    attempts: readonly LiveAttempt[];
    /** Attempts still waiting/streaming in the scope. */
    activeCount: number;
    /** 每个会话的对话状态（等待工具结果 / 本轮对话已完成 / 正在重试）；缺失的
     * 会话没有结论（本轮仍在进行中，或本进程从未观察到它的事件）。 */
    conversations?: ReadonlyMap<string, ConversationStatus>;
}
/**
 * Passive live-request observer. One instance per plugin apply; the stats
 * route reads `snapshot()` per request, and dispose clears everything.
 */
export declare class RequestObserver {
    private readonly epoch;
    private readonly attempts;
    /** The loop's open step per session (`step/start` … `assistant/message` /
     * `step/end`). Attempt ordinals read it at dispatch time. */
    private readonly activeSteps;
    /** Next attempt ordinal per (session, turn, step) — and per session for
     * out-of-step callers (compaction). */
    private readonly counters;
    /** The compaction currently holding a session's lock (`compaction/start`
     * … `compaction/end`): the lock window a summarize waterfall call
     * dispatches inside, keyed by its `compactionId`. */
    private readonly openCompactions;
    /** 每个会话尚未回结果的工具调用（`tool/call` 已发生、`tool/result` 未到）。
     * 非空即「正在等工具结果」。 */
    private readonly pendingToolCalls;
    /** 每个会话最近一轮 turn 的收尾：`true` = 本轮正常结束（`completed`）。
     * 新一轮 `turn/start` 会清掉它——上一轮的完成不代表现在。 */
    private readonly endedTurns;
    /** 每个会话当前的重试窗口（`llm/retry` 已记录、退避等待中）。退避结束
     * （`llm/retry-started`）或回合结束时清掉。 */
    private readonly retryWindows;
    private disposed;
    private disposers;
    constructor(epoch: number);
    /**
     * Register the waterfall watcher. Returns the detach function (the caller
     * wraps it in its effect); the listener is inert after {@link dispose}.
     * Until this is wired the snapshot stays empty (capability
     * `settled-only`).
     */
    attachLlm(llmCtx: Context): () => void;
    /** Track the loop's step boundaries and resolve settlements the stream
     * itself could not (message ids, turn-end failure codes). */
    attachSessions(ctx: Context): void;
    /** Clear every tracked attempt and detach nothing (listeners self-inert). */
    dispose(): void;
    /** The scope's live attempts plus its in-flight count. */
    snapshot(sessionIds: readonly string[]): LiveSnapshot;
    /** 一个会话的对话状态。重试窗口优先于等工具与本轮完成——它是当下正在
     * 发生的事，其余两者是回合的收尾结论。 */
    private conversationStateOf;
    /** Persist the exact linked attempt clock without changing the ledger's
     * step timings or billing timestamp. This survives cleanup/restarts. */
    decorateRecord(record: UsageRecord): UsageRecord;
    /** Link a successful, host-attributed auxiliary stream to the id used by
     * the JSONL recorder. Title requests are observed by both listeners and
     * have no session event to provide a durable id of their own. */
    linkAuxAttempt(input: {
        sessionId: string;
        auxKind: AuxKind;
        startedAt: number;
        provider: string;
        model: string;
        requestId: string;
    }): void;
    /** Housekeeping the route never sees: drop settled rows past the TTL or
     * beyond the per-session bound, so idle sessions shrink back to zero. */
    cleanup(now?: number): void;
    private observeEvent;
    /** The counter key of one (session, turn, step) cell. */
    private keyOf;
    /** The most recent attempt of one (session, turn, step) cell — its last
     * dispatch, whether settled or not. */
    private lastAttemptOf;
    /** The compaction attempt a `compaction/summary` names: the lock window's
     * own attempt when the waterfall dispatch was observed inside it (matched
     * by `compactionId`), else the session's latest unlinked compaction
     * attempt — the lock admits at most one at a time, so "latest" is the
     * structural answer, not a timing guess. */
    private compactionAttemptOf;
    /**
     * The waterfall listener body: stamp a live attempt, pass the stream
     * through untouched, and fold the observed chunks back into the attempt's
     * lifecycle. The wrapper is a plain async generator object, so the
     * waterfall chain keeps its synchronous shape.
     */
    private observe;
    /** Defensive usage copy: keep only trustworthy, non-negative finite
     * counts; a bad bucket drops the whole usage (the record path does the
     * same via projectUsage). */
    private copyUsage;
    private bumpCounter;
    /** Drop counters of other sessions' finished cells (rarely needed; a
     * purely defensive bound on a map that only grows per step). */
    private pruneCounters;
    private track;
}
//# sourceMappingURL=request-observe.d.ts.map