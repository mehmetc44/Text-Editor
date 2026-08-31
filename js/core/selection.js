/**
 * Meditör Core - Selection & Range API Yardımcısı
 * Tarayıcının yerel Selection (Seçim) ve Range (Aralık) nesnelerini güvenli şekilde yönetir.
 * Mülakat Notu: window.getSelection() imlecin veya seçili metnin tarayıcıdaki konumunu verir.
 */

let savedRange = null;

/**
 * Mevcut imleç seçimini veya aralığını kaydeder
 */
export function saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
    }
}

/**
 * Kaydedilmiş imleç seçimini editöre geri yükler
 */
export function restoreSelection() {
    if (!savedRange) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
}

/**
 * Kaydedilmiş aralığı sıfırlar
 */
export function clearSavedSelection() {
    savedRange = null;
}

/**
 * Seçili metnin üzerinde bulunan ana DOM elemanını döndürür
 * @param {HTMLElement} editor 
 * @returns {Node|null}
 */
export function getSelectedNode(editor) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    let node = selection.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }
    return editor.contains(node) ? node : null;
}

/**
 * Seçili alana veya imleç konumuna özel inline stil uygular (span wrapping)
 * @param {string} styleName - Örn: 'color', 'fontSize', 'fontFamily', 'backgroundColor'
 * @param {string} styleValue - Örn: '#dc2626', '18px', 'Arial'
 */
export function applyInlineStyle(styleName, styleValue) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // Metin seçili değilse işlem yapma

    // document.execCommand ile veya custom span wrap ile stil uygulama
    const span = document.createElement('span');
    span.style[styleName] = styleValue;

    try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        
        // İmleci span sonrasına taşı
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.addRange(newRange);
    } catch (e) {
        console.warn('Inline style uygulama hatası:', e);
    }
}

/**
 * Mevcut paragrafı veya seçili metni H1, H2, P gibi blok elemanına çevirir
 * @param {string} tagName - 'p', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'pre'
 */
export function applyBlockFormat(tagName) {
    document.execCommand('formatBlock', false, `<${tagName}>`);
}
