import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { OverheadRows } from "./OverheadRows.js";
import { UsageRows, RowSortControl, PerfToggle } from "./UsageRows.js";
import styles from './DashboardCards.module.css';
/** The cards' fixed sort options: projects, models and providers pick
 * between token size and billed cost; sessions add last activity. The
 * models' performance view is a separate head toggle, not a sort pick. */
const SORT_PROJECT = ['tokens', 'cost'];
const SORT_SESSION = ['tokens', 'cost', 'recent'];
const SORT_MODEL = ['tokens', 'cost'];
const SORT_PROVIDER = ['tokens', 'cost'];
/**
 * Render the dashboard: projects | sessions on the first row, models |
 * providers on the second, runtime overhead on the last. The lists cap
 * their own height and scroll inside the cards.
 */
export function DashboardCards({ projectRows, modelRows, sessionRows, projectSort, onProjectSortChange, modelSort, onModelSortChange, modelPerfView, onModelPerfToggle, providerRows, providerNames, providerSort, onProviderSortChange, sessionSort, onSessionSortChange, aux, pricing, costState, view, t, sessionListed, onSessionOpen, onToggleModel, onModelName, overheadCardRef, overheadFlash, }) {
    // The unattributed remainder is the difference between the named routes
    // and the top line, not a route: it never counts as a provider.
    const namedProviderCount = providerRows.filter(row => row.provider !== '').length;
    return (_jsxs("div", { className: styles['grid2'], children: [_jsxs("div", { className: styles['panel'], children: [_jsxs("div", { className: styles['panelHead'], children: [_jsxs("span", { className: styles['panelTitle'], children: [t('board.projects'), _jsx("span", { className: styles['panelCount'], children: projectSort === 'cost'
                                            ? t('board.byCost', { count: projectRows.length.toLocaleString() })
                                            : t('board.byTokens', { count: projectRows.length.toLocaleString() }) })] }), _jsx(RowSortControl, { value: projectSort, options: SORT_PROJECT, onChange: onProjectSortChange, ariaLabel: t('board.projects'), t: t })] }), _jsx(UsageRows, { kind: "project", projectRows: projectRows, sort: projectSort, pricing: pricing, costState: costState, view: view, t: t })] }), _jsxs("div", { className: styles['panel'], children: [_jsxs("div", { className: styles['panelHead'], children: [_jsxs("span", { className: styles['panelTitle'], children: [t('board.sessions'), _jsx("span", { className: styles['panelCount'], children: t('board.sessionsCount', { count: sessionRows.length.toLocaleString() }) })] }), _jsx(RowSortControl, { value: sessionSort, options: SORT_SESSION, onChange: onSessionSortChange, ariaLabel: t('board.sessions'), t: t })] }), _jsx(UsageRows, { kind: "session", sessionRows: sessionRows, sort: sessionSort, costState: costState, view: view, t: t, sessionListed: sessionListed, onSessionOpen: onSessionOpen })] }), _jsxs("div", { className: styles['panel'], children: [_jsxs("div", { className: styles['panelHead'], children: [_jsx("span", { className: styles['panelHeadLeft'], children: _jsxs("span", { className: styles['panelTitle'], children: [t('board.models'), _jsx("span", { className: styles['panelCount'], children: modelPerfView
                                                ? t('board.bySpeed', { count: modelRows.length.toLocaleString() })
                                                : modelSort === 'cost'
                                                    ? t('board.byCost', { count: modelRows.length.toLocaleString() })
                                                    : t('board.byTokens', { count: modelRows.length.toLocaleString() }) })] }) }), _jsxs("span", { className: styles['panelHeadRight'], children: [_jsx("span", { className: modelPerfView ? styles['headHidden'] : undefined, children: _jsx(RowSortControl, { value: modelSort, options: SORT_MODEL, onChange: onModelSortChange, ariaLabel: t('board.models'), t: t }) }), _jsx(PerfToggle, { pressed: modelPerfView, onToggle: onModelPerfToggle, t: t })] })] }), _jsx(UsageRows, { kind: "model", modelRows: modelRows, sort: modelSort, perfView: modelPerfView, pricing: pricing, costState: costState, view: view, t: t, onToggleModel: onToggleModel, onModelName: onModelName })] }), _jsxs("div", { className: styles['panel'], children: [_jsxs("div", { className: styles['panelHead'], children: [_jsxs("span", { className: styles['panelTitle'], children: [t('board.providers'), _jsx("span", { className: styles['panelCount'], children: providerSort === 'cost'
                                            ? t('board.byCost', { count: namedProviderCount.toLocaleString() })
                                            : t('board.byTokens', { count: namedProviderCount.toLocaleString() }) })] }), _jsx(RowSortControl, { value: providerSort, options: SORT_PROVIDER, onChange: onProviderSortChange, ariaLabel: t('board.providers'), t: t })] }), _jsx(UsageRows, { kind: "provider", providerRows: providerRows, providerNames: providerNames, sort: providerSort, costState: costState, view: view, t: t })] }), _jsxs("div", { ref: overheadCardRef, className: overheadFlash ? `${styles['panel']} ${styles['flash']}` : styles['panel'], children: [_jsx("div", { className: styles['panelHead'], children: _jsxs("span", { className: styles['panelTitle'], children: [t('aux.tab'), _jsx("span", { className: styles['panelCount'], children: t('aux.subtitle') })] }) }), _jsx(OverheadRows, { aux: aux, costState: costState, view: view, t: t })] })] }));
}
//# sourceMappingURL=DashboardCards.js.map