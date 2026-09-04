/**
 * Font Manager Module
 * Manages adding/removing Google Fonts and Local Fonts (.ttf, .otf, .woff) via LocalStorage
 */

window.FontManager = (function () {
    const STORAGE_KEY = 'meditor_custom_fonts';
    let customFonts = [];

    // DOM Elements
    const fontSelect = document.getElementById('select-font-family');
    const modal = document.getElementById('modal-font-manager');
    const btnClose = modal.querySelector('.btn-close-modal');
    
    const tabList = document.getElementById('tab-font-list');
    const tabGoogle = document.getElementById('tab-font-google');
    const tabLocal = document.getElementById('tab-font-local');
    
    const paneList = document.getElementById('pane-font-list');
    const paneGoogle = document.getElementById('pane-font-google');
    const paneLocal = document.getElementById('pane-font-local');

    const fontListContainer = document.getElementById('font-list-container');
    const noFontsMsg = document.getElementById('no-fonts-msg');

    const inputGoogleName = document.getElementById('input-google-font-name');
    const btnAddGoogle = document.getElementById('btn-add-google-font');

    const inputLocalName = document.getElementById('input-local-font-name');
    const inputLocalFile = document.getElementById('input-local-font-file');
    const btnAddLocal = document.getElementById('btn-add-local-font');

    function init() {
        loadFonts();
        bindEvents();
        injectFontsToPage();
        updateSelectMenu();
    }

    function loadFonts() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                customFonts = JSON.parse(stored);
            } catch (e) {
                console.error("Font verileri okunamadı", e);
                customFonts = [];
            }
        }
    }

    function saveFonts() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(customFonts));
        } catch (e) {
            console.error("Font kaydedilirken hata (Kota aşılmış olabilir):", e);
            alert("Font kaydedilemedi. Yerel dosyalar (Base64) tarayıcı limitlerini aşmış olabilir.");
        }
    }

    function bindEvents() {
        // Modal Tabs
        tabList.addEventListener('click', () => switchTab('list'));
        tabGoogle.addEventListener('click', () => switchTab('google'));
        tabLocal.addEventListener('click', () => switchTab('local'));

        // Modal Close
        btnClose.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Dropdown Listener
        if (fontSelect) {
            let previousValue = fontSelect.value;
            fontSelect.addEventListener('focus', () => {
                previousValue = fontSelect.value;
            });
            fontSelect.addEventListener('change', (e) => {
                if (e.target.value === 'manage_fonts') {
                    // Revert to previous value
                    e.target.value = previousValue;
                    openModal();
                } else {
                    previousValue = e.target.value;
                }
            });
        }

        // Add Google Font
        btnAddGoogle.addEventListener('click', () => {
            const name = inputGoogleName.value.trim();
            if (!name) return alert("Lütfen bir font adı girin.");
            
            // Check if already exists
            if (customFonts.some(f => f.name.toLowerCase() === name.toLowerCase())) {
                return alert("Bu font zaten ekli.");
            }

            const newFont = {
                id: Date.now().toString(),
                type: 'google',
                name: name
            };

            customFonts.push(newFont);
            saveFonts();
            
            inputGoogleName.value = '';
            
            applyFontChanges();
            switchTab('list');
        });

        // Add Local Font
        btnAddLocal.addEventListener('click', async () => {
            const name = inputLocalName.value.trim();
            const file = inputLocalFile.files[0];

            if (!name) return alert("Lütfen liste için bir font adı girin.");
            if (!file) return alert("Lütfen bir font dosyası seçin (.ttf, .otf, vb.)");

            if (customFonts.some(f => f.name.toLowerCase() === name.toLowerCase())) {
                return alert("Bu isimde bir font zaten ekli.");
            }

            try {
                // Convert file to Base64
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });

                const newFont = {
                    id: Date.now().toString(),
                    type: 'local',
                    name: name,
                    data: base64
                };

                customFonts.push(newFont);
                saveFonts();
                
                inputLocalName.value = '';
                inputLocalFile.value = '';
                
                applyFontChanges();
                switchTab('list');
            } catch (err) {
                console.error(err);
                alert("Dosya okunamadı.");
            }
        });
    }

    function openModal() {
        renderFontList();
        switchTab('list');
        modal.classList.remove('hidden');
    }

    function switchTab(tab) {
        // Reset styles
        [tabList, tabGoogle, tabLocal].forEach(t => {
            t.className = "px-3 py-1.5 text-slate-500 hover:text-slate-700";
        });
        [paneList, paneGoogle, paneLocal].forEach(p => p.classList.add('hidden'));

        if (tab === 'list') {
            tabList.className = "px-3 py-1.5 border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400";
            paneList.classList.remove('hidden');
            renderFontList();
        } else if (tab === 'google') {
            tabGoogle.className = "px-3 py-1.5 border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400";
            paneGoogle.classList.remove('hidden');
        } else if (tab === 'local') {
            tabLocal.className = "px-3 py-1.5 border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400";
            paneLocal.classList.remove('hidden');
        }
    }

    function renderFontList() {
        fontListContainer.innerHTML = '';
        
        if (customFonts.length === 0) {
            noFontsMsg.classList.remove('hidden');
            fontListContainer.appendChild(noFontsMsg);
            return;
        }

        noFontsMsg.classList.add('hidden');

        customFonts.forEach(font => {
            const item = document.createElement('div');
            item.className = "flex items-center justify-between p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm";
            
            const info = document.createElement('div');
            info.className = "flex flex-col";
            info.innerHTML = `
                <span class="font-bold text-slate-800 dark:text-slate-200" style="font-family: '${font.name}', sans-serif">${font.name}</span>
                <span class="text-[10px] text-slate-500 uppercase">${font.type === 'google' ? 'Google Font' : 'Yerel (Base64)'}</span>
            `;

            const btnDelete = document.createElement('button');
            btnDelete.className = "px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 rounded text-xs font-semibold transition-colors";
            btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';
            btnDelete.onclick = () => {
                if (confirm(`'${font.name}' fontunu silmek istediğinize emin misiniz?`)) {
                    deleteFont(font.id);
                }
            };

            item.appendChild(info);
            item.appendChild(btnDelete);
            fontListContainer.appendChild(item);
        });
    }

    function deleteFont(id) {
        customFonts = customFonts.filter(f => f.id !== id);
        saveFonts();
        applyFontChanges();
        renderFontList();
    }

    function applyFontChanges() {
        injectFontsToPage();
        updateSelectMenu();
    }

    function injectFontsToPage() {
        // Clean up old injected styles
        document.querySelectorAll('.meditor-custom-font').forEach(el => el.remove());

        customFonts.forEach(font => {
            if (font.type === 'google') {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = `https://fonts.googleapis.com/css2?family=${font.name.replace(/\s+/g, '+')}&display=swap`;
                link.className = 'meditor-custom-font';
                document.head.appendChild(link);
            } else if (font.type === 'local') {
                const style = document.createElement('style');
                style.className = 'meditor-custom-font';
                style.innerHTML = `
                    @font-face {
                        font-family: '${font.name}';
                        src: url('${font.data}');
                    }
                `;
                document.head.appendChild(style);
            }
        });
    }

    function updateSelectMenu() {
        if (!fontSelect) return;

        // Kaldırılan eski custom option'ları sil
        Array.from(fontSelect.options).forEach(opt => {
            if (opt.classList.contains('custom-font-opt')) {
                opt.remove();
            }
        });

        // manage_fonts option'unu bul (en sonda olmalı)
        const manageOpt = fontSelect.querySelector('option[value="manage_fonts"]');

        customFonts.forEach(font => {
            const opt = document.createElement('option');
            opt.value = `'${font.name}', sans-serif`;
            opt.text = font.name;
            opt.className = 'custom-font-opt';
            opt.style.fontFamily = `'${font.name}', sans-serif`;
            
            // Eğer "Yazı Tiplerini Yönet" varsa ondan öncesine, yoksa en sona ekle
            if (manageOpt) {
                fontSelect.insertBefore(opt, manageOpt);
            } else {
                fontSelect.appendChild(opt);
            }
        });
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);

    return {
        openModal: openModal,
        getFonts: () => customFonts
    };

})();
