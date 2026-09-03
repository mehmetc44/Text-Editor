/**
 * Table Manager Module
 * Features: 
 * 1. Column and Row border drag resizing (interactive width and height adjustment).
 * 2. CKEditor 5 style floating contextual toolbar (Column/Row add/delete, Header toggles, Merge/Split, Cell BG, Alignment, Delete Table).
 * 3. 10x10 Matrix Table Picker.
 */

window.TableManager = (function () {
    let selectedCell = null;
    let selectedTable = null;
    let pendingResize = null;
    let isDraggingBorder = false;

    function init(editor, onUpdateStats) {
        if (!editor) return;

        initBorderResize(editor, onUpdateStats);
        initContextualToolbar(editor, onUpdateStats);
        initMatrixPicker(editor, onUpdateStats);

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

    // --- 1. Column & Row Border Drag Resizing ---
    function initBorderResize(editor, onUpdateStats) {
        editor.addEventListener('mousemove', (e) => {
            if (isDraggingBorder) return;

            const cell = e.target.closest('td, th');
            if (!cell || !editor.contains(cell)) {
                if (pendingResize) {
                    editor.style.cursor = 'default';
                    pendingResize = null;
                }
                return;
            }

            const rect = cell.getBoundingClientRect();
            const distRight = Math.abs(rect.right - e.clientX);
            const distBottom = Math.abs(rect.bottom - e.clientY);
            const threshold = 6;

            if (distRight <= threshold) {
                editor.style.cursor = 'col-resize';
                pendingResize = { type: 'col', cell, table: cell.closest('table') };
            } else if (distBottom <= threshold) {
                editor.style.cursor = 'row-resize';
                pendingResize = { type: 'row', cell, table: cell.closest('table') };
            } else {
                editor.style.cursor = 'default';
                pendingResize = null;
            }
        });

        editor.addEventListener('mousedown', (e) => {
            if (!pendingResize || isDraggingBorder) return;

            e.preventDefault();
            e.stopPropagation();

            isDraggingBorder = true;
            const { type, cell, table } = pendingResize;
            const startX = e.clientX;
            const startY = e.clientY;
            const colIndex = cell.cellIndex;
            const tr = cell.parentElement;
            const startWidth = cell.offsetWidth;
            const startHeight = tr.offsetHeight;

            function onMouseMove(moveEvent) {
                if (type === 'col') {
                    const deltaX = moveEvent.clientX - startX;
                    const newWidth = Math.max(30, startWidth + deltaX);

                    Array.from(table.rows).forEach(row => {
                        if (row.children[colIndex]) {
                            row.children[colIndex].style.width = `${newWidth}px`;
                        }
                    });
                } else if (type === 'row') {
                    const deltaY = moveEvent.clientY - startY;
                    const newHeight = Math.max(24, startHeight + deltaY);

                    tr.style.height = `${newHeight}px`;
                    Array.from(tr.children).forEach(c => {
                        c.style.height = `${newHeight}px`;
                    });
                }
                positionContextToolbar();
            }

            function onMouseUp() {
                isDraggingBorder = false;
                pendingResize = null;
                editor.style.cursor = 'default';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (typeof onUpdateStats === 'function') onUpdateStats();
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // --- 2. CKEditor 5 Style Contextual Floating Toolbar ---
    function initContextualToolbar(editor, onUpdateStats) {
        const toolbar = document.getElementById('table-context-toolbar');
        if (!toolbar) return;

        // Cell Selection & Toolbar Positioning
        document.addEventListener('click', (e) => {
            const cell = e.target.closest('td, th');
            if (cell && editor.contains(cell)) {
                if (selectedCell) selectedCell.classList.remove('selected-cell');
                selectedCell = cell;
                selectedTable = cell.closest('table');
                selectedCell.classList.add('selected-cell');
                showContextToolbar();
            } else if (!e.target.closest('#table-context-toolbar')) {
                hideContextToolbar();
            }
        });

        // Reposition on scroll or resize
        window.addEventListener('resize', positionContextToolbar);
        const workspace = document.getElementById('editor-workspace');
        if (workspace) workspace.addEventListener('scroll', positionContextToolbar);

        // Header Switches
        const toggleHeaderCol = document.getElementById('tbl-toggle-header-col');
        const toggleHeaderRow = document.getElementById('tbl-toggle-header-row');

        if (toggleHeaderCol) {
            toggleHeaderCol.addEventListener('change', () => {
                if (!selectedTable) return;
                Array.from(selectedTable.rows).forEach(tr => {
                    if (tr.children.length > 0) {
                        const firstCell = tr.children[0];
                        const newTag = toggleHeaderCol.checked ? 'th' : 'td';
                        if (firstCell.tagName.toLowerCase() !== newTag) {
                            const newCell = document.createElement(newTag);
                            newCell.innerHTML = firstCell.innerHTML;
                            newCell.className = firstCell.className;
                            newCell.setAttribute('style', firstCell.getAttribute('style') || '');
                            tr.replaceChild(newCell, firstCell);
                        }
                    }
                });
                if (typeof onUpdateStats === 'function') onUpdateStats();
            });
        }

        if (toggleHeaderRow) {
            toggleHeaderRow.addEventListener('change', () => {
                if (!selectedTable) return;
                const firstRow = selectedTable.rows[0];
                if (!firstRow) return;

                const isHeader = toggleHeaderRow.checked;
                Array.from(firstRow.children).forEach(cell => {
                    const newTag = isHeader ? 'th' : 'td';
                    if (cell.tagName.toLowerCase() !== newTag) {
                        const newCell = document.createElement(newTag);
                        newCell.innerHTML = cell.innerHTML;
                        newCell.className = cell.className;
                        newCell.setAttribute('style', cell.getAttribute('style') || '');
                        firstRow.replaceChild(newCell, cell);
                    }
                });
                if (typeof onUpdateStats === 'function') onUpdateStats();
            });
        }

        // Column Operations
        document.getElementById('tbl-btn-col-left')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedCell || !selectedTable) return;
            const colIdx = selectedCell.cellIndex;
            Array.from(selectedTable.rows).forEach(tr => {
                const isHeader = tr.children[colIdx]?.tagName === 'TH';
                const newCell = document.createElement(isHeader ? 'th' : 'td');
                newCell.textContent = isHeader ? 'Başlık' : 'Veri';
                tr.insertBefore(newCell, tr.children[colIdx]);
            });
            positionContextToolbar();
            if (typeof onUpdateStats === 'function') onUpdateStats();
        });

        document.getElementById('tbl-btn-col-right')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedCell || !selectedTable) return;
            const colIdx = selectedCell.cellIndex;
            Array.from(selectedTable.rows).forEach(tr => {
                const isHeader = tr.children[colIdx]?.tagName === 'TH';
                const newCell = document.createElement(isHeader ? 'th' : 'td');
                newCell.textContent = isHeader ? 'Başlık' : 'Veri';
                if (colIdx + 1 < tr.children.length) {
                    tr.insertBefore(newCell, tr.children[colIdx + 1]);
                } else {
                    tr.appendChild(newCell);
                }
            });
            positionContextToolbar();
            if (typeof onUpdateStats === 'function') onUpdateStats();
        });

        document.getElementById('tbl-btn-col-delete')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedCell || !selectedTable) return;
            const colIdx = selectedCell.cellIndex;
            if (selectedTable.rows[0].children.length <= 1) {
                deleteCurrentTable();
                return;
            }
            Array.from(selectedTable.rows).forEach(tr => {
                if (tr.children[colIdx]) tr.removeChild(tr.children[colIdx]);
            });
            hideContextToolbar();
            if (typeof onUpdateStats === 'function') onUpdateStats();
        });

        // Row Operations
        document.getElementById('tbl-btn-row-above')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedCell || !selectedTable) return;
            const tr = selectedCell.parentElement;
            const colsCount = tr.children.length;
            const newTr = document.createElement('tr');
            for (let i = 0; i < colsCount; i++) {
                const td = document.createElement('td');
                td.textContent = 'Veri';
                newTr.appendChild(td);
            }
            tr.parentNode.insertBefore(newTr, tr);
            positionContextToolbar();
            if (typeof onUpdateStats === 'function') onUpdateStats();
        });

        document.getElementById('tbl-btn-row-below')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedCell || !selectedTable) return;
            const tr = selectedCell.parentElement;
            const colsCount = tr.children.length;
            const newTr = document.createElement('tr');
            for (let i = 0; i < colsCount; i++) {
                const td = document.createElement('td');
                td.textContent = 'Veri';
                newTr.appendChild(td);
            }
            tr.parentNode.insertBefore(newTr, tr.nextSibling);
            positionContextToolbar();
            if (typeof onUpdateStats === 'function') onUpdateStats();
        });

        document.getElementById('tbl-btn-row-delete')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedCell || !selectedTable) return;
            const tr = selectedCell.parentElement;
            if (selectedTable.rows.length <= 1) {
                deleteCurrentTable();
                return;
            }
            tr.remove();
            hideContextToolbar();
            if (typeof onUpdateStats === 'function') onUpdateStats();
        });

        // Merge & Split Operations
        document.getElementById('tbl-btn-merge-right')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedCell) return;
            const nextCell = selectedCell.nextElementSibling;
            if (nextCell) {
                const currentSpan = parseInt(selectedCell.getAttribute('colspan') || '1');
                const nextSpan = parseInt(nextCell.getAttribute('colspan') || '1');
                selectedCell.setAttribute('colspan', currentSpan + nextSpan);
                selectedCell.innerHTML += ' ' + nextCell.innerHTML;
                nextCell.remove();
                positionContextToolbar();
            }
        });

        document.getElementById('tbl-btn-merge-down')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedCell || !selectedTable) return;
            const tr = selectedCell.parentElement;
            const nextTr = tr.nextElementSibling;
            if (nextTr && nextTr.children[selectedCell.cellIndex]) {
                const targetCell = nextTr.children[selectedCell.cellIndex];
                const currentSpan = parseInt(selectedCell.getAttribute('rowspan') || '1');
                const targetSpan = parseInt(targetCell.getAttribute('rowspan') || '1');
                selectedCell.setAttribute('rowspan', currentSpan + targetSpan);
                selectedCell.innerHTML += '<br>' + targetCell.innerHTML;
                targetCell.remove();
                positionContextToolbar();
            }
        });

        document.getElementById('tbl-btn-split-cell')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectedCell) return;
            selectedCell.removeAttribute('colspan');
            selectedCell.removeAttribute('rowspan');
            positionContextToolbar();
        });

        // Cell Background Color
        document.getElementById('tbl-input-cell-bg')?.addEventListener('input', (e) => {
            if (selectedCell) {
                selectedCell.style.backgroundColor = e.target.value;
            }
        });

        // Table Alignment
        document.getElementById('tbl-btn-align-left')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (selectedTable) selectedTable.style.margin = '12px auto 12px 0';
        });

        document.getElementById('tbl-btn-align-center')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (selectedTable) selectedTable.style.margin = '12px auto';
        });

        document.getElementById('tbl-btn-align-right')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (selectedTable) selectedTable.style.margin = '12px 0 12px auto';
        });

        // Delete Table
        document.getElementById('tbl-btn-delete-table')?.addEventListener('click', (e) => {
            e.preventDefault();
            deleteCurrentTable();
            if (typeof onUpdateStats === 'function') onUpdateStats();
        });
    }

    function showContextToolbar() {
        const toolbar = document.getElementById('table-context-toolbar');
        if (!toolbar || !selectedTable) return;

        toolbar.classList.remove('hidden');
        positionContextToolbar();

        // Update header toggles
        const toggleHeaderCol = document.getElementById('tbl-toggle-header-col');
        const toggleHeaderRow = document.getElementById('tbl-toggle-header-row');

        if (toggleHeaderCol) {
            const hasHeaderCol = Array.from(selectedTable.rows).every(r => r.children[0]?.tagName === 'TH');
            toggleHeaderCol.checked = hasHeaderCol;
        }

        if (toggleHeaderRow) {
            const firstRow = selectedTable.rows[0];
            const hasHeaderRow = firstRow && Array.from(firstRow.children).every(c => c.tagName === 'TH');
            toggleHeaderRow.checked = hasHeaderRow;
        }
    }

    function hideContextToolbar() {
        const toolbar = document.getElementById('table-context-toolbar');
        if (toolbar) toolbar.classList.add('hidden');
        if (selectedCell) {
            selectedCell.classList.remove('selected-cell');
            selectedCell = null;
        }
        selectedTable = null;
    }

    function positionContextToolbar() {
        const toolbar = document.getElementById('table-context-toolbar');
        if (!toolbar || toolbar.classList.contains('hidden') || !selectedTable) return;

        const tblRect = selectedTable.getBoundingClientRect();
        const top = Math.max(10, tblRect.top - 46);
        const left = Math.max(10, tblRect.left);

        toolbar.style.top = `${top}px`;
        toolbar.style.left = `${left}px`;
    }

    function deleteCurrentTable() {
        if (selectedTable) {
            selectedTable.remove();
            hideContextToolbar();
        }
    }

    // --- 3. Matrix Picker ---
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
