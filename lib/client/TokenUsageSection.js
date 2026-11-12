import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconWarningOutlineRegular, Toast } from '@deepseek-ai/dsh-client-ui-primitives';
import { STATS_PATH } from "../wire.js";
import { useAsyncResource } from "./async-resource.js";
import { DateRangePicker } from "./DateRangePicker.js";
import { shiftedDayKey } from "./day.js";
import { currencyViewOf } from "./format.js";
import { MenuSelect } from "./MenuSelect.js";
import { DashboardCards } from "./DashboardCards.js";
import { OverheadRows } from "./OverheadRows.js";
import { OverviewBoard } from "./OverviewBoard.js";
import { PricingDialog } from "./PricingDialog.js";
import { PricingOverviewDialog } from "./PricingOverviewDialog.js";
import { PricingAssociationProvider } from "./PricingAssociations.js";
import { usePricingAssociationRefresh } from "./pricing-associations.js";
import { UsageRows, RowSortControl, PerfToggle } from "./UsageRows.js";
import { projectRowsOf } from "./project-rows.js";
import { useColorSchemeMirror } from "./use-color-scheme.js";
import styles from './TokenUsageSection.module.css';
/** The detail tabs' fixed sort options: projects, models and providers pick
 * between token size and billed cost; sessions add last activity. */
const PROJECT_SORT = ['tokens', 'cost'];
const MODEL_SORT = ['tokens', 'cost'];
const PROVIDER_SORT = ['tokens', 'cost'];
const SESSION_SORT = ['tokens', 'cost', 'recent'];
/** The detail switch's tab labels, one per mode. */
const DETAIL_MODES = ['project', 'model', 'session', 'provider', 'aux'];
/** One detail mode's label key. */
function detailLabelOf(mode) {
    return mode === 'project' ? 'byProject.title'
        : mode === 'model' ? 'byModel.title'
            : mode === 'session' ? 'bySession.title'
                : mode === 'provider' ? 'byProvider.title' : 'aux.tab';
}
/** Re-export so existing section tests and consumers keep importing
 * `StatCard` from this module (the file moved to `./StatCard.tsx`). */
export { StatCard } from "./StatCard.js";
// Re-exported for tests and sibling consumers; the implementations live in
// the leaf modules (day / format) so the chart can share them without a cycle.
export { totalTokens } from "./day.js";
export { formatTokens, formatHitRate } from "./format.js";
/** Fetch the summary for one query string; the caller owns the failure
 * presentation. The AbortSignal wires into the request so a filter change
 * cancels the in-flight fetch instead of letting its response overwrite
 * the next filter's data. */
function fetchSummary(query, signal) {
    return fetch(STATS_PATH + query, { signal })
        .then(response => {
        if (!response.ok)
            throw new Error(`HTTP ${String(response.status)}`);
        return response.json();
    })
        .then(value => {
        if (typeof value !== 'object' || value === null || typeof value.total !== 'object') {
            throw new Error('unexpected stats response');
        }
        return value;
    });
}
/**
 * The query string of one filter selection ('' when unconstrained), or null
 * while the range is mid-edit (`from > to`): editing the two date inputs
 * one at a time passes through inverted ranges, and fetching those would
 * only flash an HTTP 400 — the request waits until the range settles.
 */
function filterQuery(filters) {
    if (filters.from !== '' && filters.to !== '' && filters.from > filters.to)
        return null;
    const params = new URLSearchParams();
    if (filters.from !== '')
        params.set('from', filters.from);
    if (filters.to !== '')
        params.set('to', filters.to);
    if (filters.model !== '')
        params.set('model', filters.model);
    return Array.from(params).length > 0 ? `?${params.toString()}` : '';
}
/** The day keys of one quick range: today minus (days - 1) through today. */
function quickRange(days) {
    return { from: shiftedDayKey(-(days - 1)), to: shiftedDayKey(0) };
}
/** Whether the filters exactly hold one quick range. */
function isQuickActive(days, filters) {
    const range = quickRange(days);
    return filters.from === range.from && filters.to === range.to;
}
/** Quick-range menu entries (labels are locale-free day counts). */
const QUICK_OPTIONS = [
    { value: '1', label: '1d' },
    { value: '7', label: '7d' },
    { value: '30', label: '30d' },
];
/** The filter bar: quick range menu, day-range picker popover, model
 * menu — one row, one popover language. The row's tail link is an action,
 * not a selector: it opens the filter-free pricing overview. */
