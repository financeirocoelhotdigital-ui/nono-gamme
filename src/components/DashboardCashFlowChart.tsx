import React, { useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw, Calendar, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { cn } from "../lib/utils";
import { Transaction } from "../types";

interface DashboardCashFlowChartProps {
  transactions: Transaction[];
  formatCurrency: (value: number) => string;
}

export function DashboardCashFlowChart({
  transactions,
  formatCurrency,
}: DashboardCashFlowChartProps) {
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "12M">("7D");

  // Calculations for last 7 Days
  const get7DaysData = () => {
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
        fullDate: d.toLocaleDateString("pt-BR"),
        Entradas: income,
        Saídas: expense,
        Saldo: income - expense,
      });
    }
    return data;
  };

  // Calculations for last 30 Days
  const get30DaysData = () => {
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
      const income = dayTransactions.filter(t => t.type === "income").reduce((acc, curr) => acc + curr.value, 0);
      const expense = dayTransactions.filter(t => t.type === "expense").reduce((acc, curr) => acc + curr.value, 0);
      data.push({
        name: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        fullDate: d.toLocaleDateString("pt-BR"),
        Entradas: income,
        Saídas: expense,
        Saldo: income - expense,
      });
    }
    return data;
  };

  // Calculations for last 12 Months
  const get12MonthsData = () => {
    const data = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const monthIndex = d.getMonth();
      const year = d.getFullYear();
      
      const monthTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === monthIndex && txDate.getFullYear() === year;
      });
      const income = monthTransactions.filter(t => t.type === "income").reduce((acc, curr) => acc + curr.value, 0);
      const expense = monthTransactions.filter(t => t.type === "expense").reduce((acc, curr) => acc + curr.value, 0);
      data.push({
        name: d.toLocaleDateString("pt-BR", { month: "short" }),
        fullDate: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
        Entradas: income,
        Saídas: expense,
        Saldo: income - expense,
      });
    }
    return data;
  };

  const chartData = timeframe === "7D" 
    ? get7DaysData() 
    : timeframe === "30D" 
      ? get30DaysData() 
      : get12MonthsData();

  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
            Fluxo de Caixa
          </h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
            Análise e acompanhamento das movimentações de caixa
          </p>
        </div>

        {/* Filters Toggle */}
        <div className="flex bg-gray-50 border border-gray-100 p-1 rounded-2xl">
          {(["7D", "30D", "12M"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                timeframe === t 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-gray-400 hover:text-slate-900"
              )}
            >
              {t === "7D" ? "7 dias" : t === "30D" ? "30 dias" : "12 meses"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }} 
              dy={10} 
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
              tickFormatter={(value) => `R$ ${value}`}
              width={75}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: "20px", 
                border: "1px solid #f1f5f9", 
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", 
                padding: "16px",
                backgroundColor: "#fff"
              }}
              labelClassName="font-black text-slate-900 text-xs mb-1.5 uppercase tracking-wide"
              itemStyle={{ fontWeight: "bold", fontSize: "11px", padding: "1px 0" }}
              formatter={(value: number) => [formatCurrency(value), ""]}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              height={36}
              iconType="circle"
              wrapperStyle={{
                paddingBottom: "10px",
                fontSize: "9px",
                fontWeight: "black",
                textTransform: "uppercase",
                letterSpacing: "0.12em"
              }}
            />
            <Line 
              type="monotone" 
              dataKey="Entradas" 
              stroke="#10B981" 
              strokeWidth={3} 
              dot={{ r: 3, fill: "#10B981", strokeWidth: 1.5, stroke: "#fff" }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line 
              type="monotone" 
              dataKey="Saídas" 
              stroke="#F87171" 
              strokeWidth={3} 
              dot={{ r: 3, fill: "#F87171", strokeWidth: 1.5, stroke: "#fff" }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line 
              type="monotone" 
              dataKey="Saldo" 
              stroke="#6366F1" 
              strokeWidth={3} 
              dot={{ r: 3, fill: "#6366F1", strokeWidth: 1.5, stroke: "#fff" }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
