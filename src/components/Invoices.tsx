import React, { useState, useMemo } from "react";
import { Card, Transaction, Invoice, Account } from "../types";
import { formatCurrency, cn, formatBillingPeriod } from "../lib/utils";
import { 
  Calendar, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Wallet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BankIcon } from "./BankIcon";
import { useFaturas } from "../context/FaturasContext";
import { useCartoes } from "../context/CartoesContext";
import { useContas } from "../context/ContasContext";
import { useTransacoes } from "../context/TransacoesContext";
import { faturas } from "../modules/faturasModule";

export function Invoices({ cards: _cards, transactions: _transactions, accounts: _accounts }: { cards?: Card[], transactions?: Transaction[], accounts?: Account[] }) {
  const { invoices, loading } = useFaturas();
  const { cards } = useCartoes();
  const { accounts } = useContas();
  const { transactions } = useTransacoes();
  
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedCardId, setSelectedCardId] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesStatus = filterStatus === "all" || inv.status === filterStatus;
      const matchesCard = selectedCardId === "all" || inv.cardId === selectedCardId;
      return matchesStatus && matchesCard;
    });
  }, [invoices, filterStatus, selectedCardId]);

  const stats = useMemo(() => {
    const open = invoices.filter(i => i.status === "open").reduce((sum, i) => sum + i.totalValue, 0);
    const closed = invoices.filter(i => i.status === "closed").reduce((sum, i) => sum + i.totalValue, 0);
    const overdue = invoices.filter(i => i.status === "overdue").reduce((sum, i) => sum + i.totalValue, 0);
    return { open, closed, overdue };
  }, [invoices]);

  const handlePayInvoice = async () => {
    if (!selectedInvoice || !paymentAccountId || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const success = await faturas.pagarFatura(selectedInvoice.id, paymentAccountId, amount);
    if (success) {
      setIsPaying(false);
      setSelectedInvoice(null);
      setPaymentAmount("");
    }
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header & Stats */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase italic">Faturas</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Controle de Gastos no Crédito</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-3xl bg-blue-50 border border-blue-100">
          <p className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-1">Abertas</p>
          <p className="text-sm font-black text-blue-600 italic">{formatCurrency(stats.open)}</p>
        </div>
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-100">
          <p className="text-[8px] font-black uppercase tracking-widest text-amber-400 mb-1">Fechadas</p>
          <p className="text-sm font-black text-amber-600 italic">{formatCurrency(stats.closed)}</p>
        </div>
        <div className="p-4 rounded-3xl bg-rose-50 border border-rose-100">
          <p className="text-[8px] font-black uppercase tracking-widest text-rose-400 mb-1">Atrasadas</p>
          <p className="text-sm font-black text-rose-600 italic">{formatCurrency(stats.overdue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 px-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {["all", "open", "closed", "paid", "overdue"].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                filterStatus === status 
                  ? "bg-white text-slate-900 shadow-lg shadow-primary-dark/20" 
                  : "bg-white text-gray-400 border border-gray-100 hover:bg-gray-50"
              )}
            >
              {status === "all" ? "Todas" : 
               status === "open" ? "Abertas" : 
               status === "closed" ? "Fechadas" : 
               status === "paid" ? "Pagas" : "Atrasadas"}
            </button>
          ))}
        </div>

        <select
          value={selectedCardId}
          onChange={e => setSelectedCardId(e.target.value)}
          className="w-full rounded-2xl border-none bg-white py-3 px-4 text-xs font-bold shadow-sm focus:ring-2 focus:ring-primary-lime/20"
        >
          <option value="all">Todos os Cartões</option>
          {cards.map(card => (
            <option key={card.id} value={card.id}>{card.name}</option>
          ))}
        </select>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 border-4 border-primary-lime border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Carregando faturas...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center rounded-[40px] bg-white border-2 border-dashed border-gray-100">
            <div className="h-16 w-16 rounded-3xl bg-gray-50 text-gray-300 flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">Nenhuma fatura encontrada</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest max-w-[200px] mx-auto">
              Tente alterar os filtros para ver outras faturas.
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice, index) => {
            const card = cards.find(c => c.id === invoice.cardId);
            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedInvoice(invoice)}
                className="group p-5 rounded-[32px] bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-lime/30 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center",
                      invoice.status === "paid" ? "bg-emerald-50 text-emerald-500" : 
                      invoice.status === "overdue" ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500"
                    )}>
                      {invoice.status === "paid" ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        {formatBillingPeriod(invoice.month, invoice.year)}
                      </h3>
                      <div className="flex items-center gap-2">
                        <BankIcon bankName={card?.bank || ""} className="h-4 w-4" />
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{card?.name || "Cartão Excluído"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-900 tracking-tighter italic">
                      {formatCurrency(invoice.totalValue)}
                    </div>
                    <div className={cn(
                      "text-[8px] font-black uppercase tracking-widest",
                      invoice.status === "paid" ? "text-emerald-500" : 
                      invoice.status === "overdue" ? "text-rose-500" : "text-blue-500"
                    )}>
                      {invoice.status === "open" ? "Aberta" : 
                       invoice.status === "closed" ? "Fechada" :
                       invoice.status === "paid" ? "Paga" : 
                       invoice.status === "overdue" ? "Atrasada" : "Parcial"}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-300 mb-0.5">Vencimento</p>
                      <p className="text-[10px] font-bold text-gray-500">{new Date(invoice.dueDate).toLocaleDateString("pt-BR")}</p>
                    </div>
                    {invoice.paidValue > 0 && (
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-300 mb-0.5">Valor Pago</p>
                        <p className="text-[10px] font-bold text-emerald-500">{formatCurrency(invoice.paidValue)}</p>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-600 transition-colors" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceDetails 
            invoice={selectedInvoice} 
            card={cards.find(c => c.id === selectedInvoice.cardId)!}
            transactions={transactions}
            accounts={accounts}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InvoiceDetails({ invoice, card, transactions, accounts, onClose }: { invoice: Invoice, card: Card, transactions: Transaction[], accounts: Account[], onClose: () => void }) {
  const invoiceTransactions = transactions.filter(t => invoice.items?.includes(t.id));
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");

  const handlePayInvoice = async () => {
    if (!invoice || !paymentAccountId || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const success = await faturas.pagarFatura(invoice.id, paymentAccountId, amount);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-8">
      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        className="w-full max-w-2xl rounded-[40px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center",
                invoice.status === "paid" ? "bg-emerald-50 text-emerald-500" : "bg-blue-50 text-blue-500"
              )}>
                {invoice.status === "paid" ? <CheckCircle2 size={32} /> : <Clock size={32} />}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">
                  Fatura {formatBillingPeriod(invoice.month, invoice.year)}
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {card.name} • Final ****
                </p>
              </div>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <Plus size={20} className="rotate-45" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100">
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Valor Total</p>
              <p className="text-2xl font-black text-slate-900 tracking-tighter italic">{formatCurrency(invoice.totalValue)}</p>
            </div>
            <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100">
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Status</p>
              <p className={cn(
                "text-lg font-black uppercase tracking-tighter italic",
                invoice.status === "paid" ? "text-emerald-500" : "text-blue-500"
              )}>
                {invoice.status === "open" ? "Aberta" : 
                 invoice.status === "closed" ? "Fechada" :
                 invoice.status === "paid" ? "Paga" : 
                 invoice.status === "overdue" ? "Atrasada" : "Parcial"}
              </p>
            </div>
          </div>

          {invoice.status !== 'paid' && (
            <div className="mt-4 p-4 rounded-3xl bg-white text-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Pagar Fatura</h4>
                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center">
                  <Wallet size={14} />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1 block">Conta para Pagamento</label>
                  <select 
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className="w-full h-10 rounded-xl bg-white/10 border border-white/20 px-3 text-xs font-bold focus:outline-none focus:border-white/40"
                  >
                    <option value="" className="text-slate-900">Selecionar conta...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id} className="text-slate-900">
                        {acc.name} ({formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1 block">Valor do Pagamento</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black opacity-40">R$</span>
                    <input 
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={invoice.totalValue.toString()}
                      className="w-full h-10 rounded-xl bg-white/10 border border-white/20 pl-8 pr-3 text-xs font-bold focus:outline-none focus:border-white/40 placeholder:text-slate-900/20"
                    />
                  </div>
                </div>

                <button 
                  onClick={handlePayInvoice}
                  disabled={!paymentAccountId || !paymentAmount}
                  className="w-full h-10 rounded-xl bg-white text-slate-900 text-xs font-black uppercase tracking-widest hover:bg-opacity-90 transition-all disabled:opacity-50"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lançamentos nesta fatura</h4>
            
            {invoiceTransactions.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-bold text-gray-400 italic">Nenhum lançamento encontrado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoiceTransactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-gray-100/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-gray-400 shadow-sm">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">{t.establishment || t.category}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                          {new Date(t.date).toLocaleDateString("pt-BR")}
                          {t.installment && ` • ${t.currentInstallment}/${t.totalInstallments}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {formatCurrency(t.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
