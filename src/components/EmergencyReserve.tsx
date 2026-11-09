import React, { useState, useEffect, useMemo } from "react";
import { formatCurrency, cn, parseCurrencyInput, formatDate } from "../lib/utils";
import { 
  ShieldCheck, Plus, AlertCircle, TrendingUp, TrendingDown, Calculator, 
  Sparkles, Zap, ShieldAlert, Info, ArrowRight, Clock, Target, Heart, 
  CheckCircle2, ArrowDownLeft, ArrowUpRight, History, Trash2, Wallet, 
  Landmark, Calendar, X, PiggyBank, Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Transaction, Debt, UserProfile, FamilyMember, Account, Goal } from "../types";
import { analyzeFinancialProtection } from "../services/geminiService";
import { calculateFinancialProtection } from "../lib/financialCalculations";

import { useTransacoes } from "../context/TransacoesContext";
import { useContas } from "../context/ContasContext";
import { useDebts } from "../context/DebtsContext";
import { useMetas } from "../context/MetasContext";
import { transacoes } from "../modules/transacoesModule";

interface EmergencyReserveProps {
  userProfile: UserProfile;
  family: FamilyMember[];
}

export interface EmergencyContribution {
  id: string;
  value: number;
  date: string;
  destAccountId: string;
  destAccountName: string;
  originAccountId?: string;
  originAccountName?: string;
  description: string;
  transactionId?: string;
  createdAt: string;
}

const EMERGENCY_CONTRIBUTIONS_KEY = "finance_local_emergency_contributions_v1";

