import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useEffect, useRef } from 'react';
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import { bandOf, formatCost, formatRequestRate, formatRequestRateExact, formatTimeOfDay, formatTokens, formatTtft } from "./format.js";
import { bandClassOf } from "./HitRateText.js";
import styles from './UsageView.module.css';
/** The state pill's color class (state is never color-only — the label text
 * and the metrics columns carry the same facts). */
function stateClassOf(state) {
    switch (state) {
        case 'failed': return styles['stateFailed'] ?? '';
        case 'cancelled':
        case 'interrupted':
        case 'waiting': return styles['statePending'] ?? '';
        case 'streaming': return styles['stateStreaming'] ?? '';
        default: return styles['stateDone'] ?? '';
    }
}
/** Numeric colour follows the summary cards, independently of label eligibility. */
function hitClassOf(cache) {
    if (cache.rate === undefined)
        return styles['zeroDim'] ?? '';
    return bandClassOf(bandOf(cache.rate));
}
/** The hit cell's tooltip: the low-hit explanation (with the raw-precision
 * note when rounding would hide a sub-threshold rate) or the exclusion
 * reason. Unknown figures explain their unknown instead of going silent.
 * The compaction attribution (when the row carries one) rides the same
 * tooltip as its closing section — real-world feedback dropped the standalone
 * badge as redundant next to the 缓存过低 marker, and the causal chain reads
 * exactly where the rate is questioned. The wording says the prefix WAS
 * rewritten and cache behaviour MAY be affected — never that compaction
 * caused a cache loss, because a high-hit row can carry the same attribution
 * (the miss severity depends on the earliest rewritten position, which the
 * plugin cannot see). */
function hitTooltipOf(cache, t, attribution) {
    const lines = [];
    if (cache.rate === undefined) {
        if (cache.reason !== undefined)
            lines.push(t(`pool.excluded.${cache.reason}`));
    }
    else {
        const display = formatRequestRate(cache.rate);
        if (cache.band === 'loss') {
            lines.push(t('pool.cache.tooltip', { rate: display }));
            // Show raw precision when rounding hides why the loss label applies.
            if (Number.parseFloat(display) >= 50) {
                lines.push(t('pool.cache.roundedDown', { rate: formatRequestRateExact(cache.rate) }));
            }
        }
        else if (cache.reason !== undefined) {
            lines.push(t(`pool.excluded.${cache.reason}`));
        }
    }
    if (attribution !== undefined) {
        lines.push(t('pool.attribution.prefix'));
        for (const item of attribution) {
            lines.push(item.kind === 'prune'
                ? t('pool.attribution.prune', { count: String(item.count), tokens: formatTokens(item.shadowedTokenCount) })
                : t('pool.attribution.summary', { tokens: formatTokens(item.shadowedTokenCount) }));
        }
    }
    return lines.join('\n');
}
/** The hit cell keeps request precision, shared numeric colours, and its explanation. */
function HitCell({ cache, attribution, t }) {
    const text = formatRequestRate(cache.rate);
    const tooltip = hitTooltipOf(cache, t, attribution);
    const content = _jsx("span", { className: hitClassOf(cache), children: text });
    return tooltip === ''
        ? content
        : _jsx(Tooltip, { label: tooltip, side: "top", delayMs: 100, children: _jsx("span", { tabIndex: 0, children: content }) });
}
/** The model + kind-badge pair as one non-breaking inline group: the model
 * name compresses first, the kind badge (auxiliary subtype or compaction)
 * never wraps onto its own line. Kind is always the model cell's badge —
 * the origin column states only whose session issued the request. */
