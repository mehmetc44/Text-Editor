/**
 * Zengin Metin Editörü - Metin Biçimlendirme Modülü
 * Bu modül metin biçimlendirme işlemlerini yönetir.
 */

// Metin Biçimlendirme Yardımcı Fonksiyonları
function getSelection() {
    return window.getSelection();
}

function hasSelection() {
    const selection = getSelection();
    return selection && selection.rangeCount > 0 && !selection.isCollapsed;
}

// Seçili Metni Stille Biçimlendir
function wrapSelectionWithStyle(styleName, value) {
    if (!hasSelection()) return;
    
    const selection = getSelection();
    const range = selection.getRangeAt(0);
    
    // Seçimi kopyala (sonra geri yükleyebilmek için)
    const originalRange = range.cloneRange();
    
    // Seçilen içeriğin en dış span elementini bul
    let existingSpan = findOutermostSpanInSelection(range);
    
    if (existingSpan) {
        // Var olan span'in style özelliğini güncelle
        existingSpan.style[styleName] = value;
    } else {
        // Yeni span oluştur
        const span = document.createElement('span');
        span.style[styleName] = value;
        
        try {
            // İçeriği çıkar ve span'e ekle
            const fragment = range.extractContents();
            span.appendChild(fragment);
            
            // Span'i DOM'a ekle
            range.insertNode(span);
            existingSpan = span;
        } catch (e) {
            console.error('Sarmalama sırasında hata oluştu:', e);
            return;
        }
    }
    
    // Seçimi geri yükle
    restoreSelection(originalRange);
    
    return existingSpan;
}

// Seçim içindeki en dış span elementini bul
function findOutermostSpanInSelection(range) {
    const ancestor = range.commonAncestorContainer;
    
    // Eğer seçim doğrudan bir span içindeyse
    if (ancestor.nodeName && ancestor.nodeName.toLowerCase() === 'span') {
        return ancestor;
    }
    
    // Eğer text node ise parent'a bak
    if (ancestor.nodeType === Node.TEXT_NODE && ancestor.parentNode) {
        if (ancestor.parentNode.nodeName.toLowerCase() === 'span') {
            return ancestor.parentNode;
        }
    }
    
    // Seçimin kapsadığı tüm elementleri kontrol et
    let startNode = range.startContainer;
    let endNode = range.endContainer;
    
    // Text node ise parent'a bak
    if (startNode.nodeType === Node.TEXT_NODE) startNode = startNode.parentNode;
    if (endNode.nodeType === Node.TEXT_NODE) endNode = endNode.parentNode;
    
    // Ortak bir span parent var mı kontrol et
    let current = startNode;
    while (current && current !== document.getElementById('editor')) {
        if (current.nodeName.toLowerCase() === 'span' && nodeContainsRange(current, range)) {
            return current;
        }
        current = current.parentNode;
    }
    
    return null;
}

// Bir node'un belirli bir range'i tamamen kapsayıp kapsamadığını kontrol et
function nodeContainsRange(node, range) {
    return node.contains(range.startContainer) && node.contains(range.endContainer);
}

// Stil Toggle İşlemi
function toggleStyle(styleName, value, defaultValue = '') {
    if (!hasSelection()) return;
    
    const selection = getSelection();
    const range = selection.getRangeAt(0);
    const originalRange = range.cloneRange();
    
    // Seçilen metnin içinde olduğu elementleri kontrol et
    const existingSpan = findOutermostSpanInSelection(range);
    let hasStyle = false;
    
    // Span'in mevcut stilini kontrol et
    if (existingSpan) {
        const computedStyle = window.getComputedStyle(existingSpan);
        
        if (styleName === 'textDecoration') {
            hasStyle = computedStyle[styleName].includes(value);
        } else {
            hasStyle = computedStyle[styleName] === value;
        }
        
        if (hasStyle) {
            // Stili kaldır (toggle off)
            if (styleName === 'textDecoration') {
                // Text decoration için özel işlem (underline, line-through birlikte olabilir)
                const currentValue = existingSpan.style[styleName];
                if (currentValue.includes(value)) {
                    // Mevcut decoration'dan belirli bir değeri çıkar
                    existingSpan.style[styleName] = currentValue
                        .replace(value, '')
                        .trim();
                    
                    // Eğer boşsa tamamen kaldır
                    if (existingSpan.style[styleName] === '') {
                        existingSpan.style[styleName] = defaultValue;
                    }
                }
            } else {
                // Normal stil kaldırma
                existingSpan.style[styleName] = defaultValue;
            }
            
            // Eğer span'de hiç stil kalmadıysa, içeriğini çıkart
            if (existingSpan.style.length === 0) {
                unwrapElement(existingSpan);
            }
        } else {
            // Stili ekle (toggle on) - varolan span'e
            if (styleName === 'textDecoration' && existingSpan.style[styleName] && 
                existingSpan.style[styleName] !== 'none') {
                // Mevcut dekorasyona ekle
                existingSpan.style[styleName] += ` ${value}`;
            } else {
                existingSpan.style[styleName] = value;
            }
        }
    } else {
        // Hiç span yoksa yeni oluştur
        wrapSelectionWithStyle(styleName, value);
    }
    
    // Seçimi geri yükle
    restoreSelection(originalRange);
    
    // DOM'u normalize et (boş metin düğümlerini temizle)
    document.getElementById('editor').normalize();
    
    return !hasStyle;
}

