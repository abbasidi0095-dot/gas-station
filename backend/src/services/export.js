import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import sharp from 'sharp';

async function svgToPngBuffer(svgPath, size) {
  const svg = fs.readFileSync(svgPath);
  const buf = await sharp(svg)
    .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return buf;
}

function groupByDate(records) {
  const map = {};
  for (const r of records) {
    const key = new Date(r.date).toISOString().split('T')[0];
    if (!map[key]) map[key] = [];
    map[key].push(r);
  }
  const sorted = Object.keys(map).sort();
  return sorted.map(d => ({ date: d, records: map[d] }));
}

function isAlMohit(r) {
  return r.vendor && r.vendor.name === 'Al Mohit';
}

export async function generateExcelExport({ range, startDate, endDate, revenues, charges, receipts, totals }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Al Mohit Gas Station';
  workbook.lastModifiedBy = 'Al Mohit Gas Station';
  workbook.created = new Date();

  const formattedStart = new Date(startDate).toLocaleDateString();
  const formattedEnd = new Date(endDate).toLocaleDateString();

  // ==========================================
  // SHEET 1: Summary Dashboard
  // ==========================================
  const summarySheet = workbook.addWorksheet('Dashboard Summary');
  summarySheet.views = [{ showGridLines: true }];

  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'AL MOHIT GAS STATION — SUMMARY';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 40;

  summarySheet.addRow([]);
  summarySheet.addRow(['Report Period:', `${formattedStart} to ${formattedEnd}`, '', 'Generated Date:', new Date().toLocaleString()]);
  summarySheet.addRow([]);

  summarySheet.addRow(['Financial Metric', 'Total Value (MAD / DH)', 'Status', 'Description']);
  summarySheet.addRow(['Total Revenue', totals.totalRevenue, 'Active', 'All fuel, store, and service sales.']);
  summarySheet.addRow(['Total Expenses (Charges)', totals.totalCharges, 'Active', 'Supplier purchases, maintenance, salaries, utilities, etc.']);
  summarySheet.addRow(['Net Profit / Margin', totals.netProfit, totals.netProfit >= 0 ? 'Healthy' : 'Deficit', 'Difference between revenue and charges.']);

  const headerRow = summarySheet.getRow(5);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5597' } };
    cell.border = { bottom: { style: 'medium' } };
  });

  for (let r = 6; r <= 8; r++) {
    const row = summarySheet.getRow(r);
    row.getCell(2).numFmt = '#,##0.00 "MAD / DH"';
    if (r === 8) {
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { bold: true, color: { argb: totals.netProfit >= 0 ? '375623' : 'C00000' } };
    }
  }

  summarySheet.getColumn(1).width = 25;
  summarySheet.getColumn(2).width = 20;
  summarySheet.getColumn(3).width = 15;
  summarySheet.getColumn(4).width = 45;

  // ==========================================
  // SHEET 2: Revenue Ledger (operation by operation with daily subtotals)
  // ==========================================
  if (revenues.length > 0) {
    const revSheet = workbook.addWorksheet('Revenue Ledger');
    revSheet.views = [{ showGridLines: true }];
    revSheet.addRow(['Daily Revenue Ledger — Operation by Operation']);
    revSheet.getRow(1).font = { size: 14, bold: true };
    revSheet.addRow(['Date', 'Vendor', 'Category', 'Amount (MAD / DH)', 'Description']);

    const revHeader = revSheet.getRow(2);
    revHeader.font = { bold: true, color: { argb: 'FFFFFF' } };
    revHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '375623' } };
    });

    const dailyGroups = groupByDate(revenues);
    let grandTotal = 0;

    for (const group of dailyGroups) {
      const rowStart = revSheet.rowCount + 1;
      group.records.forEach((r) => {
        revSheet.addRow([
          new Date(r.date).toLocaleDateString(),
          r.vendor ? r.vendor.name : '—',
          r.category.replace('_', ' ').toUpperCase(),
          r.amount,
          r.description || '',
        ]);
        if (isAlMohit(r)) {
          const rw = revSheet.lastRow;
          rw.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0' } };
            cell.font = { color: { argb: 'CC0000' } };
          });
        }
        grandTotal += r.amount;
      });

      // Daily subtotal row
      const rowEnd = revSheet.rowCount;
      const dayAmount = group.records.reduce((s, r) => s + r.amount, 0);
      const subRow = revSheet.addRow([`Daily Total — ${group.date}`, '', '', dayAmount, `(${group.records.length} operations)`]);
      subRow.font = { bold: true, italic: true };
      subRow.getCell(2).alignment = { horizontal: 'right' };
      subRow.getCell(4).numFmt = '#,##0.00 "MAD / DH"';
      const subRowCells = subRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E9' } };
      });
      revSheet.addRow([]);
    }

    // Grand total
    const grandRow = revSheet.addRow(['GRAND TOTAL REVENUE', '', '', grandTotal, `${revenues.length} total operations`]);
    grandRow.font = { bold: true, size: 12 };
    grandRow.getCell(4).numFmt = '#,##0.00 "MAD / DH"';
    grandRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C8E6C9' } };
      cell.border = {
        top: { style: 'medium' },
        bottom: { style: 'double' },
      };
    });

    revSheet.getColumn(4).numFmt = '#,##0.00';
    revSheet.getColumn(1).width = 15;
    revSheet.getColumn(2).width = 18;
    revSheet.getColumn(3).width = 20;
    revSheet.getColumn(4).width = 18;
    revSheet.getColumn(5).width = 45;
  }

  // ==========================================
  // SHEET 3: All Expenses Ledger
  // ==========================================
  if (charges.length > 0) {
    const expSheet = workbook.addWorksheet('Expenses Ledger');
    expSheet.views = [{ showGridLines: true }];
    expSheet.addRow(['Charges and Expenses Ledger']);
    expSheet.getRow(1).font = { size: 14, bold: true };
    expSheet.addRow(['Date', 'Vendor', 'Category', 'Amount (MAD / DH)', 'Description', 'Source / Receipt']);

    const expHeader = expSheet.getRow(2);
    expHeader.font = { bold: true, color: { argb: 'FFFFFF' } };
    expHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C00000' } };
    });

    charges.forEach((c) => {
      expSheet.addRow([
        new Date(c.date).toLocaleDateString(),
        c.vendor ? c.vendor.name : 'Other / Non-Vendor',
        c.category.replace('_', ' ').toUpperCase(),
        c.amount,
        c.description || '',
        c.receiptId ? 'Scanned Receipt' : 'Manual Entry',
      ]);
    });

    expSheet.getColumn(4).numFmt = '#,##0.00';
    expSheet.getColumn(1).width = 15;
    expSheet.getColumn(2).width = 25;
    expSheet.getColumn(3).width = 22;
    expSheet.getColumn(4).width = 18;
    expSheet.getColumn(5).width = 45;
    expSheet.getColumn(6).width = 20;

    const expLastRow = expSheet.rowCount;
    if (charges.length > 0) {
      expSheet.addRow([]);
      const sumRow = expSheet.addRow(['Total Expenses Sum', '', '', { formula: `SUM(D3:D${expLastRow})` }, '', '']);
      sumRow.font = { bold: true };
      sumRow.getCell(4).numFmt = '#,##0.00 "MAD / DH"';
    }
  }

  // ==========================================
  // PER-VENDOR REVENUE SHEETS
  // ==========================================
  const revVendorMap = {};
  revenues.forEach((r) => {
    const vName = r.vendor ? r.vendor.name : 'Unassigned';
    if (!revVendorMap[vName]) revVendorMap[vName] = [];
    revVendorMap[vName].push(r);
  });

  for (const [vName, vRevs] of Object.entries(revVendorMap).sort()) {
    const safeName = (vName.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 24) || 'Revenue') + ' Rev';
    const vSheet = workbook.addWorksheet(safeName);
    const isAlMohitSheet = vName === 'Al Mohit';
    vSheet.views = [{ showGridLines: true }];
    vSheet.addRow([`${vName} — Revenue Ledger`]);
    vSheet.getRow(1).font = { size: 14, bold: true };
    vSheet.addRow(['Date', 'Category', 'Amount (MAD / DH)', 'Description']);

    const vHeader = vSheet.getRow(2);
    vHeader.font = { bold: true, color: { argb: 'FFFFFF' } };
    vHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlMohitSheet ? 'C00000' : '2F5597' } };
    });

    vRevs.forEach((r) => {
      vSheet.addRow([
        new Date(r.date).toLocaleDateString(),
        r.category.replace('_', ' ').toUpperCase(),
        r.amount,
        r.description || '',
      ]);
      if (isAlMohitSheet) {
        const rw = vSheet.lastRow;
        rw.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0' } };
          cell.font = { color: { argb: 'CC0000' } };
        });
      }
    });

    vSheet.getColumn(3).numFmt = '#,##0.00';
    vSheet.getColumn(1).width = 15;
    vSheet.getColumn(2).width = 22;
    vSheet.getColumn(3).width = 18;
    vSheet.getColumn(4).width = 45;

    const vLastRow = vSheet.rowCount;
    if (vRevs.length > 0) {
      vSheet.addRow([]);
      const sumRow = vSheet.addRow(['Total', '', { formula: `SUM(C3:C${vLastRow})` }, '']);
      sumRow.font = { bold: true };
      sumRow.getCell(3).numFmt = '#,##0.00 "MAD / DH"';
    }
  }

  // ==========================================
  // PER-VENDOR EXPENSE SHEETS (unchanged)
  // ==========================================
  const vendorsMap = {};
  charges.forEach((c) => {
    const vName = c.vendor ? c.vendor.name : 'Other / Non-Vendor';
    if (!vendorsMap[vName]) vendorsMap[vName] = [];
    vendorsMap[vName].push(c);
  });

  for (const [vName, vCharges] of Object.entries(vendorsMap)) {
    const safeName = vName.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 28) || 'Vendor';
    const vSheet = workbook.addWorksheet(`${safeName} (Exp)`);
    vSheet.views = [{ showGridLines: true }];
    vSheet.addRow([`${vName} — Expenses Ledger`]);
    vSheet.getRow(1).font = { size: 14, bold: true };
    vSheet.addRow(['Date', 'Category', 'Amount (MAD / DH)', 'Description', 'Source / Receipt']);

    const vHeader = vSheet.getRow(2);
    vHeader.font = { bold: true, color: { argb: 'FFFFFF' } };
    vHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5597' } };
    });

    vCharges.forEach((c) => {
      vSheet.addRow([
        new Date(c.date).toLocaleDateString(),
        c.category.replace('_', ' ').toUpperCase(),
        c.amount,
        c.description || '',
        c.receiptId ? 'Scanned Receipt' : 'Manual Entry',
      ]);
    });

    vSheet.getColumn(3).numFmt = '#,##0.00';
    vSheet.getColumn(1).width = 15;
    vSheet.getColumn(2).width = 22;
    vSheet.getColumn(3).width = 18;
    vSheet.getColumn(4).width = 45;
    vSheet.getColumn(5).width = 20;

    const vLastRow = vSheet.rowCount;
    if (vCharges.length > 0) {
      vSheet.addRow([]);
      const sumRow = vSheet.addRow(['Total', '', { formula: `SUM(C3:C${vLastRow})` }, '', '']);
      sumRow.font = { bold: true };
      sumRow.getCell(3).numFmt = '#,##0.00 "MAD / DH"';
    }
  }

  // ==========================================
  // SHEET: Scanned Receipts
  // ==========================================
  if (receipts.length > 0) {
    const receiptSheet = workbook.addWorksheet('Receipt Audit Logs');
    receiptSheet.views = [{ showGridLines: true }];
    receiptSheet.addRow(['Scanned Receipts Audit History']);
    receiptSheet.getRow(1).font = { size: 14, bold: true };
    receiptSheet.addRow(['Scanned At', 'Assigned Vendor', 'Extracted Amount', 'Confidence', 'Review Status', 'Image URL']);

    const receiptHeader = receiptSheet.getRow(2);
    receiptHeader.font = { bold: true, color: { argb: 'FFFFFF' } };
    receiptHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7030A0' } };
    });

    receipts.forEach((rc) => {
      receiptSheet.addRow([
        new Date(rc.scannedAt).toLocaleString(),
        rc.vendor ? rc.vendor.name : 'Unrecognized / Pending',
        rc.amount || 0,
        rc.confidenceScore ? `${(rc.confidenceScore * 100).toFixed(0)}%` : 'N/A',
        rc.status.toUpperCase(),
        rc.imageUrl,
      ]);
    });

    receiptSheet.getColumn(3).numFmt = '#,##0.00';
    receiptSheet.getColumn(1).width = 22;
    receiptSheet.getColumn(2).width = 25;
    receiptSheet.getColumn(3).width = 18;
    receiptSheet.getColumn(4).width = 15;
    receiptSheet.getColumn(5).width = 18;
    receiptSheet.getColumn(6).width = 40;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

