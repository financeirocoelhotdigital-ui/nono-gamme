import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Transaction, Account, Emotion, Category, SubCategory, Tag as TagType } from "../types";
import { auth, db } from "../lib/firebase";
import { doc, runTransaction } from "firebase/firestore";
import { formatCurrency, cn, cleanData, formatDate, parseLocalDate, formatDateForInput } from "../lib/utils";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { transacoes } from "../modules/transacoesModule";
import { useTransacoes } from "../context/TransacoesContext";
import { useContas } from "../context/ContasContext";
import { useCategorias } from "../context/CategoriasContext";
import { addCategory, addSubCategory } from "../services/categoryService";
import { 
  Plus, 
  Search, 
  TrendingUp, 
  Brain, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Wallet, 
  ArrowRight, 
  Tag, 
  MessageSquare, 
  User, 
  Clock,
  Filter,
  Download,
  Trash2,
  Edit2,
  Copy,
  Repeat,
  X,
  History,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TransactionHistoryModal } from "./TransactionHistoryModal";
import { StatementImporter } from "./StatementImporter";

const getCategoryEmoji = (iconName: string): string => {
  const emojiMap: Record<string, string> = {
    Utensils: "🍽️",
    Home: "🏠",
    Car: "🚗",
    HeartPulse: "❤️",
    GraduationCap: "🎓",
    Gamepad2: "🎮",
    ShoppingBag: "🛍️",
    CreditCard: "💳",
    Banknote: "💵",
    FileText: "📝",
    MoreHorizontal: "📁",
    Briefcase: "💼",
    Laptop: "💻",
    Tag: "🏷️",
    TrendingUp: "📈",
    Percent: "🎟️",
    Key: "🔑",
    Coffee: "☕",
    Smartphone: "📱",
    Plane: "✈️",
    Gift: "🎁",
    Music: "🎵",
    Camera: "📷",
    Dumbbell: "🏋️"
  };
  return emojiMap[iconName] || "📁";
};

interface IncomeProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  subCategories: SubCategory[];
  tags: TagType[];
}

