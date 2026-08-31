/**
 * Meditör - Araç Çubuğu Durum Senkronizasyonu (Toolbar State)
 */

export function updateToolbarState(editor) {
    if (!editor || !document.activeElement || (!editor.contains(document.activeElement) && document.activeElement !== editor)) {
        return;
    }

    try {
        toggleBtnState('btn-bold', document.queryCommandState('bold'));
        toggleBtnState('btn-italic', document.queryCommandState('italic'));
        toggleBtnState('btn-underline', document.queryCommandState('underline'));
        toggleBtnState('btn-strikethrough', document.queryCommandState('strikeThrough'));
        toggleBtnState('btn-align-left', document.queryCommandState('justifyLeft'));
        toggleBtnState('btn-align-center', document.queryCommandState('justifyCenter'));
        toggleBtnState('btn-align-right', document.queryCommandState('justifyRight'));
        toggleBtnState('btn-align-justify', document.queryCommandState('justifyFull'));
        toggleBtnState('btn-list-ul', document.queryCommandState('insertUnorderedList'));
        toggleBtnState('btn-list-ol', document.queryCommandState('insertOrderedList'));
    } catch (err) {
        // Fallback
    }
}

export function toggleBtnState(btnId, isActive) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.classList.toggle('active', Boolean(isActive));
    }
}
