/**
 * The dashboards' shared overview board (browser half): the metric cards
 * (the composite first card「请求数 · 运行开销」spanning two grid
 * tracks, then cost / total / hit rate and the four buckets), the pricing
 * status line, and the trend card — titled 趋势, plotting the day's 24
 * hours on a single-day window (fixed; no plot pick) and the daily rows
 * on any wider window. Both the main page and the settings panel render
 * this same board, so the two surfaces read as one.
 *
 * @module token-usage/client/OverviewBoard
 */
import type { ReactNode } from 'react';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { AssociationStorageError, AuxSummary, CostState, PricingUnavailableReason, UsageDayRow, UsageHourRow, UsageTotals } from '../wire.ts';
import type { CurrencyView } from './format.ts';
/** Props for the overview board — every field is derived data the section
 * (which owns the fetch and the filter state) passes down; the board never
 * requests. */
export interface OverviewBoardProps {
    /** The window's totals (the top-line aggregate). */
    total: UsageTotals;
    /** Billed cost (¥) of the window; dashed when the cost layer is out. */
    totalCost: number;
    costState: CostState;
    pricingUnavailableReason?: PricingUnavailableReason | undefined;
    associationStorageError?: AssociationStorageError | undefined;
    /** The auxiliary layer driving the composite card's overhead pill
     * (absent / zero renders no pill). */
    aux?: AuxSummary | undefined;
    /** The trend's daily points (always present). */
    byDay: readonly UsageDayRow[];
    /** The trend's hourly points (a single-day window only). */
    byHour: readonly UsageHourRow[];
    /** The active window bounds ('' = whole range). A single-day selection
     * (from === to, both non-empty) offers the hourly toggle. */
    from: string;
    to: string;
    /** Overhead pill click: scroll to / switch to the overhead section. */
    onOverheadActivate: () => void;
    /** The settings panel's narrow body: the metric cards fall back to the
     * section's old two-rows-of-four layout (the composite card keeps its
     * pills but reads the short label), while the page's wide column keeps
     * the demo's single nine-track row. */
    compact?: boolean | undefined;
    /** Currency display view (symbol + rate). */
    view: CurrencyView;
    t: TranslateNS<'token-usage'>;
}
/**
 * Render the overview board: one metric row (the composite lead card
 * spans two tracks), the pricing status, and the trend card.
 */
export declare function OverviewBoard({ total, totalCost, costState, pricingUnavailableReason, associationStorageError, aux, byDay, byHour, from, to, onOverheadActivate, compact, view, t, }: OverviewBoardProps): ReactNode;
//# sourceMappingURL=OverviewBoard.d.ts.map