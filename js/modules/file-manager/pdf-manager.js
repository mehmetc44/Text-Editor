/**
 * PDF Export Manager Module
 * Handles browser print-to-PDF invocation with clean A4 layout styling.
 */

window.PdfManager = (function () {
    function exportPdf() {
        try {
            window.print();
        } catch (err) {
            console.error('PDF dışa aktarma hatası:', err);
        }
    }

    return {
        exportPdf
    };
})();
