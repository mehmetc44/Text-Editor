/**
 * Zengin Metin Editörü - HTML Önizleme Modülü
 * Bu modül, HTML kodunun önizlemesini gösterme işlemlerini yönetir.
 */

// Önizleme panelinin açık/kapalı durumu
let previewVisible = false;

/**
 * Önizleme panelini oluşturur veya günceller
 * @param {string} htmlCode - Önizlemesi gösterilecek HTML kodu
 * @param {HTMLElement} editorContainer - Editör konteyneri 
 * @returns {HTMLElement} - Oluşturulan veya güncellenen önizleme paneli
 */
function createPreviewPanel(htmlCode, editorContainer) {
    // Mevcut önizleme panelini kontrol et
    let previewPanel = document.getElementById('html-preview-panel');
    
    if (!previewPanel) {
        // Önizleme paneli yoksa oluştur
        previewPanel = document.createElement('div');
        previewPanel.id = 'html-preview-panel';
        previewPanel.className = 'card mt-3';
        
        // Panel başlığı
        const header = document.createElement('div');
        header.className = 'card-header d-flex justify-content-between align-items-center';
        header.innerHTML = `
            <span>HTML Önizleme</span>
            <button type="button" class="btn-close" aria-label="Kapat" id="btn-close-preview"></button>
        `;
        
        // Panel içeriği
        const body = document.createElement('div');
        body.className = 'card-body';
        body.id = 'html-preview-content';
        
        // Paneli DOM'a ekle
        previewPanel.appendChild(header);
        previewPanel.appendChild(body);
        
        // Editör konteynerinden sonra ekle
        editorContainer.parentNode.insertBefore(previewPanel, editorContainer.nextSibling);
        
        // Kapatma butonuna olay dinleyicisi ekle
        document.getElementById('btn-close-preview').addEventListener('click', function() {
            togglePreviewPanel(htmlCode, editorContainer);
        });
    }
    
    // Önizleme içeriğini güncelle
    const previewContent = document.getElementById('html-preview-content');
    renderHtmlPreview(htmlCode, previewContent);
    
    return previewPanel;
}

/**
 * HTML önizleme panelini göster/gizle
 * @param {string} htmlCode - Önizlemesi gösterilecek HTML kodu 
 * @param {HTMLElement} editorContainer - Editör konteyneri
 * @returns {boolean} - Yeni görüntüleme durumu
 */
function togglePreviewPanel(htmlCode, editorContainer) {
    previewVisible = !previewVisible;
    
    if (previewVisible) {
        // Önizleme panelini göster
        createPreviewPanel(htmlCode, editorContainer);
    } else {
        // Önizleme panelini gizle
        const previewPanel = document.getElementById('html-preview-panel');
        if (previewPanel) {
            previewPanel.remove();
        }
    }
    
    return previewVisible;
}

/**
 * HTML kodunu önizleme panelinde render et
 * @param {string} htmlCode - Render edilecek HTML kodu 
 * @param {HTMLElement} container - HTML'in render edileceği konteyner
 */
function renderHtmlPreview(htmlCode, container) {
    try {
        // Iframe oluştur
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.border = 'none';
        iframe.style.minHeight = '300px';
        iframe.style.backgroundColor = '#fff';
        
        // İlk önce konteyner içeriğini temizle
        container.innerHTML = '';
        container.appendChild(iframe);
        
        // HTML kodunu iframe içine yaz
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>HTML Önizleme</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 0; 
                        padding: 10px; 
                        color: #333;
                        line-height: 1.5;
                    }
                    a { color: #007bff; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                    img { max-width: 100%; height: auto; }
                    table { border-collapse: collapse; width: 100%; }
                    table, th, td { border: 1px solid #ddd; }
                    th, td { padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>${htmlCode}</body>
            </html>
        `);
        iframeDoc.close();
        
        // iframe'in yüksekliğini içeriğe göre ayarla
        setTimeout(() => {
            iframe.style.height = (iframeDoc.body.scrollHeight + 20) + 'px';
        }, 100);
        
        return true;
    } catch (error) {
        console.error('HTML kodu render edilirken hata oluştu:', error);
        container.innerHTML = `<div class="alert alert-danger">HTML kodu render edilirken bir hata oluştu: ${error.message}</div>`;
        return false;
    }
}

/**
 * Önizleme panelinin görüntülenme durumunu al
 * @returns {boolean} - Önizleme panelinin görünürlük durumu
 */
function getPreviewVisibility() {
    return previewVisible;
}

// Dışa aktarılacak metodlar
const HtmlPreview = {
    createPreviewPanel,
    togglePreviewPanel,
    renderHtmlPreview,
    getPreviewVisibility
};

// Modülü dışa aktar
export default HtmlPreview;