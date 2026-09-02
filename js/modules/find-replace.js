/**
 * Find & Replace Engine (Bul ve Değiştir)
 * Performs case-insensitive or case-sensitive search & replace across all page cards in the document.
 */

window.FindReplaceManager = (function () {
    let currentMatchIndex = -1;
    let matches = [];

    /**
     * Tüm sayfadaki metin içinde arama yapar.
     * @param {string} query - Aranan kelime
     * @param {boolean} matchCase - Büyük/küçük harf duyarlı mı? (Varsayılan: false)
     * @returns {number} Bulunan eşleşme sayısı
     */
    function findMatches(query, matchCase = false) {
        matches = [];
        currentMatchIndex = -1;

        if (!query || query.trim() === '') {
            return 0;
        }

        const pagesContainer = document.getElementById('pages-container');
        const containers = pagesContainer
            ? Array.from(pagesContainer.querySelectorAll('.page-content, #editor'))
            : [document.getElementById('editor')].filter(Boolean);

        const flag = matchCase ? 'g' : 'gi';
        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapeRegExp(query), flag);

        containers.forEach(container => {
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while ((node = walker.nextNode())) {
                const text = node.nodeValue;
                let match;
                regex.lastIndex = 0;
                while ((match = regex.exec(text)) !== null) {
                    matches.push({
                        node: node,
                        index: match.index,
                        length: match[0].length,
                        matchedText: match[0]
                    });
                }
            }
        });

        if (matches.length > 0) {
            currentMatchIndex = 0;
            highlightMatch(matches[0]);
        }

        return matches.length;
    }

    /**
     * Seçili eşleşmeyi vurgular ve görünen alana kaydırır.
     */
    function highlightMatch(matchObj) {
        if (!matchObj || !matchObj.node || !matchObj.node.parentNode) return;

        const selection = window.getSelection();
        const range = document.createRange();

        try {
            range.setStart(matchObj.node, matchObj.index);
            range.setEnd(matchObj.node, matchObj.index + matchObj.length);
            selection.removeAllRanges();
            selection.addRange(range);

            const parentEl = matchObj.node.parentNode;
            if (parentEl && parentEl.scrollIntoView) {
                parentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (e) {
            console.warn('Eşleşme vurgulama hatası:', e);
        }
    }

    /**
     * Sonraki eşleşmeye geçer.
     */
    function findNext(query, matchCase = false) {
        if (matches.length === 0 || query !== lastQuery) {
            lastQuery = query;
            return findMatches(query, matchCase);
        }

        currentMatchIndex = (currentMatchIndex + 1) % matches.length;
        highlightMatch(matches[currentMatchIndex]);
        return matches.length;
    }

    let lastQuery = '';

    /**
     * Mevcut aktif eşleşmeyi değiştirir.
     */
    function replaceOne(query, replacement, matchCase = false) {
        if (!query) return 0;

        if (matches.length === 0 || currentMatchIndex < 0 || currentMatchIndex >= matches.length) {
            findMatches(query, matchCase);
        }

        if (matches.length === 0 || currentMatchIndex < 0) return 0;

        const match = matches[currentMatchIndex];
        const node = match.node;
        const text = node.nodeValue;

        const before = text.substring(0, match.index);
        const after = text.substring(match.index + match.length);
        node.nodeValue = before + replacement + after;

        if (window.FileManager) {
            window.FileManager.updateStats();
        }

        // Tekrar tara ve bir sonrakine geç
        findMatches(query, matchCase);
        return 1;
    }

    /**
     * Tüm dokümandaki eşleşmeleri büyük/küçük harf fark etmeksizin değiştirir.
     * @param {string} query - Aranan kelime
     * @param {string} replacement - Yerine konacak kelime
     * @param {boolean} matchCase - Harf duyarlı mı? (false = harf fark etmeksizin)
     * @returns {number} Değiştirilen toplam kelime sayısı
     */
    function replaceAll(query, replacement, matchCase = false) {
        if (!query) return 0;

        const pagesContainer = document.getElementById('pages-container');
        const containers = pagesContainer
            ? Array.from(pagesContainer.querySelectorAll('.page-content, #editor'))
            : [document.getElementById('editor')].filter(Boolean);

        const flag = matchCase ? 'g' : 'gi';
        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapeRegExp(query), flag);

        let count = 0;

        containers.forEach(container => {
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
            const textNodes = [];
            let node;
            while ((node = walker.nextNode())) {
                textNodes.push(node);
            }

            textNodes.forEach(tNode => {
                if (regex.test(tNode.nodeValue)) {
                    const matchesInNode = tNode.nodeValue.match(regex);
                    if (matchesInNode) {
                        count += matchesInNode.length;
                    }
                    tNode.nodeValue = tNode.nodeValue.replace(regex, replacement);
                }
            });
        });

        matches = [];
        currentMatchIndex = -1;

        if (window.FileManager) {
            window.FileManager.updateStats();
        }

        return count;
    }

    function init() {
        const modal = document.getElementById('modal-find-replace');
        const inputFind = document.getElementById('input-find-text');
        const inputReplace = document.getElementById('input-replace-text');
        const chkMatchCase = document.getElementById('chk-match-case');
        const btnFind = document.getElementById('btn-find-next');
        const btnReplace = document.getElementById('btn-replace-one');
        const btnReplaceAll = document.getElementById('btn-replace-all');
        const statusText = document.getElementById('find-status-text');

        function openModal() {
            if (modal) {
                modal.classList.remove('hidden');
                if (inputFind) {
                    inputFind.focus();
                    inputFind.select();
                }
            }
        }

        function closeModal() {
            if (modal) modal.classList.add('hidden');
        }

        // Menu item click
        document.getElementById('menu-edit-find-replace')?.addEventListener('click', openModal);

        // Close modal buttons
        modal?.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // Ctrl+F / Ctrl+H Kısayolu
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'h')) {
                e.preventDefault();
                openModal();
            }
        });

        // Bul Butonu
        btnFind?.addEventListener('click', () => {
            const query = inputFind?.value || '';
            const matchCase = chkMatchCase?.checked || false;
            if (!query) {
                if (statusText) statusText.textContent = 'Lütfen aranacak bir kelime girin.';
                return;
            }
            const total = findNext(query, matchCase);
            if (statusText) {
                if (total === 0) {
                    statusText.textContent = 'Hiçbir eşleşme bulunamadı.';
                    statusText.className = 'text-xs text-rose-500 font-medium mt-2';
                } else {
                    statusText.textContent = `${total} adet eşleşme bulundu (${currentMatchIndex + 1}/${total})`;
                    statusText.className = 'text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2';
                }
            }
        });

        // Enter tuşu ile arama
        inputFind?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                btnFind?.click();
            }
        });

        // Değiştir Butonu
        btnReplace?.addEventListener('click', () => {
            const query = inputFind?.value || '';
            const replace = inputReplace?.value || '';
            const matchCase = chkMatchCase?.checked || false;

            const repCount = replaceOne(query, replace, matchCase);
            if (statusText) {
                if (repCount > 0) {
                    statusText.textContent = `Eşleşme değiştirildi. Kalan: ${matches.length}`;
                    statusText.className = 'text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2';
                } else {
                    statusText.textContent = 'Değiştirilecek eşleşme bulunamadı.';
                    statusText.className = 'text-xs text-rose-500 font-medium mt-2';
                }
            }
        });

        // Tümünü Değiştir Butonu
        btnReplaceAll?.addEventListener('click', () => {
            const query = inputFind?.value || '';
            const replace = inputReplace?.value || '';
            const matchCase = chkMatchCase?.checked || false;

            const count = replaceAll(query, replace, matchCase);
            if (statusText) {
                if (count > 0) {
                    statusText.textContent = `Toplam ${count} adet eşleşme başarıyla değiştirildi.`;
                    statusText.className = 'text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2';
                } else {
                    statusText.textContent = 'Değiştirilecek eşleşme bulunamadı.';
                    statusText.className = 'text-xs text-rose-500 font-medium mt-2';
                }
            }
        });
    }

    return {
        init,
        findMatches,
        replaceOne,
        replaceAll
    };
})();
