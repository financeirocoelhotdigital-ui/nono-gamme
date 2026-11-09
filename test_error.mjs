import fs from 'fs';
let content = fs.readFileSync('src/modules/piggyBankModule.ts', 'utf-8');

content = content.replace(
  'handleFirestoreError(error, OperationType.CREATE, "piggyBanks");',
  'console.error("FIREBASE ERROR CREATE PIGGY:", error); handleFirestoreError(error, OperationType.CREATE, "piggyBanks");'
);

fs.writeFileSync('src/modules/piggyBankModule.ts', content);
