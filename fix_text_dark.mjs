import fs from 'fs';
import path from 'path';

const componentsDir = 'src/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  content = content.replace(/text-primary-dark/g, 'text-slate-900');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
  }
}
