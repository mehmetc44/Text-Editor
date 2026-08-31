/**
 * Meditör - Resim Yönetimi, Yerel Bağlantı (data/dosya_adi/img/) ve Canlı 8-Nokta Resizer Modülü
 */

let activeImage = null;
let resizeOverlay = null;

export function insertImage(editor, displaySrc, alt = '', relPath = '') {
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
}

export function selectImage(img) {
    clearImageSelection();
    activeImage = img;
    img.classList.add('selected-image');
    createResizeOverlay(img);
}

export function clearImageSelection() {
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

        if (['se', 'nw', 'ne', 'sw'].includes(handlePosition)) {
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
