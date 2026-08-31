/**
 * Meditör Core - Word & HTML Kopyala-Yapıştır Temizleyicisi (Word Sanitizer)
 * Microsoft Word, Excel veya dış web sitelerinden kopyalanan HTML içeriklerindeki 'mso-*'
 * çöplerini ve zararlı scriptleri temizler, hijyenik HTML formatını korur.
 * 
 * Mülakat Notu: paste olayı e.clipboardData.getData('text/html') ile yakalanır.
 * DOMParser ile bellek içinde parse edilir ve sadece izin verilen etiketler korunur.
 */

// İzin verilen güvenli HTML etiketleri listesi
const ALLOWED_TAGS = new Set([
    'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
    'A', 'IMG', 'SPAN', 'DIV'
]);

/**
 * Word HTML metnini temizler ve hijyenik HTML dizesi döndürür
 * @param {string} htmlContent 
 * @returns {string}
 */
export function sanitizeWordHtml(htmlContent) {
    if (!htmlContent) return '';

    // DOMParser ile HTML dizesini sanal bir DOM ağacına dönüştür
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // MS Word yorumlarını ve VML öğelerini sil <!-- ... -->
    cleanNode(doc.body);

    return doc.body.innerHTML;
}

/**
 * Özyinelemeli (Recursive) DOM temizleme fonksiyonu
 * @param {Node} node 
 */
function cleanNode(node) {
    const children = Array.from(node.childNodes);

    for (const child of children) {
        if (child.nodeType === Node.COMMENT_NODE) {
            // Yorum satırını (Word XML çöpleri) sil
            child.remove();
            continue;
        }

        if (child.nodeType === Node.ELEMENT_NODE) {
            const tagName = child.tagName.toUpperCase();

            // Word'ün <o:p>, <v:shape>, <w:word> vb. özel etiketlerini temizle
            if (tagName.includes(':') || !ALLOWED_TAGS.has(tagName)) {
                // İzin verilmeyen etiketin çocuklarını bir üst ebeveyne aktar veya tamamen sil
                if (child.hasChildNodes()) {
                    while (child.firstChild) {
                        node.insertBefore(child.firstChild, child);
                    }
                }
                child.remove();
                continue;
            }

            // Word CSS sınıflarını (class="MsoNormal", class="MsoListParagraph") temizle
            if (child.hasAttribute('class')) {
                const className = child.getAttribute('class');
                if (className.includes('Mso') || className.includes('w:')) {
                    child.removeAttribute('class');
                }
            }

            // Inline stillerdeki mso-* özniteliklerini temizle
            if (child.hasAttribute('style')) {
                let style = child.getAttribute('style');
                // mso- ile başlayan tüm CSS kurallarını sil
                style = style.replace(/mso-[^;]+;?/gi, '');
                style = style.replace(/margin:[^;]+;?/gi, '');
                
                if (style.trim()) {
                    child.setAttribute('style', style.trim());
                } else {
                    child.removeAttribute('style');
                }
            }

            // İç elemanları temizlemeye devam et
            cleanNode(child);
        }
    }
}

/**
 * Editörün paste olayını dinleyip temizleme işlemini uygular
 * @param {HTMLElement} editor 
 * @param {ClipboardEvent} e 
 */
export function handlePaste(editor, e) {
    if (!e.clipboardData) return;

    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html && html.trim().length > 0) {
        e.preventDefault();
        e.stopPropagation();

        const cleanHtml = sanitizeWordHtml(html);
        document.execCommand('insertHTML', false, cleanHtml);
    } else if (text && text.trim().length > 0) {
        // Düz metin yapıştırma
        e.preventDefault();
        e.stopPropagation();
        
        // Satır başlarını <p> veya <br> yap
        const paragraphs = text.split(/\r?\n/).map(p => p.trim() ? `<p>${p}</p>` : '').join('');
        document.execCommand('insertHTML', false, paragraphs || text);
    }
}
