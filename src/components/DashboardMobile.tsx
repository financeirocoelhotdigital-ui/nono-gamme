import React, { useState } from "react";
import { UserProfile, FamilyMember, Debtor } from "../types";
import { cn, formatDate, getDaysRemaining } from "../lib/utils";
import { useFormat } from "../hooks/useFormat";
import { 
  TrendingUp, TrendingDown, CreditCard, Wallet, Target, PieChart, Landmark, ShieldCheck, Zap, 
  Calendar, Clock, ChevronRight, Plus, Bell, Search, Settings, RefreshCw, Eye, EyeOff, Pin, Scale, ArrowUpRight, ArrowDownRight, Sparkles, Sliders, Calculator,
  ArrowLeftRight, ChevronDown, Building2, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { differenceInDays } from "date-fns";
import { BankIcon } from "./BankIcon";
import { calculateFinancialProtection } from "../lib/financialCalculations";
import { useContas } from "../context/ContasContext";
import { useCartoes } from "../context/CartoesContext";
import { useTransacoes } from "../context/TransacoesContext";
import { useOrcamento } from "../context/OrcamentoContext";
import { useMetas } from "../context/MetasContext";
import { useDebts } from "../context/DebtsContext";
import { useReceivables } from "../context/ReceivablesContext";
import { useWealth } from "../context/WealthContext";
import { useInvestments } from "../context/InvestmentContext";
import { useReminders } from "../context/ReminderContext";
import { useDiagnosis } from "../context/DiagnosisContext";
import { useInsights } from "../context/InsightsContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { DashboardCard } from "./DashboardPersonalizePanel";

interface DashboardMobileProps {
  userProfile: UserProfile;
  family: FamilyMember[];
  insights: any[];
  debtors: Debtor[];
  onTabChange: (tab: string) => void;
  mostrarMensagem?: (msg: string) => void;
  layout: DashboardCard[];
  sortedLayout: DashboardCard[];
  isCustomizing: boolean;
  setIsCustomizing: (val: boolean) => void;
  handleToggleVisibility: (id: string) => void;
  handleTogglePin: (id: string) => void;
  handleMoveCard: (index: number, direction: "up" | "down") => void;
  handleResetLayout: () => void;
}

export const DashboardMobile = React.memo(function DashboardMobile({
  userProfile,
  family,
  insights,
  debtors,
  onTabChange,
  mostrarMensagem,
  layout,
  sortedLayout,
  isCustomizing,
  setIsCustomizing,
  handleToggleVisibility,
  handleTogglePin,
  handleMoveCard,
  handleResetLayout
}: DashboardMobileProps) {
  const { formatCurrency } = useFormat(userProfile);
  const { accounts } = useContas();
  const { transactions } = useTransacoes();
  const { goals } = useMetas();
  const { debts } = useDebts();
  const { receivables } = useReceivables();
  const { wealth } = useWealth();
  const { investments } = useInvestments();
  const { reminders, userEvents } = useReminders();
  const { diagnosis } = useDiagnosis();

  const [showBalance, setShowBalance] = useState(() => {
    const saved = localStorage.getItem(`dashboard_show_balance_${userProfile.uid}`);
    return saved !== "false";
  });

  const toggleShowBalance = () => {
    const next = !showBalance;
    setShowBalance(next);
    localStorage.setItem(`dashboard_show_balance_${userProfile.uid}`, String(next));
  };

  const getGreeting = React.useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const {
    totalBalance,
    totalWealth,
    totalInvestments,
    totalIncome,
    totalExpense,
    totalDebts,
    totalReceivables,
    netWorth,
    thisMonthIncome,
    lastMonthIncome,
    lastMonthExpense,
    thisMonthSavings,
    lastMonthSavings,
    incomeGrowth,
    expenseGrowth,
  } = React.useMemo(() => {
    const totalBal = accounts.reduce((acc, curr) => acc + curr.balance, 0);
    const totalWeal = wealth.filter(w => w.status !== "vendido").reduce((acc, curr) => acc + (curr.value || 0), 0);
    const totalInv = investments.reduce((acc, curr) => acc + curr.currentValue, 0);
    const totalInc = transactions.filter(t => t.type === "income").reduce((acc, curr) => acc + curr.value, 0);
    const totalExp = transactions.filter(t => t.type === "expense").reduce((acc, curr) => acc + curr.value, 0);
    const totalDebt = debts.filter(d => d.status !== "quitada").reduce((acc, curr) => acc + curr.remainingValue, 0);
    const totalRec = receivables.filter(r => r.status !== "recebido").reduce((acc, curr) => acc + curr.remainingValue, 0);
    const netW = (totalBal + totalWeal + totalInv + totalRec) - totalDebt;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const thisMonthInc = transactions
      .filter(t => t.type === "income" && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
      .reduce((acc, curr) => acc + curr.value, 0);
      
    const lastMonthInc = transactions
      .filter(t => t.type === "income" && new Date(t.date).getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) && new Date(t.date).getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear))
      .reduce((acc, curr) => acc + curr.value, 0);

    const lastMonthExp = transactions
      .filter(t => t.type === "expense" && new Date(t.date).getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) && new Date(t.date).getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear))
      .reduce((acc, curr) => acc + curr.value, 0);

    const thisMonthSav = thisMonthInc - totalExp;
    const lastMonthSav = lastMonthInc - lastMonthExp;

    const incGrowth = lastMonthInc > 0 ? ((thisMonthInc - lastMonthInc) / lastMonthInc) * 100 : 0;
    const expGrowth = lastMonthExp > 0 ? ((totalExp - lastMonthExp) / lastMonthExp) * 100 : 0;

    return {
      totalBalance: totalBal,
      totalWealth: totalWeal,
      totalInvestments: totalInv,
      totalIncome: totalInc,
      totalExpense: totalExp,
      totalDebts: totalDebt,
      totalReceivables: totalRec,
      netWorth: netW,
      thisMonthIncome: thisMonthInc,
      lastMonthIncome: lastMonthInc,
      lastMonthExpense: lastMonthExp,
      thisMonthSavings: thisMonthSav,
      lastMonthSavings: lastMonthSav,
      incomeGrowth: incGrowth,
      expenseGrowth: expGrowth,
    };
  }, [accounts, wealth, investments, transactions, debts, receivables]);

  const { securityScore, monthsCovered, idealMonths } = React.useMemo(() => {
    return calculateFinancialProtection(accounts, transactions, debts, userProfile, family);
  }, [accounts, transactions, debts, userProfile, family]);

  const upcomingReminders = React.useMemo(() => reminders
    .filter(r => r.status === "ativo")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3), [reminders]);

  const upcomingEvents = React.useMemo(() => userEvents
    .filter(e => e.status !== "concluido")
    .sort((a, b) => new Date(a.dateInicio).getTime() - new Date(b.dateInicio).getTime())
    .slice(0, 3), [userEvents]);

  const emotionEmojis: Record<string, string> = {
    feliz: "😊", neutro: "😐", triste: "😢", ansioso: "😰", irritado: "😠",
    empolgado: "🤩", estressado: "😫", racional: "🧠", culpado: "😔",
    inseguro: "😟", motivado: "💪", impulsivo: "⚡"
  };

  const { categoryExpenses, categoryIncomes } = React.useMemo(() => {
    const currentMonth = new Date().getMonth();
    const expMap: Record<string, number> = {};
    const incMap: Record<string, number> = {};
    
    transactions.forEach(t => {
      if (new Date(t.date).getMonth() === currentMonth) {
        if (t.type === "expense") {
          expMap[t.category] = (expMap[t.category] || 0) + t.value;
        } else if (t.type === "income") {
          incMap[t.category] = (incMap[t.category] || 0) + t.value;
        }
      }
    });

    const EXP_COLORS = ["#F87171", "#60A5FA", "#FBBF24", "#34D399", "#A78BFA", "#F472B6"];
    const INC_COLORS = ["#10B981", "#34D399", "#3B82F6", "#6366F1"];

    return {
      categoryExpenses: Object.entries(expMap).map(([name, value], i) => ({
        name, value, color: EXP_COLORS[i % EXP_COLORS.length]
      })).sort((a, b) => b.value - a.value),
      categoryIncomes: Object.entries(incMap).map(([name, value], i) => ({
        name, value, color: INC_COLORS[i % INC_COLORS.length]
      })).sort((a, b) => b.value - a.value)
    };
  }, [transactions]);

  const wealthHistory = React.useMemo(() => {
    const data = [];
    const now = new Date();
    const baseWealth = netWorth;
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      
      const mTx = transactions.filter(t => {
        const txD = new Date(t.date);
        return txD.getMonth() === mIdx && txD.getFullYear() === yr;
      });
      const savings = mTx.filter(t => t.type === "income").reduce((acc, curr) => acc + curr.value, 0) -
                      mTx.filter(t => t.type === "expense").reduce((acc, curr) => acc + curr.value, 0);
      
      const val = baseWealth - (savings || (150 * (i + 1)));
      data.push({
        name: d.toLocaleDateString("pt-BR", { month: "short" }),
        "Patrimônio Líquido": Math.max(0, val),
      });
    }
    data[data.length - 1]["Patrimônio Líquido"] = netWorth;
    return data;
  }, [transactions, netWorth]);

  const dynamicInsightsList = React.useMemo(() => {
    const list = [];
    if (thisMonthSavings < 0) {
      list.push("Seus gastos superaram suas receitas neste mês. Considere pausar compras não essenciais.");
    } else if (thisMonthSavings > 0.2 * thisMonthIncome) {
      list.push("Parabéns! Você guardou mais de 20% do que ganhou. Que tal investir essa diferença?");
    }
    if (totalDebts > netWorth * 0.5) {
      list.push("Suas dívidas ativas ultrapassam 50% de seu patrimônio líquido. Priorize quitações.");
    }
    if (list.length < 2) {
      list.push(`Seu score de saúde financeira é ${securityScore}. Continue acompanhando as metas.`);
      list.push("Concilie suas contas bancárias frequentemente para evitar surpresas no extrato.");
    }
    return list.slice(0, 3);
  }, [thisMonthSavings, thisMonthIncome, totalDebts, netWorth, securityScore]);

  return (
    <div className="space-y-5">
      {/* SCREENSHOT HERO HEADER WITH CURRENCY WATERMARK */}
      <div className="bg-white rounded-[32px] p-5 sm:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.04)] relative overflow-hidden border border-slate-100">
        {/* Euro Banknotes Image Watermark */}
        <div 
          className="absolute top-0 right-0 w-[75%] h-full pointer-events-none opacity-30 mix-blend-multiply bg-cover bg-no-repeat bg-right-top"
          style={{ backgroundImage: `url('/assets/currency_header_bg.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent pointer-events-none" />

        {/* Top User Bar */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <button 
            onClick={() => (window as any).openSidebar && (window as any).openSidebar()}
            className="flex items-center gap-3 text-left transition-transform active:scale-95"
          >
            {userProfile.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt="Avatar"
                className="w-11 h-11 rounded-full border-2 border-white shadow-xs object-cover flex-shrink-0"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#836254] text-white font-black text-sm flex items-center justify-center shadow-xs border-2 border-white flex-shrink-0">
                {(userProfile.displayName || "C").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight flex items-center gap-1">
                Olá, {userProfile.displayName?.split(" ")[0] || "Tiago"} <span className="inline-block animate-bounce text-sm">👋</span>
              </h1>
              <p className="text-[11px] font-medium text-slate-500">
                Controle financeiro do Bolso+
              </p>
            </div>
          </button>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onTabChange("reminders")}
              className="w-9 h-9 rounded-full bg-emerald-50/80 border border-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs relative hover:bg-emerald-100 transition-colors active:scale-95"
              title="Notificações e Lembretes"
            >
              <Bell size={16} />
              {upcomingReminders.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
              )}
            </button>

            <button
              onClick={toggleShowBalance}
              className="w-9 h-9 rounded-full bg-emerald-50/80 border border-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs hover:bg-emerald-100 transition-colors active:scale-95"
              title={showBalance ? "Ocultar Valores" : "Mostrar Valores"}
            >
              {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>

            <button
              onClick={() => setIsCustomizing(!isCustomizing)}
              className={cn(
                "w-9 h-9 rounded-full border transition-all shadow-2xs flex items-center justify-center active:scale-95",
                isCustomizing 
                  ? "bg-emerald-500 text-white border-emerald-500" 
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
              )}
              title="Personalizar layout"
            >
              <Sliders size={16} />
            </button>
          </div>
        </div>

        {/* Saldo Total Consolidado */}
        <div className="relative z-10 space-y-1 mb-2">
          <span className="text-xs font-semibold text-slate-800 tracking-tight block">
            Saldo total consolidado
          </span>

          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-[#04593C]">R$</span>
            <span className="text-3xl sm:text-4xl font-black text-[#04593C] tracking-tight">
              {showBalance ? formatCurrency(totalBalance).replace(/^R\$\s*/, '') : "••••••"}
            </span>
          </div>

          {/* Novo + Vincular conta bancária */}
          <div className="flex items-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1 bg-[#D2F4E2] text-[#047857] text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs">
              <Building2 size={11} strokeWidth={2.5} />
              <span>Novo</span>
            </div>
            <button
              onClick={() => onTabChange("accounts")}
              className="text-xs font-bold text-[#047857] underline hover:text-[#034D38] transition-colors cursor-pointer"
            >
              + Vincular conta bancária
            </button>
          </div>
        </div>
      </div>

      {/* 5 HORIZONTAL ACTION BUTTONS */}
      <div className="px-1">
        <div className="grid grid-cols-5 gap-2 text-center">
          {/* 1. Nova receita */}
          <button
            onClick={() => onTabChange("income")}
            className="flex flex-col items-center group transition-transform active:scale-95"
          >
            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-[#0EA371] hover:bg-[#0C8F63] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 transition-all border border-emerald-400/20">
              <div className="w-6 h-6 rounded-lg border-2 border-white flex items-center justify-center">
                <Wallet size={13} strokeWidth={2.5} />
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight mt-1.5 group-hover:text-emerald-700">
              Nova<br />receita
            </span>
          </button>

          {/* 2. Nova despesa */}
          <button
            onClick={() => onTabChange("expenses")}
            className="flex flex-col items-center group transition-transform active:scale-95"
          >
            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-[#E84C4C] hover:bg-[#D93D3D] text-white flex items-center justify-center shadow-md shadow-rose-500/20 transition-all border border-rose-400/20">
              <div className="w-6 h-6 rounded-lg border-2 border-white flex items-center justify-center">
                <CreditCard size={13} strokeWidth={2.5} />
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight mt-1.5 group-hover:text-rose-600">
              Nova<br />despesa
            </span>
          </button>

          {/* 3. Transferir */}
          <button
            onClick={() => onTabChange("transfers")}
            className="flex flex-col items-center group transition-transform active:scale-95"
          >
            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-500/20 transition-all border border-blue-400/20">
              <ArrowLeftRight size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight mt-1.5 group-hover:text-blue-600">
              Transferir
            </span>
          </button>

          {/* 4. Relatórios */}
          <button
            onClick={() => onTabChange("reports")}
            className="flex flex-col items-center group transition-transform active:scale-95"
          >
            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white flex items-center justify-center shadow-md shadow-purple-500/20 transition-all border border-purple-400/20">
              <PieChart size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight mt-1.5 group-hover:text-purple-600">
              Relatórios
            </span>
          </button>

          {/* 5. Investimentos */}
          <button
            onClick={() => onTabChange("investments")}
            className="flex flex-col items-center group transition-transform active:scale-95"
          >
            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] text-white flex items-center justify-center shadow-md shadow-amber-500/20 transition-all border border-amber-400/20">
              <Clock size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight mt-1.5 group-hover:text-amber-600">
              Investimentos
            </span>
          </button>
        </div>
      </div>

      {/* VISÃO GERAL CARD (Exact match to screenshot) */}
      <div className="bg-white rounded-[26px] p-5 shadow-[0_4px_25px_rgba(0,0,0,0.04)] border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-slate-900 tracking-tight">
            Visão geral
          </h2>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200/90 rounded-full text-xs font-bold text-slate-700 shadow-2xs">
            <span>Este mês</span>
            <ChevronDown size={13} className="text-slate-500" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-100">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">
              Receitas
            </span>
            <span className="text-sm font-bold text-[#10B981] block">
              {showBalance ? formatCurrency(thisMonthIncome) : "••••"}
            </span>
          </div>

          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">
              Despesas
            </span>
            <span className="text-sm font-bold text-[#E84C4C] block">
              {showBalance ? formatCurrency(totalExpense) : "••••"}
            </span>
          </div>

          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">
              Resultado
            </span>
            <span className={cn(
              "text-sm font-bold block",
              thisMonthSavings >= 0 ? "text-[#10B981]" : "text-[#E84C4C]"
            )}>
              {showBalance ? formatCurrency(thisMonthSavings) : "••••"}
            </span>
          </div>
        </div>
      </div>

      {/* PATRIMÔNIO & CONTAS DETALHADAS */}
      <div className="bg-white text-slate-900 p-6 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden border border-gray-50">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[30px] -ml-16 -mb-16 pointer-events-none mix-blend-screen"></div>

        {/* Top Header */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-2 bg-white/5 border border-gray-50 px-3 py-1 rounded-full backdrop-blur-sm">
            <Scale size={10} className="text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">Visão Geral</span>
          </div>
          <button 
            onClick={toggleShowBalance} 
            className="p-2 bg-white/5 border border-gray-50 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-slate-900 backdrop-blur-sm active:scale-95"
            title={showBalance ? "Ocultar Valores" : "Mostrar Valores"}
          >
            {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {/* Main Value - Net Worth */}
        <div className="relative z-10 mb-6">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-1.5">Patrimônio Líquido</span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            {showBalance ? formatCurrency(netWorth) : "••••••"}
          </h2>
        </div>

        {/* Available Balance row */}
        <div className="flex items-center justify-between bg-white/5 border border-gray-50 rounded-2xl p-4 mb-6 backdrop-blur-sm relative z-10">
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-1">Saldo Disponível</span>
            <p className="text-lg font-black text-emerald-600 tracking-tight">
              {showBalance ? formatCurrency(totalBalance) : "••••••"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-[14px] bg-emerald-50 border border-primary-lime/20 flex items-center justify-center text-emerald-600 shrink-0">
            <Wallet size={16} />
          </div>
        </div>

        {/* 4-grid stats */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="bg-white/5 border border-gray-50 rounded-2xl p-3.5 backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp size={10} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-500">Receitas</span>
            </div>
            <p className="text-sm font-black text-emerald-400 tracking-tight">
              {showBalance ? formatCurrency(thisMonthIncome) : "••••••"}
            </p>
          </div>

          <div className="bg-white/5 border border-gray-50 rounded-2xl p-3.5 backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded-md bg-rose-500/20 flex items-center justify-center text-rose-400">
                <TrendingDown size={10} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-500">Despesas</span>
            </div>
            <p className="text-sm font-black text-rose-400 tracking-tight">
              {showBalance ? formatCurrency(totalExpense) : "••••••"}
            </p>
          </div>

          <div className="bg-white/5 border border-gray-50 rounded-2xl p-3.5 backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-500">Investimentos</span>
            </div>
            <p className="text-sm font-black text-blue-400 tracking-tight">
              {showBalance ? formatCurrency(totalInvestments) : "••••••"}
            </p>
          </div>

          <div className="bg-white/5 border border-gray-50 rounded-2xl p-3.5 backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-500">Dívidas Ativas</span>
            </div>
            <p className="text-sm font-black text-amber-400 tracking-tight">
              {showBalance ? formatCurrency(totalDebts) : "••••••"}
            </p>
          </div>
        </div>

        {/* Saving Result Bar */}
        <div className="mt-4 relative z-10">
          {thisMonthSavings > 0 ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-[18px] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <TrendingUp size={12} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/80">Economia no mês</span>
              </div>
              <span className="text-xs font-black text-emerald-400 tracking-tight">{formatCurrency(thisMonthSavings)}</span>
            </div>
          ) : (
            <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-[18px] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <TrendingDown size={12} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400/80">Déficit no mês</span>
              </div>
              <span className="text-xs font-black text-rose-400 tracking-tight">{formatCurrency(Math.abs(thisMonthSavings))}</span>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE/TABLET BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sortedLayout.map((card, index) => {
          if (!card.visible && !isCustomizing) return null;

          return (
            <motion.div
              layout={isCustomizing}
              key={card.id}
              className={cn(
                "relative group transition-all duration-300",
                !card.visible && "opacity-40 border border-dashed border-primary-dark/20 p-2 rounded-[30px]"
              )}
            >
              {isCustomizing && (
                <div className="absolute -top-3 -left-3 right-0 bottom-0 pointer-events-none border-2 border-primary-dark/30 rounded-[30px] z-20">
                  <span className="absolute -top-3.5 left-6 bg-white text-slate-900 text-[8px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                    {card.pinned && <Pin size={8} className="fill-current" />} {card.title} {!card.visible && "(Oculto)"}
                  </span>
                </div>
              )}

              {/* Render actual card content for mobile */}
              {card.id === "overview" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo do Mês</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-500/5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Entradas</span>
                      <p className="text-sm font-black text-emerald-600 mt-0.5">{formatCurrency(thisMonthIncome)}</p>
                      {incomeGrowth !== 0 && (
                        <span className={cn("text-[8px] font-bold block mt-1", incomeGrowth > 0 ? "text-emerald-500" : "text-rose-500")}>
                          {incomeGrowth > 0 ? "+" : ""}{incomeGrowth.toFixed(1)}% vs. m.a.
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-500/5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Saídas</span>
                      <p className="text-sm font-black text-rose-600 mt-0.5">{formatCurrency(totalExpense)}</p>
                      {expenseGrowth !== 0 && (
                        <span className={cn("text-[8px] font-bold block mt-1", expenseGrowth < 0 ? "text-emerald-500" : "text-rose-500")}>
                          {expenseGrowth > 0 ? "+" : ""}{expenseGrowth.toFixed(1)}% vs. m.a.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {card.id === "diagnosis" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-500" />
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Saúde Financeira</h3>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Indicador de proteção e score</p>
                      </div>
                    </div>
                    <button onClick={() => onTabChange("diagnosis")} className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5 uppercase tracking-widest hover:underline" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                      Detalhes
                    </button>
                  </div>

                  <div className="flex items-center gap-4 p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="#e2e8f0" strokeWidth="6" fill="transparent" />
                        <circle cx="32" cy="32" r="28" stroke="#10b981" strokeWidth="6" fill="transparent" 
                          strokeDasharray={175} strokeDashoffset={175 - (175 * securityScore) / 100} strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-sm font-black text-slate-900">{securityScore}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-black text-slate-900 block leading-none">
                        Reserva: {monthsCovered.toFixed(1)} meses
                      </span>
                      <p className="text-[10px] text-gray-500 leading-normal">
                        Sua reserva atual cobre aproximadamente {monthsCovered.toFixed(1)} meses de custos fixos. O ideal é {idealMonths} meses.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {card.id === "quick_actions" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-slate-900" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações Rápidas</span>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3.5">
                    {[
                      { label: "Receita", tab: "income", icon: Plus, bg: "bg-emerald-500/10 text-emerald-600 active:bg-emerald-500/20" },
                      { label: "Gasto", tab: "expenses", icon: TrendingDown, bg: "bg-rose-500/10 text-rose-600 active:bg-rose-500/20" },
                      { label: "Transf.", tab: "transfers", icon: RefreshCw, bg: "bg-blue-500/10 text-blue-600 active:bg-blue-500/20" },
                      { label: "Conta", tab: "accounts", icon: Landmark, bg: "bg-purple-500/10 text-purple-600 active:bg-purple-500/20" },
                      { label: "Dívida", tab: "debts", icon: Calculator, bg: "bg-amber-500/10 text-amber-600 active:bg-amber-500/20" },
                      { label: "Meta", tab: "goals", icon: Target, bg: "bg-indigo-500/10 text-indigo-600 active:bg-indigo-500/20" },
                    ].map((act, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (mostrarMensagem) mostrarMensagem(`Formulário de ${act.label}`);
                          onTabChange(act.tab);
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl border border-transparent hover:border-gray-50 active:bg-gray-50 cursor-pointer transition-all active:scale-95"
                        style={{ minHeight: 48 }}
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 shadow-sm transition-all", act.bg)}>
                          <act.icon size={18} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-600 tracking-tight text-center">{act.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {card.id === "cashflow" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PieChart size={18} className="text-slate-900" />
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Fluxo de Caixa</h3>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Visão do fluxo mensal de caixa</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: "Receitas", valor: thisMonthIncome, fill: "#34d399" },
                        { name: "Despesas", valor: totalExpense, fill: "#f87171" }
                      ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }} />
                        <Tooltip formatter={(value: number) => [formatCurrency(value), "Valor"]} cursor={{ fill: "transparent" }} />
                        <Bar dataKey="valor" radius={[12, 12, 0, 0]} maxBarSize={45} isAnimationActive={false}>
                          <Cell fill="#10B981" />
                          <Cell fill="#EF4444" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {card.id === "accounts" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Landmark size={18} className="text-slate-900" />
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Contas Bancárias</h3>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Saldo consolidado de cada instituição</p>
                      </div>
                    </div>
                    <button onClick={() => onTabChange("accounts")} className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5 uppercase tracking-widest hover:underline" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                      Todas <ChevronRight size={10} />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {accounts.map(acc => (
                      <div key={acc.id} className="p-3.5 rounded-2xl bg-gray-50/50 hover:bg-white border border-gray-100 hover:shadow-sm transition-all flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl border border-gray-100 bg-white flex items-center justify-center text-slate-900 flex-shrink-0 shadow-sm">
                            {acc.institution ? <BankIcon bankName={acc.institution} className="w-7 h-7 rounded-lg" /> : <Wallet size={18} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate">{acc.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider truncate mt-0.5">
                              {acc.institution || "Conta Corrente"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-black text-slate-900">{showBalance ? formatCurrency(acc.balance) : "••••••"}</p>
                          {acc.lastReconciliation && (
                            <span className="text-[7px] text-emerald-500 font-black uppercase tracking-widest block mt-0.5">Conciliada</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {accounts.length === 0 && (
                      <p className="text-xs text-gray-400 font-medium italic py-6 text-center">Nenhuma conta cadastrada.</p>
                    )}
                  </div>
                </div>
              )}

              {card.id === "wealth" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale size={18} className="text-slate-900" />
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Evolução Patrimonial</h3>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Histórico do patrimônio líquido</p>
                      </div>
                    </div>
                    <button onClick={() => onTabChange("wealth")} className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5 uppercase tracking-widest hover:underline" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                      Bens
                    </button>
                  </div>

                  <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={wealthHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorWealthMobile" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 9, fontWeight: "bold" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 9, fontWeight: "bold" }} width={60} />
                        <Tooltip formatter={(v: number) => [formatCurrency(v), "Patrimônio"]} />
                        <Area type="monotone" dataKey="Patrimônio Líquido" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorWealthMobile)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {card.id === "goals" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target size={18} className="text-slate-900" />
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Metas Principais</h3>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Progresso dos seus principais objetivos</p>
                      </div>
                    </div>
                    <button onClick={() => onTabChange("goals")} className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5 uppercase tracking-widest hover:underline" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                      Metas
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {goals.filter(g => g.status === "active").slice(0, 3).map(goal => {
                      const pct = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
                      const daysLeft = differenceInDays(new Date(goal.deadline), new Date());
                      
                      return (
                        <div key={goal.id} className="space-y-2 p-3.5 rounded-2xl bg-gray-50/50 border border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 truncate pr-2 max-w-[70%]">{goal.name}</span>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{pct.toFixed(0)}%</span>
                          </div>
                          
                          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, pct)}%` }}></div>
                          </div>

                          <div className="flex items-center justify-between text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                            <span>{formatCurrency(goal.currentValue)} de {formatCurrency(goal.targetValue)}</span>
                            <span className={cn(daysLeft < 30 ? "text-rose-500" : "text-gray-400")}>
                              {daysLeft < 0 ? "Expirado" : daysLeft === 0 ? "Hoje" : `${daysLeft}d`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {goals.filter(g => g.status === "active").length === 0 && (
                      <p className="text-xs text-gray-400 font-medium italic py-6 text-center">Nenhuma meta ativa.</p>
                    )}
                  </div>
                </div>
              )}

              {card.id === "debts" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator size={18} className="text-slate-900" />
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Dívidas e Compromissos</h3>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Próximos pagamentos e parcelas</p>
                      </div>
                    </div>
                    <button onClick={() => onTabChange("debts")} className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5 uppercase tracking-widest hover:underline" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                      Ver Todas
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-gray-50/50 border border-gray-100">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Aberto</span>
                        <p className="text-xs font-black text-rose-500 mt-0.5">{formatCurrency(totalDebts)}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-gray-50/50 border border-gray-100">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Quitadas</span>
                        <p className="text-xs font-black text-emerald-600 mt-0.5">
                          {debts.filter(d => d.status === "quitada").length} contratos
                        </p>
                      </div>
                    </div>

                    {debts.filter(d => d.status !== "quitada").slice(0, 2).map(debt => {
                      const dueDateStr = debt.nextInstallmentDate || debt.dueDate;
                      const nextDays = dueDateStr ? getDaysRemaining(dueDateStr) : null;
                      return (
                        <div key={debt.id} className={cn(
                          "p-3.5 rounded-2xl border flex items-center justify-between gap-2",
                          nextDays !== null && nextDays <= 5 ? "bg-rose-50/50 border-rose-100" : "bg-gray-50/50 border-gray-100"
                        )}>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-900 truncate block">{debt.name}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                              Credor: {debt.creditor || "Próprio"}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-black text-rose-500 block">{formatCurrency(debt.remainingValue)}</span>
                            {dueDateStr && (
                              <span className="text-[8px] font-bold text-gray-400 block mt-0.5">
                                Vence {formatDate(dueDateStr)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {debts.filter(d => d.status !== "quitada").length === 0 && (
                      <p className="text-xs text-gray-400 font-medium italic py-4 text-center">Nenhuma dívida ativa.</p>
                    )}
                  </div>
                </div>
              )}

              {card.id === "activities" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-slate-900" />
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Últimas Movimentações</h3>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Extrato rápido de lançamentos</p>
                      </div>
                    </div>
                    <button onClick={() => onTabChange("statement")} className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5 uppercase tracking-widest hover:underline" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                      Ver Tudo
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {transactions.slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-sm transition-all gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold shadow-sm",
                            t.type === "income" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                          )}>
                            {t.type === "income" ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-900 truncate block">{t.category}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mt-0.5">
                              {new Date(t.date).toLocaleDateString("pt-BR")} • {emotionEmojis[t.emotion!] || "✨"}
                            </span>
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs font-black flex-shrink-0",
                          t.type === "income" ? "text-emerald-600" : "text-slate-900"
                        )}>
                          {t.type === "income" ? "+" : "-"}{formatCurrency(t.value)}
                        </span>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <p className="text-xs text-gray-400 font-medium italic py-6 text-center">Nenhuma transação registrada.</p>
                    )}
                  </div>
                </div>
              )}

              {card.id === "insights" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-emerald-500" />
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Insights IA Inteligentes</h3>
                      <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Análise preditiva automatizada</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {dynamicInsightsList.map((ins, i) => (
                      <div key={i} className="flex items-start gap-3 p-3.5 bg-emerald-50/10 rounded-2xl border border-emerald-500/5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                          <Sparkles size={12} />
                        </div>
                        <p className="text-xs text-gray-700 font-semibold leading-relaxed">{ins}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {card.id === "calendar" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-slate-900" />
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Agenda Financeira</h3>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Próximos compromissos agendados</p>
                      </div>
                    </div>
                    <button onClick={() => onTabChange("calendar")} className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5 uppercase tracking-widest hover:underline" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                      Agenda
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {upcomingEvents.map(e => (
                      <div key={e.id} className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-center justify-between hover:bg-white transition-all gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                            <Calendar size={14} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-900 block truncate">{e.name}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 block">
                              Inicia {new Date(e.dateInicio).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-wider bg-blue-50/80 text-blue-600 px-2.5 py-1 rounded-lg flex-shrink-0">
                          {e.type || "Geral"}
                        </span>
                      </div>
                    ))}
                    {upcomingEvents.length === 0 && (
                      <p className="text-xs text-gray-400 font-medium italic py-6 text-center">Nenhum evento agendado.</p>
                    )}
                  </div>
                </div>
              )}

              {card.id === "charts" && (
                <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Distribuição por Categoria</h3>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Participação percentual no mês</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">Despesas</span>
                      {categoryExpenses.length > 0 ? (
                        <div className="space-y-2">
                          {categoryExpenses.slice(0, 3).map((c, i) => {
                            const pct = totalExpense > 0 ? (c.value / totalExpense) * 100 : 0;
                            return (
                              <div key={i} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                                  <span>{c.name}</span>
                                  <span>{formatCurrency(c.value)} ({pct.toFixed(0)}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 font-medium italic py-2 text-center">Sem despesas registradas.</p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">Receitas</span>
                      {categoryIncomes.length > 0 ? (
                        <div className="space-y-2">
                          {categoryIncomes.slice(0, 3).map((c, i) => {
                            const pct = thisMonthIncome > 0 ? (c.value / thisMonthIncome) * 100 : 0;
                            return (
                              <div key={i} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                                  <span>{c.name}</span>
                                  <span>{formatCurrency(c.value)} ({pct.toFixed(0)}%)</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 font-medium italic py-2 text-center">Sem receitas registradas.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});
