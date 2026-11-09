import React, { useState } from "react";
import { Transaction, UserProfile, Account } from "../types";
import { useFormat } from "../hooks/useFormat";
import { cn } from "../lib/utils";
import { TrendingUp, TrendingDown, Edit2, Trash2, Filter, Search, ChevronLeft, ChevronRight, Download, Plus, Repeat } from "lucide-react";
import { transacoes as transacoesMod } from "../modules/transacoesModule";
import { motion, AnimatePresence } from "framer-motion";

interface TransactionTableDesktopProps {
  transactions: Transaction[];
  userProfile: UserProfile;
  onEdit: (t: Transaction) => void;
  onAdd: () => void;
  accounts?: Account[];
  mode?: "income" | "expenses" | "statement" | "transfers" | "categories";
  filterAccount?: string;
}

export function TransactionTableDesktop({ transactions, userProfile, onEdit, onAdd, accounts, mode, filterAccount }: TransactionTableDesktopProps) {
  const { formatCurrency, formatDate } = useFormat(userProfile);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleDelete = async (t: Transaction) => {
    if (window.confirm("Tem certeza que deseja excluir esta transação?")) {
      await transacoesMod.deletarTransacao(t);
    }
  };

  const filteredTransactions = transactions
    .filter(t => {
      const displayTitle = t.title || t.establishment || t.incomeSource || "";
      const category = t.category || "";
      const search = searchTerm.toLowerCase();
      const matchesSearch = displayTitle.toLowerCase().includes(search) || 
                           category.toLowerCase().includes(search);
      
      if (mode === "transfers") {
        return matchesSearch && t.type === "transfer";
      }

      const matchesType = filterType === "all" || t.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Table Header / Toolbar */}
      <div className="p-6 border-b border-gray-50 flex flex-col lg:flex-row items-center justify-between bg-white sticky top-0 z-10 gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 flex-1 w-full">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar transações..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary-lime/30 outline-none transition-all text-xs font-bold"
            />
          </div>
          {mode === "transfers" ? (
            <div className="flex bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 text-blue-700 items-center gap-2">
              <Repeat size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Apenas Transferências</span>
            </div>
          ) : (
            <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100 w-full md:w-auto">
              <button 
                onClick={() => setFilterType("all")}
                className={cn(
                  "flex-1 md:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filterType === "all" ? "bg-white text-slate-900 shadow-sm" : "text-gray-400 hover:text-slate-900"
                )}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterType("income")}
                className={cn(
                  "flex-1 md:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filterType === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-emerald-600"
                )}
              >
                Receitas
              </button>
              <button 
                onClick={() => setFilterType("expense")}
                className={cn(
                  "flex-1 md:flex-none px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filterType === "expense" ? "bg-white text-rose-600 shadow-sm" : "text-gray-400 hover:text-rose-600"
                )}
              >
                Despesas
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-50 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95">
            <Download size={16} />
            Exportar
          </button>
          <button 
            onClick={onAdd}
            className={cn(
              "flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg",
              mode === "transfers" 
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/10" 
                : "bg-white text-slate-900 hover:brightness-110 shadow-primary-dark/10"
            )}
          >
            {mode === "transfers" ? <Repeat size={16} strokeWidth={2.5} /> : <Plus size={16} />}
            {mode === "transfers" ? "Nova Transferência" : "Nova Transação"}
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/30 sticky top-0 z-10 backdrop-blur-md">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Data</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Descrição</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Categoria</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Status</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100">Valor</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <AnimatePresence mode="popLayout">
              {currentTransactions.map((t) => (
                <motion.tr 
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-gray-400">{formatDate(t.date)}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110",
                        t.type === "income" ? "bg-emerald-50 text-emerald-600" : 
                        t.type === "transfer" ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {t.type === "income" ? <TrendingUp size={18} /> : 
                         t.type === "transfer" ? <Repeat size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 tracking-tight">
                          {t.type === "transfer" ? (t.notes || "Transferência") : t.title || t.establishment || t.incomeSource || t.category}
                        </span>
                        {t.type === "transfer" && accounts && (
                          <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                            {(() => {
                              const fromAcc = accounts.find(a => a.id === t.accountId);
                              const toAcc = accounts.find(a => a.id === t.toAccountId);
                              return `${fromAcc?.name || "Conta origem"} ➔ ${toAcc?.name || "Conta destino"}`;
                            })()}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    {t.reconciled ? (
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full shadow-sm bg-emerald-500" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Conciliado
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">
                        -
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    {(() => {
                      const isSent = filterAccount && filterAccount !== "all" && t.accountId === filterAccount;
                      const isReceived = filterAccount && filterAccount !== "all" && t.toAccountId === filterAccount;
                      return (
                        <span className={cn(
                          "text-sm font-black tracking-tight",
                          t.type === "income" ? "text-emerald-600" : 
                          t.type === "transfer" ? (isSent ? "text-rose-600" : isReceived ? "text-emerald-600" : "text-blue-600") : "text-rose-600"
                        )}>
                          {t.type === "income" ? "+" : t.type === "transfer" ? (isSent ? "-" : isReceived ? "+" : "") : "-"}{formatCurrency(t.value)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={() => onEdit(t)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100 text-gray-400 hover:text-slate-900 hover:border-primary-dark transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(t)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100 text-gray-400 hover:text-rose-600 hover:border-rose-600 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        
        {currentTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-200 mb-4">
              <Search size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nenhuma transação encontrada</h3>
            <p className="text-sm text-gray-400 max-w-xs">Tente ajustar seus filtros ou pesquisar por outro termo.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-[#F4F7F6]/30">
          <p className="text-xs font-bold text-gray-400">
            Mostrando <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> de <span className="text-slate-900">{filteredTransactions.length}</span> transações
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-xs font-bold transition-all",
                    currentPage === page ? "bg-white text-slate-900 shadow-lg shadow-primary-dark/20" : "bg-white text-gray-400 border border-gray-200 hover:border-primary-dark hover:text-slate-900"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
