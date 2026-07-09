import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAYSLIPS_DIR = path.join(__dirname, '..', '..', 'invoices');

if (!fs.existsSync(PAYSLIPS_DIR)) {
  fs.mkdirSync(PAYSLIPS_DIR, { recursive: true });
}

const logoBufPromise = Promise.resolve(fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'logo-hires-full.png')));

function format(n) {
  return (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH';
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export function generatePayslip({ worker, payments, period }) {
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const filename = `fiche-paie-${worker.name.replace(/\s+/g, '-')}-${period}.pdf`;
  const filePath = path.join(PAYSLIPS_DIR, filename);

  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const leftMargin = 40;
    const pageWidth = doc.page.width - 80;

    // Logo + Header
    const logoBuf = await logoBufPromise;
    doc.image(logoBuf, leftMargin + (pageWidth - 90) / 2, 25, { width: 90 });

    const waveY = 130;
    doc.moveTo(leftMargin, waveY).lineTo(leftMargin + pageWidth, waveY)
      .strokeColor('#d97706').lineWidth(2).stroke();
    doc.moveTo(leftMargin, waveY + 3).lineTo(leftMargin + pageWidth, waveY + 3)
      .strokeColor('#047857').lineWidth(1).stroke();
    doc.y = waveY + 15;

    doc.moveDown(2);
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1f2937')
      .text('FICHE DE PAIE', { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
      .text(`Période : ${period}`, { align: 'center' });
    doc.text(`Date d'édition : ${fmtDate(new Date())}`, { align: 'center' });

    doc.moveDown(2);

    // Worker info
    doc.rect(leftMargin, doc.y, pageWidth, 70).fill('#f9fafb').stroke('#e5e7eb');
    const infoY = doc.y;
    doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold').text('INFORMATIONS EMPLOYÉ', leftMargin + 10, infoY + 8);
    doc.fillColor('#4b5563').fontSize(9).font('Helvetica');
    doc.text(`Nom : ${worker.name}`, leftMargin + 10, infoY + 24);
    doc.text(`CIN : ${worker.cin}`, leftMargin + 200, infoY + 24);
    doc.text(`Poste : ${worker.position}`, leftMargin + 10, infoY + 38);
    doc.text(`Téléphone : ${worker.phone}`, leftMargin + 200, infoY + 38);

    doc.moveDown(4);

    // Payments table
    doc.rect(leftMargin, doc.y, pageWidth, 22).fill('#f3f4f6').stroke('#e5e7eb');
    const headerY = doc.y;
    doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold');
    doc.text('Date', leftMargin + 10, headerY + 5, { width: 100 });
    doc.text('Description', leftMargin + 150, headerY + 5, { width: 200 });
    doc.text('Montant', leftMargin + 400, headerY + 5, { width: 100, align: 'right' });

    doc.moveDown(1.5);
    let rowY = doc.y;
    payments.forEach((p, i) => {
      if (rowY > doc.page.height - 80) {
        doc.addPage();
        rowY = doc.y;
        doc.rect(leftMargin, rowY, pageWidth, 22).fill('#f3f4f6').stroke('#e5e7eb');
        const h2 = doc.y;
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold');
        doc.text('Date', leftMargin + 10, h2 + 5, { width: 100 });
        doc.text('Description', leftMargin + 150, h2 + 5, { width: 200 });
        doc.text('Montant', leftMargin + 400, h2 + 5, { width: 100, align: 'right' });
        doc.moveDown(1.5);
        rowY = doc.y;
      }
      if (i % 2 === 0) doc.rect(leftMargin, rowY - 2, pageWidth, 18).fill('#f9fafb');
      doc.fillColor('#4b5563').fontSize(9).font('Helvetica');
      doc.text(fmtDate(p.date), leftMargin + 10, rowY, { width: 100 });
      doc.text(p.description || '—', leftMargin + 150, rowY, { width: 200 });
      doc.font('Helvetica-Bold').text(format(p.amount), leftMargin + 400, rowY, { width: 100, align: 'right' });
      doc.font('Helvetica');
      rowY += 18;
    });

    // Total
    doc.moveDown(1);
    const totalY = doc.y;
    doc.rect(leftMargin, totalY, pageWidth, 30).fill('#f0fdf4').stroke('#bbf7d0');
    doc.fillColor('#166534').fontSize(11).font('Helvetica-Bold')
      .text('TOTAL BRUT', leftMargin + 300, totalY + 8);
    doc.text(format(total), leftMargin + 400, totalY + 8, { width: 100, align: 'right' });

    const footerY = doc.page.height - 60;
    doc.lineWidth(0.5).strokeColor('#e5e7eb')
      .moveTo(leftMargin, footerY).lineTo(leftMargin + pageWidth, footerY).stroke();
    doc.fontSize(7).fillColor('#9ca3af').font('Helvetica')
      .text('N HOLDING DAKHLA (AL MOHIT) — Station Al Mohit — Dakhla, Maroc', leftMargin, footerY + 8, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve({ filePath, filename }));
    stream.on('error', reject);
  });
}
