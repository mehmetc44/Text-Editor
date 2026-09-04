/**
 * Code View & Live Preview Toggle Module
 */

window.CodeView = (function () {
    let isHtmlMode = false;
    let isPreviewMode = false;

    function init(editor) {
        if (!editor) return;

        const btnToggleHtml = document.getElementById('btn-toggle-html');
        const btnTogglePreview = document.getElementById('btn-toggle-preview');
        const htmlTextarea = document.getElementById('html-textarea');
        const htmlEditorContainer = document.getElementById('html-editor-container');
        const htmlPreviewPanel = document.getElementById('html-preview-panel');
        const previewContent = document.getElementById('preview-content');
        const pagesContainer = document.getElementById('pages-container');

        if (btnToggleHtml && htmlTextarea && htmlEditorContainer && pagesContainer) {
            btnToggleHtml.addEventListener('click', () => {
                isHtmlMode = !isHtmlMode;
                if (isHtmlMode) {
                    htmlTextarea.value = window.FileManager.getCleanExportHtml(editor);
                    pagesContainer.classList.add('hidden');
                    htmlEditorContainer.classList.remove('hidden');
                    
                    if (isPreviewMode) {
                        isPreviewMode = false;
                        htmlPreviewPanel.classList.add('hidden');
                    }
                } else {
                    if (window.PaginationManager) {
                        window.PaginationManager.rebuildPages([htmlTextarea.value]);
                    } else {
                        editor.innerHTML = htmlTextarea.value;
                    }
                    htmlEditorContainer.classList.add('hidden');
                    pagesContainer.classList.remove('hidden');
                    window.FileManager.updateStats(editor);
                }
            });
        }

        if (btnTogglePreview && htmlPreviewPanel && previewContent && pagesContainer) {
            btnTogglePreview.addEventListener('click', () => {
                isPreviewMode = !isPreviewMode;
                if (isPreviewMode) {
                    previewContent.innerHTML = isHtmlMode ? htmlTextarea.value : window.FileManager.getCleanExportHtml(editor);
                    pagesContainer.classList.add('hidden');
                    if (isHtmlMode) {
                        htmlEditorContainer.classList.add('hidden');
                    }
                    htmlPreviewPanel.classList.remove('hidden');
                } else {
                    htmlPreviewPanel.classList.add('hidden');
                    if (isHtmlMode) {
                        htmlEditorContainer.classList.remove('hidden');
                    } else {
                        pagesContainer.classList.remove('hidden');
                    }
                }
            });
        }
    }

    return {
        init
    };
})();
