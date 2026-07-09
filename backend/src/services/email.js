import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDailyReport } from './pdfReport.js';
import { generateCsvReport } from './csvReport.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Rapports Al Mohit <reports@almohit.site>';
const LOGO_B64 = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'logo-hires-full.png')).toString('base64');
const LOGO_DATA_URI = `data:image/png;base64,${LOGO_B64}`;

function format(n) {
  return (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH';
}

function buildSvgChart(totalRevenue, totalCharges) {
  const max = Math.max(totalRevenue, totalCharges, 1);
  const w = 400, h = 200, barW = 80, gap = 60;
  const left = (w - 2 * barW - gap) / 2;
  const rH = (totalRevenue / max) * 140;
  const cH = (totalCharges / max) * 140;
  const baseY = h - 30;

  return `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto">
  <rect x="${left}" y="${baseY - rH}" width="${barW}" height="${rH}" rx="4" fill="#059669" opacity="0.85"/>
  <rect x="${left + barW + gap}" y="${baseY - cH}" width="${barW}" height="${cH}" rx="4" fill="#dc2626" opacity="0.85"/>
  <text x="${left + barW / 2}" y="${baseY + 16}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#4b5563">Revenu</text>
  <text x="${left + barW + gap + barW / 2}" y="${baseY + 16}" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#4b5563">Dépenses</text>
  <text x="${left + barW / 2}" y="${baseY - rH - 6}" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" font-weight="bold" fill="#059669">${format(totalRevenue)}</text>
  <text x="${left + barW + gap + barW / 2}" y="${baseY - cH - 6}" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" font-weight="bold" fill="#dc2626">${format(totalCharges)}</text>
</svg>`;
}

function buildHtml({ date, totalRevenue, totalCharges, net, charges, revenue }) {
  const color = net >= 0 ? '#059669' : '#dc2626';
  const chart = buildSvgChart(totalRevenue, totalCharges);

  const topCharges = [...charges].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const topRevenue = [...revenue].sort((a, b) => b.amount - a.amount).slice(0, 5);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">

  <!-- Header with Logo -->
  <tr><td style="background:#1e3a5f;padding:24px 32px;text-align:center">
    <img src="${LOGO_DATA_URI}" alt="Al Mohit" width="96" style="display:block;margin:0 auto 12px;border-radius:6px" />
    <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:bold">Al Mohit Station</h1>
    <p style="margin:4px 0 0;font-size:13px;color:#94a3b8">Rapport Quotidien — ${date}</p>
  </td></tr>

  <!-- Greeting -->
  <tr><td style="padding:28px 32px 12px">
    <p style="margin:0;font-size:15px;color:#1f2937;font-weight:bold">Bonjour Mr Salami,</p>
    <p style="margin:8px 0 0;font-size:13px;color:#6b7280;line-height:1.5">
      Veuillez trouver ci-dessous le récapitulatif financier complet de la journée.
      Les relevés détaillés en PDF et CSV sont joints à cet email.
    </p>
  </td></tr>

  <!-- Summary Cards -->
  <tr><td style="padding:8px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding:4px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0">
            <tr><td style="padding:14px 16px;text-align:center">
              <p style="margin:0;font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:0.5px">Revenu Total</p>
              <p style="margin:4px 0 0;font-size:20px;color:#166534;font-weight:bold">${format(totalRevenue)}</p>
            </td></tr>
          </table>
        </td>
        <td width="50%" style="padding:4px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;border:1px solid #fecaca">
            <tr><td style="padding:14px 16px;text-align:center">
              <p style="margin:0;font-size:11px;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px">Dépenses Totales</p>
              <p style="margin:4px 0 0;font-size:20px;color:#991b1b;font-weight:bold">${format(totalCharges)}</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Net Result -->
  <tr><td style="padding:8px 32px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">
      <tr><td style="padding:14px 16px;text-align:center">
        <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Résultat Net</p>
        <p style="margin:2px 0 0;font-size:24px;color:${color};font-weight:bold">${format(Math.abs(net))}</p>
        <p style="margin:0;font-size:12px;color:${color}">${net >= 0 ? 'Bénéfice' : 'Perte'}</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Chart -->
  <tr><td style="padding:16px 32px;text-align:center">
    <p style="margin:0 0 8px;font-size:12px;color:#6b7280;font-weight:bold">Revenus vs Dépenses</p>
    ${chart}
  </td></tr>`;

  // Top charges
  if (topCharges.length > 0) {
    html += `
  <tr><td style="padding:8px 32px">
    <p style="margin:12px 0 6px;font-size:13px;color:#1f2937;font-weight:bold">Principales Dépenses du Jour</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px">
      ${topCharges.map((ch) => `
      <tr>
        <td style="padding:4px 0;color:#6b7280">${ch.vendor?.name || '—'} — ${ch.category || ''}</td>
        <td style="padding:4px 0;text-align:right;color:#dc2626;font-weight:bold;font-family:monospace">${format(ch.amount)}</td>
      </tr>`).join('')}
    </table>
  </td></tr>`;
  }

  // Top revenue
  if (topRevenue.length > 0) {
    html += `
  <tr><td style="padding:8px 32px">
    <p style="margin:12px 0 6px;font-size:13px;color:#1f2937;font-weight:bold">Principaux Revenus du Jour</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px">
      ${topRevenue.map((r) => `
      <tr>
        <td style="padding:4px 0;color:#6b7280">${r.category || '—'} ${r.fuelType ? '(' + r.fuelType + ')' : ''}</td>
        <td style="padding:4px 0;text-align:right;color:#059669;font-weight:bold;font-family:monospace">${format(r.amount)}</td>
      </tr>`).join('')}
    </table>
  </td></tr>`;
  }

  html += `
  <!-- Attachments note -->
  <tr><td style="padding:16px 32px 24px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd">
      <tr><td style="padding:12px 16px;text-align:center">
        <p style="margin:0;font-size:12px;color:#0369a1">
          📎 Les relevés détaillés (PDF) et les données brutes (CSV) sont joints à cet email.
        </p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">Al Mohit Station — Rapport généré automatiquement</p>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`;

  return html;
}

export async function sendDailyReport(toEmail, data) {
  const { date, totalRevenue, totalCharges, net, charges, revenue } = data;
  const html = buildHtml({ date, totalRevenue, totalCharges, net, charges, revenue });

  const pdfBuffer = await generateDailyReport({ date, totalRevenue, totalCharges, net, charges, revenue });
  const csvString = generateCsvReport({ date, totalRevenue, totalCharges, net, charges, revenue });

  const { data: result, error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Rapport Quotidien — ${date}`,
    html,
    attachments: [
      {
        filename: `rapport-quotidien-${date.replace(/\s+/g, '-')}.pdf`,
        content: pdfBuffer.toString('base64'),
      },
      {
        filename: `donnees-quotidien-${date.replace(/\s+/g, '-')}.csv`,
        content: Buffer.from(csvString, 'utf-8').toString('base64'),
      },
    ],
  });

  if (error) throw new Error(error.message);
  return result;
}
