/**
 * PDF Export Manager Module
 * Handles converting editor pages to a multi-page PDF using html2canvas and jsPDF.
 */

window.PdfManager = (function () {
    async function exportPdf() {
        if (!window.html2canvas || !window.jspdf) {
            alert('PDF kütüphaneleri yüklenemedi. Lütfen internet bağlantınızı kontrol edip sayfayı yenileyin.');
            return;
        }

        const pages = document.querySelectorAll('.a4-page-card');
        if (pages.length === 0) return;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.color = 'white';
        overlay.style.fontFamily = 'system-ui, sans-serif';
        
        const spinner = document.createElement('i');
        spinner.className = 'fa-solid fa-circle-notch fa-spin';
        spinner.style.fontSize = '40px';
        spinner.style.marginBottom = '16px';
        
        const text = document.createElement('div');
        text.innerText = 'PDF oluşturuluyor, lütfen bekleyin... (0 / ' + pages.length + ')';
        text.style.fontSize = '16px';
        text.style.fontWeight = '600';

        overlay.appendChild(spinner);
        overlay.appendChild(text);
        document.body.appendChild(overlay);

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            // A4 dimensions in mm
            const pdfWidth = 210;
            const pdfHeight = 297;

            for (let i = 0; i < pages.length; i++) {
                text.innerText = 'PDF oluşturuluyor, lütfen bekleyin... (' + (i + 1) + ' / ' + pages.length + ')';
                const page = pages[i];
                
                // Ensure page doesn't have any box-shadow for a clean render
                const origBoxShadow = page.style.boxShadow;
                page.style.boxShadow = 'none';

                const canvas = await window.html2canvas(page, {
                    scale: 2, // 2x resolution for better text clarity
                    useCORS: true,
                    logging: false
                });

                page.style.boxShadow = origBoxShadow;

                const imgData = canvas.toDataURL('image/jpeg', 1.0);

                if (i > 0) {
                    pdf.addPage();
                }

                // A4 aspect ratio exactly matches our .editor-page
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }

            pdf.save('belge.pdf');
        } catch (err) {
            console.error('PDF dışa aktarma hatası:', err);
            alert('PDF oluşturulurken bir hata oluştu.');
        } finally {
            document.body.removeChild(overlay);
        }
    }

    return {
        exportPdf
    };
})();
