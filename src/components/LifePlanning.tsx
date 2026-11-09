import React, { useState, useMemo, useEffect } from "react";
import { 
  Heart, 
  TrendingUp, 
  TrendingDown,
  Calendar, 
  Zap, 
  Plus, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  Target, 
  ChevronRight,
  Info,
  ArrowRight,
  ShieldCheck,
  Brain,
  History,
  Save,
  RefreshCw
} from "lucide-react";
import { useLifePlan } from "../context/LifePlanContext";
import { useMetas } from "../context/MetasContext";
import { useContas } from "../context/ContasContext";
import { useDebts } from "../context/DebtsContext";
import { useReceivables } from "../context/ReceivablesContext";
import { LifePlanProfile, LifePlanScenario, LifePlanSimulation } from "../types";
import { cn, formatCurrency } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { analyzeLifePlan } from "../services/geminiService";

export function LifePlanning({ user, profile }: any) {
  const { 
    lifePlan, 
    projections, 
    simulations, 
    loading, 
    healthScore, 
    healthStatus,
    createLifePlan,
    updateLifePlan,
    addSimulation,
    removeSimulation
  } = useLifePlan();

  const { goals } = useMetas();
  const { accounts } = useContas();
  const { debts } = useDebts();
  const { receivables } = useReceivables();

  const [scenario, setScenario] = useState<LifePlanScenario>("realista");
  const [isCreating, setIsCreating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form states for creation
  const [formData, setFormData] = useState({
    name: "Meu Plano de Vida",
    horizonYears: 10,
    profile: "moderado" as LifePlanProfile,
    currentIncome: 0,
    currentExpenses: 0,
    currentWealth: 0,
    linkedGoalIds: [] as string[]
  });

  // Simulation form states
  const [showSimForm, setShowSimForm] = useState(false);
  const [simForm, setSimForm] = useState({
    name: "",
    type: "compra" as LifePlanSimulation["type"],
    value: 0,
    date: new Date().toISOString().split('T')[0]
  });

  // Calculate estimated baseline wealth from accounts
  const estimatedWealth = useMemo(() => {
    return (accounts || []).reduce((acc, a) => acc + (a.balance || 0), 0);
  }, [accounts]);

  useEffect(() => {
    if (lifePlan) {
      setFormData({
        name: lifePlan.name,
        horizonYears: lifePlan.horizonYears,
        profile: lifePlan.profile,
        currentIncome: lifePlan.currentIncome,
        currentExpenses: lifePlan.currentExpenses,
        currentWealth: lifePlan.currentWealth,
        linkedGoalIds: lifePlan.linkedGoalIds || []
      });
    } else if (estimatedWealth > 0 && formData.currentWealth === 0) {
      setFormData(prev => ({
        ...prev,
        currentWealth: Math.max(0, estimatedWealth),
        currentIncome: prev.currentIncome || 0,
        currentExpenses: prev.currentExpenses || 0
      }));
    }
  }, [lifePlan, estimatedWealth]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLifePlan(formData);
    setIsCreating(false);
  };

  const handleAddSim = async (e: React.FormEvent) => {
    e.preventDefault();
    await addSimulation(simForm);
    setShowSimForm(false);
    setSimForm({ name: "", type: "compra", value: 0, date: new Date().toISOString().split('T')[0] });
  };

  const handleAnalyze = async () => {
    if (!lifePlan) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeLifePlan(lifePlan, projections, goals, accounts, debts, receivables);
      setAiAnalysis(result);
    } catch (error) {
      console.error("Erro na análise IA:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = projections[scenario];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!lifePlan && !isCreating) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 px-6">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <Heart className="w-12 h-12 text-emerald-600" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
          Desenhe o Futuro que Você Merece
        </h1>
        <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
          O Planejamento de Vida integra suas finanças, metas e sonhos em uma visão estratégica de longo prazo. Descubra onde você pode chegar.
        </p>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-white text-slate-900 px-10 py-5 rounded-3xl font-bold text-lg shadow-[0_8px_30px_rgba(0,0,0,0.04)] shadow-primary-dark/20 hover:scale-105 transition-transform flex items-center gap-3 mx-auto"
        >
          <Plus size={24} />
          Começar Meu Planejamento
        </button>
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-5xl premium-shadow border border-gray-100">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Configurar Plano de Vida</h2>
            <p className="text-sm text-gray-400 font-medium">Defina as bases da sua jornada estratégica</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nome do Plano</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-lime font-bold"
                placeholder="Ex: Minha Independência"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Horizonte (Anos)</label>
              <select
                value={formData.horizonYears}
                onChange={e => setFormData({ ...formData, horizonYears: Number(e.target.value) })}
                className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-lime font-bold"
              >
                <option value={5}>5 Anos</option>
                <option value={10}>10 Anos</option>
                <option value={20}>20 Anos</option>
                <option value={30}>30 Anos</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Renda Mensal Atual</label>
              <input
                type="number"
                value={formData.currentIncome}
                onChange={e => setFormData({ ...formData, currentIncome: Number(e.target.value) })}
                className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-lime font-bold"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Gastos Mensais Atuais</label>
              <input
                type="number"
                value={formData.currentExpenses}
                onChange={e => setFormData({ ...formData, currentExpenses: Number(e.target.value) })}
                className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-lime font-bold"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Patrimônio Atual</label>
              <input
                type="number"
                value={formData.currentWealth}
                onChange={e => setFormData({ ...formData, currentWealth: Number(e.target.value) })}
                className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-lime font-bold"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Perfil de Risco</label>
              <select
                value={formData.profile}
                onChange={e => setFormData({ ...formData, profile: e.target.value as LifePlanProfile })}
                className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-lime font-bold"
              >
                <option value="conservador">Conservador</option>
                <option value="moderado">Moderado</option>
                <option value="agressivo">Agressivo</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Objetivos Vinculados</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goals.map(goal => (
                <label 
                  key={goal.id}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                    formData.linkedGoalIds.includes(goal.id)
                      ? "border-primary-lime bg-emerald-500/5"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  )}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.linkedGoalIds.includes(goal.id)}
                    onChange={() => {
                      const newIds = formData.linkedGoalIds.includes(goal.id)
                        ? formData.linkedGoalIds.filter(id => id !== goal.id)
                        : [...formData.linkedGoalIds, goal.id];
                      setFormData({ ...formData, linkedGoalIds: newIds });
                    }}
                  />
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    formData.linkedGoalIds.includes(goal.id) ? "border-primary-lime bg-emerald-500" : "border-gray-300"
                  )}>
                    {formData.linkedGoalIds.includes(goal.id) && <Plus size={12} className="text-slate-900" />}
                  </div>
                  <span className="text-sm font-bold text-slate-900">{goal.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="flex-1 p-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 p-4 bg-white text-slate-900 rounded-2xl font-bold shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:scale-[1.02] transition-transform"
            >
              Criar Plano
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-5xl text-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <Heart className="text-emerald-600" size={24} />
              <h1 className="text-3xl font-black tracking-tight">{lifePlan?.name}</h1>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-900/40 uppercase tracking-widest mb-1">Horizonte</p>
                <p className="text-xl font-black text-emerald-600">{lifePlan?.horizonYears} Anos</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900/40 uppercase tracking-widest mb-1">Perfil</p>
                <p className="text-xl font-black capitalize">{lifePlan?.profile}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900/40 uppercase tracking-widest mb-1">Patrimônio</p>
                <p className="text-xl font-black">{formatCurrency(lifePlan?.currentWealth || 0)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900/40 uppercase tracking-widest mb-1">Metas</p>
                <p className="text-xl font-black">{lifePlan?.linkedGoalIds.length} Ativas</p>
              </div>
            </div>
          </div>
        </div>

        <div className={cn(
          "p-8 rounded-5xl flex flex-col items-center justify-center text-center premium-shadow border",
          healthStatus === "green" ? "bg-primary-green/5 border-primary-green/20" :
          healthStatus === "yellow" ? "bg-primary-orange/5 border-primary-orange/20" :
          "bg-primary-red/5 border-primary-red/20"
        )}>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Saúde do Plano</p>
          <div className="relative w-32 h-32 mb-4">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle className="text-gray-100 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
              <circle 
                className={cn(
                  "stroke-current transition-all duration-1000",
                  healthStatus === "green" ? "text-primary-green" :
                  healthStatus === "yellow" ? "text-primary-orange" :
                  "text-primary-red"
                )}
                strokeWidth="8" 
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * healthScore) / 100}
                strokeLinecap="round" 
                fill="transparent" 
                r="40" cx="50" cy="50" 
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-black text-slate-900">{healthScore}</span>
            </div>
          </div>
          <p className={cn(
            "text-sm font-bold uppercase tracking-wider",
            healthStatus === "green" ? "text-primary-green" :
            healthStatus === "yellow" ? "text-primary-orange" :
            "text-primary-red"
          )}>
            {healthStatus === "green" ? "Excelente" : healthStatus === "yellow" ? "Atenção" : "Crítico"}
          </p>
        </div>
      </div>

      {/* Main Projection Chart */}
      <div className="bg-white p-8 rounded-5xl premium-shadow border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Projeção de Patrimônio</h2>
            <p className="text-sm text-gray-400 font-medium">Evolução estimada baseada no cenário {scenario}</p>
          </div>
          <div className="flex bg-gray-50 p-1.5 rounded-2xl">
            {(["pessimista", "realista", "otimista"] as LifePlanScenario[]).map(s => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                  scenario === s ? "bg-white text-slate-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[400px] w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4F06D" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D4F06D" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="year" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }}
                tickFormatter={(value) => `R$ ${value / 1000}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [formatCurrency(value), "Patrimônio"]}
              />
              <Area 
                type="monotone" 
                dataKey="wealth" 
                stroke="#D4F06D" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorWealth)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline & Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Timeline */}
        <div className="bg-white p-8 rounded-5xl premium-shadow border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Calendar className="text-emerald-600" size={24} />
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Linha do Tempo</h2>
            </div>
          </div>
          
          <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
            {chartData.filter((_, i) => i % 2 === 0 || i === chartData.length - 1).map((point, idx) => {
              const yearSims = simulations.filter(s => new Date(s.date).getFullYear() === point.year);
              const yearGoals = goals.filter(g => new Date(g.deadline).getFullYear() === point.year && lifePlan.linkedGoalIds.includes(g.id));

              return (
                <div key={idx} className="relative pl-12">
                  <div className="absolute left-0 top-1.5 w-10 h-10 bg-white border-4 border-gray-100 rounded-full flex items-center justify-center z-10">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-black text-slate-900">{point.year}</span>
                    <span className="text-sm font-bold text-gray-400">{formatCurrency(point.wealth)}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {yearGoals.map(goal => (
                      <div key={goal.id} className="flex items-center gap-2 text-xs font-bold text-primary-green bg-primary-green/5 p-2 rounded-xl">
                        <Target size={14} />
                        <span>Meta: {goal.name}</span>
                      </div>
                    ))}
                    {yearSims.map(sim => (
                      <div key={sim.id} className="flex items-center gap-2 text-xs font-bold text-primary-orange bg-primary-orange/5 p-2 rounded-xl">
                        <Zap size={14} />
                        <span>Simulação: {sim.name}</span>
                      </div>
                    ))}
                    {yearGoals.length === 0 && yearSims.length === 0 && (
                      <p className="text-xs text-gray-400 italic">Evolução patrimonial contínua</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Decision Simulation */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-5xl premium-shadow border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Brain className="text-emerald-600" size={24} />
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Simular Decisões</h2>
              </div>
              <button 
                onClick={() => setShowSimForm(true)}
                className="w-10 h-10 bg-white text-slate-900 rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {simulations.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <Zap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-400">Nenhuma decisão simulada ainda</p>
                  <button 
                    onClick={() => setShowSimForm(true)}
                    className="mt-4 text-xs font-black text-slate-900 uppercase tracking-widest hover:underline"
                  >
                    Simular agora
                  </button>
                </div>
              ) : (
                simulations.map(sim => (
                  <div key={sim.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        sim.type === "compra" ? "bg-primary-red/10 text-primary-red" :
                        sim.type === "renda" ? "bg-primary-green/10 text-primary-green" :
                        "bg-primary-orange/10 text-primary-orange"
                      )}>
                        {sim.type === "compra" ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{sim.name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {new Date(sim.date).getFullYear()} • {formatCurrency(sim.value)}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeSimulation(sim.id)}
                      className="w-8 h-8 text-gray-300 hover:text-primary-red transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white p-8 rounded-5xl text-slate-900 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-16 -mt-16" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-emerald-600" size={24} />
                  <h2 className="text-2xl font-black tracking-tight">Análise Estratégica</h2>
                </div>
                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Atualizar
                </button>
              </div>

              {!aiAnalysis ? (
                <div className="text-center py-10">
                  <Brain className="w-12 h-12 text-slate-900/20 mx-auto mb-4" />
                  <p className="text-sm text-slate-900/60 font-medium mb-6">A IA pode analisar seu plano e sugerir ajustes estratégicos para o futuro.</p>
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-600/20 hover:scale-105 transition-transform"
                  >
                    {isAnalyzing ? "Analisando..." : "Gerar Insights"}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white/5 p-5 rounded-3xl border border-gray-50">
                    <p className="text-sm leading-relaxed text-slate-900/80">{aiAnalysis.diagnosis}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Riscos</h4>
                      <ul className="space-y-2">
                        {aiAnalysis.risks.map((risk: string, i: number) => (
                          <li key={i} className="text-xs flex items-start gap-2 text-slate-900/60">
                            <AlertCircle size={12} className="mt-0.5 shrink-0" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Oportunidades</h4>
                      <ul className="space-y-2">
                        {aiAnalysis.opportunities.map((opp: string, i: number) => (
                          <li key={i} className="text-xs flex items-start gap-2 text-slate-900/60">
                            <Zap size={12} className="mt-0.5 shrink-0" />
                            {opp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-50">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Plano de Ação</h4>
                    <div className="space-y-2">
                      {aiAnalysis.actionPlan.map((action: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-xs font-bold bg-white/5 p-3 rounded-xl">
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                            {i + 1}
                          </div>
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Modal */}
      <AnimatePresence>
        {showSimForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSimForm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-5xl p-8 premium-shadow"
            >
              <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Simular Decisão</h3>
              <form onSubmit={handleAddSim} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">O que você quer simular?</label>
                  <input
                    type="text"
                    value={simForm.name}
                    onChange={e => setSimForm({ ...simForm, name: e.target.value })}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-lime font-bold"
                    placeholder="Ex: Compra de Imóvel"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tipo</label>
                    <select
                      value={simForm.type}
                      onChange={e => setSimForm({ ...simForm, type: e.target.value as any })}
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-lime font-bold text-sm"
                    >
                      <option value="compra">Compra/Gasto</option>
                      <option value="renda">Nova Renda</option>
                      <option value="estilo_vida">Mudança Lifestyle</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Valor</label>
                    <input
                      type="number"
                      value={simForm.value}
                      onChange={e => setSimForm({ ...simForm, value: Number(e.target.value) })}
                      className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-lime font-bold"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Data Prevista</label>
                  <input
                    type="date"
                    value={simForm.date}
                    onChange={e => setSimForm({ ...simForm, date: e.target.value })}
                    className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-lime font-bold"
                    required
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSimForm(false)}
                    className="flex-1 p-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 p-4 bg-white text-slate-900 rounded-2xl font-bold shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
                  >
                    Simular
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
