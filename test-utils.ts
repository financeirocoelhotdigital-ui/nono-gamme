export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const cleanStr = String(dateStr).trim();
  const match = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 12, 0, 0);
  }
  const d = new Date(cleanStr);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date, format) {
  if (!date) return "—";
  const d = parseLocalDate(date);
  if (!d) return "—";
  
  let formatStr = format;
  if (!formatStr) {
    formatStr = "DD/MM/AAAA";
  }

  const dayStr = d.getDate().toString().padStart(2, '0');
  const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
  const yearStr = d.getFullYear();

  if (formatStr === "MM/DD/AAAA") {
    return `${monthStr}/${dayStr}/${yearStr}`;
  } else if (formatStr === "AAAA-MM-DD") {
    return `${yearStr}-${monthStr}-${dayStr}`;
  }
  
  return `${dayStr}/${monthStr}/${yearStr}`;
}

console.log(formatDate("2024-08-01", "DD/MM/AAAA"));
console.log(formatDate("2024-01-08", "DD/MM/AAAA"));
