const fs = require('fs');
let code = fs.readFileSync('src/modules/contasModule.ts', 'utf8');

const target = `  async deletarConta(accountId: string) {
    try {
      await deleteDoc(doc(db, "accounts", accountId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, \`accounts/\${accountId}\`);
    }
  },`;

const replacement = `  async deletarConta(accountId: string) {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      
      const q = query(collection(db, "transactions"), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      let hasTransactions = false;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.accountId === accountId || data.toAccountId === accountId) {
          hasTransactions = true;
        }
      });
      
      if (hasTransactions) {
        throw new Error("Não é possível excluir uma conta que possui transações vinculadas.");
      }
      
      await deleteDoc(doc(db, "accounts", accountId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, \`accounts/\${accountId}\`);
      throw error;
    }
  },`;

if (code.includes('async deletarConta')) {
  // Instead of replacing blindly, let's just use string replace for the exact function signature
  let startIndex = code.indexOf('async deletarConta');
  let endIndex = code.indexOf('async definirComoPadrao', startIndex);
  if (startIndex !== -1 && endIndex !== -1) {
    const originalFunc = code.substring(startIndex, endIndex);
    code = code.replace(originalFunc, replacement + '\n\n  ');
    fs.writeFileSync('src/modules/contasModule.ts', code);
    console.log('contasModule patched successfully');
  }
}
