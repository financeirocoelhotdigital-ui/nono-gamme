import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

const oldSave = `onClick={() => onSave({ name, targetValue: Number(targetValue) })}`;
const newSave = `onClick={() => onSave({ 
              name, 
              targetValue: Number(targetValue),
              currentValue: initialData?.currentValue || 0,
              icon: initialData?.icon || '💰',
              color: initialData?.color || 'bg-[#0B8A46]',
              status: initialData?.status || 'active',
              autoSave: initialData?.autoSave || false
            })}`;

content = content.replace(oldSave, newSave);

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
