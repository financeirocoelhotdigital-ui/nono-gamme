import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { FinancialEvent, CalendarDaySummary, CalendarAnalysis } from "../types";
import { useTransacoes } from "./TransacoesContext";
import { useDebts } from "./DebtsContext";
import { useFaturas } from "./FaturasContext";
import { useMetas } from "./MetasContext";
import { useReceivables } from "./ReceivablesContext";
import { useSubscriptions } from "./SubscriptionsContext";
import { useFamily } from "./FamilyContext";
import { useReminders } from "./ReminderContext";
import { analyzeCalendar } from "../services/geminiService";
import { db, auth } from "../lib/firebase";
import { updateDoc, doc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/error-handler";

interface CalendarContextType {
  events: FinancialEvent[];
  daySummaries: { [date: string]: CalendarDaySummary };
  analysis: CalendarAnalysis | null;
  loading: boolean;
  markAsPaid: (event: FinancialEvent) => Promise<void>;
  markAsOverdue: (event: FinancialEvent) => Promise<void>;
  refreshAnalysis: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { transactions } = useTransacoes();
  const { installments } = useDebts();
  const { invoices } = useFaturas();
  const { goals } = useMetas();
  const { receivables } = useReceivables();
  const { subscriptions } = useSubscriptions();
  const { incomes: familyIncomes, goals: familyGoals } = useFamily();
  const { reminders, userEvents } = useReminders();

  const [analysis, setAnalysis] = useState<CalendarAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const events = useMemo(() => {
    const allEvents: FinancialEvent[] = [];

    // 1. Transactions (All transactions)
    transactions.forEach(t => {
      const isPast = new Date(t.date || new Date().toISOString()) <= new Date();
      allEvents.push({
        id: `trans-${t.id}`,
        userId: t.userId,
        type: t.type === "income" ? "entrada" : "saida",
        category: t.category || "Outros",
        value: t.value || 0,
        date: t.date || new Date().toISOString(),
        recurrent: t.recurrent || false,
        frequency: t.frequency,
        origin: "transacao",
        originId: t.id,
        status: isPast ? "pago" : "pendente",
        description: t.title || (t as any).description || (t as any).establishment || "Transação",
        createdAt: t.createdAt || new Date().toISOString()
      });
    });

    // 2. Debt Installments
    installments.forEach(inst => {
      allEvents.push({
        id: `inst-${inst.id}`,
        userId: inst.userId,
        type: "saida",
        category: "Dívidas",
        value: inst.value,
        date: inst.dueDate,
        recurrent: false,
        origin: "divida",
        originId: inst.id,
        status: inst.status === "paga" ? "pago" : (new Date(inst.dueDate) < new Date() ? "atrasado" : "pendente"),
        description: `Parcela ${inst.installmentNumber} - Dívida`,
        createdAt: inst.createdAt
      });
    });

    // 3. Credit Card Invoices
    invoices.forEach(fat => {
      if (fat.status !== "paid") {
        allEvents.push({
          id: `inv-${fat.id}`,
          userId: fat.userId,
          type: "saida",
          category: "Cartão de Crédito",
          value: fat.totalValue,
          date: fat.dueDate,
          recurrent: false,
          origin: "cartao",
          originId: fat.id,
          status: fat.status === "overdue" ? "atrasado" : "pendente",
          description: `Fatura Cartão - ${fat.month + 1}/${fat.year}`,
          createdAt: fat.createdAt
        });
      }
    });

    // 4. Goals (Planned Contributions)
    goals.forEach(g => {
      if (g.status === "active") {
        const today = new Date();
        const contributionDate = new Date(today.getFullYear(), today.getMonth(), 10).toISOString();
        allEvents.push({
          id: `goal-${g.id}`,
          userId: g.userId,
          type: "saida",
          category: "Metas",
          value: 0, 
          date: contributionDate,
          recurrent: true,
          frequency: "mensal",
          origin: "meta",
          originId: g.id,
          status: "pendente",
          description: `Aporte Meta: ${g.name}`,
          createdAt: g.createdAt
        });
      }
    });

    // 5. Receivables
    receivables.forEach(r => {
      if (r.status !== "recebido") {
        allEvents.push({
          id: `rec-${r.id}`,
          userId: r.userId,
          type: "entrada",
          category: "Recebíveis",
          value: r.remainingValue,
          date: r.dueDate,
          recurrent: false,
          origin: "recebivel",
          originId: r.id,
          status: r.status === "atrasado" ? "atrasado" : "pendente",
          description: `Receber de: ${r.personName}`,
          createdAt: r.createdAt
        });
      }
    });

    // 6. Subscriptions
    subscriptions.forEach(s => {
      if (s.active) {
        allEvents.push({
          id: `sub-${s.id}`,
          userId: s.userId,
          type: "saida",
          category: s.category,
          value: s.value,
          date: s.nextBilling,
          recurrent: true,
          frequency: s.billingCycle === "mensal" ? "mensal" : "anual",
          origin: "assinatura",
          originId: s.id,
          status: "pendente",
          description: `Assinatura: ${s.name}`,
          createdAt: new Date().toISOString()
        });
      }
    });

    // 7. Family Incomes
    familyIncomes.forEach(inc => {
      allEvents.push({
        id: `fam-inc-${inc.id}`,
        userId: inc.userId,
        type: "entrada",
        category: "Renda Familiar",
        value: inc.value,
        date: inc.receiveDate,
        recurrent: inc.recurrent,
        origin: "manual",
        originId: inc.id,
        status: "pendente",
        description: inc.description || "Renda Familiar",
        createdAt: inc.createdAt
      });
    });

    // 8. Reminders
    reminders.forEach(r => {
      if (r.status === "ativo") {
        allEvents.push({
          id: `rem-${r.id}`,
          userId: r.userId,
          type: r.type === "financeiro" || r.type === "conta" || r.type === "divida" ? "saida" : "entrada",
          category: r.type.charAt(0).toUpperCase() + r.type.slice(1),
          value: r.actionData?.value || 0,
          date: r.date,
          recurrent: r.recurrent,
          frequency: r.frequency === "diario" ? "mensal" : (r.frequency as any),
          origin: "lembrete",
          originId: r.id,
          status: new Date(r.date) < new Date() ? "atrasado" : "pendente",
          description: `Lembrete: ${r.title}`,
          createdAt: r.createdAt
        });
      }
    });

    // 9. User Events
    userEvents.forEach(e => {
      allEvents.push({
        id: `evt-${e.id}`,
        userId: e.userId,
        type: e.type === "entrada" ? "entrada" : "saida",
        category: "Compromisso",
        value: e.value || 0,
        date: e.dateInicio,
        recurrent: false,
        origin: "evento",
        originId: e.id,
        status: e.status === "atrasado" ? "atrasado" : (e.status === "concluido" ? "pago" : "pendente"),
        description: `Evento: ${e.name}`,
        createdAt: e.createdAt
      });
    });

    return allEvents;
  }, [transactions, installments, invoices, goals, receivables, subscriptions, familyIncomes, reminders, userEvents]);

  const daySummaries = useMemo(() => {
    const summaries: { [date: string]: CalendarDaySummary } = {};
    const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0; 

    sortedEvents.forEach(event => {
      const dateKey = event.date.split("T")[0];
      if (!summaries[dateKey]) {
        summaries[dateKey] = {
          date: dateKey,
          totalIn: 0,
          totalOut: 0,
          balance: 0,
          events: [],
          hasConflict: false
        };
      }

      const summary = summaries[dateKey];
      summary.events.push(event);
      if (event.type === "entrada") {
        summary.totalIn += event.value;
        runningBalance += event.value;
      } else {
        summary.totalOut += event.value;
        runningBalance -= event.value;
      }
      summary.balance = runningBalance;

      if (summary.events.length > 5) {
        summary.hasConflict = true;
        summary.conflictReason = "Muitos eventos financeiros neste dia.";
      }
      if (summary.balance < 0) {
        summary.hasConflict = true;
        summary.conflictReason = "Risco de saldo negativo.";
      }
    });

    return summaries;
  }, [events]);

  const markAsPaid = async (event: FinancialEvent) => {
    if (!event.originId) return;
    try {
      let collectionName = "";
      let updateData: any = { status: "pago" };

      switch (event.origin) {
        case "divida":
          collectionName = "installments";
          updateData = { status: "paga", paymentDate: new Date().toISOString() };
          break;
        case "cartao":
          collectionName = "invoices";
          updateData = { status: "paid" };
          break;
        case "recebivel":
          collectionName = "receivables";
          updateData = { status: "recebido" };
          break;
        case "transacao":
          collectionName = "transactions";
          // Transactions might not have a status, but we can mark them as reconciled
          updateData = { reconciled: true };
          break;
        case "lembrete":
          collectionName = "reminders";
          updateData = { status: "concluido" };
          break;
        case "evento":
          collectionName = "user_events";
          updateData = { status: "concluido" };
          break;
      }

      if (collectionName) {
        await updateDoc(doc(db, collectionName, event.originId), updateData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${event.origin}/${event.originId}`);
    }
  };

  const markAsOverdue = async (event: FinancialEvent) => {
    if (!event.originId) return;
    try {
      let collectionName = "";
      let updateData: any = { status: "atrasado" };

      switch (event.origin) {
        case "divida":
          collectionName = "installments";
          break;
        case "cartao":
          collectionName = "invoices";
          updateData = { status: "overdue" };
          break;
        case "recebivel":
          collectionName = "receivables";
          break;
      }

      if (collectionName) {
        await updateDoc(doc(db, collectionName, event.originId), updateData);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${event.origin}/${event.originId}`);
    }
  };

  const [lastRefreshed, setLastRefreshed] = useState<number>(0);

  const refreshAnalysis = async () => {
    if (events.length === 0) return;
    
    // Limit refresh to once every 5 minutes unless forced
    const now = Date.now();
    if (now - lastRefreshed < 5 * 60 * 1000) {
      return;
    }

    setLoading(true);
    setLastRefreshed(now);
    try {
      const result = await analyzeCalendar(events);
      setAnalysis(result);
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        console.warn("Calendar analysis quota exceeded. Skipping refresh.");
      } else if (
        errorMessage.includes("Rpc failed") || 
        errorMessage.includes("500") || 
        errorMessage.includes("502") || 
        errorMessage.includes("503") || 
        errorMessage.includes("xhr error") ||
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("fetch")
      ) {
        console.warn("Calendar analysis temporarily unavailable (network/service). Retrying later.");
      } else {
        console.warn("Notice analyzing calendar:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (events.length > 0) {
      const timer = setTimeout(() => {
        refreshAnalysis();
      }, 5000); // Increased debounce to 5 seconds
      return () => clearTimeout(timer);
    }
  }, [events.length]);

  return (
    <CalendarContext.Provider value={{ 
      events, daySummaries, analysis, loading, 
      markAsPaid, markAsOverdue, refreshAnalysis 
    }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
}
