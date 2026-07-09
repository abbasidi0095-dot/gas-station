import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

/**
 * Generate formatted Excel workbook of gas station financial data.
 * Includes a per-vendor sheet for each vendor present in the charges data.
 */
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

  summarySheet.addRow(['Financial Metric', 'Total Value (MAD)', 'Status', 'Description']);
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
    row.getCell(2).numFmt = '#,##0.00 "MAD"';
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
  // SHEET 2: Revenues Ledger
  // ==========================================
  if (revenues.length > 0) {
    const revSheet = workbook.addWorksheet('Revenue Ledger');
    revSheet.views = [{ showGridLines: true }];
    revSheet.addRow(['Daily Revenue Ledger']);
    revSheet.getRow(1).font = { size: 14, bold: true };
    revSheet.addRow(['Date', 'Category', 'Amount (MAD)', 'Description', 'Logged By']);

    const revHeader = revSheet.getRow(2);
    revHeader.font = { bold: true, color: { argb: 'FFFFFF' } };
    revHeader.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '375623' } };
    });

    revenues.forEach((r) => {
      revSheet.addRow([
        new Date(r.date).toLocaleDateString(),
        r.category.replace('_', ' ').toUpperCase(),
        r.amount,
        r.description || '',
        r.createdBy || 'Admin',
      ]);
    });

    revSheet.getColumn(3).numFmt = '#,##0.00';
    revSheet.getColumn(1).width = 15;
    revSheet.getColumn(2).width = 20;
    revSheet.getColumn(3).width = 18;
    revSheet.getColumn(4).width = 45;
    revSheet.getColumn(5).width = 25;

    const revLastRow = revSheet.rowCount;
    if (revenues.length > 0) {
      revSheet.addRow([]);
      const sumRow = revSheet.addRow(['Total Revenue Sum', '', { formula: `SUM(C3:C${revLastRow})` }, '', '']);
      sumRow.font = { bold: true };
      sumRow.getCell(3).numFmt = '#,##0.00 "MAD"';
    }
  }

  // ==========================================
  // SHEET 3: All Expenses Ledger
  // ==========================================
  if (charges.length > 0) {
    const expSheet = workbook.addWorksheet('Expenses Ledger');
    expSheet.views = [{ showGridLines: true }];
    expSheet.addRow(['Charges and Expenses Ledger']);
    expSheet.getRow(1).font = { size: 14, bold: true };
    expSheet.addRow(['Date', 'Vendor', 'Category', 'Amount (MAD)', 'Description', 'Source / Receipt']);

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
      sumRow.getCell(4).numFmt = '#,##0.00 "MAD"';
    }
  }

  // ==========================================
  // PER-VENDOR SHEETS (one sheet per vendor)
  // ==========================================
  const vendorsMap = {};
  charges.forEach((c) => {
    const vName = c.vendor ? c.vendor.name : 'Other / Non-Vendor';
    if (!vendorsMap[vName]) vendorsMap[vName] = [];
    vendorsMap[vName].push(c);
  });

  for (const [vName, vCharges] of Object.entries(vendorsMap)) {
    const safeName = vName.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 28) || 'Vendor';
    const vSheet = workbook.addWorksheet(`${safeName} Ledger`);
    vSheet.views = [{ showGridLines: true }];
    vSheet.addRow([`${vName} — Expenses Ledger`]);
    vSheet.getRow(1).font = { size: 14, bold: true };
    vSheet.addRow(['Date', 'Category', 'Amount (MAD)', 'Description', 'Source / Receipt']);

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
      sumRow.getCell(3).numFmt = '#,##0.00 "MAD"';
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

/**
 * Generate formatted PDF report of gas station financial data
 */
