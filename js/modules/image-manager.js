/**
 * Image Manager & Live 8-Point Drag Resizer Overlay Module
 * Features: In-memory blob URL display, DOCX export embeds images as real files.
 * Precise drag-to-resize overlay with live size badge.
 */

window.ImageManager = (function () {
    let activeImage = null;
    let resizeOverlay = null;
    let imageToolbar = null;

    function init(editor, onUpdateStats) {
        if (!editor) return;

        // Image Selection Click Handler
        editor.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                selectImage(e.target);
            } else if (e.target.classList.contains('editor-image-caption')) {
                // Ignore clicks on captions so we can edit them
            } else if (!e.target.closest('.resize-handle-box') && !e.target.closest('#image-toolbar')) {
                clearImageSelection();
            }
        });

        buildImageToolbar();

        // Reposition resize overlay on scroll or window resize
        const workspace = document.getElementById('editor-workspace') || window;
        workspace.addEventListener('scroll', updateOverlayPosition);
        window.addEventListener('resize', updateOverlayPosition);


        // Submenu Image Button Triggers
        const btnMenuImgFile = document.getElementById('menu-insert-image-file');
        const btnMenuImgUrl = document.getElementById('menu-insert-image-url');
        const btnModalImage = document.getElementById('btn-modal-image');
        const modalImage = document.getElementById('modal-image');

        if (btnMenuImgFile && modalImage) {
            btnMenuImgFile.addEventListener('click', (e) => {
                e.preventDefault();
                modalImage.classList.remove('hidden');
            });
        }

        if (btnMenuImgUrl && modalImage) {
            btnMenuImgUrl.addEventListener('click', (e) => {
                e.preventDefault();
                modalImage.classList.remove('hidden');
            });
        }

        if (btnModalImage && modalImage) {
            btnModalImage.addEventListener('click', (e) => {
                e.preventDefault();
                modalImage.classList.remove('hidden');
            });
        }

        // Image Confirm
        const btnInsertImageConfirm = document.getElementById('btn-insert-image-confirm');

        if (btnInsertImageConfirm) {
            btnInsertImageConfirm.addEventListener('click', async () => {
                const fileInput = document.getElementById('input-img-file');

                if (fileInput && fileInput.files && fileInput.files[0]) {
                    const file = fileInput.files[0];

                    // Display live object URL
                    const displayUrl = URL.createObjectURL(file);
                    insertImage(editor, displayUrl, '', '', onUpdateStats);
                    fileInput.value = '';
                }

                if (modalImage) modalImage.classList.add('hidden');
            });
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
        if (imageToolbar) {
            imageToolbar.style.display = 'flex';
            // update caption button state
            const btnCaption = imageToolbar.querySelector('[data-tool="caption"]');
            if (btnCaption) {
                if (activeImage.parentNode && activeImage.parentNode.tagName === 'FIGURE') {
                    btnCaption.style.backgroundColor = '#e2e8f0';
                } else {
                    btnCaption.style.backgroundColor = 'transparent';
                }
            }
        }
        updateOverlayPosition();
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
        if (imageToolbar) {
            imageToolbar.style.display = 'none';
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

        if (imageToolbar && activeImage) {
            // Position toolbar below the image
            const tbRect = imageToolbar.getBoundingClientRect();
            let tTop = top + imgRect.height + 10;
            let tLeft = left + (imgRect.width / 2) - (tbRect.width / 2);
            
            // Boundary checks for toolbar
            if (tTop + tbRect.height > wsRect.height + workspace.scrollTop) {
                tTop = top - tbRect.height - 10; // place above if no space below
            }
            if (tLeft < 0) tLeft = 10;
            
            imageToolbar.style.top = `${tTop}px`;
            imageToolbar.style.left = `${tLeft}px`;
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

    function el(tag) { return document.createElement(tag); }
    function setS(element, styles) { Object.assign(element.style, styles); }

    function addToolbarBtn(parent, iconClass, title, dataTool) {
        const btn = el('button');
        btn.type = 'button';
        btn.title = title;
        if (dataTool) btn.setAttribute('data-tool', dataTool);
        setS(btn, {
            display:'flex', alignItems:'center', justifyContent:'center',
            width:'28px', height:'28px', border:'none', background:'transparent',
            borderRadius:'4px', cursor:'pointer', color:'#374151', fontSize:'14px'
        });
        btn.innerHTML = `<i class="${iconClass}"></i>`;
        btn.addEventListener('mouseover', () => btn.style.backgroundColor = '#e2e8f0');
        btn.addEventListener('mouseout', () => {
            if (btn.getAttribute('data-tool') === 'caption' && activeImage && activeImage.parentNode && activeImage.parentNode.tagName === 'FIGURE') {
                btn.style.backgroundColor = '#e2e8f0';
            } else {
                btn.style.backgroundColor = 'transparent';
            }
        });
        parent.appendChild(btn);
        return btn;
    }

    function addSep(parent) {
        const sep = el('div');
        setS(sep, { width:'1px', height:'16px', backgroundColor:'#d1d5db', margin:'0 2px' });
        parent.appendChild(sep);
    }

    function buildImageToolbar() {
        if (document.getElementById('image-toolbar')) return;

        imageToolbar = el('div');
        imageToolbar.id = 'image-toolbar';
        setS(imageToolbar, {
            display:'none', position:'absolute', zIndex:'99999',
            background:'#ffffff', border:'1px solid #d1d5db',
            boxShadow:'0 4px 12px rgba(0,0,0,0.1)', borderRadius:'6px',
            padding:'4px', alignItems:'center', gap:'2px',
            userSelect:'none', fontFamily:'system-ui,sans-serif'
        });
        imageToolbar.addEventListener('mousedown', e => e.preventDefault());

        // 1. Caption Toggle
        const btnCaption = addToolbarBtn(imageToolbar, 'fa-solid fa-closed-captioning', 'Açıklama Ekle/Kaldır', 'caption');
        btnCaption.addEventListener('click', () => {
            if (!activeImage) return;
            const parent = activeImage.parentNode;
            if (parent && parent.tagName === 'FIGURE') {
                // Remove caption
                parent.replaceWith(activeImage);
                btnCaption.style.backgroundColor = 'transparent';
            } else {
                // Add caption
                const figure = el('figure');
                figure.className = 'editor-image-figure';
                figure.setAttribute('contenteditable', 'false');
                activeImage.replaceWith(figure);
                figure.appendChild(activeImage);
                const figcaption = el('figcaption');
                figcaption.className = 'editor-image-caption';
                figcaption.setAttribute('contenteditable', 'true');
                figure.appendChild(figcaption);
                btnCaption.style.backgroundColor = '#e2e8f0';
                figcaption.focus();
            }
            updateOverlayPosition();
        });



        addSep(imageToolbar);

        // 2. Inline / Align
        const inlineWrapper = el('div');
        setS(inlineWrapper, { position: 'relative', display: 'flex', alignItems: 'center' });
        
        // Main inline button
        const btnInline = addToolbarBtn(inlineWrapper, 'fa-solid fa-text-width', 'Satır İçi (Inline)');
        btnInline.addEventListener('click', () => {
            if (!activeImage) return;
            const target = activeImage.parentNode.tagName === 'FIGURE' ? activeImage.parentNode : activeImage;
            target.className = target.tagName === 'FIGURE' ? 'editor-image-figure img-inline' : 'editor-image img-inline';
            updateOverlayPosition();
        });
        
        // Dropdown toggle for alignment
        const btnInlineMenu = el('button');
        btnInlineMenu.type = 'button';
        btnInlineMenu.innerHTML = `<i class="fa-solid fa-caret-down"></i>`;
        setS(btnInlineMenu, {
            display:'flex', alignItems:'center', justifyContent:'center',
            width:'16px', height:'28px', border:'none', background:'transparent',
            cursor:'pointer', color:'#374151', fontSize:'12px', marginLeft:'-2px'
        });
        btnInlineMenu.addEventListener('mouseover', () => btnInlineMenu.style.backgroundColor = '#e2e8f0');
        btnInlineMenu.addEventListener('mouseout', () => btnInlineMenu.style.backgroundColor = 'transparent');
        inlineWrapper.appendChild(btnInlineMenu);
        
        const inlineDropdown = el('div');
        setS(inlineDropdown, {
            display: 'none', position: 'absolute', top: '100%', left: '0',
            background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '4px', minWidth: '120px', zIndex: '1000'
        });
        
        ['Sola Yasla', 'Ortala', 'Sağa Yasla'].forEach((lbl, i) => {
            const item = el('div');
            setS(item, { padding:'4px 8px', fontSize:'13px', cursor:'pointer', color:'#374151', borderRadius:'3px' });
            item.textContent = lbl;
            item.addEventListener('mouseover', () => item.style.background = '#f3f4f6');
            item.addEventListener('mouseout', () => item.style.background = 'transparent');
            item.addEventListener('click', () => {
                if (!activeImage) return;
                const target = activeImage.parentNode.tagName === 'FIGURE' ? activeImage.parentNode : activeImage;
                target.className = target.tagName === 'FIGURE' ? 'editor-image-figure' : 'editor-image';
                const cls = i === 0 ? 'img-break-left' : (i === 1 ? 'img-break-center' : 'img-break-right');
                target.classList.add(cls);
                inlineDropdown.style.display = 'none';
                updateOverlayPosition();
            });
            inlineDropdown.appendChild(item);
        });
        inlineWrapper.appendChild(inlineDropdown);
        btnInlineMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            inlineDropdown.style.display = inlineDropdown.style.display === 'none' ? 'block' : 'none';
            wrapDropdown.style.display = 'none';
            const resizeDropdown = imageToolbar.querySelector('.resize-dropdown-menu');
            if (resizeDropdown) resizeDropdown.style.display = 'none';
        });
        imageToolbar.appendChild(inlineWrapper);

        // 3. Wrap Text
        const wrapWrapper = el('div');
        setS(wrapWrapper, { position: 'relative', display: 'flex', alignItems: 'center' });
        
        const btnWrap = addToolbarBtn(wrapWrapper, 'fa-solid fa-indent', 'Metni Kaydır (Wrap)');
        btnWrap.addEventListener('click', () => {
            if (!activeImage) return;
            const target = activeImage.parentNode.tagName === 'FIGURE' ? activeImage.parentNode : activeImage;
            target.className = target.tagName === 'FIGURE' ? 'editor-image-figure' : 'editor-image';
            target.classList.add('img-wrap-left'); // default
            updateOverlayPosition();
        });

        const btnWrapMenu = el('button');
        btnWrapMenu.type = 'button';
        btnWrapMenu.innerHTML = `<i class="fa-solid fa-caret-down"></i>`;
        setS(btnWrapMenu, {
            display:'flex', alignItems:'center', justifyContent:'center',
            width:'16px', height:'28px', border:'none', background:'transparent',
            cursor:'pointer', color:'#374151', fontSize:'12px', marginLeft:'-2px'
        });
        btnWrapMenu.addEventListener('mouseover', () => btnWrapMenu.style.backgroundColor = '#e2e8f0');
        btnWrapMenu.addEventListener('mouseout', () => btnWrapMenu.style.backgroundColor = 'transparent');
        wrapWrapper.appendChild(btnWrapMenu);
        
        const wrapDropdown = el('div');
        setS(wrapDropdown, {
            display: 'none', position: 'absolute', top: '100%', left: '0',
            background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '4px', minWidth: '120px', zIndex: '1000'
        });
        
        ['Sola Kaydır', 'Sağa Kaydır'].forEach((lbl, i) => {
            const item = el('div');
            setS(item, { padding:'4px 8px', fontSize:'13px', cursor:'pointer', color:'#374151', borderRadius:'3px' });
            item.textContent = lbl;
            item.addEventListener('mouseover', () => item.style.background = '#f3f4f6');
            item.addEventListener('mouseout', () => item.style.background = 'transparent');
            item.addEventListener('click', () => {
                if (!activeImage) return;
                const target = activeImage.parentNode.tagName === 'FIGURE' ? activeImage.parentNode : activeImage;
                target.className = target.tagName === 'FIGURE' ? 'editor-image-figure' : 'editor-image';
                target.classList.add(i === 0 ? 'img-wrap-left' : 'img-wrap-right');
                wrapDropdown.style.display = 'none';
                updateOverlayPosition();
            });
            wrapDropdown.appendChild(item);
        });
        wrapWrapper.appendChild(wrapDropdown);
        btnWrapMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapDropdown.style.display = wrapDropdown.style.display === 'none' ? 'block' : 'none';
            inlineDropdown.style.display = 'none';
            const resizeDropdown = imageToolbar.querySelector('.resize-dropdown-menu');
            if (resizeDropdown) resizeDropdown.style.display = 'none';
        });
        imageToolbar.appendChild(wrapWrapper);
        
        addSep(imageToolbar);

        // 6. Resize
        const resizeWrapper = el('div');
        setS(resizeWrapper, { position: 'relative' });
        
        const btnResize = el('button');
        btnResize.type = 'button';
        btnResize.title = 'Boyutlandır';
        btnResize.innerHTML = `Original <i class="fa-solid fa-chevron-down" style="font-size:10px; margin-left:4px;"></i>`;
        setS(btnResize, {
            display:'flex', alignItems:'center', border:'none', background:'transparent',
            padding:'0 6px', height:'28px', borderRadius:'4px', cursor:'pointer',
            fontSize:'13px', color:'#374151', whiteSpace:'nowrap'
        });
        btnResize.addEventListener('mouseover', () => btnResize.style.background = '#e2e8f0');
        btnResize.addEventListener('mouseout', () => btnResize.style.background = 'transparent');
        
        const resizeDropdown = el('div');
        setS(resizeDropdown, {
            display: 'none', position: 'absolute', top: '100%', left: '0',
            background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: '4px', minWidth: '100px', zIndex: '1000'
        });

        const resizeOpts = [
            { lbl: 'Original', scale: 1 },
            { lbl: '%75', scale: 0.75 },
            { lbl: '%50', scale: 0.50 },
            { lbl: '%25', scale: 0.25 },
            { lbl: 'Custom %', scale: 'custom' }
        ];

        resizeOpts.forEach(opt => {
            const item = el('div');
            setS(item, { padding:'4px 8px', fontSize:'13px', cursor:'pointer', color:'#374151', borderRadius:'3px' });
            item.textContent = opt.lbl;
            item.addEventListener('mouseover', () => item.style.background = '#f3f4f6');
            item.addEventListener('mouseout', () => item.style.background = 'transparent');
            item.addEventListener('click', () => {
                if (!activeImage) return;
                let scale = opt.scale;
                if (scale === 'custom') {
                    const input = prompt('Özel oran girin (ör: 55):', '55');
                    if (!input || isNaN(input)) return;
                    scale = Math.max(1, Math.min(200, parseInt(input))) / 100;
                }
                const nw = activeImage.naturalWidth || 800;
                const newWidth = Math.round(nw * scale);
                activeImage.style.width = newWidth + 'px';
                activeImage.style.height = 'auto';
                if (activeImage.parentNode.tagName === 'FIGURE') {
                    activeImage.parentNode.style.width = newWidth + 'px';
                }
                resizeDropdown.style.display = 'none';
                updateOverlayPosition();
            });
            resizeDropdown.appendChild(item);
        });
        
        resizeWrapper.appendChild(btnResize);
        resizeWrapper.appendChild(resizeDropdown);
        btnResize.addEventListener('click', (e) => {
            e.stopPropagation();
            resizeDropdown.style.display = resizeDropdown.style.display === 'none' ? 'block' : 'none';
        });
        imageToolbar.appendChild(resizeWrapper);

        // 7. Edit Image (Dummy)
        const btnEdit = addToolbarBtn(imageToolbar, 'fa-solid fa-pen', 'Görseli Düzenle');
        btnEdit.addEventListener('click', () => {
            // Dummy button for future edit logic
            console.log('Edit Image Clicked');
        });

        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            if (typeof wrapDropdown !== 'undefined') wrapDropdown.style.display = 'none';
            if (typeof inlineDropdown !== 'undefined') inlineDropdown.style.display = 'none';
            if (typeof resizeDropdown !== 'undefined') resizeDropdown.style.display = 'none';
        });

        const workspace = document.getElementById('editor-workspace');
        if (workspace) {
            workspace.appendChild(imageToolbar);
        } else {
            document.body.appendChild(imageToolbar);
        }
    }

    return {
        init,
        insertImage,
        selectImage,
        clearImageSelection
    };
})();
