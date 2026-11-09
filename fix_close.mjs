import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

content = content.replace(
  'const res = await createPiggyBank(data); if (!res) alert("Erro ao criar cofrinho. Verifique os dados.");',
  'const res = await createPiggyBank(data); if (!res) { alert("Erro ao criar cofrinho. Verifique os dados."); return; }'
);

// Do the same for updatePiggyBank just in case
content = content.replace(
  'await updatePiggyBank(selectedBank.id, data);',
  'const res = await updatePiggyBank(selectedBank.id, data); if (!res) { alert("Erro ao editar cofrinho. Verifique os dados."); return; }'
);

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
