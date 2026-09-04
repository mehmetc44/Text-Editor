/**
 * Editor History Manager (Undo / Redo)
 * Maintains a stack of DOM states to bypass contenteditable's native broken history.
 */
window.HistoryManager = (function () {
    const undoStack = [];
    const redoStack = [];
    const MAX_STATES = 50;
    
    let isReverting = false;

    function pushState() {
        if (isReverting) return;
        
        const pagesContainer = document.getElementById('pages-container');
        if (!pagesContainer) return;
        
        const html = pagesContainer.innerHTML;
        
        if (undoStack.length > 0 && undoStack[undoStack.length - 1].html === html) {
            return; // No change
        }

        undoStack.push({ html });

        if (undoStack.length > MAX_STATES) {
            undoStack.shift();
        }
        
        // Clear redo stack on new action
        redoStack.length = 0;
    }

    function undo() {
        if (undoStack.length <= 1) return; // Need at least current state and one previous
        
        isReverting = true;
        
        // Pop current state and push to redo
        const currentState = undoStack.pop();
        redoStack.push(currentState);
        
        // Peek at previous state and apply
        const previousState = undoStack[undoStack.length - 1];
        restoreState(previousState.html);
        
        isReverting = false;
    }

    function redo() {
        if (redoStack.length === 0) return;
        
        isReverting = true;
        
        const nextState = redoStack.pop();
        undoStack.push(nextState);
        restoreState(nextState.html);
        
        isReverting = false;
    }

    function restoreState(html) {
        const pagesContainer = document.getElementById('pages-container');
        if (pagesContainer) {
            pagesContainer.innerHTML = html;
            
            // Rebind events to new pages
            if (window.PaginationManager) {
                const contents = Array.from(pagesContainer.querySelectorAll('.page-content'));
                contents.forEach(page => {
                    // Quick and dirty bind to prevent exporting internal PaginationManager methods
                    page.addEventListener('input', () => {
                        if (window.PaginationManager.updatePages) window.PaginationManager.updatePages();
                    });
                    
                    page.addEventListener('keydown', (e) => {
                        if (e.key === 'Backspace') {
                            const sel = window.getSelection();
                            if (sel.isCollapsed && sel.focusOffset === 0) {
                                const range = sel.getRangeAt(0);
                                if (range.startContainer === page || range.startContainer === page.firstChild) {
                                    const allPages = Array.from(document.querySelectorAll('.page-content'));
                                    const idx = allPages.indexOf(page);
                                    if (idx > 0) {
                                        e.preventDefault();
                                        const prevPage = allPages[idx - 1];
                                        prevPage.focus();
                                        const newRange = document.createRange();
                                        newRange.selectNodeContents(prevPage);
                                        newRange.collapse(false);
                                        sel.removeAllRanges();
                                        sel.addRange(newRange);
                                        if (window.PaginationManager.updatePages) window.PaginationManager.updatePages();
                                    }
                                }
                            }
                        }
                    });
                });
            }
            
            if (window.FileManager) {
                const firstPage = pagesContainer.querySelector('.page-content');
                if (firstPage) window.FileManager.updateStats(firstPage);
            }
        }
    }

    function init() {
        // Initial state
        setTimeout(pushState, 500);

        // Bind keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' || e.key === 'Z') {
                    if (e.shiftKey) {
                        e.preventDefault();
                        redo();
                    } else {
                        e.preventDefault();
                        undo();
                    }
                } else if (e.key === 'y' || e.key === 'Y') {
                    e.preventDefault();
                    redo();
                }
            }
        });
        
        // Auto-save state on input (debounced)
        const pagesContainer = document.getElementById('pages-container');
        if (pagesContainer) {
            let timeout;
            pagesContainer.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    pushState();
                }, 600);
            });
        }
    }

    return {
        init,
        pushState,
        undo,
        redo
    };
})();