function ModelCell({ detail, cache, t }) {
    const rawModel = detail.responseModel ?? detail.requestedModel;
    const model = detail.modelId ?? rawModel;
    const modelTooltip = model !== rawModel
        ? `${rawModel} → ${model}`
        : detail.responseModel !== undefined && detail.responseModel !== detail.requestedModel
            ? `${detail.requestedModel} → ${detail.responseModel}`
            : model;
    const name = (_jsx(Tooltip, { label: modelTooltip, side: "top", delayMs: 100, children: _jsx("span", { className: styles['modelName'], tabIndex: 0, children: model }) }));
    const kindLabel = detail.kind === 'aux' && detail.auxKind !== undefined
        ? t(`pool.kind.${detail.auxKind}`)
        : detail.kind === 'compaction'
            ? t('pool.kind.compaction')
            : undefined;
    // No attribution badge of its own: the rewrite's causal chain lives in the
    // hit cell's tooltip (real-world feedback found a standalone pill redundant
    // next to the 缓存过低 marker). The loss marker shares the same tooltip, so
    // it explains the attribution too.
    if (cache.band !== 'loss') {
        return _jsxs("span", { className: styles['modelInline'], children: [name, kindLabel !== undefined && _jsx("span", { className: styles['auxKind'], "aria-label": kindLabel, children: kindLabel })] });
    }
    return (_jsxs("span", { className: styles['modelInline'], children: [name, kindLabel !== undefined && _jsx("span", { className: styles['auxKind'], "aria-label": kindLabel, children: kindLabel }), _jsx(Tooltip, { label: hitTooltipOf(cache, t, detail.compactionAttribution), side: "top", delayMs: 100, children: _jsxs("span", { className: styles['cacheLoss'], tabIndex: 0, children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("path", { d: "m10.3 3.8-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.2l-8-14a2 2 0 0 0-3.4 0Z" }), _jsx("path", { d: "M12 9v4m0 4h.01" })] }), t('pool.cache.label')] }) })] }));
}
/** The status cell carries the lifecycle state only: kind is the model
 * cell's badge, origin stays in the origin column — no dimension doubles
 * as another. */
function stateTextOf(detail, t) {
    return t(`pool.state.${detail.state}`);
}
/** Latency column: settled rows show their measured latency; in-flight rows
 * show the server-anchored elapsed (已耗时); untimed rows stay —. */
function latencyTextOf(detail) {
    if (detail.state === 'waiting' || detail.state === 'streaming') {
        return detail.elapsedMs !== undefined ? formatTtft(detail.elapsedMs) : '—';
    }
    return detail.latencyMs !== undefined ? formatTtft(detail.latencyMs) : '—';
}
/** Speed column: the server's settled gate only — in-flight rows read —
 * (the lifecycle contract: no live token counts exist to average over; the
 * component double-checks the state so a stale field can never read as a
 * live speed). */
function speedTextOf(detail) {
    return detail.state === 'completed' && detail.speed !== undefined
        ? `${String(Math.round(detail.speed))} tok/s`
        : '—';
}
/** Cost column: priced figures render through the view; unpriced and
 * usage-less rows show — (never a fabricated zero). */
function costTextOf(detail, view) {
    return detail.cost !== undefined && detail.pricingStatus === 'priced' ? formatCost(detail.cost, view) : '—';
}
/** Token-bucket text: a present count formats; an absent one stays —
 * (explicit 0 is a count and renders 0). */
function tokenTextOf(value) {
    return value !== undefined ? formatTokens(value) : '—';
}
function MetricValue({ text, unit = '' }) {
    // Units stay visually quiet; the full text remains one accessible value.
    const match = text.match(/^(.*?)(tok\/s|s)$/);
    const value = match?.[1] ?? text;
    const suffix = text === '—' ? '' : match?.[2] ?? unit;
    return _jsxs("span", { children: [value, suffix !== '' && _jsx("span", { className: styles['metricUnit'], children: suffix })] });
}
/** 已结算请求自身的诊断说明：辅助请求不重复解释（紧凑标记已经说明），
 * 缓存排除与计时/用量/定价的缺口各自说明自己。 */
function diagnosticOf(detail, t) {
    if (detail.kind === 'aux')
        return '';
    if (detail.pricingStatus === 'unpriced')
        return t('pool.note.unpriced');
    if (detail.inputTokens === undefined || detail.outputTokens === undefined)
        return t('pool.note.noUsage');
    if (detail.latencyMs === undefined || detail.firstTokenLatencyMs === undefined)
        return t('pool.note.untimed');
    if (detail.cache.band === 'excluded' || detail.cache.band === 'unknown') {
        return detail.cache.reason !== undefined ? t(`pool.excluded.${detail.cache.reason}`) : '';
    }
    return '';
}
/** The panel's notice: the conversation's state first (waiting for a tool
 * result / this turn is done / retrying after a failure), then the request's
 * own lifecycle, then the settled request's diagnostic. A lower-priority
 * fact never disappears — it moves into the tooltip instead, so both stay
 * reachable. */
