const fs = require('fs');
let code = fs.readFileSync('src/context/InvestmentContext.tsx', 'utf8');

// The linter says:
// Type '{ title: string; value: number; type: "expense"; category: string; date: string; accountId: string; userId: string; }' is missing the following properties from type 'Omit<Transaction, "id">': createdAt, emotion

code = code.replace(
  /userId: auth\.currentUser\.uid\s*\}\);/g,
  'userId: auth.currentUser.uid,\n        emotion: "racional",\n        createdAt: new Date().toISOString()\n      });'
);

fs.writeFileSync('src/context/InvestmentContext.tsx', code);
console.log('InvestmentContext patched again for emotion and createdAt.');
