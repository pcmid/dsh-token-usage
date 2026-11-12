/**
 * The main page's dashboard (browser half): the equal-height cards in a
 * two-column grid — projects | sessions, models | providers, runtime
 * overhead on the last row — each a card head (title + count, the session
 * head carrying the sort) over the same flat row lists the settings
 * panel's tabs use. The runtime-overhead card is the scroll/flash target
 * of the composite metric card's overhead pill.
 *
 * @module token-usage/client/DashboardCards
 */
import type { RefObject } from 'react';
import type { ReactNode } from 'react';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { AuxSummary, CostState, CostedModelRow, CostedProviderRow, PricingTable, SessionUsageRow } from '../wire.ts';
import type { RowSort } from './UsageRows.tsx';
import type { ProjectUsageRow } from './project-rows.ts';
import type { CurrencyView } from './format.ts';
/** Props for the four-card dashboard. Every list arrives final from the
 * section; the seats (session jump, model filter, price dialog) pass
 * through to the rows. */
export interface DashboardCardsProps {
    /** The directory-tail folds (projects card). */
    projectRows: readonly ProjectUsageRow[];
    /** The priced per-model rows (models card). */
    modelRows: readonly CostedModelRow[];
    /** The served per-session rows (sessions card). */
    sessionRows: readonly SessionUsageRow[];
    /** The three lists' controlled sorts (tokens/cost; sessions add last
     * activity). */
    projectSort: RowSort;
    onProjectSortChange: (next: RowSort) => void;
    modelSort: RowSort;
    onModelSortChange: (next: RowSort) => void;
    /** The models card's performance view (a content switch next to the
     * sort control, not a sort pick); up, the card reads the speed rows
     * and the sort control yields its seat. */
    modelPerfView: boolean;
    onModelPerfToggle: (next: boolean) => void;
    /** The priced per-provider rows (providers card); `''` is the
     * unattributed remainder row. */
    providerRows: readonly CostedProviderRow[];
    /** Route key → display name for the provider rows. */
    providerNames: Readonly<Record<string, string>> | undefined;
    providerSort: RowSort;
    onProviderSortChange: (next: RowSort) => void;
    sessionSort: RowSort;
    onSessionSortChange: (next: RowSort) => void;
    /** The auxiliary layer (overhead card; absent renders the empty hint). */
    aux: AuxSummary | undefined;
    pricing: PricingTable;
    costState: CostState;
    view: CurrencyView;
    t: TranslateNS<'token-usage'>;
    /** Seats passed through to the row lists (absent on bare hosts). */
    sessionListed?: ((id: string) => boolean) | undefined;
    onSessionOpen?: ((id: string) => void) | undefined;
    onToggleModel?: ((model: string) => void) | undefined;
    onModelName?: ((model: string) => void) | undefined;
    /** The overhead card's ref: the metric card's pill scrolls here. */
    overheadCardRef: RefObject<HTMLDivElement>;
    /** True while the overhead card flashes (pill just clicked). */
    overheadFlash: boolean;
}
/**
 * Render the dashboard: projects | sessions on the first row, models |
 * providers on the second, runtime overhead on the last. The lists cap
 * their own height and scroll inside the cards.
 */
export declare function DashboardCards({ projectRows, modelRows, sessionRows, projectSort, onProjectSortChange, modelSort, onModelSortChange, modelPerfView, onModelPerfToggle, providerRows, providerNames, providerSort, onProviderSortChange, sessionSort, onSessionSortChange, aux, pricing, costState, view, t, sessionListed, onSessionOpen, onToggleModel, onModelName, overheadCardRef, overheadFlash, }: DashboardCardsProps): ReactNode;
//# sourceMappingURL=DashboardCards.d.ts.map