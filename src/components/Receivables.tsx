import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MoreVertical, 
  ArrowUpRight, 
  ArrowDownLeft,
  ChevronRight,
  TrendingUp,
  ShieldAlert,
  MessageSquare,
  History,
  Trash2,
  Edit2,
  X,
  Phone,
  Camera,
  AlertCircle,
  BarChart3,
  Send,
  Copy,
  ExternalLink
} from "lucide-react";
import { Receivable, ReceivablePayment, UserProfile, ReceivableStatus, ReceivableType, ReceivableRisk, CollectionPriority, Debtor, ReliabilityLevel } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatCurrency, formatDate, getDaysRemaining } from "../lib/utils";
import { analyzeReceivableRisk, generateCollectionMessage, analyzeDebtorReliability, generateCollectionStrategy } from "../services/geminiService";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { getActiveUserId } from "../lib/authUtils";

interface ReceivablesProps {
  debtors: Debtor[];
  userProfile: UserProfile;
}

const ReceivableItem: React.FC<{
  receivable: Receivable;
  debtors: Debtor[];
  onPayment: (receivable: Receivable) => void;
  onDelete: (id: string) => void;
  onViewDetails: (receivable: Receivable) => void;
}> = ({ receivable, debtors, onPayment, onDelete, onViewDetails }) => {
  const daysRemaining = getDaysRemaining(receivable.dueDate);
  const progress = (receivable.receivedValue / receivable.totalValue) * 100;
  const debtor = debtors.find(d => d.id === receivable.debtorId);

  const getStatusInfo = (status: ReceivableStatus) => {
    switch (status) {
      case "recebido": return { label: "Quitado", color: "text-primary-green bg-primary-green/10", icon: <CheckCircle2 size={14} /> };
      case "atrasado": return { label: "Atrasado", color: "text-primary-red bg-primary-red/10", icon: <AlertTriangle size={14} /> };
      case "parcial": return { label: "Pendente", color: "text-yellow-500 bg-yellow-500/10", icon: <Clock size={14} /> };
      default: return { label: "Em aberto", color: "text-gray-500 bg-gray-100", icon: <Clock size={14} /> };
    }
  };

  const statusInfo = getStatusInfo(receivable.status);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[32px] p-5 premium-shadow border border-gray-50 group hover:border-primary-green/20 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-slate-900 overflow-hidden border-2 border-white shadow-sm">
            {debtor?.photoURL ? (
              <img src={debtor.photoURL} alt={receivable.personName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-lg font-black">{receivable.personName.charAt(0)}</span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-tight">{receivable.personName}</h3>
            <span className="text-[10px] text-gray-400 font-medium">{formatDate(receivable.loanDate)}</span>
          </div>
        </div>
        <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", statusInfo.color)}>
          {statusInfo.icon}
          {statusInfo.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 block mb-0.5">Emprestado</span>
          <p className="text-sm font-black text-slate-900">{formatCurrency(receivable.totalValue)}</p>
        </div>
        <div className="text-right">
          <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400 block mb-0.5">Restante</span>
          <p className="text-sm font-black text-primary-red">{formatCurrency(receivable.remainingValue)}</p>
        </div>
      </div>

      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">
          <span>Progresso</span>
          <span className="text-slate-900">{progress.toFixed(0)}% pago</span>
        </div>
        <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              receivable.status === "recebido" ? "bg-primary-green" : "bg-emerald-500"
            )}
          />
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap gap-2">
        {receivable.status !== "recebido" && (
          <button 
            onClick={() => onPayment(receivable)}
            className="flex-1 min-w-[100px] bg-primary-green text-white py-3 px-4 rounded-2xl text-xs font-black hover:bg-primary-green/90 transition-all active:scale-95 shadow-lg shadow-primary-green/10 truncate"
          >
            Receber
          </button>
        )}
        <button 
          onClick={() => onViewDetails(receivable)}
          className={cn(
            "flex-1 min-w-[100px] py-3 px-4 rounded-2xl text-xs font-black transition-all active:scale-95 truncate",
            receivable.status === "recebido" ? "w-full bg-gray-50 text-slate-900 hover:bg-gray-100" : "bg-gray-50 text-slate-900 hover:bg-gray-100"
          )}
        >
          Ver detalhes
        </button>
      </div>
    </motion.div>
  );
};

import { useReceivables } from "../context/ReceivablesContext";
import { transacoes } from "../modules/transacoesModule";

export const Receivables: React.FC<ReceivablesProps> = ({ debtors, userProfile }) => {
  const { receivables, addReceivable, updateReceivable, deleteReceivable } = useReceivables();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<ReceivableStatus | "all">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRiskAnalysisLoading, setIsRiskAnalysisLoading] = useState(false);
  const [isDebtorModalOpen, setIsDebtorModalOpen] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionMessage, setCollectionMessage] = useState("");
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [isLossSimOpen, setIsLossSimOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewingReceivable, setViewingReceivable] = useState<Receivable | null>(null);

  // AI Strategy State
  const [isStrategyLoading, setIsStrategyLoading] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const [showStrategy, setShowStrategy] = useState(false);

  // New Debtor Form State
  const [debtorFormData, setDebtorFormData] = useState({
    name: "",
    phone: "",
    photoURL: ""
  });

  // New Receivable Form State
  const [formData, setFormData] = useState({
    personName: "",
    debtorId: "",
    totalValue: 0,
    loanDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    type: "emprestimo" as ReceivableType,
    notes: ""
  });

  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    value: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const filteredReceivables = receivables.filter(r => {
    const matchesSearch = r.personName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalLent = receivables.reduce((acc, r) => acc + r.totalValue, 0);
  const totalReceived = receivables.reduce((acc, r) => acc + r.receivedValue, 0);
  const totalPending = totalLent - totalReceived;

  const handleGenerateStrategy = async () => {
    setIsStrategyLoading(true);
    setShowStrategy(true);
    try {
      const result = await generateCollectionStrategy(receivables, debtors, userProfile);
      setStrategy(result);
    } catch (error) {
      console.error("Error generating collection strategy:", error);
    } finally {
      setIsStrategyLoading(false);
    }
  };

  const handleAddReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentUid = auth.currentUser?.uid || userProfile?.uid || getActiveUserId();
      const debtor = debtors.find(d => d.id === formData.debtorId);
      
      const newReceivable: Omit<Receivable, "id"> = {
        userId: currentUid,
        personName: formData.personName,
        debtorId: formData.debtorId,
        totalValue: formData.totalValue,
        receivedValue: 0,
        remainingValue: formData.totalValue,
        loanDate: formData.loanDate,
        dueDate: formData.dueDate,
        type: formData.type,
        notes: formData.notes,
        status: "em_aberto",
        risk: "medio", // Default
        priority: "cobrar_em_breve", // Default
        history: [],
        createdAt: new Date().toISOString()
      };

      // AI Risk Analysis
      setIsRiskAnalysisLoading(true);
      try {
        const aiAnalysis = await analyzeReceivableRisk(newReceivable as Receivable, debtor);
        if (aiAnalysis) {
          newReceivable.risk = aiAnalysis.risk || "medio";
          newReceivable.riskReason = aiAnalysis.reason || "Análise padrão";
          newReceivable.priority = aiAnalysis.priority || "cobrar_em_breve";
          newReceivable.probabilityOfReceiving = aiAnalysis.probabilityOfReceiving ?? 70;
          newReceivable.estimatedReceiptDate = aiAnalysis.estimatedReceiptDate || formData.dueDate;
          newReceivable.probableDelayDays = aiAnalysis.probableDelayDays ?? 0;
          newReceivable.aiAnalysis = aiAnalysis.aiAnalysis || "Análise executada.";
        }
      } catch (aiErr) {
        console.warn("Análise de IA indisponível ao adicionar recebível:", aiErr);
      } finally {
        setIsRiskAnalysisLoading(false);
      }

      await addReceivable(newReceivable as any);

      // Register a transaction for the money lent
      await transacoes.registrarTransacao({
        userId: currentUid,
        title: `Empréstimo: ${formData.personName}`,
        value: formData.totalValue,
        type: "expense",
        category: "Empréstimos",
        date: formData.loanDate,
        notes: `Dinheiro emprestado para ${formData.personName}. ${formData.notes || ""}`,
        emotion: "racional",
        createdAt: new Date().toISOString()
      });

      // Update Debtor stats
      if (formData.debtorId) {
        const dRef = doc(db, "debtors", formData.debtorId);
        await updateDoc(dRef, {
          totalLent: (debtor?.totalLent || 0) + formData.totalValue,
          lastLoanDate: formData.loanDate
        });
      }

      setIsAddModalOpen(false);
      setFormData({
        personName: "",
        debtorId: "",
        totalValue: 0,
        loanDate: new Date().toISOString().split('T')[0],
        dueDate: "",
        type: "emprestimo",
        notes: ""
      });
    } catch (error) {
      console.error("Error adding receivable:", error);
      setIsRiskAnalysisLoading(false);
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.CREATE, "receivables");
      }
    }
  };

  const handleAddDebtor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentUid = auth.currentUser?.uid || userProfile?.uid || getActiveUserId();
      const newDebtor: Omit<Debtor, "id"> = {
        userId: currentUid,
        name: debtorFormData.name.trim(),
        phone: debtorFormData.phone?.trim() || "",
        photoURL: debtorFormData.photoURL?.trim() || "",
        totalLent: 0,
        totalReceived: 0,
        delayRate: 0,
        reliability: "media",
        recommendedLimit: 0,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "debtors"), {
        ...newDebtor,
        createdAt: serverTimestamp()
      });

      setIsDebtorModalOpen(false);
      setDebtorFormData({ name: "", phone: "", photoURL: "" });
    } catch (error) {
      console.error("Error adding debtor:", error);
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.CREATE, "debtors");
      }
    }
  };

  const handleGenerateMessage = async (receivable: Receivable, tone: 'friendly' | 'neutral' | 'firm') => {
    setIsGeneratingMessage(true);
    try {
      const debtor = debtors.find(d => d.id === receivable.debtorId);
      const message = await generateCollectionMessage(receivable, tone, debtor);
      setCollectionMessage(message);
      setIsCollectionModalOpen(true);
    } catch (error) {
      console.error("Error generating message:", error);
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;

    if (paymentData.value <= 0) {
      ((window as any).mostrarMensagem || window.alert)("O valor do pagamento deve ser maior que zero.");
      return;
    }

    if (paymentData.value > selectedReceivable.remainingValue) {
      ((window as any).mostrarMensagem || window.alert)(`O valor do pagamento não pode ser maior que o saldo restante (${formatCurrency(selectedReceivable.remainingValue)}).`);
      return;
    }

    try {
      const currentUid = auth.currentUser?.uid || userProfile?.uid || getActiveUserId();
      const payment: ReceivablePayment = {
        id: crypto.randomUUID(),
        value: paymentData.value,
        date: paymentData.date,
        notes: paymentData.notes
      };

      const newReceivedValue = selectedReceivable.receivedValue + payment.value;
      const newRemainingValue = selectedReceivable.totalValue - newReceivedValue;
      
      // Determine new status
      let newStatus: ReceivableStatus = "parcial";
      if (newRemainingValue <= 0) {
        newStatus = "recebido";
      } else {
        // Check if it's still overdue if it was overdue
        const daysRemaining = getDaysRemaining(selectedReceivable.dueDate);
        if (daysRemaining < 0) {
          newStatus = "atrasado";
        }
      }

      await updateReceivable(selectedReceivable.id, {
        receivedValue: newReceivedValue,
        remainingValue: newRemainingValue,
        status: newStatus,
        history: [...selectedReceivable.history, payment]
      });

      // Register a transaction for the payment received
      await transacoes.registrarTransacao({
        userId: currentUid,
        title: `Recebimento: ${selectedReceivable.personName}`,
        value: payment.value,
        type: "income",
        category: "Empréstimos",
        date: payment.date,
        notes: `Recebimento de valor emprestado para ${selectedReceivable.personName}. ${payment.notes || ""}`,
        emotion: "feliz",
        createdAt: new Date().toISOString()
      });

      // Update Debtor stats
      if (selectedReceivable.debtorId) {
        const debtor = debtors.find(d => d.id === selectedReceivable.debtorId);
        const dRef = doc(db, "debtors", selectedReceivable.debtorId);
        await updateDoc(dRef, {
          totalReceived: (debtor?.totalReceived || 0) + payment.value
        });
      }

      setIsPaymentModalOpen(false);
      setSelectedReceivable(null);
      setPaymentData({ value: 0, date: new Date().toISOString().split('T')[0], notes: "" });
      
      // If details modal is open, update the viewing receivable
      if (viewingReceivable && viewingReceivable.id === selectedReceivable.id) {
        setViewingReceivable({
          ...viewingReceivable,
          receivedValue: newReceivedValue,
          remainingValue: newRemainingValue,
          status: newStatus,
          history: [...viewingReceivable.history, payment]
        });
      }
    } catch (error) {
      console.error("Error adding payment:", error);
    }
  };

  const handleDeleteReceivable = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este registro?")) {
      try {
        await deleteReceivable(id);
      } catch (error) {
        console.error("Error deleting receivable:", error);
      }
    }
  };

  return (
    <div className="space-y-8 min-h-screen bg-white -m-4 sm:-m-8 p-4 sm:p-8">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Dinheiro Emprestado</h1>
          <p className="text-gray-500 font-medium">Gestão profissional de contas a receber e cobranças.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleGenerateStrategy}
            className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
          >
            <ShieldAlert size={20} />
            Estratégia IA
          </button>
          <button 
            onClick={() => setIsDebtorModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-white text-slate-900 border border-gray-200 px-6 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
          >
            <User size={20} />
            Novo Devedor
          </button>
          <button 
            onClick={() => setIsLossSimOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary-red/10 text-primary-red px-6 py-4 rounded-2xl font-bold hover:bg-primary-red/20 transition-all active:scale-95"
          >
            <BarChart3 size={20} />
            Simular Perda
          </button>
        </div>
      </div>

      {/* Stats Card - Premium Style */}
      <div className="bg-white p-8 rounded-[40px] premium-shadow border border-gray-50 grid grid-cols-1 md:grid-cols-3 gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="relative">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Total Emprestado</span>
          <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalLent)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400">
            <ArrowUpRight size={14} className="text-emerald-600" />
            <span>{receivables.length} empréstimos ativos</span>
          </div>
        </div>

        <div className="relative">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Total Recebido</span>
          <p className="text-4xl font-black text-primary-green tracking-tighter">{formatCurrency(totalReceived)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400">
            <CheckCircle2 size={14} className="text-primary-green" />
            <span>{((totalReceived / totalLent) * 100 || 0).toFixed(1)}% recuperado</span>
          </div>
        </div>

        <div className="relative">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">A Receber</span>
          <p className="text-4xl font-black text-primary-red tracking-tighter">{formatCurrency(totalPending)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400">
            <Clock size={14} className="text-primary-red" />
            <span>{receivables.filter(r => r.status === "atrasado").length} em atraso</span>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showStrategy && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white text-slate-900 p-8 rounded-4xl premium-shadow relative">
              <button 
                onClick={() => setShowStrategy(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Estratégia de Recuperação IA</h2>
                  <p className="text-slate-900/60 text-sm font-medium">Análise preditiva e plano de ação personalizado.</p>
                </div>
              </div>

              {isStrategyLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-12 h-12 border-4 border-primary-lime border-t-transparent rounded-full animate-spin" />
                  <p className="text-emerald-600 font-bold animate-pulse">Gerando estratégia inteligente...</p>
                </div>
              ) : strategy && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/5 p-4 rounded-2xl border border-gray-50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 block mb-1">Risco da Carteira</span>
                        <p className={cn(
                          "text-lg font-black uppercase",
                          strategy.overallRisk === "critico" ? "text-primary-red" :
                          strategy.overallRisk === "alto" ? "text-orange-500" :
                          strategy.overallRisk === "medio" ? "text-yellow-500" : "text-primary-green"
                        )}>{strategy.overallRisk}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-gray-50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 block mb-1">Total a Receber</span>
                        <p className="text-lg font-black text-slate-900">{formatCurrency(strategy.totalToReceive)}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-gray-50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900/40 block mb-1">Previsto p/ Mês</span>
                        <p className="text-lg font-black text-emerald-600">{formatCurrency(strategy.expectedThisMonth)}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-900/40 mb-4">Plano de Ação por Devedor</h3>
                      <div className="space-y-4">
                        {strategy.strategies.map((s: any, i: number) => (
                          <div key={i} className="bg-white/5 p-6 rounded-3xl border border-gray-50 hover:bg-white/10 transition-all">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-black text-slate-900">{s.debtorName}</h4>
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg",
                                  s.priority === "cobrar_agora" ? "bg-primary-red text-slate-900" :
                                  s.priority === "cobrar_em_breve" ? "bg-orange-500 text-slate-900" : "bg-gray-500 text-slate-900"
                                )}>{s.priority.replace("_", " ")}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mb-1">Ação Sugerida</span>
                                <p className="text-sm font-bold text-slate-900">{s.action}</p>
                              </div>
                            </div>
                            <div className="bg-black/20 p-4 rounded-2xl mb-4">
                              <p className="text-xs text-slate-900/80 italic leading-relaxed">"{s.suggestedMessage}"</p>
                            </div>
                            <p className="text-[10px] text-slate-900/40 leading-relaxed">{s.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-white/5 p-6 rounded-3xl border border-gray-50">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-900/40 mb-4">Recomendações Gerais</h3>
                      <ul className="space-y-4">
                        {strategy.recommendations.map((r: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-slate-900/80">
                            <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">{i + 1}</div>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-emerald-600 p-6 rounded-3xl text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={20} />
                        <span className="font-black uppercase text-xs tracking-widest">Dica de Ouro</span>
                      </div>
                      <p className="text-sm font-bold leading-relaxed">
                        Cobranças feitas nos primeiros 5 dias de atraso têm 85% mais chance de sucesso. Não espere o tempo passar!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl premium-shadow border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-green/10 flex items-center justify-center text-primary-green">
              <ArrowUpRight size={20} />
            </div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Emprestado</span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(totalLent)}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl premium-shadow border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Recebido</span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(totalReceived)}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl premium-shadow border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-red/10 flex items-center justify-center text-primary-red">
              <Clock size={20} />
            </div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Saldo Pendente</span>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por nome da pessoa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-white font-medium"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {(["all", "em_aberto", "parcial", "atrasado", "recebido"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-6 py-4 rounded-2xl font-bold text-sm whitespace-nowrap transition-all",
                filterStatus === status 
                  ? "bg-white text-slate-900 shadow-lg shadow-primary-dark/20" 
                  : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
              )}
            >
              {status === "all" ? "Todos" : status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Group: Atrasados */}
        {filteredReceivables.filter(r => r.status === "atrasado").length > 0 && (
          <div className="col-span-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary-red" />
              <h2 className="text-xs font-black uppercase tracking-widest text-primary-red">Atrasados</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReceivables
                .filter(r => r.status === "atrasado")
                .map((receivable) => (
                  <ReceivableItem 
                    key={receivable.id}
                    receivable={receivable}
                    debtors={debtors}
                    onPayment={(r) => { setSelectedReceivable(r); setIsPaymentModalOpen(true); }}
                    onDelete={handleDeleteReceivable}
                    onViewDetails={(r) => { setViewingReceivable(r); setIsDetailsModalOpen(true); }}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Group: Ativos (Em aberto ou Parcial) */}
        {filteredReceivables.filter(r => r.status === "em_aberto" || r.status === "parcial").length > 0 && (
          <div className="col-span-full">
            <div className="flex items-center gap-2 mb-4 mt-4">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Ativos</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReceivables
                .filter(r => r.status === "em_aberto" || r.status === "parcial")
                .map((receivable) => (
                  <ReceivableItem 
                    key={receivable.id}
                    receivable={receivable}
                    debtors={debtors}
                    onPayment={(r) => { setSelectedReceivable(r); setIsPaymentModalOpen(true); }}
                    onDelete={handleDeleteReceivable}
                    onViewDetails={(r) => { setViewingReceivable(r); setIsDetailsModalOpen(true); }}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Group: Quitados */}
        {filteredReceivables.filter(r => r.status === "recebido").length > 0 && (
          <div className="col-span-full">
            <div className="flex items-center gap-2 mb-4 mt-8">
              <div className="w-2 h-2 rounded-full bg-primary-green" />
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Quitados</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReceivables
                .filter(r => r.status === "recebido")
                .map((receivable) => (
                  <ReceivableItem 
                    key={receivable.id}
                    receivable={receivable}
                    debtors={debtors}
                    onPayment={(r) => { setSelectedReceivable(r); setIsPaymentModalOpen(true); }}
                    onDelete={handleDeleteReceivable}
                    onViewDetails={(r) => { setViewingReceivable(r); setIsDetailsModalOpen(true); }}
                  />
                ))}
            </div>
          </div>
        )}

        {filteredReceivables.length === 0 && (
          <div className="col-span-full bg-white rounded-4xl p-12 text-center border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center text-gray-300 mx-auto mb-6">
              <DollarSign size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum registro encontrado</h3>
            <p className="text-gray-500 max-w-xs mx-auto">Você ainda não tem dinheiro emprestado registrado ou os filtros não retornaram resultados.</p>
          </div>
        )}
      </div>

      {/* Floating Action Button - Circular & Compact */}
      <div className="fixed bottom-[110px] right-5 z-50 pointer-events-none">
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="pointer-events-auto w-14 h-14 flex items-center justify-center bg-primary-green text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] shadow-primary-green/40 hover:scale-110 active:scale-90 transition-all group"
          title="Emprestar dinheiro"
        >
          <DollarSign size={28} className="group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && viewingReceivable && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsModalOpen(false)}
              className="absolute inset-0 bg-white/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Detalhes do Empréstimo</h2>
                  <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="flex items-center gap-6 mb-8 p-6 bg-gray-50 rounded-3xl">
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-slate-900 overflow-hidden shadow-sm border-4 border-white">
                    {debtors.find(d => d.id === viewingReceivable.debtorId)?.photoURL ? (
                      <img src={debtors.find(d => d.id === viewingReceivable.debtorId)?.photoURL} alt={viewingReceivable.personName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-3xl font-black">{viewingReceivable.personName.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{viewingReceivable.personName}</h3>
                    <p className="text-gray-500 font-medium">Emprestado em {formatDate(viewingReceivable.loanDate)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900">
                        {viewingReceivable.type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Total</span>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(viewingReceivable.totalValue)}</p>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Pago</span>
                    <p className="text-lg font-black text-primary-green">{formatCurrency(viewingReceivable.receivedValue)}</p>
                  </div>
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Restante</span>
                    <p className="text-lg font-black text-primary-red">{formatCurrency(viewingReceivable.remainingValue)}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                      <History size={14} />
                      Histórico de Pagamentos
                    </h4>
                    <div className="space-y-3">
                      {viewingReceivable.history.length > 0 ? (
                        viewingReceivable.history.map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-green/10 flex items-center justify-center text-primary-green">
                                <ArrowDownLeft size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{formatCurrency(p.value)}</p>
                                <p className="text-[10px] text-gray-400">{formatDate(p.date)}</p>
                              </div>
                            </div>
                            {p.notes && <p className="text-[10px] text-gray-500 italic">{p.notes}</p>}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                          <p className="text-sm text-gray-400 font-medium">Nenhum pagamento registrado ainda.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {viewingReceivable.notes && (
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Observações</h4>
                      <div className="p-4 bg-gray-50 rounded-2xl text-sm text-gray-600 leading-relaxed">
                        {viewingReceivable.notes}
                      </div>
                    </div>
                  )}

                  {viewingReceivable.status !== "recebido" && (
                    <div className="pt-6 border-t border-gray-100">
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <MessageSquare size={14} />
                        Cobrança Inteligente
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleGenerateMessage(viewingReceivable, 'friendly')}
                          className="p-4 rounded-2xl bg-emerald-50 text-slate-900 hover:bg-emerald-500 transition-all text-xs font-bold flex items-center justify-center gap-2"
                        >
                          <MessageSquare size={16} />
                          Tom Amigável
                        </button>
                        <button 
                          onClick={() => handleGenerateMessage(viewingReceivable, 'firm')}
                          className="p-4 rounded-2xl bg-primary-red/10 text-primary-red hover:bg-primary-red hover:text-slate-900 transition-all text-xs font-bold flex items-center justify-center gap-2"
                        >
                          <ShieldAlert size={16} />
                          Tom Firme
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t border-gray-100 flex gap-4">
                    <button 
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        handleDeleteReceivable(viewingReceivable.id);
                      }}
                      className="flex-1 py-4 rounded-2xl bg-primary-red/5 text-primary-red font-bold text-sm hover:bg-primary-red/10 transition-all"
                    >
                      Excluir Registro
                    </button>
                    <button 
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        setSelectedReceivable(viewingReceivable);
                        setIsPaymentModalOpen(true);
                      }}
                      className="flex-1 py-4 rounded-2xl bg-white text-slate-900 font-bold text-sm hover:bg-white/90 transition-all"
                    >
                      Registrar Pagamento
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Receivable Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-white/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-4xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Novo Empréstimo</h2>
                  <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <form onSubmit={handleAddReceivable} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Para quem?</label>
                    <div className="grid grid-cols-[1fr,auto] gap-2">
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <select 
                          required
                          value={formData.debtorId}
                          onChange={(e) => {
                            const d = debtors.find(deb => deb.id === e.target.value);
                            setFormData({ ...formData, debtorId: e.target.value, personName: d?.name || "" });
                          }}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-gray-50 font-bold appearance-none"
                        >
                          <option value="">Selecione um devedor</option>
                          {debtors.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { setIsAddModalOpen(false); setIsDebtorModalOpen(true); }}
                        className="p-4 bg-white/5 text-slate-900 rounded-2xl hover:bg-white/10 transition-all"
                      >
                        <Plus size={24} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Valor</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                          required
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={formData.totalValue || ""}
                          onChange={(e) => setFormData({ ...formData, totalValue: parseFloat(e.target.value) })}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-gray-50 font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Tipo</label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as ReceivableType })}
                        className="w-full px-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-gray-50 font-bold appearance-none"
                      >
                        <option value="emprestimo">Empréstimo</option>
                        <option value="venda_fiado">Venda Fiado</option>
                        <option value="adiantamento">Adiantamento</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Data do Empréstimo</label>
                      <input 
                        required
                        type="date"
                        value={formData.loanDate}
                        onChange={(e) => setFormData({ ...formData, loanDate: e.target.value })}
                        className="w-full px-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-gray-50 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Data Prevista Recebimento</label>
                      <input 
                        required
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="w-full px-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-gray-50 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Observações (Opcional)</label>
                    <textarea 
                      placeholder="Detalhes sobre o empréstimo..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-gray-50 font-medium h-24 resize-none"
                    />
                  </div>

                  <button 
                    disabled={isRiskAnalysisLoading}
                    type="submit"
                    className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black text-lg shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isRiskAnalysisLoading ? "Analisando Risco com IA..." : "Salvar Registro"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedReceivable && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsPaymentModalOpen(false); setSelectedReceivable(null); }}
              className="absolute inset-0 bg-white/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-4xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Receber Pagamento</h2>
                    <p className="text-sm text-gray-500 font-medium">De: {selectedReceivable.personName}</p>
                  </div>
                  <button onClick={() => { setIsPaymentModalOpen(false); setSelectedReceivable(null); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl mb-8 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saldo Restante</span>
                  <span className="text-xl font-black text-primary-red">{formatCurrency(selectedReceivable.remainingValue)}</span>
                </div>

                <form onSubmit={handleAddPayment} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Valor Recebido</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input 
                        required
                        type="number"
                        step="0.01"
                        max={selectedReceivable.remainingValue}
                        placeholder="0,00"
                        value={paymentData.value || ""}
                        onChange={(e) => setPaymentData({ ...paymentData, value: parseFloat(e.target.value) })}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-gray-50 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Data do Recebimento</label>
                    <input 
                      required
                      type="date"
                      value={paymentData.date}
                      onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-gray-50 font-bold"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-primary-green text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-primary-green/20 hover:bg-primary-green/90 transition-all active:scale-[0.98]"
                  >
                    Confirmar Recebimento
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add Debtor Modal */}
      <AnimatePresence>
        {isDebtorModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDebtorModalOpen(false)}
              className="absolute inset-0 bg-white/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-4xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Novo Devedor</h2>
                  <button onClick={() => setIsDebtorModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <form onSubmit={handleAddDebtor} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nome Completo</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: João Silva"
                      value={debtorFormData.name}
                      onChange={(e) => setDebtorFormData({ ...debtorFormData, name: e.target.value })}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-gray-50 font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Telefone / WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input 
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={debtorFormData.phone}
                        onChange={(e) => setDebtorFormData({ ...debtorFormData, phone: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-gray-50 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">URL da Foto (Opcional)</label>
                    <div className="relative">
                      <Camera className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input 
                        type="url"
                        placeholder="https://..."
                        value={debtorFormData.photoURL}
                        onChange={(e) => setDebtorFormData({ ...debtorFormData, photoURL: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 bg-gray-50 font-bold"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-white text-slate-900 py-5 rounded-2xl font-black text-lg shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:bg-white/90 transition-all active:scale-[0.98]"
                  >
                    Cadastrar Devedor
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Collection Message Modal */}
      <AnimatePresence>
        {isCollectionModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCollectionModalOpen(false)}
              className="absolute inset-0 bg-white/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-4xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mensagem de Cobrança IA</h2>
                  <button onClick={() => setIsCollectionModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8">
                  <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">
                    {collectionMessage}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(collectionMessage);
                      ((window as any).mostrarMensagem || window.alert)("Mensagem copiada!");
                    }}
                    className="flex items-center justify-center gap-2 bg-gray-100 text-slate-900 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    <Copy size={20} />
                    Copiar
                  </button>
                  <button 
                    onClick={() => {
                      const phone = debtors.find(d => d.name === selectedReceivable?.personName)?.phone;
                      if (phone) {
                        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(collectionMessage)}`, '_blank');
                      } else {
                        ((window as any).mostrarMensagem || window.alert)("Telefone não cadastrado para este devedor.");
                      }
                    }}
                    className="flex items-center justify-center gap-2 bg-primary-green text-white py-4 rounded-2xl font-bold hover:bg-primary-green/90 transition-all"
                  >
                    <Send size={20} />
                    WhatsApp
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loss Simulation Modal */}
      <AnimatePresence>
        {isLossSimOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLossSimOpen(false)}
              className="absolute inset-0 bg-white/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-4xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Simulador de Perda</h2>
                  <button onClick={() => setIsLossSimOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-primary-red/5 p-6 rounded-3xl border border-primary-red/10">
                    <div className="flex items-center gap-3 mb-4 text-primary-red">
                      <AlertCircle size={24} />
                      <h3 className="font-bold">Impacto do Calote Total</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">
                      Se todos os empréstimos pendentes não forem pagos, este será o impacto nas suas finanças:
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Perda Total</span>
                        <p className="text-xl font-black text-primary-red">{formatCurrency(totalPending)}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Impacto no Patrimônio</span>
                        <p className="text-xl font-black text-primary-red">
                          {((totalPending / (totalPending + totalReceived)) * 100 || 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-6 rounded-3xl border border-primary-dark/10">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Recomendações da IA</h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm text-slate-900 font-medium">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] shrink-0">1</div>
                        Evite novos empréstimos para devedores com confiabilidade "Crítica" ou "Baixa".
                      </li>
                      <li className="flex items-start gap-3 text-sm text-slate-900 font-medium">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] shrink-0">2</div>
                        Priorize a cobrança de valores acima de {formatCurrency(totalPending * 0.2)} para reduzir exposição.
                      </li>
                      <li className="flex items-start gap-3 text-sm text-slate-900 font-medium">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] shrink-0">3</div>
                        Considere o valor pendente como "em risco" no seu planejamento de reserva de emergência.
                      </li>
                    </ul>
                  </div>
                </div>

                <button 
                  onClick={() => setIsLossSimOpen(false)}
                  className="w-full mt-8 bg-white text-slate-900 py-5 rounded-2xl font-black text-lg shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:bg-white/90 transition-all"
                >
                  Entendi o Risco
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Receivables;
