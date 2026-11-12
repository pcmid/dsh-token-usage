/**
 * The runtime-overhead card's row shape (browser half): one expanded-by-
 * default row per auxiliary kind — the row carries the kind's aggregate
 * (calls · cost · tokens) and discloses its per-model lines on toggle; the
 * total line sits beneath the list. The semantics are the retired table's
 * (same fold, same empty hints, same defensive read of a payload without
 * `aux`); only the shape moved from columns to rows.
 *
 * @module token-usage/client/OverheadRows
 */
import type { ReactNode } from 'react';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { AuxSummary, CostState } from '../wire.ts';
import type { CurrencyView } from './format.ts';
/**
 * Render the overhead rows: one disclosure row per kind, then the total
 * line. A summary without auxiliary requests — including an older host
 * payload with no `aux` field at all — renders the empty hint instead, so
 * the card keeps a stable body.
 * @param props - the aux layer of the summary (possibly absent), the cost
 * state, the display currency view, and the locale translator.
 */
export declare function OverheadRows({ aux, costState, view, t }: {
    aux: AuxSummary | undefined;
    costState: CostState;
    view: CurrencyView;
    t: TranslateNS<'token-usage'>;
}): ReactNode;
//# sourceMappingURL=OverheadRows.d.ts.map