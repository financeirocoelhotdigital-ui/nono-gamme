import React, { useState, useEffect } from "react";
import {
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Bell,
  Wifi,
  Battery,
  Plus,
  BarChart3,
  Clock,
  Home,
  Target,
  MoreHorizontal,
  ChevronDown,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  X,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Search,
  Sliders,
  Check,
  Calendar,
  Layers,
  ShieldCheck,
  Shield,
  Zap,
  Info,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface MobileAppMockupProps {
  onCtaClick?: () => void;
  className?: string;
  activeFunction?: string;
  onSelectFunction?: (func: string) => void;
}

export default function MobileAppMockup({
  onCtaClick,
  className = "",
  activeFunction,
  onSelectFunction
}: MobileAppMockupProps) {
  const [showBalance, setShowBalance] = useState(true);
  const [currentView, setCurrentView] = useState<string>(activeFunction || "inicio");
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [balanceMode, setBalanceMode] = useState<"zero" | "real">("real");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Sync with external activeFunction if provided
  useEffect(() => {
    if (activeFunction) {
      setCurrentView(activeFunction);
    }
  }, [activeFunction]);

  const switchView = (newView: string) => {
    setCurrentView(newView);
    if (onSelectFunction) {
      onSelectFunction(newView);
    }
  };

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Grounded device pedestal shadow */}
      <div className="absolute -bottom-8 w-[210px] min-[360px]:w-[240px] sm:w-[270px] h-6 bg-slate-900/10 rounded-full blur-xl -z-10" />

      {/* SMARTPHONE HARDWARE SHELL */}
      <div className="relative w-[285px] min-[360px]:w-[315px] sm:w-[335px] h-[615px] min-[360px]:h-[665px] sm:h-[685px] bg-[#0A0D0C] rounded-[46px] sm:rounded-[52px] p-2.5 min-[360px]:p-3 sm:p-3.5 shadow-[0_22px_45px_-10px_rgba(15,23,42,0.3),0_10px_18px_-8px_rgba(15,23,42,0.15)] border-[3px] sm:border-[4px] border-slate-800/90 transition-all duration-300">
        {/* Hardware side buttons */}
        <div className="absolute -left-[6px] sm:-left-[7px] top-24 w-[3px] h-8 sm:h-9 bg-slate-700 rounded-l-sm" />
        <div className="absolute -left-[6px] sm:-left-[7px] top-36 w-[3px] h-10 sm:h-12 bg-slate-700 rounded-l-sm" />
        <div className="absolute -left-[6px] sm:-left-[7px] top-50 sm:top-52 w-[3px] h-10 sm:h-12 bg-slate-700 rounded-l-sm" />
        <div className="absolute -right-[6px] sm:-right-[7px] top-32 w-[3px] h-14 sm:h-16 bg-slate-700 rounded-r-sm" />

        {/* Dynamic Island Notch */}
        <div className="absolute top-4 sm:top-5 left-1/2 -translate-x-1/2 z-40 w-22 sm:w-24 h-4.5 sm:h-5 bg-black rounded-full flex items-center justify-between px-2 sm:px-2.5 shadow-xs">
          <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-emerald-900/60" />
          </div>
          <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-slate-900" />
        </div>

        {/* SCREEN SURFACE */}
        <div className="w-full h-full bg-[#F4F7F6] rounded-[38px] sm:rounded-[42px] overflow-hidden flex flex-col justify-between relative border border-slate-200/80 shadow-inner">
          
          {/* Top Status Bar (09:41, 5G, Battery) */}
          <div className="pt-3 px-6 pb-1.5 flex items-center justify-between text-[11px] font-bold text-slate-800 z-30 relative bg-transparent">
            <span>09:41</span>
            <div className="flex items-center gap-1.5 text-slate-800">
              <Wifi size={12} strokeWidth={2.5} />
              <span className="text-[10px] font-mono">5G</span>
              <Battery size={13} strokeWidth={2.5} />
            </div>
          </div>

          {/* Feedback Toast Notification */}
          <AnimatePresence>
            {feedbackToast && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="absolute top-12 left-4 right-4 z-50 bg-slate-900 text-white p-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 text-xs font-semibold"
              >
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="truncate">{feedbackToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto scrollbar-none relative flex flex-col">
            
            {/* VIEW 1: INÍCIO / DASHBOARD */}
            {(currentView === "inicio" || currentView === "dashboard") && (
              <div className="flex-col flex flex-1">
                {/* HERO HEADER AREA WITH CURRENCY BACKGROUND */}
                <div className="relative pt-1 pb-4 px-4 overflow-hidden">
                  {/* Subtle currency gradient accent */}
                  <div className="absolute top-0 right-0 w-[60%] h-36 bg-gradient-to-bl from-emerald-100/50 via-teal-50/20 to-transparent pointer-events-none rounded-bl-full" />
                  
                  {/* User Bar */}
                  <div className="relative z-10 flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#836254] text-white font-black text-xs flex items-center justify-center shadow-xs border-2 border-white">
                        T
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-tight flex items-center gap-1">
                          Olá, Tiago <span className="text-xs">👋</span>
                        </h3>
                        <p className="text-[10px] font-medium text-slate-500">
                          Controle Bolso+ Ativo
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => showToast("Todas as 3 contas sincronizadas")}
                        className="w-7 h-7 rounded-full bg-white border border-slate-200 text-emerald-700 flex items-center justify-center shadow-2xs relative hover:bg-emerald-50"
                        title="Notificações"
                      >
                        <Bell size={13} />
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 border border-white" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowBalance(!showBalance)}
                        className="w-7 h-7 rounded-full bg-white border border-slate-200 text-emerald-700 flex items-center justify-center shadow-2xs hover:bg-emerald-50"
                        title={showBalance ? "Ocultar valor" : "Mostrar valor"}
                      >
                        {showBalance ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Saldo Total Consolidado */}
                  <div className="relative z-10 space-y-0.5 mb-2">
                    <span className="text-[11px] font-semibold text-slate-700 tracking-tight block">
                      Saldo total consolidado
                    </span>

                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black text-[#04593C]">R$</span>
                      <span className="text-2xl sm:text-3xl font-black text-[#04593C] tracking-tight">
                        {showBalance ? (balanceMode === "zero" ? "0,00" : "28.450,80") : "••••••"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="inline-flex items-center gap-1 bg-[#D2F4E2] text-[#047857] text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-2xs">
                        <Building2 size={10} strokeWidth={2.5} />
                        <span>Nubank + Itaú</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => switchView("cards")}
                        className="text-[10px] font-bold text-[#047857] hover:underline"
                      >
                        Ver cartões →
                      </button>
                      <button
                        type="button"
                        onClick={() => setBalanceMode(balanceMode === "zero" ? "real" : "zero")}
                        className="ml-auto text-[8px] font-bold text-slate-400 bg-white/80 px-1 py-0.5 rounded border border-slate-200 hover:text-emerald-700"
                      >
                        {balanceMode === "zero" ? "Saldo demo" : "Zerar"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5 HORIZONTAL QUICK ACTION BUTTONS */}
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    {/* 1. Nova Receita */}
                    <button
                      type="button"
                      onClick={() => switchView("receita")}
                      className="flex flex-col items-center group transition-transform active:scale-95 cursor-pointer"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#0EA371] hover:bg-[#0C8F63] text-white flex items-center justify-center shadow-md shadow-emerald-500/20 transition-all border border-emerald-400/20">
                        <Wallet size={16} strokeWidth={2.5} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-800 leading-tight mt-1.5 group-hover:text-emerald-700">
                        Nova<br />receita
                      </span>
                    </button>

                    {/* 2. Nova Despesa */}
                    <button
                      type="button"
                      onClick={() => switchView("despesa")}
                      className="flex flex-col items-center group transition-transform active:scale-95 cursor-pointer"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#E84C4C] hover:bg-[#D93D3D] text-white flex items-center justify-center shadow-md shadow-rose-500/20 transition-all border border-rose-400/20">
                        <CreditCard size={16} strokeWidth={2.5} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-800 leading-tight mt-1.5 group-hover:text-rose-600">
                        Nova<br />despesa
                      </span>
                    </button>

                    {/* 3. Transferir */}
                    <button
                      type="button"
                      onClick={() => switchView("transferir")}
                      className="flex flex-col items-center group transition-transform active:scale-95 cursor-pointer"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-500/20 transition-all border border-blue-400/20">
                        <ArrowLeftRight size={16} strokeWidth={2.5} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-800 leading-tight mt-1.5 group-hover:text-blue-600">
                        Transferir
                      </span>
                    </button>

                    {/* 4. Relatórios */}
                    <button
                      type="button"
                      onClick={() => switchView("cashflow")}
                      className="flex flex-col items-center group transition-transform active:scale-95 cursor-pointer"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white flex items-center justify-center shadow-md shadow-purple-500/20 transition-all border border-purple-400/20">
                        <BarChart3 size={16} strokeWidth={2.5} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-800 leading-tight mt-1.5 group-hover:text-purple-600">
                        Fluxo
                      </span>
                    </button>

                    {/* 5. Investimentos */}
                    <button
                      type="button"
                      onClick={() => switchView("piggy")}
                      className="flex flex-col items-center group transition-transform active:scale-95 cursor-pointer"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#F59E0B] hover:bg-[#D97706] text-white flex items-center justify-center shadow-md shadow-amber-500/20 transition-all border border-amber-400/20">
                        <PiggyBank size={16} strokeWidth={2.5} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-800 leading-tight mt-1.5 group-hover:text-amber-600">
                        Cofrinhos
                      </span>
                    </button>
                  </div>
                </div>

                {/* VISÃO GERAL CARD */}
                <div className="px-3 pb-2.5">
                  <div className="bg-white rounded-2xl p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                        <BarChart3 size={13} className="text-emerald-600" /> Resumo do Mês
                      </h4>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-[9px] font-bold text-slate-600">
                        <span>Este mês</span>
                        <ChevronDown size={10} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-center divide-x divide-slate-100">
                      <div>
                        <span className="text-[10px] font-medium text-slate-500 block mb-0.5">Receitas</span>
                        <span className="text-[11px] sm:text-xs font-extrabold text-[#10B981] block">
                          {showBalance ? "R$ 12.580" : "••••"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-slate-500 block mb-0.5">Despesas</span>
                        <span className="text-[11px] sm:text-xs font-extrabold text-[#E84C4C] block">
                          {showBalance ? "R$ 4.820" : "••••"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-slate-500 block mb-0.5">Livre</span>
                        <span className="text-[11px] sm:text-xs font-extrabold text-[#10B981] block">
                          {showBalance ? "+ R$ 7.760" : "••••"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARDS & PIGGY PREVIEW CHIPS */}
                <div className="px-3 pb-2.5 grid grid-cols-2 gap-2">
                  <div
                    onClick={() => switchView("cards")}
                    className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold text-slate-700">Cartão Nubank</span>
                      <CreditCard size={12} className="text-purple-600" />
                    </div>
                    <div className="text-xs font-black text-slate-900">R$ 2.450,80</div>
                    <div className="text-[8px] font-bold text-emerald-600 mt-1">Fecha em 5 dias</div>
                  </div>

                  <div
                    onClick={() => switchView("piggy")}
                    className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold text-slate-700">Reserva 100% CDI</span>
                      <PiggyBank size={12} className="text-emerald-600" />
                    </div>
                    <div className="text-xs font-black text-slate-900">R$ 10.000,00</div>
                    <div className="text-[8px] font-bold text-slate-500 mt-1">Meta 100% batida!</div>
                  </div>
                </div>

                {/* RECENT TRANSACTIONS PREVIEW */}
                <div className="px-3 pb-3">
                  <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Últimas Transações</span>
                      <button onClick={() => switchView("transacoes")} className="text-[9px] font-bold text-emerald-600 hover:underline">
                        Ver todas
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <ArrowDownLeft size={12} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-900 leading-tight">Salário Mensal</div>
                            <div className="text-[8px] text-slate-400">Hoje • Nubank</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600">+ R$ 8.500,00</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                            <ArrowUpRight size={12} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-900 leading-tight">Supermercado Pão de Açúcar</div>
                            <div className="text-[8px] text-slate-400">Ontem • Cartão</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-rose-600">- R$ 342,10</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: NOVA RECEITA */}
            {currentView === "receita" && (
              <div className="p-4 space-y-3.5 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => switchView("inicio")}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-emerald-700 bg-white px-2 py-1 rounded-lg border border-slate-200"
                  >
                    <ArrowLeft size={13} /> Voltar
                  </button>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Nova Receita</span>
                  <div className="w-12" />
                </div>

                <div className="bg-emerald-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-emerald-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 block">Valor a Receber</span>
                  <div className="text-2xl font-black mt-1">R$ 3.500,00</div>
                  <span className="text-[9px] text-emerald-100">Depósito direto via PIX</span>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs space-y-3">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Categoria</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {["💼 Salário", "💻 Freelance", "📈 Rendimento", "🎁 Venda", "✨ Outros"].map((cat, i) => (
                        <button
                          key={cat}
                          type="button"
                          className={`p-1.5 rounded-xl text-[9px] font-bold border transition-all ${
                            i === 1 ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Destino</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[10px] font-bold text-slate-800">
                      <span>Conta Nubank (Saldo R$ 18.250,80)</span>
                      <Check size={13} className="text-emerald-600" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    showToast("Receita de R$ 3.500,00 registrada com sucesso!");
                    setTimeout(() => switchView("inicio"), 1000);
                  }}
                  className="mt-auto w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  Confirmar Receita
                </button>
              </div>
            )}

            {/* VIEW 3: NOVA DESPESA */}
            {currentView === "despesa" && (
              <div className="p-4 space-y-3.5 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => switchView("inicio")}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-rose-700 bg-white px-2 py-1 rounded-lg border border-slate-200"
                  >
                    <ArrowLeft size={13} /> Voltar
                  </button>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Nova Despesa</span>
                  <div className="w-12" />
                </div>

                <div className="bg-rose-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-rose-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-rose-100 block">Valor do Gasto</span>
                  <div className="text-2xl font-black mt-1">R$ 149,90</div>
                  <span className="text-[9px] text-rose-100">Alimentação • Cartão Nubank</span>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs space-y-3">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Categoria</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {["🍔 Mercado", "🚗 Uber/Transp.", "🏠 Moradia", "🍿 Lazer", "💊 Farmácia", "📚 Educação"].map((cat, i) => (
                        <button
                          key={cat}
                          type="button"
                          className={`p-1.5 rounded-xl text-[9px] font-bold border transition-all ${
                            i === 0 ? "bg-rose-50 border-rose-500 text-rose-800" : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">Forma de Pagamento</label>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[10px] font-bold text-slate-800">
                      <span>Cartão de Crédito Nubank (Final 8421)</span>
                      <CreditCard size={13} className="text-purple-600" />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    showToast("Despesa de R$ 149,90 registrada no cartão!");
                    setTimeout(() => switchView("inicio"), 1000);
                  }}
                  className="mt-auto w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-rose-600/20 active:scale-95 transition-all"
                >
                  Registrar Despesa
                </button>
              </div>
            )}

            {/* VIEW 4: TRANSFERÊNCIA */}
            {currentView === "transferir" && (
              <div className="p-4 space-y-3.5 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => switchView("inicio")}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-blue-700 bg-white px-2 py-1 rounded-lg border border-slate-200"
                  >
                    <ArrowLeft size={13} /> Voltar
                  </button>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Transferência PIX</span>
                  <div className="w-12" />
                </div>

                <div className="bg-blue-600 text-white rounded-2xl p-4 text-center shadow-lg shadow-blue-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-100 block">Valor a Transferir</span>
                  <div className="text-2xl font-black mt-1">R$ 800,00</div>
                  <span className="text-[9px] text-blue-100">PIX Instantâneo sem taxa</span>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs space-y-2.5">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[8px] font-black uppercase text-slate-400 block">De:</span>
                    <span className="text-[10px] font-bold text-slate-900">Nubank Conta (Saldo R$ 18.250,80)</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[8px] font-black uppercase text-slate-400 block">Para:</span>
                    <span className="text-[10px] font-bold text-slate-900">Itaú Personnalité (Tiago Silva)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    showToast("PIX de R$ 800,00 enviado com sucesso!");
                    setTimeout(() => switchView("inicio"), 1000);
                  }}
                  className="mt-auto w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                >
                  Confirmar Transferência PIX
                </button>
              </div>
            )}

            {/* VIEW 5: GESTÃO DE CARTÕES */}
            {currentView === "cards" && (
              <div className="p-3.5 space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => switchView("inicio")}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200"
                  >
                    <ArrowLeft size={13} /> Início
                  </button>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Gestão de Cartões</span>
                  <button onClick={() => showToast("Limite extra liberado")} className="text-[10px] font-bold text-emerald-600">
                    + Cartão
                  </button>
                </div>

                {/* VIRTUAL CREDIT CARD */}
                <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950 text-white p-4 rounded-2xl shadow-xl relative overflow-hidden border border-slate-800">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Ultravioleta Black</span>
                      <div className="text-sm font-black tracking-wide">Nubank Mastercard</div>
                    </div>
                    <div className="w-7 h-5 rounded bg-amber-400/90 flex items-center justify-center font-bold text-[8px] text-slate-900">
                      CHIP
                    </div>
                  </div>

                  <div className="text-xs font-mono tracking-widest mb-3">
                    •••• •••• •••• 8421
                  </div>

                  <div className="flex justify-between items-end text-[9px]">
                    <div>
                      <div className="text-slate-400 text-[7px] uppercase">Titular</div>
                      <div className="font-bold">TIAGO SILVA</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[7px] uppercase">Validade</div>
                      <div className="font-bold">08/29</div>
                    </div>
                  </div>
                </div>

                {/* INVOICE & LIMIT DETAILS */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-medium text-slate-400 uppercase">Fatura Atual</span>
                      <div className="text-base font-black text-slate-900">R$ 2.450,80</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                      Aberta
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[8px] font-bold text-slate-500 mb-1">
                      <span>Utilizado: R$ 2.450,80 (24%)</span>
                      <span>Limite: R$ 10.000,00</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full w-[24%]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-center">
                    <div className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
                      <span className="text-[8px] text-emerald-800 font-bold block">Melhor dia de compra</span>
                      <span className="text-xs font-black text-emerald-700">Dia 28 (Hoje!)</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[8px] text-slate-500 font-bold block">Vencimento</span>
                      <span className="text-xs font-black text-slate-800">Dia 05</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 6: COFRINHOS & METAS */}
            {(currentView === "piggy" || currentView === "metas") && (
              <div className="p-3.5 space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => switchView("inicio")}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200"
                  >
                    <ArrowLeft size={13} /> Início
                  </button>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Cofrinhos & CDI</span>
                  <button onClick={() => showToast("Novo cofrinho iniciado")} className="text-[10px] font-bold text-emerald-600">
                    + Novo
                  </button>
                </div>

                <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg shadow-emerald-600/15">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-200">Total Guardado em Metas</span>
                  <div className="text-2xl font-black mt-0.5">R$ 56.700,00</div>
                  <span className="text-[9px] text-emerald-100 flex items-center gap-1 mt-1">
                    <TrendingUp size={11} /> Rendendo 100% CDI (+ R$ 520,30 no mês)
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] font-extrabold text-slate-900">🛡️ Reserva de Emergência</span>
                      <span className="text-[10px] font-black text-emerald-600">85%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                      <span>R$ 8.500 acumulados</span>
                      <span>Meta: R$ 10.000</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] font-extrabold text-slate-900">✈️ Viagem Fim de Ano</span>
                      <span className="text-[10px] font-black text-blue-600">64%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-blue-500 rounded-full w-[64%]" />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                      <span>R$ 3.200 acumulados</span>
                      <span>Meta: R$ 5.000</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-2xs">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] font-extrabold text-slate-900">🏡 Entrada Casa Própria</span>
                      <span className="text-[10px] font-black text-purple-600">56%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-purple-500 rounded-full w-[56%]" />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                      <span>R$ 45.000 acumulados</span>
                      <span>Meta: R$ 80.000</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 7: DIAGNÓSTICO ORÇAMENTÁRIO (AI) */}
            {currentView === "ai" && (
              <div className="p-3.5 space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => switchView("inicio")}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200"
                  >
                    <ArrowLeft size={13} /> Início
                  </button>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Diagnóstico IA</span>
                  <div className="w-12" />
                </div>

                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 text-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Score de Saúde Financeira</span>
                  <div className="text-3xl font-black text-emerald-400 mt-1">88<span className="text-base text-slate-400">/100</span></div>
                  <span className="text-[10px] font-bold text-emerald-300">Excelente • Risco de endividamento 0%</span>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wide text-slate-700 block">Recomendações da IA</span>
                  
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-[9px] text-emerald-900 leading-relaxed">
                    💡 <strong>Economia ativa:</strong> Você gastou 18% menos em delivery nesta semana comparado à média mensal.
                  </div>

                  <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 text-[9px] text-blue-900 leading-relaxed">
                    📊 <strong>Regra 50/30/20:</strong> Suas despesas essenciais representam 46% da renda, abaixo do teto de 50%.
                  </div>

                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 text-[9px] text-amber-900 leading-relaxed">
                    ⚡ <strong>Dica de ouro:</strong> Antecipe R$ 500 do cartão para liberar limite sem juros antes do fechamento.
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 8: FLUXO DE CAIXA / RELATÓRIOS */}
            {currentView === "cashflow" && (
              <div className="p-3.5 space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => switchView("inicio")}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200"
                  >
                    <ArrowLeft size={13} /> Início
                  </button>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Fluxo de Caixa</span>
                  <div className="w-12" />
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500">Projeção Mensal</span>
                    <span className="text-[10px] font-extrabold text-emerald-600">+ R$ 7.760,00</span>
                  </div>

                  {/* Flow mini bars */}
                  <div className="grid grid-cols-4 gap-1.5 text-center items-end h-24 pt-4 border-b border-slate-100 pb-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-full bg-emerald-400 rounded-t h-12" />
                      <span className="text-[8px] font-bold text-slate-400">Sem 1</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-full bg-emerald-500 rounded-t h-16" />
                      <span className="text-[8px] font-bold text-slate-400">Sem 2</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-full bg-emerald-600 rounded-t h-20" />
                      <span className="text-[8px] font-bold text-slate-400">Sem 3</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-full bg-emerald-300 rounded-t h-10" />
                      <span className="text-[8px] font-bold text-slate-400">Sem 4</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-semibold text-slate-700">
                      <span>Moradia & Contas Fixas</span>
                      <span className="font-bold">42% (R$ 2.024)</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-semibold text-slate-700">
                      <span>Alimentação & Mercado</span>
                      <span className="font-bold">28% (R$ 1.350)</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-semibold text-slate-700">
                      <span>Transporte & Lazer</span>
                      <span className="font-bold">30% (R$ 1.446)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 9: TRANSAÇÕES */}
            {currentView === "transacoes" && (
              <div className="p-3.5 space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => switchView("inicio")}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200"
                  >
                    <ArrowLeft size={13} /> Início
                  </button>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Extrato Completo</span>
                  <div className="w-12" />
                </div>

                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    readOnly
                    value="Busca por mercado, salário, pix..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white rounded-xl border border-slate-200 text-[10px] text-slate-500 font-medium"
                  />
                </div>

                <div className="space-y-2 bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs">
                  <div className="text-[9px] font-black uppercase text-slate-400">Hoje</div>
                  
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <ArrowDownLeft size={13} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-900">Salário CLT</div>
                        <div className="text-[8px] text-slate-400">Transferência recebida</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-emerald-600">+ R$ 8.500,00</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                        <ArrowUpRight size={13} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-900">Posto Ipiranga</div>
                        <div className="text-[8px] text-slate-400">Combustível • Débito</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-rose-600">- R$ 210,00</span>
                  </div>

                  <div className="text-[9px] font-black uppercase text-slate-400 pt-2">Ontem</div>

                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                        <ArrowUpRight size={13} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-900">Supermercado Pão de Açúcar</div>
                        <div className="text-[8px] text-slate-400">Alimentação • Cartão</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-rose-600">- R$ 342,10</span>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 10: MAIS / CONFIGURAÇÕES */}
            {currentView === "mais" && (
              <div className="p-3.5 space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => switchView("inicio")}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200"
                  >
                    <ArrowLeft size={13} /> Início
                  </button>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Configurações</span>
                  <div className="w-12" />
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center">
                    TS
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">Tiago Silva</div>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Plano Premium Ativo
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-2 border border-slate-100 shadow-2xs divide-y divide-slate-50">
                  {[
                    { label: "Contas e Cartões", icon: CreditCard, action: () => switchView("cards") },
                    { label: "Cofrinhos e Metas", icon: PiggyBank, action: () => switchView("piggy") },
                    { label: "Diagnóstico com IA", icon: Sparkles, action: () => switchView("ai") },
                    { label: "Fluxo e Relatórios", icon: BarChart3, action: () => switchView("cashflow") },
                    { label: "Segurança e Biometria", icon: ShieldCheck, action: () => showToast("Biometria ativa e segura") },
                    { label: "Backup em Nuvem", icon: Zap, action: () => showToast("Backup sincronizado com Google Cloud") }
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon size={14} className="text-slate-600" />
                        <span className="text-[11px] font-bold text-slate-800">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">›</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* FLOATING IN-APP ASSISTANT BUTTON */}
            <div className="absolute right-3.5 bottom-3 z-30">
              <button
                type="button"
                onClick={() => setIsAiChatOpen(!isAiChatOpen)}
                className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 flex items-center justify-center shadow-md relative transition-transform active:scale-95"
                title="Atendimento e Consultoria Bolso+"
              >
                <MessageSquare size={17} strokeWidth={2.2} />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>
            </div>
          </div>

          {/* CONSULTORIA / SUPORTE DRAWER OVERLAY */}
          <AnimatePresence>
            {isAiChatOpen && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="absolute inset-x-2 bottom-16 bg-white rounded-3xl p-3.5 border border-slate-200 shadow-2xl z-40 space-y-2.5"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <MessageSquare size={12} />
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-slate-900">Consultoria Bolso AI</h5>
                      <span className="text-[8px] font-bold text-emerald-600">Assistente especializado</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAiChatOpen(false)}
                    className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="text-[10px] bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-slate-700 leading-relaxed">
                  Olá, Tiago! Analisei seu fluxo: seus gastos com alimentação e contas fixas estão dentro da meta orçamentária de 50%. Deseja revisar os vencimentos da semana?
                </div>
                <button
                  type="button"
                  onClick={onCtaClick}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center gap-1.5"
                >
                  <span>Acessar plataforma completa</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BOTTOM NAVIGATION BAR */}
          <div className="bg-white border-t border-slate-200/80 px-4 py-2 relative z-20">
            <div className="flex items-center justify-between">
              {/* 1. Início */}
              <button
                type="button"
                onClick={() => switchView("inicio")}
                className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                  currentView === "inicio" || currentView === "dashboard" ? "text-[#10B981]" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Home size={18} strokeWidth={2.5} />
                <span className="text-[9px] font-bold">Início</span>
              </button>

              {/* 2. Transações */}
              <button
                type="button"
                onClick={() => switchView("transacoes")}
                className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                  currentView === "transacoes" ? "text-[#10B981]" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <ArrowLeftRight size={18} strokeWidth={2.2} />
                <span className="text-[9px] font-bold">Transações</span>
              </button>

              {/* 3. Center Elevated + Button (Quick action menu) */}
              <div className="relative -mt-6">
                <button
                  type="button"
                  onClick={() => switchView(currentView === "receita" ? "despesa" : "receita")}
                  className="w-12 h-12 rounded-full bg-[#10B981] hover:bg-[#059669] text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 transition-transform active:scale-95 border-2 border-white cursor-pointer"
                  title="Novo Lançamento"
                >
                  <Plus size={22} strokeWidth={3} />
                </button>
              </div>

              {/* 4. Metas */}
              <button
                type="button"
                onClick={() => switchView("metas")}
                className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                  currentView === "metas" || currentView === "piggy" ? "text-[#10B981]" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Target size={18} strokeWidth={2.2} />
                <span className="text-[9px] font-bold">Metas</span>
              </button>

              {/* 5. Mais */}
              <button
                type="button"
                onClick={() => switchView("mais")}
                className={`flex flex-col items-center gap-0.5 cursor-pointer ${
                  currentView === "mais" ? "text-[#10B981]" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <MoreHorizontal size={18} strokeWidth={2.5} />
                <span className="text-[9px] font-bold">Mais</span>
              </button>
            </div>

            {/* iOS Bottom Indicator Bar */}
            <div className="pt-2 flex justify-center">
              <div className="w-24 h-1 bg-slate-300 rounded-full" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
