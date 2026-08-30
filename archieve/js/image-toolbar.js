/**
 * Zengin Metin Editörü - Resim Araç Çubuğu Modülü
 * Bu modül, editördeki resimler için özel araç çubuğu işlevselliğini yönetir
 */

// Aktif resim
let activeImage = null;
// Resim oranı
let aspectRatio = 1;

/**
 * Resim araç çubuğunu başlatır
 * @param {HTMLElement} editor - Editör elementi
 */
function initImageToolbar(editor) {
    // DOM elementlerini al
    const imageToolbar = document.getElementById('image-toolbar');
    
    if (!imageToolbar) {
        console.error('Resim araç çubuğu bulunamadı!');
        return;
    }
    
    // Tüm resimleri dinle
    setupImageListeners(editor);
    
    // Araç çubuğu butonlarını ayarla
    setupToolbarButtons(editor, imageToolbar);
    
    // Editör dışına tıklanınca araç çubuğunu gizle
    document.addEventListener('click', function(e) {
        if (!editor.contains(e.target) && !imageToolbar.contains(e.target)) {
            hideImageToolbar();
        }
    });
    
    // Yeni eklenen resimlere olay dinleyicisi ekle
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeName === 'IMG') {
                    setupImageEventListeners(node, editor);
                }
            });
        });
    });
    
    observer.observe(editor, { childList: true, subtree: true });
}

/**
 * Editördeki tüm resimlere olay dinleyicisi ekler
 * @param {HTMLElement} editor - Editör elementi
 */
function setupImageListeners(editor) {
    const images = editor.querySelectorAll('img');
    images.forEach(img => {
        setupImageEventListeners(img, editor);
    });
}

/**
 * Bir resme olay dinleyicileri ekler
 * @param {HTMLImageElement} img - Resim elementi
 * @param {HTMLElement} editor - Editör elementi
 */
function setupImageEventListeners(img, editor) {
    // Hali hazırda dinleyici varsa ekleme
    if (img.dataset.hasEventListener) return;
    
    img.dataset.hasEventListener = 'true';
    
    // Tıklama olayını ekle
    img.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Resmi seç
        selectImage(img, editor);
    });
}

/**
 * Araç çubuğu butonlarını ve kontrollerini ayarlar
 * @param {HTMLElement} editor - Editör elementi
 * @param {HTMLElement} toolbar - Araç çubuğu elementi
 */