// Stil Uygulama - Akıllı toggle veya doğrudan uygulama
function applyStyleToSelection(styleName, value) {
    if (!hasSelection()) return;
    
    const selection = getSelection();
    const range = selection.getRangeAt(0);
    const originalRange = range.cloneRange();
    
    // Seçilen içeriğin en dış span elementini bul
    let existingSpan = findOutermostSpanInSelection(range);
    
    if (existingSpan) {
        // Var olan span'in style özelliğini güncelle
        existingSpan.style[styleName] = value;
    } else {
        // Yeni span oluştur
        const span = document.createElement('span');
        span.style[styleName] = value;
        
        try {
            // İçeriği çıkar ve span'e ekle
            const fragment = range.extractContents();
            span.appendChild(fragment);
            
            // Span'i DOM'a ekle
            range.insertNode(span);
        } catch (e) {
            console.error('Stil uygulama sırasında hata oluştu:', e);
            return;
        }
    }
    
    // Seçimi geri yükle
    restoreSelection(originalRange);
}

// Bir elementi sarmalayan yapıyı kaldır (içeriğini koru)
function unwrapElement(element) {
    const parent = element.parentNode;
    while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
}

// Seçimi geri yükle
function restoreSelection(originalRange) {
    try {
        const selection = getSelection();
        const newRange = document.createRange();
        
        try {
            // Orijinal nodeleri kullanmaya çalış
            newRange.setStart(originalRange.startContainer, originalRange.startOffset);
            newRange.setEnd(originalRange.endContainer, originalRange.endOffset);
        } catch (e) {
            // Eğer orijinal nodeler değiştiyse en yakın uygun nodeleri bul
            console.warn('Orijinal nodeler değişti, yeni seçim oluşturuluyor');
            
            const startNode = findClosestTextNode(document.getElementById('editor'), originalRange.startContainer);
            const endNode = findClosestTextNode(document.getElementById('editor'), originalRange.endContainer);
            
            if (startNode && endNode) {
                newRange.setStart(startNode, 0);
                newRange.setEnd(endNode, endNode.length);
            } else {
                // Son çare olarak editörün tamamını seç
                newRange.selectNodeContents(document.getElementById('editor'));
            }
        }
        
        // Seçimi uygula
        selection.removeAllRanges();
        selection.addRange(newRange);
    } catch (e) {
        console.error('Seçimi geri yükleme hatası:', e);
    }
}

// En yakın text node'u bul
function findClosestTextNode(root, originalNode) {
    // Eğer hala varsa ve text node ise, doğrudan kullan
    if (document.contains(originalNode) && originalNode.nodeType === Node.TEXT_NODE) {
        return originalNode;
    }
    
    // Text nodeları bul
    const walker = document.createTreeWalker(
        root, 
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let textNode;
    while (textNode = walker.nextNode()) {
        if (textNode.textContent.trim() !== '') {
            return textNode;
        }
    }
    
    return null;
}

// İmleç konumundaki veya seçilen metnin stillerini hesapla
function computeCurrentStyles(node, editorElement) {
    const styles = {
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isStrikethrough: false,
        fontSize: null,
        fontFamily: null
    };
    
    // Node hiyerarşisinde yukarı doğru ilerle ve stilleri topla
    let current = node;
    while (current && current !== editorElement && current !== document.body) {
        const computedStyle = window.getComputedStyle(current);
        
        // Bold kontrolü
        if (!styles.isBold && (computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 700)) {
            styles.isBold = true;
        }
        
        // Italic kontrolü
        if (!styles.isItalic && computedStyle.fontStyle === 'italic') {
            styles.isItalic = true;
        }
        
        // Underline & Strikethrough kontrolü
        if (!styles.isUnderline && computedStyle.textDecoration.includes('underline')) {
            styles.isUnderline = true;
        }
        
        if (!styles.isStrikethrough && computedStyle.textDecoration.includes('line-through')) {
            styles.isStrikethrough = true;
        }
        
        // Font boyutu - iç içe elementlerde en son (en içteki) değeri al
        if (!styles.fontSize && computedStyle.fontSize && computedStyle.fontSize !== 'inherit') {
            styles.fontSize = computedStyle.fontSize;
        }
        
        // Font ailesi - iç içe elementlerde en son (en içteki) değeri al
        if (!styles.fontFamily && computedStyle.fontFamily && computedStyle.fontFamily !== 'inherit') {
            styles.fontFamily = computedStyle.fontFamily;
        }
        
        current = current.parentNode;
    }
    
    // Eğer hala null ise varsayılan değerleri kullan
    if (!styles.fontSize) {
        styles.fontSize = window.getComputedStyle(editorElement).fontSize || '16px';
    }
    
    if (!styles.fontFamily) {
        styles.fontFamily = window.getComputedStyle(editorElement).fontFamily || 'Arial, sans-serif';
    }
    
    return styles;
}

// Biçimlendirmeyi temizle
function clearFormatting() {
    if (!hasSelection()) return;
    
    const selection = getSelection();
    const range = selection.getRangeAt(0);
    const originalRange = range.cloneRange();
    
    try {
        // Seçili içeriği al
        const fragment = range.extractContents();
        
        // Fragment içindeki biçimlendirilmiş içeriği temizle
        const plainText = document.createTextNode(fragment.textContent);
        
        // Temizlenmiş içeriği DOM'a ekle
        range.insertNode(plainText);
        
        // Seçimi geri yükle
        restoreSelection(originalRange);
    } catch (e) {
        console.error('Biçimlendirme temizleme sırasında hata oluştu:', e);
    }
}

// Dışa aktarılacak metodlar
const TextFormatting = {
    getSelection,
    hasSelection,
    wrapSelectionWithStyle,
    findOutermostSpanInSelection,
    toggleStyle,
    applyStyleToSelection,
    unwrapElement,
    restoreSelection,
    findClosestTextNode,
    computeCurrentStyles,
    clearFormatting
};

// Modülü dışa aktar
export default TextFormatting;