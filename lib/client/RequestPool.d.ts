/**
 * The conversation usage tab's request pool (最新请求 / 实时请求): the
 * active-first request panel (items[0], six fixed metrics in order: cache hit,
 * input, output, first token, latency, speed — with cost / cache read /
 * cache write demoted to the footer) plus the history table of up to 19
 * earlier rows (columns frozen in order: origin, state, time, model, cache
 * hit, input, output, cache read, cache write, first token, latency, speed,
 * cost). The cache-write column is omitted when every visible request lacks
 * a reported write bucket.
 *
 * Every figure comes from the server snapshot (`requestDetails`) — the
 * component never re-derives rates or speeds, never runs its own clock
 * (in-flight elapsed is server-anchored), and never fills an unknown with a
 * zero or a session mean. The 「缓存过低」 label is a low-hit heuristic the
 * server already gated through every exclusion; its tooltip says so.
 *
 * @module token-usage/client/RequestPool
 */
import type { ReactNode } from 'react';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { CurrencyView } from './format.ts';
import type { SessionRequestDetails } from '../wire.ts';
export interface RequestPoolProps {
    details: SessionRequestDetails;
    /** The focused session: rows from it are 「本会话」, from its descendants
     * 「子会话」— the same mapping the subagent table's drill-in uses. */
    focusId: string;
    view: CurrencyView;
    /** Epoch ms of the last successful refresh; set while the latest refresh
     * failed and the panel kept its previous snapshot (the stale notice). */
    staleAt?: number;
    t: TranslateNS<'token-usage'>;
}
/**
 * Both request-pool sections: the latest panel and the history table. The
 * panel renders even for an empty pool (the empty prompt) — a session with
 * zero completed requests but one waiting must still show the area, with
 * the waiting row in it.
 */
export declare function RequestPoolSections({ details, focusId, view, staleAt, t }: RequestPoolProps): ReactNode;
//# sourceMappingURL=RequestPool.d.ts.map