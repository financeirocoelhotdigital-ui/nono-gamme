import fs from 'fs';

let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

// Update imports
const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+"lucide-react";/);
if (importMatch) {
  let imports = importMatch[1];
  const newIcons = ['ArrowLeft', 'Minus', 'ArrowUp', 'ArrowDown', 'MoreHorizontal', 'Bell', 'Edit2'];
  newIcons.forEach(icon => {
    if (!imports.includes(icon)) imports += `, ${icon}`;
  });
  content = content.replace(importMatch[0], `import { ${imports} } from "lucide-react";`);
}

// Find PiggyBanks component bounds
const startIdx = content.indexOf('export default function PiggyBanks() {');
const endIdx = content.indexOf('function PiggyBankActionModal', startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find bounds");
  process.exit(1);
}

// Extract modals logic
const modalsString = content.substring(content.indexOf('{/* Modals */}'), content.indexOf('    </div>\n  );', startIdx));

const newPiggyBanks = `export default function PiggyBanks() {
  const { piggyBanks, loading, createPiggyBank, updatePiggyBank, deletePiggyBank, addMoney, withdrawMoney } = usePiggyBanks();
  const { accounts } = useContas();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<PiggyBank | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"add" | "withdraw">("add");

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-lime border-t-transparent" />
      </div>
    );
  }

  const bank = selectedBank || piggyBanks[0];
  const progress = bank ? (bank.targetValue > 0 ? (bank.currentValue / bank.targetValue) * 100 : 0) : 0;
  const history = bank ? [...(bank.history || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  return (
    <div className="min-h-screen w-full font-sans text-slate-800 bg-[#F4F9F6] sm:bg-[#F8F9FA] pb-8 relative overflow-y-auto custom-scrollbar">
      {/* Modals */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreatePiggyBankModal 
            isOpen={isCreateModalOpen} 
            onClose={() => {
              setIsCreateModalOpen(false);
              setSelectedBank(null);
            }} 
            initialData={selectedBank}
            onSave={async (data) => {
              if (selectedBank) {
                await updatePiggyBank(selectedBank.id, data);
              } else {
                await createPiggyBank(data);
              }
              setIsCreateModalOpen(false);
              setSelectedBank(null);
            }}
            onDelete={async () => {
              if (selectedBank && confirm("Deseja realmente excluir este cofrinho?")) {
                await deletePiggyBank(selectedBank.id);
                setIsCreateModalOpen(false);
                setSelectedBank(null);
              }
            }}
          />
        )}

        {isActionModalOpen && selectedBank && (
          <PiggyBankActionModal 
            isOpen={isActionModalOpen}
            onClose={() => {
              setIsActionModalOpen(false);
              setSelectedBank(null);
            }}
            bank={selectedBank}
            type={actionType}
            accounts={accounts}
            onConfirm={async (value, accountId, description) => {
              if (actionType === "add") {
                await addMoney(selectedBank.id, value, accountId, description);
              } else {
                await withdrawMoney(selectedBank.id, value, accountId, description);
              }
              setIsActionModalOpen(false);
              setSelectedBank(null);
            }}
          />
        )}

        {isHistoryModalOpen && selectedBank && (
          <PiggyBankHistoryModal 
            isOpen={isHistoryModalOpen}
            onClose={() => {
              setIsHistoryModalOpen(false);
              setSelectedBank(null);
            }}
            bank={selectedBank}
          />
        )}
      </AnimatePresence>

      {!bank ? (
        <div className="flex flex-col items-center justify-center pt-32 px-6">
          <div className="w-24 h-24 rounded-[40px] bg-white flex items-center justify-center text-gray-300 shadow-sm mb-6">
            <PiggyIcon size={48} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum cofrinho criado</h3>
          <p className="text-slate-500 text-center mb-8">Comece a guardar dinheiro para seus sonhos.</p>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-emerald-600 text-white px-8 py-4 rounded-3xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            Criar meu primeiro cofrinho
          </button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top,1.5rem),1.5rem)] pb-4 sticky top-0 z-10 bg-[#F4F9F6] sm:bg-[#F8F9FA]">
            <div className="flex items-center gap-4">
              <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-xl active:scale-95 transition-transform">
                <ArrowLeft size={24} className="text-slate-900" />
              </button>
              <h1 className="text-[19px] font-bold text-slate-900">Cofrinho</h1>
            </div>
            <div className="flex items-center gap-2 text-slate-900">
              <button className="p-2 relative active:scale-95 transition-transform">
                <Bell size={22} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border border-white"></span>
              </button>
              <button className="p-2 active:scale-95 transition-transform">
                <MoreHorizontal size={22} />
              </button>
            </div>
          </div>

          {/* Main Piggy Bank Card */}
          <div className="mx-4 mt-2 mb-6 bg-white rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 relative">
            <button 
              onClick={() => { setSelectedBank(bank); setIsCreateModalOpen(true); }} 
              className="absolute top-4 right-4 w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              <Edit2 size={18} strokeWidth={2.5} />
            </button>
            
            <div className="flex pt-4">
              <div className="w-[45%] flex items-center justify-center -ml-4">
                <img 
                  src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=400" 
                  alt="Piggy Bank" 
                  className="w-[140px] h-[140px] object-cover mix-blend-multiply drop-shadow-md" 
                />
              </div>
              <div className="w-[55%] flex flex-col justify-center pl-2 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-0.5">Saldo atual</p>
                  <p className="text-2xl font-bold text-emerald-600 tracking-tight">{formatCurrency(bank.currentValue)}</p>
                </div>
                <div className="w-full h-px bg-gray-100/80"></div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-0.5">Objetivo</p>
                  <p className="text-[17px] font-bold text-slate-800 tracking-tight">{formatCurrency(bank.targetValue)}</p>
                </div>
                <div className="w-full h-px bg-gray-100/80"></div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Progresso</p>
                  <p className="text-[17px] font-bold text-emerald-600 mb-2">{Math.round(progress)}%</p>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div style={{ width: \`\${Math.min(progress, 100)}%\` }} className="h-full bg-emerald-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 space-y-3 mb-6">
            <button 
              onClick={() => { setSelectedBank(bank); setActionType("add"); setIsActionModalOpen(true); }} 
              className="w-full bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Plus size={20} strokeWidth={3} />
                </div>
                <span className="font-bold text-emerald-600 text-[15px]">Adicionar dinheiro</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>

            <button 
              onClick={() => { setSelectedBank(bank); setActionType("withdraw"); setIsActionModalOpen(true); }} 
              className="w-full bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50/50 text-emerald-600 flex items-center justify-center">
                  <Minus size={20} strokeWidth={3} />
                </div>
                <span className="font-bold text-emerald-600 text-[15px]">Retirar dinheiro</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Últimas movimentações */}
          <div className="mx-4 bg-white rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-[15px]">Últimas movimentações</h3>
              <button 
                onClick={() => { setSelectedBank(bank); setIsHistoryModalOpen(true); }} 
                className="flex items-center gap-1 text-emerald-600 font-bold text-xs"
              >
                Ver todas <ChevronRight size={14} strokeWidth={3} />
              </button>
            </div>
            
            <div className="space-y-5">
              {history.length === 0 ? (
                <p className="text-sm text-slate-500 font-medium text-center py-4">Nenhuma movimentação</p>
              ) : (
                history.slice(0, 4).map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        item.type === "in" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                      )}>
                        {item.type === "in" ? <ArrowDown size={18} strokeWidth={2.5} /> : <ArrowUp size={18} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-[14px]">{item.type === "in" ? "Depósito" : "Retirada"}</p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={cn(
                        "font-bold text-[14px]",
                        item.type === "in" ? "text-emerald-600" : "text-rose-500"
                      )}>
                        {item.type === "in" ? "+" : "-"} {formatCurrency(item.value)}
                      </p>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Objetivo do cofrinho */}
          <div className="mx-4 bg-white rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-[1.5px] border-emerald-600 text-emerald-600 flex items-center justify-center">
                <Target size={24} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-[14px]">Objetivo do cofrinho</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{bank.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Meta: {formatCurrency(bank.targetValue)}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </div>
      )}
    </div>
  );
}
\n`;

// Also we should remove PiggyBankCard if it's there
let tailContent = content.substring(endIdx);
const piggyCardStart = tailContent.indexOf('function PiggyBankCard');
if (piggyCardStart !== -1) {
  const piggyCardEnd = tailContent.indexOf('export default', piggyCardStart) > -1 ? tailContent.indexOf('export default', piggyCardStart) : tailContent.length;
  // If there's no export default after PiggyBankCard, it goes to the end
  tailContent = tailContent.substring(0, piggyCardStart) + tailContent.substring(piggyCardEnd);
}

fs.writeFileSync('src/components/PiggyBanks.tsx', content.substring(0, startIdx) + newPiggyBanks + tailContent);
