function parseQuantity(value) {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0 ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const match = value.trim().match(/^(\d+)\s*(?:units?|pcs?)?$/i);
  return match ? Number(match[1]) : null;
}

function parseDate(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  let year;
  let month;
  let day;
  const ddmmyyyy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (ddmmyyyy) [, day, month, year] = ddmmyyyy;
  else if (iso) [, year, month, day] = iso;
  else return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return date;
}

function normalizeBatchRow(row) {
  if (!row || typeof row !== 'object') return { error: 'row must be an object' };
  const batchNumber = typeof row.batchNumber === 'string' ? row.batchNumber.trim() : row.batchNumber;
  if (!batchNumber) return { error: 'batchNumber is required' };
  const quantity = parseQuantity(row.quantity);
  if (quantity === null) return { error: 'quantity must be a whole number or a number followed by units/pcs' };
  const expiryDate = parseDate(row.expiryDate);
  if (!expiryDate) return { error: 'expiryDate must be a valid dd/mm/yyyy or ISO date' };
  return {
    value: {
      batchNumber,
      quantity,
      expiryDate,
      ...(row.costPrice !== undefined ? { costPrice: Number(row.costPrice) } : {}),
      ...(row.sellingPrice !== undefined ? { sellingPrice: Number(row.sellingPrice) } : {}),
      ...(row.receivedDate ? { receivedDate: parseDate(row.receivedDate) || row.receivedDate } : {}),
    },
  };
}

function importKey(row) {
  return row.batchNumber ? `batch:${row.batchNumber}` : `fallback:${row.expiryDate.toISOString()}:${row.quantity}`;
}

module.exports = { parseQuantity, parseDate, normalizeBatchRow, importKey };
