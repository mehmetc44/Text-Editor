/**
 * Zengin Metin Editörü - Resim Boyutlandırma Modülü
 * Bu modül, editördeki resimleri boyutlandırma ve düzenleme işlemlerini yönetir.
 */

// Boyutlandırma işlemleri için gerekli değişkenler
let activeImage = null;
let resizeHandles = null;
let isResizing = false;
let startX, startY, startWidth, startHeight;
let aspectRatio = 1;

/**
 * Bir resmi seçili hale getirir ve boyutlandırma kulplarını gösterir
 * @param {HTMLImageElement} image - Boyutlandırılacak resim elementi
 * @param {HTMLElement} editor - Editör elementi
 * @param {boolean} openEditor - Düzenleme panelini aç
 */
function selectImage(image, editor, openEditor = false) {
    // Seçili resmi temizle
    clearImageSelection(editor);
    
    // Yeni seçili resmi belirle
    activeImage = image;
    
    // Boyutlandırma kulpları oluştur
    createResizeHandles(editor);
    
    // Kulpları resmin etrafına yerleştir
    positionResizeHandles();
    
    // Resme seçili sınıfını ekle
    activeImage.classList.add('selected-image');
    
    // Orijinal oranı hesapla
    aspectRatio = activeImage.naturalWidth / activeImage.naturalHeight;
}

/**
 * Seçili resmi temizler ve boyutlandırma kulplarını kaldırır
 * @param {HTMLElement} editor - Editör elementi
 */
function clearImageSelection(editor) {
    // Seçili resmi sıfırla
    if (activeImage) {
        activeImage.classList.remove('selected-image');
        activeImage = null;
    }
    
    // Boyutlandırma kulplarını kaldır
    if (resizeHandles) {
        try {
            if (resizeHandles.parentNode) {
                resizeHandles.parentNode.removeChild(resizeHandles);
            }
        } catch (e) {
            console.warn('Resize handles kaldırma hatası:', e);
        }
        resizeHandles = null;
    }
    
    // Özellikler panelini de temizle (ayrıca kontrol etmek daha güvenli)
    const propertiesPanel = editor.querySelector('.image-properties-panel');
    if (propertiesPanel && propertiesPanel.parentNode) {
        try {
            propertiesPanel.parentNode.removeChild(propertiesPanel);
        } catch (e) {
            console.warn('Özellikler paneli kaldırma hatası:', e);
        }
    }
}
/**
 * Boyutlandırma kulplarını oluşturur
 * @param {HTMLElement} editor - Editör elementi
 */
function createResizeHandles(editor) {
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
    
    // Geliştirilmiş özellikler paneli
    const propertiesPanel = document.createElement('div');
    propertiesPanel.className = 'image-properties-panel';
    propertiesPanel.innerHTML = `
        <div class="image-settings">
            <div class="image-dimensions mb-2">
                <input type="number" id="image-width" min="10" step="1" title="Genişlik" class="form-control form-control-sm">
                <span class="dimension-separator">×</span>
                <input type="number" id="image-height" min="10" step="1" title="Yükseklik" class="form-control form-control-sm">
                <label class="aspect-ratio-lock">
                    <input type="checkbox" id="lock-aspect-ratio" checked>
                    <i class="fas fa-lock"></i>
                </label>
            </div>
            
            <div class="mb-2">
                <input type="text" id="image-url" placeholder="Resim URL'si" class="form-control form-control-sm">
            </div>
            
            <div class="mb-2">
                <input type="text" id="image-alt" placeholder="Alternatif Metin (Alt)" class="form-control form-control-sm">
            </div>
            
            <div class="mb-2">
                <div class="btn-group btn-group-sm w-100" role="group">
                    <button type="button" class="btn btn-outline-secondary btn-sm" id="align-none">
                        <i class="fas fa-align-justify"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" id="align-left">
                        <i class="fas fa-align-left"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" id="align-center">
                        <i class="fas fa-align-center"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" id="align-right">
                        <i class="fas fa-align-right"></i>
                    </button>
                </div>
            </div>
            
            <div class="image-actions mt-2 d-flex justify-content-between">
                <button type="button" class="btn btn-sm btn-outline-primary" id="btn-reset-image" title="Orijinal Boyut">
                    <i class="fas fa-undo"></i> Orijinal
                </button>
                <button type="button" class="btn btn-sm btn-outline-success" id="btn-apply-changes" title="Değişiklikleri Uygula">
                    <i class="fas fa-check"></i> Uygula
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" id="btn-remove-image" title="Resmi Kaldır">
                    <i class="fas fa-trash"></i> Kaldır
                </button>
            </div>
        </div>
    `;
    resizeHandles.appendChild(propertiesPanel);
    
    // Editöre ekle
    editor.appendChild(resizeHandles);
    
    // Input ve buton olaylarını ekle
    setupInputHandlers();
}

