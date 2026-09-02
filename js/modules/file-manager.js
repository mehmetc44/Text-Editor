/**
 * File Manager Core Coordinator Module
 * Orchestrates DocxManager, PdfManager, RevisionsManager, and stats updating.
 */

window.FileManager = (function () {
    function getCleanExportHtml(editor) {
        if (!editor) return '';
        const clone = editor.cloneNode(true);
        clone.querySelectorAll('.resize-handle-box').forEach(el => el.remove());
        clone.querySelectorAll('.selected-image').forEach(el => el.classList.remove('selected-image'));
        clone.querySelectorAll('.selected-cell').forEach(el => el.classList.remove('selected-cell'));

        clone.querySelectorAll('img[data-rel-src]').forEach(img => {
            const relSrc = img.getAttribute('data-rel-src');
            if (relSrc) img.setAttribute('src', relSrc);
            img.removeAttribute('data-rel-src');
        });

        return clone.innerHTML;
    }

    function updateStats(editor) {
        if (!editor) return;
        const statWords = document.getElementById('stat-words');
        const statChars = document.getElementById('stat-chars');
        const statPages = document.getElementById('stat-pages');

        const text = editor.innerText || editor.textContent || '';
        const cleanText = text.trim();
        const charCount = cleanText ? cleanText.length : 0;
        const wordCount = cleanText ? cleanText.split(/\s+/).filter(w => w.length > 0).length : 0;

        const pageHeight = 1123;
        const totalPages = Math.max(1, Math.ceil((editor.scrollHeight || 1123) / pageHeight));

        if (statPages) statPages.textContent = `Sayfa 1 / ${totalPages}`;
        if (statChars) statChars.textContent = charCount.toLocaleString();
        if (statWords) statWords.textContent = wordCount.toLocaleString();
    }

    function init(editor) {
        if (!editor) return;

        editor.addEventListener('input', () => updateStats(editor));
        updateStats(editor);

        // Word Import (.docx / .doc / .html)
        document.getElementById('input-import-word')?.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            if (window.DocxManager) {
                window.DocxManager.importDocx(file, editor, (fileName) => {
                    updateStats(editor);
                    if (window.RevisionsManager) {
                        window.RevisionsManager.saveRevision(editor, `Word İçe Aktarım (${fileName})`);
                    }
                });
            }
        });

        // Word Export (.doc)
        document.getElementById('menu-export-word')?.addEventListener('click', () => {
            if (window.DocxManager) window.DocxManager.exportDocx(editor);
        });

        // PDF Export
        document.getElementById('menu-export-pdf')?.addEventListener('click', () => {
            if (window.PdfManager) window.PdfManager.exportPdf();
        });

        // HTML Export
        document.getElementById('btn-export-file')?.addEventListener('click', () => {
            const cleanHtml = getCleanExportHtml(editor);
            const blob = new Blob([cleanHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'belge.html';
            a.click();
            URL.revokeObjectURL(url);
        });

        // Revisions Listeners
        document.getElementById('menu-save-revision')?.addEventListener('click', () => {
            if (window.RevisionsManager) window.RevisionsManager.saveRevision(editor);
        });
        document.getElementById('btn-modal-save-revision')?.addEventListener('click', () => {
            if (window.RevisionsManager) window.RevisionsManager.saveRevision(editor);
        });
        document.getElementById('tb-save')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.RevisionsManager) {
                window.RevisionsManager.saveRevision(editor, 'Mevcut Kayıt');
                alert('Belge revizyonu başarıyla kaydedildi.');
            }
        });

        const modalRevisions = document.getElementById('modal-revisions');
        document.getElementById('menu-open-revisions')?.addEventListener('click', () => {
            if (window.RevisionsManager) window.RevisionsManager.renderRevisions(editor);
            if (modalRevisions) modalRevisions.classList.remove('hidden');
        });
    }

    return {
        init,
        updateStats,
        getCleanExportHtml
    };
})();
