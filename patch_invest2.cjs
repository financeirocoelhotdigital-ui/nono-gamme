const fs = require('fs');
let code = fs.readFileSync('src/context/InvestmentContext.tsx', 'utf8');

code = code.replace(/paymentMethod: "Pix", \/\/ Generic\n/g, '');
code = code.replace(/paymentMethod: "Pix",\n/g, '');
code = code.replace(/status: "pago",\n/g, '');
code = code.replace(/isRecurrent: false,\n/g, '');
code = code.replace(/referenceId: .*\n/g, '');
code = code.replace(/referenceType: .*\n/g, '');

fs.writeFileSync('src/context/InvestmentContext.tsx', code);
console.log('InvestmentContext patched again.');
