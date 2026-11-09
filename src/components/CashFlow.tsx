import React, { useState, useEffect } from "react";
import { useCashFlow } from "../context/CashFlowContext";
import { useContas } from "../context/ContasContext";
import { useDebts } from "../context/DebtsContext";
import { useReceivables } from "../context/ReceivablesContext";
import { formatCurrency, cn } from "../lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Info,
  ArrowRight,
  Zap,
  BarChart3,
  LineChart as LineChartIcon,
  ChevronRight,
  Filter,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Wallet,
  ShieldCheck
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { analyzeFutureCashFlow } from "../services/geminiService";

export function CashFlow() {
  const { projection, simulatedEvents, addSimulatedEvent, removeSimulatedEvent, horizon, setHorizon, alerts, clearSimulations } = useCashFlow();
  const { accounts } = useContas();
  const { debts } = useDebts();
  const { receivables } = useReceivables();
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [simForm, setSimForm] = useState({
    description: "",
    value: 0,
    type: "expense" as "income" | "expense",
    date: format(new Date(), "yyyy-MM-dd"),
    origin: "simulation" as const
  });

  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAddSim = () => {
    if (!simForm.description || simForm.value <= 0) return;
    addSimulatedEvent({
      ...simForm,
      date: new Date(simForm.date).toISOString()
    });
    setSimForm({
      description: "",
      value: 0,
      type: "expense",
      date: format(new Date(), "yyyy-MM-dd"),
      origin: "simulation"
    });
    setIsSimulating(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFutureCashFlow(projection, accounts, debts, receivables);
      setAiAnalysis(result);
    } catch (error) {
      console.error("Erro ao analisar fluxo de caixa:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentBalance = projection[0]?.balance || 0;
  const finalBalance = projection[projection.length - 1]?.balance || 0;
  const balanceChange = finalBalance - currentBalance;
  const isPositive = balanceChange >= 0;

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Horizon Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Fluxo de Caixa Futuro</h1>
          <p className="text-gray-500 font-medium">Projeção inteligente do seu saldo para os próximos dias</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setHorizon(d)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                horizon === d ? "bg-white text-slate-900 shadow-lg shadow-primary-dark/20" : "text-gray-400 hover:text-slate-900 hover:bg-gray-50"
              )}
            >
              {d} Dias
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-slate-900">
              <Wallet size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Saldo Atual</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(currentBalance)}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-slate-900">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Saldo Final Previsto</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900">{formatCurrency(finalBalance)}</p>
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {isPositive ? "+" : ""}{((balanceChange / (currentBalance || 1)) * 100).toFixed(1)}%
            </span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-slate-900"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-600">
              <AlertCircle size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900/40">Alertas Detectados</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{alerts.length} Alertas</p>
          <p className="text-xs font-medium text-slate-900/50 mt-1">Clique para ver detalhes</p>
        </motion.div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-slate-900">
              <LineChartIcon size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Projeção de Saldo</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Linha do tempo financeira</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsSimulating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all active:scale-95"
          >
            <Plus size={18} />
            Simular Evento
          </button>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4F06D" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D4F06D" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                tickFormatter={(date) => format(parseISO(date), "dd/MM")}
                minTickGap={30}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50 text-slate-900 min-w-[200px]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 mb-2">
                          {format(parseISO(data.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-xl font-black text-emerald-600 mb-3">{formatCurrency(data.balance)}</p>
                        
                        {data.events.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-gray-50">
                            {data.events.map((e: any) => (
                              <div key={e.id} className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-bold truncate flex-1">{e.description}</span>
                                <span className={cn(
                                  "text-[10px] font-black",
                                  e.type === "income" ? "text-emerald-400" : "text-rose-400"
                                )}>
                                  {e.type === "income" ? "+" : "-"}{formatCurrency(e.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#FDA4AF" strokeDasharray="3 3" />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="#D4F06D" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorBalance)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Alerts & Insights */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Alertas e Riscos</h3>
            <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest">
              {alerts.length} Críticos
            </span>
          </div>

          <div className="space-y-4">
            {alerts.length > 0 ? (
              alerts.map((alert, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "p-5 rounded-[2rem] border flex items-start gap-4",
                    alert.type === "negative" ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                    alert.type === "negative" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <p className={cn(
                      "text-sm font-black",
                      alert.type === "negative" ? "text-rose-900" : "text-amber-900"
                    )}>
                      {alert.message}
                    </p>
                    <p className="text-xs font-medium text-gray-500 mt-1">
                      Ajuste seus gastos ou antecipe receitas para evitar este cenário.
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-10 text-center bg-emerald-50 rounded-[3rem] border border-emerald-100">
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h4 className="text-lg font-black text-emerald-900">Tudo sob controle!</h4>
                <p className="text-sm font-medium text-emerald-700/70 mt-2">
                  Nenhum risco de saldo negativo detectado para o horizonte selecionado.
                </p>
              </div>
            )}
          </div>

          {/* AI Insights Button */}
          {!aiAnalysis && (
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full p-6 bg-white text-slate-900 rounded-[2.5rem] flex items-center justify-center gap-3 font-black text-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles size={20} className="text-emerald-600" />
              )}
              {isAnalyzing ? "Analisando Fluxo..." : "Gerar Diagnóstico por IA"}
            </button>
          )}

          {aiAnalysis && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-[3rem] text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles size={120} className="text-emerald-600" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Zap size={20} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-emerald-600">Diagnóstico Inteligente</h3>
                </div>

                <p className="text-sm font-medium text-slate-900/80 leading-relaxed mb-8">
                  {aiAnalysis.diagnosis}
                </p>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 mb-3">Plano de Ação</h4>
                    <div className="space-y-2">
                      {aiAnalysis.actionPlan.map((step: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-sm font-bold">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] shrink-0">{i+1}</div>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-gray-50">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 mb-2">Visão Futura</h4>
                      <p className="text-xs font-medium text-slate-900/70">{aiAnalysis.futureVision}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-gray-50">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 mb-2">Sugestão</h4>
                      <p className="text-xs font-black text-emerald-600">{aiAnalysis.suggestions[0]?.title}</p>
                      <p className="text-[10px] font-medium text-slate-900/50 mt-1">{aiAnalysis.suggestions[0]?.description}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setAiAnalysis(null)}
                  className="mt-8 text-[10px] font-black uppercase tracking-widest text-slate-900/30 hover:text-slate-900 transition-colors"
                >
                  Recalcular Diagnóstico
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Simulations & Events */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Simulações Ativas</h3>
            {simulatedEvents.length > 0 && (
              <button 
                onClick={clearSimulations}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
              >
                Limpar Tudo
              </button>
            )}
          </div>

          <div className="space-y-4">
            {simulatedEvents.length > 0 ? (
              simulatedEvents.map((event) => (
                <div key={event.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      event.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {event.type === "income" ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{event.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {format(parseISO(event.date), "dd 'de' MMM", { locale: ptBR })}
                        </span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-white px-1.5 py-0.5 rounded">Simulado</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={cn(
                      "text-sm font-black",
                      event.type === "income" ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {event.type === "income" ? "+" : "-"}{formatCurrency(event.value)}
                    </p>
                    <button 
                      onClick={() => removeSimulatedEvent(event.id)}
                      className="p-2 text-gray-300 hover:text-rose-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center border-2 border-dashed border-gray-100 rounded-[3rem]">
                <p className="text-sm font-bold text-gray-400">Nenhuma simulação ativa.</p>
                <p className="text-xs font-medium text-gray-300 mt-1">Adicione eventos para ver o impacto no seu saldo futuro.</p>
              </div>
            )}
          </div>

          {/* Upcoming Real Events */}
          <div className="pt-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">Próximos Eventos Reais</h3>
            <div className="space-y-3">
              {projection.flatMap(p => p.events).filter(e => !e.isSimulated).slice(0, 5).map((event, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      event.type === "income" ? "bg-emerald-500" : "bg-rose-500"
                    )}></div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{event.description}</p>
                      <p className="text-[10px] font-medium text-gray-400">
                        {format(parseISO(event.date), "dd/MM")} • {event.origin}
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    "text-xs font-black",
                    event.type === "income" ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {event.type === "income" ? "+" : "-"}{formatCurrency(event.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Modal */}
      <AnimatePresence>
        {isSimulating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSimulating(false)}
              className="absolute inset-0 bg-white/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Simular Novo Evento</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Impacto no fluxo de caixa</p>
                </div>
                <button 
                  onClick={() => setIsSimulating(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setSimForm(prev => ({ ...prev, type: "income" }))}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                      simForm.type === "income" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    <ArrowUpRight size={24} />
                    <span className="text-xs font-black uppercase tracking-widest">Receita</span>
                  </button>
                  <button 
                    onClick={() => setSimForm(prev => ({ ...prev, type: "expense" }))}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                      simForm.type === "expense" ? "border-rose-500 bg-rose-50 text-rose-700" : "border-gray-100 text-gray-400 hover:border-gray-200"
                    )}
                  >
                    <ArrowDownRight size={24} />
                    <span className="text-xs font-black uppercase tracking-widest">Despesa</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Descrição</label>
                    <input 
                      type="text"
                      value={simForm.description}
                      onChange={(e) => setSimForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: Compra de Notebook, Bônus..."
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-lime/20 focus:border-primary-lime transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Valor</label>
                      <input 
                        type="number"
                        value={simForm.value || ""}
                        onChange={(e) => setSimForm(prev => ({ ...prev, value: parseFloat(e.target.value) }))}
                        placeholder="0,00"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-lime/20 focus:border-primary-lime transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Data</label>
                      <input 
                        type="date"
                        value={simForm.date}
                        onChange={(e) => setSimForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-lime/20 focus:border-primary-lime transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleAddSim}
                  className="w-full py-5 bg-white text-slate-900 rounded-[2rem] font-black text-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:scale-[1.02] transition-all active:scale-95"
                >
                  Adicionar Simulação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