function noticeOf(detail, conversation, t) {
    const one = (text, tone) => ({ text, full: text, tone });
    // The request's own lifecycle note. A settled (successful) row has none.
    const own = (() => {
        switch (detail.state) {
            case 'waiting': return one(t('pool.note.waiting'), 'pending');
            case 'streaming': return one(t('pool.note.streaming'), 'pending');
            case 'cancelled': return one(t('pool.note.cancelled'), 'pending');
            case 'interrupted': return one(t('pool.note.interrupted'), 'pending');
            case 'failed': return one(t('pool.note.failed', { code: detail.failureCode ?? '' }), 'error');
            default: return undefined;
        }
    })();
    // The settled request's own diagnostic — only a successful row carries one
    // (a failed attempt explains itself in its own note).
    const diagnostic = detail.state === 'completed' ? diagnosticOf(detail, t) : '';
    // The conversation's state is the headline; everything it outranks follows
    // it into the tooltip.
    const conversationNotice = (text, tone, rest) => ({
        text,
        full: [text, rest, own?.text ?? '', diagnostic].filter(part => part !== '').join(' · '),
        tone,
    });
    if (conversation?.state === 'retrying') {
        const retry = conversation.retry;
        const count = String(retry?.count ?? 1);
        const text = retry !== undefined && retry.max > 0
            ? t('pool.note.retrying', { count, max: String(retry.max) })
            : t('pool.note.retryingAlways', { count });
        const wait = retry === undefined
            ? ''
            : t('pool.note.retryWait', {
                seconds: String(Math.max(1, Math.round(retry.delayMs / 1000))),
                code: retry.code ?? '—',
            });
        return conversationNotice(text, 'pending', wait);
    }
    if (conversation?.state === 'awaiting-tool') {
        return conversationNotice(t('pool.note.awaitingTool'), 'pending', '');
    }
    if (conversation?.state === 'turn-complete') {
        return conversationNotice(t('pool.note.turnComplete'), 'neutral', '');
    }
    if (own !== undefined) {
        return diagnostic === '' ? own : { ...own, full: `${own.full} · ${diagnostic}` };
    }
    return diagnostic === '' ? undefined : one(diagnostic, 'neutral');
}
/** Fixed-layout column floors in px, in table order (origin, state, time,
 * model, cache hit, input, output, cache read, first token, latency, speed,
 * cost): each is the smallest width that column's content ever needs, so
 * `table-layout: fixed` can treat them as true floors — the pane shares
 * whatever surplus remains equally across all columns, and once the pane
 * can no longer fit the floors the table scrolls. The optional cache-write
 * column carries its own floor. */
const POOL_COL_FLOORS = [52, 52, 64, 120, 56, 52, 52, 56, 44, 52, 72, 60];
const POOL_COL_FLOOR_CACHE_WRITE = 56;
/** One history row: the metrics stay in the visible order cache hit, input,
 * output, cache read, optional cache write, first token, latency, speed, cost.
 * Numbers right-aligned via the shared table CSS. */
function PoolRow({ detail, focusId, view, showCacheWrite, t }) {
    const origin = detail.sessionId === focusId;
    const time = detail.orderBasis === 'record'
        ? detail.recordTime ?? detail.orderAt
        : detail.startedAt ?? detail.orderAt;
    return (_jsxs("tr", { children: [_jsx("td", { "data-label": t('pool.col.origin'), className: styles['poolOrigin'], children: t(origin ? 'pool.origin.self' : 'pool.origin.child') }), _jsx("td", { "data-label": t('pool.col.state'), className: `${styles['poolState']} ${stateClassOf(detail.state)}`, children: stateTextOf(detail, t) }), _jsx("td", { "data-label": t('pool.col.time'), className: styles['poolTime'], children: _jsx("time", { dateTime: new Date(time).toISOString(), children: formatTimeOfDay(time) }) }), _jsx("td", { "data-label": t('pool.col.model'), className: styles['poolModel'], children: _jsx(ModelCell, { detail: detail, cache: detail.cache, t: t }) }), _jsx("td", { "data-label": t('pool.col.hit'), children: _jsx(HitCell, { cache: detail.cache, attribution: detail.compactionAttribution, t: t }) }), _jsx("td", { "data-label": t('pool.col.input'), title: t('pool.metric.hitInput'), children: tokenTextOf(detail.inputTokens) }), _jsx("td", { "data-label": t('pool.col.output'), children: tokenTextOf(detail.outputTokens) }), _jsx("td", { "data-label": t('pool.col.cacheRead'), children: tokenTextOf(detail.cacheReadTokens) }), showCacheWrite && _jsx("td", { "data-label": t('pool.col.cacheWrite'), children: tokenTextOf(detail.cacheWriteTokens) }), _jsx("td", { "data-label": t('pool.col.ttft'), children: detail.firstTokenLatencyMs !== undefined ? formatTtft(detail.firstTokenLatencyMs) : '—' }), _jsx("td", { "data-label": t('pool.col.latency'), children: latencyTextOf(detail) }), _jsx("td", { "data-label": t('pool.col.speed'), title: detail.state === 'waiting' || detail.state === 'streaming' ? t('pool.metric.speedSettled') : undefined, children: speedTextOf(detail) }), _jsx("td", { "data-label": t('pool.col.cost'), className: styles['costCol'], children: costTextOf(detail, view) })] }));
}
/**
 * Both request-pool sections: the latest panel and the history table. The
 * panel renders even for an empty pool (the empty prompt) — a session with
 * zero completed requests but one waiting must still show the area, with
 * the waiting row in it.
 */
