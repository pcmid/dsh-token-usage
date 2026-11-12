import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { costsAvailable } from "./PricingStatus.js";
import { PricingStatus } from "./PricingStatus.js";
import { StatCard, RequestsStatCard, OverheadPill } from "./StatCard.js";
import { TrendChart } from "./TrendChart.js";
import { HitRateText } from "./HitRateText.js";
import { formatCost, formatTokens } from "./format.js";
import { totalTokens } from "./day.js";
import styles from './OverviewBoard.module.css';
/**
 * Render the overview board: one metric row (the composite lead card
 * spans two tracks), the pricing status, and the trend card.
 */
export function OverviewBoard({ total, totalCost, costState, pricingUnavailableReason, associationStorageError, aux, byDay, byHour, from, to, onOverheadActivate, compact = false, view, t, }) {
    // A single-day window plots the day's 24 hours (the section's old
    // semantics, fixed — no plot pick); any other window plots the daily rows.
    const singleDay = from !== '' && from === to;
    // The page's wide column renders the demo's 20px figures; the panel's
    // narrow grid keeps the compact ones.
    const cardSize = compact ? 'sm' : 'lg';
    return (_jsxs("div", { className: styles['board'], children: [_jsxs("div", { className: compact ? styles['metricGridCompact'] : styles['metricGrid'], children: [_jsx("div", { className: compact ? styles['leadSpanCompact'] : styles['leadSpan'], children: _jsx(RequestsStatCard, { requests: total.requests, failures: total.failures ?? 0, failuresByCode: total.failuresByCode, ...(compact
                                ? {
                                    labelExtra: (_jsx(OverheadPill, { requests: aux?.total.requests, byKind: aux?.byKind, onActivate: onOverheadActivate, t: t })),
                                    // The narrow tile fits the count plus the failure
                                    // breakdown only as bare text — a capsule wraps to a
                                    // third line and stretches the whole grid row.
                                    failureBare: true,
                                }
                                : {
                                    overheadRequests: aux?.total.requests,
                                    overheadByKind: aux?.byKind,
                                    onOverheadActivate,
                                }), size: cardSize, t: t }) }), _jsx(StatCard, { size: cardSize, label: t('stat.cost'), value: costsAvailable(costState) ? formatCost(totalCost, view) : '—' }), _jsx(StatCard, { size: cardSize, label: t('stat.totalTokens'), value: formatTokens(totalTokens(total)) }), _jsx(StatCard, { size: cardSize, label: t('stat.hitRate'), value: _jsx(HitRateText, { totals: total }) }), _jsx(StatCard, { size: cardSize, label: t('stat.input'), value: formatTokens(total.inputTokens) }), _jsx(StatCard, { size: cardSize, label: t('stat.output'), value: formatTokens(total.outputTokens) }), _jsx(StatCard, { size: cardSize, label: t('stat.cacheRead'), value: formatTokens(total.cacheReadTokens) }), _jsx(StatCard, { size: cardSize, label: t('stat.cacheWrite'), value: formatTokens(total.cacheWriteTokens) })] }), _jsx(PricingStatus, { costState: costState, pricingUnavailableReason: pricingUnavailableReason, associationStorageError: associationStorageError, t: t }), _jsxs("div", { className: styles['trendCard'], children: [_jsx("span", { className: styles['trendTitle'], children: t('trend.title') }), _jsx(TrendChart, { rows: byDay, t: t, ...from !== '' ? { from } : {}, ...to !== '' ? { to } : {}, ...(singleDay ? { hours: byHour } : {}) })] })] }));
}
//# sourceMappingURL=OverviewBoard.js.map