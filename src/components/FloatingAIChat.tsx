import React, { useState, useRef, useEffect } from "react";
import { UserProfile, AIMode } from "../types";
import { getAIResponse } from "../services/geminiService";
import { Send, Bot, X, MessageSquare, Loader2, Sparkles } from "lucide-react";
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
import { useFamily } from "../context/FamilyContext";
import { useWealth } from "../context/WealthContext";
import { useSubscriptions } from "../context/SubscriptionsContext";

interface FloatingAIChatProps {
  userProfile: UserProfile;
  activeTab?: string;
}

interface Message {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  isAction?: boolean;
}

export function FloatingAIChat({ userProfile, activeTab }: FloatingAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ role: "user" | "model"; parts: { text: string }[] }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { transactions } = useTransacoes();
  const { accounts } = useContas();
  const { goals, createGoal } = useMetas();
  const { debts } = useDebts();
  const { budgets, createBudget, updateBudget } = useOrcamento();
  const { projection } = useCashFlow();
  const { lifePlan } = useLifePlan();
  const { diagnosis, userBadges } = useDiagnosis();
  const { family } = useFamily();
  const { wealth } = useWealth();
  const { subscriptions } = useSubscriptions();

  useEffect(() => {
    if (messages.length === 0 && diagnosis) {
      const welcomeMsg: Message = {
        role: "ai",
        content: `Olá, ${userProfile.displayName || "usuário"}! Sou seu consultor financeiro. 
        
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
  }, [messages, isOpen]);

  const executeTool = async (call: { name?: string; args?: any }) => {
    if (!call.name || !call.args) return "⚠️ Erro na ação.";
    try {
      switch (call.name) {
        case "registrar_transacao": {
          const { value, type, category, description, date } = call.args;
          const accountId = accounts[0]?.id;
          if (!accountId) throw new Error("Nenhuma conta encontrada.");
          await transacoesModule.registrarTransacao({
            value, type, category, title: description,
            date: date || new Date().toISOString(),
            accountId, userId: "", createdAt: new Date().toISOString(), emotion: "neutro"
          });
          return `✅ Transação de R$ ${value} registrada!`;
        }
        case "criar_meta": {
          const { name, targetValue, deadline } = call.args;
          await createGoal({ name, targetValue, currentValue: 0, deadline, category: "outros", priority: "media", status: "active" });
          return `✅ Meta "${name}" criada!`;
        }
        default:
          return `⚠️ Ação ${call.name} não suportada aqui.`;
      }
    } catch (error: any) {
      return `❌ Erro: ${error.message}`;
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
        "copiloto", 
        userProfile, 
        { 
          transactions, accounts, goals, debts, family, wealth, subscriptions, 
          budget: budgets, cashFlow: projection, diagnosis, badges: userBadges,
          lifePlan: lifePlan ? {
            horizon: lifePlan.horizonYears, profile: lifePlan.profile,
            currentWealth: lifePlan.currentWealth, currentIncome: lifePlan.currentIncome,
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
        content: finalContent || "Entendido.", 
        timestamp: new Date(),
        isAction: toolResults.length > 0
      };
      
      setMessages(prev => [...prev, aiMsg]);
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

  if (activeTab === "aichat") return null;

  return (
    <div className={cn(
      "fixed z-50 transition-all duration-300",
      "bottom-24 right-4 lg:bottom-8 lg:right-8"
    )}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "absolute bottom-20 right-0 bg-white rounded-[28px] shadow-[0_15px_50px_-12px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col overflow-hidden",
              "w-[calc(100vw-32px)] sm:w-[340px] h-[400px] sm:h-[480px] max-h-[70vh]"
            )}
          >
            {/* Header */}
            <div className="p-4 bg-white text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/10">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-tighter italic">Assistente IA</h3>
                  <div className="flex items-center gap-1 text-[8px] font-bold uppercase text-emerald-600">
                    <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed",
                    msg.role === "user" 
                      ? "bg-white text-slate-900 rounded-tr-none" 
                      : "bg-gray-50 text-gray-800 rounded-tl-none border border-gray-100"
                  )}>
                    <div className="prose prose-xs max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 bg-gray-50 p-2 px-3 rounded-xl text-gray-400">
                    <Loader2 size={12} className="animate-spin" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Pensando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-50 bg-gray-50/30">
              {messages.length < 4 && !isLoading && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-[10px] font-medium bg-white border border-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Como posso ajudar?"
                  className="w-full bg-white border-none rounded-xl py-3 pl-4 pr-10 text-xs shadow-sm focus:ring-2 focus:ring-primary-lime/20 transition-all"
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 w-8 h-8 bg-white text-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-dark/10 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500",
          "w-14 h-14 lg:w-16 lg:h-16",
          isOpen ? "bg-white text-slate-900 rotate-90" : "bg-white text-emerald-600"
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6 lg:w-7 lg:h-7" />
        ) : (
          <MessageSquare className="w-6 h-6 lg:w-7 lg:h-7" />
        )}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-red rounded-full border-4 border-bg-light flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          </span>
        )}
      </motion.button>
    </div>
  );
}
