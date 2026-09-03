/**
 * Table Manager Module
 * Handles dynamic HTML table creation and cell selection.
 */

window.TableManager = (function () {
    let selectedCell = null;

    function init(editor, onUpdateStats) {
        if (!editor) return;

        editor.addEventListener('click', (e) => {
            const cell = e.target.closest('td, th');
            if (cell) {
                if (selectedCell) selectedCell.classList.remove('selected-cell');
                selectedCell = cell;
                selectedCell.classList.add('selected-cell');
            }
        });

        const btnInsertTableConfirm = document.getElementById('btn-insert-table-confirm');
        const modalTable = document.getElementById('modal-table');

        if (btnInsertTableConfirm) {
            btnInsertTableConfirm.addEventListener('click', () => {
                const rowsInput = document.getElementById('input-tbl-rows');
                const colsInput = document.getElementById('input-tbl-cols');
                const rows = rowsInput ? parseInt(rowsInput.value) || 3 : 3;
                const cols = colsInput ? parseInt(colsInput.value) || 3 : 3;

                createTable(editor, rows, cols, onUpdateStats);
                if (modalTable) modalTable.classList.add('hidden');
            });
        }

        initMatrixPicker(editor, onUpdateStats);
    }

    function initMatrixPicker(editor, onUpdateStats) {
        const container = document.getElementById('table-matrix-container');
        const sizeLabel = document.getElementById('matrix-size-label');
        const btnCustomTable = document.getElementById('menu-insert-table-custom');
        const modalTable = document.getElementById('modal-table');

        if (btnCustomTable && modalTable) {
            btnCustomTable.addEventListener('click', (e) => {
                e.preventDefault();
                modalTable.classList.remove('hidden');
            });
        }

        if (!container) return;
        container.innerHTML = '';

        const maxRows = 10;
        const maxCols = 10;
        const cells = [];

        for (let r = 1; r <= maxRows; r++) {
            for (let c = 1; c <= maxCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'table-matrix-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.title = `${r} Satır x ${c} Sütun Tablo`;
                container.appendChild(cell);
                cells.push(cell);

                cell.addEventListener('mouseenter', () => {
                    highlightMatrix(r, c);
                });

                cell.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    createTable(editor, r, c, onUpdateStats);
                });
            }
        }

        function highlightMatrix(targetRow, targetCol) {
            if (sizeLabel) {
                sizeLabel.textContent = `${targetRow} x ${targetCol}`;
            }
            cells.forEach(cell => {
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                if (r <= targetRow && c <= targetCol) {
                    cell.classList.add('active');
                } else {
                    cell.classList.remove('active');
                }
            });
        }

        container.addEventListener('mouseleave', () => {
            if (sizeLabel) sizeLabel.textContent = '1 x 1';
            cells.forEach(cell => cell.classList.remove('active'));
        });
    }

    function createTable(editor, rows = 3, cols = 3, onUpdateStats) {
        if (!editor) return;
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

        editor.focus();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(table);
        } else {
            editor.appendChild(table);
        }
        if (typeof onUpdateStats === 'function') onUpdateStats();
    }

    return {
        init,
        createTable
    };
})();
