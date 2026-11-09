import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, AlertCircle, Coins, Lightbulb, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UserProfile } from "../types";
import { useTransacoes } from "../context/TransacoesContext";
import { useOrcamento } from "../context/OrcamentoContext";
import { generateTipOfTheDay, TipOfTheDay } from "../services/geminiService";

interface DicaDoDiaProps {
  userProfile: UserProfile;
}

export function DicaDoDia({ userProfile }: DicaDoDiaProps) {
  const { transactions, loading: transacoesLoading } = useTransacoes();
  const { budgets, loading: orcamentoLoading } = useOrcamento();

  const [tip, setTip] = useState<TipOfTheDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTodayKey = () => {
    const today = new Date().toISOString().split("T")[0];
    return `finassist_tip_${userProfile.uid || "default"}_${today}`;
  };

  const fetchTip = async (forceRefresh = false) => {
    if (transacoesLoading || orcamentoLoading) return;

    setLoading(true);
    setError(null);

    try {
      const todayKey = getTodayKey();
      const cached = localStorage.getItem(todayKey);

      if (cached && !forceRefresh) {
        setTip(JSON.parse(cached));
        setLoading(false);
        return;
      }

      // Generate a new one using the Gemini SDK on the client (Vite-defined process.env)
      const generatedTip = await generateTipOfTheDay(userProfile, transactions, budgets);
      
      setTip(generatedTip);
      localStorage.setItem(todayKey, JSON.stringify(generatedTip));
    } catch (err: any) {
      console.warn("Notice ao gerar a dica do dia:", err);
      setError("Não foi possível gerar uma dica personalizada no momento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!transacoesLoading && !orcamentoLoading && !tip && !loading) {
      fetchTip();
    }
  }, [transacoesLoading, orcamentoLoading, userProfile]);

  const handleRefresh = () => {
    fetchTip(true);
  };

  return (
    <div className="w-full" id="dica-do-dia-container">
      <AnimatePresence mode="wait">
        {loading || transacoesLoading || orcamentoLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full bg-gradient-to-r from-primary-dark/95 to-primary-dark/80 rounded-3xl p-6 border border-gray-50 relative overflow-hidden shadow-xl"
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-gray-50 flex items-center justify-center text-emerald-600 animate-pulse">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-white/10 rounded-full w-1/3 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-white/5 rounded-full w-full animate-pulse"></div>
                  <div className="h-3 bg-white/5 rounded-full w-5/6 animate-pulse"></div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full bg-rose-500/10 rounded-3xl p-5 border border-rose-500/20 text-rose-200 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-rose-400 flex-shrink-0" />
              <p className="text-xs font-medium">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 bg-rose-500/20 rounded-xl hover:bg-rose-500/30 transition-all text-rose-300"
              title="Tentar Novamente"
            >
              <RefreshCw size={16} />
            </button>
          </motion.div>
        ) : tip ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full bg-gradient-to-br from-primary-dark via-[#181a25] to-primary-dark/95 rounded-3xl p-6 border border-gray-50 shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden"
          >
            {/* Background glowing circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-green/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-start justify-between gap-4 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-lime/20 to-primary-green/10 border border-primary-lime/20 flex items-center justify-center text-emerald-600 shadow-inner flex-shrink-0">
                  <Lightbulb size={24} className="text-emerald-600 drop-shadow-[0_0_8px_rgba(180,244,97,0.4)]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Dica do Dia
                    </span>
                    {tip.category && (
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-900/40 bg-white/5 px-2 py-0.5 rounded-md border border-gray-50">
                        {tip.category}
                      </span>
                    )}
                    {tip.estimatedSavings && (
                      <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10 flex items-center gap-1">
                        <Coins size={10} />
                        Economiza {tip.estimatedSavings}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug mb-1">
                    {tip.title}
                  </h3>
                  <p className="text-sm text-slate-900/70 font-medium leading-relaxed">
                    {tip.tip}
                  </p>
                </div>
              </div>

              <button
                onClick={handleRefresh}
                disabled={loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-900/60 hover:text-slate-900 border border-gray-50 transition-all cursor-pointer flex-shrink-0"
                title="Gerar outra sugestão"
              >
                <RefreshCw size={15} className={loading ? "animate-spin text-emerald-600" : ""} />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
