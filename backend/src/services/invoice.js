import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INVOICES_DIR = path.join(__dirname, '..', '..', 'invoices');

if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
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

function pad(n, w) {
  return String(n).padStart(w, '0');
}

export async function generateInvoice(charge, invoiceNumber) {
  const num = `INV-${pad(invoiceNumber, 4)}`;
  const filename = `facture-${num}.pdf`;
  const filePath = path.join(INVOICES_DIR, filename);

  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const leftMargin = 40;
    const pageWidth = doc.page.width - 80;

    // Logo + Header
    const logoBuf = await logoBufPromise;
    doc.image(logoBuf, leftMargin + (pageWidth - 90) / 2, 25, { width: 90 });

    // Wave lines as brand accent below the logo
    const waveY = 130;
    doc.moveTo(leftMargin, waveY).lineTo(leftMargin + pageWidth, waveY)
      .strokeColor('#d97706').lineWidth(2).stroke();
    doc.moveTo(leftMargin, waveY + 3).lineTo(leftMargin + pageWidth, waveY + 3)
      .strokeColor('#047857').lineWidth(1).stroke();
    doc.y = waveY + 15;

    // Invoice title
    doc.moveDown(2);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1f2937')
      .text('FACTURE', { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
      .text(`N° ${num}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.text(`Date d'émission : ${fmtDate(new Date())}`, { align: 'center' });

    doc.moveDown(2);

    // Seller info
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1f2937').text('N HOLDING DAKHLA');
    doc.fontSize(9).font('Helvetica').fillColor('#4b5563');
    doc.text('Station Al Mohit');
    doc.text('Dakhla, Maroc');
    doc.text('ICE: XXXXXXXX | RC: XXXXX');

    doc.moveDown(2);

    // Charge details card
    doc.rect(leftMargin, doc.y, pageWidth, 30).fill('#f3f4f6').stroke('#e5e7eb');
    const headerY = doc.y;
    doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold');
    const cols = [
      { x: 0, w: 120, label: 'Date' },
      { x: 125, w: 120, label: 'Catégorie' },
      { x: 250, w: 120, label: 'Fournisseur' },
      { x: 375, w: 80, label: 'Description' },
      { x: 460, w: 60, label: 'Montant', align: 'right' },
    ];
    cols.forEach((c) => {
      doc.text(c.label, leftMargin + c.x, headerY + 8, { width: c.w, align: c.align || 'left' });
    });

    doc.moveDown(2);
    const rowY = doc.y;
    doc.fillColor('#4b5563').fontSize(9).font('Helvetica');
    doc.text(fmtDate(charge.date), leftMargin, rowY, { width: 120 });
    doc.text(charge.category || '—', leftMargin + 125, rowY, { width: 120 });
    doc.text(charge.vendor?.name || '—', leftMargin + 250, rowY, { width: 120 });
    doc.text((charge.description || '').substring(0, 20), leftMargin + 375, rowY, { width: 80 });
    doc.font('Helvetica-Bold').text(format(charge.amount), leftMargin + 460, rowY, { width: 60, align: 'right' });

    // Total
    doc.moveDown(2);
    const totalY = doc.y;
    doc.rect(leftMargin, totalY, pageWidth, 30).fill('#f0fdf4').stroke('#bbf7d0');
    doc.fillColor('#166534').fontSize(11).font('Helvetica-Bold')
      .text('TOTAL TTC', leftMargin + 350, totalY + 8);
    doc.text(format(charge.amount), leftMargin + 460, totalY + 8, { width: 60, align: 'right' });

    // Footer
    const footerY = doc.page.height - 60;
    doc.lineWidth(0.5).strokeColor('#e5e7eb')
      .moveTo(leftMargin, footerY).lineTo(leftMargin + pageWidth, footerY).stroke();
    doc.fontSize(7).fillColor('#9ca3af').font('Helvetica')
      .text('N HOLDING DAKHLA (AL MOHIT) — Station Al Mohit — Dakhla, Maroc', leftMargin, footerY + 8, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve({ num, filePath, filename }));
    stream.on('error', reject);
  });
}

export async function generateConsolidatedInvoice(charges, invoiceNumber) {
  const num = `INV-${pad(invoiceNumber, 4)}`;
  const filename = `facture-${num}.pdf`;
  const filePath = path.join(INVOICES_DIR, filename);

  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const leftMargin = 40;
    const pageWidth = doc.page.width - 80;

    const logoBuf = await logoBufPromise;
    doc.image(logoBuf, leftMargin + (pageWidth - 90) / 2, 25, { width: 90 });

    const waveY = 130;
    doc.moveTo(leftMargin, waveY).lineTo(leftMargin + pageWidth, waveY)
      .strokeColor('#d97706').lineWidth(2).stroke();
    doc.moveTo(leftMargin, waveY + 3).lineTo(leftMargin + pageWidth, waveY + 3)
      .strokeColor('#047857').lineWidth(1).stroke();
    doc.y = waveY + 15;

    doc.moveDown(2);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1f2937')
      .text('FACTURE CONSOLIDÉE', { align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
      .text(`N° ${num}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.text(`Date d'émission : ${fmtDate(new Date())}`, { align: 'center' });
    doc.text(`${charges.length} charge(s) incluse(s)`, { align: 'center' });

    doc.moveDown(2);

    const totalAmount = charges.reduce((s, c) => s + c.amount, 0);

    doc.rect(leftMargin, doc.y, pageWidth, 25).fill('#f3f4f6').stroke('#e5e7eb');
    const headerY = doc.y;
    doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold');
    const cols = [
      { x: 0, w: 80, label: 'Date' },
      { x: 85, w: 100, label: 'Catégorie' },
      { x: 190, w: 100, label: 'Fournisseur' },
      { x: 295, w: 100, label: 'Description' },
      { x: 400, w: 60, label: 'Facture' },
      { x: 465, w: 55, label: 'Montant', align: 'right' },
    ];
    cols.forEach((c) => {
      doc.text(c.label, leftMargin + c.x, headerY + 7, { width: c.w, align: c.align || 'left' });
    });

    doc.moveDown(1.5);
    let rowY = doc.y;
    charges.forEach((ch, i) => {
      if (rowY > doc.page.height - 80) {
        doc.addPage();
        rowY = doc.y;
      }
      if (i % 2 === 0) doc.rect(leftMargin, rowY - 2, pageWidth, 16).fill('#f9fafb');
      doc.fillColor('#4b5563').fontSize(8).font('Helvetica');
      doc.text(fmtDate(ch.date), leftMargin, rowY, { width: 80 });
      doc.text(ch.category || '—', leftMargin + 85, rowY, { width: 100 });
      doc.text(ch.vendor?.name || '—', leftMargin + 190, rowY, { width: 100 });
      doc.text((ch.description || '').substring(0, 18), leftMargin + 295, rowY, { width: 100 });
      doc.text(ch.invoice?.invoiceNumber ? `INV-${pad(ch.invoice.invoiceNumber, 4)}` : '—', leftMargin + 400, rowY, { width: 60 });
      doc.font('Helvetica-Bold').text(format(ch.amount), leftMargin + 465, rowY, { width: 55, align: 'right' });
      doc.font('Helvetica');
      rowY += 16;
    });

    doc.moveDown(1);
    const totalY = doc.y;
    doc.rect(leftMargin, totalY, pageWidth, 28).fill('#f0fdf4').stroke('#bbf7d0');
    doc.fillColor('#166534').fontSize(11).font('Helvetica-Bold')
      .text('TOTAL TTC', leftMargin + 350, totalY + 7);
    doc.text(format(totalAmount), leftMargin + 465, totalY + 7, { width: 55, align: 'right' });

    const footerY = doc.page.height - 60;
    doc.lineWidth(0.5).strokeColor('#e5e7eb')
      .moveTo(leftMargin, footerY).lineTo(leftMargin + pageWidth, footerY).stroke();
    doc.fontSize(7).fillColor('#9ca3af').font('Helvetica')
      .text('N HOLDING DAKHLA (AL MOHIT) — Station Al Mohit — Dakhla, Maroc', leftMargin, footerY + 8, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve({ num, filePath, filename }));
    stream.on('error', reject);
  });
}
