import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Transaction, Account } from "../types";
import { auth } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { transacoes as transacoesMod } from "../modules/transacoesModule";
import { formatCurrency } from "../lib/utils";
import { motion } from "framer-motion";
import { 
  Repeat, 
  X, 
  AlertCircle, 
  ArrowRight, 
  AlertTriangle 
} from "lucide-react";

interface TransferFormProps {
  onClose: () => void;
  accounts: Account[];
  initialData?: Transaction;
  quickData?: { from: string; to: string } | null;
  mostrarMensagem?: (msg: string) => void;
}

export function TransferForm({ 
  onClose, 
  accounts, 
  initialData, 
  quickData, 
  mostrarMensagem 
}: TransferFormProps) {
  const navigate = useNavigate();
  
  const [value, setValue] = useState(initialData?.value.toString() || "");
  const [date, setDate] = useState(
    initialData?.date 
      ? new Date(initialData.date).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0]
  );
  
  const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];
  const nextAccount = accounts.find(a => a.id !== (defaultAccount?.id || ""));

  const [accountId, setAccountId] = useState(
    initialData?.transferType === "received" 
      ? initialData.toAccountId || "" 
      : initialData?.accountId || quickData?.from || defaultAccount?.id || ""
  );
  const [toAccountId, setToAccountId] = useState(
    initialData?.transferType === "received" 
      ? initialData.accountId || "" 
      : initialData?.toAccountId || quickData?.to || nextAccount?.id || ""
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccountIdChange = (val: string) => {
    setAccountId(val);
    if (val && val === toAccountId) {
      const otherAcc = accounts.find(a => a.id !== val);
      if (otherAcc) {
        setToAccountId(otherAcc.id);
      }
    }
  };

  const handleToAccountIdChange = (val: string) => {
    setToAccountId(val);
    if (val && val === accountId) {
      const otherAcc = accounts.find(a => a.id !== val);
      if (otherAcc) {
        setAccountId(otherAcc.id);
      }
    }
  };

  useEffect(() => {
    if (quickData?.from) setAccountId(quickData.from);
    if (quickData?.to) setToAccountId(quickData.to);
  }, [quickData]);

  useEffect(() => {
    if (accounts.length > 0) {
      if (!accountId) {
        const def = accounts.find(a => a.isDefault) || accounts[0];
        if (def) setAccountId(def.id);
      }
    }
  }, [accounts, accountId]);

  useEffect(() => {
    if (accounts.length > 0) {
      if (!toAccountId) {
        const next = accounts.find(a => a.id !== accountId);
        if (next) setToAccountId(next.id);
      }
    }
  }, [accounts, accountId, toAccountId]);

  const selectedAccount = accounts.find(a => a.id === accountId);
  const isBelowThreshold = selectedAccount && 
    selectedAccount.balanceThreshold !== undefined && 
    (selectedAccount.balance - parseFloat(value || "0")) < selectedAccount.balanceThreshold;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);

    if (!value || !accountId || !toAccountId) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const normalizedValue = value.toString().replace(",", ".");
    const val = parseFloat(normalizedValue);
    if (isNaN(val) || val <= 0) {
      setError("O valor da transferência deve ser um número válido maior que zero.");
      return;
    }

    if (accountId === toAccountId) {
      setError("A conta de origem e destino não podem ser a mesma.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (initialData) {
        await transacoesMod.atualizarTransacao(initialData.id, {
          type: "transfer",
          title: notes || "Transferência",
          value: val,
          date: new Date(date).toISOString(),
          accountId,
          toAccountId,
          notes,
          category: "Transferência",
          emotion: "racional",
          reconciled: false,
          createdAt: initialData.createdAt
        } as any, initialData);
        if (mostrarMensagem) {
          mostrarMensagem("Transferência atualizada com sucesso!");
        }
      } else {
        await transacoesMod.registrarTransacao({
          type: "transfer",
          title: notes || "Transferência",
          value: val,
          date: new Date(date).toISOString(),
          accountId,
          toAccountId,
          notes,
          category: "Transferência",
          emotion: "racional",
          reconciled: false,
          createdAt: new Date().toISOString()
        } as any);
        if (mostrarMensagem) {
          mostrarMensagem("Transferência realizada com sucesso!");
        }
      }
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || "Erro ao processar transferência.");
      handleFirestoreError(err, OperationType.WRITE, "transfer/process");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ y: "100%", opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: "100%", opacity: 0 }} 
        className="w-full max-w-lg rounded-t-[40px] md:rounded-[40px] bg-white p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-y-auto max-h-[90vh] custom-scrollbar" 
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Repeat size={20} />
            </div>
            <h3 className="text-xl font-bold">Transferência</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 p-2">
            <X size={20} />
          </button>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600">
            <AlertCircle size={20} />
            <p className="text-xs font-bold">{error}</p>
          </motion.div>
        )}

        {accounts.length < 2 ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-gray-800">Contas insuficientes</h4>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Você precisa ter pelo menos duas contas cadastradas para realizar uma transferência entre elas.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={onClose}
                className="mt-2 px-6 py-2.5 bg-gray-150 text-gray-700 rounded-xl text-xs font-bold active:scale-95 transition-transform"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  onClose();
                  navigate("/accounts");
                }}
                className="mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform"
              >
                Cadastrar Conta
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Valor</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-blue-400">R$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={value} 
                  onChange={e => setValue(e.target.value)} 
                  className="w-full rounded-2xl border-none bg-blue-50/50 py-4 pl-12 pr-4 text-2xl font-bold text-blue-700 focus:ring-2 focus:ring-blue-500/20" 
                  placeholder="0,00" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">De (Origem)</label>
                <select 
                  required 
                  value={accountId} 
                  onChange={e => handleAccountIdChange(e.target.value)} 
                  className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Selecionar conta de origem...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Saldo: {formatCurrency(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center -my-2 relative z-10">
                <div className="h-8 w-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-blue-500">
                  <ArrowRight size={16} className="rotate-90" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Para (Destino)</label>
                <select 
                  required 
                  value={toAccountId} 
                  onChange={e => handleToAccountIdChange(e.target.value)} 
                  className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Selecionar conta de destino...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id} disabled={a.id === accountId}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isBelowThreshold && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-center gap-3 p-4 rounded-3xl bg-rose-50 border border-rose-100"
              >
                <AlertTriangle className="text-rose-500 shrink-0" size={20} />
                <div className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">
                  Atenção: Esta transferência deixará o saldo da conta abaixo do limite de segurança ({formatCurrency(selectedAccount.balanceThreshold || 0)})
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Data</label>
                <input 
                  type="date" 
                  required 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Descrição (Opcional)</label>
                <input 
                  type="text" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  className="w-full rounded-xl border-none bg-gray-50 py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500/20" 
                  placeholder="Ex: Reserva" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-xl shadow-blue-600/10 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Repeat size={20} />
                  <span>Confirmar Transferência</span>
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
