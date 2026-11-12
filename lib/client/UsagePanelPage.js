import { jsx as _jsx } from "react/jsx-runtime";
import { TokenUsageSection } from "./TokenUsageSection.js";
import css from './UsagePanelPage.module.css';
/**
 * Render the Token Usage page for the main column: the official
 * first-level-page shell (full-height scroll pane, centered 960px column)
 * wrapping the section in its `page` variant — the settings panel keeps its
 * own layout untouched.
 * @param props - the locale seat, the injected session-jump seats, and the
 * framework's (empty) main-panel owner share.
 * @returns the shelled section content.
 */
export function UsagePanelPage({ t, sessionListed, openSession, returnToConversation }) {
    return (_jsx("div", { className: css.page, children: _jsx("div", { className: css.pageScroll, children: _jsx("div", { className: css.pageContent, children: _jsx(TokenUsageSection, { t: t, variant: "page", close: returnToConversation, sessionListed: sessionListed, openSession: openSession }) }) }) }));
}
//# sourceMappingURL=UsagePanelPage.js.map