function setupToolbarButtons(editor, toolbar) {
    // Hizalama butonları
    const alignNoneBtn = document.getElementById('img-align-none');
    const alignLeftBtn = document.getElementById('img-align-left');
    const alignCenterBtn = document.getElementById('img-align-center');
    const alignRightBtn = document.getElementById('img-align-right');
    
    // Boyut kontrolleri
    const widthInput = document.getElementById('img-width');
    const heightInput = document.getElementById('img-height');
    const lockRatioCheckbox = document.getElementById('img-lock-ratio');
    
    // Diğer butonlar
    const originalSizeBtn = document.getElementById('img-original');
    const altTextInput = document.getElementById('img-alt');
    const removeBtn = document.getElementById('img-remove');
    
    // image-toolbar.js dosyasında aşağıdaki değişiklikleri yapın
// Hizalama butonlarının olay dinleyicilerine gecikmeli pozisyonlandırma ekleyin

// Sola hizalama butonu
if (alignLeftBtn) {
    alignLeftBtn.addEventListener('click', function() {
        if (!activeImage) return;
        
        // Diğer hizalamaları kaldır
        resetImageAlignment(activeImage);
        
        // Sola hizala
        activeImage.style.float = 'left';
        activeImage.style.marginRight = '1rem';
        activeImage.style.marginBottom = '0.5rem';
        activeImage.className = 'editor-image image-align-left';
        
        // Butonları güncelle
        updateAlignmentButtonsState('left');
        
        // Kulpları yeniden konumlandır - gecikmeli çalıştır
        // Bu, tarayıcının layout hesaplamasını tamamlamasını bekler
        setTimeout(() => {
            positionResizeHandles();
        }, 50);
    });
}

// Ortalama butonu
if (alignCenterBtn) {
    alignCenterBtn.addEventListener('click', function() {
        if (!activeImage) return;
        
        // Diğer hizalamaları kaldır
        resetImageAlignment(activeImage);
        
        // Ortala
        activeImage.style.float = '';
        activeImage.style.display = 'block';
        activeImage.style.marginLeft = 'auto';
        activeImage.style.marginRight = 'auto';
        activeImage.className = 'editor-image image-align-center';
        
        // Butonları güncelle
        updateAlignmentButtonsState('center');
        
        // Kulpları yeniden konumlandır - gecikmeli çalıştır
        setTimeout(() => {
            positionResizeHandles();
        }, 50);
    });
}

// Sağa hizalama butonu
if (alignRightBtn) {
    alignRightBtn.addEventListener('click', function() {
        if (!activeImage) return;
        
        // Diğer hizalamaları kaldır
        resetImageAlignment(activeImage);
        
        // Sağa hizala
        activeImage.style.float = 'right';
        activeImage.style.marginLeft = '1rem';
        activeImage.style.marginBottom = '0.5rem';
        activeImage.className = 'editor-image image-align-right';
        
        // Butonları güncelle
        updateAlignmentButtonsState('right');
        
        // Kulpları yeniden konumlandır - gecikmeli çalıştır
        setTimeout(() => {
            positionResizeHandles();
        }, 50);
    });
}

// Normal (hizalama yok) butonu
if (alignNoneBtn) {
    alignNoneBtn.addEventListener('click', function() {
        if (!activeImage) return;
        
        // Hizalamaları sıfırla
        resetImageAlignment(activeImage);
        
        // Butonları güncelle
        updateAlignmentButtonsState('none');
        
        // Kulpları yeniden konumlandır - gecikmeli çalıştır
        setTimeout(() => {
            positionResizeHandles();
        }, 50);
    });
}
    
    // Boyut inputları
    if (widthInput) {
        widthInput.addEventListener('change', function() {
            if (!activeImage) return;
            
            const newWidth = parseInt(this.value);
            if (isNaN(newWidth) || newWidth < 10) return;
            
            activeImage.style.width = `${newWidth}px`;
            
            // Oran kilidini kontrol et
            if (lockRatioCheckbox && lockRatioCheckbox.checked) {
                const newHeight = Math.round(newWidth / aspectRatio);
                activeImage.style.height = `${newHeight}px`;
                heightInput.value = newHeight;
            }
        });
    }
    
    if (heightInput) {
        heightInput.addEventListener('change', function() {
            if (!activeImage) return;
            
            const newHeight = parseInt(this.value);
            if (isNaN(newHeight) || newHeight < 10) return;
            
            activeImage.style.height = `${newHeight}px`;
            
            // Oran kilidini kontrol et
            if (lockRatioCheckbox && lockRatioCheckbox.checked) {
                const newWidth = Math.round(newHeight * aspectRatio);
                activeImage.style.width = `${newWidth}px`;
                widthInput.value = newWidth;
            }
        });
    }
    
    // Orijinal boyut butonu
    if (originalSizeBtn) {
        originalSizeBtn.addEventListener('click', function() {
            if (!activeImage) return;
            
            // Stil özelliklerini temizle
            activeImage.style.width = '';
            activeImage.style.height = '';
            
            // Inputları güncelle
            if (widthInput) widthInput.value = activeImage.naturalWidth;
            if (heightInput) heightInput.value = activeImage.naturalHeight;
        });
    }
    
    // Alt metin giriş alanı
    if (altTextInput) {
        altTextInput.addEventListener('change', function() {
            if (!activeImage) return;
            
            activeImage.alt = this.value;
        });
    }
    
    // Resmi kaldırma butonu
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            if (!activeImage) return;
            
            if (confirm('Resmi kaldırmak istediğinizden emin misiniz?')) {
                // Resmi kaldır
                activeImage.parentNode.removeChild(activeImage);
                
                // Araç çubuğunu gizle
                hideImageToolbar();
                
                // Editöre odaklan
                editor.focus();
            }
        });
    }
}



