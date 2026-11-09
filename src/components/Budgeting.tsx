import React, { useState, useEffect } from "react";
import { Budget, Transaction, Category } from "../types";
import { formatCurrency, cn, formatDate } from "../lib/utils";
import { 
  PieChart, Plus, Trash2, AlertTriangle, CheckCircle, 
  Edit2, TrendingUp, Calendar, ChevronLeft, ChevronRight,
  Brain, Sparkles, AlertCircle, Info, ArrowUpRight, ArrowDownRight,
  Copy, History, Filter, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrcamento } from "../context/OrcamentoContext";
import { useCategorias } from "../context/CategoriasContext";
import { useTransacoes } from "../context/TransacoesContext";
import { analyzeBudgetBehavior } from "../services/geminiService";
import { auth } from "../lib/firebase";

import { BudgetForm } from "./BudgetForm";

export function Budgeting() {
  const { 
    budgets, 
    loading, 
    currentMonth, 
    currentYear, 
    setCurrentMonth, 
    setCurrentYear,
    createBudget,
    updateBudget,
    deleteBudget,
    clonePreviousMonth
  } = useOrcamento();
  const { transactions } = useTransacoes();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const runAIAnalysis = async () => {
    if (budgets.length === 0) return;
    setIsAnalyzing(true);
    try {
      const userProfile = { uid: auth.currentUser?.uid || "", email: auth.currentUser?.email || "", createdAt: "" };
      const result = await analyzeBudgetBehavior(budgets, transactions, userProfile as any);
      setAiAnalysis(result);
    } catch (error) {
      console.error("Erro na análise de IA:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalPlanned = budgets.reduce((acc, b) => acc + b.plannedValue, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spentValue, 0);
  const totalPercentage = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;
  const isTotalOver = totalSpent > totalPlanned;

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Month Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Orçamento Mensal</h2>
          <p className="text-xs font-medium text-gray-400">Controle seus limites de gastos por categoria</p>
        </div>
        
        <div className="flex items-center gap-2 rounded-2xl bg-white p-1 shadow-sm border border-gray-100">
          <button onClick={handlePrevMonth} className="p-2 text-gray-400 hover:text-slate-900 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex min-w-[140px] flex-col items-center px-2">
            <span className="text-sm font-bold text-slate-900">{months[currentMonth]}</span>
            <span className="text-[10px] font-bold text-gray-400">{currentYear}</span>
          </div>
          <button onClick={handleNextMonth} className="p-2 text-gray-400 hover:text-slate-900 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-[32px] bg-white p-6 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden relative">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-primary-green/10 blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                  <TrendingUp size={20} className="text-primary-green" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-900/50">Visão Geral do Mês</p>
                  <h3 className="text-lg font-bold">Resumo Financeiro</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-900/50">Total Planejado</p>
                <p className="text-xl font-black text-primary-green">{formatCurrency(totalPlanned)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-900/50">Total Gasto</p>
                  <p className={cn("text-3xl font-black", isTotalOver ? "text-rose-400" : "text-slate-900")}>
                    {formatCurrency(totalSpent)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-900/50">Utilizado</p>
                  <p className={cn("text-xl font-black", isTotalOver ? "text-rose-400" : "text-primary-green")}>
                    {totalPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, totalPercentage)}%` }}
                  className={cn("h-full transition-all duration-1000", isTotalOver ? "bg-rose-500" : "bg-primary-green")}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-900/40">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => setIsAdding(true)}
            className="flex flex-1 items-center justify-center gap-3 rounded-[28px] bg-emerald-600 p-4 font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={20} />
            Novo Orçamento
          </button>
          
          <button 
            onClick={clonePreviousMonth}
            className="flex flex-1 items-center justify-center gap-3 rounded-[28px] bg-white border border-gray-100 p-4 font-bold text-slate-900 shadow-sm hover:bg-gray-50 active:scale-95 transition-transform"
          >
            <Copy size={20} className="text-primary-green" />
            Copiar Mês Anterior
          </button>

          <button 
            onClick={runAIAnalysis}
            disabled={isAnalyzing || budgets.length === 0}
            className="flex flex-1 items-center justify-center gap-3 rounded-[28px] bg-white p-4 font-bold text-slate-900 shadow-lg shadow-primary-dark/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Brain size={20} className="text-primary-green" />
            )}
            Análise Inteligente
          </button>
        </div>
      </div>

      {/* AI Insights Section */}
      <AnimatePresence>
        {aiAnalysis && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-[32px] bg-white border border-primary-green/20 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary-green" size={20} />
                <h3 className="font-bold text-slate-900">Insights da IA</h3>
              </div>
              <button onClick={() => setAiAnalysis(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
                <div className="mt-1 rounded-full bg-primary-green/20 p-1">
                  <Info size={14} className="text-primary-green" />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{aiAnalysis.analysis}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Recomendações</p>
                  <ul className="space-y-2">
                    {aiAnalysis.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="h-1 w-1 rounded-full bg-primary-green" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Alertas</p>
                  <ul className="space-y-2">
                    {aiAnalysis.alerts.map((alert: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-rose-500 font-medium">
                        <AlertCircle size={12} />
                        {alert}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budgets List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {budgets.map(budget => {
          const isOver = budget.spentValue > budget.plannedValue;
          const isNear = budget.percentageUsed >= 90;
          const isWarning = budget.percentageUsed >= 70;
          
          let statusColor = "bg-primary-green";
          let statusText = "Seguro";
          let statusIcon = <CheckCircle size={12} />;
          
          if (isOver) {
            statusColor = "bg-rose-500";
            statusText = "Estourado";
            statusIcon = <AlertTriangle size={12} />;
          } else if (isNear) {
            statusColor = "bg-amber-500";
            statusText = "Crítico";
            statusIcon = <AlertCircle size={12} />;
          } else if (isWarning) {
            statusColor = "bg-primary-green";
            statusText = "Atenção";
            statusIcon = <Info size={12} />;
          }

          return (
            <motion.div 
              layout
              key={budget.id} 
              className="group relative rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors",
                    isOver ? "bg-rose-50 text-rose-500" : "bg-primary-green/10 text-primary-green"
                  )}>
                    <PieChart size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{budget.categoryName}</h3>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-900",
                        statusColor
                      )}>
                        {statusIcon} {statusText}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setEditingBudget(budget)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-primary-green/10 hover:text-primary-green transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={async () => {
                      if (confirm(`Excluir orçamento de ${budget.categoryName}?`)) {
                        await deleteBudget(budget.id);
                      }
                    }} 
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Gasto Real</p>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(budget.spentValue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Planejado</p>
                    <p className="text-sm font-bold text-gray-600">{formatCurrency(budget.plannedValue)}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, budget.percentageUsed)}%` }}
                      className={cn("h-full transition-all", statusColor)}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-gray-400">
                    <span>{budget.percentageUsed.toFixed(0)}% Utilizado</span>
                    <span>{formatCurrency(Math.max(0, budget.remainingBalance))} restante</span>
                  </div>
                </div>

                {/* Prediction Section */}
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <History size={14} className="text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Previsão Final</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-black",
                      budget.prediction > budget.plannedValue ? "text-rose-500" : "text-primary-green"
                    )}>
                      {formatCurrency(budget.prediction)}
                    </span>
                    {budget.prediction > budget.plannedValue ? (
                      <ArrowUpRight size={14} className="text-rose-500" />
                    ) : (
                      <ArrowDownRight size={14} className="text-primary-green" />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {budgets.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 text-gray-300">
              <PieChart size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nenhum orçamento para este mês</h3>
            <p className="text-sm text-gray-400">Comece definindo limites para suas categorias favoritas.</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-6 rounded-2xl bg-emerald-600 px-8 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
            >
              Criar Primeiro Orçamento
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(isAdding || editingBudget) && (
          <BudgetForm 
            isOpen={true}
            onClose={() => {
              setIsAdding(false);
              setEditingBudget(null);
            }} 
            onSave={async (data) => {
              if (editingBudget) {
                await updateBudget(editingBudget.id, data);
              } else {
                await createBudget(data as any);
              }
            }}
            onDelete={editingBudget ? async (id) => { await deleteBudget(id); } : undefined}
            budget={editingBudget}
            month={currentMonth}
            year={currentYear}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
