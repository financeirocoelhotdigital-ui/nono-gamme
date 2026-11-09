import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

const missingModals = `

function CreatePiggyBankModal({ isOpen, onClose, initialData, onSave, onDelete }: any) {
  const [name, setName] = React.useState(initialData?.name || "");
  const [targetValue, setTargetValue] = React.useState(initialData?.targetValue?.toString() || "");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-dark/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-16 h-16 rounded-[24px] bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6">
          <Target size={32} strokeWidth={2.5} />
        </div>

        <h2 className="text-2xl font-black text-primary-dark tracking-tight mb-2">
          {initialData ? "Editar Cofrinho" : "Novo Cofrinho"}
        </h2>
        <p className="text-gray-500 text-sm font-medium mb-8">Defina um nome e um valor para o seu objetivo.</p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nome do Objetivo</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Viagem para Europa"
              className="w-full px-6 py-4 rounded-3xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500/50 font-bold text-primary-dark text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Valor Alvo (R$)</label>
            <input 
              type="number" 
              value={targetValue}
              onChange={e => setTargetValue(e.target.value)}
              placeholder="0,00"
              className="w-full px-6 py-4 rounded-3xl bg-gray-50 border-none focus:ring-2 focus:ring-emerald-500/50 font-bold text-primary-dark text-sm"
            />
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <button 
            onClick={() => onSave({ name, targetValue: Number(targetValue) })}
            disabled={!name || !targetValue}
            className="w-full py-5 rounded-[32px] bg-emerald-600 text-white font-black text-lg shadow-2xl shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            Salvar
          </button>
          
          {initialData && (
            <button 
              onClick={onDelete}
              className="w-full py-5 rounded-[32px] bg-rose-50 text-rose-500 font-bold text-sm transition-all active:scale-95"
            >
              Excluir Cofrinho
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function PiggyBankHistoryModal({ isOpen, onClose, bank }: any) {
  const history = [...(bank.history || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-dark/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full h-[90vh] md:h-auto md:max-h-[80vh] md:max-w-md rounded-t-[40px] md:rounded-[40px] p-6 flex flex-col fixed bottom-0 md:relative"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Histórico</h2>
            <p className="text-sm font-medium text-slate-500">{bank.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <History size={32} className="text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-400">Nenhuma movimentação</p>
            </div>
          ) : (
            history.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-3xl">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-[20px] flex items-center justify-center",
                    item.type === "in" ? "bg-[#E8F5E9] text-[#0B8A46]" : "bg-rose-50 text-rose-500"
                  )}>
                    {item.type === "in" ? <ArrowDown size={24} strokeWidth={2.5} /> : <ArrowUp size={24} strokeWidth={2.5} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{item.type === "in" ? "Depósito" : "Retirada"}</p>
                    <p className="text-xs font-medium text-slate-500">
                      {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '').replace(' de ', ' de ').replace(/ de (\d{4})/, ', $1')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-bold text-base",
                    item.type === "in" ? "text-[#0B8A46]" : "text-rose-500"
                  )}>
                    {item.type === "in" ? "+" : "-"} {formatCurrency(item.value)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
`;

content = content + missingModals;
fs.writeFileSync('src/components/PiggyBanks.tsx', content);
