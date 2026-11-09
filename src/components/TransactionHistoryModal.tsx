import React, { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { TransactionHistory } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, History, X, ChevronDown, ChevronUp, Plus, Edit2, Trash2, RefreshCcw } from "lucide-react";
import { formatCurrency, cn } from "../lib/utils";

interface TransactionHistoryModalProps {
  transactionId: string;
  onClose: () => void;
}

export function TransactionHistoryModal({ transactionId, onClose }: TransactionHistoryModalProps) {
  const [history, setHistory] = useState<TransactionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, "transactionHistory"),
      where("transactionId", "==", transactionId),
      where("userId", "==", uid),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as TransactionHistory[];
      setHistory(historyData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "transactionHistory");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [transactionId]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created": return <Plus size={16} className="text-emerald-500" />;
      case "edited": return <Edit2 size={16} className="text-blue-500" />;
      case "deleted": return <Trash2 size={16} className="text-rose-500" />;
      case "restored": return <RefreshCcw size={16} className="text-emerald-500" />;
      default: return <History size={16} className="text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "created": return "Criada";
      case "edited": return "Editada";
      case "deleted": return "Excluída";
      case "restored": return "Restaurada";
      default: return action;
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-8">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg rounded-[40px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Histórico de Alterações</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rastreabilidade da Transação</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 active:scale-90 transition-transform">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="h-8 w-8 border-4 border-primary-lime border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Carregando histórico...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-300">
                <Clock size={32} />
              </div>
              <p className="text-sm font-bold text-gray-500">Nenhum registro encontrado</p>
            </div>
          ) : (
            history.map((item, index) => (
              <div key={item.id} className="relative pl-8">
                {/* Timeline Line */}
                {index !== history.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-[-16px] w-0.5 bg-gray-100" />
                )}
                
                {/* Timeline Dot */}
                <div className="absolute left-0 top-1 h-8 w-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center z-10">
                  {getActionIcon(item.action)}
                </div>

                <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      {getActionLabel(item.action)}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {new Date(item.date).toLocaleString("pt-BR", {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium mb-2">{item.description}</p>

                  {item.changes && item.changes.length > 0 && (
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {expandedId === item.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {expandedId === item.id ? "Ocultar detalhes" : `Ver ${item.changes.length} alterações`}
                    </button>
                  )}

                  <AnimatePresence>
                    {expandedId === item.id && item.changes && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-3 space-y-2"
                      >
                        {item.changes.map((change, i) => (
                          <div key={i} className="p-3 rounded-xl bg-white border border-gray-100 text-[10px]">
                            <div className="font-black text-gray-400 uppercase tracking-widest mb-1">{change.field}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-rose-500 line-through opacity-60">
                                {typeof change.oldValue === 'number' ? formatCurrency(change.oldValue) : String(change.oldValue || 'N/A')}
                              </span>
                              <ArrowRight size={10} className="text-gray-300" />
                              <span className="text-emerald-600 font-bold">
                                {typeof change.newValue === 'number' ? formatCurrency(change.newValue) : String(change.newValue || 'N/A')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-xs active:scale-95 transition-transform shadow-lg shadow-emerald-500/20"
        >
          Entendido
        </button>
      </motion.div>
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
