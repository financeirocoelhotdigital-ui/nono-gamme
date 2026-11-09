import React, { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Landmark, ArrowUpRight, ArrowDownRight, Eye, EyeOff, Scale } from "lucide-react";
import { cn } from "../lib/utils";

interface DashboardOverviewCardProps {
  totalBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  totalDebts: number;
  totalInvestments: number;
  totalWealth: number;
  incomeGrowth: number;
  expenseGrowth: number;
  savingsGrowth: number;
  formatCurrency: (value: number) => string;
}

export function DashboardOverviewCard({
  totalBalance,
  thisMonthIncome,
  thisMonthExpense,
  totalDebts,
  totalInvestments,
  totalWealth,
  incomeGrowth,
  expenseGrowth,
  savingsGrowth,
  formatCurrency,
}: DashboardOverviewCardProps) {
  const [hideValues, setHideValues] = useState(false);

  const patrimonioLiquido = (totalBalance + totalInvestments + totalWealth) - totalDebts;
  const thisMonthSavings = thisMonthIncome - thisMonthExpense;

  const renderValue = (val: number, isCurrency: boolean = true) => {
    if (hideValues) return "••••••";
    return isCurrency ? formatCurrency(val) : val;
  };

  const getGrowthBadge = (growth: number, type: "income" | "expense" | "savings") => {
    const isPositive = growth > 0;
    const isZero = growth === 0;
    
    let text = `${isPositive ? "+" : ""}${growth.toFixed(1)}%`;
    if (isZero) text = "0%";

    let colorClass = "";
    if (type === "income") {
      colorClass = isPositive ? "text-emerald-500 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10";
    } else if (type === "expense") {
      colorClass = isPositive ? "text-rose-400 bg-rose-500/10" : "text-emerald-500 bg-emerald-500/10";
    } else {
      colorClass = isPositive ? "text-emerald-500 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10";
    }

    return (
      <div className={cn("inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider", colorClass)}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {text}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[32px] p-7 text-slate-900 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-50 rounded-full blur-[80px] -mr-[150px] -mt-[150px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[60px] -ml-[100px] -mb-[100px] pointer-events-none mix-blend-screen"></div>

      {/* Header */}
      <div className="flex items-center justify-between relative z-10 mb-8">
        <div>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] bg-emerald-50 px-3 py-1 rounded-full border border-primary-lime/20 flex items-center w-max gap-2">
            <Scale size={10} /> Visão Geral
          </span>
        </div>
        <button
          onClick={() => setHideValues(!hideValues)}
          className="p-2.5 text-gray-400 hover:text-slate-900 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-gray-50"
          title={hideValues ? "Mostrar valores" : "Ocultar valores"}
        >
          {hideValues ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Main Balances */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex-1 p-6 rounded-[24px] bg-white/[0.02] border border-gray-50 backdrop-blur-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-lime/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-2">Patrimônio Líquido</span>
            <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
              {renderValue(patrimonioLiquido)}
            </h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-3 flex items-center gap-1.5">
              <Landmark size={12} className="text-gray-400" /> Total Consolidado
            </p>
          </div>

          <div className="p-5 rounded-[24px] bg-white/[0.02] border border-gray-50 flex flex-row items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-1">Saldo Disponível</span>
              <h4 className="text-xl font-black text-emerald-600 tracking-tight">
                {renderValue(totalBalance)}
              </h4>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-primary-lime/20 flex items-center justify-center text-emerald-600">
              <Wallet size={20} />
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
          {/* Income */}
          <div className="p-5 rounded-[24px] bg-white/[0.02] border border-gray-50 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <TrendingUp size={16} />
              </div>
              {getGrowthBadge(incomeGrowth, "income")}
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-1">Receitas do Mês</span>
              <h4 className="text-lg font-black text-emerald-400 tracking-tight">
                {renderValue(thisMonthIncome)}
              </h4>
            </div>
          </div>

          {/* Expenses */}
          <div className="p-5 rounded-[24px] bg-white/[0.02] border border-gray-50 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <TrendingDown size={16} />
              </div>
              {getGrowthBadge(expenseGrowth, "expense")}
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-1">Despesas do Mês</span>
              <h4 className="text-lg font-black text-rose-400 tracking-tight">
                {renderValue(thisMonthExpense)}
              </h4>
            </div>
          </div>

          {/* Savings */}
          <div className="p-5 rounded-[24px] bg-white/[0.02] border border-gray-50 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Wallet size={16} />
              </div>
              {getGrowthBadge(savingsGrowth, "savings")}
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-1">Economia Atual</span>
              <h4 className="text-lg font-black text-emerald-600 tracking-tight">
                {renderValue(thisMonthSavings)}
              </h4>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="p-5 rounded-[24px] bg-white/[0.02] border border-gray-50 flex flex-col justify-center gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Investimentos</span>
              <h4 className="text-sm font-black text-blue-400 tracking-tight">
                {renderValue(totalInvestments)}
              </h4>
            </div>
            <div className="h-[1px] w-full bg-white/5"></div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Dívidas Ativas</span>
              <h4 className="text-sm font-black text-rose-400 tracking-tight">
                {renderValue(totalDebts)}
              </h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

