/**
 * One-shot initialization markers: whether the plugin ever completed a
 * history sync (`initializedAt`) and whether a sync has since folded the
 * session metadata (titles, header facts) into `sessions.json`
 * (`metaSyncedAt`). The markers exist only to gate automatic runs; every
 * later sync is the user's decision (the manual command). A missing or
 * malformed marker reads as unmet: the next startup re-runs the gated
 * work, whose dedupe and idempotent upserts make the repetition a no-op.
 * `completedFields` is the field-completion registry's done-set: each id
 * is stamped once every candidate session was readable, or once the
 * completer exhausted its `fieldCompletionAttempts` retry budget for
 * sessions that stay unreadable.
 *
 * @module token-usage/sync-state
 */
import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { consoleLogger } from "./log.js";
const STATE_FILE = 'state.json';
const TMP_FILE = 'state.json.tmp';
/**
 * Retry budget for one field completer: startup passes that each end with
 * unreadable candidate sessions. The pass after the last retry stamps the
 * completer done — a session log that stayed unreadable for this many
 * startups is treated as permanently gone.
 */
export const FIELD_COMPLETION_MAX_ATTEMPTS = 3;
function isSyncState(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const state = value;
    return typeof state.initializedAt === 'number' && Number.isFinite(state.initializedAt);
}
/** Completer ids already stamped, ignoring a malformed `completedFields`. */
export function completedFieldIds(state) {
    const raw = state?.completedFields;
    if (!Array.isArray(raw))
        return [];
    return raw.filter((id) => typeof id === 'string' && id !== '');
}
/** The done-set as a writable field, omitted when empty so older markers stay unchanged. */
function completedFieldsOf(state) {
    const ids = completedFieldIds(state);
    return ids.length > 0 ? { completedFields: [...ids] } : {};
}
/** Consecutive-failure counters as a plain record, ignoring a malformed map
 * and clamping out-of-range values to a fresh count. */
function fieldAttemptsOf(state) {
    const raw = state?.fieldCompletionAttempts;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
        return {};
    const out = {};
    for (const [id, count] of Object.entries(raw)) {
        if (id === '' || typeof count !== 'number' || !Number.isFinite(count) || count < 1)
            continue;
        out[id] = Math.floor(count);
    }
    return out;
}
/** The attempt map as a writable field, omitted when empty. */
function fieldAttemptsField(attempts) {
    const kept = {};
    for (const [id, count] of Object.entries(attempts)) {
        if (count > 0)
            kept[id] = count;
    }
    return Object.keys(kept).length > 0 ? { fieldCompletionAttempts: kept } : {};
}
/** Completer ids that still owe a pass. */
export function pendingCompleterIds(state, ids) {
    const done = new Set(completedFieldIds(state));
    return ids.filter(id => !done.has(id));
}
/**
 * Read the marker file. A missing or malformed file reads as null — the
 * caller treats that as unmet and re-runs the gated work idempotently.
 * @param dir - the data directory holding the marker.
 */
export async function readSyncState(dir, logger = consoleLogger) {
    let text;
    try {
        text = await readFile(join(dir, STATE_FILE), 'utf8');
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return null;
        logger.error('[token-usage] cannot read state:', error);
        return null;
    }
    let value;
    try {
        value = JSON.parse(text);
    }
    catch {
        // Malformed marker: treat as uninitialized (the sync re-runs idempotently).
        return null;
    }
    return isSyncState(value) ? value : null;
}
/**
 * Whether the first automatic sync already completed. A missing or
 * malformed marker reads as uninitialized: the next startup re-runs the
 * sync, whose dedupe makes the repetition a no-op.
 * @param dir - the data directory holding the marker.
 */
export async function isInitialized(dir, logger = consoleLogger) {
    return (await readSyncState(dir, logger)) !== null;
}
/**
 * Persist the marker file atomically (temp file + rename), so a crash
 * mid-write never leaves a torn marker that would misread as settled.
 * Fields absent from `state` are omitted, never null.
 * @param dir - the data directory holding the marker.
 * @param state - the marker contents to write.
 */
export async function writeSyncState(dir, state) {
    const target = join(dir, STATE_FILE);
    const tmp = join(dir, TMP_FILE);
    await writeFile(tmp, JSON.stringify(state), 'utf8');
    await rename(tmp, target);
}
/**
 * Persist the initialized marker (and, when the caller says the same run
 * folded the metadata or timing, their markers alongside it). An existing
 * `metaSyncedAt` or `timingSyncedAt` survives: the first-sync write must not
 * revoke a backfill an earlier upgrade already completed.
 * @param dir - the data directory holding the marker.
 * @param now - clock source (test seam).
 * @param withMeta - whether this run also folded session metadata.
 * @param withTiming - whether this run also wrote timing figures.
 */
