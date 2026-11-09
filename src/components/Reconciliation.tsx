import React, { useState, useMemo } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  History, 
  RefreshCw, 
  ArrowRight, 
  Search, 
  Filter,
  Calendar,
  AlertCircle,
  Info,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useContas } from "../context/ContasContext";
import { useTransacoes } from "../context/TransacoesContext";
import { cn, formatCurrency } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { conciliarConta } from "../lib/reconciliation";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";

export function Reconciliation() {
  const { accounts, reconcileAccount, adjustAccountBalance, reconciliationHistory } = useContas();
  const { transactions } = useTransacoes();
  const [searchParams] = useSearchParams();
  const urlAccountId = searchParams.get("accountId");
  
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(urlAccountId);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);
  const [notes, setNotes] = useState("");

  React.useEffect(() => {
    if (urlAccountId) {
      setSelectedAccountId(urlAccountId);
      setReconciliationResult(null);
    }
  }, [urlAccountId]);

  const selectedAccount = useMemo(() => 
    accounts.find(a => a.id === selectedAccountId), 
    [accounts, selectedAccountId]
  );

  const handleReconcile = async () => {
    if (!selectedAccount) return;
    setIsReconciling(true);
    
    // Simulate a bit of processing for UX
    setTimeout(async () => {
      const result = conciliarConta(selectedAccount, transactions);
      setReconciliationResult(result);
      setIsReconciling(false);
    }, 800);
  };

  const handleConfirmReconciliation = async () => {
    if (!selectedAccountId) return;
    await reconcileAccount(selectedAccountId, notes);
    setReconciliationResult(null);
    setNotes("");
    setSelectedAccountId(null);
  };

  const handleAdjust = async () => {
    if (!selectedAccountId || !reconciliationResult) return;
    await adjustAccountBalance(selectedAccountId, reconciliationResult.difference);
    await reconcileAccount(selectedAccountId, "Ajuste automático realizado");
    setReconciliationResult(null);
    setNotes("");
    setSelectedAccountId(null);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Conciliação Bancária</h1>
          <p className="text-gray-500 font-medium">Garanta que seu saldo no app seja idêntico ao saldo real.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Accounts List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Suas Contas</h2>
          {accounts.map(account => {
            const lastRec = account.lastReconciliation ? new Date(account.lastReconciliation) : null;
            const daysSinceRec = lastRec ? differenceInDays(new Date(), lastRec) : null;
            
            return (
              <button
                key={account.id}
                onClick={() => {
                  setSelectedAccountId(account.id);
                  setReconciliationResult(null);
                }}
                className={cn(
                  "w-full p-6 rounded-4xl text-left transition-all border-2",
                  selectedAccountId === account.id 
                    ? "bg-white text-slate-900 border-primary-dark shadow-[0_8px_30px_rgba(0,0,0,0.04)] shadow-primary-dark/20 scale-[1.02]" 
                    : "bg-white text-slate-900 border-gray-100 hover:border-gray-200 premium-shadow"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    selectedAccountId === account.id ? "bg-white/10" : "bg-gray-50"
                  )}>
                    <ShieldCheck className={cn(
                      selectedAccountId === account.id ? "text-emerald-600" : "text-gray-400"
                    )} size={24} />
                  </div>
                  {daysSinceRec !== null && daysSinceRec > 7 && (
                    <div className="bg-primary-orange/20 text-primary-orange px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Necessita Conciliação
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-black tracking-tight mb-1">{account.name}</h3>
                <p className={cn(
                  "text-2xl font-black mb-4",
                  selectedAccountId === account.id ? "text-emerald-600" : "text-slate-900"
                )}>
                  {formatCurrency(account.balance)}
                </p>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-60">
                  <History size={12} />
                  {lastRec ? `Última: ${format(lastRec, "dd MMM", { locale: ptBR })}` : "Nunca conciliada"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Reconciliation Area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {!selectedAccountId ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full min-h-[400px] bg-gray-50 rounded-5xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <Search className="text-gray-300" size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Selecione uma conta</h3>
                <p className="text-gray-400 max-w-xs mx-auto">Escolha uma conta ao lado para iniciar o processo de conciliação inteligente.</p>
              </motion.div>
            ) : reconciliationResult ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 rounded-5xl premium-shadow border border-gray-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Resultado da Análise</h2>
                  <div className={cn(
                    "px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2",
                    reconciliationResult.isBalanced ? "bg-primary-green/10 text-primary-green" : "bg-primary-red/10 text-primary-red"
                  )}>
                    {reconciliationResult.isBalanced ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {reconciliationResult.isBalanced ? "Conciliado" : "Divergência"}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-6 bg-gray-50 rounded-3xl">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Saldo no App</p>
                    <p className="text-2xl font-black text-slate-900">{formatCurrency(reconciliationResult.storedBalance)}</p>
                  </div>
                  <div className="p-6 bg-gray-50 rounded-3xl">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Saldo Calculado</p>
                    <p className="text-2xl font-black text-slate-900">{formatCurrency(reconciliationResult.calculatedBalance)}</p>
                  </div>
                </div>

                {reconciliationResult.difference !== 0 && (
                  <div className={cn(
                    "p-6 rounded-3xl mb-8 flex items-center justify-between",
                    reconciliationResult.difference > 0 ? "bg-primary-green/5" : "bg-primary-red/5"
                  )}>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Diferença Encontrada</p>
                      <p className={cn(
                        "text-3xl font-black",
                        reconciliationResult.difference > 0 ? "text-primary-green" : "text-primary-red"
                      )}>
                        {reconciliationResult.difference > 0 ? "+" : ""}{formatCurrency(reconciliationResult.difference)}
                      </p>
                    </div>
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      reconciliationResult.difference > 0 ? "bg-primary-green/10 text-primary-green" : "bg-primary-red/10 text-primary-red"
                    )}>
                      {reconciliationResult.difference > 0 ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                    </div>
                  </div>
                )}

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4 p-5 bg-white/5 rounded-3xl border border-primary-dark/5">
                    <Info className="text-slate-900 mt-1 shrink-0" size={20} />
                    <p className="text-sm font-medium text-slate-900 leading-relaxed">
                      {reconciliationResult.explanation}
                    </p>
                  </div>
                  
                  {reconciliationResult.possibleErrors.map((error: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-xs font-bold text-primary-orange bg-primary-orange/5 p-4 rounded-2xl">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Adicionar observações (opcional)..."
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-lime font-medium text-sm resize-none h-24"
                  />
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => setReconciliationResult(null)}
                      className="flex-1 p-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Refazer Análise
                    </button>
                    {reconciliationResult.isBalanced ? (
                      <button
                        onClick={handleConfirmReconciliation}
                        className="flex-1 p-4 bg-primary-green text-white rounded-2xl font-bold shadow-xl shadow-primary-green/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={20} />
                        Confirmar Conciliação
                      </button>
                    ) : (
                      <button
                        onClick={handleAdjust}
                        className="flex-1 p-4 bg-white text-slate-900 rounded-2xl font-bold shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={20} />
                        Gerar Ajuste e Conciliar
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-12 rounded-5xl premium-shadow border border-gray-100 text-center"
              >
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <RefreshCw className={cn("text-emerald-600", isReconciling && "animate-spin")} size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
                  Conciliar {selectedAccount?.name}
                </h2>
                <p className="text-gray-500 mb-12 max-w-md mx-auto leading-relaxed font-medium">
                  O sistema irá recalcular todo o seu histórico de transações para verificar se o saldo atual está correto.
                </p>
                
                <button
                  onClick={handleReconcile}
                  disabled={isReconciling}
                  className="bg-white text-slate-900 px-12 py-5 rounded-3xl font-bold text-lg shadow-[0_8px_30px_rgba(0,0,0,0.04)] shadow-primary-dark/20 hover:scale-105 transition-transform flex items-center gap-3 mx-auto disabled:opacity-50"
                >
                  {isReconciling ? "Analisando Transações..." : "Iniciar Conciliação Inteligente"}
                  {!isReconciling && <ChevronRight size={24} />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* History */}
      <div className="bg-white p-8 rounded-5xl premium-shadow border border-gray-100">
        <div className="flex items-center gap-3 mb-8">
          <History className="text-emerald-600" size={24} />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Histórico de Conciliações</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-50">
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Conta</th>
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Diferença</th>
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reconciliationHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 font-medium italic">
                    Nenhuma conciliação registrada ainda.
                  </td>
                </tr>
              ) : (
                reconciliationHistory.map(history => {
                  const account = accounts.find(a => a.id === history.accountId);
                  return (
                    <tr key={history.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4">
                        <p className="text-sm font-black text-slate-900">
                          {format(new Date(history.date), "dd/MM/yyyy")}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {format(new Date(history.date), "HH:mm")}
                        </p>
                      </td>
                      <td className="py-4">
                        <span className="text-sm font-bold text-gray-600">{account?.name || "Conta removida"}</span>
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "text-sm font-black",
                          history.difference === 0 ? "text-gray-400" :
                          history.difference > 0 ? "text-primary-green" : "text-primary-red"
                        )}>
                          {history.difference === 0 ? "—" : formatCurrency(history.difference)}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          history.status === "success" ? "bg-primary-green/10 text-primary-green" :
                          history.status === "adjusted" ? "bg-white/10 text-slate-900" :
                          "bg-primary-red/10 text-primary-red"
                        )}>
                          {history.status === "success" ? "Sucesso" :
                           history.status === "adjusted" ? "Ajustado" : "Divergente"}
                        </div>
                      </td>
                      <td className="py-4">
                        <p className="text-xs text-gray-500 max-w-xs truncate">{history.notes || "—"}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
