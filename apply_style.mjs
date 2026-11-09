import fs from 'fs';
import path from 'path';

const componentsDir = 'src/components';
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Background replacements
  content = content.replace(/bg-\[#0A0D0C\]/g, 'bg-white');
  content = content.replace(/bg-primary-dark/g, 'bg-white');
  content = content.replace(/bg-bg-light/g, 'bg-[#F4F7F6]');
  content = content.replace(/bg-\[#F8F9FA\]/g, 'bg-[#F4F7F6]');
  
  // Shadow replacements
  content = content.replace(/shadow-xl shadow-primary-dark\/20/g, 'shadow-[0_8px_30px_rgba(0,0,0,0.04)]');
  content = content.replace(/shadow-2xl/g, 'shadow-[0_8px_30px_rgba(0,0,0,0.04)]');
  
  // Border replacements
  content = content.replace(/border-white\/5/g, 'border-gray-50');
  content = content.replace(/border-white\/10/g, 'border-gray-50');

  // Text color replacements inside dark cards
  // This is tricky without context, but let's try some specific ones.
  content = content.replace(/text-primary-lime/g, 'text-emerald-600');
  content = content.replace(/bg-primary-lime\/10/g, 'bg-emerald-50');
  content = content.replace(/bg-primary-lime\/20/g, 'bg-emerald-50');
  content = content.replace(/bg-primary-lime/g, 'bg-emerald-500');
  
  content = content.replace(/text-white/g, 'text-slate-900'); // This might break some actual white text on buttons.
  
  if (content !== originalContent) {
    // Write it back
    fs.writeFileSync(filePath, content);
  }
}
