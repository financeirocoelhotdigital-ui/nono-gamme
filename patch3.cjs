const fs = require('fs');
let code = fs.readFileSync('src/context/DebtsContext.tsx', 'utf8');

// 1. In payInstallment, add linkedDebtId and linkedInstallmentId
code = code.replace(
  /emotion: "racional",\s*createdAt: new Date\(\)\.toISOString\(\)\s*\}\);/g,
  'emotion: "racional",\n        createdAt: new Date().toISOString(),\n        linkedDebtId: debt.id,\n        linkedInstallmentId: installmentId\n      } as any);'
);

// 2. In deleteDebt, fetch transactions and remove them
const findDeleteDebtStr = `      const [instSnapshot, histSnapshot] = await Promise.all([
        getDocs(query(collection(db, "installments"), where("userId", "==", userId), where("debtId", "==", debtId))),
        getDocs(query(collection(db, "debtHistory"), where("userId", "==", userId), where("debtId", "==", debtId)))
      ]);`;

const replaceDeleteDebtStr = `      const [instSnapshot, histSnapshot, transSnapshot] = await Promise.all([
        getDocs(query(collection(db, "installments"), where("userId", "==", userId), where("debtId", "==", debtId))),
        getDocs(query(collection(db, "debtHistory"), where("userId", "==", userId), where("debtId", "==", debtId))),
        getDocs(query(collection(db, "transactions"), where("userId", "==", userId), where("linkedDebtId", "==", debtId)))
      ]);

      // Remove associated transactions to maintain referential integrity
      for (const tDoc of transSnapshot.docs) {
        const tData = tDoc.data();
        await transacoes.removerTransacao({ id: tDoc.id, ...tData } as any);
      }
`;

if (code.includes(findDeleteDebtStr)) {
  code = code.replace(findDeleteDebtStr, replaceDeleteDebtStr);
  fs.writeFileSync('src/context/DebtsContext.tsx', code);
  console.log('Debts patched successfully');
} else {
  console.log('Debts target not found');
}
