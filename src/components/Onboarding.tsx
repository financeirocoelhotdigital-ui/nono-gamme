import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, Target, Users, Heart, Shield, Wallet } from "lucide-react";
import { db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { OnboardingData, UserProfile } from "../types";

interface OnboardingProps {
  userProfile: UserProfile;
  onComplete: (data: OnboardingData) => void;
}

export function Onboarding({ userProfile, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<OnboardingData>>({
    monthlyIncome: 0,
    fixedExpenses: 0,
    financialGoals: [],
    familyContext: "individual",
    riskTolerance: "moderado",
    mainObjective: "organizar",
  });

  const totalSteps = 5;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleFinish();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    const finalData = data as OnboardingData;
    try {
      const userRef = doc(db, "users", userProfile.uid);
      await updateDoc(userRef, {
        onboardingCompleted: true,
        onboardingData: finalData,
      });
      onComplete(finalData);
    } catch (error) {
      console.error("Error saving onboarding", error);
    }
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Wallet size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Bem-vindo, {userProfile.displayName}!</h2>
              <p className="mt-2 text-gray-500">Vamos começar configurando sua base financeira.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Renda Mensal Média (R$)</label>
                <input
                  type="number"
                  value={data.monthlyIncome || ""}
                  onChange={(e) => updateData({ monthlyIncome: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-lg focus:border-primary-green focus:outline-none focus:ring-2 focus:ring-primary-green/20"
                  placeholder="Ex: 5000"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Gastos Fixos Estimados (R$)</label>
                <input
                  type="number"
                  value={data.fixedExpenses || ""}
                  onChange={(e) => updateData({ fixedExpenses: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-lg focus:border-primary-green focus:outline-none focus:ring-2 focus:ring-primary-green/20"
                  placeholder="Ex: 3000"
                />
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Users size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Contexto Familiar</h2>
              <p className="mt-2 text-gray-500">Como você gerencia suas finanças?</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { id: "individual", label: "Individual", desc: "Gerencio apenas minhas contas" },
                { id: "casal_separado", label: "Casal (Contas Separadas)", desc: "Dividimos gastos, mas cada um tem sua conta" },
                { id: "casal_unido", label: "Casal (Conta Conjunta)", desc: "Tudo é compartilhado" },
                { id: "familia", label: "Família com Dependentes", desc: "Tenho filhos ou outros dependentes" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateData({ familyContext: item.id as any })}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                    data.familyContext === item.id ? "border-primary-green bg-primary-green/5 ring-1 ring-primary-green" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  {data.familyContext === item.id && <Check className="text-primary-green" size={20} />}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Target size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Seus Objetivos</h2>
              <p className="mt-2 text-gray-500">O que você quer alcançar primeiro?</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: "reserva", label: "Reserva de Emergência" },
                { id: "dividas", label: "Sair das Dívidas" },
                { id: "casa", label: "Casa Própria" },
                { id: "investir", label: "Começar a Investir" },
                { id: "aposentadoria", label: "Aposentadoria" },
                { id: "viagem", label: "Viagem" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    const current = data.financialGoals || [];
                    if (current.includes(item.id)) {
                      updateData({ financialGoals: current.filter((g) => g !== item.id) });
                    } else {
                      updateData({ financialGoals: [...current, item.id] });
                    }
                  }}
                  className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all ${
                    data.financialGoals?.includes(item.id) ? "border-primary-green bg-primary-green/5 ring-1 ring-primary-green" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Shield size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Perfil de Risco</h2>
              <p className="mt-2 text-gray-500">Como você lida com oscilações?</p>
            </div>
            <div className="space-y-4">
              {[
                { id: "conservador", label: "Conservador", desc: "Segurança acima de tudo. Prefiro ganhos baixos mas garantidos." },
                { id: "moderado", label: "Moderado", desc: "Aceito pequenas oscilações para ter um retorno melhor." },
                { id: "arrojado", label: "Arrojado", desc: "Busco rentabilidade máxima e aceito riscos elevados." },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateData({ riskTolerance: item.id as any })}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                    data.riskTolerance === item.id ? "border-primary-green bg-primary-green/5 ring-1 ring-primary-green" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  {data.riskTolerance === item.id && <Check className="text-primary-green" size={20} />}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Heart size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Quase lá!</h2>
              <p className="mt-2 text-gray-500">Qual sua maior dor financeira hoje?</p>
            </div>
            <div className="space-y-4">
              {[
                { id: "organizar", label: "Falta de Organização", desc: "Não sei para onde meu dinheiro vai." },
                { id: "dividas", label: "Dívidas Acumuladas", desc: "Preciso de um plano para quitar tudo." },
                { id: "poupar", label: "Dificuldade em Poupar", desc: "Gasto tudo o que ganho." },
                { id: "investir", label: "Medo de Investir", desc: "Tenho dinheiro parado e não sei o que fazer." },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateData({ mainObjective: item.id as any })}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                    data.mainObjective === item.id ? "border-primary-green bg-primary-green/5 ring-1 ring-primary-green" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  {data.mainObjective === item.id && <Check className="text-primary-green" size={20} />}
                </button>
              ))}
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white p-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex h-1 w-full gap-1 rounded-full bg-gray-100">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-full flex-1 rounded-full transition-all duration-500 ${
                i + 1 <= step ? "bg-primary-green" : "bg-transparent"
              }`}
            />
          ))}
        </div>
        <span className="ml-4 text-xs font-bold text-gray-400">
          {step}/{totalSteps}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </div>

      <div className="mt-8 flex gap-4">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 text-gray-600 transition-all hover:bg-gray-50"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <button
          onClick={handleNext}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
        >
          {step === totalSteps ? "Concluir" : "Próximo"}
          {step !== totalSteps && <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  );
}
