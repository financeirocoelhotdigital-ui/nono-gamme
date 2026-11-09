const fs = require('fs');
let code = fs.readFileSync('src/context/ContasContext.tsx', 'utf8');

const target = `  const deleteAccount = async (accountId: string) => {
    await contas.deletarConta(accountId);
  };`;

const replacement = `  const deleteAccount = async (accountId: string) => {
    // Add wait to surface error from module
    await contas.deletarConta(accountId);
  };`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/context/ContasContext.tsx', code);
  console.log('ContasContext.tsx patched successfully');
}
