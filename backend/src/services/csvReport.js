function escape(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function format(n) {
  return (n || 0).toFixed(2);
}

export function generateCsvReport({ date, totalRevenue, totalCharges, net, charges, revenue }) {
  const lines = [];

  lines.push(`Rapport Quotidien,Al Mohit Station,${date}`);
  lines.push('');

  lines.push('RÉSUMÉ');
  lines.push(`Revenu Total,${format(totalRevenue)} DH`);
  lines.push(`Dépenses Totales,${format(totalCharges)} DH`);
  lines.push(`Résultat Net,${format(net)} DH`);
  lines.push('');

  lines.push('DÉPENSES');
  lines.push('Date,Fournisseur,Catégorie,Montant DH,Description');
  charges.forEach((ch) => {
    lines.push([
      fmtDate(ch.date),
      escape(ch.vendor?.name || '—'),
      escape(ch.category || '—'),
      format(ch.amount),
      escape(ch.description || ''),
    ].join(','));
  });
  lines.push('');

  lines.push('REVENUS');
  lines.push('Date,Catégorie,Type Carburant,Montant DH,Description');
  revenue.forEach((r) => {
    lines.push([
      fmtDate(r.date),
      escape(r.category || '—'),
      escape(r.fuelType || '—'),
      format(r.amount),
      escape(r.description || ''),
    ].join(','));
  });

  return lines.join('\n');
}
