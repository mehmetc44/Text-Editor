/**
 * Meditör - LibreOffice Writer Masaüstü Şablonu İşleyicisi
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

    // --- 1. Tema Geçişi (Gece/Gündüz) ---
    if (btnToggleTheme) {
        btnToggleTheme.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
        });
    }

    // --- 2. Anlık Kelime & Karakter Sayacı ---
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

    // --- 3. Modallar & Açılır Pencereler ---
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

    // --- 4. HTML Kod Görünümü ve Önizleme ---
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

    // --- 5. İçeriği Temizle / Yeni Belge ---
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

    console.log("LibreOffice Writer masaüstü arayüzü hazır.");
});
