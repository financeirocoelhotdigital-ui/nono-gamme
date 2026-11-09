import { useMemo } from 'react';
import { formatCurrency, formatDate } from '../lib/utils';
import { UserProfile } from '../types';

export function useFormat(user: UserProfile | null) {
  const currency = user?.settings?.currency || "BRL (R$)";
  const dateFormat = user?.settings?.dateFormat || "DD/MM/AAAA";

  return useMemo(() => ({
    formatCurrency: (value: number | undefined | null) => formatCurrency(value, currency),
    formatDate: (date: string | undefined | null) => formatDate(date, dateFormat),
  }), [currency, dateFormat]);
}
