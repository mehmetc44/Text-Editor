/**
 * Meditör - Seçim ve Range Alanı Yardımcı Modülü (Selection Helper)
 */

export function getSelection() {
    return window.getSelection();
}

export function getRange() {
    const selection = getSelection();
    return selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
}

export function isSelectionInside(container) {
    if (!container) return false;
    const selection = getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const anchor = selection.anchorNode;
    return container.contains(anchor) || container === anchor;
}
