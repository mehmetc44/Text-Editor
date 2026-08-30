/**
 * Zengin Metin Editörü - Resim Ekleme Modülü
 * Bu modül, editöre resim ekleme işlemlerini yönetir.
 */

// image-insertion.js dosyasına eklenecek bir değişken
// Dosyanın en üstüne diğer global değişkenlerle beraber ekleyin
let savedRange = null;

/**
 * Resim ekleme diyaloğunu gösterir
 * @param {HTMLElement} container - Diyaloğun ekleneceği konteyner
 * @param {Function} onInsert - Resim eklendiğinde çağrılacak fonksiyon
 */
function showImageDialog(container, onInsert) {
    // İmleç konumunu (range) kaydet
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
    }
    
    // Varsa mevcut diyaloğu kaldır
    const existingDialog = document.getElementById('image-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    // Dialog oluştur
    const dialog = document.createElement('div');
    dialog.id = 'image-dialog';
    dialog.className = 'image-dialog card';
    dialog.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Resim Ekle</h5>
            <button type="button" class="btn-close" id="close-image-dialog" aria-label="Kapat"></button>
        </div>
        <div class="card-body">
            <div class="mb-3">
                <label for="image-url" class="form-label">Resim URL'si</label>
                <input type="text" class="form-control" id="image-url" placeholder="https://ornek.com/resim.jpg">
            </div>
            <div class="mb-3">
                <label for="image-description" class="form-label">Resim Açıklaması (Alt)</label>
                <input type="text" class="form-control" id="image-description" placeholder="Resim açıklaması">
            </div>
            <div class="mb-3">
                <label class="form-label d-block">veya Dosya Seçin</label>
                <input type="file" class="form-control" id="image-file" accept="image/*">
            </div>
            <div class="mb-3">
                <label class="form-label">Önizleme</label>
                <div id="image-preview" class="image-preview border rounded d-flex align-items-center justify-content-center">
                    <div class="text-muted py-5">Önizleme burada görünecek</div>
                </div>
            </div>
            <div class="d-flex justify-content-end">
                <button type="button" class="btn btn-secondary me-2" id="cancel-image">İptal</button>
                <button type="button" class="btn btn-primary" id="insert-image" disabled>Ekle</button>
            </div>
        </div>
    `;
    
    // Diyaloğu konteyner'a ekle
    container.appendChild(dialog);
    
    // DOM elementlerini al
    const closeBtn = document.getElementById('close-image-dialog');
    const cancelBtn = document.getElementById('cancel-image');
    const insertBtn = document.getElementById('insert-image');
    const urlInput = document.getElementById('image-url');
    const descInput = document.getElementById('image-description');
    const fileInput = document.getElementById('image-file');
    const preview = document.getElementById('image-preview');
    
    // URL değiştiğinde önizleme göster
    urlInput.addEventListener('input', updatePreview);
    
    // Dosya seçildiğinde önizleme göster
    fileInput.addEventListener('change', function() {
        // URL input'u temizle
        urlInput.value = '';
        updatePreview();
    });
    
    // Kapatma işlemleri
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    
    // Ekle butonuna tıklandığında
    insertBtn.addEventListener('click', function() {
        let imageUrl = urlInput.value.trim();
        const imageAlt = descInput.value.trim();
        
        // URL yerine dosya seçilmiş mi kontrol et
        if (fileInput.files && fileInput.files[0] && !imageUrl) {
            const file = fileInput.files[0];
            imageUrl = URL.createObjectURL(file);
        }
        
        // Geri çağrı fonksiyonunu çağır
        if (imageUrl && typeof onInsert === 'function') {
            onInsert(imageUrl, imageAlt);
            closeDialog();
        }
    });
    
    // Önizlemeyi güncelle
    function updatePreview() {
        const imageUrl = urlInput.value.trim();
        const fileSelected = fileInput.files && fileInput.files[0];
        
        // Ekle butonunu aktifleştir/devre dışı bırak
        insertBtn.disabled = !(imageUrl || fileSelected);
        
        // Önizlemeyi temizle
        preview.innerHTML = '';
        
        if (imageUrl) {
            // URL'den görüntüyü yükle
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = descInput.value || 'Önizleme';
            img.className = 'img-fluid mx-auto d-block';
            img.style.maxHeight = '200px';
            
            img.addEventListener('load', function() {
                preview.innerHTML = '';
                preview.appendChild(img);
            });
            
            img.addEventListener('error', function() {
                preview.innerHTML = '<div class="text-danger py-5">Görüntü yüklenemedi. URL\'yi kontrol edin.</div>';
            });
            
            preview.innerHTML = '<div class="text-muted py-5">Yükleniyor...</div>';
            preview.appendChild(img);
        } else if (fileSelected) {
            // Dosyadan görüntüyü yükle
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = descInput.value || 'Önizleme';
                img.className = 'img-fluid mx-auto d-block';
                img.style.maxHeight = '200px';
                
                preview.innerHTML = '';
                preview.appendChild(img);
            };
            
            reader.readAsDataURL(fileSelected);
        } else {
            preview.innerHTML = '<div class="text-muted py-5">Önizleme burada görünecek</div>';
        }
    }
    
    // Diyaloğu kapat
    function closeDialog() {
        dialog.remove();
    }
    
    // Input'a odaklan
    urlInput.focus();
}

/**
 * Editöre resim ekler
 * @param {HTMLElement} editor - Editör elementi
 * @param {string} imageUrl - Resim URL'si
 * @param {string} imageAlt - Resim açıklaması
 * @returns {HTMLElement|null} - Eklenen resim elementi veya null
 */
function insertImage(editor, imageUrl, imageAlt = '') {
    if (!editor || !imageUrl) return null;
    
    // Editörü odaklandır
    editor.focus();
    
    // Kaydedilmiş imleç konumunu kullan
    let range;
    if (savedRange) {
        // Kaydedilen range'i kullan
        range = savedRange;
        
        // Seçimi ayarla
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Kullanımdan sonra temizle
        savedRange = null;
    } else {
        // Eğer kaydedilmiş bir konum yoksa yeni bir seçim al
        const selection = window.getSelection();
        if (!selection.rangeCount) {
            // Seçim yoksa, editörün başında yeni bir range oluştur
            range = document.createRange();
            range.setStart(editor, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        range = selection.getRangeAt(0);
    }
    
    // Resim elementi oluştur
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = imageAlt;
    img.className = 'editor-image';
    img.dataset.originalSrc = imageUrl;
    
    // Seçili içeriği temizle ve resmi ekle
    range.deleteContents();
    range.insertNode(img);
    
    // İmleci resimden sonraya taşı
    range.setStartAfter(img);
    range.collapse(true);
    
    // Seçimi güncelle
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Editör içeriğini düzgün formata getirmek için normalize et
    editor.normalize();
    
    // Resim elementini döndür
    return img;
}

/**
 * Base64 formatında bir resmi ekler
 * @param {HTMLElement} editor - Editör elementi
 * @param {string} base64Data - Base64 formatında resim datası
 * @param {string} altText - Resim açıklaması
 * @returns {HTMLElement|null} - Eklenen resim elementi veya null
 */
function insertBase64Image(editor, base64Data, altText = '') {
    return insertImage(editor, base64Data, altText);
}

/**
 * Panodan resim ekler
 * @param {HTMLElement} editor - Editör elementi
 * @param {ClipboardEvent} event - Pano olayı
 * @returns {Promise<boolean>} - Ekleme başarılı mı?
 */
async function handlePasteImage(editor, event) {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return false;
    
    // Pano içeriğini kontrol et
    const items = clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Resim tipi kontrolü
        if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            event.stopPropagation();
            
            // Blob'u al
            const blob = item.getAsFile();
            
            // Dosyayı base64'e dönüştür
            const base64Data = await readFileAsBase64(blob);
            
            // Resmi ekle
            insertBase64Image(editor, base64Data, 'Yapıştırılan resim');
            return true;
        }
    }
    
    return false;
}

/**
 * Dosyayı Base64 formatına dönüştürür
 * @param {File|Blob} file - Dosya veya Blob
 * @returns {Promise<string>} - Base64 formatında veri
 */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
            resolve(reader.result);
        };
        
        reader.onerror = error => {
            reject(error);
        };
        
        reader.readAsDataURL(file);
    });
}

// Dışa aktarılacak metodlar
const ImageInsertion = {
    showImageDialog,
    insertImage,
    insertBase64Image,
    handlePasteImage
};

// Modülü dışa aktar
export default ImageInsertion;