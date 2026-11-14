import React, { useState, useRef, useEffect } from "react";
import { UserProfile, AIMode } from "../types";
import { getAIResponse, continueAIConversationAfterTools } from "../services/geminiService";
import { Send, X, MessageSquare, Loader2, Sparkles } from "lucide-react";
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
import { useCartoes } from "../context/CartoesContext";
import { useReceivables } from "../context/ReceivablesContext";
import { useReminders } from "../context/ReminderContext";
import { useInvestments } from "../context/InvestmentContext";

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
  const [mode, setMode] = useState<AIMode | "copiloto">("copiloto");
  const [history, setHistory] = useState<{ role: "user" | "model"; parts: { text: string }[] }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { transactions } = useTransacoes();
  const { accounts } = useContas();
  const { goals, createGoal, addContribution } = useMetas();
  const { debts } = useDebts();
  const { budgets, createBudget, updateBudget } = useOrcamento();
  const { projection } = useCashFlow();
  const { lifePlan } = useLifePlan();
  const { diagnosis, userBadges } = useDiagnosis();
  const { family } = useFamily();
  const { wealth } = useWealth();
  const { subscriptions } = useSubscriptions();
  const { cards } = useCartoes();
  const { receivables } = useReceivables();
  const { reminders, addReminder } = useReminders();
  const { investments } = useInvestments();

  useEffect(() => {
    if (messages.length === 0 && diagnosis) {
      const welcomeMsg: Message = {
        role: "ai",
        content: `Olá, **${userProfile.displayName || "usuário"}**! Sou seu assistente financeiro.\n\n${
          diagnosis.risks.length > 0
            ? `Ponto de atenção: **${diagnosis.risks[0]}**.`
            : "Sua saúde financeira está sob controle!"
        }\n\nComo posso ajudar hoje?`,
        timestamp: new Date()
      };
      setMessages([welcomeMsg]);
    } else if (messages.length === 0) {
      setMessages([{
        role: "ai",
        content: "Olá! Sou seu Copiloto Financeiro. Pergunte sobre saldo, cartões, dívidas ou peça para registrar gastos e metas.",
        timestamp: new Date()
      }]);
    }
  }, [diagnosis, userProfile.displayName, messages.length]);

  const quickQuestions = [
    "Quanto posso gastar hoje?",
    "Diagnóstico financeiro",
    "Onde posso economizar?",
    "Como sair das dívidas?"
  ];

  const handleQuickQuestion = (q: string) => {
    handleSend(q);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const resolveTargetAccount = (accountName?: string) => {
    if (accountName) {
      const matched = accounts.find(a =>
        a.name.toLowerCase().includes(accountName.toLowerCase())
      );
      if (matched) return matched;
    }
    return accounts.find(a => a.isDefault) || accounts[0];
  };

  const executeTool = async (call: { name?: string; args?: any }) => {
    if (!call.name || !call.args) return "⚠️ Erro na ação.";
    try {
      switch (call.name) {
        case "registrar_transacao": {
          const { value, type, category, description, date, accountName } = call.args;
          const targetAccount = resolveTargetAccount(accountName);
          if (!targetAccount?.id) throw new Error("Nenhuma conta encontrada.");
          await transacoesModule.registrarTransacao({
            value: Number(value),
            type,
            category: category || "Outros",
            title: description || category || "Lançamento via IA",
            date: date || new Date().toISOString(),
            accountId: targetAccount.id,
            userId: "",
            createdAt: new Date().toISOString(),
            emotion: "neutro"
          });
          return `✅ Transação de **R$ ${Number(value).toFixed(2)}** (${description}) registrada na conta **${targetAccount.name}**!`;
        }
        case "criar_meta": {
          const { name, targetValue, deadline, priority } = call.args;
          await createGoal({
            name,
            targetValue: Number(targetValue),
            currentValue: 0,
            deadline: deadline || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            category: "outros",
            priority: priority || "media",
            status: "active"
          });
          return `✅ Meta **"${name}"** de **R$ ${Number(targetValue).toFixed(2)}** criada!`;
        }
        case "aportar_meta": {
          const { goalName, amount } = call.args;
          const targetGoal = goals.find(g =>
            g.name.toLowerCase().includes(String(goalName || "").toLowerCase())
          );
          if (!targetGoal) {
            return `⚠️ Não encontrei a meta "${goalName}".`;
          }
          await addContribution(targetGoal.id, Number(amount), "manual", "Aporte via Copiloto IA");
          return `✅ Aporte de **R$ ${Number(amount).toFixed(2)}** na meta **"${targetGoal.name}"**!`;
        }
        case "ajustar_orcamento": {
          const { categoryName, value } = call.args;
          const existingBudget = budgets.find(
            b => b.categoryName.toLowerCase() === String(categoryName || "").toLowerCase()
          );
          if (existingBudget) {
            await updateBudget(existingBudget.id, { plannedValue: Number(value) });
            return `✅ Orçamento de **${existingBudget.categoryName}** ajustado para **R$ ${Number(value).toFixed(2)}**.`;
          } else {
            await createBudget({
              categoryName,
              categoryId: "custom",
              plannedValue: Number(value),
              month: new Date().getMonth(),
              year: new Date().getFullYear()
            });
            return `✅ Orçamento de **${categoryName}** criado com **R$ ${Number(value).toFixed(2)}**.`;
          }
        }
        case "criar_lembrete": {
          const { title, date, value, priority } = call.args;
          const defaultAccount = resolveTargetAccount();
          await addReminder({
            title,
            type: "financeiro",
            date: date || new Date().toISOString().split("T")[0],
            recurrent: false,
            priority: priority || "media",
            actionData: value ? { value: Number(value), accountId: defaultAccount?.id } : undefined
          });
          return `✅ Lembrete **"${title}"** criado para **${date}**!`;
        }
        case "simular_impacto": {
          const { value, description } = call.args;
          const numericVal = Number(value || 0);
          const totalBalance = accounts.reduce((acc, a) => acc + Number(a.balance || 0), 0);
          const newBalance = totalBalance - numericVal;
          const pct = totalBalance > 0 ? ((numericVal / totalBalance) * 100).toFixed(1) : "100.0";
          return `🔍 **Simulação ("${description}"):** saldo iria de **R$ ${totalBalance.toFixed(2)}** para **R$ ${newBalance.toFixed(2)}** (${pct}% do saldo).`;
        }
        default:
          return `⚠️ Ação ${call.name} não reconhecida.`;
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
          cards,
          receivables,
          reminders,
          investments,
          activeTab: activeTab || "dashboard",
          lifePlan: lifePlan
            ? {
                horizon: lifePlan.horizonYears,
                profile: lifePlan.profile,
                currentWealth: lifePlan.currentWealth,
                currentIncome: lifePlan.currentIncome,
                currentExpenses: lifePlan.currentExpenses
              }
            : undefined
        },
        messageText,
        history
      );

      let aiContent = (result.text || "").trim();
      const toolResults: string[] = [];
      const toolExecutions: { name: string; args: any; result: string }[] = [];

      if (result.functionCalls && result.functionCalls.length > 0) {
        for (const call of result.functionCalls) {
          const toolResult = await executeTool(call);
          toolResults.push(toolResult);
          toolExecutions.push({ name: call.name || "", args: call.args || {}, result: toolResult });
        }

        const totalBalance = accounts.reduce((acc, a) => acc + Number(a.balance || 0), 0);
        const totalDebts = debts.reduce((acc, d) => acc + Number(d.remainingValue || 0), 0);
        const followUp = await continueAIConversationAfterTools(mode, messageText, toolExecutions, {
          saldoTotal: totalBalance,
          dividasRestantes: totalDebts,
          metasAtivas: goals.length
        });

        if (followUp && !aiContent) {
          aiContent = followUp;
        } else if (followUp) {
          aiContent = `${aiContent}\n\n${followUp}`;
        }
      }

      const finalContent = [
        toolResults.length > 0 ? toolResults.join("\n") : "",
        aiContent
      ]
        .filter(Boolean)
        .join("\n\n");

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
          { role: "model", parts: [{ text: aiMsg.content }] }
        ];
        return newHistory.slice(-10);
      });
    } catch (error: any) {
      console.warn("AI Notice:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          content: "Analisei seus registros! Você pode consultar: **'Quanto posso gastar hoje?'**, **'Diagnóstico financeiro'**, **'Onde posso economizar?'** ou **'Como sair das dívidas?'**.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (activeTab === "aichat") return null;

  const compactModes: { id: AIMode | "copiloto"; label: string }[] = [
    { id: "copiloto", label: "Copiloto" },
    { id: "consultor", label: "Consultor" },
    { id: "psicologo", label: "Psicólogo" },
    { id: "planejador", label: "Planejador" }
  ];

  return (
    <div
      className={cn(
        "fixed z-50 transition-all duration-300",
        "bottom-24 right-4 lg:bottom-8 lg:right-8"
      )}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "absolute bottom-20 right-0 bg-white rounded-[28px] shadow-[0_15px_50px_-12px_rgba(0,0,0,0.2)] border border-gray-100 flex flex-col overflow-hidden",
              "w-[calc(100vw-32px)] sm:w-[360px] h-[440px] sm:h-[510px] max-h-[75vh]"
            )}
          >
            {/* Header */}
            <div className="p-4 pb-3 bg-white text-slate-900 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-tighter italic">Assistente IA</h3>
                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-600">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      360° Ativo
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-slate-900 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {compactModes.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap",
                      mode === m.id
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm",
                      msg.role === "user"
                        ? "bg-emerald-600 text-white rounded-tr-none"
                        : msg.isAction
                          ? "bg-emerald-50 text-slate-900 border border-emerald-200 rounded-tl-none"
                          : "bg-gray-50 text-slate-800 rounded-tl-none border border-gray-100"
                    )}
                  >
                    <div
                      className={cn(
                        "prose prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5",
                        msg.role === "user"
                          ? "prose-invert text-white prose-strong:text-white"
                          : "text-slate-800 prose-headings:text-slate-900 prose-strong:text-slate-900"
                      )}
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 p-2.5 px-3 rounded-xl text-slate-500">
                    <Loader2 size={12} className="animate-spin text-emerald-600" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Analisando...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 bg-gray-50/50">
              {messages.length < 4 && !isLoading && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-[10px] font-medium bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
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
                  className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-3.5 pr-11 text-xs text-slate-900 placeholder:text-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-sm hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-40"
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
          "rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 transition-all duration-500",
          "w-14 h-14 lg:w-16 lg:h-16",
          isOpen ? "bg-slate-900 text-white rotate-90" : "bg-emerald-600 text-white"
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
