import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  Zap,
  Star,
  Award,
  BarChart3,
  RefreshCw,
  BrainCircuit,
  Sliders,
  User,
  Activity,
  Check,
  ChevronRight,
  Info,
  HelpCircle,
  PiggyBank,
  AlertCircle
} from "lucide-react";
import { useDiagnosis } from "../context/DiagnosisContext";
import { useTransacoes } from "../context/TransacoesContext";
import { useContas } from "../context/ContasContext";
import { useMetas } from "../context/MetasContext";
import { useDebts } from "../context/DebtsContext";
import { useOrcamento } from "../context/OrcamentoContext";
import { useCashFlow } from "../context/CashFlowContext";
import { useLifePlan } from "../context/LifePlanContext";
import { getFinancialDiagnosis } from "../services/geminiService";
import { FinancialProfile, UserLevel, UserProfile } from "../types";

interface FinancialDiagnosisProps {
  userProfile: UserProfile;
}

type TabType = "overview" | "profile" | "actions" | "simulator";

const FinancialDiagnosis: React.FC<FinancialDiagnosisProps> = ({ userProfile }) => {
  const { 
    diagnosis, 
    userBadges, 
    scoreHistory, 
    availableBadges, 
    refreshDiagnosis, 
    financialProfile, 
    updateFinancialProfile,
    isLoading 
  } = useDiagnosis();

  const [activeSubTab, setActiveSubTab] = useState<TabType>("overview");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  // Profile Form States
  const [situation, setSituation] = useState(financialProfile?.situation || "clt");
  const [mainIncome, setMainIncome] = useState(financialProfile?.mainIncome || 3500);
  const [otherIncome, setOtherIncome] = useState(financialProfile?.otherIncome || 0);
  const [hasReserve, setHasReserve] = useState(financialProfile?.hasReserve ?? false);
  const [reserveAmount, setReserveAmount] = useState(financialProfile?.reserveAmount || 0);
  const [dependentsCount, setDependentsCount] = useState(financialProfile?.dependentsCount || 0);
  const [mainGoal, setMainGoal] = useState(financialProfile?.mainGoal || "Comprar casa própria");
  const [incomeStability, setIncomeStability] = useState(financialProfile?.incomeStability || "media");
  const [activityArea, setActivityArea] = useState(financialProfile?.activityArea || "Tecnologia");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showProfileSuccess, setShowProfileSuccess] = useState(false);

  // Sync state if financialProfile updates from DB
  useEffect(() => {
    if (financialProfile) {
      setSituation(financialProfile.situation);
      setMainIncome(financialProfile.mainIncome);
      setOtherIncome(financialProfile.otherIncome);
      setHasReserve(financialProfile.hasReserve);
      setReserveAmount(financialProfile.reserveAmount || 0);
      setDependentsCount(financialProfile.dependentsCount);
      setMainGoal(financialProfile.mainGoal);
      setIncomeStability(financialProfile.incomeStability);
      setActivityArea(financialProfile.activityArea);
    }
  }, [financialProfile]);

  // Context Data for AI or Baselines
  const { transactions } = useTransacoes();
  const { accounts } = useContas();
  const { goals } = useMetas();
  const { debts } = useDebts();
  const { budgets } = useOrcamento();
  const { projection } = useCashFlow();
  const { lifePlan } = useLifePlan();

  // Baseline Metrics for Simulator
  const totalAvailableBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
  const activeDebts = debts.filter(d => d.status === "ativa");
  const totalDebt = activeDebts.reduce((acc, d) => acc + d.remainingValue, 0);
  const monthlyDebtPayment = activeDebts.reduce((acc, d) => acc + (d.installmentValue || 0), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlyExpense = currentMonthTransactions
    .filter(t => t.type === "expense")
    .reduce((acc, t) => acc + t.value, 0);

  const avgExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((acc, t) => acc + t.value, 0) / Math.max(1, transactions.filter(t => t.type === "expense").length / 3);

  const baselineExpense = monthlyExpense > 0 ? monthlyExpense : (avgExpense > 0 ? avgExpense : 2500);

  // Base metrics from current diagnosis or defaults
  const savingsRate = (diagnosis as any)?.metrics?.savingsRate ?? 0;
  const debtCompromiseRate = (diagnosis as any)?.metrics?.debtCompromiseRate ?? 0;
  const emergencyReserveCoverMonths = (diagnosis as any)?.metrics?.emergencyReserveCoverMonths ?? 0;

  // Computed missing information
  const missingInfo: string[] = [];
  if (transactions.length === 0) {
    missingInfo.push("Histórico de Transações: Adicione receitas e despesas para mapear seu fluxo real.");
  }
  if (accounts.length === 0) {
    missingInfo.push("Contas Bancárias: Vincule ou crie pelo menos uma conta para calcular o saldo disponível.");
  }
  if (budgets.length === 0) {
    missingInfo.push("Orçamentos de Categoria: Defina limites de gastos mensais para as categorias.");
  }
  if (!financialProfile) {
    missingInfo.push("Perfil de Consultoria: Configure sua situação de emprego e rendas para um diagnóstico personalizado.");
  }

  // Simulator States
  const [simExpenseReduction, setSimExpenseReduction] = useState(0);
  const [simIncomeIncrease, setSimIncomeIncrease] = useState(0);
  const [simDebtPaymentAmortization, setSimDebtPaymentAmortization] = useState(0);
  const [simReserveIncrease, setSimReserveIncrease] = useState(0);

  // AI Prompt Call
  const handleGenerateAIDiagnosis = async () => {
    if (!userProfile) return;
    setIsGeneratingAI(true);
    try {
      const result = await getFinancialDiagnosis(userProfile, {
        transactions,
        accounts,
        goals,
        debts,
        budget: budgets,
        cashFlow: projection,
        lifePlan
      });
      setAiAnalysis(result);
    } catch (error) {
      console.warn("Notice generating AI diagnosis:", error);
    } finally {
      setIsGeneratingAI(true); // Persist as generated
      setIsGeneratingAI(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const profileData: FinancialProfile = {
        situation,
        mainIncome: Number(mainIncome),
        otherIncome: Number(otherIncome),
        hasReserve,
        reserveAmount: hasReserve ? Number(reserveAmount) : 0,
        dependentsCount: Number(dependentsCount),
        mainGoal,
        incomeStability: incomeStability as "baixa" | "media" | "alta",
        activityArea
      };
      await updateFinancialProfile(profileData);
      setShowProfileSuccess(true);
      setTimeout(() => setShowProfileSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving financial profile:", error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-amber-500";
    return "text-rose-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500/5 border-emerald-500/15";
    if (score >= 60) return "bg-blue-500/5 border-blue-500/15";
    if (score >= 40) return "bg-amber-500/5 border-amber-500/15";
    return "bg-rose-500/5 border-rose-500/15";
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "expert": return "Expert Financeiro";
      case "avancado": return "Avançado";
      case "intermediario": return "Intermediário";
      default: return "Iniciante";
    }
  };

  const situationOptions = [
    { value: "clt", label: "Empregado (CLT)" },
    { value: "public", label: "Servidor Público" },
    { value: "autonomous", label: "Autônomo" },
    { value: "business", label: "Empresário" },
    { value: "mei", label: "Microempreendedor (MEI)" },
    { value: "liberal", label: "Profissional Liberal" },
    { value: "freelancer", label: "Freelancer" },
    { value: "retired", label: "Aposentado" },
    { value: "pensioner", label: "Pensionista" },
    { value: "student", label: "Estudante" },
    { value: "unemployed", label: "Desempregado" },
    { value: "transition", label: "Em transição de carreira" },
    { value: "other", label: "Outra situação" }
  ];

  // Dynamic Simulator Engine Calculations
  const simIncomeTotal = (Number(financialProfile?.mainIncome || 3500) + Number(financialProfile?.otherIncome || 0)) + simIncomeIncrease;
  const simExpenseTotal = Math.max(500, baselineExpense - simExpenseReduction);
  const simDebtTotal = Math.max(0, totalDebt - (simDebtPaymentAmortization * 12)); // Amortized debt total
  const simDebtPayment = Math.max(0, monthlyDebtPayment - simDebtPaymentAmortization);
  const simReserveTotal = (hasReserve ? Number(reserveAmount) : 0) + simReserveIncrease;

  const simSavingsRate = simIncomeTotal > 0 ? ((simIncomeTotal - simExpenseTotal) / simIncomeTotal) * 100 : 0;
  const simDebtCompromise = simIncomeTotal > 0 ? (simDebtPayment / simIncomeTotal) * 100 : 0;

  // Determine required coverage months based on situation
  let simRequiredReserveMonths = 6;
  if (situation === "clt" || situation === "public") simRequiredReserveMonths = 4;
  else if (["autonomous", "business", "mei", "liberal", "freelancer"].includes(situation)) simRequiredReserveMonths = 8;
  else if (situation === "unemployed") simRequiredReserveMonths = 12;

  const simReserveCover = simExpenseTotal > 0 ? simReserveTotal / simExpenseTotal : 0;

  // Recalculate Score dynamically based on Simulator
  let scoreSavings = 0;
  if (simSavingsRate > 20) scoreSavings = 25;
  else if (simSavingsRate > 10) scoreSavings = 18;
  else if (simSavingsRate > 0) scoreSavings = 10;

  let scoreDebt = 25;
  if (simDebtCompromise === 0) scoreDebt = 25;
  else if (simDebtCompromise < 15) scoreDebt = 20;
  else if (simDebtCompromise < 30) scoreDebt = 12;
  else if (simDebtCompromise < 50) scoreDebt = 5;
  else scoreDebt = 0;

  const reserveRatio = simReserveCover / simRequiredReserveMonths;
  let scoreReserve = 0;
  if (reserveRatio >= 1) scoreReserve = 25;
  else if (reserveRatio >= 0.5) scoreReserve = 15;
  else if (reserveRatio > 0) scoreReserve = 8;

  // Default organization and asset weights preserved from actual score where possible
  const scoreOrg = budgets.length > 0 ? 15 : 10;
  const scoreAssets = (totalAvailableBalance > 1000 || simReserveTotal > 1000) ? 10 : 0;

  const simulatedScore = Math.min(100, Math.max(0, Math.round(scoreSavings + scoreDebt + scoreReserve + scoreOrg + scoreAssets)));

  // Generate dynamic simulator text analysis
  let simulatorImpactText = "";
  const scoreDiff = simulatedScore - (diagnosis?.score || 60);
  if (scoreDiff > 0) {
    simulatorImpactText = `Ao realizar essa simulação, seu Score subiria em ${scoreDiff} pontos! Reduzir gastos desnecessários e amortizar parcelas pesadas libera fôlego para aportes recorrentes e protege suas finanças contra riscos imprevistos.`;
  } else if (scoreDiff < 0) {
    simulatorImpactText = `Cuidado: Essa simulação reduz sua proteção ou liquidez, diminuindo seu Score em ${Math.abs(scoreDiff)} pontos. Priorize manter uma reserva firme para cobrir seus custos fixos diários.`;
  } else {
    simulatorImpactText = "Ajuste os controles deslizantes ao lado para simular o impacto financeiro direto de decisões estratégicas em sua saúde geral.";
  }

  // Dynamic Local Action Items
  const localActionItems = [];
  if (diagnosis?.score && diagnosis.score < 70) {
    localActionItems.push({
      id: "reserva",
      title: `Alcançar reserva de R$ ${(baselineExpense * simRequiredReserveMonths).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
      description: `Garante a blindagem de até ${simRequiredReserveMonths} meses de suas contas sob a situação de ${situationOptions.find(o => o.value === situation)?.label || situation}.`,
      priority: "urgente",
      actionLabel: "Ver Cofrinhos",
      actionTab: "piggy_banks"
    });
  }
  if (totalDebt > 0) {
    localActionItems.push({
      id: "amortizar",
      title: "Planejar amortização de dívidas pendentes",
      description: `Atualmente consome R$ ${monthlyDebtPayment.toLocaleString("pt-BR")} mensalmente (${(debtCompromiseRate || 0).toFixed(0)}% da renda).`,
      priority: "urgente",
      actionLabel: "Gerenciar Dívidas",
      actionTab: "debts"
    });
  }
  if (budgets.length === 0) {
    localActionItems.push({
      id: "orcamento",
      title: "Definir limites de Orçamentos",
      description: "Planejar limites de teto de gastos por categorias para segurar saídas supérfluas.",
      priority: "importante",
      actionLabel: "Criar Limites",
      actionTab: "budgeting"
    });
  }
  if (transactions.filter(t => !t.category || t.category === "Outros").length > 2) {
    localActionItems.push({
      id: "categorizacao",
      title: "Revisar transações sem categoria específica",
      description: "Ajuda na precisão analítica do consultor em identificar vazamentos ocultos de caixa.",
      priority: "recomendado",
      actionLabel: "Ver Extrato",
      actionTab: "statement"
    });
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-blue-600 animate-pulse" />
            Diagnóstico Financeiro Inteligente
          </h1>
          <p className="text-gray-500 mt-1">
            Seu consultor pessoal automatizado e simulador avançado de saúde de caixa.
          </p>
        </div>
        <div className="text-xs text-gray-400 font-mono bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 flex items-center gap-1.5 self-start">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          DADOS 100% INTEGRADOS
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            activeSubTab === "overview"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Activity className="w-4 h-4" />
          Painel Geral
        </button>
        <button
          onClick={() => setActiveSubTab("profile")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all relative ${
            activeSubTab === "profile"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <User className="w-4 h-4" />
          Perfil do Consultor
          {!financialProfile && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("actions")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            activeSubTab === "actions"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Target className="w-4 h-4" />
          Plano de Ação
          {localActionItems.length > 0 && (
            <span className="ml-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {localActionItems.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("simulator")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            activeSubTab === "simulator"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Simulador "E Se..."
        </button>
      </div>

      {/* Main Content Areas */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          {/* OVERVIEW TAB */}
          {activeSubTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Circle Card */}
                <div className={`lg:col-span-2 p-8 rounded-3xl border ${diagnosis ? getScoreBg(diagnosis.score) : 'bg-white border-gray-100'} shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
                  <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="84"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        className="text-gray-100/70"
                      />
                      <motion.circle
                        cx="96"
                        cy="96"
                        r="84"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeDasharray={527.7}
                        initial={{ strokeDashoffset: 527.7 }}
                        animate={{ strokeDashoffset: 527.7 - (527.7 * (diagnosis?.score || 60)) / 100 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className={diagnosis ? getScoreColor(diagnosis.score) : 'text-blue-500'}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className={`text-5xl font-black ${diagnosis ? getScoreColor(diagnosis.score) : 'text-slate-900'}`}>
                        {diagnosis?.score || 60}
                      </span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Saúde Geral</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded-lg uppercase tracking-wider mb-2">
                        <Award className="w-3.5 h-3.5" />
                        Nível {getLevelLabel(diagnosis?.level || "iniciante")}
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        {diagnosis ? getLevelLabel(diagnosis.level) : "Calculando seu nível..."}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                        Seu score financeiro reflete sua saúde e hábitos de caixa consolidados de contas, investimentos, dívidas e orçamentos.
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      <button 
                        onClick={() => refreshDiagnosis()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-700 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Sincronizar Dados
                      </button>
                      <button 
                        onClick={handleGenerateAIDiagnosis}
                        disabled={isGeneratingAI || !diagnosis}
                        className="flex items-center gap-2 px-4.5 py-2.5 bg-blue-600 rounded-xl text-xs font-black text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <BrainCircuit className="w-4 h-4" />
                        Recalcular IA
                      </button>
                    </div>
                  </div>
                </div>

                {/* Score Progress Graph */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <TrendingUp className="w-4.5 h-4.5 text-blue-500" />
                      Evolução de Saúde
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Histórico dos seus últimos scores salvos.</p>
                  </div>
                  <div className="h-32 flex items-end gap-2.5 pt-4">
                    {scoreHistory.slice(-6).map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        <div className="w-full bg-gray-50 rounded-t-lg h-24 flex items-end">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${h.score}%` }}
                            className={`w-full rounded-t-lg transition-all group-hover:opacity-85 bg-blue-500`}
                          />
                        </div>
                        <div className="absolute -top-6 bg-gray-900 text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none font-bold">
                          {h.score}
                        </div>
                        <span className="text-[9px] text-gray-400 font-bold whitespace-nowrap">
                          {new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    ))}
                    {scoreHistory.length === 0 && (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-1 py-6">
                        <Info className="w-5 h-5 text-gray-300" />
                        Sem histórico
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning/Missing Info banner */}
              {(!financialProfile || missingInfo.length > 0) && (
                <div className="bg-amber-50 border border-amber-200/60 p-5 rounded-3xl flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-amber-900">Configuração de dados pendente detectada</h4>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Seu diagnóstico de consultor se beneficia ao máximo de dados reais de contas, limites e do seu perfil de atividade. Adicione os seguintes dados para elevar a precisão de suas recomendações automáticas:
                    </p>
                    <ul className="text-xs text-amber-800 list-disc list-inside mt-2 space-y-1 font-medium">
                      {!financialProfile && (
                        <li>Situação de emprego: Diga se é CLT, Autônomo, Desempregado ou Estudante no <button onClick={() => setActiveSubTab("profile")} className="underline font-bold hover:text-amber-900">Perfil</button>.</li>
                      )}
                      {missingInfo.map((info, idx) => (
                        <li key={idx}>{info}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Strengths, Weaknesses, Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Strengths */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-gray-950 text-sm">Pontos Fortes</h3>
                  </div>
                  <div className="space-y-2.5">
                    {diagnosis?.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 bg-emerald-500/[0.03] rounded-2xl border border-emerald-500/5">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <p className="text-xs text-gray-700 font-medium leading-relaxed">{s}</p>
                      </div>
                    ))}
                    {(!diagnosis || diagnosis.strengths.length === 0) && (
                      <p className="text-xs text-gray-400 italic">Preencha despesas ou metas positivas para destravar pontos fortes.</p>
                    )}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-gray-950 text-sm">Pontos de Atenção</h3>
                  </div>
                  <div className="space-y-2.5">
                    {diagnosis?.weaknesses.map((w, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 bg-rose-500/[0.03] rounded-2xl border border-rose-500/5">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <p className="text-xs text-gray-700 font-medium leading-relaxed">{w}</p>
                      </div>
                    ))}
                    {(!diagnosis || diagnosis.weaknesses.length === 0) && (
                      <p className="text-xs text-gray-400 italic">Excelente! Nenhum ponto crítico identificado.</p>
                    )}
                  </div>
                </div>

                {/* Risks */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-gray-950 text-sm">Riscos Potenciais</h3>
                  </div>
                  <div className="space-y-2.5">
                    {diagnosis?.risks.map((r, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 bg-amber-500/[0.03] rounded-2xl border border-amber-500/5">
                        <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-700 font-medium leading-relaxed">{r}</p>
                      </div>
                    ))}
                    {(!diagnosis || diagnosis.risks.length === 0) && (
                      <p className="text-xs text-gray-400 italic">Nenhum risco detectado nas projeções atuais.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Expert Section */}
              <div className="bg-gradient-to-br from-[#06120c] to-[#040806] border border-emerald-500/10 p-8 rounded-3xl text-slate-900 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <BrainCircuit className="absolute -bottom-8 -right-8 w-44 h-44 text-emerald-500/10 -rotate-12" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <Star className="w-5 h-5" fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="font-black tracking-tight text-lg">Parecer Técnico da IA</h3>
                    <p className="text-xs text-emerald-400 font-mono">FINASSIST CONSULTANT AGENT v1.0</p>
                  </div>
                </div>

                <div className="space-y-5 relative z-10">
                  {aiAnalysis || diagnosis?.aiAnalysis ? (
                    <div className="space-y-5">
                      <p className="text-sm leading-relaxed text-gray-300">
                        {aiAnalysis?.analysis || diagnosis?.aiAnalysis}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-50">
                        {(aiAnalysis?.recommendations || diagnosis?.recommendations || []).slice(0, 4).map((rec: string, i: number) => (
                          <div key={i} className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-2xl border border-gray-50 text-xs text-gray-200">
                            <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-xs text-gray-400 max-w-lg mx-auto">
                        A Inteligência Artificial pode examinar em profundidade as nuances de suas metas, planos de vida estruturados e propor soluções cirúrgicas personalizadas para seu perfil.
                      </p>
                      <button 
                        onClick={handleGenerateAIDiagnosis}
                        disabled={isGeneratingAI}
                        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                      >
                        {isGeneratingAI ? "Gerando Análise..." : "Gerar Diagnóstico IA Completo"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Badges Section */}
              <section className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-gray-950 tracking-tight flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      Minhas Insígnias
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Metas alcançadas de estabilidade e maestria financeira.</p>
                  </div>
                  <span className="text-xs font-bold text-gray-500">
                    {userBadges.length} de {availableBadges.length} conquistadas
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {availableBadges.map((badge) => {
                    const isUnlocked = userBadges.some(ub => ub.badgeId === badge.id);
                    const unlockedDate = userBadges.find(ub => ub.badgeId === badge.id)?.unlockedAt;

                    return (
                      <motion.div
                        key={badge.id}
                        whileHover={{ y: -3 }}
                        className={`p-5 rounded-3xl border transition-all text-center flex flex-col items-center gap-2.5 ${
                          isUnlocked 
                            ? 'bg-white border-amber-100 shadow-sm' 
                            : 'bg-gray-50/50 border-gray-100 opacity-50 grayscale'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isUnlocked ? 'bg-amber-50 text-amber-500' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <Award className="w-7 h-7" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs leading-tight">{badge.name}</h4>
                          <p className="text-[10px] text-gray-400 mt-1 leading-normal">{badge.description}</p>
                        </div>
                        {isUnlocked && unlockedDate && (
                          <div className="mt-auto pt-2 border-t border-amber-50/50 w-full">
                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-wider">
                              {new Date(unlockedDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeSubTab === "profile" && (
            <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm max-w-3xl mx-auto">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-50 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg tracking-tight">Configurar Perfil do Consultor</h3>
                  <p className="text-xs text-gray-500">Forneça os detalhes da sua situação de vida para análises sob medida.</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Situation Dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Situação Atual</label>
                    <select
                      value={situation}
                      onChange={(e) => setSituation(e.target.value)}
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                    >
                      {situationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Activity Area */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Área de Atuação</label>
                    <input
                      type="text"
                      value={activityArea}
                      onChange={(e) => setActivityArea(e.target.value)}
                      placeholder="Ex: Vendas, TI, Saúde, Construção"
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                    />
                  </div>

                  {/* Main Income */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Renda Principal Líquida (R$)</label>
                    <input
                      type="number"
                      value={mainIncome}
                      onChange={(e) => setMainIncome(Number(e.target.value))}
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                    />
                  </div>

                  {/* Other Income */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Rendas Extras Médias (R$)</label>
                    <input
                      type="number"
                      value={otherIncome}
                      onChange={(e) => setOtherIncome(Number(e.target.value))}
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                    />
                  </div>

                  {/* Income Stability */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Grau de Estabilidade</label>
                    <select
                      value={incomeStability}
                      onChange={(e) => setIncomeStability(e.target.value as "baixa" | "media" | "alta")}
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                    >
                      <option value="baixa">Baixa (Altamente Variável, Comissões)</option>
                      <option value="media">Média (Fixo com flutuações sazonais)</option>
                      <option value="alta">Alta (Contrato Fixo Estável, Concurso)</option>
                    </select>
                  </div>

                  {/* Dependents */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Número de Dependentes</label>
                    <input
                      type="number"
                      value={dependentsCount}
                      onChange={(e) => setDependentsCount(Number(e.target.value))}
                      className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Has emergency reserve toggle */}
                <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Possui Reserva Salva Específica?</h4>
                      <p className="text-[10px] text-gray-400">Marque se você possui uma quantia guardada fora das contas cotidianas.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={hasReserve}
                      onChange={(e) => setHasReserve(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-200 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>

                  {hasReserve && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex flex-col gap-1.5 pt-2 border-t border-gray-100"
                    >
                      <label className="text-[10px] font-black text-gray-600 uppercase">Valor Atual Guardado da Reserva (R$)</label>
                      <input
                        type="number"
                        value={reserveAmount}
                        onChange={(e) => setReserveAmount(Number(e.target.value))}
                        className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Main Objective */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-gray-700 uppercase tracking-wider">Objetivo Financeiro Principal</label>
                  <input
                    type="text"
                    value={mainGoal}
                    onChange={(e) => setMainGoal(e.target.value)}
                    placeholder="Ex: Quitar dívida, comprar veículo, independência"
                    className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400">Você pode modificar estes dados livremente a qualquer momento.</p>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-blue-600/10 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Salvar e Recalcular
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Success Notification */}
              {showProfileSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-100/50 flex items-center gap-2.5"
                >
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                  Perfil atualizado com sucesso! Diagnóstico reavaliado.
                </motion.div>
              )}
            </div>
          )}

          {/* ACTIONS TAB */}
          {activeSubTab === "actions" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-gray-950 tracking-tight">Roteiro Inteligente de Prioridades</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Seu plano de ação gerado deterministicamente a partir do seu fluxo de caixa e pendências.</p>
                </div>
                <div className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                  {localActionItems.length} recomendações em andamento
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {localActionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center ${
                        item.priority === "urgente"
                          ? "bg-rose-50 text-rose-500 border border-rose-100"
                          : item.priority === "importante"
                          ? "bg-amber-50 text-amber-500 border border-amber-100"
                          : "bg-blue-50 text-blue-500 border border-blue-100"
                      }`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-black text-slate-900 text-sm leading-snug">{item.title}</h4>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            item.priority === "urgente"
                              ? "bg-rose-500/10 text-rose-600"
                              : item.priority === "importante"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-blue-500/10 text-blue-600"
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">{item.description}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        // Global window function or routing can be placed here to navigate to active module
                        if (typeof window !== "undefined" && (window as any).setActiveTab) {
                          (window as any).setActiveTab(item.actionTab);
                        } else {
                          // Standard fallback: update location hash or notify
                          window.location.hash = `#/${item.actionTab}`;
                          // Direct refresh warning or instructions
                          ((window as any).mostrarMensagem || window.alert)(`Navegue até a guia "${item.actionLabel}" no menu lateral para executar.`);
                        }
                      }}
                      className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 self-end md:self-auto border border-gray-150"
                    >
                      {item.actionLabel}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {localActionItems.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-sm">Finanças perfeitamente organizadas!</h4>
                      <p className="text-xs text-gray-400 max-w-sm">Você não possui prioridades críticas abertas de orçamentos ou reservas pendentes no momento.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SIMULATOR TAB */}
          {activeSubTab === "simulator" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sliders Configuration */}
              <div className="lg:col-span-2 bg-white p-7 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-black text-gray-950 tracking-tight flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-500" />
                    Configurar Cenário de Simulação "E Se..."
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Altere os controles para simular o impacto direto das decisões nas suas métricas de saúde.</p>
                </div>

                <div className="space-y-6">
                  {/* Slider 1: Redução de Despesas */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-gray-700 uppercase tracking-wider">Reduzir Gastos Mensais</span>
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                        - R$ {simExpenseReduction.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.min(10000, Math.round(baselineExpense))}
                      step="100"
                      value={simExpenseReduction}
                      onChange={(e) => setSimExpenseReduction(Number(e.target.value))}
                      className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                      <span>R$ 0</span>
                      <span>Max economizável: R$ {Math.round(baselineExpense).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Slider 2: Aumento de Renda */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-gray-700 uppercase tracking-wider">Aumentar Renda Principal / Extra</span>
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        + R$ {simIncomeIncrease.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15000"
                      step="200"
                      value={simIncomeIncrease}
                      onChange={(e) => setSimIncomeIncrease(Number(e.target.value))}
                      className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                      <span>R$ 0</span>
                      <span>R$ 15.000+</span>
                    </div>
                  </div>

                  {/* Slider 3: Amortização de Dívidas */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-gray-700 uppercase tracking-wider">Amortizar Parcelas Mensais de Dívidas</span>
                      <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                        Amortizar R$ {simDebtPaymentAmortization.toLocaleString("pt-BR")} / mês
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.round(monthlyDebtPayment)}
                      step="50"
                      value={simDebtPaymentAmortization}
                      onChange={(e) => setSimDebtPaymentAmortization(Number(e.target.value))}
                      className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                      <span>R$ 0</span>
                      <span>Max comprometimento: R$ {Math.round(monthlyDebtPayment).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Slider 4: Aporte na Reserva */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-gray-700 uppercase tracking-wider">Aporte Extra na Reserva de Emergência</span>
                      <span className="font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                        + R$ {simReserveIncrease.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="500"
                      value={simReserveIncrease}
                      onChange={(e) => setSimReserveIncrease(Number(e.target.value))}
                      className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                      <span>R$ 0</span>
                      <span>R$ 50.000+</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
                  <Info className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    A simulação é apenas para visualização e planejamento imediato, sem salvar dados falsos na sua base real.
                  </span>
                </div>
              </div>

              {/* Simulators Results Panel */}
              <div className="bg-gradient-to-b from-gray-900 to-[#121915] text-slate-900 p-7 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-black tracking-wider uppercase text-emerald-400">Resultado Simulado</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Veja a projeção instantânea sob o novo cenário.</p>
                  </div>

                  {/* Simulated Score display */}
                  <div className="flex items-center gap-5 bg-white/5 p-4 rounded-3xl border border-gray-50">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-black text-emerald-400 border border-gray-50">
                      {simulatedScore}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-300 uppercase tracking-wide">Novo Score Previsto</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-lg font-black text-slate-900">
                          {getLevelLabel(simulatedScore >= 85 ? "expert" : simulatedScore >= 70 ? "avancado" : simulatedScore >= 45 ? "intermediario" : "iniciante")}
                        </span>
                        {simulatedScore - (diagnosis?.score || 60) !== 0 && (
                          <span className={`text-xs font-black px-1.5 py-0.5 rounded ${
                            simulatedScore >= (diagnosis?.score || 60) ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {simulatedScore >= (diagnosis?.score || 60) ? "+" : ""}
                            {simulatedScore - (diagnosis?.score || 60)} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comparison metrics */}
                  <div className="space-y-3.5 pt-2">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Métricas Comparativas</h4>
                    
                    {/* Savings Rate metric */}
                    <div className="flex justify-between items-center pb-2.5 border-b border-gray-50">
                      <div>
                        <span className="text-xs text-gray-300 font-bold">Taxa de Poupança</span>
                        <p className="text-[9px] text-gray-500">Recomendado: &gt; 15%</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-black ${simSavingsRate > 15 ? "text-emerald-400" : "text-amber-400"}`}>
                          {simSavingsRate.toFixed(0)}%
                        </span>
                        <p className="text-[9px] text-gray-500">Antes: {(savingsRate || 0).toFixed(0)}%</p>
                      </div>
                    </div>

                    {/* Debt compromiso metric */}
                    <div className="flex justify-between items-center pb-2.5 border-b border-gray-50">
                      <div>
                        <span className="text-xs text-gray-300 font-bold">Comprometimento de Renda</span>
                        <p className="text-[9px] text-gray-500">Recomendado: &lt; 20%</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-black ${simDebtCompromise < 20 ? "text-emerald-400" : "text-rose-400"}`}>
                          {simDebtCompromise.toFixed(0)}%
                        </span>
                        <p className="text-[9px] text-gray-500">Antes: {(debtCompromiseRate || 0).toFixed(0)}%</p>
                      </div>
                    </div>

                    {/* Reserve coverage metric */}
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs text-gray-300 font-bold">Cobertura da Reserva</span>
                        <p className="text-[9px] text-gray-500">Alvo ideal: {simRequiredReserveMonths} meses</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-black ${simReserveCover >= simRequiredReserveMonths ? "text-emerald-400" : "text-amber-400"}`}>
                          {simReserveCover.toFixed(1)} meses
                        </span>
                        <p className="text-[9px] text-gray-500">Antes: {(emergencyReserveCoverMonths || 0).toFixed(1)} m</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Impact textual helper */}
                <div className="bg-white/[0.03] p-4.5 rounded-2xl border border-gray-50 text-xs text-gray-300 leading-relaxed mt-6">
                  {simulatorImpactText}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FinancialDiagnosis;
