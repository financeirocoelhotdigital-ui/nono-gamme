import fs from 'fs';

const content = `import React, { useState, useMemo } from "react";
import { 
  Plus, Target, History, Settings, Trash2, ChevronRight, AlertCircle, CheckCircle2, 
  ArrowRightLeft, Calendar, Sparkles, Info, X, Zap, ArrowLeft, Minus, MoreHorizontal, 
  Bell, Edit2, ArrowDown, ArrowUp, PiggyBank as PiggyIcon, Search, Filter, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePiggyBanks } from "../context/PiggyBankContext";
import { useContas } from "../context/ContasContext";
import { PiggyBank, PiggyBankHistory } from "../types";
import { cn, formatCurrency } from "../lib/utils";

// Imagem premium gerada
import PremiumPiggyBankImg from '../assets/images/premium_3d_piggy_bank_1788366869999.jpg';

// ... Modals definitions will be placed here (Action, Create, History, etc.)

function PiggyBankActionModal({ isOpen, onClose, bank, type, accounts, onConfirm }: any) {
  const [value, setValue] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const isAdd = type === "add";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-primary-dark/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white w-full h-[90vh] sm:h-auto sm:max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl flex flex-col relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className={cn(
          "w-16 h-16 rounded-[24px] flex items-center justify-center mb-6",
          isAdd ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
        )}>
          {isAdd ? <Plus size={32} strokeWidth={2.5} /> : <Minus size={32} strokeWidth={2.5} />}
        </div>

        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          {isAdd ? "Adicionar dinheiro" : "Retirar dinheiro"}
        </h2>
        <p className="text-slate-500 font-medium mb-8">
          {isAdd ? "De qual conta o dinheiro vai sair?" : "Para qual conta o dinheiro vai?"}
        </p>

        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Valor (R$)</label>
            <div className="relative">
              <input 
                type="text" inputMode="decimal"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="0,00"
                className="w-full px-8 py-6 rounded-[32px] bg-gray-50 border-none focus:ring-4 focus:ring-emerald-500/20 font-black text-3xl text-slate-900"
              />
              <div className={cn(
                "absolute right-6 top-1/2 -translate-y-1/2 font-bold",
                isAdd ? "text-emerald-500" : "text-rose-500"
              )}>
                {isAdd ? "+" : "-"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">
              {isAdd ? "Conta de Origem" : "Conta de Destino"}
            </label>
            <select 
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full px-8 py-5 rounded-[32px] bg-gray-50 border-none focus:ring-4 focus:ring-emerald-500/20 font-bold text-slate-900 appearance-none"
            >
              <option value="" disabled>Selecione a conta</option>
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>{acc.name} (Saldo: {formatCurrency(acc.balance)})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Descrição (Opcional)</label>
            <input 
              type="text" 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Depósito do mês"
              className="w-full px-8 py-5 rounded-[32px] bg-gray-50 border-none focus:ring-4 focus:ring-emerald-500/20 font-medium text-slate-900"
            />
          </div>
          
          {!isAdd && Number(value) > bank.currentValue && (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-2xl">
              <AlertCircle size={18} />
              <span className="text-sm font-bold">Saldo insuficiente no cofrinho</span>
            </div>
          )}
        </div>

        <button 
          onClick={() => onConfirm((parseFloat(value.toString().replace(/\\./g, "").replace(",", ".")) || 0), accountId, description)}
          disabled={!value || (parseFloat(value.toString().replace(/\\./g, "").replace(",", ".")) || 0) <= 0 || !accountId || (!isAdd && (parseFloat(value.toString().replace(/\\./g, "").replace(",", ".")) || 0) > bank.currentValue)}
          className={cn(
            "w-full mt-6 py-5 rounded-[32px] font-black text-lg shadow-2xl transition-all active:scale-95 disabled:opacity-50",
            isAdd 
              ? "bg-emerald-600 text-white shadow-emerald-600/30" 
              : "bg-slate-900 text-white shadow-slate-900/20"
          )}
        >
          Confirmar {isAdd ? "Depósito" : "Retirada"}
        </button>
      </motion.div>
    </div>
  );
}

function CreatePiggyBankModal({ isOpen, onClose, initialData, onSave, onDelete }: any) {
  const [name, setName] = React.useState(initialData?.name || "");
  const [targetValue, setTargetValue] = React.useState(initialData?.targetValue?.toString() || "");

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-primary-dark/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white w-full h-[90vh] sm:h-auto sm:max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl relative flex flex-col"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="w-16 h-16 rounded-[24px] bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
          <PiggyIcon size={32} strokeWidth={2.5} />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          {initialData ? "Editar Cofrinho" : "Novo Cofrinho"}
        </h2>
        <p className="text-slate-500 font-medium mb-8">
          Defina o objetivo e acompanhe o seu progresso.
        </p>

        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nome do Objetivo</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Viagem para Europa"
              className="w-full px-8 py-5 rounded-[32px] bg-gray-50 border-none focus:ring-4 focus:ring-emerald-500/20 font-bold text-slate-900 text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Valor da Meta (R$)</label>
            <input 
              type="text" inputMode="decimal"
              value={targetValue}
              onChange={e => setTargetValue(e.target.value)}
              placeholder="0,00"
              className="w-full px-8 py-5 rounded-[32px] bg-gray-50 border-none focus:ring-4 focus:ring-emerald-500/20 font-bold text-slate-900 text-lg"
            />
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <button 
            onClick={() => onSave({ 
              name, 
              targetValue: (parseFloat(targetValue.toString().replace(/\\./g, "").replace(",", ".")) || 0),
              currentValue: initialData?.currentValue || 0,
              icon: initialData?.icon || '💰',
              color: initialData?.color || 'bg-[#0B8A46]',
              status: initialData?.status || 'active',
              autoSave: initialData?.autoSave || false
            })}
            disabled={!name || !targetValue}
            className="w-full py-5 rounded-[32px] bg-emerald-600 text-white font-black text-lg shadow-2xl shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-primary-dark/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white w-full h-[95vh] sm:h-auto sm:max-h-[85vh] sm:max-w-md rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-8 flex flex-col shadow-2xl relative"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Movimentações</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">{bank.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 bg-gray-50 rounded-2xl flex items-center px-4 py-3">
            <Search size={18} className="text-gray-400 mr-2" />
            <input type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-sm font-medium w-full text-slate-900 placeholder:text-gray-400" />
          </div>
          <button className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500">
            <Filter size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-[32px]">
              <History size={32} className="text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-400">Nenhuma movimentação</p>
            </div>
          ) : (
            history.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    item.type === "in" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                  )}>
                    {item.type === "in" ? <ArrowDown size={22} strokeWidth={2.5} /> : <ArrowUp size={22} strokeWidth={2.5} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{item.type === "in" ? "Depósito" : "Retirada"}</p>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                      {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={cn(
                      "font-bold text-[15px]",
                      item.type === "in" ? "text-emerald-600" : "text-rose-500"
                    )}>
                      {item.type === "in" ? "+" : "-"} {formatCurrency(item.value)}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function PiggyBanks() {
  const { piggyBanks, loading, createPiggyBank, updatePiggyBank, deletePiggyBank, addMoney, withdrawMoney } = usePiggyBanks();
  const { accounts } = useContas();
  
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedBank, setSelectedBank] = useState<PiggyBank | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"add" | "withdraw">("add");

  // Se tem apenas 1 cofrinho e esta na view 'list', pode ser inteligente ir pro detail, mas a descricao pede uma tela para visualizar todos.
  // Vamos manter a view default como list se tiver muitos, ou list sempre para ser a home.
  // Se não tem cofrinhos, mostrar empty state na list.

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-48 h-48 mb-8 relative">
        <div className="absolute inset-0 bg-emerald-100 rounded-full blur-3xl opacity-50"></div>
        <img src={PremiumPiggyBankImg} alt="Porquinho 3D" className="w-full h-full object-contain relative z-10" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Comece a guardar para seus sonhos</h2>
      <p className="text-slate-500 mb-8 max-w-xs font-medium leading-relaxed">
        Crie seu primeiro cofrinho e acompanhe sua evolução de forma inteligente.
      </p>
      <button 
        onClick={() => { setSelectedBank(null); setIsCreateModalOpen(true); }}
        className="bg-emerald-600 text-white font-black px-8 py-5 rounded-full shadow-[0_8px_30px_rgba(11,138,70,0.3)] active:scale-95 transition-transform"
      >
        Criar meu cofrinho
      </button>
    </div>
  );

  const renderListView = () => (
    <div className="px-6 pb-24">
      {piggyBanks.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {piggyBanks.map(bank => {
              const progress = bank.targetValue > 0 ? (bank.currentValue / bank.targetValue) * 100 : 0;
              const cappedProgress = Math.min(progress, 100);
              const isCompleted = cappedProgress >= 100;
              
              return (
                <div 
                  key={bank.id} 
                  onClick={() => { setSelectedBank(bank); setView("detail"); }}
                  className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all active:scale-95 flex flex-col"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                         <img src={PremiumPiggyBankImg} alt="Piggy" className="w-10 h-10 object-contain drop-shadow-md" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{bank.name}</h3>
                        <p className="text-sm font-medium text-slate-400 mt-1">
                          {formatCurrency(bank.currentValue)} / {formatCurrency(bank.targetValue)}
                        </p>
                      </div>
                    </div>
                    {isCompleted && (
                      <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                        Concluído
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progresso</p>
                      <p className="text-sm font-black text-emerald-600">{Math.round(cappedProgress)}%</p>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: \`\${cappedProgress}%\` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            onClick={() => { setSelectedBank(null); setIsCreateModalOpen(true); }}
            className="w-full py-6 rounded-[32px] border-2 border-dashed border-gray-200 text-gray-500 font-bold flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-emerald-200 hover:text-emerald-600 transition-colors active:scale-95"
          >
            <Plus size={24} strokeWidth={3} />
            Novo cofrinho
          </button>
        </div>
      )}
    </div>
  );

  const renderDetailView = () => {
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
        <div className="mx-4 mt-2 bg-white rounded-[40px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] p-8 relative overflow-hidden border border-gray-50">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="absolute top-6 right-6 w-11 h-11 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors z-20"
          >
            <Edit2 size={18} strokeWidth={2.5} />
          </button>

          {isCompleted && (
            <div className="absolute top-6 left-6 z-20 flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/20">
              <Sparkles size={14} />
              <span className="text-[11px] font-black uppercase tracking-wider">Objetivo Atingido!</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row pt-8 sm:pt-4 relative z-10">
            <div className="w-full sm:w-[45%] flex items-center justify-center mb-8 sm:mb-0">
              <motion.img 
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0.5 }}
                src={PremiumPiggyBankImg} 
                alt="Piggy Bank" 
                className="w-[200px] sm:w-[240px] object-contain drop-shadow-2xl"
              />
            </div>
            <div className="w-full sm:w-[55%] flex flex-col justify-center sm:pl-8 space-y-5">
              <div>
                <p className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-1">Saldo atual</p>
                <p className="text-4xl font-black text-emerald-700 tracking-tight leading-none">{formatCurrency(bank.currentValue)}</p>
              </div>
              <div className="w-full h-[1px] bg-gray-100 rounded-full"></div>
              <div>
                <p className="text-[12px] font-black uppercase tracking-widest text-gray-400 mb-1">Objetivo</p>
                <p className="text-xl font-bold text-slate-800 tracking-tight leading-none">{formatCurrency(bank.targetValue)}</p>
              </div>
              <div className="w-full h-[1px] bg-gray-100 rounded-full"></div>
              <div>
                <div className="flex justify-between items-end mb-3">
                  <p className="text-[12px] font-black uppercase tracking-widest text-gray-400">Progresso</p>
                  <p className="text-2xl font-black text-emerald-600 leading-none">{Math.round(cappedProgress)}%</p>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: \`\${cappedProgress}%\` }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-emerald-500 rounded-full"
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
            className="w-full bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 flex items-center justify-between active:scale-95 transition-transform hover:shadow-md"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Plus size={28} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-slate-800 text-lg">Adicionar dinheiro</span>
            </div>
            <ChevronRight size={24} className="text-gray-300" />
          </button>
          <button 
            onClick={() => { setActionType("withdraw"); setIsActionModalOpen(true); }}
            className="w-full bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 flex items-center justify-between active:scale-95 transition-transform hover:shadow-md"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-gray-50 text-slate-600 flex items-center justify-center">
                <Minus size={28} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-slate-800 text-lg">Retirar dinheiro</span>
            </div>
            <ChevronRight size={24} className="text-gray-300" />
          </button>
        </div>

        {/* Últimas Movimentações */}
        <div className="mx-4 mt-8 bg-white rounded-[40px] shadow-sm border border-gray-50 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 text-xl tracking-tight">Últimas movimentações</h3>
            <button 
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm hover:opacity-80 transition-opacity"
            >
              Ver todas <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>
          
          <div className="space-y-6">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-[24px]">
                <p className="text-base text-slate-500 font-bold">Nenhuma movimentação ainda</p>
                <p className="text-sm text-slate-400 mt-1">Adicione dinheiro ao seu cofrinho para começar.</p>
              </div>
            ) : (
              history.slice(0, 4).map((item, index) => (
                <React.Fragment key={item.id}>
                  <div className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                        item.type === "in" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                      )}>
                        {item.type === "in" ? <ArrowDown size={22} strokeWidth={2.5} /> : <ArrowUp size={22} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-base">{item.type === "in" ? "Depósito" : "Retirada"}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={cn(
                        "font-bold text-base",
                        item.type === "in" ? "text-emerald-600" : "text-rose-500"
                      )}>
                        {item.type === "in" ? "+" : "-"} {formatCurrency(item.value)}
                      </p>
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </div>
                  {index < Math.min(history.length, 4) - 1 && (
                    <div className="w-full h-[1px] bg-gray-50 rounded-full my-1" />
                  )}
                </React.Fragment>
              ))
            )}
          </div>
        </div>

        {/* Card Objetivo */}
        <div className="mx-4 mt-6 mb-8 bg-white rounded-[32px] shadow-sm border border-emerald-50 p-6 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow active:scale-95">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Target size={28} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Objetivo do cofrinho</p>
              <h3 className="font-bold text-slate-900 text-lg leading-tight truncate max-w-[180px] sm:max-w-[300px]">{bank.name}</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">Meta: {formatCurrency(bank.targetValue)}</p>
            </div>
          </div>
          <ChevronRight size={24} className="text-gray-300" />
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen w-full font-sans text-slate-800 bg-white sm:bg-[#F8F9FA] relative">
      {/* Premium Header */}
      <div className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top,1.5rem),2rem)] pb-4 sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button onClick={() => view === "detail" ? setView("list") : window.history.back()} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all">
            <ArrowLeft size={20} className="text-slate-900" />
          </button>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{view === "detail" ? "Cofrinho" : "Meus Cofrinhos"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center relative hover:bg-gray-100 active:scale-95 transition-all text-slate-700">
            <Bell size={20} strokeWidth={2.5} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-emerald-500 rounded-full border border-white"></span>
          </button>
          <button className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-slate-700">
            <MoreHorizontal size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto custom-scrollbar h-[calc(100vh-80px)]">
        <AnimatePresence mode="wait">
          {view === "list" ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderListView()}
            </motion.div>
          ) : (
            <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderDetailView()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreatePiggyBankModal 
            isOpen={isCreateModalOpen} 
            onClose={() => {
              setIsCreateModalOpen(false);
              if (view === "list") setSelectedBank(null); // Clear selected if creating new from list
            }} 
            initialData={selectedBank}
            onSave={async (data: any) => {
              if (selectedBank) {
                const res = await updatePiggyBank(selectedBank.id, data);
                if (!res) { alert("Erro ao editar cofrinho. Verifique os dados."); return; }
              } else {
                console.log("Creating with data:", data); 
                const res = await createPiggyBank(data); 
                if (!res) { alert("Erro ao criar cofrinho. Verifique os dados."); return; }
              }
              setIsCreateModalOpen(false);
              if (view === "list") setSelectedBank(null);
            }}
            onDelete={async () => {
              if (selectedBank && confirm("Deseja realmente excluir este cofrinho?")) {
                await deletePiggyBank(selectedBank.id);
                setIsCreateModalOpen(false);
                setSelectedBank(null);
                setView("list");
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
            onConfirm={async (value: number, accountId: string, description: string) => {
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
    </div>
  );
}
`

fs.writeFileSync('src/components/PiggyBanks.tsx', content);
