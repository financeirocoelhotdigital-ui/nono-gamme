import React, { useState, useEffect } from "react";
import { FamilyMember, DependencyAnalysis, FamilyMemberType, FamilyIncome, FamilyGoal, FamilyFinancialAnalysis, FamilyIncomeType, FamilyDistribution } from "../types";
import { formatCurrency, cn } from "../lib/utils";
import { Users, Plus, UserPlus, MoreVertical, Heart, TrendingUp, TrendingDown, Trash2, X, Edit2, Brain, ShieldAlert, Target, Info, ArrowRight, Zap, Clock, Wallet, PieChart, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFamily } from "../context/FamilyContext";
import { analyzeFinancialDependency, analyzeFamilyFinances } from "../services/geminiService";

const Family: React.FC = () => {
  const { 
    family, incomes, goals, loading, analysis, financialAnalysis, 
    addMember, updateMember, deleteMember,
    addIncome, updateIncome, deleteIncome,
    addGoal, updateGoal, deleteGoal,
    updateDistribution
  } = useFamily();
  const [activeTab, setActiveTab] = useState<"dependency" | "finances" | "goals">("dependency");
  const [isAdding, setIsAdding] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [editingIncome, setEditingIncome] = useState<FamilyIncome | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FamilyGoal | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [financeInsights, setFinanceInsights] = useState<{ aiSuggestions: string; balanceAnalysis: string } | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);

  const totalFamilyIncome = incomes.reduce((acc, i) => acc + i.value, 0);
  const totalFamilyExpenses = family.reduce((acc, m) => acc + (m.monthlyExpenses || 0), 0);

  useEffect(() => {
    if (analysis && !aiInsights && !isAnalyzing) {
      handleAnalyzeDependency();
    }
    if (financialAnalysis && !financeInsights && !isAnalyzing) {
      handleAnalyzeFinances();
    }
  }, [analysis, financialAnalysis]);

  const handleAnalyzeDependency = async () => {
    if (!analysis) return;
    setIsAnalyzing(true);
    try {
      const insights = await analyzeFinancialDependency(family, analysis);
      setAiInsights(insights);
    } catch (error) {
      console.error("Erro ao analisar dependência:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeFinances = async () => {
    if (!financialAnalysis) return;
    setIsAnalyzing(true);
    try {
      const insights = await analyzeFamilyFinances(family, incomes, goals, financialAnalysis);
      setFinanceInsights(insights);
    } catch (error) {
      console.error("Erro ao analisar finanças familiares:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão Familiar</h1>
          <p className="text-sm text-gray-500">Controle de dependência, rendas e metas coletivas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="bg-gray-100 p-1 rounded-2xl flex">
            <button 
              onClick={() => setActiveTab("dependency")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === "dependency" ? "bg-white text-slate-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Dependência
            </button>
            <button 
              onClick={() => setActiveTab("finances")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === "finances" ? "bg-white text-slate-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Rendas
            </button>
            <button 
              onClick={() => setActiveTab("goals")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === "goals" ? "bg-white text-slate-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Metas
            </button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSimulation(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              <Zap size={18} />
              <span className="hidden sm:inline">Simular</span>
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Novo Membro</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && <FamilyMemberForm onClose={() => setIsAdding(false)} onSave={addMember} members={family} />}
        {editingMember && <FamilyMemberForm onClose={() => setEditingMember(null)} onSave={(data) => updateMember(editingMember.id, data)} initialData={editingMember} members={family} />}
        {isAddingIncome && <IncomeForm onClose={() => setIsAddingIncome(false)} onSave={addIncome} members={family} />}
        {editingIncome && <IncomeForm onClose={() => setEditingIncome(null)} onSave={(data) => updateIncome(editingIncome.id, data)} initialData={editingIncome} members={family} />}
        {isAddingGoal && <GoalForm onClose={() => setIsAddingGoal(false)} onSave={addGoal} members={family} />}
        {editingGoal && <GoalForm onClose={() => setEditingGoal(null)} onSave={(data) => updateGoal(editingGoal.id, data)} initialData={editingGoal} members={family} />}
        {showSimulation && <SimulationModal onClose={() => setShowSimulation(false)} family={family} analysis={analysis!} financialAnalysis={financialAnalysis} />}
      </AnimatePresence>

      {activeTab === "dependency" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Dashboard de Indicadores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 premium-shadow">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dependentes</p>
                <h4 className="text-2xl font-black text-slate-900">{analysis?.totalDependents || 0}</h4>
                <p className="text-[10px] text-gray-500 mt-1">Pessoas que dependem de você</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 premium-shadow">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Custo Mensal</p>
                <h4 className="text-2xl font-black text-slate-900">{formatCurrency(analysis?.totalDependentCost || 0)}</h4>
                <p className="text-[10px] text-gray-500 mt-1">Impacto direto no seu caixa</p>
              </div>
              <div className={cn(
                "p-6 rounded-3xl border premium-shadow",
                analysis?.riskLevel === "saudavel" ? "bg-primary-green/10 border-primary-green/20" :
                analysis?.riskLevel === "atencao" ? "bg-orange-50 border-orange-100" : "bg-red-50 border-red-100"
              )}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">Índice de Dependência</p>
                <h4 className={cn(
                  "font-black text-2xl",
                  analysis?.riskLevel === "saudavel" ? "text-primary-green" :
                  analysis?.riskLevel === "atencao" ? "text-orange-600" : "text-red-600"
                )}>{analysis?.dependencyIndex.toFixed(1)}%</h4>
                <p className="text-[10px] opacity-60 mt-1">da sua renda comprometida</p>
              </div>
            </div>

            {/* IA Insights */}
            {analysis && (
              <div className="bg-white rounded-4xl p-8 text-slate-900 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                      <Brain size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Análise do Copiloto</h3>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Inteligência Familiar</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed italic">
                    {isAnalyzing ? "Analisando dependência financeira..." : aiInsights || "Adicione membros para uma análise completa."}
                  </p>
                  {analysis.userOverload && (
                    <div className="mt-4 flex items-center gap-2 text-red-400">
                      <ShieldAlert size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">Risco de Sobrecarga Detectado</span>
                    </div>
                  )}
                </div>
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-50 rounded-full blur-3xl"></div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900 px-2">Membros e Dependência</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {family.map((member) => {
                  const dependency = (member.monthlyExpenses || 0) - member.income;
                  const isDependent = dependency > 0;
                  
                  return (
                    <motion.div 
                      key={member.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white p-6 rounded-3xl border border-gray-100 premium-shadow flex flex-col gap-4 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center text-slate-900 font-bold text-xl",
                            member.type === "usuario" ? "bg-emerald-500" : "bg-gray-100"
                          )}>
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900">{member.name}</h4>
                              {member.type === "usuario" && <span className="px-2 py-0.5 rounded-full bg-white text-slate-900 text-[8px] font-bold uppercase">Você</span>}
                            </div>
                            <p className="text-xs text-gray-500">{member.relationship}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingMember(member)}
                            className="p-2 text-gray-400 hover:text-primary-green"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm(`Deseja remover ${member.name}?`)) {
                                deleteMember(member.id);
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-rose-600"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Renda</p>
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(member.income)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gastos</p>
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(member.monthlyExpenses || 0)}</p>
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-2xl flex items-center justify-between",
                        isDependent ? "bg-red-50" : "bg-primary-green/10"
                      )}>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Status</span>
                        <div className="flex items-center gap-2">
                          {isDependent ? (
                            <>
                              <TrendingDown size={14} className="text-red-500" />
                              <span className="text-xs font-bold text-red-600">Dependente ({formatCurrency(dependency)})</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp size={14} className="text-primary-green" />
                              <span className="text-xs font-bold text-primary-green">Independente</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Gráfico de Distribuição (Simulado com Barras) */}
            <div className="bg-white rounded-4xl p-6 border border-gray-100 premium-shadow">
              <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary-green" />
                Distribuição de Gastos
              </h3>
              <div className="space-y-6">
                {family.map(member => {
                  const percentage = totalFamilyExpenses > 0 ? ((member.monthlyExpenses || 0) / totalFamilyExpenses) * 100 : 0;
                  if (percentage === 0) return null;
                  
                  return (
                    <div key={member.id} className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">{member.name}</span>
                        <span className="font-bold text-slate-900">{percentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={cn(
                            "h-full rounded-full",
                            member.type === "usuario" ? "bg-white" : "bg-primary-green"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alertas de Risco */}
            {analysis && analysis.riskLevel !== "saudavel" && (
              <div className="bg-orange-50 rounded-4xl p-6 border border-orange-100">
                <h3 className="text-sm font-bold text-orange-700 mb-4 flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Alertas de Risco
                </h3>
                <div className="space-y-3">
                  {analysis.dependencyIndex > 50 && (
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                      <p className="text-xs text-orange-800 leading-relaxed">
                        Sua dependência financeira está acima de 50%. Qualquer variação na sua renda pode impactar toda a família.
                      </p>
                    </div>
                  )}
                  {analysis.totalDependents >= 3 && (
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                      <p className="text-xs text-orange-800 leading-relaxed">
                        Número elevado de dependentes. Recomenda-se aumentar a reserva de emergência para 12 meses.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-4xl p-6 text-slate-900">
              <h3 className="text-sm font-bold mb-4">Visão Consolidada</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Renda Total</span>
                  <span className="text-sm font-bold">{formatCurrency(totalFamilyIncome)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Gastos Totais</span>
                  <span className="text-sm font-bold">{formatCurrency(totalFamilyExpenses)}</span>
                </div>
                <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-600">Saldo Familiar</span>
                  <span className="text-lg font-black text-emerald-600">{formatCurrency(totalFamilyIncome - totalFamilyExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "finances" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Dashboard de Rendas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 premium-shadow">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Renda Total Familiar</p>
                <h4 className="text-2xl font-black text-slate-900">{formatCurrency(financialAnalysis?.totalIncome || 0)}</h4>
                <p className="text-[10px] text-gray-500 mt-1">Soma de todas as fontes</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 premium-shadow">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contribuição Média</p>
                <h4 className="text-2xl font-black text-slate-900">
                  {family.length > 0 ? (100 / family.length).toFixed(0) : 0}%
                </h4>
                <p className="text-[10px] text-gray-500 mt-1">Por membro da família</p>
              </div>
              <div className="bg-primary-green/10 p-6 rounded-3xl border border-primary-green/20 premium-shadow">
                <p className="text-[10px] font-bold text-primary-green uppercase tracking-widest mb-1">Renda Disponível</p>
                <h4 className="text-2xl font-black text-primary-green">
                  {formatCurrency((financialAnalysis?.totalIncome || 0) - totalFamilyExpenses)}
                </h4>
                <p className="text-[10px] text-primary-green/60 mt-1">Após despesas básicas</p>
              </div>
            </div>

            {/* IA Finance Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 premium-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Sugestões de IA</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed italic">
                  {isAnalyzing ? "Gerando sugestões..." : financeInsights?.aiSuggestions || "Adicione rendas para análise."}
                </p>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-gray-100 premium-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-900">
                    <PieChart size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Análise de Equilíbrio</h3>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed italic">
                  {isAnalyzing ? "Analisando equilíbrio..." : financeInsights?.balanceAnalysis || "Adicione membros e rendas."}
                </p>
              </div>
            </div>

            {/* Lista de Rendas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold text-slate-900">Fontes de Renda</h3>
                <button 
                  onClick={() => setIsAddingIncome(true)}
                  className="text-xs font-bold text-primary-green flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Adicionar Renda
                </button>
              </div>
              <div className="bg-white rounded-3xl border border-gray-100 premium-shadow overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <tr>
                      <th className="px-6 py-4">Membro</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Valor</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {incomes.map(income => {
                      const member = family.find(m => m.id === income.memberId);
                      return (
                        <tr key={income.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold">
                                {member?.name.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-900">{member?.name || "Desconhecido"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="capitalize text-gray-500">{income.type}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-900">{formatCurrency(income.value)}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {new Date(income.receiveDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingIncome(income)} className="p-1 text-gray-400 hover:text-primary-green">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => {
                                if (window.confirm("Remover esta renda?")) deleteIncome(income.id);
                              }} className="p-1 text-gray-400 hover:text-rose-600">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Distribuição de Renda */}
            <div className="bg-white rounded-4xl p-6 border border-gray-100 premium-shadow">
              <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                <PieChart size={16} className="text-primary-green" />
                Distribuição Recomendada
              </h3>
              <div className="space-y-6">
                {[
                  { label: "Despesas", key: "expenses", color: "bg-white" },
                  { label: "Estilo de Vida", key: "lifestyle", color: "bg-primary-green" },
                  { label: "Metas", key: "goals", color: "bg-emerald-500" },
                  { label: "Reserva", key: "reserve", color: "bg-gray-300" }
                ].map(item => (
                  <div key={item.key} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-medium">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {financialAnalysis?.distribution[item.key as keyof FamilyDistribution]}%
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ({formatCurrency((financialAnalysis?.totalIncome || 0) * (financialAnalysis?.distribution[item.key as keyof FamilyDistribution] || 0) / 100)})
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${financialAnalysis?.distribution[item.key as keyof FamilyDistribution]}%` }}
                        className={cn("h-full rounded-full", item.color)}
                      />
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const newDist = { ...financialAnalysis?.distribution } as FamilyDistribution;
                    // Simple example: toggle reserve
                    newDist.reserve = newDist.reserve === 0 ? 10 : 0;
                    newDist.expenses = 100 - newDist.lifestyle - newDist.goals - newDist.reserve;
                    updateDistribution(newDist);
                  }}
                  className="w-full py-2 text-[10px] font-bold text-slate-900 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Personalizar Distribuição
                </button>
              </div>
            </div>

            {/* Alertas Financeiros */}
            {financialAnalysis?.alerts.length! > 0 && (
              <div className="bg-red-50 rounded-4xl p-6 border border-red-100">
                <h3 className="text-sm font-bold text-red-700 mb-4 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Alertas Financeiros
                </h3>
                <div className="space-y-3">
                  {financialAnalysis?.alerts.map((alert, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                        alert.type === "danger" ? "bg-red-500" : "bg-orange-500"
                      )} />
                      <p className={cn(
                        "text-xs leading-relaxed",
                        alert.type === "danger" ? "text-red-800" : "text-orange-800"
                      )}>
                        {alert.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "goals" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Dashboard de Metas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 premium-shadow">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Metas Ativas</p>
                <h4 className="text-2xl font-black text-slate-900">{goals.filter(g => g.status === "ativa").length}</h4>
                <p className="text-[10px] text-gray-500 mt-1">Planejamento em curso</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 premium-shadow text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Progresso Geral</p>
                <div className="flex items-center justify-center gap-2">
                  <h4 className="text-2xl font-black text-slate-900">{financialAnalysis?.goalsProgress.toFixed(0)}%</h4>
                  <div className="w-12 h-12">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <path className="text-gray-100" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                      <path className="text-primary-green" strokeDasharray={`${financialAnalysis?.goalsProgress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-emerald-50 p-6 rounded-3xl border border-primary-lime/30 premium-shadow">
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1">Total Acumulado</p>
                <h4 className="text-2xl font-black text-slate-900">
                  {formatCurrency(goals.reduce((acc, g) => acc + g.currentValue, 0))}
                </h4>
                <p className="text-[10px] text-slate-900/60 mt-1">Soma de todas as metas</p>
              </div>
            </div>

            {/* Lista de Metas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-lg font-bold text-slate-900">Metas Compartilhadas</h3>
                <button 
                  onClick={() => setIsAddingGoal(true)}
                  className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                >
                  <Plus size={14} /> Nova Meta
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map(goal => {
                  const progress = (goal.currentValue / goal.targetValue) * 100;
                  return (
                    <motion.div 
                      key={goal.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white p-6 rounded-3xl border border-gray-100 premium-shadow space-y-4 group"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900">{goal.name}</h4>
                          <p className="text-xs text-gray-500">Prazo: {new Date(goal.deadline).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingGoal(goal)} className="p-1 text-gray-400 hover:text-primary-green">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => {
                            if (window.confirm("Remover esta meta?")) deleteGoal(goal.id);
                          }} className="p-1 text-gray-400 hover:text-rose-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-900">{progress.toFixed(0)}%</span>
                          <span className="text-gray-400">{formatCurrency(goal.currentValue)} / {formatCurrency(goal.targetValue)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Contribuições da Família</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(goal.memberContributions).map(([memberId, value]) => {
                            const member = family.find(m => m.id === memberId);
                            return (
                              <div key={memberId} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-bold">
                                  {member?.name.charAt(0)}
                                </div>
                                <span className="text-[10px] font-bold text-slate-900">{formatCurrency(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Planejamento de Aportes */}
            <div className="bg-white rounded-4xl p-6 text-slate-900">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                <Clock size={16} className="text-emerald-600" />
                Próximos Aportes
              </h3>
              <div className="space-y-4">
                {goals.filter(g => g.status === "ativa").map(goal => (
                  <div key={goal.id} className="p-4 rounded-2xl bg-white/5 border border-gray-50 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold">{goal.name}</span>
                      <span className="text-[10px] text-emerald-600 uppercase font-bold">Mensal</span>
                    </div>
                    {Object.entries(goal.plannedMonthlyContributions).map(([memberId, plan]) => {
                      const member = family.find(m => m.id === memberId);
                      const value = plan.type === "fixed" ? plan.value : (member?.income || 0) * plan.value / 100;
                      return (
                        <div key={memberId} className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-400">{member?.name}</span>
                          <span className="font-bold">{formatCurrency(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <button className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all">
                  Executar Aportes do Mês
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function IncomeForm({ onClose, onSave, initialData, members }: { onClose: () => void, onSave: any, initialData?: FamilyIncome, members: FamilyMember[] }) {
  const [memberId, setMemberId] = useState(initialData?.memberId || members[0]?.id || "");
  const [type, setType] = useState<FamilyIncomeType>(initialData?.type || "salario");
  const [value, setValue] = useState(initialData?.value.toString() || "0");
  const [recurrent, setRecurrent] = useState(initialData?.recurrent ?? true);
  const [receiveDate, setReceiveDate] = useState(initialData?.receiveDate || new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState(initialData?.description || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !value) return;

    const data = {
      memberId,
      type,
      value: parseFloat(value) || 0,
      recurrent,
      receiveDate,
      description
    };

    await onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg rounded-t-[40px] bg-white p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">{initialData ? "Editar Renda" : "Nova Renda"}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Membro da Família</label>
            <select value={memberId} onChange={e => setMemberId(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm">
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo de Renda</label>
              <select value={type} onChange={e => setType(e.target.value as FamilyIncomeType)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm">
                <option value="salario">Salário</option>
                <option value="extra">Renda Extra</option>
                <option value="passiva">Renda Passiva</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Valor</label>
              <input type="number" step="0.01" required value={value} onChange={e => setValue(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm" placeholder="R$ 0,00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Data de Recebimento</label>
              <input type="date" required value={receiveDate} onChange={e => setReceiveDate(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id="recurrent" checked={recurrent} onChange={e => setRecurrent(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-slate-900 focus:ring-primary-dark" />
              <label htmlFor="recurrent" className="text-sm font-medium text-gray-700">Renda Recorrente</label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Descrição (Opcional)</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm" placeholder="Ex: Bônus trimestral" />
          </div>

          <button type="submit" className="w-full rounded-2xl bg-white py-4 font-bold text-slate-900 shadow-xl shadow-primary-dark/10 active:scale-95 transition-transform">Salvar Renda</button>
        </form>
      </motion.div>
    </div>
  );
}

function GoalForm({ onClose, onSave, initialData, members }: { onClose: () => void, onSave: any, initialData?: FamilyGoal, members: FamilyMember[] }) {
  const [name, setName] = useState(initialData?.name || "");
  const [targetValue, setTargetValue] = useState(initialData?.targetValue.toString() || "0");
  const [currentValue, setCurrentValue] = useState(initialData?.currentValue.toString() || "0");
  const [deadline, setDeadline] = useState(initialData?.deadline || new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState(initialData?.description || "");
  const [memberContributions, setMemberContributions] = useState<{[key: string]: number}>(initialData?.memberContributions || {});
  const [plannedMonthlyContributions, setPlannedMonthlyContributions] = useState<{[key: string]: {value: number, type: "fixed" | "percentage"}}>(initialData?.plannedMonthlyContributions || {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetValue) return;

    const data = {
      name,
      targetValue: parseFloat(targetValue) || 0,
      currentValue: parseFloat(currentValue) || 0,
      deadline,
      description,
      status: "ativa",
      memberContributions,
      plannedMonthlyContributions
    };

    await onSave(data);
    onClose();
  };

  const updatePlannedContribution = (memberId: string, value: string, type: "fixed" | "percentage") => {
    setPlannedMonthlyContributions({
      ...plannedMonthlyContributions,
      [memberId]: { value: parseFloat(value) || 0, type }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg rounded-t-[40px] bg-white p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">{initialData ? "Editar Meta" : "Nova Meta Familiar"}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nome da Meta</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm" placeholder="Ex: Viagem em Família" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Valor Alvo</label>
              <input type="number" step="0.01" required value={targetValue} onChange={e => setTargetValue(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm" placeholder="R$ 0,00" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Valor Já Acumulado</label>
              <input type="number" step="0.01" value={currentValue} onChange={e => setCurrentValue(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm" placeholder="R$ 0,00" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Prazo Final</label>
            <input type="date" required value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm" />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Planejamento de Contribuição Mensal</label>
            {members.filter(m => m.income > 0).map(member => (
              <div key={member.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900">{member.name}</span>
                  <div className="flex bg-white rounded-lg p-0.5 border border-gray-100">
                    <button 
                      type="button"
                      onClick={() => updatePlannedContribution(member.id, plannedMonthlyContributions[member.id]?.value.toString() || "0", "fixed")}
                      className={cn("px-2 py-1 rounded-md text-[8px] font-bold", plannedMonthlyContributions[member.id]?.type !== "percentage" ? "bg-white text-slate-900" : "text-gray-400")}
                    >
                      R$
                    </button>
                    <button 
                      type="button"
                      onClick={() => updatePlannedContribution(member.id, plannedMonthlyContributions[member.id]?.value.toString() || "0", "percentage")}
                      className={cn("px-2 py-1 rounded-md text-[8px] font-bold", plannedMonthlyContributions[member.id]?.type === "percentage" ? "bg-white text-slate-900" : "text-gray-400")}
                    >
                      %
                    </button>
                  </div>
                </div>
                <input 
                  type="number" 
                  value={plannedMonthlyContributions[member.id]?.value || 0}
                  onChange={e => updatePlannedContribution(member.id, e.target.value, plannedMonthlyContributions[member.id]?.type || "fixed")}
                  className="w-full bg-transparent border-none p-0 text-lg font-bold text-slate-900 focus:ring-0"
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <button type="submit" className="w-full rounded-2xl bg-white py-4 font-bold text-slate-900 shadow-xl shadow-primary-dark/10 active:scale-95 transition-transform">Salvar Meta</button>
        </form>
      </motion.div>
    </div>
  );
}

function SimulationModal({ onClose, family, analysis, financialAnalysis }: { onClose: () => void, family: FamilyMember[], analysis: DependencyAnalysis, financialAnalysis: FamilyFinancialAnalysis | null }) {
  const [simulatedIncome, setSimulatedIncome] = useState(family.find(m => m.type === "usuario")?.income.toString() || "0");
  const [extraIncome, setExtraIncome] = useState("0");
  const [removedDependents, setRemovedDependents] = useState<string[]>([]);
  
  const userIncome = parseFloat(simulatedIncome) || 0;
  const extra = parseFloat(extraIncome) || 0;
  const totalSimIncome = userIncome + extra + family.filter(m => m.type !== "usuario").reduce((acc, m) => acc + m.income, 0);
  
  const activeDependents = family.filter(m => m.type === "dependente" && !removedDependents.includes(m.id));
  const simulatedCost = activeDependents.reduce((acc, m) => acc + (m.monthlyExpenses - m.income), 0);
  const simulatedIndex = userIncome > 0 ? (simulatedCost / userIncome) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-3xl rounded-[40px] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white">
              <Target size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Simulador de Estratégia Familiar</h3>
              <p className="text-xs text-gray-500">Veja o impacto de novas rendas e mudanças na estrutura</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Sua Renda Mensal</label>
                <input 
                  type="number" 
                  value={simulatedIncome}
                  onChange={e => setSimulatedIncome(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-xl font-black text-slate-900 focus:ring-0"
                />
              </div>
              <div className="pt-4 border-t border-gray-200">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Nova Renda Extra Familiar</label>
                <input 
                  type="number" 
                  value={extraIncome}
                  onChange={e => setExtraIncome(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-xl font-black text-primary-green focus:ring-0"
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block px-2">Remover Dependentes (Simulação)</label>
              {family.filter(m => m.type === "dependente").map(m => (
                <button 
                  key={m.id}
                  onClick={() => {
                    if (removedDependents.includes(m.id)) {
                      setRemovedDependents(removedDependents.filter(id => id !== m.id));
                    } else {
                      setRemovedDependents([...removedDependents, m.id]);
                    }
                  }}
                  className={cn(
                    "w-full p-4 rounded-2xl border flex items-center justify-between transition-all",
                    removedDependents.includes(m.id) ? "bg-red-50 border-red-100 text-red-600" : "bg-white border-gray-100 text-gray-600"
                  )}
                >
                  <span className="text-sm font-bold">{m.name}</span>
                  <span className="text-[10px] font-bold">{removedDependents.includes(m.id) ? "Removido" : "Ativo"}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[32px] p-8 text-slate-900 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">Novo Índice de Dependência</p>
                  <h4 className={cn(
                    "text-5xl font-black",
                    simulatedIndex > 60 ? "text-red-400" : simulatedIndex > 30 ? "text-orange-400" : "text-emerald-600"
                  )}>{simulatedIndex.toFixed(1)}%</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">Nova Renda Total</p>
                    <p className="text-sm font-bold">{formatCurrency(totalSimIncome)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">Novo Saldo Livre</p>
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalSimIncome - (financialAnalysis?.totalIncome || 0) + (financialAnalysis?.totalIncome || 0) - simulatedCost - (totalSimIncome - userIncome - extra))}</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            </div>

            <div className="p-6 rounded-3xl bg-primary-green/10 border border-primary-green/20 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Impacto Mensal no Caixa</span>
                <span className="text-sm font-bold text-primary-green">+{formatCurrency((totalSimIncome - (financialAnalysis?.totalIncome || 0)) + (analysis.totalDependentCost - simulatedCost))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Potencial de Investimento Anual</span>
                <span className="text-sm font-bold text-primary-green">{formatCurrency(((totalSimIncome - (financialAnalysis?.totalIncome || 0)) + (analysis.totalDependentCost - simulatedCost)) * 12)}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700 leading-relaxed">
                Aumentar a renda familiar ou reduzir a dependência financeira acelera drasticamente o alcance das metas. Use este simulador para definir objetivos de renda extra para a família.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FamilyMemberForm({ onClose, onSave, initialData, members }: { onClose: () => void, onSave: any, initialData?: FamilyMember, members: FamilyMember[] }) {
  const [name, setName] = useState(initialData?.name || "");
  const [relationship, setRelationship] = useState(initialData?.relationship || "conjuge");
  const [type, setType] = useState<FamilyMemberType>(initialData?.type || "dependente");
  const [income, setIncome] = useState(initialData?.income.toString() || "0");
  const [monthlyExpenses, setMonthlyExpenses] = useState(initialData?.monthlyExpenses?.toString() || "0");
  const [contributionPercentage, setContributionPercentage] = useState(initialData?.contributionPercentage.toString() || "0");
  const [dependencyOf, setDependencyOf] = useState(initialData?.dependencyOf || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const data = {
      name,
      relationship,
      type,
      income: parseFloat(income) || 0,
      monthlyExpenses: parseFloat(monthlyExpenses) || 0,
      contributionPercentage: parseFloat(contributionPercentage) || 0,
      dependencyOf: dependencyOf || undefined
    };

    await onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg rounded-t-[40px] bg-white p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">{initialData ? "Editar Membro" : "Novo Membro"}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nome</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm" placeholder="Ex: Maria Silva" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo de Membro</label>
              <select value={type} onChange={e => setType(e.target.value as FamilyMemberType)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm">
                <option value="usuario">Usuário (Você)</option>
                <option value="dependente">Dependente</option>
                <option value="parceiro">Parceiro(a)</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Relação</label>
              <select value={relationship} onChange={e => setRelationship(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm">
                <option value="conjuge">Cônjuge</option>
                <option value="filho">Filho(a)</option>
                <option value="pai">Pai/Mãe</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Renda Mensal</label>
              <input type="number" step="0.01" value={income} onChange={e => setIncome(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm" placeholder="R$ 0,00" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Gastos Mensais</label>
              <input type="number" step="0.01" value={monthlyExpenses} onChange={e => setMonthlyExpenses(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm" placeholder="R$ 0,00" />
            </div>
          </div>

          {type === "dependente" && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Dependente De</label>
              <select value={dependencyOf} onChange={e => setDependencyOf(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm">
                <option value="">Ninguém específico</option>
                {members.filter(m => m.id !== initialData?.id && m.type !== "dependente").map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Contribuição nas Despesas (%)</label>
            <input type="number" value={contributionPercentage} onChange={e => setContributionPercentage(e.target.value)} className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm" placeholder="0" min="0" max="100" />
          </div>

          <button type="submit" className="w-full rounded-2xl bg-white py-4 font-bold text-slate-900 shadow-xl shadow-primary-dark/10 active:scale-95 transition-transform">Salvar Membro</button>
        </form>
      </motion.div>
    </div>
  );
}

export default Family;
