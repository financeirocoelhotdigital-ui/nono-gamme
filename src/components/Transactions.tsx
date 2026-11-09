import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  Transaction, 
  Account, 
  Card, 
  Emotion, 
  TransactionType, 
  UserProfile 
} from "../types";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { formatCurrency, cn, formatDate, parseLocalDate, formatDateForInput } from "../lib/utils";
import { useFormat } from "../hooks/useFormat";
import { ReceiptScanner } from "./ReceiptScanner";
import { StatementImporter } from "./StatementImporter";
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Copy, 
  Edit2, 
  TrendingUp, 
  TrendingDown, 
  Smile, 
  Meh, 
  Frown, 
  Zap, 
  Angry, 
  Heart, 
  AlertTriangle, 
  Brain, 
  Repeat, 
  Landmark, 
  Sparkles, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Calendar, 
  CreditCard, 
  ArrowRight, 
  Tag, 
  MessageSquare, 
  Store, 
  User, 
  Clock, 
  Wallet, 
  Camera, 
  FileText,
  RefreshCw,
  Trophy,
  SlidersHorizontal,
  ChevronRight,
  X,
  PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BankIcon } from "./BankIcon";
import { IncomeForm } from "./Income.tsx";
import { ExpenseForm } from "./Expenses.tsx";
import { TransactionHistoryModal } from "./TransactionHistoryModal";
import { useTransacoes } from "../context/TransacoesContext";
import { useContas } from "../context/ContasContext";
import { useCartoes } from "../context/CartoesContext";
import { useCategorias } from "../context/CategoriasContext";
import { transacoes as transacoesMod } from "../modules/transacoesModule";

// Newly created modular components
import { TransactionItem, getTransactionTypeIdentity } from "./TransactionItem";
import { TransactionDetails } from "./TransactionDetails";
import { TransferForm } from "./TransferForm";

interface TransactionsProps {
  mode?: "income" | "expenses" | "statement" | "transfers" | "categories";
  onTabChange?: (tab: string) => void;
  userProfile: UserProfile;
  mostrarMensagem?: (msg: string) => void;
}

const EMOTIONS: { id: Emotion; icon: any; label: string; color: string }[] = [
  { id: "feliz", icon: Smile, label: "Feliz", color: "text-emerald-500" },
  { id: "neutro", icon: Meh, label: "Neutro", color: "text-gray-500" },
  { id: "triste", icon: Frown, label: "Triste", color: "text-blue-500" },
  { id: "ansioso", icon: Brain, label: "Ansioso", color: "text-purple-500" },
  { id: "irritado", icon: Angry, label: "Irritado", color: "text-red-500" },
  { id: "empolgado", icon: Zap, label: "Empolgado", color: "text-amber-500" },
  { id: "estressado", icon: AlertTriangle, label: "Estressado", color: "text-orange-500" },
  { id: "racional", icon: Heart, label: "Racional", color: "text-pink-500" },
  { id: "culpado", icon: Frown, label: "Culpado", color: "text-gray-700" },
  { id: "inseguro", icon: AlertTriangle, label: "Inseguro", color: "text-yellow-600" },
  { id: "motivado", icon: TrendingUp, label: "Motivado", color: "text-emerald-600" },
  { id: "impulsivo", icon: Zap, label: "Impulsivo", color: "text-rose-600" },
];

