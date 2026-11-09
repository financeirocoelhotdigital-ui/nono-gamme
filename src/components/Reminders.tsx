import React, { useState, useMemo } from "react";
import { useReminders } from "../context/ReminderContext";
import { useTransacoes } from "../context/TransacoesContext";
import { useContas } from "../context/ContasContext";
import { Reminder, UserEvent, ReminderType, ReminderPriority, ReminderFrequency, UserEventType } from "../types";
import { formatCurrency, cn } from "../lib/utils";
import { 
  Bell, 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  Trash2,
  Edit2,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Repeat,
  Tag,
  MapPin,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { suggestReminders } from "../services/geminiService";

export function Reminders() {
  const { 
    reminders, userEvents, loading, 
    addReminder, updateReminder, deleteReminder,
    addUserEvent, updateUserEvent, deleteUserEvent,
    markReminderAsDone, executeReminder
  } = useReminders();
  const { transactions } = useTransacoes();
  const { accounts } = useContas();

  const [activeTab, setActiveTab] = useState<"reminders" | "events">("reminders");
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // Form states
  const [formData, setFormData] = useState<any>({
    title: "",
    description: "",
    type: "financeiro",
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    recurrent: false,
    frequency: "mensal",
    priority: "media",
    value: 0,
    category: "Outros"
  });

  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           r.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || r.type === filterType;
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reminders, searchTerm, filterType]);

  const filteredEvents = useMemo(() => {
    return userEvents.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || e.type === filterType;
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(a.dateInicio).getTime() - new Date(b.dateInicio).getTime());
  }, [userEvents, searchTerm, filterType]);

  const handleGenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    try {
      const result = await suggestReminders(transactions, reminders);
      setAiSuggestions(result.suggestions || []);
    } catch (error) {
      console.error("Error generating suggestions:", error);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "reminders") {
      await addReminder({
        title: formData.title,
        description: formData.description,
        type: formData.type as ReminderType,
        date: formData.date,
        time: formData.time,
        recurrent: formData.recurrent,
        frequency: formData.frequency as ReminderFrequency,
        priority: formData.priority as ReminderPriority,
        actionData: formData.type === "financeiro" || formData.type === "conta" ? {
          value: formData.value,
          category: formData.category
        } : undefined
      });
    } else {
      await addUserEvent({
        name: formData.title,
        type: formData.type as UserEventType,
        dateInicio: formData.date,
        value: formData.value,
        origin: "manual"
      });
    }
    setShowAddModal(false);
    setFormData({
      title: "",
      description: "",
      type: activeTab === "reminders" ? "financeiro" : "compromisso",
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      recurrent: false,
      frequency: "mensal",
      priority: "media",
      value: 0,
      category: "Outros"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lembretes & Eventos</h1>
          <p className="text-gray-500">Organize seus compromissos e nunca esqueça uma conta.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateSuggestions}
            disabled={isGeneratingSuggestions}
            className="flex items-center gap-2 rounded-xl bg-primary-green/10 px-4 py-2.5 text-sm font-bold text-primary-green transition-all hover:bg-primary-green/20 disabled:opacity-50"
          >
            <Sparkles size={18} className={cn(isGeneratingSuggestions && "animate-pulse")} />
            {isGeneratingSuggestions ? "Analisando..." : "Sugerir com IA"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition-all hover:bg-white/90 active:scale-95 shadow-lg shadow-primary-dark/10"
          >
            <Plus size={18} />
            Novo {activeTab === "reminders" ? "Lembrete" : "Evento"}
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex p-1 bg-gray-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("reminders")}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === "reminders" ? "bg-white text-slate-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Lembretes
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === "events" ? "bg-white text-slate-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Eventos
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 rounded-xl border-none bg-gray-100 py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-dark/5"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none rounded-xl border-none bg-gray-100 py-2.5 pl-10 pr-8 text-sm focus:ring-2 focus:ring-primary-dark/5"
            >
              <option value="all">Todos</option>
              {activeTab === "reminders" ? (
                <>
                  <option value="financeiro">Financeiro</option>
                  <option value="conta">Contas</option>
                  <option value="pessoal">Pessoal</option>
                  <option value="meta">Metas</option>
                </>
              ) : (
                <>
                  <option value="entrada">Entradas</option>
                  <option value="saida">Saídas</option>
                  <option value="compromisso">Compromissos</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* AI Suggestions Section */}
      <AnimatePresence>
        {aiSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-primary-green/5 border border-primary-green/10 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary-green">
                  <Sparkles size={20} />
                  <h3 className="font-bold">Sugestões da IA</h3>
                </div>
                <button 
                  onClick={() => setAiSuggestions([])}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-primary-green/10 shadow-sm space-y-3">
                    <div>
                      <h4 className="font-bold text-slate-900">{suggestion.title}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2">{suggestion.reason}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-lg text-gray-600">
                        {suggestion.frequency}
                      </span>
                      <button
                        onClick={() => {
                          addReminder(suggestion);
                          setAiSuggestions(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="text-xs font-bold text-primary-green hover:underline flex items-center gap-1"
                      >
                        Aceitar <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === "reminders" ? (
            filteredReminders.length > 0 ? (
              filteredReminders.map(reminder => (
                <ReminderCard 
                  key={reminder.id} 
                  reminder={reminder} 
                  onDone={() => markReminderAsDone(reminder.id)}
                  onDelete={() => deleteReminder(reminder.id)}
                  onExecute={(accId) => executeReminder(reminder, accId)}
                  accounts={accounts}
                />
              ))
            ) : (
              <EmptyState title="Nenhum lembrete encontrado" icon={<Bell size={48} />} />
            )
          ) : (
            filteredEvents.length > 0 ? (
              filteredEvents.map(event => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  onDelete={() => deleteUserEvent(event.id)}
                  onUpdate={(updates) => updateUserEvent(event.id, updates)}
                />
              ))
            ) : (
              <EmptyState title="Nenhum evento encontrado" icon={<CalendarIcon size={48} />} />
            )
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="p-6 bg-white rounded-3xl premium-shadow space-y-6">
            <h3 className="font-bold text-slate-900">Resumo</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Bell size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Lembretes Ativos</span>
                </div>
                <span className="font-bold text-slate-900">{reminders.filter(r => r.status === "ativo").length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <AlertCircle size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Pendentes/Atrasados</span>
                </div>
                <span className="font-bold text-slate-900">
                  {reminders.filter(r => r.status === "ativo" && new Date(r.date) < new Date()).length + 
                   userEvents.filter(e => e.status === "atrasado").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <CheckCircle2 size={18} />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Concluídos (Mês)</span>
                </div>
                <span className="font-bold text-slate-900">{reminders.filter(r => r.status === "concluido").length}</span>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="p-6 bg-white text-slate-900 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-primary-green">
              <Sparkles size={20} />
              <h3 className="font-bold">Dica Inteligente</h3>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              Lembretes financeiros com execução automática ajudam a manter seu fluxo de caixa sempre atualizado sem esforço manual.
            </p>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-4xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Novo {activeTab === "reminders" ? "Lembrete" : "Evento"}
                </h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Título</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-xl border-gray-200 focus:border-primary-dark focus:ring-primary-dark"
                    placeholder="Ex: Pagar Internet"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Data</label>
                    <input
                      required
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full rounded-xl border-gray-200 focus:border-primary-dark focus:ring-primary-dark"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Hora (Opcional)</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full rounded-xl border-gray-200 focus:border-primary-dark focus:ring-primary-dark"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Tipo</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full rounded-xl border-gray-200 focus:border-primary-dark focus:ring-primary-dark"
                    >
                      {activeTab === "reminders" ? (
                        <>
                          <option value="financeiro">Financeiro</option>
                          <option value="conta">Conta</option>
                          <option value="pessoal">Pessoal</option>
                          <option value="meta">Meta</option>
                          <option value="divida">Dívida</option>
                        </>
                      ) : (
                        <>
                          <option value="entrada">Entrada</option>
                          <option value="saida">Saída</option>
                          <option value="compromisso">Compromisso</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Prioridade</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full rounded-xl border-gray-200 focus:border-primary-dark focus:ring-primary-dark"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>

                {(formData.type === "financeiro" || formData.type === "conta" || formData.type === "entrada" || formData.type === "saida") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                        className="w-full rounded-xl border-gray-200 focus:border-primary-dark focus:ring-primary-dark"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Categoria</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full rounded-xl border-gray-200 focus:border-primary-dark focus:ring-primary-dark"
                        placeholder="Ex: Lazer"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "reminders" && (
                  <div className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      id="recurrent"
                      checked={formData.recurrent}
                      onChange={(e) => setFormData({ ...formData, recurrent: e.target.checked })}
                      className="rounded border-gray-300 text-slate-900 focus:ring-primary-dark"
                    />
                    <label htmlFor="recurrent" className="text-sm font-medium text-gray-700">Recorrente</label>
                    
                    {formData.recurrent && (
                      <select
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                        className="ml-auto rounded-lg border-gray-200 text-xs py-1"
                      >
                        <option value="diario">Diário</option>
                        <option value="semanal">Semanal</option>
                        <option value="mensal">Mensal</option>
                      </select>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Descrição (Opcional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border-gray-200 focus:border-primary-dark focus:ring-primary-dark"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-xl bg-white font-bold text-slate-900 hover:bg-white/90 transition-all shadow-lg shadow-primary-dark/10"
                  >
                    Criar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReminderCard({ reminder, onDone, onDelete, onExecute, accounts }: { 
  reminder: Reminder, 
  onDone: () => void, 
  onDelete: () => void,
  onExecute: (accId: string) => void,
  accounts: any[]
}) {
  const [showExecute, setShowExecute] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || "");

  const isOverdue = new Date(reminder.date) < new Date() && reminder.status === "ativo";

  return (
    <div className={cn(
      "p-5 bg-white rounded-3xl premium-shadow border-l-4 transition-all hover:translate-x-1",
      reminder.status === "concluido" ? "border-l-gray-200 opacity-75" : 
      (isOverdue ? "border-l-red-500" : "border-l-primary-green")
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-2xl",
            reminder.status === "concluido" ? "bg-gray-100 text-gray-400" : 
            (isOverdue ? "bg-red-50 text-red-600" : "bg-primary-green/10 text-primary-green")
          )}>
            <Bell size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={cn("font-bold text-slate-900", reminder.status === "concluido" && "line-through text-gray-400")}>
                {reminder.title}
              </h4>
              {reminder.recurrent && <Repeat size={14} className="text-gray-400" />}
              {isOverdue && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded uppercase">Atrasado</span>}
            </div>
            <p className="text-sm text-gray-500 line-clamp-1">{reminder.description || "Sem descrição"}</p>
            <div className="flex items-center gap-3 mt-2 text-xs font-medium text-gray-400">
              <span className="flex items-center gap-1">
                <CalendarIcon size={12} />
                {new Date(reminder.date).toLocaleDateString()}
              </span>
              {reminder.time && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {reminder.time}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Tag size={12} />
                {reminder.type}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {reminder.status === "ativo" && (
            <>
              {reminder.actionData?.value && (
                <button
                  onClick={() => setShowExecute(!showExecute)}
                  className="p-2 text-primary-green hover:bg-primary-green/10 rounded-xl transition-colors"
                  title="Executar e Criar Transação"
                >
                  <DollarSign size={20} />
                </button>
              )}
              <button
                onClick={onDone}
                className="p-2 text-primary-green hover:bg-primary-green/10 rounded-xl transition-colors"
                title="Marcar como Concluído"
              >
                <CheckCircle2 size={20} />
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {showExecute && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-gray-50 rounded-2xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Executar Transação</span>
            <span className="text-sm font-bold text-primary-green">{formatCurrency(reminder.actionData?.value || 0)}</span>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="flex-1 rounded-xl border-gray-200 text-sm py-2"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            <button
              onClick={() => onExecute(selectedAccount)}
              className="px-4 py-2 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-white/90"
            >
              Confirmar
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function EventCard({ event, onDelete, onUpdate }: { 
  event: UserEvent, 
  onDelete: () => void,
  onUpdate: (updates: any) => void
}) {
  const isOverdue = event.status === "atrasado";

  return (
    <div className={cn(
      "p-5 bg-white rounded-3xl premium-shadow border-l-4 transition-all hover:translate-x-1",
      event.status === "concluido" ? "border-l-gray-200 opacity-75" : 
      (isOverdue ? "border-l-red-500" : "border-l-blue-500")
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-2xl",
            event.status === "concluido" ? "bg-gray-100 text-gray-400" : 
            (isOverdue ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")
          )}>
            <CalendarIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={cn("font-bold text-slate-900", event.status === "concluido" && "line-through text-gray-400")}>
                {event.name}
              </h4>
              {isOverdue && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded uppercase">Atrasado</span>}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs font-medium text-gray-400">
              <span className="flex items-center gap-1">
                <CalendarIcon size={12} />
                {new Date(event.dateInicio).toLocaleDateString()}
              </span>
              {event.value && (
                <span className="flex items-center gap-1 text-slate-900 font-bold">
                  <DollarSign size={12} />
                  {formatCurrency(event.value)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Tag size={12} />
                {event.type}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {event.status !== "concluido" && (
            <button
              onClick={() => onUpdate({ status: "concluido" })}
              className="p-2 text-primary-green hover:bg-primary-green/10 rounded-xl transition-colors"
              title="Marcar como Concluído"
            >
              <CheckCircle2 size={20} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, icon }: { title: string, icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-4xl premium-shadow text-center">
      <div className="text-gray-200 mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-gray-500 text-sm max-w-xs mt-1">
        Comece a organizar sua vida financeira e pessoal hoje mesmo.
      </p>
    </div>
  );
}
