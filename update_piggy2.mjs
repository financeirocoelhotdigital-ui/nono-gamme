import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

const targetStr = `<div className="flex pt-4">`;
const endStr = `{/* Action Buttons */}`;

const newSection = `
            <div className="flex pt-2">
              <div className="w-[48%] flex items-center justify-center -ml-6 relative">
                <img 
                  src="/porquinho.png" 
                  alt="Piggy Bank" 
                  className="w-[180px] h-[180px] object-contain drop-shadow-xl z-10" 
                  onError={(e) => {
                    // Fallback se a imagem não existir
                    e.currentTarget.src = "https://cdn3d.iconscout.com/3d/premium/thumb/piggy-bank-4993437-4161109.png";
                  }}
                />
              </div>
              <div className="w-[52%] flex flex-col justify-center pl-0 pr-2 space-y-4">
                <div>
                  <p className="text-[13px] font-medium text-slate-500 mb-1">Saldo atual</p>
                  <p className="text-[32px] font-bold text-[#0B8A46] tracking-tight leading-none">{formatCurrency(bank.currentValue)}</p>
                </div>
                <div className="w-full h-[1px] bg-gray-100"></div>
                <div>
                  <p className="text-[13px] font-medium text-slate-500 mb-1">Objetivo</p>
                  <p className="text-[17px] font-bold text-slate-900 tracking-tight leading-none">{formatCurrency(bank.targetValue)}</p>
                </div>
                <div className="w-full h-[1px] bg-gray-100"></div>
                <div>
                  <p className="text-[13px] font-medium text-slate-500 mb-2">Progresso</p>
                  <p className="text-[22px] font-bold text-[#0B8A46] leading-none mb-2">{Math.round(progress)}%</p>
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                    <div style={{ width: \`\${Math.min(progress, 100)}%\` }} className="h-full bg-[#0B8A46] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          `;

const startIdx = content.indexOf(targetStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + newSection + content.substring(endIdx);
  fs.writeFileSync('src/components/PiggyBanks.tsx', content);
} else {
  console.log("Could not find targets");
}
