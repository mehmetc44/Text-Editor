/**
 * Word (.docx / .doc) Import & Export Manager
 * Uses Mammoth.js for client-side .docx parsing and HTML-to-MIME Blob for .doc export.
 */

window.DocxManager = (function () {
    function importDocx(file, editor, onSuccess) {
        if (!file || !editor) return;

        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.docx') && window.mammoth) {
            const arrayBufferReader = new FileReader();
            arrayBufferReader.onload = (evt) => {
                const arrayBuffer = evt.target.result;
                const options = {
                    styleMap: [
                        "p[style-name='Title'] => h1:fresh",
                        "p[style-name='Heading 1'] => h1:fresh",
                        "p[style-name='Heading 2'] => h2:fresh",
                        "p[style-name='Heading 3'] => h3:fresh",
                        "p[style-name='Heading 4'] => h4:fresh",
                        "p[style-name='Quote'] => blockquote:fresh",
                        "r[style-name='Strong'] => strong"
                    ]
                };
                window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options)
                    .then(result => {
                        const cleanHtml = window.WordSanitizer.sanitizeWordHtml(result.value);
                        editor.innerHTML = cleanHtml || result.value;
                        if (typeof onSuccess === 'function') onSuccess(file.name);
                    })
                    .catch(err => {
                        console.warn('Mammoth okuma hatası, varsayılan metin okuyucuya geçiliyor:', err);
                        readAsTextFallback(file, editor, onSuccess);
                    });
            };
            arrayBufferReader.readAsArrayBuffer(file);
        } else {
            readAsTextFallback(file, editor, onSuccess);
        }
    }

    function readAsTextFallback(file, editor, onSuccess) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const content = evt.target.result;
            if (editor) {
                const cleanHtml = window.WordSanitizer.sanitizeWordHtml(content);
                editor.innerHTML = cleanHtml || content;
                if (typeof onSuccess === 'function') onSuccess(file.name);
            }
        };
        reader.readAsText(file);
    }

    function exportDocx(editor) {
        if (!editor || !window.FileManager) return;
        const cleanHtml = window.FileManager.getCleanExportHtml(editor);
        const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Belge</title></head><body>`;
        const footer = "</body></html>";
        const sourceHTML = header + cleanHtml + footer;

        const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'belge.doc';
        a.click();
        URL.revokeObjectURL(url);
    }

    return {
        importDocx,
        exportDocx
    };
})();
