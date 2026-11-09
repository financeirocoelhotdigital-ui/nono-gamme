import fs from 'fs';
import path from 'path';

const componentsDir = 'src/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  content = content.replace(/bg-blue-950 p-6 text-slate-900/g, 'bg-blue-950 p-6 text-white');
  content = content.replace(/bg-blue-900 text-slate-900/g, 'bg-blue-900 text-white');
  content = content.replace(/bg-blue-600 text-slate-900/g, 'bg-blue-600 text-white');
  content = content.replace(/bg-blue-500 text-slate-900/g, 'bg-blue-500 text-white');
  content = content.replace(/bg-red-500 text-slate-900/g, 'bg-red-500 text-white');
  content = content.replace(/bg-red-600 text-slate-900/g, 'bg-red-600 text-white');
  content = content.replace(/bg-amber-500 text-slate-900/g, 'bg-amber-500 text-white');
  content = content.replace(/bg-emerald-400 text-slate-900/g, 'bg-emerald-400 text-white');
  content = content.replace(/bg-emerald-500 text-slate-900/g, 'bg-emerald-500 text-white');
  content = content.replace(/bg-emerald-600 text-slate-900/g, 'bg-emerald-600 text-white');
  content = content.replace(/bg-emerald-700 text-slate-900/g, 'bg-emerald-700 text-white');
  content = content.replace(/bg-purple-500 text-slate-900/g, 'bg-purple-500 text-white');
  content = content.replace(/bg-purple-600 text-slate-900/g, 'bg-purple-600 text-white');
  content = content.replace(/bg-\[#13111C\] text-slate-900/g, 'bg-[#13111C] text-white');
  content = content.replace(/bg-\[#0F0F13\] text-slate-900/g, 'bg-[#0F0F13] text-white');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
  }
}
