import { jsx as _jsx } from "react/jsx-runtime";
import { IconGaugeOutlineRegular, MenuItemButton } from '@deepseek-ai/dsh-client-ui-primitives';
/**
 * Render the More-menu row that opens the Token Usage panel.
 * @param props - the owner's dismissal callback, the injected open
 * callback, and the framework translate seat.
 * @returns one MenuItemButton row.
 */
export function PanellistMoreEntry({ onDismiss, openPanel, t }) {
    return (_jsx(MenuItemButton, { icon: _jsx(IconGaugeOutlineRegular, { size: 16 }), onSelect: () => { onDismiss(); openPanel(); }, children: t('nav.label') }));
}
//# sourceMappingURL=PanellistMoreEntry.js.map