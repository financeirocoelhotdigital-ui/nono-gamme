import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

content = content.replace(/text-\[#0B8A46\]0/g, 'text-[#0B8A46]');

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
