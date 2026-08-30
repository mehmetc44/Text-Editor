/**
 * Zengin Metin Editörü - Tablo Araç Çubuğu Modülü
 * Bu modül, editördeki tablolar için özel araç çubuğu işlevselliğini yönetir
 */

// Aktif tablo ve hücre
let activeTable = null;
let activeCell = null;

/**
 * Tablo araç çubuğunu başlatır
 * @param {HTMLElement} editor - Editör elementi
 */
function initTableToolbar(editor) {
    // DOM elementlerini al
    const tableToolbar = document.getElementById('table-toolbar');
    
    if (!tableToolbar) {
        console.error('Tablo araç çubuğu bulunamadı!');
        return;
    }
    
    // Tüm tabloları dinle
    setupTableListeners(editor);
    
    // Araç çubuğu butonlarını ayarla
    setupToolbarButtons(editor, tableToolbar);
    
    // Editör dışına tıklanınca araç çubuğunu gizle
    document.addEventListener('click', function(e) {
        if (!editor.contains(e.target) && !tableToolbar.contains(e.target)) {
            hideTableToolbar();
        }
    });
    
    // Yeni eklenen tablolara olay dinleyicisi ekle
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeName === 'TABLE' || 
                    (node.nodeType === Node.ELEMENT_NODE && node.querySelector('table'))) {
                    const tables = node.nodeName === 'TABLE' ? [node] : node.querySelectorAll('table');
                    tables.forEach(table => {
                        setupTableEventListeners(table, editor);
                    });
                }
            });
        });
    });
    
    observer.observe(editor, { childList: true, subtree: true });
}

/**
 * Editördeki tüm tablolara olay dinleyicisi ekler
 * @param {HTMLElement} editor - Editör elementi
 */
function setupTableListeners(editor) {
    const tables = editor.querySelectorAll('table');
    tables.forEach(table => {
        setupTableEventListeners(table, editor);
    });
}

/**
 * Bir tabloya olay dinleyicileri ekler
 * @param {HTMLTableElement} table - Tablo elementi
 * @param {HTMLElement} editor - Editör elementi
 */
function setupTableEventListeners(table, editor) {
    // Hali hazırda dinleyici varsa ekleme
    if (table.dataset.hasEventListener) return;
    
    table.dataset.hasEventListener = 'true';
    
    // Tablo sınıfını ekle (stil için)
    if (!table.classList.contains('editor-table')) {
        table.classList.add('editor-table');
    }
    
    // Tıklama olayını ekle
    table.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Hücreye tıklandıysa
        const cell = e.target.closest('td, th');
        if (cell) {
            selectCell(cell, table, editor);
            return;
        }
        
        // Tablonun kendisine tıklandıysa
        selectTable(table, editor);
    });
    
    // Tüm hücreleri düzenlenebilir yap
    const cells = table.querySelectorAll('td, th');
    cells.forEach(cell => {
        if (!cell.getAttribute('contenteditable')) {
            cell.setAttribute('contenteditable', 'true');
        }
        
        // Hücre tıklama olayını ekle
        cell.addEventListener('click', function(e) {
            e.stopPropagation();
            selectCell(cell, table, editor);
        });
    });
}

/**
 * Araç çubuğu butonlarını ve kontrollerini ayarlar
 * @param {HTMLElement} editor - Editör elementi
 * @param {HTMLElement} toolbar - Araç çubuğu elementi
 */