function getStoredContributions(): EmergencyContribution[] {
  try {
    const raw = localStorage.getItem(EMERGENCY_CONTRIBUTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Notice: loading emergency contributions:", e);
  }
  return [];
}

function saveStoredContributions(list: EmergencyContribution[]) {
  try {
    localStorage.setItem(EMERGENCY_CONTRIBUTIONS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("emergency_contributions_changed"));
  } catch (e) {
    console.warn("Notice: saving emergency contributions:", e);
  }
}

export const EmergencyReserve: React.FC<EmergencyReserveProps> = ({ userProfile, family }) => {
  const { transactions } = useTransacoes();
  const { accounts, addAccount } = useContas();
  const { debts } = useDebts();
  const { goals, createGoal, updateGoal, addContribution } = useMetas();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showAporteModal, setShowAporteModal] = useState(false);
  const [simulationScenario, setSimulationScenario] = useState<"perda_renda" | "aumento_despesas" | "divida_inesperada">("perda_renda");

  // Local contributions state
  const [contributions, setContributions] = useState<EmergencyContribution[]>(getStoredContributions);

  // Aporte Form State
  const [aporteValue, setAporteValue] = useState<string>("");
  const [selectedDestAccountId, setSelectedDestAccountId] = useState<string>("");
  const [selectedOriginAccountId, setSelectedOriginAccountId] = useState<string>("");
  const [aporteDate, setAporteDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [aporteDescription, setAporteDescription] = useState<string>("Aporte na Reserva de Emergência");
  const [syncWithMetas, setSyncWithMetas] = useState<boolean>(true);
  const [isSavingAporte, setIsSavingAporte] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Plan Form State
  const [planMonths, setPlanMonths] = useState<number>(12);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  // Listen for local contributions changes
  useEffect(() => {
    const handleSync = () => {
      setContributions(getStoredContributions());
    };
    window.addEventListener("emergency_contributions_changed", handleSync);
    return () => window.removeEventListener("emergency_contributions_changed", handleSync);
  }, []);

  // 1. CÁLCULOS AUTOMÁTICOS
  const stats = useMemo(() => calculateFinancialProtection(accounts, transactions, debts, userProfile, family), [accounts, transactions, debts, userProfile, family]);
  const { currentReserve, monthlyExpenses, idealMonths, targetValue, monthsCovered, securityScore, daysSurvival } = stats;

  const reserveProgress = targetValue > 0 ? Math.min(100, Math.round((currentReserve / targetValue) * 100)) : 0;
  const remainingTarget = Math.max(0, targetValue - currentReserve);

  const essentialExpenses = useMemo(() => {
    const essentialCategories = ["Moradia", "Alimentação", "Saúde", "Transporte", "Educação", "Serviços Essenciais"];
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const essential = transactions
      .filter(t => t.type === "expense" && new Date(t.date) >= last30Days && (t.essential || essentialCategories.includes(t.category)))
      .reduce((acc, curr) => acc + curr.value, 0);
    
    return essential || (monthlyExpenses * 0.7);
  }, [transactions, monthlyExpenses]);

  const securityLevel = useMemo(() => {
    if (securityScore <= 30) return { label: "Crítico", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
    if (securityScore <= 60) return { label: "Risco", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    if (securityScore <= 80) return { label: "Estável", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" };
    return { label: "Seguro", color: "text-primary-green", bg: "bg-primary-green/10", border: "border-primary-green/20" };
  }, [securityScore]);

  // Pre-select reserve account when opening modal
  const openAporteModal = () => {
    const defaultReserveAcc = accounts.find(a => 
      /reserva|emerg[eê]ncia/i.test(a.name || "") || 
      a.type === "investimento" || 
      a.type === "poupanca" ||
      a.type === "digital"
    );

    if (defaultReserveAcc) {
      setSelectedDestAccountId(defaultReserveAcc.id);
    } else if (accounts.length > 0) {
      setSelectedDestAccountId(accounts[0].id);
    } else {
      setSelectedDestAccountId("NEW_ACCOUNT");
    }

    // Default origin to first checking account if available
    const defaultOriginAcc = accounts.find(a => a.type === "corrente" || a.type === "banco");
    setSelectedOriginAccountId(defaultOriginAcc?.id || "");

    setAporteValue("");
    setAporteDate(new Date().toISOString().split("T")[0]);
    setAporteDescription("Aporte na Reserva de Emergência");
    setFeedbackMsg(null);
    setShowAporteModal(true);
  };

  const fetchedRef = React.useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchAnalysis = async () => {
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeFinancialProtection({
          currentReserve,
          monthlyExpenses,
          essentialExpenses,
          debts,
          income: userProfile?.onboardingData?.monthlyIncome || 0,
          incomeType: userProfile?.onboardingData?.incomeType || "fixa",
          dependents: family.length,
          riskTolerance: userProfile?.onboardingData?.riskTolerance || "moderado"
        });
        setAiAnalysis(analysis);
      } catch (err) {
        console.warn("Notice analyzing emergency reserve:", err);
      } finally {
        setIsAnalyzing(false);
      }
    };

    fetchAnalysis();
  }, [currentReserve, monthlyExpenses, essentialExpenses, debts.length, family.length]);

  // Submeter Aporte
  const handleSaveAporte = async (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseCurrencyInput(aporteValue);

    if (numValue <= 0) {
      setFeedbackMsg({ type: "error", text: "Por favor, informe um valor de aporte válido maior que zero." });
      return;
    }

    setIsSavingAporte(true);
    setFeedbackMsg(null);

    try {
      let targetAccountId = selectedDestAccountId;
      let targetAccountName = "";

      const activeUid = userProfile?.uid || "default_user";

      // Se usuário escolheu criar uma conta dedicada para a reserva
      if (selectedDestAccountId === "NEW_ACCOUNT" || !selectedDestAccountId) {
        const newAcc = await addAccount({
          name: "Reserva de Emergência",
          institution: "Tesouro / CDB 100% CDI",
          type: "investimento",
          balance: 0,
          initialBalance: 0,
          color: "#10B981",
          icon: "shield-check",
          isDefault: false,
          active: true,
          notes: "Conta dedicada à Reserva de Emergência e Segurança",
          createdAt: new Date().toISOString()
        });
        if (newAcc) {
          targetAccountId = newAcc.id;
          targetAccountName = newAcc.name;
        } else {
          targetAccountId = "reserva_auto_id";
          targetAccountName = "Reserva de Emergência";
        }
      } else {
        const found = accounts.find(a => a.id === selectedDestAccountId);
        targetAccountName = found ? found.name : "Conta de Reserva";
      }

      let originAccountName: string | undefined = undefined;
      let registeredTx: any = null;

      // Se houver conta de origem selecionada (Transferência da Conta Corrente para a Reserva)
      if (selectedOriginAccountId && selectedOriginAccountId !== targetAccountId) {
        const originAcc = accounts.find(a => a.id === selectedOriginAccountId);
        originAccountName = originAcc?.name;

        registeredTx = await transacoes.registrarTransacao({
          userId: activeUid,
          title: "Aporte na Reserva de Emergência",
          type: "transfer",
          value: numValue,
          date: aporteDate,
          accountId: selectedOriginAccountId,
          toAccountId: targetAccountId,
          category: "Investimentos",
          description: aporteDescription || "Aporte na Reserva de Emergência",
          essential: true,
          emotion: "racional",
          createdAt: new Date().toISOString()
        });
      } else {
        // Depósito direto / externo na conta da reserva
        registeredTx = await transacoes.registrarTransacao({
          userId: activeUid,
          title: "Aporte na Reserva de Emergência",
          type: "income",
          value: numValue,
          date: aporteDate,
          accountId: targetAccountId,
          category: "Investimentos",
          description: aporteDescription || "Aporte na Reserva de Emergência",
          essential: true,
          emotion: "racional",
          createdAt: new Date().toISOString()
        });
      }

      // 3. Salvar histórico de aportes da reserva
      const newContribution: EmergencyContribution = {
        id: `ec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        value: numValue,
        date: aporteDate,
        destAccountId: targetAccountId,
        destAccountName: targetAccountName,
        originAccountId: selectedOriginAccountId || undefined,
        originAccountName: originAccountName,
        description: aporteDescription || "Aporte na Reserva de Emergência",
        transactionId: registeredTx?.id,
        createdAt: new Date().toISOString()
      };

      const updatedContributions = [newContribution, ...getStoredContributions()];
      saveStoredContributions(updatedContributions);
      setContributions(updatedContributions);

      // 4. Sincronizar com Meus Objetivos se marcado
      if (syncWithMetas) {
        try {
          const existingReserveGoal = goals.find(g => 
            g.category === "reserva" || 
            /reserva/i.test(g.name || "")
          );

          if (existingReserveGoal) {
            await addContribution(
              existingReserveGoal.id, 
              numValue, 
              "manual", 
              aporteDescription || "Aporte Reserva de Emergência"
            );
          } else {
            await createGoal({
              name: "Reserva de Emergência",
              targetValue: targetValue > 0 ? targetValue : (monthlyExpenses > 0 ? monthlyExpenses * 6 : 0),
              currentValue: numValue,
              category: "reserva",
              priority: "alta",
              deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              status: "active",
              description: "Proteção financeira e segurança familiar"
            });
          }
        } catch (goalErr) {
          console.warn("Aviso na sincronização de meta da reserva:", goalErr);
        }
      }

      // Notificar todas as telas sobre atualização de contas
      window.dispatchEvent(new CustomEvent("local_accounts_changed"));
      window.dispatchEvent(new CustomEvent("local_transactions_changed"));

      setFeedbackMsg({
        type: "success",
        text: `Aporte de ${formatCurrency(numValue)} registrado com sucesso! Sua reserva foi atualizada.`
      });

      setTimeout(() => {
        setShowAporteModal(false);
        setFeedbackMsg(null);
      }, 1200);
    } catch (err) {
      console.error("Erro ao registrar aporte:", err);
      setFeedbackMsg({ type: "error", text: "Erro ao processar o aporte. Tente novamente." });
    } finally {
      setIsSavingAporte(false);
    }
  };

  // Excluir Aporte
  const handleDeleteContribution = (id: string) => {
    const filtered = contributions.filter(c => c.id !== id);
    saveStoredContributions(filtered);
    setContributions(filtered);
  };

  // Ativar Plano Automático
  const handleCreateAutoPlan = async () => {
    setIsCreatingPlan(true);
    try {
      const calculatedTarget = monthlyExpenses * planMonths;
      const existingGoal = goals.find(g => g.category === "reserva" || /reserva/i.test(g.name || ""));

      if (existingGoal) {
        await updateGoal(existingGoal.id, {
          targetValue: calculatedTarget,
          status: "active",
          deadline: new Date(Date.now() + planMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        });
      } else {
        await createGoal({
          name: "Reserva de Emergência",
          targetValue: calculatedTarget,
          currentValue: currentReserve,
          category: "reserva",
          priority: "alta",
          deadline: new Date(Date.now() + planMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "active",
          description: `Meta de proteção financeira para cobrir ${planMonths} meses de custo de vida.`
        });
      }

      setShowPlan(false);
    } catch (err) {
      console.error("Erro ao criar plano automático:", err);
    } finally {
      setIsCreatingPlan(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto px-4 md:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Reserva de Emergência
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider border border-emerald-200">
              Proteção Ativa
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Planejamento inteligente, segurança financeira e cobertura contra imprevistos
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button 
            onClick={() => setShowSimulator(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white text-slate-700 border border-slate-200/80 rounded-2xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
          >
            <Zap size={15} className="text-amber-500" />
            <span>Simular Crise</span>
          </button>
          <button 
            onClick={openAporteModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#10B981] text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-600/20 hover:bg-[#059669] transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Novo Aporte</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Card - Financial Security Score & Reserve Status */}
          <div className="bg-white rounded-4xl p-6 md:p-8 border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.03)] relative overflow-hidden">
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Score de Proteção Financeira
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <h2 className="text-5xl md:text-6xl font-black text-slate-900">{securityScore}</h2>
                  <span className="text-lg font-bold text-slate-300">/100</span>
                </div>
                
                <div className={cn(
                  "mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider",
                  securityLevel.bg, securityLevel.color, securityLevel.border, "border"
                )}>
                  <ShieldCheck size={14} strokeWidth={2.5} />
                  <span>Nível: {securityLevel.label}</span>
                </div>

                <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Reserva Atual Guardada</span>
                    <span className="font-black text-emerald-600 text-sm">{formatCurrency(currentReserve)}</span>
                  </div>
                  <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-700" 
                      style={{ width: `${reserveProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                    <span>{reserveProgress}% da meta atingida</span>
                    <span>Meta: {formatCurrency(targetValue)}</span>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-500 leading-relaxed font-medium">
                  {securityScore < 60 
                    ? "Sua reserva ainda está em formação. Recomendamos fazer aportes regulares para atingir a meta ideal de segurança." 
                    : "Parabéns! Sua base de segurança financeira está sólida e cobrindo os custos vitais da sua rotina."}
                </p>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="88" cy="88" r="74" 
                      stroke="currentColor" 
                      strokeWidth="12" 
                      fill="transparent" 
                      className="text-slate-100" 
                    />
                    <motion.circle 
                      cx="88" cy="88" r="74" 
                      stroke="currentColor" 
                      strokeWidth="12" 
                      fill="transparent" 
                      strokeDasharray={464.7}
                      initial={{ strokeDashoffset: 464.7 }}
                      animate={{ strokeDashoffset: 464.7 - (464.7 * securityScore) / 100 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={cn(securityLevel.color)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <ShieldCheck size={36} className={cn(securityLevel.color)} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      Cobertura
                    </span>
                    <span className="text-base font-black text-slate-800">
                      {monthsCovered.toFixed(1)} meses
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={openAporteModal}
                  className="mt-4 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Aportar mais agora</span>
                </button>
              </div>
            </div>
            
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Clock size={19} />
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  Sobrevivência
                </span>
              </div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo de Cobertura Total</h4>
              <div className="mt-2 flex items-baseline gap-1.5">
                <p className="text-3xl font-black text-slate-900">{monthsCovered.toFixed(1)}</p>
                <p className="text-sm font-bold text-slate-400">meses garantidos</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                <TrendingUp size={14} className="text-emerald-600" />
                <span>{Math.round(daysSurvival)} dias de tranquilidade</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Target size={19} />
                </div>
                <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  Meta Ideal
                </span>
              </div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Ideal de Proteção</h4>
              <div className="mt-2 flex items-baseline gap-1">
                <p className="text-2xl font-black text-slate-900">{formatCurrency(targetValue)}</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Info size={14} className="text-blue-500" />
                <span>Recomendado: {idealMonths} meses de custo de vida</span>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Calculator size={18} className="text-emerald-600" />
              <span>Diagnóstico de Custo de Vida</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custo Mensal Médio</span>
                  <span className="text-sm font-black text-slate-900">{formatCurrency(monthlyExpenses)}</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 w-full" />
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  Média de despesas reais detectadas no sistema nos últimos 30 dias.
                </p>
              </div>
              <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Custo Essencial (Sobrevivência)</span>
                  <span className="text-sm font-black text-emerald-700">{formatCurrency(essentialExpenses)}</span>
                </div>
                <div className="h-2 w-full bg-emerald-200/70 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600" 
                    style={{ width: `${Math.min(100, (essentialExpenses / (monthlyExpenses || 1)) * 100)}%` }} 
                  />
                </div>
                <p className="text-[10px] text-emerald-700 leading-relaxed font-medium">
                  Gastos inadiáveis (moradia, alimentação, saúde) para manter sua família segura.
                </p>
              </div>
            </div>
          </div>

          {/* Histórico Recente de Aportes */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Histórico de Aportes na Reserva</h3>
              </div>
              <button 
                onClick={openAporteModal}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>Adicionar Aporte</span>
              </button>
            </div>

            {contributions.length === 0 ? (
              <div className="py-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                <PiggyBank size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Nenhum aporte registrado ainda</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                  Clique em "Novo Aporte" no topo para começar a construir ou reforçar sua reserva de emergência.
                </p>
                <button
                  onClick={openAporteModal}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Fazer Primeiro Aporte
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {contributions.slice(0, 5).map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <ArrowDownLeft size={16} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.description}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {formatDate(item.date)} · Destino: <span className="font-semibold text-slate-600">{item.destAccountName}</span>
                          {item.originAccountName && (
                            <span> (Origem: {item.originAccountName})</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-emerald-600">
                        +{formatCurrency(item.value)}
                      </span>
                      <button 
                        onClick={() => handleDeleteContribution(item.id)}
                        className="text-slate-300 hover:text-red-500 p-1 transition-colors cursor-pointer"
                        title="Remover do histórico"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* IA Protection Analysis */}
          <div className="bg-gradient-to-br from-[#064E3B] to-[#043327] rounded-4xl p-6 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-200">
                  <Sparkles size={18} className="text-emerald-300" />
                  <span>IA Consultora de Proteção</span>
                </h3>
                <span className="text-[9px] font-black uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full text-emerald-200">
                  Tempo Real
                </span>
              </div>
              
              {isAnalyzing ? (
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="w-8 h-8 border-3 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Analisando Riscos...</p>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <ShieldAlert size={12} />
                      <span>Alerta de Segurança</span>
                    </p>
                    <ul className="space-y-1.5">
                      {aiAnalysis.alerts?.slice(0, 2).map((alert: string, i: number) => (
                        <li key={i} className="text-[11px] text-emerald-50 leading-relaxed">
                          • {alert}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                    <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <Target size={12} />
                      <span>Plano de Ação Recomendado</span>
                    </p>
                    <ul className="space-y-1.5">
                      {aiAnalysis.recommendations?.slice(0, 2).map((rec: string, i: number) => (
                        <li key={i} className="text-[11px] text-emerald-50 leading-relaxed">
                          • {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-100/90 leading-relaxed font-medium">
                  Sua reserva de emergência deve ser mantida em aplicações de alta liquidez diária (como Tesouro Selic ou CDB 100% CDI) para resgate imediato sem penalidades.
                </p>
              )}
            </div>
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Automatic Plan Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" />
              <span>Plano da Reserva</span>
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Falta para a Meta</span>
                <span className="text-sm font-black text-amber-600">{formatCurrency(remainingTarget)}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sugestão de Aporte Mensal</p>
                <div className="flex items-baseline justify-between">
                  <p className="text-xl font-black text-slate-900">
                    {formatCurrency(remainingTarget > 0 ? remainingTarget / 12 : 0)}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">/mês (12 meses)</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Alcançando essa cota mensal, sua proteção total será completada em 1 ano.
                </p>
              </div>
              <button 
                onClick={() => setShowPlan(true)}
                className="w-full py-3 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Configurar Plano Automático
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Novo Aporte na Reserva */}
      <AnimatePresence>
        {showAporteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAporteModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                    <Plus size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Novo Aporte na Reserva</h3>
                    <p className="text-xs text-slate-500 font-medium">Aumente sua segurança financeira</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAporteModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {feedbackMsg && (
                <div className={cn(
                  "mt-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2",
                  feedbackMsg.type === "success" 
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                    : "bg-red-50 text-red-800 border border-red-200"
                )}>
                  {feedbackMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveAporte} className="space-y-4 mt-5">
                {/* Valor */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Valor do Aporte (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      R$
                    </span>
                    <input 
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={aporteValue}
                      onChange={(e) => setAporteValue(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black text-base focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                    />
                  </div>
                  {/* Quick Value Buttons */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[100, 250, 500, 1000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAporteValue(String(val))}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors cursor-pointer"
                      >
                        + R$ {val}
                      </button>
                    ))}
                    {remainingTarget > 0 && (
                      <button
                        type="button"
                        onClick={() => setAporteValue(String(Math.round(remainingTarget / 12)))}
                        className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Sugerido: R$ {Math.round(remainingTarget / 12)}
                      </button>
                    )}
                  </div>
                </div>

                {/* Conta de Destino da Reserva */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Conta de Destino (Onde a reserva fica guardada) *
                  </label>
                  <select
                    value={selectedDestAccountId}
                    onChange={(e) => setSelectedDestAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                  >
                    <option value="NEW_ACCOUNT">⭐ Criar Conta Dedicada 'Reserva de Emergência'</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.institution}) - Saldo: {formatCurrency(acc.balance || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conta de Origem (Opcional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Conta de Origem (De onde sai o dinheiro)
                  </label>
                  <select
                    value={selectedOriginAccountId}
                    onChange={(e) => setSelectedOriginAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                  >
                    <option value="">Depósito Externo / Sem Débito em Conta</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        Debitar de: {acc.name} (Saldo: {formatCurrency(acc.balance || 0)})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Se escolher debitar de uma conta, uma transferência será gerada debitando o saldo dela e creditando na reserva.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Data */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Data do Aporte
                    </label>
                    <input 
                      type="date"
                      value={aporteDate}
                      onChange={(e) => setAporteDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Descrição / Nota
                    </label>
                    <input 
                      type="text"
                      value={aporteDescription}
                      onChange={(e) => setAporteDescription(e.target.value)}
                      placeholder="Ex: Aporte mensal Reserva"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Sincronizar com Meus Objetivos */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-3">
                  <input 
                    type="checkbox"
                    id="syncMetasCheck"
                    checked={syncWithMetas}
                    onChange={(e) => setSyncWithMetas(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="syncMetasCheck" className="text-xs font-semibold text-emerald-900 cursor-pointer">
                    Atualizar meta de "Reserva de Emergência" em Meus Objetivos
                  </label>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button 
                    type="button"
                    onClick={() => setShowAporteModal(false)}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSavingAporte}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingAporte ? "Salvando..." : "Confirmar Aporte"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Configurar Plano Automático */}
      <AnimatePresence>
        {showPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPlan(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Target size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Plano da Reserva</h3>
                    <p className="text-xs text-slate-500 font-medium">Meta automática de proteção</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPlan(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 mt-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Meses de Custo de Vida Desejados
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[3, 6, 12, 18].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPlanMonths(m)}
                        className={cn(
                          "py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                          planMonths === m 
                            ? "bg-slate-900 text-white shadow-sm" 
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        )}
                      >
                        {m} meses
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Meta Calculada ({planMonths} meses):</span>
                    <span className="font-black text-slate-900">{formatCurrency(monthlyExpenses * planMonths)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Reserva Atual:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(currentReserve)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-700 font-bold">Aporte Mensal Sugerido:</span>
                    <span className="font-black text-emerald-700 text-sm">
                      {formatCurrency(Math.max(0, (monthlyExpenses * planMonths - currentReserve) / planMonths))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button 
                    type="button"
                    onClick={() => setShowPlan(false)}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button 
                    type="button"
                    onClick={handleCreateAutoPlan}
                    disabled={isCreatingPlan}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingPlan ? "Ativando..." : "Criar Meta de Reserva"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Crisis Simulator Modal */}
      <AnimatePresence>
        {showSimulator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSimulator(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-4xl p-6 md:p-8 shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Simulador de Crise</h3>
                    <p className="text-xs text-slate-500 font-medium">Teste sua resiliência financeira</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSimulator(false)} 
                  className="text-slate-400 hover:text-slate-900 p-1 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-2">
                  {(["perda_renda", "aumento_despesas", "divida_inesperada"] as const).map(scenario => (
                    <button
                      key={scenario}
                      onClick={() => setSimulationScenario(scenario)}
                      className={cn(
                        "flex-1 py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                        simulationScenario === scenario ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {scenario.replace("_", " ")}
                    </button>
                  ))}
                </div>

                <div className="p-6 rounded-3xl bg-red-50/70 border border-red-100 text-center">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Resultado da Simulação</p>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-4xl font-black text-slate-900">
                      {simulationScenario === "perda_renda" ? Math.round(daysSurvival) : 
                       simulationScenario === "aumento_despesas" ? Math.round(daysSurvival * 0.7) : 
                       Math.round(Math.max(0, (currentReserve - 5000) / (monthlyExpenses || 1) * 30))}
                    </p>
                    <p className="text-xs font-bold text-slate-500">dias de sobrevivência estimada</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-red-100">
                    <p className="text-xs text-red-800 leading-relaxed font-medium">
                      {simulationScenario === "perda_renda" ? "Em caso de perda total de renda, você consegue manter seus gastos atuais por este período com base no saldo atual da sua reserva." :
                       simulationScenario === "aumento_despesas" ? "Com um aumento de 30% nas despesas, sua margem de sobrevivência diminuiria." :
                       "Uma dívida inesperada de R$ 5.000,00 reduziria significativamente sua margem de proteção."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <ShieldCheck size={20} className="text-emerald-700 flex-shrink-0" />
                  <p className="text-xs text-emerald-900 font-bold">
                    Data estimada de sustentação: {new Date(Date.now() + Math.max(1, daysSurvival) * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmergencyReserve;
