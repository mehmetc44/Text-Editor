/**
 * Core Word Sanitizer & Paste Filter Engine
 * Cleans incoming HTML from MS Word / Office formatting artifacts while preserving essential styles.
 */

window.WordSanitizer = (function () {
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

                if (tagName.includes(':') || !ALLOWED_TAGS.has(tagName)) {
                    if (child.hasChildNodes()) {
                        while (child.firstChild) {
                            node.insertBefore(child.firstChild, child);
                        }
                    }
                    child.remove();
                    continue;
                }

                if (child.hasAttribute('class')) {
                    const className = child.getAttribute('class') || '';
                    if (className.includes('Mso') || className.includes('w:')) {
                        child.removeAttribute('class');
                    }
                }

                // Word'den gelen kaydırıcı inline stilleri temizle ve normalleştir
                if (child.hasAttribute('style')) {
                    normalizeElementStyle(child, tagName);
                }

                // Tabloları A4 kağıt genişliğine sığacak şekilde normalleştir
                if (tagName === 'TABLE') {
                    child.classList.add('editor-table');
                    child.style.width = '100%';
                    child.style.maxWidth = '100%';
                    child.style.margin = '12px 0';
                    child.style.borderCollapse = 'collapse';
                }

                // Görselleri A4 kağıt sınırına kenetle
                if (tagName === 'IMG') {
                    child.classList.add('editor-image');
                    child.style.maxWidth = '100%';
                    child.style.height = 'auto';
                    child.style.display = 'inline-block';
                }

                cleanNode(child);
            }
        }
    }

    function normalizeElementStyle(el, tagName) {
        const style = el.style;

        // Sayfadan fırlamaya neden olan mutlak konumlandırmaları kaldır
        if (style.position === 'absolute' || style.position === 'fixed') {
            style.position = 'static';
        }

        // Metinleri kağıt dışına iten negatif marjinleri sıfırla
        if (style.marginLeft && style.marginLeft.startsWith('-')) {
            style.marginLeft = '0px';
        }
        if (style.marginTop && style.marginTop.startsWith('-')) {
            style.marginTop = '0px';
        }
        if (style.marginRight && style.marginRight.startsWith('-')) {
            style.marginRight = '0px';
        }

        // Kağıdı aşan sabit piksel genişliklerini %100 yap
        if (style.width && parseInt(style.width) > 634) {
            style.width = '100%';
        }
        style.maxWidth = '100%';

        // Paragraf satır yüksekliğini düzelt
        if (tagName === 'P' || tagName === 'DIV') {
            style.lineHeight = '1.25';
        }
    }

    function bindPasteEvent(editor, onUpdateStats) {
        if (!editor) return;
        editor.addEventListener('paste', (e) => {
            const html = e.clipboardData.getData('text/html');
            const text = e.clipboardData.getData('text/plain');

            if (html && html.trim().length > 0) {
                e.preventDefault();
                e.stopPropagation();
                const cleanHtml = sanitizeWordHtml(html);
                window.EditorSelection.exec('insertHTML', cleanHtml);
                if (typeof onUpdateStats === 'function') onUpdateStats();
            } else if (text && text.trim().length > 0) {
                e.preventDefault();
                e.stopPropagation();
                const paragraphs = text.split(/\r?\n/).map(p => p.trim() ? `<p>${p}</p>` : '').join('');
                window.EditorSelection.exec('insertHTML', paragraphs || text);
                if (typeof onUpdateStats === 'function') onUpdateStats();
            }
        });
    }

    return {
        sanitizeWordHtml,
        bindPasteEvent
    };
})();
