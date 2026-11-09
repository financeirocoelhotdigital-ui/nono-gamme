import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

content = content.replace(
  'parseFloat(targetValue.toString().replace(",", "."))',
  'parseFloat(targetValue.toString().replace(/\\./g, "").replace(",", "."))'
);

content = content.replace(
  'parseFloat(value.replace(",", "."))',
  'parseFloat(value.toString().replace(/\\./g, "").replace(",", "."))'
);

content = content.replace(
  'parseFloat(value.replace(",", "."))',
  'parseFloat(value.toString().replace(/\\./g, "").replace(",", "."))'
);

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