/**
 * Özellik panelindeki kontrollerin olay dinleyicilerini ayarlar
 */
function setupInputHandlers() {
    if (!activeImage || !resizeHandles) return;
    
    // Input elemanlarını al
    const widthInput = document.getElementById('image-width');
    const heightInput = document.getElementById('image-height');
    const lockAspectRatio = document.getElementById('lock-aspect-ratio');
    const resetButton = document.getElementById('btn-reset-image');
    const removeButton = document.getElementById('btn-remove-image');
    const applyButton = document.getElementById('btn-apply-changes');
    const urlInput = document.getElementById('image-url');
    const altInput = document.getElementById('image-alt');
    
    if (!widthInput || !heightInput || !applyButton) {
        console.warn('Input elemanları bulunamadı');
        return;
    }
    
    // URL & Alt Text değerlerini yükle
    if (urlInput) urlInput.value = activeImage.src;
    if (altInput) altInput.value = activeImage.alt || '';
    
    // Input değişimi olayları
    widthInput.addEventListener('change', function() {
        if (!activeImage) return;
        
        const newWidth = parseInt(this.value);
        if (isNaN(newWidth) || newWidth < 10) return;
        
        activeImage.style.width = `${newWidth}px`;
        
        // Oranı koru
        if (lockAspectRatio && lockAspectRatio.checked) {
            const newHeight = Math.round(newWidth / aspectRatio);
            activeImage.style.height = `${newHeight}px`;
            heightInput.value = newHeight;
        }
        
        positionResizeHandles();
    });
    
    heightInput.addEventListener('change', function() {
        if (!activeImage) return;
        
        const newHeight = parseInt(this.value);
        if (isNaN(newHeight) || newHeight < 10) return;
        
        activeImage.style.height = `${newHeight}px`;
        
        // Oranı koru
        if (lockAspectRatio && lockAspectRatio.checked) {
            const newWidth = Math.round(newHeight * aspectRatio);
            activeImage.style.width = `${newWidth}px`;
            widthInput.value = newWidth;
        }
        
        positionResizeHandles();
    });
    
    // URL değiştiğinde resmi güncelle
    if (urlInput) {
        urlInput.addEventListener('change', function() {
            if (!activeImage) return;
            
            const newUrl = this.value.trim();
            if (newUrl && newUrl !== activeImage.src) {
                // Resmi önceden yükle
                const tempImg = new Image();
                tempImg.onload = function() {
                    // Resim başarıyla yüklendi, kaynağı güncelle
                    activeImage.src = newUrl;
                    
                    // Boyut inputlarını güncelle
                    if (!activeImage.style.width && !activeImage.style.height) {
                        // Özel boyut yoksa, doğal boyutları güncelle
                        widthInput.value = tempImg.naturalWidth;
                        heightInput.value = tempImg.naturalHeight;
                    }
                };
                
                tempImg.onerror = function() {
                    // Resim yüklenemedi, hatayı göster
                    alert('Resim yüklenemedi. URL geçerli mi kontrol ediniz.');
                    urlInput.value = activeImage.src; // Önceki URL'yi geri yükle
                };
                
                tempImg.src = newUrl;
            }
        });
    }
    
    // Hizalama butonları
    setupAlignmentButtons();
    
    // Orijinal boyuta sıfırla
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            if (!activeImage) return;
            
            // Orijinal boyutları al
            const originalWidth = activeImage.naturalWidth;
            const originalHeight = activeImage.naturalHeight;
            
            // CSS stil özelliklerini kaldır
            activeImage.style.width = '';
            activeImage.style.height = '';
            
            // Input değerlerini güncelle
            widthInput.value = originalWidth;
            heightInput.value = originalHeight;
            
            // Kulpları yeniden konumlandır
            positionResizeHandles();
        });
    }
    
    // Resmi kaldır
    if (removeButton) {
        removeButton.addEventListener('click', function() {
            if (!activeImage) return;
            
            if (confirm('Resmi kaldırmak istediğinizden emin misiniz?')) {
                const imageToRemove = activeImage;
                const editor = imageToRemove.closest('[contenteditable]');
                clearImageSelection(editor);
                if (imageToRemove.parentNode) {
                    imageToRemove.parentNode.removeChild(imageToRemove);
                }
            }
        });
    }
    
    // Değişiklikleri uygula
    applyButton.addEventListener('click', function() {
        if (!activeImage) return;
        
        // Alt metnini güncelle
        activeImage.alt = altInput.value;
        
        // Seçimi kaldır
        const editor = activeImage.closest('[contenteditable]');
        clearImageSelection(editor);
        
        // Focus'u tekrar editöre ver
        setTimeout(() => {
            editor.focus();
        }, 10);
    });
    
    // Input değerlerini güncelle
    updateDimensionInputs();
}

