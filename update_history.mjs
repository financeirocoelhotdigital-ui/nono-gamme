import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

const targetStr = `<div className="space-y-5">`;
const endStr = `{/* Objetivo do cofrinho */}`;

const newSection = `<div className="space-y-5">
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 font-medium text-center py-4">Nenhuma movimentação</p>
              ) : (
                history.slice(0, 4).map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        item.type === "in" ? "bg-[#E8F5E9] text-[#0B8A46]" : "bg-rose-50 text-rose-500"
                      )}>
                        {item.type === "in" ? <ArrowDown size={20} strokeWidth={2.5} /> : <ArrowUp size={20} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-[14px]">{item.type === "in" ? "Depósito" : "Retirada"}</p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' de ', ' de ').replace('.', ',')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={cn(
                        "font-bold text-[14px]",
                        item.type === "in" ? "text-[#0B8A46]" : "text-rose-500"
                      )}>
                        {item.type === "in" ? "+" : "-"} {formatCurrency(item.value)}
                      </p>
                      <ChevronRight size={18} className="text-gray-400" />
                    </div>
                  </div>
                ))
              )}
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
