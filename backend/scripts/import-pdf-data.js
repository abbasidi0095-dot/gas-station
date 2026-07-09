import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();
const PDF_TEXT = readFileSync('/dev/stdin', 'utf8');

const VENDORS = {
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

// Find subset indices that sum to target (returns array of indices)
function findSubsetIndices(amounts, target, eps = 0.02) {
  const n = amounts.length;
  const targetCents = Math.round(target * 100);
  const values = amounts.map(a => Math.round(a * 100));

  // DP: find if subset exists
  const dp = new Map();
  function dfs(idx, remaining) {
    if (remaining < 0) return null;
    if (Math.abs(remaining) <= eps * 100) return [];
    if (idx >= n) return null;
    const key = idx * 100000 + remaining;
    if (dp.has(key)) return dp.get(key);

    // Skip
    const skip = dfs(idx + 1, remaining);
    if (skip !== null) { dp.set(key, skip); return skip; }

    // Take
    const take = dfs(idx + 1, remaining - values[idx]);
    if (take !== null) { dp.set(key, [idx, ...take]); return take; }

    dp.set(key, null);
    return null;
  }

  return dfs(0, targetCents);
}

const lines = PDF_TEXT.split('\n').map(l => l.trim()).filter(Boolean);
const records = [];
let currentMonth = null, currentDay = null, amounts = [];
let dayTotals = { 'Afriquia': 0, 'Al Mohit': 0 };

function importDay(month, day, amounts, totals) {
  if (!amounts.length) return;
  const date = makeDate(month, day);

  if (totals['Al Mohit'] <= 0.001) {
    for (const amt of amounts) records.push({ amount: amt, vendorId: VENDORS['Afriquia'], vendorName: 'Afriquia', date });
    return;
  }
  if (totals['Afriquia'] <= 0.001) {
    for (const amt of amounts) records.push({ amount: amt, vendorId: VENDORS['Al Mohit'], vendorName: 'Al Mohit', date });
    return;
  }

  // Find which indices belong to Al Mohit via subset sum
  const indices = findSubsetIndices(amounts, totals['Al Mohit']);

  if (indices && indices.length > 0) {
    const idxSet = new Set(indices);
    for (let i = 0; i < amounts.length; i++) {
      const vendor = idxSet.has(i) ? 'Al Mohit' : 'Afriquia';
      records.push({ amount: amounts[i], vendorId: VENDORS[vendor], vendorName: vendor, date });
    }
  } else {
    // Fallback: use daily totals
    records.push({ amount: totals['Afriquia'], vendorId: VENDORS['Afriquia'], vendorName: 'Afriquia', date, aggregate: true });
    records.push({ amount: totals['Al Mohit'], vendorId: VENDORS['Al Mohit'], vendorName: 'Al Mohit', date, aggregate: true });
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

console.error(`Parsed ${records.length} rows`);
console.log(JSON.stringify(records, null, 2));
