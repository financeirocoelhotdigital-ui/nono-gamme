import fs from 'fs';
let content = fs.readFileSync('src/components/PiggyBanks.tsx', 'utf-8');

const startIdx = content.indexOf('  const renderDetailView = () => {');
const endMarker = '  return (\n    <div className="min-h-screen';
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    const topPart = content.substring(0, startIdx);
    const bottomPart = content.substring(endIdx);
    
    const newDetailView = `  const renderDetailView = () => {
    if (!selectedBank) return null;
    const bank = selectedBank;
    const progress = bank.targetValue > 0 ? (bank.currentValue / bank.targetValue) * 100 : 0;
    const cappedProgress = Math.min(progress, 100);
    const isCompleted = cappedProgress >= 100;
    const history = [...(bank.history || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="pb-24 max-w-3xl mx-auto"
      >
        {/* Main Card */}
        <div className="mx-4 mt-2 bg-white rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 relative overflow-hidden">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="absolute top-4 right-4 w-10 h-10 bg-[#E8F5E9] rounded-full flex items-center justify-center text-[#0B8A46] hover:bg-emerald-100 transition-colors z-20"
          >
            <Edit2 size={18} strokeWidth={2.5} />
          </button>

          {isCompleted && (
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-[#0B8A46] text-white px-3 py-1 rounded-full shadow-lg">
              <Sparkles size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Objetivo Atingido!</span>
            </div>
          )}

          <div className="flex pt-4 sm:pt-2 relative z-10">
            <div className="w-[45%] flex items-center justify-center -ml-4 relative">
              <img 
                src={PremiumPiggyBankImg} 
                alt="Piggy Bank" 
                className="w-[180px] h-[180px] object-contain drop-shadow-xl z-10"
                style={{ scale: 1.1, transformOrigin: "left center" }}
              />
            </div>

            <div className="w-[55%] flex flex-col justify-center pl-2 space-y-4">
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
                <p className="text-[22px] font-bold text-[#0B8A46] leading-none mb-2">{Math.round(cappedProgress)}%</p>
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: \`\${cappedProgress}%\` }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-[#0B8A46] rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 mt-6 space-y-3">
          <button 
            onClick={() => { setActionType("add"); setIsActionModalOpen(true); }}
            className="w-full bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#E8F5E9] text-[#0B8A46] flex items-center justify-center">
                <Plus size={20} strokeWidth={3} />
              </div>
              <span className="font-bold text-[#0B8A46] text-[15px]">Adicionar dinheiro</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>

          <button 
            onClick={() => { setActionType("withdraw"); setIsActionModalOpen(true); }}
            className="w-full bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#E8F5E9] text-[#0B8A46] flex items-center justify-center">
                <Minus size={20} strokeWidth={3} />
              </div>
              <span className="font-bold text-[#0B8A46] text-[15px]">Retirar dinheiro</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Últimas Movimentações */}
        <div className="mx-4 mt-6 bg-white rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 text-[15px]">Últimas movimentações</h3>
            <button 
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-1 text-[#0B8A46] font-bold text-[13px] hover:opacity-80 transition-opacity"
            >
              Ver todas <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
          
          <div className="space-y-5">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-[20px]">
                <p className="text-sm text-slate-500 font-bold">Nenhuma movimentação ainda</p>
                <p className="text-xs text-slate-400 mt-1">Adicione dinheiro ao seu cofrinho para começar.</p>
              </div>
            ) : (
              history.slice(0, 4).map((item, index) => (
                <React.Fragment key={item.id}>
                  <div className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                        item.type === "in" ? "bg-[#E8F5E9] text-[#0B8A46]" : "bg-[#FFEBEE] text-rose-500"
                      )}>
                        {item.type === "in" ? <ArrowDown size={20} strokeWidth={2.5} /> : <ArrowUp size={20} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-[14px]">{item.type === "in" ? "Depósito" : "Retirada"}</p>
                        <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                          {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '').replace(' de ', ' de ').replace(/ de (\d{4})/, ', $1')}
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
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </div>
                  {index < Math.min(history.length, 4) - 1 && (
                    <div className="w-full h-[1px] bg-gray-50 my-1" />
                  )}
                </React.Fragment>
              ))
            )}
          </div>
        </div>

        {/* Card Objetivo */}
        <div className="mx-4 mt-6 mb-8 bg-white rounded-[28px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow active:scale-95">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-[1.5px] border-[#0B8A46] text-[#0B8A46] flex items-center justify-center shrink-0">
              <Target size={26} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-[14px] mb-0.5">Objetivo do cofrinho</h3>
              <p className="text-[13px] font-medium text-slate-500 mb-0.5 truncate max-w-[180px]">{bank.name}</p>
              <p className="text-[12px] font-medium text-slate-400">Meta: {formatCurrency(bank.targetValue)}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-300" />
        </div>
      </motion.div>
    );
  };
`;

    fs.writeFileSync('src/components/PiggyBanks.tsx', topPart + newDetailView + bottomPart);
} else {
    console.log("Could not find start or end markers");
}
