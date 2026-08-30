/**
 * Zengin Metin Editörü - Liste Biçimlendirme Modülü
 * Bu modül sıralı ve sırasız listeleri yönetir.
 */

/**
 * Sırasız liste uygular veya kaldırır
 * @param {HTMLElement} editor - Editör elementi
 * @returns {boolean} - İşlem başarılı mı?
 */
function toggleUnorderedList(editor) {
    return executeCommand('insertUnorderedList', false, editor);
}

/**
 * Sıralı liste uygular veya kaldırır
 * @param {HTMLElement} editor - Editör elementi
 * @returns {boolean} - İşlem başarılı mı?
 */
function toggleOrderedList(editor) {
    return executeCommand('insertOrderedList', false, editor);
}

/**
 * Liste öğesi girintisini artırır
 * @param {HTMLElement} editor - Editör elementi
 * @returns {boolean} - İşlem başarılı mı?
 */
function increaseListIndent(editor) {
    return executeCommand('indent', false, editor);
}

/**
 * Liste öğesi girintisini azaltır
 * @param {HTMLElement} editor - Editör elementi
 * @returns {boolean} - İşlem başarılı mı?
 */
function decreaseListIndent(editor) {
    return executeCommand('outdent', false, editor);
}

/**
 * Belirtilen komutu çalıştırır
 * @param {string} command - Çalıştırılacak komut
 * @param {string|boolean} value - Komut değeri (varsa)
 * @param {HTMLElement} editor - Editör elementi
 * @returns {boolean} - İşlem başarılı mı?
 */
function executeCommand(command, value, editor) {
    try {
        // İşlemi gerçekleştirmeden önce editöre odaklan
        editor.focus();
        
        // Komutu çalıştır
        const result = document.execCommand(command, false, value);
        
        // Liste öğesi oluşturma/kaldırma sonrası temizleme
        cleanupListStructure(editor);
        
        return result;
    } catch (error) {
        console.error(`Liste komutu çalıştırılırken hata oluştu (${command}):`, error);
        return false;
    }
}

/**
 * Liste yapısını temizler ve düzgünleştirir
 * @param {HTMLElement} editor - Editör elementi
 */
function cleanupListStructure(editor) {
    // Boş liste öğelerini temizle
    const listItems = editor.querySelectorAll('li');
    listItems.forEach(item => {
        if (item.textContent.trim() === '') {
            const parentList = item.parentNode;
            parentList.removeChild(item);
            
            // Eğer liste tamamen boş kaldıysa, onu da kaldır
            if (parentList.children.length === 0) {
                parentList.parentNode.removeChild(parentList);
            }
        }
    });
    
    // İç içe listeleri düzgünleştir
    const lists = editor.querySelectorAll('ul, ol');
    lists.forEach(list => {
        // Liste içinde direkt metin içeriği varsa, onu li elementine sar
        Array.from(list.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                const li = document.createElement('li');
                li.textContent = node.textContent;
                list.replaceChild(li, node);
            }
        });
        
        // Listenin ilk seviye parent'ı bir li elementi değilse ve
        // list bir başka listenin direkt çocuğuysa, yapıyı düzeltmek gerekli olabilir
        if (list.parentNode.nodeName.toLowerCase() !== 'li' && 
            (list.parentNode.nodeName.toLowerCase() === 'ul' || 
             list.parentNode.nodeName.toLowerCase() === 'ol')) {
            
            // İç içe listeler arasında li elementi olmalı
            const wrapper = document.createElement('li');
            list.parentNode.replaceChild(wrapper, list);
            wrapper.appendChild(list);
        }
    });
}

/**
 * İmleç pozisyonundaki liste durumunu kontrol eder
 * @param {HTMLElement} editor - Editör elementi
 * @returns {Object} - Liste durumu bilgileri
 */
function checkListState(editor) {
    const state = {
        isOrderedList: false,
        isUnorderedList: false,
        canIncreaseIndent: false,
        canDecreaseIndent: false
    };
    
    // Seçim içindeki node'ları kontrol et
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return state;
    
    const range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    
    // Text node ise parent'a bak
    let currentNode = startNode;
    if (currentNode.nodeType === Node.TEXT_NODE) {
        currentNode = currentNode.parentNode;
    }
    
    // Sıralı veya sırasız liste içinde mi kontrol et
    while (currentNode && currentNode !== editor) {
        if (currentNode.nodeName.toLowerCase() === 'ul') {
            state.isUnorderedList = true;
            break;
        } else if (currentNode.nodeName.toLowerCase() === 'ol') {
            state.isOrderedList = true;
            break;
        }
        
        // Liste öğesi (li) içinde mi kontrol et
        if (currentNode.nodeName.toLowerCase() === 'li') {
            // Parent liste tipini kontrol et
            const parentList = currentNode.parentNode;
            if (parentList.nodeName.toLowerCase() === 'ul') {
                state.isUnorderedList = true;
            } else if (parentList.nodeName.toLowerCase() === 'ol') {
                state.isOrderedList = true;
            }
            
            // Girinti artırma/azaltma durumunu kontrol et
            state.canIncreaseIndent = true; // Her zaman artırılabilir
            
            // Girinti azaltma kontrolü - iç içe liste mi?
            const parentOfList = parentList.parentNode;
            if (parentOfList && parentOfList.nodeName.toLowerCase() === 'li') {
                state.canDecreaseIndent = true;
            }
            
            break;
        }
        
        currentNode = currentNode.parentNode;
    }
    
    return state;
}

/**
 * Belirli bir liste tipine dönüştürür
 * @param {HTMLElement} editor - Editör elementi
 * @param {string} listType - Liste tipi ('ul' veya 'ol')
 * @returns {boolean} - İşlem başarılı mı?
 */
function convertListType(editor, listType) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    
    // Text node ise parent'a bak
    let currentNode = startNode;
    if (currentNode.nodeType === Node.TEXT_NODE) {
        currentNode = currentNode.parentNode;
    }
    
    // Liste öğesi veya liste bul
    let listElement = null;
    let listItemElement = null;
    
    while (currentNode && currentNode !== editor) {
        if (currentNode.nodeName.toLowerCase() === 'ul' || currentNode.nodeName.toLowerCase() === 'ol') {
            listElement = currentNode;
            break;
        }
        
        if (currentNode.nodeName.toLowerCase() === 'li') {
            listItemElement = currentNode;
            listElement = currentNode.parentNode;
            break;
        }
        
        currentNode = currentNode.parentNode;
    }
    
    // Liste bulunamadıysa işlem yapma
    if (!listElement) return false;
    
    // Zaten istenen tipteyse işlem yapma
    if (listElement.nodeName.toLowerCase() === listType) return true;
    
    // Liste tipini değiştir
    const newList = document.createElement(listType);
    
    // İçeriği taşı
    while (listElement.firstChild) {
        newList.appendChild(listElement.firstChild);
    }
    
    // Eski listeyi yenisiyle değiştir
    listElement.parentNode.replaceChild(newList, listElement);
    
    return true;
}

// Dışa aktarılacak metodlar
const ListFormatting = {
    toggleUnorderedList,
    toggleOrderedList,
    increaseListIndent,
    decreaseListIndent,
    checkListState,
    convertListType
};

// Modülü dışa aktar
export default ListFormatting;