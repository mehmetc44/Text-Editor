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
