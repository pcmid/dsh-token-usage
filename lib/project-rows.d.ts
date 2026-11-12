/**
 * Project aggregation over root-session rows, shared by the host's full
 * project dimension and the browser's older-host compatibility fallback.
 * The host folds before truncating the session list.
 *
 * @module token-usage/project-rows
 */
import type { ProjectUsageRow, SessionUsageRow } from './wire.ts';
/** The last path segment of a directory, on either separator. */
export declare function dirTailOf(cwd: string): string;
/**
 * Fold session rows into one row per directory tail, token-descending (the
 * dashboard's relative bars take the first row as their 100%). The tail is
 * the bucket key — two different full paths ending in the same segment read
 * as one project here, matching the demo's semantics. Within a bucket the
 * first-seen cwd rides along as the representative full path. The input
 * order is preserved inside a bucket (the served rows arrive cost-sorted).
 * @param rows - subtree-folded root sessions; the host supplies the full
 * set, not the truncated session list.
 */
export declare function projectRowsOf(rows: readonly SessionUsageRow[]): ProjectUsageRow[];
//# sourceMappingURL=project-rows.d.ts.map