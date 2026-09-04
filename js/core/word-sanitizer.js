/**
 * Core Word Sanitizer & Paste Filter Engine
 * Allows native browser paste (which preserves MS Word fonts, colors, and types perfectly)
 * but performs a post-paste cleanup to prevent absolute positioning and negative margins from breaking the A4 layout.
 */

window.WordSanitizer = (function () {
    
    function sanitizeDocument(pagesContainer) {
        if (!pagesContainer) return;
        
        const allElements = pagesContainer.querySelectorAll('*');
        
        allElements.forEach(el => {
            if (el.nodeType !== Node.ELEMENT_NODE) return;
            
            const style = el.style;
            if (!style) return;

            // Remove absolute/fixed positioning that breaks A4 layout
            if (style.position === 'absolute' || style.position === 'fixed') {
                style.position = 'static';
            }

            // Remove negative margins that push text out of the page
            if (style.marginLeft && style.marginLeft.startsWith('-')) {
                style.marginLeft = '0px';
            }
            if (style.marginTop && style.marginTop.startsWith('-')) {
                style.marginTop = '0px';
            }
            if (style.marginRight && style.marginRight.startsWith('-')) {
                style.marginRight = '0px';
            }

            // Cap absolute widths to 100%
            if (style.width && parseInt(style.width) > 634) {
                style.width = '100%';
            }
            
            // Fix tables
            if (el.tagName === 'TABLE') {
                if (!el.classList.contains('editor-table') && !el.classList.contains('editor-table-borderless')) {
                    const borderAttr = el.getAttribute('border');
                    const hasNoBorder = borderAttr === '0' ||
                        (el.getAttribute('style') || '').includes('border: none') ||
                        (el.style.border && (el.style.border.includes('none') || el.style.border === '0px'));
                        
                    if (hasNoBorder) el.classList.add('editor-table-borderless');
                    else el.classList.add('editor-table');
                }
                
                if (!style.width) style.width = '100%';
                style.maxWidth = '100%';
                style.borderCollapse = 'collapse';
                
                el.querySelectorAll('td, th').forEach(cell => {
                    cell.style.maxWidth = '100%';
                    cell.style.wordBreak = 'break-word';
                    cell.style.overflowWrap = 'break-word';
                });
            }
            
            // Fix images
            if (el.tagName === 'IMG') {
                if (!el.classList.contains('editor-image')) {
                    el.classList.add('editor-image');
                }
                style.maxWidth = '100%';
                if (!style.height && !el.hasAttribute('height')) {
                    style.height = 'auto';
                }
                if (style.float) style.float = 'none';
            }
        });
    }

    function bindPasteEvent(editor, onUpdateStats) {
        // We bind to the document or pages container to catch paste on any page
        document.addEventListener('paste', (e) => {
            // Wait for native paste to finish injecting DOM nodes
            setTimeout(() => {
                const pagesContainer = document.getElementById('pages-container');
                if (pagesContainer) {
                    sanitizeDocument(pagesContainer);
                }
                if (typeof onUpdateStats === 'function') onUpdateStats();
                
                // Force a checkAndFlow if PaginationManager exists
                if (window.PaginationManager && window.PaginationManager.updatePages) {
                    window.PaginationManager.updatePages();
                }
            }, 50);
        });
    }

    return {
        bindPasteEvent,
        sanitizeDocument
    };
})();
