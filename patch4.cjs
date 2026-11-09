const fs = require('fs');
let code = fs.readFileSync('src/modules/transacoesModule.ts', 'utf8');

// I need to add referential integrity checks for debts.
// When deleting a transaction that is linked to a debt (linkedDebtId / linkedInstallmentId),
// we should probably reverse the payment.
// Let's add the check.

const target = `        // 2. ALL Writes next`;
const replacement = `        // Fetch debt related info if it's a debt payment
        let debtSnap = null;
        let debtRef = null;
        let installmentSnap = null;
        let installmentRef = null;
        
        if (transaction.linkedDebtId) {
          debtRef = doc(db, "debts", transaction.linkedDebtId);
          debtSnap = await dbTransaction.get(debtRef);
          
          if (transaction.linkedInstallmentId) {
            installmentRef = doc(db, "installments", transaction.linkedInstallmentId);
            installmentSnap = await dbTransaction.get(installmentRef);
          }
        }
        
        // 2. ALL Writes next
        if (debtSnap && debtSnap.exists() && debtRef) {
          const debtData = debtSnap.data();
          const newTotalPaidValue = Math.max(0, (debtData.totalPaidValue || 0) - transaction.value);
          const newRemainingValue = debtData.remainingValue + transaction.value;
          const newPaidInstallments = Math.max(0, (debtData.paidInstallments || 1) - 1);
          
          dbTransaction.update(debtRef, {
            totalPaidValue: newTotalPaidValue,
            remainingValue: newRemainingValue,
            currentValue: newRemainingValue,
            paidInstallments: newPaidInstallments,
            status: newRemainingValue > 0 ? (debtData.status === "quitada" ? "ativa" : debtData.status) : debtData.status
          });
          
          if (installmentSnap && installmentSnap.exists() && installmentRef) {
            dbTransaction.update(installmentRef, {
              status: "pendente",
              paymentDate: null
            });
          }
        }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/modules/transacoesModule.ts', code);
  console.log('transacoesModule patched successfully');
} else {
  console.log('Target not found in transacoesModule');
}
