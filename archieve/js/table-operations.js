/**
 * Zengin Metin Editörü - Tablo İşlemleri Modülü
 * Bu modül tablo ekleme, düzenleme ve biçimlendirme işlemlerini yönetir.
 */

/**
 * Tablo ekleme diyaloğunu gösterir
 * @param {HTMLElement} container - Diyaloğun ekleneceği konteyner
 * @param {Function} onInsert - Tablo eklendiğinde çağrılacak fonksiyon
 */
function showTableDialog(container, onInsert) {
    // Varsa mevcut diyaloğu kaldır
    const existingDialog = document.getElementById('table-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    // Dialog oluştur
    const dialog = document.createElement('div');
    dialog.id = 'table-dialog';
    dialog.className = 'table-dialog card';
    dialog.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Tablo Ekle</h5>
            <button type="button" class="btn-close" id="close-table-dialog" aria-label="Kapat"></button>
        </div>
        <div class="card-body">
            <div class="mb-3">
                <label for="table-rows" class="form-label">Satır Sayısı</label>
                <input type="number" class="form-control" id="table-rows" min="1" max="20" value="3">
            </div>
            <div class="mb-3">
                <label for="table-cols" class="form-label">Sütun Sayısı</label>
                <input type="number" class="form-control" id="table-cols" min="1" max="10" value="3">
            </div>
            <div class="mb-3">
                <label for="table-width" class="form-label">Tablo Genişliği</label>
                <select class="form-select" id="table-width">
                    <option value="100%">Tam Genişlik (%100)</option>
                    <option value="75%">Genişlik %75</option>
                    <option value="50%">Genişlik %50</option>
                    <option value="auto">Otomatik (İçeriğe Göre)</option>
                </select>
            </div>
            <div class="mb-3">
                <label for="table-style" class="form-label">Tablo Stili</label>
                <select class="form-select" id="table-style">
                    <option value="default">Varsayılan</option>
                    <option value="bordered">Kenarlıklı</option>
                    <option value="striped">Zebra Desenli</option>
                    <option value="bordered-striped">Kenarlıklı + Zebra</option>
                    <option value="minimal">Minimal</option>
                </select>
            </div>
            <div class="mb-3">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="table-header" checked>
                    <label class="form-check-label" for="table-header">
                        Başlık Satırı Ekle
                    </label>
                </div>
            </div>
            <div class="table-preview mb-3">
                <label class="form-label">Önizleme</label>
                <div id="table-preview-container" class="border rounded p-2 bg-light">
                    <!-- Önizleme içeriği JavaScript ile oluşturulacak -->
                </div>
            </div>
            <div class="d-flex justify-content-end">
                <button type="button" class="btn btn-secondary me-2" id="cancel-table">İptal</button>
                <button type="button" class="btn btn-primary" id="insert-table">Ekle</button>
            </div>
        </div>
    `;
    
    // Diyaloğu konteyner'a ekle
    container.appendChild(dialog);
    
    // DOM elementlerini al
    const closeBtn = document.getElementById('close-table-dialog');
    const cancelBtn = document.getElementById('cancel-table');
    const insertBtn = document.getElementById('insert-table');
    const rowsInput = document.getElementById('table-rows');
    const colsInput = document.getElementById('table-cols');
    const widthSelect = document.getElementById('table-width');
    const styleSelect = document.getElementById('table-style');
    const headerCheckbox = document.getElementById('table-header');
    const previewContainer = document.getElementById('table-preview-container');
    
    // Input değerleri değiştiğinde önizlemeyi güncelle
    rowsInput.addEventListener('input', updatePreview);
    colsInput.addEventListener('input', updatePreview);
    widthSelect.addEventListener('change', updatePreview);
    styleSelect.addEventListener('change', updatePreview);
    headerCheckbox.addEventListener('change', updatePreview);
    
    // Kapatma işlemleri
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    
    // Ekle butonuna tıklandığında
    insertBtn.addEventListener('click', function() {
        const rows = parseInt(rowsInput.value) || 3;
        const cols = parseInt(colsInput.value) || 3;
        const width = widthSelect.value;
        const style = styleSelect.value;
        const includeHeader = headerCheckbox.checked;
        
        // Tablo HTML'ini oluştur
        const tableHtml = generateTableHtml(rows, cols, width, style, includeHeader);
        
        // Geri çağrı fonksiyonunu çağır
        if (typeof onInsert === 'function') {
            onInsert(tableHtml);
            closeDialog();
        }
    });
    
    // Önizlemeyi güncelle
    function updatePreview() {
        const rows = parseInt(rowsInput.value) || 3;
        const cols = parseInt(colsInput.value) || 3;
        const width = widthSelect.value;
        const style = styleSelect.value;
        const includeHeader = headerCheckbox.checked;
        
        // Önizleme için tablo oluştur (küçük örnekle)
        const previewRows = Math.min(rows, 4);
        const previewCols = Math.min(cols, 4);
        
        const tableHtml = generateTableHtml(previewRows, previewCols, width, style, includeHeader, true);
        previewContainer.innerHTML = tableHtml;
    }
    
    // Diyaloğu kapat
    function closeDialog() {
        dialog.remove();
    }
    
    // İlk önizlemeyi göster
    updatePreview();
}
/**
 * Tablo HTML'i oluştur
 * @param {number} rows - Satır sayısı
 * @param {number} cols - Sütun sayısı
 * @param {string} width - Tablo genişliği
 * @param {string} style - Tablo stili
 * @param {boolean} includeHeader - Başlık satırı eklensin mi?
 * @param {boolean} isPreview - Önizleme için mi?
 * @returns {string} - Oluşturulan tablo HTML'i
 */
function generateTableHtml(rows, cols, width, style, includeHeader, isPreview = false) {
    // Tablo sınıflarını belirle
    let tableClasses = 'editor-table';
    
    switch (style) {
        case 'bordered':
            tableClasses += ' table-bordered';
            break;
        case 'striped':
            tableClasses += ' table-striped';
            break;
        case 'bordered-striped':
            tableClasses += ' table-bordered table-striped';
            break;
        case 'minimal':
            tableClasses += ' table-minimal';
            break;
        default:
            tableClasses += ' table-default';
    }
    
    // Önizleme için ek sınıf
    if (isPreview) {
        tableClasses += ' table-preview';
    }
    
    // Tablo HTML'ini oluştur
    let tableHtml = `<table class="${tableClasses}" width="${width}"`;
    
    // Tablo için data attributeları ekle (düzenleme için)
    if (!isPreview) {
        tableHtml += ` data-rows="${rows}" data-cols="${cols}" data-style="${style}"`;
    }
    
    tableHtml += '>';
    
    // Başlık satırı
    if (includeHeader) {
        tableHtml += '<thead><tr>';
        for (let col = 0; col < cols; col++) {
            tableHtml += `<th>Başlık ${col + 1}</th>`;
        }
        tableHtml += '</tr></thead>';
    }
    
    // Tablo gövdesi
    tableHtml += '<tbody>';
    
    // Satırları oluştur
    for (let row = 0; row < rows; row++) {
        tableHtml += '<tr>';
        
        // Eğer header varsa ve ilk satırsa, bunu atla (zaten header oluşturuldu)
        if (includeHeader && row === 0 && isPreview) {
            continue;
        }
        
        // Hücreleri oluştur
        for (let col = 0; col < cols; col++) {
            tableHtml += `<td>Hücre ${row + 1},${col + 1}</td>`;
        }
        
        tableHtml += '</tr>';
    }
    
    tableHtml += '</tbody></table>';
    
    return tableHtml;
}
/**
 * Editöre tablo ekler
 * @param {HTMLElement} editor - Editör elementi
 * @param {string} tableHtml - Eklenecek tablo HTML'i
 * @returns {HTMLElement|null} - Eklenen tablo elementi veya null
 */
function insertTable(editor, tableHtml) {
    if (!editor || !tableHtml) return null;
    
    // Editörü odakla
    editor.focus();
    
    // Seçimi al
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    
    // Seçili aralığı al
    const range = selection.getRangeAt(0);
    
    // Tablo elementini oluştur (geçici bir div içinde)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = tableHtml;
    const table = tempDiv.firstChild;
    
    // Tabloyu ekle
    range.deleteContents();
    range.insertNode(table);
    
    // İmleci tablonun sonrasına taşı
    range.setStartAfter(table);
    range.setEndAfter(table);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Tabloya tıklama olaylarını ekle
    setupTableEvents(table, editor);
    
    return table;
}

/**
 * Tabloya tıklama ve düzenleme olaylarını ekler
 * @param {HTMLElement} table - Tablo elementi
 * @param {HTMLElement} editor - Editör elementi
 */
function setupTableEvents(table, editor) {
    // Önce varsa eski olayları temizle (çift olay eklemeyi önlemek için)
    table.removeEventListener('click', tableCellClickHandler);
    
    // Tablo click olayını ekle
    table.addEventListener('click', tableCellClickHandler);
    
    // Hücreleri işaretleyelim - işaretli hücreler zaten işlenmiş demektir
    const cells = table.querySelectorAll('td, th');
    cells.forEach(cell => {
        // Hücre daha önce işlenmediyse
        if (!cell.hasAttribute('data-cell-initialized')) {
            // Hücreyi işaretleyelim
            cell.setAttribute('data-cell-initialized', 'true');
            
            // Hücreye contenteditable özelliği ekleyelim
            cell.setAttribute('contenteditable', 'true');
        }
    });
}

/**
 * Tablo hücrelerine tıklama olayını işler
 * @param {Event} e - Tıklama olayı
 */
function tableCellClickHandler(e) {
    const cell = e.target.closest('td, th');
    if (cell) {
        // Diğer tüm seçili hücreleri temizle
        const editor = cell.closest('[contenteditable]');
        clearCellSelection(editor);
        
        // Bu hücreyi seç
        selectCell(cell);
        
        // Olay yayılımını durdurma (tabloya tıklama olayını engelle)
        e.stopPropagation();
    } else {
        // Hücre değil, tablonun kendisine tıklandı
        const table = e.currentTarget;
        if (table) {
            // Tüm seçili tabloları temizle
            const editor = table.closest('[contenteditable]');
            clearTableSelection(editor);
            
            // Bu tabloyu seç
            selectTable(table);
            
            // Olay yayılımını durdurma
            e.stopPropagation();
        }
    }
}
/**
 * Tabloyu seçili hale getirir
 * @param {HTMLElement} table - Seçilecek tablo
 */
function selectTable(table) {
    table.classList.add('selected-table');
    showTableToolbar(table);
}

/**
 * Tüm seçili tabloları temizler
 * @param {HTMLElement} editor - Editör elementi
 */
function clearTableSelection(editor) {
    // Tüm seçili tabloları bul ve seçimi kaldır
    const selectedTables = editor.querySelectorAll('.selected-table');
    selectedTables.forEach(table => {
        table.classList.remove('selected-table');
    });
    
    
}

 

/**
 * Tüm seçili hücreleri temizler
 * @param {HTMLElement} editor - Editör elementi
 */
function clearCellSelection(editor) {
    // Tüm seçili hücreleri bul ve seçimi kaldır
    const selectedCells = editor.querySelectorAll('.selected-cell');
    selectedCells.forEach(cell => {
        cell.classList.remove('selected-cell');
    });
    
    // Hücre araç çubuklarını kaldır
    removeCellToolbars();
}
/**
 * Tablo araç çubuğunu gösterir
 * @param {HTMLElement} table - Tablo elementi
 */
 
 
/**
 * Tablo araç çubuğu olaylarını ayarlar
 * @param {HTMLElement} toolbar - Araç çubuğu elementi
 * @param {HTMLElement} table - Tablo elementi
 */
 
/**
 * Hücre araç çubuğu olaylarını ayarlar
 * @param {HTMLElement} toolbar - Araç çubuğu elementi
 * @param {HTMLElement} cell - Hücre elementi
 */

function setupCellToolbarEvents(toolbar, cell, row, table) {
    // Tüm butonları seç
    const buttons = toolbar.querySelectorAll('button[data-action]');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.getAttribute('data-action');
            
            console.log('Button clicked:', action); // Debugging için log
            
            // İlgili işlemi gerçekleştir
            switch (action) {
                // Hücre İşlemleri
                case 'merge-cell':
                    mergeCell(cell);
                    break;
                    
                case 'split-cell':
                    splitCell(cell);
                    break;
                    
                case 'align-cell':
                    const align = this.getAttribute('data-align');
                    alignCell(cell, align);
                    break;
                    
                case 'change-cell-type':
                    const type = this.getAttribute('data-type');
                    changeCellType(cell, type);
                    break;
                
                // Satır İşlemleri
                case 'insert-row-above':
                    insertRow(table, row.rowIndex);
                    toolbar.remove(); // İşlem sonrası araç çubuğunu kaldır
                    break;
                    
                case 'insert-row-below':
                    insertRow(table, row.rowIndex + 1);
                    toolbar.remove(); // İşlem sonrası araç çubuğunu kaldır
                    break;
                    
                case 'delete-row':
                    deleteRow(table, row.rowIndex);
                    toolbar.remove(); // İşlem sonrası araç çubuğunu kaldır
                    break;
                
                // Sütun İşlemleri
                case 'insert-column-left':
                    insertColumn(table, cell.cellIndex);
                    toolbar.remove(); // İşlem sonrası araç çubuğunu kaldır
                    break;
                    
                case 'insert-column-right':
                    insertColumn(table, cell.cellIndex + 1);
                    toolbar.remove(); // İşlem sonrası araç çubuğunu kaldır
                    break;
                    
                case 'delete-column':
                    deleteColumn(table, cell.cellIndex);
                    toolbar.remove(); // İşlem sonrası araç çubuğunu kaldır
                    break;
            }
            
            e.stopPropagation();
        });
    });
}
 

 
/**
 * Tabloya satır ekler
 * @param {HTMLElement} table - Tablo elementi
 * @param {number} rowIndex - Eklenecek satır indeksi
 */
function insertRow(table, rowIndex) {
    const tbody = table.querySelector('tbody') || table;
    const rows = tbody.querySelectorAll('tr');
    
    // Satır sayısını ve sütun sayısını al
    const rowCount = rows.length;
    const colCount = rows[0] ? rows[0].cells.length : 0;
    
    if (rowIndex < 0 || rowIndex > rowCount) {
        rowIndex = rowCount; // Sınırları aşarsa en sona ekle
    }
    
    // Yeni satır oluştur
    const newRow = document.createElement('tr');
    
    // Hücreleri ekle
    for (let i = 0; i < colCount; i++) {
        const cell = document.createElement('td');
        // contenteditable özelliğini true olarak ayarla
        cell.setAttribute('contenteditable', 'true');
        // Boş bir içerik ekle (önemli: sadece boş string değil, bunu br etiketi kullanarak yapalım)
        cell.innerHTML = '<br>';
        
        newRow.appendChild(cell);
        
        // Hücre olaylarını ekle
        cell.addEventListener('click', function(e) {
            // Diğer tüm seçili hücreleri temizle
            clearCellSelection(table.closest('[contenteditable]'));
            
            // Bu hücreyi seç
            selectCell(cell);
            
            // Olay yayılımını durdurma
            e.stopPropagation();
        });
    }
    
    // Satırı ilgili konuma ekle
    if (rowIndex < rowCount) {
        tbody.insertBefore(newRow, rows[rowIndex]);
    } else {
        tbody.appendChild(newRow);
    }
    
    return newRow; // Eklenen satırı döndür (gerekirse kullanılabilir)
}

/**
 * Tabloya sütun ekler
 * @param {HTMLElement} table - Tablo elementi
 * @param {number} colIndex - Eklenecek sütun indeksi
 */
function insertColumn(table, colIndex) {
    // Tüm satırları al (thead ve tbody içindekiler dahil)
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody') || table;
    
    const headerRows = thead ? thead.querySelectorAll('tr') : [];
    const bodyRows = tbody.querySelectorAll('tr');
    
    // Toplam sütun sayısını al
    const colCount = bodyRows[0] ? bodyRows[0].cells.length : 0;
    
    if (colIndex < 0 || colIndex > colCount) {
        colIndex = colCount; // Sınırları aşarsa en sona ekle
    }
    
    // Önce başlık satırlarına sütun ekle
    headerRows.forEach(row => {
        const cell = document.createElement('th');
        cell.setAttribute('contenteditable', 'true');
        cell.innerHTML = '<br>'; // Boş bir içerik ekle
        
        if (colIndex < row.cells.length) {
            row.insertBefore(cell, row.cells[colIndex]);
        } else {
            row.appendChild(cell);
        }
        
        // Hücre olaylarını ekle
        cell.addEventListener('click', function(e) {
            // Diğer tüm seçili hücreleri temizle
            clearCellSelection(table.closest('[contenteditable]'));
            
            // Bu hücreyi seç
            selectCell(cell);
            
            // Olay yayılımını durdurma
            e.stopPropagation();
        });
    });
    
    // Sonra gövde satırlarına sütun ekle
    bodyRows.forEach(row => {
        const cell = document.createElement('td');
        cell.setAttribute('contenteditable', 'true');
        cell.innerHTML = '<br>'; // Boş bir içerik ekle
        
        if (colIndex < row.cells.length) {
            row.insertBefore(cell, row.cells[colIndex]);
        } else {
            row.appendChild(cell);
        }
        
        // Hücre olaylarını ekle
        cell.addEventListener('click', function(e) {
            // Diğer tüm seçili hücreleri temizle
            clearCellSelection(table.closest('[contenteditable]'));
            
            // Bu hücreyi seç
            selectCell(cell);
            
            // Olay yayılımını durdurma
            e.stopPropagation();
        });
    });
}

/**
 * Tablodan satır siler
 * @param {HTMLElement} table - Tablo elementi
 * @param {number} rowIndex - Silinecek satır indeksi
 */
function deleteRow(table, rowIndex) {
    // Thead ve tbody içindeki satırları al
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody') || table;
    
    // İlgili satırı bul
    let targetRow;
    
    // Eğer başlık satırı ise thead içinde ara
    if (thead && rowIndex === 0) {
        targetRow = thead.querySelector('tr');
    } else {
        // Gövde satırını bul
        const bodyRows = tbody.querySelectorAll('tr');
        const bodyRowIndex = thead ? rowIndex - 1 : rowIndex;
        targetRow = bodyRowIndex >= 0 && bodyRowIndex < bodyRows.length ? bodyRows[bodyRowIndex] : null;
    }
    
    // Satır bulunamadı veya son satır ise silme
    if (!targetRow || (tbody.querySelectorAll('tr').length <= 1 && !thead)) {
        return;
    }
    
    // Satırı sil
    targetRow.parentNode.removeChild(targetRow);
}

/**
 * Tablodan sütun siler
 * @param {HTMLElement} table - Tablo elementi
 * @param {number} colIndex - Silinecek sütun indeksi
 */
function deleteColumn(table, colIndex) {
    // Tüm satırları al
    const rows = table.querySelectorAll('tr');
    
    // Sütun sayısını al
    const firstRow = rows[0];
    if (!firstRow || firstRow.cells.length <= 1) {
        return; // Son sütunu silme
    }
    
    // Her satırdan ilgili sütunu sil
    rows.forEach(row => {
        if (colIndex >= 0 && colIndex < row.cells.length) {
            row.removeChild(row.cells[colIndex]);
        }
    });
}

/**
 * Tabloyu siler
 * @param {HTMLElement} table - Silinecek tablo
 */
function deleteTable(table) {
    if (confirm('Tabloyu silmek istediğinizden emin misiniz?')) {
        // Önce seçimi ve araç çubuklarını temizle
        clearTableSelection(table.closest('[contenteditable]'));
        
        // Tabloyu kaldır
        table.parentNode.removeChild(table);
    }
}
/**
 * Tablonun stilini değiştirir
 * @param {HTMLElement} table - Tablo elementi
 * @param {string} style - Yeni stil ('default', 'bordered', 'striped', vb.)
 */
function changeTableStyle(table, style) {
    // Önce mevcut stil sınıflarını kaldır
    table.classList.remove('table-default', 'table-bordered', 'table-striped', 'table-minimal');
    
    // Yeni stil sınıfını ekle
    switch (style) {
        case 'bordered':
            table.classList.add('table-bordered');
            break;
        case 'striped':
            table.classList.add('table-striped');
            break;
        case 'bordered-striped':
            table.classList.add('table-bordered', 'table-striped');
            break;
        case 'minimal':
            table.classList.add('table-minimal');
            break;
        default:
            table.classList.add('table-default');
    }
    
    // Data attribute'u güncelle
    table.setAttribute('data-style', style);
}

/**
 * Hücreleri birleştirir
 * @param {HTMLElement} cell - Seçili hücre
 */
function mergeCell(cell) {
    // Şimdilik basit bir yaklaşım - sadece sağdaki hücreyi birleştir
    const row = cell.parentNode;
    const cellIndex = cell.cellIndex;
    
    // Sağdaki hücreyi kontrol et
    if (cellIndex < row.cells.length - 1) {
        const nextCell = row.cells[cellIndex + 1];
        
        // İçeriği birleştir
        cell.innerHTML += nextCell.innerHTML;
        
        // Genişliği ayarla (colspan)
        const currentColspan = parseInt(cell.getAttribute('colspan')) || 1;
        const nextColspan = parseInt(nextCell.getAttribute('colspan')) || 1;
        cell.setAttribute('colspan', currentColspan + nextColspan);
        
        // Sağdaki hücreyi kaldır
        row.removeChild(nextCell);
    }
    
    // Seçili hücrenin görünümünü güncelle
    setTimeout(() => {
        clearCellSelection(cell.closest('[contenteditable]'));
        selectCell(cell);
    }, 10);
}

/**
 * Hücreyi böler
 * @param {HTMLElement} cell - Seçili hücre
 */
function splitCell(cell) {
    const row = cell.parentNode;
    const cellIndex = cell.cellIndex;
    const colspan = parseInt(cell.getAttribute('colspan')) || 1;
    
    // Eğer birleştirilmiş hücre değilse işlem yapma
    if (colspan <= 1) return;
    
    // Yeni hücre oluştur
    const newCell = document.createElement(cell.tagName);
    newCell.setAttribute('contenteditable', 'true');
    newCell.setAttribute('colspan', colspan - 1);
    
    // İçerik ekle (boş bir hücre)
    newCell.innerHTML = '';
    
    // Hücre olaylarını ekle
    newCell.addEventListener('click', function(e) {
        // Diğer tüm seçili hücreleri temizle
        clearCellSelection(cell.closest('[contenteditable]'));
        
        // Bu hücreyi seç
        selectCell(newCell);
        
        // Olay yayılımını durdurma
        e.stopPropagation();
    });
    
    // Orijinal hücrenin colspan değerini güncelle
    cell.setAttribute('colspan', '1');
    
    // Yeni hücreyi ekle
    if (cellIndex < row.cells.length - 1) {
        row.insertBefore(newCell, row.cells[cellIndex + 1]);
    } else {
        row.appendChild(newCell);
    }
    
    // Seçili hücrenin görünümünü güncelle
    setTimeout(() => {
        clearCellSelection(cell.closest('[contenteditable]'));
        selectCell(cell);
    }, 10);
}

/**
 * Hücre içeriğini hizalar
 * @param {HTMLElement} cell - Seçili hücre
 * @param {string} align - Hizalama değeri ('left', 'center', 'right')
 */
function alignCell(cell, align) {
    // Hem inline stil hem de class ile hizalamayı ayarlayalım
    cell.style.textAlign = align;
    
    // Değişikliği görmek için log ekleyelim
    console.log('Hücre hizalama yapıldı:', align, cell);
    
    // Seçili hücrenin görünümünü güncelle
    setTimeout(() => {
        // Araç çubuklarını yeniden konumlandır
        const editor = cell.closest('[contenteditable]');
        removeCellToolbars();
        selectCell(cell);
    }, 10);
}

/**
 * Hücre tipini değiştirir
 * @param {HTMLElement} cell - Seçili hücre
 * @param {string} type - Yeni hücre tipi ('td' veya 'th')
 */
function changeCellType(cell, type) {
    if (cell.tagName.toLowerCase() === type) return;
    
    // Yeni hücre oluştur
    const newCell = document.createElement(type);
    
    // Özellikleri kopyala
    Array.from(cell.attributes).forEach(attr => {
        newCell.setAttribute(attr.name, attr.value);
    });
    
    // İçeriği kopyala
    newCell.innerHTML = cell.innerHTML;
    
    // Hücre olaylarını ekle
    newCell.addEventListener('click', function(e) {
        // Diğer tüm seçili hücreleri temizle
        clearCellSelection(cell.closest('[contenteditable]'));
        
        // Bu hücreyi seç
        selectCell(newCell);
        
        // Olay yayılımını durdurma
        e.stopPropagation();
    });
    
    // Eski hücreyi yenisiyle değiştir
    cell.parentNode.replaceChild(newCell, cell);
    
    // Seçili hücrenin görünümünü güncelle
    setTimeout(() => {
        clearCellSelection(newCell.closest('[contenteditable]'));
        selectCell(newCell);
    }, 10);
}

/**
 * Satır işlemleri penceresini gösterir - Basitleştirilmiş versiyon
 * @param {HTMLElement} cell - Seçili hücre
 */
function showRowOperationsDialog(cell) {
    console.log("Dialog function called!");
    
    // Seçili hücrenin satırını bul
    const row = cell.closest('tr');
    if (!row) {
        console.error("Row not found for the cell");
        return;
    }
    
    // Tablonun referansını al
    const table = cell.closest('table');
    if (!table) {
        console.error("Table not found for the cell");
        return;
    }
    
    // Basit bir dialog oluştur
    const dialog = document.createElement('div');
    dialog.style.position = 'absolute';
    dialog.style.backgroundColor = 'white';
    dialog.style.border = '1px solid #ccc';
    dialog.style.borderRadius = '4px';
    dialog.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    dialog.style.padding = '10px';
    dialog.style.zIndex = '1000';
    dialog.style.minWidth = '150px';
    
    // Dialog içeriğini oluştur
    dialog.innerHTML = `
        <div style="margin-bottom:8px; font-weight:bold;">Satır İşlemleri</div>
        <button id="btn-row-above" style="display:block; width:100%; margin-bottom:5px; padding:4px;">Üste Satır Ekle</button>
        <button id="btn-row-below" style="display:block; width:100%; margin-bottom:5px; padding:4px;">Alta Satır Ekle</button>
        <button id="btn-row-delete" style="display:block; width:100%; margin-bottom:5px; padding:4px;">Satırı Sil</button>
    `;
    
    // Hücrenin konumunu al
    const cellRect = cell.getBoundingClientRect();
    const editorRect = cell.closest('[contenteditable]').getBoundingClientRect();
    
    // Dialog'u hücrenin yanına konumlandır
    dialog.style.left = `${cellRect.right - editorRect.left + 10}px`;
    dialog.style.top = `${cellRect.top - editorRect.top}px`;
    
    // Diallog'u editöre ekle
    const editor = cell.closest('[contenteditable]');
    editor.appendChild(dialog);
    
    // Butonlara olay dinleyicileri ekle
    dialog.querySelector('#btn-row-above').addEventListener('click', function() {
        insertRow(table, row.rowIndex);
        dialog.remove();
    });
    
    dialog.querySelector('#btn-row-below').addEventListener('click', function() {
        insertRow(table, row.rowIndex + 1);
        dialog.remove();
    });
    
    dialog.querySelector('#btn-row-delete').addEventListener('click', function() {
        deleteRow(table, row.rowIndex);
        dialog.remove();
    });
    
    // Dışarı tıklandığında kapat
    document.addEventListener('click', function closeOnClick(e) {
        if (!dialog.contains(e.target) && !e.target.matches('[data-action="show-row-operations"]')) {
            dialog.remove();
            document.removeEventListener('click', closeOnClick);
        }
    });
}

// Dışa aktarılacak metodlar
const TableOperations = {
    showTableDialog,
    generateTableHtml,
    insertTable,
    setupTableEvents,
    selectTable,
    clearTableSelection,
    clearCellSelection, 
    insertRow,
    insertColumn,
    deleteRow,
    deleteColumn,
    deleteTable,
    changeTableStyle,
    mergeCell,
    splitCell,
    alignCell,
    changeCellType,
    showRowOperationsDialog
};

// Modülü dışa aktar
export default TableOperations;