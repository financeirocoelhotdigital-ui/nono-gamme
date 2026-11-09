const fs = require('fs');
let code = fs.readFileSync('src/components/Accounts.tsx', 'utf8');

const target = `  const confirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await deleteAccount(accountToDelete.id);
      setAccountToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir conta bancária:", err);
    }
  };`;

const replacement = `  const confirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await deleteAccount(accountToDelete.id);
      setAccountToDelete(null);
    } catch (err: any) {
      console.error("Erro ao excluir conta bancária:", err);
      alert(err.message || "Erro ao excluir conta.");
    }
  };`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/Accounts.tsx', code);
  console.log('Accounts.tsx patched successfully');
}
