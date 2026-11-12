/**
 * Request-driven cost-figure inflate animation for the composer-dock usage
 * pill: detects new usage from summary deltas and drives the WAAPI motion on
 * the cost figure (a scale + colour pop whose amplitude follows the step's
 * token intensity).
 *
 * @module token-usage/client/use-cost-inflate
 */
import { type RefObject } from 'react';
import type { UsageSummary } from '../wire.ts';
export interface UseCostInflateResult {
    /** Call when a fresh chip summary lands (after first paint baseline). */
    onSummary: (summary: UsageSummary) => void;
    /** Clear baseline and the in-flight pop (session / scope change). */
    reset: () => void;
}
/**
 * Hook the pill uses to play the costPop on each new request.
 * @param scopeKey - changes reset the diff baseline.
 * @param costRef - the live cost figure span (WAAPI target).
 */
export declare function useCostInflate(scopeKey: string, costRef: RefObject<HTMLElement | null>): UseCostInflateResult;
//# sourceMappingURL=use-cost-inflate.d.ts.map