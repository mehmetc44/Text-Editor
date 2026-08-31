/**
 * Meditör - Zengin Metin Editörü (LibreOffice Writer Masaüstü Sürümü)
 * Pure Vanilla JS, HTML5 ve Tailwind CSS ile geliştirilmiştir.
 * Dış framework / kütüphane bağımlılığı YOKTUR.
 * 
 * Hem file:// protokolünde (çift tıklama) hem de HTTP sunucularında %100 sorunsuz çalışır.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elementleri
    const editor = document.getElementById('editor');
    const htmlTextarea = document.getElementById('html-textarea');
    const htmlEditorContainer = document.getElementById('html-editor-container');
    const htmlPreviewPanel = document.getElementById('html-preview-panel');
    const previewContent = document.getElementById('preview-content');

    // Durum Çubuğu Elementleri
    const statWords = document.getElementById('stat-words');
    const statChars = document.getElementById('stat-chars');

    // Modallar & Tetikleyiciler
    const modalImage = document.getElementById('modal-image');
    const modalTable = document.getElementById('modal-table');
    const btnModalImage = document.getElementById('btn-modal-image');
    const btnModalTable = document.getElementById('btn-modal-table');
    const menuInsertImage = document.getElementById('menu-insert-image');
    const menuInsertTable = document.getElementById('menu-insert-table');
    const menuTableAdd = document.getElementById('menu-table-add');
    const btnCloseModals = document.querySelectorAll('.btn-close-modal');

    // Menü ve Butonlar
    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    const btnToggleHtml = document.getElementById('btn-toggle-html');
    const btnTogglePreview = document.getElementById('btn-toggle-preview');
    const btnClearAll = document.getElementById('btn-clear-all');
    const tbNew = document.getElementById('tb-new');
    const menuFileNew = document.getElementById('menu-file-new');

    let isHtmlMode = false;
    let isPreviewMode = false;
    let selectedCell = null;
    let activeImage = null;
    let resizeOverlay = null;

    // ==========================================
    // 1. SELECTION & RANGE YARDIMCILARI
    // ==========================================

    function exec(command, value = null) {
        document.execCommand(command, false, value);
    }

    function applyInlineStyle(styleName, styleValue) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (range.collapsed) return;

        const span = document.createElement('span');
        span.style[styleName] = styleValue;

        try {
            span.appendChild(range.extractContents());
            range.insertNode(span);
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.addRange(newRange);
        } catch (e) {
            console.warn('Style uygulama hatası:', e);
        }
    }

    // ==========================================
    // 2. WORD & HTML KOPYALA-YAPIŞTIR TEMİZLEYİCİ & FORMAT KORUYUCU
    // ==========================================

    const ALLOWED_TAGS = new Set([
        'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
        'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
        'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE',
        'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
        'A', 'IMG', 'SPAN', 'DIV', 'SUB', 'SUP'
    ]);

    function sanitizeWordHtml(htmlContent) {
        if (!htmlContent) return '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        cleanNode(doc.body);
        return doc.body.innerHTML;
    }

    function cleanNode(node) {
        const children = Array.from(node.childNodes);
        for (const child of children) {
            if (child.nodeType === Node.COMMENT_NODE) {
                child.remove();
                continue;
            }
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toUpperCase();
                
                // MS Word özel XML etiketlerini (<o:p>, <v:shape>) temizle ama içeriğini koru
                if (tagName.includes(':') || !ALLOWED_TAGS.has(tagName)) {
                    if (child.hasChildNodes()) {
                        while (child.firstChild) {
                            node.insertBefore(child.firstChild, child);
                        }
                    }
                    child.remove();
                    continue;
                }

                // Word CSS sınıflarını (MsoNormal, MsoListParagraph) temizle
                if (child.hasAttribute('class')) {
                    const className = child.getAttribute('class');
                    if (className.includes('Mso') || className.includes('w:')) {
                        child.removeAttribute('class');
                    }
                }

                // Inline stillerdeki mso-* çöplerini temizle ama font, renk, kalınlık formatını koru
                if (child.hasAttribute('style')) {
                    let style = child.getAttribute('style');
                    
                    // Word vurgu rengi tespiti (mso-highlight -> background-color)
                    const highlightMatch = style.match(/mso-highlight:\s*([^;]+)/i);
                    let highlightColor = highlightMatch ? highlightMatch[1].trim() : null;

                    style = style.replace(/mso-[^;]+;?/gi, '');
                    style = style.replace(/margin:[^;]+;?/gi, '');

                    if (highlightColor) {
                        style += `; background-color: ${highlightColor};`;
                    }

                    if (style.trim()) child.setAttribute('style', style.trim());
                    else child.removeAttribute('style');
                }

                cleanNode(child);
            }
        }
    }

    if (editor) {
        editor.addEventListener('paste', (e) => {
            if (!e.clipboardData) return;

            // Panodaki resim kontrolü (Word veya ekran görüntüsü yapıştırma)
            const items = e.clipboardData.items;
            let hasImage = false;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    e.stopPropagation();
                    const blob = items[i].getAsFile();
                    if (blob) {
                        const objectUrl = URL.createObjectURL(blob);
                        insertImage(objectUrl, 'Yapıştırılan resim');
                        hasImage = true;
                        break;
                    }
                }
            }
            if (hasImage) return;

            const html = e.clipboardData.getData('text/html');
            const text = e.clipboardData.getData('text/plain');

            if (html && html.trim().length > 0) {
                e.preventDefault();
                e.stopPropagation();
                // Word formatı korunarak temizlenmiş HTML yapıştırılır
                const cleanHtml = sanitizeWordHtml(html);
                document.execCommand('insertHTML', false, cleanHtml);
                updateStats();
            } else if (text && text.trim().length > 0) {
                e.preventDefault();
                e.stopPropagation();
                const paragraphs = text.split(/\r?\n/).map(p => p.trim() ? `<p>${p}</p>` : '').join('');
                document.execCommand('insertHTML', false, paragraphs || text);
                updateStats();
            }
        });
    }

    // ==========================================
    // 3. METİN BİÇİMLENDİRME & TOOLBAR EVENTS
    // ==========================================

    // Buton tıklamalarında odağı editörde tut ve komut çalıştır
    const bindToolbarBtn = (id, command, value = null) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            editor.focus();
            exec(command, value);
            updateToolbarState();
            updateStats();
        });
    };

    bindToolbarBtn('btn-bold', 'bold');
    bindToolbarBtn('btn-italic', 'italic');
    bindToolbarBtn('btn-underline', 'underline');
    bindToolbarBtn('btn-strikethrough', 'strikeThrough');
    bindToolbarBtn('btn-undo', 'undo');
    bindToolbarBtn('btn-redo', 'redo');
    bindToolbarBtn('menu-edit-undo', 'undo');
    bindToolbarBtn('menu-edit-redo', 'redo');

    bindToolbarBtn('btn-align-left', 'justifyLeft');
    bindToolbarBtn('btn-align-center', 'justifyCenter');
    bindToolbarBtn('btn-align-right', 'justifyRight');
    bindToolbarBtn('btn-align-justify', 'justifyFull');

    // BUG FIX: Madde İşaretli & Numaralı Liste Butonları
    bindToolbarBtn('btn-list-ul', 'insertUnorderedList');
    bindToolbarBtn('btn-list-ol', 'insertOrderedList');
    bindToolbarBtn('btn-indent', 'indent');
    bindToolbarBtn('btn-outdent', 'outdent');

    bindToolbarBtn('btn-clear-format', 'removeFormat');

    // BUG FIX: Kod Bloğu ve Başlık Seçimi
    document.getElementById('select-heading')?.addEventListener('change', (e) => {
        editor.focus();
        const val = e.target.value;
        if (val === 'pre') {
            // Tüm sayfayı pre yapmasını engelle: Sadece seçili metni pre/code olarak sarmala
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const selectedText = range.toString() || 'Kod buraya...';
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.textContent = selectedText;
                pre.appendChild(code);
                range.deleteContents();
                range.insertNode(pre);
            }
        } else {
            exec('formatBlock', `<${val}>`);
        }
        updateStats();
    });

    document.getElementById('select-font-family')?.addEventListener('change', (e) => {
        editor.focus();
        applyInlineStyle('fontFamily', e.target.value);
    });

    document.getElementById('select-font-size')?.addEventListener('change', (e) => {
        editor.focus();
        applyInlineStyle('fontSize', e.target.value);
    });

    // BUG FIX: Renk Paletleri & Özel Renk Seçiciler
    document.querySelectorAll('#dropdown-text-color button[data-color]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            editor.focus();
            const color = btn.getAttribute('data-color');
            exec('foreColor', color);
            const indicator = document.getElementById('text-color-indicator');
            if (indicator) indicator.style.backgroundColor = color;
            document.getElementById('dropdown-text-color')?.classList.add('hidden');
        });
    });

    document.getElementById('input-custom-text-color')?.addEventListener('input', (e) => {
        editor.focus();
        const color = e.target.value;
        exec('foreColor', color);
        const indicator = document.getElementById('text-color-indicator');
        if (indicator) indicator.style.backgroundColor = color;
    });

    document.querySelectorAll('#dropdown-bg-color button[data-bgcolor]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            editor.focus();
            const color = btn.getAttribute('data-bgcolor');
            try { exec('hiliteColor', color); } catch (err) { exec('backColor', color); }
            const indicator = document.getElementById('bg-color-indicator');
            if (indicator) indicator.style.backgroundColor = color === 'transparent' ? '#fef08a' : color;
            document.getElementById('dropdown-bg-color')?.classList.add('hidden');
        });
    });

    document.getElementById('input-custom-bg-color')?.addEventListener('input', (e) => {
        editor.focus();
        const color = e.target.value;
        try { exec('hiliteColor', color); } catch (err) { exec('backColor', color); }
        const indicator = document.getElementById('bg-color-indicator');
        if (indicator) indicator.style.backgroundColor = color;
    });

    // BUG FIX: Toolbar Aktiflik Senkronizasyonu
    function updateToolbarState() {
        if (!editor || !document.activeElement || !editor.contains(document.activeElement) && document.activeElement !== editor) {
            // İmleç editör dışındaysa veya seçim yoksa durum değiştirme
        }
        
        try {
            toggleBtnState('btn-bold', document.queryCommandState('bold'));
            toggleBtnState('btn-italic', document.queryCommandState('italic'));
            toggleBtnState('btn-underline', document.queryCommandState('underline'));
            toggleBtnState('btn-strikethrough', document.queryCommandState('strikeThrough'));
            toggleBtnState('btn-align-left', document.queryCommandState('justifyLeft'));
            toggleBtnState('btn-align-center', document.queryCommandState('justifyCenter'));
            toggleBtnState('btn-align-right', document.queryCommandState('justifyRight'));
            toggleBtnState('btn-align-justify', document.queryCommandState('justifyFull'));
            toggleBtnState('btn-list-ul', document.queryCommandState('insertUnorderedList'));
            toggleBtnState('btn-list-ol', document.queryCommandState('insertOrderedList'));
        } catch (err) {
            // Safe fallback
        }
    }

    function toggleBtnState(btnId, isActive) {
        const btn = document.getElementById(btnId);
        if (btn) {
            if (isActive) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    }

    if (editor) {
        document.addEventListener('selectionchange', updateToolbarState);
        editor.addEventListener('keyup', updateToolbarState);
        editor.addEventListener('mouseup', updateToolbarState);
    }

    // ==========================================
    // 4. RESİM YÖNETİMİ & CANLI RESIZER
    // ==========================================

    // ==========================================
    // 4. RESİM YÖNETİMİ & CANLI RESIZER (YEREL YOL DESTEKLİ)
    // ==========================================

    function insertImage(displaySrc, alt = '', relPath = '') {
        if (!editor || !displaySrc) return;
        editor.focus();
        const img = document.createElement('img');
        
        const finalSrc = relPath || displaySrc;
        img.src = displaySrc;
        img.setAttribute('data-rel-src', finalSrc);
        img.alt = alt;
        img.className = 'editor-image';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);
        } else {
            editor.appendChild(img);
        }
        selectImage(img);
        updateStats();
    }

    // CANLI 8-NOKTA GÖRSEL BOYUTLANDIRMA (IMAGE RESIZER)
    let activeImage = null;
    let resizeOverlay = null;

    function selectImage(img) {
        clearImageSelection();
        activeImage = img;
        img.classList.add('selected-image');
        createResizeOverlay(img);
    }

    function clearImageSelection() {
        if (activeImage) {
            activeImage.classList.remove('selected-image');
            activeImage = null;
        }
        if (resizeOverlay && resizeOverlay.parentNode) {
            resizeOverlay.parentNode.removeChild(resizeOverlay);
            resizeOverlay = null;
        }
    }

    function createResizeOverlay(img) {
        resizeOverlay = document.createElement('div');
        resizeOverlay.className = 'resize-handle-box';
        resizeOverlay.style.top = `${img.offsetTop}px`;
        resizeOverlay.style.left = `${img.offsetLeft}px`;
        resizeOverlay.style.width = `${img.offsetWidth}px`;
        resizeOverlay.style.height = `${img.offsetHeight}px`;

        const positions = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        positions.forEach(pos => {
            const dot = document.createElement('div');
            dot.className = `resize-dot resize-${pos}`;
            if (pos.includes('n')) dot.style.top = '-4px';
            if (pos.includes('s')) dot.style.bottom = '-4px';
            if (pos.includes('w')) dot.style.left = '-4px';
            if (pos.includes('e')) dot.style.right = '-4px';
            if (pos === 'n' || pos === 's') dot.style.left = 'calc(50% - 4px)';
            if (pos === 'w' || pos === 'e') dot.style.top = 'calc(50% - 4px)';
            dot.style.cursor = `${pos}-resize`;

            dot.addEventListener('mousedown', (e) => startResizing(e, pos, img));
            resizeOverlay.appendChild(dot);
        });

        if (img.parentNode) {
            img.parentNode.insertBefore(resizeOverlay, img.nextSibling);
        }
    }

    function startResizing(e, handlePosition, img) {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = img.offsetWidth;
        const startHeight = img.offsetHeight;
        const aspectRatio = startWidth / startHeight;

        function onMouseMove(moveEvent) {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            let newWidth = startWidth;
            let newHeight = startHeight;

            if (handlePosition.includes('e')) newWidth = startWidth + deltaX;
            if (handlePosition.includes('w')) newWidth = startWidth - deltaX;
            if (handlePosition.includes('s')) newHeight = startHeight + deltaY;
            if (handlePosition.includes('n')) newHeight = startHeight - deltaY;

            newWidth = Math.max(30, newWidth);
            newHeight = Math.max(30, newHeight);

            if (handlePosition === 'se' || handlePosition === 'nw' || handlePosition === 'ne' || handlePosition === 'sw') {
                newHeight = newWidth / aspectRatio;
            }

            img.style.width = `${newWidth}px`;
            img.style.height = `${newHeight}px`;

            if (resizeOverlay) {
                resizeOverlay.style.width = `${newWidth}px`;
                resizeOverlay.style.height = `${newHeight}px`;
                resizeOverlay.style.top = `${img.offsetTop}px`;
                resizeOverlay.style.left = `${img.offsetLeft}px`;
            }
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    // Modal Tab Değişimi (Dosya Yükle / Özel Yol)
    const tabImgFile = document.getElementById('tab-img-file');
    const tabImgUrl = document.getElementById('tab-img-url');
    const paneImgFile = document.getElementById('pane-img-file');
    const paneImgUrl = document.getElementById('pane-img-url');

    if (tabImgFile && tabImgUrl && paneImgFile && paneImgUrl) {
        tabImgFile.addEventListener('click', () => {
            paneImgFile.classList.remove('hidden');
            paneImgUrl.classList.add('hidden');
            tabImgFile.className = 'px-3 py-1.5 border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400';
            tabImgUrl.className = 'px-3 py-1.5 text-slate-500 hover:text-slate-700';
        });

        tabImgUrl.addEventListener('click', () => {
            paneImgUrl.classList.remove('hidden');
            paneImgFile.classList.add('hidden');
            tabImgUrl.className = 'px-3 py-1.5 border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400';
            tabImgFile.className = 'px-3 py-1.5 text-slate-500 hover:text-slate-700';
        });
    }

    // Resim Ekle Onayı (data/dosya_adi/img/ Otomatik Bağlantı Üretici)
    const btnInsertImageConfirm = document.getElementById('btn-insert-image-confirm');
    if (btnInsertImageConfirm) {
        btnInsertImageConfirm.addEventListener('click', () => {
            const urlInput = document.getElementById('input-img-url');
            const fileInput = document.getElementById('input-img-file');
            const folderInput = document.getElementById('input-img-folder');
            const altInput = document.getElementById('input-img-alt');
            
            const folderPath = folderInput ? folderInput.value.trim() || 'data/belge1/img/' : 'data/belge1/img/';
            const altText = altInput ? altInput.value : '';

            if (fileInput && fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                const displayObjectUrl = URL.createObjectURL(file);
                const relPath = `${folderPath.endsWith('/') ? folderPath : folderPath + '/'}${file.name}`;
                insertImage(displayObjectUrl, altText, relPath);
            } else if (urlInput && urlInput.value.trim()) {
                const customPath = urlInput.value.trim();
                insertImage(customPath, altText, customPath);
            }

            if (modalImage) modalImage.classList.add('hidden');
        });
    }

    // Editör İçi Tıklamalarda Resim & Tablo Seçimi
    if (editor) {
        editor.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                selectImage(e.target);
            } else if (!e.target.closest('.resize-handle-box')) {
                clearImageSelection();
            }

            const cell = e.target.closest('td, th');
            if (cell) {
                if (selectedCell) selectedCell.classList.remove('selected-cell');
                selectedCell = cell;
                selectedCell.classList.add('selected-cell');
            }
        });
    }

    // ==========================================
    // 5. TABLO YÖNETİMİ
    // ==========================================

    function createTable(rows = 3, cols = 3) {
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
        updateStats();
    }

    const btnInsertTableConfirm = document.getElementById('btn-insert-table-confirm');
    if (btnInsertTableConfirm) {
        btnInsertTableConfirm.addEventListener('click', () => {
            const rowsInput = document.getElementById('input-tbl-rows');
            const colsInput = document.getElementById('input-tbl-cols');
            const rows = rowsInput ? parseInt(rowsInput.value) || 3 : 3;
            const cols = colsInput ? parseInt(colsInput.value) || 3 : 3;

            createTable(rows, cols);
            if (modalTable) modalTable.classList.add('hidden');
        });
    }

    // ==========================================
    // 6. GENEL UYGULAMA VE DIŞA AKTARMA
    // ==========================================

    // Tema Geçişi (Gece/Gündüz)
    if (btnToggleTheme) {
        btnToggleTheme.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
        });
    }

    // Anlık Kelime & Karakter Sayacı
    function updateStats() {
        if (!editor) return;
        const text = editor.innerText || editor.textContent || '';
        const cleanText = text.trim();
        const charCount = cleanText ? cleanText.length : 0;
        const wordCount = cleanText ? cleanText.split(/\s+/).filter(w => w.length > 0).length : 0;

        if (statChars) statChars.textContent = charCount.toLocaleString();
        if (statWords) statWords.textContent = wordCount.toLocaleString();
    }

    if (editor) {
        editor.addEventListener('input', updateStats);
        updateStats();
    }

    // Modallar
    const openImageModal = () => modalImage && modalImage.classList.remove('hidden');
    const openTableModal = () => modalTable && modalTable.classList.remove('hidden');

    if (btnModalImage) btnModalImage.addEventListener('click', openImageModal);
    if (menuInsertImage) menuInsertImage.addEventListener('click', openImageModal);
    if (btnModalTable) btnModalTable.addEventListener('click', openTableModal);
    if (menuInsertTable) menuInsertTable.addEventListener('click', openTableModal);
    if (menuTableAdd) menuTableAdd.addEventListener('click', openTableModal);

    btnCloseModals.forEach(btn => {
        btn.addEventListener('click', () => {
            if (modalImage) modalImage.classList.add('hidden');
            if (modalTable) modalTable.classList.add('hidden');
        });
    });

    // Color Pickers Toggles
    const btnTextColor = document.getElementById('btn-text-color');
    const dropdownTextColor = document.getElementById('dropdown-text-color');
    const btnBgColor = document.getElementById('btn-bg-color');
    const dropdownBgColor = document.getElementById('dropdown-bg-color');

    if (btnTextColor && dropdownTextColor) {
        btnTextColor.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownTextColor.classList.toggle('hidden');
            if (dropdownBgColor) dropdownBgColor.classList.add('hidden');
        });
    }

    if (btnBgColor && dropdownBgColor) {
        btnBgColor.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownBgColor.classList.toggle('hidden');
            if (dropdownTextColor) dropdownTextColor.classList.add('hidden');
        });
    }

    document.addEventListener('click', () => {
        if (dropdownTextColor) dropdownTextColor.classList.add('hidden');
        if (dropdownBgColor) dropdownBgColor.classList.add('hidden');
    });

    // Clean HTML Export Helper (data/dosya_adi/img/... Göreli Yolları Muhafaza Eder)
    function getCleanExportHtml() {
        if (!editor) return '';
        const clone = editor.cloneNode(true);
        clone.querySelectorAll('.resize-handle-box').forEach(el => el.remove());
        clone.querySelectorAll('.selected-image').forEach(el => el.classList.remove('selected-image'));
        clone.querySelectorAll('.selected-cell').forEach(el => el.classList.remove('selected-cell'));
        
        clone.querySelectorAll('img[data-rel-src]').forEach(img => {
            const relSrc = img.getAttribute('data-rel-src');
            if (relSrc) img.setAttribute('src', relSrc);
            img.removeAttribute('data-rel-src');
        });

        return clone.innerHTML;
    }

    // HTML Kod Görünümü ve Önizleme
    if (btnToggleHtml && editor && htmlTextarea && htmlEditorContainer) {
        btnToggleHtml.addEventListener('click', () => {
            isHtmlMode = !isHtmlMode;
            if (isHtmlMode) {
                htmlTextarea.value = getCleanExportHtml();
                editor.classList.add('hidden');
                htmlEditorContainer.classList.remove('hidden');
            } else {
                editor.innerHTML = htmlTextarea.value;
                htmlEditorContainer.classList.add('hidden');
                editor.classList.remove('hidden');
                updateStats();
            }
        });
    }

    if (btnTogglePreview && editor && htmlPreviewPanel && previewContent) {
        btnTogglePreview.addEventListener('click', () => {
            isPreviewMode = !isPreviewMode;
            if (isPreviewMode) {
                previewContent.innerHTML = isHtmlMode ? htmlTextarea.value : getCleanExportHtml();
                htmlPreviewPanel.classList.remove('hidden');
            } else {
                htmlPreviewPanel.classList.add('hidden');
            }
        });
    }

    // Temizle & Yeni
    const clearContent = () => {
        if (confirm('Belge içeriği temizlenecek. Emin misiniz?')) {
            if (editor) editor.innerHTML = '';
            if (htmlTextarea) htmlTextarea.value = '';
            updateStats();
        }
    };

    if (btnClearAll) btnClearAll.addEventListener('click', clearContent);
    if (tbNew) tbNew.addEventListener('click', clearContent);
    if (menuFileNew) menuFileNew.addEventListener('click', clearContent);

    // Dışa Aktar (.html)
    document.getElementById('btn-export-file')?.addEventListener('click', () => {
        if (!editor) return;
        const blob = new Blob([editor.innerHTML], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'belge.html';
        link.click();
    });

    // HTML Kopyala
    document.getElementById('btn-copy-html')?.addEventListener('click', () => {
        if (editor) {
            navigator.clipboard.writeText(editor.innerHTML);
            alert('HTML kodu panoya kopyalandı!');
        }
    });

    console.log("Meditör sorunsuz yüklendi ve tüm modüller aktif.");
});
