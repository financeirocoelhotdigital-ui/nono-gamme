import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

// Replace onSave in CreatePiggyBankModal to have better error handling and parsing
content = content.replace(
  'targetValue: Number(targetValue),',
  'targetValue: parseFloat(targetValue.toString().replace(",", ".")),'
);

content = content.replace(
  'await createPiggyBank(data);',
  'const res = await createPiggyBank(data); if (!res) alert("Erro ao criar cofrinho. Verifique os dados.");'
);

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
