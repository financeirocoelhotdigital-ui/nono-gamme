import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Loader2, Check, AlertCircle, Store, Calendar, DollarSign, Tag, ChevronRight, Image as ImageIcon } from "lucide-react";
import { extractDataFromReceipt, ExtractedReceiptData } from "../services/ocrService";
import { formatCurrency, cn } from "../lib/utils";
import { transacoes } from "../modules/transacoesModule";
import { auth } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { Account, Card, Category, Emotion } from "../types";

interface ReceiptScannerProps {
  onClose: () => void;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onClose, accounts, cards, categories }) => {
  const [step, setStep] = useState<"capture" | "processing" | "confirm">("capture");
  const [image, setImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [cardId, setCardId] = useState("");
  const [emotion, setEmotion] = useState<Emotion>("neutro");
  const [essential, setEssential] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        processImage(base64.split(",")[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setStep("processing");
    setLoading(true);
    setError(null);
    try {
      const catNames = categories.filter(c => c.type === "expense").map(c => c.name);
      
      const data = await extractDataFromReceipt(base64, catNames);
      
      setExtractedData(data);
      setStep("confirm");
    } catch (err) {
      console.error("Erro no OCR:", err);
      setError("Não foi possível ler a nota automaticamente. Você pode tentar novamente ou preencher manualmente.");
      // Fallback: allow manual entry if OCR fails by setting empty data
      setExtractedData({
        establishment: "",
        date: new Date().toISOString().split("T")[0],
        total: 0,
        items: [],
        rawText: "Falha na extração automática."
      });
      setStep("confirm");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData || (!accountId && !cardId)) return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setLoading(true);
    try {
      const transactionData: any = {
        value: extractedData.total,
        type: "expense",
        category: extractedData.category || "Outros",
        establishment: extractedData.establishment,
        date: new Date(extractedData.date).toISOString(),
        notes: `Nota Fiscal - ${extractedData.establishment}`,
        accountId,
        cardId,
        emotion,
        essential,
        reconciled: false,
        createdAt: new Date().toISOString(),
        items: extractedData.items
      };

      await transacoes.registrarTransacao(transactionData);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "transactions/expense");
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
        className="w-full max-w-lg rounded-t-[40px] bg-white p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-slate-900 flex items-center justify-center">
              <Camera size={20} />
            </div>
            <h3 className="text-xl font-bold">Capturar Nota Fiscal</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 p-2"><X size={24} /></button>
        </div>

        {step === "capture" && (
          <div className="space-y-6">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video rounded-[32px] border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary-lime hover:bg-emerald-500/5 transition-all group"
            >
              <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera size={32} className="text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-900">Tirar foto da nota</p>
                <p className="text-xs text-gray-400">Posicione a nota em local iluminado</p>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleCapture} 
              accept="image/*" 
              capture="environment" 
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
                <Sparkles size={32} />
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-bold text-slate-900">Lendo Nota Fiscal...</h4>
              <p className="text-xs text-gray-400 mt-1">Extraindo valores e produtos com IA</p>
            </div>
          </div>
        )}

        {step === "confirm" && extractedData && (
          <div className="space-y-6">
            {/* Debug Visual Section */}
            <div className="space-y-2">
              <button 
                onClick={() => setShowRawText(!showRawText)}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full hover:bg-emerald-50 transition-colors"
              >
                {showRawText ? "Ocultar Texto Detectado" : "Ver Texto Detectado (Debug)"}
              </button>
              
              <AnimatePresence>
                {showRawText && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 rounded-2xl bg-gray-900 text-emerald-600 font-mono text-[10px] whitespace-pre-wrap max-h-40 overflow-y-auto border border-primary-lime/20">
                      <p className="text-slate-900/50 mb-2 uppercase tracking-widest font-black">Texto detectado:</p>
                      {extractedData.rawText || "Nenhum texto bruto retornado."}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-6 rounded-[32px] bg-gray-50 border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-gray-400">
                    <Store size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estabelecimento</span>
                    <input 
                      type="text"
                      value={extractedData.establishment}
                      onChange={e => setExtractedData({...extractedData, establishment: e.target.value})}
                      className="block w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-sm font-bold text-slate-900">R$</span>
                    <input 
                      type="number"
                      value={extractedData.total}
                      onChange={e => setExtractedData({...extractedData, total: parseFloat(e.target.value)})}
                      className="w-20 bg-transparent border-none p-0 text-lg font-black text-slate-900 focus:ring-0 text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-gray-400">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</span>
                    <input 
                      type="date"
                      value={extractedData.date}
                      onChange={e => setExtractedData({...extractedData, date: e.target.value})}
                      className="block w-full bg-transparent border-none p-0 text-xs font-bold text-slate-900 focus:ring-0"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-gray-400">
                    <Tag size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoria</span>
                    <select 
                      value={extractedData.category}
                      onChange={e => setExtractedData({...extractedData, category: e.target.value})}
                      className="block w-full bg-transparent border-none p-0 text-xs font-bold text-slate-900 focus:ring-0"
                    >
                      {categories.filter(c => c.type === "expense").map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {extractedData.items.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Produtos Identificados</h4>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {extractedData.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 border border-gray-100">
                      <span className="text-xs font-bold text-slate-900 truncate flex-1 mr-4">{item.name}</span>
                      <span className="text-xs font-black text-slate-900">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Pagamento</label>
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
                  <option value="">Selecionar...</option>
                  <optgroup label="Contas">
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </optgroup>
                  <optgroup label="Cartões">
                    {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Emoção</label>
                <select
                  value={emotion}
                  onChange={e => setEmotion(e.target.value as Emotion)}
                  className="w-full rounded-2xl border-none bg-gray-50 py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-primary-lime/20"
                >
                  <option value="feliz">Feliz</option>
                  <option value="neutro">Neutro</option>
                  <option value="triste">Triste</option>
                  <option value="ansioso">Ansioso</option>
                  <option value="irritado">Irritado</option>
                  <option value="empolgado">Empolgado</option>
                  <option value="estressado">Estressado</option>
                  <option value="racional">Racional</option>
                  <option value="culpado">Culpado</option>
                  <option value="inseguro">Inseguro</option>
                  <option value="motivado">Motivado</option>
                  <option value="impulsivo">Impulsivo</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors">
              <input 
                type="checkbox" 
                checked={essential}
                onChange={e => setEssential(e.target.checked)}
                className="h-5 w-5 rounded-lg border-gray-300 text-rose-500 focus:ring-rose-500"
              />
              <div className="flex-1">
                <span className="block text-xs font-bold text-slate-900">Gasto Essencial</span>
                <span className="text-[10px] text-gray-400">Marque se for uma despesa necessária</span>
              </div>
            </label>

            <button 
              onClick={handleSave}
              disabled={loading || (!accountId && !cardId)}
              className="w-full py-5 bg-white text-slate-900 rounded-[24px] font-black uppercase tracking-widest shadow-[0_8px_30px_rgba(0,0,0,0.04)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  <span>Confirmar e Salvar</span>
                  <Check size={20} />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const Sparkles: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);
