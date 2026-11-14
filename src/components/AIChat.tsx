import React, { useState, useRef, useEffect } from "react";
import { UserProfile, AIMode } from "../types";
import { getAIResponse, continueAIConversationAfterTools } from "../services/geminiService";
import { Send, Bot, Sparkles, Brain, Heart, Zap, Loader2, Terminal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";

import { useTransacoes } from "../context/TransacoesContext";
import { useContas } from "../context/ContasContext";
import { useMetas } from "../context/MetasContext";
import { useDebts } from "../context/DebtsContext";
import { useOrcamento } from "../context/OrcamentoContext";
import { useCashFlow } from "../context/CashFlowContext";
import { useLifePlan } from "../context/LifePlanContext";
import { useDiagnosis } from "../context/DiagnosisContext";
import { useCartoes } from "../context/CartoesContext";
import { useReceivables } from "../context/ReceivablesContext";
import { useReminders } from "../context/ReminderContext";
import { useInvestments } from "../context/InvestmentContext";
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
  const { goals, createGoal, addContribution } = useMetas();
  const { debts } = useDebts();
  const { budgets, createBudget, updateBudget } = useOrcamento();
  const { projection } = useCashFlow();
  const { lifePlan } = useLifePlan();
  const { diagnosis, userBadges } = useDiagnosis();
  const { cards } = useCartoes();
  const { receivables } = useReceivables();
  const { reminders, addReminder } = useReminders();
  const { investments } = useInvestments();

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
        content: `Olá, **${userProfile.displayName || "usuário"}**! Sou seu consultor financeiro inteligente.\n\n${
          diagnosis.risks.length > 0
            ? `Notei alguns pontos de atenção: **${diagnosis.risks[0]}**.`
            : "Sua saúde financeira parece estar em um bom caminho!"
        }\n\nComo posso te ajudar a analisar seus dados ou executar ações hoje?`,
        timestamp: new Date()
      };
      setMessages([welcomeMsg]);
    } else if (messages.length === 0) {
      setMessages([{
        role: "ai",
        content: "Olá! Sou seu Copiloto Financeiro Inteligente. Posso analisar contas, cartões, dívidas, recebíveis e metas, além de registrar lançamentos para você.",
        timestamp: new Date()
      }]);
    }
  }, [diagnosis, userProfile.displayName, messages.length]);

  const quickQuestions = [
    "Quanto posso gastar hoje?",
    "Diagnóstico completo deste mês",
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
  }, [messages]);

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
    if (!call.name) return "⚠️ Chamada de ferramenta sem nome.";
    if (!call.args) return "⚠️ Chamada de ferramenta sem argumentos.";

    try {
      switch (call.name) {
        case "registrar_transacao": {
          const { value, type, category, description, date, accountName } = call.args;
          const targetAccount = resolveTargetAccount(accountName);
          if (!targetAccount?.id) throw new Error("Nenhuma conta encontrada para registrar.");

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
          return `✅ Meta **"${name}"** de **R$ ${Number(targetValue).toFixed(2)}** criada com sucesso!`;
        }
        case "aportar_meta": {
          const { goalName, amount } = call.args;
          const targetGoal = goals.find(g =>
            g.name.toLowerCase().includes(String(goalName || "").toLowerCase())
          );
          if (!targetGoal) {
            return `⚠️ Não encontrei uma meta parecida com "${goalName}". Metas disponíveis: ${goals.map(g => g.name).join(", ") || "nenhuma"}.`;
          }
          await addContribution(targetGoal.id, Number(amount), "manual", "Aporte registrado via Copiloto IA");
          const newTotal = Number(targetGoal.currentValue || 0) + Number(amount);
          return `✅ Aporte de **R$ ${Number(amount).toFixed(2)}** registrado na meta **"${targetGoal.name}"** (acumulado: **R$ ${newTotal.toFixed(2)}**)!`;
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
            return `✅ Novo orçamento para **${categoryName}** criado com limite de **R$ ${Number(value).toFixed(2)}**.`;
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
            actionData: value
              ? {
                  value: Number(value),
                  accountId: defaultAccount?.id
                }
              : undefined
          });
          return `✅ Lembrete **"${title}"** agendado para **${date}**${value ? ` (R$ ${Number(value).toFixed(2)})` : ""}!`;
        }
        case "simular_impacto": {
          const { value, description } = call.args;
          const numericVal = Number(value || 0);
          const totalBalance = accounts.reduce((acc, a) => acc + Number(a.balance || 0), 0);
          const newBalance = totalBalance - numericVal;
          const now = new Date();
          const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const monthExpenses = transactions
            .filter(t => t.type === "expense" && String(t.date || "").startsWith(currentMonthKey))
            .reduce((acc, t) => acc + Number(t.value || 0), 0);
          const monthIncome = transactions
            .filter(t => t.type === "income" && String(t.date || "").startsWith(currentMonthKey))
            .reduce((acc, t) => acc + Number(t.value || 0), 0);
          const pctBalance = totalBalance > 0 ? ((numericVal / totalBalance) * 100).toFixed(1) : "100.0";
          const pctIncome = monthIncome > 0 ? ` (${((numericVal / monthIncome) * 100).toFixed(1)}% da receita do mês)` : "";

          return `🔍 **Simulação ("${description}"):**\n- Saldo total: de **R$ ${totalBalance.toFixed(2)}** para **R$ ${newBalance.toFixed(2)}**\n- Impacto: **${pctBalance}%** da liquidez atual${pctIncome}\n- Novo total de gastos no mês: **R$ ${(monthExpenses + numericVal).toFixed(2)}**`;
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
          cards,
          receivables,
          reminders,
          investments,
          activeTab: "aichat",
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
        content: finalContent || "Entendido. Como posso ajudar mais?",
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
          content: "Analisei seus registros! Você pode consultar: **'Quanto posso gastar hoje?'**, **'Diagnóstico completo deste mês'**, **'Onde posso economizar?'** ou **'Como sair das dívidas?'**.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const modes = [
    { id: "copiloto", label: "Copiloto", icon: Terminal, color: "bg-emerald-600 text-white" },
    { id: "consultor", label: "Consultor", icon: Sparkles, color: "bg-blue-600 text-white" },
    { id: "psicologo", label: "Psicólogo", icon: Heart, color: "bg-rose-600 text-white" },
    { id: "planejador", label: "Planejador", icon: Zap, color: "bg-orange-600 text-white" },
    { id: "hibrido", label: "Híbrido", icon: Brain, color: "bg-purple-600 text-white" }
  ];

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col overflow-hidden rounded-4xl border border-gray-100 bg-white premium-shadow">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <Bot size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Copiloto Financeiro</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-600">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Inteligência 360° Ativa • {modes.find(m => m.id === mode)?.label}
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
                mode === m.id ? `${m.color} shadow-md` : "bg-white text-gray-500 hover:bg-gray-100"
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
            <div
              className={cn(
                "max-w-[85%] rounded-2xl p-4 text-sm shadow-sm",
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-tr-none"
                  : msg.isAction
                    ? "bg-emerald-50 text-slate-900 border border-emerald-200 rounded-tl-none"
                    : "bg-gray-50 text-slate-800 rounded-tl-none border border-gray-100"
              )}
            >
              <div
                className={cn(
                  "prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2",
                  msg.role === "user"
                    ? "prose-invert text-white prose-strong:text-white"
                    : "text-slate-800 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-a:text-emerald-700"
                )}
              >
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              <div
                className={cn(
                  "mt-2 text-[9px] font-bold uppercase tracking-widest",
                  msg.role === "user" ? "text-emerald-100" : "text-gray-400"
                )}
              >
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-gray-50 border border-gray-100 p-4 text-slate-500">
              <Loader2 size={16} className="animate-spin text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-widest">Analisando finanças...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-4 bg-white">
        {!isLoading && messages.length < 4 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleQuickQuestion(q)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 transition-all hover:border-emerald-600 hover:bg-emerald-600 hover:text-white"
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
            placeholder="Ex: 'Gastei 50 com pizza', 'Aporte de 200 na meta Viagem' ou 'Como sair das dívidas?'"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-4 pl-4 pr-14 text-sm text-slate-900 placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-90 disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
