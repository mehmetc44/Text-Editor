/**
 * Meditör - Tablo Yönetimi Modülü (Table Manager)
 */

export function createTable(rows = 3, cols = 3) {
    const table = document.createElement('table');
    table.className = 'editor-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
        const th = document.createElement('th');
        th.textContent = `Başlık ${c + 1}`;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

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
    return table;
}

export function addRowAbove(cell) {
    if (!cell) return;
    const tr = cell.closest('tr');
    if (!tr) return;
    const colsCount = tr.children.length;
    const newTr = document.createElement('tr');
    const isHeader = tr.parentNode.tagName === 'THEAD';

    for (let i = 0; i < colsCount; i++) {
        const newCell = document.createElement(isHeader ? 'th' : 'td');
        newCell.textContent = 'Yeni Hücre';
        newTr.appendChild(newCell);
    }

    tr.parentNode.insertBefore(newTr, tr);
}

export function addRowBelow(cell) {
    if (!cell) return;
    const tr = cell.closest('tr');
    if (!tr) return;
    const colsCount = tr.children.length;
    const newTr = document.createElement('tr');

    for (let i = 0; i < colsCount; i++) {
        const newCell = document.createElement('td');
        newCell.textContent = 'Yeni Hücre';
        newTr.appendChild(newCell);
    }

    tr.parentNode.insertBefore(newTr, tr.nextSibling);
}

export function deleteRow(cell) {
    if (!cell) return;
    const tr = cell.closest('tr');
    if (tr) tr.remove();
}

export function deleteColumn(cell) {
    if (!cell) return;
    const colIndex = cell.cellIndex;
    const table = cell.closest('table');
    if (!table) return;

    Array.from(table.rows).forEach(row => {
        if (row.cells[colIndex]) {
            row.cells[colIndex].remove();
        }
    });
}