export function RequestPoolSections({ details, focusId, view, staleAt, t }) {
    const { items, limit, activeCount } = details;
    const latest = items[0];
    const history = items.slice(1);
    const showCacheWrite = items.some(item => item.cacheWriteTokens !== undefined);
    const colFloors = showCacheWrite ? [...POOL_COL_FLOORS, POOL_COL_FLOOR_CACHE_WRITE] : POOL_COL_FLOORS;
    const beyond = Math.max(0, activeCount - items.filter(item => item.state === 'waiting' || item.state === 'streaming').length);
    // Scrollbar fade: the wrapper's thumb tints in only while the pane is
    // being scrolled, then fades back 800ms after the last event (the timer
    // dies with the component). Direct classList writes — no re-render.
    const wrapRef = useRef(null);
    const wrapTimer = useRef(undefined);
    useEffect(() => () => window.clearTimeout(wrapTimer.current), []);
    const handleWrapScroll = () => {
        const box = wrapRef.current;
        const cls = styles['scrolling'];
        if (box === null || cls === undefined)
            return;
        box.classList.add(cls);
        window.clearTimeout(wrapTimer.current);
        wrapTimer.current = window.setTimeout(() => {
            box.classList.remove(cls);
        }, 800);
    };
    const latestPanel = (_jsxs("section", { className: styles['poolSection'], "aria-label": t('pool.latest.title'), children: [_jsxs("div", { className: styles['poolHead'], children: [_jsx("h3", { className: styles['subtitle'], children: t('pool.latest.title') }), _jsx("span", { className: styles['poolContext'], children: t('pool.latest.context') })] }), latest === undefined
                ? _jsx("div", { className: styles['latestPanel'], children: _jsx("div", { className: styles['poolEmpty'], children: t('pool.empty') }) })
                : ((() => {
                    const inFlight = latest.state === 'waiting' || latest.state === 'streaming';
                    const origin = latest.sessionId === focusId;
                    const time = latest.orderBasis === 'record'
                        ? latest.recordTime ?? latest.orderAt
                        : latest.startedAt ?? latest.orderAt;
                    const notice = noticeOf(latest, details.conversation, t);
                    // The note's colour follows its tone: failed reads as an error,
                    // a settled note as quiet text, an in-flight / awaiting-tool note
                    // as the amber 「still running」 voice.
                    const noteClass = `${styles['requestNote']} ${notice?.tone === 'error'
                        ? styles['requestNoteError'] ?? ''
                        : notice?.tone === 'neutral'
                            ? styles['requestNoteNeutral'] ?? ''
                            : ''}`;
                    return (_jsxs("div", { className: styles['latestPanel'], children: [_jsxs("div", { className: styles['requestIdentity'], children: [_jsx("span", { className: styles['poolBadge'], children: t(origin ? 'pool.origin.self' : 'pool.origin.child') }), _jsxs("span", { className: `${styles['poolState']} ${stateClassOf(latest.state)}`, children: [_jsx("span", { className: styles['statusDot'], "aria-hidden": "true" }), stateTextOf(latest, t)] }), _jsx(ModelCell, { detail: latest, cache: latest.cache, t: t }), _jsx("span", { className: styles['poolContext'], children: _jsx("time", { dateTime: new Date(time).toISOString(), children: formatTimeOfDay(time) }) })] }), _jsxs("div", { className: styles['requestMetrics'], children: [_jsxs("div", { children: [_jsx("div", { className: styles['metricValue'], children: _jsx(HitCell, { cache: latest.cache, attribution: latest.compactionAttribution, t: t }) }), _jsx("div", { className: styles['metricLabel'], children: t('pool.col.hit') })] }), _jsxs("div", { children: [_jsx("div", { className: styles['metricValue'], children: _jsx(MetricValue, { text: tokenTextOf(latest.inputTokens), unit: "tok" }) }), _jsx("div", { className: styles['metricLabel'], children: t('pool.col.input') })] }), _jsxs("div", { children: [_jsx("div", { className: styles['metricValue'], children: _jsx(MetricValue, { text: tokenTextOf(latest.outputTokens), unit: "tok" }) }), _jsx("div", { className: styles['metricLabel'], children: t('pool.col.output') })] }), _jsxs("div", { children: [_jsx("div", { className: styles['metricValue'], children: _jsx(MetricValue, { text: latest.firstTokenLatencyMs !== undefined ? formatTtft(latest.firstTokenLatencyMs) : '—' }) }), _jsx("div", { className: styles['metricLabel'], children: t('pool.col.ttft') })] }), _jsxs("div", { children: [_jsx("div", { className: styles['metricValue'], children: _jsx(MetricValue, { text: latencyTextOf(latest) }) }), _jsx("div", { className: styles['metricLabel'], title: inFlight ? t('pool.metric.elapsed') : undefined, children: inFlight ? t('pool.metric.elapsedShort') : t('pool.col.latency') })] }), _jsxs("div", { children: [_jsx("div", { className: styles['metricValue'], children: _jsx(MetricValue, { text: speedTextOf(latest) }) }), _jsx("div", { className: styles['metricLabel'], children: t('pool.col.speed') })] })] }), _jsxs("div", { className: styles['requestFooter'], children: [_jsxs("div", { className: styles['requestBuckets'], children: [_jsxs("span", { children: [t('pool.metric.cost'), " ", _jsx("b", { children: costTextOf(latest, view) })] }), _jsxs("span", { children: [t('pool.metric.cacheRead'), " ", _jsx("b", { children: tokenTextOf(latest.cacheReadTokens) })] }), showCacheWrite && _jsxs("span", { children: [t('pool.metric.cacheWrite'), " ", _jsx("b", { children: tokenTextOf(latest.cacheWriteTokens) })] })] }), notice !== undefined
                                        ? (_jsx(Tooltip, { label: notice.full, side: "top", delayMs: 100, children: _jsx("span", { className: noteClass, tabIndex: 0, children: notice.text }) }))
                                        : staleAt !== undefined
                                            ? _jsx("span", { className: styles['poolContext'], children: t('pool.asOf', { time: formatTimeOfDay(staleAt) }) })
                                            : null] })] }));
                })())] }));
    const poolTable = (_jsxs("section", { className: styles['poolSection'], "aria-label": t('pool.title'), children: [_jsxs("div", { className: styles['poolHead'], children: [_jsxs("h3", { className: styles['subtitle'], children: [t('pool.title'), _jsxs("span", { className: styles['poolContext'], children: [" ", t('pool.historyCount', { count: String(history.length) })] })] }), _jsxs("span", { className: styles['poolContext'], children: [_jsx("span", { children: t('pool.newest') }), ' · ', _jsx("span", { children: t('pool.count', { count: String(items.length), limit: String(limit) }) }), beyond > 0 ? ` · ${t('pool.activeBeyond', { count: String(beyond) })}` : ''] })] }), staleAt !== undefined && (_jsx("div", { className: styles['poolNotice'], role: "status", children: t('pool.stale', { time: formatTimeOfDay(staleAt) }) })), history.length === 0
                ? _jsx("div", { className: styles['poolEmpty'], children: items.length > 0 ? t('pool.emptyHistory') : t('pool.empty') })
                : (_jsx("div", { ref: wrapRef, onScroll: handleWrapScroll, className: styles['poolTableWrap'], tabIndex: 0, role: "region", "aria-label": t('pool.history.scroll'), children: _jsxs("table", { className: styles['poolTable'], "aria-label": t('pool.title'), style: { minWidth: `${colFloors.reduce((sum, width) => sum + width, 0)}px` }, children: [_jsx("colgroup", { children: colFloors.map((width, index) => _jsx("col", { style: { width } }, index)) }), _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: styles['poolModelHead'], children: t('pool.col.origin') }), _jsx("th", { children: t('pool.col.state') }), _jsx("th", { children: t('pool.col.time') }), _jsx("th", { className: styles['poolModelHead'], children: t('pool.col.model') }), _jsx("th", { children: t('pool.col.hit') }), _jsx("th", { children: t('pool.col.input') }), _jsx("th", { children: t('pool.col.output') }), _jsx("th", { children: t('pool.col.cacheRead') }), showCacheWrite && _jsx("th", { children: t('pool.col.cacheWrite') }), _jsx("th", { children: t('pool.col.ttft') }), _jsx("th", { children: t('pool.col.latency') }), _jsx("th", { children: t('pool.col.speed') }), _jsx("th", { children: t('pool.col.cost') })] }) }), _jsx("tbody", { children: history.map(detail => _jsx(PoolRow, { detail: detail, focusId: focusId, view: view, showCacheWrite: showCacheWrite, t: t }, detail.id)) })] }) }))] }));
    return (_jsxs(_Fragment, { children: [latestPanel, poolTable] }));
}
//# sourceMappingURL=RequestPool.js.map