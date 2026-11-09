import React, { useState } from "react";
import { TransactionHistory, TransactionType } from "../types";
import { formatCurrency, cn } from "../lib/utils";
import { useHistorico } from "../context/HistoricoContext";
import { 
  History, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Repeat, 
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function GlobalHistory() {
  const { history, loading } = useHistorico();
  const [filterAction, setFilterAction] = useState<TransactionHistory["action"] | "all">("all");
  const [filterModule, setFilterModule] = useState<TransactionHistory["module"] | "all">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHistory = history.filter(h => {
    const matchesAction = filterAction === "all" || h.action === filterAction;
    const matchesModule = filterModule === "all" || h.module === filterModule;
    const matchesSearch = h.description.toLowerCase().includes(search.toLowerCase()) ||
                         h.transactionId.toLowerCase().includes(search.toLowerCase());
    return matchesAction && matchesModule && matchesSearch;
  });

  const getActionIcon = (action: TransactionHistory["action"]) => {
    switch (action) {
      case "created": return <Plus size={14} className="text-emerald-500" />;
      case "edited": return <Edit2 size={14} className="text-blue-500" />;
      case "deleted": return <Trash2 size={14} className="text-rose-500" />;
      case "restored": return <RefreshCw size={14} className="text-amber-500" />;
      default: return <History size={14} />;
    }
  };

  const getActionLabel = (action: TransactionHistory["action"]) => {
    switch (action) {
      case "created": return "Criado";
      case "edited": return "Editado";
      case "deleted": return "Excluído";
      case "restored": return "Restaurado";
      default: return action;
    }
  };

  const getModuleIcon = (module: TransactionHistory["module"]) => {
    switch (module) {
      case "income": return <TrendingUp size={14} />;
      case "expense": return <TrendingDown size={14} />;
      case "transfer": return <Repeat size={14} />;
      default: return <History size={14} />;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">
            Histórico Global
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {filteredHistory.length} Registros de Alteração
            </p>
          </div>
        </div>
        <div className="h-14 w-14 rounded-[24px] bg-blue-500/10 text-blue-600 flex items-center justify-center">
          <History size={28} strokeWidth={3} />
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar no histórico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border-none bg-gray-100/80 py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <select 
            value={filterAction} 
            onChange={(e: any) => setFilterAction(e.target.value)}
            className="rounded-xl border-none bg-gray-100 py-2 px-4 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todas Ações</option>
            <option value="created">Criações</option>
            <option value="edited">Edições</option>
            <option value="deleted">Exclusões</option>
            <option value="restored">Restaurações</option>
          </select>

          <select 
            value={filterModule} 
            onChange={(e: any) => setFilterModule(e.target.value)}
            className="rounded-xl border-none bg-gray-100 py-2 px-4 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Todos Módulos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
            <option value="transfer">Transferências</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-300 mb-4">
              <AlertCircle size={32} />
            </div>
            <p className="text-sm font-bold text-gray-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          filteredHistory.map((h, index) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="rounded-[32px] bg-white border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <div 
                onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                className="p-4 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center",
                      h.action === "created" ? "bg-emerald-50 text-emerald-600" :
                      h.action === "edited" ? "bg-blue-50 text-blue-600" :
                      h.action === "deleted" ? "bg-rose-50 text-rose-600" :
                      "bg-amber-50 text-amber-600"
                    )}>
                      {getActionIcon(h.action)}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                        {h.description}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                          {getModuleIcon(h.module)}
                          <span>{h.module === "income" ? "Receita" : h.module === "expense" ? "Despesa" : "Transferência"}</span>
                        </div>
                        <span className="h-1 w-1 rounded-full bg-gray-200" />
                        <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                          <Clock size={10} />
                          <span>{new Date(h.date).toLocaleString("pt-BR")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-300">
                    {expandedId === h.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === h.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-50 bg-gray-50/30"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-gray-400 mb-2">
                        <span>Detalhes da Alteração</span>
                        <span>ID: {h.transactionId.slice(0, 8)}...</span>
                      </div>
                      
                      {h.changes && h.changes.length > 0 ? (
                        <div className="space-y-2">
                          {h.changes.map((change, i) => (
                            <div key={i} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
                                  {change.description || change.field}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px]">
                                <div className="flex-1 p-1.5 rounded-lg bg-rose-50 text-rose-600 line-through truncate">
                                  {String(change.oldValue || "-")}
                                </div>
                                <ArrowRight size={12} className="text-gray-300" />
                                <div className="flex-1 p-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold truncate">
                                  {String(change.newValue || "-")}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 italic text-center py-2">
                          Nenhuma alteração de campo registrada.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function ArrowRight({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
