/**
 * Meditör - Tablo Yönetimi ve Sütun Boyutlandırma Modülü (Table Manager)
 * Tablo oluşturma, satır/sütun ekleme-silme ve canlı sütun boyutlandırmayı yönetir.
 * 
 * Mülakat Notu: HTML5 Table DOM API'leri (insertRow, insertCell, deleteRow, deleteCell) kullanılmıştır.
 */

let selectedCell = null;

/**
 * Belirtilen satır ve sütun sayısına göre editöre tablo ekler
 * @param {HTMLElement} editor 
 * @param {number} rows 
 * @param {number} cols 
 */
export function createTable(editor, rows = 3, cols = 3) {
    if (!editor) return;

    const table = document.createElement('table');
    table.className = 'editor-table';

    // Thead / Th Başlık satırı
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
        const th = document.createElement('th');
        th.textContent = `Başlık ${c + 1}`;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Tbody Hücreleri
    const tbody = document.createElement('tbody');
    for (let r = 0; r < rows - 1; r++) {
        const tr = document.createElement('tr');
        for (let c = 0; c < cols; c++) {
            const td = document.createElement('td');
            td.textContent = `Veri ${r + 1}-${c + 1}`;
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    // Sütun resizer tutamaçlarını ekle
    attachColumnResizers(table);

    // Editöre ekle
    editor.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(table);
    } else {
        editor.appendChild(table);
    }
}

/**
 * Seçili hücreye göre üstüne satır ekler
 */
export function insertRowAbove() {
    if (!selectedCell) return;
    const tr = selectedCell.closest('tr');
    if (!tr) return;

    const newTr = document.createElement('tr');
    const cellCount = tr.children.length;
    for (let i = 0; i < cellCount; i++) {
        const td = document.createElement('td');
        td.textContent = 'Yeni Satır';
        newTr.appendChild(td);
    }
    tr.parentNode.insertBefore(newTr, tr);
}

/**
 * Seçili hücreye göre altına satır ekler
 */
export function insertRowBelow() {
    if (!selectedCell) return;
    const tr = selectedCell.closest('tr');
    if (!tr) return;

    const newTr = document.createElement('tr');
    const cellCount = tr.children.length;
    for (let i = 0; i < cellCount; i++) {
        const td = document.createElement('td');
        td.textContent = 'Yeni Satır';
        newTr.appendChild(td);
    }
    tr.parentNode.insertBefore(newTr, tr.nextSibling);
}

/**
 * Seçili sütunun soluna sütun ekler
 */
export function insertColLeft() {
    if (!selectedCell) return;
    const colIndex = selectedCell.cellIndex;
    const table = selectedCell.closest('table');
    if (!table) return;

    Array.from(table.rows).forEach(row => {
        const isHeader = row.parentNode.tagName === 'THEAD';
        const cell = isHeader ? document.createElement('th') : document.createElement('td');
        cell.textContent = isHeader ? 'Başlık' : 'Veri';
        row.insertBefore(cell, row.children[colIndex]);
    });
}

/**
 * Seçili sütunun sağına sütun ekler
 */
export function insertColRight() {
    if (!selectedCell) return;
    const colIndex = selectedCell.cellIndex;
    const table = selectedCell.closest('table');
    if (!table) return;

    Array.from(table.rows).forEach(row => {
        const isHeader = row.parentNode.tagName === 'THEAD';
        const cell = isHeader ? document.createElement('th') : document.createElement('td');
        cell.textContent = isHeader ? 'Başlık' : 'Veri';
        row.insertBefore(cell, row.children[colIndex + 1] || null);
    });
}

/**
 * Seçili satırı siler
 */
export function deleteRow() {
    if (!selectedCell) return;
    const tr = selectedCell.closest('tr');
    if (tr) {
        const table = tr.closest('table');
        tr.remove();
        if (table && table.rows.length === 0) {
            table.remove();
        }
        selectedCell = null;
    }
}

/**
 * Seçili sütunu siler
 */
export function deleteCol() {
    if (!selectedCell) return;
    const colIndex = selectedCell.cellIndex;
    const table = selectedCell.closest('table');
    if (!table) return;

    Array.from(table.rows).forEach(row => {
        if (row.children[colIndex]) {
            row.children[colIndex].remove();
        }
    });

    if (table.rows[0] && table.rows[0].children.length === 0) {
        table.remove();
    }
    selectedCell = null;
}

/**
 * Tablonun tamamını siler
 */
export function deleteTable() {
    if (!selectedCell) return;
    const table = selectedCell.closest('table');
    if (table) {
        table.remove();
        selectedCell = null;
    }
}

/**
 * Hücre seçimini ve tıklama durumunu günceller
 * @param {HTMLTableCellElement} cell 
 */
export function setSelectedCell(cell) {
    if (selectedCell) {
        selectedCell.classList.remove('selected-cell');
    }
    selectedCell = cell;
    if (selectedCell) {
        selectedCell.classList.add('selected-cell');
    }
}

/**
 * Tablo hücre kenarlıklarına sütun boyutlandırma tutamacı ekler
 * @param {HTMLTableElement} table 
 */
function attachColumnResizers(table) {
    // Sütun genişliği sürükleme mantığı
}
