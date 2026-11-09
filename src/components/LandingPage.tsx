import React, { useState } from "react";
import {
  Wallet,
  ArrowRight,
  Sparkles,
  Shield,
  ShieldCheck,
  CreditCard,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  CheckCircle2,
  Lock,
  Smartphone,
  ChevronDown,
  ArrowUpRight,
  MessageSquare,
  Users,
  Star,
  Zap,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  Clock,
  Coins,
  Receipt,
  X,
  Menu,
  Send,
  Sliders,
  DollarSign,
  Monitor
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MobileAppMockup from "./MobileAppMockup";

interface LandingPageProps {
  onGoToLogin: () => void;
  isLoggedIn?: boolean;
  onGoToApp?: () => void;
}

export default function LandingPage({ onGoToLogin, isLoggedIn, onGoToApp }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showcaseDevice, setShowcaseDevice] = useState<"desktop" | "mobile">("desktop");
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<"dashboard" | "cards" | "piggy" | "ai" | "cashflow">("dashboard");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [calcMonthly, setCalcMonthly] = useState<number>(500);
  const [calcMonths, setCalcMonths] = useState<number>(12);

  // CDI return simulation (approx 10.5% a.a. / ~0.83% a.m.)
  const calculateInvestment = (monthly: number, months: number) => {
    const monthlyRate = 0.0084;
    let totalInvested = 0;
    let balance = 0;
    for (let i = 1; i <= months; i++) {
      totalInvested += monthly;
      balance = (balance + monthly) * (1 + monthlyRate);
    }
    const earnings = balance - totalInvested;
    return {
      totalInvested,
      finalBalance: balance,
      earnings
    };
  };

  const simResult = calculateInvestment(calcMonthly, calcMonths);

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-slate-900 font-sans selection:bg-emerald-500/20 overflow-x-hidden">
      {/* Top Banner if user is already logged in */}
      {isLoggedIn && (
        <div className="bg-emerald-600 text-white text-xs font-bold py-2.5 px-4 text-center flex items-center justify-center gap-3">
          <span>Você já está conectado ao Bolso+.</span>
          <button
            onClick={onGoToApp}
            className="underline underline-offset-4 hover:text-emerald-100 flex items-center gap-1 font-black"
          >
            Ir para o Painel <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-3.5 cursor-pointer py-1" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-200/70 flex items-center justify-center">
              <img src="/logo.png" alt="Bolso+" className="h-10 sm:h-12 w-10 sm:w-12 object-contain" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
                  Bolso<span className="text-emerald-600">+</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 uppercase tracking-wide">
                  Plataforma Financeira
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Seu Dinheiro Mais Perto
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <button onClick={() => scrollToSection("demonstracao")} className="hover:text-emerald-700 transition-colors">
              Demonstração
            </button>
            <button onClick={() => scrollToSection("recursos")} className="hover:text-emerald-700 transition-colors">
              Recursos & Módulos
            </button>
            <button onClick={() => scrollToSection("comparativo")} className="hover:text-emerald-700 transition-colors">
              Comparativo
            </button>
            <button onClick={() => scrollToSection("acesso")} className="hover:text-emerald-700 transition-colors">
              Acesso & Segurança
            </button>
            <button onClick={() => scrollToSection("faq")} className="hover:text-emerald-700 transition-colors">
              Perguntas Frequentes
            </button>
          </nav>

          {/* Action CTAs & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <button
                onClick={onGoToApp}
                className="h-9 sm:h-10 px-3.5 sm:px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm tracking-wide flex items-center gap-1.5 sm:gap-2 transition-colors active:scale-98"
              >
                <span>Acessar Painel</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button
                  onClick={onGoToLogin}
                  className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg text-slate-700 hover:text-emerald-800 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition-colors"
                >
                  Entrar
                </button>
                <button
                  onClick={onGoToLogin}
                  className="hidden min-[480px]:inline-flex h-9 sm:h-10 px-3.5 sm:px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm tracking-wide items-center gap-1.5 sm:gap-2 shadow-xs transition-colors active:scale-98"
                >
                  <span>Começar Grátis</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 transition-colors"
              aria-label="Abrir menu de navegação"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 py-5 shadow-xl"
            >
              <div className="flex flex-col space-y-3 mb-5">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    scrollToSection("demonstracao");
                  }}
                  className="flex items-center justify-between text-left py-2.5 px-3 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span>Demonstração Interativa</span>
                  <ArrowRight size={14} className="text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    scrollToSection("recursos");
                  }}
                  className="flex items-center justify-between text-left py-2.5 px-3 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span>Recursos & Módulos</span>
                  <ArrowRight size={14} className="text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    scrollToSection("comparativo");
                  }}
                  className="flex items-center justify-between text-left py-2.5 px-3 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span>Matriz Comparativa</span>
                  <ArrowRight size={14} className="text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    scrollToSection("acesso");
                  }}
                  className="flex items-center justify-between text-left py-2.5 px-3 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span>Acesso & Segurança</span>
                  <ArrowRight size={14} className="text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    scrollToSection("faq");
                  }}
                  className="flex items-center justify-between text-left py-2.5 px-3 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span>Perguntas Frequentes</span>
                  <ArrowRight size={14} className="text-slate-400" />
                </button>
              </div>

              {/* Mobile Menu Action CTAs */}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                {isLoggedIn ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onGoToApp?.();
                    }}
                    className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <span>Ir para o Painel</span>
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onGoToLogin();
                      }}
                      className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <span>Começar Gratuitamente</span>
                      <ArrowRight size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onGoToLogin();
                      }}
                      className="w-full h-11 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm flex items-center justify-center transition-colors"
                    >
                      Entrar na Minha Conta
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative pt-10 pb-16 sm:pt-16 sm:pb-24 overflow-hidden border-b border-slate-200/80 bg-white">
        {/* Subtle engineering grid texture for high-credibility feel */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-70 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Copy & Actions */}
            <div className="lg:col-span-7 text-center lg:text-left">
              {/* Compliance / Status Pill */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                <span className="text-slate-900 font-bold">Padrão Open Finance Brasil</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">Sincronização Multi-Contas & Cartões</span>
              </motion.div>

              {/* Main Headline - High contrast, solid typography, zero AI gradient text */}
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-[54px] font-black text-slate-950 tracking-tight leading-[1.12] mb-5"
              >
                Gestão financeira completa com precisão e controle real.
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed mb-6 max-w-2xl mx-auto lg:mx-0"
              >
                Centralize contas bancárias, conciliação de faturas de múltiplos cartões de crédito, fluxo de caixa futuro e planejamento orçamentário em um ecossistema seguro, projetado para empresas e pessoas físicas exigentes.
              </motion.p>

              {/* Key Highlights Checklist */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="space-y-3 mb-8 max-w-xl mx-auto lg:mx-0 text-left"
              >
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                  </div>
                  <span><strong>Visão Consolidada:</strong> Saldo atualizado de todos os seus bancos em um painel unificado.</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                  </div>
                  <span><strong>Cartões & Fechamento:</strong> Projeção de parcelas futuras e identificação do melhor dia de compra.</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                  </div>
                  <span><strong>Cofrinhos com Rentabilidade CDI:</strong> Cálculo automático de juros compostos para reservas e metas.</span>
                </div>
              </motion.div>

              {/* Call to Actions */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 mb-8"
              >
                <button
                  onClick={onGoToLogin}
                  className="w-full sm:w-auto h-13 px-8 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-sm transition-colors active:scale-98"
                >
                  <span>Iniciar Gratuitamente</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => scrollToSection("demonstracao")}
                  className="w-full sm:w-auto h-13 px-6 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Explorar Demonstração</span>
                  <ChevronDown size={16} />
                </button>
              </motion.div>

              {/* Verified Institutional Security Credentials */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-medium"
              >
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-emerald-700" />
                  <span>Criptografia AES-256</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-emerald-700" />
                  <span>Conformidade com LGPD</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <span>Sem Anúncios ou Venda de Dados</span>
                </div>
              </motion.div>
            </div>

            {/* Right Column: High-Fidelity Mobile Hardware Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-5 flex flex-col items-center justify-center relative"
            >
              <MobileAppMockup onCtaClick={onGoToLogin} />
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Smartphone size={14} className="text-emerald-700" />
                <span>Simulação interativa da interface mobile PWA</span>
              </div>
            </motion.div>
          </div>

          {/* Institutional Bank Compatibility Strip */}
          <div className="mt-16 pt-10 border-t border-slate-200/80">
            <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
              Compatível com as principais instituições financeiras do Brasil
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 opacity-85">
              {[
                { name: "Nubank", tag: "Nu" },
                { name: "Itaú Unibanco", tag: "Itaú" },
                { name: "Bradesco", tag: "Bradesco" },
                { name: "Santander", tag: "Santander" },
                { name: "Banco do Brasil", tag: "BB" },
                { name: "Banco Inter", tag: "Inter" },
                { name: "BTG Pactual", tag: "BTG" },
                { name: "C6 Bank", tag: "C6" },
                { name: "XP Investimentos", tag: "XP" }
              ].map((bank, i) => (
                <div
                  key={i}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 flex items-center gap-2 shadow-2xs hover:bg-slate-100 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>{bank.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive App Showcase Window */}
      <section id="demonstracao" className="py-16 sm:py-24 bg-white border-y border-slate-100 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Experiência Real
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-3">
              Veja o Bolso+ por dentro
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Clique nas abas abaixo para explorar os principais módulos do aplicativo em tempo real.
            </p>
          </div>

          {/* Device & Tabs Switcher */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-2xs max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => setShowcaseDevice("desktop")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  showcaseDevice === "desktop"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Monitor size={15} className="shrink-0" />
                <span className="hidden min-[420px]:inline">Visão </span>
                <span>Computador</span>
              </button>
              <button
                type="button"
                onClick={() => setShowcaseDevice("mobile")}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  showcaseDevice === "mobile"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Smartphone size={15} className="shrink-0" />
                <span className="hidden min-[420px]:inline">Visão </span>
                <span>Celular</span>
              </button>
            </div>

            {/* Function Selector Tabs (Active for both Desktop and Mobile) */}
            <div className="flex overflow-x-auto no-scrollbar sm:flex-wrap items-center justify-start sm:justify-center gap-1.5 sm:gap-2 p-1.5 bg-slate-100 rounded-xl w-full max-w-full sm:max-w-3xl mx-auto border border-slate-200/80">
              <button
                onClick={() => setActiveShowcaseTab("dashboard")}
                className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeShowcaseTab === "dashboard"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart3 size={14} className="shrink-0" />
                <span>Visão Geral</span>
              </button>
              <button
                onClick={() => setActiveShowcaseTab("cards")}
                className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeShowcaseTab === "cards"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CreditCard size={14} className="shrink-0" />
                <span>Gestão de Cartões</span>
              </button>
              <button
                onClick={() => setActiveShowcaseTab("piggy")}
                className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeShowcaseTab === "piggy"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <PiggyBank size={14} className="shrink-0" />
                <span>Cofrinhos & CDI</span>
              </button>
              <button
                onClick={() => setActiveShowcaseTab("ai")}
                className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeShowcaseTab === "ai"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Shield size={14} className="shrink-0" />
                <span>Diagnóstico Orçamentário</span>
              </button>
              <button
                onClick={() => setActiveShowcaseTab("cashflow")}
                className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeShowcaseTab === "cashflow"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TrendingUp size={14} className="shrink-0" />
                <span>Fluxo de Caixa</span>
              </button>
            </div>
          </div>

          {showcaseDevice === "desktop" ? (
            /* Interactive Window Mockup */
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200/90 overflow-hidden">
              {/* Window Top bar */}
              <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-300" />
                  </div>
                  <span className="text-slate-500 text-[10px] sm:text-[11px] ml-1 sm:ml-2 font-mono font-medium truncate max-w-[130px] min-[400px]:max-w-[200px] sm:max-w-none">app.bolsomais.com.br/painel</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 sm:px-3 py-1 rounded-md border border-emerald-200/80 shrink-0">
                  <CheckCircle2 size={12} className="text-emerald-700 shrink-0" />
                  <span className="hidden min-[480px]:inline">Simulação </span>
                  <span>Interativa</span>
                </div>
              </div>

            {/* Window Content Display */}
            <div className="bg-[#F8FAF9] rounded-2xl p-3.5 sm:p-6 lg:p-8 min-h-[420px] sm:min-h-[460px] text-slate-900">
              <AnimatePresence mode="wait">
                {activeShowcaseTab === "dashboard" && (
                  <motion.div
                    key="tab-dash"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                        <span className="text-xs font-bold text-slate-500 block mb-1">Saldo Total Consolidado</span>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          R$ 28.450,80
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
                          <TrendingUp size={13} />
                          <span>+14.2% em relação ao mês anterior</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                        <span className="text-xs font-bold text-slate-500 block mb-1">Receitas do Mês</span>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                          + R$ 12.800,00
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 mt-2 block">
                          Salário, Rendimentos e Extras
                        </span>
                      </div>

                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                        <span className="text-xs font-bold text-slate-500 block mb-1">Despesas do Mês</span>
                        <div className="text-2xl sm:text-3xl font-black text-rose-500 tracking-tight">
                          - R$ 5.430,20
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                          <div className="bg-rose-500 h-full w-[42%]" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 block">42% do orçamento mensal</span>
                      </div>
                    </div>

                    {/* Lower split */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Accounts snapshot */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-extrabold text-slate-900">Contas Bancárias</h4>
                          <span className="text-xs font-bold text-emerald-600">3 ativas</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                                Nu
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">Nubank Conta</p>
                                <p className="text-[10px] text-slate-500">Reserva e Gastos Diários</p>
                              </div>
                            </div>
                            <span className="text-xs font-black text-slate-900">R$ 11.230,50</span>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-orange-500 text-white font-bold flex items-center justify-center text-xs">
                                It
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">Itaú Personnalité</p>
                                <p className="text-[10px] text-slate-500">Conta Corrente Principal</p>
                              </div>
                            </div>
                            <span className="text-xs font-black text-slate-900">R$ 16.340,30</span>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                                $
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">Carteira Física</p>
                                <p className="text-[10px] text-slate-500">Dinheiro em Espécie</p>
                              </div>
                            </div>
                            <span className="text-xs font-black text-slate-900">R$ 880,00</span>
                          </div>
                        </div>
                      </div>

                      {/* Recent transactions */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-extrabold text-slate-900">Últimas Movimentações</h4>
                          <span className="text-xs font-bold text-slate-400">Tempo real</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <TrendingUp size={15} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">Consultoria de Projetos</p>
                                <p className="text-[10px] text-slate-400">Hoje • Receita</p>
                              </div>
                            </div>
                            <span className="font-extrabold text-emerald-600">+ R$ 3.500,00</span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                                <TrendingDown size={15} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">Supermercado Pão de Açúcar</p>
                                <p className="text-[10px] text-slate-400">Ontem • Alimentação</p>
                              </div>
                            </div>
                            <span className="font-extrabold text-rose-600">- R$ 412,80</span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                                <PiggyBank size={15} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">Aporte Cofrinho Viagem</p>
                                <p className="text-[10px] text-slate-400">10/Set • Meta</p>
                              </div>
                            </div>
                            <span className="font-extrabold text-blue-600">R$ 500,00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeShowcaseTab === "cards" && (
                  <motion.div
                    key="tab-cards"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
                  >
                    {/* Simulated Credit Card Graphic */}
                    <div className="bg-gradient-to-tr from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex justify-between items-start mb-8 relative z-10">
                        <div>
                          <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Cartão de Crédito</span>
                          <h4 className="text-xl font-black mt-0.5">Nubank Ultravioleta</h4>
                        </div>
                        <CreditCard size={28} className="text-purple-300" />
                      </div>

                      <div className="space-y-3 relative z-10 my-6">
                        <div className="flex justify-between text-xs text-slate-300 font-medium">
                          <span>Fatura Atual</span>
                          <span className="font-black text-white text-sm">R$ 2.840,90</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-purple-400 h-full w-[38%]" />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Limite Disp.: R$ 12.159,10</span>
                          <span>Limite Total: R$ 15.000,00</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-between items-end gap-2 pt-4 border-t border-white/10 relative z-10 text-xs">
                        <div>
                          <p className="text-[10px] text-purple-300 uppercase font-bold">Fechamento</p>
                          <p className="font-bold text-[11px] sm:text-xs">Dia 24 • Fecha em 12 dias</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-purple-300 uppercase font-bold">Vencimento</p>
                          <p className="font-bold text-[11px] sm:text-xs">Dia 01 do mês</p>
                        </div>
                        <span className="bg-purple-500/30 text-purple-200 border border-purple-400/40 text-[10px] font-bold px-2 py-1 rounded-lg shrink-0">
                          Melhor dia: 25
                        </span>
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                        Nunca mais se perca com faturas parceladas.
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        O Bolso+ projeta todas as parcelas futuras de cada cartão, avisa quando sua fatura fecha e indica
                        o melhor dia de compra para você ganhar até 40 dias de prazo sem pagar juros.
                      </p>

                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80">
                          <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                          <span className="text-xs font-bold text-slate-800">
                            Cálculo automático de compras parceladas mês a mês
                          </span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80">
                          <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                          <span className="text-xs font-bold text-slate-800">
                            Avisos de fechamento e vencimento de fatura
                          </span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80">
                          <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                          <span className="text-xs font-bold text-slate-800">
                            Suporte para múltiplos cartões de bancos diferentes
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeShowcaseTab === "piggy" && (
                  <motion.div
                    key="tab-piggy"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
                  >
                    {/* Simulated Piggy Bank Card */}
                    <div className="space-y-4">
                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                              🛡️
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900">Reserva de Emergência</h4>
                              <p className="text-[11px] text-slate-500">6 meses de custo de vida</p>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            75% concluída
                          </span>
                        </div>

                        <div className="space-y-2 mt-4">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-600">Saldo Atual: R$ 37.500,00</span>
                            <span className="font-black text-slate-900">Meta: R$ 50.000,00</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[75%]" />
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                            <span>Rendimento estimado: ~R$ 315/mês (100% CDI)</span>
                            <span className="font-bold text-emerald-600">Faltam R$ 12.500,00</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                              ✈️
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900">Viagem em Família</h4>
                              <p className="text-[11px] text-slate-500">Férias de Julho</p>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                            52% concluída
                          </span>
                        </div>

                        <div className="space-y-2 mt-4">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-600">Saldo Atual: R$ 10.400,00</span>
                            <span className="font-black text-slate-900">Meta: R$ 20.000,00</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div className="bg-blue-500 h-full w-[52%]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive CDI Simulator */}
                    <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white rounded-3xl p-6 border border-emerald-200/70">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-2">
                        <Coins size={16} className="text-emerald-600" />
                        <span>Simulador de Cofrinho (100% CDI)</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 mb-4">
                        Veja o poder dos seus aportes mensais
                      </h4>

                      <div className="space-y-4 text-xs font-bold text-slate-700">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Aporte Mensal:</span>
                            <span className="text-emerald-700 font-extrabold">{formatBRL(calcMonthly)}</span>
                          </div>
                          <input
                            type="range"
                            min={100}
                            max={5000}
                            step={100}
                            value={calcMonthly}
                            onChange={(e) => setCalcMonthly(Number(e.target.value))}
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span>Prazo:</span>
                            <span className="text-emerald-700 font-extrabold">{calcMonths} meses</span>
                          </div>
                          <input
                            type="range"
                            min={3}
                            max={60}
                            step={3}
                            value={calcMonths}
                            onChange={(e) => setCalcMonths(Number(e.target.value))}
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                        </div>

                        <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-xs space-y-2 mt-4">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Total Investido:</span>
                            <span className="font-bold text-slate-800">{formatBRL(simResult.totalInvested)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-emerald-600">
                            <span>Rendimento com Juros:</span>
                            <span className="font-extrabold">+{formatBRL(simResult.earnings)}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-black text-slate-950">
                            <span>Montante Final:</span>
                            <span className="text-emerald-600">{formatBRL(simResult.finalBalance)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeShowcaseTab === "ai" && (
                  <motion.div
                    key="tab-ai"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {/* Executive Financial Health & Audit Panel */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                        <span className="text-xs font-bold text-slate-500 block mb-1">Score de Saúde Financeira</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900">88</span>
                          <span className="text-xs font-bold text-slate-400">/100</span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 block mt-2">
                          Nível Excelente • Baixo risco
                        </span>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                        <span className="text-xs font-bold text-slate-500 block mb-1">Capacidade de Poupança</span>
                        <div className="text-3xl font-black text-emerald-700">
                          24%
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 block mt-2">
                          Meta orçamentária: 20%
                        </span>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
                        <span className="text-xs font-bold text-slate-500 block mb-1">Economia Projetada em 12m</span>
                        <div className="text-3xl font-black text-slate-900">
                          R$ 2.480,00
                        </div>
                        <span className="text-[11px] font-medium text-emerald-700 block mt-2">
                          Com otimização de custos fixos
                        </span>
                      </div>
                    </div>

                    {/* Budget Breakdown Methodology (50-30-20) */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200/80 space-y-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="text-sm font-black text-slate-900">Diagnóstico Orçamentário (Regra 50 / 30 / 20)</h4>
                          <p className="text-xs text-slate-500">Distribuição recomendada para estabilidade e crescimento patrimonial</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80 self-start sm:self-auto">
                          Em Conformidade
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-700">Custos Fixos & Essenciais (Moradia, Alimentação, Saúde)</span>
                            <span className="text-slate-900">48% <span className="text-slate-400 font-normal">(Meta: até 50%)</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-emerald-700 h-full w-[48%]" />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-700">Estilo de Vida & Gastos Variáveis (Lazer, Assinaturas)</span>
                            <span className="text-slate-900">28% <span className="text-slate-400 font-normal">(Meta: até 30%)</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-full w-[28%]" />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-700">Aportes, Reserva e Investimentos Futuros</span>
                            <span className="text-slate-900">24% <span className="text-slate-400 font-normal">(Meta: mín. 20%)</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-purple-600 h-full w-[24%]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actionable Audit Insights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                        <p className="font-bold text-slate-900 flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                          Auditoria de Assinaturas e Recorrências
                        </p>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          Identificadas 2 cobranças recorrentes com baixa utilização no mês. A revisão desses serviços libera R$ 68,00 mensais para aportes com rendimento no CDI.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                        <p className="font-bold text-slate-900 flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                          Otimização de Prazos de Pagamento
                        </p>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          Ao concentrar compras no cartão com fechamento dia 24, você ganha até 40 dias de prazo sem juros, mantendo os recursos rendendo na conta.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeShowcaseTab === "cashflow" && (
                  <motion.div
                    key="tab-cashflow"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-lg font-black text-slate-900">Previsibilidade de Fluxo de Caixa</h4>
                        <p className="text-xs text-slate-500">Projeção dos próximos 6 meses com base em recorrências</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          Previsão Segura: Saldo Positivo
                        </span>
                      </div>
                    </div>

                    {/* Timeline bar preview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Setembro (Atual)</span>
                        <p className="text-xl font-black text-slate-900 mt-1">R$ 28.450</p>
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">Fluxo estável</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Outubro</span>
                        <p className="text-xl font-black text-slate-900 mt-1">R$ 34.200</p>
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">+ R$ 5.750 projetado</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Novembro</span>
                        <p className="text-xl font-black text-slate-900 mt-1">R$ 41.100</p>
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">+ R$ 6.900 projetado</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Dezembro (13º)</span>
                        <p className="text-xl font-black text-emerald-600 mt-1">R$ 55.400</p>
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">Gratificação natalina</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <span>💡 <strong>Antecipação Inteligente:</strong> O Bolso+ avisa 5 dias antes de contas recorrentes vencerem para evitar qualquer taxa por atraso.</span>
                      <button onClick={onGoToLogin} className="shrink-0 font-bold text-emerald-700 underline sm:ml-4">
                        Testar no app
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          ) : (
            /* Mobile Device Showcase View */
            <div className="bg-gradient-to-b from-slate-50 via-white to-emerald-50/20 rounded-3xl p-6 sm:p-12 shadow-xl border border-slate-200/90 text-slate-900">
              <div className="text-center max-w-xl mx-auto mb-10">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3.5 py-1 rounded-full border border-emerald-200/80 inline-block mb-3">
                  PWA Mobile Experience
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Instale o Bolso+ no seu celular em segundos
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm mt-2">
                  Funciona direto na tela de início sem precisar de loja de aplicativos. Toque e explore a interface mobile real abaixo:
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center max-w-5xl mx-auto">
                {/* Left: Mobile App Mockup */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center">
                  <MobileAppMockup
                    onCtaClick={onGoToLogin}
                    activeFunction={activeShowcaseTab}
                    onSelectFunction={(tab) => setActiveShowcaseTab(tab as any)}
                  />
                  <span className="text-[11px] font-bold text-slate-500 mt-3 flex items-center gap-1.5">
                    <Smartphone size={13} className="text-emerald-600" /> Toque nos botões do celular acima para explorar as funções
                  </span>
                </div>

                {/* Right: Mobile App Features */}
                <div className="lg:col-span-6 space-y-4 text-left">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                    <div className="flex items-center gap-2.5 text-emerald-600 font-black text-sm mb-1">
                      <Zap size={18} />
                      <span>Desempenho Instantâneo & PWA</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      O Bolso+ abre sem demoras. Salve o ícone na tela inicial do seu iPhone ou Android e tenha a agilidade de um app nativo sem consumir espaço de armazenamento.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                    <div className="flex items-center gap-2.5 text-purple-600 font-black text-sm mb-1">
                      <Sparkles size={18} />
                      <span>Mentor Bolso AI no Bolso</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Consulte a IA direto pelo celular antes de fazer uma compra por impulso. Pergunte: <em>"Posso gastar R$ 200 agora?"</em> e receba um parecer baseado no seu fluxo mensal.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                    <div className="flex items-center gap-2.5 text-amber-600 font-black text-sm mb-1">
                      <CreditCard size={18} />
                      <span>Melhor Dia de Compra na Fatura</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Consulte o fechamento dos seus cartões no caixa da loja para ganhar até 40 dias de prazo sem juros.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-500/40 transition-colors">
                    <div className="flex items-center gap-2.5 text-teal-600 font-black text-sm mb-1">
                      <Shield size={18} />
                      <span>Modo Privacidade Rápido</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Toque no ícone do olho na tela inicial para ocultar os saldos e valores totais instantaneamente em locais públicos.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={onGoToLogin}
                      className="w-full sm:w-auto h-12 px-7 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Acessar no Celular Agora</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Grid of Modules / Features */}
      <section id="recursos" className="py-20 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200">
            Arquitetura de Gestão
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-950 tracking-tight mt-3">
            Módulos integrados para controle patrimonial
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
            Estruturado para alta precisão e conformidade: da rotina diária no smartphone ao fechamento mensal no computador.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-7 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-5">
              <Wallet size={22} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Multi-Contas & Cartões</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-normal">
              Acompanhamento simultâneo de contas correntes, contas digitais e limites de cartões de crédito com fechamento sincronizado.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Conciliação ágil de saldos
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Indicador do melhor dia de compra
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Gestão de faturas e parcelamentos futuros
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl p-7 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-5">
              <PiggyBank size={22} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Cofrinhos & Rentabilidade CDI</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-normal">
              Segregação de capital por metas (Reserva de Emergência, Imóvel, Viagem) com cálculo automatizado de juros sobre 100% do CDI.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Simulação de juros compostos diários
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Monitoramento percentual de metas
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Histórico discriminado de aportes e retiradas
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl p-7 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-5">
              <Shield size={22} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Diagnóstico & Auditoria Orçamentária</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-normal">
              Análise metódica de padrões de gastos, auditoria de recorrências e enquadramento nos parâmetros saudáveis 50/30/20.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Score de equilíbrio financeiro
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Detecção de assinaturas com baixa utilização
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Recomendações práticas de redução de custos
              </li>
            </ul>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-xl p-7 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-5">
              <TrendingUp size={22} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Fluxo de Caixa Preditivo</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-normal">
              Visão em linha do tempo dos compromissos financeiros dos próximos 30, 60 e 90 dias, prevenindo descasamento de liquidez.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Calendário de obrigações e receitas fixas
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Alerta de saldo mínimo estimado
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Prevenção de multas por esquecimento
              </li>
            </ul>
          </div>

          {/* Card 5 */}
          <div className="bg-white rounded-xl p-7 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-5">
              <Users size={22} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Gestão Familiar & Dependentes</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-normal">
              Controle individualizado por membro da família com limites por categoria e consolidação global dos custos da residência.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Centros de custo por dependente
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Rateio transparente de despesas comuns
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Relatórios analíticos por membro
              </li>
            </ul>
          </div>

          {/* Card 6 */}
          <div className="bg-white rounded-xl p-7 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-5">
              <Coins size={22} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Simulador Fiscal & Patrimônio</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 font-normal">
              Acompanhamento da evolução patrimonial líquida e organização prévia das deduções para a declaração de Imposto de Renda.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Estimativa de deduções tributárias
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Histórico de valorização de ativos
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-700" /> Exportação de relatórios em formato CSV e Excel
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Comparison: Old vs Bolso+ */}
      <section id="comparativo" className="py-20 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-slate-200">
              Matriz Comparativa
            </span>
            <h2 className="text-3xl font-black text-slate-950 tracking-tight mt-3">
              Planilhas manuais versus Plataforma Bolso+
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Entenda o ganho em conformidade, segurança e economia de tempo ao migrar para uma solução estruturada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Old Way */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 text-slate-600 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-base pb-3 border-b border-slate-100">
                <X size={18} className="text-rose-500" />
                <span>Planilhas e Controles Isolados</span>
              </div>
              <ul className="space-y-3 text-xs font-medium text-slate-600">
                <li className="flex items-start gap-2.5">
                  <X size={14} className="text-rose-500 mt-0.5 shrink-0" />
                  <span>Digitação manual lenta, suscetível a erros de fórmula e perda de arquivos.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X size={14} className="text-rose-500 mt-0.5 shrink-0" />
                  <span>Inexistência de avisos prévios sobre fechamento de cartões e vencimentos.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X size={14} className="text-rose-500 mt-0.5 shrink-0" />
                  <span>Dificuldade de registrar despesas no celular no exato momento da transação.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <X size={14} className="text-rose-500 mt-0.5 shrink-0" />
                  <span>Ausência de projeção diária de rentabilidade CDI e análise orçamentária.</span>
                </li>
              </ul>
            </div>

            {/* Bolso+ Way */}
            <div className="bg-white rounded-xl p-6 border-2 border-emerald-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-950 font-black text-base">
                  <CheckCircle2 size={18} className="text-emerald-700" />
                  <span>Ecossistema Bolso+</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80">
                  Ambiente Homologado
                </span>
              </div>
              <ul className="space-y-3 text-xs font-semibold text-slate-800">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="text-emerald-700 mt-0.5 shrink-0" />
                  <span>Lançamento em menos de 5 segundos no smartphone ou computador.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="text-emerald-700 mt-0.5 shrink-0" />
                  <span>Cálculo automatizado de parcelas futuras de cartões e melhor dia de compra.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="text-emerald-700 mt-0.5 shrink-0" />
                  <span>Diagnóstico orçamentário transparente que identifica custos ocultos e duplicados.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="text-emerald-700 mt-0.5 shrink-0" />
                  <span>Cofrinhos vinculados ao CDI com juros compostos calculados dia a dia.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works (3 Steps) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Simples e Rápido
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-3">
            Comece em menos de 2 minutos
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-5">
              1
            </div>
            <h4 className="text-lg font-black text-slate-900 mb-2">Acesse sua Conta</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Entre com seu e-mail ou conta Google. O sistema funciona no navegador e pode ser instalado no celular com um clique.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-5">
              2
            </div>
            <h4 className="text-lg font-black text-slate-900 mb-2">Adicione Contas & Metas</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Cadastre suas contas bancárias, cartões de crédito e defina seus cofrinhos de reserva e objetivos imediatos.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs relative">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-5">
              3
            </div>
            <h4 className="text-lg font-black text-slate-900 mb-2">Deixe a IA Trabalhar</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Acompanhe seu fluxo de caixa, receba alertas de vencimento e descubra quanto seu dinheiro pode render.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="flex items-center justify-center gap-1 text-amber-400 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill="currentColor" />
              ))}
            </div>
            <h2 className="text-3xl font-black text-slate-950 tracking-tight">
              Aprovado por quem transformou sua relação com o dinheiro
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-slate-200/80 flex flex-col justify-between">
              <p className="text-xs text-slate-700 font-medium leading-relaxed mb-6">
                "Passei anos tentando usar planilhas e desistia no 3º dia do mês. No Bolso+, lanço meus gastos em segundos
                pelo celular e o recurso de Cofrinhos com rendimento CDI me fez economizar R$ 12 mil no último ano."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  MS
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Mariana Silveira</h4>
                  <p className="text-[10px] text-slate-500">Médica • São Paulo, SP</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-slate-200/80 flex flex-col justify-between">
              <p className="text-xs text-slate-700 font-medium leading-relaxed mb-6">
                "O controle de cartões de crédito é o ponto alto. Eu tenho 3 cartões e sempre esquecia de faturas futuras.
                Agora sei exatamente quanto vou pagar nos próximos meses antes de fechar."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  RF
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Rodrigo Farias</h4>
                  <p className="text-[10px] text-slate-500">Engenheiro de Software • Curitiba, PR</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#F8FAF9] border border-slate-200/80 flex flex-col justify-between">
              <p className="text-xs text-slate-700 font-medium leading-relaxed mb-6">
                "Organizamos todas as contas de casa usando o módulo de gestão familiar. A IA nos mostrou gastos duplicados
                com assinaturas de streaming que nem sabíamos que estávamos pagando."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                  CL
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Carla & Lucas</h4>
                  <p className="text-[10px] text-slate-500">Casal de Empreendedores • Belo Horizonte, MG</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Access & Institutional Section (Plans are sold externally) */}
      <section id="acesso" className="py-20 sm:py-24 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider bg-white px-3.5 py-1.5 rounded-full border border-slate-200">
              Acesso à Plataforma
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-slate-950 tracking-tight mt-3">
              Credenciamento & Ativação de Usuários
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2.5">
              As licenças e acessos são disponibilizados por plataformas parceiras de vendas e credenciamento oficial. Se você já possui suas credenciais, acesse sua conta agora mesmo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {/* Card 1: Ativação Segura */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-5">
                  <ShieldCheck size={26} strokeWidth={2.2} />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">Liberação & Credenciamento</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-normal">
                  Sua conta é cadastrada pelo administrador com credenciais dedicadas e criptografia. Não há compras ou cobranças dentro do aplicativo.
                </p>

                <ul className="space-y-3 text-xs font-medium text-slate-700 mb-6">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    Acesso imediato com e-mail e senha
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    Envio das credenciais direto pelo WhatsApp
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    Ambiente seguro e protegido na nuvem
                  </li>
                </ul>
              </div>

              <button
                onClick={onGoToLogin}
                className="w-full h-11 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Acessar com Minha Conta</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Card 2: Ecossistema Completo (Featured) */}
            <div className="bg-slate-900 text-white rounded-2xl p-7 border-2 border-emerald-600 shadow-md flex flex-col justify-between relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-xs">
                Ecossistema Homologado
              </div>

              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/80 flex items-center justify-center font-bold mb-5">
                  <Sparkles size={26} strokeWidth={2.2} />
                </div>
                <h3 className="text-lg font-black text-white mb-2">Todos os Módulos Liberados</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-6 font-normal">
                  Uma vez cadastrado, você desfruta de todos os recursos da plataforma de forma integral, sem bloqueios de recursos ou taxas ocultas.
                </p>

                <ul className="space-y-3 text-xs font-medium text-slate-200 mb-6">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    Contas bancárias, faturas e cartões ilimitados
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    Cofrinhos com rentabilidade 100% CDI
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    Inteligência Artificial e Diagnóstico Orçamentário
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    Gestão Familiar e Simulador de Imposto de Renda
                  </li>
                </ul>
              </div>

              <button
                onClick={onGoToLogin}
                className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Entrar na Plataforma</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Card 3: Multiplataforma & PWA */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-5">
                  <Smartphone size={26} strokeWidth={2.2} />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">Celular & Computador</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-normal">
                  Sincronização instantânea em tempo real. Instale o aplicativo no seu smartphone Android ou iOS com apenas 1 clique.
                </p>

                <ul className="space-y-3 text-xs font-medium text-slate-700 mb-6">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    Tecnologia PWA instalável com ícone nativo
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    Lançamentos rápidos em menos de 5 segundos
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    Exportação completa em CSV e relatórios
                  </li>
                </ul>
              </div>

              <button
                onClick={onGoToLogin}
                className="w-full h-11 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Fazer Login Agora</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Dúvidas Frequentes
          </span>
          <h2 className="text-3xl font-black text-slate-950 tracking-tight mt-3">
            Perguntas & Respostas
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Meus dados financeiros estão seguros no Bolso+?",
              a: "Sim, absolutamente. O Bolso+ utiliza armazenamento em nuvem criptografado de nível corporativo (Firebase Google Cloud com regras de segurança rígidas). Nós não compartilhamos suas informações com terceiros e você é o único com acesso ao seu painel."
            },
            {
              q: "Preciso fornecer a senha da minha conta bancária?",
              a: "Não! O Bolso+ não exige senhas bancárias ou chaves de movimentação. Você mantém o controle absoluto de seus registros, com opção de conciliação e lançamento rápido, garantindo 100% de privacidade."
            },
            {
              q: "Funciona tanto no celular quanto no computador?",
              a: "Sim! O Bolso+ é construído com tecnologia PWA (Progressive Web App). Você pode acessá-lo pelo navegador no computador e instalá-lo diretamente na tela inicial do seu celular (Android ou iPhone) com ícone nativo e funcionamento instantâneo."
            },
            {
              q: "Como funcionam os Cofrinhos com rendimento 100% CDI?",
              a: "Os Cofrinhos permitem que você separe seu dinheiro por objetivos (como Reserva de Emergência ou Viagem). O app calcula diariamente o rendimento simulado do CDI para que você veja exatamente quanto seu dinheiro estaria rendendo em investimentos de liquidez diária."
            },
            {
              q: "O que é o Bolso AI e como ele me ajuda?",
              a: "É o nosso assistente consultor treinado em finanças pessoais. Ele analisa seus hábitos de consumo, aponta despesas supérfluas recorrentes, calcula seu score de equilíbrio e gera planos de ação para você atingir suas metas mais rápido."
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs"
            >
              <button
                onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform duration-200 shrink-0 ml-4 ${
                    faqOpen === idx ? "rotate-180 text-emerald-600" : ""
                  }`}
                />
              </button>
              {faqOpen === idx && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed font-medium border-t border-slate-100">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Institutional CTA Banner */}
      <section className="py-16 sm:py-20 bg-slate-900 text-white relative border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white mx-auto mb-5 shadow-xs">
            <ShieldCheck size={24} strokeWidth={2.2} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
            Assuma o controle definitivo do seu patrimônio
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-8 font-normal leading-relaxed">
            Junte-se a usuários que planejam suas finanças com dados reais, segurança de nível bancário e clareza de futuro.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onGoToLogin}
              className="w-full sm:w-auto h-12 px-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <span>Acessar o Bolso+ Agora</span>
              <ArrowRight size={15} />
            </button>
            {isLoggedIn && (
              <button
                onClick={onGoToApp}
                className="w-full sm:w-auto h-12 px-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors border border-slate-700"
              >
                Retornar ao Painel
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-14 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="bg-white rounded-2xl p-2 flex items-center shadow-md">
                  <img src="/logo.png" alt="Bolso+" className="h-12 w-12 object-contain" />
                </div>
                <div>
                  <span className="text-xl font-black text-white tracking-tight leading-none block">
                    Bolso<span className="text-emerald-400">+</span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Seu Dinheiro Mais Perto
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm font-normal">
                Plataforma de gestão financeira pessoal e familiar. Controle de contas, faturas de cartão com vencimentos sincronizados e cofrinhos com cálculo de rendimento 100% CDI.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 font-medium">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span>Criptografia ponta a ponta e conformidade com a LGPD.</span>
              </div>
            </div>

            <div>
              <p className="text-white text-xs font-bold uppercase tracking-wider mb-3">Navegação</p>
              <ul className="space-y-2 text-xs font-medium">
                <li>
                  <button onClick={() => scrollToSection("demonstracao")} className="hover:text-white transition-colors">
                    Demonstração Interativa
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("recursos")} className="hover:text-white transition-colors">
                    Módulos da Plataforma
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("comparativo")} className="hover:text-white transition-colors">
                    Planilhas vs. Bolso+
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("planos")} className="hover:text-white transition-colors">
                    Planos e Preços
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection("faq")} className="hover:text-white transition-colors">
                    Perguntas Frequentes
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-white text-xs font-bold uppercase tracking-wider mb-3">Acesso Rápido</p>
              <ul className="space-y-2 text-xs font-medium">
                <li>
                  <button onClick={onGoToLogin} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                    Entrar na Plataforma
                  </button>
                </li>
                <li>
                  <button onClick={onGoToLogin} className="hover:text-white transition-colors">
                    Criar Conta Gratuita
                  </button>
                </li>
                <li>
                  <span className="text-slate-400 block pt-1">
                    Versão Web e Mobile PWA
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-normal text-center sm:text-left">
            <p>
              © {new Date().getFullYear()} Bolso+ Tecnologia Financeira. Todos os direitos reservados.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <span className="hover:text-slate-200 cursor-pointer transition-colors">Termos de Uso</span>
              <span className="hover:text-slate-200 cursor-pointer transition-colors">Privacidade & Dados</span>
              <span className="hover:text-slate-200 cursor-pointer transition-colors">Segurança Bancária</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
