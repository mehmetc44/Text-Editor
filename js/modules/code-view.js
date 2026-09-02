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

        if (btnToggleHtml && htmlTextarea && htmlEditorContainer) {
            btnToggleHtml.addEventListener('click', () => {
                isHtmlMode = !isHtmlMode;
                if (isHtmlMode) {
                    htmlTextarea.value = window.FileManager.getCleanExportHtml(editor);
                    editor.classList.add('hidden');
                    htmlEditorContainer.classList.remove('hidden');
                } else {
                    editor.innerHTML = htmlTextarea.value;
                    htmlEditorContainer.classList.add('hidden');
                    editor.classList.remove('hidden');
                    window.FileManager.updateStats(editor);
                }
            });
        }

        if (btnTogglePreview && htmlPreviewPanel && previewContent) {
            btnTogglePreview.addEventListener('click', () => {
                isPreviewMode = !isPreviewMode;
                if (isPreviewMode) {
                    previewContent.innerHTML = isHtmlMode ? htmlTextarea.value : window.FileManager.getCleanExportHtml(editor);
                    htmlPreviewPanel.classList.remove('hidden');
                } else {
                    htmlPreviewPanel.classList.add('hidden');
                }
            });
        }
    }

    return {
        init
    };
})();
