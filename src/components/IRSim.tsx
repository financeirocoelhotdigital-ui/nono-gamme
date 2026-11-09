import React from "react";
import { Transaction, FamilyMember } from "../types";
import { formatCurrency, cn } from "../lib/utils";
import { Calculator, Info, TrendingUp, ShieldCheck } from "lucide-react";

export function IRSim({ transactions, family }: { transactions: Transaction[], family: FamilyMember[] }) {
  const totalIncome = transactions.filter(t => t.type === "income").reduce((acc, curr) => acc + curr.value, 0);
  const totalDeductible = transactions.filter(t => t.category.toLowerCase().includes("saúde") || t.category.toLowerCase().includes("educação")).reduce((acc, curr) => acc + curr.value, 0);
  
  // Simplified IR Calculation (Brazil 2024 approximation)
  const annualIncome = totalIncome * 12;
  const annualDeductible = totalDeductible * 12;
  const taxableBase = Math.max(0, annualIncome - annualDeductible);
  
  let tax = 0;
  if (taxableBase > 55976.16) tax = taxableBase * 0.275 - 10432.32;
  else if (taxableBase > 45012.60) tax = taxableBase * 0.225 - 7633.51;
  else if (taxableBase > 33919.80) tax = taxableBase * 0.15 - 4257.57;
  else if (taxableBase > 24511.92) tax = taxableBase * 0.075 - 1713.58;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Imposto de Renda</h2>
      
      <div className="rounded-4xl bg-white p-6 text-slate-900 premium-shadow">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-60">
          <Calculator size={14} /> Estimativa de Imposto Anual
        </div>
        <div className="mt-1 text-3xl font-bold text-primary-green">{formatCurrency(tax)}</div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 p-3 text-[10px]">
          <Info size={14} /> Baseado em suas receitas e despesas dedutíveis (Saúde e Educação) registradas.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-4xl border border-gray-100 bg-white p-5 premium-shadow">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">Detalhamento</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Renda Tributável (Anual)</span>
              <span className="font-bold text-slate-900">{formatCurrency(annualIncome)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Deduções Estimadas</span>
              <span className="font-bold text-primary-green">-{formatCurrency(annualDeductible)}</span>
            </div>
            <div className="border-t border-gray-50 pt-3 flex justify-between text-sm">
              <span className="text-slate-900 font-bold">Base de Cálculo</span>
              <span className="font-bold text-slate-900">{formatCurrency(taxableBase)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-4xl bg-primary-green/10 p-5 text-slate-900 border border-primary-green/20">
          <div className="flex items-center gap-2 font-bold text-sm mb-2">
            <ShieldCheck size={18} className="text-primary-green" /> Dicas de Otimização
          </div>
          <ul className="space-y-2 text-xs">
            <li>• Certifique-se de registrar todos os gastos com saúde.</li>
            <li>• Gastos com educação própria ou dependentes são dedutíveis.</li>
            <li>• Contribuições para previdência privada (PGBL) podem reduzir sua base em até 12%.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
