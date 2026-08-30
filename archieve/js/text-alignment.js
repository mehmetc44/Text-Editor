/**
 * Zengin Metin Editörü - Metin Hizalama ve Girinti Modülü
 * Bu modül metin hizalama ve girinti işlemlerini yönetir.
 */

// Metin hizalama işlevleri
function applyTextAlignment(alignment) {
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) return;
    
    // Seçili metnin paragraflarını al
    const range = selection.getRangeAt(0);
    const startNode = findParentBlock(range.startContainer);
    const endNode = findParentBlock(range.endContainer);
    
    if (!startNode || !endNode) return;
    
    // Seçim içindeki tüm blok elementleri bul
    const blocksInSelection = findBlocksBetween(startNode, endNode);
    
    // Her blok elementine hizalama uygula
    blocksInSelection.forEach(block => {
        block.style.textAlign = alignment;
    });
    
    return true;
}

// Metin girinti işlevleri
function increaseIndent() {
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) return;
    
    // Seçili metnin paragraflarını al
    const range = selection.getRangeAt(0);
    const startNode = findParentBlock(range.startContainer);
    const endNode = findParentBlock(range.endContainer);
    
    if (!startNode || !endNode) return;
    
    // Seçim içindeki tüm blok elementleri bul
    const blocksInSelection = findBlocksBetween(startNode, endNode);
    
    // Her blok elementine girinti uygula
    blocksInSelection.forEach(block => {
        const currentPadding = window.getComputedStyle(block).paddingLeft;
        const currentPaddingValue = parseInt(currentPadding) || 0;
        const newPaddingValue = currentPaddingValue + 20; // 20px artır
        
        block.style.paddingLeft = `${newPaddingValue}px`;
    });
    
    return true;
}

function decreaseIndent() {
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) return;
    
    // Seçili metnin paragraflarını al
    const range = selection.getRangeAt(0);
    const startNode = findParentBlock(range.startContainer);
    const endNode = findParentBlock(range.endContainer);
    
    if (!startNode || !endNode) return;
    
    // Seçim içindeki tüm blok elementleri bul
    const blocksInSelection = findBlocksBetween(startNode, endNode);
    
    // Her blok elementinin girintisini azalt
    blocksInSelection.forEach(block => {
        const currentPadding = window.getComputedStyle(block).paddingLeft;
        const currentPaddingValue = parseInt(currentPadding) || 0;
        
        // Negatif değer olmaması için kontrol
        const newPaddingValue = Math.max(0, currentPaddingValue - 20); // 20px azalt
        
        block.style.paddingLeft = `${newPaddingValue}px`;
    });
    
    return true;
}

// Yardımcı fonksiyonlar
function findParentBlock(node) {
    // Text node ise parent elementini al
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }
    
    // Blok element bulana kadar yukarı doğru tara
    while (node && node.nodeName.toLowerCase() !== 'body') {
        const display = window.getComputedStyle(node).display;
        
        // Blok element ise döndür
        if (display === 'block' || display === 'flex' || display === 'grid' || 
            node.nodeName.toLowerCase() === 'p' || 
            node.nodeName.toLowerCase() === 'div' ||
            node.nodeName.toLowerCase() === 'h1' ||
            node.nodeName.toLowerCase() === 'h2' ||
            node.nodeName.toLowerCase() === 'h3' ||
            node.nodeName.toLowerCase() === 'h4' ||
            node.nodeName.toLowerCase() === 'h5' ||
            node.nodeName.toLowerCase() === 'h6' ||
            node.nodeName.toLowerCase() === 'li') {
            return node;
        }
        
        node = node.parentNode;
    }
    
    return null;
}

function findBlocksBetween(startBlock, endBlock) {
    const blocks = [];
    const editor = document.getElementById('editor');
    
    // Başlangıç bloğunu ekle
    blocks.push(startBlock);
    
    // Eğer aynı blok ise sadece onu döndür
    if (startBlock === endBlock) {
        return blocks;
    }
    
    // DOM'da bulunan tüm blokları kontrol et
    let currentNode = startBlock.nextSibling;
    
    while (currentNode && currentNode !== endBlock) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
            const display = window.getComputedStyle(currentNode).display;
            
            if (display === 'block' || display === 'flex' || display === 'grid' || 
                currentNode.nodeName.toLowerCase() === 'p' || 
                currentNode.nodeName.toLowerCase() === 'div' ||
                currentNode.nodeName.toLowerCase() === 'h1' ||
                currentNode.nodeName.toLowerCase() === 'h2' ||
                currentNode.nodeName.toLowerCase() === 'h3' ||
                currentNode.nodeName.toLowerCase() === 'h4' ||
                currentNode.nodeName.toLowerCase() === 'h5' ||
                currentNode.nodeName.toLowerCase() === 'h6' ||
                currentNode.nodeName.toLowerCase() === 'li') {
                // Blok element ise ekle
                blocks.push(currentNode);
            } else {
                // İç içe bloklar için ayrıca kontrol et
                const nestedBlocks = currentNode.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li');
                nestedBlocks.forEach(block => {
                    if (isElementBetween(block, startBlock, endBlock, editor)) {
                        blocks.push(block);
                    }
                });
            }
        }
        
        currentNode = currentNode.nextSibling;
    }
    
    // Bitiş bloğunu ekle
    if (endBlock) {
        blocks.push(endBlock);
    }
    
    return blocks;
}

function isElementBetween(element, startBlock, endBlock, container) {
    const treeWalker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_ELEMENT,
        null,
        false
    );
    
    // Başlangıç düğümüne konumlan
    treeWalker.currentNode = startBlock;
    
    // İlerleyerek bitiş düğümüne kadar olan tüm elementleri kontrol et
    let currentElement = treeWalker.nextNode();
    
    while (currentElement && currentElement !== endBlock) {
        if (currentElement === element) {
            return true;
        }
        currentElement = treeWalker.nextNode();
    }
    
    return false;
}

// Mevcut hizalamayı ve girintiyi kontrol et
function getCurrentAlignment() {
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
        return null;
    }
    
    const range = selection.getRangeAt(0);
    const parentBlock = findParentBlock(range.startContainer);
    
    if (!parentBlock) {
        return null;
    }
    
    return window.getComputedStyle(parentBlock).textAlign;
}

function getCurrentIndent() {
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
        return 0;
    }
    
    const range = selection.getRangeAt(0);
    const parentBlock = findParentBlock(range.startContainer);
    
    if (!parentBlock) {
        return 0;
    }
    
    const paddingLeft = window.getComputedStyle(parentBlock).paddingLeft;
    return parseInt(paddingLeft) || 0;
}

// Dışa aktarılacak metodlar
const TextAlignment = {
    applyTextAlignment,
    increaseIndent,
    decreaseIndent,
    getCurrentAlignment,
    getCurrentIndent
};

// Modülü dışa aktar
export default TextAlignment;