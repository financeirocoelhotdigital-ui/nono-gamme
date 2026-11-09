import React, { useState } from "react";
import { UserProfile, AIInsight, FamilyMember, Debtor } from "../types";
import { useFormat } from "../hooks/useFormat";
import { useContas } from "../context/ContasContext";
import { useTransacoes } from "../context/TransacoesContext";
import { useOrcamento } from "../context/OrcamentoContext";
import { useMetas } from "../context/MetasContext";
import { useDebts } from "../context/DebtsContext";
import { useWealth } from "../context/WealthContext";
import { useInvestments } from "../context/InvestmentContext";
import { TrendingUp, TrendingDown, Wallet, Target, PieChart, Users, ArrowUpRight, ArrowDownRight, Sparkles, Landmark, ShieldCheck, Zap, Star, Trophy, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from "recharts";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { DicaDoDia } from "./DicaDoDia";

interface DashboardDesktopProps {
  userProfile: UserProfile;
  family: FamilyMember[];
  insights: AIInsight[];
  debtors: Debtor[];
  onTabChange: (tab: string) => void;
}

export function DashboardDesktop({ userProfile, family, insights, debtors, onTabChange }: DashboardDesktopProps) {
  const { formatCurrency } = useFormat(userProfile);
  const { accounts } = useContas();
  const { transactions } = useTransacoes();
  const { stats: budgetStats } = useOrcamento();
  const { stats: goalsStats } = useMetas();
  const { debts } = useDebts();
  const { wealth } = useWealth();
  const { investments } = useInvestments();

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const totalIncome = transactions.filter(t => t.type === "income").reduce((acc, curr) => acc + curr.value, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((acc, curr) => acc + curr.value, 0);
  
  // Chart Data
  const getChartData = () => {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
      const income = dayTransactions.filter(t => t.type === "income").reduce((acc, curr) => acc + curr.value, 0);
      const expense = dayTransactions.filter(t => t.type === "expense").reduce((acc, curr) => acc + curr.value, 0);
      data.push({
        name: d.toLocaleDateString("pt-BR", { weekday: "short" }),
        income,
        expense,
        balance: income - expense,
      });
    }
    return data;
  };

  const chartData = getChartData();

  const stats = [
    { 
      title: "Saldo Total", 
      value: totalBalance, 
      icon: Wallet, 
      bgColor: "bg-white", 
      textColor: "text-slate-900",
      subTextColor: "text-slate-900/50",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      trend: "+2.4%",
      trendColor: "text-emerald-600 bg-emerald-50",
      accentColor: "bg-emerald-500",
      isPrimary: true
    },
    { 
      title: "Receitas", 
      value: totalIncome, 
      icon: TrendingUp, 
      bgColor: "bg-emerald-50/50", 
      textColor: "text-emerald-900",
      subTextColor: "text-emerald-600/60",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      trend: "+12%",
      trendColor: "text-emerald-600 bg-emerald-500/10",
      accentColor: "bg-emerald-500",
      isPrimary: false
    },
    { 
      title: "Despesas", 
      value: totalExpense, 
      icon: TrendingDown, 
      bgColor: "bg-rose-50/50", 
      textColor: "text-rose-900",
      subTextColor: "text-rose-600/60",
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-600",
      trend: "-5%",
      trendColor: "text-rose-600 bg-rose-500/10",
      accentColor: "bg-rose-500",
      isPrimary: false
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "p-6 rounded-3xl border transition-all duration-300 group relative cursor-pointer",
              "h-[120px] flex flex-col justify-between",
              "hover:shadow-md hover:-translate-y-1",
              stat.bgColor,
              stat.isPrimary ? "border-primary-dark/20 shadow-sm" : "border-gray-100 shadow-sm"
            )}
          >
            {/* Top Row: Title and Icon */}
            <div className="flex justify-between items-start relative z-10 w-full">
              <p className={cn(
                "text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.15em] opacity-60",
                stat.textColor === "text-slate-900" ? "text-slate-900" : "text-gray-500"
              )}>
                {stat.title}
              </p>
              <div className={cn(
                "w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                stat.iconBg,
                stat.iconColor
              )}>
                <stat.icon size={16} strokeWidth={2.5} />
              </div>
            </div>
            
            {/* Middle & Bottom: Value and Trend (Stacked) */}
            <div className="relative z-10 w-full space-y-1">
              <h3 className={cn(
                "text-lg lg:text-xl xl:text-2xl font-black tracking-tight",
                stat.textColor
              )}>
                {formatCurrency(stat.value)}
              </h3>
              <div className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] lg:text-[9px] font-black uppercase tracking-widest backdrop-blur-sm",
                stat.trendColor
              )}>
                {stat.trend.startsWith("+") ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {stat.trend}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Dica do Dia */}
      <DicaDoDia userProfile={userProfile} />

      {/* Main Line Chart - Full Width */}
      <div className="bg-white p-6 lg:p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Fluxo de Caixa</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Análise de movimentações dos últimos 7 dias</p>
          </div>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: "bold" }} 
                dy={15} 
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: "bold" }}
                tickFormatter={(value) => `R$ ${value}`}
                width={80}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: "24px", 
                  border: "none", 
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", 
                  padding: "20px",
                  backgroundColor: "#fff"
                }}
                itemStyle={{ fontWeight: "bold", fontSize: "12px" }}
                formatter={(value: number) => [formatCurrency(value), ""]}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                height={40}
                iconType="circle"
                wrapperStyle={{
                  paddingBottom: "20px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em"
                }}
              />
              <Line 
                type="monotone" 
                dataKey="income" 
                name="Entradas" 
                stroke="#10B981" 
                strokeWidth={3} 
                dot={{ r: 4, fill: "#10B981", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
              />
              <Line 
                type="monotone" 
                dataKey="expense" 
                name="Saídas" 
                stroke="#F87171" 
                strokeWidth={3} 
                dot={{ r: 4, fill: "#F87171", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
              />
              <Line 
                type="monotone" 
                dataKey="balance" 
                name="Saldo" 
                stroke="#6366F1" 
                strokeWidth={3} 
                dot={{ r: 4, fill: "#6366F1", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution and Other Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="mb-8">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Distribuição</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gastos por Categoria</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-48 w-48 flex items-center justify-center flex-shrink-0 relative">
               <div className="w-44 h-44 rounded-full border-[15px] border-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(totalExpense)}</p>
                  </div>
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="96" cy="96" r="75" fill="none" stroke="#F87171" strokeWidth="15" strokeDasharray="471" strokeDashoffset={471 * (1 - 0.65)} strokeLinecap="round" />
                  </svg>
               </div>
            </div>
            <div className="flex-1 w-full space-y-3">
              {[
                { label: "Alimentação", value: "65%", color: "bg-rose-500" },
                { label: "Transporte", value: "20%", color: "bg-blue-500" },
                { label: "Lazer", value: "15%", color: "bg-amber-500" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/50 border border-gray-100/50">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2.5 h-2.5 rounded-full", item.color)}></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Diagnosis */}
        <div className="bg-white rounded-[32px] p-8 text-slate-900 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -mr-24 -mt-24"></div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-600 border border-gray-50">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">Diagnóstico IA</h3>
                <p className="text-[9px] text-slate-900/40 font-bold uppercase tracking-widest">Saúde Financeira Premium</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-600">{userProfile.financialScore}</span>
              <span className="text-xs font-bold text-slate-900/30">/100</span>
            </div>
          </div>
          
          <div className="space-y-4 relative z-10">
            <div className="p-5 rounded-2xl bg-white/5 border border-gray-50 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles size={14} className="text-emerald-600" />
                <p className="text-[9px] font-bold text-slate-900/80 uppercase tracking-widest">Recomendação</p>
              </div>
              <p className="text-[11px] text-slate-900/60 leading-relaxed font-medium italic">
                "Seu score subiu 5 pontos! Continue mantendo suas despesas fixas abaixo de 50% da renda para atingir o nível 'Expert' em 3 meses."
              </p>
            </div>
            <button onClick={() => onTabChange("diagnosis")} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-105 transition-all active:scale-95 shadow-lg shadow-emerald-600/20">
              Ver Relatório Completo
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Últimas Atividades</h3>
            <button onClick={() => onTabChange("statement")} className="text-[10px] font-black text-primary-green flex items-center gap-1 uppercase tracking-widest hover:underline">
              Ver Tudo <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {transactions.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 hover:bg-white hover:shadow-md transition-all group cursor-pointer border border-transparent hover:border-gray-100">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  t.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {t.type === "income" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{t.title || t.category}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{t.category}</p>
                </div>
                <p className={cn(
                  "text-xs font-black",
                  t.type === "income" ? "text-emerald-600" : "text-rose-600"
                )}>
                  {t.type === "income" ? "+" : "-"}{formatCurrency(t.value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Progress */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Metas e Objetivos</h3>
            <button onClick={() => onTabChange("goals")} className="text-[10px] font-black text-primary-green flex items-center gap-1 uppercase tracking-widest hover:underline">
              Ver Todas <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-4">
            {goalsStats.totalSaved > 0 ? (
              <div className="p-6 rounded-3xl bg-[#F4F7F6] border border-gray-100">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Guardado</p>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(goalsStats.totalSaved)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Saúde</p>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-widest">No Ritmo</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: '65%' }}></div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <Target size={28} />
                </div>
                <p className="text-xs text-gray-400 font-medium italic">Você ainda não tem metas ativas.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
