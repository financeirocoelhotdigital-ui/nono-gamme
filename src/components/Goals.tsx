import React, { useState, useEffect } from "react";
import { Goal, Account, GoalContribution } from "../types";
import { formatCurrency, cn, formatDate, parseLocalDate, formatDateForInput, parseCurrencyInput } from "../lib/utils";
import { 
  Target, Plus, Trash2, ChevronRight, Calendar, Edit2, 
  TrendingUp, Brain, Sparkles, AlertCircle, Info, 
  ArrowUpRight, ArrowDownRight, History, Settings,
  Clock, CheckCircle2, ShieldAlert, Calculator
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMetas } from "../context/MetasContext";
import { useContas } from "../context/ContasContext";
import { useTransacoes } from "../context/TransacoesContext";
import { analyzeGoalsStrategy } from "../services/geminiService";

export function Goals() {
  const { goals, loading, createGoal, updateGoal, deleteGoal, addContribution } = useMetas();
  const { accounts } = useContas();
  const { transactions } = useTransacoes();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeGoalsStrategy(goals, transactions, accounts);
      setAiAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-green border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto px-4 md:px-6">
      {/* Header matching Dashboard aesthetic */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Meus Objetivos
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {goals.length} metas estratégicas ativas
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-sm hover:shadow-md active:scale-95 transition-all"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Nova Meta</span>
        </button>
      </div>

      {/* AI Strategy Card with Dashboard gradient style */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#F4F9F6] to-[#E8F5E9] p-6 border border-emerald-100/60 shadow-[0_8px_30px_rgba(16,185,129,0.06)]">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#10B981] flex items-center justify-center text-white shadow-sm">
                <Brain size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Estrategista de Metas</h3>
                <p className="text-[11px] font-bold text-[#065F46]">Inteligência Artificial Ativa</p>
              </div>
            </div>
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center justify-center gap-2 rounded-xl bg-white border border-emerald-200/80 px-4 py-2 text-xs font-bold text-[#065F46] hover:bg-emerald-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles size={15} className="text-[#10B981]" />
              {isAnalyzing ? "Analisando..." : "Gerar Estratégia"}
            </button>
          </div>

          {aiAnalysis ? (
            <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-3 duration-400">
              <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-sm border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-1.5 text-[#065F46] font-bold text-xs mb-1.5">
                  <ArrowUpRight size={15} strokeWidth={2.5} />
                  <span>Foco Prioritário</span>
                </div>
                <p className="text-xs font-medium text-slate-700 leading-relaxed italic">
                  "{aiAnalysis.prioritySuggestion}"
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/80 border border-emerald-100 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Visão de Futuro</span>
                  <p className="text-xs font-bold text-[#065F46]">{aiAnalysis.futureVision}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/80 border border-emerald-100 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Status Geral</span>
                  <p className="text-xs font-bold text-[#065F46]">{aiAnalysis.healthCheck}</p>
                </div>
              </div>

              {aiAnalysis.tips && aiAnalysis.tips.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {aiAnalysis.tips.map((tip: string, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 bg-white/90 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-xs">
                      <CheckCircle2 size={12} className="text-[#10B981]" />
                      {tip}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-2 text-center">
              <p className="text-xs text-slate-600 font-medium">Clique em <span className="font-bold text-[#065F46]">"Gerar Estratégia"</span> para que a IA analise seu progresso e recomende o melhor ritmo para atingir seus sonhos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Goals List */}
      <div className="grid grid-cols-1 gap-4">
        {goals.map((goal, index) => (
          <GoalItem 
            key={goal.id} 
            goal={goal} 
            index={index}
            onEdit={() => setEditingGoal(goal)} 
            onAddValue={() => setEditingGoal({ ...goal, isAddingValue: true })}
            onViewHistory={() => setShowHistory(goal.id)}
          />
        ))}

        {goals.length === 0 && (
          <div className="py-16 text-center bg-white rounded-[24px] border border-slate-100 p-8 shadow-sm">
            <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto text-[#10B981] mb-3">
              <Target size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">Nenhum objetivo definido ainda</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Crie seu primeiro objetivo para acompanhar a evolução e calcular aportes ideais automaticamente.</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-4 inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              <Plus size={16} strokeWidth={2.5} />
              Criar primeira meta
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(isAdding || editingGoal) && (
          <GoalForm 
            onClose={() => {
              setIsAdding(false);
              setEditingGoal(null);
            }} 
            initialData={editingGoal}
            accounts={accounts}
          />
        )}
        {showHistory && (
          <GoalHistoryModal 
            goal={goals.find(g => g.id === showHistory)!} 
            onClose={() => setShowHistory(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GoalItem({ goal, index, onEdit, onAddValue, onViewHistory }: { 
  goal: any, 
  index: number,
  onEdit: () => void, 
  onAddValue: () => void,
  onViewHistory: () => void
}) {
  const healthBadgeStyle = {
    verde: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amarelo: "bg-amber-50 text-amber-700 border-amber-200",
    vermelho: "bg-rose-50 text-rose-700 border-rose-200"
  };

  const healthBarColor = {
    verde: "bg-[#10B981]",
    amarelo: "bg-amber-500",
    vermelho: "bg-rose-500"
  };

  const healthText = {
    verde: "No Ritmo",
    amarelo: "Atenção",
    vermelho: "Atrasado"
  };

  const currentHealth = (goal.health as keyof typeof healthBadgeStyle) || "verde";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-[24px] bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981] group-hover:scale-105 transition-transform">
            <Target size={24} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight">{goal.name}</h3>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", healthBadgeStyle[currentHealth])}>
                {healthText[currentHealth]}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-slate-400 text-xs font-medium">
              <div className="flex items-center gap-1">
                <Calendar size={13} />
                <span>{formatDate(goal.deadline)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={13} />
                <span>{goal.monthsRemaining} meses</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-black text-slate-900 tracking-tight">
            {formatCurrency(goal.currentValue)}
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            Meta: {formatCurrency(goal.targetValue)}
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3 mb-4 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-bold text-slate-600">
            <span>Progresso Financeiro</span>
            <span className="text-[#065F46] font-black">{Math.round(goal.financialProgress)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, goal.financialProgress))}%` }}
              className={cn("h-full rounded-full transition-all duration-500", healthBarColor[currentHealth])}
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-medium text-slate-400">
            <span>Tempo decorrido ({goal.monthsRemaining}m restantes)</span>
            <span>{Math.round(goal.timeProgress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, goal.timeProgress))}%` }}
              className="h-full bg-slate-400/80 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-1 text-slate-400 mb-0.5">
            <Calculator size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Aporte mensal ideal</span>
          </div>
          <div className="text-xs font-black text-slate-800">
            {formatCurrency(goal.monthlyNeeded)}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-1 text-slate-400 mb-0.5">
            <TrendingUp size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Ritmo atual</span>
          </div>
          <div className={cn("text-xs font-bold", goal.isAhead ? "text-emerald-700" : "text-rose-600")}>
            {goal.isAhead ? "✓ Adiantado" : "⚠ Atrasado"}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button 
          onClick={onAddValue}
          className="flex-1 h-11 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Aportar</span>
        </button>
        <button 
          onClick={onViewHistory}
          aria-label="Ver histórico"
          className="h-11 w-11 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all"
        >
          <History size={16} />
        </button>
        <button 
          onClick={onEdit}
          aria-label="Editar meta"
          className="h-11 w-11 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all"
        >
          <Settings size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function GoalForm({ onClose, initialData, accounts }: { onClose: () => void, initialData?: any, accounts: Account[] }) {
  const { createGoal, updateGoal, deleteGoal, addContribution } = useMetas();
  
  const [name, setName] = useState(initialData?.name || "");
  const [targetValue, setTargetValue] = useState(initialData?.targetValue != null ? String(initialData.targetValue) : "");
  const [currentValue, setCurrentValue] = useState(initialData?.currentValue != null ? String(initialData.currentValue) : "0");
  const [deadline, setDeadline] = useState(initialData?.deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [priority, setPriority] = useState(initialData?.priority || "media");
  const [category, setCategory] = useState(initialData?.category || "outros");
  const [linkedAccountId, setLinkedAccountId] = useState(initialData?.linkedAccountId || "");
  const [autoContributionPercentage, setAutoContributionPercentage] = useState(initialData?.autoContributionPercentage != null ? String(initialData.autoContributionPercentage) : "");
  const [isDynamic, setIsDynamic] = useState(initialData?.isDynamic || false);
  
  const [isAddingValue, setIsAddingValue] = useState(initialData?.isAddingValue || false);
  const [contributionValue, setContributionValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Simulator State
  const [simTarget, setSimTarget] = useState(initialData?.targetValue || 0);
  const [simDeadline, setSimDeadline] = useState(deadline);
  const [simMonthly, setSimMonthly] = useState(0);

  useEffect(() => {
    const targetNum = parseCurrencyInput(simTarget);
    if (targetNum > 0 && simDeadline) {
      const now = new Date();
      const dl = parseLocalDate(simDeadline);
      if (dl) {
        const diffMonths = Math.max(1, Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
        const currentNum = parseCurrencyInput(currentValue);
        setSimMonthly(Math.max(0, (targetNum - currentNum) / diffMonths));
      }
    }
  }, [simTarget, simDeadline, currentValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    
    try {
      if (isAddingValue && initialData) {
        const val = parseCurrencyInput(contributionValue);
        if (val <= 0) {
          setFormError("Informe um valor de aporte maior que zero.");
          setLoading(false);
          return;
        }
        await addContribution(initialData.id, val, "manual");
        onClose();
      } else {
        if (!name.trim()) {
          setFormError("Informe o nome do objetivo.");
          setLoading(false);
          return;
        }
        const parsedTarget = parseCurrencyInput(targetValue);
        if (parsedTarget <= 0) {
          setFormError("Informe um valor meta maior que zero.");
          setLoading(false);
          return;
        }
        const parsedCurrent = parseCurrencyInput(currentValue);

        const data = {
          name: name.trim(),
          targetValue: parsedTarget,
          currentValue: parsedCurrent,
          deadline: deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority,
          category,
          linkedAccountId: linkedAccountId || null,
          autoContributionPercentage: autoContributionPercentage ? parseCurrencyInput(autoContributionPercentage) : null,
          isDynamic,
          status: (parsedTarget > 0 && parsedCurrent >= parsedTarget ? "completed" : (initialData?.status || "active")) as any
        };

        if (initialData?.id) {
          await updateGoal(initialData.id, data);
        } else {
          await createGoal(data as any);
        }
        onClose();
      }
    } catch (error: any) {
      console.error("Erro ao salvar meta:", error);
      setFormError(error?.message || "Ocorreu um erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Deseja excluir este objetivo permanentemente?")) {
      setLoading(true);
      await deleteGoal(initialData.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg rounded-t-[40px] bg-white p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#10B981] flex items-center justify-center">
              {isAddingValue ? <TrendingUp size={20} /> : <Target size={20} />}
            </div>
            <h3 className="text-xl font-black text-slate-900">
              {isAddingValue ? "Aportar Valor" : initialData ? "Editar Objetivo" : "Novo Objetivo"}
            </h3>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-slate-700 transition-colors">
            <Plus className="rotate-45" size={20} />
          </button>
        </div>

        {formError && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isAddingValue ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Valor do Aporte</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-900">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    value={contributionValue}
                    onChange={e => setContributionValue(e.target.value)}
                    className="w-full rounded-2xl border-none bg-gray-50 py-4 pl-12 pr-4 text-2xl font-black text-slate-900 focus:ring-2 focus:ring-[#10B981]/20"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 italic text-center">Este aporte será registrado no histórico do objetivo e impactará seu progresso real.</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nome do Objetivo</label>
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20" 
                  placeholder="Ex: Reserva de Emergência" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Valor Meta</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required 
                    value={targetValue} 
                    onChange={e => {
                      setTargetValue(e.target.value);
                      setSimTarget(parseCurrencyInput(e.target.value));
                    }} 
                    className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20" 
                    placeholder="R$ 0,00" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Prazo Final</label>
                  <input 
                    type="date" 
                    required 
                    value={deadline} 
                    onChange={e => {
                      setDeadline(e.target.value);
                      setSimDeadline(e.target.value);
                    }} 
                    className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Valor Atual Já Guardado</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={currentValue} 
                  onChange={e => setCurrentValue(e.target.value)} 
                  className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20" 
                  placeholder="R$ 0,00" 
                />
              </div>

              {/* Simulator Preview */}
              {(simTarget > 0 && simDeadline) && (
                <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200/60">
                  <div className="flex items-center gap-2 text-[#065F46] mb-1.5 font-bold">
                    <Calculator size={14} />
                    <span className="text-[10px] uppercase tracking-widest">Simulador em Tempo Real</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 leading-relaxed">
                    Para atingir esta meta no prazo, você precisará guardar <span className="text-[#10B981] font-black">{formatCurrency(simMonthly)}</span> por mês.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Prioridade</label>
                  <select 
                    value={priority} 
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoria</label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20"
                  >
                    <option value="reserva">Reserva</option>
                    <option value="viagem">Viagem</option>
                    <option value="bem">Bem de Consumo</option>
                    <option value="educacao">Educação</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Conta Vinculada (Opcional)</label>
                <select 
                  value={linkedAccountId} 
                  onChange={e => setLinkedAccountId(e.target.value)}
                  className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20"
                >
                  <option value="">Nenhuma conta vinculada</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                  ))}
                </select>
                <p className="text-[9px] text-gray-400 mt-1 italic">O saldo desta conta será usado automaticamente como progresso da meta.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Aporte Automático (% da Renda)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={autoContributionPercentage} 
                    onChange={e => setAutoContributionPercentage(e.target.value)}
                    className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20"
                    placeholder="Ex: 10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">%</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <input 
                  type="checkbox" 
                  id="isDynamic"
                  checked={isDynamic}
                  onChange={e => setIsDynamic(e.target.checked)}
                  className="h-5 w-5 rounded-lg border-gray-300 text-[#10B981] focus:ring-[#10B981]"
                />
                <label htmlFor="isDynamic" className="flex flex-col cursor-pointer">
                  <span className="text-xs font-bold text-slate-900">Meta Dinâmica (Inflação)</span>
                  <span className="text-[10px] text-gray-400">Ajustar valor da meta automaticamente com o tempo</span>
                </label>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            {initialData && !isAddingValue && (
              <button 
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                title="Excluir meta"
              >
                <Trash2 size={22} />
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white py-4 font-black uppercase tracking-widest shadow-md active:scale-95 transition-all disabled:opacity-50 text-xs"
            >
              {loading ? "Processando..." : isAddingValue ? "Confirmar Aporte" : initialData ? "Salvar Alterações" : "Criar Objetivo"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function GoalHistoryModal({ goal, onClose }: { goal: any, onClose: () => void }) {
  const historyList = [...(goal.history || [])].sort(
    (a: any, b: any) => (parseLocalDate(b.date)?.getTime() || 0) - (parseLocalDate(a.date)?.getTime() || 0)
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg rounded-t-[40px] bg-white p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#10B981] flex items-center justify-center">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Histórico de Aportes</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{goal.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-slate-700 transition-colors">
            <Plus className="rotate-45" size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {historyList.length > 0 ? (
            historyList.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center",
                    item.type === "auto" ? "bg-emerald-100 text-[#10B981]" : "bg-white text-slate-900 shadow-xs"
                  )}>
                    {item.type === "auto" ? <Sparkles size={18} /> : <TrendingUp size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {item.type === "auto" ? "Aporte Automático" : "Aporte Manual"}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">{formatDate(item.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-600">+{formatCurrency(item.value)}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-gray-400 italic text-sm">Nenhum aporte registrado ainda.</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
