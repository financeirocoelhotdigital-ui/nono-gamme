import React from "react";
import { ShieldCheck, Sparkles, Check, AlertTriangle, ChevronRight, HelpCircle } from "lucide-react";
import { cn } from "../lib/utils";

interface DashboardHealthCardProps {
  score: number;
  monthsCovered: number;
  spentTotal: number;
  plannedTotal: number;
  incomeDropped: boolean;
  totalDebts: number;
  onTabChange: (tab: string) => void;
}

export function DashboardHealthCard({
  score,
  monthsCovered,
  spentTotal,
  plannedTotal,
  incomeDropped,
  totalDebts,
  onTabChange,
}: DashboardHealthCardProps) {
  // Score Classification
  const getScoreClassification = (scoreVal: number) => {
    if (scoreVal >= 85) return { label: "Excelente", color: "text-emerald-500", bg: "bg-emerald-500/10", barColor: "bg-emerald-500" };
    if (scoreVal >= 70) return { label: "Boa", color: "text-green-500", bg: "bg-green-500/10", barColor: "bg-green-500" };
    if (scoreVal >= 50) return { label: "Atenção", color: "text-amber-500", bg: "bg-amber-500/10", barColor: "bg-amber-500" };
    return { label: "Crítica", color: "text-rose-500", bg: "bg-rose-500/10", barColor: "bg-rose-500" };
  };

  const config = getScoreClassification(score);

  // Dynamic Pros and Cons
  const getProsAndCons = () => {
    const pros = [];
    const cons = [];

    if (monthsCovered >= 3) {
      pros.push(`Reserva de emergência cobre mais de ${monthsCovered.toFixed(0)} meses!`);
    } else {
      cons.push("Sua reserva de emergência cobre menos de 3 meses.");
    }

    const budgetRatio = plannedTotal > 0 ? spentTotal / plannedTotal : 0;
    if (budgetRatio > 0.85) {
      cons.push("Orçamento do mês está muito próximo do limite!");
    } else if (budgetRatio > 0 && budgetRatio <= 0.7) {
      pros.push("Ótimo controle do orçamento mensal.");
    }

    if (incomeDropped) {
      cons.push("Sua receita mensal caiu em relação ao mês anterior.");
    } else {
      pros.push("Receitas estáveis ou em crescimento.");
    }

    if (totalDebts > 2000) {
      cons.push("Atenção com o volume de dívidas abertas.");
    } else {
      pros.push("Dívidas gerais sob controle.");
    }

    return { pros: pros.slice(0, 2), cons: cons.slice(0, 2) };
  };

  const { pros, cons } = getProsAndCons();

  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-green/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-slate-900 border border-gray-100">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Saúde Financeira</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Diagnóstico IA em Tempo Real</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-slate-900">{score}</span>
          <span className="text-xs font-bold text-gray-400">/100</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Classificação</span>
          <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider", config.color, config.bg)}>
            {config.label}
          </span>
        </div>
        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden relative">
          <div className={cn("h-full rounded-full transition-all duration-1000", config.barColor)} style={{ width: `${score}%` }}></div>
        </div>
      </div>

      {/* Highlights Checklists */}
      <div className="space-y-3">
        {pros.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Pontos Fortes</span>
            <div className="space-y-1">
              {pros.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-600 font-medium leading-relaxed">
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={10} strokeWidth={3} />
                  </div>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {cons.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-gray-50">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Pontos de Atenção</span>
            <div className="space-y-1">
              {cons.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-600 font-medium leading-relaxed">
                  <div className="w-4 h-4 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle size={10} strokeWidth={3} />
                  </div>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Button Action */}
      <button
        onClick={() => onTabChange("diagnosis")}
        className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-slate-900 border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1 transition-all active:scale-95"
      >
        Acessar Diagnóstico Completo <ChevronRight size={12} />
      </button>
    </div>
  );
}
