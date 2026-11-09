import React, { useState, useEffect } from "react";
import { X, Save, Trash2, PieChart, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Budget, Category } from "../types";
import { formatCurrency, parseCurrencyInput } from "../lib/utils";
import { useCategorias } from "../context/CategoriasContext";

interface BudgetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (budget: Partial<Budget>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  budget?: Budget | null;
  month: number;
  year: number;
}

export function BudgetForm({ isOpen, onClose, onSave, onDelete, budget, month, year }: BudgetFormProps) {
  const { categories } = useCategorias();
  const [categoryId, setCategoryId] = useState("");
  const [plannedValue, setPlannedValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (budget) {
      setCategoryId(budget.categoryId);
      setPlannedValue(budget.plannedValue != null ? String(budget.plannedValue) : "");
    } else {
      setCategoryId("");
      setPlannedValue("");
    }
    setFormError(null);
  }, [budget, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!categoryId) {
      setFormError("Selecione uma categoria de despesa.");
      return;
    }

    const cleanPlanned = parseCurrencyInput(plannedValue);
    if (cleanPlanned <= 0) {
      setFormError("Informe um valor planejado maior que zero.");
      return;
    }

    setLoading(true);
    try {
      const category = categories.find(c => c.id === categoryId);
      await onSave({
        categoryId,
        categoryName: category?.name || "Sem Categoria",
        plannedValue: cleanPlanned,
        month,
        year
      });
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar orçamento:", error);
      setFormError(error?.message || "Erro ao salvar orçamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!budget?.id || !onDelete) return;
    if (!window.confirm("Tem certeza que deseja excluir este orçamento?")) return;

    setLoading(true);
    try {
      await onDelete(budget.id);
      onClose();
    } catch (error) {
      console.error("Erro ao excluir orçamento:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-md rounded-4xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
          >
            <div className="bg-white p-6 text-slate-900 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-[#10B981]">
                  <PieChart size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{budget ? "Editar Orçamento" : "Novo Orçamento"}</h3>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
                    {new Date(year, month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 hover:text-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Categoria de Despesa</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={!!budget}
                    className="w-full h-14 rounded-2xl bg-[#F4F7F6] border-none px-4 font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20 transition-all disabled:opacity-50 text-sm"
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories
                      .filter(c => c.type === "expense")
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Limite Planejado para o Mês</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={plannedValue}
                      onChange={(e) => setPlannedValue(e.target.value)}
                      placeholder="0,00"
                      className="w-full h-14 rounded-2xl bg-[#F4F7F6] border-none pl-12 pr-4 font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20 transition-all text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {budget && onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 h-14 rounded-2xl bg-rose-50 text-rose-600 font-bold flex items-center justify-center gap-2 hover:bg-rose-100 transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-wider"
                  >
                    <Trash2 size={16} />
                    <span>Excluir</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] h-14 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50 text-xs uppercase tracking-wider"
                >
                  <Save size={16} />
                  <span>{loading ? "Salvando..." : "Salvar Orçamento"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
