import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

// Replace emerald-600 with #0B8A46 for these buttons
content = content.replace(/emerald-60/g, '[#0B8A46]');
content = content.replace(/text-emerald-500/g, 'text-[#0B8A46]');

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
