/**
 * Revisions History Manager Module (CKEditor-style)
 * Uses IndexedDB for large snapshot storage (images, tables, full HTML).
 * Supports preview, restore, delete, and auto-save.
 */

window.RevisionsManager = (function () {
    const DB_NAME = 'MeditorRevisions';
    const DB_VERSION = 1;
    const STORE_NAME = 'revisions';
    const MAX_REVISIONS = 50;

    // ── IndexedDB Helpers ──

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function getAllRevisions() {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            return new Promise((resolve) => {
                const req = store.getAll();
                req.onsuccess = () => {
                    const all = req.result || [];
                    // En yeniden en eskiye sırala
                    all.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(all);
                };
                req.onerror = () => resolve([]);
            });
        } catch (e) {
            console.warn('Revizyon okuma hatası:', e);
            return [];
        }
    }

    async function putRevision(rev) {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(rev);
        } catch (e) {
            console.warn('Revizyon kaydetme hatası:', e);
        }
    }

    async function deleteRevision(id) {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(id);
        } catch (e) {
            console.warn('Revizyon silme hatası:', e);
        }
    }

    // ── Snapshot: Görselleri Base64'e çevirip HTML içine göm ──

    async function captureSnapshot() {
        const pagesContainer = document.getElementById('pages-container');
        const editor = document.getElementById('editor');
        const source = pagesContainer || editor;
        if (!source) return '';

        const clone = source.cloneNode(true);

        // UI çöplerini temizle
        clone.querySelectorAll('.page-number-corner, .resize-handle-box, #image-toolbar').forEach(el => el.remove());
        clone.querySelectorAll('.selected-image').forEach(el => el.classList.remove('selected-image'));
        clone.querySelectorAll('.selected-cell').forEach(el => el.classList.remove('selected-cell'));

        // Blob URL'li görselleri Canvas ile Base64'e çevir
        const origImages = source.querySelectorAll('img');
        const cloneImages = clone.querySelectorAll('img');

        for (let i = 0; i < origImages.length; i++) {
            const origImg = origImages[i];
            const cloneImg = cloneImages[i];

            if (origImg.src && !origImg.src.startsWith('data:')) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = origImg.naturalWidth || origImg.width || 400;
                    canvas.height = origImg.naturalHeight || origImg.height || 300;
                    canvas.getContext('2d').drawImage(origImg, 0, 0, canvas.width, canvas.height);
                    cloneImg.src = canvas.toDataURL('image/png');
                } catch (e) { /* cross-origin, skip */ }
            }
            cloneImg.removeAttribute('data-rel-src');
        }

        return clone.innerHTML;
    }

    function getTextStats(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        const text = (div.innerText || div.textContent || '').trim();
        const words = text ? text.split(/\s+/).length : 0;
        const chars = text.length;
        const imgCount = div.querySelectorAll('img').length;
        const tableCount = div.querySelectorAll('table').length;
        return { words, chars, imgCount, tableCount };
    }

    // ── Save ──

    async function clearAllRevisions() {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).clear();
            const revisionsList = document.getElementById('revisions-list');
            if (revisionsList) {
                revisionsList.innerHTML = `<div class="p-6 text-center text-slate-400"><i class="fa-regular fa-clock text-2xl mb-2 block"></i>Henüz kaydedilmiş bir revizyon bulunmuyor.</div>`;
            }
        } catch (e) {
            console.warn('Revizyon temizleme hatası:', e);
        }
    }

    async function saveRevision(editor, title = '') {
        const now = new Date();
        const dateStr = now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR');
        const html = await captureSnapshot();
        if (!html) return;

        const stats = getTextStats(html);

        const newRev = {
            id: Date.now(),
            timestamp: Date.now(),
            date: dateStr,
            title: title || `Revizyon (${dateStr})`,
            html: html,
            words: stats.words,
            chars: stats.chars,
            imgCount: stats.imgCount,
            tableCount: stats.tableCount
        };

        await putRevision(newRev);

        // Eski revizyonları sil (MAX_REVISIONS üstündekileri)
        const all = await getAllRevisions();
        if (all.length > MAX_REVISIONS) {
            const toDelete = all.slice(MAX_REVISIONS);
            for (const old of toDelete) {
                await deleteRevision(old.id);
            }
        }

        const saveStatus = document.getElementById('save-status');
        if (saveStatus) {
            saveStatus.innerHTML = `<i class="fa-solid fa-circle-check mr-1 text-emerald-400"></i>Revizyon Kaydedildi (${now.toLocaleTimeString('tr-TR')})`;
        }
    }

    // ── Render ──

    async function renderRevisions(editor) {
        const revisionsList = document.getElementById('revisions-list');
        if (!revisionsList) return;

        const revisions = await getAllRevisions();

        if (revisions.length === 0) {
            revisionsList.innerHTML = `<div class="p-6 text-center text-slate-400"><i class="fa-regular fa-clock text-2xl mb-2 block"></i>Henüz kaydedilmiş bir revizyon bulunmuyor.</div>`;
            return;
        }

        revisionsList.innerHTML = revisions.map((rev, index) => {
            const badges = [];
            if (rev.imgCount > 0) badges.push(`<span class="inline-flex items-center px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded"><i class="fa-regular fa-image mr-0.5"></i>${rev.imgCount}</span>`);
            if (rev.tableCount > 0) badges.push(`<span class="inline-flex items-center px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded"><i class="fa-solid fa-table mr-0.5"></i>${rev.tableCount}</span>`);

            return `
                <div class="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group" data-rev-id="${rev.id}">
                    <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-slate-800 dark:text-slate-200 truncate">${rev.title}</div>
                            <div class="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                <span><i class="fa-regular fa-clock mr-0.5"></i>${rev.date}</span>
                                <span>${rev.words} sözcük</span>
                                <span>${rev.chars} karakter</span>
                                ${badges.join(' ')}
                            </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0 ml-2">
                            <button type="button" class="btn-preview-rev p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition" data-id="${rev.id}" title="Önizle">
                                <i class="fa-regular fa-eye"></i>
                            </button>
                            <button type="button" class="btn-restore-rev p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition" data-id="${rev.id}" title="Geri Yükle">
                                <i class="fa-solid fa-rotate-left"></i>
                            </button>
                            <button type="button" class="btn-delete-rev p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition opacity-0 group-hover:opacity-100" data-id="${rev.id}" title="Sil">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Preview
        revisionsList.querySelectorAll('.btn-preview-rev').forEach(btn => {
            btn.addEventListener('click', async () => {
                const revId = parseInt(btn.getAttribute('data-id'));
                const revisions = await getAllRevisions();
                const rev = revisions.find(r => r.id === revId);
                if (rev) showPreview(rev);
            });
        });

        // Restore
        revisionsList.querySelectorAll('.btn-restore-rev').forEach(btn => {
            btn.addEventListener('click', async () => {
                const revId = parseInt(btn.getAttribute('data-id'));
                const revisions = await getAllRevisions();
                const rev = revisions.find(r => r.id === revId);
                if (rev && editor) {
                    if (confirm(`'${rev.title}' revizyonuna geri dönülecek.\nMevcut içerik değiştirilsin mi?`)) {
                        restoreRevision(editor, rev);
                    }
                }
            });
        });

        // Delete
        revisionsList.querySelectorAll('.btn-delete-rev').forEach(btn => {
            btn.addEventListener('click', async () => {
                const revId = parseInt(btn.getAttribute('data-id'));
                if (confirm('Bu revizyon kalıcı olarak silinecek. Emin misiniz?')) {
                    await deleteRevision(revId);
                    await renderRevisions(editor);
                }
            });
        });
    }

    function restoreRevision(editor, rev) {
        const pagesContainer = document.getElementById('pages-container');

        if (pagesContainer && window.PaginationManager) {
            // Çoklu sayfa yapısına geri yükle
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rev.html;

            // Eğer kaydedilen HTML zaten sayfa kartları içeriyorsa
            const savedPages = tempDiv.querySelectorAll('.page-content');
            if (savedPages.length > 0) {
                const contents = [];
                savedPages.forEach(p => contents.push(p.innerHTML));
                window.PaginationManager.rebuildPages(contents);
            } else {
                // Tek parça HTML → sayfalandır
                window.PaginationManager.rebuildPages([rev.html]);
            }
        } else if (editor) {
            editor.innerHTML = rev.html;
        }

        if (window.FileManager) window.FileManager.updateStats(editor);

        const modalRevisions = document.getElementById('modal-revisions');
        if (modalRevisions) modalRevisions.classList.add('hidden');

        // Önizleme açıksa kapat
        closePreview();
    }

    // ── Preview Modal ──

    function showPreview(rev) {
        let previewModal = document.getElementById('modal-revision-preview');
        if (!previewModal) {
            previewModal = document.createElement('div');
            previewModal.id = 'modal-revision-preview';
            previewModal.className = 'fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4';
            document.body.appendChild(previewModal);
        }

        const stats = getTextStats(rev.html);
        const badgeHtml = [];
        badgeHtml.push(`<span class="px-2 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-[10px]">${stats.words} sözcük</span>`);
        if (stats.imgCount > 0) badgeHtml.push(`<span class="px-2 py-0.5 bg-purple-100 dark:bg-purple-800 rounded text-[10px]">${stats.imgCount} görsel</span>`);
        if (stats.tableCount > 0) badgeHtml.push(`<span class="px-2 py-0.5 bg-teal-100 dark:bg-teal-800 rounded text-[10px]">${stats.tableCount} tablo</span>`);

        previewModal.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-300 dark:border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-xs">
                <div class="px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between shrink-0">
                    <div>
                        <span class="font-semibold text-slate-800 dark:text-slate-200"><i class="fa-regular fa-eye text-blue-500 mr-1.5"></i>${rev.title}</span>
                        <div class="flex items-center gap-1.5 mt-1">${badgeHtml.join('')}</div>
                    </div>
                    <button type="button" id="btn-close-preview" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-sm"></i></button>
                </div>
                <div class="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-850" style="min-height:200px">
                    <div class="prose prose-sm dark:prose-invert max-w-none" style="font-size:12px;">${rev.html}</div>
                </div>
            </div>
        `;

        previewModal.classList.remove('hidden');
        previewModal.querySelector('#btn-close-preview').addEventListener('click', closePreview);
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) closePreview();
        });
    }

    function closePreview() {
        const previewModal = document.getElementById('modal-revision-preview');
        if (previewModal) previewModal.remove();
    }

    // ── Auto-Save (her 2 dakikada bir) ──

    let autoSaveInterval = null;

    function startAutoSave() {
        if (autoSaveInterval) clearInterval(autoSaveInterval);
        autoSaveInterval = setInterval(async () => {
            const editor = document.getElementById('editor');
            if (editor) {
                await saveRevision(editor, 'Otomatik Kayıt');
            }
        }, 2 * 60 * 1000); // 2 dakika
    }

    // Sayfa yüklendiğinde otomatik kayıt başlat
    document.addEventListener('DOMContentLoaded', startAutoSave);

    return {
        saveRevision,
        renderRevisions,
        captureSnapshot,
        clearAllRevisions
    };
})();
