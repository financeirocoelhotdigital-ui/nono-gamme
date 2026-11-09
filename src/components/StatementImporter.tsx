import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, Loader2, Check, AlertCircle, Calendar, DollarSign, Tag, Trash2, Edit2, Save, Upload } from "lucide-react";
import { extractDataFromStatement, ExtractedStatementData, ExtractedTransaction } from "../services/statementService";
import { formatCurrency, cn } from "../lib/utils";
import { transacoes } from "../modules/transacoesModule";
import { auth } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { Account, Card, Category } from "../types";

interface StatementImporterProps {
  onClose: () => void;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
}

export const StatementImporter: React.FC<StatementImporterProps> = ({ onClose, accounts, cards, categories }) => {
  const [step, setStep] = useState<"upload" | "processing" | "confirm">("upload");
  const [extractedData, setExtractedData] = useState<ExtractedStatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<"idle" | "processing" | "finished" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [cardId, setCardId] = useState("");
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limite de 10MB para evitar timeouts excessivos
      if (file.size > 10 * 1024 * 1024) {
        setError("O arquivo é muito grande (máximo 10MB). Tente um arquivo menor.");
        return;
      }

      const reader = new FileReader();
      const mimeType = file.type || "application/octet-stream";
      
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        processFile(base64, mimeType);
      };
      reader.readAsDataURL(file);
    }
  };

  const processFile = async (base64: string, mimeType: string) => {
    if (loading) return;
    
    setStep("processing");
    setLoading(true);
    setProcessingStatus("processing");
    setError(null);
    
    try {
      const catNames = categories.map(c => c.name);
      const data = await extractDataFromStatement(base64, mimeType, catNames);
      setExtractedData(data);
      setProcessingStatus("finished");
      setStep("confirm");
    } catch (err) {
      console.error("Erro no processamento do extrato:", err);
      setProcessingStatus("error");
      setError(err instanceof Error ? err.message : "Não foi possível ler o extrato automaticamente. Verifique o arquivo e tente novamente.");
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTransaction = (index: number) => {
    if (!extractedData) return;
    const newTransactions = [...extractedData.transactions];
    newTransactions.splice(index, 1);
    setExtractedData({ ...extractedData, transactions: newTransactions });
  };

  const handleUpdateTransaction = (index: number, field: keyof ExtractedTransaction, value: any) => {
    if (!extractedData) return;
    const newTransactions = [...extractedData.transactions];
    newTransactions[index] = { ...newTransactions[index], [field]: value };
    setExtractedData({ ...extractedData, transactions: newTransactions });
  };

  const handleSaveAll = async () => {
    if (!extractedData || (!accountId && !cardId)) return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setLoading(true);
    try {
      for (const tx of extractedData.transactions) {
        const transactionData: any = {
          value: tx.value,
          type: tx.type,
          category: tx.category || "Outros",
          title: tx.description,
          description: tx.description,
          date: new Date(tx.date).toISOString(),
          notes: `Importado de extrato: ${extractedData.bankName}`,
          accountId,
          cardId,
          reconciled: true,
          createdAt: new Date().toISOString(),
          emotion: "neutro",
          essential: false
        };
        await transacoes.registrarTransacao(transactionData);
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "transactions/import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-2xl rounded-t-[40px] bg-white p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-slate-900 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <h3 className="text-xl font-bold">Importar Extrato Bancário</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 p-2"><X size={24} /></button>
        </div>

        {step === "upload" && (
          <div className="space-y-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video rounded-[32px] border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary-lime hover:bg-emerald-500/5 transition-all group"
            >
              <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload size={32} className="text-emerald-600" />
              </div>
              <div className="text-center px-6">
                <p className="font-bold text-slate-900">Selecionar arquivo de extrato</p>
                <p className="text-xs text-gray-400 mt-1">Suporta PDF, CSV, TXT e OFX</p>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".pdf,.csv,.txt,.ofx" 
              className="hidden" 
            />
            
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600">
                <AlertCircle size={20} />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-4 border-primary-lime/20 border-t-primary-lime animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                <FileText size={32} />
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-bold text-slate-900">Processando Extrato...</h4>
              <p className="text-xs text-gray-400 mt-1">A IA está analisando as transações</p>
              <div className="mt-4 px-4 py-2 rounded-full bg-gray-100 inline-block">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Status: {processingStatus === "processing" ? "Processando" : processingStatus === "finished" ? "Finalizado" : "Erro"}
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "confirm" && extractedData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Banco Detectado</p>
                <p className="text-sm font-bold text-slate-900">{extractedData.bankName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Período</p>
                <p className="text-sm font-bold text-slate-900">{extractedData.period}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Transações Detectadas ({extractedData.transactions.length})</h4>
                <button 
                  onClick={() => setShowRawText(!showRawText)}
                  className="text-[10px] font-bold text-emerald-600 hover:underline"
                >
                  {showRawText ? "Ocultar Texto" : "Ver Texto Bruto"}
                </button>
              </div>

              {showRawText && (
                <div className="p-4 rounded-2xl bg-gray-900 text-emerald-600 font-mono text-[10px] whitespace-pre-wrap max-h-40 overflow-y-auto border border-primary-lime/20 mb-4">
                  {extractedData.rawText || "Texto bruto não disponível para este processamento."}
                </div>
              )}

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {extractedData.transactions.map((tx, index) => (
                  <div key={index} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-4 group">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                      tx.type === "income" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    )}>
                      {tx.type === "income" ? <Check size={20} /> : <DollarSign size={20} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={tx.description}
                          onChange={(e) => handleUpdateTransaction(index, "description", e.target.value)}
                          className="bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0 w-full truncate"
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <input 
                          type="date" 
                          value={tx.date}
                          onChange={(e) => handleUpdateTransaction(index, "date", e.target.value)}
                          className="bg-transparent border-none p-0 text-[10px] font-bold text-gray-400 focus:ring-0"
                        />
                        <select
                          value={tx.category}
                          onChange={(e) => handleUpdateTransaction(index, "category", e.target.value)}
                          className="bg-transparent border-none p-0 text-[10px] font-bold text-emerald-600 focus:ring-0"
                        >
                          {categories.filter(c => c.type === tx.type).map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs font-bold text-gray-400">R$</span>
                        <input 
                          type="number" 
                          value={tx.value}
                          onChange={(e) => handleUpdateTransaction(index, "value", parseFloat(e.target.value))}
                          className="bg-transparent border-none p-0 text-sm font-black text-slate-900 focus:ring-0 w-20 text-right"
                        />
                      </div>
                      <button 
                        onClick={() => handleRemoveTransaction(index)}
                        className="text-rose-400 hover:text-rose-600 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Destino dos Lançamentos</label>
              <select
                value={cardId || accountId}
                onChange={e => {
                  const val = e.target.value;
                  const selectedCard = cards.find(c => c.id === val);
                  if (selectedCard) { setCardId(val); setAccountId(""); }
                  else { setAccountId(val); setCardId(""); }
                }}
                className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-primary-lime/20"
              >
                <option value="">Selecionar conta ou cartão...</option>
                <optgroup label="Contas">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </optgroup>
                <optgroup label="Cartões">
                  {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              </select>
            </div>

            <button 
              onClick={handleSaveAll}
              disabled={loading || (!accountId && !cardId) || extractedData.transactions.length === 0}
              className="w-full py-5 bg-white text-slate-900 rounded-[24px] font-black uppercase tracking-widest shadow-[0_8px_30px_rgba(0,0,0,0.04)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  <span>Importar {extractedData.transactions.length} Transações</span>
                  <Save size={20} />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