export function generatePDFExport({ range, startDate, endDate, revenues, charges, receipts, totals }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, bufferPages: true });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const formattedStart = new Date(startDate).toLocaleDateString();
      const formattedEnd = new Date(endDate).toLocaleDateString();

      doc.fillColor('#1F4E78').fontSize(20).text('AL MOHIT GAS STATION STATEMENT', { align: 'center', underline: true });
      doc.moveDown(1);

      doc.fillColor('#262626').fontSize(11);
      doc.text(`Report Period: ${formattedStart} to ${formattedEnd}`);
      doc.text(`Generated At: ${new Date().toLocaleString()}`);
      doc.text(`Scope Filter: Revenue, Charges & Receipts Summary`);
      doc.moveDown(1.5);

      // OVERVIEW METRICS BOX
      doc.rect(50, doc.y, 512, 100).fillColor('#F2F2F2').fill();

      doc.fillColor('#1F4E78').fontSize(12).font('Helvetica-Bold');
      doc.text('FINANCIAL OVERVIEW (MAD)', 65, doc.y - 90);
      doc.moveDown(0.5);

      doc.fontSize(10).fillColor('#333333');
      doc.text(`Total Sales Revenue:`, 65, doc.y);
      doc.text(`${totals.totalRevenue.toFixed(2)} MAD`, 250, doc.y - 12, { font: 'Helvetica-Bold' });

      doc.text(`Total Operating Expenses:`, 65, doc.y + 10);
      doc.text(`${totals.totalCharges.toFixed(2)} MAD`, 250, doc.y - 2, { font: 'Helvetica-Bold' });

      doc.text(`Net Operating Profit:`, 65, doc.y + 20);
      const isProfitable = totals.netProfit >= 0;
      doc.fillColor(isProfitable ? '#375623' : '#C00000').text(
        `${totals.netProfit.toFixed(2)} MAD`,
        250,
        doc.y + 8,
        { font: 'Helvetica-Bold' }
      );

      doc.y = doc.y + 35;
      doc.moveDown(1.5);

      // REVENUE TABLE
      if (revenues.length > 0) {
        doc.fillColor('#375623').fontSize(13).font('Helvetica-Bold').text('REVENUE STREAM BREAKDOWN', 50, doc.y);
        doc.moveDown(0.5);

        let y = doc.y;
        doc.rect(50, y, 512, 20).fillColor('#375623').fill();
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
        doc.text('Date', 55, y + 6);
        doc.text('Category', 150, y + 6);
        doc.text('Description', 280, y + 6);
        doc.text('Amount (MAD)', 480, y + 6, { align: 'right' });

        y += 20;

        doc.fillColor('#333333').font('Helvetica');
        revenues.slice(0, 25).forEach((r) => {
          doc.rect(50, y, 512, 18).fillColor(y % 36 === 0 ? '#FFFFFF' : '#F9FBF9').fill();
          doc.fillColor('#333333');
          doc.text(new Date(r.date).toLocaleDateString(), 55, y + 5);
          doc.text(r.category.replace('_', ' ').toUpperCase(), 150, y + 5);
          doc.text(r.description ? r.description.substring(0, 32) : 'Daily log', 280, y + 5);
          doc.text(r.amount.toFixed(2), 430, y + 5, { width: 120, align: 'right' });
          y += 18;
        });

        doc.y = y + 10;
        doc.moveDown(1.5);
      }

      // EXPENSES TABLE
      if (charges.length > 0) {
        if (doc.y > 550) doc.addPage();

        doc.fillColor('#C00000').fontSize(13).font('Helvetica-Bold').text('OPERATING CHARGES & EXPENSES', 50, doc.y);
        doc.moveDown(0.5);

        let y = doc.y;
        doc.rect(50, y, 512, 20).fillColor('#C00000').fill();
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
        doc.text('Date', 55, y + 6);
        doc.text('Vendor', 150, y + 6);
        doc.text('Category', 280, y + 6);
        doc.text('Amount (MAD)', 480, y + 6, { align: 'right' });

        y += 20;

        doc.fillColor('#333333').font('Helvetica');
        charges.slice(0, 25).forEach((c) => {
          doc.rect(50, y, 512, 18).fillColor(y % 36 === 0 ? '#FFFFFF' : '#FBF9F9').fill();
          doc.fillColor('#333333');
          doc.text(new Date(c.date).toLocaleDateString(), 55, y + 5);
          doc.text(c.vendor ? c.vendor.name : 'Other / Non-Vendor', 150, y + 5);
          doc.text(c.category.replace('_', ' ').toUpperCase(), 280, y + 5);
          doc.text(c.amount.toFixed(2), 430, y + 5, { width: 120, align: 'right' });
          y += 18;
        });

        doc.y = y + 10;
        doc.moveDown(1.5);
      }

      // FOOTER / PAGE NUMBERING
      const rangeOfPages = doc.bufferedPageRange();
      for (let i = 0; i < rangeOfPages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#7F7F7F').fontSize(8);
        doc.text(
          `Page ${i + 1} of ${rangeOfPages.count} — Al Mohit Gas Station`,
          50,
          750,
          { align: 'center' }
        );
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
