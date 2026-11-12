/**
 * Browser-side display formatting of the quota panel: the derived
 * remaining share, the three-stop severity band, the trigger-ring fill
 * share, the trigger tooltip figure, the reset countdown, and the money /
 * percent figures. Pure functions, shared by the button (the trigger icon
 * reads the finest-granularity window) and the panel's window columns.
 *
 * POOLING: a gateway may hold several keys of ONE vendor family, each
 * with its own meter but serving the same traffic. The trigger reads the
 * POOL's level (the mean of the pool's remaining shares) instead of
 * whichever window it happens to meet first, and colors it by the pool's
 * availability — one dead key no longer paints the whole vendor red,
 * while a pool with nothing left still does.
 *
 * @module token-usage/client/quota-format
 */
import type { QuotaWindow } from '../wire.ts';
/** The three color stops the quota surfaces use, best → worst. */
export type QuotaSeverity = 'ok' | 'warn' | 'exhausted';
/** Whole-number percent, one decimal kept when it exists (`62%`, `87.5%`). */
export declare function formatQuotaPercent(value: number): string;
/** A money figure with its symbol: `$6.80` / `¥110.00`. */
export declare function formatQuotaMoney(value: number, unit: 'usd' | 'cny'): string;
/**
 * The used share of one window, 0–100, whichever direction the provider
 * reported: the explicit `usedPercent`, else `remainingPercent` inverted,
 * else the balance fraction (`1 - remaining/max`). Undefined when the
 * window carries no computable ratio (a balance without a total).
 */
export declare function quotaUsedPercent(window: QuotaWindow): number | undefined;
/**
 * The remaining share of one window, 0–100 — the severity input (severity
 * reads what is LEFT, not what is spent). Mirrors {@link quotaUsedPercent}'s
 * fallback chain in the opposite direction.
 */
export declare function quotaRemainingPercent(window: QuotaWindow): number | undefined;
/** Map a remaining share (percent) to the traffic-light band: green above
 * 60, yellow 20–60, red below 20. A window with no computable ratio reads
 * by its absolute amount: an overdrawn/empty balance (≤ 0) is red,
 * anything else uncolored — a plain balance never paints alarm just for
 * lacking a total. */
export declare function quotaSeverityOf(window: QuotaWindow): QuotaSeverity;
/**
 * The FINEST-granularity window of a payload — 5-hour over weekly over
 * monthly over balance, an `other` window (a gateway's open-named meter:
 * "Credits", "Allowance") ranking with the coarser pools it usually is.
 * The trigger icon reads this one, not the worst across windows: the
 * finest unit is the constraint the session is currently acting inside
 * (a calm 5-hour window carries the icon even when the weekly pool runs
 * low). Undefined when there is no window at all.
 */
export declare function finestQuotaWindow<T extends QuotaWindow>(windows: readonly T[]): T | undefined;
/**
 * A quota window after POOLING: the windows one quota pool spends at one
 * tier collapsed into a single water level (the mean of their remaining
 * shares), plus the bookkeeping the severity band needs to tell a pool's
 * overall level from its weakest member.
 */
export interface PooledQuotaWindow extends QuotaWindow {
    /** Windows behind this level (1 = a lone window, nothing pooled). */
    peerCount: number;
    /** How many of those windows sit below the red line (remaining < 20%). */
    exhaustedPeerCount: number;
}
/**
 * Pool the windows of a payload: windows that NAME the same quota POOL
 * and spend the same tier (an `other` window pools only with its own
 * name) collapse into one level — their budgets are interchangeable
 * (a gateway's several keys of one vendor family), so the pool's mean
 * remaining share is the level the traffic actually feels.
 *
 * Two boundaries keep the collapse honest:
 *
 * - A window WITHOUT a pool stands alone. Single-source payloads name
 *   no pool, and a lone window pools with nothing — the mean of one
 *   window is that window.
 * - BALANCE windows never pool. Amounts are not shares: summing two
 *   purses of different currencies (or averaging them) states nothing
 *   true about either, so every balance keeps its own row.
 *
 * The order of first appearance is preserved, so the trigger still reads
 * the first (finest) level of the payload.
 */
export declare function poolQuotaWindows(windows: readonly QuotaWindow[]): readonly PooledQuotaWindow[];
/**
 * The severity of a POOLED window — the traffic light of a pool, not of
 * a single meter:
 *
 * - red only when EVERY window of the pool is exhausted (the pool has
 *   nothing left to route to);
 * - yellow when the pool is low (mean at or below the yellow line) or
 *   when SOME window is exhausted while others still have room (one
 *   account died, the pool still serves);
 * - green otherwise.
 *
 * A lone window keeps the plain per-window band, so single-source
 * providers read exactly as before.
 */
export declare function quotaPoolSeverityOf(window: PooledQuotaWindow): QuotaSeverity;
/**
 * Fill share of the trigger ring, 0–1. Ratio windows map the remaining
 * percent; a funded balance without a total paints a full ring (the color
 * stays neutral — amounts tint only at ≤ 0); empty / overdrawn / missing
 * windows leave the track only.
 */
export declare function quotaIconFillShare(window: QuotaWindow | undefined): number;
/**
 * The trigger tooltip's figure for one window: the remaining share as a
 * percent when a ratio exists (any direction, or the balance fraction),
 * else the remaining amount (a ratio-less balance, the DeepSeek shape);
 * undefined when the window carries neither (nothing to show beyond the
 * plain label).
 */
export declare function quotaTriggerFigure(window: QuotaWindow | undefined): string | undefined;
/**
 * The reset countdown in the shell's compact shape: `2h 14m` under a day,
 * `48m` under an hour, `1d 3h` above; a non-positive remainder reads `0m`
 * (the next poll refreshes the stale window).
 * @param resetAt - epoch ms of the window's reset.
 * @param now - epoch ms the countdown is taken at.
 */
export declare function formatResetCountdown(resetAt: number, now: number): string;
/** A wall-clock `HH:MM` stamp of an epoch-ms time (the "updated at" figure). */
export declare function formatQuotaClock(ms: number): string;
//# sourceMappingURL=quota-format.d.ts.map