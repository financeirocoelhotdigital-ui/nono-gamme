import React, { useState, useMemo, useRef, useEffect } from "react";
import { WealthItem, Debt, WealthAssetType, WealthEvolution, WealthEvolutionType } from "../types";
import { formatCurrency, cn, parseCurrencyInput } from "../lib/utils";
import { 
  Briefcase, 
  Home, 
  Car, 
  TrendingUp, 
  Plus, 
  MoreVertical, 
  Trash2, 
  X, 
  Edit2, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  Info,
  Smartphone,
  Globe,
  Package,
  Loader2,
  ChevronRight,
  Check,
  History as HistoryIcon,
  Hammer,
  Construction as ConstructionIcon,
  Layers,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firebase";
import { useDebts } from "../context/DebtsContext";
import { useWealth } from "../context/WealthContext";
import { useContas } from "../context/ContasContext";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Construction, ConstructionStep, ConstructionStatus, ConstructionStepStatus } from "../types";
import { WealthEvolutionChart } from "./WealthEvolutionChart";
import { 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  ArrowRight, 
  TrendingDown,
  Clock,
  Tag as TagIcon,
  Maximize2,
  Minimize2
} from "lucide-react";

function DeleteConfirmationModal({ item, onClose, onConfirm }: { item: WealthItem; onClose: () => void; onConfirm: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }} 
        className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6">
            <Trash2 className="text-rose-600" size={32} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Excluir Ativo?</h3>
          <p className="text-gray-500 mb-8">
            Tem certeza que deseja excluir <span className="font-bold text-slate-900">"{item.name}"</span>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-4 w-full">
            <button 
              onClick={onClose} 
              className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm} 
              className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-900 bg-rose-600 hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
            >
              Excluir
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SellWealthModal({ item, onClose, onSell }: { item: WealthItem, onClose: () => void, onSell: (id: string, saleData: any) => Promise<void> }) {
  const { accounts } = useContas();
  const [saleValue, setSaleValue] = useState(item.value.toString());
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const defaultAcc = accounts.find(a => a.isDefault) || accounts[0];
  const [accountId, setAccountId] = useState(defaultAcc?.id || "");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const purchaseValue = item.purchaseValue;
  const currentSaleValue = parseFloat(saleValue) || 0;
  const profit = currentSaleValue - purchaseValue;
  const profitPercentage = purchaseValue > 0 ? (profit / purchaseValue) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(saleValue);
    if (isNaN(val) || val <= 0) {
      setErrorMsg("Por favor, informe um valor de venda válido.");
      return;
    }

    let targetAccountId = accountId;
    if (!targetAccountId && accounts.length > 0) {
      targetAccountId = accounts[0].id;
    }

    setIsSaving(true);
    setErrorMsg("");
    try {
      await onSell(item.id, {
        saleValue: val,
        saleDate: saleDate,
        accountId: targetAccountId,
        notes
      });
      onClose();
    } catch (error) {
      console.error("Erro ao vender patrimônio:", error);
      setErrorMsg("Erro ao processar a venda do patrimônio.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: 50, opacity: 0 }} 
        className="w-full max-w-xl bg-white rounded-[40px] p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <DollarSign className="text-emerald-500" size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Vender Patrimônio</h3>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-slate-900 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Item</p>
              <p className="text-lg font-black text-slate-900">{item.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Valor de Compra</p>
              <p className="text-lg font-black text-gray-500">{formatCurrency(item.purchaseValue)}</p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Resultado Estimado</p>
              <p className={cn(
                "text-xl font-black",
                profit >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Rentabilidade</p>
              <p className={cn(
                "text-xl font-black",
                profit >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                {profit >= 0 ? "+" : ""}{profitPercentage.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Valor da Venda</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                  <DollarSign size={20} />
                </div>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={saleValue} 
                  onChange={e => setSaleValue(e.target.value)} 
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all" 
                  placeholder="0,00" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Data da Venda</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                  <Calendar size={20} />
                </div>
                <input 
                  type="date" 
                  required 
                  value={saleDate} 
                  onChange={e => setSaleDate(e.target.value)} 
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Conta de Destino do Dinheiro</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors">
                <Briefcase size={20} />
              </div>
              <select 
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
              >
                {accounts.length === 0 ? (
                  <option value="">Caixa Geral (Saldo não vinculado)</option>
                ) : (
                  <>
                    <option value="">Selecione o banco de destino</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.institution}) - Saldo: {formatCurrency(acc.balance)}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <p className="text-[10px] text-gray-400 ml-1">
              O valor da venda será creditado diretamente nesta conta e atualizará o saldo do Dashboard.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Observações</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-6 bg-gray-50 border-none rounded-2xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all min-h-[100px]"
              placeholder="Ex: Venda realizada para troca de veículo..."
            />
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full rounded-2xl bg-emerald-600 py-5 font-black text-white shadow-xl shadow-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                <span>Confirmar Venda</span>
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

const Wealth: React.FC = () => {
  const { wealth: items, loading, addWealthItem, updateWealthItem, updateWealthValue, sellWealthItem, deleteWealthItem, startConstruction, getAllEvolutions } = useWealth();
  const { debts } = useDebts();
  const [allEvolutions, setAllEvolutions] = useState<WealthEvolution[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<WealthItem | null>(null);
  const [updatingValueItem, setUpdatingValueItem] = useState<WealthItem | null>(null);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<WealthItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<WealthItem | null>(null);
  const [sellingItem, setSellingItem] = useState<WealthItem | null>(null);
  const [evolvingItem, setEvolvingItem] = useState<WealthItem | null>(null);
  const [startingConstructionItem, setStartingConstructionItem] = useState<WealthItem | null>(null);
  const [managingConstruction, setManagingConstruction] = useState<Construction | null>(null);
  const [activeTab, setActiveTab] = useState<"ativos" | "vendidos">("ativos");

  useEffect(() => {
    let isMounted = true;
    const fetchEvolutions = async () => {
      try {
        const evos = await getAllEvolutions();
        if (isMounted) {
          setAllEvolutions(evos || []);
        }
      } catch (err) {
        console.warn("Notice: could not fetch all evolutions (fallback to local):", err);
        if (isMounted) {
          setAllEvolutions([]);
        }
      }
    };
    if (!loading) {
      fetchEvolutions();
    }
    return () => {
      isMounted = false;
    };
  }, [loading, getAllEvolutions]);

  const activeItems = useMemo(() => items.filter(i => (i.status || "ativo") === "ativo"), [items]);
  const soldItems = useMemo(() => items.filter(i => i.status === "vendido"), [items]);

  const totalWealth = useMemo(() => activeItems.reduce((acc, item) => acc + item.value, 0), [activeItems]);
  const totalInvestedValue = useMemo(() => activeItems.reduce((acc, item) => acc + (item.totalInvested || item.purchaseValue), 0), [activeItems]);
  const totalDebts = useMemo(() => debts.filter(d => d.status !== "quitada").reduce((acc, d) => acc + d.remainingValue, 0), [debts]);
  const netWorth = totalWealth - totalDebts;

  const averageAppreciation = useMemo(() => {
    if (activeItems.length === 0) return 0;
    const totalPurchase = activeItems.reduce((acc, item) => acc + (item.totalInvested || item.purchaseValue), 0);
    const totalCurrent = activeItems.reduce((acc, item) => acc + item.value, 0);
    if (totalPurchase === 0) return 0;
    return ((totalCurrent - totalPurchase) / totalPurchase) * 100;
  }, [activeItems]);

  const totalAppreciationValue = useMemo(() => {
    return activeItems.reduce((acc, item) => acc + (item.totalAppreciation ?? (item.value - (item.totalInvested || item.purchaseValue))), 0);
  }, [activeItems]);

  const totalProfit = useMemo(() => soldItems.reduce((acc, item) => acc + (item.profit || 0), 0), [soldItems]);

  const getTypeIcon = (type: string, size: number = 20) => {
    switch (type) {
      case "terreno": return <TrendingUp size={size} />;
      case "imovel": return <Home size={size} />;
      case "veiculo": return <Car size={size} />;
      case "item": return <Package size={size} />;
      default: return <Briefcase size={size} />;
    }
  };

  const calculateAppreciation = (item: WealthItem) => {
    const totalInvested = item.totalInvested || item.purchaseValue;
    const appreciation = item.totalAppreciation ?? (item.value - totalInvested);
    const percentage = item.percentageAppreciation ?? ((appreciation / totalInvested) * 100);
    return { appreciation, percentage, totalInvested };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto px-4 md:px-0 mt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Patrimônio</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Gestão de bens e ativos de alto valor</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-slate-900 rounded-[16px] font-bold shadow-sm hover:shadow-md hover:bg-gray-800 transition-all active:scale-[0.98]"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>Novo Ativo</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none mix-blend-multiply opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Patrimônio Líquido</span>
            <div className="mt-3 flex items-baseline gap-2">
              <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{formatCurrency(netWorth)}</h2>
            </div>
            <div className="mt-8 flex items-center gap-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Bens</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(totalWealth)}</span>
              </div>
              <div className="w-px h-8 bg-gray-100"></div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Dívidas</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(totalDebts)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] text-slate-900 overflow-hidden relative group shadow-xl">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-50 rounded-full blur-[40px] -mr-[80px] -mt-[80px] pointer-events-none mix-blend-screen transition-opacity group-hover:opacity-100 opacity-50 duration-500"></div>
          <div className="relative z-10">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Valorização Real</span>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <TrendingUp size={20} strokeWidth={2} />
              </div>
              <h2 className="text-4xl font-bold tracking-tight">{averageAppreciation.toFixed(1)}%</h2>
            </div>
            <p className="text-[13px] text-gray-400 mt-6 font-medium leading-relaxed">
              Seus ativos valorizaram <span className="text-slate-900 font-bold">{formatCurrency(totalAppreciationValue)}</span> acima do total investido ({formatCurrency(totalInvestedValue)}).
            </p>
          </div>
        </div>

        <div className="bg-emerald-500 p-8 rounded-[32px] shadow-sm relative overflow-hidden group">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/20 rounded-full blur-3xl transition-transform duration-500 group-hover:scale-110"></div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-900/60 uppercase tracking-[0.1em]">Dica de Gestão</span>
              <p className="text-sm text-slate-900 font-bold mt-4 leading-relaxed">
                "Imóveis representam uma grande parte do seu patrimônio. Considere diversificar em ativos de maior liquidez para ter flexibilidade financeira."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] relative overflow-hidden group">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 relative z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Evolução Patrimonial</h3>
            <p className="text-sm font-medium text-gray-500 mt-1">Acompanhe o crescimento dos seus ativos ao longo do tempo</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50/80 p-2 rounded-[16px] border border-gray-100">
             <div className="flex items-center gap-2 px-2">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.1em]">Patrimônio</span>
             </div>
             <div className="w-px h-4 bg-gray-200"></div>
             <div className="flex items-center gap-2 px-2">
               <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"></div>
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.1em]">Investimento</span>
             </div>
          </div>
        </div>
        <div className="relative z-10">
          <WealthEvolutionChart items={items} evolutions={allEvolutions} />
        </div>
      </div>

      {/* Wealth Grid */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3 p-1.5 bg-gray-50/80 rounded-[20px] border border-gray-100 w-fit">
            <button 
              onClick={() => setActiveTab("ativos")}
              className={cn(
                "px-6 py-2.5 rounded-[14px] font-bold text-sm transition-all flex items-center gap-2",
                activeTab === "ativos" ? "bg-white text-slate-900 shadow-sm border border-gray-200/50" : "text-gray-500 hover:text-slate-900"
              )}
            >
              Ativos
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                activeTab === "ativos" ? "bg-gray-100 text-slate-900" : "bg-gray-200 text-gray-500"
              )}>{activeItems.length}</span>
            </button>
            <button 
              onClick={() => setActiveTab("vendidos")}
              className={cn(
                "px-6 py-2.5 rounded-[14px] font-bold text-sm transition-all flex items-center gap-2",
                activeTab === "vendidos" ? "bg-white text-slate-900 shadow-sm border border-gray-200/50" : "text-gray-500 hover:text-slate-900"
              )}
            >
              Vendidos
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                activeTab === "vendidos" ? "bg-gray-100 text-slate-900" : "bg-gray-200 text-gray-500"
              )}>{soldItems.length}</span>
            </button>
          </div>
          {activeTab === "vendidos" && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/80 rounded-[16px] border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Lucro Total:</span>
              <span className={cn("text-sm font-bold tracking-tight", totalProfit >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {formatCurrency(totalProfit)}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === "ativos" ? activeItems : soldItems).map((item) => {
            const { appreciation, percentage, totalInvested } = calculateAppreciation(item);
            
            return (
              <motion.div 
                key={item.id}
                whileHover={{ y: -4 }}
                className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-lg hover:border-gray-200 transition-all group flex flex-col h-full"
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 shrink-0 bg-gray-50/80 rounded-[16px] flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-emerald-600 transition-colors duration-300 border border-gray-100">
                        {getTypeIcon(item.type, 24)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] truncate max-w-[80px]">{item.type}</span>
                           <span className="w-1 h-1 rounded-full bg-gray-200 shrink-0"></span>
                           <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.1em] truncate max-w-[100px]">{item.category}</span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 leading-tight tracking-tight line-clamp-2" title={item.name}>{item.name}</h4>
                      </div>
                    </div>
                    
                    <div className="flex gap-1 shrink-0 -mr-2 -mt-2">
                      {activeTab === "ativos" && (
                        <button 
                          onClick={() => setSellingItem(item)}
                          className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-[12px] transition-all"
                          title="Vender Ativo"
                        >
                          <DollarSign size={18} strokeWidth={2} />
                        </button>
                      )}
                      <button 
                        onClick={() => setEditingItem(item)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-[12px] transition-all"
                        title="Editar"
                      >
                        <Edit2 size={18} strokeWidth={2} />
                      </button>
                      <button 
                        onClick={() => setDeletingItem(item)}
                        className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-[12px] transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={18} strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-xs text-gray-500 font-medium line-clamp-2 mb-6 leading-relaxed flex-grow">
                      {item.description}
                    </p>
                  )}
                  {activeTab === "ativos" ? (
                    <div className="mt-auto">
                      <div className="flex flex-col mb-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1">Valor Atual</span>
                        <p className="text-2xl font-bold text-slate-900 tracking-tight truncate pr-2" title={formatCurrency(item.value)}>{formatCurrency(item.value)}</p>
                      </div>

                      <div className="flex items-center gap-3 mb-6">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-bold tracking-tight",
                          percentage >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {percentage >= 0 ? <TrendingUp size={14} strokeWidth={2.5} /> : <TrendingDown size={14} strokeWidth={2.5} />}
                          <span className="truncate">
                            {percentage >= 0 ? "+" : ""}{formatCurrency(Math.abs(appreciation))}
                          </span>
                          <span className="shrink-0 opacity-70">
                            ({Math.abs(percentage).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] truncate block">Invest. Total</span>
                          <p className="text-sm font-bold text-slate-900 truncate tracking-tight" title={formatCurrency(totalInvested)}>{formatCurrency(totalInvested)}</p>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] truncate block">Valorização Real</span>
                          <p className={cn(
                            "text-sm font-bold truncate tracking-tight",
                            appreciation >= 0 ? "text-emerald-500" : "text-rose-500"
                          )} title={(appreciation >= 0 ? "+" : "") + formatCurrency(appreciation)}>
                            {appreciation >= 0 ? "+" : ""}{formatCurrency(appreciation)}
                          </p>
                        </div>
                      </div>

                      {/* Evolution History Section */}
                      <EvolutionHistorySection item={item} />

                      {/* Construction Section */}
                      <ConstructionSection item={item} onManage={(c) => setManagingConstruction(c)} onStart={() => setStartingConstructionItem(item)} />

                      <div className="grid grid-cols-2 gap-3 mt-6">
                        <button 
                          onClick={() => setEvolvingItem(item)}
                          className="py-3 px-2 bg-blue-50/80 text-blue-600 rounded-[16px] font-black text-[10px] uppercase tracking-[0.1em] hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-1.5 overflow-hidden border border-blue-100 hover:border-blue-600 shadow-sm"
                        >
                          <ArrowUpRight size={14} strokeWidth={2.5} className="shrink-0" />
                          <span className="truncate">Evoluir</span>
                        </button>
                        <button 
                          onClick={() => setStartingConstructionItem(item)}
                          className="py-3 px-2 bg-amber-50/80 text-amber-600 rounded-[16px] font-black text-[10px] uppercase tracking-[0.1em] hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-1.5 overflow-hidden border border-amber-100 hover:border-amber-500 shadow-sm"
                        >
                          <Hammer size={14} strokeWidth={2.5} className="shrink-0" />
                          <span className="truncate">Obra</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto">
                      <div className="flex flex-col mb-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1">Valor de Venda</span>
                        <p className="text-2xl font-bold text-slate-900 tracking-tight truncate" title={formatCurrency(item.saleValue || 0)}>{formatCurrency(item.saleValue || 0)}</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-1 truncate">
                          Vendido em {item.saleDate ? format(parseISO(item.saleDate), "dd/MM/yyyy") : "N/A"}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-6">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-bold tracking-tight",
                          (item.profit || 0) >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {(item.profit || 0) >= 0 ? <TrendingUp size={14} strokeWidth={2.5} /> : <TrendingDown size={14} strokeWidth={2.5} />}
                          <span className="truncate">
                            {formatCurrency(Math.abs(item.profit || 0))} 
                          </span>
                          <span className="shrink-0 opacity-70">
                            ({(item.profitPercentage || 0).toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] truncate block">Custo Aquisição</span>
                          <p className="text-sm font-bold text-slate-900 truncate tracking-tight" title={formatCurrency(item.purchaseValue)}>{formatCurrency(item.purchaseValue)}</p>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] truncate block">Resultado Final</span>
                          <p className={cn(
                            "text-sm font-bold truncate tracking-tight",
                            (item.profit || 0) >= 0 ? "text-emerald-500" : "text-rose-500"
                          )} title={((item.profit || 0) >= 0 ? "+" : "") + formatCurrency(item.profit || 0)}>
                            {(item.profit || 0) >= 0 ? "+" : ""}{formatCurrency(item.profit || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {(activeTab === "ativos" ? activeItems : soldItems).length === 0 && (
            <div className="col-span-full py-24 text-center bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200">
              <div className="w-20 h-20 bg-white shadow-sm border border-gray-100 text-gray-400 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                <Briefcase size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {activeTab === "ativos" ? "Nenhum bem cadastrado" : "Nenhum bem vendido"}
              </h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2">
                {activeTab === "ativos" 
                  ? "Adicione seus imóveis, veículos e outros bens para ter uma visão completa do seu patrimônio."
                  : "Seu histórico de vendas aparecerá aqui."}
              </p>
              {activeTab === "ativos" && (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="mt-8 px-6 py-3.5 bg-white text-emerald-600 font-bold text-sm tracking-wide rounded-[16px] shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                  Adicionar Primeiro Bem
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(isAdding || editingItem) && (
          <WealthForm 
            onClose={() => { setIsAdding(false); setEditingItem(null); }} 
            initialData={editingItem || undefined}
            onSave={editingItem ? updateWealthItem : addWealthItem}
          />
        )}
        {updatingValueItem && (
          <UpdateValueModal 
            item={updatingValueItem} 
            onClose={() => setUpdatingValueItem(null)} 
            onUpdate={updateWealthValue}
          />
        )}
        {viewingHistoryItem && (
          <HistoryModal 
            item={viewingHistoryItem} 
            onClose={() => setViewingHistoryItem(null)} 
          />
        )}
        {deletingItem && (
          <DeleteConfirmationModal 
            item={deletingItem} 
            onClose={() => setDeletingItem(null)} 
            onConfirm={async () => {
              await deleteWealthItem(deletingItem.id);
              setDeletingItem(null);
            }}
          />
        )}
        {sellingItem && (
          <SellWealthModal 
            item={sellingItem} 
            onClose={() => setSellingItem(null)} 
            onSell={sellWealthItem}
          />
        )}
        {evolvingItem && (
          <EvolveWealthModal 
            item={evolvingItem} 
            onClose={() => setEvolvingItem(null)} 
          />
        )}
        {startingConstructionItem && (
          <StartConstructionModal 
            item={startingConstructionItem}
            onClose={() => setStartingConstructionItem(null)}
            onConfirm={async (name, targetValue, plannedSteps) => {
              await startConstruction(startingConstructionItem.id, name, targetValue, plannedSteps);
              setStartingConstructionItem(null);
            }}
          />
        )}
        {managingConstruction && (
          <ConstructionManagerModal 
            construction={managingConstruction}
            onClose={() => setManagingConstruction(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function EvolutionItemCard({ evo, onDelete }: { evo: WealthEvolution, onDelete?: (id: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getEvolutionIcon = (type: string) => {
    switch (type) {
      case "transformacao": return <ArrowUpRight className="text-primary-blue" size={16} />;
      case "valorizacao": return <TrendingUp className="text-emerald-500" size={16} />;
      case "desvalorizacao": return <TrendingDown className="text-rose-500" size={16} />;
      case "investimento": return <Plus className="text-primary-blue" size={16} />;
      case "reforma": return <Hammer className="text-primary-blue" size={16} />;
      case "construcao": return <ConstructionIcon className="text-primary-blue" size={16} />;
      case "renomear": return <Edit2 className="text-primary-purple" size={16} />;
      case "venda": return <DollarSign className="text-emerald-600" size={16} />;
      default: return <HistoryIcon className="text-gray-400" size={16} />;
    }
  };

  const getTitle = () => {
    switch (evo.type) {
      case "transformacao": return `Transformação: ${evo.oldType || 'Bem'} → ${evo.newType || 'Bem'}`;
      case "valorizacao": return "Valorização de Mercado";
      case "desvalorizacao": return "Desvalorização Registrada";
      case "investimento": return "Investimento Realizado";
      case "reforma": return "Reforma no Patrimônio";
      case "construcao": return "Evolução de Construção";
      case "renomear": return "Nome Alterado";
      case "venda": return "Venda Concluída";
      case "ajuste": return "Ajuste de Valor";
      default: return "Evento de Evolução";
    }
  };

  const getFinancialType = () => {
    if (evo.type === "valorizacao" || evo.type === "venda") return "positive";
    if (evo.type === "desvalorizacao" || evo.type === "investimento" || evo.type === "transformacao") return "negative";
    return "neutral";
  };

  const impact = evo.afterState && evo.beforeState ? evo.afterState.value - evo.beforeState.value : 0;
  const impactPerc = evo.beforeState && evo.beforeState.value > 0 ? (impact / evo.beforeState.value) * 100 : 0;

  return (
    <div className="relative pl-8 pb-8 group">
      {/* Timeline Line */}
      <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-100 group-last:bottom-auto group-last:h-8" />
      
      {/* Timeline Dot */}
      <div className={cn(
        "absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 transition-transform group-hover:scale-110",
        evo.type === "investimento" ? "bg-primary-blue/10" : "bg-gray-50"
      )}>
        {getEvolutionIcon(evo.type)}
      </div>

      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-white border border-gray-100 rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
      >
        {/* Header - Adaptive Layout */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h6 className="text-sm font-black text-slate-900 leading-tight truncate">{getTitle()}</h6>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Clock size={12} className="text-gray-400 shrink-0" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                {format(parseISO(evo.date), "dd/MM/yyyy")} <span className="hidden xs:inline">• {formatDistanceToNow(parseISO(evo.date), { addSuffix: true, locale: ptBR })}</span>
              </span>
            </div>
          </div>
          
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest truncate max-w-[150px] sm:max-w-none",
              getFinancialType() === "positive" ? "bg-emerald-50 text-emerald-600" :
              getFinancialType() === "negative" ? "bg-rose-50 text-rose-600" : "bg-gray-50 text-gray-500"
            )}>
              {getFinancialType() === "positive" ? "+" : getFinancialType() === "negative" ? "-" : ""}{formatCurrency(evo.value)}
            </div>
            {impactPerc !== 0 && (
              <span className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-md truncate max-w-[100px]",
                impactPerc >= 0 ? "bg-emerald-50/50 text-emerald-500" : "bg-rose-50/50 text-rose-500"
              )}>
                {impactPerc >= 0 ? "+" : ""}{impactPerc.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Description - Hidden in summary if too long, shown in full when expanded */}
        <p className={cn(
          "text-xs text-gray-500 font-medium mb-3 transition-all",
          isExpanded ? "" : "line-clamp-2"
        )}>
          {evo.description}
        </p>

        {evo.tags && evo.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {evo.tags.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                <TagIcon size={8} />
                {tag}
              </span>
            ))}
          </div>
        )}

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-gray-50 space-y-4">
                {/* Before vs After - Responsive Grid */}
                {evo.beforeState && evo.afterState && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">Estado Anterior</p>
                        <Minimize2 size={12} className="text-gray-300 shrink-0" />
                      </div>
                      <div className="space-y-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome</p>
                          <p className="text-xs font-bold text-slate-900 truncate" title={evo.beforeState.name}>{evo.beforeState.name}</p>
                        </div>
                        <div className="flex justify-between items-end gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Tipo</p>
                            <p className="text-xs font-medium text-gray-500 capitalize truncate">{evo.beforeState.type}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Valor</p>
                            <p className="text-xs font-black text-gray-700 max-w-[100px] truncate" title={formatCurrency(evo.beforeState.value)}>{formatCurrency(evo.beforeState.value)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-primary-blue/5 rounded-2xl border border-primary-blue/10 min-w-0">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-black text-primary-blue uppercase tracking-widest truncate">Estado Posterior</p>
                        <Maximize2 size={12} className="text-primary-blue/30 shrink-0" />
                      </div>
                      <div className="space-y-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-primary-blue/40 uppercase tracking-widest">Nome</p>
                          <p className="text-xs font-bold text-slate-900 truncate" title={evo.afterState.name}>{evo.afterState.name}</p>
                        </div>
                        <div className="flex justify-between items-end gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-primary-blue/40 uppercase tracking-widest truncate">Tipo</p>
                            <p className="text-xs font-medium text-gray-500 capitalize truncate">{evo.afterState.type}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold text-primary-blue/40 uppercase tracking-widest truncate">Valor</p>
                            <p className="text-xs font-black text-primary-blue max-w-[100px] truncate" title={formatCurrency(evo.afterState.value)}>{formatCurrency(evo.afterState.value)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Impact Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      impact >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    )}>
                      {impact >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">Variação Patrimonial</p>
                      <p className={cn(
                        "text-xs font-black truncate max-w-[120px] sm:max-w-[200px]",
                        impact >= 0 ? "text-emerald-600" : "text-rose-600"
                      )} title={impact >= 0 ? "+" + formatCurrency(impact) : formatCurrency(impact)}>
                        {impact >= 0 ? "+" : ""}{formatCurrency(impact)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-4 ml-11 sm:ml-0">
                    <div className="text-left sm:text-right min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">Impacto</p>
                      <p className={cn(
                        "text-xs font-black truncate",
                        impactPerc >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {impactPerc >= 0 ? "+" : ""}{impactPerc.toFixed(1)}%
                      </p>
                    </div>
                    {onDelete && evo.type !== 'ajuste' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Deseja excluir este registro de evolução? O valor atual do patrimônio será recalculado.")) {
                            setIsDeleting(true);
                            onDelete(evo.id);
                          }
                        }}
                        disabled={isDeleting}
                        className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all disabled:opacity-50 shrink-0"
                        title="Excluir evolução"
                      >
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3 flex items-center justify-center">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} className="text-gray-300" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function EvolutionHistorySection({ item }: { item: WealthItem }) {
  const { getEvolutions, deleteEvolution } = useWealth();
  const [evolutions, setEvolutions] = useState<WealthEvolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchEvolutions = async () => {
    try {
      const data = await getEvolutions(item.id);
      setEvolutions(data);
    } catch (error) {
      console.error("Erro ao buscar evoluções:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvolutions();
  }, [item.id, getEvolutions]);

  const handleDeleteEvolution = async (evoId: string) => {
    try {
      await deleteEvolution(evoId, item.id);
      await fetchEvolutions();
    } catch (error) {
      console.error("Erro ao excluir evolução:", error);
    }
  };

  const filteredEvolutions = useMemo(() => {
    let result = evolutions;
    if (filter === "investimentos") result = evolutions.filter(e => e.type === "investimento");
    else if (filter === "valorizacoes") result = evolutions.filter(e => e.type === "valorizacao");
    else if (filter !== "all") result = evolutions.filter(e => e.type === filter);
    
    return result;
  }, [evolutions, filter]);

  const displayedEvolutions = useMemo(() => {
    return filteredEvolutions.slice(0, visibleCount);
  }, [filteredEvolutions, visibleCount]);

  const groupedEvolutions = useMemo(() => {
    const groups: { [key: string]: WealthEvolution[] } = {};
    displayedEvolutions.forEach(evo => {
      const date = parseISO(evo.date);
      const key = format(date, "MMMM yyyy", { locale: ptBR });
      if (!groups[key]) groups[key] = [];
      groups[key].push(evo);
    });
    return groups;
  }, [displayedEvolutions]);

  if (loading) return <div className="mt-4 h-4 w-24 bg-gray-100 animate-pulse rounded"></div>;
  if (evolutions.length === 0) return null;

  const totalGrowth = item.value - item.purchaseValue;
  const growthPerc = item.purchaseValue > 0 ? (totalGrowth / item.purchaseValue) * 100 : 0;

  const filterOptions = [
    { id: "all", label: "Tudo", icon: HistoryIcon },
    { id: "investimentos", label: "Investimentos", icon: Plus },
    { id: "valorizacoes", label: "Valorizações", icon: TrendingUp },
    { id: "transformacao", label: "Transformações", icon: ArrowUpRight },
  ];

  return (
    <div className="mt-8 pt-8 border-t border-gray-100">
      {/* Accumulated Timeline Header - Simplified without Chart */}
      <div className="mb-8 p-6 sm:p-8 bg-white rounded-[32px] text-slate-900 shadow-xl shadow-primary-dark/10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-3">
            <h5 className="text-[10px] font-black text-slate-900/40 uppercase tracking-widest flex items-center gap-2 truncate min-w-0">
              <TrendingUp size={12} className="shrink-0" />
              <span className="truncate">Evolução do Ativo</span>
            </h5>
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest break-all self-start xl:self-auto",
              growthPerc >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-500/20 text-rose-400"
            )}>
              {growthPerc >= 0 ? "+" : ""}{growthPerc.toFixed(1)}% Total
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-between items-start">
            <div className="flex flex-col min-w-0 flex-1 border-r border-gray-50 pr-2">
              <p className="text-[9px] font-bold text-slate-900/40 uppercase tracking-widest mb-1.5 truncate">Inicial</p>
              <p className="text-sm font-black tracking-tight truncate" title={formatCurrency(item.purchaseValue)}>{formatCurrency(item.purchaseValue)}</p>
            </div>
            <div className="flex flex-col min-w-0 flex-1 border-gray-50 pr-2">
              <p className="text-[9px] font-bold text-slate-900/40 uppercase tracking-widest mb-1.5 truncate">Crescimento</p>
              <p className="text-sm font-black text-emerald-600 tracking-tight truncate" title={"+" + formatCurrency(totalGrowth)}>+{formatCurrency(totalGrowth)}</p>
            </div>
            <div className="flex flex-col min-w-0 w-full sm:w-auto sm:flex-1 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-gray-50 sm:border-none sm:text-right">
              <p className="text-[9px] font-bold text-slate-900/40 uppercase tracking-widest mb-1.5 truncate">Atual</p>
              <p className="text-sm font-black tracking-tight truncate" title={formatCurrency(item.value)}>{formatCurrency(item.value)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Responsive (Visible on Tablet, Modal on Mobile) */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 min-w-0">
          <Filter size={12} className="shrink-0" />
          <span className="truncate">Histórico de Eventos</span>
        </h5>
        
        {/* Mobile Filter Button */}
        <button 
          onClick={() => setShowFilterModal(true)}
          className="md:hidden p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all"
        >
          <Filter size={18} />
        </button>

        {/* Desktop/Tablet Filters */}
        <div className="hidden md:flex flex-wrap items-center gap-2">
          {filterOptions.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                filter === f.id ? "bg-white text-slate-900 shadow-lg" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
              )}
            >
              <f.icon size={12} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Events */}
      <div className="space-y-10">
        {Object.entries(groupedEvolutions).map(([month, evos]) => (
          <div key={month} className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest whitespace-nowrap">{month}</span>
              <div className="h-px flex-1 bg-gray-100"></div>
            </div>
            <div className="space-y-0">
              {evos.map(evo => (
                <EvolutionItemCard 
                  key={evo.id} 
                  evo={evo} 
                  onDelete={handleDeleteEvolution}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {filteredEvolutions.length > visibleCount && (
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => setVisibleCount(prev => prev + 10)}
            className="px-8 py-4 bg-gray-50 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2"
          >
            Carregar mais eventos
            <ChevronDown size={16} />
          </button>
        </div>
      )}

      {/* Mobile Filter Modal */}
      <AnimatePresence>
        {showFilterModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-end justify-center"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-xl bg-white rounded-t-[40px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900">Filtrar Histórico</h3>
                <button onClick={() => setShowFilterModal(false)} className="p-2 bg-gray-50 rounded-xl text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {filterOptions.map(f => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFilter(f.id);
                      setShowFilterModal(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all",
                      filter === f.id 
                        ? "border-primary-blue bg-primary-blue/5 text-primary-blue" 
                        : "border-gray-50 bg-gray-50 text-gray-500"
                    )}
                  >
                    <f.icon size={20} />
                    <span className="text-sm font-black uppercase tracking-widest">{f.label}</span>
                    {filter === f.id && <Check size={20} className="ml-auto" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UpdateValueModal({ item, onClose, onUpdate }: { item: WealthItem, onClose: () => void, onUpdate: (id: string, newValue: number) => Promise<void> }) {
  const [newValue, setNewValue] = useState(item.value.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newValue);
    if (isNaN(val) || val < 0) return;

    setIsSaving(true);
    try {
      await onUpdate(item.id, val);
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar valor:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: 50, opacity: 0 }} 
        className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-blue/10 rounded-2xl flex items-center justify-center">
              <TrendingUp className="text-primary-blue" size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Atualizar Valor</h3>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-slate-900 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Valor Atual</p>
            <p className="text-xl font-black text-slate-900">{formatCurrency(item.value)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ativo</p>
            <p className="text-sm font-bold text-gray-500 truncate max-w-[120px]">{item.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Novo Valor de Mercado</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-green transition-colors">
                <DollarSign size={20} />
              </div>
              <input 
                type="number" 
                step="0.01"
                required 
                autoFocus
                value={newValue} 
                onChange={e => setNewValue(e.target.value)} 
                className="w-full pl-14 pr-6 py-5 bg-gray-50 border-none rounded-2xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-primary-green transition-all" 
                placeholder="0,00" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full rounded-2xl bg-white py-5 font-black text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                <span>Confirmar Atualização</span>
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function HistoryModal({ item, onClose }: { item: WealthItem, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: 50, opacity: 0 }} 
        className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
              <HistoryIcon className="text-slate-900" size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Evolução Detalhada</h3>
              <p className="text-sm text-gray-500 font-medium">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-slate-900 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <EvolutionHistorySection item={item} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function EvolveWealthModal({ item, onClose }: { item: WealthItem, onClose: () => void }) {
  const { evolveWealthItem } = useWealth();
  const { accounts } = useContas();
  const [evolutionType, setEvolutionType] = useState<WealthEvolutionType>("valorizacao");
  const [value, setValue] = useState("0");
  const [addToAssetValue, setAddToAssetValue] = useState(true);
  const [newType, setNewType] = useState<WealthAssetType>(item.type);
  const [newName, setNewName] = useState(item.name);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState("");
  const [tags, setTags] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(value);
    
    setIsSaving(true);
    try {
      await evolveWealthItem(item.id, {
        value: isNaN(val) ? 0 : val,
        type: evolutionType,
        description,
        date: new Date(date).toISOString(),
        addToAssetValue: (evolutionType === "investimento" || evolutionType === "reforma" || evolutionType === "construcao") ? addToAssetValue : true,
        newType: evolutionType === "transformacao" ? newType : undefined,
        newName: (evolutionType === "renomear" || evolutionType === "transformacao") ? newName : undefined,
        accountId: accountId || undefined,
        tags: tags.split(",").map(t => t.trim()).filter(t => t !== "")
      });
      onClose();
    } catch (error) {
      console.error("Erro ao evoluir patrimônio:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: 50, opacity: 0 }} 
        className="w-full max-w-xl bg-white rounded-[40px] p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-blue/10 rounded-2xl flex items-center justify-center">
              <ArrowUpRight className="text-primary-blue" size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Evoluir Patrimônio</h3>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-slate-900 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item Atual</p>
          <div className="flex items-center justify-between">
            <p className="text-lg font-black text-slate-900">{item.name}</p>
            <p className="text-lg font-black text-gray-500">{formatCurrency(item.value)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">O que deseja fazer?</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: "transformacao", label: "Transformar", icon: ArrowUpRight },
                { id: "valorizacao", label: "Valorizar", icon: TrendingUp },
                { id: "desvalorizacao", label: "Desvalorizar", icon: ArrowUpRight },
                { id: "investimento", label: "Investir", icon: Plus },
                { id: "reforma", label: "Reforma", icon: Hammer },
                { id: "construcao", label: "Construção", icon: ConstructionIcon },
                { id: "renomear", label: "Renomear", icon: Edit2 },
                { id: "ajuste", label: "Ajustar", icon: Check },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setEvolutionType(opt.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                    evolutionType === opt.id 
                      ? "border-primary-blue bg-primary-blue/5 text-primary-blue" 
                      : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"
                  )}
                >
                  <opt.icon size={20} className={opt.id === "desvalorizacao" ? "rotate-90" : ""} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(evolutionType === "valorizacao" || evolutionType === "desvalorizacao" || evolutionType === "ajuste" || evolutionType === "investimento" || evolutionType === "transformacao" || evolutionType === "reforma" || evolutionType === "construcao") && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                  {evolutionType === "transformacao" ? "Custo da Transformação" : 
                   evolutionType === "investimento" ? "Valor do Investimento" : 
                   evolutionType === "reforma" ? "Valor da Reforma" :
                   evolutionType === "construcao" ? "Custo de Construção" :
                   evolutionType === "valorizacao" ? "Valor da Valorização" :
                   evolutionType === "desvalorizacao" ? "Valor da Desvalorização" : "Novo Valor Total"}
                </label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-blue transition-colors">
                    <DollarSign size={20} />
                  </div>
                  <input 
                    type="number" 
                    step="0.01"
                    required 
                    value={value} 
                    onChange={e => setValue(e.target.value)} 
                    className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-primary-blue transition-all" 
                  />
                </div>
              </div>
            )}

            {(evolutionType === "investimento" || evolutionType === "reforma" || evolutionType === "construcao") && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <input 
                  type="checkbox" 
                  id="addToAssetValue"
                  checked={addToAssetValue}
                  onChange={e => setAddToAssetValue(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary-blue focus:ring-primary-blue"
                />
                <label htmlFor="addToAssetValue" className="text-xs font-bold text-gray-600 cursor-pointer">
                  Somar ao valor do bem
                </label>
              </div>
            )}

            {evolutionType === "transformacao" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Novo Tipo de Ativo</label>
                <select 
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary-blue transition-all appearance-none"
                >
                  <option value="terreno">Terreno</option>
                  <option value="imovel">Imóvel</option>
                  <option value="veiculo">Veículo</option>
                  <option value="item">Item</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            )}

            {(evolutionType === "renomear" || evolutionType === "transformacao") && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Novo Nome</label>
                <input 
                  type="text" 
                  required 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary-blue transition-all" 
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Data da Ação</label>
              <input 
                type="date" 
                required 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary-blue transition-all" 
              />
            </div>
          </div>

          {(evolutionType === "investimento" || evolutionType === "transformacao" || evolutionType === "reforma" || evolutionType === "construcao") && parseFloat(value) > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Banco de Origem (Para despesa)</label>
              <select 
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary-blue transition-all appearance-none"
              >
                <option value="">Não registrar despesa</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} - {formatCurrency(acc.balance)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Descrição / Motivo</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-6 bg-gray-50 border-none rounded-2xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-primary-blue transition-all min-h-[100px]"
              placeholder="Ex: Valorização do bairro, reforma da cozinha, troca de nome..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tags (separadas por vírgula)</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-blue transition-colors">
                <Package size={20} />
              </div>
              <input 
                type="text" 
                value={tags} 
                onChange={e => setTags(e.target.value)} 
                className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary-blue transition-all" 
                placeholder="Reforma, Construção, Mercado..." 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full rounded-2xl bg-white py-5 font-black text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                <span>Salvar Evolução</span>
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function WealthForm({ onClose, initialData, onSave }: { onClose: () => void, initialData?: WealthItem, onSave: any }) {
  const [name, setName] = useState(initialData?.name || "");
  const [value, setValue] = useState(initialData?.value.toString() || "");
  const [purchaseValue, setPurchaseValue] = useState(initialData?.purchaseValue?.toString() || "");
  const [purchaseDate, setPurchaseDate] = useState(initialData?.purchaseDate ? initialData.purchaseDate.split("T")[0] : new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<WealthAssetType>(initialData?.type || "outro");
  const [category, setCategory] = useState(initialData?.category || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [observations, setObservations] = useState(initialData?.observations || "");
  
  const [salvando, setSalvando] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSaveInternal = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // 1. DUPLICATE PROTECTION
    if (salvando) return;

    // 2. FORM VALIDATION
    if (!name.trim()) {
       setErrorMessage("O nome do patrimônio é obrigatório.");
       return;
    }

    const valNum = parseCurrencyInput(value);
    const purchaseValNum = parseCurrencyInput(purchaseValue);

    if (valNum <= 0 && purchaseValNum <= 0) {
      setErrorMessage("Por favor, insira valores numéricos válidos.");
      return;
    }

    // 3. START LOADING
    setSalvando(true);
    setErrorMessage(null);

    let safeDate = new Date().toISOString();
    try {
      if (purchaseDate) {
        const d = new Date(purchaseDate);
        if (!isNaN(d.getTime())) {
          safeDate = d.toISOString();
        }
      }
    } catch {
      safeDate = new Date().toISOString();
    }

    try {
      // 5. ASSET DATA SAVING
      const assetData = {
        name: name.trim(),
        value: valNum,
        purchaseValue: purchaseValNum,
        purchaseDate: safeDate,
        type,
        category: (category || "").trim(),
        imageUrl: "",
        description: (description || "").trim(),
        observations: (observations || "").trim(),
        lastUpdate: new Date().toISOString()
      };

      if (initialData) {
        await onSave(initialData.id, assetData);
      } else {
        await onSave({ ...assetData, status: "ativo" });
      }

      onClose();
    } catch (err: any) {
      console.warn("[Wealth] Aviso ao salvar patrimônio:", err);
      // Item is safely cached in localStorage via WealthContext
      onClose();
    } finally {
      // 6. END LOADING (CRITICAL: ALWAYS RUNS)
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl bg-white rounded-[48px] p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8 sticky top-0 bg-white z-10 pb-2">
          <h3 className="text-2xl font-black text-slate-900">{initialData ? "Editar Patrimônio" : "Novo Ativo"}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <X size={24} />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSaveInternal} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome do Patrimônio</label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-primary-green" 
                  placeholder="Ex: Apartamento em SP" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo</label>
                  <select 
                    value={type} 
                    onChange={e => setType(e.target.value as any)} 
                    className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-primary-green"
                  >
                    <option value="imovel">Imóvel</option>
                    <option value="veiculo">Veículo</option>
                    <option value="terreno">Terreno</option>
                    <option value="item">Item</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categoria</label>
                  <input 
                    type="text" 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-primary-green" 
                    placeholder="Ex: Residencial" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descrição</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-primary-green resize-none h-[100px]" 
                  placeholder="Breve descrição do bem..." 
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor Aquisição</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={purchaseValue} 
                    onChange={e => setPurchaseValue(e.target.value)} 
                    className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-primary-green" 
                    placeholder="R$ 0,00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor Atual</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={value} 
                    onChange={e => setValue(e.target.value)} 
                    className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-primary-green" 
                    placeholder="R$ 0,00" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Data Aquisição</label>
                <input 
                  type="date" 
                  required 
                  value={purchaseDate} 
                  onChange={e => setPurchaseDate(e.target.value)} 
                  className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-primary-green" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Observações</label>
                <textarea 
                  value={observations} 
                  onChange={e => setObservations(e.target.value)} 
                  className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-primary-green resize-none h-[100px]" 
                  placeholder="Notas internas..." 
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={salvando}
            className={cn(
              "w-full rounded-3xl py-5 font-black text-slate-900 shadow-xl transition-all mt-4 flex items-center justify-center gap-2",
              salvando ? "bg-gray-400" : "bg-white hover:bg-white/90 active:scale-[0.98]"
            )}
          >
            {salvando ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>SALVANDO...</span>
              </>
            ) : (
              <span>{initialData ? "ATUALIZAR PATRIMÔNIO" : "SALVAR PATRIMÔNIO"}</span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function ConstructionSection({ item, onManage, onStart }: { item: WealthItem, onManage: (c: Construction) => void, onStart: () => void }) {
  const [constructions, setConstructions] = useState<Construction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "constructions"),
      where("userId", "==", auth.currentUser.uid),
      where("wealthItemId", "==", item.id),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Construction));
      setConstructions(data);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar construções:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [item.id]);

  if (loading) return null;
  
  if (constructions.length === 0) return null;

  const activeConstruction = constructions.find(c => c.status === 'em_andamento') || constructions[0];

  return (
    <div className="mt-6 p-4 bg-amber-50 rounded-3xl border border-amber-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900">
            <Hammer size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Construção em andamento</p>
            <h5 className="text-sm font-black text-slate-900">{activeConstruction.name}</h5>
          </div>
        </div>
        <button 
          onClick={() => onManage(activeConstruction)}
          className="p-2 bg-white rounded-xl text-amber-600 hover:bg-amber-500 hover:text-slate-900 transition-all shadow-sm"
        >
          <Edit2 size={14} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
          <span>Progresso</span>
          <span>{activeConstruction.progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-amber-200/50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${activeConstruction.progress}%` }}
            className="h-full bg-amber-500"
          />
        </div>
        <div className="flex justify-between items-center pt-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Investido</span>
          <span className="text-xs font-black text-amber-700">{formatCurrency(activeConstruction.totalInvested)}</span>
        </div>
      </div>
    </div>
  );
}

function StartConstructionModal({ item, onClose, onConfirm }: { item: WealthItem, onClose: () => void, onConfirm: (name: string, targetValue?: number, plannedSteps?: number) => Promise<void> }) {
  const [name, setName] = useState(`Construção em ${item.name}`);
  const [targetValue, setTargetValue] = useState("");
  const [plannedSteps, setPlannedSteps] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome da obra é obrigatório");
      return;
    }
    
    setIsSaving(true);
    setError(null);
    try {
      await onConfirm(
        name, 
        targetValue ? parseFloat(targetValue) : undefined, 
        plannedSteps ? parseInt(plannedSteps) : undefined
      );
      onClose();
    } catch (err) {
      console.error(err);
      setError("Não foi possível iniciar a construção");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }} 
        className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-900">
            <Hammer size={24} />
          </div>
          <h3 className="text-2xl font-black text-slate-900">Nova construção</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nome da Obra</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => {
                setName(e.target.value);
                if (error) setError(null);
              }} 
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-amber-500 transition-all" 
              placeholder="Ex: Construção da Casa Principal" 
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Custo Estimado (Meta)</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={targetValue} 
                  onChange={e => setTargetValue(e.target.value)} 
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-amber-500 transition-all" 
                  placeholder="0,00" 
                />
              </div>
              <p className="text-[10px] text-gray-400 font-medium ml-1">O progresso será calculado com base no valor investido.</p>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold">
                <span className="bg-white px-2 text-gray-300">OU</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Etapas Planejadas</label>
              <input 
                type="number" 
                value={plannedSteps} 
                onChange={e => setPlannedSteps(e.target.value)} 
                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-amber-500 transition-all" 
                placeholder="Ex: 10" 
              />
              <p className="text-[10px] text-gray-400 font-medium ml-1">O progresso será calculado com base nas etapas concluídas.</p>
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-500 ml-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {error}
            </p>
          )}

          <div className="flex gap-4 pt-2">
            <button 
              type="button"
              onClick={onClose} 
              className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-900 bg-amber-500 hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 flex items-center justify-center"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : "Criar obra"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ConstructionManagerModal({ construction: initialConstruction, onClose }: { construction: Construction, onClose: () => void }) {
  const { addConstructionStep, updateConstructionStep, deleteConstructionStep } = useWealth();
  const [construction, setConstruction] = useState<Construction>(initialConstruction);
  const [steps, setSteps] = useState<ConstructionStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingStep, setIsAddingStep] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen to construction document
    const constructionUnsubscribe = onSnapshot(doc(db, "constructions", initialConstruction.id), (snapshot) => {
      if (snapshot.exists()) {
        setConstruction({ id: snapshot.id, ...snapshot.data() } as Construction);
      }
    });

    // Listen to steps
    const stepsQuery = query(
      collection(db, "constructionSteps"),
      where("userId", "==", auth.currentUser.uid),
      where("constructionId", "==", initialConstruction.id),
      orderBy("date", "asc")
    );

    const stepsUnsubscribe = onSnapshot(stepsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConstructionStep));
      setSteps(data);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar etapas:", error);
      setLoading(false);
    });

    return () => {
      constructionUnsubscribe();
      stepsUnsubscribe();
    };
  }, [initialConstruction.id]);

  const handleAddStep = async (stepData: any) => {
    await addConstructionStep(construction.id, stepData);
    setIsAddingStep(false);
  };

  const handleToggleStep = async (step: ConstructionStep) => {
    const newStatus: ConstructionStepStatus = step.status === 'concluido' ? 'pendente' : 'concluido';
    await updateConstructionStep(step.id, construction.id, { status: newStatus });
  };

  const handleDeleteStep = async (stepId: string) => {
    await deleteConstructionStep(stepId, construction.id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: 50, opacity: 0 }} 
        className="w-full max-w-2xl bg-white rounded-[40px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white">
              <Hammer size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">{construction.name}</h3>
              <p className="text-sm text-gray-500 font-medium">Gerenciar etapas e progresso</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-slate-900 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Progresso Total</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <h4 className="text-3xl font-black text-slate-900">{construction.progress.toFixed(0)}%</h4>
                </div>
              </div>
              {construction.targetValue ? (
                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Meta Financeira</span>
                  <p className="text-xs font-black text-amber-700 mt-1">{formatCurrency(construction.targetValue)}</p>
                </div>
              ) : construction.plannedSteps ? (
                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Meta de Etapas</span>
                  <p className="text-xs font-black text-amber-700 mt-1">{construction.plannedSteps} etapas</p>
                </div>
              ) : null}
            </div>
            <div className="mt-4 h-2 bg-amber-200/50 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${construction.progress}%` }}
                className="h-full bg-amber-500"
              />
            </div>
          </div>
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Investido</span>
            <div className="mt-2">
              <h4 className="text-3xl font-black text-slate-900">{formatCurrency(construction.totalInvested)}</h4>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-widest">
              {construction.targetValue 
                ? `Faltam ${formatCurrency(Math.max(0, construction.targetValue - construction.totalInvested))}`
                : "Soma das etapas concluídas"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-lg font-black text-slate-900">Etapas da Obra</h4>
            <button 
              onClick={() => setIsAddingStep(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-white/90 transition-all"
            >
              <Plus size={16} />
              Adicionar Etapa
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
          ) : steps.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <Layers className="mx-auto text-gray-300 mb-3" size={32} />
              <p className="text-sm font-bold text-gray-500">Nenhuma etapa adicionada</p>
              <p className="text-xs text-gray-400 mt-1">Comece adicionando as partes da sua construção.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map(step => (
                <div 
                  key={step.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex items-center justify-between group",
                    step.status === 'concluido' ? "bg-emerald-50 border-emerald-100" : "bg-white border-gray-100 hover:border-amber-200"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => handleToggleStep(step)}
                      className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        step.status === 'concluido' 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "border-gray-200 hover:border-amber-500"
                      )}
                    >
                      {step.status === 'concluido' && <Check size={14} />}
                    </button>
                    <div>
                      <h6 className={cn(
                        "text-sm font-bold",
                        step.status === 'concluido' ? "text-emerald-900" : "text-slate-900"
                      )}>
                        {step.name}
                      </h6>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {format(parseISO(step.date), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "text-sm font-black",
                      step.status === 'concluido' ? "text-emerald-600" : "text-gray-500"
                    )}>
                      {formatCurrency(step.value)}
                    </span>
                    <button 
                      onClick={() => handleDeleteStep(step.id)}
                      className="p-2 text-gray-300 hover:text-rose-500 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isAddingStep && (
          <AddStepModal 
            onClose={() => setIsAddingStep(false)}
            onSave={handleAddStep}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddStepModal({ onClose, onSave }: { onClose: () => void, onSave: (data: any) => Promise<void> }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        name,
        value: parseFloat(value),
        date: new Date(date).toISOString(),
        status: 'pendente' as ConstructionStepStatus
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }} 
        className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-black text-slate-900 mb-6">Nova Etapa</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nome da Etapa</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 transition-all" 
              placeholder="Ex: Fundação, Telhado..." 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Valor</label>
              <input 
                type="number" 
                step="0.01"
                required 
                value={value} 
                onChange={e => setValue(e.target.value)} 
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 transition-all" 
                placeholder="0,00" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Data Prevista</label>
              <input 
                type="date" 
                required 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 transition-all" 
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose} 
              className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl font-bold text-slate-900 bg-amber-500 hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 flex items-center justify-center"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : "Salvar"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default Wealth;
