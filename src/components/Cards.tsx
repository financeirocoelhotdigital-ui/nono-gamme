import React, { useState, useMemo, useEffect } from "react";
import { Card, Transaction, Invoice, Account } from "../types";
import { auth, db } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot, runTransaction, doc } from "firebase/firestore";
import { formatCurrency, cn } from "../lib/utils";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { contas } from "../modules/contasModule";
import { cartoes } from "../modules/cartoesModule";
import { useCartoes } from "../context/CartoesContext";
import { useTransacoes } from "../context/TransacoesContext";
import { useContas } from "../context/ContasContext";
import { getBillingPeriod, formatBillingPeriod, checkInvoiceStatus } from "../lib/creditCardUtils";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit2, 
  Search,
  Check,
  AlertTriangle,
  ChevronRight,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  MessageSquare,
  Tag,
  ChevronDown,
  Activity,
  Sliders,
  Info,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  Percent,
  HelpCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BankIcon } from "./BankIcon";
import { ALL_BANKS } from "../constants/banks";

// Premium Custom Themes/Skins for Cards with rich metallic finishes
export const PREMIUM_THEMES = [
  { id: "nubank-purple", name: "Roxo Nubank", hex: "#820ad1", gradient: "from-[#820ad1] via-[#5c0797] to-[#1a0130]", text: "text-white", border: "border-purple-500/40", chip: "gold" },
  { id: "itau-orange", name: "Laranja Itaú", hex: "#ec7000", gradient: "from-[#ec7000] via-[#b84d00] to-[#1a0800]", text: "text-white", border: "border-orange-500/40", chip: "silver" },
  { id: "inter-orange", name: "Laranja Inter", hex: "#f37021", gradient: "from-[#f37021] via-[#c4530f] to-[#1c0a02]", text: "text-white", border: "border-orange-400/40", chip: "gold" },
  { id: "bradesco-red", name: "Vermelho Bradesco", hex: "#cc092f", gradient: "from-[#cc092f] via-[#8a061f] to-[#210207]", text: "text-white", border: "border-red-500/40", chip: "silver" },
  { id: "santander-red", name: "Vermelho Santander", hex: "#ec0000", gradient: "from-[#ec0000] via-[#a30000] to-[#210000]", text: "text-white", border: "border-rose-500/40", chip: "silver" },
  { id: "caixa-blue", name: "Azul Caixa", hex: "#005ca9", gradient: "from-[#005ca9] via-[#003d73] to-[#011424]", text: "text-white", border: "border-sky-500/40", chip: "silver" },
  { id: "bb-blue-gold", name: "Ouro Banco do Brasil", hex: "#0038a8", gradient: "from-[#0038a8] via-[#002166] to-[#050014]", text: "text-white", border: "border-amber-400/50", chip: "gold" },
  { id: "btg-navy", name: "Azul BTG Pactual", hex: "#001e3d", gradient: "from-[#001e3d] via-[#000d1e] to-[#020509]", text: "text-white", border: "border-slate-500/40", chip: "silver" },
  { id: "c6-carbon", name: "Carbon C6", hex: "#2b2b2b", gradient: "from-[#3a3a3a] via-[#1f1f1f] to-[#0a0a0a]", text: "text-white", border: "border-zinc-700/50", chip: "silver" },
  { id: "charcoal-carbon", name: "Carbon Obsidian", hex: "#171717", gradient: "from-[#2b2b2b] via-[#171717] to-[#000000]", text: "text-white", border: "border-zinc-800/60", chip: "silver" },
  { id: "royal-gold", name: "Gold Dynasty 24k", hex: "#d4af37", gradient: "from-[#d4af37] via-[#997708] to-[#2e2000]", text: "text-white", border: "border-amber-400/50", chip: "gold" },
  { id: "emerald-aurora", name: "Holographic Emerald", hex: "#059669", gradient: "from-[#059669] via-[#046c4e] to-[#022c22]", text: "text-white", border: "border-emerald-500/40", chip: "gold" },
  { id: "cosmic-purple", name: "Cosmic Amethyst", hex: "#7c3aed", gradient: "from-[#7c3aed] via-[#5b21b6] to-[#1e1b4b]", text: "text-white", border: "border-purple-500/40", chip: "gold" },
  { id: "royal-blue", name: "Deep Sapphire", hex: "#2563eb", gradient: "from-[#2563eb] via-[#1e40af] to-[#0f172a]", text: "text-white", border: "border-blue-500/40", chip: "silver" },
  { id: "rose-silk", name: "Luxury Rose Gold", hex: "#fb7185", gradient: "from-[#fb7185] via-[#be123c] to-[#4c0519]", text: "text-white", border: "border-rose-400/40", chip: "gold" },
  { id: "neon-lime", name: "Neon Lime Cyber", hex: "#84cc16", gradient: "from-[#84cc16] via-[#4d7c0f] to-[#142303]", text: "text-white", border: "border-lime-400/40", chip: "gold" },
  { id: "cyan-electric", name: "Electric Cyan", hex: "#06b6d4", gradient: "from-[#06b6d4] via-[#0e7490] to-[#082f49]", text: "text-white", border: "border-cyan-400/40", chip: "silver" },
];

// Helper to safely adjust hex darkness for rich gradient creation
function adjustHexDarkness(hex: string, percent: number) {
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map(c => c + c).join("");
  }
  let num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + percent;
  if (r > 255) r = 255; else if (r < 0) r = 0;
  let g = ((num >> 8) & 0x00FF) + percent;
  if (g > 255) g = 255; else if (g < 0) g = 0;
  let b = (num & 0x0000FF) + percent;
  if (b > 255) b = 255; else if (b < 0) b = 0;
  return "#" + (b | (g << 8) | (r << 16)).toString(16).padStart(6, "0");
}

export function getCardStyle(colorCode: string | undefined) {
  if (!colorCode) {
    return { className: "bg-gradient-to-br from-[#2b2b2b] via-[#171717] to-[#000000]", style: {} };
  }
  const theme = PREMIUM_THEMES.find(t => t.id === colorCode);
  if (theme) {
    return { className: `bg-gradient-to-br ${theme.gradient}`, style: {} };
  }
  if (colorCode.startsWith("#") || colorCode.startsWith("rgb")) {
    let baseHex = colorCode;
    // Map bright yellow (#fcfc30) to rich BB navy to prevent washed out text
    if (baseHex.toLowerCase() === "#fcfc30" || baseHex.toLowerCase() === "#ffff00") {
      baseHex = "#0038a8";
    }
    const light = adjustHexDarkness(baseHex, 20);
    const dark1 = adjustHexDarkness(baseHex, -35);
    const dark2 = adjustHexDarkness(baseHex, -70);
    return {
      className: "",
      style: {
        background: `linear-gradient(135deg, ${light} 0%, ${baseHex} 40%, ${dark1} 75%, ${dark2} 100%)`
      }
    };
  }
  return { className: "bg-gradient-to-br from-[#2b2b2b] via-[#171717] to-[#000000]", style: {} };
}

