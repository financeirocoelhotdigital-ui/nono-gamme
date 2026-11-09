const fs = require('fs');
let code = fs.readFileSync('src/modules/transacoesModule.ts', 'utf8');

// Also in atualizarTransacao, if a debt payment is modified, it's very complex, 
// usually people don't modify debt payment transactions directly, they just delete and re-pay.
// Let's add linkedDebtId and linkedInstallmentId to Transaction type.

let typesCode = fs.readFileSync('src/types.ts', 'utf8');
if (!typesCode.includes('linkedDebtId')) {
  typesCode = typesCode.replace(
    'totalInstallments?: number;',
    'totalInstallments?: number;\n  linkedDebtId?: string;\n  linkedInstallmentId?: string;'
  );
  fs.writeFileSync('src/types.ts', typesCode);
  console.log('types.ts patched successfully');
}
