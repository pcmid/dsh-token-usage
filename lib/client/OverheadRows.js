import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useState } from 'react';
import { costsAvailable } from "./PricingStatus.js";
import { totalTokens } from "./day.js";
import { formatCost, formatTokens } from "./format.js";
import list from './UsageRows.module.css';
import styles from './OverheadRows.module.css';
/**
 * Render the overhead rows: one disclosure row per kind, then the total
 * line. A summary without auxiliary requests — including an older host
 * payload with no `aux` field at all — renders the empty hint instead, so
 * the card keeps a stable body.
 * @param props - the aux layer of the summary (possibly absent), the cost
 * state, the display currency view, and the locale translator.
 */
export function OverheadRows({ aux, costState, view, t }) {
    // Which kinds are collapsed — inverted so the default is every kind
    // expanded (the user's pick): the aggregate row AND its per-model lines
    // show at once, a toggle folds the drill-in away. Each kind toggles
    // independently; switching tabs unmounts the section, which is the
    // natural reset. New kinds arriving on a refresh default to expanded.
    const [collapsedKinds, setCollapsedKinds] = useState(() => new Set());
    const toggleKind = (auxKind) => {
        setCollapsedKinds(previous => {
            const next = new Set(previous);
            if (next.has(auxKind))
                next.delete(auxKind);
            else
                next.add(auxKind);
            return next;
        });
    };
    if (aux === undefined || aux.total.requests === 0) {
        return _jsx("p", { className: styles['muted'], children: t('aux.empty') });
    }
    const costText = (cost) => costsAvailable(costState) ? formatCost(cost, view) : '—';
    /** One drill-in line: model name ↔ calls · cost · tokens. */
    const modelLine = (model, requests, cost, tokens) => (_jsxs("span", { className: styles['dline'], children: [_jsx("span", { className: styles['dmodelName'], children: model }), _jsxs("span", { children: [t('aux.requestCount', { count: requests.toLocaleString() }), ' · ', costText(cost), ' · ', formatTokens(tokens)] })] }));
    const content = (_jsxs(_Fragment, { children: [_jsx("div", { className: list['rows'], role: "list", "aria-label": t('aux.tab'), children: (aux.byKind ?? []).map(kindRow => {
                    const expanded = !collapsedKinds.has(kindRow.auxKind);
                    return (_jsxs("div", { className: styles['orow'], role: "listitem", children: [_jsxs("div", { className: styles['orowTop'], children: [_jsxs("button", { type: "button", className: styles['kindToggle'], "aria-expanded": expanded, onClick: () => toggleKind(kindRow.auxKind), children: [_jsx("span", { className: styles['chevron'], "aria-hidden": "true", children: "\u25B8" }), t(`aux.kind.${kindRow.auxKind}`)] }), _jsxs("span", { className: styles['onums'], children: [t('aux.requestCount', { count: kindRow.totals.requests.toLocaleString() }), ' · ', _jsx("span", { className: styles['onumsCost'], children: costText(kindRow.cost) }), ' · ', formatTokens(totalTokens(kindRow.totals))] })] }), expanded
                                ? (_jsx("div", { className: styles['adetail'], children: (kindRow.byModel ?? []).map(modelRow => (_jsx("span", { children: modelLine(modelRow.model, modelRow.totals.requests, modelRow.cost, totalTokens(modelRow.totals)) }, `${kindRow.auxKind}:${modelRow.model}`))) }))
                                : null] }, kindRow.auxKind));
                }) }), _jsxs("div", { className: styles['asum'], children: [_jsx("span", { children: t('aux.totalCount', { count: aux.total.requests.toLocaleString() }) }), _jsxs("span", { children: [_jsx("span", { className: styles['onumsCost'], children: costText(aux.cost) }), ' · ', formatTokens(totalTokens(aux.total))] })] })] }));
    return content;
}
//# sourceMappingURL=OverheadRows.js.map