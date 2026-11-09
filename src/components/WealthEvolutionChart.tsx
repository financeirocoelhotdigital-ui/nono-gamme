import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WealthItem, WealthEvolution } from '../types';
import { formatCurrency } from '../lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isBefore, isEqual, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WealthEvolutionChartProps {
  items: WealthItem[];
  evolutions: WealthEvolution[];
}

export const WealthEvolutionChart: React.FC<WealthEvolutionChartProps> = ({ items, evolutions }) => {
  const chartData = useMemo(() => {
    if (items.length === 0) return [];

    // Combine and sort all evolutions by date
    const sortedEvolutions = [...evolutions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (sortedEvolutions.length === 0) return [];

    const firstDate = parseISO(sortedEvolutions[0].date);
    const today = new Date();

    const months = eachMonthOfInterval({ start: startOfMonth(firstDate), end: endOfMonth(today) });

    // Track the latest value and totalInvested of each item
    const itemStates: Record<string, { value: number; invested: number }> = {};

    return months.map(month => {
      const monthEnd = endOfMonth(month);

      // Apply evolutions up to this month end
      sortedEvolutions.forEach(evo => {
        if (isBefore(parseISO(evo.date), monthEnd) || isEqual(parseISO(evo.date), monthEnd)) {
            // For value, the afterState provides it, or we calculate it. 
            // In our system, `afterState` has the new value. If not available, we use the evolution value or logic.
            // As a simplified fallback, if afterState is missing:
            const item = items.find(i => i.id === evo.wealthItemId);
            if (evo.afterState && evo.afterState.value !== undefined) {
              itemStates[evo.wealthItemId] = {
                  ...itemStates[evo.wealthItemId],
                  value: evo.afterState.value,
              };
            } else {
              // fallback if for some reason afterState is missing (it shouldn't be based on module)
              // this gets tricky, but we just use the final item value if we can't figure it out
              // But since module has afterState, we just use it
              if (!itemStates[evo.wealthItemId]) {
                  itemStates[evo.wealthItemId] = { value: 0, invested: 0 };
              }
            }

            // Calculate invested
            if (evo.type === 'ajuste' && evo.description === 'Aquisição inicial') {
                itemStates[evo.wealthItemId] = {
                    value: evo.value,
                    invested: evo.value
                };
            } else if (['investimento', 'reforma', 'construcao', 'transformacao'].includes(evo.type)) {
                if (evo.addToAssetValue || evo.type === 'transformacao') {
                    const currentInvested = itemStates[evo.wealthItemId]?.invested || 0;
                    itemStates[evo.wealthItemId] = {
                        ...itemStates[evo.wealthItemId],
                        invested: currentInvested + evo.value
                    };
                }
            }
        }
      });

      // After applying evolutions up to monthEnd, what is the total?
      let totalValue = 0;
      let totalInvested = 0;

      // We only consider items that were not sold before this monthEnd
      // Note: If an item is "vendido", there might be an evolution for it, but let's check its saleDate if available.
      Object.keys(itemStates).forEach(itemId => {
          const item = items.find(i => i.id === itemId);
          if (item) {
              const isSold = item.status === 'vendido' && item.saleDate && isBefore(parseISO(item.saleDate), monthEnd);
              if (!isSold) {
                  totalValue += itemStates[itemId].value;
                  totalInvested += itemStates[itemId].invested;
              }
          }
      });

      return {
        date: monthEnd.toISOString(),
        label: format(monthEnd, "MMM yy", { locale: ptBR }),
        valorTotal: totalValue,
        valorInvestido: totalInvested,
      };
    });
  }, [items, evolutions]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
         <p className="text-gray-400 font-medium">Dados insuficientes para evolução patrimonial.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorInvestido" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
            tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toLocaleString('pt-BR') + 'k' : value}`}
            dx={-10}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
                    <p className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">{label}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold text-emerald-600">Patrimônio Atual</span>
                        <span className="text-sm font-black text-slate-900">{formatCurrency(payload[0].value as number)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold text-indigo-600">Total Investido</span>
                        <span className="text-sm font-black text-slate-900">{formatCurrency(payload[1].value as number)}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="valorTotal" 
            name="Patrimônio Atual"
            stroke="#10b981" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorTotal)" 
          />
          <Area 
            type="monotone" 
            dataKey="valorInvestido" 
            name="Valor Investido"
            stroke="#6366f1" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorInvestido)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
