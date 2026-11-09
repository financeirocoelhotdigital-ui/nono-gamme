const fs = require('fs');
let code = fs.readFileSync('src/context/InvestmentContext.tsx', 'utf8');

// Replace paymentMethod with something else or just remove it if it's not valid for transactions.
// paymentMethod is usually for expenses. Let's see how it's used.

code = code.replace(/paymentMethod: "[^"]+",?\n?/g, '');
fs.writeFileSync('src/context/InvestmentContext.tsx', code);
console.log('InvestmentContext patched.');
