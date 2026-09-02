/**
 * Image Manager & Live 8-Point Drag Resizer Overlay Module
 */

window.ImageManager = (function () {
    let activeImage = null;
    let resizeOverlay = null;

    function init(editor, onUpdateStats) {
        if (!editor) return;

        editor.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                selectImage(e.target);
            } else if (!e.target.closest('.resize-handle-box')) {
                clearImageSelection();
            }
        });

        // Image Modal Tabs
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

        // Image Confirm
        const btnInsertImageConfirm = document.getElementById('btn-insert-image-confirm');
        const modalImage = document.getElementById('modal-image');

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
                    insertImage(editor, displayObjectUrl, altText, relPath, onUpdateStats);
                } else if (urlInput && urlInput.value.trim()) {
                    const customPath = urlInput.value.trim();
                    insertImage(editor, customPath, altText, customPath, onUpdateStats);
                }

                if (modalImage) modalImage.classList.add('hidden');
            });
        }
    }

    function insertImage(editor, displaySrc, alt = '', relPath = '', onUpdateStats) {
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

    return {
        init,
        insertImage,
        clearImageSelection
    };
})();
