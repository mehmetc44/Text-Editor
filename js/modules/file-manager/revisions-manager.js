/**
 * Revisions History Manager Module
 * Manages saving snapshots to localStorage, listing version history, and restoring revisions.
 */

window.RevisionsManager = (function () {
    let revisions = JSON.parse(localStorage.getItem('meditor_revisions') || '[]');

    function saveRevision(editor, title = '') {
        if (!editor) return;
        const now = new Date();
        const dateStr = now.toLocaleDateString('tr-TR') + ' ' + now.toLocaleTimeString('tr-TR');
        const text = editor.innerText || '';
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

        const newRev = {
            id: Date.now(),
            date: dateStr,
            title: title || `Revizyon (${dateStr})`,
            html: editor.innerHTML,
            words: wordCount
        };

        revisions.unshift(newRev);
        if (revisions.length > 25) revisions.pop();
        localStorage.setItem('meditor_revisions', JSON.stringify(revisions));
        renderRevisions(editor);

        const saveStatus = document.getElementById('save-status');
        if (saveStatus) {
            saveStatus.innerHTML = `<i class="fa-solid fa-circle-check mr-1 text-emerald-400"></i>Revizyon Kaydedildi (${now.toLocaleTimeString('tr-TR')})`;
        }
    }

    function renderRevisions(editor) {
        const revisionsList = document.getElementById('revisions-list');
        const modalRevisions = document.getElementById('modal-revisions');
        if (!revisionsList) return;

        if (revisions.length === 0) {
            revisionsList.innerHTML = `<div class="p-4 text-center text-slate-400 font-italic">Henüz kaydedilmiş bir revizyon bulunmuyor.</div>`;
            return;
        }

        revisionsList.innerHTML = revisions.map(rev => `
            <div class="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                <div>
                    <div class="font-semibold text-slate-800 dark:text-slate-200">${rev.title}</div>
                    <div class="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span><i class="fa-regular fa-clock mr-1"></i>${rev.date}</span>
                        <span>•</span>
                        <span>${rev.words} sözcük</span>
                    </div>
                </div>
                <button type="button" class="btn-restore-rev px-2 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded text-[11px] font-medium" data-id="${rev.id}">
                    <i class="fa-solid fa-rotate-left mr-1"></i>Geri Yükle
                </button>
            </div>
        `).join('');

        revisionsList.querySelectorAll('.btn-restore-rev').forEach(btn => {
            btn.addEventListener('click', () => {
                const revId = parseInt(btn.getAttribute('data-id'));
                const rev = revisions.find(r => r.id === revId);
                if (rev && editor) {
                    if (confirm(`'${rev.title}' revizyonuna geri dönülecek. Mevcut içerik değiştirilsin mi?`)) {
                        editor.innerHTML = rev.html;
                        if (window.FileManager) window.FileManager.updateStats(editor);
                        if (modalRevisions) modalRevisions.classList.add('hidden');
                    }
                }
            });
        });
    }

    return {
        saveRevision,
        renderRevisions
    };
})();
