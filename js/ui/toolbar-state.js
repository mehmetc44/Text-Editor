/**
 * Toolbar UI Controller & Selection State Synchronization Module
 */

window.ToolbarUI = (function () {

    function preventFocusLoss(el) {
        if (!el) return;
        el.addEventListener('mousedown', (e) => e.preventDefault());
    }

    function bindToolbarBtn(id, command, value = null, editor, updateStats) {
        const btn = document.getElementById(id);
        if (!btn) return;
        preventFocusLoss(btn);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (editor) editor.focus();
            window.EditorSelection.exec(command, value);
            updateToolbarState(editor);
            if (typeof updateStats === 'function') updateStats(editor);
        });
    }

    function updateToolbarState(editor) {
        if (!editor || !document.activeElement || (!editor.contains(document.activeElement) && document.activeElement !== editor)) {
            return;
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

            const selectHeading = document.getElementById('select-heading');
            if (selectHeading) {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    let parentNode = selection.anchorNode;
                    if (parentNode && parentNode.nodeType === Node.TEXT_NODE) parentNode = parentNode.parentNode;
                    if (parentNode && editor.contains(parentNode)) {
                        const blockNode = parentNode.closest('h1, h2, h3, h4, blockquote, pre, p');
                        if (blockNode) {
                            selectHeading.value = blockNode.tagName.toLowerCase();
                        }
                    }
                }
            }
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

    function init(editor) {
        if (!editor) return;

        const updateStats = window.FileManager.updateStats;

        // Metin Biçimlendirme Butonları
        bindToolbarBtn('btn-bold', 'bold', null, editor, updateStats);
        bindToolbarBtn('btn-italic', 'italic', null, editor, updateStats);
        bindToolbarBtn('btn-underline', 'underline', null, editor, updateStats);
        bindToolbarBtn('btn-strikethrough', 'strikeThrough', null, editor, updateStats);
        bindToolbarBtn('btn-undo', 'undo', null, editor, updateStats);
        bindToolbarBtn('btn-redo', 'redo', null, editor, updateStats);
        bindToolbarBtn('menu-edit-undo', 'undo', null, editor, updateStats);
        bindToolbarBtn('menu-edit-redo', 'redo', null, editor, updateStats);

        bindToolbarBtn('btn-align-left', 'justifyLeft', null, editor, updateStats);
        bindToolbarBtn('btn-align-center', 'justifyCenter', null, editor, updateStats);
        bindToolbarBtn('btn-align-right', 'justifyRight', null, editor, updateStats);
        bindToolbarBtn('btn-align-justify', 'justifyFull', null, editor, updateStats);

        bindToolbarBtn('btn-list-ul', 'insertUnorderedList', null, editor, updateStats);
        bindToolbarBtn('btn-list-ol', 'insertOrderedList', null, editor, updateStats);
        bindToolbarBtn('btn-indent', 'indent', null, editor, updateStats);
        bindToolbarBtn('btn-outdent', 'outdent', null, editor, updateStats);
        bindToolbarBtn('btn-clear-format', 'removeFormat', null, editor, updateStats);

        // Kopyala
        const btnCopyHtml = document.getElementById('btn-copy-html');
        if (btnCopyHtml) {
            preventFocusLoss(btnCopyHtml);
            btnCopyHtml.addEventListener('click', (e) => {
                e.preventDefault();
                const cleanHtml = window.FileManager.getCleanExportHtml(editor);
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(cleanHtml).then(() => {
                        alert('HTML kaynak kodu panoya kopyalandı.');
                    });
                } else {
                    alert('HTML Kodunuz:\n' + cleanHtml);
                }
            });
        }

        // Link & HR
        const btnAddLink = document.getElementById('btn-add-link');
        const modalLink = document.getElementById('modal-link');
        const btnInsertLinkConfirm = document.getElementById('btn-insert-link-confirm');
        const inputLinkUrl = document.getElementById('input-link-url');
        const inputLinkText = document.getElementById('input-link-text');
        let savedLinkRange = null;

        if (btnAddLink && modalLink) {
            preventFocusLoss(btnAddLink);
            btnAddLink.addEventListener('click', (e) => {
                e.preventDefault();
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                    savedLinkRange = sel.getRangeAt(0).cloneRange();
                    const selectedText = sel.toString().trim();
                    if (inputLinkText) inputLinkText.value = selectedText;
                } else {
                    savedLinkRange = null;
                    if (inputLinkText) inputLinkText.value = '';
                }

                if (inputLinkUrl) inputLinkUrl.value = '';
                modalLink.classList.remove('hidden');
                setTimeout(() => inputLinkUrl?.focus(), 50);
            });
        }

        if (btnInsertLinkConfirm && modalLink) {
            btnInsertLinkConfirm.addEventListener('click', () => {
                let url = inputLinkUrl ? inputLinkUrl.value.trim() : '';
                const text = inputLinkText ? inputLinkText.value.trim() : '';

                if (!url) {
                    alert('Lütfen geçerli bir URL adresi girin.');
                    return;
                }

                if (!/^https?:\/\//i.test(url) && !/^\//.test(url) && !/^mailto:/i.test(url)) {
                    url = 'https://' + url;
                }

                modalLink.classList.add('hidden');
                editor.focus();

                const sel = window.getSelection();
                if (savedLinkRange) {
                    sel.removeAllRanges();
                    sel.addRange(savedLinkRange);
                }

                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.className = 'text-blue-600 dark:text-blue-400 underline hover:text-blue-800';
                a.textContent = text || url;

                if (sel && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(a);
                    
                    // Imleci linkin sonuna yerleştir
                    range.setStartAfter(a);
                    range.setEndAfter(a);
                    sel.removeAllRanges();
                    sel.addRange(range);
                } else {
                    editor.appendChild(a);
                }

                if (typeof updateStats === 'function') updateStats(editor);
            });
        }

        // Emoji Picker Logic
        const emojiPickerGrid = document.getElementById('emoji-picker-grid');
        if (emojiPickerGrid) {
            const emojis = [
                '😊', '😂', '🤣', '😍', '🥰', '😎', '🤔', '😅',
                '👍', '👎', '🙌', '👏', '🔥', '❤️', '⭐', '🎉',
                '🚀', '💡', '✅', '❌', '📌', '📝', '🔍', '💼',
                '🎯', '⚡', '🌟', '💬', '📧', '🔒', '📄', '📊',
                '📈', '🎨', '🏆', '☕'
            ];

            emojiPickerGrid.innerHTML = '';
            emojis.forEach(emoji => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'emoji-item';
                btn.textContent = emoji;
                btn.title = emoji;

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    editor.focus();
                    try {
                        document.execCommand('insertText', false, emoji);
                    } catch (err) {
                        const sel = window.getSelection();
                        if (sel && sel.rangeCount > 0) {
                            const range = sel.getRangeAt(0);
                            range.insertNode(document.createTextNode(emoji));
                        }
                    }
                    if (typeof updateStats === 'function') updateStats(editor);
                });

                emojiPickerGrid.appendChild(btn);
            });
        }

        const btnInsertHr = document.getElementById('btn-insert-hr');
        if (btnInsertHr) {
            preventFocusLoss(btnInsertHr);
            btnInsertHr.addEventListener('click', (e) => {
                e.preventDefault();
                editor.focus();
                window.EditorSelection.exec('insertHorizontalRule');
                updateStats(editor);
            });
        }

        // Başlık, Font Ailesi & Boyutu Seçimleri
        document.getElementById('select-heading')?.addEventListener('change', (e) => {
            editor.focus();
            const val = e.target.value;
            if (val === 'pre') {
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
                const tag = val.toLowerCase();
                try { document.execCommand('formatBlock', false, `<${tag}>`); }
                catch (err) { document.execCommand('formatBlock', false, tag); }
            }
            updateStats(editor);
        });

        document.getElementById('select-font-family')?.addEventListener('change', (e) => {
            editor.focus();
            window.EditorSelection.applyInlineStyle('fontFamily', e.target.value);
        });

        document.getElementById('select-font-size')?.addEventListener('change', (e) => {
            editor.focus();
            window.EditorSelection.applyInlineStyle('fontSize', e.target.value);
        });

        document.getElementById('select-line-height')?.addEventListener('change', (e) => {
            editor.focus();
            const val = e.target.value;
            const sel = window.getSelection();
            if (!sel.rangeCount) return;

            const range = sel.getRangeAt(0);
            const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TD', 'TH'];
            
            let commonAncestor = range.commonAncestorContainer;
            if (commonAncestor.nodeType === 3) commonAncestor = commonAncestor.parentNode;

            const blocks = [];
            if (blockTags.includes(commonAncestor.tagName)) {
                blocks.push(commonAncestor);
            }
            
            if (commonAncestor.querySelectorAll) {
                commonAncestor.querySelectorAll(blockTags.join(',')).forEach(el => {
                    if (sel.containsNode(el, true)) {
                        blocks.push(el);
                    }
                });
            }

            if (blocks.length === 0) {
                let current = range.startContainer;
                while (current && !current.classList?.contains('page-content') && current.id !== 'editor') {
                    if (current.nodeType === 1 && blockTags.includes(current.tagName)) {
                        blocks.push(current);
                        break;
                    }
                    current = current.parentNode;
                }
            }

            blocks.forEach(block => {
                block.style.lineHeight = val;
            });
            
            // Trigger flow update since height might change
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        });

        // Renk Paleti Açılır Menüleri
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

        document.querySelectorAll('#dropdown-text-color button[data-color]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                editor.focus();
                const color = btn.getAttribute('data-color');
                window.EditorSelection.exec('foreColor', color);
                const indicator = document.getElementById('text-color-indicator');
                if (indicator) indicator.style.backgroundColor = color;
                if (dropdownTextColor) dropdownTextColor.classList.add('hidden');
            });
        });

        document.getElementById('input-custom-text-color')?.addEventListener('input', (e) => {
            editor.focus();
            const color = e.target.value;
            window.EditorSelection.exec('foreColor', color);
            const indicator = document.getElementById('text-color-indicator');
            if (indicator) indicator.style.backgroundColor = color;
        });

        document.querySelectorAll('#dropdown-bg-color button[data-bgcolor]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                editor.focus();
                const color = btn.getAttribute('data-bgcolor');
                try { window.EditorSelection.exec('hiliteColor', color); } catch (err) { window.EditorSelection.exec('backColor', color); }
                const indicator = document.getElementById('bg-color-indicator');
                if (indicator) indicator.style.backgroundColor = color === 'transparent' ? '#fef08a' : color;
                if (dropdownBgColor) dropdownBgColor.classList.add('hidden');
            });
        });

        document.getElementById('input-custom-bg-color')?.addEventListener('input', (e) => {
            editor.focus();
            const color = e.target.value;
            try { window.EditorSelection.exec('hiliteColor', color); } catch (err) { window.EditorSelection.exec('backColor', color); }
            const indicator = document.getElementById('bg-color-indicator');
            if (indicator) indicator.style.backgroundColor = color;
        });

        // Gece / Gündüz Tema Modu
        const btnToggleTheme = document.getElementById('btn-toggle-theme');
        if (btnToggleTheme) {
            btnToggleTheme.addEventListener('click', () => {
                document.documentElement.classList.toggle('dark');
            });
        }

        // Temizle & Yeni Belge
        const btnClearAll = document.getElementById('btn-clear-all');
        const tbNew = document.getElementById('tb-new');
        const menuFileNew = document.getElementById('menu-file-new');

        const clearContent = () => {
            if (confirm('Belge içeriği temizlenecek. Emin misiniz?')) {
                editor.innerHTML = '';
                const htmlTextarea = document.getElementById('html-textarea');
                if (htmlTextarea) htmlTextarea.value = '';
                updateStats(editor);
            }
        };

        if (btnClearAll) btnClearAll.addEventListener('click', clearContent);
        if (tbNew) tbNew.addEventListener('click', clearContent);
        if (menuFileNew) menuFileNew.addEventListener('click', clearContent);

        // Modallar Kapatma
        const modalImage = document.getElementById('modal-image');
        const modalTable = document.getElementById('modal-table');
        const modalRevisions = document.getElementById('modal-revisions');
        const btnCloseModals = document.querySelectorAll('.btn-close-modal');

        btnCloseModals.forEach(btn => {
            btn.addEventListener('click', () => {
                if (modalImage) modalImage.classList.add('hidden');
                if (modalTable) modalTable.classList.add('hidden');
                if (modalRevisions) modalRevisions.classList.add('hidden');
                if (modalLink) modalLink.classList.add('hidden');
            });
        });

        // Selection Change Listeners
        document.addEventListener('selectionchange', () => updateToolbarState(editor));
        editor.addEventListener('keyup', () => updateToolbarState(editor));
        editor.addEventListener('mouseup', () => updateToolbarState(editor));
    }

    return {
        init,
        updateToolbarState,
        preventFocusLoss
    };
})();
