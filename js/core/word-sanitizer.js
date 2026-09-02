/**
 * Core Word Sanitizer & Paste Filter Engine
 * Cleans incoming HTML from MS Word / Office formatting artifacts while preserving colors, cell shading, table layouts, image sizes & shapes.
 */

window.WordSanitizer = (function () {
    const ALLOWED_TAGS = new Set([
        'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
        'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
        'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE',
        'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
        'A', 'IMG', 'SPAN', 'DIV', 'SUB', 'SUP',
        'FONT', 'CENTER', 'HR', 'MARK', 'DEL', 'INS', 'FIGURE', 'FIGCAPTION'
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

                // FONT etiketini SPAN etiketine dönüştürerek renkleri ve font boyutu bilgilerini %100 koru
                if (tagName === 'FONT') {
                    const span = document.createElement('span');
                    if (child.hasAttribute('color')) span.style.color = child.getAttribute('color');
                    if (child.hasAttribute('face')) span.style.fontFamily = child.getAttribute('face');
                    if (child.hasAttribute('size')) {
                        const sizeMap = { '1': '10px', '2': '12px', '3': '14px', '4': '16px', '5': '18px', '6': '24px', '7': '36px' };
                        span.style.fontSize = sizeMap[child.getAttribute('size')] || '14px';
                    }
                    if (child.hasAttribute('style')) span.setAttribute('style', child.getAttribute('style'));

                    while (child.firstChild) span.appendChild(child.firstChild);
                    node.replaceChild(span, child);
                    cleanNode(span);
                    continue;
                }

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
                    // word-page-break sınıfını koru — sayfa kırılma ayrıştırmasında kullanılacak
                    if (className.includes('word-page-break')) {
                        // Page break div'ini olduğu gibi bırak
                    } else if (className.includes('Mso') || className.includes('w:')) {
                        child.removeAttribute('class');
                    }
                }

                // Inline Stilleri Güvenli Şekilde Normalleştir (Renkler, Arkaplanlar ve Şekiller Muhafaza Edilir)
                if (child.hasAttribute('style')) {
                    normalizeElementStyle(child, tagName);
                }

                // Tabloları Normalleştir ama Word Hücre Renklerini ve Çerçevelerini Koru
                if (tagName === 'TABLE') {
                    const styleAttr = child.getAttribute('style') || '';
                    const borderAttr = child.getAttribute('border');
                    const hasNoBorder = borderAttr === '0' ||
                        styleAttr.includes('border: none') ||
                        styleAttr.includes('border:none') ||
                        styleAttr.includes('border-style: none') ||
                        (child.style.border && (child.style.border.includes('none') || child.style.border === '0px'));

                    if (hasNoBorder) {
                        child.classList.add('editor-table-borderless');
                    } else {
                        child.classList.add('editor-table');
                    }

                    if (!child.style.width) child.style.width = '100%';
                    child.style.maxWidth = '100%';
                    child.style.margin = '12px 0';
                    child.style.borderCollapse = 'collapse';

                    // Hücre Renklerini ve Stillerini Koruyarak Taşmayı Önle
                    child.querySelectorAll('td, th').forEach(cell => {
                        cell.style.maxWidth = '100%';
                        cell.style.wordBreak = 'break-word';
                        cell.style.overflowWrap = 'break-word';

                        // Word Hücre Arkaplan Rengi (bgcolor özniteliği veya inline arkaplan) Varsa Korunur
                        if (cell.getAttribute('bgcolor')) {
                            cell.style.backgroundColor = cell.getAttribute('bgcolor');
                        }
                    });
                }

                // Görsel Boyutlarını, Şekillerini (Border-Radius, Çerçeve) ve Oranlarını Koru
                if (tagName === 'IMG') {
                    child.classList.add('editor-image');
                    child.style.maxWidth = '100%';

                    // Orijinal genişlik/yükseklik öznitelikleri veya stiller varsa muhafaza et
                    if (child.hasAttribute('width') && !child.style.width) {
                        const w = child.getAttribute('width');
                        child.style.width = (w.endsWith('%') || w.endsWith('px')) ? w : `${w}px`;
                    }
                    if (child.hasAttribute('height') && !child.style.height) {
                        const h = child.getAttribute('height');
                        child.style.height = (h.endsWith('%') || h.endsWith('px')) ? h : `${h}px`;
                    }

                    if (!child.style.height && !child.hasAttribute('height')) {
                        child.style.height = 'auto';
                    }
                    child.style.display = 'inline-block';
                    child.style.verticalAlign = 'middle';

                    // Çakışmayı önlemek için kaydırıcı float/position değerlerini temizle
                    if (child.style.float) child.style.float = 'none';
                    if (child.style.position === 'absolute' || child.style.position === 'fixed') {
                        child.style.position = 'static';
                    }
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
