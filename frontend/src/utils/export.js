/**
 * CSV export, RFC 4180 quoting. Cells that start with = + - @ are prefixed
 * with an apostrophe so a spreadsheet does not evaluate them as formulas.
 */
const cell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (header, rows) =>
  [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');

export const downloadCsv = (filename, header, rows) => {
  // BOM so Excel opens UTF-8 (Devanagari, en dashes) correctly.
  const blob = new Blob(['﻿', toCsv(header, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
