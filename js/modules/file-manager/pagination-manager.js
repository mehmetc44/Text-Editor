/**
 * Pagination & Multi-Page A4 Break Engine
 * Calculates document scroll height, dynamically inserts visual A4 page breaks, and updates page count.
 */

window.PaginationManager = (function () {
    const PAGE_HEIGHT = 1123; // Standart A4 Yüksekliği (96 DPI / 297mm)

    function updatePages(editor) {
        if (!editor) return;

        // 1. Mevcut otomatik sayfa kesmelerini geçici olarak kaldır
        const existingBreaks = editor.querySelectorAll('.page-break-indicator');
        existingBreaks.forEach(b => b.remove());

        // 2. Toplam yüksekliği hesapla ve sayfa sayısını bul
        const scrollHeight = editor.scrollHeight || 1123;
        const totalPages = Math.max(1, Math.ceil(scrollHeight / PAGE_HEIGHT));

        // 3. Durum çubuğundaki sayfa sayacını güncelle
        const statPages = document.getElementById('stat-pages');
        if (statPages) {
            statPages.textContent = `Sayfa 1 / ${totalPages}`;
        }

        // 4. Eğer 1 sayfadan uzunsa, her 1123px katında görsel A4 sayfa kesme çizgisi ve boşluğu ekle
        if (totalPages > 1) {
            insertPageBreaks(editor, totalPages);
        }
    }

    function insertPageBreaks(editor, totalPages) {
        // Editör içindeki doğrudan alt elemanları tara
        const children = Array.from(editor.children);
        let accumulatedHeight = 0;
        let currentPageIndex = 1;

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.classList.contains('page-break-indicator')) continue;

            const childHeight = child.offsetHeight || 30;
            accumulatedHeight += childHeight;

            // Eğer birikmiş yükseklik A4 sayfa sınırını (1123px katı) aşarsa sayfa kesme rozeti yerleştir
            if (accumulatedHeight >= (currentPageIndex * (PAGE_HEIGHT - 120)) && currentPageIndex < totalPages) {
                currentPageIndex++;

                const breakEl = document.createElement('div');
                breakEl.className = 'page-break-indicator';
                breakEl.setAttribute('contenteditable', 'false');
                breakEl.innerHTML = `<span class="page-break-badge"><i class="fa-solid fa-scissors mr-1.5"></i>SAYFA ${currentPageIndex}</span>`;

                if (child.nextSibling) {
                    editor.insertBefore(breakEl, child.nextSibling);
                } else {
                    editor.appendChild(breakEl);
                }
            }
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
        updatePages
    };
})();
