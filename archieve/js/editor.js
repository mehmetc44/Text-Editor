import TextFormatting from './text-formatting.js';
import TextAlignment from './text-alignment.js';
import HtmlView from './html-view.js';
import HtmlPreview from './html-preview.js';
import ListFormatting from './list-formatting.js';
import ImageInsertion from './image-insertion.js';
import ImageResize from './image-resize.js';
import TableOperations from './table-operations.js';
import ImageToolbar from './image-toolbar.js';
import TableToolbar from './table-toolbar.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elementleri
    const editor = document.getElementById('editor');
    const editorContainer = document.getElementById('editor-container');
    const boldBtn = document.getElementById('btn-bold');
    const italicBtn = document.getElementById('btn-italic');
    const underlineBtn = document.getElementById('btn-underline');
    const strikethroughBtn = document.getElementById('btn-strikethrough');
    const fontSizeSelect = document.getElementById('fontSize');
    const fontFamilySelect = document.getElementById('fontFamily');
    const clearFormatBtn = document.getElementById('btn-clear-format');
    const clearBtn = document.getElementById('btn-clear');
    const htmlOutput = document.getElementById('html-output');
    const htmlOutputCard = document.getElementById('html-output-card'); // Get the card element
    const editorModeIndicator = document.getElementById('editor-mode-indicator');

    // Hizalama Butonları
    const alignLeftBtn = document.getElementById('btn-align-left');
    const alignCenterBtn = document.getElementById('btn-align-center');
    const alignRightBtn = document.getElementById('btn-align-right');
    const alignJustifyBtn = document.getElementById('btn-align-justify');
    
    // Girinti Butonları
    const indentBtn = document.getElementById('btn-indent');
    const outdentBtn = document.getElementById('btn-outdent');
    
    // Liste Butonları
    const unorderedListBtn = document.getElementById('btn-unordered-list');
    const orderedListBtn = document.getElementById('btn-ordered-list');
    const increaseListIndentBtn = document.getElementById('btn-increase-list-indent');
    const decreaseListIndentBtn = document.getElementById('btn-decrease-list-indent');
    
    // Resim Ekleme Butonu
    const insertImageBtn = document.getElementById('btn-insert-image');
    ImageToolbar.initImageToolbar(editor);

    // Tablo  Ekleme Butonu
    const insertTableBtn = document.getElementById('btn-insert-table');
    // HTML Görüntüleme ve Önizleme Butonları
    const htmlViewBtn = document.getElementById('btn-html-view');
    const htmlPreviewBtn = document.getElementById('btn-html-preview');

    // HTML Çıktısını Güncelleme
    function updateHTMLOutput() {
        HtmlView.updateHtmlOutput(editor, htmlOutput);
    }

    // Resim Ekleme İşlevi
    function handleImageInsertion() {
        if (HtmlView.getHtmlViewMode()) return; // HTML modundaysa işlemi iptal et
        
        ImageInsertion.showImageDialog(document.body, (imageUrl, imageAlt) => {
            const img = ImageInsertion.insertImage(editor, imageUrl, imageAlt);
            if (img) {
                // Resim eklendikten sonra HTML çıktısını güncelle
                updateHTMLOutput();
                
                // Resmi seç
                setTimeout(() => {
                    ImageResize.selectImage(img, editor);
                }, 100);
            }
        });
    }

    // Tablo Araç Çubuğunu Başlat
    TableToolbar.initTableToolbar(editor);

    // Editor İçeriği Değiştiğinde
    editor.addEventListener('input', updateHTMLOutput);
    
    // Başlangıç İçeriği
    editor.innerHTML = '<p>Buraya metin yazabilirsiniz. Düzenlemek için metni seçin ve üstteki düğmelerden formatlamak istediğiniz stili seçin.</p>';
    updateHTMLOutput();
    
    
    // Panodan resim yapıştırma özelliği
    editor.addEventListener('paste', function(e) {
        // HTML modundaysa işlemi iptal et
        if (HtmlView.getHtmlViewMode()) return;
        
        // Panodan resim var mı kontrol et
        ImageInsertion.handlePasteImage(editor, e)
        .then(imageInserted => {
            if (imageInserted) {
                // Resim eklendiyse HTML çıktısını güncelle
                updateHTMLOutput();
                
                // Son eklenen resmi bul ve seç
                setTimeout(() => {
                    const images = editor.querySelectorAll('img');
                    if (images.length > 0) {
                        const lastImage = images[images.length - 1];
                        ImageToolbar.selectImage(lastImage, editor);
                    }
                }, 100);
            }
        });
    });
    // Editör içindeki tıklamaları işle
