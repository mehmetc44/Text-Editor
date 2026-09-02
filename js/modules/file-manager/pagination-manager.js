/**
 * Multi-Page A4 Card Pagination Engine
 * Creates separate white A4 page cards from DOCX page breaks,
 * adds visual gap dividers between pages, and manages corner page numbers.
 */

window.PaginationManager = (function () {

    /**
     * Yeni bir A4 sayfa kartı oluşturur.
     * @param {number} pageIndex - 0-tabanlı sayfa indeksi
     * @param {string} htmlContent - Kartın içine yerleştirilecek HTML
     * @param {boolean} isFirstPage - İlk sayfa ise #editor id'si verilir
     * @returns {HTMLElement} a4-page-card elemanı
     */
    function createPageCard(pageIndex, htmlContent, isFirstPage) {
        const card = document.createElement('div');
        card.className = 'a4-page-card';
        card.id = `page-card-${pageIndex + 1}`;

        const content = document.createElement('div');
        if (isFirstPage) {
            content.id = 'editor';
        }
        content.className = 'page-content';
        content.setAttribute('contenteditable', 'true');
        content.setAttribute('spellcheck', 'true');
        if (isFirstPage) {
            content.setAttribute('data-placeholder', 'Metninizi buraya yazmaya başlayın...');
        }
        content.innerHTML = htmlContent;

        card.appendChild(content);

        // Sayfa numarası köşe etiketi
        const numEl = document.createElement('div');
        numEl.className = 'page-number-corner';
        numEl.textContent = (pageIndex + 1).toString();
        card.appendChild(numEl);

        return card;
    }

    /**
     * Sayfalar arası görsel ayırıcı (gap divider) oluşturur.
     * Referans görseldeki gri boşluk alanı.
     * @returns {HTMLElement} gap divider elemanı
     */
    function createGapDivider() {
        const gap = document.createElement('div');
        gap.className = 'page-gap-divider';
        gap.setAttribute('aria-hidden', 'true');
        gap.setAttribute('contenteditable', 'false');
        return gap;
    }

    /**
     * HTML içeriğini word-page-break div'lerinden bölerek sayfa parçaları dizisi döndürür.
     * @param {string} htmlContent - Mammoth.js'den gelen ve sanitize edilmiş HTML
     * @returns {string[]} Her sayfanın HTML içeriği
     */
    function splitByPageBreaks(htmlContent) {
        if (!htmlContent || htmlContent.trim().length === 0) {
            return [htmlContent || ''];
        }

        // Geçici bir container'da HTML'i parse et
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        const pages = [];
        let currentPageNodes = [];

        // Tüm üst-düzey child node'ları tara
        const childNodes = Array.from(tempDiv.childNodes);

        for (const node of childNodes) {
            // word-page-break div'i bulundu → mevcut sayfayı kapat, yeni sayfa başlat
            if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('word-page-break')) {
                // Mevcut sayfanın HTML'ini oluştur
                const pageContainer = document.createElement('div');
                currentPageNodes.forEach(n => pageContainer.appendChild(n.cloneNode(true)));
                pages.push(pageContainer.innerHTML);
                currentPageNodes = [];
                continue;
            }

            currentPageNodes.push(node);
        }

        // Son sayfanın HTML'ini oluştur
        if (currentPageNodes.length > 0) {
            const pageContainer = document.createElement('div');
            currentPageNodes.forEach(n => pageContainer.appendChild(n.cloneNode(true)));
            pages.push(pageContainer.innerHTML);
        }

        // Eğer hiç sayfa oluşturulamadıysa, tüm içeriği tek sayfa olarak döndür
        if (pages.length === 0) {
            pages.push(htmlContent);
        }

        return pages;
    }

    /**
     * pages-container'ı temizleyip sayfa kartları ve gap divider'lar ile yeniden oluşturur.
     * @param {string[]} pageContents - Her sayfanın HTML içeriği
     * @returns {HTMLElement} İlk sayfadaki editor/page-content elemanı
     */
    function rebuildPages(pageContents) {
        const pagesContainer = document.getElementById('pages-container');
        if (!pagesContainer) return null;

        // Mevcut içeriği temizle
        pagesContainer.innerHTML = '';

        let firstEditor = null;

        pageContents.forEach((content, index) => {
            // İlk sayfa değilse, araya gap divider ekle
            if (index > 0) {
                pagesContainer.appendChild(createGapDivider());
            }

            const isFirstPage = (index === 0);
            const card = createPageCard(index, content, isFirstPage);
            pagesContainer.appendChild(card);

            if (isFirstPage) {
                firstEditor = card.querySelector('#editor') || card.querySelector('.page-content');
            }
        });

        // Durum çubuğunu güncelle
        updatePageStats(pageContents.length);

        return firstEditor;
    }

    /**
     * Mevcut kartlardaki sayfa numaralarını günceller.
     */
    function updatePages(editor) {
        if (!editor) return;

        const pagesContainer = document.getElementById('pages-container');
        if (!pagesContainer) return;

        // Editör içi eski bölücü elemanları temizle (sadece editör içindekiler)
        const innerDividers = editor.querySelectorAll('.page-gap-divider');
        innerDividers.forEach(d => d.remove());

        // Her A4 kartının sağ alt köşesine sayfa numarası ekle/güncelle
        const pageCards = pagesContainer.querySelectorAll('.a4-page-card');
        pageCards.forEach((card, index) => {
            let numEl = card.querySelector('.page-number-corner');
            if (!numEl) {
                numEl = document.createElement('div');
                numEl.className = 'page-number-corner';
                card.appendChild(numEl);
            }
            numEl.textContent = (index + 1).toString();
        });

        // Toplam sayfa sayısını durum çubuğunda güncelle
        updatePageStats(pageCards.length);
    }

    /**
     * Durum çubuğundaki sayfa bilgisini günceller.
     * @param {number} totalPages
     */
    function updatePageStats(totalPages) {
        const statPages = document.getElementById('stat-pages');
        if (statPages) {
            statPages.textContent = `Sayfa 1 / ${Math.max(1, totalPages)}`;
        }
    }

    function init(editor) {
        if (!editor) return;

        editor.addEventListener('input', () => updatePages(editor));
        window.addEventListener('resize', () => updatePages(editor));
        updatePages(editor);
    }

    return {
        init,
        paginate: updatePages,
        updatePages,
        splitByPageBreaks,
        rebuildPages,
        createPageCard,
        createGapDivider
    };
})();
