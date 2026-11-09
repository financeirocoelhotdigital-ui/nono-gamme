import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

content = content.replace(
  'parseFloat(targetValue.toString().replace(/\\./g, "").replace(",", "."))',
  '(parseFloat(targetValue.toString().replace(/\\./g, "").replace(",", ".")) || 0)'
);

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