// Hizalama butonlarının kurulumu için yardımcı fonksiyon
function setupAlignmentButtons() {
    const alignNone = document.getElementById('align-none');
    const alignLeft = document.getElementById('align-left');
    const alignCenter = document.getElementById('align-center');
    const alignRight = document.getElementById('align-right');
    
    if (!alignNone || !alignLeft || !alignCenter || !alignRight) {
        console.warn('Hizalama butonları bulunamadı');
        return;
    }
    
    // None (Hizalama yok)
    alignNone.addEventListener('click', function() {
        if (!activeImage) return;
        
        // Tüm hizalama sınıflarını kaldır
        activeImage.classList.remove('image-align-left', 'image-align-center', 'image-align-right');
        
        // Float özelliğini temizle
        activeImage.style.float = '';
        activeImage.style.display = '';
        activeImage.style.marginLeft = '';
        activeImage.style.marginRight = '';
        
        // Sınıf listesinde editor-image olduğundan emin ol
        if (!activeImage.classList.contains('editor-image')) {
            activeImage.classList.add('editor-image');
        }
        
        // Butonları güncelle
        updateAlignmentButtons('none');
        
        // Tutucuları yeniden konumlandır
        setTimeout(positionResizeHandles, 10);
    });
    
    // Sola hizala
    alignLeft.addEventListener('click', function() {
        if (!activeImage) return;
        
        // Tüm hizalama sınıflarını kaldır
        activeImage.classList.remove('image-align-center', 'image-align-right');
        
        // Gereken stil özelliklerini ayarla
        activeImage.style.float = 'left';
        activeImage.style.display = '';
        activeImage.style.marginRight = '1rem';
        activeImage.style.marginLeft = '';
        
        // Sınıf ekle (hem CSS hem de durum izleme için)
        activeImage.classList.add('editor-image', 'image-align-left');
        
        // Butonları güncelle
        updateAlignmentButtons('left');
        
        // Tutucuları yeniden konumlandır
        setTimeout(positionResizeHandles, 10);
    });
    
    // Ortala
    alignCenter.addEventListener('click', function() {
        if (!activeImage) return;
        
        // Tüm hizalama sınıflarını kaldır
        activeImage.classList.remove('image-align-left', 'image-align-right');
        
        // Gereken stil özelliklerini ayarla
        activeImage.style.float = '';
        activeImage.style.display = 'block';
        activeImage.style.marginLeft = 'auto';
        activeImage.style.marginRight = 'auto';
        
        // Sınıf ekle (hem CSS hem de durum izleme için)
        activeImage.classList.add('editor-image', 'image-align-center');
        
        // Butonları güncelle
        updateAlignmentButtons('center');
        
        // Tutucuları yeniden konumlandır
        setTimeout(positionResizeHandles, 10);
    });
    
    // Sağa hizala
    alignRight.addEventListener('click', function() {
        if (!activeImage) return;
        
        // Tüm hizalama sınıflarını kaldır
        activeImage.classList.remove('image-align-left', 'image-align-center');
        
        // Gereken stil özelliklerini ayarla
        activeImage.style.float = 'right';
        activeImage.style.display = '';
        activeImage.style.marginLeft = '1rem';
        activeImage.style.marginRight = '';
        
        // Sınıf ekle (hem CSS hem de durum izleme için)
        activeImage.classList.add('editor-image', 'image-align-right');
        
        // Butonları güncelle
        updateAlignmentButtons('right');
        
        // Tutucuları yeniden konumlandır
        setTimeout(positionResizeHandles, 10);
    });
    
    // Mevcut hizalama durumunu ayarla
    updateAlignmentButtons(getCurrentAlignment());
}

