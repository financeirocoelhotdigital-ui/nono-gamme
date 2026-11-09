import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

content = content.replace(
  'bg-white sm:bg-[#F8F9FA]', 
  'bg-[#F8F9FA]'
);

content = content.replace(
  'bg-white/80 backdrop-blur-xl border-b border-gray-100', 
  'bg-[#F8F9FA]'
);

content = content.replace(
  'text-xl font-black text-slate-900 tracking-tight',
  'text-[19px] font-bold text-slate-900'
);

content = content.replace(
  'className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"',
  'className="p-2 -ml-2 rounded-xl active:scale-95 transition-transform"'
);

// We need to fix the bell and more icon buttons styling in the header
content = content.replace(
  '<button className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center relative hover:bg-gray-100 active:scale-95 transition-all text-slate-700">',
  '<button className="p-2 relative active:scale-95 transition-transform text-slate-800">'
);
content = content.replace(
  '<span className="absolute top-2 right-2.5 w-2 h-2 bg-emerald-500 rounded-full border border-white"></span>',
  '<span className="absolute top-2 right-2.5 w-2 h-2 bg-[#0B8A46] rounded-full border border-white"></span>'
);
content = content.replace(
  '<button className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-slate-700">',
  '<button className="p-2 active:scale-95 transition-transform text-slate-800">'
);

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
