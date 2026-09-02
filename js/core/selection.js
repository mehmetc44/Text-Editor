/**
 * Core Selection & Inline Styling Engine
 * Handles execCommand wrapper and advanced inline style manipulation with ancestor span unwrapping.
 */

window.EditorSelection = (function () {
    function exec(command, value = null) {
        try {
            document.execCommand(command, false, value);
        } catch (err) {
            console.warn('execCommand hatası:', command, err);
        }
    }

    function applyInlineStyle(styleName, styleValue) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (range.collapsed) return;

        const editor = document.getElementById('editor');

        try {
            const extracted = range.extractContents();

            // 1. Çıkarılan fragment içindeki iç içe geçmiş aynı stili taşıyan span'ları düzleştir
            extracted.querySelectorAll('span, font').forEach(s => {
                if (s.style && s.style[styleName]) {
                    s.style[styleName] = '';
                }
                if (s.tagName === 'FONT') {
                    s.removeAttribute('size');
                }
                const styleAttr = s.getAttribute('style');
                if ((!styleAttr || styleAttr.trim() === '') && s.tagName !== 'FONT') {
                    while (s.firstChild) s.parentNode.insertBefore(s.firstChild, s);
                    s.remove();
                }
            });

            // 2. Yeni temiz span oluştur
            const span = document.createElement('span');
            span.style[styleName] = styleValue;
            span.appendChild(extracted);
            range.insertNode(span);

            // 3. ATA (ancestor) span'ları kontrol et ve parçala (split)
            let ancestor = span.parentNode;
            while (ancestor && ancestor !== editor) {
                if (ancestor.nodeType === Node.ELEMENT_NODE &&
                    ancestor.tagName === 'SPAN' &&
                    ancestor.style[styleName]) {

                    const before = document.createDocumentFragment();
                    const after = document.createDocumentFragment();
                    let foundSelf = false;

                    while (ancestor.firstChild) {
                        const child = ancestor.firstChild;
                        if (child === span) {
                            foundSelf = true;
                            ancestor.removeChild(child);
                            continue;
                        }
                        if (!foundSelf) {
                            before.appendChild(child);
                        } else {
                            after.appendChild(child);
                        }
                    }

                    const parent = ancestor.parentNode;

                    if (before.childNodes.length > 0) {
                        const beforeClone = ancestor.cloneNode(false);
                        beforeClone.appendChild(before);
                        parent.insertBefore(beforeClone, ancestor);
                    }

                    parent.insertBefore(span, ancestor);

                    if (after.childNodes.length > 0) {
                        const afterClone = ancestor.cloneNode(false);
                        afterClone.appendChild(after);
                        parent.insertBefore(afterClone, ancestor);
                    }

                    parent.removeChild(ancestor);
                    break;
                }
                ancestor = ancestor.parentNode;
            }

            // 4. Boş span etiketlerini temizle
            if (editor) {
                editor.querySelectorAll('span:empty, font:empty').forEach(el => el.remove());
            }

            // 5. Seçimi yeni span üzerine geri koy
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.addRange(newRange);
        } catch (e) {
            console.warn('Style uygulama hatası:', e);
        }
    }

    return {
        exec,
        applyInlineStyle
    };
})();
