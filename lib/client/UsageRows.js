import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import { MIN_PERF_SAMPLES } from "../wire.js";
import { costsAvailable } from "./PricingStatus.js";
import { dayKeyOf, totalTokens } from "./day.js";
import { formatCost, formatSpeed, formatTokens, formatTtft, hitRateDisplay, providerLabel } from "./format.js";
import { ModelAssociationBadge, UnpricedModelTag } from "./PricingAssociations.js";
import { dirTailOf } from "./project-rows.js";
import styles from './UsageRows.module.css';
/** The label of one sort pick. */
function sortLabelOf(sort, t) {
    return sort === 'tokens' ? t('sort.tokens') : sort === 'cost' ? t('stat.cost') : t('session.lastActive');
}
/** Sort toggle rendered in a card head / above a tab's list. Controlled —
 * the section owns the state, so the page and the panel keep independent
 * picks. */
export function RowSortControl({ value, options, onChange, ariaLabel, t, compact = false }) {
    return (_jsx("div", { className: compact ? `${styles['segmented']} ${styles['controlCompact']}` : styles['segmented'], role: "group", "aria-label": ariaLabel, children: options.map(option => (_jsx("button", { type: "button", className: value === option ? `${styles['segBtn']} ${styles['segActive']}` : styles['segBtn'], "aria-pressed": value === option, onClick: () => onChange(option), children: sortLabelOf(option, t) }, option))) }));
}
/** The performance view toggle (model card head): a view switch, not a
 * third sort pick — pressed, the card shows the speed rows and the sort
 * control yields (the performance order is its own definition: ranked
 * rows by mean speed, the dimmed ones sunk; there is no second way to
 * order them). */
export function PerfToggle({ pressed, onToggle, t, compact = false }) {
    return (_jsxs("button", { type: "button", className: [styles['perfToggle'], pressed ? styles['perfOn'] : '', compact ? styles['perfCompact'] : ''].filter(Boolean).join(' '), "aria-pressed": pressed, "aria-label": t('perf.toggle'), onClick: () => onToggle(!pressed), children: [_jsx("span", { className: styles['perfGauge'], "aria-hidden": true, children: "\u25F7" }), t('perf.toggle')] }));
}
/** Whether Ctrl (or ⌘) is held right now: the jump affordances exist only
 * while it is, so plain clicks keep the rows inert. `blur` resets — a focus
 * loss can swallow the keyup and strand the state on. */
function useCtrlHeld() {
    const [ctrlHeld, setCtrlHeld] = useState(false);
    useEffect(() => {
        const down = (event) => { if (event.key === 'Control' || event.key === 'Meta')
            setCtrlHeld(true); };
        const up = (event) => { if (event.key === 'Control' || event.key === 'Meta')
            setCtrlHeld(false); };
        const move = (event) => {
            const active = event.ctrlKey || event.metaKey;
            setCtrlHeld(previous => (previous === active ? previous : active));
        };
        const blur = () => setCtrlHeld(false);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('mousemove', move);
        window.addEventListener('blur', blur);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('mousemove', move);
            window.removeEventListener('blur', blur);
        };
    }, []);
    return ctrlHeld;
}
/** A short session-id fallback: the leading chunk is usually enough to
 * tell sessions apart when no title ever landed. */
function shortIdOf(sessionId) {
    return sessionId.length > 8 ? `${sessionId.slice(0, 8)}…` : sessionId;
}
/** The unattributed row's hover tooltip: an intro line, then the known
 * reasons a record can carry no route key as a numbered list, each line
 * indented by two spaces (the bubble renders `pre`, so the indent shows).
 * The list is the full closed set — deleted logs, pre-field history, and
 * bypass calls the host never gives a route key — so the reader sees this
 * row is expected, not a bug. */
function unattributedTooltip(t) {
    const causes = [
        t('byProvider.cause.deletedLog'),
        t('byProvider.cause.preField'),
        t('byProvider.cause.bypass'),
    ];
    return [t('byProvider.cause.intro'), ...causes.map((cause, index) => `  ${index + 1}. ${cause}`)].join('\n');
}
/** Relative last-active label (「3 小时前」): minutes inside the first hour,
 * hours inside the first day, days beyond. */
function relativeTimeOf(time, t) {
    const minutes = Math.max(1, Math.floor((Date.now() - time) / 60_000));
    if (minutes < 60)
        return t('time.minutesAgo', { count: String(minutes) });
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return t('time.hoursAgo', { count: String(hours) });
    return t('time.daysAgo', { count: String(Math.floor(hours / 24)) });
}
/**
 * Render one flat row list. The list is the height-capped scroll container
 * (scrollbar appears while scrolling, fades 800ms after it stops).
 */
