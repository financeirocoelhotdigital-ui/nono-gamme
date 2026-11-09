import fs from 'fs';
import path from 'path';

const componentsDir = 'src/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // We should revert text-slate-900 back to text-white if it is right next to a solid background
  // Or better yet, we just change text-white only in specific dark cards context. But it's already done.
  // Let's fix the solid green buttons.
  content = content.replace(/bg-emerald-500 text-slate-900/g, 'bg-emerald-500 text-white');
  content = content.replace(/bg-emerald-600 text-slate-900/g, 'bg-emerald-600 text-white');
  content = content.replace(/bg-primary-green text-slate-900/g, 'bg-primary-green text-white');
  content = content.replace(/bg-\[#10B981\] text-slate-900/g, 'bg-[#10B981] text-white');
  content = content.replace(/bg-[#0B8A46] text-slate-900/g, 'bg-[#0B8A46] text-white');
  content = content.replace(/bg-slate-900 text-slate-900/g, 'bg-slate-900 text-white');
  content = content.replace(/text-slate-900 px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500\/20/g, 'text-white px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/20');

  // Any button that has bg-primary-green should have text-white
  // Not easily regex-able. 

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
  }
}
