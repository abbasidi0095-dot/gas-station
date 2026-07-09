import PDFDocument from 'pdfkit';
import fs from 'fs';

const logoBufPromise = Promise.resolve(fs.readFileSync('./assets/logo-hires-full.png'));

function format(n) {
  return (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH';
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export async function generateDailyReport({ date, totalRevenue, totalCharges, net, charges, revenue }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));

  return new Promise(async (resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 80;
    const leftMargin = 40;

    const logoBuf = await logoBufPromise;
    doc.image(logoBuf, leftMargin + (pageWidth - 90) / 2, 25, { width: 90 });
    doc.y = 130;

    doc.fontSize(18).font('Helvetica-Bold').text('Rapport Quotidien', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(`Al Mohit Station — ${date}`, { align: 'center' });
    doc.moveDown(1.5);

    // Greeting
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1f2937').text('Bonjour Mr Salami,', leftMargin);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#4b5563')
      .text('Veuillez trouver ci-dessous le récapitulatif financier de la journée.', leftMargin);
    doc.moveDown(1.5);

    // Summary table
    const summaryTop = doc.y;
    const green = '#059669';
    const red = '#dc2626';

    // Revenue box
    doc.rect(leftMargin, summaryTop, (pageWidth / 2) - 5, 55).fill('#f0fdf4').stroke('#bbf7d0');
    doc.fillColor('#166534').fontSize(9).font('Helvetica').text('REVENU TOTAL', leftMargin + 10, summaryTop + 8);
    doc.fillColor('#166534').fontSize(18).font('Helvetica-Bold').text(format(totalRevenue), leftMargin + 10, summaryTop + 22);

    // Charges box
    doc.rect(leftMargin + (pageWidth / 2) + 5, summaryTop, (pageWidth / 2) - 5, 55).fill('#fef2f2').stroke('#fecaca');
    doc.fillColor('#991b1b').fontSize(9).font('Helvetica').text('DÉPENSES TOTALES', leftMargin + (pageWidth / 2) + 15, summaryTop + 8);
    doc.fillColor('#991b1b').fontSize(18).font('Helvetica-Bold').text(format(totalCharges), leftMargin + (pageWidth / 2) + 15, summaryTop + 22);

    // Net box
    doc.moveDown(6);
    const netTop = doc.y;
    const netColor = net >= 0 ? green : red;
    doc.rect(leftMargin, netTop, pageWidth, 45).fill('#f9fafb').stroke('#e5e7eb');
    doc.fillColor('#6b7280').fontSize(9).font('Helvetica').text('RÉSULTAT NET', leftMargin + 10, netTop + 8);
    doc.fillColor(netColor).fontSize(20).font('Helvetica-Bold').text(format(Math.abs(net)), leftMargin + 10, netTop + 18);
    doc.fillColor(netColor).fontSize(9).font('Helvetica').text(net >= 0 ? 'Bénéfice' : 'Perte', leftMargin + 150, netTop + 22);

    doc.moveDown(3);

    if (charges.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1f2937').text('Détail des Dépenses', leftMargin);
      doc.moveDown(0.8);

      const chargeHeaderY = doc.y;
      doc.rect(leftMargin, chargeHeaderY, pageWidth, 18).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold');
      const cols = [
        { x: 0, w: 80, label: 'Date' },
        { x: 85, w: 100, label: 'Fournisseur' },
        { x: 190, w: 120, label: 'Catégorie' },
        { x: 315, w: 120, label: 'Description' },
        { x: 440, w: 80, label: 'Montant', align: 'right' },
      ];
      cols.forEach((c) => {
        doc.text(c.label, leftMargin + c.x, chargeHeaderY + 4, { width: c.w, align: c.align || 'left' });
      });

      doc.moveDown(1.5);
      let chargeY = doc.y;
      charges.forEach((ch, i) => {
        if (chargeY > doc.page.height - 60) {
          doc.addPage();
          chargeY = doc.y;
        }
        if (i % 2 === 0) {
          doc.rect(leftMargin, chargeY - 2, pageWidth, 16).fill('#f9fafb');
        }
        doc.fillColor('#4b5563').fontSize(8).font('Helvetica');
        doc.text(fmtDate(ch.date), leftMargin, chargeY, { width: 80 });
        doc.text(ch.vendor?.name || '—', leftMargin + 85, chargeY, { width: 100 });
        doc.text(ch.category || '—', leftMargin + 190, chargeY, { width: 120 });
        doc.text((ch.description || '').substring(0, 30), leftMargin + 315, chargeY, { width: 120 });
        doc.font('Helvetica-Bold').text(format(ch.amount), leftMargin + 440, chargeY, { width: 80, align: 'right' });
        doc.font('Helvetica');
        chargeY += 16;
      });
    }

    if (revenue.length > 0) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1f2937').text('Détail des Revenus', leftMargin);
      doc.moveDown(0.8);

      const revHeaderY = doc.y;
      doc.rect(leftMargin, revHeaderY, pageWidth, 18).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold');
      const rCols = [
        { x: 0, w: 80, label: 'Date' },
        { x: 85, w: 100, label: 'Catégorie' },
        { x: 190, w: 80, label: 'Type' },
        { x: 275, w: 160, label: 'Description' },
        { x: 440, w: 80, label: 'Montant', align: 'right' },
      ];
      rCols.forEach((c) => {
        doc.text(c.label, leftMargin + c.x, revHeaderY + 4, { width: c.w, align: c.align || 'left' });
      });

      doc.moveDown(1.5);
      let revY = doc.y;
      revenue.forEach((r, i) => {
        if (revY > doc.page.height - 60) {
          doc.addPage();
          revY = doc.y;
        }
        if (i % 2 === 0) {
          doc.rect(leftMargin, revY - 2, pageWidth, 16).fill('#f9fafb');
        }
        doc.fillColor('#4b5563').fontSize(8).font('Helvetica');
        doc.text(fmtDate(r.date), leftMargin, revY, { width: 80 });
        doc.text(r.category || '—', leftMargin + 85, revY, { width: 100 });
        doc.text(r.fuelType || '—', leftMargin + 190, revY, { width: 80 });
        doc.text((r.description || '').substring(0, 40), leftMargin + 275, revY, { width: 160 });
        doc.font('Helvetica-Bold').text(format(r.amount), leftMargin + 440, revY, { width: 80, align: 'right' });
        doc.font('Helvetica');
        revY += 16;
      });
    }

    const footerY = doc.page.height - 40;
    doc.fontSize(7).fillColor('#9ca3af').text(
      'Al Mohit Station — Rapport généré automatiquement',
      leftMargin, footerY, { align: 'center' }
    );

    doc.end();
  });
}