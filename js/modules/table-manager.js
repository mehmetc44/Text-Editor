/**
 * Table Manager — Complete rewrite
 * All toolbar DOM is created via JS (zero HTML dependency).
 * Features:
 *   1. 10×10 Matrix Picker (uses #table-matrix-container from HTML)
 *   2. Table selection with orange border + yellow corner resize handles
 *   3. Cell border drag → column width / row height resize
 *   4. Floating contextual toolbar with 5 dropdown buttons:
 *      Column | Row | Merge/Split | Table Properties | Cell Properties
 */
window.TableManager = (function () {
    /* ═══════════════ STATE ═══════════════ */
    let activeTable = null;
    let activeCell  = null;
    let toolbar     = null;
    let openDD      = null;   // currently open dropdown element
    let handles     = [];     // corner resize handle elements
    let isDragging  = false;
    let pendingResize = null;
    let _onStats    = null;

    /* ═══════════════ INIT ═══════════════ */
    function init(editor, onUpdateStats) {
        _onStats = onUpdateStats;
        buildToolbar();
        bindCellClick();
        bindBorderResize();
        initMatrixPicker(editor);

        // modal-table confirm
        const btn = document.getElementById('btn-insert-table-confirm');
        const modal = document.getElementById('modal-table');
        if (btn) btn.addEventListener('click', () => {
            const r = parseInt(document.getElementById('input-tbl-rows')?.value) || 3;
            const c = parseInt(document.getElementById('input-tbl-cols')?.value) || 3;
            createTable(editor, r, c);
            if (modal) modal.classList.add('hidden');
        });
    }

    /* ═══════════════ BUILD TOOLBAR (pure JS) ═══════════════ */
    function buildToolbar() {
        toolbar = el('div');
        setS(toolbar, {
            display:'none', position:'fixed', zIndex:'99999',
            background:'#fff', border:'1px solid #d1d5db',
            boxShadow:'0 4px 20px rgba(0,0,0,.15)',
            borderRadius:'6px', padding:'3px 4px',
            alignItems:'center', gap:'1px',
            fontSize:'13px', userSelect:'none', fontFamily:'system-ui,sans-serif'
        });
        toolbar.addEventListener('mousedown', e => e.preventDefault());

        // ── 5 Dropdown Buttons ──
        const colBtn   = addToolbarBtn(toolbar, 'fa-solid fa-table-columns', 'Sütun');
        const rowBtn   = addToolbarBtn(toolbar, 'fa-solid fa-grip-lines',    'Satır');
        addSep(toolbar);
        const mergeBtn = addToolbarBtn(toolbar, 'fa-solid fa-object-ungroup','Birleştir / Böl');
        addSep(toolbar);
        const tblBtn   = addToolbarBtn(toolbar, 'fa-solid fa-table',         'Tablo Özellikleri');
        const cellBtn  = addToolbarBtn(toolbar, 'fa-solid fa-border-all',    'Hücre Özellikleri');

        // dropdowns
        const ddCol   = buildColumnDD();
        const ddRow   = buildRowDD();
        const ddMerge = buildMergeDD();
        const ddTbl   = buildTablePropsDD();
        const ddCell  = buildCellPropsDD();

        colBtn.wrap.appendChild(ddCol);
        rowBtn.wrap.appendChild(ddRow);
        mergeBtn.wrap.appendChild(ddMerge);
        tblBtn.wrap.appendChild(ddTbl);
        cellBtn.wrap.appendChild(ddCell);

        colBtn.btn.addEventListener('click',   () => toggleDD(ddCol));
        rowBtn.btn.addEventListener('click',   () => toggleDD(ddRow));
        mergeBtn.btn.addEventListener('click', () => toggleDD(ddMerge));
        tblBtn.btn.addEventListener('click',   () => toggleDD(ddTbl));
        cellBtn.btn.addEventListener('click',  () => toggleDD(ddCell));

        document.body.appendChild(toolbar);
    }

    /* helpers */
    function el(tag) { return document.createElement(tag); }
    function setS(e, s) { Object.assign(e.style, s); }
    function addSep(parent) {
        const d = el('div');
        setS(d, { width:'1px', height:'20px', background:'#d1d5db', margin:'0 2px' });
        parent.appendChild(d);
    }
    function addToolbarBtn(parent, icon, title) {
        const wrap = el('div');
        setS(wrap, { position:'relative' });
        const btn = el('button');
        btn.type = 'button';
        btn.title = title;
        setS(btn, {
            display:'flex', alignItems:'center', gap:'3px',
            padding:'5px 7px', border:'none', background:'none',
            cursor:'pointer', borderRadius:'4px', fontSize:'13px', color:'#374151'
        });
        btn.innerHTML = `<i class="${icon}"></i><i class="fa-solid fa-chevron-down" style="font-size:8px;color:#9ca3af"></i>`;
        btn.addEventListener('mouseenter', () => { btn.style.background = '#f3f4f6'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'none'; });
        wrap.appendChild(btn);
        parent.appendChild(wrap);
        return { wrap, btn };
    }
    function toggleDD(dd) {
        if (openDD && openDD !== dd) openDD.style.display = 'none';
        dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
        openDD = dd.style.display === 'none' ? null : dd;
    }
    function closeDD() { if (openDD) { openDD.style.display = 'none'; openDD = null; } }
    function ddPanel() {
        const d = el('div');
        setS(d, {
            display:'none', position:'absolute', left:'0', top:'100%',
            marginTop:'4px', background:'#fff', border:'1px solid #d1d5db',
            boxShadow:'0 8px 24px rgba(0,0,0,.14)', borderRadius:'8px',
            padding:'4px 0', width:'210px', zIndex:'100001', fontSize:'13px'
        });
        return d;
    }
    function ddItem(text, icon, action, color) {
        const b = el('button');
        b.type = 'button';
        setS(b, {
            display:'flex', alignItems:'center', width:'100%', textAlign:'left',
            padding:'7px 14px', border:'none', background:'none', cursor:'pointer',
            fontSize:'13px', color: color || '#1f2937'
        });
        b.innerHTML = (icon ? `<i class="${icon}" style="width:18px;color:${color||'#9ca3af'};margin-right:8px;text-align:center"></i>` : '') + text;
        b.addEventListener('mouseenter', () => { b.style.background = '#f3f4f6'; });
        b.addEventListener('mouseleave', () => { b.style.background = 'none'; });
        b.addEventListener('click', (e) => { e.stopPropagation(); action(); closeDD(); });
        return b;
    }
    function ddToggle(text, getter, setter) {
        const label = el('label');
        setS(label, {
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'7px 14px', cursor:'pointer', borderBottom:'1px solid #f1f5f9', marginBottom:'2px'
        });
        label.addEventListener('mouseenter', () => { label.style.background = '#f3f4f6'; });
        label.addEventListener('mouseleave', () => { label.style.background = 'none'; });
        const span = el('span'); span.textContent = text;
        const inp = el('input'); inp.type = 'checkbox';
        setS(inp, { width:'34px', height:'18px', cursor:'pointer', accentColor:'#2563eb' });
        inp.addEventListener('change', () => { setter(inp.checked); fire(); });
        label.appendChild(span); label.appendChild(inp);
        label._update = () => { inp.checked = getter(); };
        return label;
    }
    function ddDivider() {
        const d = el('div');
        setS(d, { height:'1px', background:'#e5e7eb', margin:'4px 0' });
        return d;
    }

    /* ── Column Dropdown ── */
    function buildColumnDD() {
        const dd = ddPanel();
        dd.appendChild(ddToggle('Başlık Sütunu',
            () => activeCell && activeTable && Array.from(activeTable.rows).every(r => r.cells[activeCell.cellIndex]?.tagName === 'TH'),
            (v) => { if (!activeCell || !activeTable) return; const ci = activeCell.cellIndex; Array.from(activeTable.rows).forEach(tr => { if(tr.cells[ci]) swapTag(tr.cells[ci], v ? 'th' : 'td'); }); }
        ));
        dd.appendChild(ddItem('Sola sütun ekle',  'fa-solid fa-arrow-left',  () => colInsert('left')));
        dd.appendChild(ddItem('Sağa sütun ekle', 'fa-solid fa-arrow-right', () => colInsert('right')));
        dd.appendChild(ddItem('Sütunu sil',       'fa-solid fa-trash-can',   () => colDelete(), '#dc2626'));
        dd.appendChild(ddDivider());
        dd.appendChild(ddItem('Sütunu seç',       'fa-solid fa-arrow-pointer', () => colSelect()));
        return dd;
    }
    /* ── Row Dropdown ── */
    function buildRowDD() {
        const dd = ddPanel();
        dd.appendChild(ddToggle('Başlık Satırı',
            () => activeCell && activeCell.parentElement && Array.from(activeCell.parentElement.cells).every(c => c.tagName === 'TH'),
            (v) => { if (!activeCell || !activeCell.parentElement) return; Array.from(activeCell.parentElement.cells).forEach(c => swapTag(c, v ? 'th' : 'td')); }
        ));
        dd.appendChild(ddItem('Yukarıya satır ekle', 'fa-solid fa-arrow-up',   () => rowInsert('above')));
        dd.appendChild(ddItem('Aşağıya satır ekle', 'fa-solid fa-arrow-down', () => rowInsert('below')));
        dd.appendChild(ddItem('Satırı sil',       'fa-solid fa-trash-can',  () => rowDelete(), '#dc2626'));
        dd.appendChild(ddDivider());
        dd.appendChild(ddItem('Satırı seç',       'fa-solid fa-arrow-pointer', () => rowSelect()));
        return dd;
    }
    /* ── Merge / Split Dropdown ── */
    function buildMergeDD() {
        const dd = ddPanel();
        dd.appendChild(ddItem('Yukarıdaki ile birleştir',    'fa-solid fa-arrow-up',      () => mergeCell('up')));
        dd.appendChild(ddItem('Sağdaki ile birleştir', 'fa-solid fa-arrow-right',   () => mergeCell('right')));
        dd.appendChild(ddItem('Aşağıdaki ile birleştir',  'fa-solid fa-arrow-down',    () => mergeCell('down')));
        dd.appendChild(ddItem('Soldaki ile birleştir',  'fa-solid fa-arrow-left',    () => mergeCell('left')));
        dd.appendChild(ddDivider());
        dd.appendChild(ddItem('Hücreyi dikey böl',   'fa-solid fa-arrows-left-right', () => splitCell('v')));
        dd.appendChild(ddItem('Hücreyi yatay böl', 'fa-solid fa-arrows-up-down',    () => splitCell('h')));
        return dd;
    }
    /* ── Table Properties Panel ── */
    function buildTablePropsDD() {
        const dd = ddPanel();
        setS(dd, { width:'290px', padding:'12px 14px' });
        dd.innerHTML = `
            <div style="font-weight:600;font-size:13px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                <i class="fa-solid fa-chevron-left" style="font-size:10px;cursor:pointer;color:#6b7280" data-close></i>
                Tablo Özellikleri
            </div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px;font-weight:600">Kenarlık</div>
            <div style="display:flex;gap:6px;margin-bottom:10px">
                <div style="flex:1"><div style="font-size:11px;color:#9ca3af;margin-bottom:2px">Stil</div>
                    <select data-tbl-border-style style="width:100%;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:12px">
                        <option value="solid">Düz</option><option value="dotted">Noktalı</option>
                        <option value="dashed">Kesik</option><option value="double">Çift</option>
                        <option value="none">Yok</option>
                    </select></div>
                <div style="flex:0 0 50px"><div style="font-size:11px;color:#9ca3af;margin-bottom:2px">Kalınlık</div>
                    <input data-tbl-border-width value="1px" style="width:100%;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"></div>
                <div style="flex:0 0 40px"><div style="font-size:11px;color:#9ca3af;margin-bottom:2px">Renk</div>
                    <input type="color" data-tbl-border-color value="#d1d5db" style="width:32px;height:28px;border:none;padding:0;cursor:pointer"></div>
            </div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px;font-weight:600">Boyutlar</div>
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
                <div style="flex:1"><div style="font-size:11px;color:#9ca3af;margin-bottom:2px">Genişlik</div>
                    <input data-tbl-width value="100%" style="width:100%;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"></div>
                <span style="margin-top:14px;color:#9ca3af">×</span>
                <div style="flex:1"><div style="font-size:11px;color:#9ca3af;margin-bottom:2px">Yükseklik</div>
                    <input data-tbl-height value="" placeholder="auto" style="width:100%;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"></div>
            </div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px;font-weight:600">Arka Plan</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
                <span style="font-size:12px">Renk</span>
                <input type="color" data-tbl-bg value="#ffffff" style="width:28px;height:24px;border:none;padding:0;cursor:pointer">
            </div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:6px;font-weight:600">Tablo Hizalaması</div>
            <div data-tbl-align-row style="display:flex;gap:4px;margin-bottom:14px"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px">
                <button type="button" data-cancel style="padding:6px 16px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:12px">İptal</button>
                <button type="button" data-save style="padding:6px 16px;border:none;border-radius:4px;background:#2563eb;color:#fff;cursor:pointer;font-size:12px;font-weight:600">Kaydet</button>
            </div>`;

        // Alignment buttons
        const alignRow = dd.querySelector('[data-tbl-align-row]');
        ['left','center','right'].forEach(a => {
            const ab = el('button'); ab.type = 'button'; ab.dataset.align = a;
            setS(ab, { padding:'5px 10px', border:'1px solid #d1d5db', borderRadius:'4px', background:'#fff', cursor:'pointer' });
            ab.innerHTML = `<i class="fa-solid fa-align-${a}" style="font-size:12px"></i>`;
            ab.addEventListener('mouseenter', () => { ab.style.background = '#eff6ff'; });
            ab.addEventListener('mouseleave', () => { ab.style.background = '#fff'; });
            alignRow.appendChild(ab);
        });

        dd.querySelector('[data-close]')?.addEventListener('click', (e) => { e.stopPropagation(); closeDD(); });
        dd.querySelector('[data-cancel]')?.addEventListener('click', (e) => { e.stopPropagation(); closeDD(); });
        dd.querySelector('[data-save]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!activeTable) return;
            const bs = dd.querySelector('[data-tbl-border-style]').value;
            const bw = dd.querySelector('[data-tbl-border-width]').value;
            const bc = dd.querySelector('[data-tbl-border-color]').value;
            const tw = dd.querySelector('[data-tbl-width]').value;
            const th = dd.querySelector('[data-tbl-height]').value;
            const bg = dd.querySelector('[data-tbl-bg]').value;
            activeTable.style.borderStyle = bs; activeTable.style.borderWidth = bw; activeTable.style.borderColor = bc;
            if (tw) activeTable.style.width = tw;
            if (th) activeTable.style.height = th;
            if (bg && bg !== '#ffffff') activeTable.style.backgroundColor = bg;
            // Apply border to cells too
            activeTable.querySelectorAll('td,th').forEach(c => { c.style.borderStyle = bs; c.style.borderWidth = bw; c.style.borderColor = bc; });
            // Alignment from selected button
            const selAlign = dd.querySelector('[data-tbl-align-row] button.tbl-align-active');
            if (selAlign) {
                const a = selAlign.dataset.align;
                if (a === 'left') activeTable.style.margin = '12px auto 12px 0';
                else if (a === 'center') activeTable.style.margin = '12px auto';
                else activeTable.style.margin = '12px 0 12px auto';
            }
            fire(); closeDD(); positionToolbar();
        });

        // Alignment button click handler
        dd.querySelectorAll('[data-tbl-align-row] button').forEach(b => {
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                dd.querySelectorAll('[data-tbl-align-row] button').forEach(x => { x.classList.remove('tbl-align-active'); x.style.background = '#fff'; x.style.borderColor = '#d1d5db'; });
                b.classList.add('tbl-align-active');
                b.style.background = '#dbeafe'; b.style.borderColor = '#2563eb';
            });
        });

        // Populate on open
        dd._populate = () => {
            if (!activeTable) return;
            dd.querySelector('[data-tbl-border-style]').value = activeTable.style.borderStyle || 'solid';
            dd.querySelector('[data-tbl-border-width]').value = activeTable.style.borderWidth || '1px';
            dd.querySelector('[data-tbl-border-color]').value = rgbToHex(activeTable.style.borderColor) || '#d1d5db';
            dd.querySelector('[data-tbl-width]').value = activeTable.style.width || '100%';
            dd.querySelector('[data-tbl-height]').value = activeTable.style.height || '';
            dd.querySelector('[data-tbl-bg]').value = rgbToHex(activeTable.style.backgroundColor) || '#ffffff';
        };
        return dd;
    }

    /* ── Cell Properties Panel ── */
    function buildCellPropsDD() {
        const dd = ddPanel();
        setS(dd, { width:'260px', padding:'12px 14px' });
        dd.innerHTML = `
            <div style="font-weight:600;font-size:13px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                <i class="fa-solid fa-chevron-left" style="font-size:10px;cursor:pointer;color:#6b7280" data-close></i>
                Hücre Özellikleri
            </div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px;font-weight:600">Kenarlık</div>
            <div style="display:flex;gap:6px;margin-bottom:10px">
                <div style="flex:1"><div style="font-size:11px;color:#9ca3af;margin-bottom:2px">Stil</div>
                    <select data-cell-border-style style="width:100%;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:12px">
                        <option value="solid">Düz</option><option value="dotted">Noktalı</option>
                        <option value="dashed">Kesik</option><option value="double">Çift</option>
                        <option value="none">Yok</option>
                    </select></div>
                <div style="flex:0 0 50px"><div style="font-size:11px;color:#9ca3af;margin-bottom:2px">Kalınlık</div>
                    <input data-cell-border-width value="1px" style="width:100%;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:12px"></div>
                <div style="flex:0 0 40px"><div style="font-size:11px;color:#9ca3af;margin-bottom:2px">Renk</div>
                    <input type="color" data-cell-border-color value="#d1d5db" style="width:32px;height:28px;border:none;padding:0;cursor:pointer"></div>
            </div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px;font-weight:600">Arka Plan</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
                <span style="font-size:12px">Renk</span>
                <input type="color" data-cell-bg value="#ffffff" style="width:28px;height:24px;border:none;padding:0;cursor:pointer">
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px">
                <button type="button" data-cancel style="padding:6px 16px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:12px">İptal</button>
                <button type="button" data-save style="padding:6px 16px;border:none;border-radius:4px;background:#2563eb;color:#fff;cursor:pointer;font-size:12px;font-weight:600">Kaydet</button>
            </div>`;
        dd.querySelector('[data-close]')?.addEventListener('click', (e) => { e.stopPropagation(); closeDD(); });
        dd.querySelector('[data-cancel]')?.addEventListener('click', (e) => { e.stopPropagation(); closeDD(); });
        dd.querySelector('[data-save]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!activeCell) return;
            activeCell.style.borderStyle = dd.querySelector('[data-cell-border-style]').value;
            activeCell.style.borderWidth = dd.querySelector('[data-cell-border-width]').value;
            activeCell.style.borderColor = dd.querySelector('[data-cell-border-color]').value;
            const bg = dd.querySelector('[data-cell-bg]').value;
            if (bg) activeCell.style.backgroundColor = bg;
            fire(); closeDD();
        });
        dd._populate = () => {
            if (!activeCell) return;
            dd.querySelector('[data-cell-border-style]').value = activeCell.style.borderStyle || 'solid';
            dd.querySelector('[data-cell-border-width]').value = activeCell.style.borderWidth || '1px';
            dd.querySelector('[data-cell-border-color]').value = rgbToHex(activeCell.style.borderColor) || '#d1d5db';
            dd.querySelector('[data-cell-bg]').value = rgbToHex(activeCell.style.backgroundColor) || '#ffffff';
        };
        return dd;
    }

    function rgbToHex(rgb) {
        if (!rgb || rgb.startsWith('#')) return rgb || '';
        const m = rgb.match(/\d+/g);
        if (!m || m.length < 3) return '#000000';
        return '#' + m.slice(0,3).map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
    }

    /* ═══════════════ CELL CLICK / SELECTION ═══════════════ */
    function bindCellClick() {
        document.addEventListener('click', (e) => {
            // Toolbar click → ignore (don't deselect)
            if (toolbar && toolbar.contains(e.target)) return;

            const cell = e.target.closest('td, th');
            if (cell) {
                const table = cell.closest('table');
                if (table) {
                    selectTable(table, cell);
                    return;
                }
            }
            // Clicked outside
            deselectTable();
        });

        // Arrow key nav
        document.addEventListener('keyup', () => {
            const sel = window.getSelection();
            if (!sel || !sel.anchorNode) return;
            const n = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
            const cell = n?.closest('td,th');
            if (cell) {
                const table = cell.closest('table');
                if (table) selectTable(table, cell);
            }
        });
    }

    function selectTable(table, cell) {
        // Deselect old
        if (activeCell) activeCell.style.outline = '';
        if (activeTable && activeTable !== table) {
            activeTable.style.outline = '';
            removeHandles();
        }
        if (activeTable) {
            activeTable.querySelectorAll('.selected-cell').forEach(c => c.classList.remove('selected-cell'));
        }

        activeTable = table;
        activeCell = cell;

        // Orange border on table
        table.style.outline = '2px solid #f59e0b';
        table.style.outlineOffset = '3px';

        // Blue outline on cell
        cell.style.outline = '2px solid #3b82f6';
        cell.style.outlineOffset = '-1px';

        // Corner resize handles
        showHandles();

        // Toolbar
        showToolbar();

        // Populate toggles in dropdowns
        toolbar.querySelectorAll('label')?.forEach(l => { if (l._update) l._update(); });
        toolbar.querySelectorAll('[data-tbl-align-row]')?.forEach(r => {}); // alignment sync
        // populate property panels if open
        toolbar.querySelectorAll('div').forEach(d => { if (d._populate) d._populate(); });
    }

    function deselectTable() {
        closeDD();
        if (activeCell) { activeCell.style.outline = ''; activeCell = null; }
        if (activeTable) { 
            activeTable.querySelectorAll('.selected-cell').forEach(c => c.classList.remove('selected-cell'));
            activeTable.style.outline = ''; 
            activeTable = null; 
        }
        removeHandles();
        hideToolbar();
    }

    /* ═══════════════ CORNER RESIZE HANDLES ═══════════════ */
    function showHandles() {
        removeHandles();
        if (!activeTable) return;

        // Bottom-right handle (draggable for overall table resize)
        const h = el('div');
        setS(h, {
            position:'absolute', width:'14px', height:'14px',
            background:'#f59e0b', border:'2px solid #fff', borderRadius:'50%',
            cursor:'nwse-resize', zIndex:'99998', boxShadow:'0 1px 4px rgba(0,0,0,.3)'
        });
        positionHandle(h);
        h.addEventListener('mousedown', (e) => startTableResize(e));
        document.body.appendChild(h);
        handles.push(h);

        // Top-left indicator
        const h2 = el('div');
        setS(h2, {
            position:'absolute', width:'14px', height:'14px',
            background:'#f59e0b', border:'2px solid #fff', borderRadius:'50%',
            cursor:'move', zIndex:'99998', boxShadow:'0 1px 4px rgba(0,0,0,.3)'
        });
        positionHandleTL(h2);
        document.body.appendChild(h2);
        handles.push(h2);
    }

    function positionHandle(h) {
        if (!activeTable || !h) return;
        const r = activeTable.getBoundingClientRect();
        h.style.left = (r.right + window.scrollX - 4) + 'px';
        h.style.top  = (r.bottom + window.scrollY - 4) + 'px';
    }
    function positionHandleTL(h) {
        if (!activeTable || !h) return;
        const r = activeTable.getBoundingClientRect();
        h.style.left = (r.left + window.scrollX - 10) + 'px';
        h.style.top  = (r.top + window.scrollY - 10) + 'px';
    }
    function removeHandles() {
        handles.forEach(h => h.remove());
        handles = [];
    }

    function startTableResize(e) {
        e.preventDefault(); e.stopPropagation();
        if (!activeTable) return;
        isDragging = true;
        const startX = e.clientX, startY = e.clientY;
        const startW = activeTable.offsetWidth, startH = activeTable.offsetHeight;

        const onMove = (me) => {
            const w = Math.max(100, startW + me.clientX - startX);
            const h = Math.max(40, startH + me.clientY - startY);
            activeTable.style.width = w + 'px';
            activeTable.style.height = h + 'px';
            positionToolbar();
            handles.forEach((hh, i) => { i === 0 ? positionHandle(hh) : positionHandleTL(hh); });
        };
        const onUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            fire();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    /* ═══════════════ CELL BORDER DRAG RESIZE ═══════════════ */
    function bindBorderResize() {
        document.addEventListener('mousemove', (e) => {
            if (isDragging) return;
            const cell = e.target.closest('td, th');
            if (!cell) { if (pendingResize) { document.body.style.cursor = ''; pendingResize = null; } return; }
            const r = cell.getBoundingClientRect();
            const dR = Math.abs(r.right - e.clientX);
            const dB = Math.abs(r.bottom - e.clientY);
            if (dR <= 5) {
                document.body.style.cursor = 'col-resize';
                pendingResize = { type:'col', cell, table: cell.closest('table') };
            } else if (dB <= 5) {
                document.body.style.cursor = 'row-resize';
                pendingResize = { type:'row', cell, table: cell.closest('table') };
            } else {
                document.body.style.cursor = '';
                pendingResize = null;
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (!pendingResize || isDragging) return;
            e.preventDefault(); e.stopPropagation();
            isDragging = true;
            const { type, cell, table } = pendingResize;
            const sx = e.clientX, sy = e.clientY;
            const ci = cell.cellIndex, tr = cell.parentElement;
            const sw = cell.offsetWidth, sh = tr.offsetHeight;

            const onMove = (me) => {
                if (type === 'col') {
                    const w = Math.max(30, sw + me.clientX - sx);
                    Array.from(table.rows).forEach(r => { if (r.cells[ci]) r.cells[ci].style.width = w + 'px'; });
                } else {
                    const h = Math.max(20, sh + me.clientY - sy);
                    tr.style.height = h + 'px';
                    Array.from(tr.cells).forEach(c => { c.style.height = h + 'px'; });
                }
                positionToolbar();
                handles.forEach((hh, i) => { i === 0 ? positionHandle(hh) : positionHandleTL(hh); });
            };
            const onUp = () => {
                isDragging = false; pendingResize = null;
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                fire();
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    /* ═══════════════ TOOLBAR SHOW / HIDE / POSITION ═══════════════ */
    function showToolbar() {
        if (!toolbar) return;
        toolbar.style.display = 'flex';
        positionToolbar();
    }
    function hideToolbar() { if (toolbar) toolbar.style.display = 'none'; }
    function positionToolbar() {
        if (!toolbar || toolbar.style.display === 'none' || !activeTable) return;
        const tr = activeTable.getBoundingClientRect();
        const tw = toolbar.offsetWidth || 300, th = toolbar.offsetHeight || 36;
        let top = tr.top - th - 10;
        let left = tr.left + (tr.width / 2) - (tw / 2);
        if (top < 120) top = tr.bottom + 8;
        left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
        toolbar.style.top = Math.round(top) + 'px';
        toolbar.style.left = Math.round(left) + 'px';
    }
    // Re-position on scroll/resize
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', () => { positionToolbar(); handles.forEach((h, i) => { i === 0 ? positionHandle(h) : positionHandleTL(h); }); });
        document.addEventListener('scroll', () => { positionToolbar(); handles.forEach((h, i) => { i === 0 ? positionHandle(h) : positionHandleTL(h); }); }, true);
    }

    /* ═══════════════ TABLE ACTIONS ═══════════════ */
    function swapTag(cell, tag) {
        if (!cell || cell.tagName.toLowerCase() === tag) return;
        const nc = document.createElement(tag);
        nc.innerHTML = cell.innerHTML;
        Array.from(cell.attributes).forEach(a => nc.setAttribute(a.name, a.value));
        cell.parentElement.replaceChild(nc, cell);
        if (cell === activeCell) activeCell = nc;
    }

    function colInsert(dir) {
        if (!activeCell || !activeTable) return;
        const ci = activeCell.cellIndex;
        Array.from(activeTable.rows).forEach(tr => {
            const nc = document.createElement(tr.cells[0]?.tagName === 'TH' && tr.rowIndex === 0 ? 'th' : 'td');
            nc.innerHTML = '&nbsp;';
            if (dir === 'left') tr.insertBefore(nc, tr.cells[ci]);
            else { ci + 1 < tr.cells.length ? tr.insertBefore(nc, tr.cells[ci + 1]) : tr.appendChild(nc); }
        });
        fire(); positionToolbar();
    }
    function colDelete() {
        if (!activeCell || !activeTable) return;
        const ci = activeCell.cellIndex;
        if (activeTable.rows[0].cells.length <= 1) { activeTable.remove(); deselectTable(); return; }
        Array.from(activeTable.rows).forEach(tr => { if (tr.cells[ci]) tr.cells[ci].remove(); });
        activeCell = null; fire(); deselectTable();
    }
    function colSelect() {
        if (!activeCell || !activeTable) return;
        const ci = activeCell.cellIndex;
        activeTable.querySelectorAll('.selected-cell').forEach(c => c.classList.remove('selected-cell'));
        Array.from(activeTable.rows).forEach(tr => {
            if (tr.cells[ci]) tr.cells[ci].classList.add('selected-cell');
        });
    }

    function rowInsert(dir) {
        if (!activeCell || !activeTable) return;
        const tr = activeCell.parentElement;
        const nr = document.createElement('tr');
        for (let i = 0; i < tr.cells.length; i++) { const td = document.createElement('td'); td.innerHTML = '&nbsp;'; nr.appendChild(td); }
        if (dir === 'above') tr.parentNode.insertBefore(nr, tr);
        else tr.parentNode.insertBefore(nr, tr.nextSibling);
        fire(); positionToolbar();
    }
    function rowDelete() {
        if (!activeCell || !activeTable) return;
        if (activeTable.rows.length <= 1) { activeTable.remove(); deselectTable(); return; }
        activeCell.parentElement.remove();
        activeCell = null; fire(); deselectTable();
    }
    function rowSelect() {
        if (!activeCell || !activeTable) return;
        activeTable.querySelectorAll('.selected-cell').forEach(c => c.classList.remove('selected-cell'));
        Array.from(activeCell.parentElement.cells).forEach(c => { c.classList.add('selected-cell'); });
    }

    function mergeCell(dir) {
        if (!activeCell || !activeTable) return;
        const tr = activeCell.parentElement;
        const ci = activeCell.cellIndex;
        const ri = tr.rowIndex;
        let target = null;

        if (dir === 'right' && activeCell.nextElementSibling) target = activeCell.nextElementSibling;
        else if (dir === 'left' && activeCell.previousElementSibling) target = activeCell.previousElementSibling;
        else if (dir === 'down' && activeTable.rows[ri + 1]?.cells[ci]) target = activeTable.rows[ri + 1].cells[ci];
        else if (dir === 'up' && activeTable.rows[ri - 1]?.cells[ci]) target = activeTable.rows[ri - 1].cells[ci];

        if (!target) return;

        if (dir === 'right' || dir === 'left') {
            const sp = parseInt(activeCell.getAttribute('colspan') || '1') + parseInt(target.getAttribute('colspan') || '1');
            activeCell.setAttribute('colspan', sp);
            activeCell.innerHTML += ' ' + target.innerHTML;
            target.remove();
        } else {
            const sp = parseInt(activeCell.getAttribute('rowspan') || '1') + parseInt(target.getAttribute('rowspan') || '1');
            activeCell.setAttribute('rowspan', sp);
            activeCell.innerHTML += '<br>' + target.innerHTML;
            target.remove();
        }
        fire();
    }

    function splitCell(dir) {
        if (!activeCell) return;
        if (dir === 'v') activeCell.removeAttribute('colspan');
        else activeCell.removeAttribute('rowspan');
        fire();
    }

    function fire() { if (typeof _onStats === 'function') _onStats(); }

    /* ═══════════════ MATRIX PICKER ═══════════════ */
    function initMatrixPicker(editor) {
        const container = document.getElementById('table-matrix-container');
        const sizeLabel = document.getElementById('matrix-size-label');
        const btnCustom = document.getElementById('menu-insert-table-custom');
        const modal = document.getElementById('modal-table');

        if (btnCustom && modal) {
            btnCustom.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.remove('hidden');
            });
        }

        if (!container) return;

        if (container.children.length === 0) {
            let html = '';
            for (let r = 1; r <= 10; r++) {
                for (let c = 1; c <= 10; c++) {
                    html += `<div class="table-matrix-cell" data-row="${r}" data-col="${c}" title="${r} × ${c}" style="width:18px;height:18px;background-color:#ffffff;border:1px solid #cbd5e1;border-radius:2px;cursor:pointer;box-sizing:border-box;"></div>`;
                }
            }
            container.innerHTML = html;
        }

        const cells = Array.from(container.querySelectorAll('.table-matrix-cell'));

        cells.forEach(cell => {
            const r = parseInt(cell.getAttribute('data-row') || '1');
            const c = parseInt(cell.getAttribute('data-col') || '1');

            cell.addEventListener('mouseenter', () => {
                if (sizeLabel) sizeLabel.textContent = `${r} x ${c}`;
                cells.forEach(cc => {
                    const cr = parseInt(cc.getAttribute('data-row') || '1');
                    const ccc = parseInt(cc.getAttribute('data-col') || '1');
                    if (cr <= r && ccc <= c) {
                        cc.style.backgroundColor = '#3b82f6';
                        cc.style.borderColor = '#1d4ed8';
                    } else {
                        cc.style.backgroundColor = '#ffffff';
                        cc.style.borderColor = '#cbd5e1';
                    }
                });
            });

            cell.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                createTable(editor, r, c);
                
                // Hide dropdown to reset state
                const dropdown = container.closest('.hidden');
                if (dropdown) {
                    const oldStyle = dropdown.style.display;
                    dropdown.style.display = 'none';
                    setTimeout(() => { dropdown.style.display = oldStyle; }, 150);
                }
            });
        });

        container.addEventListener('mouseleave', () => {
            if (sizeLabel) sizeLabel.textContent = '1 x 1';
            cells.forEach(cc => {
                cc.style.backgroundColor = '#ffffff';
                cc.style.borderColor = '#cbd5e1';
            });
        });
    }

    /* ═══════════════ CREATE TABLE ═══════════════ */
    function createTable(editor, rows, cols) {
        const target = document.querySelector('.page-content[contenteditable="true"]') || editor;
        if (!target) return;

        const table = document.createElement('table');
        table.className = 'editor-table';
        table.style.width = '100%';
        const thead = document.createElement('thead');
        const hr = document.createElement('tr');
        for (let c = 0; c < cols; c++) { const th = document.createElement('th'); th.textContent = `Başlık ${c+1}`; hr.appendChild(th); }
        thead.appendChild(hr); table.appendChild(thead);

        if (rows > 1) {
            const tbody = document.createElement('tbody');
            for (let r = 0; r < rows - 1; r++) {
                const tr = document.createElement('tr');
                for (let c = 0; c < cols; c++) { const td = document.createElement('td'); td.innerHTML = '&nbsp;'; tr.appendChild(td); }
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
        }

        target.focus();
        let inserted = false;
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (target.contains(range.commonAncestorContainer)) {
                range.deleteContents();
                range.insertNode(table);
                inserted = true;
            }
        }

        if (!inserted) {
            target.appendChild(table);
        }

        // Add paragraph break after table
        const after = document.createElement('p');
        after.innerHTML = '<br>';
        if (table.parentNode) {
            table.parentNode.insertBefore(after, table.nextSibling);
        }

        // Auto-select first cell and trigger toolbar
        const fc = table.querySelector('td, th');
        if (fc) {
            setTimeout(() => {
                selectTable(table, fc);
            }, 50);
        }
        fire();
    }

    return { init, createTable };
})();
