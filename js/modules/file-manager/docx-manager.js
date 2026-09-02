/**
 * Word (.docx / .doc) Import & Export Manager
 * Uses Mammoth.js + JSZip for advanced .docx parsing, header logo extraction, table shading preservation, and HTML-to-MIME Blob export.
 */

window.DocxManager = (function () {
    async function importDocx(file, editor, onSuccess) {
        if (!file || !editor) return;

        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.docx') && window.mammoth) {
            const arrayBufferReader = new FileReader();
            arrayBufferReader.onload = async (evt) => {
                const arrayBuffer = evt.target.result;

                let headerLogoSrc = null;
                let tableShadingMap = [];

                // 1. JSZip ile Word paketinden üstbilgi (header) logosunu ve tablo hücre dolgu renklerini (w:shd) çıkar
                if (window.JSZip) {
                    try {
                        const zip = await window.JSZip.loadAsync(arrayBuffer);

                        // Tablo Hücre Dolgularını (w:shd w:fill="HEX") oku
                        const docXmlFile = zip.file("word/document.xml");
                        if (docXmlFile) {
                            const docXmlText = await docXmlFile.async("text");
                            tableShadingMap = parseXmlTableShading(docXmlText);
                        }

                        // Üstbilgi (Header) görsellerini (Logo) oku
                        const headerFiles = Object.keys(zip.files).filter(name => name.startsWith("word/header") && name.endsWith(".xml"));
                        for (const hFile of headerFiles) {
                            const hXml = await zip.file(hFile).async("text");
                            const imgMatch = hXml.match(/r:embed="([^"]+)"/);
                            if (imgMatch) {
                                const relsFile = zip.file(`word/_rels/${hFile.split('/').pop()}.rels`);
                                if (relsFile) {
                                    const relsXml = await relsFile.async("text");
                                    const targetMatch = relsXml.match(new RegExp(`Id="${imgMatch[1]}"[^>]*Target="([^"]+)"`));
                                    if (targetMatch) {
                                        const imgPath = targetMatch[1].startsWith('media/') ? `word/${targetMatch[1]}` : `word/media/${targetMatch[1].split('/').pop()}`;
                                        const imgFile = zip.file(imgPath);
                                        if (imgFile) {
                                            const base64 = await imgFile.async("base64");
                                            const ext = imgPath.split('.').pop().toLowerCase();
                                            const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
                                            headerLogoSrc = `data:${mime};base64,${base64}`;
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        // Eğer header XML'de bulunamadıysa ve word/media/ altında logo varsa ilk görseli al
                        if (!headerLogoSrc) {
                            const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith("word/media/"));
                            if (mediaFiles.length > 0) {
                                const firstMedia = mediaFiles[0];
                                const base64 = await zip.file(firstMedia).async("base64");
                                const ext = firstMedia.split('.').pop().toLowerCase();
                                const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
                                headerLogoSrc = `data:${mime};base64,${base64}`;
                            }
                        }
                    } catch (zipErr) {
                        console.warn('JSZip çözümleme hatası:', zipErr);
                    }
                }

                // 2. Mammoth.js ile DOCX metin ve tablo yapısını HTML'e dönüştür
                const options = {
                    styleMap: [
                        "p[style-name='Title'] => h1:fresh",
                        "p[style-name='Heading 1'] => h1:fresh",
                        "p[style-name='Heading 2'] => h2:fresh",
                        "p[style-name='Heading 3'] => h3:fresh",
                        "p[style-name='Heading 4'] => h4:fresh",
                        "p[style-name='Quote'] => blockquote:fresh",
                        "r[style-name='Strong'] => strong",
                        "br[type='page'] => div.word-page-break:fresh",
                        "table => table.editor-table:fresh",
                        "tr => tr:fresh",
                        "td => td:fresh",
                        "th => th:fresh"
                    ]
                };

                window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, options)
                    .then(result => {
                        let htmlOutput = result.value;

                        // 3. Tablo hücre renklerini (dark blue headers vb.) HTML hücrelerine uygula
                        if (tableShadingMap.length > 0) {
                            htmlOutput = applyTableShadingToHtml(htmlOutput, tableShadingMap);
                        }

                        // 4. Eğer üstbilgi logosu bulunduysa ve belgede henük yoksa en başa ekle
                        if (headerLogoSrc && !htmlOutput.includes(headerLogoSrc)) {
                            const logoHtml = `<div class="docx-header-logo mb-4"><img src="${headerLogoSrc}" style="max-height: 85px; max-width: 100%; display: block; margin-bottom: 16px;" alt="Logo" /></div>`;
                            htmlOutput = logoHtml + htmlOutput;
                        }

                        // 5. HTML'i sanitize et (word-page-break div'leri korunarak)
                        const cleanHtml = window.WordSanitizer.sanitizeWordHtml(htmlOutput);
                        const finalHtml = cleanHtml || htmlOutput;

                        // 6. PaginationManager ile sayfa kırılmalarını tespit et ve çoklu kart oluştur
                        if (window.PaginationManager && window.PaginationManager.splitByPageBreaks) {
                            const pageContents = window.PaginationManager.splitByPageBreaks(finalHtml);

                            // Çoklu sayfa kartları oluştur
                            const newEditor = window.PaginationManager.rebuildPages(pageContents);

                            if (newEditor) {
                                // Yeni editör elemanına event'leri yeniden bağla
                                rebindEditorEvents(newEditor, onSuccess, file.name);
                            }
                        } else {
                            // PaginationManager yoksa eski davranış
                            editor.innerHTML = finalHtml;
                            if (typeof onSuccess === 'function') onSuccess(file.name);
                        }
                    })
                    .catch(err => {
                        console.warn('Mammoth okuma hatası, metin okuyucuya geçiliyor:', err);
                        readAsTextFallback(file, editor, onSuccess);
                    });
            };
            arrayBufferReader.readAsArrayBuffer(file);
        } else {
            readAsTextFallback(file, editor, onSuccess);
        }
    }

    function parseXmlTableShading(xmlString) {
        const shadingMap = [];
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            const tables = xmlDoc.getElementsByTagName('w:tbl');

            for (let tIndex = 0; tIndex < tables.length; tIndex++) {
                const table = tables[tIndex];
                const rows = table.getElementsByTagName('w:tr');
                for (let rIndex = 0; rIndex < rows.length; rIndex++) {
                    const row = rows[rIndex];
                    const cells = row.getElementsByTagName('w:tc');
                    for (let cIndex = 0; cIndex < cells.length; cIndex++) {
                        const cell = cells[cIndex];
                        const shd = cell.getElementsByTagName('w:shd')[0];
                        if (shd) {
                            const fill = shd.getAttribute('w:fill');
                            if (fill && fill !== 'auto' && fill !== 'FFFFFF' && fill !== 'ffffff') {
                                const hexColor = fill.startsWith('#') ? fill : `#${fill}`;
                                shadingMap.push({ tIndex, rIndex, cIndex, color: hexColor });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('XML Shading ayrıştırma hatası:', e);
        }
        return shadingMap;
    }

    function applyTableShadingToHtml(htmlString, shadingMap) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const tables = doc.querySelectorAll('table');

        shadingMap.forEach(item => {
            const table = tables[item.tIndex];
            if (table) {
                const rows = table.querySelectorAll('tr');
                const row = rows[item.rIndex];
                if (row) {
                    const cells = row.querySelectorAll('td, th');
                    const cell = cells[item.cIndex];
                    if (cell) {
                        cell.style.backgroundColor = item.color;
                        // Koyu arkaplanlarda metin rengini beyaz yap ve koyulaştır
                        const isDark = isColorDark(item.color);
                        if (isDark) {
                            cell.style.color = '#ffffff';
                            cell.style.fontWeight = 'bold';
                        }
                    }
                }
            }
        });

        return doc.body.innerHTML;
    }

    function isColorDark(hex) {
        let color = hex.replace('#', '');
        if (color.length === 3) {
            color = color.split('').map(c => c + c).join('');
        }
        if (color.length !== 6) return true;
        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 150;
    }

    function rebindEditorEvents(newEditor, onSuccess, fileName) {
        if (window.FileManager) {
            window.FileManager.updateStats(newEditor);
        }
        if (window.PaginationManager) {
            window.PaginationManager.updatePages(newEditor);
        }
        if (typeof onSuccess === 'function') {
            onSuccess(fileName);
        }
    }

    function readAsTextFallback(file, editor, onSuccess) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const content = evt.target.result;
            if (editor) {
                const cleanHtml = window.WordSanitizer.sanitizeWordHtml(content);
                editor.innerHTML = cleanHtml || content;
                if (typeof onSuccess === 'function') onSuccess(file.name);
            }
        };
        reader.readAsText(file);
    }

    function exportDocx(editor) {
        if (!editor || !window.FileManager) return;
        const cleanHtml = window.FileManager.getCleanExportHtml(editor);
        const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Belge</title></head><body>`;
        const footer = "</body></html>";
        const sourceHTML = header + cleanHtml + footer;

        const blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'belge.doc';
        a.click();
        URL.revokeObjectURL(url);
    }

    return {
        importDocx,
        exportDocx
    };
})();
