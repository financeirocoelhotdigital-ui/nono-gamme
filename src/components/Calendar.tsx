import React, { useState, useMemo } from "react";
import { formatCurrency, cn } from "../lib/utils";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Brain,
  ArrowRight,
  Search,
  LayoutGrid,
  List,
  CalendarDays
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalendar } from "../context/CalendarContext";
import { FinancialEvent, FinancialEventStatus } from "../types";

type ViewMode = "month" | "week" | "day";

const Calendar: React.FC = () => {
  const { events, daySummaries, analysis, loading, markAsPaid, markAsOverdue } = useCalendar();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [filterType, setFilterType] = useState<"all" | "entrada" | "saida">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | FinancialEventStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const numDays = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const days = Array.from({ length: numDays }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDay }, (_, i) => null);

  const prev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(month - 1);
    else if (viewMode === "week") newDate.setDate(currentDate.getDate() - 7);
    else newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const next = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(month + 1);
    else if (viewMode === "week") newDate.setDate(currentDate.getDate() + 7);
    else newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesType = filterType === "all" || e.type === filterType;
      const matchesStatus = filterStatus === "all" || e.status === filterStatus;
      const desc = (e.description || "").toLowerCase();
      const cat = (e.category || "").toLowerCase();
      const term = (searchTerm || "").toLowerCase().trim();
      const matchesSearch = !term || desc.includes(term) || cat.includes(term);
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [events, filterType, filterStatus, searchTerm]);

  const selectedDaySummary = daySummaries[selectedDate] || {
    date: selectedDate,
    totalIn: 0,
    totalOut: 0,
    balance: 0,
    events: [],
    hasConflict: false
  };

  const renderMonthView = () => (
    <div className="bg-white rounded-4xl p-8 border border-gray-100 premium-shadow">
      <div className="grid grid-cols-7 gap-2 mb-4">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {padding.map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square"></div>
        ))}
        {days.map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const summary = daySummaries[dateStr];
          const isSelected = selectedDate === dateStr;
          const isToday = new Date().toISOString().split("T")[0] === dateStr;
          const isFuture = new Date(dateStr) > new Date();

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(dateStr)}
              className={cn(
                "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all relative group border",
                isSelected 
                  ? "bg-white text-slate-900 border-primary-dark shadow-lg" 
                  : isToday 
                    ? "bg-primary-green/10 border-primary-green text-slate-900" 
                    : "bg-white border-gray-50 hover:border-primary-green/30 hover:bg-primary-green/5"
              )}
            >
              <span className={cn("text-sm font-bold", isSelected ? "text-slate-900" : "text-slate-900")}>{day}</span>
              <div className="flex gap-1 flex-wrap justify-center px-1">
                {summary?.events.slice(0, 3).map((e, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-white" : e.type === "entrada" ? "bg-primary-green" : e.status === "atrasado" ? "bg-orange-500" : isFuture ? "bg-gray-400" : "bg-primary-red"
                    )}
                  ></div>
                ))}
                {summary && summary.events.length > 3 && (
                  <div className={cn("text-[8px] font-bold", isSelected ? "text-slate-900" : "text-gray-400")}>+</div>
                )}
              </div>
              {summary?.hasConflict && !isSelected && (
                <div className="absolute top-1 right-1">
                  <AlertCircle size={10} className="text-orange-500" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return (
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((date, i) => {
          const dateStr = date.toISOString().split("T")[0];
          const summary = daySummaries[dateStr];
          const isSelected = selectedDate === dateStr;
          
          return (
            <div key={i} className="space-y-4">
              <button
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  "w-full p-4 rounded-3xl border transition-all flex flex-col items-center gap-1",
                  isSelected ? "bg-white text-slate-900 border-primary-dark shadow-xl" : "bg-white border-gray-100 hover:bg-gray-50"
                )}
              >
                <span className="text-[10px] font-bold uppercase opacity-60">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][date.getDay()]}
                </span>
                <span className="text-xl font-black">{date.getDate()}</span>
              </button>
              
              <div className="space-y-2">
                {summary?.events.map((e, idx) => (
                  <div key={idx} className={cn(
                    "p-2 rounded-xl text-[10px] font-bold border truncate",
                    e.type === "entrada" ? "bg-primary-green/10 border-primary-green/20 text-slate-900" : "bg-primary-red/10 border-primary-red/20 text-primary-red"
                  )}>
                    {e.description}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <CalendarIcon className="text-primary-green" size={32} />
            Calendário Financeiro
          </h1>
          <p className="text-gray-500 font-medium">Sua agenda inteligente de pagamentos e recebimentos</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 premium-shadow">
          <button 
            onClick={() => setViewMode("month")}
            className={cn("p-2 rounded-xl transition-all", viewMode === "month" ? "bg-white text-slate-900" : "text-gray-400 hover:bg-gray-50")}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode("week")}
            className={cn("p-2 rounded-xl transition-all", viewMode === "week" ? "bg-white text-slate-900" : "text-gray-400 hover:bg-gray-50")}
          >
            <CalendarDays size={20} />
          </button>
          <button 
            onClick={() => setViewMode("day")}
            className={cn("p-2 rounded-xl transition-all", viewMode === "day" ? "bg-white text-slate-900" : "text-gray-400 hover:bg-gray-50")}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Filters & Navigation */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 premium-shadow">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={prev} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-xl font-black text-slate-900 min-w-[180px] text-center">
              {viewMode === "month" ? `${monthNames[month]} ${year}` : viewMode === "week" ? "Esta Semana" : "Hoje"}
            </h2>
            <button onClick={next} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar evento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-green outline-none transition-all"
            />
          </div>
          
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-slate-900 outline-none cursor-pointer"
          >
            <option value="all">Todos Tipos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-slate-900 outline-none cursor-pointer"
          >
            <option value="all">Todos Status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="atrasado">Atrasado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Calendar Area */}
        <div className="lg:col-span-8 space-y-6">
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && (
            <div className="bg-white rounded-4xl p-8 border border-gray-100 premium-shadow">
              <h3 className="text-xl font-black text-slate-900 mb-6">Eventos do Dia</h3>
              <div className="space-y-4">
                {selectedDaySummary.events.map((event, i) => (
                  <EventItem key={i} event={event} onMarkPaid={markAsPaid} onMarkOverdue={markAsOverdue} />
                ))}
                {selectedDaySummary.events.length === 0 && (
                  <div className="py-20 text-center text-gray-400">
                    <CalendarIcon className="mx-auto mb-4 opacity-10" size={64} />
                    <p className="text-lg font-bold">Nenhum evento planejado</p>
                    <p className="text-sm">Tudo tranquilo por aqui hoje!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Daily Details (if not in day view) */}
          {viewMode !== "day" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-4xl p-8 border border-gray-100 premium-shadow"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Detalhes de {selectedDate.split("-").reverse().join("/")}</h3>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-primary-green font-bold text-sm">
                      <TrendingUp size={16} />
                      {formatCurrency(selectedDaySummary.totalIn)}
                    </div>
                    <div className="flex items-center gap-1.5 text-primary-red font-bold text-sm">
                      <TrendingDown size={16} />
                      {formatCurrency(selectedDaySummary.totalOut)}
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 font-black text-sm",
                      selectedDaySummary.balance >= 0 ? "text-slate-900" : "text-primary-red"
                    )}>
                      Saldo: {formatCurrency(selectedDaySummary.balance)}
                    </div>
                  </div>
                </div>
                {selectedDaySummary.hasConflict && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100 animate-pulse">
                    <AlertTriangle size={18} />
                    <span className="text-xs font-bold">{selectedDaySummary.conflictReason}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {selectedDaySummary.events.map((event, i) => (
                  <EventItem key={i} event={event} onMarkPaid={markAsPaid} onMarkOverdue={markAsOverdue} />
                ))}
                {selectedDaySummary.events.length === 0 && (
                  <div className="py-12 text-center text-gray-400">
                    <p className="text-sm font-medium">Selecione um dia com eventos para ver os detalhes.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Predictions */}
          <div className="bg-white rounded-4xl p-8 text-slate-900 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Brain size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-green/20 flex items-center justify-center">
                  <Brain size={24} className="text-primary-green" />
                </div>
                <h3 className="text-xl font-black">IA de Previsão</h3>
              </div>
              
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-20 bg-gray-700 rounded"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-gray-300 leading-relaxed italic">
                    "{analysis?.aiSuggestions || "Analisando seus padrões financeiros para prever o futuro..."}"
                  </p>
                  
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Alertas Inteligentes</h4>
                    {analysis?.alerts && analysis.alerts.length > 0 ? (
                      analysis.alerts.map((alert, i) => (
                        <div key={i} className={cn(
                          "p-3 rounded-2xl flex gap-3 items-start border",
                          alert.type === "danger" ? "bg-red-500/10 border-red-500/20" : "bg-orange-500/10 border-orange-500/20"
                        )}>
                          <AlertCircle size={16} className={alert.type === "danger" ? "text-red-500" : "text-orange-500"} />
                          <div>
                            <p className="text-xs font-bold">{alert.message}</p>
                            <p className="text-[10px] opacity-60">{alert.date}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 italic">Nenhum alerta para o período.</p>
                    )}
                  </div>

                  <button className="w-full py-3 bg-primary-green text-slate-900 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-primary-green/90 transition-all active:scale-95">
                    Ver Projeção Completa
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-4xl p-8 border border-gray-100 premium-shadow">
            <h3 className="text-lg font-black text-slate-900 mb-6">Resumo do Período</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-green/10 flex items-center justify-center text-primary-green">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Entradas</p>
                    <p className="text-lg font-black text-slate-900">
                      {formatCurrency(events.filter(e => e.type === "entrada").reduce((a, b) => a + b.value, 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-red/10 flex items-center justify-center text-primary-red">
                    <TrendingDown size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Saídas</p>
                    <p className="text-lg font-black text-primary-red">
                      {formatCurrency(events.filter(e => e.type === "saida").reduce((a, b) => a + b.value, 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Saldo Previsto</p>
                    <p className="text-2xl font-black text-primary-green">
                      {formatCurrency(events.reduce((a, b) => b.type === "entrada" ? a + b.value : a - b.value, 0))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Evolução</p>
                    <p className="text-sm font-bold text-slate-900">+12.5%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EventItemProps {
  event: FinancialEvent;
  onMarkPaid: (event: FinancialEvent) => Promise<void>;
  onMarkOverdue: (event: FinancialEvent) => Promise<void>;
}

const EventItem: React.FC<EventItemProps> = ({ event, onMarkPaid, onMarkOverdue }) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-3xl bg-gray-50 border border-gray-100 group hover:bg-white hover:shadow-xl hover:border-primary-green/20 transition-all">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
          event.type === "entrada" ? "bg-primary-green/10 text-slate-900" : "bg-primary-red/10 text-primary-red"
        )}>
          {event.type === "entrada" ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-black text-slate-900">{event.description || "Transação"}</p>
            {event.recurrent && (
              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[8px] font-black rounded-full uppercase">Recorrente</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-xs text-gray-500 font-medium">{event.category || "Outros"}</p>
            <div className="w-1 h-1 rounded-full bg-gray-300"></div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-tighter">{event.origin || "Geral"}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className={cn(
            "text-lg font-black",
            event.type === "entrada" ? "text-slate-900" : "text-primary-red"
          )}>
            {event.type === "entrada" ? "+" : "-"}{formatCurrency(event.value)}
          </p>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            {event.status === "pago" ? (
              <div className="flex items-center gap-1 text-[10px] font-bold text-primary-green">
                <CheckCircle2 size={12} />
                PAGO
              </div>
            ) : event.status === "atrasado" ? (
              <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
                <AlertCircle size={12} />
                ATRASADO
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                <Clock size={12} />
                PENDENTE
              </div>
            )}
          </div>
        </div>

        {event.status === "pendente" && (
          <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onMarkPaid(event)}
              className="p-2 bg-primary-green text-slate-900 rounded-xl hover:bg-primary-green/90 transition-all active:scale-90"
              title="Marcar como pago"
            >
              <CheckCircle2 size={18} />
            </button>
            <button 
              onClick={() => onMarkOverdue(event)}
              className="p-2 bg-orange-500 text-slate-900 rounded-xl hover:bg-orange-600 transition-all active:scale-90"
              title="Marcar como atrasado"
            >
              <AlertCircle size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
