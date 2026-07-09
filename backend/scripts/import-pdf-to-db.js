import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();
const PDF_TEXT = readFileSync('/dev/stdin', 'utf8');

const VENDOR_IDS = {
  'Afriquia': 'd8f65404-fac0-46c5-bf3f-27b005be3e8a',
  'Al Mohit': 'c828635e-ae1f-4d8a-b277-f87292753188',
};
const ADMIN_USER = 'c4b7e5d5-61a9-4fce-93b9-418d85a753a5';
const YEAR = 2025;
const MONTHS = { 'August': 8, 'September': 9, 'October': 10 };

function parseAmount(s) {
  return parseFloat(s.trim().replace(',', '.').replace(' MAD', '').replace('+', '').trim());
}
function makeDate(m, d) { return new Date(YEAR, m - 1, d); }

function findSubsetIndices(amounts, target, eps = 0.05) {
  const values = amounts.map(a => Math.round(a * 100));
  const targetCents = Math.round(target * 100);
  const n = values.length;

  // Meet-in-the-middle
  const mid = Math.floor(n / 2);
  const left = values.slice(0, mid);
  const right = values.slice(mid);

  // Enumerate all subsets of right half
  const rightMap = new Map();
  for (let mask = 0; mask < (1 << right.length); mask++) {
    let sum = 0, indices = [];
    for (let j = 0; j < right.length; j++) {
      if (mask & (1 << j)) { sum += right[j]; indices.push(mid + j); }
    }
    if (!rightMap.has(sum) || indices.length > rightMap.get(sum).length) {
      rightMap.set(sum, indices);
    }
  }

  // Enumerate left half and match
  let best = null;
  for (let mask = 0; mask < (1 << left.length); mask++) {
    let sum = 0, indices = [];
    for (let j = 0; j < left.length; j++) {
      if (mask & (1 << j)) { sum += left[j]; indices.push(j); }
    }
    const remaining = targetCents - sum;
    if (Math.abs(remaining) <= eps * 100) {
      if (!best || indices.length > best.length) best = [...indices];
    }
    const match = rightMap.get(remaining);
    if (match) {
      const combined = [...indices, ...match];
      if (!best || combined.length > best.length) best = combined;
    }
  }

  return best;
}

const lines = PDF_TEXT.split('\n').map(l => l.trim()).filter(Boolean);
let currentMonth = null, currentDay = null, amounts = [];
let dayTotals = { 'Afriquia': 0, 'Al Mohit': 0 };

const records = [];

function importDay(month, day, amounts, totals) {
  if (!amounts.length) return;
  const date = makeDate(month, day);

  if (totals['Al Mohit'] <= 0.001) {
    for (const amt of amounts) records.push({ amount: amt, vendorId: VENDOR_IDS['Afriquia'], date, vendor: 'Afriquia' });
    return;
  }
  if (totals['Afriquia'] <= 0.001) {
    for (const amt of amounts) records.push({ amount: amt, vendorId: VENDOR_IDS['Al Mohit'], date, vendor: 'Al Mohit' });
    return;
  }

  const indices = findSubsetIndices(amounts, totals['Al Mohit']);

  if (indices && indices.length > 0) {
    const idxSet = new Set(indices);
    for (let i = 0; i < amounts.length; i++) {
      const v = idxSet.has(i) ? 'Al Mohit' : 'Afriquia';
      records.push({ amount: amounts[i], vendorId: VENDOR_IDS[v], date, vendor: v });
    }
  } else {
    records.push({ amount: totals['Afriquia'], vendorId: VENDOR_IDS['Afriquia'], date, vendor: 'Afriquia', aggregate: true });
    records.push({ amount: totals['Al Mohit'], vendorId: VENDOR_IDS['Al Mohit'], date, vendor: 'Al Mohit', aggregate: true });
  }
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const monthMatch = line.match(/^(August|September|October)\s+(\d+)/);

  if (monthMatch) {
    if (currentMonth && currentDay && amounts.length > 0) importDay(currentMonth, currentDay, amounts, dayTotals);
    currentMonth = MONTHS[monthMatch[1]];
    currentDay = parseInt(monthMatch[2]);
    amounts = [];
    dayTotals = { 'Afriquia': 0, 'Al Mohit': 0 };
    continue;
  }

  const totalMatch = line.match(/Total\s+Afriquia\s*:\s*([\d.,]+)\s*MAD\s*\|\s*Total\s+Al\s+Mohit\s*:\s*([\d.,]+)\s*MAD/);
  if (totalMatch && currentMonth && currentDay) {
    dayTotals['Afriquia'] = parseAmount(totalMatch[1]);
    dayTotals['Al Mohit'] = parseAmount(totalMatch[2]);
    importDay(currentMonth, currentDay, amounts, dayTotals);
    amounts = [];
    currentDay = null;
    continue;
  }

  if (line.match(/^[\d.,]+\s*MAD\s*\+/)) {
    amounts.push(parseAmount(line));
  }
}

// Import all records
async function main() {
  let imported = 0, aggImported = 0;
  for (const r of records) {
    const desc = r.aggregate
      ? `Daily ${r.vendor} sold gas total — ${r.date.toISOString().slice(0, 10)}`
      : `Sold gas operation — ${r.date.toISOString().slice(0, 10)}`;

    await prisma.revenue.create({
      data: {
        amount: r.amount,
        category: 'fuel_sales',
        date: r.date,
        description: desc,
        createdBy: ADMIN_USER,
        vendorId: r.vendorId,
      },
    });
    imported++;
    if (r.aggregate) aggImported++;
  }

  console.log(`Import complete: ${imported} revenue records created.`);
  console.log(`  - ${imported - aggImported} individual operations`);
  console.log(`  - ${aggImported} daily aggregate totals (${aggImported/2} mixed-vendor days)`);
  const totalVal = records.reduce((s, r) => s + r.amount, 0);
  console.log(`  - Total value: ${totalVal.toFixed(2)} MAD`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
