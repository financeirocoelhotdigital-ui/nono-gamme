import React, { useState } from "react";
import { useInsights } from "../context/InsightsContext";
import { useActionPlan } from "../context/ActionPlanContext";
import { StrategicInsight, UserProfile, ActionItem } from "../types";
import { 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  Archive, 
  Trash2,
  ChevronRight,
  Info,
  Zap,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialInsightsProps {
  userProfile: UserProfile;
}

export const FinancialInsights: React.FC<FinancialInsightsProps> = ({ userProfile }) => {
  const { insights, isLoading, refreshInsights, archiveInsight, deleteInsight } = useInsights();
  const { addActionItem } = useActionPlan();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshInsights(userProfile);
    setIsRefreshing(false);
  };

  const getPriorityColor = (priority: StrategicInsight["priority"]) => {
    switch (priority) {
      case "urgente": return "text-red-600 bg-red-50 border-red-100";
      case "importante": return "text-amber-600 bg-amber-50 border-amber-100";
      case "informativo": return "text-blue-600 bg-blue-50 border-blue-100";
      default: return "text-gray-600 bg-gray-50 border-gray-100";
    }
  };

  const getTypeIcon = (type: StrategicInsight["type"]) => {
    switch (type) {
      case "alerta": return <AlertTriangle className="w-5 h-5" />;
      case "sugestao": return <Lightbulb className="w-5 h-5" />;
      case "padrao": return <TrendingUp className="w-5 h-5" />;
      case "oportunidade": return <Zap className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const handleTransformToAction = async (insight: StrategicInsight) => {
    const actionItem: Omit<ActionItem, "id"> = {
      userId: userProfile.uid,
      planId: "manual_insight",
      title: insight.title,
      description: insight.solution,
      why: insight.explanation,
      priority: insight.priority === "urgente" ? "urgente" : insight.priority === "importante" ? "importante" : "opcional",
      status: "pendente",
      type: "outro",
      executable: false,
      impact: insight.impact,
      createdAt: new Date().toISOString(),
    };

    try {
      await addActionItem(actionItem);
      // Mark insight as having an action generated
      // For now we just show a success message or disable the button
      ((window as any).mostrarMensagem || window.alert)("Ação criada com sucesso no seu Plano de Ação!");
    } catch (error) {
      console.error("Error creating action from insight:", error);
    }
  };

  const activeInsights = insights.filter(i => i.status === "ativo");
  const archivedInsights = insights.filter(i => i.status === "arquivado");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-8 h-8 text-indigo-600" />
            Insights Estratégicos
          </h1>
          <p className="text-gray-500 mt-1">
            Análise inteligente do seu comportamento financeiro com sugestões práticas.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-slate-900 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Analisando Dados...' : 'Gerar Novos Insights'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-amber-500" />
              Insights Ativos
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full">
                {activeInsights.length}
              </span>
            </h2>
          </div>

          <AnimatePresence mode="popLayout">
            {activeInsights.length > 0 ? (
              activeInsights.map((insight) => (
                <motion.div
                  key={insight.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-6 rounded-2xl border-2 bg-white shadow-sm transition-all hover:shadow-md ${getPriorityColor(insight.priority)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                        {getTypeIcon(insight.type)}
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                          {insight.type} • {insight.priority}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">{insight.title}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => archiveInsight(insight.id)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Arquivar"
                      >
                        <Archive className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteInsight(insight.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-white/50 rounded-xl border border-white/20">
                      <p className="text-gray-700 leading-relaxed">
                        <span className="font-semibold text-slate-900">O que está acontecendo:</span> {insight.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                          <Info className="w-4 h-4" /> Por que isso importa?
                        </h4>
                        <p className="text-sm text-gray-600">{insight.explanation}</p>
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" /> Impacto Esperado
                        </h4>
                        <p className="text-sm text-gray-600">{insight.impact}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                      <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                        Sugestão Prática
                      </h4>
                      <p className="text-indigo-800 font-medium">{insight.solution}</p>
                      {insight.value && (
                        <p className="text-indigo-600 text-sm font-bold mt-1">
                          Valor estimado: R$ {insight.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-gray-400">
                        Detectado em {format(new Date(insight.date), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleTransformToAction(insight)}
                          className="flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                        >
                          <Plus className="w-4 h-4" /> Criar Ação
                        </button>
                        <button className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700">
                          Ver detalhes <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Nenhum insight ativo</h3>
                <p className="text-gray-500 max-w-xs mx-auto mt-2">
                  Clique no botão acima para que nossa IA analise seus dados e gere novas sugestões.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Resumo da Análise
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Total de Insights</span>
                <span className="font-bold text-slate-900">{insights.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <span className="text-sm text-red-600">Urgentes</span>
                <span className="font-bold text-red-700">
                  {insights.filter(i => i.priority === "urgente" && i.status === "ativo").length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                <span className="text-sm text-indigo-600">Sugestões</span>
                <span className="font-bold text-indigo-700">
                  {insights.filter(i => i.type === "sugestao" && i.status === "ativo").length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Archive className="w-5 h-5 text-gray-500" />
              Arquivados
            </h3>
            <div className="space-y-3">
              {archivedInsights.length > 0 ? (
                archivedInsights.slice(0, 5).map(insight => (
                  <div key={insight.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between group">
                    <div className="truncate pr-4">
                      <p className="text-sm font-bold text-gray-700 truncate">{insight.title}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(insight.date), "dd/MM/yy")}
                      </p>
                    </div>
                    <button 
                      onClick={() => deleteInsight(insight.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-4 italic">
                  Nenhum insight arquivado.
                </p>
              )}
              {archivedInsights.length > 5 && (
                <button className="w-full text-center text-sm font-bold text-indigo-600 mt-2">
                  Ver todos arquivados
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