/**
 * Resim araç çubuğunu gösterir
 */
function showImageToolbar() {

    if (isHtmlViewMode()) {
        return;
    }
      const imageToolbar = document.getElementById('image-toolbar');
    if (imageToolbar) {
        imageToolbar.classList.remove('d-none');
    }
}

/**
 * Resim araç çubuğunu gizler
 */
function hideImageToolbar() {
    const imageToolbar = document.getElementById('image-toolbar');
    if (imageToolbar) {
        imageToolbar.classList.add('d-none');
    }
    
     
}

/**
 * Araç çubuğu kontrollerini günceller
 */
function updateToolbarControls() {
    if (!activeImage) return;
    
    // Boyut inputlarını güncelle
    const widthInput = document.getElementById('img-width');
    const heightInput = document.getElementById('img-height');
    const altTextInput = document.getElementById('img-alt');
    
    if (widthInput) {
        widthInput.value = activeImage.width || activeImage.naturalWidth;
    }
    
    if (heightInput) {
        heightInput.value = activeImage.height || activeImage.naturalHeight;
    }
    
    if (altTextInput) {
        altTextInput.value = activeImage.alt || '';
    }
    
    // Hizalama butonlarını güncelle
    updateAlignmentButtonsState(getImageAlignment(activeImage));
}
function isHtmlViewMode() {
    // HtmlView modülü yüklüyse, onun fonksiyonunu kullan
    if (typeof HtmlView !== 'undefined' && typeof HtmlView.getHtmlViewMode === 'function') {
        return HtmlView.getHtmlViewMode();
    }
    
    // HtmlView modülü yoksa, HTML editörün durumuna bak
    const editor = document.getElementById('editor');
    if (editor) {
        // HTML modu genellikle contenteditable='false' veya belirli bir sınıf ile işaretlenir
        return editor.classList.contains('html-mode') || editor.getAttribute('contenteditable') === 'false';
    }
    
    return false;
}

/**
 * Hizalama butonlarının durumunu günceller
 * @param {string} alignment - Aktif hizalama ('none', 'left', 'center', 'right')
 */
function updateAlignmentButtonsState(alignment) {
    const alignNoneBtn = document.getElementById('img-align-none');
    const alignLeftBtn = document.getElementById('img-align-left');
    const alignCenterBtn = document.getElementById('img-align-center');
    const alignRightBtn = document.getElementById('img-align-right');
    
    // Tüm butonları sıfırla
    if (alignNoneBtn) alignNoneBtn.classList.remove('active', 'btn-secondary');
    if (alignLeftBtn) alignLeftBtn.classList.remove('active', 'btn-secondary');
    if (alignCenterBtn) alignCenterBtn.classList.remove('active', 'btn-secondary');
    if (alignRightBtn) alignRightBtn.classList.remove('active', 'btn-secondary');
    
    // İlgili butonu aktif yap
    switch (alignment) {
        case 'left':
            if (alignLeftBtn) {
                alignLeftBtn.classList.add('active', 'btn-secondary');
                alignLeftBtn.classList.remove('btn-outline-secondary');
            }
            break;
        case 'center':
            if (alignCenterBtn) {
                alignCenterBtn.classList.add('active', 'btn-secondary');
                alignCenterBtn.classList.remove('btn-outline-secondary');
            }
            break;
        case 'right':
            if (alignRightBtn) {
                alignRightBtn.classList.add('active', 'btn-secondary');
                alignRightBtn.classList.remove('btn-outline-secondary');
            }
            break;
        default: // 'none'
            if (alignNoneBtn) {
                alignNoneBtn.classList.add('active', 'btn-secondary');
                alignNoneBtn.classList.remove('btn-outline-secondary');
            }
    }
    
    // Tüm aktif olmayan butonların outline stilini geri yükle
    if (alignNoneBtn && !alignNoneBtn.classList.contains('active')) {
        alignNoneBtn.classList.add('btn-outline-secondary');
    }
    if (alignLeftBtn && !alignLeftBtn.classList.contains('active')) {
        alignLeftBtn.classList.add('btn-outline-secondary');
    }
    if (alignCenterBtn && !alignCenterBtn.classList.contains('active')) {
        alignCenterBtn.classList.add('btn-outline-secondary');
    }
    if (alignRightBtn && !alignRightBtn.classList.contains('active')) {
        alignRightBtn.classList.add('btn-outline-secondary');
    }
}