function setupToolbarButtons(editor, toolbar) {
    // Satır işlemleri
    const rowAboveBtn = document.getElementById('table-row-above');
    const rowBelowBtn = document.getElementById('table-row-below');
    const rowDeleteBtn = document.getElementById('table-row-delete');
    
    // Sütun işlemleri
    const colLeftBtn = document.getElementById('table-col-left');
    const colRightBtn = document.getElementById('table-col-right');
    const colDeleteBtn = document.getElementById('table-col-delete');
    
    // Hücre işlemleri
    const cellMergeBtn = document.getElementById('table-cell-merge');
    const cellSplitBtn = document.getElementById('table-cell-split');
    const alignLeftBtn = document.getElementById('table-align-left');
    const alignCenterBtn = document.getElementById('table-align-center');
    const alignRightBtn = document.getElementById('table-align-right');
    
    // Tablo stilleri
    const styleDefaultBtn = document.getElementById('table-style-default');
    const styleBorderedBtn = document.getElementById('table-style-bordered');
    const styleStripedBtn = document.getElementById('table-style-striped');
    const styleMinimalBtn = document.getElementById('table-style-minimal');
    
    // Tablo silme
    const tableDeleteBtn = document.getElementById('table-delete');
    
    // Satır işlemleri
    if (rowAboveBtn) {
        rowAboveBtn.addEventListener('click', function() {
            if (!activeTable || !activeCell) return;
            
            const rowIndex = activeCell.parentNode.rowIndex;
            insertRow(activeTable, rowIndex);
        });
    }
    
    if (rowBelowBtn) {
        rowBelowBtn.addEventListener('click', function() {
            if (!activeTable || !activeCell) return;
            
            const rowIndex = activeCell.parentNode.rowIndex;
            insertRow(activeTable, rowIndex + 1);
        });
    }
    
    if (rowDeleteBtn) {
        rowDeleteBtn.addEventListener('click', function() {
            if (!activeTable || !activeCell) return;
            
            const rowIndex = activeCell.parentNode.rowIndex;
            deleteRow(activeTable, rowIndex);
        });
    }
    
    // Sütun işlemleri
    if (colLeftBtn) {
        colLeftBtn.addEventListener('click', function() {
            if (!activeTable || !activeCell) return;
            
            const colIndex = activeCell.cellIndex;
            insertColumn(activeTable, colIndex);
        });
    }
    
    if (colRightBtn) {
        colRightBtn.addEventListener('click', function() {
            if (!activeTable || !activeCell) return;
            
            const colIndex = activeCell.cellIndex;
            insertColumn(activeTable, colIndex + 1);
        });
    }
    
    if (colDeleteBtn) {
        colDeleteBtn.addEventListener('click', function() {
            if (!activeTable || !activeCell) return;
            
            const colIndex = activeCell.cellIndex;
            deleteColumn(activeTable, colIndex);
        });
    }
    
    // Hücre işlemleri
    if (cellMergeBtn) {
        cellMergeBtn.addEventListener('click', function() {
            if (!activeTable || !activeCell) return;
            
            mergeCell(activeCell);
        });
    }
    
    if (cellSplitBtn) {
        cellSplitBtn.addEventListener('click', function() {
            if (!activeTable || !activeCell) return;
            
            splitCell(activeCell);
        });
    }
    
    // Hücre hizalama
    if (alignLeftBtn) {
        alignLeftBtn.addEventListener('click', function() {
            if (!activeTable || !activeCell) return;
            
            alignCell(activeCell, 'left');
        });
    }
    
    if (alignCenterBtn) {
        alignCenterBtn.addEventListener('click', function() {
            if (!activeTable || !activeCell) return;
            
            alignCell(activeCell, 'center');
        });
    }
    
    if (alignRightBtn) {
        alignRightBtn.addEventListener('click', function() {
            if (!activeTable || !activeCell) return;
            
            alignCell(activeCell, 'right');
        });
    }
    
    // Tablo stilleri
    if (styleDefaultBtn) {
        styleDefaultBtn.addEventListener('click', function() {
            if (!activeTable) return;
            
            changeTableStyle(activeTable, 'default');
        });
    }
    
    if (styleBorderedBtn) {
        styleBorderedBtn.addEventListener('click', function() {
            if (!activeTable) return;
            
            changeTableStyle(activeTable, 'bordered');
        });
    }
    
    if (styleStripedBtn) {
        styleStripedBtn.addEventListener('click', function() {
            if (!activeTable) return;
            
            changeTableStyle(activeTable, 'striped');
        });
    }
    
    if (styleMinimalBtn) {
        styleMinimalBtn.addEventListener('click', function() {
            if (!activeTable) return;
            
            changeTableStyle(activeTable, 'minimal');
        });
    }
    
    // Tablo silme
    if (tableDeleteBtn) {
        tableDeleteBtn.addEventListener('click', function() {
            if (!activeTable) return;
            
            if (confirm('Tabloyu silmek istediğinizden emin misiniz?')) {
                deleteTable(activeTable);
            }
        });
    }
}

/**
 * Bir hücreyi seçili hale getirir ve araç çubuğunu gösterir
 * @param {HTMLTableCellElement} cell - Seçilecek hücre
 * @param {HTMLTableElement} table - Hücrenin bulunduğu tablo
 * @param {HTMLElement} editor - Editör elementi
 */
function selectCell(cell, table, editor) {
    // Önceki seçimleri temizle
    clearSelection();
    
    // Yeni seçimleri ayarla
    activeCell = cell;
    activeTable = table;
    
    // Görsel işaretlemeleri yap
    cell.classList.add('selected-cell');
    table.classList.add('selected-table');
    
    // Araç çubuğunu göster
    showTableToolbar();
    
    // Araç çubuğunu güncelle
    updateToolbarState();
}

/**
 * Bir tabloyu seçili hale getirir ve araç çubuğunu gösterir
 * @param {HTMLTableElement} table - Seçilecek tablo
 * @param {HTMLElement} editor - Editör elementi
 */
