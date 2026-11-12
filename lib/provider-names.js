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
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { consoleLogger } from "./log.js";
export { providerLabel } from "./provider-label.js";
export const PROVIDERS_FILE = 'providers.json';
const TMP_FILE = 'providers.json.tmp';
function coerceIndex(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return {};
    const out = {};
    for (const [id, name] of Object.entries(value)) {
        if (id === '' || typeof name !== 'string' || name === '')
            continue;
        out[id] = name;
    }
    return out;
}
/**
 * Read/write access to one data directory's provider-name registry.
 * Writes serialize on one promise chain and persist atomically. A missing
 * file reads as empty; entries already on disk are never deleted by an
 * upsert — a registry that cannot be read back is never overwritten
 * either, because the surviving entries are not recoverable from the
 * session logs.
 */
export class ProviderNameStore {
    dir;
    logger;
    queue = Promise.resolve();
    /** The parsed index plus the file stamp it was read at; the stamp decides
     * whether the next read re-reads and re-parses the file. */
    cache;
    constructor(dir, logger = consoleLogger) {
        this.dir = dir;
        this.logger = logger;
    }
    /** Drop the cached parse (data-directory relocation, test seams). */
    invalidate() {
        this.cache = undefined;
    }
    /** Read the registry. Corruption degrades to the entries that survived. */
    async read() {
        return (await this.readTrusted()) ?? {};
    }
    /**
     * Read the registry for a WRITE. `null` means the file is present but
     * cannot be trusted (unreadable, or not valid JSON): writing in that
     * state would replace the surviving entries with the incoming patch
     * alone, and a display name is not recoverable from the session logs.
     * A missing file is trustworthy and empty, so the first write proceeds.
     */
    async readTrusted() {
        const path = join(this.dir, PROVIDERS_FILE);
        let stamp;
        try {
            const info = await stat(path);
            stamp = { size: info.size, mtimeMs: info.mtimeMs };
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                this.cache = undefined;
                return {};
            }
            this.logger.error('[token-usage] cannot stat providers.json:', error);
            this.cache = undefined;
            return null;
        }
        if (this.cache !== undefined && this.cache.size === stamp.size && this.cache.mtimeMs === stamp.mtimeMs) {
            return this.cache.index;
        }
        let text;
        try {
            text = await readFile(path, 'utf8');
        }
        catch (error) {
            this.logger.error('[token-usage] cannot read providers.json:', error);
            this.cache = undefined;
            return null;
        }
        try {
            const index = coerceIndex(JSON.parse(text));
            this.cache = { index, size: stamp.size, mtimeMs: stamp.mtimeMs };
            return index;
        }
        catch {
            this.logger.error('[token-usage] providers.json is not valid JSON; leaving it untouched');
            this.cache = undefined;
            return null;
        }
    }
    /**
     * Merge route keys into the registry. A new name for an existing id
     * overwrites; ids absent from `patch` stay. Empty ids and empty names
     * are ignored. A patch that changes nothing does not rewrite the file.
     * A registry that cannot be read back is left alone rather than
     * overwritten with the patch alone.
     */
    upsert(patch) {
        const incoming = {};
        for (const [id, name] of Object.entries(patch)) {
            if (id === '' || name === '')
                continue;
            incoming[id] = name;
        }
        if (Object.keys(incoming).length === 0)
            return Promise.resolve();
        const task = this.queue.then(async () => {
            const trusted = await this.readTrusted();
            if (trusted === null) {
                this.logger.error('[token-usage] providers.json is unreadable; skipping the name update');
                return;
            }
            const index = { ...trusted };
            let changed = false;
            for (const [id, name] of Object.entries(incoming)) {
                if (index[id] === name)
                    continue;
                index[id] = name;
                changed = true;
            }
            if (!changed)
                return;
            await this.write(index);
        });
        this.queue = task.catch(() => { });
        return task;
    }
    /** Settle every queued write (the migration's quiescence point). */
    flush() {
        return this.queue;
    }
    async write(index) {
        await mkdir(this.dir, { recursive: true });
        const target = join(this.dir, PROVIDERS_FILE);
        const tmp = join(this.dir, TMP_FILE);
        await writeFile(tmp, JSON.stringify(index), 'utf8');
        await rename(tmp, target);
        // The file on disk now differs from the stamp the cache holds.
        this.cache = undefined;
    }
}
//# sourceMappingURL=provider-names.js.map