/**
 * Resim hizalamasını sıfırlar
 * @param {HTMLImageElement} img - Resim elementi
 */
function resetImageAlignment(img) {
    img.style.float = '';
    img.style.display = '';
    img.style.marginLeft = '';
    img.style.marginRight = '';
    img.style.marginTop = '';
    img.style.marginBottom = '';
    
    // Sınıfları temizle ve editor-image sınıfını eklemeyi unutma
    img.className = 'editor-image';
}

/**
 * Resmin hizalamasını belirler
 * @param {HTMLImageElement} img - Resim elementi
 * @returns {string} - Hizalama tipi ('none', 'left', 'center', 'right')
 */
function getImageAlignment(img) {
    if (img.classList.contains('image-align-left')) {
        return 'left';
    } else if (img.classList.contains('image-align-center')) {
        return 'center';
    } else if (img.classList.contains('image-align-right')) {
        return 'right';
    }
    return 'none';
}

/**
 * Resim araç çubuğunun aktif olup olmadığını kontrol eder
 * @returns {boolean}
 */
function isImageToolbarActive() {
    const imageToolbar = document.getElementById('image-toolbar');
    return imageToolbar && !imageToolbar.classList.contains('d-none');
}

/**
 * Aktif resmi döndürür
 * @returns {HTMLImageElement|null}
 */
function getActiveImage() {
    return activeImage;
}

/**
 * Mouse ile resim boyutlandırma özelliğini ekleyin
 * Aşağıdaki kodu image-toolbar.js dosyasına ekleyin
 */

// Boyutlandırma işlemleri için gerekli değişkenler
let resizeHandles = null;
let isResizing = false;
let startX, startY, startWidth, startHeight;

/**
 * Resmi seçili hale getirir ve araç çubuğunu gösterir
 * @param {HTMLImageElement} img - Seçilecek resim
 * @param {HTMLElement} editor - Editör elementi
 */
function selectImage(img, editor) {
    if (isHtmlViewMode()) {
        return;
    }
    
    // Editörün içinde olan resimle işlem yap
    if (!editor.contains(img)) return;
    
    // Önceki seçili resmi temizle
    clearImageSelection();
    
    // Yeni resmi seç
    activeImage = img;
    activeImage.classList.add('selected-image');
    
    // En-boy oranını hesapla
    aspectRatio = img.naturalWidth / img.naturalHeight;
    
    // Araç çubuğunu göster
    showImageToolbar();
    
    // Araç çubuğunu güncelle
    updateToolbarControls();
    
    // Boyutlandırma kulplarını göster
    createResizeHandles(editor);
}

/**
 * Seçili resmi temizler
 */
function clearImageSelection() {
    if (activeImage) {
        activeImage.classList.remove('selected-image');
        activeImage = null;
    }
    
    // Boyutlandırma kulplarını kaldır
    removeResizeHandles();
}

/**
 * Boyutlandırma kulplarını oluşturur
 * @param {HTMLElement} editor - Editör elementi
 */
