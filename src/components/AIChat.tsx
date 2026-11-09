import React, { useState, useRef, useEffect } from "react";
import { UserProfile, Transaction, Account, Goal, Debt, AIMode } from "../types";
import { getAIResponse } from "../services/geminiService";
import { Send, Bot, User, Sparkles, Brain, Heart, Zap, Loader2, Terminal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { useTransacoes } from "../context/TransacoesContext";
import { useContas } from "../context/ContasContext";
import { useMetas } from "../context/MetasContext";
import { useDebts } from "../context/DebtsContext";
import { useOrcamento } from "../context/OrcamentoContext";
import { useCashFlow } from "../context/CashFlowContext";
import { useLifePlan } from "../context/LifePlanContext";
import { useDiagnosis } from "../context/DiagnosisContext";
import { transacoes as transacoesModule } from "../modules/transacoesModule";

interface AIChatProps {
  userProfile: UserProfile;
  family: any[];
  wealth: any[];
  subscriptions: any[];
}

interface Message {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  isAction?: boolean;
}

export function AIChat({ 
  userProfile, 
  family,
  wealth,
  subscriptions
}: AIChatProps) {
  const { transactions } = useTransacoes();
  const { accounts } = useContas();
  const { goals, createGoal } = useMetas();
  const { debts } = useDebts();
  const { budgets, createBudget, updateBudget } = useOrcamento();
  const { projection } = useCashFlow();
  const { lifePlan } = useLifePlan();
  const { diagnosis, userBadges } = useDiagnosis();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AIMode | "copiloto">("copiloto");
  const [history, setHistory] = useState<{ role: "user" | "model"; parts: { text: string }[] }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0 && diagnosis) {
      const welcomeMsg: Message = {
        role: "ai",
        content: `Olá, ${userProfile.displayName || "usuário"}! Sou seu consultor financeiro inteligente. 
        
        ${diagnosis.risks.length > 0 
          ? `Notei alguns pontos de atenção: **${diagnosis.risks[0]}**. ` 
          : "Sua saúde financeira parece estar em um bom caminho! "}
        
        Como posso te ajudar a organizar suas finanças hoje?`,
        timestamp: new Date()
      };
      setMessages([welcomeMsg]);
    } else if (messages.length === 0) {
      setMessages([{
        role: "ai",
        content: "Olá! Sou seu assistente financeiro inteligente. Como posso te ajudar a analisar seus dados hoje?",
        timestamp: new Date()
      }]);
    }
  }, [diagnosis, userProfile.displayName]);

  const quickQuestions = [
    "Quanto posso gastar hoje?",
    "Estou gastando muito?",
    "Como sair das dívidas?",
    "Resumo deste mês"
  ];

  const handleQuickQuestion = (q: string) => {
    handleSend(q);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const executeTool = async (call: { name?: string; args?: any }) => {
    if (!call.name) return "⚠️ Chamada de ferramenta sem nome.";
    if (!call.args) return "⚠️ Chamada de ferramenta sem argumentos.";
    try {
      switch (call.name) {
        case "registrar_transacao": {
          const { value, type, category, description, date } = call.args;
          const accountId = accounts[0]?.id; // Default to first account
          if (!accountId) throw new Error("Nenhuma conta encontrada para registrar.");
          
          await transacoesModule.registrarTransacao({
            value,
            type,
            category,
            title: description,
            date: date || new Date().toISOString(),
            accountId,
            userId: "", // Will be filled by module
            createdAt: new Date().toISOString(),
            emotion: "neutro" // Default emotion
          });
          return `✅ Transação de R$ ${value} (${description}) registrada com sucesso!`;
        }
        case "criar_meta": {
          const { name, targetValue, deadline } = call.args;
          await createGoal({
            name,
            targetValue,
            currentValue: 0,
            deadline,
            category: "outros",
            priority: "media",
            status: "active"
          });
          return `✅ Meta "${name}" de R$ ${targetValue} criada com sucesso!`;
        }
        case "ajustar_orcamento": {
          const { categoryName, value } = call.args;
          const existingBudget = budgets.find(b => b.categoryName === categoryName);
          if (existingBudget) {
            await updateBudget(existingBudget.id, { plannedValue: value });
            return `✅ Orçamento de ${categoryName} ajustado para R$ ${value}.`;
          } else {
            await createBudget({
              categoryName,
              categoryId: "custom",
              plannedValue: value,
              month: new Date().getMonth(),
              year: new Date().getFullYear()
            });
            return `✅ Novo orçamento para ${categoryName} criado com R$ ${value}.`;
          }
        }
        case "simular_impacto": {
          const { value, description } = call.args;
          const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
          const newBalance = totalBalance - value;
          return `🔍 Simulação: Se você gastar R$ ${value} com "${description}", seu saldo total cairá de R$ ${totalBalance.toFixed(2)} para R$ ${newBalance.toFixed(2)}. Isso representa ${( (value / totalBalance) * 100 ).toFixed(1)}% do seu saldo atual.`;
        }
        default:
          return `⚠️ Ferramenta ${call.name} não reconhecida.`;
      }
    } catch (error: any) {
      console.error("Tool Execution Error:", error);
      return `❌ Erro ao executar ação: ${error.message}`;
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const messageText = overrideInput || input;
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: messageText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await getAIResponse(
        mode, 
        userProfile, 
        { 
          transactions, 
          accounts, 
          goals, 
          debts, 
          family, 
          wealth, 
          subscriptions, 
          budget: budgets, 
          cashFlow: projection,
          diagnosis,
          badges: userBadges,
          lifePlan: lifePlan ? {
            horizon: lifePlan.horizonYears,
            profile: lifePlan.profile,
            currentWealth: lifePlan.currentWealth,
            currentIncome: lifePlan.currentIncome,
            currentExpenses: lifePlan.currentExpenses
          } : undefined
        }, 
        messageText,
        history
      );

      let aiContent = result.text || "";
      const toolResults: string[] = [];

      if (result.functionCalls) {
        for (const call of result.functionCalls) {
          const toolResult = await executeTool(call);
          toolResults.push(toolResult);
        }
      }

      const finalContent = aiContent + (toolResults.length > 0 ? "\n\n" + toolResults.join("\n") : "");
      
      const aiMsg: Message = { 
        role: "ai", 
        content: finalContent || "Entendido. Como posso ajudar mais?", 
        timestamp: new Date(),
        isAction: toolResults.length > 0
      };
      
      setMessages(prev => [...prev, aiMsg]);
      
      // Update history
      setHistory(prev => {
        const newHistory: { role: "user" | "model"; parts: { text: string }[] }[] = [
          ...prev,
          { role: "user", parts: [{ text: messageText }] },
          { role: "model", parts: [{ text: finalContent }] }
        ];
        return newHistory.slice(-10);
      });

    } catch (error: any) {
      console.warn("AI Notice:", error);
      setMessages(prev => [...prev, { 
        role: "ai", 
        content: "Analisei seus registros! Você pode consultar: **'Quanto posso gastar hoje?'**, **'Estou gastando muito?'**, **'Como sair das dívidas?'** ou **'Resumo deste mês'**.", 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const modes = [
    { id: "copiloto", label: "Copiloto", icon: Terminal, color: "bg-white" },
    { id: "consultor", label: "Consultor", icon: Sparkles, color: "bg-blue-500" },
    { id: "psicologo", label: "Psicólogo", icon: Heart, color: "bg-rose-500" },
    { id: "planejador", label: "Planejador", icon: Zap, color: "bg-orange-500" },
    { id: "hibrido", label: "Híbrido", icon: Brain, color: "bg-purple-500" },
  ];

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col overflow-hidden rounded-4xl border border-gray-100 bg-white premium-shadow">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary-green shadow-lg shadow-primary-dark/10">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Copiloto Financeiro</h3>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-primary-green">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-green" />
              Inteligência Ativa
            </div>
          </div>
        </div>
        
        <div className="flex gap-1">
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as AIMode | "copiloto")}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                mode === m.id ? `${m.color} text-slate-900 shadow-lg` : "bg-white text-gray-400"
              )}
              title={m.label}
            >
              <m.icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-hide">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={cn(
              "flex w-full",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "max-w-[85%] rounded-2xl p-4 text-sm shadow-sm",
              msg.role === "user" 
                ? "bg-white text-slate-900 rounded-tr-none" 
                : msg.isAction 
                  ? "bg-primary-green/10 text-slate-900 border border-primary-green/20 rounded-tl-none"
                  : "bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100"
            )}>
              <div className="prose prose-sm max-w-none prose-invert">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              <div className={cn(
                "mt-2 text-[8px] font-bold uppercase tracking-widest",
                msg.role === "user" ? "text-gray-400" : "text-gray-400"
              )}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-4 text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">Processando...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-50 p-4">
        {!isLoading && messages.length < 4 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleQuickQuestion(q)}
                className="rounded-full border border-gray-100 bg-white px-3 py-1.5 text-[10px] font-medium text-gray-600 transition-all hover:border-emerald-600 hover:bg-emerald-600 hover:text-white"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ex: 'Registrar gasto de 50 reais com pizza' ou 'Criar meta de 1000 reais para viagem'"
            className="w-full rounded-2xl border-none bg-gray-50 py-4 pl-4 pr-14 text-sm focus:ring-2 focus:ring-primary-green/20"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary-green shadow-lg shadow-primary-dark/10 transition-all active:scale-90 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
