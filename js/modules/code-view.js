/**
 * Meditör - Kod Görünümü ve HTML İndirme Yardımcı Modülü (Code View & Export)
 */

export function getCleanExportHtml(editorElement) {
    if (!editorElement) return '';
    const clone = editorElement.cloneNode(true);

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

export function downloadHtml(editorElement, filename = 'belge.html') {
    const cleanHtml = getCleanExportHtml(editorElement);
    const fullContent = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Meditör Dokümanı</title>
</head>
<body>
${cleanHtml}
</body>
</html>`;

    const blob = new Blob([fullContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
