import React, { useState, useMemo } from "react";
import { UserProfile, FamilyMember, Debtor, AIInsight, Transaction } from "../types";
import { cn, formatCurrency } from "../lib/utils";
import {
  Bell,
  Eye,
  EyeOff,
  ChevronDown,
  ArrowRight,
  ChevronRight,
  Plus,
  ArrowUpRight,
  BarChart2,
  PieChart,
  Target,
  Plane,
  ShoppingBag,
  Car,
  Briefcase,
  Wallet,
  ArrowLeftRight,
  Clock,
  Sparkles,
  Utensils,
  Home,
  HeartPulse,
  Tv,
  HelpCircle,
  Menu
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { useContas } from "../context/ContasContext";
import { useTransacoes } from "../context/TransacoesContext";
import { useMetas } from "../context/MetasContext";

interface DashboardProps {
  userProfile: UserProfile;
  family?: FamilyMember[];
  insights?: AIInsight[];
  debtors?: Debtor[];
  onTabChange: (tab: string) => void;
  mostrarMensagem?: (msg: string) => void;
}

export function Dashboard({ userProfile, insights = [], onTabChange, mostrarMensagem }: DashboardProps) {
  const { accounts } = useContas();
  const { transactions } = useTransacoes();
  const { goals } = useMetas();
  
  const [showBalance, setShowBalance] = useState(true);

  // Month calculations
  const {
    totalBalance,
    thisMonthIncome,
    thisMonthExpense,
    categoryExpenses,
    balanceComparison,
    percentageChange,
    isIncrease
  } = useMemo(() => {
    let totalBal = 0;
    if (accounts.length > 0) {
      totalBal = accounts.reduce((acc, curr) => acc + (curr?.balance || 0), 0);
      const unassignedIncome = transactions
        .filter(t => !t.accountId && t.type === 'income')
        .reduce((acc, curr) => acc + curr.value, 0);
      const unassignedExpense = transactions
        .filter(t => !t.accountId && t.type === 'expense')
        .reduce((acc, curr) => acc + curr.value, 0);
      totalBal += (unassignedIncome - unassignedExpense);
    } else {
      const totalInc = transactions
        .filter(t => t.type === "income")
        .reduce((acc, curr) => acc + curr.value, 0);
      const totalExp = transactions
        .filter(t => t.type === "expense")
        .reduce((acc, curr) => acc + curr.value, 0);
      totalBal = totalInc - totalExp;
    }
    
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
    const prevYear = curMonth === 0 ? curYear - 1 : curYear;
    
    const thisMonthInc = transactions
      .filter(t => t.type === "income" && new Date(t.date).getMonth() === curMonth && new Date(t.date).getFullYear() === curYear)
      .reduce((acc, curr) => acc + curr.value, 0);
      
    const thisMonthExp = transactions
      .filter(t => t.type === "expense" && new Date(t.date).getMonth() === curMonth && new Date(t.date).getFullYear() === curYear)
      .reduce((acc, curr) => acc + curr.value, 0);

    const prevMonthInc = transactions
      .filter(t => t.type === "income" && new Date(t.date).getMonth() === prevMonth && new Date(t.date).getFullYear() === prevYear)
      .reduce((acc, curr) => acc + curr.value, 0);
      
    const prevMonthExp = transactions
      .filter(t => t.type === "expense" && new Date(t.date).getMonth() === prevMonth && new Date(t.date).getFullYear() === prevYear)
      .reduce((acc, curr) => acc + curr.value, 0);

    const prevMonthResult = prevMonthInc - prevMonthExp;
    const currentResult = thisMonthInc - thisMonthExp;

    const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const prevMonthName = monthNames[prevMonth];

    let pctChange: string | null = null;
    let isUp = true;
    let comparisonText = `${accounts.length} ${accounts.length === 1 ? 'conta conectada' : 'contas conectadas'}`;

    if (prevMonthExp > 0 && thisMonthExp > 0) {
      const diff = ((thisMonthExp - prevMonthExp) / prevMonthExp) * 100;
      pctChange = `${Math.abs(Math.round(diff * 10) / 10).toLocaleString('pt-BR')}%`;
      isUp = diff <= 0; // In spending, down is good (green)
      comparisonText = `gastos vs ${prevMonthName}`;
    } else if (prevMonthResult !== 0 && currentResult !== 0) {
      const diff = ((currentResult - prevMonthResult) / Math.abs(prevMonthResult)) * 100;
      pctChange = `${Math.abs(Math.round(diff * 10) / 10).toLocaleString('pt-BR')}%`;
      isUp = diff >= 0;
      comparisonText = `em relação a ${prevMonthName}`;
    }

    const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"];
    
    const categoryTotals: Record<string, number> = {};
    transactions
      .filter(t => t.type === "expense" && new Date(t.date).getMonth() === curMonth && new Date(t.date).getFullYear() === curYear)
      .forEach(t => {
        const cat = t.category || "Outros";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + t.value;
      });
      
    const catExp = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

    return {
      totalBalance: totalBal,
      thisMonthIncome: thisMonthInc,
      thisMonthExpense: thisMonthExp,
      categoryExpenses: catExp,
      balanceComparison: comparisonText,
      percentageChange: pctChange,
      isIncrease: isUp
    };
  }, [accounts, transactions]);

  const thisMonthResult = thisMonthIncome - thisMonthExpense;

  // Real Sparkline calculation based on month's transactions
  const sparklineData = useMemo(() => {
    const curMonth = new Date().getMonth();
    const curYear = new Date().getFullYear();
    const today = new Date().getDate();

    const monthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === curYear && d.getMonth() === curMonth;
    });

    if (monthTxs.length === 0) {
      return [];
    }

    const points = 7;
    const step = Math.max(1, Math.floor(today / points));
    const data = [];

    for (let i = 0; i < points; i++) {
      const day = Math.min(today, Math.max(1, (i + 1) * step));
      const txUpToDay = monthTxs.filter(t => new Date(t.date).getDate() <= day);
      const inc = txUpToDay.filter(t => t.type === 'income').reduce((acc, t) => acc + t.value, 0);
      const exp = txUpToDay.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.value, 0);
      data.push({ value: Math.max(0, inc - exp) });
    }
    return data;
  }, [transactions]);

  const sparklineDataRed = useMemo(() => {
    const curMonth = new Date().getMonth();
    const curYear = new Date().getFullYear();
    const today = new Date().getDate();

    const monthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getFullYear() === curYear && d.getMonth() === curMonth;
    });

    if (monthTxs.length === 0) {
      return [];
    }

    const points = 7;
    const step = Math.max(1, Math.floor(today / points));
    const data = [];

    for (let i = 0; i < points; i++) {
      const day = Math.min(today, Math.max(1, (i + 1) * step));
      const exp = monthTxs
        .filter(t => new Date(t.date).getDate() <= day)
        .reduce((acc, t) => acc + t.value, 0);
      data.push({ value: Math.max(0, exp) });
    }
    return data;
  }, [transactions]);

  // Real recent transactions (last 5)
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Helper for category icon
  const getCategoryIcon = (category: string, type: string) => {
    const lower = (category || "").toLowerCase();
    if (lower.includes("aliment") || lower.includes("restaur") || lower.includes("comida") || lower.includes("mercado")) {
      return <Utensils size={18} />;
    }
    if (lower.includes("transporte") || lower.includes("uber") || lower.includes("combust") || lower.includes("carro")) {
      return <Car size={18} />;
    }
    if (lower.includes("salario") || lower.includes("renda") || lower.includes("serviço") || lower.includes("trabalho")) {
      return <Briefcase size={18} />;
    }
    if (lower.includes("moradia") || lower.includes("aluguel") || lower.includes("casa") || lower.includes("luz") || lower.includes("agua")) {
      return <Home size={18} />;
    }
    if (lower.includes("saude") || lower.includes("farmacia") || lower.includes("medico")) {
      return <HeartPulse size={18} />;
    }
    if (lower.includes("lazer") || lower.includes("cinema") || lower.includes("streaming") || lower.includes("jogos")) {
      return <Tv size={18} />;
    }
    return type === 'income' ? <Wallet size={18} /> : <ShoppingBag size={18} />;
  };

  // Balance integer and decimal splitting for hero typography
  const absBal = Math.abs(totalBalance);
  const formattedBalInt = Math.floor(absBal).toLocaleString('pt-BR');
  const formattedBalDec = (absBal % 1).toFixed(2).slice(2);
  const isNegative = totalBalance < 0;

  // Active tip / insight
  const activeTip = useMemo(() => {
    if (insights && insights.length > 0 && (insights[0].content || insights[0].title)) {
      return insights[0].content || insights[0].title;
    }
    if (thisMonthExpense > 0 && thisMonthIncome > 0) {
      const savingsRate = Math.round(((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100);
      if (savingsRate > 0) {
        return `Você está poupando ${savingsRate}% de suas receitas este mês. Continue assim!`;
      }
      return `Seus gastos superaram as receitas este mês. Analise seus custos para equilibrar as contas.`;
    }
    if (goals.length === 0) {
      return "Defina sua primeira meta financeira para acelerar a construção do seu patrimônio.";
    }
    return "Mantenha o registro de suas transações em dia para previsões financeiras precisas.";
  }, [insights, thisMonthExpense, thisMonthIncome, goals.length]);

  const userName = userProfile?.displayName ? userProfile.displayName.split(' ')[0] : 'Usuário';

  return (
    <div className="bg-[#F4F7F6] min-h-screen w-full pb-24 font-sans text-slate-900">
      
      {/* 1. Hero Balance Card */}
      <div className="relative bg-gradient-to-br from-[#F4F9F6] to-[#E8F5E9] rounded-b-[44px] overflow-hidden shadow-[0_8px_30px_rgba(16,185,129,0.06)] pb-28 pt-[max(env(safe-area-inset-top,2rem),2rem)]">
        
        {/* Money Image Background decoration */}
        <div 
           className="absolute top-[-5%] right-[-15%] w-[85%] h-[120%] mix-blend-multiply opacity-[0.90] pointer-events-none"
           style={{
             backgroundImage: "url('https://images.unsplash.com/photo-1621981386829-9b458a2cddde?auto=format&fit=crop&q=80&w=800')",
             backgroundSize: 'cover',
             backgroundPosition: 'left center',
             transform: 'rotate(-4deg)',
             WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.8) 40%, black 100%)',
             maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.8) 40%, black 100%)',
           }}
        />
        
        {/* Soft gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F4F9F6] via-[#F4F9F6]/85 to-transparent pointer-events-none" />
        
        <div className="relative z-10 px-6">
          {/* Top Header Row inside Card */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => (window as any).openSidebar?.()} 
                className="md:hidden p-2 rounded-xl text-slate-700 bg-white/70 hover:bg-white active:scale-95 transition-all shadow-xs -ml-1"
                title="Abrir Menu"
              >
                <Menu size={20} />
              </button>
              <img 
                src={userProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`} 
                alt="Avatar" 
                className="w-11 h-11 rounded-full shadow-md object-cover border-2 border-white bg-emerald-100"
                referrerPolicy="no-referrer"
              />
              <div>
                <h1 className="text-[16px] font-bold text-slate-900 leading-tight">
                  Olá, {userName} 👋
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <img src="/logo.png" alt="Bolso+" className="h-5 sm:h-5.5 w-auto object-contain" />
                  <span className="text-[11px] text-slate-600 font-medium">• Seu Dinheiro Mais Perto</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => onTabChange("reminders")}
                aria-label="Notificações"
                className="relative text-emerald-800 p-2 bg-white/60 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
              >
                <Bell size={18} strokeWidth={2.5} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#10B981] rounded-full border border-white"></span>
              </button>
              <button 
                onClick={() => setShowBalance(!showBalance)} 
                aria-label="Ocultar ou exibir saldo"
                className="w-9 h-9 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center text-emerald-800 shadow-sm hover:bg-white transition-colors"
              >
                {showBalance ? <Eye size={17} strokeWidth={2.5} /> : <EyeOff size={17} strokeWidth={2.5} />}
              </button>
            </div>
          </div>

          {/* Balance Content */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[13px]">
              Saldo total consolidado
            </div>
            <div className="text-[38px] font-black tracking-tighter text-[#065F46] flex items-baseline gap-1.5 leading-none">
              <span className="text-xl tracking-tight">{isNegative ? "- R$" : "R$"}</span> 
              {showBalance ? (
                <>{formattedBalInt}<span className="text-[26px]">,{formattedBalDec}</span></>
              ) : (
                <>••••••<span className="text-[26px]">,••</span></>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1">
              {percentageChange ? (
                <div className={cn(
                  "inline-flex items-center gap-1 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm",
                  isIncrease ? "bg-[#10B981]" : "bg-[#EF4444]"
                )}>
                  {isIncrease ? <ArrowUpRight size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
                  {percentageChange}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-md">
                  <Wallet size={12} />
                  {accounts.length > 0 ? "Ativo" : "Novo"}
                </div>
              )}
              {accounts.length > 0 ? (
                <span className="text-[11px] text-slate-600 font-medium">{balanceComparison}</span>
              ) : (
                <button 
                  onClick={() => onTabChange("accounts")} 
                  className="text-[11px] text-emerald-800 hover:text-emerald-950 font-bold underline cursor-pointer"
                >
                  + Vincular conta bancária
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sparkline Chart */}
        {sparklineData.length > 0 && (
          <div className="absolute bottom-[-5px] left-[-2%] right-[-2%] w-[104%] h-36 z-0 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalanceTop" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10B981" 
                  strokeWidth={3.5} 
                  fill="url(#colorBalanceTop)" 
                  isAnimationActive={true}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2. Quick Actions Grid */}
      <div className="flex justify-between items-start px-6 mt-6 max-w-lg mx-auto">
        <button onClick={() => onTabChange("income")} className="flex flex-col items-center gap-2 group">
          <div className="w-[52px] h-[52px] rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-900 group-hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center text-white">
              <Wallet size={20} strokeWidth={2.5} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">Nova<br/>receita</span>
        </button>
        
        <button onClick={() => onTabChange("expenses")} className="flex flex-col items-center gap-2 group">
          <div className="w-[52px] h-[52px] rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-900 group-hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#EF4444] flex items-center justify-center text-white">
              <ShoppingBag size={20} strokeWidth={2.5} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">Nova<br/>despesa</span>
        </button>

        <button onClick={() => onTabChange("transfers")} className="flex flex-col items-center gap-2 group">
          <div className="w-[52px] h-[52px] rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-900 group-hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6] flex items-center justify-center text-white">
              <ArrowLeftRight size={20} strokeWidth={2.5} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-700 text-center leading-tight pt-2">Transferir</span>
        </button>

        <button onClick={() => onTabChange("reports")} className="flex flex-col items-center gap-2 group">
          <div className="w-[52px] h-[52px] rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-900 group-hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] flex items-center justify-center text-white">
              <BarChart2 size={20} strokeWidth={2.5} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-700 text-center leading-tight pt-2">Relatórios</span>
        </button>

        <button onClick={() => onTabChange("investments")} className="flex flex-col items-center gap-2 group">
          <div className="w-[52px] h-[52px] rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-900 group-hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center text-white">
              <Clock size={20} strokeWidth={2.5} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-700 text-center leading-tight pt-2">Investimentos</span>
        </button>
      </div>

      {/* 3. Visão Geral Card */}
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 mx-4 mt-8">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Visão geral</h2>
          <button 
            onClick={() => onTabChange("reports")}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-600 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Este mês <ChevronDown size={14} strokeWidth={2.5} className="text-slate-400" />
          </button>
        </div>
        
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {/* Receitas */}
          <div className="flex flex-col items-center px-1">
            <span className="text-[10px] text-slate-500 font-medium mb-1">Receitas</span>
            <span className="text-[12px] sm:text-[13px] font-bold text-[#10B981]">
              {showBalance ? formatCurrency(thisMonthIncome) : "R$ •••••"}
            </span>
            <div className="h-8 w-full mt-2 flex items-center justify-center">
              {sparklineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={1.5} fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full border-b border-dashed border-emerald-200/60 my-auto" />
              )}
            </div>
          </div>

          {/* Despesas */}
          <div className="flex flex-col items-center px-1">
            <span className="text-[10px] text-slate-500 font-medium mb-1">Despesas</span>
            <span className="text-[12px] sm:text-[13px] font-bold text-[#EF4444]">
              {showBalance ? formatCurrency(thisMonthExpense) : "R$ •••••"}
            </span>
            <div className="h-8 w-full mt-2 flex items-center justify-center">
              {sparklineDataRed.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineDataRed}>
                    <Area type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={1.5} fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full border-b border-dashed border-rose-200/60 my-auto" />
              )}
            </div>
          </div>

          {/* Resultado */}
          <div className="flex flex-col items-center px-1">
            <span className="text-[10px] text-slate-500 font-medium mb-1">Resultado</span>
            <span className={cn(
              "text-[12px] sm:text-[13px] font-bold",
              thisMonthResult >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
            )}>
              {showBalance ? formatCurrency(thisMonthResult) : "R$ •••••"}
            </span>
            <div className="h-8 w-full mt-2 flex items-center justify-center">
              {sparklineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={thisMonthResult >= 0 ? "#10B981" : "#EF4444"} 
                      strokeWidth={1.5} 
                      fill="none" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full border-b border-dashed border-slate-200 my-auto" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Side by Side Cards (Distribuição & Metas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-4 mt-6">
        
        {/* Distribuição de gastos */}
        <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[13px] font-bold text-slate-900 tracking-tight">Distribuição de gastos</h2>
            <button 
              onClick={() => onTabChange("expenses")}
              className="text-[10px] font-bold text-[#10B981] flex items-center gap-0.5 whitespace-nowrap hover:underline"
            >
              Ver todas <ArrowRight size={10} strokeWidth={2.5} />
            </button>
          </div>
          
          {thisMonthExpense > 0 && categoryExpenses.length > 0 ? (
            <div className="flex flex-col xl:flex-row items-center justify-center flex-1 gap-4">
              <div className="w-[105px] h-[105px] relative flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={categoryExpenses}
                      innerRadius={34}
                      outerRadius={52}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryExpenses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                  <span className="text-[10px] font-black text-slate-900 leading-tight">
                    {showBalance ? formatCurrency(thisMonthExpense) : "R$ ••"}
                  </span>
                  <span className="text-[8px] text-slate-400 font-medium">Total</span>
                </div>
              </div>
              
              <div className="w-full space-y-2 mt-1">
                {categoryExpenses.slice(0, 4).map((cat, i) => {
                  const pct = thisMonthExpense > 0 ? Math.round((cat.value / thisMonthExpense) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-900 leading-none truncate">{cat.name}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            {showBalance ? formatCurrency(cat.value) : "R$ •••"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 ml-2">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center flex-1">
              <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-2">
                <PieChart size={20} />
              </div>
              <p className="text-[11px] font-bold text-slate-800">Nenhum gasto este mês</p>
              <p className="text-[9px] text-slate-500 mb-3">Registre despesas para ver a distribuição por categoria.</p>
              <button 
                onClick={() => onTabChange("expenses")}
                className="px-3 py-1.5 bg-[#EF4444] text-white text-[10px] font-bold rounded-xl shadow-sm hover:bg-rose-600 transition-colors"
              >
                + Adicionar despesa
              </button>
            </div>
          )}
        </div>

        {/* Metas financeiras */}
        <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[13px] font-bold text-slate-900 tracking-tight">Metas financeiras</h2>
            <button 
              onClick={() => onTabChange("goals")}
              className="text-[10px] font-bold text-[#10B981] flex items-center gap-0.5 whitespace-nowrap hover:underline"
            >
              Ver todas <ArrowRight size={10} strokeWidth={2.5} />
            </button>
          </div>
          
          {goals && goals.length > 0 ? (
            <div className="space-y-4 flex-1 justify-center flex flex-col">
              {goals.slice(0, 2).map((goal) => {
                const current = goal.currentValue || 0;
                const target = goal.targetValue || 1;
                const pct = Math.min(100, Math.round((current / target) * 100));
                return (
                  <div 
                    key={goal.id} 
                    className="cursor-pointer hover:bg-slate-50/80 p-1.5 rounded-xl transition-colors"
                    onClick={() => onTabChange("goals")}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-sm flex-shrink-0">
                        <Target size={15} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 leading-tight truncate">{goal.name}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {showBalance ? `${formatCurrency(current)} / ${formatCurrency(target)}` : "R$ ••• / R$ •••"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#10B981] rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-700">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center flex-1">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <Target size={20} />
              </div>
              <p className="text-[11px] font-bold text-slate-800">Nenhuma meta ativa</p>
              <p className="text-[9px] text-slate-500 mb-3">Defina objetivos financeiros para acompanhar seu progresso.</p>
              <button 
                onClick={() => onTabChange("goals")}
                className="px-3 py-1.5 bg-[#10B981] text-white text-[10px] font-bold rounded-xl shadow-sm hover:bg-emerald-600 transition-colors"
              >
                + Criar meta
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 5. Dica inteligente */}
      <div className="mx-4 mt-6 bg-gradient-to-r from-[#F0FDF4] to-[#F8FAFC] rounded-[24px] p-4 shadow-sm border border-emerald-100 flex items-center gap-4">
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-emerald-50">
          <span className="text-[26px]">💡</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            Dica do Bolso+
          </h3>
          <p className="text-[11px] text-slate-600 font-medium leading-snug mt-0.5">
            {activeTip}
          </p>
        </div>
        <button 
          onClick={() => onTabChange("aichat")}
          className="bg-[#10B981] text-white text-[11px] font-bold px-3.5 py-2.5 rounded-[12px] whitespace-nowrap shadow-sm active:scale-95 transition-all hover:bg-emerald-600 flex-shrink-0"
        >
          Consultar IA
        </button>
      </div>

      {/* 6. Transações recentes */}
      <div className="mx-4 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Transações recentes</h2>
          <button 
            onClick={() => onTabChange("transactions")}
            className="text-[11px] font-bold text-[#10B981] flex items-center gap-0.5 hover:underline"
          >
            Ver todas <ArrowRight size={12} strokeWidth={2.5} />
          </button>
        </div>
        
        {recentTransactions.length > 0 ? (
          <div className="space-y-2">
            {recentTransactions.map((tx: Transaction) => (
              <div 
                key={tx.id} 
                onClick={() => onTabChange("transactions")}
                className="flex items-center justify-between p-3.5 bg-white rounded-[20px] shadow-sm border border-slate-50 hover:border-slate-200 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0",
                    tx.type === 'income' ? "bg-[#10B981]" : "bg-[#EF4444]"
                  )}>
                    {getCategoryIcon(tx.category, tx.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 truncate">
                      {tx.description || tx.category || "Sem descrição"}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      {tx.category || (tx.type === 'income' ? 'Receita' : 'Despesa')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <div className="text-right">
                    <p className={cn(
                      "text-[13px] font-bold",
                      tx.type === 'income' ? "text-[#10B981]" : "text-[#EF4444]"
                    )}>
                      {showBalance ? (
                        `${tx.type === 'income' ? '+' : '-'} ${formatCurrency(Math.abs(tx.value))}`
                      ) : (
                        `${tx.type === 'income' ? '+' : '-'} R$ •••`
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {new Date(tx.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-white rounded-[24px] shadow-sm border border-slate-100 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Wallet size={24} />
            </div>
            <p className="text-[14px] font-bold text-slate-900 mb-1">Nenhuma transação cadastrada</p>
            <p className="text-[11px] text-slate-500 mb-5 max-w-xs leading-relaxed">
              Adicione suas receitas ou despesas para começar a acompanhar seu fluxo financeiro em tempo real.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => onTabChange("income")}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-xl transition-colors shadow-sm"
              >
                + Nova receita
              </button>
              <button
                onClick={() => onTabChange("expenses")}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-xl transition-colors shadow-sm"
              >
                + Nova despesa
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;