export function Income() {
  const { transactions } = useTransacoes();
  const { accounts } = useContas();
  const { categories, subCategories, tags, addCategory: contextAddCategory, addSubCategory: contextAddSubCategory } = useCategorias();

  const [searchParams, setSearchParams] = useSearchParams();
  const autoAdd = searchParams.get("add") === "income";
  const [isAdding, setIsAdding] = useState(autoAdd);

  React.useEffect(() => {
    if (searchParams.get("add") === "income") {
      setIsAdding(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("add");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  React.useEffect(() => {
    (window as any).abrirModalReceita = () => {
      setIsAdding(true);
    };
    return () => {
      delete (window as any).abrirModalReceita;
    };
  }, []);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [historyTransactionId, setHistoryTransactionId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<"day" | "week" | "month" | "all">("month");
  const [showFilters, setShowFilters] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const incomeTransactions = transactions
    .filter(t => t.type === "income")
    .filter(t => {
      const matchesSearch = 
        t.category.toLowerCase().includes(filter.toLowerCase()) || 
        (t.notes?.toLowerCase().includes(filter.toLowerCase())) ||
        (t.incomeSource?.toLowerCase().includes(filter.toLowerCase())) ||
        t.value.toString().includes(filter);

      const tDate = parseLocalDate(t.date);
      const now = new Date();
      let matchesPeriod = true;
      if (!tDate) {
        matchesPeriod = false;
      } else if (filterPeriod === "day") {
        matchesPeriod = tDate.toDateString() === now.toDateString();
      } else if (filterPeriod === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesPeriod = tDate >= weekAgo;
      } else if (filterPeriod === "month") {
        matchesPeriod = tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      }

      return matchesSearch && matchesPeriod;
    })
    .sort((a, b) => (parseLocalDate(b.date)?.getTime() || 0) - (parseLocalDate(a.date)?.getTime() || 0));

  const totalIncome = incomeTransactions.reduce((acc, t) => acc + t.value, 0);
  const fixedIncome = incomeTransactions.filter(t => t.fixed).reduce((acc, t) => acc + t.value, 0);
  const variableIncome = incomeTransactions.filter(t => !t.fixed).reduce((acc, t) => acc + t.value, 0);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">
            Minhas Receitas
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {incomeTransactions.length} Entradas Identificadas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsImporting(true)}
            className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-white border-2 border-emerald-100 text-emerald-500 shadow-xl shadow-emerald-500/5 active:scale-90 transition-all duration-300"
            title="Importar Extrato"
          >
            <FileText size={24} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-emerald-500 text-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] shadow-emerald-500/30 active:scale-90 transition-all duration-300"
          >
            <Plus size={28} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* AI Analysis */}
      <IncomeAnalysis transactions={transactions} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[32px] bg-emerald-600 p-6 text-white shadow-xl shadow-emerald-600/20">
          <div className="flex items-center gap-2 text-emerald-100 mb-1">
            <TrendingUp size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Total Recebido</span>
          </div>
          <div className="text-3xl font-black tracking-tighter">
            {formatCurrency(totalIncome)}
          </div>
          <p className="text-[10px] text-emerald-100/60 font-bold uppercase mt-2">No período selecionado</p>
        </div>

        <div className="rounded-[32px] bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Repeat size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Renda Fixa</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tighter">
            {formatCurrency(fixedIncome)}
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full" 
              style={{ width: `${(fixedIncome / (totalIncome || 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-[32px] bg-white border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Sparkles size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Renda Variável</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tighter">
            {formatCurrency(variableIncome)}
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full" 
              style={{ width: `${(variableIncome / (totalIncome || 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar receita..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-2xl border-none bg-gray-100/80 py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
        <select 
          value={filterPeriod} 
          onChange={(e: any) => setFilterPeriod(e.target.value)}
          className="rounded-2xl border-none bg-gray-100 py-3.5 px-4 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="day">Hoje</option>
          <option value="week">7 dias</option>
          <option value="month">Mês</option>
          <option value="all">Tudo</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {incomeTransactions.map((t, index) => (
          <IncomeItem 
            key={t.id} 
            transaction={t} 
            index={index} 
            accounts={accounts}
            onEdit={() => setEditingTransaction(t)}
            onSelect={() => setSelectedTransaction(t)}
            onViewHistory={() => setHistoryTransactionId(t.id)}
          />
        ))}

        {incomeTransactions.length === 0 && (
          <div className="py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-300 mb-4">
              <TrendingUp size={32} />
            </div>
            <p className="text-sm font-bold text-gray-500">Nenhuma receita encontrada</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAdding && (
          <IncomeForm 
            onClose={() => setIsAdding(false)} 
            accounts={accounts} 
            categories={categories}
            subCategories={subCategories}
            tags={tags}
            transactions={transactions}
          />
        )}
        {editingTransaction && (
          <IncomeForm 
            onClose={() => setEditingTransaction(null)} 
            accounts={accounts} 
            categories={categories}
            subCategories={subCategories}
            tags={tags}
            transactions={transactions}
            initialData={editingTransaction} 
          />
        )}
        {selectedTransaction && (
          <IncomeDetails 
            transaction={selectedTransaction} 
            onClose={() => setSelectedTransaction(null)}
            onEdit={() => {
              setEditingTransaction(selectedTransaction);
              setSelectedTransaction(null);
            }}
            accounts={accounts}
            categories={categories}
            subCategories={subCategories}
            tags={tags}
          />
        )}
        {historyTransactionId && (
          <TransactionHistoryModal 
            transactionId={historyTransactionId} 
            onClose={() => setHistoryTransactionId(null)} 
          />
        )}
        {isImporting && (
          <StatementImporter 
            onClose={() => setIsImporting(false)}
            accounts={accounts}
            cards={[]} // Income usually goes to accounts
            categories={categories}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function IncomeItem({ 
  transaction: t, 
  index, 
  accounts, 
  onEdit, 
  onSelect,
  onViewHistory
}: { 
  transaction: Transaction, 
  index: number, 
  accounts: Account[], 
  onEdit: () => void, 
  onSelect: () => void,
  onViewHistory: () => void
}) {
  const account = accounts.find(a => a.id === t.accountId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onSelect}
      className="group relative overflow-hidden rounded-[32px] bg-white border border-gray-100 p-4 active:scale-[0.98] transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110 duration-500"
          )}>
            <TrendingUp size={24} strokeWidth={2.5} />
          </div>
          
          <div>
            <h4 className="text-sm font-black text-slate-900 tracking-tight">
              {t.incomeSource || t.category}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {t.category}
              </span>
              <span className="h-1 w-1 rounded-full bg-gray-200" />
              <span className="text-[10px] font-bold text-gray-400">
                {formatDate(t.date)}
              </span>
              {t.fixed && (
                <>
                  <span className="h-1 w-1 rounded-full bg-emerald-200" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Recorrente</span>
                </>
              )}
              {t.hasHistory && (
                <>
                  <span className="h-1 w-1 rounded-full bg-blue-400" />
                  <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Alterado</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-lg font-black tracking-tighter text-emerald-600">
              +{formatCurrency(t.value)}
            </div>
            <div className="text-[8px] font-black uppercase tracking-widest text-gray-400 mt-0.5">
              {account?.name || "Conta não informada"}
            </div>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onViewHistory();
            }}
            className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-emerald-500 hover:text-white transition-all active:scale-90"
            title="Ver Histórico"
          >
            <History size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function IncomeAnalysis({ transactions }: { transactions: Transaction[] }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const { analyzeIncomeStability } = await import("../services/geminiService");
      const result = await analyzeIncomeStability(transactions);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[32px] bg-emerald-50 p-6 border border-emerald-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-900">IA: Análise de Estabilidade</h3>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Inteligência Financeira</p>
          </div>
        </div>
        {!analysis && (
          <button 
            onClick={handleAnalyze}
            disabled={loading}
            className="text-[10px] font-black uppercase bg-emerald-600 text-white px-4 py-2 rounded-xl active:scale-95 transition-transform shadow-lg shadow-emerald-600/20"
          >
            {loading ? "Analisando..." : "Gerar Diagnóstico"}
          </button>
        )}
      </div>
      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-emerald-100">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Tendência de Renda</span>
              <span className="text-xs font-black text-emerald-900">{analysis.trend}</span>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Score de Estabilidade</span>
              <div className="text-lg font-black text-emerald-700">{analysis.score}/100</div>
            </div>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed font-medium">"{analysis.analysis}"</p>
          <div className="flex flex-wrap gap-2">
            {analysis.recommendations.map((r: string, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] bg-white text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100 font-bold">
                <Sparkles size={10} className="text-emerald-500" />
                {r}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function IncomeForm({ 
  onClose, 
  accounts, 
  categories, 
  subCategories, 
  tags, 
  transactions,
  initialData 
}: { 
  onClose: () => void, 
  accounts: Account[], 
  categories: Category[],
  subCategories: SubCategory[],
  tags: TagType[],
  transactions: Transaction[],
  initialData?: Transaction 
}) {
  const { addCategory: contextAddCategory, addSubCategory: contextAddSubCategory } = useCategorias();
  const [value, setValue] = useState(initialData?.value.toString() || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || "");
  const [incomeSource, setIncomeSource] = useState(initialData?.incomeSource || "");
  const [incomeType, setIncomeType] = useState<"fixa" | "variavel">(initialData?.incomeType as any || "fixa");
  const [date, setDate] = useState(formatDateForInput(initialData?.date));
  const [accountId, setAccountId] = useState(initialData?.accountId || "");
  const [fixed, setFixed] = useState(initialData?.fixed || false);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);
  const [fiscalType, setFiscalType] = useState<string>(initialData?.fiscalType || "tributavel");
  const [fiscalCategory, setFiscalCategory] = useState<string>(initialData?.fiscalCategory || "salario");
  const [tagInput, setTagInput] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showInlineAddSubCategory, setShowInlineAddSubCategory] = useState(false);
  const [newSubCategoryName, setNewSubCategoryName] = useState("");

  const handleInlineAddCategory = async () => {
    const catName = newCategoryName.trim();
    if (!catName) return;

    setCategory(catName);
    setNewCategoryName("");
    setShowInlineAddCategory(false);

    const uid = auth.currentUser?.uid || "default_user";
    try {
      await contextAddCategory({
        userId: uid,
        name: catName,
        type: "income",
        icon: "MoreHorizontal",
        color: "#10B981"
      });
    } catch (error) {
      console.warn("Aviso ao salvar nova categoria no banco (mantida localmente):", error);
    }
  };

  const incomeCategories = categories.filter(c => c.type === "income");
  const currentCategory = incomeCategories.find(c => c.name === category);
  const relevantSubCategories = subCategories.filter(s => s.parentCategoryId === currentCategory?.id);

  const handleInlineAddSubCategory = async () => {
    const subCatName = newSubCategoryName.trim();
    if (!subCatName) return;

    setSubCategory(subCatName);
    setNewSubCategoryName("");
    setShowInlineAddSubCategory(false);

    const uid = auth.currentUser?.uid || "default_user";
    try {
      await contextAddSubCategory({
        userId: uid,
        name: subCatName,
        parentCategoryId: currentCategory?.id || ""
      });
    } catch (error) {
      console.warn("Aviso ao salvar nova subcategoria no banco (mantida localmente):", error);
    }
  };

  const handleSuggest = async () => {
    if (!notes && !incomeSource) return;
    setIsSuggesting(true);
    try {
      const { suggestCategoryAndTags } = await import("../services/geminiService");
      const suggestion = await suggestCategoryAndTags(
        {
          type: "income",
          value: parseFloat(value) || 0,
          description: notes || incomeSource,
          incomeSource,
          date
        },
        incomeCategories,
        tags,
        transactions
      );

      if (suggestion.category) setCategory(suggestion.category);
      if (suggestion.subCategory) setSubCategory(suggestion.subCategory);
      if (suggestion.tags) {
        const uniqueTags = Array.from(new Set([...selectedTags, ...suggestion.tags]));
        setSelectedTags(uniqueTags);
      }
    } catch (error) {
      console.error("Erro ao sugerir:", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!selectedTags.includes(tagInput.trim())) {
        setSelectedTags([...selectedTags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) {
      ((window as any).mostrarMensagem || window.alert)("Por favor, preencha o valor da transação.");
      return;
    }

    let activeCategory = category;
    if (showInlineAddCategory && newCategoryName.trim()) {
      activeCategory = newCategoryName.trim();
      setCategory(activeCategory);
      setShowInlineAddCategory(false);
      const uid = auth.currentUser?.uid || "default_user";
      addCategory({
        userId: uid,
        name: activeCategory,
        type: "income",
        icon: "MoreHorizontal",
        color: "#10B981"
      }).catch(err => console.warn("Erro ao salvar categoria no banco:", err));
      setNewCategoryName("");
    }

    let activeSubCategory = subCategory;
    if (showInlineAddSubCategory && newSubCategoryName.trim()) {
      activeSubCategory = newSubCategoryName.trim();
      setSubCategory(activeSubCategory);
      setShowInlineAddSubCategory(false);
      const uid = auth.currentUser?.uid || "default_user";
      addSubCategory({
        userId: uid,
        name: activeSubCategory,
        parentCategoryId: currentCategory?.id || ""
      }).catch(err => console.warn("Erro ao salvar subcategoria no banco:", err));
      setNewSubCategoryName("");
    }

    if (!activeCategory) {
      ((window as any).mostrarMensagem || window.alert)("Por favor, selecione uma categoria.");
      return;
    }
    if (!accountId) {
      ((window as any).mostrarMensagem || window.alert)("Por favor, selecione uma conta.");
      return;
    }

    const val = parseFloat(value);
    try {
      const matchedCategory = incomeCategories.find(c => c.name === activeCategory);
      const transactionData: any = {
        type: "income",
        value: val,
        category: activeCategory,
        categoryId: matchedCategory?.id || currentCategory?.id || "",
        subCategory: activeSubCategory,
        incomeSource,
        incomeType,
        date: formatDateForInput(date) + "T12:00:00.000Z",
        notes,
        accountId,
        fixed,
        tags: selectedTags,
        fiscalType,
        fiscalCategory,
        fiscalYear: parseLocalDate(date)?.getFullYear() || new Date().getFullYear(),
        emotion: "feliz",
        reconciled: false,
        createdAt: initialData?.createdAt || new Date().toISOString()
      };

      if (initialData) {
        await transacoes.atualizarTransacao(initialData.id, transactionData, initialData);
      } else {
        await transacoes.registrarTransacao(transactionData);
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "transactions/income");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        className="w-full max-w-lg lg:max-w-2xl rounded-t-[40px] md:rounded-[40px] bg-white p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-xl font-bold">{initialData ? "Editar Receita" : "Nova Receita"}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 p-2"><Plus className="rotate-45" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Valor da Entrada</label>
              {(incomeSource || notes) && (
                <button 
                  type="button"
                  onClick={handleSuggest}
                  disabled={isSuggesting}
                  className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <Brain size={12} />
                  {isSuggesting ? "Sugerindo..." : "Sugerir com IA"}
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-600">R$</span>
              <input
                type="number"
                step="0.01"
                required
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full rounded-2xl border-none bg-emerald-50/50 py-4 pl-12 pr-4 text-2xl font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Fonte de Renda</label>
              <input
                type="text"
                required
                value={incomeSource}
                onChange={e => setIncomeSource(e.target.value)}
                className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Ex: Salário, Freelance"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Data do Recebimento</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`space-y-1 ${showInlineAddCategory ? 'col-span-2' : ''}`}>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoria</label>
              {showInlineAddCategory ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nome..."
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleInlineAddCategory(); } }}
                    className="flex-1 min-w-0 rounded-xl border-none bg-gray-50 py-3 px-3 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleInlineAddCategory}
                    disabled={!newCategoryName.trim()}
                    className="px-3 shrink-0 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInlineAddCategory(false);
                      setNewCategoryName("");
                      setCategory("");
                    }}
                    className="px-2 shrink-0 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                  >
                    X
                  </button>
                </div>
              ) : (
                <select
                  required
                  value={category}
                  onChange={e => {
                    if (e.target.value === "ADD_NEW") {
                      setShowInlineAddCategory(true);
                    } else {
                      setCategory(e.target.value);
                      setSubCategory("");
                    }
                  }}
                  className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Selecionar...</option>
                  {incomeCategories.map(c => (
                    <option key={c.id} value={c.name}>{getCategoryEmoji(c.icon)} {c.name}</option>
                  ))}
                  {category && !incomeCategories.some(c => c.name === category) && (
                    <option value={category}>📁 {category}</option>
                  )}
                  <option value="ADD_NEW" className="text-emerald-600 font-bold font-black">+ Nova Categoria...</option>
                </select>
              )}
            </div>
            <div className={`space-y-1 ${showInlineAddSubCategory ? 'col-span-2' : ''}`}>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Subcategoria</label>
              {showInlineAddSubCategory ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nome da subcategoria..."
                    value={newSubCategoryName}
                    onChange={e => setNewSubCategoryName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleInlineAddSubCategory(); } }}
                    className="flex-1 min-w-0 rounded-xl border-none bg-gray-50 py-3 px-3 text-sm focus:ring-2 focus:ring-emerald-500/20"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleInlineAddSubCategory}
                    disabled={!newSubCategoryName.trim()}
                    className="px-3 shrink-0 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInlineAddSubCategory(false);
                      setNewSubCategoryName("");
                      setSubCategory("");
                    }}
                    className="px-2 shrink-0 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                  >
                    X
                  </button>
                </div>
              ) : (
                <select
                  value={subCategory}
                  onChange={e => {
                    if (e.target.value === "ADD_NEW_SUB") {
                      setShowInlineAddSubCategory(true);
                    } else {
                      setSubCategory(e.target.value);
                    }
                  }}
                  disabled={!category}
                  className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                >
                  <option value="">Nenhuma</option>
                  {relevantSubCategories.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                  {subCategory && !relevantSubCategories.some(s => s.name === subCategory) && (
                    <option value={subCategory}>📂 {subCategory}</option>
                  )}
                  <option value="ADD_NEW_SUB" className="text-emerald-600 font-bold font-black">+ Nova Subcategoria...</option>
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/50 p-4 cursor-pointer hover:bg-emerald-50 transition-colors">
            <input type="checkbox" id="fixed-income" checked={fixed} onChange={e => setFixed(e.target.checked)} className="h-5 w-5 rounded-lg border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
            <label htmlFor="fixed-income" className="flex flex-col cursor-pointer">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Renda Recorrente</span>
              <span className="text-[10px] text-emerald-600/70">Marque se este valor entra todo mês</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo de Renda</label>
              <select
                value={incomeType}
                onChange={e => setIncomeType(e.target.value as any)}
                className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="fixa">Fixa</option>
                <option value="variavel">Variável</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Conta de Destino</label>
              <select
                required
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Selecionar conta...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo Fiscal</label>
              <select
                value={fiscalType}
                onChange={e => setFiscalType(e.target.value)}
                className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="tributavel">Tributável</option>
                <option value="isento">Isento</option>
                <option value="nao_tributavel">Não Tributável</option>
                <option value="dedutivel">Dedutível</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoria Fiscal</label>
              <select
                value={fiscalCategory}
                onChange={e => setFiscalCategory(e.target.value)}
                className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="salario">Salário</option>
                <option value="renda_extra">Renda Extra</option>
                <option value="aluguel">Aluguel</option>
                <option value="investimentos">Investimentos</option>
                <option value="pensao">Pensão</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-100">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-emerald-900">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Pressione Enter para adicionar tags"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Notas e Comprovantes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Alguma observação sobre esta receita?"
              rows={2}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-xl shadow-emerald-600/10 active:scale-95 transition-transform"
          >
            {initialData ? "Atualizar Receita" : "Confirmar Receita"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function IncomeDetails({ 
  transaction: t, 
  onClose, 
  onEdit, 
  accounts,
  categories,
  subCategories,
  tags
}: { 
  transaction: Transaction, 
  onClose: () => void, 
  onEdit: () => void, 
  accounts: Account[],
  categories: Category[],
  subCategories: SubCategory[],
  tags: TagType[]
}) {
  const account = accounts.find(a => a.id === t.accountId);
  const category = categories.find(c => c.name === t.category);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = () => {
    ((window as any).mostrarMensagem || window.alert)("Excluir clicado");
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await transacoes.deletarTransacao(t);
      onClose();
    } catch (error) {
      console.error("Erro ao deletar transação:", error);
      ((window as any).mostrarMensagem || window.alert)("Erro ao excluir receita");
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden relative" 
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4 text-rose-500">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Deseja excluir esta receita?</h3>
            <p className="text-sm font-medium text-gray-500 mb-6">Esta ação removerá permanentemente o registro e recalculará os saldos.</p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-colors"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-rose-600 transition-colors flex justify-center items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-white/60 backdrop-blur-md px-4 pb-8">
      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        className="w-full max-w-lg rounded-[48px] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden relative" 
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-32 bg-emerald-500 opacity-10" />

        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="h-1.5 w-12 rounded-full bg-gray-200" />
          </div>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <TrendingUp size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
                  {t.incomeSource || t.category}
                </h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.category}</p>
              </div>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 active:scale-90 transition-transform">
              <Plus className="rotate-45" size={20} />
            </button>
          </div>

          <div className="text-center mb-10">
            <div className="text-5xl font-black tracking-tighter mb-1 text-emerald-600">
              +{formatCurrency(t.value)}
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Calendar size={14} />
              <span className="text-xs font-bold uppercase tracking-widest">
                {formatDate(t.date)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Wallet size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Conta de Destino</span>
              </div>
              <div className="text-xs font-black text-slate-900">{account?.name || "Não informado"}</div>
            </div>
            <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Repeat size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Recorrência</span>
              </div>
              <div className="text-xs font-black text-slate-900 uppercase">
                {t.fixed ? "Recorrente" : "Única"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Filter size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Categoria</span>
              </div>
              <div className="text-xs font-black text-slate-900">{t.category}</div>
            </div>
            <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <ChevronDown size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Subcategoria</span>
              </div>
              <div className="text-xs font-black text-slate-900">{t.subCategory || "Nenhuma"}</div>
            </div>
          </div>

          {t.tags && t.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2 px-4">
                <Tag size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2 px-4">
                {t.tags.map(tag => (
                  <span key={tag} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-100">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {t.notes && (
            <div className="mb-10 p-5 rounded-3xl bg-emerald-50 border border-emerald-100 relative">
              <MessageSquare size={16} className="absolute -top-2 -left-2 text-emerald-500 bg-white rounded-full p-0.5" />
              <p className="text-xs text-emerald-800 font-medium leading-relaxed italic">"{t.notes}"</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <button onClick={handleDeleteClick} className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-rose-50 text-rose-600 active:scale-95 transition-transform">
              <Trash2 size={20} />
              <span className="text-[9px] font-black uppercase tracking-widest">Excluir</span>
            </button>
            <button onClick={onEdit} className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-gray-100 text-gray-600 active:scale-95 transition-transform">
              <Edit2 size={20} />
              <span className="text-[9px] font-black uppercase tracking-widest">Editar</span>
            </button>
            <button onClick={onClose} className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl bg-emerald-500 text-white active:scale-95 transition-transform shadow-lg shadow-emerald-500/20">
              <ArrowRight size={20} />
              <span className="text-[9px] font-black uppercase tracking-widest">Fechar</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
