/**
 * Meditör - Dışa Aktarma ve HTML Kod Modu Yardımcısı (Code View & Export)
 * Belgeyi HTML dosyası olarak indirmeyi ve canlı önizlemeyi yönetir.
 */

/**
 * Editör içeriğini bilgisayara .html dosyası olarak indirir
 * @param {string} htmlContent 
 * @param {string} filename 
 */
export function exportAsHtmlFile(htmlContent, filename = 'belge.html') {
    const fullHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meditör Belgesi</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; color: #1e293b; }
        img { max-width: 100%; height: auto; }
        table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
        th { background-color: #f8fafc; }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
