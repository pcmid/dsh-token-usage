/**
 * Token-usage settings page (browser half): fetches the stats summary from
 * the host route and renders the filter bar (inclusive day range, model
 * select, 1d/7d/30d quick ranges where 1d spans today 00:00–23:59), the
 * total-usage strip, the daily-token trend chart, and the per-model detail
 * table with the hit rate last — all following the active filters. A
 * priced model name is the row's price affordance (one click opens
 * PricingDialog.tsx); unpriced rows keep the in-cell tag. The filter
 * row's tail link opens the filter-free pricing-overview dialog
 * (PricingOverviewDialog.tsx). There is no refresh
 * button: entering the page or changing a filter refetches (the route
 * answers no-store); only the error state keeps a retry.
 *
 * @module token-usage/client/TokenUsageSection
 */
import type { ReactNode } from 'react';
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
/** Re-export so existing section tests and consumers keep importing
 * `StatCard` from this module (the file moved to `./StatCard.tsx`). */
export { StatCard } from './StatCard.tsx';
export { totalTokens } from './day.ts';
export { formatTokens, formatHitRate } from './format.ts';
/**
 * Render the Token Usage section content column. The `t` seat arrives from
 * the registration's `locale:` declaration and follows the active locale.
 * The session jump seats (`sessionListed` / `openSession`) come from the
 * registration's `inject:` — the session table's Ctrl+click affordance
 * reads the controller's list and opens the target session.
 * @param props - the framework-injected translate seat, the optional
 * injected jump seats, and the optional `close` the hosting surface hands
 * in (the settings panel closes itself on a jump; the main page returns
 * to the conversation). Absent `close` just skips the dismiss step.
 * @returns the section, one of loading / error / ready.
 */
export declare function TokenUsageSection({ t, close, sessionListed, openSession, variant }: {
    t: TranslateNS<'token-usage'>;
    /** Dismiss the hosting surface after a successful session jump. */
    close?: (() => void) | undefined;
    sessionListed?: ((id: string) => boolean) | undefined;
    openSession?: ((id: string) => boolean | {
        ok: boolean;
        reason?: string;
    }) | undefined;
    /** Hosting surface: the settings panel (default) or the main-column page,
     * which only restyles the title step and lifts the table's height cap. */
    variant?: ('panel' | 'page') | undefined;
}): ReactNode;
//# sourceMappingURL=TokenUsageSection.d.ts.map