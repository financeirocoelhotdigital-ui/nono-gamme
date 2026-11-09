import fs from 'fs';
let content = fs.readFileSync('src/context/CashFlowContext.tsx', 'utf-8');

const oldLogic = `    // 2. Calculate daily balance
    let currentBalance = initialBalance;
    
    for (let i = 0; i <= horizon; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      
      const dayEvents = futureEvents.filter(e => format(parseISO(e.date), "yyyy-MM-dd") === dateStr);
      const income = dayEvents.filter(e => e.type === "income").reduce((acc, curr) => acc + curr.value, 0);
      const expense = dayEvents.filter(e => e.type === "expense").reduce((acc, curr) => acc + curr.value, 0);
      
      currentBalance += income - expense;
      
      points.push({
        date: dateStr,
        balance: currentBalance,
        income,
        expense,
        events: dayEvents
      });
    }`;

const newLogic = `    // 2. Calculate daily balance
    let currentBalance = initialBalance;
    
    const eventsByDate = {};
    futureEvents.forEach(e => {
      const dStr = format(parseISO(e.date), "yyyy-MM-dd");
      if (!eventsByDate[dStr]) eventsByDate[dStr] = [];
      eventsByDate[dStr].push(e);
    });

    for (let i = 0; i <= horizon; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      
      const dayEvents = eventsByDate[dateStr] || [];
      const income = dayEvents.filter(e => e.type === "income").reduce((acc, curr) => acc + curr.value, 0);
      const expense = dayEvents.filter(e => e.type === "expense").reduce((acc, curr) => acc + curr.value, 0);
      
      currentBalance += income - expense;
      
      points.push({
        date: dateStr,
        balance: currentBalance,
        income,
        expense,
        events: dayEvents
      });
    }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/context/CashFlowContext.tsx', content);
