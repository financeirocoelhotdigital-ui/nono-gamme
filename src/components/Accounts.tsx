import React, { useState, useMemo, useEffect } from "react";
import { Account, Transaction } from "../types";
import { auth } from "../lib/firebase";
import { formatCurrency, cn } from "../lib/utils";
import { useContas } from "../context/ContasContext";
import { useCartoes } from "../context/CartoesContext";
import { useTransacoes } from "../context/TransacoesContext";
import { 
  Landmark, 
  Wallet, 
  PiggyBank, 
  TrendingUp, 
  TrendingDown,
  Banknote, 
  Smartphone, 
  CreditCard, 
  Coins, 
  ShieldCheck, 
  Sparkles,
  Search,
  SlidersHorizontal,
  Trash2,
  Edit2,
  Plus,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Star,
  ChevronRight,
  RefreshCw,
  Info,
  ArrowLeftRight,
  Eye,
  ToggleLeft,
  ToggleRight,
  PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { BankIcon } from "./BankIcon";
import { ALL_BANKS } from "../constants/banks";

// Helper to map account types to custom Portuguese names
export function getAccountTypeLabel(type: string): string {
  switch (type) {
    case "corrente": return "Conta Corrente";
    case "poupanca": return "Poupança";
    case "investimento": return "Investimento";
    case "carteira": return "Carteira";
    case "dinheiro": return "Dinheiro em Espécie";
    case "banco": return "Banco Tradicional";
    case "digital": return "Conta Digital";
    case "outro": return "Outros";
    default: return type;
  }
}

// Helper to assign a Lucide icon based on type or custom string
export function getAccountIcon(iconName?: string) {
  const size = 18;
  switch (iconName) {
    case "landmark": return <Landmark size={size} />;
    case "wallet": return <Wallet size={size} />;
    case "piggy": return <PiggyBank size={size} />;
    case "trending": return <TrendingUp size={size} />;
    case "cash": return <Banknote size={size} />;
    case "smartphone": return <Smartphone size={size} />;
    case "card": return <CreditCard size={size} />;
    case "coins": return <Coins size={size} />;
    case "shield": return <ShieldCheck size={size} />;
    case "sparkles": return <Sparkles size={size} />;
    default: return <Landmark size={size} />;
  }
}

// Utility function to generate a clean gradient based on custom background hex
function adjustColorBrightness(hex: string, percent: number) {
  // Validate hex format
  let color = hex;
  if (!color || color.length < 7) {
    color = "#3b82f6"; // Default blue fallback
  }
  
  let R = parseInt(color.substring(1, 3), 16) || 0;
  let G = parseInt(color.substring(3, 5), 16) || 0;
  let B = parseInt(color.substring(5, 7), 16) || 0;

  R = Math.max(0, Math.min(255, R + percent));
  G = Math.max(0, Math.min(255, G + percent));
  B = Math.max(0, Math.min(255, B + percent));

  const rHex = R.toString(16).padStart(2, "0");
  const gHex = G.toString(16).padStart(2, "0");
  const bHex = B.toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

export function Accounts() {
  const { 
    accounts, 
    addAccount, 
    updateAccount, 
    deleteAccount, 
    setDefaultAccount, 
    loading,
    error 
  } = useContas();
  const { cards } = useCartoes();
  const { transactions } = useTransacoes();
  const navigate = useNavigate();

  // State managers
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterBank, setFilterBank] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("highest");
  const [showFilters, setShowFilters] = useState(false);

  // Dynamic calculations
  const totalBalance = useMemo(() => {
    return accounts.filter(acc => acc.active).reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  const uniqueBanks = useMemo(() => {
    const list = accounts.map(a => a.institution);
    return Array.from(new Set(list)).filter(Boolean).sort();
  }, [accounts]);

  // Combined search, filtering, and sorting
  const processedAccounts = useMemo(() => {
    let result = [...accounts];

    // Search filter
    if (searchTerm.trim() !== "") {
      const queryStr = searchTerm.toLowerCase();
      result = result.filter(acc => 
        acc.name.toLowerCase().includes(queryStr) ||
        acc.institution.toLowerCase().includes(queryStr) ||
        getAccountTypeLabel(acc.type).toLowerCase().includes(queryStr) ||
        (acc.notes && acc.notes.toLowerCase().includes(queryStr))
      );
    }

    // Type filter
    if (filterType !== "all") {
      result = result.filter(acc => acc.type === filterType);
    }

    // Institution filter
    if (filterBank !== "all") {
      result = result.filter(acc => acc.institution === filterBank);
    }

    // Status filter
    if (filterStatus !== "all") {
      const isFilterActive = filterStatus === "active";
      result = result.filter(acc => acc.active === isFilterActive);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "highest") {
        return b.balance - a.balance;
      } else if (sortBy === "lowest") {
        return a.balance - b.balance;
      } else if (sortBy === "alphabetical") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [accounts, searchTerm, filterType, filterBank, filterStatus, sortBy]);

  // Reset all active filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterBank("all");
    setFilterStatus("all");
    setSortBy("highest");
  };

  const handleToggleActive = async (acc: Account) => {
    try {
      await updateAccount(acc.id, { active: !acc.active });
    } catch (err) {
      console.error("Erro ao alterar status de ativação da conta:", err);
    }
  };

  const handleSetDefault = async (accountId: string) => {
    try {
      await setDefaultAccount(accountId);
    } catch (err) {
      console.error("Erro ao definir conta como padrão:", err);
    }
  };

  const handleDeleteClick = (acc: Account) => {
    setAccountToDelete(acc);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await deleteAccount(accountToDelete.id);
      setAccountToDelete(null);
    } catch (err: any) {
      console.error("Erro ao excluir conta bancária:", err);
      ((window as any).mostrarMensagem || window.alert)(err.message || "Erro ao excluir conta.");
    }
  };

  // Check if account has associated transactions
  const getAssociatedTransactionsCount = (accountId: string) => {
    return transactions.filter(t => t.accountId === accountId || t.toAccountId === accountId).length;
  };

  return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto px-4 md:px-0 mt-4">
      {/* Dynamic Header Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[36px] bg-white p-8 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50"
      >
        {/* Background Patterns */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-50 rounded-full blur-[80px] -mr-[150px] -mt-[150px] pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[60px] -ml-[100px] -mb-[100px] pointer-events-none mix-blend-screen" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 bg-white/5 border border-gray-50 px-3 py-1 rounded-full backdrop-blur-sm w-max">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Patrimônio Líquido Disponível</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 flex items-baseline gap-2 mt-2">
              {formatCurrency(totalBalance)}
            </h1>
            <p className="text-[11px] text-gray-400 font-medium">Soma de todas as contas ativas do seu portfólio.</p>
          </div>

          <div className="flex gap-4 self-start md:self-center">
            <div className="rounded-[24px] bg-white/[0.02] backdrop-blur-md p-5 border border-gray-50 flex flex-col justify-center min-w-[120px] relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-1">Contas</span>
              <span className="text-2xl font-black text-emerald-400 tracking-tight">{accounts.length}</span>
            </div>
            <div className="rounded-[24px] bg-white/[0.02] backdrop-blur-md p-5 border border-gray-50 flex flex-col justify-center min-w-[120px] relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-1">Cartões</span>
              <span className="text-2xl font-black text-blue-400 tracking-tight">{cards.length}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Primary Section Title & Action Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Contas Bancárias</h2>
          <p className="text-xs text-gray-500 font-medium mt-1">Gerencie suas contas, saldos e movimentações.</p>
        </div>
        <button 
          onClick={() => setIsAddingAccount(true)}
          className="flex items-center gap-2 h-12 px-5 rounded-[16px] bg-white hover:bg-gray-800 active:scale-95 text-emerald-600 font-bold text-xs tracking-wide transition-all cursor-pointer shadow-sm hover:shadow-md"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nova Conta
        </button>
      </div>

      {/* Filter and Search Bar Controller */}
      <div className="bg-white rounded-[24px] p-4 border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Pesquisar por conta, banco ou observações..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-12 bg-gray-50 rounded-[16px] pl-11 pr-4 text-sm font-medium border border-gray-200 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 text-slate-900 focus:ring-4 focus:ring-emerald-500/10"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-12 px-4 rounded-[16px] flex items-center justify-center border transition-all cursor-pointer min-w-[48px]",
              showFilters || filterType !== "all" || filterBank !== "all" || filterStatus !== "all" || sortBy !== "highest"
                ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-slate-900"
            )}
            title="Mais Filtros"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Extended Filter Drawer */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Type Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] block ml-1">Tipo de Conta</label>
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="w-full h-10 bg-gray-50 border border-gray-200 rounded-[12px] px-3 text-xs font-medium text-gray-700 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
                  >
                    <option value="all">Todos os tipos</option>
                    <option value="corrente">Conta Corrente</option>
                    <option value="poupanca">Poupança</option>
                    <option value="investimento">Investimento</option>
                    <option value="carteira">Carteira</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                {/* Institution/Bank Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] block ml-1">Banco</label>
                  <select
                    value={filterBank}
                    onChange={e => setFilterBank(e.target.value)}
                    className="w-full h-10 bg-gray-50 border border-gray-200 rounded-[12px] px-3 text-xs font-medium text-gray-700 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
                  >
                    <option value="all">Todas as instituições</option>
                    {uniqueBanks.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Activation Status Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] block ml-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="w-full h-10 bg-gray-50 border border-gray-200 rounded-[12px] px-3 text-xs font-medium text-gray-700 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
                  >
                    <option value="all">Ativas e Inativas</option>
                    <option value="active">Somente Ativas</option>
                    <option value="inactive">Somente Inativas</option>
                  </select>
                </div>

                {/* Sort controller */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] block ml-1">Ordenar Por</label>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="w-full h-10 bg-gray-50 border border-gray-200 rounded-[12px] px-3 text-xs font-medium text-gray-700 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
                  >
                    <option value="highest">Maior saldo primeiro</option>
                    <option value="lowest">Menor saldo primeiro</option>
                    <option value="alphabetical">Ordem alfabética (A-Z)</option>
                  </select>
                </div>
              </div>

              {(filterType !== "all" || filterBank !== "all" || filterStatus !== "all" || searchTerm !== "") && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Limpar Filtros Activos
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Accounts List & Bento Display */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-rose-50 rounded-[32px] border border-rose-100 text-center max-w-md mx-auto my-6">
          <div className="h-12 w-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-sm font-black text-rose-900 uppercase tracking-wider">Não foi possível carregar os dados.</h3>
          <p className="text-xs text-rose-600 mt-1 leading-relaxed">
            {error.message || "Ocorreu um erro ao conectar com o banco de dados."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Carregando Contas...</p>
        </div>
      ) : accounts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 px-6 bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200 text-center"
        >
          <div className="h-20 w-20 bg-white shadow-sm border border-gray-100 text-emerald-500 rounded-[24px] flex items-center justify-center mb-6">
            <PlusCircle size={32} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Você ainda não possui registros.</h3>
          <p className="text-sm text-gray-500 max-w-md mt-2">
            Cadastre sua primeira conta bancária para começar a gerenciar seus saldos e conciliações.
          </p>
          <button
            onClick={() => setIsAddingAccount(true)}
            className="mt-8 px-6 py-3.5 bg-white text-emerald-600 font-bold text-sm tracking-wide rounded-[16px] shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            Adicionar Nova Conta
          </button>
        </motion.div>
      ) : processedAccounts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 px-6 bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200 text-center"
        >
          <div className="h-20 w-20 bg-white shadow-sm border border-gray-100 text-gray-400 rounded-[24px] flex items-center justify-center mb-6">
            <Wallet size={32} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Nenhuma conta localizada</h3>
          <p className="text-sm text-gray-500 max-w-md mt-2">
            Não encontramos contas registradas que correspondam aos seus filtros ou buscas.
          </p>
          {(searchTerm || filterType !== "all" || filterBank !== "all" || filterStatus !== "all") && (
            <button
              onClick={handleResetFilters}
              className="mt-8 px-6 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm tracking-wide rounded-[16px] transition-all cursor-pointer shadow-sm"
            >
              Resetar Filtros
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {processedAccounts.map(acc => {
              const bgGradient = `linear-gradient(135deg, ${acc.color || '#3b82f6'} 0%, ${adjustColorBrightness(acc.color || '#3b82f6', -35)} 100%)`;
              const isLowBalance = acc.balanceThreshold !== undefined && acc.balance >= 0 && acc.balance < (acc.balanceThreshold ?? 0);
              const isNegative = acc.balance < 0;

              return (
                <motion.div
                  key={acc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "group relative overflow-hidden rounded-[32px] bg-white border border-gray-100 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-6",
                    !acc.active && "opacity-60 bg-gray-50/50 grayscale-[0.2]"
                  )}
                >
                  {/* Subtle Background Accent based on account color */}
                  <div 
                    className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[60px] opacity-[0.08] pointer-events-none group-hover:opacity-[0.12] transition-opacity duration-500" 
                    style={{ backgroundColor: acc.color || '#3b82f6' }} 
                  />
                  
                  {/* Status Indicator Line */}
                  <div 
                    className="absolute top-0 bottom-0 left-0 w-1.5 transition-colors duration-300" 
                    style={{ backgroundColor: acc.active ? (acc.color || '#3b82f6') : '#d1d5db' }} 
                  />

                  {/* Account Metadata Row */}
                  <div className="pl-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <BankIcon bankName={acc.institution} className="h-16 w-16 rounded-[20px] shadow-sm border border-gray-100 bg-white p-1" />
                        {acc.isDefault && (
                          <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow-md border-2 border-white" title="Conta Principal">
                            <Star size={14} fill="currentColor" strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none">{acc.name}</h3>
                          {!acc.active && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 font-bold text-[9px] uppercase tracking-wider">Inativa</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 mt-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider">{acc.institution}</span>
                          <span className="h-1 w-1 rounded-full bg-gray-300" />
                          <span className="text-[11px] font-medium flex items-center gap-1.5 text-gray-500">
                            {getAccountIcon(acc.icon || "landmark")}
                            {getAccountTypeLabel(acc.type)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Financial Numbers */}
                    <div className="text-left sm:text-right flex flex-col justify-center bg-gray-50/50 p-4 rounded-[24px] border border-gray-100/50 min-w-[200px]">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-1">Saldo Atual</span>
                      <div className={cn(
                        "text-2xl font-black tracking-tight",
                        isNegative ? "text-rose-500" : "text-slate-900"
                      )}>
                        {formatCurrency(acc.balance)}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium mt-1">
                        Inicial: <span className="font-bold text-gray-500">{formatCurrency(acc.initialBalance || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Flags Block */}
                  <div className="pl-3 flex flex-wrap gap-2 relative z-10">
                    {/* Reconciled Badge */}
                    {acc.lastReconciliation ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold tracking-wide border border-emerald-100/50">
                        <CheckCircle2 size={12} strokeWidth={2.5} />
                        Conciliado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-500 text-[10px] font-bold tracking-wide border border-gray-100">
                        <Info size={12} strokeWidth={2.5} />
                        Não Conciliado
                      </span>
                    )}

                    {/* Negative balance alarm */}
                    {isNegative && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold tracking-wide border border-rose-100/50 animate-pulse">
                        <AlertTriangle size={12} strokeWidth={2.5} />
                        Saldo Negativo
                      </span>
                    )}

                    {/* Safety Minimum Threshold Breach alarm */}
                    {isLowBalance && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold tracking-wide border border-amber-100/50">
                        <AlertTriangle size={12} strokeWidth={2.5} />
                        Abaixo do Mínimo Estipulado ({formatCurrency(acc.balanceThreshold ?? 0)})
                      </span>
                    )}
                  </div>

                  {/* Observações / Notes Area if exists */}
                  {acc.notes && (
                    <div className="pl-3 relative z-10">
                      <div className="py-2.5 px-4 rounded-[16px] bg-gray-50 border border-gray-100 text-xs text-gray-500 font-medium relative">
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-gray-300 rounded-full"></div>
                        {acc.notes}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar Footer */}
                  <div className="pl-3 pt-4 mt-2 border-t border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 relative z-10">
                    {/* Fast Transaction Shortcut Links */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/income?accountId=${acc.id}`)}
                        className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                        title="Adicionar Receita nesta conta"
                      >
                        <TrendingUp size={12} />
                        Receita
                      </button>
                      <button
                        onClick={() => navigate(`/expenses?accountId=${acc.id}`)}
                        className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                        title="Adicionar Despesa nesta conta"
                      >
                        <TrendingDown size={12} />
                        Despesa
                      </button>
                      <button
                        onClick={() => navigate(`/transfers?fromAccountId=${acc.id}`)}
                        className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-500 hover:text-white text-blue-600 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                        title="Transferir fundos"
                      >
                        <ArrowLeftRight size={12} />
                        Transferir
                      </button>
                    </div>

                    {/* Card and Account Controls */}
                    <div className="flex items-center justify-end gap-1.5 self-end">
                      {/* Active/Inactive switch toggles */}
                      <button
                        onClick={() => handleToggleActive(acc)}
                        className={cn(
                          "h-9 px-3 rounded-[12px] flex items-center gap-1.5 border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer",
                          acc.active 
                            ? "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-slate-900"
                            : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-200"
                        )}
                        title={acc.active ? "Desativar Conta" : "Ativar Conta"}
                      >
                        {acc.active ? <ToggleRight className="text-emerald-500" size={16} /> : <ToggleLeft className="text-gray-400" size={16} />}
                        {acc.active ? "Ativa" : "Inativa"}
                      </button>

                      {/* Default Account star selection */}
                      {!acc.isDefault && acc.active && (
                        <button
                          onClick={() => handleSetDefault(acc.id)}
                          className="h-9 w-9 rounded-[12px] bg-gray-50 hover:bg-amber-100 hover:text-amber-600 text-gray-400 flex items-center justify-center border border-transparent hover:border-amber-200 transition-all duration-300 cursor-pointer"
                          title="Definir como Principal"
                        >
                          <Star size={14} />
                        </button>
                      )}

                      {/* Account Statement */}
                      <button
                        onClick={() => navigate(`/statement?accountId=${acc.id}`)}
                        className="h-9 w-9 rounded-[12px] bg-gray-50 hover:bg-gray-100 hover:text-slate-900 text-gray-500 flex items-center justify-center border border-transparent hover:border-gray-200 transition-all duration-300 cursor-pointer"
                        title="Ver Extrato de Transações"
                      >
                        <Eye size={14} />
                      </button>

                      {/* Reconciliation Page */}
                      <button
                        onClick={() => navigate(`/reconciliation?accountId=${acc.id}`)}
                        className="h-9 w-9 rounded-[12px] bg-gray-50 hover:bg-emerald-100 hover:text-emerald-600 text-gray-500 flex items-center justify-center border border-transparent hover:border-emerald-200 transition-all duration-300 cursor-pointer"
                        title="Conciliar Saldo Físico"
                      >
                        <ShieldCheck size={14} />
                      </button>

                      {/* Edit Account Form trigger */}
                      <button
                        onClick={() => setEditingAccount(acc)}
                        className="h-9 w-9 rounded-[12px] bg-gray-50 hover:bg-blue-100 hover:text-blue-600 text-gray-500 flex items-center justify-center border border-transparent hover:border-blue-200 transition-all duration-300 cursor-pointer"
                        title="Editar Conta"
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* Delete Account button */}
                      <button
                        onClick={() => handleDeleteClick(acc)}
                        className="h-9 w-9 rounded-[12px] bg-gray-50 hover:bg-rose-100 hover:text-rose-600 text-gray-400 flex items-center justify-center border border-transparent hover:border-rose-200 transition-all duration-300 cursor-pointer"
                        title="Excluir Conta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Adding / Editing Modal Form */}
      <AnimatePresence>
        {(isAddingAccount || editingAccount) && (
          <AccountForm 
            onClose={() => {
              setIsAddingAccount(false);
              setEditingAccount(null);
            }} 
            initialData={editingAccount ?? undefined} 
            accounts={accounts}
            addAccount={addAccount}
            updateAccount={updateAccount}
            setDefaultAccount={setDefaultAccount}
          />
        )}
      </AnimatePresence>

      {/* Delete Warning Dialogue with strict transaction check */}
      <AnimatePresence>
        {accountToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100"
            >
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 mb-4 tracking-tight">Excluir Conta Bancária?</h3>
              
              <div className="space-y-4 mb-8">
                <p className="text-center text-gray-500 text-sm font-medium">
                  Tem certeza de que deseja excluir a conta <strong className="text-slate-900">"{accountToDelete.name}"</strong>? Esta ação é definitiva e não poderá ser desfeita.
                </p>

                {getAssociatedTransactionsCount(accountToDelete.id) > 0 ? (
                  <div className="p-4 rounded-[16px] bg-rose-50 border border-rose-100 text-rose-600 space-y-2">
                    <div className="flex gap-2 items-start text-xs font-black uppercase tracking-wider">
                      <AlertTriangle size={16} className="shrink-0" />
                      Aviso Crítico de Transações
                    </div>
                    <p className="text-xs font-medium text-rose-500">
                      Esta conta possui <strong className="text-rose-700">{getAssociatedTransactionsCount(accountToDelete.id)} transações registradas</strong>. Excluir a conta deixará estas transações sem uma conta associada no histórico.
                    </p>
                    <p className="text-xs font-bold text-rose-600">
                      Altamente recomendado: Desative esta conta para ocultá-la mantendo o histórico financeiro intacto!
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-xs text-gray-400">
                    Nenhuma movimentação financeira vinculada a esta conta foi encontrada. É seguro prosseguir.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setAccountToDelete(null)}
                    className="flex-1 h-12 font-bold text-gray-500 bg-gray-100 rounded-[16px] hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 h-12 font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-[16px] shadow-[0_4px_12px_-4px_rgba(244,63,94,0.5)] transition-all cursor-pointer"
                  >
                    Excluir de Vez
                  </button>
                </div>
                
                {getAssociatedTransactionsCount(accountToDelete.id) > 0 && (
                  <button
                    onClick={async () => {
                      await handleToggleActive(accountToDelete);
                      setAccountToDelete(null);
                    }}
                    className="w-full h-12 font-bold text-xs uppercase tracking-wider text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-[16px] border border-emerald-100 transition-colors cursor-pointer"
                  >
                    Apenas Desativar Conta (Mais Seguro)
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------
// Subcomponent: Form for Add and Edit Account
// ----------------------------------------------------
interface AccountFormProps {
  onClose: () => void;
  initialData?: Account;
  accounts: Account[];
  addAccount: (accountData: Omit<Account, "id" | "userId">) => Promise<Account | null>;
  updateAccount: (accountId: string, accountData: Partial<Account>) => Promise<void>;
  setDefaultAccount: (accountId: string) => Promise<void>;
}

function AccountForm({ 
  onClose, 
  initialData, 
  accounts, 
  addAccount, 
  updateAccount,
  setDefaultAccount
}: AccountFormProps) {
  // Input states
  const [name, setName] = useState(initialData?.name || "");
  const [institution, setInstitution] = useState(initialData?.institution || "");
  const [type, setType] = useState<any>(initialData?.type || "corrente");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [color, setColor] = useState(initialData?.color || "#10b981");
  const [icon, setIcon] = useState(initialData?.icon || "landmark");
  const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);
  const [isActive, setIsActive] = useState(initialData?.active !== false);

  // Currency masked input values
  const [rawBalance, setRawBalance] = useState(
    initialData?.balance !== undefined 
      ? initialData.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
      : ""
  );
  const [rawInitialBalance, setRawInitialBalance] = useState(
    initialData?.initialBalance !== undefined 
      ? initialData.initialBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
      : ""
  );
  const [rawThreshold, setRawThreshold] = useState(
    initialData?.balanceThreshold !== undefined && initialData?.balanceThreshold !== null
      ? initialData.balanceThreshold.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
      : ""
  );

  // Popular colors palette list
  const PALETTE_COLORS = [
    "#820ad1", // Nubank purple
    "#ec7000", // Itaú orange
    "#cc092f", // Bradesco red
    "#ec0000", // Santander red
    "#f59e0b", // Yellow/Gold
    "#10b981", // Emerald green
    "#0ea5e9", // Sky blue
    "#3b82f6", // Blue
    "#212121", // Onyx
    "#64748b", // Slate grey
  ];

  // Visual icons select palette
  const AVAILABLE_ICONS = [
    { id: "landmark", label: "Banco", component: <Landmark size={18} /> },
    { id: "smartphone", label: "Digital", component: <Smartphone size={18} /> },
    { id: "wallet", label: "Carteira", component: <Wallet size={18} /> },
    { id: "piggy", label: "Poupança", component: <PiggyBank size={18} /> },
    { id: "cash", label: "Dinheiro", component: <Banknote size={18} /> },
    { id: "trending", label: "Investimento", component: <TrendingUp size={18} /> },
    { id: "card", label: "Cartão", component: <CreditCard size={18} /> },
    { id: "coins", label: "Moedas", component: <Coins size={18} /> },
    { id: "shield", label: "Reserva", component: <ShieldCheck size={18} /> },
    { id: "sparkles", label: "Especial", component: <Sparkles size={18} /> }
  ];

  // Form search & selector for financial institutions
  const [searchTerm, setSearchTerm] = useState("");
  const [showBankList, setShowBankList] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredBanks = useMemo(() => {
    return ALL_BANKS.filter(b => 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [searchTerm]);

  // Mask function for input keys
  const applyCurrencyMask = (val: string, setter: (v: string) => void) => {
    const numeric = val.replace(/\D/g, "");
    if (!numeric) {
      setter("");
      return;
    }
    const parsed = parseInt(numeric) / 100;
    setter(parsed.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  // Convert localized pt-BR string back to standard Float
  const parseCurrencyValue = (formatted: string): number => {
    if (!formatted) return 0;
    const cleaned = formatted.replace(/\./g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const handleSelectBank = (bankName: string, bankColor: string, bankId: string) => {
    setInstitution(bankName);
    setColor(bankColor);
    
    // Auto preset icon based on specific ids
    if (bankId === "carteira") {
      setIcon("wallet");
      setType("carteira");
    } else if (bankId === "xp" || bankId === "rico" || bankId === "clear") {
      setIcon("trending");
      setType("investimento");
    } else {
      setIcon("landmark");
      setType("corrente");
    }

    if (!name) {
      setName(`Conta ${bankName}`);
    }
    setShowBankList(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Form validations
    if (!name.trim()) {
      setFormError("O nome da conta é um campo obrigatório.");
      return;
    }
    if (!institution.trim()) {
      setFormError("É necessário selecionar uma instituição financeira.");
      return;
    }

    const dupName = accounts.some(
      acc => acc.name.toLowerCase().trim() === name.toLowerCase().trim() && acc.id !== initialData?.id
    );
    if (dupName) {
      setFormError("Já existe uma conta bancária com este nome cadastrado.");
      return;
    }

    const finalBalance = parseCurrencyValue(rawBalance);
    const finalInitialBalance = rawInitialBalance ? parseCurrencyValue(rawInitialBalance) : finalBalance;
    const finalThreshold = rawThreshold ? parseCurrencyValue(rawThreshold) : undefined;

    const data: Partial<Account> = {
      name: name.trim(),
      institution: institution.trim(),
      type,
      notes: notes.trim(),
      color,
      icon,
      isDefault,
      active: isActive,
      balanceThreshold: finalThreshold ?? undefined,
      initialBalance: finalInitialBalance,
      balance: finalBalance,
      createdAt: initialData?.createdAt || new Date().toISOString()
    };

    try {
      if (initialData) {
        await updateAccount(initialData.id, data);
        
        // If set as default now, handle reset of others inside the service
        if (isDefault && !initialData.isDefault) {
          await setDefaultAccount(initialData.id);
        }
      } else {
        // Create new account
        const created = await addAccount(data as any);
        if (created && isDefault) {
          await setDefaultAccount(created.id);
        }
      }
      onClose();
    } catch (err) {
      console.error("Erro no formulário da conta:", err);
      setFormError("Ocorreu um erro ao salvar os dados. Tente novamente.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ y: "100%", opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: "100%", opacity: 0 }} 
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
        className="w-full max-w-xl rounded-[32px] sm:rounded-[40px] bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col max-h-[90vh] overflow-hidden border border-neutral-100" 
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-50 mb-6">
          <div>
            <h3 className="text-lg font-black tracking-tight text-neutral-800 uppercase italic">
              {initialData ? "Reconfigurar Conta" : "Criar Conta Profissional"}
            </h3>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Módulo Contas de Produção</p>
          </div>
          <button 
            onClick={onClose} 
            className="h-10 w-10 rounded-full bg-neutral-50 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Warning/Error Banner */}
        {formError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-start gap-3 text-xs font-semibold"
          >
            <AlertTriangle className="shrink-0 text-rose-500" size={16} />
            <div>{formError}</div>
          </motion.div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Institutional Banking selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Instituição Financeira / Provedor</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBankList(!showBankList)}
                className="w-full flex items-center gap-4 rounded-2xl bg-neutral-50 p-4 text-left border-2 border-transparent hover:border-neutral-200 focus:border-emerald-500/20 focus:bg-white focus:outline-none transition-all cursor-pointer"
              >
                <BankIcon bankName={institution} className="h-10 w-10 shadow-sm bg-white" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-neutral-800">{institution || "Selecione uma Instituição"}</div>
                  <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Clique para buscar na lista oficial</div>
                </div>
                <ChevronRight size={18} className={cn("text-neutral-400 transition-transform", showBankList && "rotate-90")} />
              </button>

              <AnimatePresence>
                {showBankList && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-neutral-100 overflow-hidden"
                  >
                    <div className="p-3 border-b border-neutral-100 bg-neutral-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                        <input 
                          type="text"
                          placeholder="Buscar banco brasileiro, internacional ou carteira..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full rounded-xl bg-white border border-neutral-200 py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    
                    <div className="max-h-56 overflow-y-auto custom-scrollbar">
                      {filteredBanks.map(bank => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => handleSelectBank(bank.name, bank.color, bank.id)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-none text-left cursor-pointer"
                        >
                          <BankIcon bankName={bank.name} className="h-8 w-8" />
                          <div className="flex-1">
                            <div className="text-xs font-bold text-neutral-800">{bank.name}</div>
                            <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">{bank.fullName}</div>
                          </div>
                          {institution === bank.name && <Check size={14} className="text-emerald-500" strokeWidth={4} />}
                        </button>
                      ))}
                      {searchTerm && !filteredBanks.some(b => b.name.toLowerCase() === searchTerm.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => handleSelectBank(searchTerm, "#6b7280", "custom")}
                          className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-none text-left cursor-pointer"
                        >
                          <Landmark size={20} className="text-neutral-400 p-1 bg-neutral-100 rounded" />
                          <div>
                            <div className="text-xs font-bold text-neutral-800">Usar "{searchTerm}"</div>
                            <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Instituição Personalizada</div>
                          </div>
                          <Plus size={14} className="ml-auto text-emerald-500" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Account display name */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Nome de Identificação da Conta</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full h-12 rounded-xl bg-neutral-50 border border-neutral-200 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-500 text-neutral-800 transition-all" 
              placeholder="Ex: Minha Conta Corrente de Recebimento" 
            />
          </div>

          {/* Account Types Options */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Categoria de Conta</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "corrente", label: "C. Corrente", icon: <Landmark size={14} /> },
                { id: "poupanca", label: "Poupança", icon: <PiggyBank size={14} /> },
                { id: "investimento", label: "Investimento", icon: <TrendingUp size={14} /> },
                { id: "carteira", label: "Carteira", icon: <Wallet size={14} /> },
                { id: "dinheiro", label: "Espécie", icon: <Banknote size={14} /> },
                { id: "outro", label: "Outros", icon: <Smartphone size={14} /> }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                    type === t.id 
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20" 
                      : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Financial Balances with masked Portuguese inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Saldo Atual</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">R$</span>
                <input 
                  type="text" 
                  required 
                  value={rawBalance} 
                  onChange={e => applyCurrencyMask(e.target.value, setRawBalance)}
                  className="w-full h-12 rounded-xl bg-neutral-50 border border-neutral-200 pl-10 pr-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-500 text-neutral-800 font-mono" 
                  placeholder="0,00" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Saldo Inicial</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">R$</span>
                <input 
                  type="text" 
                  required 
                  value={rawInitialBalance} 
                  onChange={e => applyCurrencyMask(e.target.value, setRawInitialBalance)}
                  className="w-full h-12 rounded-xl bg-neutral-50 border border-neutral-200 pl-10 pr-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-500 text-neutral-800 font-mono" 
                  placeholder="0,00" 
                />
              </div>
            </div>
          </div>

          {/* Alert Security Threshold */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Alerta de Saldo Mínimo de Segurança (Opcional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">R$</span>
              <input 
                type="text" 
                value={rawThreshold} 
                onChange={e => applyCurrencyMask(e.target.value, setRawThreshold)}
                className="w-full h-12 rounded-xl bg-neutral-50 border border-neutral-200 pl-10 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-500 text-neutral-800 font-mono" 
                placeholder="Ex: 500,00" 
              />
            </div>
            <p className="text-[9px] text-neutral-400 font-medium leading-normal px-1">Mostraremos um aviso proeminente se o saldo cair abaixo deste valor.</p>
          </div>

          {/* Dynamic Colors Selection Grid */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Identificação por Cor Personalizada</label>
            <div className="flex flex-wrap items-center gap-3">
              {PALETTE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer hover:scale-110",
                    color === c ? "border-slate-900 scale-105 shadow-md" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check size={14} strokeWidth={3} className="text-white drop-shadow-sm" />}
                </button>
              ))}
              <div className="relative h-8 w-8 rounded-full overflow-hidden border border-neutral-200 flex items-center justify-center hover:scale-105 cursor-pointer">
                <input 
                  type="color" 
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                />
                <div className="h-4 w-4 rounded-full border border-neutral-300" style={{ backgroundColor: color }} />
              </div>
            </div>
          </div>

          {/* Custom icons palette */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Ícone Personalizado do Card</label>
            <div className="grid grid-cols-5 gap-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
              {AVAILABLE_ICONS.map(ic => (
                <button
                  key={ic.id}
                  type="button"
                  onClick={() => setIcon(ic.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer hover:bg-white hover:shadow-sm",
                    icon === ic.id 
                      ? "text-emerald-600 bg-white shadow-sm border border-emerald-100" 
                      : "text-neutral-400 hover:text-neutral-600 border border-transparent"
                  )}
                  title={ic.label}
                >
                  {ic.component}
                  <span className="text-[8px] font-bold uppercase tracking-wider mt-1 block">{ic.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Field text area Notes / Observações */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">Observações / Anotações</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-500 text-neutral-700 min-h-[70px] resize-none"
              placeholder="Digite alguma informação adicional relevante sobre a conta..."
            />
          </div>

          {/* Action toggle options (Default / Active) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Primary account checkbox toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-neutral-800 uppercase tracking-tight block">Definir como Principal</span>
                <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block">Usar automaticamente em transações</span>
              </div>
              <button
                type="button"
                disabled={accounts.length === 0 && !initialData}
                onClick={() => setIsDefault(!isDefault)}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-colors cursor-pointer",
                  isDefault ? "bg-amber-400" : "bg-neutral-200"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  isDefault ? "right-1" : "left-1"
                )} />
              </button>
            </div>

            {/* Active/Inactive switch toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
              <div className="space-y-0.5">
                <span className="text-xs font-black text-neutral-800 uppercase tracking-tight block">Conta Ativa</span>
                <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block">Considerar no patrimônio líquido</span>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={cn(
                  "w-12 h-6 rounded-full relative transition-colors cursor-pointer",
                  isActive ? "bg-emerald-500" : "bg-neutral-200"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  isActive ? "right-1" : "left-1"
                )} />
              </button>
            </div>
          </div>

          {/* Save & Cancel Footer buttons */}
          <div className="pt-4 border-t border-neutral-50 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-neutral-200 hover:bg-neutral-50 font-bold text-neutral-500 text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer"
            >
              {initialData ? "Salvar Alterações" : "Cadastrar Conta"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
