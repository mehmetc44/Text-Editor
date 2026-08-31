/**
 * Meditör - Word ve HTML Yapıştırma Temizleyici (Word Sanitizer)
 * MS Word'den kopyalanan metinlerin renklerini, vurgularını, fontlarını ve yapısını koruyarak temizler.
 */

export function sanitizeWordHtml(htmlString) {
    if (!htmlString || typeof htmlString !== 'string') return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const allowedTags = new Set([
        'P', 'DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
        'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
        'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
        'A', 'IMG', 'BR', 'HR', 'SUB', 'SUP', 'BLOCKQUOTE', 'PRE', 'CODE'
    ]);

    const allowedStyles = new Set([
        'color', 'background-color', 'font-family', 'font-size',
        'font-weight', 'font-style', 'text-decoration', 'text-align'
    ]);

    function cleanNode(node) {
        const children = Array.from(node.childNodes);
        for (const child of children) {
            if (child.nodeType === Node.COMMENT_NODE) {
                child.remove();
                continue;
            }

            if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toUpperCase();

                if (tagName.startsWith('O:') || tagName.startsWith('V:') || tagName.startsWith('W:')) {
                    child.remove();
                    continue;
                }

                if (!allowedTags.has(tagName)) {
                    while (child.firstChild) {
                        node.insertBefore(child.firstChild, child);
                    }
                    child.remove();
                    continue;
                }

                const originalStyle = child.getAttribute('style') || '';
                const classAttr = child.getAttribute('class') || '';

                const attributes = Array.from(child.attributes);
                for (const attr of attributes) {
                    if (attr.name !== 'src' && attr.name !== 'alt' && attr.name !== 'href') {
                        child.removeAttribute(attr.name);
                    }
                }

                const preservedStyles = [];
                if (originalStyle) {
                    const declarations = originalStyle.split(';');
                    for (const decl of declarations) {
                        const [prop, val] = decl.split(':').map(s => s ? s.trim() : '');
                        if (prop && val && allowedStyles.has(prop.toLowerCase())) {
                            preservedStyles.push(`${prop.toLowerCase()}: ${val}`);
                        }
                    }
                }

                if (classAttr.includes('mso-highlight')) {
                    preservedStyles.push('background-color: #fef08a');
                }

                if (preservedStyles.length > 0) {
                    child.setAttribute('style', preservedStyles.join('; '));
                }

                cleanNode(child);
            }
        }
    }

    cleanNode(doc.body);
    return doc.body.innerHTML;
}