editor.addEventListener('click', function(e) {
    // HTML modundaysa işlem yapma
    if (HtmlView.getHtmlViewMode()) return;
    
    // Eğer bir tabloya tıklandıysa
    const clickedTable = e.target.closest('table');
    if (clickedTable) {
        // Tablo hücresine mi yoksa tablonun kendisine mi tıklandı?
        const clickedCell = e.target.closest('td, th');
        if (clickedCell) {
            // Hücreye tıklandıysa
            e.stopPropagation();
            TableToolbar.selectCell(clickedCell, clickedTable, editor);
        } else {
            // Tablonun kendisine tıklandıysa
            e.stopPropagation();
            TableToolbar.selectTable(clickedTable, editor);
        }
        return;
    }
    
    // Eğer bir resme tıklandıysa
    if (e.target.tagName === 'IMG') {
        e.stopPropagation();
        ImageToolbar.selectImage(e.target, editor);
        return;
    }
    
    // Editörün boş bir alanına tıklandıysa tüm seçimleri temizle
    if (e.target === editor || e.target.tagName === 'P' || e.target.tagName === 'DIV') {
        // Resim seçimini temizle
        if (typeof ImageToolbar !== 'undefined') {
            ImageToolbar.clearImageSelection();
            ImageToolbar.hideImageToolbar();
        }
        
        // Tablo seçimini temizle
        if (typeof TableToolbar !== 'undefined') {
            TableToolbar.clearSelection();
            TableToolbar.hideTableToolbar();
        }
    }
});
 
    // Table Insert butonundaki olay dinleyicisini güncelleyin:
    insertTableBtn.addEventListener('click', function() {
        if (HtmlView.getHtmlViewMode()) return; // HTML modundaysa işlemi iptal et
        
        TableOperations.showTableDialog(document.body, (tableHtml) => {
            const table = TableOperations.insertTable(editor, tableHtml);
            if (table) {
                // Tablo eklendikten sonra HTML çıktısını güncelle
                updateHTMLOutput();
                
                // Tabloyu seç ve araç çubuğunu göster
                setTimeout(() => {
                    TableToolbar.selectTable(table, editor);
                }, 100);
            }
        });
    });
    // Toolbar Butonlarını Güncelle (ve biçimlendirme butonlarını enable/disable et)
    function updateToolbar() {
        // HTML görüntüleme modunda ise biçimlendirme butonlarını devre dışı bırak
        const htmlViewMode = HtmlView.getHtmlViewMode();
        const formattingButtons = document.querySelectorAll('.btn-group button:not(#btn-html-view):not(#btn-html-preview), .btn-group select');
        
        formattingButtons.forEach(button => {
            button.disabled = htmlViewMode;
        });
        
        const imageToolbar = document.getElementById('image-toolbar');
        if (imageToolbar) {
            if (htmlViewMode) {
                imageToolbar.classList.add('d-none');
            } else {
                // Normal modda ve bir resim seçiliyse göster
                if (typeof ImageToolbar !== 'undefined' && ImageToolbar.getActiveImage()) {
                    imageToolbar.classList.remove('d-none');
                } else {
                    imageToolbar.classList.add('d-none');
                }
            }
        }

         // Tablo araç çubuğunu da gizle/göster
        const tableToolbar = document.getElementById('table-toolbar');
        if (tableToolbar) {
            if (htmlViewMode) {
                tableToolbar.classList.add('d-none');
            } else {
                // Normal modda ve bir tablo seçiliyse göster
                if (typeof TableToolbar !== 'undefined' && TableToolbar.getActiveTable()) {
                    tableToolbar.classList.remove('d-none');
                } else {
                    tableToolbar.classList.add('d-none');
                }
            }
        }

        // HTML modu göstergesi ve HTML çıktı kartı görünürlüğü
        if (htmlViewMode) {
            // HTML modunda:
            // HTML çıktı kartını göster
            if (htmlOutputCard) {
                htmlOutputCard.classList.remove('d-none');
            }

            // Editörü düzenlenemez yap (html-view.js'de yapılıyor ama burada da stil için sınıf ekleyebiliriz)
            editor.classList.add('editor-html-mode'); // Sınıf ekle
            editor.contentEditable = 'false'; // Tekrar teyit et

            // Tablo araç çubuğunu gizle
                if (tableToolbar) {
                    tableToolbar.classList.add('d-none');
                }
                
                // Resim araç çubuğunu gizle
                if (imageToolbar) {
                    imageToolbar.classList.add('d-none');
                }
                
            editorModeIndicator.textContent = 'HTML Modu';
            editorModeIndicator.classList.remove('d-none');
            htmlViewBtn.classList.add('btn-active');
            
            // HTML modunda resim tutucuları gizle
            const resizeHandles = document.querySelector('.resize-handles');
            if (resizeHandles && resizeHandles.parentNode) {
                resizeHandles.parentNode.removeChild(resizeHandles);
            }
        } else {
            // Normal modda:
            // HTML çıktı kartını gizle
            if (htmlOutputCard) {
                htmlOutputCard.classList.add('d-none');
            }

            // Editörü düzenlenebilir yap
            editor.classList.remove('editor-html-mode'); // Sınıfı kaldır
            editor.contentEditable = 'true'; // Tekrar teyit et

            editorModeIndicator.classList.add('d-none');
            htmlViewBtn.classList.remove('btn-active');

            // Normal moddayken stil butonlarını güncelle
            const selection = TextFormatting.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            
            const range = selection.getRangeAt(0);
            let node = range.startContainer;
            
            // Text node ise parent'a bak
            if (node.nodeType === Node.TEXT_NODE) {
                node = node.parentNode;
            }
            
            // İmleç konumundaki stilleri hesapla
            let currentStyles = TextFormatting.computeCurrentStyles(node, editor);
            
            // Butonları güncelle
            boldBtn.classList.toggle('btn-active', currentStyles.isBold);
            italicBtn.classList.toggle('btn-active', currentStyles.isItalic);
            underlineBtn.classList.toggle('btn-active', currentStyles.isUnderline);
            strikethroughBtn.classList.toggle('btn-active', currentStyles.isStrikethrough);
            
            // Font boyutu ve ailesini güncelle
            updateFontSizeSelect(currentStyles.fontSize);
            updateFontFamilySelect(currentStyles.fontFamily);
            
            // Hizalama butonlarını güncelle
            const currentAlignment = TextAlignment.getCurrentAlignment();
            alignLeftBtn.classList.toggle('btn-active', currentAlignment === 'left');
            alignCenterBtn.classList.toggle('btn-active', currentAlignment === 'center');
            alignRightBtn.classList.toggle('btn-active', currentAlignment === 'right');
            alignJustifyBtn.classList.toggle('btn-active', currentAlignment === 'justify');
            
            // Liste butonlarını güncelle
            const listState = ListFormatting.checkListState(editor);
            unorderedListBtn.classList.toggle('btn-active', listState.isUnorderedList);
            orderedListBtn.classList.toggle('btn-active', listState.isOrderedList);
            
            // Liste girinti butonlarını güncelle
            increaseListIndentBtn.disabled = !(listState.isUnorderedList || listState.isOrderedList);
            decreaseListIndentBtn.disabled = !(listState.canDecreaseIndent);
        }
        
        // HTML önizleme butonu durumunu güncelle
        htmlPreviewBtn.classList.toggle('btn-active', HtmlPreview.getPreviewVisibility());
        
        // HTML çıktısını güncelle
        if (!htmlViewMode) {
            updateHTMLOutput();
        }
    }

    // Font boyutu seçicisini güncelle
    function updateFontSizeSelect(fontSize) {
        // Piksel değerini al (örn. "16px" -> 16)
        const fontSizeValue = parseInt(fontSize);
        
        // Font boyutunu dropdown değerlerine eşle
        let fontSizeIndex;
        if (fontSizeValue <= 10) {
            fontSizeIndex = '1';
        } else if (fontSizeValue <= 13) {
            fontSizeIndex = '2';
        } else if (fontSizeValue <= 16) {
            fontSizeIndex = '3';
        } else if (fontSizeValue <= 18) {
            fontSizeIndex = '4';
        } else if (fontSizeValue <= 24) {
            fontSizeIndex = '5';
        } else if (fontSizeValue <= 32) {
            fontSizeIndex = '6';
        } else {
            fontSizeIndex = '7';
        }
        
        // Dropdown'u güncelle
        fontSizeSelect.value = fontSizeIndex;
    }
    
    // Font ailesi seçicisini güncelle
    function updateFontFamilySelect(fontFamily) {
        if (!fontFamily) return;
        
        // Dropdown'daki her bir seçeneği kontrol et
        for (let i = 0; i < fontFamilySelect.options.length; i++) {
            const option = fontFamilySelect.options[i];
            const optionValue = option.value;
            
            // computedStyle'dan gelen fontFamily genellikle tırnak içinde olabilir
            // ve birden fazla alternatif font içerebilir (örn. "Arial, sans-serif")
            // Bu nedenle her bir seçenekle karşılaştırırken esnek davranmalıyız
            
            // Seçenek değeri fontFamily içinde geçiyorsa veya tersi
            if (fontFamily.includes(option.text) || 
                optionValue.includes(fontFamily) ||
                (optionValue.replace(/['"]/g, '').includes(fontFamily.replace(/['"]/g, '')))) {
                fontFamilySelect.value = optionValue;
                return;
            }
        }
        
        // Eşleşme bulunamazsa, ilk seçeneği kullan
        fontFamilySelect.value = fontFamilySelect.options[0].value;
    }

    // Buton Olay Dinleyicileri
    boldBtn.addEventListener('click', function() {
        const isActive = TextFormatting.toggleStyle('fontWeight', 'bold', 'normal');
        this.classList.toggle('btn-active', isActive);
        updateHTMLOutput();
    });
    
    italicBtn.addEventListener('click', function() {
        const isActive = TextFormatting.toggleStyle('fontStyle', 'italic', 'normal');
        this.classList.toggle('btn-active', isActive);
        updateHTMLOutput();
    });
    
    underlineBtn.addEventListener('click', function() {
        const isActive = TextFormatting.toggleStyle('textDecoration', 'underline', 'none');
        this.classList.toggle('btn-active', isActive);
        updateHTMLOutput();
    });
    
    strikethroughBtn.addEventListener('click', function() {
        const isActive = TextFormatting.toggleStyle('textDecoration', 'line-through', 'none');
        this.classList.toggle('btn-active', isActive);
        updateHTMLOutput();
    });
    
    // Hizalama Butonları
    alignLeftBtn.addEventListener('click', function() {
        TextAlignment.applyTextAlignment('left');
        
        // Hizalama butonlarını güncelle
        alignLeftBtn.classList.add('btn-active');
        alignCenterBtn.classList.remove('btn-active');
        alignRightBtn.classList.remove('btn-active');
        alignJustifyBtn.classList.remove('btn-active');
        
        updateHTMLOutput();
    });
    
    alignCenterBtn.addEventListener('click', function() {
        TextAlignment.applyTextAlignment('center');
        
        // Hizalama butonlarını güncelle
        alignLeftBtn.classList.remove('btn-active');
        alignCenterBtn.classList.add('btn-active');
        alignRightBtn.classList.remove('btn-active');
        alignJustifyBtn.classList.remove('btn-active');
        
        updateHTMLOutput();
    });
    
    alignRightBtn.addEventListener('click', function() {
        TextAlignment.applyTextAlignment('right');
        
        // Hizalama butonlarını güncelle
        alignLeftBtn.classList.remove('btn-active');
        alignCenterBtn.classList.remove('btn-active');
        alignRightBtn.classList.add('btn-active');
        alignJustifyBtn.classList.remove('btn-active');
        
        updateHTMLOutput();
    });
    
    alignJustifyBtn.addEventListener('click', function() {
        TextAlignment.applyTextAlignment('justify');
        
        // Hizalama butonlarını güncelle
        alignLeftBtn.classList.remove('btn-active');
        alignCenterBtn.classList.remove('btn-active');
        alignRightBtn.classList.remove('btn-active');
        alignJustifyBtn.classList.add('btn-active');
        
        updateHTMLOutput();
    });
    
    // Girinti Butonları
    indentBtn.addEventListener('click', function() {
        TextAlignment.increaseIndent();
        updateHTMLOutput();
    });
    
    outdentBtn.addEventListener('click', function() {
        TextAlignment.decreaseIndent();
        updateHTMLOutput();
    });
    
    // Liste Butonları
    unorderedListBtn.addEventListener('click', function() {
        ListFormatting.toggleUnorderedList(editor);
        updateToolbar();
    });
    
    orderedListBtn.addEventListener('click', function() {
        ListFormatting.toggleOrderedList(editor);
        updateToolbar();
    });
    
    increaseListIndentBtn.addEventListener('click', function() {
        ListFormatting.increaseListIndent(editor);
        updateToolbar();
    });
    
    decreaseListIndentBtn.addEventListener('click', function() {
        ListFormatting.decreaseListIndent(editor);
        updateToolbar();
    });
    
    // Resim Ekleme Butonu
    insertImageBtn.addEventListener('click', function() {
    if (HtmlView.getHtmlViewMode()) return; // HTML modundaysa işlemi iptal et
    
    ImageInsertion.showImageDialog(document.body, (imageUrl, imageAlt) => {
        const img = ImageInsertion.insertImage(editor, imageUrl, imageAlt);
        if (img) {
            // Resim eklendikten sonra HTML çıktısını güncelle
            updateHTMLOutput();
            
            // Eski resim seçim sistemi yerine yeni oluşturduğumuz toolbar'ı kullanalım
            setTimeout(() => {
                // Resmi seç ve araç çubuğunu göster
                ImageToolbar.selectImage(img, editor);
            }, 100);
        }
    });
});
    
    // HTML Görüntüleme ve Önizleme Butonları
    // HTML Görüntüleme ve Önizleme Butonları kısmında
    htmlViewBtn.addEventListener('click', function() {
        
          // Önce herhangi bir açık tablo seçimini temizle
        if (typeof TableToolbar !== 'undefined') {
            TableToolbar.clearSelection();
            TableToolbar.hideTableToolbar();
        }
        
        // Önce herhangi bir açık resim seçimini temizle
        if (typeof ImageToolbar !== 'undefined') {
            ImageToolbar.clearImageSelection();
            ImageToolbar.hideImageToolbar();
        }
        
        const htmlViewMode = HtmlView.toggleHtmlView(editor, htmlOutput, function(isHtmlMode) {
            // HTML modundan çıkış yapıldığında
            if (!isHtmlMode) {
                // Biraz bekleyerek içeriğin render olmasını bekle
                setTimeout(() => {
                    // Editördeki tüm tabloları yeniden initialize et
                    const tables = editor.querySelectorAll('table');
                    tables.forEach(table => {
                        // Tablo zaten editor-table sınıfına sahip değilse ekle
                        if (!table.classList.contains('editor-table')) {
                            table.classList.add('editor-table');
                        }
                        
                        // Her tablonun olay dinleyicileri yeniden ayarlanmalı
                        if (typeof TableToolbar !== 'undefined') {
                            TableToolbar.setupTableEventListeners(table, editor);
                        }
                    });
                    
                    // Tüm resimleri yeniden initialize et
                    if (typeof ImageToolbar !== 'undefined') {
                        ImageToolbar.initImageToolbar(editor);
                    }
                    
                    // Tablo araç çubuğunu yeniden initialize et
                    if (typeof TableToolbar !== 'undefined') {
                        TableToolbar.initTableToolbar(editor);
                    }
                }, 100);
            }
        });
        
        updateToolbar();
    });

    htmlPreviewBtn.addEventListener('click', function() {
        const htmlContent = editor.innerHTML;
        const isPreviewVisible = HtmlPreview.togglePreviewPanel(htmlContent, editorContainer);
        this.classList.toggle('btn-active', isPreviewVisible);
    });
    
    // Font Boyutu Değiştirme
    fontSizeSelect.addEventListener('change', function() {
        if (!TextFormatting.hasSelection()) return;
        
        const fontSize = this.value;
        let fontSizeValue;
        
        // Font boyutunu piksel değerlerine dönüştür
        switch (fontSize) {
            case '1': fontSizeValue = '10px'; break;
            case '2': fontSizeValue = '13px'; break;
            case '3': fontSizeValue = '16px'; break;
            case '4': fontSizeValue = '18px'; break;
            case '5': fontSizeValue = '24px'; break;
            case '6': fontSizeValue = '32px'; break;
            case '7': fontSizeValue = '48px'; break;
            default: fontSizeValue = '16px';
        }
        
        // Mevcut span'i güncelle veya yeni span oluştur
        TextFormatting.applyStyleToSelection('fontSize', fontSizeValue);
        updateHTMLOutput();
        updateToolbar();
    });
    
    // Font Ailesi Değiştirme
    fontFamilySelect.addEventListener('change', function() {
        if (!TextFormatting.hasSelection()) return;
        // Mevcut span'i güncelle veya yeni span oluştur
        TextFormatting.applyStyleToSelection('fontFamily', this.value);
        updateHTMLOutput();
        updateToolbar();
    });
    
    // Biçimlendirmeyi Temizleme Butonu
    clearFormatBtn.addEventListener('click', function() {
        TextFormatting.clearFormatting();
        updateHTMLOutput();
        updateToolbar();
    });
    
    // Temizleme Butonu
    clearBtn.addEventListener('click', function() {
        if (confirm('Editör içeriğini temizlemek istediğinizden emin misiniz?')) {
            editor.innerHTML = '';
            updateHTMLOutput();
            updateToolbar();
            
            // Önizleme paneli açıksa kapat
            if (HtmlPreview.getPreviewVisibility()) {
                HtmlPreview.togglePreviewPanel('', editorContainer);
                htmlPreviewBtn.classList.remove('btn-active');
            }
            
            // Resim seçimi ve boyutlandırma kulplarını kaldır
            ImageResize.clearImageSelection(editor);
        }
    });
    
 
    // Editör dışı tıklamalarda seçili resmi temizle ve araç çubuğunu gizle
document.addEventListener('click', function(e) {
    // Editör içeriğine, araç çubuğuna veya boyutlandırma kulplarına tıklanmadıysa
    const editor = document.getElementById('editor');
    const imageToolbar = document.getElementById('image-toolbar');
    
    const clickedOnEditor = editor.contains(e.target);
    const clickedOnToolbar = imageToolbar && imageToolbar.contains(e.target);
    const clickedOnHandles = e.target.closest('.resize-handles') !== null;
    
    // Eğer editör içeriğine, araç çubuğuna veya boyutlandırma kulplarına tıklanmadıysa
    // resim seçimini kaldır ve araç çubuğunu gizle
    if (!clickedOnEditor && !clickedOnToolbar && !clickedOnHandles) {
        ImageToolbar.clearImageSelection();
        ImageToolbar.hideImageToolbar();
    }
});
    
   // Scroll olayında resize kulplarını yeniden konumlandır
window.addEventListener('scroll', function() {
    if (ImageToolbar.getActiveImage()) {
        ImageToolbar.positionResizeHandles();
    }
});

// Pencere yeniden boyutlandırıldığında resize kulplarını yeniden konumlandır
window.addEventListener('resize', function() {
    if (ImageToolbar.getActiveImage()) {
        ImageToolbar.positionResizeHandles();
    }
});
    
    // Seçim ve İmleç Olayları
    document.addEventListener('selectionchange', updateToolbar);
    
    // İçerik değiştiğinde de toolbar'ı güncelle
    editor.addEventListener('input', updateToolbar);
    
    // İlk yüklenmede toolbar'ı güncelle
    editor.addEventListener('focus', updateToolbar);
    
    // Sayfa yüklendiğinde toolbar'ı güncelle
    updateToolbar();
    
    // Başlangıçta odağı editöre ver
    editor.focus();
});
