import React from "react";
import { UserProfile } from "../types";
import { useContas } from "../context/ContasContext";
import { useTransacoes } from "../context/TransacoesContext";
import { useMetas } from "../context/MetasContext";
import { useDebts } from "../context/DebtsContext";
import { useFormat } from "../hooks/useFormat";
import { Wallet, Target, AlertCircle, TrendingUp, TrendingDown, ChevronRight, Bell, Sparkles, Calendar } from "lucide-react";
import { cn } from "../lib/utils";

interface DesktopSummaryPanelProps {
  userProfile: UserProfile | null;
}

export function DesktopSummaryPanel({ userProfile }: DesktopSummaryPanelProps) {
  const { formatCurrency } = useFormat(userProfile || undefined);
  const { accounts } = useContas();
  const { transactions } = useTransacoes();
  const { goals } = useMetas();
  const { debts } = useDebts();

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);
  
  const upcomingDebts = debts
    .filter(d => d.status !== "quitada")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 2);

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-100 overflow-y-auto custom-scrollbar">
      <div className="p-8 space-y-10">
        {/* User Quick Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-emerald-600 font-black shadow-lg shadow-primary-dark/10">
              {userProfile?.displayName?.charAt(0) || "U"}
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{userProfile?.displayName || "Usuário"}</p>
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Plano Premium</p>
            </div>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 text-gray-400 transition-all relative active:scale-95">
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
        </div>

        {/* Total Balance Card */}
        <div className="bg-white rounded-[32px] p-8 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] shadow-primary-dark/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-emerald-50"></div>
          <p className="text-[9px] font-black text-slate-900/40 uppercase tracking-[0.2em] mb-2">Patrimônio em Contas</p>
          <h3 className="text-3xl font-black tracking-tighter mb-6">{formatCurrency(totalBalance)}</h3>
          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-white/5 w-fit px-4 py-2 rounded-xl border border-gray-50 backdrop-blur-sm uppercase tracking-widest">
            <TrendingUp size={14} />
            <span>+R$ 1.250,00 (Este Mês)</span>
          </div>
        </div>

        {/* Recent Transactions */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Atividade Recente</h3>
            <button className="text-[10px] font-black text-primary-green hover:underline uppercase tracking-widest">Ver Tudo</button>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100/50 hover:bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all group cursor-pointer">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  t.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {t.type === "income" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-900 truncate tracking-tight">{t.title || t.category}</p>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{t.category}</p>
                </div>
                <p className={cn(
                  "text-[11px] font-black tracking-tight",
                  t.type === "income" ? "text-emerald-600" : "text-rose-600"
                )}>
                  {t.type === "income" ? "+" : "-"}{formatCurrency(t.value)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Upcoming Bills */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Contas a Vencer</h3>
          </div>
          <div className="space-y-4">
            {upcomingDebts.length > 0 ? upcomingDebts.map((d) => (
              <div key={d.id} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all group cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{d.name}</span>
                  <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg uppercase tracking-widest">Vence em 3 dias</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-900 tracking-tighter">{formatCurrency(d.remainingValue)}</span>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 group-hover:bg-white group-hover:text-slate-900 transition-all active:scale-90">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">Nenhuma conta próxima</p>
              </div>
            )}
          </div>
        </section>

        {/* AI Insight Mini */}
        <div className="bg-indigo-50 rounded-[32px] p-6 border border-indigo-100 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-indigo-600" />
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Dica da IA</span>
          </div>
          <p className="text-[11px] text-indigo-900 font-bold leading-relaxed italic">
            "Você economizou R$ 200 em lazer este mês. Que tal aplicar esse valor no seu cofrinho de viagem?"
          </p>
        </div>

        {/* Calendar Mini */}
        <section className="pt-4">
           <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Calendário</h3>
            <Calendar size={16} className="text-gray-400" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={cn(
                "h-10 flex flex-col items-center justify-center rounded-xl text-[10px] font-black transition-all cursor-pointer",
                i === 3 ? "bg-white text-emerald-600 shadow-lg shadow-primary-dark/20" : "text-gray-400 hover:bg-gray-50"
              )}>
                <span className="text-[8px] opacity-50 mb-0.5">SEG</span>
                {10 + i}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
