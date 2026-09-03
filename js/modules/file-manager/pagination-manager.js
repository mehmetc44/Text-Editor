/**
 * Multi-Page A4 Card Pagination Engine
 * Dynamically handles text flow, pushing overflow to new pages and pulling underflow.
 */

window.PaginationManager = (function () {
    const PAGE_HEIGHT = 979; // Matches styles.css .page-content height

    function createPageCard(pageIndex) {
        const card = document.createElement('div');
        card.className = 'a4-page-card border-none outline-none focus:outline-none';
        card.id = `page-card-${pageIndex + 1}`;

        const content = document.createElement('div');
        if (pageIndex === 0) {
            content.id = 'editor';
            content.setAttribute('data-placeholder', 'Metninizi buraya yazmaya başlayın...');
        }
        content.className = 'page-content border-0 outline-none focus:outline-none focus:ring-0';
        content.setAttribute('contenteditable', 'true');
        content.setAttribute('spellcheck', 'true');
        
        card.appendChild(content);

        const numEl = document.createElement('div');
        numEl.className = 'page-number-corner';
        numEl.textContent = (pageIndex + 1).toString();
        card.appendChild(numEl);

        return card;
    }

    function createGapDivider() {
        const gap = document.createElement('div');
        gap.className = 'page-gap-divider';
        gap.setAttribute('aria-hidden', 'true');
        gap.setAttribute('contenteditable', 'false');
        return gap;
    }

    function updatePageNumbers() {
        const pagesContainer = document.getElementById('pages-container');
        if (!pagesContainer) return;
        const cards = pagesContainer.querySelectorAll('.a4-page-card');
        cards.forEach((card, i) => {
            card.id = `page-card-${i + 1}`;
            const num = card.querySelector('.page-number-corner');
            if (num) num.textContent = (i + 1).toString();
        });
        
        const statPages = document.getElementById('stat-pages');
        if (statPages) {
            statPages.textContent = `Sayfa 1 / ${Math.max(1, cards.length)}`;
        }
    }

    function saveSelection() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0);
        return {
            startContainer: range.startContainer,
            startOffset: range.startOffset,
            endContainer: range.endContainer,
            endOffset: range.endOffset
        };
    }

    function restoreSelection(saved) {
        if (!saved) return;
        try {
            const sel = window.getSelection();
            const range = document.createRange();
            range.setStart(saved.startContainer, saved.startOffset);
            range.setEnd(saved.endContainer, saved.endOffset);
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (e) {
            // Node might have been removed or altered
        }
    }

    // Prevents infinite loops
    let isFlowing = false;

    function checkAndFlow(maxPasses = 10) {
        if (isFlowing) return;
        if (maxPasses <= 0) return;
        
        isFlowing = true;
        
        const pagesContainer = document.getElementById('pages-container');
        if (!pagesContainer) {
            isFlowing = false;
            return;
        }

        const savedSel = saveSelection();
        let changed = false;

        const contents = Array.from(pagesContainer.querySelectorAll('.page-content, #editor'));

        for (let i = 0; i < contents.length; i++) {
            const page = contents[i];
            
            // 1. Spill overflow to the next page
            // We only shift if there's more than 1 child to avoid empty page loops for giant items
            while (page.scrollHeight > page.clientHeight && page.childNodes.length > 1) {
                const lastNode = page.lastChild;
                let nextPage = contents[i+1];
                
                if (!nextPage) {
                    const divider = createGapDivider();
                    pagesContainer.appendChild(divider);
                    const newCard = createPageCard(i+1);
                    pagesContainer.appendChild(newCard);
                    nextPage = newCard.querySelector('.page-content');
                    contents.push(nextPage);
                    bindEventsToPage(nextPage);
                    updatePageNumbers();
                }
                
                nextPage.prepend(lastNode);
                changed = true;
            }

            // 2. Pull underflow from the next page
            let nextPage = contents[i+1];
            if (nextPage && page.scrollHeight <= page.clientHeight) {
                while (nextPage.childNodes.length > 0) {
                    const firstNode = nextPage.firstChild;
                    page.appendChild(firstNode);
                    
                    // Did pulling cause overflow?
                    if (page.scrollHeight > page.clientHeight && page.childNodes.length > 1) {
                        nextPage.prepend(firstNode); // Push it back
                        break;
                    }
                    changed = true;
                }
                
                // If next page became empty, destroy it
                if (nextPage.childNodes.length === 0) {
                    const card = nextPage.closest('.a4-page-card');
                    const divider = card.previousElementSibling;
                    if (divider && divider.classList.contains('page-gap-divider')) {
                        divider.remove();
                    }
                    card.remove();
                    contents.splice(i+1, 1);
                    updatePageNumbers();
                    changed = true;
                }
            }
        }
        
        if (changed) {
            restoreSelection(savedSel);
        }
        
        isFlowing = false;
        
        if (changed) {
            // Give it a tiny delay to allow CSS reflows, then run again if needed
            setTimeout(() => checkAndFlow(maxPasses - 1), 10);
        }
    }

    function bindEventsToPage(page) {
        page.addEventListener('input', () => {
            checkAndFlow();
        });
        
        // Handle cross-page cursor movement via arrows/backspace if needed
        page.addEventListener('keydown', (e) => {
            // When pressing backspace at the very beginning of a page
            if (e.key === 'Backspace') {
                const sel = window.getSelection();
                if (sel.isCollapsed && sel.focusOffset === 0) {
                    const range = sel.getRangeAt(0);
                    if (range.startContainer === page || range.startContainer === page.firstChild) {
                        // Focus on previous page if possible
                        const pagesContainer = document.getElementById('pages-container');
                        const contents = Array.from(pagesContainer.querySelectorAll('.page-content, #editor'));
                        const idx = contents.indexOf(page);
                        if (idx > 0) {
                            e.preventDefault();
                            const prevPage = contents[idx - 1];
                            prevPage.focus();
                            
                            // Move caret to end of prevPage
                            const newRange = document.createRange();
                            newRange.selectNodeContents(prevPage);
                            newRange.collapse(false);
                            sel.removeAllRanges();
                            sel.addRange(newRange);
                            
                            // Let the flow handle empty nodes if any were created
                            checkAndFlow();
                        }
                    }
                }
            }
        });
    }

    function init(editor) {
        if (!editor) return;
        const pagesContainer = document.getElementById('pages-container');
        if (!pagesContainer) return;
        
        const contents = Array.from(pagesContainer.querySelectorAll('.page-content, #editor'));
        contents.forEach(bindEventsToPage);
        
        // Initial check
        setTimeout(checkAndFlow, 200);
    }

    function updatePages(editor) {
        // Alias for backwards compatibility
        updatePageNumbers();
        checkAndFlow();
    }

    function splitByPageBreaks(htmlContent) {
        if (!htmlContent || htmlContent.trim().length === 0) {
            return [htmlContent || ''];
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        const pages = [];
        let currentPageNodes = [];
        const childNodes = Array.from(tempDiv.childNodes);

        for (const node of childNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('word-page-break')) {
                const pageContainer = document.createElement('div');
                currentPageNodes.forEach(n => pageContainer.appendChild(n.cloneNode(true)));
                pages.push(pageContainer.innerHTML);
                currentPageNodes = [];
                continue;
            }
            currentPageNodes.push(node);
        }

        if (currentPageNodes.length > 0) {
            const pageContainer = document.createElement('div');
            currentPageNodes.forEach(n => pageContainer.appendChild(n.cloneNode(true)));
            pages.push(pageContainer.innerHTML);
        }

        if (pages.length === 0) {
            pages.push(htmlContent);
        }

        return pages;
    }

    function rebuildPages(pageContents) {
        const pagesContainer = document.getElementById('pages-container');
        if (!pagesContainer) return null;

        pagesContainer.innerHTML = '';
        let firstEditor = null;

        pageContents.forEach((content, index) => {
            if (index > 0) {
                pagesContainer.appendChild(createGapDivider());
            }

            const card = createPageCard(index);
            const pContent = card.querySelector('.page-content');
            if (pContent) {
                pContent.innerHTML = content;
            }
            pagesContainer.appendChild(card);

            if (index === 0) {
                firstEditor = card.querySelector('#editor') || pContent;
            }
        });

        const contents = Array.from(pagesContainer.querySelectorAll('.page-content, #editor'));
        contents.forEach(bindEventsToPage);

        updatePageNumbers();
        setTimeout(checkAndFlow, 100);

        return firstEditor;
    }

    // Keep legacy signatures for compatibility
    return {
        init,
        paginate: checkAndFlow,
        checkAndFlow,
        updatePages,
        splitByPageBreaks,
        rebuildPages,
        createPageCard,
        createGapDivider
    };
})();
