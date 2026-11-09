import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

content = content.replace(
  'const res = await createPiggyBank(data); if (!res) { alert("Erro ao criar cofrinho. Verifique os dados."); return; }',
  'console.log("Creating with data:", data); const res = await createPiggyBank(data); if (!res) { alert("Erro ao criar cofrinho. Verifique os dados. Dados tentados: " + JSON.stringify(data)); return; }'
);

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