/**
 * Mevcut resim hizalamasını alır
 * @returns {string} - Hizalama değeri ('none', 'left', 'center', 'right')
 */
function getCurrentAlignment() {
    if (!activeImage) return 'none';
    
    if (activeImage.classList.contains('image-align-left')) {
        return 'left';
    } else if (activeImage.classList.contains('image-align-center')) {
        return 'center';
    } else if (activeImage.classList.contains('image-align-right')) {
        return 'right';
    }
    
    return 'none';
}

/**
 * Hizalama düğmelerinin durumunu günceller
 * @param {string} activeAlign - Aktif hizalama (none, left, center, right)
 */
function updateAlignmentButtons(activeAlign) {
    const alignBtns = {
        none: document.getElementById('align-none'),
        left: document.getElementById('align-left'),
        center: document.getElementById('align-center'),
        right: document.getElementById('align-right')
    };
    
    if (!alignBtns.none) return; // Butonlar henüz oluşturulmamış
    
    // Tüm butonları sıfırla
    Object.values(alignBtns).forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-outline-secondary');
    });
    
    // Aktif butonu belirle
    if (alignBtns[activeAlign]) {
        alignBtns[activeAlign].classList.add('active');
        alignBtns[activeAlign].classList.remove('btn-outline-secondary');
        alignBtns[activeAlign].classList.add('btn-secondary');
    }
}

/**
 * Boyutlandırma kulplarını seçili resmin etrafına yerleştirir
 */
 /**
 * Boyutlandırma kulplarını seçili resmin etrafına yerleştirir
 * Bu fonksiyon, hizalama (float) durumlarını da dikkate alır
 */
function positionResizeHandles() {
    if (!activeImage || !resizeHandles) return;
    
    try {
        // Doğrudan resmin boyutlarını ve pozisyonunu al
        const imageRect = activeImage.getBoundingClientRect();
        const editorRect = activeImage.closest('[contenteditable]').getBoundingClientRect();
        
        // Sayfanın scroll değerlerini al
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // Editöre göre göreceli pozisyon hesapla
        const left = imageRect.left - editorRect.left;
        const top = imageRect.top - editorRect.top;
        
        // Önemli: Resmin hizalamasını kontrol et ve ona göre konum ayarla
        const computedStyle = window.getComputedStyle(activeImage);
        const isFloatLeft = computedStyle.float === 'left';
        const isFloatRight = computedStyle.float === 'right';
        const isCenter = activeImage.classList.contains('image-align-center');
        
        // Resizehandles'ı konumlandır
        resizeHandles.style.position = 'absolute';
        resizeHandles.style.left = `${left}px`;
        resizeHandles.style.top = `${top}px`;
        resizeHandles.style.width = `${imageRect.width}px`;
        resizeHandles.style.height = `${imageRect.height}px`;
        
        // Float durumlarında z-index ve özel konumlandırma ayarları
        if (isFloatLeft || isFloatRight || isCenter) {
            // Z-index'i artır ki içerik arkasında kalmasın
            resizeHandles.style.zIndex = '1000';
            
            // Özellikler panelinin konumunu güncelle
            const propertiesPanel = resizeHandles.querySelector('.image-properties-panel');
            if (propertiesPanel) {
                // Panelin üstünde veya altında görünmesini sağla
                // Float durumunda, panelin resmin yanında görünmesi sorun olabilir
                if (isFloatLeft || isFloatRight) {
                    propertiesPanel.style.left = '0';
                    propertiesPanel.style.width = '100%';
                }
                
                // Center hizalamada ekstra ayarlar
                if (isCenter) {
                    propertiesPanel.style.left = '0';
                    propertiesPanel.style.width = '100%';
                }
            }
        } else {
            // Normal durumda varsayılan z-index'e dön
            resizeHandles.style.zIndex = '100';
        }
        
        // Çerçeveyi resmin tam boyutunda olacak şekilde ayarla
        resizeHandles.style.boxSizing = 'border-box';
        
        // Input değerlerini güncelle
        updateDimensionInputs();
    } catch (e) {
        console.error('Resize handles konumlandırma hatası:', e);
    }
}
/**
 * Boyut input değerlerini günceller
 */
