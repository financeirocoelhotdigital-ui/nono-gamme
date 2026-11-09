import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

content = content.replace(
  "new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' de ', ' de ').replace('.', ',')",
  "new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '').replace(' de ', ' de ').replace(/ de (\\d{4})/, ', $1')"
);

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
