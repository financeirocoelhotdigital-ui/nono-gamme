import React, { useState, useEffect } from "react";
import { Transaction, Account, Card } from "../types";
import { cn, formatCurrency, formatDate, compressImage } from "../lib/utils";
import { db, auth } from "../lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { 
  X, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Repeat, 
  Smile, 
  Trash2, 
  Edit2, 
  Copy, 
  ArrowRight, 
  MessageSquare, 
  Landmark, 
  Clock, 
  Paperclip, 
  Upload, 
  History as TimelineIcon,
  CheckCircle,
  AlertCircle,
  FileText
} from "lucide-react";
import { BankIcon } from "./BankIcon";
import { getTransactionTypeIdentity } from "./TransactionItem";
import { transacoes as transacoesMod } from "../modules/transacoesModule";

interface TransactionDetailsProps {
  transaction: Transaction;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  accounts: Account[];
  cards: Card[];
  mostrarMensagem?: (msg: string) => void;
}

export function TransactionDetails({
  transaction: t,
  onClose,
  onEdit,
  onDuplicate,
  accounts,
  cards,
  mostrarMensagem
}: TransactionDetailsProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState(t.attachmentUrl || "");

  const account = accounts.find(a => a.id === t.accountId);
  const toAccount = accounts.find(a => a.id === t.toAccountId);
  const card = cards.find(c => c.id === t.cardId);
  const bankName = account?.institution || card?.bank;

  const identity = getTransactionTypeIdentity(t);
  
  // Real-time Firestore history loading
  useEffect(() => {
    async function loadHistory() {
      if (!t.id) return;
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setHistory([]);
        setLoadingHistory(false);
        return;
      }
      setLoadingHistory(true);
      try {
        const q = query(
          collection(db, "transactionHistory"), 
          where("userId", "==", uid),
          where("transactionId", "==", t.id)
        );
        const snap = await getDocs(q);
        const hList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort manually by date desc
        hList.sort((a: any, b: any) => new Date(b.date || b.timestamp || 0).getTime() - new Date(a.date || a.timestamp || 0).getTime());
        setHistory(hList);
      } catch (err) {
        console.warn("Could not fetch transaction history from Firestore:", err);
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, [t.id]);

  const handleDelete = async () => {
    if (window.confirm("Deseja excluir esta transação permanentemente? Todas as alterações de saldo serão desfeitas.")) {
      try {
        await transacoesMod.deletarTransacao(t);
        if (mostrarMensagem) mostrarMensagem("Transação excluída com sucesso.");
        onClose();
      } catch (err) {
        console.error(err);
        ((window as any).mostrarMensagem || window.alert)("Erro ao excluir transação.");
      }
    }
  };

  // Convert uploaded attachment to base64 and save to Firestore
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let base64 = "";
      if (file.type.startsWith("image/")) {
        // Automatically compress images to fit perfectly under 300KB while remaining beautiful
        base64 = await compressImage(file, 1024, 1024, 0.6);
      } else if (file.type === "application/pdf") {
        if (file.size > 500 * 1024) {
          ((window as any).mostrarMensagem || window.alert)("Documentos PDF (não imagem) devem ter no máximo 500KB para armazenamento.");
          setIsUploading(false);
          return;
        }
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });
      } else {
        ((window as any).mostrarMensagem || window.alert)("Formato de arquivo não suportado. Use imagens (JPEG, PNG) ou PDF.");
        setIsUploading(false);
        return;
      }

      // Check if size exceeds 1MB limit for safety (1MB base64 is ~750KB file size)
      if (base64.length > 1024 * 1024) {
        ((window as any).mostrarMensagem || window.alert)("O anexo comprimido ainda excede o limite permitido pelo banco de dados. Use uma imagem menor.");
        setIsUploading(false);
        return;
      }

      const docRef = doc(db, "transactions", t.id);
      await updateDoc(docRef, { attachmentUrl: base64 });
      setAttachmentUrl(base64);
      t.attachmentUrl = base64; // local update
      if (mostrarMensagem) mostrarMensagem("Comprovante/Anexo salvo com sucesso!");
    } catch (err) {
      console.error("Error saving attachment", err);
      ((window as any).mostrarMensagem || window.alert)("Erro ao salvar anexo.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-white/50 backdrop-blur-md px-4 pb-8 md:p-4">
      <div 
        className="w-full max-w-lg rounded-t-[44px] md:rounded-[44px] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-y-auto max-h-[92vh] custom-scrollbar relative" 
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Background Bar with identity theme color */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-32 opacity-15",
          identity.type === "income" ? "bg-emerald-500" :
          identity.type === "expense" ? "bg-rose-500" :
          identity.type === "transfer" ? "bg-blue-500" :
          identity.type === "debt" ? "bg-orange-500" :
          identity.type === "goal" ? "bg-purple-500" :
          identity.type === "card" ? "bg-amber-500" : "bg-teal-500"
        )} />

        <div className="relative z-10">
          <div className="flex justify-center mb-4 md:hidden">
            <div className="h-1.5 w-12 rounded-full bg-gray-200" />
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center text-slate-900 shadow-md",
                identity.type === "income" ? "bg-emerald-500 shadow-emerald-500/20" :
                identity.type === "expense" ? "bg-rose-500 shadow-rose-500/20" :
                identity.type === "transfer" ? "bg-blue-500 shadow-blue-500/20" :
                identity.type === "debt" ? "bg-orange-500 shadow-orange-500/20" :
                identity.type === "goal" ? "bg-purple-500 shadow-purple-500/20" :
                identity.type === "card" ? "bg-amber-500 shadow-amber-500/20" : "bg-teal-500 shadow-teal-500/20"
              )}>
                {React.createElement(identity.icon, { size: 24, strokeWidth: 2.5 })}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                  {identity.label}
                </h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  {t.category}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Large Value Card */}
          <div className="text-center bg-gray-50/50 rounded-[32px] border border-gray-100/50 py-8 mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Valor da Movimentação</p>
            <div className={cn(
              "text-4xl md:text-5xl font-black tracking-tighter",
              t.type === "income" ? "text-emerald-600" :
              t.type === "transfer" ? "text-blue-600" : "text-rose-600"
            )}>
              {t.type === "income" ? "+" : t.type === "transfer" ? "" : "-"}{formatCurrency(t.value)}
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-400 mt-2">
              <Calendar size={13} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {new Date(t.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Parameters Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <Landmark size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Conta / Origem</span>
              </div>
              <div className="flex items-center gap-2">
                {bankName && <BankIcon bankName={bankName} className="h-5 w-5" size={10} />}
                <span className="text-xs font-black text-slate-900 truncate">{account?.name || card?.name || "Não selecionada"}</span>
              </div>
            </div>

            {t.type === "transfer" ? (
              <div className="p-4 rounded-3xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-1.5 text-blue-500 mb-1">
                  <ArrowRight size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Destino</span>
                </div>
                <div className="flex items-center gap-2">
                  {toAccount?.institution && <BankIcon bankName={toAccount.institution} className="h-5 w-5" size={10} />}
                  <span className="text-xs font-black text-blue-700 truncate">{toAccount?.name || "Sem destino"}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                  <Smile size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Sentimento</span>
                </div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  {t.emotion || "Racional"}
                </span>
              </div>
            )}
          </div>

          {/* Observations Box */}
          {t.notes && (
            <div className="mb-6 p-5 rounded-3xl bg-emerald-500/5 border border-primary-lime/15 relative">
              <MessageSquare size={16} className="absolute -top-2 -left-2 text-emerald-600 bg-white rounded-full p-0.5" />
              <p className="text-xs text-slate-900 font-medium leading-relaxed italic">"{t.notes}"</p>
            </div>
          )}

          {/* Attachments Section - real base64 upload and download */}
          <div className="mb-6 p-5 rounded-[32px] border border-gray-100 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip size={14} className="text-slate-900" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Comprovante / Anexo</span>
              </div>
              {isUploading && (
                <span className="text-[9px] font-bold text-gray-400 animate-pulse">Carregando...</span>
              )}
            </div>

            {attachmentUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border border-gray-100 max-h-40 bg-gray-50 flex items-center justify-center">
                  {attachmentUrl.startsWith("data:image") ? (
                    <img 
                      src={attachmentUrl} 
                      alt="Comprovante" 
                      className="object-contain max-h-40 w-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="p-4 text-center">
                      <FileText className="mx-auto text-slate-900 mb-1" size={24} />
                      <span className="text-[10px] font-bold text-gray-400">Documento Anexado</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <a 
                    href={attachmentUrl} 
                    download={`comprovante_${t.id}`}
                    className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-700 text-center active:scale-95 transition-transform"
                  >
                    Baixar
                  </a>
                  <button 
                    onClick={async () => {
                      if (confirm("Remover comprovante?")) {
                        try {
                          await updateDoc(doc(db, "transactions", t.id), { attachmentUrl: "" });
                          setAttachmentUrl("");
                          t.attachmentUrl = "";
                          if (mostrarMensagem) mostrarMensagem("Anexo removido.");
                        } catch (err) {
                          ((window as any).mostrarMensagem || window.alert)("Erro ao remover anexo.");
                        }
                      }
                    }}
                    className="py-2 px-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl py-6 hover:bg-gray-50 cursor-pointer transition-colors">
                <Upload size={18} className="text-gray-400 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Enviar Comprovante</span>
                <span className="text-[8px] text-gray-300 mt-0.5">Imagens (autocomprimidas) ou PDF até 500KB</span>
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            )}
          </div>

          {/* Timeline History Section */}
          <div className="mb-8 p-5 rounded-[32px] border border-gray-100 bg-white space-y-3">
            <div className="flex items-center gap-2">
              <TimelineIcon size={14} className="text-slate-900" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Histórico de Alterações</span>
            </div>

            {loadingHistory ? (
              <div className="text-center py-4 text-[10px] text-gray-400 font-bold animate-pulse">Carregando histórico...</div>
            ) : history.length > 0 ? (
              <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-1 pt-1">
                {history.map((h, i) => (
                  <div key={h.id} className="relative pl-5 border-l-2 border-gray-100 last:border-l-0 pb-2">
                    <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-white border-2 border-white" />
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-extrabold text-slate-900 capitalize">{h.action === "created" ? "Criado" : h.action === "edited" ? "Editado" : h.action}</span>
                      <span className="font-medium text-gray-400">{new Date(h.date).toLocaleDateString("pt-BR")} - {new Date(h.date).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{h.description}</p>
                    
                    {h.changes && h.changes.length > 0 && (
                      <div className="mt-1 space-y-0.5 pl-2 border-l border-gray-200">
                        {h.changes.map((c: any, ci: number) => (
                          <div key={ci} className="text-[9px] text-gray-400">
                            <span className="font-bold">{c.field}:</span> {c.oldValue !== undefined ? `${c.oldValue} ➔ ` : ""}<span className="text-slate-900 font-extrabold">{c.newValue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-[10px] text-gray-400 font-bold">Nenhuma alteração registrada.</div>
            )}
            
            <div className="text-[9px] text-gray-400 font-bold flex items-center gap-1 pt-1">
              <Clock size={10} />
              <span>Criado em {new Date(t.createdAt || t.date).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button 
              onClick={handleDelete} 
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 transition-transform"
              title="Excluir Transação"
            >
              <Trash2 size={18} />
              <span className="text-[8px] font-black uppercase tracking-widest">Excluir</span>
            </button>
            <button 
              onClick={onEdit} 
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-gray-50 text-gray-600 hover:bg-gray-100 active:scale-95 transition-transform"
              title="Editar Transação"
            >
              <Edit2 size={18} />
              <span className="text-[8px] font-black uppercase tracking-widest">Editar</span>
            </button>
            <button 
              onClick={onDuplicate} 
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 transition-transform"
              title="Duplicar Transação"
            >
              <Copy size={18} />
              <span className="text-[8px] font-black uppercase tracking-widest">Duplicar</span>
            </button>
            <button 
              onClick={onClose} 
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-transform shadow-lg shadow-emerald-600/10"
              title="Fechar Detalhes"
            >
              <ArrowRight size={18} />
              <span className="text-[8px] font-black uppercase tracking-widest">Fechar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
