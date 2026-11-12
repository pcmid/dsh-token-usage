/**
 * Request-driven cost-figure inflate animation for the composer-dock usage
 * pill: detects new usage from summary deltas and drives the WAAPI motion on
 * the cost figure (a scale + colour pop whose amplitude follows the step's
 * token intensity).
 *
 * @module token-usage/client/use-cost-inflate
 */
import { useCallback, useEffect, useRef } from 'react';
import { costsAvailable } from "./PricingStatus.js";
import { totalTokens } from "./day.js";
import { motionAllowed, runCostPop } from "./cost-inflate-motion.js";
import { animVars, computeIntensityFromDelta, deltaTotals, } from "./cost-inflate.js";
const MIN_WIRE_DELTA_COST = 0.000_5;
function hasUsageChurn(prev, summary) {
    const delta = deltaTotals(prev.totals, summary.total);
    if (delta.requests > 0)
        return true;
    if (summary.totalCost - prev.totalCost > MIN_WIRE_DELTA_COST)
        return true;
    return totalTokens(delta) > 0;
}
/**
 * Hook the pill uses to play the costPop on each new request.
 * @param scopeKey - changes reset the diff baseline.
 * @param costRef - the live cost figure span (WAAPI target).
 */
export function useCostInflate(scopeKey, costRef) {
    const prevRef = useRef(null);
    const popAnimRef = useRef(null);
    const reset = useCallback(() => {
        popAnimRef.current?.cancel();
        popAnimRef.current = null;
        prevRef.current = null;
    }, []);
    useEffect(() => {
        reset();
    }, [scopeKey, reset]);
    useEffect(() => () => { popAnimRef.current?.cancel(); }, []);
    const playCostPop = useCallback((v) => {
        const el = costRef.current;
        if (el === null)
            return;
        popAnimRef.current?.cancel();
        popAnimRef.current = runCostPop(el, v);
    }, [costRef]);
    const onSummary = useCallback((summary) => {
        if (!costsAvailable(summary.costState)) {
            reset();
            return;
        }
        const nextSnapshot = {
            totals: summary.total,
            totalCost: summary.totalCost,
        };
        const prev = prevRef.current;
        prevRef.current = nextSnapshot;
        if (prev === null)
            return;
        if (!hasUsageChurn(prev, summary))
            return;
        // Reduced motion: the baseline is already stored above, so the figure
        // repaints silently — no pop.
        if (!motionAllowed())
            return;
        const delta = deltaTotals(prev.totals, summary.total);
        const I = computeIntensityFromDelta(delta);
        const v = animVars(I);
        window.requestAnimationFrame(() => { playCostPop(v); });
    }, [playCostPop, reset]);
    return { onSummary, reset };
}
//# sourceMappingURL=use-cost-inflate.js.map