export async function generatePDFExport({ range, startDate, endDate, revenues, charges, receipts, totals }) {
  const [almohitPng, afriquiaPng] = await Promise.all([
    svgToPngBuffer('./assets/almohit-mark.svg', 40),
    svgToPngBuffer('./assets/afriquia-logo.svg', 40),
  ]);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      let pageNum = 1;
      let addingFooter = false;

      // Page 1 footer (pageAdded doesn't fire for the initial page)
      doc.fillColor('#7F7F7F').fontSize(8).text(`Page 1 — Station Al Mohit`, 56, 732, { align: 'center', width: 488 });
      doc.y = 50;

      doc.on('pageAdded', () => {
        if (addingFooter) return;
        addingFooter = true;
        pageNum++;
        const y = doc.y;
        doc.fillColor('#7F7F7F').fontSize(8).text(`Page ${pageNum} — Station Al Mohit`, 56, 732, { align: 'center', width: 488 });
        doc.y = y;
        addingFooter = false;
      });

      const formattedStart = new Date(startDate).toLocaleDateString();
      const formattedEnd = new Date(endDate).toLocaleDateString();

      // Logo row — Al Mohit left, Afriquia right
      doc.image(almohitPng, 50, 50, { width: 40 });
      doc.image(afriquiaPng, 462, 50, { width: 40 });
      doc.y = 97;

      doc.fillColor('#1F4E78').fontSize(10).font('Helvetica-Bold').text('N HOLDING DAKHLA (AL MOHIT)', { align: 'center' });
      doc.fillColor('#1F4E78').fontSize(16).font('Helvetica-Bold').text('RELEVÉ DE LA STATION', { align: 'center' });
      doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#1F4E78').lineWidth(1.5).stroke();
      doc.moveDown(1);

      doc.fillColor('#555').fontSize(10).font('Helvetica');
      doc.text(`Période : ${formattedStart}  —  ${formattedEnd}`);
      doc.text(`Généré le : ${new Date().toLocaleString()}`);
      doc.moveDown(1);

      doc.fontSize(11).fillColor('#262626').font('Helvetica-Bold');
      const isProfitable = totals.netProfit >= 0;
      const metricY = doc.y + 2;
      doc.text(`Revenu Total :`, 50, metricY);
      doc.text(`${totals.totalRevenue.toFixed(2)} DH`, 230, metricY);
      doc.text(`Total Dépenses :`, 350, metricY);
      doc.text(`${totals.totalCharges.toFixed(2)} DH`, 480, metricY);
      doc.text(`Bénéfice Net :`, 50, metricY + 18);
      doc.fillColor(isProfitable ? '#375623' : '#C00000').text(`${totals.netProfit.toFixed(2)} DH`, 230, metricY + 18);
      doc.fillColor('#262626').text(`${revenues.length} op. rev.  ·  ${charges.length} ent. dép.`, 350, metricY + 18, { fontSize: 9 });
      doc.moveTo(50, metricY + 42).lineTo(562, metricY + 42).strokeColor('#CCC').lineWidth(0.5).stroke();
      doc.y = metricY + 50;
      doc.fillColor('#262626');
      doc.moveDown(1);

      // REVENUE TABLE — all records with daily subtotals
      if (revenues.length > 0) {
        if (doc.y > 500) doc.addPage();

        doc.fillColor('#375623').fontSize(13).font('Helvetica-Bold').text('REVENU — OPÉRATION PAR OPÉRATION', 50, doc.y);
        doc.moveDown(0.5);

        let y = doc.y;
        doc.rect(50, y, 512, 20).fillColor('#375623').fill();
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        doc.text('Date', 55, y + 6);
        doc.text('Fournisseur', 120, y + 6);
        doc.text('Catégorie', 200, y + 6);
        doc.text('Montant', 460, y + 6, { align: 'right' });

        y += 22;
        doc.fillColor('#333333').font('Helvetica');

        const dailyGroups = groupByDate(revenues);

        for (const group of dailyGroups) {
          for (const r of group.records) {
            if (y > 720) { doc.addPage(); y = 50; }
            const bg = isAlMohit(r) ? '#FFF0F0' : (y % 32 === 0 ? '#FFFFFF' : '#F9FBF9');
            doc.rect(50, y, 512, 16).fillColor(bg).fill();
            doc.fillColor(isAlMohit(r) ? '#CC0000' : '#333333').fontSize(8);
            doc.text(new Date(r.date).toLocaleDateString(), 55, y + 4);
            doc.text(r.vendor ? r.vendor.name : '—', 120, y + 4);
            doc.text(r.category.replace('_', ' ').toUpperCase(), 200, y + 4);
            doc.text(r.amount.toFixed(2), 430, y + 4, { width: 120, align: 'right' });
            y += 16;
          }

          // Daily subtotal
          if (y > 700) { doc.addPage(); y = 50; }
          const dayTotal = group.records.reduce((s, r) => s + r.amount, 0);
          doc.rect(50, y, 512, 18).fillColor('#E8F5E9').fill();
          doc.fillColor('#1B5E20').fontSize(8).font('Helvetica-Bold');
          doc.text(`Total Journalier — ${group.date}`, 55, y + 5);
          doc.text(`${dayTotal.toFixed(2)} DH`, 430, y + 5, { width: 120, align: 'right' });
          y += 20;
        }

        // Grand total
        if (y > 700) { doc.addPage(); y = 50; }
        const grandTotal = revenues.reduce((s, r) => s + r.amount, 0);
        doc.rect(50, y, 512, 20).fillColor('#1B5E20').fill();
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
        doc.text(`TOTAL GÉNÉRAL — ${revenues.length} opérations`, 55, y + 6);
        doc.text(`${grandTotal.toFixed(2)} DH`, 430, y + 6, { width: 120, align: 'right' });
        doc.y = Math.min(y + 30, doc.page.height - 100);
        doc.fillColor('#262626');
      }

      // EXPENSES TABLE — all records
      if (charges.length > 0) {
        if (doc.y > 500) doc.addPage();

        doc.fillColor('#C00000').fontSize(13).font('Helvetica-Bold').text('FRAIS & DÉPENSES D\'EXPLOITATION', 50, doc.y);
        doc.moveDown(0.5);

        let y = doc.y;
        doc.rect(50, y, 512, 20).fillColor('#C00000').fill();
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
        doc.text('Date', 55, y + 6);
        doc.text('Fournisseur', 150, y + 6);
        doc.text('Catégorie', 280, y + 6);
        doc.text('Montant (DH)', 460, y + 6, { align: 'right' });

        y += 22;

        doc.fillColor('#333333').font('Helvetica');
        charges.forEach((c) => {
          if (y > 720) { doc.addPage(); y = 50; }
          doc.rect(50, y, 512, 16).fillColor(y % 32 === 0 ? '#FFFFFF' : '#FBF9F9').fill();
          doc.fillColor('#333333').fontSize(8);
          doc.text(new Date(c.date).toLocaleDateString(), 55, y + 4);
          doc.text(c.vendor ? c.vendor.name : 'Autre / Sans Fournisseur', 150, y + 4);
          doc.text(c.category.replace('_', ' ').toUpperCase(), 280, y + 4);
          doc.text(c.amount.toFixed(2), 440, y + 4, { width: 120, align: 'right' });
          y += 16;
        });

        // Grand total for expenses
        if (y > 700) { doc.addPage(); y = 50; }
        const expTotal = charges.reduce((s, c) => s + c.amount, 0);
        doc.rect(50, y, 512, 20).fillColor('#C00000').fill();
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
        doc.text(`TOTAL DÉPENSES — ${charges.length} entrées`, 55, y + 6);
        doc.text(`${expTotal.toFixed(2)} DH`, 440, y + 6, { width: 120, align: 'right' });
        doc.y = Math.min(y + 30, doc.page.height - 100);
      }

      // PER-VENDOR REVENUE BREAKDOWN
      if (revenues.length > 0) {
        const revVendorMap = {};
        revenues.forEach((r) => {
          const vName = r.vendor ? r.vendor.name : 'Unassigned';
          if (!revVendorMap[vName]) revVendorMap[vName] = [];
          revVendorMap[vName].push(r);
        });

        const vendorPriority = ['Al Mohit', 'Afriquia'];
        const vendorNames = Object.keys(revVendorMap).sort((a, b) => {
          const ai = vendorPriority.indexOf(a);
          const bi = vendorPriority.indexOf(b);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return a.localeCompare(b);
        });

        for (const vName of vendorNames) {
          const vRevs = revVendorMap[vName];
          if (doc.y > 500) doc.addPage();

          const headerColor = vName === 'Al Mohit' ? '#C00000' : '#2F5597';
          doc.fillColor(headerColor).fontSize(13).font('Helvetica-Bold').text(`${vName} — Répartition des Revenus`, 50, doc.y);
          doc.moveDown(0.5);

          let y = doc.y;
          doc.rect(50, y, 512, 20).fillColor(headerColor).fill();
          doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
          doc.text('Date', 55, y + 6);
          doc.text('Catégorie', 120, y + 6);
          doc.text('Montant', 460, y + 6, { align: 'right' });

          y += 22;
          doc.fillColor('#333333').font('Helvetica');

          const dailyGroups = groupByDate(vRevs);
          for (const group of dailyGroups) {
            for (const r of group.records) {
              if (y > 720) { doc.addPage(); y = 50; }
              const bg = vName === 'Al Mohit' ? (y % 32 === 0 ? '#FFF5F5' : '#FFEBEB') : (y % 32 === 0 ? '#FFFFFF' : '#F0F4FF');
              doc.rect(50, y, 512, 16).fillColor(bg).fill();
              doc.fillColor(vName === 'Al Mohit' ? '#CC0000' : '#333333').fontSize(8);
              doc.text(new Date(r.date).toLocaleDateString(), 55, y + 4);
              doc.text(r.category.replace('_', ' ').toUpperCase(), 120, y + 4);
              doc.text(r.amount.toFixed(2), 430, y + 4, { width: 120, align: 'right' });
              y += 16;
            }

            if (y > 700) { doc.addPage(); y = 50; }
            const dayTotal = group.records.reduce((s, r) => s + r.amount, 0);
            const subBg = vName === 'Al Mohit' ? '#FFCDD2' : '#C5CAE9';
            doc.rect(50, y, 512, 18).fillColor(subBg).fill();
            doc.fillColor(vName === 'Al Mohit' ? '#B71C1C' : '#1A237E').fontSize(8).font('Helvetica-Bold');
            doc.text(`Total Journalier — ${group.date}`, 55, y + 5);
            doc.text(`${dayTotal.toFixed(2)} DH`, 430, y + 5, { width: 120, align: 'right' });
            y += 20;
          }

          if (y > 700) { doc.addPage(); y = 50; }
          const vTotal = vRevs.reduce((s, r) => s + r.amount, 0);
          const totalBg = vName === 'Al Mohit' ? '#C00000' : '#1A237E';
          doc.rect(50, y, 512, 20).fillColor(totalBg).fill();
          doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
          doc.text(`${vName} TOTAL — ${vRevs.length} opérations`, 55, y + 6);
          doc.text(`${vTotal.toFixed(2)} DH`, 430, y + 6, { width: 120, align: 'right' });
          doc.y = Math.min(y + 30, doc.page.height - 100);
          doc.fillColor('#262626');
        }
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