function selectTable(table, editor) {
    // Önceki seçimleri temizle
    clearSelection();
    
    // Yeni seçimi ayarla
    activeTable = table;
    
    // Görsel işaretleme yap
    table.classList.add('selected-table');
    
    // Araç çubuğunu göster
    showTableToolbar();
    
    // Araç çubuğunu güncelle
    updateToolbarState();
}

/**
 * Tüm seçimleri temizler
 */
function clearSelection() {
    // Aktif hücreyi temizle
    if (activeCell) {
        activeCell.classList.remove('selected-cell');
        activeCell = null;
    }
    
    // Aktif tabloyu temizle
    if (activeTable) {
        activeTable.classList.remove('selected-table');
        activeTable = null;
    }
    
    // Editördeki tüm seçili hücre ve tabloları temizle
    const selectedCells = document.querySelectorAll('.selected-cell');
    const selectedTables = document.querySelectorAll('.selected-table');
    
    selectedCells.forEach(cell => {
        cell.classList.remove('selected-cell');
    });
    
    selectedTables.forEach(table => {
        table.classList.remove('selected-table');
    });
}

/**
 * Tablo araç çubuğunu gösterir
 */
function showTableToolbar() {
    const tableToolbar = document.getElementById('table-toolbar');
    if (tableToolbar) {
        tableToolbar.classList.remove('d-none');
    }
}

/**
 * Tablo araç çubuğunu gizler
 */
function hideTableToolbar() {
    const tableToolbar = document.getElementById('table-toolbar');
    if (tableToolbar) {
        tableToolbar.classList.add('d-none');
    }
    
    // Seçimleri temizle
    clearSelection();
}

/**
 * Araç çubuğu durumunu günceller
 * Aktif tablo ve hücre durumuna göre butonları etkinleştirir/devre dışı bırakır
 */
function updateToolbarState() {
    // Hücre işlemleri butonları
    const cellMergeBtn = document.getElementById('table-cell-merge');
    const cellSplitBtn = document.getElementById('table-cell-split');
    
    // Aktif hücre yoksa, hücre işlemleri butonlarını devre dışı bırak
    if (cellMergeBtn) {
        cellMergeBtn.disabled = !activeCell;
    }
    
    if (cellSplitBtn) {
        // Colspan veya rowspan > 1 ise etkinleştir
        const hasSpan = activeCell && 
            (parseInt(activeCell.getAttribute('colspan') || '1') > 1 || 
             parseInt(activeCell.getAttribute('rowspan') || '1') > 1);
        
        cellSplitBtn.disabled = !hasSpan;
    }
}

// Tablo İşleme Fonksiyonları

/**
 * Tabloya satır ekler
 * @param {HTMLTableElement} table - Tablo elementi
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
        cell.setAttribute('contenteditable', 'true');
        cell.innerHTML = '<br>';
        
        newRow.appendChild(cell);
        
        // Hücre olaylarını ekle
        cell.addEventListener('click', function(e) {
            e.stopPropagation();
            selectCell(cell, table, cell.closest('[contenteditable]'));
        });
    }
    
    // Satırı ilgili konuma ekle
    if (rowIndex < rowCount) {
        tbody.insertBefore(newRow, rows[rowIndex]);
    } else {
        tbody.appendChild(newRow);
    }
    
    // Araç çubuğunu güncelle
    updateToolbarState();
}

/**
 * Tabloya sütun ekler
 * @param {HTMLTableElement} table - Tablo elementi
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
        cell.innerHTML = '<br>';
        
        if (colIndex < row.cells.length) {
            row.insertBefore(cell, row.cells[colIndex]);
        } else {
            row.appendChild(cell);
        }
        
        // Hücre olaylarını ekle
        cell.addEventListener('click', function(e) {
            e.stopPropagation();
            selectCell(cell, table, cell.closest('[contenteditable]'));
        });
    });
    
    // Sonra gövde satırlarına sütun ekle
    bodyRows.forEach(row => {
        const cell = document.createElement('td');
        cell.setAttribute('contenteditable', 'true');
        cell.innerHTML = '<br>';
        
        if (colIndex < row.cells.length) {
            row.insertBefore(cell, row.cells[colIndex]);
        } else {
            row.appendChild(cell);
        }
        
        // Hücre olaylarını ekle
        cell.addEventListener('click', function(e) {
            e.stopPropagation();
            selectCell(cell, table, cell.closest('[contenteditable]'));
        });
    });
    
    // Araç çubuğunu güncelle
    updateToolbarState();
}

/**
 * Tablodan satır siler
 * @param {HTMLTableElement} table - Tablo elementi
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
    
    // Aktif hücreyi ve seçimleri temizle
    clearSelection();
    
    // Tablo hala mevcut, tabloyu seç
    selectTable(table, table.closest('[contenteditable]'));
}

/**
 * Tablodan sütun siler
 * @param {HTMLTableElement} table - Tablo elementi
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
    
    // Aktif hücreyi ve seçimleri temizle
    clearSelection();
    
    // Tablo hala mevcut, tabloyu seç
    selectTable(table, table.closest('[contenteditable]'));
}

/**
 * Tabloyu siler
 * @param {HTMLTableElement} table - Silinecek tablo
 */
