import { Transaction, Account, ReconciliationHistory } from "../types";
import { calculateAccountBalance } from "./financialCalculations";

export interface ReconciliationResult {
  accountId: string;
  storedBalance: number;
  calculatedBalance: number;
  difference: number;
  isBalanced: boolean;
  possibleErrors: string[];
  explanation: string;
}

export function conciliarConta(
  account: Account,
  transactions: Transaction[],
  periodStart?: Date,
  periodEnd?: Date
): ReconciliationResult {
  // Filter transactions by period if provided
  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    if (periodStart && tDate < periodStart) return false;
    if (periodEnd && tDate > periodEnd) return false;
    return true;
  });

  const calculatedBalance = calculateAccountBalance(account, filteredTransactions);
  const storedBalance = account.balance;
  const difference = storedBalance - calculatedBalance;
  const isBalanced = Math.abs(difference) < 0.01;

  const possibleErrors: string[] = [];
  let explanation = "";

  if (!isBalanced) {
    // 1. Check for duplicate transactions
    const duplicates = findPossibleDuplicates(filteredTransactions, account.id);
    if (duplicates.length > 0) {
      possibleErrors.push("Transações possivelmente duplicadas detectadas.");
    }

    // 2. Check for missing transactions (common values)
    if (Math.abs(difference) > 0) {
      possibleErrors.push(`Divergência de ${difference > 0 ? '+' : ''}${difference.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} encontrada.`);
    }

    // 3. Explain based on difference
    if (difference > 0) {
      explanation = `O saldo real é maior que o calculado. Isso pode indicar uma receita não registrada ou uma despesa registrada em duplicidade.`;
    } else {
      explanation = `O saldo real é menor que o calculado. Isso pode indicar uma despesa não registrada ou uma receita registrada em duplicidade.`;
    }
  } else {
    explanation = "O saldo está perfeitamente conciliado com as transações registradas.";
  }

  return {
    accountId: account.id,
    storedBalance,
    calculatedBalance,
    difference,
    isBalanced,
    possibleErrors,
    explanation
  };
}

function findPossibleDuplicates(transactions: Transaction[], accountId: string): Transaction[] {
  const accountTransactions = transactions.filter(t => t.accountId === accountId || t.toAccountId === accountId);
  const seen = new Map<string, Transaction>();
  const duplicates: Transaction[] = [];

  accountTransactions.forEach(t => {
    const key = `${t.value}-${t.date}-${t.type}-${t.category}`;
    if (seen.has(key)) {
      duplicates.push(t);
    } else {
      seen.set(key, t);
    }
  });

  return duplicates;
}

export function generateAdjustmentTransaction(
  userId: string,
  accountId: string,
  difference: number
): Partial<Transaction> {
  const isPositive = difference > 0;
  return {
    userId,
    accountId,
    title: "Ajuste de Conciliação",
    value: Math.abs(difference),
    type: isPositive ? "income" : "expense",
    category: "Ajuste",
    date: new Date().toISOString(),
    isAdjustment: true,
    reconciled: true,
    emotion: "racional",
    createdAt: new Date().toISOString()
  };
}
