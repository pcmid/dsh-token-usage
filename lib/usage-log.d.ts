/**
 * Durable JSONL store of the token-usage plugin: per-local-day files, a
 * serialized append queue, and the process-wide request-id dedupe set that
 * both the live hook and the manual sync share. A row lands in the day
 * file of its event time (`record.time` in local Y-M-D), never the wall
 * clock of the append — live events and history backfill share that rule.
 *
 * @module token-usage/usage-log
 */
import { type LoggerLike } from './log.ts';
import { type UsageRecord } from './usage-record.ts';
import { type SyncPersistence } from './sync.ts';
import type { FieldCompleter } from './field-completion.ts';
declare const DAY_FILE: RegExp;
/** Test for this store's per-day file names; the migration shares the naming contract. */
export { DAY_FILE };
/** Day-file name for a local-time date, e.g. `usage-2026-01-15.jsonl`. */
export declare function dayFileName(date: Date): string;
/** Day-file name of a record's event time, matching {@link dayFileName}. */
export declare function dayFileNameOf(time: number): string;
/**
 * Append-only per-day JSONL log with request-id dedupe.
 *
 * Ordering: every append (and a refile pass) runs on one promise chain, so
 * concurrent callers land in call order. Dedupe: a request id is claimed
 * synchronously before its append is queued; a failed append releases the
 * claim, so the row can be retried later.
 */
export declare class UsageLog {
    private readonly dir;
    private readonly logger;
    private readonly seen;
    /** Owning session of every saved id; the reconcile pass uses it to protect
     * the rows of sessions whose log could not be read. */
    private readonly owners;
    private queue;
    private ready;
    /**
     * @param dir - absolute data directory (created lazily on first write).
     * @param logger - diagnostic sink; defaults to console.
     */
    constructor(dir: string, logger?: LoggerLike);
    /** Whether a request id is already known to this log. */
    has(requestId: string): boolean;
    /**
     * Snapshot every saved request id. A reconcile pass takes this *before* the
     * session walk so a row appended by a live request while the walk runs is
     * never a deletion candidate.
     */
    ids(): ReadonlySet<string>;
    /**
     * Settle every queued append. The chain never rejects (each task absorbs
     * its own failure), so this is the quiescence point a data-directory
     * migration waits on before reading the files.
     * @returns settlement after the last queued append.
     */
    flush(): Promise<void>;
    /**
     * Rebuild the dedupe set from every existing day file. Malformed lines are
     * skipped with a console diagnostic; unreadable files are skipped the same
     * way, so a corrupt log never blocks the sync.
     */
    scan(): Promise<void>;
    /**
     * Persist one record unless its request id was already written.
     * @returns true when the row was appended, false when deduped.
     */
    record(record: UsageRecord): Promise<boolean>;
    /**
     * Move rows that sit in the wrong day file onto `dayFileNameOf(record.time)`.
     * Idempotent: a crash after the target already holds a request id just
     * strips it from the source on the next pass. Runs on the append queue so
     * a live write cannot interleave with the rewrite.
     * @returns the number of rows that had to move.
     */
    refileByEventDay(): Promise<number>;
    /**
     * Backfill missing latencyMs and firstTokenLatencyMs into existing day files
     * from the authoritative session persistence events.
     * Runs on the append queue so a live write cannot interleave with the rewrite.
     * @param persistence - host session persistence.
     * @returns the number of rows that were backfilled with timing.
     */
    backfillTiming(persistence: SyncPersistence): Promise<number>;
    /**
     * Fill absent fields declared by `completers` from the session logs.
     * Runs on the append queue. A thrown walk reports nothing settled, so
     * the caller does not stamp the pass and the next startup retries it.
     * @param persistence - host session persistence.
     * @param completers - the still-pending completers.
     */
    completeFields(persistence: SyncPersistence, completers: readonly FieldCompleter[]): Promise<FieldCompletionResult>;
    /**
     * Drop every saved row that the authoritative session walk did not
     * reproduce. A row whose request id no longer appears in any session log is
     * a relic of an older stored format: the host rewrote the event coordinates
     * when it migrated the log to the current format generation, so the walk
     * reproduces the same requests under new ids.
     *
     * Three guards keep this pass from destroying live data:
     * - only ids in `eligible` (the snapshot taken before the walk) are
     *   candidates, so a row a live request appended during the walk survives;
     * - a row is dropped only when its owning session was read **in full** by
     *   the walk, so "the walk did not see it" is never inferred from a session
     *   that failed to load, from a session missing out of the list (deleted,
     *   or hidden behind a header this build cannot read), or from a row whose
     *   owner is unknown;
     * - malformed lines are never candidates and stay where they are.
     *
     * A day file is rewritten only when it actually loses a row, and the
     * rewrite is atomic. Runs on the append queue so a live write cannot
     * interleave with it.
     * @param keep - request ids the walk reproduced from readable sessions.
     * @param readableSessions - sessions the walk read in full.
     * @param eligible - the pre-walk snapshot of saved request ids.
     * @returns the number of rows removed.
     */
    reconcile(keep: ReadonlySet<string>, readableSessions: ReadonlySet<string>, eligible: ReadonlySet<string>): Promise<number>;
    /** The directory is created once and remembered; an external deletion
     * forces a rebuild on the next append (see {@link appendOnce}). */
    private ensureDir;
    /**
     * Append one row, self-healing once when the directory vanished after the
     * cached creation: the data location may be removed underneath a running
     * process (a migration that stayed behind, a user cleanup), and failing
     * every append forever after would silently drop the whole session's rows.
     * The destination is the local day of {@link UsageRecord.time}, so a
     * history sync lands each row on the day the request happened.
     */
    private appendOnce;
}
/**
 * Scan day files for plain requests lacking latencyMs, resolve their timing
 * from session persistence events, and rewrite touched day files atomically.
 */
export declare function backfillDayFilesTiming(dir: string, persistence: SyncPersistence, logger?: LoggerLike): Promise<number>;
/** What one field-completion pass did, per completer: `cleanIds` settled
 * with every candidate session readable; `retriedIds` still had unreadable
 * candidate sessions, so the caller decides via its retry budget whether
 * to stamp or re-run them. */
export interface FieldCompletionResult {
    /** Rows that gained at least one field. */
    patched: number;
    /** Completer ids whose every candidate session was readable. */
    cleanIds: readonly string[];
    /** Completer ids with at least one unreadable candidate session. */
    retriedIds: readonly string[];
    /** Candidate sessions whose log could not be read. */
    failedSessions: number;
}
/**
 * Fill absent fields from session logs. A day file is rewritten only when a
 * row changed. An unreadable session does not block the others; it moves
 * the completer from `cleanIds` to `retriedIds` so the caller's retry
 * budget, not this walk, decides when the completer settles. Rows the
 * walk cannot prove stay blank; that does not block settlement.
 */
export declare function completeDayFiles(dir: string, persistence: SyncPersistence, completers: readonly FieldCompleter[], logger?: LoggerLike): Promise<FieldCompletionResult>;
//# sourceMappingURL=usage-log.d.ts.map