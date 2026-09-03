/**
 * Image Manager & Live 8-Point Drag Resizer Overlay Module
 * Features: Local persistent storage (IndexedDB), clean relative path references (No Base64), 
 * and precise drag-to-resize overlay with live size badge.
 */

window.ImageManager = (function () {
    let activeImage = null;
    let resizeOverlay = null;

    // IndexedDB for local persistent storage of uploaded image files by relative path
    const DB_NAME = 'MeditörImageStore';
    const DB_VERSION = 1;
    const STORE_NAME = 'local_images';

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'path' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function saveLocalImageBlob(path, blob) {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put({ path, blob, updatedAt: Date.now() });
        } catch (e) {
            console.warn('IndexedDB resim kayıt hatası:', e);
        }
    }

    async function getLocalImageBlob(path) {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(path);
            return new Promise((resolve) => {
                req.onsuccess = () => resolve(req.result ? req.result.blob : null);
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    function init(editor, onUpdateStats) {
        if (!editor) return;

        // Image Selection Click Handler
        editor.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                selectImage(e.target);
            } else if (!e.target.closest('.resize-handle-box')) {
                clearImageSelection();
            }
        });

        // Reposition resize overlay on scroll or window resize
        const workspace = document.getElementById('editor-workspace') || window;
        workspace.addEventListener('scroll', updateOverlayPosition);
        window.addEventListener('resize', updateOverlayPosition);

        // Rehydrate images stored in IndexedDB on init
        rehydrateImages(editor);

        // Image Modal Tab Switchers
        const tabImgFile = document.getElementById('tab-img-file');
        const tabImgUrl = document.getElementById('tab-img-url');
        const paneImgFile = document.getElementById('pane-img-file');
        const paneImgUrl = document.getElementById('pane-img-url');

        function switchTab(mode) {
            if (mode === 'file') {
                if (paneImgFile) paneImgFile.classList.remove('hidden');
                if (paneImgUrl) paneImgUrl.classList.add('hidden');
                if (tabImgFile) tabImgFile.className = 'px-3 py-1.5 border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400';
                if (tabImgUrl) tabImgUrl.className = 'px-3 py-1.5 text-slate-500 hover:text-slate-700';
            } else {
                if (paneImgUrl) paneImgUrl.classList.remove('hidden');
                if (paneImgFile) paneImgFile.classList.add('hidden');
                if (tabImgUrl) tabImgUrl.className = 'px-3 py-1.5 border-b-2 border-blue-600 font-bold text-blue-600 dark:text-blue-400';
                if (tabImgFile) tabImgFile.className = 'px-3 py-1.5 text-slate-500 hover:text-slate-700';
            }
        }

        if (tabImgFile && tabImgUrl) {
            tabImgFile.addEventListener('click', () => switchTab('file'));
            tabImgUrl.addEventListener('click', () => switchTab('url'));
        }

        // Submenu Image Button Triggers
        const btnMenuImgFile = document.getElementById('menu-insert-image-file');
        const btnMenuImgUrl = document.getElementById('menu-insert-image-url');
        const btnModalImage = document.getElementById('btn-modal-image');
        const modalImage = document.getElementById('modal-image');

        if (btnMenuImgFile && modalImage) {
            btnMenuImgFile.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab('file');
                modalImage.classList.remove('hidden');
            });
        }

        if (btnMenuImgUrl && modalImage) {
            btnMenuImgUrl.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab('url');
                modalImage.classList.remove('hidden');
            });
        }

        if (btnModalImage && modalImage) {
            btnModalImage.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab('file');
                modalImage.classList.remove('hidden');
            });
        }

        // Image Confirm
        const btnInsertImageConfirm = document.getElementById('btn-insert-image-confirm');

        if (btnInsertImageConfirm) {
            btnInsertImageConfirm.addEventListener('click', async () => {
                const urlInput = document.getElementById('input-img-url');
                const fileInput = document.getElementById('input-img-file');
                const folderInput = document.getElementById('input-img-folder');
                const altInput = document.getElementById('input-img-alt');

                const folderPath = folderInput ? folderInput.value.trim() || 'data/belge1/img/' : 'data/belge1/img/';
                const altText = altInput ? altInput.value : '';

                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];
                    const relPath = `${folderPath.endsWith('/') ? folderPath : folderPath + '/'}${file.name}`;
                    
                    // Save to IndexedDB locally
                    await saveLocalImageBlob(relPath, file);
                    
                    // Display live object URL without Base64 in HTML
                    const displayUrl = URL.createObjectURL(file);
                    insertImage(editor, displayUrl, altText, relPath, onUpdateStats);
                    fileInput.value = '';
                } else if (urlInput && urlInput.value.trim()) {
                    const customPath = urlInput.value.trim();
                    insertImage(editor, customPath, altText, customPath, onUpdateStats);
                }

                if (modalImage) modalImage.classList.add('hidden');
            });
        }
    }

    async function rehydrateImages(editor) {
        if (!editor) return;
        const images = editor.querySelectorAll('img[data-rel-src]');
        for (const img of images) {
            const relSrc = img.getAttribute('data-rel-src');
            if (relSrc && relSrc.startsWith('data/')) {
                const blob = await getLocalImageBlob(relSrc);
                if (blob) {
                    img.src = URL.createObjectURL(blob);
                }
            }
        }
    }

    function insertImage(editor, displaySrc, alt = '', relPath = '', onUpdateStats) {
        if (!editor || !displaySrc) return;
        editor.focus();
        const img = document.createElement('img');

        const finalRelPath = relPath || displaySrc;
        img.src = displaySrc;
        img.setAttribute('data-rel-src', finalRelPath);
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
        if (typeof onUpdateStats === 'function') onUpdateStats();
    }

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

    function updateOverlayPosition() {
        if (!activeImage || !resizeOverlay) return;
        const workspace = document.getElementById('editor-workspace');
        if (!workspace) return;

        const imgRect = activeImage.getBoundingClientRect();
        const wsRect = workspace.getBoundingClientRect();

        const top = imgRect.top - wsRect.top + workspace.scrollTop;
        const left = imgRect.left - wsRect.left + workspace.scrollLeft;

        resizeOverlay.style.top = `${top}px`;
        resizeOverlay.style.left = `${left}px`;
        resizeOverlay.style.width = `${imgRect.width}px`;
        resizeOverlay.style.height = `${imgRect.height}px`;

        const badge = resizeOverlay.querySelector('.resize-size-badge');
        if (badge) {
            badge.textContent = `${Math.round(imgRect.width)} × ${Math.round(imgRect.height)} px`;
        }
    }

    function createResizeOverlay(img) {
        const workspace = document.getElementById('editor-workspace');
        if (!workspace) return;

        resizeOverlay = document.createElement('div');
        resizeOverlay.className = 'resize-handle-box';

        const badge = document.createElement('div');
        badge.className = 'resize-size-badge';
        badge.textContent = `${Math.round(img.offsetWidth)} × ${Math.round(img.offsetHeight)} px`;
        resizeOverlay.appendChild(badge);

        const positions = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
        positions.forEach(pos => {
            const dot = document.createElement('div');
            dot.className = `resize-dot resize-${pos}`;
            dot.addEventListener('mousedown', (e) => startResizing(e, pos, img));
            resizeOverlay.appendChild(dot);
        });

        workspace.appendChild(resizeOverlay);
        updateOverlayPosition();
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

            img.style.width = `${Math.round(newWidth)}px`;
            img.style.height = `${Math.round(newHeight)}px`;

            updateOverlayPosition();
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    return {
        init,
        insertImage,
        selectImage,
        clearImageSelection,
        rehydrateImages,
        saveLocalImageBlob,
        getLocalImageBlob
    };
})();
