import fs from 'fs';
let content = fs.readFileSync('src/modules/piggyBankModule.ts', 'utf-8');
content = content.replace('type: "expense",', 'type: "transfer",');
content = content.replace('type: "income",', 'type: "transfer",');
fs.writeFileSync('src/modules/piggyBankModule.ts', content);