function FilterBar({ filters, models, onChange, onPricingTable, t }) {
    // 'all' when the range is unconstrained, 'custom' when it no longer
    // holds one of the quick ranges.
    const quickValue = QUICK_OPTIONS.find(option => isQuickActive(Number(option.value), filters))?.value
        ?? (filters.from === '' && filters.to === '' ? 'all' : 'custom');
    return (_jsxs("div", { className: styles['filters'], children: [_jsx(MenuSelect, { ariaLabel: t('filter.quickRange'), value: quickValue, options: [
                    ...QUICK_OPTIONS,
                    { value: 'all', label: t('filter.allDates') },
                    { value: 'custom', label: t('filter.custom') },
                ], onChange: value => {
                    // 'all' releases the range back to unconstrained; the 'custom'
                    // entry is informational: it mirrors the day range and never
                    // rewrites it.
                    if (value === 'all')
                        onChange({ ...filters, from: '', to: '' });
                    const days = Number(value);
                    if (days > 0)
                        onChange({ ...filters, ...quickRange(days) });
                } }), _jsx(DateRangePicker, { from: filters.from, to: filters.to, onChange: next => onChange({ ...filters, ...next }), t: t }), _jsx(MenuSelect, { ariaLabel: t('filter.model'), grow: true, value: filters.model, options: [{ value: '', label: t('filter.allModels') }, ...models.map(model => ({ value: model, label: model }))], onChange: model => onChange({ ...filters, model }) }), _jsx("button", { type: "button", "data-pricing-overview-trigger": true, className: styles['pricingLink'], onClick: onPricingTable, children: t('pricing.table') })] }));
}
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
export function TokenUsageSection({ t, close, sessionListed, openSession, variant }) {
    const rootClass = variant === 'page' ? `${styles['section']} ${styles['pageVariant']}` : styles['section'];
    const rootRef = useRef(null);
    useColorSchemeMirror(rootRef);
    const [toastText, setToastText] = useState(null);
    const [toastSeq, setToastSeq] = useState(0);
    const showToast = useCallback((text) => {
        setToastSeq(previous => previous + 1);
        setToastText(text);
    }, []);
    const dismissToast = useCallback(() => {
        setToastText(null);
    }, []);
    const handleOpenSession = useCallback((id) => {
        if (!openSession)
            return;
        const result = openSession(id);
        if (result && typeof result === 'object' && 'ok' in result) {
            if (result.ok) {
                close?.();
            }
            else if (result.reason === 'workspaceDeleted') {
                showToast(t('session.workspaceDeleted'));
            }
            return;
        }
        if (result === true) {
            close?.();
        }
    }, [openSession, close, showToast, t]);
    // Entering the page starts on today's window (the 1d quick range).
    const [filters, setFilters] = useState(() => ({ model: '', ...quickRange(1) }));
    // The detail-table block's mode: by project (default — the dashboards'
    // first tab), by model, by session, by provider, or the runtime-overhead
    // breakdown of the auxiliary (bypass) model requests. Pure presentation
    // state — every row set arrives on the SAME summary response, so
    // switching never refetches (session-local, not persisted, the usage
    // tab's scope-switch tradeoff).
    const [detailMode, setDetailMode] = useState('project');
    // The lists' sorts, each its own state (the page's cards and the panel's
    // tabs render the same lists, so one state drives both): projects,
    // models and providers pick token size vs billed cost, sessions add last
    // activity. A pick matching the native order passes it straight through.
    const [projectSort, setProjectSort] = useState('tokens');
    const [modelSort, setModelSort] = useState('tokens');
    // The models' performance view — a content switch next to the sort
    // control (shared by the page card and the panel tab, like the sorts).
    const [modelPerfView, setModelPerfView] = useState(false);
    const [providerSort, setProviderSort] = useState('tokens');
    const [sessionSort, setSessionSort] = useState('cost');
    // Ctrl+click on a model row toggles the model filter to just that model
    // (a single pick — clicking the filtered model again clears it).
    const handleToggleModel = useCallback((model) => {
        setFilters(previous => ({ ...previous, model: previous.model === model ? '' : model }));
    }, []);
    // The overhead pill's destination: the page scrolls to (and flashes) the
    // dashboard's overhead card; the panel switches to the overhead tab.
    const overheadCardRef = useRef(null);
    const [overheadFlash, setOverheadFlash] = useState(false);
    const flashTimer = useRef(undefined);
    useEffect(() => () => window.clearTimeout(flashTimer.current), []);
    const activateOverhead = useCallback(() => {
        if (variant === 'page') {
            overheadCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setOverheadFlash(true);
            window.clearTimeout(flashTimer.current);
            flashTimer.current = window.setTimeout(() => setOverheadFlash(false), 1200);
        }
        else {
            setDetailMode('aux');
        }
    }, [variant]);
    const [models, setModels] = useState([]);
    // The model whose pricing dialog is open (null = none). Refetched
    // summaries keep the dialog's rules in sync with the latest pricing.
    const [detailModel, setDetailModel] = useState(null);
    // The pricing-overview dialog (opened by the filter row's tail link).
    // `usedSnapshot` is taken at open time: the modal's backdrop covers the
    // filter row, so the filters cannot change while it is open and the
    // snapshot stays stable for the whole dialog session. The link renders
    // only in the ready branch, so the summary is always at hand here.
    const [pricingTableOpen, setPricingTableOpen] = useState(false);
    const [usedSnapshot, setUsedSnapshot] = useState(() => new Set());
    const [retryToken, setRetryToken] = useState(0);
    const lastSummary = useRef(null);
    const retry = useCallback(() => { setRetryToken(previous => previous + 1); }, []);
    usePricingAssociationRefresh(retry);
    const query = filterQuery(filters);
    // A mid-edit inverted range (`query === null`) is fed to the hook as the
    // last valid query — the ref remembers the most recent non-null string
    // and stays stable while the user types a bad range, so the hook does
    // neither fire a fetch nor flash its loading state. The test pins this
    // contract: bad ranges must not produce a network round-trip.
    const lastValidQueryRef = useRef(query ?? '');
    if (query !== null)
        lastValidQueryRef.current = query;
    const fetchQuery = query ?? lastValidQueryRef.current;
    const [state] = useAsyncResource(signal => fetchSummary(fetchQuery, signal), [fetchQuery, retryToken], { silentAfterFirst: false, retryToken });
    // While every model is shown, keep the option list from collapsing to
    // the filtered selection. The side effect runs when the ready-state
    // summary lands, not on every render.
    useEffect(() => {
        if (state.status !== 'ready')
            return;
        if (filters.model !== '')
            return;
        const next = state.value.byModel.map(row => row.model);
        if (next.length === models.length && next.every((m, i) => m === models[i]))
            return;
        setModels(next);
    }, [state, filters.model, models]);
    if (state.status === 'ready')
        lastSummary.current = state.value;
    const retainedView = lastSummary.current !== null ? currencyViewOf(lastSummary.current) : { symbol: '￥', rate: 1 };
    const pricingOverview = pricingTableOpen ? _jsx(PricingOverviewDialog, { usedModels: usedSnapshot, view: retainedView, onClose: () => setPricingTableOpen(false), t: t }) : null;
    if (state.status === 'loading') {
        return (_jsx("div", { ref: rootRef, className: rootClass, children: _jsxs(PricingAssociationProvider, { resolutions: lastSummary.current?.modelResolutions, feedVersion: lastSummary.current?.feedVersion, view: retainedView, t: t, children: [pricingOverview, _jsx("h2", { className: styles['title'], children: t('nav.label') }), _jsx("p", { className: styles['muted'], children: t('loading') })] }) }));
    }
    if (state.status === 'error') {
        return (_jsx("div", { ref: rootRef, className: rootClass, children: _jsxs(PricingAssociationProvider, { resolutions: lastSummary.current?.modelResolutions, feedVersion: lastSummary.current?.feedVersion, view: retainedView, t: t, children: [pricingOverview, _jsxs("div", { className: styles['head'], children: [_jsx("h2", { className: styles['title'], children: t('nav.label') }), _jsx("button", { type: "button", className: styles['button'], onClick: retry, children: t('retry') })] }), _jsx("p", { className: styles['error'], children: t('loadFailed', { message: state.message }) })] }) }));
    }
    const { total } = state.value;
    const view = currencyViewOf(state.value);
    // New hosts aggregate before the session top-N cut. Older payloads retain
    // the former client-side fold as a compatibility fallback only.
    const projectRows = state.value.projectRows ?? projectRowsOf(state.value.sessionRows ?? []);
    // The auxiliary (bypass) request count: the runtime-overhead tab is part of
    // the detail switch whenever any dimension has rows, and the tab content
    // renders its own empty hint when this stays 0 (or an older host payload
    // carries no auxiliary layer at all).
    const auxRequests = state.value.aux?.total.requests ?? 0;
    return (_jsx("div", { ref: rootRef, className: rootClass, children: _jsxs(PricingAssociationProvider, { resolutions: state.value.modelResolutions, feedVersion: state.value.feedVersion, view: view, t: t, children: [pricingOverview, _jsx("h2", { className: styles['title'], children: t('nav.label') }), _jsx("p", { className: styles['muted'], children: t('dataDir', { path: state.value.dataDir }) }), _jsx(FilterBar, { filters: filters, models: models, onChange: setFilters, onPricingTable: () => {
                        setUsedSnapshot(new Set(state.value.byModel.map(row => row.model)));
                        setPricingTableOpen(true);
                    }, t: t }), total.requests === 0 && (total.failures ?? 0) === 0
                    ? (
                    // One hint covers both an empty log and an empty filtered window:
                    // the page opens on today (1d), so the two are indistinguishable
                    // from the filtered response alone. The pricing block follows the
                    // filter selection, so an empty selection renders none of it.
                    _jsx("p", { className: styles['empty'], children: t('empty') }))
                    : (_jsxs(_Fragment, { children: [_jsx(OverviewBoard, { total: total, totalCost: state.value.totalCost, costState: state.value.costState, pricingUnavailableReason: state.value.pricingUnavailableReason, associationStorageError: state.value.associationStorageError, aux: state.value.aux, byDay: state.value.byDay, byHour: state.value.byHour, from: filters.from, to: filters.to, onOverheadActivate: activateOverhead, ...variant === 'page' ? {} : { compact: true }, view: view, t: t }), variant === 'page'
                                ? (
                                // The main page's dashboard: the four equal-height cards,
                                // no dimension switch — everything is on show at once.
                                _jsx(DashboardCards, { projectRows: projectRows, modelRows: state.value.byModel, sessionRows: state.value.sessionRows ?? [], projectSort: projectSort, onProjectSortChange: setProjectSort, modelSort: modelSort, onModelSortChange: setModelSort, modelPerfView: modelPerfView, onModelPerfToggle: setModelPerfView, providerRows: state.value.byProvider ?? [], providerNames: state.value.providerNames, providerSort: providerSort, onProviderSortChange: setProviderSort, sessionSort: sessionSort, onSessionSortChange: setSessionSort, aux: state.value.aux, pricing: state.value.pricing, costState: state.value.costState, view: view, t: t, ...sessionListed !== undefined && openSession !== undefined
                                        ? { sessionListed, onSessionOpen: handleOpenSession }
                                        : {}, onToggleModel: handleToggleModel, onModelName: setDetailModel, overheadCardRef: overheadCardRef, overheadFlash: overheadFlash }))
                                : state.value.byModel.length > 0 || (state.value.sessionRows?.length ?? 0) > 0 || auxRequests > 0
                                    ? (_jsxs("section", { className: styles['detailPanel'], children: [_jsxs("div", { className: styles['detailToolbar'], children: [_jsx("div", { className: styles['segmented'], role: "group", "aria-label": t('detail.switch.label'), children: DETAIL_MODES.map(mode => (_jsx("button", { type: "button", className: detailMode === mode ? `${styles['segBtn']} ${styles['segActive']}` : styles['segBtn'], "aria-pressed": detailMode === mode, onClick: () => setDetailMode(mode), children: t(detailLabelOf(mode)) }, mode))) }), detailMode !== 'aux' && (_jsxs("div", { className: styles['sortRow'], children: [_jsx("span", { className: detailMode === 'model' && modelPerfView ? styles['sortHidden'] : undefined, children: _jsx(RowSortControl, { compact: true, value: detailMode === 'project' ? projectSort : detailMode === 'model' ? modelSort : detailMode === 'provider' ? providerSort : sessionSort, options: detailMode === 'project' ? PROJECT_SORT : detailMode === 'model' ? MODEL_SORT : detailMode === 'provider' ? PROVIDER_SORT : SESSION_SORT, onChange: detailMode === 'project' ? setProjectSort : detailMode === 'model' ? setModelSort : detailMode === 'provider' ? setProviderSort : setSessionSort, ariaLabel: t(detailLabelOf(detailMode)), t: t }) }), detailMode === 'model' && _jsx(PerfToggle, { compact: true, pressed: modelPerfView, onToggle: setModelPerfView, t: t })] }))] }), _jsx("div", { className: styles['detailBody'], children: detailMode === 'aux'
                                                    ? _jsx(OverheadRows, { aux: state.value.aux, costState: state.value.costState, view: view, t: t })
                                                    : _jsx(UsageRows, { kind: detailMode, projectRows: projectRows, modelRows: state.value.byModel, sessionRows: state.value.sessionRows ?? [], providerRows: state.value.byProvider ?? [], providerNames: state.value.providerNames, sort: detailMode === 'project' ? projectSort : detailMode === 'model' ? modelSort : detailMode === 'provider' ? providerSort : sessionSort, perfView: detailMode === 'model' && modelPerfView, pricing: state.value.pricing, costState: state.value.costState, view: view, t: t, onToggleModel: handleToggleModel, onModelName: setDetailModel, ...sessionListed !== undefined && openSession !== undefined
                                                            ? { sessionListed, onSessionOpen: handleOpenSession }
                                                            : {} }, detailMode) })] }))
                                    : null, detailModel !== null && state.value.pricing[detailModel] !== undefined
                                ? (_jsx(PricingDialog, { model: detailModel, rules: state.value.pricing[detailModel], view: view, onClose: () => setDetailModel(null), t: t }))
                                : null] })), toastText !== null && (_jsx(Toast, { text: toastText, icon: _jsx(IconWarningOutlineRegular, {}), onDone: dismissToast }, toastSeq))] }) }));
}
//# sourceMappingURL=TokenUsageSection.js.map