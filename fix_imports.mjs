import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

const importRegex = /import\s+\{([^}]+)\}\s+from\s+"lucide-react";/;
content = content.replace(importRegex, (match, p1) => {
  return `import { ${p1}, ArrowDown, ArrowUp } from "lucide-react";`;
});

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
