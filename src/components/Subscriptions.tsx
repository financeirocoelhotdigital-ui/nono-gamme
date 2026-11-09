import React, { useState } from "react";
import { Subscription } from "../types";
import { formatCurrency, cn, formatDate, parseCurrencyInput } from "../lib/utils";
import { 
  Repeat, Plus, Trash2, Edit2, Calendar, CreditCard, X, 
  AlertCircle, CheckCircle2, PauseCircle, PlayCircle, Sparkles, TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscriptions } from "../context/SubscriptionsContext";

interface SubscriptionsProps {
  subscriptions?: Subscription[];
}

export const Subscriptions: React.FC<SubscriptionsProps> = ({ subscriptions: propSubs }) => {
  const { 
    subscriptions: contextSubs, 
    loading, 
    totalMonthly, 
    totalYearly,
    createSubscription, 
    updateSubscription, 
    deleteSubscription,
    toggleSubscriptionStatus
  } = useSubscriptions();

  const subscriptions = propSubs || contextSubs;
  const [isAdding, setIsAdding] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);

  // Group and sort active subscriptions by upcoming billing date
  const upcomingBills = [...subscriptions]
    .filter(s => s.active !== false && s.nextBilling)
    .sort((a, b) => new Date(a.nextBilling).getTime() - new Date(b.nextBilling).getTime());

  // Category insights
  const categoryCounts = subscriptions.reduce((acc, sub) => {
    acc[sub.category] = (acc[sub.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = subscriptions.filter(s => s.active !== false).length;

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto px-4 md:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Assinaturas & Recorrências
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {activeCount} ativas · Gestão e previsão de gastos recorrentes
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-sm hover:shadow-md active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Nova Assinatura</span>
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <SubscriptionForm 
            onClose={() => setIsAdding(false)} 
            onSave={createSubscription} 
          />
        )}
        {editingSubscription && (
          <SubscriptionForm 
            onClose={() => setEditingSubscription(null)} 
            initialData={editingSubscription} 
            onSave={(data) => updateSubscription(editingSubscription.id, data)}
            onDelete={() => deleteSubscription(editingSubscription.id)}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Summary Card */}
          <div className="rounded-[32px] bg-gradient-to-br from-[#F4F9F6] to-[#E8F5E9] p-7 border border-emerald-100/80 shadow-[0_8px_30px_rgba(16,185,129,0.06)] relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#065F46]">
                Custo Recorrente Total
              </span>
              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(totalMonthly)}
                </h2>
                <span className="text-xs font-bold text-slate-500">
                  / mês · ({formatCurrency(totalYearly)} / ano)
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-600 max-w-md">
                Soma de todas as assinaturas ativas em ciclo mensal, convertendo automaticamente planos anuais.
              </p>
            </div>
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-[#10B981]/10 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Subscriptions Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-bold text-slate-900">Suas Assinaturas ({subscriptions.length})</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subscriptions.map((sub) => {
                const isActive = sub.active !== false;
                return (
                  <motion.div 
                    key={sub.id}
                    layout
                    whileHover={{ y: -2 }}
                    className={cn(
                      "p-5 rounded-[24px] border transition-all flex flex-col justify-between gap-4 group",
                      isActive 
                        ? "bg-white border-slate-100 shadow-sm hover:shadow-md" 
                        : "bg-slate-50 border-slate-200/80 opacity-75"
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center transition-colors",
                            isActive 
                              ? "bg-emerald-50 text-[#10B981] group-hover:scale-105" 
                              : "bg-slate-200 text-slate-500"
                          )}>
                            <Repeat size={20} strokeWidth={2.2} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900 leading-tight">{sub.name}</h4>
                              {!isActive && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-600">
                                  Pausada
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-slate-400 capitalize mt-0.5">
                              {sub.category} · {sub.billingCycle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => toggleSubscriptionStatus(sub.id)}
                            title={isActive ? "Pausar assinatura" : "Reativar assinatura"}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            {isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} className="text-[#10B981]" />}
                          </button>
                          <button 
                            onClick={() => setEditingSubscription(sub)}
                            title="Editar assinatura"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm(`Deseja excluir a assinatura de "${sub.name}"?`)) {
                                await deleteSubscription(sub.id);
                              }
                            }}
                            title="Excluir assinatura"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor</p>
                        <p className="text-sm font-black text-slate-900">{formatCurrency(sub.value)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Próxima Cobrança</p>
                        <p className="text-xs font-bold text-[#10B981]">{formatDate(sub.nextBilling)}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {subscriptions.length === 0 && (
                <div className="col-span-full py-14 text-center bg-white rounded-[28px] border border-slate-100 p-8 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#10B981] flex items-center justify-center mx-auto mb-3">
                    <Repeat size={28} />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">Nenhuma assinatura cadastrada ainda</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Cadastre suas assinaturas (Netflix, Spotify, Academia, Softwares) para nunca ser pego de surpresa.
                  </p>
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="mt-4 inline-flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Adicionar primeira assinatura</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info & Calendar */}
        <div className="space-y-6">
          {/* Smart Insights */}
          <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-[#10B981]" />
              <span>Insights Inteligentes</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {subscriptions.length > 0 ? (
                    <>Você possui <strong>{activeCount} assinaturas ativas</strong> somando <strong>{formatCurrency(totalMonthly)}/mês</strong>. Manter este valor abaixo de 10% da sua renda garante estabilidade financeira.</>
                  ) : (
                    <>Cadastre seus serviços recorrentes para receber dicas automáticas de economia e unificação.</>
                  )}
                </p>
              </div>

              {categoryCounts["streaming"] && categoryCounts["streaming"] >= 3 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/70">
                  <p className="text-xs text-amber-800 leading-relaxed font-medium">
                    Você possui {categoryCounts["streaming"]} serviços de streaming. Considere alternar entre eles a cada mês para economizar.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Real Upcoming Calendar */}
          <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar size={16} className="text-[#10B981]" />
                <span>Próximas Cobranças</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Cronograma
              </span>
            </h3>

            <div className="space-y-2.5">
              {upcomingBills.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/60 hover:bg-emerald-50/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[#10B981] shadow-xs">
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{formatDate(item.nextBilling)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-800">{formatCurrency(item.value)}</span>
                </div>
              ))}

              {upcomingBills.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-400 italic">
                  Nenhuma cobrança futura agendada.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function SubscriptionForm({ 
  onClose, 
  initialData, 
  onSave, 
  onDelete 
}: { 
  onClose: () => void; 
  initialData?: Subscription;
  onSave: (data: any) => Promise<any>;
  onDelete?: () => Promise<any>;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [value, setValue] = useState(initialData?.value != null ? String(initialData.value) : "");
  const [category, setCategory] = useState(initialData?.category || "streaming");
  const [billingCycle, setBillingCycle] = useState<"mensal" | "anual">(initialData?.billingCycle || "mensal");
  const [nextBilling, setNextBilling] = useState(
    initialData?.nextBilling || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Informe o nome do serviço ou assinatura.");
      return;
    }

    const cleanVal = parseCurrencyInput(value);
    if (cleanVal <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }

    if (!nextBilling) {
      setFormError("Informe a data da próxima cobrança.");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        value: cleanVal,
        category,
        billingCycle,
        nextBilling,
        active: initialData?.active !== false
      });
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar assinatura:", error);
      setFormError(error?.message || "Erro ao salvar assinatura. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg rounded-t-[40px] bg-white p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-[#10B981] flex items-center justify-center">
              <Repeat size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {initialData ? "Editar Assinatura" : "Nova Assinatura"}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Controle de despesa recorrente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {formError && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nome do Serviço</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full rounded-2xl border-none bg-gray-50 py-3.5 px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20" 
              placeholder="Ex: Netflix, Spotify, ChatGPT Plus, Academia" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Valor</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={value} 
                  onChange={e => setValue(e.target.value)} 
                  className="w-full rounded-2xl border-none bg-gray-50 py-3.5 pl-9 pr-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20" 
                  placeholder="0,00" 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ciclo</label>
              <select 
                value={billingCycle} 
                onChange={e => setBillingCycle(e.target.value as any)} 
                className="w-full rounded-2xl border-none bg-gray-50 py-3.5 px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20"
              >
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoria</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)} 
                className="w-full rounded-2xl border-none bg-gray-50 py-3.5 px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20"
              >
                <option value="streaming">Streaming</option>
                <option value="software">Software / SaaS</option>
                <option value="saude">Saúde / Academia</option>
                <option value="educacao">Educação</option>
                <option value="jogos">Jogos / Games</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Próxima Cobrança</label>
              <input 
                type="date" 
                required 
                value={nextBilling} 
                onChange={e => setNextBilling(e.target.value)} 
                className="w-full rounded-2xl border-none bg-gray-50 py-3.5 px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#10B981]/20" 
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {initialData && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Deseja excluir permanentemente a assinatura de "${initialData.name}"?`)) {
                    setLoading(true);
                    await onDelete();
                    onClose();
                  }
                }}
                disabled={loading}
                className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                title="Excluir assinatura"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 rounded-2xl bg-[#10B981] hover:bg-[#059669] py-4 font-black text-white text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Salvando..." : initialData ? "Salvar Alterações" : "Cadastrar Assinatura"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default Subscriptions;
