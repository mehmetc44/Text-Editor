/**
 * Meditör - Main Application Coordinator & Entry Point
 * Architecture: Clean Vanilla JS Modular Architecture with Separation of Concerns.
 */

function initApp() {
    const editor = document.getElementById('editor');
    if (!editor) return;

    // MS Word Paragraf Varsayılanı Ayarla
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { }

    // Modülleri Sırasıyla Başlat
    if (window.WordSanitizer) {
        window.WordSanitizer.bindPasteEvent(editor, () => {
            if (window.FileManager) window.FileManager.updateStats(editor);
        });
    }

    if (window.FileManager) {
        window.FileManager.init(editor);
    }

    if (window.ImageManager) {
        window.ImageManager.init(editor, () => {
            if (window.FileManager) window.FileManager.updateStats(editor);
        });
    }

    if (window.TableManager) {
        window.TableManager.init(editor, () => {
            if (window.FileManager) window.FileManager.updateStats(editor);
        });
    }

    if (window.CodeView) {
        window.CodeView.init(editor);
    }

    if (window.PaginationManager) {
        window.PaginationManager.init(editor);
    }

    if (window.FindReplaceManager) {
        window.FindReplaceManager.init();
    }

    if (window.HistoryManager) {
        window.HistoryManager.init();
    }

    if (window.ToolbarUI) {
        window.ToolbarUI.init(editor);
    }

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
