import fs from 'fs';
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

const regex = /let catExp = \[.*?\];.*?return \{.*?totalBalance: 24856\.90.*?\};/s;

const newLogic = `
    const categoryTotals: Record<string, number> = {};
    transactions
      .filter(t => t.type === "expense" && new Date(t.date).getMonth() === curMonth && new Date(t.date).getFullYear() === curYear)
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.value;
      });
      
    let catExp = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

    if (catExp.length === 0) {
       catExp = [{ name: "Sem gastos", value: 1, color: "#9CA3AF" }]; // Default empty
    }

    return {
      totalBalance: totalBal,
      thisMonthIncome: thisMonthInc,
      thisMonthExpense: thisMonthExp,
      categoryExpenses: catExp
    };`;

content = content.replace(regex, newLogic);
fs.writeFileSync('src/components/Dashboard.tsx', content);