function createResizeHandles(editor) {
    // Önce varsa eski kulpları kaldır
    removeResizeHandles();
    
    if (!activeImage) return;
    
    // Boyutlandırma kulpları konteynerı
    resizeHandles = document.createElement('div');
    resizeHandles.className = 'resize-handles';
    
    // 8 yöndeki kulpları oluştur
    const positions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    
    positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-handle-${pos}`;
        handle.dataset.position = pos;
        resizeHandles.appendChild(handle);
        
        // Mouse olaylarını ekle
        handle.addEventListener('mousedown', startResize);
    });
    
    // Editöre ekle
    editor.appendChild(resizeHandles);
    
    // Kulpları resmin etrafına yerleştir
    positionResizeHandles();
}

/**
 * Boyutlandırma kulplarını kaldırır
 */
function removeResizeHandles() {
    if (resizeHandles && resizeHandles.parentNode) {
        resizeHandles.parentNode.removeChild(resizeHandles);
        resizeHandles = null;
    }
}

 
/**
 * Boyutlandırma kulplarını seçili resmin etrafına yerleştirir
 */
function positionResizeHandles() {
    if (!activeImage || !resizeHandles) return;
    
    try {
        // Doğrudan resmin boyutlarını ve pozisyonunu al
        const imageRect = activeImage.getBoundingClientRect();
        const editorRect = activeImage.closest('[contenteditable]').getBoundingClientRect();
        
        // Editöre göre göreceli pozisyon hesapla
        // Hizalama durumlarını da dikkate alarak hesaplama yap
        const left = imageRect.left - editorRect.left;
        const top = imageRect.top - editorRect.top;
        
        // Resizehandles'ı konumlandır
        resizeHandles.style.position = 'absolute';
        resizeHandles.style.left = `${left}px`;
        resizeHandles.style.top = `${top}px`;
        resizeHandles.style.width = `${imageRect.width}px`;
        resizeHandles.style.height = `${imageRect.height}px`;
        
        // Z-index ayarı yap - hizalama durumlarında özellikle önemli
        resizeHandles.style.zIndex = '100';
        
        // Çerçeveyi resmin tam boyutunda olacak şekilde ayarla
        resizeHandles.style.boxSizing = 'border-box';
        
        // Sayfada scroll olması durumunda da doğru konumlandır
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Hizalama türünü kontrol et ve gerekirse ek düzeltmeler yap
        const imageAlignment = getImageAlignment(activeImage);
        
        // Float kullanılan durumlarda ek düzeltme gerekebilir
        if (imageAlignment === 'left' || imageAlignment === 'right') {
            // Float durumlarında, position: absolute olan tutacaklar için
            // akış dışına çıktığından özel hesaplama gerekiyor
            
            // Computedstyle ile float değerini kontrol et ve gerekli düzeltmeyi yap
            const computedStyle = window.getComputedStyle(activeImage);
            
            // Float kullanılıyorsa özel bir düzeltme yapmak gerekebilir
            if (computedStyle.float === 'left' || computedStyle.float === 'right') {
                // Pozisyonu bir kez daha kontrol et ve gerekirse düzelt
                const updatedImageRect = activeImage.getBoundingClientRect();
                resizeHandles.style.left = `${updatedImageRect.left - editorRect.left}px`;
                resizeHandles.style.top = `${updatedImageRect.top - editorRect.top}px`;
            }
        }
    } catch (e) {
        console.error('Resize handles konumlandırma hatası:', e);
    }
}
/**
 * Boyutlandırma işlemini başlatır
 * @param {MouseEvent} e - Mouse olayı
 */
function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!activeImage) return;
    
    isResizing = true;
    document.body.classList.add('resizing'); // Özel cursor için sınıf ekle
    
    // Başlangıç koordinatları
    startX = e.clientX;
    startY = e.clientY;
    
    // Başlangıç boyutları
    startWidth = activeImage.offsetWidth;
    startHeight = activeImage.offsetHeight;
    
    // Kulpun pozisyonu
    const position = e.target.dataset.position;
    
    // Global resize olaylarını ekle
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    
    // En-boy oranı kilidi durumu
    const lockRatioCheckbox = document.getElementById('img-lock-ratio');
    const keepRatio = lockRatioCheckbox && lockRatioCheckbox.checked;
    
    /**
     * Boyutlandırma işlemini gerçekleştirir
     * @param {MouseEvent} moveEvent - Mouse hareket olayı
     */
    function resize(moveEvent) {
        if (!isResizing) return;
        
        moveEvent.preventDefault();
        
        // Fare hareketi miktarı
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        
        let newWidth = startWidth;
        let newHeight = startHeight;
        
        // Pozisyona göre boyutları güncelle
        switch (position) {
            case 'e':  // Sağ
                newWidth = startWidth + dx;
                if (keepRatio) {
                    newHeight = Math.round(newWidth / aspectRatio);
                }
                break;
            case 'se': // Sağ alt
                newWidth = startWidth + dx;
                if (keepRatio) {
                    newHeight = Math.round(newWidth / aspectRatio);
                } else {
                    newHeight = startHeight + dy;
                }
                break;
            case 's':  // Alt
                newHeight = startHeight + dy;
                if (keepRatio) {
                    newWidth = Math.round(newHeight * aspectRatio);
                }
                break;
            case 'sw': // Sol alt
                newWidth = startWidth - dx;
                if (keepRatio) {
                    newHeight = Math.round(newWidth / aspectRatio);
                } else {
                    newHeight = startHeight + dy;
                }
                break;
            case 'w':  // Sol
                newWidth = startWidth - dx;
                if (keepRatio) {
                    newHeight = Math.round(newWidth / aspectRatio);
                }
                break;
            case 'nw': // Sol üst
                newWidth = startWidth - dx;
                if (keepRatio) {
                    newHeight = Math.round(newWidth / aspectRatio);
                } else {
                    newHeight = startHeight - dy;
                }
                break;
            case 'n':  // Üst
                newHeight = startHeight - dy;
                if (keepRatio) {
                    newWidth = Math.round(newHeight * aspectRatio);
                }
                break;
            case 'ne': // Sağ üst
                newWidth = startWidth + dx;
                if (keepRatio) {
                    newHeight = Math.round(newWidth / aspectRatio);
                } else {
                    newHeight = startHeight - dy;
                }
                break;
        }
        
        // Minimum boyut sınırlaması
        newWidth = Math.max(10, newWidth);
        newHeight = Math.max(10, newHeight);
        
        // Resim boyutunu güncelle
        activeImage.style.width = `${newWidth}px`;
        activeImage.style.height = `${newHeight}px`;
        
        // Kulpları yeniden konumlandır
        positionResizeHandles();
        
        // Toolbar'daki input değerlerini güncelle
        const widthInput = document.getElementById('img-width');
        const heightInput = document.getElementById('img-height');
        
        if (widthInput) widthInput.value = newWidth;
        if (heightInput) heightInput.value = newHeight;
    }
    
    /**
     * Boyutlandırma işlemini sonlandırır
     */
    function stopResize() {
        isResizing = false;
        document.body.classList.remove('resizing'); // Özel cursor sınıfını kaldır
        
        // Global resize olaylarını kaldır
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }
}

// Scroll ve resize olaylarını dinle
window.addEventListener('scroll', function() {
    if (activeImage) {
        positionResizeHandles();
    }
});

window.addEventListener('resize', function() {
    if (activeImage) {
        positionResizeHandles();
    }
});

const ImageToolbar = {
    initImageToolbar,
    selectImage,
    clearImageSelection,
    showImageToolbar,
    hideImageToolbar,
    isImageToolbarActive,
    getActiveImage,
    createResizeHandles,
    removeResizeHandles,
    positionResizeHandles
};

// Modülü dışa aktar - Bu satırı düzeltin
export default ImageToolbar;