import React, { useState, useMemo } from "react";
import { useInvestments } from "../context/InvestmentContext";
import { useContas } from "../context/ContasContext";
import { Investment, UserProfile, InvestmentContribution } from "../types";
import {
  TrendingUp,
  Plus,
  ArrowUpRight,
  Zap,
  BarChart3,
  LineChart as LineChartIcon,
  RefreshCw,
  Trash2,
  X,
  PlusCircle,
  MinusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart as RePieChart,
  Pie
} from "recharts";
import { formatCurrency, cn, parseCurrencyInput } from "../lib/utils";

interface InvestmentsProps {
  userProfile: UserProfile;
}

export const Investments: React.FC<InvestmentsProps> = () => {
  const {
    investments,
    contributions,
    loading,
    addInvestment,
    deleteInvestment,
    addContribution,
    calculateInvestmentYield
  } = useInvestments();

  const [isAdding, setIsAdding] = useState(false);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("highest");

  const activeInvestments = useMemo(
    () => investments.filter(i => i.status === "active"),
    [investments]
  );

  const selectedInvestment = useMemo(
    () => activeInvestments.find(i => i.id === selectedInvestmentId) || null,
    [activeInvestments, selectedInvestmentId]
  );

  const filteredInvestments = useMemo(() => {
    let filtered = activeInvestments;

    if (searchTerm) {
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter(i => i.type === filterType);
    }

    return [...filtered].sort((a, b) => {
      const aYields = calculateInvestmentYield(a);
      const bYields = calculateInvestmentYield(b);

      switch (sortBy) {
        case "highest":
          return bYields.currentValue - aYields.currentValue;
        case "lowest":
          return aYields.currentValue - bYields.currentValue;
        case "newest":
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case "oldest":
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case "highest_yield": {
          const aRatio = a.investedValue > 0 ? aYields.totalYield / a.investedValue : 0;
          const bRatio = b.investedValue > 0 ? bYields.totalYield / b.investedValue : 0;
          return bRatio - aRatio;
        }
        default:
          return 0;
      }
    });
  }, [activeInvestments, searchTerm, filterType, sortBy, calculateInvestmentYield]);

  const totals = useMemo(() => {
    let totalInvested = 0;
    let totalCurrent = 0;
    let totalMonthlyGain = 0;

    activeInvestments.forEach(inv => {
      const yields = calculateInvestmentYield(inv);
      totalInvested += inv.investedValue;
      totalCurrent += yields.currentValue;
      totalMonthlyGain += yields.monthlyGain;
    });

    return {
      totalInvested,
      totalCurrent,
      totalYield: totalCurrent - totalInvested,
      yieldPercentage: totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0,
      totalMonthlyGain
    };
  }, [activeInvestments, calculateInvestmentYield]);

  const distributionData = useMemo(() => {
    const types: { [key: string]: number } = {};
    activeInvestments.forEach(inv => {
      const yields = calculateInvestmentYield(inv);
      types[inv.type] = (types[inv.type] || 0) + yields.currentValue;
    });

    return Object.entries(types).map(([name, value]) => ({
      name: name.toUpperCase(),
      value
    }));
  }, [activeInvestments, calculateInvestmentYield]);

  const aiInsight = useMemo(() => {
    if (activeInvestments.length === 0) {
      return "Sua jornada de investimentos começa agora. Adicione seu primeiro ativo para receber insights personalizados da nossa IA.";
    }

    if (distributionData.length === 1) {
      return `Sua carteira está 100% alocada em ${distributionData[0].name}. Considere diversificar em outras classes de ativos para reduzir riscos e potencializar retornos a longo prazo.`;
    }

    const cdbOrPoupanca = distributionData.find(d => d.name === "CDB" || d.name === "POUPANCA");
    if (cdbOrPoupanca && totals.totalCurrent > 0 && cdbOrPoupanca.value / totals.totalCurrent > 0.8) {
      return "Sua carteira tem forte concentração em ativos conservadores. Uma pequena alocação (5-10%) em Renda Variável poderia aumentar seu rendimento anual médio sem adicionar risco excessivo.";
    }

    const acoes = distributionData.find(d => d.name === "ACOES" || d.name === "CRIPTO");
    if (acoes && totals.totalCurrent > 0 && acoes.value / totals.totalCurrent > 0.6) {
      return "Sua carteira apresenta perfil agressivo. Certifique-se de manter uma reserva de emergência sólida em ativos de liquidez imediata para equilibrar o risco das oscilações de mercado.";
    }

    return "Sua carteira apresenta uma diversificação saudável. Continue mantendo aportes regulares para aproveitar os juros compostos e atingir suas metas mais rápido.";
  }, [distributionData, totals.totalCurrent, activeInvestments.length]);

  const COLORS = ["#059669", "#0F172A", "#F59E0B", "#0EA5E9", "#8B5CF6", "#10B981", "#64748B"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto px-4 md:px-0 mt-4">
      {/* Header Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-[32px] bg-white p-6 sm:p-8 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              Carteira de Investimentos
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 tabular-nums mt-1">
              {formatCurrency(totals.totalCurrent)}
            </h1>
            <p className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-2 tabular-nums">
              <span>{formatCurrency(totals.totalInvested)} investidos</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <ArrowUpRight size={14} />
                {totals.totalYield >= 0 ? "+" : ""}
                {formatCurrency(totals.totalYield)} ({totals.yieldPercentage.toFixed(2)}%)
              </span>
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 self-start md:self-center">
            <div className="rounded-2xl bg-gray-50 px-5 py-4 border border-gray-100 flex flex-col justify-center min-w-[140px]">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] block mb-1">
                Ganhos Mensais
              </span>
              <span className="text-xl font-black text-emerald-600 tracking-tight tabular-nums">
                {formatCurrency(totals.totalMonthlyGain)}
              </span>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-md hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus size={20} strokeWidth={2.5} />
              <span>Novo Ativo</span>
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
        {/* Investment List */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Meus Ativos</h2>
            <div className="flex items-center gap-2 text-gray-400">
              <BarChart3 size={18} />
              <LineChartIcon size={18} />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Pesquisar investimentos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-12 bg-white rounded-2xl pl-4 pr-10 text-sm font-medium border border-gray-200 focus:border-emerald-500 focus:outline-none transition-all placeholder:text-gray-400 text-slate-900 shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="h-12 bg-white border border-gray-200 rounded-2xl px-4 text-sm font-medium text-gray-700 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer shadow-sm sm:w-40"
            >
              <option value="all">Todos os tipos</option>
              <option value="cdb">CDB</option>
              <option value="acoes">Ações</option>
              <option value="cripto">Criptomoedas</option>
              <option value="poupanca">Poupança</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-12 bg-white border border-gray-200 rounded-2xl px-4 text-sm font-medium text-gray-700 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer shadow-sm sm:w-48"
            >
              <option value="highest">Maior valor</option>
              <option value="lowest">Menor valor</option>
              <option value="highest_yield">Maior rentabilidade</option>
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredInvestments.map(inv => {
              const yields = calculateInvestmentYield(inv);
              const pct = inv.investedValue > 0 ? (yields.totalYield / inv.investedValue) * 100 : 0;
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvestmentId(inv.id)}
                  className="group relative overflow-hidden bg-white p-6 rounded-[28px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-5 gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0",
                          inv.type === "acoes"
                            ? "bg-blue-600"
                            : ["cripto", "bitcoin", "ethereum", "tether", "bnb", "solana", "xrp", "usdc", "cardano", "avalanche", "dogecoin"].includes(inv.type)
                              ? "bg-amber-500"
                              : inv.type === "cdb"
                                ? "bg-emerald-600"
                                : "bg-slate-800"
                        )}
                      >
                        {inv.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-lg font-bold text-slate-900 tracking-tight truncate group-hover:text-emerald-600 transition-colors">
                          {inv.name}
                        </h4>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                          {inv.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
                        {formatCurrency(yields.currentValue)}
                      </p>
                      <div className="flex items-center justify-end gap-1 text-xs font-bold text-emerald-600 mt-0.5 tabular-nums">
                        <ArrowUpRight size={14} />
                        <span>
                          {pct >= 0 ? "+" : ""}
                          {pct.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] block mb-1">
                        Investido
                      </span>
                      <p className="text-sm font-bold text-gray-700 tabular-nums">
                        {formatCurrency(inv.investedValue)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] block mb-1">
                        Rendimento
                      </span>
                      <p className="text-sm font-bold text-emerald-600 tabular-nums">
                        {yields.totalYield >= 0 ? "+" : ""}
                        {formatCurrency(yields.totalYield)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] block mb-1">
                        Taxa Mensal
                      </span>
                      <p className="text-sm font-bold text-slate-900 tabular-nums">
                        {inv.monthlyYield === 0 ? "Manual" : `${inv.monthlyYield}%`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredInvestments.length === 0 && (
              <div className="py-20 text-center bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white shadow-sm border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  {activeInvestments.length === 0 ? <TrendingUp size={28} strokeWidth={1.5} /> : <BarChart3 size={28} strokeWidth={1.5} />}
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  {activeInvestments.length === 0 ? "Comece a investir hoje" : "Nenhum ativo encontrado"}
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2">
                  {activeInvestments.length === 0
                    ? "Cadastre seus investimentos e acompanhe seu patrimônio crescer com inteligência."
                    : "Nenhum investimento corresponde aos filtros atuais."}
                </p>
                {activeInvestments.length === 0 ? (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="mt-6 px-6 py-3 bg-emerald-600 text-white font-bold text-sm rounded-2xl shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
                  >
                    Adicionar Primeiro Ativo
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterType("all");
                      setSortBy("highest");
                    }}
                    className="mt-6 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-2xl shadow-sm hover:bg-gray-50 transition-all active:scale-95"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Analysis */}
        <div className="space-y-6 min-w-0">
          <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] min-w-0">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-5">Alocação de Ativos</h3>
            {distributionData.length > 0 ? (
              <>
                <div className="h-56 w-full min-w-0 relative">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <RePieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={76}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {distributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          borderRadius: "14px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-3">
                  {distributionData.map((item, index) => {
                    const percentage =
                      totals.totalCurrent > 0
                        ? ((item.value / totals.totalCurrent) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <div key={index} className="flex flex-col p-2 rounded-xl hover:bg-gray-50 transition-colors gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.12em]">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-slate-900 tabular-nums">
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 relative overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-sm text-slate-400">
                Cadastre um ativo para visualizar a distribuição da carteira.
              </div>
            )}
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[28px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
              <Zap size={22} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">Insight da IA</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              {aiInsight}
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAdding && (
          <InvestmentForm
            onClose={() => setIsAdding(false)}
            onSubmit={addInvestment}
          />
        )}

        {selectedInvestment && (
          <InvestmentDetail
            investment={selectedInvestment}
            contributions={contributions.filter(c => c.investmentId === selectedInvestment.id)}
            onClose={() => setSelectedInvestmentId(null)}
            onDelete={deleteInvestment}
            onAddContribution={(type, value, accountId) => {
              addContribution(
                {
                  investmentId: selectedInvestment.id,
                  type,
                  value,
                  date: new Date().toISOString()
                },
                accountId
              );
            }}
            calculateYield={calculateInvestmentYield}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function InvestmentForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: any }) {
  const { accounts } = useContas();
  const [name, setName] = useState("");
  const [mainType, setMainType] = useState<string>("cdb");
  const [cryptoCoin, setCryptoCoin] = useState<string>("bitcoin");
  const [value, setValue] = useState("");
  const [monthlyYield, setMonthlyYield] = useState("");
  const [isManualYield, setIsManualYield] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const numericVal = parseCurrencyInput(value);
    if (!name.trim() || numericVal <= 0 || (!isManualYield && !monthlyYield)) return;

    setIsSubmitting(true);
    try {
      const finalType = mainType === "cripto" ? cryptoCoin : mainType;
      const finalYield = isManualYield ? 0 : parseCurrencyInput(monthlyYield);

      await onSubmit(
        {
          name: name.trim(),
          type: finalType,
          investedValue: numericVal,
          monthlyYield: finalYield,
          annualYield: (Math.pow(1 + finalYield / 100, 12) - 1) * 100,
          startDate: new Date(startDate || Date.now()).toISOString()
        },
        accountId || undefined
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/45 backdrop-blur-sm p-3 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-[28px] shadow-2xl border border-gray-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Novo Investimento</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Fechar"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                Nome do Ativo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-2xl bg-gray-50 border border-gray-200 py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-900"
                placeholder="Ex: CDB Banco Inter, Ações PETR4"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                  Tipo
                </label>
                <select
                  value={mainType}
                  onChange={e => setMainType(e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 border border-gray-200 py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 cursor-pointer"
                >
                  <optgroup label="Tradicionais">
                    <option value="cdb">CDB</option>
                    <option value="poupanca">Poupança</option>
                    <option value="acoes">Ações</option>
                    <option value="fundo">Fundos</option>
                    <option value="tesouro">Tesouro Direto</option>
                    <option value="lci">LCI</option>
                    <option value="lca">LCA</option>
                  </optgroup>
                  <option value="cripto">Criptomoedas</option>
                  <optgroup label="Outros">
                    <option value="outro">Outro</option>
                  </optgroup>
                </select>
              </div>

              {mainType === "cripto" ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                    Moeda
                  </label>
                  <select
                    value={cryptoCoin}
                    onChange={e => setCryptoCoin(e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 border border-gray-200 py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 cursor-pointer"
                  >
                    <option value="bitcoin">Bitcoin (BTC)</option>
                    <option value="ethereum">Ethereum (ETH)</option>
                    <option value="tether">Tether (USDT)</option>
                    <option value="bnb">BNB</option>
                    <option value="solana">Solana (SOL)</option>
                    <option value="xrp">XRP</option>
                    <option value="usdc">USDC</option>
                    <option value="cardano">Cardano (ADA)</option>
                    <option value="avalanche">Avalanche (AVAX)</option>
                    <option value="dogecoin">Dogecoin (DOGE)</option>
                    <option value="cripto">Outra Criptomoeda</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full rounded-2xl bg-gray-50 border border-gray-200 py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-900"
                  />
                </div>
              )}
            </div>

            {mainType === "cripto" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                  Data de Início
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 border border-gray-200 py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-900"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                  Valor Inicial (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 border border-gray-200 py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 tabular-nums"
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                  Rentabilidade (% ao mês)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required={!isManualYield}
                  disabled={isManualYield}
                  value={isManualYield ? "" : monthlyYield}
                  onChange={e => setMonthlyYield(e.target.value)}
                  className="w-full rounded-2xl bg-gray-50 border border-gray-200 py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 disabled:opacity-50 tabular-nums"
                  placeholder={isManualYield ? "Controle manual" : "1,00%"}
                />
                <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isManualYield}
                    onChange={e => setIsManualYield(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-medium text-slate-700">Lucro manual</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                Conta de Origem (Opcional)
              </label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full rounded-2xl bg-gray-50 border border-gray-200 py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 cursor-pointer"
              >
                <option value="">Nenhuma (Apenas registrar saldo)</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} - Saldo: {formatCurrency(acc.balance || 0)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 shrink-0 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3.5 rounded-2xl border border-gray-200 bg-white text-slate-700 font-bold text-sm hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-emerald-600 py-3.5 px-6 font-bold text-sm text-white hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : "Criar Investimento"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function InvestmentDetail({
  investment,
  contributions,
  onClose,
  onDelete,
  onAddContribution,
  calculateYield
}: {
  investment: Investment;
  contributions: InvestmentContribution[];
  onClose: () => void;
  onDelete: any;
  onAddContribution: (type: "aporte" | "resgate" | "rendimento", value: number, accountId?: string) => void;
  calculateYield: any;
}) {
  const { accounts } = useContas();
  const [isAddingValue, setIsAddingValue] = useState(false);
  const [contributionType, setContributionType] = useState<"aporte" | "resgate" | "rendimento">("aporte");
  const [contributionValue, setContributionValue] = useState("");
  const [accountId, setAccountId] = useState("");
  const [projectionYears, setProjectionYears] = useState(5);
  const [monthlyAporte, setMonthlyAporte] = useState(500);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const yields = calculateYield(investment);

  const projectionData = useMemo(() => {
    const data = [];
    let currentVal = yields.currentValue;
    const monthlyRate = (investment.monthlyYield || 0) / 100;

    for (let i = 0; i <= projectionYears * 12; i++) {
      if (i > 0) {
        currentVal = (currentVal + monthlyAporte) * (1 + monthlyRate);
      }

      if (i % 6 === 0 || i === projectionYears * 12) {
        data.push({
          month: i,
          label: i === 0 ? "Hoje" : `${Math.floor(i / 12)}a ${i % 12}m`,
          value: currentVal
        });
      }
    }
    return data;
  }, [yields.currentValue, investment.monthlyYield, projectionYears, monthlyAporte]);

  const finalProjectionValue = projectionData[projectionData.length - 1]?.value ?? yields.currentValue;
  const projectedProfit = finalProjectionValue - yields.currentValue - monthlyAporte * projectionYears * 12;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/45 backdrop-blur-sm p-2 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-gray-50 rounded-[28px] sm:rounded-[36px] shadow-2xl overflow-hidden border border-gray-100"
          onClick={e => e.stopPropagation()}
        >
          {/* Pinned Header Bar */}
          <div className="bg-white px-5 sm:px-8 py-4 sm:py-6 border-b border-gray-100 shrink-0 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-black shrink-0",
                  investment.type === "acoes"
                    ? "bg-blue-600"
                    : ["cripto", "bitcoin", "ethereum", "tether", "bnb", "solana", "xrp", "usdc", "cardano", "avalanche", "dogecoin"].includes(investment.type)
                      ? "bg-amber-500"
                      : investment.type === "cdb"
                        ? "bg-emerald-600"
                        : "bg-slate-800"
                )}
              >
                {investment.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                  {investment.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="font-bold uppercase tracking-wider text-slate-600">{investment.type}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Iniciado em {format(parseISO(investment.startDate), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!confirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  title="Excluir investimento"
                >
                  <Trash2 size={20} strokeWidth={1.75} />
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(investment.id);
                      onClose();
                    }}
                    className="px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-lg"
                  >
                    Excluir
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 text-gray-500 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-all"
                aria-label="Fechar"
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
            {/* Summary + Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] block mb-1">
                  Valor Atual
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
                  {formatCurrency(yields.currentValue)}
                </h3>
                <div className="mt-1.5 flex items-center gap-1 text-sm font-bold text-emerald-600 tabular-nums">
                  <ArrowUpRight size={16} strokeWidth={2.5} />
                  <span>
                    {yields.totalYield >= 0 ? "+" : ""}
                    {formatCurrency(yields.totalYield)}
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] block mb-1">
                  Rendimento Mensal
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
                  {investment.monthlyYield === 0 ? "Manual" : `${investment.monthlyYield}%`}
                </h3>
                <p className="mt-1.5 text-sm font-bold text-emerald-600 tabular-nums">
                  {investment.monthlyYield === 0
                    ? "Lucro lançado manualmente"
                    : `~${formatCurrency(yields.monthlyGain)}/mês`}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center">
                <div className="grid grid-cols-3 gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setContributionType("aporte");
                      setIsAddingValue(true);
                    }}
                    className="py-3 px-2 bg-slate-900 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 hover:bg-slate-800 transition-all active:scale-95"
                  >
                    <PlusCircle size={17} strokeWidth={2.25} />
                    <span>Aporte</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContributionType("rendimento");
                      setIsAddingValue(true);
                    }}
                    className="py-3 px-2 bg-emerald-600 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 hover:bg-emerald-700 transition-all active:scale-95"
                  >
                    <TrendingUp size={17} strokeWidth={2.25} />
                    <span>Lucro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContributionType("resgate");
                      setIsAddingValue(true);
                    }}
                    className="py-3 px-2 bg-white border border-gray-200 text-slate-800 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 hover:bg-gray-50 transition-all active:scale-95"
                  >
                    <MinusCircle size={17} strokeWidth={2.25} />
                    <span>Resgate</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Projection Section */}
            <div className="bg-white p-5 sm:p-7 rounded-[28px] border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Projeção de Crescimento
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">
                    Simule o futuro do seu investimento com aportes mensais
                  </p>
                </div>
                <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 self-start sm:self-auto">
                  {[1, 2, 5, 10].map(y => (
                    <button
                      type="button"
                      key={y}
                      onClick={() => setProjectionYears(y)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                        projectionYears === y
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-gray-500 hover:text-slate-900"
                      )}
                    >
                      {y} {y === 1 ? "ano" : "anos"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-w-0 items-center">
                <div className="md:col-span-1 space-y-4 min-w-0">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">
                      Aporte Mensal
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                        R$
                      </span>
                      <input
                        type="number"
                        value={monthlyAporte}
                        onChange={e => setMonthlyAporte(parseFloat(e.target.value) || 0)}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] block mb-1">
                      Valor Final Estimado
                    </span>
                    <p className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">
                      {formatCurrency(finalProjectionValue)}
                    </p>
                    <p className="text-xs font-bold text-emerald-600 mt-1 tabular-nums">
                      Lucro de {formatCurrency(projectedProfit)}
                    </p>
                  </div>
                </div>

                <div className="md:col-span-3 h-52 sm:h-64 w-full min-w-0 overflow-hidden relative">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={projectionData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 600, fill: "#9ca3af" }}
                        dy={8}
                      />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Valor Estimado"]}
                        contentStyle={{
                          borderRadius: "14px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          padding: "10px 12px"
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* History Section */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 px-1">
                Histórico de Movimentações
              </h3>
              <div className="space-y-2.5">
                {contributions.length > 0 ? (
                  contributions.map(c => (
                    <div
                      key={c.id}
                      className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            c.type === "aporte"
                              ? "bg-emerald-50 text-emerald-600"
                              : c.type === "resgate"
                                ? "bg-rose-50 text-rose-600"
                                : "bg-blue-50 text-blue-600"
                          )}
                        >
                          {c.type === "aporte" ? (
                            <PlusCircle size={18} strokeWidth={2} />
                          ) : c.type === "resgate" ? (
                            <MinusCircle size={18} strokeWidth={2} />
                          ) : (
                            <TrendingUp size={18} strokeWidth={2} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 tracking-tight">
                            {c.type === "rendimento"
                              ? "Lucro manual"
                              : c.type === "aporte"
                                ? "Aporte"
                                : "Resgate"}
                          </p>
                          <p className="text-[11px] text-gray-500 font-medium">
                            {format(parseISO(c.date), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <p
                        className={cn(
                          "font-bold tracking-tight text-base tabular-nums",
                          c.type === "aporte"
                            ? "text-emerald-600"
                            : c.type === "resgate"
                              ? "text-rose-600"
                              : "text-blue-600"
                        )}
                      >
                        {c.type === "resgate" ? "-" : "+"}
                        {formatCurrency(c.value)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Nenhuma movimentação registrada.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add Contribution / Lucro Manual / Resgate Sub-Modal rendered OUTSIDE transformed motion.div */}
      <AnimatePresence>
        {isAddingValue && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4"
            onClick={() => setIsAddingValue(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-sm max-h-[85vh] overflow-y-auto bg-white rounded-[28px] p-6 shadow-2xl border border-gray-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-lg font-bold text-slate-900 tracking-tight">
                  {contributionType === "aporte"
                    ? "Realizar Aporte"
                    : contributionType === "resgate"
                      ? "Realizar Resgate"
                      : "Adicionar Lucro Manual"}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingValue(false)}
                  className="p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={contributionValue}
                    onChange={e => setContributionValue(e.target.value)}
                    className="w-full py-3.5 px-4 bg-gray-50 border border-gray-200 rounded-2xl text-lg font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 tabular-nums"
                    placeholder="0,00"
                  />
                </div>

                {contributionType !== "rendimento" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.08em]">
                      {contributionType === "aporte"
                        ? "Debitar da Conta (Opcional)"
                        : "Creditar na Conta (Opcional)"}
                    </label>
                    <select
                      value={accountId}
                      onChange={e => setAccountId(e.target.value)}
                      className="w-full rounded-2xl bg-gray-50 border border-gray-200 py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 cursor-pointer"
                    >
                      <option value="">Nenhuma (Apenas registrar saldo)</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} - Saldo: {formatCurrency(acc.balance || 0)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingValue(false)}
                    className="px-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-slate-700 font-bold text-sm hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const numericVal = parseCurrencyInput(contributionValue);
                      if (numericVal > 0) {
                        onAddContribution(contributionType, numericVal, accountId || undefined);
                        setIsAddingValue(false);
                        setContributionValue("");
                        setAccountId("");
                      }
                    }}
                    disabled={!contributionValue || parseCurrencyInput(contributionValue) <= 0}
                    className={cn(
                      "flex-1 py-3.5 px-4 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98] shadow-sm disabled:opacity-40",
                      contributionType === "aporte"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : contributionType === "rendimento"
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-rose-600 hover:bg-rose-700"
                    )}
                  >
                    {contributionType === "aporte"
                      ? "Confirmar Aporte"
                      : contributionType === "rendimento"
                        ? "Confirmar Lucro"
                        : "Confirmar Resgate"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
