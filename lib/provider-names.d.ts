/**
 * Provider display-name registry of the token-usage plugin: `providers.json`
 * in the data directory, mapping a route key to the latest human-readable
 * name reported by the host provider directory.
 *
 * Usage rows store only the route key. A display name changes when the
 * user renames a route, and the latest name wins, so the name is not
 * frozen onto each JSONL row. This file is not a projection of the
 * session logs: a lost file is refilled from the current directory, and
 * a route that has since been removed keeps the last name seen here.
 * The file moves with the data directory.
 *
 * @module token-usage/provider-names
 */
import { type LoggerLike } from './log.ts';
import { type ProviderNameIndex } from './provider-label.ts';
export { providerLabel } from './provider-label.ts';
export type { ProviderNameIndex } from './provider-label.ts';
export declare const PROVIDERS_FILE = "providers.json";
/**
 * Read/write access to one data directory's provider-name registry.
 * Writes serialize on one promise chain and persist atomically. A missing
 * file reads as empty; entries already on disk are never deleted by an
 * upsert — a registry that cannot be read back is never overwritten
 * either, because the surviving entries are not recoverable from the
 * session logs.
 */
export declare class ProviderNameStore {
    private readonly dir;
    private readonly logger;
    private queue;
    /** The parsed index plus the file stamp it was read at; the stamp decides
     * whether the next read re-reads and re-parses the file. */
    private cache;
    constructor(dir: string, logger?: LoggerLike);
    /** Drop the cached parse (data-directory relocation, test seams). */
    invalidate(): void;
    /** Read the registry. Corruption degrades to the entries that survived. */
    read(): Promise<ProviderNameIndex>;
    /**
     * Read the registry for a WRITE. `null` means the file is present but
     * cannot be trusted (unreadable, or not valid JSON): writing in that
     * state would replace the surviving entries with the incoming patch
     * alone, and a display name is not recoverable from the session logs.
     * A missing file is trustworthy and empty, so the first write proceeds.
     */
    private readTrusted;
    /**
     * Merge route keys into the registry. A new name for an existing id
     * overwrites; ids absent from `patch` stay. Empty ids and empty names
     * are ignored. A patch that changes nothing does not rewrite the file.
     * A registry that cannot be read back is left alone rather than
     * overwritten with the patch alone.
     */
    upsert(patch: Readonly<ProviderNameIndex>): Promise<void>;
    /** Settle every queued write (the migration's quiescence point). */
    flush(): Promise<void>;
    private write;
}
//# sourceMappingURL=provider-names.d.ts.map