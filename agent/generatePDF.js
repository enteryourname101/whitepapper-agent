const PDFDocument = require('pdfkit');
const crypto      = require('crypto');

/**
 * Parsuje strukturovaný text whitepaperu na sekce.
 */
function parseContent(raw) {
  const lines   = raw.split('\n');
  let title     = 'Whitepaper';
  let abstract  = '';
  const sections = [];

  // Vytáhni TITLE a ABSTRACT z hlavičky
  for (const line of lines) {
    if (line.startsWith('TITLE:'))    title    = line.replace('TITLE:', '').trim();
    if (line.startsWith('ABSTRACT:')) abstract = line.replace('ABSTRACT:', '').trim();
  }

  // Rozděl zbytek na sekce podle '---'
  const parts = raw.split('---').slice(1); // první část = header
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const firstNewline = trimmed.indexOf('\n');
    if (firstNewline === -1) continue;
    const heading = trimmed.slice(0, firstNewline).trim();
    const body    = trimmed.slice(firstNewline).trim();
    if (heading && body) sections.push({ heading, body });
  }

  return { title, abstract, sections };
}

/**
 * Renderuje PDF z obsahu whitepaperu.
 * Vrací { pdfBuffer, filename, pdfHash }
 */
function generatePDF(topic, rawContent) {
  return new Promise((resolve, reject) => {
    try {
      const { title, abstract, sections } = parseContent(rawContent);
      const doc = new PDFDocument({ margin: 72, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const pdfHash   = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
        const slug      = topic
          .toLowerCase()
          .replace(/[^a-z0-9\u00c0-\u024f]+/gi, '-')
          .slice(0, 60)
          .replace(/-+$/, '');
        const filename  = `${slug}-${Date.now()}.pdf`;
        resolve({ pdfBuffer, filename, pdfHash });
      });

      doc.on('error', reject);

      // ── Barvy & fonty ─────────────────────────────────────
      const BLACK  = '#111111';
      const MUTED  = '#555555';
      const ACCENT = '#1A1916';
      const LINE   = '#E2DFD6';

      // ── Hlavička ──────────────────────────────────────────
      doc
        .rect(0, 0, doc.page.width, 180)
        .fill('#F8F7F4');

      doc
        .fillColor(ACCENT)
        .fontSize(9)
        .font('Helvetica')
        .text('whitepapper.click · NEAR Protocol', 72, 60, { align: 'left' });

      doc
        .fillColor(BLACK)
        .fontSize(26)
        .font('Helvetica-Bold')
        .text(title, 72, 85, { width: doc.page.width - 144, align: 'left' });

      doc.moveDown(0.5);

      // Datum
      const dateStr = new Date().toLocaleDateString('cs-CZ', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      doc
        .fillColor(MUTED)
        .fontSize(9)
        .font('Helvetica')
        .text(dateStr, { align: 'left' });

      // Oddělovač
      doc.moveDown(1.5);
      doc
        .moveTo(72, doc.y)
        .lineTo(doc.page.width - 72, doc.y)
        .strokeColor(LINE)
        .lineWidth(1)
        .stroke();
      doc.moveDown(1);

      // ── Abstract ──────────────────────────────────────────
      if (abstract) {
        doc
          .fillColor(MUTED)
          .fontSize(10)
          .font('Helvetica-Oblique')
          .text(abstract, { align: 'justify' });
        doc.moveDown(1.5);
      }

      // ── Sekce ────────────────────────────────────────────
      for (const { heading, body } of sections) {
        // Heading
        doc
          .fillColor(BLACK)
          .fontSize(13)
          .font('Helvetica-Bold')
          .text(heading);

        doc.moveDown(0.4);

        // Body — zalomit na odstavce
        const paragraphs = body.split('\n\n').filter(p => p.trim());
        for (const para of paragraphs) {
          doc
            .fillColor('#222222')
            .fontSize(10.5)
            .font('Helvetica')
            .text(para.replace(/\n/g, ' '), { align: 'justify', lineGap: 2 });
          doc.moveDown(0.5);
        }

        doc.moveDown(0.8);
      }

      // ── Footer ───────────────────────────────────────────
      const pageBottom = doc.page.height - 50;
      doc
        .moveTo(72, pageBottom - 10)
        .lineTo(doc.page.width - 72, pageBottom - 10)
        .strokeColor(LINE)
        .lineWidth(0.5)
        .stroke();

      doc
        .fillColor(MUTED)
        .fontSize(8)
        .text(
          `Generováno agentem whitepapper.click · Ověřeno na NEAR Protocolu`,
          72, pageBottom,
          { align: 'center', width: doc.page.width - 144 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePDF };
