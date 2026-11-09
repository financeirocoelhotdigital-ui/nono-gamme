import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Transaction, FiscalType, FiscalCategory } from '../types';
import { useTransacoes } from './TransacoesContext';

interface TaxSummary {
  totalIncome: number;
  totalTaxable: number;
  totalExempt: number;
  totalDeductible: number;
  estimatedTax: number;
}

interface TaxContextType {
  fiscalYear: number;
  setFiscalYear: (year: number) => void;
  summary: TaxSummary;
  transactions: Transaction[];
  updateFiscalClassification: (transactionId: string, fiscalType: FiscalType, fiscalCategory: FiscalCategory) => Promise<void>;
  suggestFiscalClassification: (transaction: Transaction) => { fiscalType: FiscalType; fiscalCategory: FiscalCategory } | null;
  alerts: { type: 'warning' | 'info' | 'error'; message: string; transactionId?: string }[];
}

const TaxContext = createContext<TaxContextType | undefined>(undefined);

export const TaxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { transactions: allTransactions } = useTransacoes();
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);

  // Filter transactions by fiscal year
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getFullYear() === fiscalYear;
    });
  }, [allTransactions, fiscalYear]);

  const summary = useMemo(() => {
    const initialSummary: TaxSummary = {
      totalIncome: 0,
      totalTaxable: 0,
      totalExempt: 0,
      totalDeductible: 0,
      estimatedTax: 0,
    };

    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'income') {
        acc.totalIncome += t.value;
        if (t.fiscalType === 'tributavel') acc.totalTaxable += t.value;
        if (t.fiscalType === 'isento') acc.totalExempt += t.value;
      } else if (t.type === 'expense' && t.fiscalType === 'dedutivel') {
        acc.totalDeductible += t.value;
      }
      return acc;
    }, initialSummary);
  }, [filteredTransactions]);

  // Basic tax simulation (Simplified Brazilian IR rules for example)
  const estimatedTax = useMemo(() => {
    const taxableBase = summary.totalTaxable - summary.totalDeductible;
    if (taxableBase <= 0) return 0;

    // Simplified brackets for 2024/2025 (Annual)
    // Up to 33,919.80: Exempt
    // 33,919.81 to 45,012.60: 7.5% (Deduction: 2,543.98)
    // 45,012.61 to 55,976.16: 15% (Deduction: 5,919.93)
    // 55,976.17 to 66,646.80: 22.5% (Deduction: 10,118.14)
    // Above 66,646.80: 27.5% (Deduction: 13,450.48)

    if (taxableBase <= 33919.80) return 0;
    if (taxableBase <= 45012.60) return (taxableBase * 0.075) - 2543.98;
    if (taxableBase <= 55976.16) return (taxableBase * 0.15) - 5919.93;
    if (taxableBase <= 66646.80) return (taxableBase * 0.225) - 10118.14;
    return (taxableBase * 0.275) - 13450.48;
  }, [summary]);

  const updateFiscalClassification = async (transactionId: string, fiscalType: FiscalType, fiscalCategory: FiscalCategory) => {
    try {
      const transactionRef = doc(db, 'transactions', transactionId);
      await updateDoc(transactionRef, {
        fiscalType,
        fiscalCategory,
        fiscalYear
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${transactionId}`);
    }
  };

  const suggestFiscalClassification = (transaction: Transaction): { fiscalType: FiscalType; fiscalCategory: FiscalCategory } | null => {
    const title = (transaction.title || transaction.establishment || transaction.incomeSource || '').toLowerCase();
    const category = (transaction.category || '').toLowerCase();

    if (transaction.type === 'income') {
      if (title.includes('salário') || title.includes('pagamento') || title.includes('pro-labore')) {
        return { fiscalType: 'tributavel', fiscalCategory: 'salario' };
      }
      if (title.includes('aluguel')) {
        return { fiscalType: 'tributavel', fiscalCategory: 'aluguel' };
      }
      if (title.includes('dividendos') || title.includes('rendimento')) {
        return { fiscalType: 'isento', fiscalCategory: 'investimentos' };
      }
    } else {
      if (category.includes('saúde') || category.includes('médico') || category.includes('hospital') || title.includes('unimed') || title.includes('bradesco saúde')) {
        return { fiscalType: 'dedutivel', fiscalCategory: 'despesas_medicas' };
      }
      if (category.includes('educação') || category.includes('escola') || category.includes('faculdade') || category.includes('curso')) {
        return { fiscalType: 'dedutivel', fiscalCategory: 'educacao' };
      }
    }
    return null;
  };

  const alerts = useMemo(() => {
    const newAlerts: { type: 'warning' | 'info' | 'error'; message: string; transactionId?: string }[] = [];

    filteredTransactions.forEach(t => {
      if (!t.fiscalType) {
        const suggestion = suggestFiscalClassification(t);
        if (suggestion) {
          newAlerts.push({
            type: 'info',
            message: `A transação "${t.title}" pode ser classificada como ${suggestion.fiscalType} (${suggestion.fiscalCategory}).`,
            transactionId: t.id
          });
        } else {
          newAlerts.push({
            type: 'warning',
            message: `A transação "${t.title}" não possui classificação fiscal.`,
            transactionId: t.id
          });
        }
      }
    });

    return newAlerts;
  }, [filteredTransactions]);

  return (
    <TaxContext.Provider value={{
      fiscalYear,
      setFiscalYear,
      summary: { ...summary, estimatedTax },
      transactions: filteredTransactions,
      updateFiscalClassification,
      suggestFiscalClassification,
      alerts
    }}>
      {children}
    </TaxContext.Provider>
  );
};

export const useTax = () => {
  const context = useContext(TaxContext);
  if (context === undefined) {
    throw new Error('useTax must be used within a TaxProvider');
  }
  return context;
};
