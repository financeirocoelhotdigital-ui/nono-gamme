import React, { useState } from "react";
import { useActionPlan } from "../context/ActionPlanContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight, 
  Play, 
  X, 
  RefreshCw,
  Info,
  ChevronRight,
  Target,
  Wallet,
  CreditCard,
  TrendingDown
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ActionItem, ActionPriority } from "../types";
import { cn } from "../lib/utils";

const priorityConfig: Record<ActionPriority, { icon: any, color: string, bg: string, label: string }> = {
  urgente: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", label: "Urgente" },
  importante: { icon: Clock, color: "text-amber-500", bg: "bg-amber-50", label: "Importante" },
  opcional: { icon: Info, color: "text-blue-500", bg: "bg-blue-50", label: "Opcional" }
};

const typeConfig: Record<string, { icon: any, color: string }> = {
  corte_gastos: { icon: TrendingDown, color: "text-red-500" },
  pagamento_divida: { icon: CreditCard, color: "text-orange-500" },
  reserva: { icon: Wallet, color: "text-emerald-500" },
  investimento: { icon: TrendingUp, color: "text-blue-500" },
  meta: { icon: Target, color: "text-purple-500" },
  outro: { icon: ChevronRight, color: "text-gray-500" }
};

export function AIActionPlan() {
  const { currentPlan, actionItems, loading, generating, refreshPlan, executeAction, ignoreAction } = useActionPlan();
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-gray-500 font-medium">Carregando seu plano de ação...</p>
        </div>
      </div>
    );
  }

  const pendingActions = actionItems.filter(a => a.status === "pendente");
  const completedActions = actionItems.filter(a => a.status === "concluido");

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <Sparkles className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Copiloto de Ação</h1>
          </div>
          <p className="text-gray-500 text-lg max-w-2xl leading-relaxed">
            Seu plano de ação personalizado gerado por IA para transformar sua vida financeira.
          </p>
        </div>
        <button
          onClick={refreshPlan}
          disabled={generating}
          className={cn(
            "flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold transition-all duration-300 shadow-sm",
            generating 
              ? "bg-gray-50 text-gray-400 cursor-not-allowed" 
              : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-95"
          )}
        >
          <RefreshCw className={cn("w-5 h-5", generating && "animate-spin")} />
          {generating ? "Analisando Dados..." : "Atualizar Plano"}
        </button>
      </div>

      {!currentPlan && !generating ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-10 h-10 text-indigo-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900">Nenhum plano ativo</h3>
            <p className="text-gray-500 max-w-md mx-auto text-lg">
              Clique no botão acima para que a IA analise seus dados e gere seu primeiro plano de ação estratégico.
            </p>
          </div>
          <button
            onClick={refreshPlan}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Gerar Plano Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Plan Column */}
          <div className="lg:col-span-2 space-y-6">
            {currentPlan && (
              <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                  <Sparkles className="w-32 h-32" />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-100 font-medium">
                    <Clock className="w-4 h-4" />
                    Atualizado em {format(new Date(currentPlan.date), "dd 'de' MMMM", { locale: ptBR })}
                  </div>
                  <h2 className="text-2xl font-bold leading-tight">Resumo Estratégico</h2>
                  <p className="text-indigo-50 text-lg leading-relaxed opacity-90">
                    {currentPlan.summary}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 px-2">
                Ações Recomendadas
                <span className="bg-gray-100 text-gray-500 text-sm px-2.5 py-0.5 rounded-full font-medium">
                  {pendingActions.length}
                </span>
              </h3>
              
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {pendingActions.map((action, index) => {
                    const priority = priorityConfig[action.priority];
                    const type = typeConfig[action.type] || typeConfig.outro;
                    
                    return (
                      <motion.div
                        key={action.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.1 }}
                        className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedAction(action)}
                      >
                        <div className="flex items-start gap-5">
                          <div className={cn("p-3.5 rounded-2xl bg-gray-50 group-hover:bg-white transition-colors", type.color)}>
                            <type.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider", priority.bg, priority.color)}>
                                <priority.icon className="w-3.5 h-3.5" />
                                {priority.label}
                              </div>
                              {action.deadline && (
                                <span className="text-sm text-gray-400 font-medium flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {action.deadline}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {action.title}
                              </h4>
                              <p className="text-gray-500 line-clamp-2 leading-relaxed">
                                {action.description}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-4">
                                {action.suggestedValue && (
                                  <span className="text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-lg">
                                    R$ {action.suggestedValue.toLocaleString()}
                                  </span>
                                )}
                                <span className="text-sm text-gray-400 font-medium">
                                  Impacto: <span className="text-gray-600">{action.impact}</span>
                                </span>
                              </div>
                              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {pendingActions.length === 0 && !generating && (
                  <div className="bg-emerald-50 p-12 rounded-3xl text-center space-y-4 border border-emerald-100">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-emerald-900">Tudo em dia!</h4>
                      <p className="text-emerald-700 opacity-80">Você concluiu todas as ações recomendadas. Parabéns pela evolução!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            {/* Progress Card */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Seu Progresso</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-gray-500">Ações Concluídas</span>
                  <span className="text-indigo-600">{completedActions.length} de {actionItems.length}</span>
                </div>
                <div className="h-3 bg-gray-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedActions.length / (actionItems.length || 1)) * 100}%` }}
                    className="h-full bg-indigo-600 rounded-full"
                  />
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Continue executando as ações para melhorar sua saúde financeira e atingir seus objetivos mais rápido.
                </p>
              </div>
            </div>

            {/* Completed Actions List */}
            {completedActions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 px-2">Concluídas Recentemente</h3>
                <div className="space-y-3">
                  {completedActions.slice(0, 5).map(action => (
                    <div key={action.id} className="bg-white p-4 rounded-2xl border border-gray-50 flex items-center gap-3 opacity-75">
                      <div className="p-2 bg-emerald-50 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-bold text-slate-900 truncate">{action.title}</h5>
                        <p className="text-xs text-gray-400">
                          {action.completedAt && format(new Date(action.completedAt), "dd/MM 'às' HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Detail Modal */}
      <AnimatePresence>
        {selectedAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-4 rounded-2xl bg-gray-50", typeConfig[selectedAction.type]?.color || "text-gray-500")}>
                      {(typeConfig[selectedAction.type] || typeConfig.outro).icon({ className: "w-8 h-8" })}
                    </div>
                    <div>
                      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2", priorityConfig[selectedAction.priority].bg, priorityConfig[selectedAction.priority].color)}>
                        {priorityConfig[selectedAction.priority].label}
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 leading-tight">{selectedAction.title}</h2>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedAction(null)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">O que fazer</h4>
                    <p className="text-lg text-gray-700 leading-relaxed">{selectedAction.description}</p>
                  </div>

                  <div className="bg-indigo-50 p-6 rounded-2xl space-y-3 border border-indigo-100">
                    <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Por que sugerimos isso?
                    </h4>
                    <p className="text-indigo-900 font-medium leading-relaxed">{selectedAction.why}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Impacto Esperado</span>
                      <p className="text-slate-900 font-bold">{selectedAction.impact}</p>
                    </div>
                    {selectedAction.deadline && (
                      <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prazo Sugerido</span>
                        <p className="text-slate-900 font-bold">{selectedAction.deadline}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
                  {selectedAction.executable ? (
                    <button
                      onClick={() => {
                        executeAction(selectedAction.id);
                        setSelectedAction(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Executar Ação
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        executeAction(selectedAction.id);
                        setSelectedAction(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Marcar como Concluída
                    </button>
                  )}
                  <button
                    onClick={() => {
                      ignoreAction(selectedAction.id);
                      setSelectedAction(null);
                    }}
                    className="px-8 py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95"
                  >
                    Ignorar Sugestão
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
