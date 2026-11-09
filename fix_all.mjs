import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

// Fix PiggyBankActionModal input type
content = content.replace(
  'type="number" \n                value={value}',
  'type="text" inputMode="decimal"\n                value={value}'
);

// Fix PiggyBankActionModal onConfirm parse
content = content.replace(
  'onClick={() => onConfirm(Number(value), accountId, description)}',
  'onClick={() => onConfirm(parseFloat(value.replace(",", ".")), accountId, description)}'
);

content = content.replace(
  'disabled={!value || Number(value) <= 0}',
  'disabled={!value || parseFloat(value.replace(",", ".")) <= 0}'
);

// Fix onConfirm logic in PiggyBanks component
content = content.replace(
  'if (actionType === "add") {\n                await addMoney(selectedBank.id, value, accountId, description);\n              } else {\n                await withdrawMoney(selectedBank.id, value, accountId, description);\n              }',
  'let success = false;\n              if (actionType === "add") {\n                success = await addMoney(selectedBank.id, value, accountId, description);\n              } else {\n                success = await withdrawMoney(selectedBank.id, value, accountId, description);\n              }\n              if (!success) { alert("Ocorreu um erro ao processar a operação."); return; }'
);

// We already fixed CreatePiggyBankModal onSave in test_create.mjs. But let's check if it exists:
if (!content.includes('const res = await createPiggyBank(data);')) {
  console.log("Create modal not fixed properly yet");
}

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
