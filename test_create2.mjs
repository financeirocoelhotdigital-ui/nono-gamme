import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

content = content.replace(
  'type="number" \n              value={targetValue}',
  'type="text" inputMode="decimal"\n              value={targetValue}'
);

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