export function UsageRows({ kind, projectRows, modelRows, sessionRows, providerRows, providerNames, sort, perfView, pricing, costState, view, t, sessionListed, onSessionOpen, onToggleModel, onModelName, }) {
    const ctrlHeld = useCtrlHeld();
    // Scrollbar fade: add the class on scroll, drop it 800ms after the last
    // event; the timer dies with the component.
    const scrollRef = useRef(null);
    const scrollTimer = useRef(undefined);
    useEffect(() => () => window.clearTimeout(scrollTimer.current), []);
    const handleScroll = () => {
        const box = scrollRef.current;
        const cls = styles['scrolling'];
        if (box === null || cls === undefined)
            return;
        box.classList.add(cls);
        window.clearTimeout(scrollTimer.current);
        scrollTimer.current = window.setTimeout(() => {
            box.classList.remove(cls);
        }, 800);
    };
    // The rendered set for this kind under the active pick. Straight-through
    // where the native order already matches (projects ship tokens-desc,
    // sessions cost-desc); models always re-sort (they arrive request-count
    // descending), ties broken by name for a stable order. The performance
    // view replaces the pick entirely — its order is speed-fixed.
    const perfMode = perfView === true && kind === 'model';
    const active = sort ?? (kind === 'session' ? 'cost' : 'tokens');
    const rows = useMemo(() => {
        const base = kind === 'project' ? projectRows : kind === 'model' ? modelRows : kind === 'session' ? sessionRows : providerRows;
        if (base === undefined)
            return [];
        if (kind === 'session') {
            if (active === 'cost')
                return base;
            const sessions = [...base];
            return sessions.sort(active === 'recent'
                ? (left, right) => right.lastTime - left.lastTime || (left.sessionId < right.sessionId ? -1 : 1)
                : (left, right) => totalTokens(right.totals) - totalTokens(left.totals) || (left.sessionId < right.sessionId ? -1 : 1));
        }
        if (kind === 'project') {
            if (active === 'tokens')
                return base;
            return [...base].sort((left, right) => right.cost - left.cost || (left.name < right.name ? -1 : 1));
        }
        if (kind === 'provider') {
            // Providers arrive request-count descending with the unattributed
            // remainder sunk; both picks re-sort by their own measure and keep
            // that sink — the remainder is a reconciliation row, not a provider.
            const unattributedLast = (row) => row.provider === '' ? 1 : 0;
            return [...base].sort((left, right) => unattributedLast(left) - unattributedLast(right)
                || (active === 'cost'
                    ? right.cost - left.cost
                    : totalTokens(right.totals) - totalTokens(left.totals))
                || (left.provider < right.provider ? -1 : 1));
        }
        const models = [...base];
        if (perfMode) {
            // Speed ranking over the streaming samples. A row without enough
            // samples (or any timing) cannot rank honestly, so it sinks below
            // the ranked ones, name-ordered — the same rows drop their bar.
            const ranked = (row) => row.perf !== undefined && row.perf.samples >= MIN_PERF_SAMPLES;
            return models.sort((left, right) => {
                const leftRanked = ranked(left);
                const rightRanked = ranked(right);
                if (leftRanked !== rightRanked)
                    return leftRanked ? -1 : 1;
                if (leftRanked && rightRanked) {
                    return right.perf.tokensPerSec - left.perf.tokensPerSec || (left.model < right.model ? -1 : 1);
                }
                return left.model < right.model ? -1 : 1;
            });
        }
        return models.sort(active === 'tokens'
            ? (left, right) => totalTokens(right.totals) - totalTokens(left.totals) || (left.model < right.model ? -1 : 1)
            : (left, right) => right.cost - left.cost || (left.model < right.model ? -1 : 1));
    }, [kind, projectRows, modelRows, sessionRows, providerRows, active, perfMode]);
    // The bar scale: the tallest row of the *rendered* set is 100%,
    // measured in the active unit — a cost-sorted list bars by cost, the
    // performance view by mean speed (ranked rows only: the dimmed
    // low-sample rows drop their bar and must not stretch the scale), or
    // the bars would contradict the order they sit in. Zero renders
    // zero-width bars (never NaN). The provider list follows the same
    // rule for its unattributed remainder: it is the difference between
    // the named routes and the top line, not a route — it drops its bar
    // and must not stretch the scale the named routes are drawn against.
    const barValueOf = (row) => perfMode ? ('perf' in row && row.perf !== undefined && row.perf.samples >= MIN_PERF_SAMPLES ? row.perf.tokensPerSec : 0)
        : kind === 'provider' && row.provider === '' ? 0
            : active === 'cost' ? row.cost
                : totalTokens(row.totals);
    const barMax = useMemo(() => {
        let max = 0;
        for (const row of rows) {
            const value = barValueOf(row);
            if (value > max)
                max = value;
        }
        return max;
    }, [rows, active]);
    const costText = (cost) => costsAvailable(costState) ? formatCost(cost, view) : '—';
    /** The figures cell: total tokens · cache share, right-aligned in its
     * fixed column. No hover affordance — the user read the popup as
     * clutter on every list, so the cell is plain. */
    const numsCell = (totals) => {
        const hit = hitRateDisplay(totals);
        return (_jsxs("span", { className: styles['rowNums'], children: [formatTokens(totalTokens(totals)), ' · ', t('stat.cacheRead'), ' ', hit.text] }));
    };
    /** The performance figures cell: mean speed (bold) · first token · mean
     * request latency · timed request count over one compact line, the grammar
     * every figures cell reads. Below the streaming-sample threshold the
     * cell dims to speed + 「样本不足」, and no timing at all renders its
     * own dim label. Untimed requests never count as performance samples.
     * No hover affordance. */
    const perfCell = (perf) => {
        const count = t('perf.requestCount', { count: String(perf?.timedRequests ?? 0) });
        if (perf === undefined) {
            return _jsxs("span", { className: `${styles['perfNums']} ${styles['perfDim']}`, children: [t('perf.noTiming'), " \u00B7 ", count] });
        }
        const speed = `${formatSpeed(perf.tokensPerSec)} tok/s`;
        if (perf.samples < MIN_PERF_SAMPLES) {
            return (_jsxs("span", { className: `${styles['perfNums']} ${styles['perfDim']}`, children: [_jsx("b", { children: speed }), ' · ', t('perf.lowSamples'), ' · ', count] }));
        }
        return (_jsxs("span", { className: styles['perfNums'], children: [_jsx("b", { children: speed }), ' · ', t('perf.first'), ' ', formatTtft(perf.firstTokenMs), ' · ', t('perf.avgLatency'), ' ', formatTtft(perf.latencyMs), ' · ', count] }));
    };
    const ariaLabel = kind === 'project' ? t('byProject.title')
        : kind === 'model' ? t('byModel.title')
            : kind === 'session' ? t('bySession.title') : t('byProvider.title');
    return (_jsx("div", { className: styles['rows'], ref: scrollRef, onScroll: handleScroll, role: "list", "aria-label": ariaLabel, children: rows.length === 0
            ? _jsx("div", { className: styles['empty'], children: t('chart.empty') })
            : rows.map(row => {
                if (kind === 'project') {
                    const project = row;
                    return (_jsxs("div", { className: styles['row'], role: "listitem", children: [_jsx("span", { className: styles['rowName'], title: project.cwd ?? project.name, children: project.name === '' ? t('session.untitledDir') : project.name }), _jsx("span", { className: styles['track'], children: barMax > 0
                                    ? (_jsx("span", { className: styles['fill'], style: { width: `${(barValueOf(project) / barMax) * 100}%` } }))
                                    : null }), numsCell(project.totals), _jsx("span", { className: styles['rowCost'], children: costText(project.cost) })] }, project.name === '' ? '\u0000' : project.name));
                }
                if (kind === 'model') {
                    const model = row;
                    const rules = pricing?.[model.model];
                    const filterJump = ctrlHeld && onToggleModel !== undefined;
                    // Under the performance view a row that cannot rank honestly
                    // (too few streaming samples, or no timing) drops its bar and
                    // lets the name take the width.
                    const perfRanked = model.perf !== undefined && model.perf.samples >= MIN_PERF_SAMPLES;
                    return (_jsxs("div", { className: styles['row'], role: "listitem", children: [_jsx("span", { className: perfMode && !perfRanked ? `${styles['rowName']} ${styles['nameGrow']}` : styles['rowName'], children: _jsxs("span", { className: styles['nameLine'], children: [rules !== undefined
                                            ? (
                                            // Same affordance as the per-model table: the
                                            // name opens the price dialog — unless Ctrl is
                                            // held, when it toggles the model filter instead.
                                            _jsx("button", { type: "button", className: filterJump ? `${styles['nameText']} ${styles['jumpable']}` : styles['nameText'], title: filterJump ? t('model.ctrlHint') : undefined, "aria-label": filterJump ? t('model.ctrlHint') : t('pricing.view', { model: model.model }), onClick: filterJump
                                                    ? event => {
                                                        event.preventDefault();
                                                        onToggleModel?.(model.model);
                                                    }
                                                    : () => onModelName?.(model.model), children: model.model }))
                                            : _jsx("span", { className: styles['nameText'], children: model.model }), rules !== undefined ? null : _jsx(UnpricedModelTag, { model: model.model, t: t }), _jsx(ModelAssociationBadge, { model: model.model, t: t })] }) }), perfMode
                                ? (perfRanked
                                    ? (_jsx("span", { className: styles['track'], children: barMax > 0
                                            ? (_jsx("span", { className: styles['fill'], style: { width: `${(barValueOf(model) / barMax) * 100}%` } }))
                                            : null }))
                                    : null)
                                : (_jsx("span", { className: styles['track'], children: barMax > 0
                                        ? (_jsx("span", { className: styles['fill'], style: { width: `${(barValueOf(model) / barMax) * 100}%` } }))
                                        : null })), perfMode ? perfCell(model.perf) : numsCell(model.totals), perfMode
                                ? null
                                : _jsx("span", { className: styles['rowCost'], children: rules !== undefined ? costText(model.cost) : '—' })] }, model.model));
                }
                if (kind === 'provider') {
                    const provider = row;
                    const unattributed = provider.provider === '';
                    return (_jsxs("div", { className: styles['row'], role: "listitem", children: [_jsx("span", { className: unattributed ? `${styles['rowName']} ${styles['nameDim']}` : styles['rowName'], title: unattributed ? undefined : provider.provider, children: _jsx("span", { className: styles['nameLine'], children: unattributed
                                        ? (_jsx("span", { className: styles['hintWrap'], children: _jsx(Tooltip, { label: unattributedTooltip(t), side: "bottom", delayMs: 100, children: _jsxs("span", { className: styles['nameText'], "aria-label": t('byProvider.unattributed'), tabIndex: 0, children: [t('byProvider.unattributed'), _jsx("span", { className: styles['nameHint'], "aria-hidden": true, children: "?" })] }) }) }))
                                        : _jsx("span", { className: styles['nameText'], children: providerLabel(provider.provider, providerNames) }) }) }), _jsx("span", { className: styles['track'], children: barMax > 0
                                    ? (_jsx("span", { className: styles['fill'], style: { width: `${(barValueOf(provider) / barMax) * 100}%` } }))
                                    : null }), numsCell(provider.totals), _jsx("span", { className: styles['rowCost'], children: costText(provider.cost) })] }, unattributed ? '\u0000' : provider.provider));
                }
                const session = row;
                // A session row is jumpable when the controller lists it; the
                // click re-checks through onSessionOpen (the list may have moved
                // between hover and click).
                const jump = ctrlHeld && sessionListed !== undefined && onSessionOpen !== undefined && sessionListed(session.sessionId);
                return (_jsxs("div", { className: `${styles['row']} ${styles['srow']}`, role: "listitem", children: [_jsxs("div", { className: styles['rowTop'], children: [_jsx("span", { className: styles['rowName'], children: _jsxs("span", { className: styles['nameLine'], children: [_jsx("button", { type: "button", className: jump ? `${styles['nameText']} ${styles['jumpable']}` : styles['nameText'], title: jump ? t('session.openHint') : undefined, onClick: jump || (ctrlHeld && onSessionOpen !== undefined)
                                                    ? event => {
                                                        event.preventDefault();
                                                        onSessionOpen?.(session.sessionId);
                                                    }
                                                    : undefined, children: session.title !== undefined
                                                    ? session.title
                                                    : `${shortIdOf(session.sessionId)} · ${dayKeyOf(new Date(session.firstTime))} – ${dayKeyOf(new Date(session.lastTime))}` }), session.childCount !== undefined && session.childCount > 0
                                                ? (_jsx("span", { className: styles['badge'], "aria-label": t('view.subagents.nested', { count: String(session.childCount) }), children: t('view.subagents.nested', { count: String(session.childCount) }) }))
                                                : null] }) }), numsCell(session.totals), _jsx("span", { className: styles['rowCost'], children: costText(session.cost) })] }), _jsxs("div", { className: styles['rowSub'], children: [session.cwd === undefined ? t('session.untitledDir') : dirTailOf(session.cwd), ' · ', relativeTimeOf(session.lastTime, t)] })] }, session.sessionId));
            }) }));
}
//# sourceMappingURL=UsageRows.js.map