const { parseLocalDate } = require("./dist/test-utils.js");

const addMonthsToDate = (baseStr, monthsToAdd) => {
  const d = parseLocalDate(baseStr) || new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  
  const targetYear = year + Math.floor((month + monthsToAdd) / 12);
  const targetMonth = ((month + monthsToAdd) % 12 + 12) % 12;
  const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(day, maxDays);
  
  const mm = String(targetMonth + 1).padStart(2, '0');
  const dd = String(targetDay).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
};

console.log("Adding 0 months to 2024-08-01:", addMonthsToDate("2024-08-01", 0));
console.log("Adding 1 months to 2024-08-01:", addMonthsToDate("2024-08-01", 1));