function deleteTable(table) {
    // Temizleme işlemi
    clearSelection();
    
    // Tabloyu kaldır
    table.parentNode.removeChild(table);
    
    // Araç çubuğunu gizle
    hideTableToolbar();
}

/**
 * Hücreleri birleştirir
 * @param {HTMLTableCellElement} cell - Seçili hücre
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
    
    // Araç çubuğunu güncelle
    updateToolbarState();
}

/**
 * Hücreyi böler
 * @param {HTMLTableCellElement} cell - Seçili hücre
 */
function splitCell(cell) {
    const row = cell.parentNode;
    const cellIndex = cell.cellIndex;
    const colspan = parseInt(cell.getAttribute('colspan')) || 1;
    const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
    
    // Eğer birleştirilmiş hücre değilse işlem yapma
    if (colspan <= 1 && rowspan <= 1) return;
    
    // Colspan > 1 ise yatay olarak böl
    if (colspan > 1) {
        // Yeni hücre oluştur
        const newCell = document.createElement(cell.tagName);
        newCell.setAttribute('contenteditable', 'true');
        
        // Colspan değerlerini ayarla
        cell.setAttribute('colspan', '1');
        newCell.setAttribute('colspan', colspan - 1);
        
        // Rowspan değerini kopyala
        if (rowspan > 1) {
            newCell.setAttribute('rowspan', rowspan);
        }
        
        // İçerik ekle (boş bir hücre)
        newCell.innerHTML = '<br>';
        
        // Hücre olaylarını ekle
        newCell.addEventListener('click', function(e) {
            e.stopPropagation();
            selectCell(newCell, cell.closest('table'), cell.closest('[contenteditable]'));
        });
        
        // Yeni hücreyi ekle
        if (cellIndex < row.cells.length - 1) {
            row.insertBefore(newCell, row.cells[cellIndex + 1]);
        } else {
            row.appendChild(newCell);
        }
    }
    
    // Rowspan > 1 ise dikey olarak böl (daha kompleks, basit yaklaşımda atlanabilir)
    if (rowspan > 1) {
        // Rowspan'i 1'e indir
        cell.setAttribute('rowspan', '1');
        
        // Yeni hücreler eklemek için gereken kodlar buraya eklenebilir
        // Bu basit örnekte atlıyoruz
    }
    
    // Araç çubuğunu güncelle
    updateToolbarState();
}

/**
 * Hücre içeriğini hizalar
 * @param {HTMLTableCellElement} cell - Seçili hücre
 * @param {string} align - Hizalama değeri ('left', 'center', 'right')
 */
function alignCell(cell, align) {
    // Hücrenin text-align özelliğini ayarla
    cell.style.textAlign = align;
}

 
/**
 * Tablonun stilini değiştirir
 * @param {HTMLTableElement} table - Tablo elementi
 * @param {string} style - Yeni stil ('default', 'bordered', 'striped', 'minimal')
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
 * HTML görünüm modunu kontrol eder
 * @returns {boolean} - HTML modu aktif mi?
 */
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
 * Tablo araç çubuğunun aktif olup olmadığını kontrol eder
 * @returns {boolean}
 */
function isTableToolbarActive() {
    const tableToolbar = document.getElementById('table-toolbar');
    return tableToolbar && !tableToolbar.classList.contains('d-none');
}

/**
 * Aktif tabloyu döndürür
 * @returns {HTMLTableElement|null}
 */
function getActiveTable() {
    return activeTable;
}

/**
 * Aktif hücreyi döndürür
 * @returns {HTMLTableCellElement|null}
 */
function getActiveCell() {
    return activeCell;
}

// Dışa aktarılacak metodlar
const TableToolbar = {
    initTableToolbar,
    selectTable,
    selectCell,
    clearSelection,
    showTableToolbar,
    hideTableToolbar,
    isTableToolbarActive,
    getActiveTable,
    getActiveCell,
    insertRow,
    insertColumn,
    deleteRow,
    deleteColumn,
    deleteTable,
    mergeCell,
    splitCell,
    alignCell,
    changeTableStyle,
    setupTableEventListeners

};

// Modülü dışa aktar
export default TableToolbar;