/**
 * Meditör UI - Toolbar State Sync (Araç Çubuğu Durum Güncelleyici)
 * İmlecin bulunduğu konuma göre Bold, Italic, Hizalama vb. butonların aktifliğini (.active) günceller.
 */

import { getSelectedNode } from '../core/selection.js';

export function updateToolbarState(editor) {
    if (!editor) return;

    // Native queryCommandState ile durum tespiti
    const isBold = document.queryCommandState('bold');
    const isItalic = document.queryCommandState('italic');
    const isUnderline = document.queryCommandState('underline');
    const isStrikethrough = document.queryCommandState('strikeThrough');

    // Buton sınıflarını güncelle
    toggleBtnState('btn-bold', isBold);
    toggleBtnState('btn-italic', isItalic);
    toggleBtnState('btn-underline', isUnderline);
    toggleBtnState('btn-strikethrough', isStrikethrough);

    // Hizalama tespiti
    const isLeft = document.queryCommandState('justifyLeft');
    const isCenter = document.queryCommandState('justifyCenter');
    const isRight = document.queryCommandState('justifyRight');
    const isJustify = document.queryCommandState('justifyFull');

    toggleBtnState('btn-align-left', isLeft);
    toggleBtnState('btn-align-center', isCenter);
    toggleBtnState('btn-align-right', isRight);
    toggleBtnState('btn-align-justify', isJustify);

    // Liste tespiti
    const isUl = document.queryCommandState('insertUnorderedList');
    const isOl = document.queryCommandState('insertOrderedList');
    toggleBtnState('btn-list-ul', isUl);
    toggleBtnState('btn-list-ol', isOl);
}

function toggleBtnState(btnId, isActive) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isActive) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}
