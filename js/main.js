/**
 * Meditör - LibreOffice Writer Masaüstü Şablonu İşleyicisi
 */

import * as TextFormat from './modules/text-formatting.js';
import { updateToolbarState } from './ui/toolbar-state.js';
import { handlePaste } from './core/word-sanitizer.js';
import * as ImageManager from './modules/image-manager.js';

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

    // --- 1. Biçimlendirme Butonları Olay Dinleyicileri ---
    document.getElementById('btn-bold')?.addEventListener('click', () => TextFormat.toggleBold());
    document.getElementById('btn-italic')?.addEventListener('click', () => TextFormat.toggleItalic());
    document.getElementById('btn-underline')?.addEventListener('click', () => TextFormat.toggleUnderline());
    document.getElementById('btn-strikethrough')?.addEventListener('click', () => TextFormat.toggleStrikethrough());

    document.getElementById('btn-align-left')?.addEventListener('click', () => TextFormat.setAlignment('left'));
    document.getElementById('btn-align-center')?.addEventListener('click', () => TextFormat.setAlignment('center'));
    document.getElementById('btn-align-right')?.addEventListener('click', () => TextFormat.setAlignment('right'));
    document.getElementById('btn-align-justify')?.addEventListener('click', () => TextFormat.setAlignment('justify'));

    document.getElementById('btn-list-ul')?.addEventListener('click', () => TextFormat.exec('insertUnorderedList'));
    document.getElementById('btn-list-ol')?.addEventListener('click', () => TextFormat.exec('insertOrderedList'));
    document.getElementById('btn-indent')?.addEventListener('click', () => TextFormat.exec('indent'));
    document.getElementById('btn-outdent')?.addEventListener('click', () => TextFormat.exec('outdent'));

    document.getElementById('btn-clear-format')?.addEventListener('click', () => TextFormat.clearFormatting());

    // Select Dropdown Dinleyicileri
    document.getElementById('select-heading')?.addEventListener('change', (e) => TextFormat.setHeading(e.target.value));
    document.getElementById('select-font-family')?.addEventListener('change', (e) => TextFormat.setFontFamily(e.target.value));
    document.getElementById('select-font-size')?.addEventListener('change', (e) => TextFormat.setFontSize(e.target.value));

    // Renk Paletleri
    document.querySelectorAll('#dropdown-text-color button[data-color]').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.getAttribute('data-color');
            TextFormat.setTextColor(color);
            document.getElementById('text-color-indicator').style.backgroundColor = color;
        });
    });

    document.querySelectorAll('#dropdown-bg-color button[data-bgcolor]').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.getAttribute('data-bgcolor');
            TextFormat.setBackgroundColor(color);
            document.getElementById('bg-color-indicator').style.backgroundColor = color === 'transparent' ? '#fef08a' : color;
        });
    });

    // Toolbar Aktiflik Senkronizasyonu
    if (editor) {
        document.addEventListener('selectionchange', () => updateToolbarState(editor));
        editor.addEventListener('keyup', () => updateToolbarState(editor));
        editor.addEventListener('mouseup', () => updateToolbarState(editor));
        editor.addEventListener('paste', (e) => handlePaste(editor, e));
    }

    // --- 2. Tema Geçişi (Gece/Gündüz) ---
    if (btnToggleTheme) {
        btnToggleTheme.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
        });
    }

    // --- 3. Anlık Kelime & Karakter Sayacı ---
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

    // --- 4. Modallar & Açılır Pencereler ---
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

    // Resim Modalı Sekmeleri (URL vs Dosya)
    const tabUrl = document.getElementById('tab-img-url');
    const tabFile = document.getElementById('tab-img-file');
    const paneUrl = document.getElementById('pane-img-url');
    const paneFile = document.getElementById('pane-img-file');

    if (tabUrl && tabFile && paneUrl && paneFile) {
        tabUrl.addEventListener('click', () => {
            tabUrl.className = "px-3 py-1.5 border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400";
            tabFile.className = "px-3 py-1.5 text-slate-500 hover:text-slate-700";
            paneUrl.classList.remove('hidden');
            paneFile.classList.add('hidden');
        });

        tabFile.addEventListener('click', () => {
            tabFile.className = "px-3 py-1.5 border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400";
            tabUrl.className = "px-3 py-1.5 text-slate-500 hover:text-slate-700";
            paneFile.classList.remove('hidden');
            paneUrl.classList.add('hidden');
        });
    }

    // Resim Ekle Onayı
    const btnInsertImageConfirm = document.getElementById('btn-insert-image-confirm');
    if (btnInsertImageConfirm) {
        btnInsertImageConfirm.addEventListener('click', () => {
            const urlInput = document.getElementById('input-img-url');
            const fileInput = document.getElementById('input-img-file');
            const altInput = document.getElementById('input-img-alt');
            const altText = altInput ? altInput.value : '';

            if (fileInput && fileInput.files && fileInput.files[0]) {
                ImageManager.insertImageFromFile(editor, fileInput.files[0], altText);
            } else if (urlInput && urlInput.value.trim()) {
                ImageManager.insertImage(editor, urlInput.value.trim(), altText);
            }

            if (modalImage) modalImage.classList.add('hidden');
        });
    }

    // Editör İçi Tıklamalarda Resim Seçimi
    if (editor) {
        editor.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                ImageManager.selectImage(e.target, editor);
            } else if (!e.target.closest('.resize-handle-box')) {
                ImageManager.clearImageSelection();
            }
        });
    }

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

    // --- 5. HTML Kod Görünümü ve Önizleme ---
    if (btnToggleHtml && editor && htmlTextarea && htmlEditorContainer) {
        btnToggleHtml.addEventListener('click', () => {
            isHtmlMode = !isHtmlMode;
            if (isHtmlMode) {
                htmlTextarea.value = editor.innerHTML;
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
                previewContent.innerHTML = isHtmlMode ? htmlTextarea.value : editor.innerHTML;
                htmlPreviewPanel.classList.remove('hidden');
            } else {
                htmlPreviewPanel.classList.add('hidden');
            }
        });
    }

    // --- 6. İçeriği Temizle / Yeni Belge ---
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

    console.log("Meditör metin biçimlendirme modülü aktif.");
});
