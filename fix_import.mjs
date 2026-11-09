import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');
if (!content.includes('ArrowRight,')) {
    content = content.replace('ArrowRightLeft,', 'ArrowRight, ArrowRightLeft,');
    fs.writeFileSync('src/components/PiggyBanks.tsx', content);
}
