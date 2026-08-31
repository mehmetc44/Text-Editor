/**
 * Meditör - Metin Biçimlendirme Modülü (Text Formatting Module)
 * Kalın, İtalik, Altı Çizili, Üstü Çizili, Font Ailesi, Boyutu, Renkler ve Hizalama işlemlerini yönetir.
 */

import { applyInlineStyle, applyBlockFormat } from '../core/selection.js';

/**
 * Komut çalıştırıcı (Native execCommand wrapper)
 * @param {string} command 
 * @param {string|null} value 
 */
export function exec(command, value = null) {
    document.execCommand(command, false, value);
}

/**
 * Kalın yap (Bold)
 */
export function toggleBold() {
    exec('bold');
}

/**
 * İtalik yap (Italic)
 */
export function toggleItalic() {
    exec('italic');
}

/**
 * Altı Çizili yap (Underline)
 */
export function toggleUnderline() {
    exec('underline');
}

/**
 * Üstü Çizili yap (Strikethrough)
 */
export function toggleStrikethrough() {
    exec('strikeThrough');
}

/**
 * Alt Simge (Subscript)
 */
export function toggleSubscript() {
    exec('subscript');
}

/**
 * Üst Simge (Superscript)
 */
export function toggleSuperscript() {
    exec('superscript');
}

/**
 * Metin Hizalama (left, center, right, justify)
 * @param {string} alignType 
 */
export function setAlignment(alignType) {
    switch (alignType) {
        case 'left': exec('justifyLeft'); break;
        case 'center': exec('justifyCenter'); break;
        case 'right': exec('justifyRight'); break;
        case 'justify': exec('justifyFull'); break;
    }
}

/**
 * Yazı Rengi Değiştirme
 * @param {string} color 
 */
export function setTextColor(color) {
    exec('foreColor', color);
}

/**
 * Arka Plan Vurgu Rengi Değiştirme
 * @param {string} color 
 */
export function setBackgroundColor(color) {
    // Tarayıcı uyumluluğu için hiliteColor veya backColor
    try {
        exec('hiliteColor', color);
    } catch (e) {
        exec('backColor', color);
    }
}

/**
 * Font Ailesi Değiştirme
 * @param {string} fontFamily 
 */
export function setFontFamily(fontFamily) {
    applyInlineStyle('fontFamily', fontFamily);
}

/**
 * Font Boyutu Değiştirme
 * @param {string} fontSize - Örn: '14px', '18px'
 */
export function setFontSize(fontSize) {
    applyInlineStyle('fontSize', fontSize);
}

/**
 * Başlık Stili Değiştirme (H1-H4, P, Blockquote, Pre)
 * @param {string} headingTag 
 */
export function setHeading(headingTag) {
    applyBlockFormat(headingTag);
}

/**
 * Seçili Metnin Biçimlendirmesini Temizle
 */
export function clearFormatting() {
    exec('removeFormat');
}