export async function markInitialized(dir, now = () => new Date(), withMeta = false, withTiming = false) {
    const existing = await readSyncState(dir);
    await writeSyncState(dir, {
        initializedAt: now().getTime(),
        ...(existing?.metaSyncedAt !== undefined
            ? { metaSyncedAt: existing.metaSyncedAt }
            : withMeta ? { metaSyncedAt: now().getTime() } : {}),
        ...(existing?.timingSyncedAt !== undefined
            ? { timingSyncedAt: existing.timingSyncedAt }
            : withTiming ? { timingSyncedAt: now().getTime() } : {}),
        ...completedFieldsOf(existing),
        ...fieldAttemptsField(fieldAttemptsOf(existing)),
    });
}
/**
 * Stamp the metadata backfill as done, preserving `initializedAt` and `timingSyncedAt`.
 * @param dir - the data directory holding the marker.
 * @param now - clock source (test seam).
 */
export async function markMetaSynced(dir, now = () => new Date()) {
    const existing = await readSyncState(dir);
    const initializedAt = existing?.initializedAt ?? now().getTime();
    await writeSyncState(dir, {
        initializedAt,
        metaSyncedAt: now().getTime(),
        ...(existing?.timingSyncedAt !== undefined ? { timingSyncedAt: existing.timingSyncedAt } : {}),
        ...completedFieldsOf(existing),
        ...fieldAttemptsField(fieldAttemptsOf(existing)),
    });
}
/**
 * Stamp the timing backfill as done, preserving `initializedAt` and `metaSyncedAt`.
 * @param dir - the data directory holding the marker.
 * @param now - clock source (test seam).
 */
export async function markTimingSynced(dir, now = () => new Date()) {
    const existing = await readSyncState(dir);
    const initializedAt = existing?.initializedAt ?? now().getTime();
    await writeSyncState(dir, {
        initializedAt,
        ...(existing?.metaSyncedAt !== undefined ? { metaSyncedAt: existing.metaSyncedAt } : {}),
        timingSyncedAt: now().getTime(),
        ...completedFieldsOf(existing),
        ...fieldAttemptsField(fieldAttemptsOf(existing)),
    });
}
/**
 * Fold one field-completion pass into the marker: clean completers are
 * stamped done and their retry counter cleared; completers that still had
 * unreadable candidate sessions advance theirs, and a counter that reaches
 * {@link FIELD_COMPLETION_MAX_ATTEMPTS} stamps the completer done instead —
 * the dead sessions are abandoned, not retried forever. Other markers are
 * preserved. A missing marker is left missing: inventing `initializedAt`
 * would make the first-run sync look finished. The startup pass only calls
 * this after that sync has already stamped the file.
 * @param dir - the data directory holding the marker.
 * @param outcome - what the pass proved, per completer id.
 * @returns the completer ids this call newly stamped done (including
 * retry-budget exhaustions); empty when the marker was missing or nothing
 * settled.
 */
export async function markFieldCompletionOutcome(dir, outcome) {
    const existing = await readSyncState(dir);
    if (existing === null)
        return [];
    const stamped = new Set(completedFieldIds(existing));
    const attempts = fieldAttemptsOf(existing);
    const newlyStamped = [];
    for (const id of outcome.cleanIds) {
        if (id === '')
            continue;
        if (!stamped.has(id))
            newlyStamped.push(id);
        stamped.add(id);
        delete attempts[id];
    }
    for (const id of outcome.retriedIds) {
        if (id === '' || stamped.has(id))
            continue;
        attempts[id] = (attempts[id] ?? 0) + 1;
        if (attempts[id] >= FIELD_COMPLETION_MAX_ATTEMPTS) {
            stamped.add(id);
            newlyStamped.push(id);
            delete attempts[id];
        }
    }
    await writeSyncState(dir, {
        initializedAt: existing.initializedAt,
        ...(existing.metaSyncedAt !== undefined ? { metaSyncedAt: existing.metaSyncedAt } : {}),
        ...(existing.timingSyncedAt !== undefined ? { timingSyncedAt: existing.timingSyncedAt } : {}),
        ...completedFieldsOf({ completedFields: [...stamped] }),
        ...fieldAttemptsField(attempts),
    });
    return newlyStamped;
}
//# sourceMappingURL=sync-state.js.map