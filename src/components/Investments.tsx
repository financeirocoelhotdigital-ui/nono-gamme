import React, { useState, useMemo, useEffect } from "react";
import { useInvestments } from "../context/InvestmentContext";
import { useContas } from "../context/ContasContext";
import { useMetas } from "../context/MetasContext";
import { Investment, InvestmentType, UserProfile, InvestmentContribution } from "../types";
import { 
  TrendingUp, 
  Plus, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Calendar, 
  Target, 
  ChevronRight,
  Info,
  Zap,
  BarChart3,
  LineChart as LineChartIcon,
  RefreshCw,
  Trash2,
  X,
  PlusCircle,
  MinusCircle,
  TrendingDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, parseISO, isAfter, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  LineChart, 
  Line, 
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
import { formatCurrency, cn } from "../lib/utils";

interface InvestmentsProps {
  userProfile: UserProfile;
}

export const Investments: React.FC<InvestmentsProps> = ({ userProfile }) => {
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
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [isAddingContribution, setIsAddingContribution] = useState(false);
  const [contributionType, setContributionType] = useState<"aporte" | "resgate" | "rendimento">("aporte");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("highest");

  const activeInvestments = investments.filter(i => i.status === "active");
  
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

    return filtered.sort((a, b) => {
      const aYields = calculateInvestmentYield(a);
      const bYields = calculateInvestmentYield(b);
      
      switch (sortBy) {
        case "highest": return bYields.currentValue - aYields.currentValue;
        case "lowest": return aYields.currentValue - bYields.currentValue;
        case "newest": return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case "oldest": return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case "highest_yield": return (bYields.totalYield / b.investedValue) - (aYields.totalYield / a.investedValue);
        default: return 0;
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

  const COLORS = ["#D4F06D", "#1A1A1A", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary-green" size={32} />
      </div>
    );
  }

  const aiInsight = useMemo(() => {
    if (activeInvestments.length === 0) {
      return "Sua jornada de investimentos começa agora. Adicione seu primeiro ativo para receber insights personalizados da nossa IA.";
    }

    if (distributionData.length === 1) {
      return `Sua carteira está 100% alocada em ${distributionData[0].name}. Considere diversificar em outras classes de ativos para reduzir riscos e potencializar retornos a longo prazo.`;
    }

    const cdbOrPoupanca = distributionData.find(d => d.name === "CDB" || d.name === "POUPANCA");
    if (cdbOrPoupanca && (cdbOrPoupanca.value / totals.totalCurrent) > 0.8) {
      return "Sua carteira tem forte concentração em ativos conservadores. Uma pequena alocação (5-10%) em Renda Variável poderia aumentar seu rendimento anual médio sem adicionar risco excessivo.";
    }

    const acoes = distributionData.find(d => d.name === "ACOES" || d.name === "CRIPTO");
    if (acoes && (acoes.value / totals.totalCurrent) > 0.6) {
      return "Sua carteira apresenta perfil agressivo. Certifique-se de manter uma reserva de emergência sólida em ativos de liquidez imediata para equilibrar o risco das oscilações de mercado.";
    }

    return "Sua carteira apresenta uma diversificação saudável. Continue mantendo aportes regulares para aproveitar os juros compostos e atingir suas metas mais rápido.";
  }, [distributionData, totals.totalCurrent, activeInvestments.length]);

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto px-4 md:px-0 mt-4">
      {/* Header Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[36px] bg-white p-8 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-50 rounded-full blur-[80px] -mr-[150px] -mt-[150px] pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[60px] -ml-[100px] -mb-[100px] pointer-events-none mix-blend-screen"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 bg-white/5 border border-gray-50 px-3 py-1 rounded-full backdrop-blur-sm w-max">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Carteira de Investimentos</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 flex items-baseline gap-2 mt-2">
              {formatCurrency(totals.totalCurrent)}
            </h1>
            <p className="text-[11px] text-gray-400 font-medium flex items-center gap-2">
              <span>{formatCurrency(totals.totalInvested)} investidos</span>
              <span className="h-1 w-1 rounded-full bg-gray-600" />
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ArrowUpRight size={12} />
                +{formatCurrency(totals.totalYield)} ({totals.yieldPercentage.toFixed(2)}%)
              </span>
            </p>
          </div>

          <div className="flex gap-4 self-start md:self-center">
            <div className="rounded-[24px] bg-white/[0.02] backdrop-blur-md p-5 border border-gray-50 flex flex-col justify-center min-w-[140px] relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-1">Ganhos Mensais</span>
              <span className="text-xl font-black text-emerald-400 tracking-tight">{formatCurrency(totals.totalMonthlyGain)}</span>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 px-6 py-5 bg-emerald-600 text-white rounded-[24px] font-bold shadow-lg hover:shadow-xl hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Plus size={20} strokeWidth={2.5} />
              <span className="whitespace-nowrap">Novo Ativo</span>
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
        {/* Investment List */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Meus Ativos</h2>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-all">
                <BarChart3 size={20} />
              </button>
              <button className="p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-all">
                <LineChartIcon size={20} />
              </button>
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
                className="w-full h-12 bg-white rounded-[16px] pl-4 pr-10 text-sm font-medium border border-gray-200 focus:border-emerald-500 focus:outline-none transition-all placeholder:text-gray-400 text-slate-900 shadow-sm"
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
              className="h-12 bg-white border border-gray-200 rounded-[16px] px-4 text-sm font-medium text-gray-700 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer shadow-sm sm:w-40"
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
              className="h-12 bg-white border border-gray-200 rounded-[16px] px-4 text-sm font-medium text-gray-700 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer shadow-sm sm:w-48"
            >
              <option value="highest">Maior valor</option>
              <option value="lowest">Menor valor</option>
              <option value="highest_yield">Maior rentabilidade</option>
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredInvestments.map((inv) => {
              const yields = calculateInvestmentYield(inv);
              return (
                <motion.div 
                  key={inv.id}
                  layoutId={inv.id}
                  onClick={() => setSelectedInvestment(inv)}
                  className="group relative overflow-hidden bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-[20px] flex items-center justify-center text-slate-900 font-black text-xl shadow-sm",
                        inv.type === "acoes" ? "bg-blue-500" : 
                        ["cripto", "bitcoin", "ethereum", "tether", "bnb", "solana", "xrp", "usdc", "cardano", "avalanche", "dogecoin"].includes(inv.type) ? "bg-orange-500" : 
                        inv.type === "cdb" ? "bg-emerald-500" : "bg-gray-800"
                      )}>
                        {inv.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">{inv.name}</h4>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{inv.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(yields.currentValue)}</p>
                      <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-emerald-500 mt-1">
                        <ArrowUpRight size={14} />
                        <span>+{((yields.totalYield / inv.investedValue) * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 relative z-10">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] block mb-1">Investido</span>
                      <p className="text-sm font-bold text-gray-700">{formatCurrency(inv.investedValue)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] block mb-1">Rendimento</span>
                      <p className="text-sm font-bold text-emerald-500">+{formatCurrency(yields.totalYield)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] block mb-1">Taxa Mensal</span>
                      <p className="text-sm font-bold text-slate-900">{inv.monthlyYield}%</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {filteredInvestments.length === 0 && (
              <div className="py-24 text-center bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-white shadow-sm border border-gray-100 text-gray-400 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                  {activeInvestments.length === 0 ? <TrendingUp size={32} strokeWidth={1.5} /> : <BarChart3 size={32} strokeWidth={1.5} />}
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
                    className="mt-8 px-6 py-3.5 bg-white text-emerald-600 font-bold text-sm tracking-wide rounded-[16px] shadow-sm hover:shadow-md transition-all active:scale-95"
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
                    className="mt-8 px-6 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm tracking-wide rounded-[16px] shadow-sm hover:bg-gray-50 transition-all active:scale-95"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Analysis */}
        <div className="space-y-6 min-w-0 overflow-hidden">
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] min-w-0 overflow-hidden">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-6">Alocação de Ativos</h3>
            <div className="h-64 w-full min-w-0 overflow-hidden relative">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {distributionData.map((item, index) => {
                const percentage = ((item.value / totals.totalCurrent) * 100).toFixed(1);
                return (
                  <div key={index} className="flex flex-col p-2 rounded-xl hover:bg-gray-50 transition-colors gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em]">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 tracking-tight">
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 ml-6 relative overflow-hidden" style={{ width: 'calc(100% - 24px)' }}>
                      <div 
                        className="h-full rounded-full absolute left-0 top-0 transition-all duration-1000" 
                        style={{ width: `${percentage}%`, backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-50 rounded-full blur-[40px] -mr-[80px] -mt-[80px] pointer-events-none mix-blend-screen transition-opacity group-hover:opacity-100 opacity-50 duration-500"></div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-[16px] bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 border border-primary-lime/20">
                <Zap size={24} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">Insight da IA</h3>
              <p className="text-[13px] text-gray-400 font-medium leading-relaxed mb-6">
                {aiInsight}
              </p>
              <button className="w-full py-3.5 bg-emerald-600 text-white rounded-[16px] font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md">
                Analisar Carteira
              </button>
            </div>
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
            onClose={() => setSelectedInvestment(null)}
            onDelete={deleteInvestment}
            onAddContribution={(type, value, accountId) => {
              addContribution({
                investmentId: selectedInvestment.id,
                type,
                value,
                date: new Date().toISOString()
              }, accountId);
            }}
            calculateYield={calculateInvestmentYield}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function InvestmentForm({ onClose, onSubmit }: { onClose: () => void, onSubmit: any }) {
  const { accounts } = useContas();
  const [name, setName] = useState("");
  const [mainType, setMainType] = useState<string>("cdb");
  const [cryptoCoin, setCryptoCoin] = useState<string>("bitcoin");
  const [value, setValue] = useState("");
  const [monthlyYield, setMonthlyYield] = useState("");
  const [isManualYield, setIsManualYield] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value || (!isManualYield && !monthlyYield)) return;

    const finalType = mainType === "cripto" ? cryptoCoin : mainType;
    const finalYield = isManualYield ? 0 : parseFloat(monthlyYield);

    await onSubmit({
      name,
      type: finalType,
      investedValue: parseFloat(value),
      monthlyYield: finalYield,
      annualYield: (Math.pow(1 + finalYield / 100, 12) - 1) * 100,
      startDate: new Date(startDate).toISOString()
    }, accountId || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-white rounded-[32px] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Novo Investimento</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-[12px] transition-colors">
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Nome do Ativo</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-slate-900" 
              placeholder="Ex: CDB Banco Inter, Ações PETR4" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Tipo</label>
              <select 
                value={mainType}
                onChange={e => setMainType(e.target.value)} 
                className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 cursor-pointer"
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
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Moeda</label>
                <select 
                  value={cryptoCoin}
                  onChange={e => setCryptoCoin(e.target.value)} 
                  className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 cursor-pointer"
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
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Data de Início</label>
                <input 
                  type="date" 
                  required 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-slate-900" 
                />
              </div>
            )}
          </div>
          
          {mainType === "cripto" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Data de Início</label>
              <input 
                type="date" 
                required 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-slate-900" 
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Valor Inicial</label>
              <input 
                type="number" 
                step="0.01" 
                required 
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-slate-900"
                placeholder="R$ 0,00" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Rentabilidade (%)</label>
              <div className="flex flex-col gap-2">
                <input 
                  type="number" 
                  step="0.01" 
                  required={!isManualYield}
                  disabled={isManualYield}
                  value={isManualYield ? "" : monthlyYield}
                  onChange={e => setMonthlyYield(e.target.value)}
                  className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 disabled:opacity-50"
                  placeholder={isManualYield ? "N/A" : "0,00%"} 
                />
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input 
                    type="checkbox" 
                    checked={isManualYield}
                    onChange={e => setIsManualYield(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] font-medium text-gray-600">Lucro manual</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Conta de Origem (Opcional)</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-slate-900 cursor-pointer"
            >
              <option value="">Nenhuma (Apenas registrar saldo)</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} - Saldo: {formatCurrency(acc.balance || 0)}</option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            className="w-full rounded-[16px] bg-white py-5 font-bold text-slate-900 hover:bg-gray-800 active:scale-[0.98] transition-all mt-4 shadow-sm"
          >
            Criar Investimento
          </button>
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
  investment: Investment, 
  contributions: InvestmentContribution[], 
  onClose: () => void, 
  onDelete: any,
  onAddContribution: (type: "aporte" | "resgate" | "rendimento", value: number, accountId?: string) => void,
  calculateYield: any
}) {
  const { accounts } = useContas();
  const [isAddingValue, setIsAddingValue] = useState(false);
  const [contributionType, setContributionType] = useState<"aporte" | "resgate" | "rendimento">("aporte");
  const [contributionValue, setContributionValue] = useState("");
  const [accountId, setAccountId] = useState("");
  const [projectionYears, setProjectionYears] = useState(5);
  const [monthlyAporte, setMonthlyAporte] = useState(500);

  const yields = calculateYield(investment);

  const projectionData = useMemo(() => {
    const data = [];
    let currentVal = yields.currentValue;
    const monthlyRate = investment.monthlyYield / 100;
    
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="w-full max-w-4xl bg-gray-50 rounded-[40px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden my-8 border border-gray-100 min-w-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="bg-white p-8 md:p-12 border-b border-gray-100">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-6">
              <div className={cn(
                "w-20 h-20 rounded-[24px] flex items-center justify-center text-slate-900 text-3xl font-black shadow-sm",
                investment.type === "acoes" ? "bg-blue-500" : 
                ["cripto", "bitcoin", "ethereum", "tether", "bnb", "solana", "xrp", "usdc", "cardano", "avalanche", "dogecoin"].includes(investment.type) ? "bg-orange-500" : 
                investment.type === "cdb" ? "bg-emerald-500" : "bg-gray-800"
              )}>
                {investment.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{investment.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{investment.type}</span>
                  <span className="text-xs font-medium text-gray-500">Iniciado em {format(parseISO(investment.startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (confirm("Deseja excluir este investimento?")) {
                    onDelete(investment.id);
                    onClose();
                  }
                }}
                className="p-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-[12px] transition-all"
              >
                <Trash2 size={24} strokeWidth={1.5} />
              </button>
              <button onClick={onClose} className="p-3 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-[12px] transition-all">
                <X size={24} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50/50 p-6 rounded-[24px] border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] block mb-2">Valor Atual</span>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{formatCurrency(yields.currentValue)}</h3>
              <div className="mt-2 flex items-center gap-1 text-sm font-bold text-emerald-500">
                <ArrowUpRight size={16} strokeWidth={2.5} />
                <span>+{formatCurrency(yields.totalYield)}</span>
              </div>
            </div>

            <div className="bg-gray-50/50 p-6 rounded-[24px] border border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] block mb-2">Rendimento Mensal</span>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{investment.monthlyYield}%</h3>
              <p className="mt-2 text-sm font-bold text-emerald-500">~{formatCurrency(yields.monthlyGain)}/mês</p>
            </div>

            <div className="bg-gray-50/50 p-6 rounded-[24px] border border-gray-100 flex flex-col justify-center">
              <div className="flex gap-3 h-full">
                <button 
                  onClick={() => { setContributionType("aporte"); setIsAddingValue(true); }}
                  className="flex-1 h-full bg-white text-slate-900 rounded-[16px] font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-[0.98]"
                >
                  <PlusCircle size={18} strokeWidth={2.5} /> Aporte
                </button>
                <button 
                  onClick={() => { setContributionType("rendimento"); setIsAddingValue(true); }}
                  className="flex-1 h-full bg-emerald-500 text-white rounded-[16px] font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all active:scale-[0.98]"
                >
                  <TrendingUp size={18} strokeWidth={2.5} /> Lucro
                </button>
                <button 
                  onClick={() => { setContributionType("resgate"); setIsAddingValue(true); }}
                  className="flex-1 h-full bg-white border border-gray-200 text-slate-900 rounded-[16px] font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-[0.98]"
                >
                  <MinusCircle size={18} strokeWidth={2.5} /> Resgate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 md:p-12 space-y-12">
          {/* Projection Section */}
          <div className="bg-white p-8 md:p-10 rounded-[32px] border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Projeção de Crescimento</h3>
                <p className="text-sm text-gray-500 font-medium">Simule o futuro do seu investimento com aportes mensais</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-gray-50/80 p-1.5 rounded-[16px] flex items-center gap-1 border border-gray-100">
                  {[1, 2, 5, 10].map(y => (
                    <button 
                      key={y}
                      onClick={() => setProjectionYears(y)}
                      className={cn(
                        "px-4 py-2 rounded-[12px] text-xs font-bold transition-all",
                        projectionYears === y ? "bg-white text-slate-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-slate-900 hover:bg-gray-100/50"
                      )}
                    >
                      {y} anos
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-4 min-w-0">
              <div className="md:col-span-1 space-y-6 min-w-0">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Aporte Mensal</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                    <input 
                      type="number" 
                      value={monthlyAporte}
                      onChange={e => setMonthlyAporte(parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-[16px] text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-900"
                    />
                  </div>
                </div>
                <div className="p-6 bg-white rounded-[24px] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-[20px] -mr-16 -mt-16 pointer-events-none mix-blend-screen opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] block mb-2 relative z-10">Valor Final Estimado</span>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight relative z-10">{formatCurrency(projectionData[projectionData.length - 1].value)}</p>
                  <p className="text-[11px] font-bold text-emerald-400 mt-2 relative z-10">Lucro de {formatCurrency(projectionData[projectionData.length - 1].value - yields.currentValue - (monthlyAporte * projectionYears * 12))}</p>
                </div>
              </div>
              <div className="md:col-span-3 h-72 w-full min-w-0 overflow-hidden relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: '#9ca3af' }} 
                      dy={10}
                    />
                    <YAxis 
                      hide 
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Valor Estimado"]}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10b981" 
                      strokeWidth={3}
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
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-6 px-2">Histórico de Movimentações</h3>
            <div className="space-y-3">
              {contributions.length > 0 ? contributions.map((c) => (
                <div key={c.id} className="bg-white p-5 rounded-[24px] border border-gray-100 flex items-center justify-between hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-[16px] flex items-center justify-center shadow-sm",
                      c.type === "aporte" ? "bg-emerald-50 text-emerald-600" : 
                      c.type === "resgate" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {c.type === "aporte" ? <PlusCircle size={20} strokeWidth={2} /> : 
                       c.type === "resgate" ? <MinusCircle size={20} strokeWidth={2} /> : <TrendingUp size={20} strokeWidth={2} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 capitalize tracking-tight">{c.type}</p>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">{format(parseISO(c.date), "dd 'de' MMMM, HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                  <p className={cn(
                    "font-black tracking-tight text-lg",
                    c.type === "aporte" ? "text-emerald-500" : 
                    c.type === "resgate" ? "text-rose-500" : "text-blue-500"
                  )}>
                    {c.type === "resgate" ? "-" : "+"}{formatCurrency(c.value)}
                  </p>
                </div>
              )) : (
                <div className="py-16 text-center bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500 font-medium">Nenhuma movimentação registrada.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Contribution Modal */}
        <AnimatePresence>
          {isAddingValue && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-bold text-slate-900 tracking-tight">
                    {contributionType === "aporte" ? "Realizar Aporte" : contributionType === "resgate" ? "Realizar Resgate" : "Adicionar Lucro"}
                  </h4>
                  <button onClick={() => setIsAddingValue(false)} className="p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-[12px] transition-colors">
                    <X size={20} strokeWidth={1.5} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Valor</label>
                    <input 
                      type="number" 
                      autoFocus
                      value={contributionValue}
                      onChange={e => setContributionValue(e.target.value)}
                      className="w-full py-4 px-6 bg-gray-50 border border-gray-200 rounded-[16px] text-lg font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-900"
                      placeholder="R$ 0,00"
                    />
                  </div>
                  
                  {contributionType !== "rendimento" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">
                      {contributionType === "aporte" ? "Debitar da Conta (Opcional)" : "Creditar na Conta (Opcional)"}
                    </label>
                    <select
                      value={accountId}
                      onChange={e => setAccountId(e.target.value)}
                      className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-900 cursor-pointer"
                    >
                      <option value="">Nenhuma (Apenas registrar saldo)</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} - Saldo: {formatCurrency(acc.balance || 0)}</option>
                      ))}
                    </select>
                  </div>
                  )}
                  
                  <button 
                    onClick={() => {
                      if (contributionValue) {
                        onAddContribution(contributionType, parseFloat(contributionValue), accountId || undefined);
                        setIsAddingValue(false);
                        setContributionValue("");
                        setAccountId("");
                      }
                    }}
                    className={cn(
                      "w-full py-4 rounded-[16px] font-bold text-slate-900 transition-all active:scale-[0.98] shadow-sm hover:shadow-md",
                      contributionType === "aporte" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"
                    )}
                  >
                    Confirmar {contributionType === "aporte" ? "Aporte" : "Resgate"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
