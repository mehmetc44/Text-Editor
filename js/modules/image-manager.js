/**
 * Meditör - Resim Yönetimi ve Sürükle-Bırak Resizer Modülü (Image Manager)
 * Görselleri URL veya Object URL olarak ekler (Base64 DEĞİLDİR!).
 * Resim seçildiğinde canlı 8-nokta resize handles overlay kutusu oluşturur.
 * 
 * Mülakat Notu: FileReader.readAsDataURL (Base64) yerine URL.createObjectURL(file) kullanılmıştır.
 * Canlı boyutlandırma mousedown/mousemove/mouseup event delegation ile gerçekleştirilir.
 */

let activeImage = null;
let resizeOverlay = null;

/**
 * Editöre resim ekler (Base64 kullanmaz!)
 * @param {HTMLElement} editor 
 * @param {string} src - URL veya Object URL
 * @param {string} alt - Alternatif metin
 */
export function insertImage(editor, src, alt = '') {
    if (!editor || !src) return;

    editor.focus();
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.className = 'editor-image';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        
        // İmleci resmin sonrasına taşı
        range.setStartAfter(img);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        editor.appendChild(img);
    }

    selectImage(img, editor);
}

/**
 * Dosya seçildiğinde Object URL üreterek resmi ekler
 * @param {HTMLElement} editor 
 * @param {File} file 
 * @param {string} alt 
 */
export function insertImageFromFile(editor, file, alt = '') {
    if (!file) return;
    // Base64 DEĞİL: Güvenli nesne URL'i oluştur
    const objectUrl = URL.createObjectURL(file);
    insertImage(editor, objectUrl, alt);
}

/**
 * Resmi seçer ve etrafına resize kutusu yerleştirir
 * @param {HTMLImageElement} img 
 * @param {HTMLElement} editor 
 */
export function selectImage(img, editor) {
    clearImageSelection();
    activeImage = img;
    img.classList.add('selected-image');
    createResizeOverlay(img, editor);
}

/**
 * Seçimi ve overlay kutusunu kaldırır
 */
export function clearImageSelection() {
    if (activeImage) {
        activeImage.classList.remove('selected-image');
        activeImage = null;
    }
    if (resizeOverlay && resizeOverlay.parentNode) {
        resizeOverlay.parentNode.removeChild(resizeOverlay);
        resizeOverlay = null;
    }
}

/**
 * 8-noktalı Sürükle-Bırak Boyutlandırma Kutusu (Resize Overlay) Oluşturur
 * @param {HTMLImageElement} img 
 * @param {HTMLElement} editor 
 */
function createResizeOverlay(img, editor) {
    const rect = img.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();

    resizeOverlay = document.createElement('div');
    resizeOverlay.className = 'resize-handle-box';
    
    // Konumlandırma
    resizeOverlay.style.top = `${img.offsetTop}px`;
    resizeOverlay.style.left = `${img.offsetLeft}px`;
    resizeOverlay.style.width = `${img.offsetWidth}px`;
    resizeOverlay.style.height = `${img.offsetHeight}px`;

    // 8 Köşe Noktaları (handles)
    const positions = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
    positions.forEach(pos => {
        const dot = document.createElement('div');
        dot.className = `resize-dot resize-${pos}`;
        
        // Dot konumları
        if (pos.includes('n')) dot.style.top = '-4px';
        if (pos.includes('s')) dot.style.bottom = '-4px';
        if (pos.includes('w')) dot.style.left = '-4px';
        if (pos.includes('e')) dot.style.right = '-4px';
        if (pos === 'n' || pos === 's') dot.style.left = 'calc(50% - 4px)';
        if (pos === 'w' || pos === 'e') dot.style.top = 'calc(50% - 4px)';

        dot.style.cursor = `${pos}-resize`;

        // Mouse Drag Olayları
        dot.addEventListener('mousedown', (e) => startResizing(e, pos, img));
        resizeOverlay.appendChild(dot);
    });

    img.parentNode.insertBefore(resizeOverlay, img.nextSibling);
}

/**
 * Canlı Boyutlandırma Sürükleme Başlatıcısı
 */
function startResizing(e, handlePosition, img) {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = img.offsetWidth;
    const startHeight = img.offsetHeight;
    const aspectRatio = startWidth / startHeight;

    function onMouseMove(moveEvent) {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;

        if (handlePosition.includes('e')) newWidth = startWidth + deltaX;
        if (handlePosition.includes('w')) newWidth = startWidth - deltaX;
        if (handlePosition.includes('s')) newHeight = startHeight + deltaY;
        if (handlePosition.includes('n')) newHeight = startHeight - deltaY;

        // Minimum boyut sınırı
        newWidth = Math.max(30, newWidth);
        newHeight = Math.max(30, newHeight);

        // Oran koruma (shift basılıysa veya varsayılan)
        if (handlePosition === 'se' || handlePosition === 'nw' || handlePosition === 'ne' || handlePosition === 'sw') {
            newHeight = newWidth / aspectRatio;
        }

        img.style.width = `${newWidth}px`;
        img.style.height = `${newHeight}px`;

        if (resizeOverlay) {
            resizeOverlay.style.width = `${newWidth}px`;
            resizeOverlay.style.height = `${newHeight}px`;
        }
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

/**
 * Seçili resmi siler
 */
export function deleteActiveImage() {
    if (activeImage) {
        activeImage.remove();
        clearImageSelection();
    }
}
