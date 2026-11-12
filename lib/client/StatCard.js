import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import { failuresTooltip, overheadTooltip } from "./format.js";
import styles from './StatCard.module.css';
/**
 * Render one stat card. The value uses the standard label-primary color.
 * The label clamps to one line and ellipsizes if the column is squeezed.
 */
export function StatCard({ label, value, size, labelExtra }) {
    const card = size === 'lg' ? `${styles['card']} ${styles['cardLg']}`
        : size === 'sm' ? `${styles['card']} ${styles['cardSm']}` : styles['card'];
    return (_jsxs("div", { className: card, children: [labelExtra === undefined
                ? _jsx("span", { className: styles['cardLabel'], children: label })
                : (_jsxs("span", { className: styles['cardLabelRow'], children: [_jsx("span", { className: styles['cardLabel'], children: label }), labelExtra] })), _jsx("span", { className: styles['cardValue'], children: value })] }));
}
/**
 * Compact "失败 n" chip for the requests **card** only. Hovering or focusing
 * it lists `限流 ×count` per class. Zero failures render nothing. Per-model
 * tables do not use this — they print `A/B` via {@link RequestsCell}.
 */
export function FailurePill({ failures, failuresByCode, t, bare = false, }) {
    if (failures === 0)
        return null;
    return (_jsx("span", { className: styles['pillWrap'], children: _jsx(Tooltip, { label: failuresTooltip(failuresByCode, t), side: "bottom", delayMs: 200, children: bare
                ? (_jsx("span", { className: styles['failBare'], tabIndex: 0, "aria-label": t('stat.failuresPill', { count: failures.toLocaleString() }), children: t('stat.failuresPill', { count: failures.toLocaleString() }) }))
                : (_jsx("span", { className: styles['pill'], tabIndex: 0, children: t('stat.failuresPill', { count: failures.toLocaleString() }) })) }) }));
}
/**
 * The requests tile both dashboards share: hero figure is the successful
 * count; a compact pill to its right carries the failure count, and — when
 * auxiliary requests were recorded — a neutral pill carries the runtime-
 * overhead count (hover for the per-kind split, click to jump there).
 */
export function RequestsStatCard({ requests, failures, failuresByCode, t, overheadRequests, overheadByKind, onOverheadActivate, size, labelExtra, failureBare = false, }) {
    return (_jsx(StatCard, { label: t('stat.requests'), size: size, labelExtra: labelExtra, value: (_jsxs(_Fragment, { children: [_jsx("span", { className: styles['cardValueMain'], children: requests.toLocaleString() }), _jsx(FailurePill, { failures: failures, failuresByCode: failuresByCode, t: t, ...(failureBare ? { bare: true } : {}) }), _jsx(OverheadPill, { requests: overheadRequests, byKind: overheadByKind, onActivate: onOverheadActivate, t: t })] })) }));
}
/**
 * Compact "开销 n" chip beside the hero request count. Mirrors
 * {@link FailurePill} in neutral ink and is a real button — the dashboards
 * wire it to scroll-to (page) or switch-to (panel) the runtime-overhead
 * section. Zero recorded overhead renders nothing.
 */
export function OverheadPill({ requests, byKind, onActivate, t, }) {
    if (requests === undefined || requests === 0)
        return null;
    return (_jsx("span", { className: styles['pillWrap'], children: _jsx(Tooltip, { label: overheadTooltip(byKind, t), side: "bottom", delayMs: 200, children: _jsx("button", { type: "button", className: styles['pillNeutral'], onClick: onActivate, children: t('stat.overheadPill', { count: requests.toLocaleString() }) }) }) }));
}
/** One table cell: the successful count, and when failures > 0 the
 * failure count after a slash, in the error color and hoverable for the
 * per-code breakdown.
 *
 * The column is ONE plain column: the figures are plain inline text, so
 * the head above them inherits the same alignment and the two share one
 * edge — no tracks, no grid, no placeholder. Zero failures print only
 * the successful count (no slash, no `0`). */
export function RequestsCell({ requests, failures, failuresByCode, t, }) {
    const ok = requests.toLocaleString();
    if (failures === 0) {
        return _jsx("span", { children: ok });
    }
    const fail = failures.toLocaleString();
    return (_jsxs("span", { children: [_jsx("span", { children: ok }), _jsx("span", { className: styles['splitSep'], "aria-hidden": true, children: "/" }), _jsx("span", { className: styles['failWrap'], children: _jsx(Tooltip, { label: failuresTooltip(failuresByCode, t), side: "bottom", delayMs: 200, children: _jsx("span", { className: styles['splitFail'], tabIndex: 0, "aria-label": t('stat.failuresPill', { count: fail }), children: fail }) }) })] }));
}
//# sourceMappingURL=StatCard.js.map