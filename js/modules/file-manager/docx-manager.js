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

    async function exportDocx(editor) {
        if (!editor || !window.JSZip) {
            alert('JSZip yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.');
            return;
        }

        // Yükleniyor bildirimi
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;color:white;';
        overlay.innerHTML = '<div style="text-align:center"><i class="fa-solid fa-circle-notch fa-spin" style="font-size:40px;margin-bottom:16px;"></i><div style="font-family:system-ui,sans-serif;font-weight:600">Word dosyası hazırlanıyor...</div></div>';
        document.body.appendChild(overlay);

        try {
            // ── 1. Editör içeriğini klonla ve temizle ──
            const pagesContainer = document.getElementById('pages-container') || editor;
            const clone = pagesContainer.cloneNode(true);
            clone.querySelectorAll('.page-number-corner, .resize-handle-box').forEach(el => el.remove());
            clone.querySelectorAll('.selected-image').forEach(el => el.classList.remove('selected-image'));
            clone.querySelectorAll('.selected-cell').forEach(el => el.classList.remove('selected-cell'));

            // Orijinal görselleri canvas ile yakala (blob:/file: URL'ler için)
            const origImages = pagesContainer.querySelectorAll('img');
            const cloneImages = clone.querySelectorAll('img');
            for (let i = 0; i < origImages.length; i++) {
                const origImg = origImages[i];
                const cloneImg = cloneImages[i];
                if (origImg.src && !origImg.src.startsWith('data:')) {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = origImg.naturalWidth || origImg.width || 800;
                        canvas.height = origImg.naturalHeight || origImg.height || 600;
                        canvas.getContext('2d').drawImage(origImg, 0, 0, canvas.width, canvas.height);
                        cloneImg.src = canvas.toDataURL('image/png');
                    } catch (e) { /* skip */ }
                }
                cloneImg.removeAttribute('data-rel-src');
            }

            // Temiz HTML'i birleştir
            let cleanHtml = '';
            const pageContents = clone.querySelectorAll('.page-content');
            if (pageContents.length > 0) {
                pageContents.forEach(part => cleanHtml += part.innerHTML);
            } else {
                cleanHtml = clone.innerHTML;
            }

            // ── 2. HTML'i DOM olarak parse et ──
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cleanHtml;

            // ── 3. Görselleri çıkar ve binary'ye çevir ──
            const images = [];
            const allImgs = tempDiv.querySelectorAll('img');
            for (let i = 0; i < allImgs.length; i++) {
                const img = allImgs[i];
                const src = img.getAttribute('src') || '';
                if (!src) continue;

                let base64Data = '';
                let ext = 'png';
                let mime = 'image/png';

                if (src.startsWith('data:')) {
                    const match = src.match(/^data:(image\/(png|jpeg|jpg|gif|bmp|webp));base64,(.+)$/i);
                    if (match) {
                        mime = match[1];
                        ext = match[2].toLowerCase();
                        if (ext === 'jpg') ext = 'jpeg';
                        base64Data = match[3];
                    }
                }

                if (base64Data) {
                    // Base64'ü binary'ye çevir
                    const binaryStr = atob(base64Data);
                    const bytes = new Uint8Array(binaryStr.length);
                    for (let b = 0; b < binaryStr.length; b++) {
                        bytes[b] = binaryStr.charCodeAt(b);
                    }

                    const imgId = i + 1;
                    const fileName = `image${imgId}.${ext}`;
                    const rId = `rIdImg${imgId}`;

                    // Orijinal boyutları al (EMU cinsinden: 1px = 9525 EMU)
                    const origImgEl = origImages[i];
                    const widthPx = (origImgEl && origImgEl.naturalWidth) ? origImgEl.naturalWidth : 400;
                    const heightPx = (origImgEl && origImgEl.naturalHeight) ? origImgEl.naturalHeight : 300;

                    // Max genişlik: 15cm (5669291 EMU), orantılı küçült
                    const maxWidthEmu = 5669291;
                    let widthEmu = widthPx * 9525;
                    let heightEmu = heightPx * 9525;
                    if (widthEmu > maxWidthEmu) {
                        const ratio = maxWidthEmu / widthEmu;
                        widthEmu = maxWidthEmu;
                        heightEmu = Math.round(heightEmu * ratio);
                    }

                    images.push({
                        id: imgId,
                        fileName: fileName,
                        rId: rId,
                        ext: ext,
                        mime: mime,
                        data: bytes,
                        widthEmu: widthEmu,
                        heightEmu: heightEmu
                    });

                    // img etiketine marker koy (sonra XML'e çevirirken kullanacağız)
                    img.setAttribute('data-docx-img-id', imgId.toString());
                }
            }

            // ── 4. HTML → OOXML dönüşümü ──
            const bodyXml = htmlToOoxml(tempDiv, images);

            // ── 5. DOCX ZIP paketini oluştur ──
            const zip = new JSZip();

            // [Content_Types].xml
            let contentTypesOverrides = '';
            const usedExts = new Set();
            images.forEach(img => usedExts.add(img.ext));
            let defaultExts = '';
            usedExts.forEach(ext => {
                const ctype = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'bmp' ? 'image/bmp' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
                defaultExts += `<Default Extension="${ext}" ContentType="${ctype}"/>`;
            });

            zip.file('[Content_Types].xml',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    ${defaultExts}
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
    <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`);

            // _rels/.rels
            zip.file('_rels/.rels',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

            // word/document.xml
            zip.file('word/document.xml',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
    <w:body>
        ${bodyXml}
        <w:sectPr>
            <w:pgSz w:w="11906" w:h="16838"/>
            <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
        </w:sectPr>
    </w:body>
</w:document>`);

            // word/styles.xml
            zip.file('word/styles.xml',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
        <w:name w:val="Normal"/>
        <w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading1">
        <w:name w:val="heading 1"/>
        <w:pPr><w:outlineLvl w:val="0"/></w:pPr>
        <w:rPr><w:b/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading2">
        <w:name w:val="heading 2"/>
        <w:pPr><w:outlineLvl w:val="1"/></w:pPr>
        <w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading3">
        <w:name w:val="heading 3"/>
        <w:pPr><w:outlineLvl w:val="2"/></w:pPr>
        <w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading4">
        <w:name w:val="heading 4"/>
        <w:pPr><w:outlineLvl w:val="3"/></w:pPr>
        <w:rPr><w:b/><w:i/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
    </w:style>
    <w:style w:type="table" w:styleId="TableNormal">
        <w:name w:val="Normal Table"/>
        <w:tblPr>
            <w:tblBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tblBorders>
        </w:tblPr>
    </w:style>
</w:styles>`);

            // word/settings.xml
            zip.file('word/settings.xml',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:defaultTabStop w:val="720"/>
    <w:characterSpacingControl w:val="doNotCompress"/>
</w:settings>`);

            // word/numbering.xml (liste desteği)
            zip.file('word/numbering.xml',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:abstractNum w:abstractNumId="0">
        <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>
            <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
        </w:lvl>
    </w:abstractNum>
    <w:abstractNum w:abstractNumId="1">
        <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/>
            <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
        </w:lvl>
    </w:abstractNum>
    <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
    <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`);

            // word/_rels/document.xml.rels
            let relsEntries = `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    <Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
    <Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`;

            images.forEach(img => {
                relsEntries += `\n    <Relationship Id="${img.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${img.fileName}"/>`;
            });

            zip.file('word/_rels/document.xml.rels',
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    ${relsEntries}
</Relationships>`);

            // word/media/ → görselleri fiziksel dosya olarak ekle
            images.forEach(img => {
                zip.file(`word/media/${img.fileName}`, img.data, { binary: true });
            });

            // ── 6. ZIP'i oluştur ve indir ──
            const blob = await zip.generateAsync({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'belge.docx';
            a.click();
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error('Word dışa aktarma hatası:', err);
            alert('Word dosyası oluşturulurken hata meydana geldi: ' + err.message);
        } finally {
            document.body.removeChild(overlay);
        }
    }

    // ──────────────────────────────────────────────
    //  HTML → OOXML Dönüştürücü
    // ──────────────────────────────────────────────

    function htmlToOoxml(container, images) {
        let xml = '';
        const children = container.childNodes;

        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            xml += processNode(node, images, {});
        }

        // Hiç paragraf üretilemediyse boş bir paragraf koy
        if (!xml.trim()) {
            xml = '<w:p><w:r><w:t> </w:t></w:r></w:p>';
        }

        return xml;
    }

    function processNode(node, images, formatting) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (!text || !text.trim()) return '';
            return ''; // Metin düğümleri run içinde işlenir
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.tagName.toLowerCase();

        // Heading'ler
        if (/^h[1-4]$/.test(tag)) {
            const level = tag.charAt(1);
            const styleId = `Heading${level}`;
            const runs = collectRuns(node, images, {});
            return `<w:p><w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>${runs}</w:p>`;
        }

        // Paragraf
        if (tag === 'p' || tag === 'div') {
            const runs = collectRuns(node, images, {});
            if (!runs) return '';
            
            // Stil özelliklerini al
            let pPr = '<w:pPr>';
            const style = node.getAttribute('style') || '';
            const align = extractAlign(style, node);
            if (align) pPr += `<w:jc w:val="${align}"/>`;
            pPr += '</w:pPr>';

            return `<w:p>${pPr}${runs}</w:p>`;
        }

        // Alıntı bloğu
        if (tag === 'blockquote') {
            const runs = collectRuns(node, images, {});
            return `<w:p><w:pPr><w:ind w:left="720"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="4" w:color="CCCCCC"/></w:pBdr></w:pPr>${runs}</w:p>`;
        }

        // Kod bloğu
        if (tag === 'pre') {
            const text = node.textContent || '';
            const lines = text.split('\n');
            let xml = '';
            lines.forEach(line => {
                xml += `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
            });
            return xml;
        }

        // Sırasız liste
        if (tag === 'ul') {
            return processListItems(node, images, '1');
        }

        // Sıralı liste
        if (tag === 'ol') {
            return processListItems(node, images, '2');
        }

        // Tablo
        if (tag === 'table') {
            return processTable(node, images);
        }

        // BR
        if (tag === 'br') {
            return '<w:p></w:p>';
        }

        // HR
        if (tag === 'hr') {
            return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>`;
        }

        // Diğer blok elemanlar → çocuklarını işle
        let xml = '';
        for (let i = 0; i < node.childNodes.length; i++) {
            xml += processNode(node.childNodes[i], images, formatting);
        }
        return xml;
    }

    function processListItems(listNode, images, numId) {
        let xml = '';
        const items = listNode.querySelectorAll(':scope > li');
        items.forEach(li => {
            const runs = collectRuns(li, images, {});
            xml += `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>${runs}</w:p>`;
        });
        return xml;
    }

    function processTable(tableNode, images) {
        let xml = '<w:tbl>';

        // Tablo özellikleri
        xml += `<w:tblPr>
            <w:tblStyle w:val="TableNormal"/>
            <w:tblW w:w="0" w:type="auto"/>
            <w:tblBorders>
                <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
                <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
            </w:tblBorders>
        </w:tblPr>`;

        const rows = tableNode.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr');
        rows.forEach(tr => {
            xml += '<w:tr>';
            const cells = tr.querySelectorAll(':scope > td, :scope > th');
            cells.forEach(cell => {
                xml += '<w:tc>';

                // Hücre arka plan rengi
                let tcPr = '<w:tcPr>';
                const bgColor = cell.style.backgroundColor;
                if (bgColor) {
                    const hex = rgbToHex(bgColor);
                    if (hex) tcPr += `<w:shd w:val="clear" w:color="auto" w:fill="${hex}"/>`;
                }

                // Colspan / Rowspan
                const colspan = cell.getAttribute('colspan');
                if (colspan && parseInt(colspan) > 1) {
                    tcPr += `<w:gridSpan w:val="${colspan}"/>`;
                }
                const rowspan = cell.getAttribute('rowspan');
                if (rowspan && parseInt(rowspan) > 1) {
                    tcPr += `<w:vMerge w:val="restart"/>`;
                }
                tcPr += '</w:tcPr>';

                const runs = collectRuns(cell, images, {});
                xml += `${tcPr}<w:p>${runs || '<w:r><w:t> </w:t></w:r>'}</w:p>`;
                xml += '</w:tc>';
            });
            xml += '</w:tr>';
        });

        xml += '</w:tbl>';
        return xml;
    }

    /**
     * Bir HTML elemanının çocuklarını gezip OOXML <w:r> (run) dizisi oluşturur.
     * Inline elementler (b, i, u, span, a) ve img'leri destekler.
     */
    function collectRuns(element, images, parentFormatting) {
        let runs = '';

        for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes[i];

            if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent;
                if (!text) continue;
                const rPr = buildRunProperties(parentFormatting);
                runs += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
                continue;
            }

            if (child.nodeType !== Node.ELEMENT_NODE) continue;

            const tag = child.tagName.toLowerCase();

            // Resim
            if (tag === 'img') {
                const imgId = child.getAttribute('data-docx-img-id');
                if (imgId) {
                    const imgInfo = images.find(im => im.id === parseInt(imgId));
                    if (imgInfo) {
                        runs += buildImageRun(imgInfo);
                    }
                }
                continue;
            }

            // BR
            if (tag === 'br') {
                runs += '<w:r><w:br/></w:r>';
                continue;
            }

            // Block-level elements inside inline context → recursive processNode
            if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'table', 'blockquote', 'pre', 'hr'].includes(tag)) {
                // End current paragraph context would be complex, just flatten the content
                runs += collectRuns(child, images, parentFormatting);
                continue;
            }

            // Inline formatting
            const fmt = Object.assign({}, parentFormatting);
            if (tag === 'b' || tag === 'strong') fmt.bold = true;
            if (tag === 'i' || tag === 'em') fmt.italic = true;
            if (tag === 'u') fmt.underline = true;
            if (tag === 's' || tag === 'strike' || tag === 'del') fmt.strike = true;
            if (tag === 'sub') fmt.subscript = true;
            if (tag === 'sup') fmt.superscript = true;
            if (tag === 'a') fmt.underline = true;

            // Span ile inline stiller
            if (tag === 'span' || tag === 'font') {
                const style = child.getAttribute('style') || '';
                if (/font-weight\s*:\s*(bold|[7-9]00)/i.test(style)) fmt.bold = true;
                if (/font-style\s*:\s*italic/i.test(style)) fmt.italic = true;
                if (/text-decoration[^;]*underline/i.test(style)) fmt.underline = true;
                if (/text-decoration[^;]*line-through/i.test(style)) fmt.strike = true;

                const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
                if (colorMatch) {
                    const hex = colorToHex(colorMatch[1].trim());
                    if (hex) fmt.color = hex;
                }

                const bgMatch = style.match(/background-color\s*:\s*([^;]+)/i);
                if (bgMatch) {
                    const hex = colorToHex(bgMatch[1].trim());
                    if (hex) fmt.highlight = hex;
                }

                const sizeMatch = style.match(/font-size\s*:\s*(\d+(?:\.\d+)?)\s*px/i);
                if (sizeMatch) {
                    // px → half-points (1pt = 2 half-points, 1px ≈ 0.75pt)
                    fmt.fontSize = Math.round(parseFloat(sizeMatch[1]) * 1.5);
                }

                const fontMatch = style.match(/font-family\s*:\s*([^;]+)/i);
                if (fontMatch) {
                    fmt.fontFamily = fontMatch[1].replace(/['"]/g, '').split(',')[0].trim();
                }
            }

            runs += collectRuns(child, images, fmt);
        }

        return runs;
    }

    function buildRunProperties(fmt) {
        if (!fmt || Object.keys(fmt).length === 0) return '';
        let rPr = '<w:rPr>';
        if (fmt.bold) rPr += '<w:b/>';
        if (fmt.italic) rPr += '<w:i/>';
        if (fmt.underline) rPr += '<w:u w:val="single"/>';
        if (fmt.strike) rPr += '<w:strike/>';
        if (fmt.superscript) rPr += '<w:vertAlign w:val="superscript"/>';
        if (fmt.subscript) rPr += '<w:vertAlign w:val="subscript"/>';
        if (fmt.color) rPr += `<w:color w:val="${fmt.color}"/>`;
        if (fmt.highlight) rPr += `<w:shd w:val="clear" w:color="auto" w:fill="${fmt.highlight}"/>`;
        if (fmt.fontSize) rPr += `<w:sz w:val="${fmt.fontSize}"/><w:szCs w:val="${fmt.fontSize}"/>`;
        if (fmt.fontFamily) rPr += `<w:rFonts w:ascii="${escapeXml(fmt.fontFamily)}" w:hAnsi="${escapeXml(fmt.fontFamily)}"/>`;
        rPr += '</w:rPr>';
        return rPr === '<w:rPr></w:rPr>' ? '' : rPr;
    }

    function buildImageRun(imgInfo) {
        return `<w:r>
            <w:drawing>
                <wp:inline distT="0" distB="0" distL="0" distR="0">
                    <wp:extent cx="${imgInfo.widthEmu}" cy="${imgInfo.heightEmu}"/>
                    <wp:docPr id="${imgInfo.id}" name="${imgInfo.fileName}"/>
                    <a:graphic>
                        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                            <pic:pic>
                                <pic:nvPicPr>
                                    <pic:cNvPr id="${imgInfo.id}" name="${imgInfo.fileName}"/>
                                    <pic:cNvPicPr/>
                                </pic:nvPicPr>
                                <pic:blipFill>
                                    <a:blip r:embed="${imgInfo.rId}"/>
                                    <a:stretch><a:fillRect/></a:stretch>
                                </pic:blipFill>
                                <pic:spPr>
                                    <a:xfrm>
                                        <a:off x="0" y="0"/>
                                        <a:ext cx="${imgInfo.widthEmu}" cy="${imgInfo.heightEmu}"/>
                                    </a:xfrm>
                                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                                </pic:spPr>
                            </pic:pic>
                        </a:graphicData>
                    </a:graphic>
                </wp:inline>
            </w:drawing>
        </w:r>`;
    }

    // ──────────────────────────────────────────────
    //  Yardımcı Fonksiyonlar
    // ──────────────────────────────────────────────

    function escapeXml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;');
    }

    function extractAlign(style, el) {
        const match = style.match(/text-align\s*:\s*(left|center|right|justify)/i);
        if (match) {
            const val = match[1].toLowerCase();
            if (val === 'left') return 'left';
            if (val === 'center') return 'center';
            if (val === 'right') return 'right';
            if (val === 'justify') return 'both';
        }
        const align = el.getAttribute('align');
        if (align) {
            if (align === 'center') return 'center';
            if (align === 'right') return 'right';
            if (align === 'justify') return 'both';
        }
        return '';
    }

    function colorToHex(colorStr) {
        if (!colorStr) return '';
        colorStr = colorStr.trim();
        if (colorStr.startsWith('#')) return colorStr.replace('#', '').toUpperCase();
        const rgbMatch = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
            const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
            const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
            return (r + g + b).toUpperCase();
        }
        return '';
    }

    function rgbToHex(color) {
        if (!color) return '';
        if (color.startsWith('#')) return color.replace('#', '').toUpperCase();
        const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (match) {
            return [match[1], match[2], match[3]]
                .map(n => parseInt(n).toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase();
        }
        return '';
    }

    return {
        importDocx,
        exportDocx
    };
})();
