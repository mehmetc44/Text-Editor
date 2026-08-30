/**
 * Zengin Metin Editörü - HTML Görüntüleme ve Render Etme Modülü
 * Bu modül, editör içeriğini HTML olarak görüntüleme ve HTML kodunu render etme işlemlerini yönetir.
 */

// HTML görüntüleme modu değişkenimiz
let htmlViewMode = false;
let previousContent = '';

/**
 * Editör içeriğini HTML olarak görüntüle veya düzenleme moduna geri dön
 * @param {HTMLElement} editor - Editör elementi
 * @param {HTMLElement} htmlOutput - HTML çıktısını gösteren element
 * @returns {boolean} - Yeni mod durumu (true: HTML görüntüleme modu, false: normal düzenleme modu)
 */
/**
 * Editör içeriğini HTML olarak görüntüle veya düzenleme moduna geri dön
 * @param {HTMLElement} editor - Editör elementi
 * @param {HTMLElement} htmlOutput - HTML çıktısını gösteren element
 * @param {Function} onModeChange - Mod değiştiğinde çağrılacak callback fonksiyonu
 * @returns {boolean} - Yeni mod durumu (true: HTML görüntüleme modu, false: normal düzenleme modu)
 */
function toggleHtmlView(editor, htmlOutput, onModeChange) {
    const htmlOutputCard = document.getElementById('html-output-card'); // Get the card element
    const previousMode = htmlViewMode;

    if (!htmlViewMode) {
        // --- Entering HTML View Mode ---
        // Clear any active selections (images, tables)
        if (typeof ImageToolbar !== 'undefined') {
            ImageToolbar.clearImageSelection();
            ImageToolbar.hideImageToolbar();
        }
        if (typeof TableToolbar !== 'undefined') {
            TableToolbar.clearSelection();
            TableToolbar.hideTableToolbar();
        }

        // Save current content (might still be useful)
        previousContent = editor.innerHTML;

        // Update the dedicated HTML output area
        if (htmlOutput && htmlOutputCard) {
            updateHtmlOutput(editor, htmlOutput); // Populate the <pre> tag
            htmlOutputCard.classList.remove('d-none'); // Show the card
        }

        // Make the editor non-editable
        editor.contentEditable = 'false';
        editor.classList.add('editor-html-mode'); // Optional: Add a class for styling

        // Set mode
        htmlViewMode = true;

        // Call callback
        if (typeof onModeChange === 'function') {
            onModeChange(htmlViewMode);
        }
    } else {
        // --- Exiting HTML View Mode ---
        // Hide the HTML output card
        if (htmlOutputCard) {
            htmlOutputCard.classList.add('d-none');
        }

        // Make the editor editable again
        editor.contentEditable = 'true';
        editor.classList.remove('editor-html-mode'); // Remove the class

        // Set mode
        htmlViewMode = false;

        // Call callback (with delay to ensure DOM updates)
        if (typeof onModeChange === 'function') {
            setTimeout(() => {
                onModeChange(htmlViewMode);
                // Restore focus to the editor after exiting HTML mode
                editor.focus();
            }, 10);
        }
    }

    return htmlViewMode;
}
/**
 * Verilen HTML kodunu kullanıcı dostu bir şekilde formatlar
 * @param {string} html - Format edilecek HTML kodu
 * @returns {string} - Format edilmiş HTML kodu
 */
function formatHtmlForDisplay(html) {
    // Boş satırları temizle
    let formattedHtml = html.replace(/^\s*[\r\n]/gm, '');
    
    // HTML kodunu güzelleştir (indent ekle)
    let indentLevel = 0;
    let result = '';
    let inTag = false;
    let inContent = false;
    let currentChar;
    
    for (let i = 0, len = formattedHtml.length; i < len; i++) {
        currentChar = formattedHtml[i];
        
        if (currentChar === '<' && !inTag) {
            inTag = true;
            inContent = false;
            
            // Eğer kapanış etiketi ise girintiyi azalt
            if (formattedHtml[i + 1] === '/') {
                indentLevel--;
            }
            
            // Satır başı ve girinti ekle
            if (result.length > 0) result += '\n';
            for (let j = 0; j < indentLevel; j++) {
                result += '    '; // 4 boşluk
            }
        } else if (currentChar === '>' && inTag) {
            inTag = false;
            inContent = true;
            
            // Açılış etiketi ise girintiyi artır
            if (formattedHtml[i - 1] !== '/' && formattedHtml[i - 1] !== ' ' && 
                !/\s/.test(formattedHtml[i - 1]) && formattedHtml[i - 1] !== '>') {
                // Self kapanan etiket değilse ve bir eleman etiketiyse
                if (!/^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)/.test(
                    formattedHtml.substring(
                        Math.max(0, i - 10), 
                        i
                    )
                )) {
                    indentLevel++;
                }
            }
        }
        
        result += currentChar;
    }
    
    return result;
}

/**
 * HTML çıktısını günceller
 * @param {HTMLElement} editor - Editör elementi
 * @param {HTMLElement} htmlOutput - HTML çıktısını gösteren element
 */
function updateHtmlOutput(editor, htmlOutput) {
    const htmlContent = editor.innerHTML;
    
    // HTML kodunu özel karakterlere dönüştürmeden doğrudan textContent'e ata
    // <pre> etiketi bunu doğru şekilde gösterecektir.
    htmlOutput.textContent = htmlContent;

    // Eğer içerik boşsa bir mesaj göster
    if (htmlContent.trim() === '') {
        htmlOutput.textContent = 'Editör boş. Metin eklemek için editöre yazın.';
    }
}

/**
 * HTML kodunu render eder
 * @param {string} htmlCode - Render edilecek HTML kodu
 * @param {HTMLElement} container - HTML'in render edileceği konteyner element
 */
function renderHtmlCode(htmlCode, container) {
    try {
        // Iframe oluştur
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.border = 'none';
        iframe.style.minHeight = '300px';
        
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
                    body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
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
 * Mevcut HTML görüntüleme modunu alır
 * @returns {boolean} - Mevcut mod durumu (true: HTML görüntüleme modu, false: normal düzenleme modu)
 */
function getHtmlViewMode() {
    return htmlViewMode;
}

// Dışa aktarılacak metodlar
const HtmlView = {
    toggleHtmlView,
    formatHtmlForDisplay,
    updateHtmlOutput,
    renderHtmlCode,
    getHtmlViewMode
};

// Modülü dışa aktar
export default HtmlView;