function updateDimensionInputs() {
    if (!activeImage) return;
    
    const widthInput = document.getElementById('image-width');
    const heightInput = document.getElementById('image-height');
    
    if (widthInput && heightInput) {
        const width = activeImage.width || activeImage.naturalWidth;
        const height = activeImage.height || activeImage.naturalHeight;
        
        widthInput.value = width;
        heightInput.value = height;
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
    const lockAspectRatio = document.getElementById('lock-aspect-ratio');
    const keepRatio = lockAspectRatio && lockAspectRatio.checked;
    
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
        
        // Input değerlerini güncelle
        updateDimensionInputs();
    }
}

/**
 * Belirtilen editördeki tüm resimlere tıklama olayı ekler
 * @param {HTMLElement} editor - Editör elementi
 */
function initImageResizeListeners(editor) {
    // Var olan resimler
    const images = editor.querySelectorAll('img');
    images.forEach(img => {
        // Resmin tıklanabilir olduğunu belirtmek için sınıf ekle
        img.classList.add('editor-image');
        
        // Mevcut olayları temizle
        img.removeEventListener('click', function() {});
        
        // Tıklama olayını ekle
        img.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            selectImage(this, editor);
        });
    });
    
    // Yeni eklenen resimleri izle
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeName === 'IMG') {
                    // Resmin tıklanabilir olduğunu belirtmek için sınıf ekle
                    node.classList.add('editor-image');
                    
                    // Tıklama olayını ekle
                    node.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        selectImage(this, editor);
                    });
                }
            });
        });
    });
    
    observer.observe(editor, { childList: true, subtree: true });
    
    // Editör içinde bir yere tıklandığında seçimi kaldır
    editor.addEventListener('click', function(e) {
        // Eğer bir resme tıklanmadıysa seçimi kaldır
        if (e.target.tagName !== 'IMG' && e.target === editor) {
            clearImageSelection(editor);
        }
    });
    
    // Pencere yeniden boyutlandırıldığında kulpları güncelle
    window.addEventListener('resize', function() {
        if (activeImage) {
            positionResizeHandles();
        }
    });
    
    // Scroll olayında kulpları yeniden konumlandır
    editor.addEventListener('scroll', function() {
        if (activeImage) {
            positionResizeHandles();
        }
    });
    
    // Document scroll olayında kulpları yeniden konumlandır
    document.addEventListener('scroll', function() {
        if (activeImage) {
            setTimeout(positionResizeHandles, 10); // Kısa bir gecikme ekleyerek scroll sonrasını bekle
        }
    });
    
    // ESC tuşuna basıldığında seçimi temizle
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && activeImage) {
            clearImageSelection(editor);
        }
    });
}

// Dışa aktarılacak metodlar
const ImageResize = {
    selectImage,
    clearImageSelection,
    positionResizeHandles,
    initImageResizeListeners
};

// Global olarak erişim için window nesnesine ekle
window.ImageResize = ImageResize;

// Modülü dışa aktar
export default ImageResize;