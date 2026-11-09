import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { FutureEvent, CashFlowPoint, Account, Transaction, Debt, Receivable, Card, Invoice, Goal } from "../types";
import { useContas } from "./ContasContext";
import { useTransacoes } from "./TransacoesContext";
import { useMetas } from "./MetasContext";
import { useCartoes } from "./CartoesContext";
import { useFaturas } from "./FaturasContext";
import { useDebts } from "./DebtsContext";
import { useReceivables } from "./ReceivablesContext";
import { addDays, format, isAfter, isBefore, startOfDay, addMonths, parseISO } from "date-fns";

interface CashFlowContextType {
  projection: CashFlowPoint[];
  simulatedEvents: FutureEvent[];
  addSimulatedEvent: (event: Omit<FutureEvent, 'id' | 'userId' | 'isSimulated' | 'status'>) => void;
  removeSimulatedEvent: (id: string) => void;
  clearSimulations: () => void;
  horizon: number;
  setHorizon: (days: number) => void;
  alerts: { date: string; message: string; type: "negative" | "drop" | "high_expense" }[];
}

const CashFlowContext = createContext<CashFlowContextType | undefined>(undefined);

export function CashFlowProvider({ children }: { children: ReactNode }) {
  const { accounts } = useContas();
  const { transactions } = useTransacoes();
  const { goals } = useMetas();
  const { cards } = useCartoes();
  const { invoices } = useFaturas();
  const { debts, installments } = useDebts();
  const { receivables } = useReceivables();

  const [simulatedEvents, setSimulatedEvents] = useState<FutureEvent[]>([]);
  const [horizon, setHorizon] = useState(30);

  const addSimulatedEvent = (event: Omit<FutureEvent, 'id' | 'userId' | 'isSimulated' | 'status'>) => {
    const newEvent: FutureEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      userId: "simulated",
      isSimulated: true,
      status: "pending"
    };
    setSimulatedEvents(prev => [...prev, newEvent]);
  };

  const removeSimulatedEvent = (id: string) => {
    setSimulatedEvents(prev => prev.filter(e => e.id !== id));
  };

  const clearSimulations = () => setSimulatedEvents([]);

  const projection = useMemo(() => {
    const points: CashFlowPoint[] = [];
    const today = startOfDay(new Date());
    const initialBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

    // 1. Generate all future events within horizon
    const futureEvents: FutureEvent[] = [...simulatedEvents];

    // Recurring transactions
    transactions.filter(t => t.recurrent && t.frequency === "mensal").forEach(t => {
      const tDate = parseISO(t.date);
      for (let i = 1; i <= Math.ceil(horizon / 30) + 1; i++) {
        const nextDate = addMonths(tDate, i);
        if (isAfter(nextDate, today) && isBefore(nextDate, addDays(today, horizon + 1))) {
          futureEvents.push({
            id: `rec-${t.id}-${i}`,
            userId: t.userId,
            type: t.type === "income" ? "income" : "expense",
            value: t.value,
            date: nextDate.toISOString(),
            description: t.title,
            origin: "transaction",
            status: "pending"
          });
        }
      }
    });

    // Debts (Installments)
    installments.filter(i => i.status === "pendente" || i.status === "atrasada").forEach(i => {
      const dueDate = parseISO(i.dueDate);
      if (isAfter(dueDate, today) && isBefore(dueDate, addDays(today, horizon + 1))) {
        const debt = debts.find(d => d.id === i.debtId);
        futureEvents.push({
          id: `installment-${i.id}`,
          userId: i.userId,
          type: "expense",
          value: i.value,
          date: i.dueDate,
          description: `Parcela ${i.installmentNumber}: ${debt?.name || "Dívida"}`,
          origin: "debt",
          status: "pending"
        });
      }
    });

    // Receivables
    receivables.filter(r => r.status === "em_aberto" || r.status === "atrasado").forEach(r => {
      const dueDate = parseISO(r.dueDate);
      if (isAfter(dueDate, today) && isBefore(dueDate, addDays(today, horizon + 1))) {
        futureEvents.push({
          id: `receivable-${r.id}`,
          userId: r.userId,
          type: "income",
          value: r.remainingValue,
          date: r.dueDate,
          description: `Receber de: ${r.personName}`,
          origin: "receivable",
          status: "pending"
        });
      }
    });

    // Credit Cards (Invoices)
    cards.forEach(card => {
      // Find open invoice
      const openInvoice = invoices.find(inv => inv.cardId === card.id && inv.status === "open");
      if (openInvoice) {
        const dueDate = parseISO(openInvoice.dueDate);
        if (isAfter(dueDate, today) && isBefore(dueDate, addDays(today, horizon + 1))) {
          futureEvents.push({
            id: `invoice-${openInvoice.id}`,
            userId: card.userId,
            type: "expense",
            value: openInvoice.totalValue,
            date: openInvoice.dueDate,
            description: `Fatura: ${card.name}`,
            origin: "card",
            status: "pending"
          });
        }
      }
    });

    // 2. Calculate daily balance
    let currentBalance = initialBalance;
    for (let i = 0; i <= horizon; i++) {
      const date = addDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      
      const dayEvents = futureEvents.filter(e => format(parseISO(e.date), "yyyy-MM-dd") === dateStr);
      const income = dayEvents.filter(e => e.type === "income").reduce((acc, curr) => acc + curr.value, 0);
      const expense = dayEvents.filter(e => e.type === "expense").reduce((acc, curr) => acc + curr.value, 0);
      
      currentBalance += income - expense;
      
      points.push({
        date: dateStr,
        balance: currentBalance,
        income,
        expense,
        events: dayEvents
      });
    }

    return points;
  }, [accounts, transactions, debts, receivables, cards, invoices, simulatedEvents, horizon]);

  const alerts = useMemo(() => {
    const alertList: { date: string; message: string; type: "negative" | "drop" | "high_expense" }[] = [];
    
    projection.forEach(point => {
      if (point.balance < 0) {
        alertList.push({
          date: point.date,
          message: `Saldo negativo previsto para ${format(parseISO(point.date), "dd/MM")}`,
          type: "negative"
        });
      }
      // Detect sharp drops
      const initialBalance = projection[0].balance;
      if (point.expense > initialBalance * 0.3 && point.expense > 0) {
        alertList.push({
          date: point.date,
          message: `Gasto elevado previsto para ${format(parseISO(point.date), "dd/MM")}`,
          type: "high_expense"
        });
      }
    });

    return alertList;
  }, [projection]);

  return (
    <CashFlowContext.Provider value={{ 
      projection, 
      simulatedEvents, 
      addSimulatedEvent, 
      removeSimulatedEvent, 
      clearSimulations,
      horizon,
      setHorizon,
      alerts
    }}>
      {children}
    </CashFlowContext.Provider>
  );
}

export function useCashFlow() {
  const context = useContext(CashFlowContext);
  if (context === undefined) {
    throw new Error("useCashFlow must be used within a CashFlowProvider");
  }
  return context;
}
