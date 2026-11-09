import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

const endOfPiggyBanks = content.indexOf('function PiggyBankActionModal');
if (endOfPiggyBanks > -1) {
  const topPart = content.substring(0, endOfPiggyBanks);
  const modalsPart = content.substring(endOfPiggyBanks);
  
  const startOfComponent = content.indexOf('export default function PiggyBanks');
  
  const newContent = content.substring(0, startOfComponent) + '\n\n' + modalsPart + '\n\n' + topPart.substring(startOfComponent);
  
  fs.writeFileSync('src/components/PiggyBanks.tsx', newContent);
  console.log("Moved modals above PiggyBanks");
}
