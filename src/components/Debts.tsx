import React, { useState, useEffect, useMemo } from "react";
import { Debt, Installment, DebtStatus, DebtPriority, DebtType, InterestType, UserProfile } from "../types";
import { useContas } from "../context/ContasContext";
import { formatCurrency, cn, formatDate, parseLocalDate, formatDateForInput, getDaysRemaining, getTimeSince, getMonthsRemaining, parseCurrencyInput } from "../lib/utils";
import { 
  AlertCircle, Plus, Trash2, CheckCircle, TrendingUp, Edit2, 
  Calendar, Clock, ShieldAlert, Info, ArrowRight, CreditCard, 
  Landmark, FileText, ChevronRight, Sparkles, Bell,
  Target, Zap, Brain, Filter, Search, X, Layers,
  ShieldCheck, DollarSign, BarChart3, ArrowUpRight, HelpCircle, RefreshCw, SlidersHorizontal, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { generateDebtPaymentStrategy } from "../services/geminiService";
import { useDebts } from "../context/DebtsContext";

export function Debts({ userProfile }: { userProfile: UserProfile }) {
  const { debts, installments, history, addDebt, payInstallment, updateDebt, deleteDebt, checkOverdue, simulatePrepayment, renegotiateDebt } = useDebts();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [payingInstallment, setPayingInstallment] = useState<Installment | null>(null);
  const [expandedDebt, setExpandedDebt] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("urgency");
  
  const [isStrategyLoading, setIsStrategyLoading] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const [showStrategy, setShowStrategy] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulatingDebt, setSimulatingDebt] = useState<Debt | null>(null);
  const [renegotiatingDebt, setRenegotiatingDebt] = useState<Debt | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  // Calculations
  const activeDebts = useMemo(() => debts.filter(d => d.status !== "quitada"), [debts]);
  const totalDebt = useMemo(() => activeDebts.reduce((acc, curr) => acc + curr.remainingValue, 0), [activeDebts]);
  const totalPaid = useMemo(() => debts.reduce((acc, curr) => acc + (curr.totalPaidValue || (curr.totalValue - curr.remainingValue)), 0), [debts]);
  const totalContracted = useMemo(() => debts.reduce((acc, curr) => acc + (curr.totalValue || curr.remainingValue), 0), [debts]);
  const totalOriginalPrincipal = useMemo(() => debts.reduce((acc, curr) => acc + (curr.originalValue || curr.totalValue), 0), [debts]);
  const totalInterestAccrued = useMemo(() => debts.reduce((acc, curr) => acc + (curr.interestAccrued || 0), 0), [debts]);
  const totalSavings = useMemo(() => debts.reduce((acc, curr) => acc + (curr.prepaymentSavings || 0), 0), [debts]);
  const overallProgress = useMemo(() => totalContracted > 0 ? Math.min(100, Math.max(0, (totalPaid / totalContracted) * 100)) : 0, [totalPaid, totalContracted]);

  const debtsByCreditor = useMemo(() => activeDebts.reduce((acc: any[], curr) => {
    const creditorName = curr.creditor || "Outros";
    const existing = acc.find(item => item.name === creditorName);
    if (existing) {
      existing.value += curr.remainingValue;
    } else {
      acc.push({ name: creditorName, value: curr.remainingValue });
    }
    return acc;
  }, []), [activeDebts]);

  const debtsByCategory = useMemo(() => activeDebts.reduce((acc: any[], curr) => {
    const catName = curr.category || "Outros";
    const existing = acc.find(item => item.name === catName);
    if (existing) {
      existing.value += curr.remainingValue;
    } else {
      acc.push({ name: catName, value: curr.remainingValue });
    }
    return acc;
  }, []), [activeDebts]);

  const progressData = useMemo(() => [
    { name: "Pago", valor: totalPaid },
    { name: "Restante", valor: totalDebt }
  ], [totalPaid, totalDebt]);

  const CHART_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#6366F1"];

  const filteredDebts = useMemo(() => {
    const map = new Map<string, Debt>();
    for (const d of debts) {
      if (d && d.id) map.set(d.id, d);
    }
    const uniqueDebts = Array.from(map.values());

    return uniqueDebts.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            d.creditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (d.category && d.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === "all" || d.status === filterStatus;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === "urgency") {
        return (b.urgencyScore || 0) - (a.urgencyScore || 0);
      }
      if (sortBy === "valueDesc") {
        return b.remainingValue - a.remainingValue;
      }
      if (sortBy === "valueAsc") {
        return a.remainingValue - b.remainingValue;
      }
      if (sortBy === "rateDesc") {
        return b.interestRate - a.interestRate;
      }
      if (sortBy === "dueDate") {
        const da = parseLocalDate(a.nextInstallmentDate || a.dueDate)?.getTime() || 0;
        const db = parseLocalDate(b.nextInstallmentDate || b.dueDate)?.getTime() || 0;
        return da - db;
      }
      return 0;
    });
  }, [debts, searchTerm, filterStatus, sortBy]);

  const handleGenerateStrategy = async () => {
    if (activeDebts.length === 0) return;
    setIsStrategyLoading(true);
    try {
      const result = await generateDebtPaymentStrategy(
        activeDebts,
        userProfile,
        userProfile?.onboardingData?.monthlyIncome || 0,
        userProfile?.onboardingData?.fixedExpenses || 0
      );
      setStrategy(result);
      setShowStrategy(true);
    } catch (error) {
      console.error("Error generating strategy:", error);
    } finally {
      setIsStrategyLoading(false);
    }
  };

  // Urgent alerts
  const alerts = useMemo(() => {
    const map = new Map<string, Debt>();
    for (const d of debts) {
      if (d && d.id) map.set(d.id, d);
    }
    const uniqueDebts = Array.from(map.values());

    return uniqueDebts.filter(d => {
      if (d.status === "quitada") return false;
      const debtInstallments = installments.filter(i => i.debtId === d.id);
      const hasOverdue = debtInstallments.some(i => i.status === "atrasada" || (getDaysRemaining(i.dueDate) < 0 && i.status === "pendente"));
      return hasOverdue || (d.urgencyScore || 0) > 80;
    });
  }, [debts, installments]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header & Strategic Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-4xl border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-emerald-50 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Zap size={12} className="fill-current" /> Gestão Proativa de Passivos
            </span>
            {activeDebts.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider">
                {activeDebts.length} {activeDebts.length === 1 ? 'dívida ativa' : 'dívidas ativas'}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Dívidas & Empréstimos
          </h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium">
            Acompanhe a quitação, simule antecipações com desconto e utilize a Inteligência Artificial para eliminar juros abusivos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button 
            onClick={() => checkOverdue()} 
            className="flex items-center gap-2 h-12 px-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors cursor-pointer"
            title="Verificar parcelas vencidas e recálculo de juros"
          >
            <RefreshCw size={16} /> Verificar Atrasos
          </button>

          <button 
            onClick={handleGenerateStrategy}
            disabled={isStrategyLoading || activeDebts.length === 0}
            className="flex items-center gap-2 h-12 px-5 rounded-2xl bg-white text-slate-900 font-bold text-xs uppercase tracking-wider hover:bg-white/90 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isStrategyLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-lime border-t-transparent rounded-full animate-spin" />
                <span>Analisando...</span>
              </>
            ) : (
              <>
                <Brain size={18} className="text-emerald-600" />
                <span>Estratégia IA</span>
              </>
            )}
          </button>

          <button 
            onClick={() => setIsAdding(true)} 
            className="flex items-center gap-2 h-12 px-5 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-wider hover:bg-red-700 shadow-lg shadow-red-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>Nova Dívida</span>
          </button>
        </div>
      </div>

      {/* Delete Feedback Message */}
      {deleteSuccessMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="text-emerald-500 shrink-0" size={20} />
            <span>{deleteSuccessMsg}</span>
          </div>
          <button onClick={() => setDeleteSuccessMsg(null)} className="text-emerald-600 hover:opacity-75">
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* Urgent Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-red-500 animate-bounce" />
              <h3 className="text-xs font-black uppercase tracking-widest text-red-600">
                Atenção Necessária ({alerts.length})
              </h3>
            </div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Prioridade Alta de Ação</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map(alert => {
              const debtInstallments = installments
                .filter(i => i.debtId === alert.id && i.status !== "paga")
                .sort((a, b) => (parseLocalDate(a.dueDate)?.getTime() || 0) - (parseLocalDate(b.dueDate)?.getTime() || 0));
              const nextInstallment = debtInstallments[0];
              const isOverdue = debtInstallments.some(i => i.status === "atrasada" || (getDaysRemaining(i.dueDate) < 0 && i.status === "pendente"));
              const daysLeft = nextInstallment ? getDaysRemaining(nextInstallment.dueDate) : 0;

              return (
                <div key={alert.id} className="rounded-3xl bg-white p-4 border border-red-100 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                      isOverdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    )}>
                      <AlertCircle size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{alert.name}</p>
                      <p className="text-[10px] text-gray-400 font-semibold truncate">{alert.creditor}</p>
                      <span className={cn(
                        "inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider",
                        isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                      )}>
                        {isOverdue ? "Parcela Atrasada" : `Vence em ${daysLeft} dias`}
                      </span>
                    </div>
                  </div>

                  {nextInstallment && (
                    <button
                      onClick={() => setPayingInstallment(nextInstallment)}
                      className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      Pagar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total em Aberto */}
        <div className="rounded-4xl bg-white text-slate-900 p-6 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
              <ShieldAlert size={14} /> Saldo Devedor Total
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-gray-300">
              {activeDebts.length} ativas
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900">{formatCurrency(totalDebt)}</div>
            <p className="text-[10px] text-gray-400 font-medium mt-1">Valor pendente para quitação total</p>
          </div>
        </div>

        {/* Total Pago */}
        <div className="rounded-4xl bg-emerald-50/80 border border-emerald-100 p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-600" /> Total Quitado
            </span>
            <span className="text-xs font-black text-emerald-700">{overallProgress.toFixed(1)}%</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-emerald-950">{formatCurrency(totalPaid)}</div>
            <div className="mt-2 h-1.5 w-full bg-emerald-200/60 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Juros Acumulados */}
        <div className="rounded-4xl bg-amber-50/80 border border-amber-100 p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={14} className="text-amber-600" /> Custo com Juros
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-200/50 text-[9px] font-bold text-amber-900">
              Acumulado
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-amber-950">{formatCurrency(totalInterestAccrued)}</div>
            <p className="text-[10px] text-amber-700/80 font-medium mt-1">Juros e encargos contratuais</p>
          </div>
        </div>

        {/* Economia em Amortização */}
        <div className="rounded-4xl bg-sky-50/80 border border-sky-100 p-6 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={14} className="text-sky-600" /> Economia Gerada
            </span>
            <span className="px-2 py-0.5 rounded-full bg-sky-200/50 text-[9px] font-bold text-sky-900">
              Descontos
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-sky-950">{formatCurrency(totalSavings)}</div>
            <p className="text-[10px] text-sky-700/80 font-medium mt-1">Valores poupados via antecipação</p>
          </div>
        </div>
      </div>

      {/* Analytics & Visualizations Toggle Drawer */}
      <div className="bg-white rounded-4xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-slate-900" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Análise Visual da Carteira de Passivos
            </h3>
          </div>
          <button 
            onClick={() => setShowCharts(!showCharts)} 
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <span>{showCharts ? "Recolher Gráficos" : "Exibir Estatísticas & Gráficos"}</span>
            {showCharts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <AnimatePresence>
          {showCharts && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-4 border-t border-gray-100"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pie Chart: Creditors */}
                <div className="p-4 rounded-3xl bg-gray-50/80 border border-gray-100 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 text-center">Por Credor</h4>
                  <div className="h-44 w-full">
                    {debtsByCreditor.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={debtsByCreditor}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {debtsByCreditor.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val) => formatCurrency(val as number)} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">Sem dívidas ativas</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center text-[10px] font-bold">
                    {debtsByCreditor.slice(0, 4).map((item, index) => (
                      <div key={item.name} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-100">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="text-gray-700 truncate max-w-[100px]">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pie Chart: Categories */}
                <div className="p-4 rounded-3xl bg-gray-50/80 border border-gray-100 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 text-center">Por Categoria</h4>
                  <div className="h-44 w-full">
                    {debtsByCategory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={debtsByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {debtsByCategory.map((entry, index) => (
                              <Cell key={`cat-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val) => formatCurrency(val as number)} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">Sem dívidas ativas</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center text-[10px] font-bold">
                    {debtsByCategory.slice(0, 4).map((item, index) => (
                      <div key={item.name} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-100">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[(index + 2) % CHART_COLORS.length] }} />
                        <span className="text-gray-700 truncate max-w-[100px]">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bar Chart: Progress */}
                <div className="p-4 rounded-3xl bg-gray-50/80 border border-gray-100 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 text-center">Visão Geral de Quitação</h4>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={progressData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#9CA3AF" />
                        <Tooltip formatter={(val) => formatCurrency(val as number)} />
                        <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                          <Cell fill="#10B981" />
                          <Cell fill="#EF4444" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center text-[11px] font-bold text-gray-600">
                    Sua taxa de quitação atual é <span className="text-emerald-600 font-extrabold">{overallProgress.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Toolbar (Search, Filter, Sort) */}
      <div className="bg-white rounded-3xl p-4 md:p-5 border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por dívida, credor ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-gray-50 text-xs font-bold text-slate-900 rounded-2xl border border-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-dark/10 transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl p-1 gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: "Todas" },
              { id: "ativa", label: "Ativas" },
              { id: "atrasada", label: "Atrasadas" },
              { id: "quitada", label: "Quitadas" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap",
                  filterStatus === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2 text-xs font-bold text-gray-700">
            <SlidersHorizontal size={14} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 border-none focus:ring-0 cursor-pointer pr-2"
            >
              <option value="urgency">Urgência (IA)</option>
              <option value="valueDesc">Maior Valor Restante</option>
              <option value="valueAsc">Menor Valor Restante</option>
              <option value="rateDesc">Maior Taxa de Juros %</option>
              <option value="dueDate">Vencimento Mais Próximo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Debt List Cards */}
      <div className="space-y-4">
        {filteredDebts.map(debt => {
          const debtInstallments = installments.filter(i => i.debtId === debt.id);
          const pendingInstallments = debtInstallments
            .filter(i => i.status !== "paga")
            .sort((a, b) => (parseLocalDate(a.dueDate)?.getTime() || 0) - (parseLocalDate(b.dueDate)?.getTime() || 0));
          const nextInstallment = pendingInstallments[0];
          const nextDueDate = nextInstallment ? nextInstallment.dueDate : (debt.nextInstallmentDate || debt.dueDate);
          const daysRemaining = getDaysRemaining(nextDueDate);
          const monthsRemaining = getMonthsRemaining(nextDueDate);
          const isOverdue = debtInstallments.some(i => i.status === "atrasada" || (getDaysRemaining(i.dueDate) < 0 && i.status === "pendente"));
          const progress = debt.totalValue > 0 ? Math.min(100, Math.max(0, ((debt.totalValue - debt.remainingValue) / debt.totalValue) * 100)) : 0;

          return (
            <motion.div 
              layout
              key={debt.id} 
              className={cn(
                "rounded-4xl border border-gray-100 p-6 md:p-8 bg-white shadow-sm transition-all relative overflow-hidden space-y-6 hover:shadow-md",
                debt.status === "quitada" && "bg-gray-50/70 border-gray-200 opacity-75"
              )}
            >
              {/* Priority & Urgency Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                    debt.status === "quitada" ? "bg-emerald-100 text-emerald-700" :
                    isOverdue ? "bg-red-100 text-red-600" : "bg-white text-slate-900"
                  )}>
                    {debt.status === "quitada" ? <CheckCircle size={24} /> :
                     debt.category === "Cartão de Crédito" ? <CreditCard size={24} /> :
                     debt.category === "Financiamento de Veículo" ? <Landmark size={24} /> :
                     <FileText size={24} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{debt.name}</h3>
                      
                      {/* Status Tag */}
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                        debt.status === "quitada" ? "bg-emerald-100 text-emerald-800" :
                        isOverdue ? "bg-red-100 text-red-700" :
                        debt.status === "em_negociacao" ? "bg-amber-100 text-amber-800" :
                        "bg-blue-100 text-blue-800"
                      )}>
                        {(debt.status || "ativa").replace("_", " ")}
                      </span>

                      {/* Category Tag */}
                      {debt.category && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-700 uppercase tracking-wider">
                          {debt.category}
                        </span>
                      )}

                      {/* Priority Tag */}
                      {debt.priority && (
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                          debt.priority === "urgente" ? "bg-red-600 text-white animate-pulse" :
                          debt.priority === "alta" ? "bg-red-100 text-red-700" :
                          debt.priority === "media" ? "bg-amber-100 text-amber-800" :
                          "bg-emerald-100 text-emerald-800"
                        )}>
                          Prioridade {debt.priority}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>Credor: <strong className="text-gray-700">{debt.creditor}</strong></span>
                      <span>•</span>
                      <span>Juros: <strong className="text-gray-700">{debt.interestRate}% a.m.</strong></span>
                      {debt.frequency && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{debt.frequency}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Urgency Score Indicator */}
                {debt.status !== "quitada" && (
                  <div className="flex items-center gap-2">
                    {(debt.urgencyScore || 0) > 80 && (
                      <span className="px-3 py-1 rounded-full bg-white text-emerald-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                        <Zap size={10} className="fill-current" /> Pague Primeiro
                      </span>
                    )}
                    <div className={cn(
                      "px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5",
                      (debt.urgencyScore || 0) > 80 ? "bg-red-50 text-red-600 border border-red-100" :
                      (debt.urgencyScore || 0) > 50 ? "bg-amber-50 text-amber-700 border border-amber-100" :
                      "bg-blue-50 text-blue-700 border border-blue-100"
                    )}>
                      <span className="text-[10px] uppercase tracking-wider font-bold opacity-75">Urgência IA</span>
                      <span className="text-sm">{debt.urgencyScore || 0}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Risk Alert (if any) */}
              {debt.riskLevel && debt.riskLevel !== "baixo" && debt.status !== "quitada" && (
                <div className={cn(
                  "p-3.5 rounded-2xl flex items-start gap-3 border text-xs",
                  debt.riskLevel === "critico" ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"
                )}>
                  <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold uppercase tracking-wider block mb-0.5">Alerta de Risco {debt.riskLevel}</span>
                    <p className="font-medium leading-relaxed">{debt.riskReason}</p>
                  </div>
                </div>
              )}

              {/* Main Financial Metrics Display */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/70 p-4 rounded-3xl border border-gray-100">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Valor Original</span>
                  <span className="text-sm font-extrabold text-gray-700 block">{formatCurrency(debt.originalValue || debt.totalValue)}</span>
                  <span className="text-[9px] font-semibold text-gray-400 block mt-0.5">Principal tomado</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Saldo Devedor</span>
                  <span className="text-base md:text-lg font-black text-slate-900 block">{formatCurrency(debt.remainingValue)}</span>
                  <span className="text-[9px] font-semibold text-gray-400 block mt-0.5">Restante p/ quitação</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Total c/ Encargos</span>
                  <span className="text-sm font-bold text-amber-700 block">{formatCurrency(debt.totalValue)}</span>
                  <span className="text-[9px] font-semibold text-amber-600/80 block mt-0.5">
                    {debt.totalValue > (debt.originalValue || debt.totalValue) 
                      ? `+${formatCurrency(debt.totalValue - (debt.originalValue || debt.totalValue))} juros`
                      : "Sem juros contratuais"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Próximo Vencimento</span>
                  <span className={cn("text-sm font-bold block", isOverdue ? "text-red-600" : "text-gray-800")}>
                    {debt.status === "quitada" ? "Quitada" : formatDate(nextDueDate)}
                  </span>
                  <span className="text-[9px] font-semibold text-gray-400 block mt-0.5">
                    {debt.status === "quitada" ? "100% Paga" : isOverdue ? "Vencida!" : `${daysRemaining} dias restantes`}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="text-gray-500 uppercase tracking-wider text-[10px]">Progresso de Quitação</span>
                  <span className="text-slate-900">{progress.toFixed(0)}% concluído</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      debt.status === "quitada" ? "bg-emerald-500" : "bg-primary-red"
                    )}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 pt-0.5">
                  <span>{debt.paidInstallments || 0} de {debt.totalInstallments || 1} parcelas quitadas</span>
                  <span>{getTimeSince(debt.startDate)} desde o início</span>
                </div>
              </div>

              {/* Quick Intelligence Action Buttons */}
              {debt.status !== "quitada" && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => { setSimulatingDebt(debt); setShowSimulation(true); }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-slate-900 text-xs font-black uppercase tracking-wider hover:bg-emerald-500/30 transition-colors cursor-pointer"
                    >
                      <Target size={14} /> Simular Antecipação
                    </button>

                    <button 
                      onClick={() => setRenegotiatingDebt(debt)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider hover:bg-amber-200 transition-colors cursor-pointer"
                    >
                      <TrendingUp size={14} /> Renegociar
                    </button>

                    {nextInstallment && (
                      <button 
                        onClick={() => setPayingInstallment(nextInstallment)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider hover:bg-emerald-200 transition-colors cursor-pointer"
                      >
                        <Plus size={14} /> Pagar Próxima
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingDebt(debt)}
                      className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                      title="Editar Dívida"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button 
                      onClick={() => {
                        setDeleteError(null);
                        setDeletingDebt(debt);
                      }} 
                      className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                      title="Excluir Dívida"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Expandable Schedule Accordion */}
              <div className="pt-2">
                <button 
                  onClick={() => setExpandedDebt(expandedDebt === debt.id ? null : debt.id)}
                  className="w-full flex items-center justify-between py-2 text-xs font-extrabold uppercase tracking-wider text-gray-500 hover:text-slate-900 transition-colors border-t border-gray-100 cursor-pointer"
                >
                  <span>Cronograma de Parcelas ({debtInstallments.length})</span>
                  <div className="flex items-center gap-1 text-slate-900">
                    <span>{expandedDebt === debt.id ? "Ocultar" : "Expandir"}</span>
                    <ChevronRight size={16} className={cn("transition-transform duration-200", expandedDebt === debt.id && "rotate-90")} />
                  </div>
                </button>

                <AnimatePresence>
                  {expandedDebt === debt.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pt-3 space-y-2"
                    >
                      {debtInstallments.sort((a, b) => a.installmentNumber - b.installmentNumber).map((inst) => {
                        const isPaid = inst.status === "paga";
                        const isInstOverdue = inst.status === "atrasada" || (getDaysRemaining(inst.dueDate) < 0 && inst.status === "pendente");

                        return (
                          <div key={inst.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs",
                                isPaid ? "bg-emerald-500 text-white" :
                                isInstOverdue ? "bg-red-500 text-white" : "bg-gray-200 text-gray-600"
                              )}>
                                {inst.installmentNumber}
                              </span>
                              <div>
                                <p className={cn("font-bold", isPaid ? "text-gray-400 line-through" : "text-slate-900")}>
                                  Parcela {inst.installmentNumber}
                                </p>
                                <p className="text-[10px] text-gray-400 font-semibold">
                                  Vencimento: {formatDate(inst.dueDate)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-slate-900">{formatCurrency(inst.value)}</span>
                              {isPaid ? (
                                <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">Pago</span>
                              ) : (
                                <button 
                                  onClick={() => setPayingInstallment(inst)}
                                  className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700 cursor-pointer"
                                >
                                  Pagar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}

        {debts.length === 0 ? (
          <div className="bg-white rounded-4xl p-12 text-center space-y-3 border border-gray-100 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Nenhuma Dívida Cadastrada</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Parabéns! Você não possui dívidas registradas no sistema. Caso contrate algum empréstimo ou parcelamento, adicione aqui para acompanhamento proativo.
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-slate-900 font-bold text-xs uppercase tracking-wider hover:bg-white/90 cursor-pointer mt-2"
            >
              <Plus size={16} /> Cadastrar Nova Dívida
            </button>
          </div>
        ) : filteredDebts.length === 0 ? (
          <div className="bg-white rounded-4xl p-12 text-center space-y-2 border border-gray-100">
            <p className="text-sm font-bold text-gray-500">Nenhuma dívida corresponde aos filtros ou busca.</p>
            <button onClick={() => { setSearchTerm(""); setFilterStatus("all"); }} className="text-xs font-black text-slate-900 underline cursor-pointer">
              Limpar Filtros
            </button>
          </div>
        ) : null}
      </div>

      {/* History Timeline */}
      {history.length > 0 && (
        <div className="bg-white rounded-4xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-gray-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
              Histórico de Eventos Recentes
            </h3>
          </div>

          <div className="space-y-2">
            {history.slice(0, 8).map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    event.action === "paid" ? "bg-emerald-100 text-emerald-700" :
                    event.action === "overdue" || event.action === "penalty_applied" ? "bg-red-100 text-red-600" :
                    "bg-gray-200 text-gray-600"
                  )}>
                    {event.action === "paid" ? <CheckCircle size={16} /> :
                     event.action === "penalty_applied" ? <ShieldAlert size={16} /> :
                     <Clock size={16} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{event.description}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">{formatDate(event.date)}</p>
                  </div>
                </div>

                {event.value && (
                  <span className={cn(
                    "font-black text-xs",
                    event.action === "paid" ? "text-emerald-600" : "text-red-600"
                  )}>
                    {event.action === "paid" ? "-" : "+"}{formatCurrency(event.value)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isAdding && <DebtForm onClose={() => setIsAdding(false)} userProfile={userProfile} />}
        {editingDebt && <DebtForm onClose={() => setEditingDebt(null)} initialData={editingDebt} userProfile={userProfile} />}
        {payingInstallment && <PaymentForm installment={payingInstallment} onClose={() => setPayingInstallment(null)} />}
        {showStrategy && <StrategyModal strategy={strategy} onClose={() => setShowStrategy(false)} />}
        {showSimulation && simulatingDebt && <SimulationModal debt={simulatingDebt} onClose={() => { setShowSimulation(false); setSimulatingDebt(null); }} />}
        {renegotiatingDebt && <RenegotiateModal debt={renegotiatingDebt} onClose={() => setRenegotiatingDebt(null)} userProfile={userProfile} />}
        {deletingDebt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-3 bg-red-100 rounded-2xl">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Excluir Dívida</h3>
                  <p className="text-xs text-gray-500 font-medium">Confirmação de exclusão permanente</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-2">
                <p className="text-sm font-bold text-gray-800">
                  Tem certeza que deseja excluir esta dívida?
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  A dívida <strong className="text-slate-900">"{deletingDebt.name}"</strong> ({deletingDebt.creditor}) e todas as suas parcelas associadas serão removidas permanentemente.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    if (!isDeleting) {
                      setDeletingDebt(null);
                      setDeleteError(null);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    setDeleteError(null);
                    try {
                      await deleteDebt(deletingDebt.id);
                      setIsDeleting(false);
                      setDeletingDebt(null);
                      setDeleteSuccessMsg("Dívida excluída com sucesso!");
                      setTimeout(() => setDeleteSuccessMsg(null), 4000);
                    } catch (err: any) {
                      setIsDeleting(false);
                      setDeleteError("Não foi possível excluir esta dívida. Tente novamente.");
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StrategyModal({ strategy, onClose }: { strategy: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-2xl rounded-4xl bg-white p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-md">
              <Brain size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Estratégia de Quitação Inteligente</h3>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-white px-2.5 py-0.5 rounded-full inline-block mt-1">Análise Gemini AI</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white text-slate-900 relative overflow-hidden space-y-2">
            <Sparkles size={40} className="absolute -top-4 -right-4 text-emerald-600 opacity-20 rotate-12" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">Método Recomendado</span>
            <h4 className="text-2xl font-black">{strategy.strategyName}</h4>
            <p className="text-xs text-gray-300 leading-relaxed font-medium">{strategy.explanation}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 block mb-1">Economia Estimada</span>
              <p className="text-xl font-black text-emerald-950">{formatCurrency(strategy.potentialSavings)}</p>
            </div>
            <div className="p-5 rounded-3xl bg-sky-50 border border-sky-100">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-800 block mb-1">Tempo Estimado</span>
              <p className="text-xl font-black text-sky-950">{strategy.estimatedTimeMonths} meses</p>
            </div>
          </div>

          {strategy.comparison && (
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase tracking-widest text-gray-400">Comparação de Métodos</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strategy.comparison.avalanche && (
                  <div className="p-5 rounded-3xl bg-amber-50/80 border border-amber-100 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                      <TrendingUp size={18} className="text-amber-600" />
                      <span>Método Avalanche</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">Foco nas dívidas com maiores taxas de juros para maximizar a economia financeira.</p>
                    <div className="text-xs font-black text-amber-950 pt-1">
                      Economia: {formatCurrency(strategy.comparison.avalanche.savings)} | {strategy.comparison.avalanche.timeMonths} meses
                    </div>
                  </div>
                )}

                {strategy.comparison.snowball && (
                  <div className="p-5 rounded-3xl bg-sky-50/80 border border-sky-100 space-y-2">
                    <div className="flex items-center gap-2 text-sky-900 font-extrabold text-sm">
                      <Target size={18} className="text-sky-600" />
                      <span>Bola de Neve</span>
                    </div>
                    <p className="text-xs text-sky-800 leading-relaxed">Foco nas dívidas de menor valor primeiro para vitórias psicológicas rápidas.</p>
                    <div className="text-xs font-black text-sky-950 pt-1">
                      Economia: {formatCurrency(strategy.comparison.snowball.savings)} | {strategy.comparison.snowball.timeMonths} meses
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h5 className="text-xs font-black uppercase tracking-widest text-gray-400">Plano de Ação Passo a Passo</h5>
            <div className="space-y-2">
              {strategy.steps?.map((step: string, i: number) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                  <span className="w-6 h-6 rounded-lg bg-white text-slate-900 font-black flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-gray-800 font-semibold leading-relaxed pt-0.5">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SimulationModal({ debt, onClose }: { debt: Debt, onClose: () => void }) {
  const [extraPayment, setExtraPayment] = useState("500");
  const { simulatePrepayment } = useDebts();
  
  const parsedExtra = parseCurrencyInput(extraPayment);
  const result = simulatePrepayment(debt.id, parsedExtra);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-lg rounded-4xl bg-white p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-slate-900 flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Simulador de Amortização</h3>
              <p className="text-xs text-gray-400 font-bold">{debt.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="p-5 rounded-3xl bg-emerald-500/15 border border-primary-lime/30 space-y-3">
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest block">Quanto você pretende amortizar hoje?</span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 font-black text-lg">R$</span>
              <input 
                type="text"
                inputMode="decimal"
                value={extraPayment} 
                onChange={e => setExtraPayment(e.target.value)}
                className="w-full rounded-2xl border-none bg-white py-3.5 pl-12 pr-4 text-xl font-black text-slate-900 shadow-sm focus:ring-2 focus:ring-primary-dark"
                placeholder="0,00"
              />
            </div>
            {parsedExtra > 0 && (
              <span className="text-[10px] font-bold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-lg block w-fit shadow-xs">
                Valor interpretado: {formatCurrency(parsedExtra)}
              </span>
            )}

            {/* Quick Presets */}
            <div className="flex gap-2 flex-wrap pt-1">
              {[100, 200, 500, 1000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setExtraPayment(amt.toString())}
                  className="px-3 py-1.5 bg-white text-slate-900 text-xs font-black rounded-xl border border-primary-lime hover:bg-emerald-500/30 transition-colors shadow-sm cursor-pointer"
                >
                  +{formatCurrency(amt)}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <input
                type="range"
                min="0"
                max={Math.ceil(debt.remainingValue)}
                step="50"
                value={Math.min(parsedExtra, debt.remainingValue)}
                onChange={e => setExtraPayment(e.target.value)}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary-dark"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white text-slate-900">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 block mb-1">Novo Custo Total</span>
              <p className="text-xl font-black">{formatCurrency(result.newTotalCost)}</p>
            </div>
            <div className="p-5 rounded-3xl bg-emerald-100 text-emerald-950">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800 block mb-1">Economia em Juros</span>
              <p className="text-xl font-black">{formatCurrency(result.savings)}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-800 block mb-0.5">Redução de Prazo</span>
              <p className="text-base font-black text-sky-950">~{result.monthsSaved} meses economizados</p>
            </div>
            <Clock size={24} className="text-sky-600" />
          </div>

          <button onClick={onClose} className="w-full rounded-2xl bg-white py-4 text-xs font-black text-slate-900 uppercase tracking-wider hover:bg-white/90 transition-colors cursor-pointer">
            Concluir Simulação
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PaymentForm({ installment, onClose }: { installment: Installment, onClose: () => void }) {
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [paymentValue, setPaymentValue] = useState(installment.value.toString());
  const [isProcessing, setIsProcessing] = useState(false);
  const { accounts } = useContas();
  const { payInstallment } = useDebts();

  const parsedPayment = parseCurrencyInput(paymentValue);
  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
  const isBalanceInsufficient = selectedAccount ? selectedAccount.balance < parsedPayment : false;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) {
      ((window as any).mostrarMensagem || window.alert)("Por favor, selecione uma conta para o pagamento.");
      return;
    }

    setIsProcessing(true);
    try {
      await payInstallment(installment.id, selectedAccountId, parsedPayment);
      onClose();
    } catch (error) {
      console.error("Error paying installment:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-lg rounded-t-4xl sm:rounded-4xl bg-white p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <h3 className="text-lg font-black text-slate-900">Pagar Parcela {installment.installmentNumber}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
          <div className="flex justify-between items-center text-sm font-black text-slate-900">
            <span>Valor da Parcela:</span>
            <span>{formatCurrency(installment.value)}</span>
          </div>
          <p className="text-[10px] text-gray-400 font-semibold">Vencimento: {formatDate(installment.dueDate)}</p>
        </div>
        
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Valor Efetivo do Pagamento</label>
            <input 
              type="text"
              inputMode="decimal"
              required 
              value={paymentValue} 
              onChange={e => setPaymentValue(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 px-4 text-sm font-bold text-slate-900"
              placeholder="0,00"
            />
            {parsedPayment > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 block">
                Confirmando: {formatCurrency(parsedPayment)}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Conta para Débito</label>
            <select 
              required 
              value={selectedAccountId} 
              onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 px-4 text-xs font-bold text-slate-900 cursor-pointer"
            >
              <option value="">Selecione uma conta...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} (Saldo: {formatCurrency(acc.balance)})</option>
              ))}
            </select>
          </div>

          {isBalanceInsufficient && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-xs font-bold text-red-600">
              <AlertCircle size={16} />
              <span>Saldo insuficiente na conta selecionada!</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isProcessing} 
            className="w-full rounded-2xl bg-emerald-600 py-4 font-black text-xs text-white uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? "Confirmando..." : "Confirmar Pagamento"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function RenegotiateModal({ debt, onClose, userProfile }: { debt: Debt, onClose: () => void, userProfile: UserProfile }) {
  const { renegotiateDebt } = useDebts();
  const [totalInstallments, setTotalInstallments] = useState("12");
  const [interestRate, setInterestRate] = useState(debt.interestRate.toString());
  const [discountValue, setDiscountValue] = useState("0");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(formatDateForInput(debt.nextInstallmentDate || debt.dueDate));
  const [isProcessing, setIsProcessing] = useState(false);

  const originalRemaining = debt.remainingValue;
  const discount = parseCurrencyInput(discountValue);
  const newRemainingValue = Math.max(0, originalRemaining - discount);
  const installmentsCount = Math.max(1, parseInt(totalInstallments) || 1);
  const [installmentValue, setInstallmentValue] = useState((newRemainingValue / installmentsCount).toFixed(2));

  useEffect(() => {
    setInstallmentValue((newRemainingValue / installmentsCount).toFixed(2));
  }, [discountValue, totalInstallments]);

  const handleRenegotiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await renegotiateDebt(
        debt.id,
        {
          totalInstallments: installmentsCount,
          interestRate: parseCurrencyInput(interestRate),
          installmentValue: parseCurrencyInput(installmentValue),
          dueDate,
          discountValue: discount,
          newRemainingValue,
          notes
        },
        userProfile
      );
      onClose();
    } catch (error) {
      console.error("Error renegotiating debt:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-lg rounded-4xl bg-white p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Renegociar Dívida</h3>
              <p className="text-xs text-gray-400 font-bold">{debt.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Financial Summary of the renegotiation */}
        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-xs">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Valor Original</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-extrabold text-gray-700">{formatCurrency(debt.originalValue || debt.totalValue)}</span>
              <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-gray-200 text-gray-700 uppercase">Fixo</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Saldo Devedor Atual</span>
            <span className="font-extrabold text-amber-700 block mt-0.5">{formatCurrency(debt.remainingValue)}</span>
          </div>
        </div>

        <form onSubmit={handleRenegotiate} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Desconto Negociado (R$)</label>
              <input 
                type="text"
                inputMode="decimal"
                value={discountValue} 
                onChange={e => setDiscountValue(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold text-slate-900"
                placeholder="0,00"
              />
              {discount > 0 && (
                <span className="text-[9px] font-bold text-emerald-700 block">Desc: {formatCurrency(discount)}</span>
              )}
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Novo Saldo Devedor</label>
              <div className="w-full rounded-2xl bg-emerald-50 border border-emerald-200 p-3 font-black text-emerald-950 text-sm">
                {formatCurrency(newRemainingValue)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Nº de Parcelas</label>
              <input 
                type="number" 
                required
                min="1"
                value={totalInstallments} 
                onChange={e => setTotalInstallments(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Nova Taxa de Juros %</label>
              <input 
                type="text" 
                inputMode="decimal"
                required
                value={interestRate} 
                onChange={e => setInterestRate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Valor da Parcela</label>
              <input 
                type="text"
                inputMode="decimal"
                required
                value={installmentValue} 
                onChange={e => setInstallmentValue(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-black text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">1º Vencimento</label>
              <input 
                type="date" 
                required
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Notas do Acordo</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 h-20 resize-none font-medium"
              placeholder="Ex: Acordo referente ao protocolo #12938210..."
            />
          </div>

          <button 
            type="submit" 
            disabled={isProcessing} 
            className="w-full rounded-2xl bg-amber-500 py-3.5 font-black text-xs text-white uppercase tracking-wider shadow-lg hover:bg-amber-600 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? "Confirmando..." : "Confirmar Renegociação"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function DebtForm({ onClose, initialData, userProfile }: { onClose: () => void, initialData?: Debt, userProfile: UserProfile }) {
  const { addDebt, updateDebt } = useDebts();
  const { accounts } = useContas();

  const [name, setName] = useState(initialData?.name || "");
  const [creditor, setCreditor] = useState(initialData?.creditor || "");
  const [type, setType] = useState<DebtType>(initialData?.type || "parcelada");
  const [totalInstallments, setTotalInstallments] = useState(initialData?.totalInstallments?.toString() || "12");

  const [originalValue, setOriginalValue] = useState(
    initialData?.originalValue ? initialData.originalValue.toString() : (initialData?.totalValue ? initialData.totalValue.toString() : "")
  );
  const [installmentValue, setInstallmentValue] = useState(
    initialData?.installmentValue ? initialData.installmentValue.toString() : ""
  );
  const [totalValue, setTotalValue] = useState(initialData?.totalValue?.toString() || "");

  const [interestRate, setInterestRate] = useState(initialData?.interestRate?.toString() || "0");
  const [interestType, setInterestType] = useState<InterestType>(initialData?.interestType || "simples");
  const [penaltyRate, setPenaltyRate] = useState(initialData?.penaltyRate?.toString() || "2");
  const [dailyInterestRate, setDailyInterestRate] = useState(initialData?.dailyInterestRate?.toString() || "0.033");

  const [startDate, setStartDate] = useState(formatDateForInput(initialData?.startDate));
  const [dueDate, setDueDate] = useState(formatDateForInput(initialData?.dueDate));
  const [category, setCategory] = useState(initialData?.category || "Outros");
  const [priority, setPriority] = useState<DebtPriority>(initialData?.priority || "media");
  const [frequency, setFrequency] = useState<"mensal" | "quinzenal" | "semanal" | "anual">(initialData?.frequency || "mensal");
  const [accountId, setAccountId] = useState(initialData?.accountId || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleOriginalValueChange = (val: string) => {
    setOriginalValue(val);
    const origNum = parseCurrencyInput(val);
    if (origNum > 0 && (!totalValue || parseCurrencyInput(totalValue) <= 0)) {
      setTotalValue(val);
      const count = parseInt(totalInstallments) || 1;
      if (type === "parcelada") {
        setInstallmentValue((origNum / count).toFixed(2));
      }
    }
  };

  const handleInstallmentValueChange = (val: string) => {
    setInstallmentValue(val);
    const instNum = parseCurrencyInput(val);
    const count = parseInt(totalInstallments) || 1;
    if (instNum > 0 && type === "parcelada") {
      const calculatedTotal = (instNum * count).toFixed(2);
      setTotalValue(calculatedTotal);
      if (!originalValue || parseCurrencyInput(originalValue) <= 0) {
        setOriginalValue(calculatedTotal);
      }
    }
  };

  const handleTotalValueChange = (val: string) => {
    setTotalValue(val);
    const totNum = parseCurrencyInput(val);
    const count = parseInt(totalInstallments) || 1;
    if (totNum > 0) {
      if (!originalValue || parseCurrencyInput(originalValue) <= 0) {
        setOriginalValue(val);
      }
      if (type === "parcelada") {
        setInstallmentValue((totNum / count).toFixed(2));
      }
    }
  };

  const handleInstallmentsCountChange = (val: string) => {
    setTotalInstallments(val);
    const count = Math.max(1, parseInt(val) || 1);
    const totNum = parseCurrencyInput(totalValue);
    if (totNum > 0 && type === "parcelada") {
      setInstallmentValue((totNum / count).toFixed(2));
    }
  };

  const parsedOrig = parseCurrencyInput(originalValue);
  const parsedTot = parseCurrencyInput(totalValue);
  const parsedInst = parseCurrencyInput(installmentValue);
  const embeddedInterest = parsedTot > parsedOrig && parsedOrig > 0 ? parsedTot - parsedOrig : 0;
  const embeddedInterestPercent = parsedOrig > 0 && embeddedInterest > 0 ? ((embeddedInterest / parsedOrig) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      ((window as any).mostrarMensagem || window.alert)("Por favor, preencha o nome da dívida.");
      return;
    }

    const tInst = Math.max(1, parseInt(totalInstallments) || 1);
    let instVal = parseCurrencyInput(installmentValue);
    let totVal = parseCurrencyInput(totalValue);
    const origVal = parseCurrencyInput(originalValue) || totVal;

    if (type === "parcelada") {
      if (totVal <= 0 && instVal > 0) {
        totVal = instVal * tInst;
      } else if (totVal > 0 && instVal <= 0) {
        instVal = totVal / tInst;
      }
    } else {
      instVal = totVal;
    }

    if (totVal <= 0 && origVal <= 0) {
      ((window as any).mostrarMensagem || window.alert)("Por favor, informe o valor total ou o valor original da dívida.");
      return;
    }

    const finalTotVal = totVal > 0 ? totVal : origVal;
    const finalOrigVal = origVal > 0 ? origVal : finalTotVal;

    setIsSaving(true);

    const debtData: any = {
      name: name.trim(),
      creditor: creditor.trim() || "Não especificado",
      originalValue: finalOrigVal,
      totalValue: finalTotVal,
      installmentValue: instVal > 0 ? instVal : (finalTotVal / tInst),
      interestRate: parseCurrencyInput(interestRate),
      interestType,
      type,
      startDate: formatDateForInput(startDate),
      dueDate: formatDateForInput(dueDate),
      totalInstallments: type === "parcelada" ? tInst : 1,
      penaltyRate: parseCurrencyInput(penaltyRate),
      dailyInterestRate: parseCurrencyInput(dailyInterestRate),
      status: initialData?.status || ("ativa" as DebtStatus),
      priority,
      category,
      frequency,
      accountId,
      notes: notes.trim(),
    };

    try {
      if (initialData) {
        await updateDebt(initialData.id, debtData, userProfile);
      } else {
        await addDebt(debtData, userProfile);
      }
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar dívida:", error);
      ((window as any).mostrarMensagem || window.alert)("Erro ao salvar dívida: " + (error?.message || "Ocorreu um erro ao salvar a dívida."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-xl rounded-4xl bg-white p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-black text-slate-900">{initialData ? "Editar Dívida" : "Cadastrar Nova Dívida"}</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Defina o valor original contratado e as condições de pagamento.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Nome da Dívida / Contrato</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold text-slate-900 text-sm focus:bg-white transition-colors" placeholder="Ex: Cartão de Crédito Nubank, Financiamento Carro" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Credor / Instituição</label>
              <input type="text" value={creditor} onChange={e => setCreditor(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold focus:bg-white transition-colors" placeholder="Ex: Banco Itaú, Bradesco..." />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Tipo de Contrato</label>
              <select value={type} onChange={e => setType(e.target.value as DebtType)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold text-slate-900 cursor-pointer">
                <option value="parcelada">Parcelada</option>
                <option value="unica">Pagamento Único</option>
              </select>
            </div>
          </div>

          {/* Section: Financial Values & Original Contract */}
          <div className="bg-gray-50/80 p-4 rounded-3xl border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-600" /> Valores do Contrato
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase">Aceita 5000 ou 5.000,00</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700 uppercase tracking-wider block text-[10px]">Valor Original (Principal)</label>
                </div>
                <input 
                  type="text" 
                  inputMode="decimal"
                  required
                  value={originalValue} 
                  onChange={e => handleOriginalValueChange(e.target.value)} 
                  className="w-full rounded-2xl border border-gray-200 bg-white p-3 font-black text-gray-800 text-sm focus:ring-2 focus:ring-primary-dark/20" 
                  placeholder="Ex: 5.000,00" 
                />
                {parsedOrig > 0 ? (
                  <div className="text-[10px] font-black text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-lg inline-block">
                    Total: {formatCurrency(parsedOrig)}
                  </div>
                ) : (
                  <span className="text-[9px] text-gray-500 leading-tight block">Principal tomado</span>
                )}
              </div>

              {type === "parcelada" && (
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 uppercase tracking-wider block text-[10px]">Valor da Parcela</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={installmentValue} 
                    onChange={e => handleInstallmentValueChange(e.target.value)} 
                    className="w-full rounded-2xl border border-gray-200 bg-white p-3 font-bold text-gray-800 text-sm focus:ring-2 focus:ring-primary-dark/20" 
                    placeholder="0,00" 
                  />
                  {parsedInst > 0 ? (
                    <div className="text-[10px] font-black text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-lg inline-block">
                      {formatCurrency(parsedInst)} / mês
                    </div>
                  ) : (
                    <span className="text-[9px] text-gray-500 leading-tight block">Mensalidade</span>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-gray-700 uppercase tracking-wider block text-[10px]">Total Contratado</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  required 
                  value={totalValue} 
                  onChange={e => handleTotalValueChange(e.target.value)} 
                  className="w-full rounded-2xl border border-gray-200 bg-white p-3 font-black text-slate-900 text-sm focus:ring-2 focus:ring-primary-dark/20" 
                  placeholder="Ex: 5.000,00" 
                />
                {parsedTot > 0 ? (
                  <div className="text-[10px] font-black text-slate-900 bg-gray-200/70 px-2 py-0.5 rounded-lg inline-block">
                    {formatCurrency(parsedTot)}
                  </div>
                ) : (
                  <span className="text-[9px] text-gray-500 leading-tight block">Total com juros</span>
                )}
              </div>
            </div>

            {type === "parcelada" && (
              <div className="space-y-1 pt-1">
                <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Número Total de Parcelas</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={totalInstallments} 
                  onChange={e => handleInstallmentsCountChange(e.target.value)} 
                  className="w-full rounded-2xl border border-gray-200 bg-white p-3 font-bold" 
                />
              </div>
            )}

            {/* Embedded Interest Feedback */}
            {embeddedInterest > 0 && (
              <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 flex items-center justify-between text-[11px] font-bold">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-amber-600 shrink-0" />
                  <span>Juros/Encargos Embutidos:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold">{formatCurrency(embeddedInterest)}</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-900 text-[10px] font-black">+{embeddedInterestPercent.toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Taxa de Juros Mensal %</label>
              <input type="text" inputMode="decimal" value={interestRate} onChange={e => setInterestRate(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold" placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold cursor-pointer">
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Empréstimo Pessoal">Empréstimo Pessoal</option>
                <option value="Financiamento Imobiliário">Financiamento Imobiliário</option>
                <option value="Financiamento de Veículo">Financiamento de Veículo</option>
                <option value="Cheque Especial">Cheque Especial</option>
                <option value="Crediário">Crediário</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Data de Início</label>
              <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold" />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">1º Vencimento</label>
              <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Prioridade</label>
              <select value={priority} onChange={e => setPriority(e.target.value as DebtPriority)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold cursor-pointer">
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Multa por Atraso %</label>
              <input type="text" inputMode="decimal" value={penaltyRate} onChange={e => setPenaltyRate(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 font-bold" placeholder="2.00" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 h-16 resize-none font-medium" placeholder="Anotações adicionais sobre o contrato..." />
          </div>

          <button 
            type="submit" 
            disabled={isSaving} 
            className="w-full rounded-2xl bg-white py-4 font-black text-xs text-slate-900 uppercase tracking-wider hover:bg-white/90 transition-colors disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {isSaving ? "Salvando..." : initialData ? "Atualizar Dívida" : "Cadastrar Dívida"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
