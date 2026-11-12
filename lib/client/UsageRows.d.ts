/**
 * The dashboards' flat row lists (browser half): one component, four
 * shapes — `project` (directory-tail folds), `model` (the priced rows),
 * `session` (two-line rows) and `provider` (the per-route rows with the
 * unattributed remainder sunk to the bottom). All four read the same
 * single-line grammar of the v3 demo: name | relative bar (projects /
 * models / providers only) | total tokens · cache share | cost; sessions
 * swap the bar for a second identity line (directory · activity) under the
 * same figures cells, all four lists rendering one figures style everywhere
 * (no hover affordance — a former four-bucket popup read as clutter and
 * went).
 *
 * The relative bar scales to
 * the active sort's own measure — tokens while sorted by tokens, billed cost
 * while sorted by cost — so the bars never contradict the order they sit
 * in. Rows arrive FINAL from the host route (folded, sorted, truncated);
 * this component only re-organizes presentation. The Ctrl affordances move
 * with the rows: Ctrl+click on a listed session opens it (dashed
 * underline), Ctrl+click on a model toggles the section's model filter to
 * just that model.
 *
 * @module token-usage/client/UsageRows
 */
import type { ReactNode } from 'react';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { CostState, CostedModelRow, CostedProviderRow, PricingTable, SessionUsageRow } from '../wire.ts';
import type { CurrencyView } from './format.ts';
import type { ProjectUsageRow } from './project-rows.ts';
/** Which row shape the list renders. */
export type UsageRowsKind = 'project' | 'model' | 'session' | 'provider';
/** The row lists' controlled sort. `tokens` on projects passes the fold's
 * native order through; `cost` on sessions passes the served order
 * through; models re-sort under both picks (they arrive request-count
 * descending), ties broken by name. Sorting never carries the performance
 * view — that is a content switch ({@link UsageRowsProps.perfView}), not
 * a third pick. */
export type RowSort = 'tokens' | 'cost' | 'recent';
/** Sort toggle rendered in a card head / above a tab's list. Controlled —
 * the section owns the state, so the page and the panel keep independent
 * picks. */
export declare function RowSortControl({ value, options, onChange, ariaLabel, t, compact }: {
    value: RowSort;
    options: readonly RowSort[];
    onChange: (next: RowSort) => void;
    ariaLabel: string;
    t: TranslateNS<'token-usage'>;
    compact?: boolean;
}): ReactNode;
/** The performance view toggle (model card head): a view switch, not a
 * third sort pick — pressed, the card shows the speed rows and the sort
 * control yields (the performance order is its own definition: ranked
 * rows by mean speed, the dimmed ones sunk; there is no second way to
 * order them). */
export declare function PerfToggle({ pressed, onToggle, t, compact }: {
    pressed: boolean;
    onToggle: (next: boolean) => void;
    t: TranslateNS<'token-usage'>;
    compact?: boolean;
}): ReactNode;
/** Props for the flat row list. Only the array matching `kind` is read;
 * the optional seats (session jump, model filter, price dialog) are absent
 * on tests and hosts without them, and the rows then render inert. */
export interface UsageRowsProps {
    kind: UsageRowsKind;
    /** `kind: 'project'` — the directory-tail folds. */
    projectRows?: readonly ProjectUsageRow[] | undefined;
    /** `kind: 'model'` — the priced per-model rows. */
    modelRows?: readonly CostedModelRow[] | undefined;
    /** `kind: 'session'` — the served per-session rows (final order = cost). */
    sessionRows?: readonly SessionUsageRow[] | undefined;
    /** `kind: 'provider'` — the priced per-provider rows; `''` is the
     * unattributed remainder row. */
    providerRows?: readonly CostedProviderRow[] | undefined;
    /** Provider rows only: the route-key → display-name registry; a key
     * without an entry falls back to the key itself. */
    providerNames?: Readonly<Record<string, string>> | undefined;
    /** The controlled sort pick (see {@link RowSort}); the default depends
     * on the kind — `tokens` on project/model, `cost` on session. Ignored
     * while `perfView` is set. */
    sort?: RowSort | undefined;
    /** Model rows only: the performance view is up — the figures cells read
     * the speed means, the order is speed-fixed (ranked rows first, the
     * dimmed ones sunk), and the sort pick yields until toggled off. */
    perfView?: boolean | undefined;
    /** The pricing table: which models are priced (name is the price
     * affordance) and the rates a model row's cost splits against. */
    pricing?: PricingTable | undefined;
    /** The cost layer's state; not `ready`, every cost cell reads `—`. */
    costState?: CostState | undefined;
    /** Currency display view (symbol + rate). */
    view: CurrencyView;
    /** Locale function. */
    t: TranslateNS<'token-usage'>;
    /** Session jump seats: whether the controller lists a session, and the
     * open callback (the parent closes its panel on success). */
    sessionListed?: ((id: string) => boolean) | undefined;
    onSessionOpen?: ((id: string) => void) | undefined;
    /** Ctrl+click on a model row: toggle the section's model filter. */
    onToggleModel?: ((model: string) => void) | undefined;
    /** Plain click on a priced model's name: open the price dialog. */
    onModelName?: ((model: string) => void) | undefined;
}
/**
 * Render one flat row list. The list is the height-capped scroll container
 * (scrollbar appears while scrolling, fades 800ms after it stops).
 */
export declare function UsageRows({ kind, projectRows, modelRows, sessionRows, providerRows, providerNames, sort, perfView, pricing, costState, view, t, sessionListed, onSessionOpen, onToggleModel, onModelName, }: UsageRowsProps): ReactNode;
//# sourceMappingURL=UsageRows.d.ts.map