// Render physical credit card micro gold chip
function CardChip({ type = "gold" }: { type?: "gold" | "silver" }) {
  const isGold = type === "gold";
  return (
    <div className={cn(
      "relative h-9 w-12 rounded-lg p-[1.5px] shadow-md overflow-hidden flex flex-col justify-between border border-black/10",
      isGold 
        ? "bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600" 
        : "bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600"
    )}>
      {/* Circuit lines layout on physical microchip */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
        <div className="border-r border-b border-black/40" />
        <div className="border-r border-b border-black/40" />
        <div className="border-b border-black/40" />
        <div className="border-r border-b border-black/40" />
        <div className="border-r border-b border-black/40" />
        <div className="border-b border-black/40" />
        <div className="border-r border-black/40" />
        <div className="border-r border-black/40" />
        <div />
      </div>
      <div className="h-full w-full border border-white/20 rounded-[5px]" />
    </div>
  );
}

// Contactless payment curves wave icon
function ContactlessIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={cn("text-slate-900/60 h-5 w-5 rotate-90", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12a3 3 0 0 1 .88-2.12A3 3 0 0 1 8 9" />
      <path d="M5 12a6 6 0 0 1 1.76-4.24A6 6 0 0 1 11 6" />
      <path d="M5 12a9 9 0 0 1 2.64-6.36A9 9 0 0 1 14 3" />
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

// Credit Card Brand emblems
function BrandLogo({ brand, className = "" }: { brand: string; className?: string }) {
  const brandLower = brand.toLowerCase();
  if (brandLower === "visa") {
    return (
      <span className={cn("font-black tracking-tighter text-slate-900 italic text-xl select-none", className)}>
        VISA
      </span>
    );
  }
  if (brandLower === "mastercard") {
    return (
      <div className={cn("flex items-center -space-x-2 select-none", className)}>
        <div className="h-6 w-6 rounded-full bg-red-500 opacity-95" />
        <div className="h-6 w-6 rounded-full bg-amber-500 opacity-95" />
      </div>
    );
  }
  if (brandLower === "amex") {
    return (
      <div className={cn("px-2 py-0.5 border border-sky-300 bg-sky-600/40 text-[9px] font-black uppercase tracking-widest text-sky-100 select-none rounded-md shadow-sm", className)}>
        AMEX
      </div>
    );
  }
  if (brandLower === "elo") {
    return (
      <div className={cn("flex items-center gap-1 select-none", className)}>
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-blue-500 p-[1.5px] shadow-sm">
          <div className="h-full w-full rounded-full bg-zinc-950" />
        </div>
        <span className="text-[10px] font-black tracking-wider text-slate-900">elo</span>
      </div>
    );
  }
  return (
    <span className={cn("text-[10px] font-black tracking-widest text-slate-900/60 select-none uppercase", className)}>
      {brand}
    </span>
  );
}

// Helper to check and calculate "Melhor Dia para Compras" (Closing Day vs Today)
const getBestDayStatus = (closingDay: number) => {
  const today = new Date();
  const currentDay = today.getDate();
  
  // Best day is exactly on closing day and the 2 days after, because purchases will be billed on the subsequent month's invoice (up to 40 days gap)
  if (currentDay >= closingDay && currentDay <= closingDay + 2) {
    return { isBest: true, text: "🔥 Melhor Dia para Compras!" };
  }
  
  let daysUntil = closingDay - currentDay;
  if (daysUntil < 0) {
    const lastDayOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    daysUntil = (lastDayOfThisMonth - currentDay) + closingDay;
  }
  
  return { isBest: false, text: `Melhor dia em ${daysUntil} dias` };
};

export function Cards() {
  const { cards } = useCartoes();
  const { transactions } = useTransacoes();
  const { accounts } = useContas();
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);

  // Consolidated Credit Analytics
  const { totalLimit, totalUsed, totalAvailable, avgUsedPercent } = useMemo(() => {
    const lim = cards.reduce((acc, c) => acc + c.limit, 0);
    const usd = cards.reduce((acc, c) => acc + c.usedLimit, 0);
    const avl = cards.reduce((acc, c) => acc + (c.availableLimit ?? (c.limit - c.usedLimit)), 0);
    const pct = lim > 0 ? (usd / lim) * 100 : 0;
    return { totalLimit: lim, totalUsed: usd, totalAvailable: avl, avgUsedPercent: pct };
  }, [cards]);

  // Recommended Card based on Billing Cycle
  const recommendedCard = useMemo(() => {
    if (cards.length === 0) return null;
    const sorted = [...cards].sort((a, b) => {
      const statusA = getBestDayStatus(a.closingDay);
      const statusB = getBestDayStatus(b.closingDay);
      if (statusA.isBest && !statusB.isBest) return -1;
      if (!statusA.isBest && statusB.isBest) return 1;
      return (b.availableLimit ?? (b.limit - b.usedLimit)) - (a.availableLimit ?? (a.limit - a.usedLimit));
    });
    return sorted[0];
  }, [cards]);

  // Purchase Simulator State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simValue, setSimValue] = useState("");
  const [simInstallments, setSimInstallments] = useState(1);

  return (
    <div className="space-y-8 pb-24">
      {/* Title Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase italic">Meus Cartões</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gestão de Crédito e Limites</p>
        </div>
        <button 
          onClick={() => setIsAddingCard(true)} 
          className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-90 transition-transform"
          title="Cadastrar Cartão"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      {/* Credit Dashboard Bento Grid */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-[32px] bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Crédito Consolidado</span>
              <div className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                <ShieldCheck size={18} className="text-gray-400" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black tracking-tighter italic text-slate-900">{formatCurrency(totalLimit)}</p>
              <div className="mt-2 flex justify-between text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                <span>Disponível: {formatCurrency(totalAvailable)}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-[32px] bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Faturas Globais</span>
              <div className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs",
                avgUsedPercent > 70 ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-slate-900"
              )}>
                <Percent size={14} />
              </div>
            </div>
            <div>
              <p className={cn("text-2xl font-black tracking-tighter italic", avgUsedPercent > 70 ? "text-rose-500" : "text-slate-900")}>
                {formatCurrency(totalUsed)}
              </p>
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", avgUsedPercent > 70 ? "bg-rose-500" : "bg-emerald-500")}
                    style={{ width: `${Math.min(100, avgUsedPercent)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                  <span>Comprometimento do Limite</span>
                  <span>{avgUsedPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {recommendedCard && (
            <div className="p-6 rounded-[32px] bg-white text-slate-900 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles size={120} className="rotate-12" />
              </div>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900/40">Recomendado para Hoje</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="relative z-10">
                <p className="text-lg font-black tracking-tight leading-tight italic text-emerald-600">{recommendedCard.name}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-900/40 mt-1">
                  Melhor prazo de pagamento ({recommendedCard.brand} • Final ****)
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                  <Calendar size={10} className="text-emerald-600" />
                  {getBestDayStatus(recommendedCard.closingDay).text}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simulator Button & Panel */}
      {cards.length > 0 && (
        <div className="rounded-[32px] bg-white border border-gray-100 shadow-sm overflow-hidden">
          <button 
            onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50/50 transition-all text-left"
          >
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sliders size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase">Simulador de Impacto de Compra</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Veja onde cabe sua próxima compra parcelada</p>
              </div>
            </div>
            <ChevronDown size={20} className={cn("text-gray-400 transition-transform duration-300", isSimulatorOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isSimulatorOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-50 bg-gray-50/30 overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Valor da Compra (R$)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400 italic">R$</span>
                        <input 
                          type="number"
                          placeholder="Ex: 1.200,00"
                          value={simValue}
                          onChange={e => setSimValue(e.target.value)}
                          className="w-full rounded-2xl border-none bg-white p-4 pl-10 text-xs font-black text-slate-900 focus:ring-2 focus:ring-primary-lime/30 shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1">Número de Parcelas</label>
                      <select
                        value={simInstallments}
                        onChange={e => setSimInstallments(parseInt(e.target.value))}
                        className="w-full rounded-2xl border-none bg-white p-4 text-xs font-black text-slate-900 focus:ring-2 focus:ring-primary-lime/30 shadow-sm"
                      >
                        {[...Array(24)].map((_, i) => (
                          <option key={i+1} value={i+1}>{i+1}x {i > 0 ? "Sem juros" : "À Vista"}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {simValue && parseFloat(simValue) > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Resultado da Simulação</h5>
                      <div className="grid grid-cols-1 gap-3">
                        {cards.map(card => {
                          const value = parseFloat(simValue);
                          const avLimit = card.availableLimit ?? (card.limit - card.usedLimit);
                          const isApproved = avLimit >= value;
                          const estInstallment = value / simInstallments;
                          const newUsedPercent = ((card.usedLimit + value) / card.limit) * 100;
                          
                          return (
                            <div key={card.id} className="p-4 rounded-2xl bg-white border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                              <div className="flex items-center gap-3">
                                <BankIcon bankName={card.bank} className="h-10 w-10 shrink-0" />
                                <div>
                                  <div className="text-xs font-black text-slate-900 uppercase italic leading-none">{card.name}</div>
                                  <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                    Limite Disponível: {formatCurrency(avLimit)}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:flex md:items-center gap-6">
                                <div className="text-left md:text-right">
                                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Parcela Mensal</div>
                                  <div className="text-xs font-black text-indigo-600">
                                    {simInstallments}x de {formatCurrency(estInstallment)}
                                  </div>
                                </div>
                                
                                <div className="text-left md:text-right">
                                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Novo Uso do Limite</div>
                                  <div className={cn("text-xs font-black", newUsedPercent > 80 ? "text-rose-500" : "text-slate-900")}>
                                    {newUsedPercent.toFixed(1)}%
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between md:justify-end gap-2 pt-3 border-t border-gray-50 md:border-t-0 md:pt-0">
                                {isApproved ? (
                                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                                    <CheckCircle size={12} strokeWidth={3} />
                                    Aprovado
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-rose-50 text-rose-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                                    <XCircle size={12} strokeWidth={3} />
                                    Negado (Estoura Limite)
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Credit Cards Stack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card, index) => (
          <CardItem 
            key={card.id} 
            card={card} 
            index={index} 
            onEdit={() => setEditingCard(card)}
            onSelect={() => setSelectedCard(card)}
          />
        ))}

        {cards.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-[40px] bg-white border-2 border-dashed border-gray-100 shadow-sm">
            <div className="h-20 w-20 rounded-3xl bg-gray-50 text-gray-300 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CreditCard size={36} />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2 uppercase">Nenhum cartão cadastrado</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest max-w-[280px] mx-auto mb-6 leading-relaxed">
              Adicione seus cartões de crédito para ter total controle sobre faturas, datas de fechamento e limites.
            </p>
            <button 
              onClick={() => setIsAddingCard(true)}
              className="px-8 py-4 rounded-2xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all shadow-xl shadow-primary-dark/10 active:scale-95"
            >
              Adicionar Primeiro Cartão
            </button>
          </div>
        )}
      </div>

      {/* Modals and Forms */}
      <AnimatePresence>
        {isAddingCard && <CardForm onClose={() => setIsAddingCard(false)} />}
        {editingCard && <CardForm onClose={() => setEditingCard(null)} initialData={editingCard} />}
        {selectedCard && (
          <CardDetails 
            card={selectedCard} 
            onClose={() => setSelectedCard(null)} 
            transactions={transactions}
            onPayInvoice={(invoice) => setPayInvoice(invoice)}
          />
        )}
        {payInvoice && (
          <PayInvoiceModal
            invoice={payInvoice}
            card={cards.find(c => c.id === payInvoice.cardId)!}
            accounts={accounts}
            onClose={() => setPayInvoice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// REDESIGNED STYLISH PHYSICAL-LOOKING CREDIT CARD
function CardItem({ card, index, onEdit, onSelect }: { card: Card, index: number, onEdit: () => void, onSelect: () => void }) {
  const { deleteCard } = useCartoes();
  const usedPercentage = (card.usedLimit / card.limit) * 100;
  const isCritical = usedPercentage > 85;
  const bestDay = getBestDayStatus(card.closingDay);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Deseja excluir o cartão "${card.name}"?`)) {
      await deleteCard(card.id);
    }
  };

  // Determine premium gradient background or fallback to bank colors
  const cardStyle = getCardStyle(card.color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-[38px] p-8 text-white shadow-xl hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] transition-all cursor-pointer select-none active:scale-[0.98] border border-white/10",
        cardStyle.className
      )}
      style={cardStyle.style}
    >
      {/* Glare glossy highlight & metallic sheen */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.02)_45%,rgba(0,0,0,0.35)_100%)] opacity-90 pointer-events-none group-hover:scale-105 transition-transform duration-700" />
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl group-hover:bg-white/15 transition-all duration-500" />
      <div className="absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-black/20 blur-xl pointer-events-none" />

      {/* Real-time "Melhor Dia" Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
        {bestDay.isBest ? (
          <div className="flex items-center gap-1 bg-emerald-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg animate-pulse">
            <Sparkles size={10} />
            Melhor Dia!
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur-md border border-white/20 text-white/90 px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-sm">
            {bestDay.text}
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-col justify-between h-48">
        {/* Header Block */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-md shadow-inner border border-white/10">
              <BankIcon bankName={card.bank} className="h-10 w-10 shadow-md" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tighter italic uppercase leading-tight drop-shadow-sm">{card.name}</h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">{card.bank}</p>
            </div>
          </div>
          
          {/* Form Actions (Only visible in modern touch/hover mode) */}
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-all shadow-sm backdrop-blur-md cursor-pointer"
              title="Editar"
            >
              <Edit2 size={13} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(e); }} 
              className="h-8 w-8 rounded-full bg-white/15 hover:bg-rose-500/40 flex items-center justify-center text-white hover:text-rose-200 transition-all shadow-sm backdrop-blur-md cursor-pointer"
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Chip, Waves & Brand Emblem */}
        <div className="flex items-center justify-between -mt-2">
          <div className="flex items-center gap-3">
            <CardChip type={PREMIUM_THEMES.find(t => t.id === card.color)?.chip === "silver" ? "silver" : "gold"} />
            <ContactlessIcon className="text-white/50" />
          </div>
          <BrandLogo brand={card.brand || "Visa"} className="scale-95 drop-shadow" />
        </div>

        {/* Available Limit Display */}
        <div className="flex items-end justify-between pt-2">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/70 mb-0.5">Limite Disponível</p>
            <p className="text-2xl font-black tracking-tighter italic text-emerald-400 leading-none drop-shadow">
              {formatCurrency(card.availableLimit ?? (card.limit - card.usedLimit))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/70 mb-0.5">Usado / Total</p>
            <p className="text-sm font-black tracking-tighter text-white leading-none">
              {formatCurrency(card.usedLimit)} <span className="text-white/60 text-[10px]">/ {formatCurrency(card.limit)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Progress usage meter */}
      <div className="mt-6 space-y-1.5 relative z-10">
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden p-[1px]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, usedPercentage)}%` }}
            className={cn(
              "h-full rounded-full transition-colors",
              isCritical ? "bg-rose-500" : "bg-emerald-500"
            )}
          />
        </div>
        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/60">
          <span>Uso do Crédito</span>
          <span className={cn(isCritical ? "text-rose-400 font-extrabold animate-pulse" : "text-emerald-400")}>
            {usedPercentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Exp, Closing, Due Dates */}
      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-white/70 relative z-10">
        <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider">
          <div>
            <span className="text-white/50 text-[8px] font-black block tracking-widest mb-0.5">FECHAMENTO</span>
            <span className="text-white text-xs font-black">Dia {card.closingDay}</span>
          </div>
          <div className="h-5 w-[1px] bg-white/10" />
          <div>
            <span className="text-white/50 text-[8px] font-black block tracking-widest mb-0.5">VENCIMENTO</span>
            <span className="text-white text-xs font-black">Dia {card.dueDay}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-emerald-400 hover:translate-x-1 transition-transform text-[9px] font-black uppercase tracking-widest">
          <span>Faturas & Itens</span>
          <BrandLogo brand={card.brand} className="ml-1 scale-90" />
          <ChevronRight size={14} className="ml-0.5" />
        </div>
      </div>

      {/* Limit Alert Badge */}
      {isCritical && (
        <div className="absolute bottom-16 right-4 flex items-center gap-1.5 bg-rose-500/95 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest shadow-md">
          <AlertTriangle size={10} />
          Uso de Risco!
        </div>
      )}
    </motion.div>
  );
}

// FORM WITH LIVE CREDIT CARD PREVIEW
function CardForm({ onClose, initialData }: { onClose: () => void, initialData?: Card }) {
  const { addCard, updateCard } = useCartoes();
  const [name, setName] = useState(initialData?.name || "");
  const [bank, setBank] = useState(initialData?.bank || "");
  const [limit, setLimit] = useState(initialData?.limit?.toString() || "");
  const [closingDay, setClosingDay] = useState(initialData?.closingDay?.toString() || "5");
  const [dueDay, setDueDay] = useState(initialData?.dueDay?.toString() || "12");
  const [brand, setBrand] = useState(initialData?.brand || "Visa");
  const [color, setColor] = useState(initialData?.color || "charcoal-carbon");
  const [showBankList, setShowBankList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCustomBankMode, setIsCustomBankMode] = useState(false);
  const [customBankInput, setCustomBankInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const filteredBanks = useMemo(() => {
    const filtered = ALL_BANKS.filter(b => 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const cardName = name.trim() || (bank.trim() ? `${bank.trim()} Card` : "Novo Cartão");
    const cardBank = bank.trim() || cardName || "Outro Banco";

    const limitVal = parseFloat(limit);
    if (isNaN(limitVal) || limitVal <= 0) {
      setErrorMessage("Por favor, informe um limite de crédito válido (maior que zero).");
      return;
    }

    const closingDayVal = parseInt(closingDay);
    if (isNaN(closingDayVal) || closingDayVal < 1 || closingDayVal > 31) {
      setErrorMessage("Informe um dia de fechamento válido (entre 1 e 31).");
      return;
    }

    const dueDayVal = parseInt(dueDay);
    if (isNaN(dueDayVal) || dueDayVal < 1 || dueDayVal > 31) {
      setErrorMessage("Informe um dia de vencimento válido (entre 1 e 31).");
      return;
    }

    const uid = auth.currentUser?.uid || "default_user";
    const usedLimitVal = initialData?.usedLimit || 0;

    const data = { 
      userId: uid, 
      name: cardName, 
      bank: cardBank,
      limit: limitVal, 
      usedLimit: usedLimitVal,
      availableLimit: limitVal - usedLimitVal,
      closingDay: closingDayVal, 
      dueDay: dueDayVal,
      color,
      brand,
      active: true,
      createdAt: initialData?.createdAt || new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      if (initialData) {
        await updateCard(initialData.id, data);
      } else {
        await addCard(data);
      }
      onClose();
    } catch (err) {
      console.error("Erro ao salvar cartão:", err);
      setErrorMessage("Erro ao salvar o cartão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live card preview styling
  const previewStyle = getCardStyle(color);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md px-4 pb-8">
      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        className="w-full max-w-xl rounded-[40px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col max-h-[95vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black tracking-tighter text-slate-900 uppercase italic">
            {initialData ? "Editar Cartão" : "Novo Cartão"}
          </h3>
          <button onClick={onClose} className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>

        {/* LIVE PREVIEW BOX */}
        <div className="mb-6 p-1 bg-gray-50 rounded-[42px] border border-gray-100 shadow-inner flex justify-center">
          <div className={cn(
            "w-full max-w-sm rounded-[36px] p-6 text-white relative overflow-hidden shadow-lg border border-white/10",
            previewStyle.className
          )}
          style={previewStyle.style}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-40 pointer-events-none" />
            <div className="relative z-10 flex flex-col justify-between h-36">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <BankIcon bankName={bank || "Bancos"} className="h-8 w-8 shadow-sm bg-white/10 p-1 rounded-xl" />
                  <div>
                    <h4 className="text-sm font-black tracking-tight leading-none uppercase italic">{name || "Nome do Cartão"}</h4>
                    <p className="text-[8px] font-bold text-white/70 uppercase tracking-widest mt-1">{bank || "Banco Emissor"}</p>
                  </div>
                </div>
                <BrandLogo brand={brand} className="scale-90" />
              </div>

              <div className="flex items-center justify-between -mt-2">
                <CardChip type={PREMIUM_THEMES.find(t => t.id === color)?.chip === "silver" ? "silver" : "gold"} />
                <ContactlessIcon className="text-white/50" />
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[7px] font-black uppercase text-white/60 block tracking-widest">Limite Configurado</span>
                  <p className="text-lg font-black text-emerald-400 leading-none italic">{formatCurrency(parseFloat(limit) || 0)}</p>
                </div>
                <div className="flex gap-3 text-[8px] font-black uppercase text-white/70 tracking-wider">
                  <div>Fech.: <span className="text-white">Dia {closingDay || "00"}</span></div>
                  <div>Venc.: <span className="text-white">Dia {dueDay || "00"}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form elements */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 -mr-1 custom-scrollbar pb-6 flex-1">
          {/* Bank Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Instituição do Cartão</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBankList(!showBankList)}
                className="w-full flex items-center gap-4 rounded-3xl bg-gray-50 p-4 text-left border-2 border-transparent focus:border-primary-lime/30 transition-all"
              >
                <BankIcon bankName={bank} className="h-10 w-10 shadow-sm" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900">{bank || "Selecionar Banco Emissor"}</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Clique para abrir a lista</div>
                </div>
                <ChevronRight size={20} className={cn("text-gray-300 transition-transform", showBankList && "rotate-90")} />
              </button>

              <AnimatePresence>
                {showBankList && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 right-0 top-full mt-2 z-50 rounded-3xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-50 bg-white">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text"
                          placeholder="Buscar banco brasileiro..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full rounded-xl bg-gray-50 border-none py-2 pl-10 pr-4 text-xs font-bold focus:ring-1 focus:ring-primary-lime"
                        />
                      </div>
                    </div>

                    {isCustomBankMode && (
                      <div className="p-4 bg-white/5 border-b border-gray-100 flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Nome do Banco Personalizado</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ex: Caju, Sicoob, Digio, Banco Local..."
                            value={customBankInput}
                            onChange={e => setCustomBankInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (customBankInput.trim()) {
                                  setBank(customBankInput.trim());
                                  if (!name) setName(`${customBankInput.trim()} Card`);
                                  setShowBankList(false);
                                  setIsCustomBankMode(false);
                                  setCustomBankInput("");
                                }
                              }
                            }}
                            className="flex-1 rounded-xl bg-white border border-gray-200 py-2 px-3 text-xs font-bold focus:ring-2 focus:ring-primary-lime/30"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customBankInput.trim()) {
                                setBank(customBankInput.trim());
                                if (!name) setName(`${customBankInput.trim()} Card`);
                                setShowBankList(false);
                                setIsCustomBankMode(false);
                                setCustomBankInput("");
                              }
                            }}
                            className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-black transition-all cursor-pointer"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="max-h-52 overflow-y-auto custom-scrollbar bg-white">
                      {filteredBanks.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setBank(b.name);
                            setColor(b.color); // standard bank hex color
                            if (!name) setName(`${b.name} Black`);
                            setShowBankList(false);
                            setIsCustomBankMode(false);
                          }}
                          className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-none bg-white text-left cursor-pointer"
                        >
                          <BankIcon bankName={b.name} className="h-8 w-8" />
                          <div className="text-left">
                            <div className="text-sm font-bold text-slate-900">{b.name}</div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">{b.fullName}</div>
                          </div>
                          {bank === b.name && <Check size={16} className="ml-auto text-emerald-600" strokeWidth={4} />}
                        </button>
                      ))}

                      {searchTerm && !filteredBanks.some(b => b.name.toLowerCase() === searchTerm.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setBank(searchTerm.trim());
                            if (!name) setName(`${searchTerm.trim()} Card`);
                            setShowBankList(false);
                            setIsCustomBankMode(false);
                            setSearchTerm("");
                          }}
                          className="w-full flex items-center gap-3 p-3.5 hover:bg-lime-50/50 transition-colors border-b border-gray-50 bg-white text-left cursor-pointer"
                        >
                          <div className="h-8 w-8 rounded-full bg-emerald-50 text-slate-900 flex items-center justify-center font-black text-xs">
                            +
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-bold text-slate-900">Usar "{searchTerm}"</div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Adicionar como Banco Personalizado</div>
                          </div>
                          <Plus size={16} className="text-slate-900" />
                        </button>
                      )}
                    </div>

                    <div className="p-2 border-t border-gray-100 bg-gray-50/80">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomBankMode(!isCustomBankMode);
                          if (!customBankInput && searchTerm) {
                            setCustomBankInput(searchTerm);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-slate-900 hover:bg-gray-100 transition-all shadow-sm cursor-pointer"
                      >
                        <Plus size={14} className="text-emerald-600" strokeWidth={3} />
                        <span>{isCustomBankMode ? "Fechar Cadastro Personalizado" : "Adicionar Banco Personalizado"}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Nome do Cartão</label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full rounded-2xl border-none bg-gray-50 py-3.5 px-5 text-xs font-bold focus:ring-2 focus:ring-primary-lime/20" 
                placeholder="Ex: Nubank Violet" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Limite Total (R$)</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400 italic">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  required 
                  value={limit} 
                  onChange={e => setLimit(e.target.value)} 
                  className="w-full rounded-2xl border-none bg-gray-50 py-3.5 pl-10 pr-5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-primary-lime/20" 
                  placeholder="0,00" 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Dia do Fechamento</label>
              <input 
                type="number" 
                min="1" 
                max="31"
                required 
                value={closingDay} 
                onChange={e => setClosingDay(e.target.value)} 
                className="w-full rounded-2xl border-none bg-gray-50 py-3.5 px-5 text-xs font-bold focus:ring-2 focus:ring-primary-lime/20" 
                placeholder="Ex: 5" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Dia do Vencimento</label>
              <input 
                type="number" 
                min="1" 
                max="31"
                required 
                value={dueDay} 
                onChange={e => setDueDay(e.target.value)} 
                className="w-full rounded-2xl border-none bg-gray-50 py-3.5 px-5 text-xs font-bold focus:ring-2 focus:ring-primary-lime/20" 
                placeholder="Ex: 12" 
              />
            </div>
          </div>

          {/* Premium Style / Skins Selectors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estilo & Skin do Cartão</label>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-gray-400">Cor Personalizada:</span>
                <input 
                  type="color" 
                  value={color.startsWith("#") ? color : "#820ad1"} 
                  onChange={e => setColor(e.target.value)}
                  className="h-6 w-8 rounded cursor-pointer border-none p-0 bg-transparent"
                  title="Escolher Cor Personalizada"
                />
              </div>
            </div>

            {/* Quick Swatches for Custom Hex Colors */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {[
                { name: "Roxo Nubank", hex: "#820ad1" },
                { name: "Laranja Itaú", hex: "#ff6b00" },
                { name: "Laranja Inter", hex: "#f37021" },
                { name: "Vermelho Bradesco", hex: "#cc092f" },
                { name: "Azul Caixa", hex: "#005ca9" },
                { name: "Ouro BB", hex: "#0038a8" },
                { name: "Verde Esmeralda", hex: "#10b981" },
                { name: "Rosa Luxo", hex: "#ec4899" },
                { name: "Azul Elétrico", hex: "#2563eb" },
                { name: "Obsidian Black", hex: "#111827" },
              ].map(swatch => (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => setColor(swatch.hex)}
                  style={{ backgroundColor: swatch.hex }}
                  className={cn(
                    "h-6 w-6 rounded-full shrink-0 border-2 transition-all cursor-pointer shadow-sm",
                    color === swatch.hex ? "border-white ring-2 ring-primary-dark scale-110" : "border-white/40 opacity-85 hover:opacity-100"
                  )}
                  title={swatch.name}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar p-1">
              <button
                type="button"
                onClick={() => {
                  const defaultB = ALL_BANKS.find(b => b.name === bank);
                  setColor(defaultB?.color || "#820ad1");
                }}
                className={cn(
                  "p-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm",
                  !PREMIUM_THEMES.some(t => t.id === color)
                    ? "bg-white text-slate-900 border-primary-dark shadow-md ring-2 ring-primary-dark/20" 
                    : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"
                )}
              >
                <div className="h-4 w-6 rounded bg-gradient-to-r from-gray-700 to-gray-900 shadow-inner flex items-center justify-start px-0.5">
                  <div className="h-1.5 w-2 rounded-xs bg-amber-400" />
                </div>
                <span>Cor do Banco</span>
              </button>
              
              {PREMIUM_THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setColor(theme.id)}
                  className={cn(
                    "p-2.5 rounded-2xl border-2 text-[9px] font-black uppercase tracking-wider transition-all text-left flex items-center gap-2.5 cursor-pointer shadow-sm relative overflow-hidden group",
                    color === theme.id 
                      ? "bg-white text-slate-900 border-primary-dark shadow-md ring-2 ring-primary-dark/20" 
                      : "bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100"
                  )}
                >
                  <div className={cn("h-6 w-9 rounded-lg shrink-0 bg-gradient-to-br shadow-inner border border-white/20 relative overflow-hidden flex items-end p-0.5", theme.gradient)}>
                    <div className={cn("h-1.5 w-2 rounded-xs", theme.chip === "silver" ? "bg-slate-300" : "bg-amber-400")} />
                  </div>
                  <span className="truncate text-[9px] font-bold">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand/Bandeira Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Bandeira do Cartão</label>
            <div className="grid grid-cols-3 gap-2">
              {["Visa", "Mastercard", "Elo", "Amex", "Hipercard", "Outros"].map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBrand(b)}
                  className={cn(
                    "p-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    brand === b 
                      ? "bg-white text-slate-900 border-primary-dark shadow-lg shadow-primary-dark/10" 
                      : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold text-center">
              {errorMessage}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-white py-4.5 font-black text-slate-900 uppercase tracking-[0.2em] italic shadow-xl shadow-primary-dark/10 hover:bg-white/95 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Salvando..." : (initialData ? "Salvar Alterações" : "Ativar Cartão Profissional")}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// DETAILED CARD OVERVIEW & BILLING TIMELINE
function CardDetails({ card, onClose, transactions, onPayInvoice }: { card: Card, onClose: () => void, transactions: Transaction[], onPayInvoice: (invoice: Invoice) => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isAiInsightOpen, setIsAiInsightOpen] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, "invoices"),
      where("userId", "==", uid),
      where("cardId", "==", card.id),
      orderBy("year", "desc"),
      orderBy("month", "desc")
    );

    return onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
      
      await runTransaction(db, async (transaction) => {
        for (const inv of data) {
          await checkInvoiceStatus(inv, card.closingDay, card.dueDay, transaction);
        }
      });
      
      setInvoices(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "invoices");
      setLoading(false);
    });
  }, [card.id]);

  const cardTransactions = transactions.filter(t => t.cardId === card.id);
  
  const now = new Date();
  const currentPeriod = getBillingPeriod(now, card.closingDay);
  const currentInvoice = invoices.find(inv => inv.month === currentPeriod.month && inv.year === currentPeriod.year);

  const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);
  const invoiceItems = selectedInvoice?.items || [];
  const invoiceTransactions = cardTransactions.filter(t => invoiceItems.includes(t.id));

  // Premium Background Styling
  const cardStyle = getCardStyle(card.color);

  // Compute Billing Cycle Positioning for Today
  const currentDayOfMonth = now.getDate();
  const cyclePhase = useMemo(() => {
    // Determine billing stage (Compras vs Fechamento vs Vencimento)
    let phase = "compras";
    let text = "Período de Compras Aberto";
    let desc = "Todas as compras feitas hoje serão lançadas na fatura aberta.";
    
    if (currentDayOfMonth === card.closingDay) {
      phase = "fechamento";
      text = "Hoje a Fatura Fecha!";
      desc = "As compras feitas a partir de hoje caem no próximo mês.";
    } else if (currentDayOfMonth > card.closingDay && currentDayOfMonth <= card.dueDay) {
      phase = "vencimento";
      text = "Aguardando Pagamento";
      desc = "Fatura fechada. Efetue o pagamento até o dia de vencimento para evitar juros.";
    }
    return { phase, text, desc };
  }, [currentDayOfMonth, card.closingDay, card.dueDay]);

  // Contextual Smart AI Advice
  const aiInsightAdvice = useMemo(() => {
    const usagePct = (card.usedLimit / card.limit) * 100;
    if (usagePct > 80) {
      return {
        title: "⚠️ Risco de Endividamento Alto",
        content: "Seu limite está criticamente comprometido. Recomendamos pagar parcialmente a fatura hoje para liberar espaço de segurança e evitar impacto negativo no score.",
        color: "rose"
      };
    }
    if (cyclePhase.phase === "fechamento" || getBestDayStatus(card.closingDay).isBest) {
      return {
        title: "⚡ Aproveite o Melhor Dia para Compras",
        content: "Sua fatura fechou hoje! Suas próximas compras serão cobradas apenas daqui a 30-40 dias. Excelente momento para grandes gastos programados.",
        color: "lime"
      };
    }
    return {
      title: "✨ Crédito sob Controle",
      content: "Você está fazendo um excelente uso do limite deste cartão. Mantenha os pagamentos em dia para expandir seu limite bancário gradualmente.",
      color: "emerald"
    };
  }, [card.usedLimit, card.limit, cyclePhase.phase, card.closingDay]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md px-4 pb-8">
      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        className="w-full max-w-2xl rounded-[40px] bg-gray-50 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col max-h-[95vh]" 
        onClick={e => e.stopPropagation()}
      >
        {/* PREMIUM CARD GLOSS TOP HEADER */}
        <div 
          className={cn(
            "p-8 text-white relative overflow-hidden border-b border-white/10",
            cardStyle.className
          )}
          style={cardStyle.style}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-40 pointer-events-none" />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md">
                  <BankIcon bankName={card.bank} className="h-10 w-10 shadow-md" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter italic uppercase leading-none">{card.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mt-1">{card.brand} • Final ****</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAiInsightOpen(!isAiInsightOpen)}
                  className="h-10 px-4 rounded-full bg-emerald-500 text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  <Sparkles size={14} className={isAiInsightOpen ? "animate-spin" : ""} />
                  Análise IA
                </button>
                <button onClick={onClose} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Limite Disponível</p>
                <p className="text-3xl font-black tracking-tighter italic text-emerald-400">
                  {formatCurrency(card.availableLimit ?? (card.limit - card.usedLimit))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Fatura Atual (Em Aberto)</p>
                <p className="text-3xl font-black tracking-tighter italic text-white">
                  {formatCurrency(currentInvoice?.totalValue || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CONTAINER CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-50">
          
          {/* AI INSIGHT DIAGNOSTIC SCREEN */}
          <AnimatePresence>
            {isAiInsightOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={cn(
                  "p-5 rounded-3xl border flex gap-4 shadow-sm",
                  aiInsightAdvice.color === "rose" ? "bg-rose-50/50 border-rose-100 text-rose-950" :
                  aiInsightAdvice.color === "lime" ? "bg-emerald-50 border-primary-lime/20 text-zinc-950" :
                  "bg-emerald-50/50 border-emerald-100 text-emerald-950"
                )}>
                  <div className="shrink-0">
                    <Sparkles size={24} className={cn(
                      aiInsightAdvice.color === "rose" ? "text-rose-500" :
                      aiInsightAdvice.color === "lime" ? "text-zinc-900" :
                      "text-emerald-500"
                    )} />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-black uppercase tracking-wider">{aiInsightAdvice.title}</h5>
                    <p className="text-[11px] leading-relaxed font-medium opacity-90">{aiInsightAdvice.content}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DYNAMIC TIMELINE VISUALIZER OF THE BILLING CYCLE */}
          <section className="p-5 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Linha do Tempo da Fatura</h4>
              <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                Ciclo Mensal
              </span>
            </div>

            {/* Stepper Grid Layout */}
            <div className="relative pt-6 pb-2 px-1">
              {/* Stepper background track line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 rounded-full z-0" />
              
              {/* Stepper progress representation based on current day */}
              <div 
                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary-lime to-indigo-600 -translate-y-1/2 rounded-full z-0 transition-all duration-1000" 
                style={{ 
                  width: cyclePhase.phase === "compras" ? "30%" : 
                         cyclePhase.phase === "fechamento" ? "65%" : "100%" 
                }}
              />

              <div className="relative z-10 flex justify-between">
                {/* Step 1 */}
                <div className="flex flex-col items-center space-y-2 max-w-[80px] text-center">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center border-2 shadow-sm transition-all",
                    cyclePhase.phase === "compras" ? "bg-emerald-600 text-white border-emerald-600 scale-110" : "bg-white text-gray-300 border-gray-200"
                  )}>
                    <CreditCard size={14} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 leading-none">Compras</span>
                  <span className="text-[8px] text-gray-400 font-bold leading-none">Ciclo Aberto</span>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center space-y-2 max-w-[80px] text-center">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center border-2 shadow-sm transition-all",
                    cyclePhase.phase === "fechamento" ? "bg-amber-400 text-slate-900 border-amber-400 scale-110" : 
                    cyclePhase.phase === "vencimento" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-300 border-gray-200"
                  )}>
                    <Clock size={14} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 leading-none">Fechamento</span>
                  <span className="text-[8px] text-gray-400 font-bold leading-none">Dia {card.closingDay}</span>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center space-y-2 max-w-[80px] text-center">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center border-2 shadow-sm transition-all",
                    cyclePhase.phase === "vencimento" ? "bg-indigo-600 text-white border-indigo-600 scale-110 animate-pulse" : "bg-white text-gray-300 border-gray-200"
                  )}>
                    <Calendar size={14} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 leading-none">Vencimento</span>
                  <span className="text-[8px] text-gray-400 font-bold leading-none">Dia {card.dueDay}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-left border border-gray-100">
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-tight">{cyclePhase.text}</h5>
              <p className="text-[10px] text-gray-400 font-medium leading-relaxed mt-1">{cyclePhase.desc}</p>
            </div>
          </section>

          {/* RECENT INVOICES */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Histórico de Faturas</h4>
              <Calendar size={14} className="text-gray-300" />
            </div>
            
            <div className="space-y-3">
              {invoices.length === 0 && !loading && (
                <div className="p-8 text-center rounded-3xl bg-white border border-dashed border-gray-200">
                  <p className="text-sm font-bold text-gray-400">Nenhuma fatura encontrada.</p>
                </div>
              )}
              
              {invoices.map(invoice => (
                <div 
                  key={invoice.id} 
                  onClick={() => setSelectedInvoiceId(selectedInvoiceId === invoice.id ? null : invoice.id)}
                  className={cn(
                    "p-5 rounded-3xl bg-white border border-gray-100 shadow-sm flex flex-col group hover:border-primary-lime/35 transition-all cursor-pointer",
                    selectedInvoiceId === invoice.id && "ring-2 ring-primary-lime/40 border-primary-lime/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner",
                        invoice.status === "paid" ? "bg-emerald-50 text-emerald-500" : 
                        invoice.status === "overdue" ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500"
                      )}>
                        {invoice.status === "paid" ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                          {formatBillingPeriod(invoice.month, invoice.year)}
                        </h5>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Vencimento: {new Date(invoice.dueDate).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-900 tracking-tighter">
                        {formatCurrency(invoice.totalValue)}
                      </div>
                      <div className={cn(
                        "text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full inline-block mt-0.5",
                        invoice.status === "paid" ? "bg-emerald-50 text-emerald-600" : 
                        invoice.status === "overdue" ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-600"
                      )}>
                        {invoice.status === "open" ? "Aberta" : 
                         invoice.status === "closed" ? "Fechada" :
                         invoice.status === "paid" ? "Paga" : 
                         invoice.status === "overdue" ? "Atrasada" : "Parcial"}
                      </div>
                    </div>
                  </div>

                  {selectedInvoiceId === invoice.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-6 pt-6 border-t border-gray-100 space-y-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h6 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Lançamentos da Fatura</h6>
                        {invoice.status !== "paid" && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onPayInvoice(invoice);
                            }}
                            className="bg-white text-slate-900 hover:bg-white/95 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-colors shadow"
                          >
                            Quitar Fatura
                          </button>
                        )}
                      </div>
                      
                      {invoiceTransactions.length === 0 ? (
                        <p className="text-[10px] text-gray-400 italic text-center py-4">Nenhum lançamento vinculado nesta fatura.</p>
                      ) : (
                        <div className="space-y-2">
                          {invoiceTransactions.map(t => (
                            <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 border border-gray-100/50">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-gray-400 shadow-sm border border-gray-100">
                                  <CreditCard size={14} />
                                </div>
                                <div>
                                  <p className="text-[11px] font-black text-slate-900">{t.establishment || t.category}</p>
                                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                                    {new Date(t.date).toLocaleDateString("pt-BR")}
                                    {t.installment && ` • Parcela ${t.currentInstallment}/${t.totalInstallments}`}
                                  </p>
                                </div>
                              </div>
                              <div className="text-xs font-black text-slate-900">
                                -{formatCurrency(t.value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ALL LANÇAMENTOS HISTORY FOR THIS CARD */}
          {!selectedInvoiceId && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Todos os Lançamentos</h4>
                <ArrowRight size={14} className="text-gray-300" />
              </div>

              <div className="space-y-2">
                {cardTransactions.length === 0 ? (
                  <div className="p-8 text-center rounded-3xl bg-white border border-gray-100 text-xs font-bold text-gray-400">
                    Nenhum lançamento registrado neste cartão.
                  </div>
                ) : (
                  cardTransactions.slice(0, 10).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{t.establishment || t.category}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {new Date(t.date).toLocaleDateString("pt-BR")}
                            {t.installment && ` • Parcela ${t.currentInstallment}/${t.totalInstallments}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-black text-slate-900">
                        -{formatCurrency(t.value)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// INVOICE PAYMENT MECHANISM WITH SELECTED ACCOUNT OR BANK BALANCE
function PayInvoiceModal({ invoice, card, accounts, onClose }: { invoice: Invoice, card: Card, accounts: Account[], onClose: () => void }) {
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!selectedAccountId) return;
    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, "accounts", selectedAccountId);
        const cardRef = doc(db, "cards", card.id);
        const invoiceRef = doc(db, "invoices", invoice.id);
        
        const accountSnap = await transaction.get(accountRef);
        if (!accountSnap.exists()) throw new Error("Conta bancária não encontrada");
        
        const currentBalance = accountSnap.data().balance;
        if (currentBalance < invoice.totalValue) throw new Error("Saldo insuficiente nesta conta para pagar a fatura.");

        // Update Card Limits
        const currentUsed = card.usedLimit;
        const newUsed = Math.max(0, currentUsed - invoice.totalValue);
        transaction.update(cardRef, { 
          usedLimit: newUsed,
          availableLimit: card.limit - newUsed
        });

        // Update Invoice status
        transaction.update(invoiceRef, { 
          status: "paid",
          paidValue: invoice.totalValue
        });

        // Register the payment expense transaction
        const paymentRef = doc(collection(db, "transactions"));
        transaction.set(paymentRef, {
          userId: auth.currentUser?.uid,
          accountId: selectedAccountId,
          cardId: card.id,
          value: invoice.totalValue,
          type: "expense",
          category: "Pagamento de Fatura",
          establishment: `Pagamento Fatura ${card.name}`,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      });

      // Recalculate account balance
      await contas.recalcularSaldo(selectedAccountId);

      onClose();
    } catch (error: any) {
      ((window as any).mostrarMensagem || window.alert)(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-[40px] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="h-20 w-20 rounded-3xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">Pagar Fatura</h3>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            {formatBillingPeriod(invoice.month, invoice.year)} • {card.name}
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-[30px] bg-gray-50 border border-gray-100 text-center shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Valor do Pagamento</p>
            <p className="text-3xl font-black tracking-tighter italic text-slate-900">{formatCurrency(invoice.totalValue)}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Selecione Conta para Débito</label>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Escolher conta de pagamento...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Saldo: {formatCurrency(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handlePay}
              disabled={loading || !selectedAccountId}
              className="flex-1 py-4 rounded-2xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-white/95 transition-all shadow-lg shadow-primary-dark/20 disabled:opacity-50"
            >
              {loading ? "Processando..." : "Confirmar Pagamento"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