function StatementAnalysis({ transactions }: { transactions: Transaction[] }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const { analyzeStatement } = await import("../services/geminiService");
      const result = await analyzeStatement(transactions);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[32px] bg-white p-6 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600">Análise de Inteligência Artificial</h3>
            <p className="text-[9px] text-slate-900/50 font-bold uppercase tracking-wider">Insights instantâneos de comportamento</p>
          </div>
        </div>
        {!analysis && (
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white px-4 py-2.5 rounded-xl active:scale-95 transition-transform cursor-pointer"
          >
            {loading ? "Processando..." : "Analisar com IA"}
          </button>
        )}
        {analysis && (
          <div className="text-right">
            <div className="text-2xl font-black text-emerald-600 leading-none">{analysis.healthScore}</div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-slate-900/40">Financial Score</div>
          </div>
        )}
      </div>

      {analysis && (
        <div className="space-y-4">
          <p className="text-xs text-slate-900/80 leading-relaxed font-medium italic">"{analysis.summary}"</p>

          <div className="grid grid-cols-1 gap-2.5">
            {analysis.insights.slice(0, 3).map((insight: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-900/70">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <span>{insight}</span>
              </div>
            ))}
          </div>

          {analysis.warnings.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <AlertCircle size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Aviso de Risco</span>
              </div>
              <ul className="space-y-1">
                {analysis.warnings.map((warning: string, i: number) => (
                  <li key={i} className="text-[10px] text-red-200/70 leading-relaxed">• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TransferAnalysis({ transactions }: { transactions: Transaction[] }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const { analyzeTransfers } = await import("../services/geminiService");
      const result = await analyzeTransfers(transactions);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[32px] bg-blue-950 p-6 text-white shadow-xl shadow-blue-950/20 border border-blue-500/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-400/20 flex items-center justify-center text-blue-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Análise de Fluxo de Caixa</h3>
            <p className="text-[9px] text-slate-900/50 font-bold uppercase tracking-wider">Mapeamento de liquidez e rotinas</p>
          </div>
        </div>
        {!analysis && (
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="text-[9px] font-black uppercase tracking-wider bg-blue-500 text-white px-4 py-2.5 rounded-xl active:scale-95 transition-transform cursor-pointer"
          >
            {loading ? "Carregando..." : "Analisar Fluxo"}
          </button>
        )}
        {analysis && (
          <div className="text-right">
            <div className="text-2xl font-black text-blue-400 leading-none">{analysis.efficiencyScore}</div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-slate-900/40">Eficiência</div>
          </div>
        )}
      </div>

      {analysis && (
        <div className="space-y-4">
          <p className="text-xs text-slate-900/80 leading-relaxed font-medium italic">"{analysis.summary}"</p>

          <div className="grid grid-cols-1 gap-2.5">
            {analysis.patterns.slice(0, 3).map((pattern: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-900/70">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <span>{pattern}</span>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Zap size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Estratégia de Liquidez</span>
            </div>
            <ul className="space-y-1">
              {analysis.optimizationTips.map((tip: string, i: number) => (
                <li key={i} className="text-[10px] text-blue-200/70 leading-relaxed">• {tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickTransfers({ accounts, onTransfer }: { accounts: Account[], onTransfer: (from: string, to: string) => void }) {
  const topAccounts = [...accounts].sort((a, b) => b.balance - a.balance).slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Atalhos de Transferência</h3>
        <Zap size={12} className="text-amber-500" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {topAccounts.map(acc => (
          <button
            key={acc.id}
            onClick={() => {
              const otherAcc = accounts.find(a => a.id !== acc.id);
              if (otherAcc) onTransfer(acc.id, otherAcc.id);
            }}
            className="flex-shrink-0 flex items-center gap-3 px-5 py-4 rounded-[24px] bg-white border border-gray-100 shadow-sm hover:border-blue-300 transition-all cursor-pointer"
          >
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <BankIcon bankName={acc.name} className="h-5 w-5" size={10} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-slate-900 leading-none">{acc.name}</p>
              <p className="text-[8px] font-extrabold text-gray-400 uppercase tracking-widest mt-1">Saldo de Origem</p>
            </div>
          </button>
        ))}
        <button
          onClick={() => onTransfer("", "")}
          className="flex-shrink-0 flex items-center gap-3 px-5 py-4 rounded-[24px] bg-gray-50 border border-dashed border-gray-200 hover:bg-gray-100 transition-all cursor-pointer"
        >
          <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-gray-400">
            <Plus size={16} />
          </div>
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Outras Contas</span>
        </button>
      </div>
    </div>
  );
}

export function Transactions({ 
  mode = "statement", 
  onTabChange,
  userProfile,
  mostrarMensagem
}: TransactionsProps) {
  const { formatCurrency, formatDate } = useFormat(userProfile);
  const { transactions, loading, error } = useTransacoes();
  const { accounts } = useContas();
  const { cards } = useCartoes();
  const { categories, subCategories, tags } = useCategorias();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAccountId = searchParams.get("accountId") || "all";
  const autoAdd = searchParams.get("add") || "";

  const [isAdding, setIsAdding] = useState(
    autoAdd === "transfer" || 
    autoAdd === "income" || 
    autoAdd === "expense" || 
    autoAdd === "true"
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [addingType, setAddingType] = useState<TransactionType | null>(
    autoAdd === "transfer" ? "transfer" :
    autoAdd === "income" ? "income" :
    autoAdd === "expense" ? "expense" :
    mode === "income" ? "income" :
    mode === "expenses" ? "expense" :
    mode === "transfers" ? "transfer" :
    null
  );

  useEffect(() => {
    const fromAccId = searchParams.get("fromAccountId");
    if (fromAccId) {
      const otherAcc = accounts.find(a => a.id !== fromAccId);
      setQuickTransferData({ from: fromAccId, to: otherAcc?.id || "" });
      setIsAdding(true);
      setAddingType("transfer");
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("fromAccountId");
      setSearchParams(newParams, { replace: true });
      return;
    }

    const addParam = searchParams.get("add");
    if (addParam === "transfer") {
      setIsAdding(true);
      setAddingType("transfer");
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("add");
      setSearchParams(newParams, { replace: true });
    } else if (addParam === "income") {
      setIsAdding(true);
      setAddingType("income");
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("add");
      setSearchParams(newParams, { replace: true });
    } else if (addParam === "expense") {
      setIsAdding(true);
      setAddingType("expense");
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("add");
      setSearchParams(newParams, { replace: true });
    } else if (addParam === "true") {
      setIsAdding(true);
      if (mode === "income") setAddingType("income");
      else if (mode === "expenses") setAddingType("expense");
      else if (mode === "transfers") setAddingType("transfer");
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("add");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, mode]);

  useEffect(() => {
    if (mode === "transfers") {
      (window as any).abrirModalTransferencia = () => {
        setIsAdding(true);
        setAddingType("transfer");
      };
    } else if (mode === "income") {
      (window as any).abrirModalReceita = () => {
        setIsAdding(true);
        setAddingType("income");
      };
    } else if (mode === "expenses") {
      (window as any).abrirModalDespesa = () => {
        setIsAdding(true);
        setAddingType("expense");
      };
    } else {
      (window as any).abrirModalStatement = () => {
        setIsAdding(true);
        setAddingType(null);
      };
    }
    return () => {
      delete (window as any).abrirModalTransferencia;
      delete (window as any).abrirModalReceita;
      delete (window as any).abrirModalDespesa;
      delete (window as any).abrirModalStatement;
    };
  }, [mode]);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState("");

  // Reconciliation Mode States
  const [isReconMode, setIsReconMode] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  const handleBulkReconcile = async (reconciledStatus: boolean) => {
    if (selectedTxIds.size === 0) return;
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const promises = Array.from(selectedTxIds).map(async (id) => {
        const docRef = doc(db, "transactions", id);
        return updateDoc(docRef, { reconciled: reconciledStatus });
      });
      await Promise.all(promises);
      setSelectedTxIds(new Set());
      if (mostrarMensagem) {
        mostrarMensagem(`${selectedTxIds.size} transações atualizadas com sucesso!`);
      }
    } catch (error) {
      console.error("Error bulk reconciling:", error);
      ((window as any).mostrarMensagem || window.alert)("Erro ao atualizar conciliação em lote.");
    }
  };
  
  // Advanced Filters (State integration supporting combine filters simultaneously)
  const [filterType, setFilterType] = useState<string>("all"); // "all", "income", "expense", "transfer", "debt", "goal", "card", "investment"
  const [filterPeriod, setFilterPeriod] = useState<string>("month"); // "all", "today", "yesterday", "7days", "30days", "this-month", "last-month", "this-year", "custom"
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterAccount, setFilterAccount] = useState(initialAccountId);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCard, setFilterCard] = useState("all");
  const [filterMinVal, setFilterMinVal] = useState("");
  const [filterMaxVal, setFilterMaxVal] = useState("");
  const [filterTag, setFilterTag] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "reconciled" | "pending">("all");
  
  const [showFilters, setShowFilters] = useState(false);
  const [historyTransactionId, setHistoryTransactionId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<string>("day"); // "none", "day", "week", "month", "year", "account", "category", "type"
  const [sortBy, setSortBy] = useState<string>("date"); // "date", "value", "category", "account", "type", "alphabetical"
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [quickTransferData, setQuickTransferData] = useState<{ from: string, to: string } | null>(null);

  // Pagination for high performance to solve slow loading issues
  const [itemsLimit, setItemsLimit] = useState(25);

  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category).filter(Boolean))).sort();
  const uniqueTags = Array.from(new Set(transactions.flatMap(t => t.tags || []).filter(Boolean))).sort();

  // Reset pagination limit when filters or sorting change
  useEffect(() => {
    setItemsLimit(25);
  }, [filter, filterType, filterPeriod, startDate, endDate, filterAccount, filterCategory, filterCard, filterMinVal, filterMaxVal, filterTag, filterStatus, sortBy, sortOrder, groupBy]);

  // Combined Advanced Filters Logic (Flawless data modeling)
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(t => {
      const identity = getTransactionTypeIdentity(t);

      // 1. Real-time Search Filter (Title, Category, Account Institution, Notes, Tags)
      const acc = accounts.find(a => a.id === t.accountId);
      const crd = cards.find(c => c.id === t.cardId);
      const searchTarget = `
        ${t.title || ""} 
        ${t.establishment || ""} 
        ${t.incomeSource || ""} 
        ${t.category || ""} 
        ${acc?.name || ""} 
        ${acc?.institution || ""} 
        ${crd?.name || ""} 
        ${t.notes || ""} 
        ${(t.tags || []).join(" ")}
      `.toLowerCase();

      const matchesSearch = searchTarget.includes(filter.toLowerCase());

      // 2. Mode Restriction (Transfers, Income, Expenses, or Statement)
      const matchesMode = 
        mode === "transfers" ? t.type === "transfer" :
        mode === "income" ? t.type === "income" :
        mode === "expenses" ? t.type === "expense" :
        true;

      // 3. Type Filter (Supports specialized visual identities)
      let matchesType = true;
      if (filterType !== "all") {
        if (filterType === "income") matchesType = t.type === "income";
        else if (filterType === "expense") matchesType = t.type === "expense";
        else if (filterType === "transfer") matchesType = t.type === "transfer";
        else if (filterType === "debt") matchesType = identity.type === "debt";
        else if (filterType === "goal") matchesType = identity.type === "goal";
        else if (filterType === "card") matchesType = identity.type === "card";
        else if (filterType === "investment") matchesType = identity.type === "investment";
      }

      // 4. Combined Parameter Filters
      const matchesCategory = filterCategory === "all" || t.category === filterCategory;
      const matchesAccount = filterAccount === "all" || t.accountId === filterAccount || t.toAccountId === filterAccount;
      const matchesCard = filterCard === "all" || t.cardId === filterCard;
      const matchesTag = filterTag === "all" || (t.tags && t.tags.includes(filterTag));
      
      // 5. Reconciled Status Filter
      const matchesStatus = 
        filterStatus === "all" ? true :
        filterStatus === "reconciled" ? t.reconciled === true :
        t.reconciled !== true;
      
      // 6. Minimum & Maximum Value Filtering
      const val = t.value;
      const matchesMin = filterMinVal === "" || val >= parseFloat(filterMinVal);
      const matchesMax = filterMaxVal === "" || val <= parseFloat(filterMaxVal);

      // 7. Highly precise Period Filtering
      const tDate = parseLocalDate(t.date);
      if (!tDate) return false;
      const now = new Date();
      
      const today = new Date(); today.setHours(0,0,0,0);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      const tDateDay = new Date(tDate); tDateDay.setHours(0,0,0,0);

      let matchesPeriod = true;
      if (filterPeriod === "today") {
        matchesPeriod = tDateDay.getTime() === today.getTime();
      } else if (filterPeriod === "yesterday") {
        matchesPeriod = tDateDay.getTime() === yesterday.getTime();
      } else if (filterPeriod === "7days") {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        matchesPeriod = tDateDay >= sevenDaysAgo && tDateDay <= today;
      } else if (filterPeriod === "30days") {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        matchesPeriod = tDateDay >= thirtyDaysAgo && tDateDay <= today;
      } else if (filterPeriod === "this-month") {
        matchesPeriod = tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      } else if (filterPeriod === "last-month") {
        let lastMonth = now.getMonth() - 1;
        let year = now.getFullYear();
        if (lastMonth < 0) {
          lastMonth = 11;
          year--;
        }
        matchesPeriod = tDate.getMonth() === lastMonth && tDate.getFullYear() === year;
      } else if (filterPeriod === "this-year") {
        matchesPeriod = tDate.getFullYear() === now.getFullYear();
      } else if (filterPeriod === "custom") {
        const start = parseLocalDate(startDate);
        if (start) start.setHours(0,0,0,0);
        const end = parseLocalDate(endDate);
        if (end) end.setHours(23,59,59,999);

        if (start && tDateDay < start) return false;
        if (end && tDateDay > end) return false;
        matchesPeriod = true;
      }

      return (
        matchesSearch && 
        matchesMode && 
        matchesType && 
        matchesCategory && 
        matchesAccount && 
        matchesCard && 
        matchesTag && 
        matchesMin && 
        matchesMax && 
        matchesStatus && 
        matchesPeriod
      );
    });
  }, [transactions, filter, mode, filterType, filterCategory, filterAccount, filterCard, filterTag, filterStatus, filterMinVal, filterMaxVal, filterPeriod, startDate, endDate, accounts, cards]);

  // Mathematically precise sorting calculation
  const sortedTransactions = React.useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let factor = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "date") {
        const ta = parseLocalDate(a.date)?.getTime() || 0;
        const tb = parseLocalDate(b.date)?.getTime() || 0;
        return (ta - tb) * factor;
      } else if (sortBy === "value") {
        return (a.value - b.value) * factor;
      } else if (sortBy === "category") {
        return (a.category || "").localeCompare(b.category || "") * factor;
      } else if (sortBy === "account") {
        const accA = accounts.find(acc => acc.id === a.accountId)?.name || "";
        const accB = accounts.find(acc => acc.id === b.accountId)?.name || "";
        return accA.localeCompare(accB) * factor;
      } else if (sortBy === "type") {
        return (a.type || "").localeCompare(b.type || "") * factor;
      } else if (sortBy === "alphabetical") {
        const titleA = a.title || a.establishment || a.incomeSource || a.category || "";
        const titleB = b.title || b.establishment || b.incomeSource || b.category || "";
        return titleA.localeCompare(titleB) * factor;
      }
      return 0;
    });
  }, [filteredTransactions, sortOrder, sortBy, accounts]);

  // Top Financial Summary calculations auto-updating when filters are changed
  const summary = React.useMemo(() => {
    return {
      income: filteredTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.value, 0),
      expense: filteredTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.value, 0),
      transfer: filteredTransactions.filter(t => t.type === "transfer").reduce((acc, t) => acc + t.value, 0),
      debt: filteredTransactions.filter(t => {
        const identity = getTransactionTypeIdentity(t);
        return identity.type === "debt";
      }).reduce((acc, t) => acc + t.value, 0),
      count: filteredTransactions.length,
      balance: filteredTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.value, 0) - filteredTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.value, 0)
    };
  }, [filteredTransactions]);

  // Categorized breakdown for current filtered list
  const categoryTotals = filteredTransactions.reduce((acc, t) => {
    if (t.type === "expense") {
      const cat = t.category || "Outros";
      acc[cat] = (acc[cat] || 0) + t.value;
    }
    return acc;
  }, {} as Record<string, number>);

  const totalFilteredExpense = Object.values(categoryTotals).reduce((sum, v) => sum + v, 0);

  const sortedCategoriesBreakdown = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4); // top 4

  // Multi-option Automatic Grouping with precise subtotal accounting
  const groupedData = React.useMemo(() => {
    const groups: Record<string, { transactions: Transaction[]; subtotals: { income: number; expense: number; balance: number } }> = {};

    sortedTransactions.forEach(t => {
      let key = "Outros";
      const dateObj = parseLocalDate(t.date);

      if (groupBy === "day") {
        key = formatDate(t.date);
      } else if (groupBy === "week") {
        if (dateObj) {
          const day = dateObj.getDay();
          const sunday = new Date(dateObj);
          sunday.setDate(dateObj.getDate() - day);
          key = `Semana de ${formatDate(sunday.toISOString())}`;
        }
      } else if (groupBy === "month") {
        if (dateObj) {
          key = dateObj.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
          key = key.charAt(0).toUpperCase() + key.slice(1);
        }
      } else if (groupBy === "year") {
        if (dateObj) {
          key = dateObj.getFullYear().toString();
        }
      } else if (groupBy === "account") {
        const acc = accounts.find(a => a.id === t.accountId);
        key = acc ? acc.name : "Sem Conta / Outros";
      } else if (groupBy === "category") {
        key = t.category || "Sem Categoria";
      } else if (groupBy === "type") {
        const identity = getTransactionTypeIdentity(t);
        key = identity.label;
      }

      if (!groups[key]) {
        groups[key] = {
          transactions: [],
          subtotals: { income: 0, expense: 0, balance: 0 }
        };
      }

      groups[key].transactions.push(t);

      if (t.type === "income") {
        groups[key].subtotals.income += t.value;
      } else if (t.type === "expense") {
        groups[key].subtotals.expense += t.value;
      }
    });

    // Net balance mapping
    Object.keys(groups).forEach(k => {
      groups[k].subtotals.balance = groups[k].subtotals.income - groups[k].subtotals.expense;
    });

    return groups;
  }, [sortedTransactions, groupBy, accounts]);

  const groupKeys = React.useMemo(() => Object.keys(groupedData), [groupedData]);

  // Paginated flat array of grouped transactions for lazy rendering (preventing lag)
  const totalPossibleRendered = sortedTransactions.length;

  let accumulated = 0;
  const groupsToRender = groupKeys.map(groupKey => {
    const group = groupedData[groupKey];
    if (accumulated >= itemsLimit) {
      return { groupKey, group, itemsToRender: [] };
    }
    const remaining = itemsLimit - accumulated;
    const itemsToRender = group.transactions.slice(0, remaining);
    accumulated += itemsToRender.length;
    return { groupKey, group, itemsToRender };
  }).filter(g => g.itemsToRender.length > 0);

  // Real Exporters
  const exportToCSV = () => {
    const headers = ["Data", "Descrição", "Tipo", "Categoria", "Valor (R$)", "Conta/Cartão", "Status", "Notas"];
    const rows = sortedTransactions.map(t => {
      const identity = getTransactionTypeIdentity(t);
      const accName = accounts.find(a => a.id === t.accountId)?.name || cards.find(c => c.id === t.cardId)?.name || "Geral";
      const displayTitle = t.title || t.establishment || t.incomeSource || t.category;
      return [
        formatDate(t.date),
        `"${displayTitle.replace(/"/g, '""')}"`,
        identity.label,
        t.category || "",
        t.value.toFixed(2),
        `"${accName.replace(/"/g, '""')}"`,
        t.reconciled ? "Conciliado" : "Não Conciliado",
        `"${(t.notes || "").replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extrato_filtrado_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (mostrarMensagem) mostrarMensagem("Exportação de CSV concluída!");
  };

  const exportToExcel = () => {
    const tableHeader = `<tr style="background-color: #10B981; color: white; font-weight: bold;">
      <th>Data</th>
      <th>Descrição</th>
      <th>Tipo</th>
      <th>Categoria</th>
      <th>Valor</th>
      <th>Conta/Cartão</th>
      <th>Status</th>
      <th>Notas</th>
    </tr>`;
    
    const tableRows = sortedTransactions.map(t => {
      const identity = getTransactionTypeIdentity(t);
      const accName = accounts.find(a => a.id === t.accountId)?.name || cards.find(c => c.id === t.cardId)?.name || "Geral";
      const displayTitle = t.title || t.establishment || t.incomeSource || t.category;
      const rowStyle = t.type === "income" ? "color: #10B981;" : t.type === "expense" ? "color: #EF4444;" : "color: #3B82F6;";
      
      return `<tr>
        <td>${formatDate(t.date)}</td>
        <td>${displayTitle}</td>
        <td>${identity.label}</td>
        <td>${t.category || ""}</td>
        <td style="${rowStyle} font-weight: bold;">R$ ${t.value.toFixed(2)}</td>
        <td>${accName}</td>
        <td>${t.reconciled ? "Conciliado" : "Não Conciliado"}</td>
        <td>${t.notes || ""}</td>
      </tr>`;
    }).join("");

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /></head>
      <body>
        <h2>Extrato Financeiro - Finanças Premium</h2>
        <p>Filtros aplicados. Total de registros: ${sortedTransactions.length}</p>
        <table border="1">
          <thead>${tableHeader}</thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `extrato_${new Date().toISOString().split("T")[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (mostrarMensagem) mostrarMensagem("Planilha Excel (.XLS) baixada com sucesso!");
  };

  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      ((window as any).mostrarMensagem || window.alert)("Ative os pop-ups no seu navegador para exportar o relatório PDF.");
      return;
    }

    const tableRows = sortedTransactions.map(t => {
      const identity = getTransactionTypeIdentity(t);
      const accName = accounts.find(a => a.id === t.accountId)?.name || cards.find(c => c.id === t.cardId)?.name || "Geral";
      const displayTitle = t.title || t.establishment || t.incomeSource || t.category;
      return `
        <tr>
          <td>${formatDate(t.date)}</td>
          <td>${displayTitle}</td>
          <td>${identity.label}</td>
          <td>${t.category || ""}</td>
          <td class="${t.type === 'income' ? 'text-green' : t.type === 'expense' ? 'text-red' : 'text-blue'}">
            ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.value)}
          </td>
          <td>${accName}</td>
          <td>${t.reconciled ? 'Conciliado' : 'Não Conciliado'}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Extrato Financeiro - Finanças Premium</title>
          <style>
            body { font-family: system-ui, sans-serif; color: #1F2937; padding: 40px; }
            h1 { font-size: 24px; font-weight: 900; margin-bottom: 5px; text-transform: uppercase; letter-spacing: -0.05em; }
            p { font-size: 11px; color: #6B7280; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #F3F4F6; text-align: left; padding: 12px; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #4B5563; border-bottom: 2px solid #E5E7EB; }
            td { padding: 12px; font-size: 11px; border-bottom: 1px solid #E5E7EB; }
            .text-green { color: #10B981; font-weight: bold; }
            .text-red { color: #EF4444; font-weight: bold; }
            .text-blue { color: #3B82F6; font-weight: bold; }
            .summary { margin-top: 40px; display: flex; justify-content: space-between; background-color: #F9FAFB; padding: 20px; border-radius: 16px; border: 1px solid #E5E7EB; }
            .summary-item { text-align: center; }
            .summary-item label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #9CA3AF; letter-spacing: 0.1em; }
            .summary-item value { font-size: 15px; font-weight: 900; display: block; margin-top: 4px; }
            @media print {
              button { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1>Extrato Financeiro</h1>
              <p>Relatório de Movimentações em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
            </div>
            <button onclick="window.print()" style="background-color: #030712; color: white; border: none; padding: 12px 24px; font-weight: bold; border-radius: 12px; cursor: pointer; font-size: 11px; text-transform: uppercase; tracking-wider">
              Imprimir / Salvar PDF
            </button>
          </div>

          <div class="summary">
            <div class="summary-item">
              <label>Receitas</label>
              <value class="text-green">${formatCurrency(summary.income)}</value>
            </div>
            <div class="summary-item">
              <label>Despesas</label>
              <value class="text-red">${formatCurrency(summary.expense)}</value>
            </div>
            <div class="summary-item">
              <label>Lançamento Dívidas</label>
              <value style="color: #F97316;">${formatCurrency(summary.debt)}</value>
            </div>
            <div class="summary-item">
              <label>Saldo Líquido</label>
              <value class="${summary.balance >= 0 ? 'text-green' : 'text-red'}">${formatCurrency(summary.balance)}</value>
            </div>
            <div class="summary-item">
              <label>Registros</label>
              <value style="color: #111827;">${summary.count}</value>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Conta / Cartão</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div style="margin-top: 50px; text-align: center; font-size: 9px; color: #9CA3AF; uppercase; tracking-wider">
            Finanças Premium App • Gestão Patrimonial Inteligente
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDuplicate = async (t: Transaction) => {
    const { id, createdAt, ...rest } = t;
    try {
      await transacoesMod.registrarTransacao({
        ...rest,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      } as any);
      if (mostrarMensagem) mostrarMensagem("Movimentação duplicada com sucesso!");
    } catch (err) {
      ((window as any).mostrarMensagem || window.alert)("Erro ao duplicar transação.");
    }
  };

  return (
    <>
      <div className="space-y-6 pb-24">
        
        {/* TOP COMPONENT HEADER PANEL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
              {mode === "transfers" ? "Transferências" : 
               mode === "income" ? "Minhas Receitas" :
               mode === "expenses" ? "Minhas Despesas" :
               "Extrato de Movimentações"}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {summary.count} Lançamentos filtrados no período
            </p>
          </div>

          {/* Action Center Buttons */}
          <div className="flex items-center gap-3">
            {mode === "transfers" ? (
              <button 
                onClick={() => {
                  setIsAdding(true);
                  setAddingType("transfer");
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                <Repeat size={16} strokeWidth={2.5} />
                Nova Transferência
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setIsImporting(true)}
                  className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                  title="Importar Extrato Bancário"
                >
                  <FileText size={16} />
                  <span className="hidden sm:inline">Importar</span>
                </button>
                <button 
                  onClick={() => setIsScanning(true)}
                  className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                  title="Escanear Nota Fiscal por IA"
                >
                  <Camera size={16} />
                  <span className="hidden sm:inline">Escanear</span>
                </button>
                <button 
                  onClick={() => {
                    setIsAdding(true);
                    if (mode === "income") setAddingType("income");
                    else if (mode === "expenses") setAddingType("expense");
                    else setAddingType(null);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:brightness-110 text-slate-900 font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-gray-900/10 cursor-pointer"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  {mode === "income" ? "Nova Receita" : mode === "expenses" ? "Novo Gasto" : "Novo Lançamento"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* TOP SUMMARY METRICS WIDGET (AUTO-UPDATES) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="rounded-[28px] bg-emerald-500/5 border border-emerald-500/10 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <TrendingUp size={16} />
              <span className="text-[8px] font-black uppercase tracking-widest">Receitas</span>
            </div>
            <div>
              <p className="text-lg font-black text-emerald-700 tracking-tight leading-none">
                {formatCurrency(summary.income)}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] bg-rose-500/5 border border-rose-500/10 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-600 mb-2">
              <TrendingDown size={16} />
              <span className="text-[8px] font-black uppercase tracking-widest">Despesas</span>
            </div>
            <div>
              <p className="text-lg font-black text-rose-700 tracking-tight leading-none">
                {formatCurrency(summary.expense)}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] bg-blue-500/5 border border-blue-500/10 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <Repeat size={16} />
              <span className="text-[8px] font-black uppercase tracking-widest">Transf.</span>
            </div>
            <div>
              <p className="text-lg font-black text-blue-700 tracking-tight leading-none">
                {formatCurrency(summary.transfer)}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] bg-orange-500/5 border border-orange-500/10 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-orange-600 mb-2">
              <Landmark size={16} />
              <span className="text-[8px] font-black uppercase tracking-widest">Dívidas Pagas</span>
            </div>
            <div>
              <p className="text-lg font-black text-orange-700 tracking-tight leading-none">
                {formatCurrency(summary.debt)}
              </p>
            </div>
          </div>

          <div className={cn(
            "rounded-[28px] p-5 flex flex-col justify-between border",
            summary.balance >= 0 
              ? "bg-emerald-500/10 border-emerald-500/15 text-emerald-800" 
              : "bg-rose-500/10 border-rose-500/15 text-rose-800"
          )}>
            <div className="flex items-center justify-between mb-2">
              <SlidersHorizontal size={16} />
              <span className="text-[8px] font-black uppercase tracking-widest">Saldo Líquido</span>
            </div>
            <div>
              <p className="text-lg font-black tracking-tight leading-none">
                {formatCurrency(summary.balance)}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] bg-gray-50 border border-gray-100 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <FileText size={16} />
              <span className="text-[8px] font-black uppercase tracking-widest">Lançamentos</span>
            </div>
            <div>
              <p className="text-lg font-black text-slate-900 tracking-tight leading-none">
                {summary.count}
              </p>
            </div>
          </div>
        </div>

        {/* AI INSIGHTS TRIGGER & QUICK ACTIONS */}
        {mode === "statement" && <StatementAnalysis transactions={transactions} />}
        {mode === "transfers" && <TransferAnalysis transactions={transactions} />}
        {mode === "transfers" && <QuickTransfers accounts={accounts} onTransfer={(from, to) => {
          setQuickTransferData({ from, to });
          setIsAdding(true);
          setAddingType("transfer");
        }} />}

        {/* PREMIUM METRIC WIDGETS: CATEGORIES & BULK RECONCILIATION */}
        {mode === "statement" && sortedTransactions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Category Consumption Breakdown (Top 4) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Distribuição de Gastos do Período</h3>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Top categorias do extrato filtrado</p>
                  </div>
                  <span className="text-xs font-black text-rose-600 font-mono bg-rose-50 px-2.5 py-1 rounded-xl">
                    Total: {formatCurrency(totalFilteredExpense)}
                  </span>
                </div>

                {totalFilteredExpense > 0 ? (
                  <div className="space-y-3.5">
                    {sortedCategoriesBreakdown.map(([cat, val]) => {
                      const pct = (val / totalFilteredExpense) * 100;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-gray-600">
                            <span>{cat}</span>
                            <span>{pct.toFixed(0)}% ({formatCurrency(val)})</span>
                          </div>
                          <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6 }}
                              className="h-full bg-rose-500 rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-gray-400">
                    <p className="text-xs italic">Nenhuma despesa para exibir a distribuição das categorias filtradas.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. One-Tap Quick Reconciliation Controller */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Conciliação em Lote</h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-4">Verifique e valide seus lançamentos em lote</p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-600">Modo Conciliação Rápida</span>
                    <button
                      onClick={() => {
                        setIsReconMode(!isReconMode);
                        setSelectedTxIds(new Set());
                      }}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer",
                        isReconMode ? "bg-emerald-500" : "bg-gray-200"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded-full bg-white transition-all duration-200 shadow-sm",
                        isReconMode ? "transform translate-x-6 bg-white" : ""
                      )} />
                    </button>
                  </div>

                  {isReconMode && (
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-bold">Selecionados: <span className="text-slate-900 font-black">{selectedTxIds.size}</span></span>
                        <button
                          onClick={() => {
                            if (selectedTxIds.size === sortedTransactions.length) {
                              setSelectedTxIds(new Set());
                            } else {
                              setSelectedTxIds(new Set(sortedTransactions.map(t => t.id)));
                            }
                          }}
                          className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline cursor-pointer"
                        >
                          {selectedTxIds.size === sortedTransactions.length ? "Desmarcar todos" : "Selecionar todos"}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          disabled={selectedTxIds.size === 0}
                          onClick={() => handleBulkReconcile(true)}
                          className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 border border-emerald-100 cursor-pointer"
                        >
                          Conciliar
                        </button>
                        <button
                          disabled={selectedTxIds.size === 0}
                          onClick={() => handleBulkReconcile(false)}
                          className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 border border-amber-100 cursor-pointer"
                        >
                          Desconciliar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!isReconMode && (
                <p className="text-[10px] text-gray-400 mt-4 leading-normal">
                  Habilite o modo rápido para selecionar múltiplos lançamentos e marcá-los como conciliados com um único toque.
                </p>
              )}
            </div>
          </div>
        )}

        {/* CONTROLS CENTER: SEARCH, TOGGLE FILTERS & EXPORT PANEL */}
        <div className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Real-time search engine */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar por título, estabelecimento, notas, conta, tags..." 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary-lime/30 outline-none transition-all text-xs font-bold text-slate-900"
              />
            </div>

            {/* Quick action buttons for filtering & exports */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all cursor-pointer",
                  showFilters 
                    ? "bg-white text-slate-900 border-primary-dark" 
                    : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                )}
              >
                <Filter size={14} />
                Filtros Avançados
                {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                <button 
                  onClick={exportToCSV}
                  className="px-4 py-2 hover:bg-white rounded-xl text-[9px] font-black uppercase text-gray-500 hover:text-slate-900 transition-all cursor-pointer flex items-center gap-1"
                  title="Exportar para CSV"
                >
                  <Download size={11} /> CSV
                </button>
                <button 
                  onClick={exportToExcel}
                  className="px-4 py-2 hover:bg-white rounded-xl text-[9px] font-black uppercase text-gray-500 hover:text-slate-900 transition-all cursor-pointer flex items-center gap-1"
                  title="Exportar para Excel"
                >
                  <FileText size={11} /> XLS
                </button>
                <button 
                  onClick={exportToPDF}
                  className="px-4 py-2 hover:bg-white rounded-xl text-[9px] font-black uppercase text-gray-500 hover:text-slate-900 transition-all cursor-pointer flex items-center gap-1"
                  title="Exportar PDF / Imprimir"
                >
                  <Calendar size={11} /> PDF
                </button>
              </div>
            </div>
          </div>

          {/* EXPANDABLE COMBINED FILTERS AREA */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-t border-gray-50 pt-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Period Filter Selector */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Período de Data</label>
                    <select 
                      value={filterPeriod} 
                      onChange={e => setFilterPeriod(e.target.value)}
                      className="w-full rounded-xl border-none bg-gray-50 py-2.5 px-3 text-xs font-bold text-gray-600 outline-none"
                    >
                      <option value="all">Todo o histórico</option>
                      <option value="today">Hoje</option>
                      <option value="yesterday">Ontem</option>
                      <option value="7days">Últimos 7 dias</option>
                      <option value="30days">Últimos 30 dias</option>
                      <option value="this-month">Este mês</option>
                      <option value="last-month">Mês passado</option>
                      <option value="this-year">Este ano</option>
                      <option value="custom">Personalizado (Início/Fim)</option>
                    </select>
                  </div>

                  {/* Custom Dates inputs */}
                  {filterPeriod === "custom" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Data Inicial</label>
                        <input 
                          type="date" 
                          value={startDate} 
                          onChange={e => setStartDate(e.target.value)}
                          className="w-full rounded-xl border-none bg-gray-50 py-2 px-3 text-xs font-bold text-gray-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Data Final</label>
                        <input 
                          type="date" 
                          value={endDate} 
                          onChange={e => setEndDate(e.target.value)}
                          className="w-full rounded-xl border-none bg-gray-50 py-2 px-3 text-xs font-bold text-gray-600"
                        />
                      </div>
                    </>
                  )}

                  {/* Account Selector */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Conta Bancária</label>
                    <select 
                      value={filterAccount} 
                      onChange={e => setFilterAccount(e.target.value)}
                      className="w-full rounded-xl border-none bg-gray-50 py-2.5 px-3 text-xs font-bold text-gray-600 outline-none"
                    >
                      <option value="all">Todas as Contas</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category Selector */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Categoria</label>
                    <select 
                      value={filterCategory} 
                      onChange={e => setFilterCategory(e.target.value)}
                      className="w-full rounded-xl border-none bg-gray-50 py-2.5 px-3 text-xs font-bold text-gray-600 outline-none"
                    >
                      <option value="all">Todas as Categorias</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Credit Card Selector */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Cartão de Crédito</label>
                    <select 
                      value={filterCard} 
                      onChange={e => setFilterCard(e.target.value)}
                      className="w-full rounded-xl border-none bg-gray-50 py-2.5 px-3 text-xs font-bold text-gray-600 outline-none"
                    >
                      <option value="all">Todos os Cartões</option>
                      {cards.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Transaction Type identity filter */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Tipo de Lançamento</label>
                    <select 
                      value={filterType} 
                      onChange={e => setFilterType(e.target.value)}
                      className="w-full rounded-xl border-none bg-gray-50 py-2.5 px-3 text-xs font-bold text-gray-600 outline-none"
                    >
                      <option value="all">Todos os tipos</option>
                      <option value="income">Apenas Receitas (Verde)</option>
                      <option value="expense">Apenas Despesas (Vermelho)</option>
                      <option value="transfer">Apenas Transferências (Azul)</option>
                      <option value="debt">Apenas Dívidas (Laranja)</option>
                      <option value="goal">Apenas Metas (Roxo)</option>
                      <option value="card">Apenas Cartão (Amarelo)</option>
                      <option value="investment">Apenas Investimentos (Turquesa)</option>
                    </select>
                  </div>

                  {/* Tag Selector */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Tag vinculada</label>
                    <select 
                      value={filterTag} 
                      onChange={e => setFilterTag(e.target.value)}
                      className="w-full rounded-xl border-none bg-gray-50 py-2.5 px-3 text-xs font-bold text-gray-600 outline-none"
                    >
                      <option value="all">Todas as Tags</option>
                      {uniqueTags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reconciled Status Selector */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Status de Conciliação</label>
                    <select 
                      value={filterStatus} 
                      onChange={e => setFilterStatus(e.target.value as any)}
                      className="w-full rounded-xl border-none bg-gray-50 py-2.5 px-3 text-xs font-bold text-gray-600 outline-none"
                    >
                      <option value="all">Todos</option>
                      <option value="reconciled">Conciliados (Sincronizado)</option>
                      <option value="pending">Não Conciliados</option>
                    </select>
                  </div>

                  {/* Min value filter */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Valor Mínimo (R$)</label>
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={filterMinVal} 
                      onChange={e => setFilterMinVal(e.target.value)}
                      className="w-full rounded-xl border-none bg-gray-50 py-2 px-3 text-xs font-bold text-gray-600"
                    />
                  </div>

                  {/* Max value filter */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Valor Máximo (R$)</label>
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={filterMaxVal} 
                      onChange={e => setFilterMaxVal(e.target.value)}
                      className="w-full rounded-xl border-none bg-gray-50 py-2 px-3 text-xs font-bold text-gray-600"
                    />
                  </div>

                  {/* RESET BUTTON */}
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setFilter("");
                        setFilterType("all");
                        setFilterPeriod("month");
                        setStartDate("");
                        setEndDate("");
                        setFilterAccount("all");
                        setFilterCategory("all");
                        setFilterCard("all");
                        setFilterMinVal("");
                        setFilterMaxVal("");
                        setFilterTag("all");
                        setFilterStatus("all");
                        if (mostrarMensagem) mostrarMensagem("Filtros limpos!");
                      }}
                      className="w-full py-2.5 rounded-xl border border-dashed border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-slate-900 hover:border-primary-dark transition-all cursor-pointer"
                    >
                      Limpar Filtros
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RE-ORDERING AND GROUPING PREFERENCES */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
          
          {/* Automatic Grouping Control */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">Agrupar por:</span>
            <div className="flex bg-white border border-gray-100 p-1 rounded-2xl shadow-sm overflow-x-auto hide-scrollbar flex-nowrap w-full">
              {[
                { id: "day", label: "Dia" },
                { id: "week", label: "Semana" },
                { id: "month", label: "Mês" },
                { id: "year", label: "Ano" },
                { id: "account", label: "Conta" },
                { id: "category", label: "Categoria" },
                { id: "type", label: "Tipo" }
              ].map(group => (
                <button
                  key={group.id}
                  onClick={() => setGroupBy(group.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap",
                    groupBy === group.id ? "bg-white text-slate-900" : "text-gray-400 hover:text-slate-900"
                  )}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sorting Control */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ordenar por:</span>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="rounded-xl border border-gray-100 bg-white py-1.5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-sm"
            >
              <option value="date">Data do lançamento</option>
              <option value="value">Valor monetário</option>
              <option value="category">Ordem de categoria</option>
              <option value="account">Nome da conta</option>
              <option value="type">Tipo de movimentação</option>
              <option value="alphabetical">Ordem Alfabética</option>
            </select>
            <button 
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-8 w-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-slate-900 shadow-sm hover:bg-gray-50 cursor-pointer"
              title="Inverter Ordem"
            >
              <span className="text-[10px] font-bold uppercase">{sortOrder === "asc" ? "▲" : "▼"}</span>
            </button>
          </div>

        </div>

        {/* TRANSACTION LISTING (GROUPED AND PAGINATED FOR HIGH PERFORMANCE) */}
        <div className="space-y-8">
          
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
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Carregando Lançamentos...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-gray-100 rounded-[32px] p-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-4">
                <PlusCircle size={32} />
              </div>
              <h3 className="text-base font-black text-slate-900">Você ainda não possui registros.</h3>
              <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">
                Cadastre sua primeira receita, despesa ou transferência para começar a acompanhar seu fluxo de caixa.
              </p>
              <button
                onClick={() => {
                  setIsAdding(true);
                  setAddingType(mode === "income" ? "income" : mode === "expenses" ? "expense" : mode === "transfers" ? "transfer" : null);
                }}
                className="mt-6 px-6 py-3 bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:scale-105 transition-all cursor-pointer"
              >
                Adicionar Lançamento
              </button>
            </div>
          ) : groupsToRender.length > 0 ? (
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden mb-6">
              {groupsToRender.map(({ groupKey, group, itemsToRender }) => {
                
                if (itemsToRender.length === 0) return null;

                return (
                  <div key={groupKey} className="relative">
                    
                    {/* Sticky Group Header with sub-total calculation */}
                    <div className="sticky top-0 z-10 backdrop-blur-xl bg-gray-50/90 py-2 px-4 flex items-center justify-between border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                          {groupKey}
                        </h3>
                      </div>

                      {/* Subtotals widgets per group */}
                      <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                        {group.subtotals.income > 0 && (
                          <span className="text-emerald-600">
                            +{formatCurrency(group.subtotals.income)}
                          </span>
                        )}
                        {group.subtotals.expense > 0 && (
                          <span className="text-gray-600">
                            -{formatCurrency(group.subtotals.expense)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* List grid */}
                    <div className="flex flex-col">
                      {itemsToRender.map((t, index) => (
                        <TransactionItem 
                          key={t.id}
                          transaction={t}
                          index={index}
                          accounts={accounts}
                          cards={cards}
                          filterAccount={filterAccount}
                          onSelect={() => setSelectedTransaction(t)}
                          onViewHistory={() => setHistoryTransactionId(t.id)}
                          isReconciliationMode={isReconMode}
                          isSelected={selectedTxIds.has(t.id)}
                          onToggleSelect={() => {
                            const newSelected = new Set(selectedTxIds);
                            if (newSelected.has(t.id)) {
                              newSelected.delete(t.id);
                            } else {
                              newSelected.add(t.id);
                            }
                            setSelectedTxIds(newSelected);
                          }}
                        />
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-gray-100 rounded-[32px]">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
                <Search size={32} />
              </div>
              <h3 className="text-base font-black text-slate-900">Nenhum lançamento encontrado</h3>
              <p className="text-xs text-gray-400 max-w-xs mt-1 leading-relaxed">
                Nenhum lançamento corresponde aos filtros selecionados. Tente ajustar os parâmetros.
              </p>
            </div>
          )}

          {/* Lazy Loading load-more button */}
          {totalPossibleRendered > itemsLimit && (
            <div className="flex flex-col items-center gap-2 pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Mostrando {itemsLimit} de {totalPossibleRendered} Lançamentos
              </p>
              <button
                onClick={() => setItemsLimit(prev => prev + 25)}
                className="px-6 py-3 bg-white border border-gray-200 hover:border-primary-dark text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                Carregar mais registros
              </button>
            </div>
          )}

        </div>

      </div>

      {/* POPUPS AND MODAL MANAGEMENT */}
      <AnimatePresence>
        
        {/* Attachment scanning trigger */}
        {isScanning && (
          <ReceiptScanner 
            onClose={() => setIsScanning(false)} 
            accounts={accounts}
            cards={cards}
            categories={categories}
          />
        )}

        {/* Bank Statement File Importer */}
        {isImporting && (
          <StatementImporter 
            onClose={() => setIsImporting(false)} 
            accounts={accounts} 
            cards={cards}
            categories={categories}
          />
        )}

        {/* Quick adding transaction picker */}
        {isAdding && !addingType && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              className="w-full max-w-lg rounded-t-[40px] bg-white p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Novo Lançamento</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 text-gray-400"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setAddingType("income")} 
                  className="flex items-center justify-between p-5 rounded-[24px] border border-gray-100 hover:border-emerald-300 bg-white shadow-sm transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp size={20} /></div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-none">Receita / Entrada</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">Salários, lucros, investimentos</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>

                <button 
                  onClick={() => setAddingType("expense")} 
                  className="flex items-center justify-between p-5 rounded-[24px] border border-gray-100 hover:border-rose-300 bg-white shadow-sm transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><TrendingDown size={20} /></div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-none">Despesa / Saída</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">Alimentação, contas, lazer</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>

                <button 
                  onClick={() => setAddingType("transfer")} 
                  className="flex items-center justify-between p-5 rounded-[24px] border border-gray-100 hover:border-blue-300 bg-white shadow-sm transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Repeat size={20} /></div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-none">Transferência Interna</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">Entre suas próprias contas</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              </div>

              <button 
                onClick={() => setIsAdding(false)}
                className="w-full mt-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        )}

        {/* Specialized Forms rendering */}
        {isAdding && (addingType === "transfer" || (mode === "transfers" && !addingType)) && (
          <TransferForm 
            onClose={() => { setIsAdding(false); setAddingType(null); setQuickTransferData(null); }} 
            accounts={accounts} 
            quickData={quickTransferData}
            mostrarMensagem={mostrarMensagem}
          />
        )}
        {isAdding && addingType === "income" && (
          <IncomeForm 
            onClose={() => { setIsAdding(false); setAddingType(null); }} 
            accounts={accounts} 
            categories={categories}
            subCategories={subCategories}
            tags={tags}
            transactions={transactions}
          />
        )}
        {isAdding && addingType === "expense" && (
          <ExpenseForm 
            onClose={() => { setIsAdding(false); setAddingType(null); }} 
            accounts={accounts} 
            cards={cards} 
            categories={categories}
            subCategories={subCategories}
            tags={tags}
            transactions={transactions}
          />
        )}

        {editingTransaction && (
          editingTransaction.type === "income" ? (
            <IncomeForm 
              onClose={() => setEditingTransaction(null)} 
              accounts={accounts} 
              categories={categories}
              subCategories={subCategories}
              tags={tags}
              transactions={transactions}
              initialData={editingTransaction} 
            />
          ) : editingTransaction.type === "expense" ? (
            <ExpenseForm 
              onClose={() => setEditingTransaction(null)} 
              accounts={accounts} 
              cards={cards} 
              categories={categories}
              subCategories={subCategories}
              tags={tags}
              transactions={transactions}
              initialData={editingTransaction} 
            />
          ) : (
            <TransferForm 
              onClose={() => setEditingTransaction(null)} 
              accounts={accounts} 
              initialData={editingTransaction} 
              mostrarMensagem={mostrarMensagem} 
            />
          )
        )}

        {/* Advanced details modal */}
        {selectedTransaction && (
          <TransactionDetails 
            transaction={selectedTransaction} 
            onClose={() => setSelectedTransaction(null)}
            onEdit={() => {
              setEditingTransaction(selectedTransaction);
              setSelectedTransaction(null);
            }}
            onDuplicate={() => {
              handleDuplicate(selectedTransaction);
              setSelectedTransaction(null);
            }}
            accounts={accounts}
            cards={cards}
            mostrarMensagem={mostrarMensagem}
          />
        )}

        {/* Audit / Timeline History Modal */}
        {historyTransactionId && (
          <TransactionHistoryModal 
            transactionId={historyTransactionId} 
            onClose={() => setHistoryTransactionId(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
