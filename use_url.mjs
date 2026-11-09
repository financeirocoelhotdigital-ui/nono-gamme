import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

content = content.replace(
  'src="/porquinho.png"',
  'src="https://cdn3d.iconscout.com/3d/premium/thumb/piggy-bank-4993437-4161109.png"'
);

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
