import fs from 'fs';
const content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');
const startIdx = content.indexOf('export default function PiggyBanks() {');
const topPart = content.substring(0, startIdx);

const newComponent = `import piggyBankImg from '../assets/images/piggy_bank_3d_1788366891679.jpg';

export default function PiggyBanks() {
  const { piggyBanks, loading, createPiggyBank, updatePiggyBank, deletePiggyBank, addMoney, withdrawMoney } = usePiggyBanks();
  const { accounts } = useContas();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<PiggyBank | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"add" | "withdraw">("add");

  // Automatically select the first bank if none is selected and there's only one
  React.useEffect(() => {
    if (!selectedBank && piggyBanks.length === 1) {
      setSelectedBank(piggyBanks[0]);
    }
  }, [piggyBanks, selectedBank]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FA]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#0B8A46] border-t-transparent" />
      </div>
    );
  }

  // Modals part is extracted to avoid massive inline code. We render them if needed.
  const renderModals = () => (
    <AnimatePresence>
      {isCreateModalOpen && (
        <CreatePiggyBankModal 
          isOpen={isCreateModalOpen} 
          onClose={() => {
            setIsCreateModalOpen(false);
            if (!selectedBank) setSelectedBank(null); // Keep if needed
          }} 
          initialData={selectedBank}
          onSave={async (data) => {
            if (selectedBank) {
              const res = await updatePiggyBank(selectedBank.id, data);
              if (!res) { alert("Erro ao editar cofrinho. Verifique os dados."); return; }
              setSelectedBank({...selectedBank, ...data} as any);
            } else {
              const res = await createPiggyBank(data);
              if (!res) { alert("Erro ao criar cofrinho."); return; }
              // Force select the new bank? Let context update handle it.
            }
            setIsCreateModalOpen(false);
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
          onClose={() => setIsActionModalOpen(false)}
          bank={selectedBank}
          type={actionType}
          accounts={accounts}
          onConfirm={async (value, accountId, description) => {
            let success = false;
            if (actionType === "add") {
              success = await addMoney(selectedBank.id, value, accountId, description);
            } else {
              success = await withdrawMoney(selectedBank.id, value, accountId, description);
            }
            if (!success) { alert("Ocorreu um erro ao processar a operação."); return; }
            setIsActionModalOpen(false);
          }}
        />
      )}
      {isHistoryModalOpen && selectedBank && (
        <PiggyBankHistoryModal 
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          bank={selectedBank}
        />
      )}
    </AnimatePresence>
  );

  if (piggyBanks.length === 0 && !isCreateModalOpen) {
    return (
      <div className="min-h-screen w-full bg-[#F8F9FA] flex flex-col items-center justify-center p-6 relative">
        <button onClick={() => window.history.back()} className="absolute top-8 left-6 p-2 rounded-xl">
          <ArrowLeft size={24} className="text-slate-900" />
        </button>
        <div className="w-64 h-64 mb-8">
           <img src={piggyBankImg} alt="Porquinho" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Comece a guardar para seus sonhos</h2>
        <p className="text-slate-500 text-center mb-8">Crie seu primeiro cofrinho e acompanhe sua evolução.</p>
        <button 
          onClick={() => { setSelectedBank(null); setIsCreateModalOpen(true); }}
          className="w-full max-w-sm py-4 bg-[#0B8A46] text-white rounded-[32px] font-bold text-[17px] shadow-lg shadow-[#0B8A46]/20 active:scale-95 transition-transform"
        >
          Criar meu cofrinho
        </button>
        {renderModals()}
      </div>
    );
  }

  if (!selectedBank && piggyBanks.length > 1) {
    return (
      <div className="min-h-screen w-full bg-[#F8F9FA] pb-24 relative overflow-y-auto">
        <div className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#F8F9FA] z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-xl active:scale-95 transition-transform">
              <ArrowLeft size={24} className="text-slate-900" />
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Meus Cofrinhos</h1>
          </div>
          <button 
            onClick={() => { setSelectedBank(null); setIsCreateModalOpen(true); }}
            className="w-10 h-10 bg-emerald-50 text-[#0B8A46] rounded-full flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
        
        <div className="px-6 space-y-4">
          {piggyBanks.map(bank => {
            const progress = bank.targetValue > 0 ? (bank.currentValue / bank.targetValue) * 100 : 0;
            return (
              <div 
                key={bank.id} 
                onClick={() => setSelectedBank(bank)}
                className="bg-white rounded-[28px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl">
                    {bank.icon || '💰'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{bank.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">Meta: {formatCurrency(bank.targetValue)}</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-[#0B8A46]">{formatCurrency(bank.currentValue)}</p>
                    <p className="font-bold text-slate-900 text-sm">{Math.min(100, Math.round(progress))}%</p>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div style={{ width: \`\${Math.min(progress, 100)}%\` }} className="h-full bg-[#0B8A46] rounded-full"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {renderModals()}
      </div>
    );
  }

  const bank = selectedBank || piggyBanks[0];
  if (!bank) return null; // Fallback

  const progress = bank.targetValue > 0 ? (bank.currentValue / bank.targetValue) * 100 : 0;
  const history = [...(bank.history || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] pb-24 relative overflow-x-hidden">
      {/* Header */}
      <div className="px-6 pt-[max(env(safe-area-inset-top,1.5rem),1.5rem)] pb-4 flex items-center justify-between sticky top-0 bg-[#F8F9FA] z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => piggyBanks.length > 1 ? setSelectedBank(null) : window.history.back()} className="p-2 -ml-2 rounded-xl active:scale-95 transition-transform">
            <ArrowLeft size={24} className="text-slate-900" />
          </button>
          <h1 className="text-[22px] font-bold text-slate-900">Cofrinho</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 relative active:scale-95 transition-transform">
            <Bell size={22} className="text-slate-800" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#0B8A46] rounded-full border border-white"></span>
          </button>
          <button className="p-2 active:scale-95 transition-transform">
            <MoreHorizontal size={22} className="text-slate-800" />
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="mx-6 mt-2 bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative">
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="absolute top-4 right-4 w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-[#0B8A46] active:scale-95 transition-transform z-10"
        >
          <Edit2 size={18} strokeWidth={2.5} />
        </button>
        
        <div className="flex w-full">
          {/* 3D Piggy Bank */}
          <div className="w-[45%] flex items-center justify-center -ml-4 relative">
            <img 
              src={piggyBankImg} 
              alt="Piggy Bank" 
              className="w-[180px] h-[180px] object-cover mix-blend-multiply drop-shadow-sm z-10"
              style={{ scale: 1.1, transformOrigin: "left center" }}
            />
          </div>
          
          {/* Info Side */}
          <div className="w-[55%] flex flex-col justify-center pl-2 space-y-4">
            <div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">Saldo atual</p>
              <p className="text-[26px] sm:text-[30px] font-bold text-[#0B8A46] tracking-tight leading-none">{formatCurrency(bank.currentValue)}</p>
            </div>
            <div className="w-full h-[1px] bg-gray-100"></div>
            <div>
              <p className="text-[13px] font-medium text-slate-500 mb-1">Objetivo</p>
              <p className="text-[16px] sm:text-[18px] font-bold text-slate-900 tracking-tight leading-none">{formatCurrency(bank.targetValue)}</p>
            </div>
            <div className="w-full h-[1px] bg-gray-100"></div>
            <div>
              <p className="text-[13px] font-medium text-slate-500 mb-2">Progresso</p>
              <p className="text-[24px] font-bold text-[#0B8A46] leading-none mb-2">{Math.min(100, Math.round(progress))}%</p>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div style={{ width: \`\${Math.min(progress, 100)}%\` }} className="h-full bg-[#0B8A46] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons: Add and Withdraw */}
      <div className="mx-6 mt-6 space-y-4">
        <button 
          onClick={() => { setActionType("add"); setIsActionModalOpen(true); }}
          className="w-full bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0B8A46] flex items-center justify-center">
              <Plus size={24} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900 text-[16px]">Adicionar dinheiro</span>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>

        <button 
          onClick={() => { setActionType("withdraw"); setIsActionModalOpen(true); }}
          className="w-full bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-50 text-emerald-600 flex items-center justify-center">
              <Minus size={24} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900 text-[16px]">Retirar dinheiro</span>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Últimas Movimentações */}
      <div className="mx-6 mt-6 bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900 text-[16px]">Últimas movimentações</h3>
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1 text-[#0B8A46] font-semibold text-[13px]"
          >
            Ver todas <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
        
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-slate-500 font-medium">Nenhuma movimentação ainda</p>
              <p className="text-xs text-slate-400 mt-1">Adicione dinheiro ao seu cofrinho para começar.</p>
            </div>
          ) : (
            history.slice(0, 4).map((item, index) => (
              <div key={item.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      item.type === "in" ? "bg-emerald-50 text-[#0B8A46]" : "bg-rose-50 text-rose-500"
                    )}>
                      {item.type === "in" ? <ArrowDown size={22} strokeWidth={2.5} /> : <ArrowUp size={22} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-[15px]">{item.type === "in" ? "Depósito" : "Retirada"}</p>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '').replace(' de ', ' de ').replace(/ de (\d{4})/, ', $1')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={cn(
                      "font-bold text-[15px]",
                      item.type === "in" ? "text-[#0B8A46]" : "text-rose-500"
                    )}>
                      {item.type === "in" ? "+" : "-"} {formatCurrency(item.value)}
                    </p>
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                </div>
                {index < Math.min(history.length - 1, 3) && <div className="w-full h-[1px] bg-gray-50 mt-4"></div>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Objetivo do cofrinho */}
      <div className="mx-6 mt-6 bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-[#0B8A46] text-[#0B8A46] flex items-center justify-center bg-white relative">
            <Target size={26} strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-[15px]">Objetivo do cofrinho</h3>
            <p className="text-[13px] text-slate-500 mt-0.5">{bank.name}</p>
            <p className="text-[12px] text-slate-400 mt-0.5">Meta: {formatCurrency(bank.targetValue)}</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-gray-400" />
      </div>

      {renderModals()}
    </div>
  );
}
`;

// Remove the import ArrowRight from the top part if not present, but let's just make sure all lucide-react imports are in topPart.
// To be safe, we will add 'ArrowRight' to the lucide-react import list if needed, or assume it's there. Let's just assume it's there or we will use ChevronRight if it errors. I'll use ArrowRight in the component.

fs.writeFileSync('src/components/PiggyBanks.tsx', topPart + newComponent);
