import React, { useState } from "react";
import { Lock, Eye, EyeOff, Mail, ArrowRight, ArrowLeft, Shield, BarChart3, Wallet, Sparkles, ArrowUpRight, CheckCircle2, ArrowLeftRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

interface LoginProps {
  onGoogleLogin: () => Promise<void>;
  onEmailLogin: (email: string, senha: string) => Promise<void> | void;
  debugMsg: string | null;
  onBackToLanding?: () => void;
}

export function Login({ onGoogleLogin, onEmailLogin, debugMsg, onBackToLanding }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      await onEmailLogin(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setIsGoogleLoading(true);
    try {
      await onGoogleLogin();
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F4F7F6] flex font-sans text-slate-900 overflow-hidden selection:bg-emerald-500/20">
      
      {/* Desktop Left Column - Dashboard Style Showcase */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-14 isolate bg-gradient-to-br from-[#F4F9F6] to-[#E8F5E9] border-r border-emerald-100/60 overflow-hidden">
        
        {/* Decorative soft glow */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-emerald-300/20 rounded-full blur-[100px] -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-200/20 rounded-full blur-[120px] translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="bg-white rounded-3xl p-3 shadow-md border border-emerald-100/70 inline-flex">
            <img src="/logo.png" alt="Bolso+" className="h-16 w-16 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
              Bolso<span className="text-emerald-600">+</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mt-1">
              Seu Dinheiro Mais Perto
            </span>
          </div>
        </div>

        {/* Center Dashboard Card Mockup in Dashboard visual language */}
        <div className="relative z-10 my-auto py-8">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md mx-auto"
          >
            {/* Dashboard Miniature Preview */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_12px_40px_rgba(16,185,129,0.08)] border border-slate-100/80 relative overflow-hidden">
              
              {/* Header inside preview card */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm">
                    B+
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Visão Geral Bolso+</h3>
                    <p className="text-[11px] text-slate-500">Saldo e transações sincronizadas</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 bg-[#10B981] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                  <ArrowUpRight size={12} strokeWidth={3} />
                  Ativo
                </div>
              </div>

              {/* Features Overview Box */}
              <div className="bg-gradient-to-br from-[#F4F9F6] to-[#E8F5E9] rounded-2xl p-5 border border-emerald-100 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-bold text-slate-700">Controle Consolidado</span>
                  <span className="text-[10px] text-[#10B981] font-bold flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 size={11} /> Sincronizado
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white/70 backdrop-blur-sm rounded-xl px-3 py-2 border border-emerald-100/60">
                    <span className="text-xs font-semibold text-slate-700">Gestão de Contas & Cartões</span>
                    <span className="text-xs font-bold text-emerald-700">Integrado</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/70 backdrop-blur-sm rounded-xl px-3 py-2 border border-emerald-100/60">
                    <span className="text-xs font-semibold text-slate-700">Categorização com IA</span>
                    <span className="text-xs font-bold text-emerald-700">Automática</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-emerald-200/50">
                  <span className="text-[10px] text-[#10B981] font-bold flex items-center gap-0.5">
                    <CheckCircle2 size={12} /> 100% sob controle
                  </span>
                  <span className="text-[10px] text-slate-500">• Dados reais e criptografados</span>
                </div>
              </div>

              {/* Mini Quick Actions */}
              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Wallet size={16} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-600">Receitas</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <Wallet size={16} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-600">Despesas</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <ArrowLeftRight size={16} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-600">Transferir</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <BarChart3 size={16} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-600">Relatórios</span>
                </div>
              </div>

            </div>
          </motion.div>

          {/* Copy below preview */}
          <div className="mt-8 max-w-md mx-auto">
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">
              Suas finanças com clareza e inteligência.
            </h1>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Acompanhe seu fluxo de caixa, organize contas e cartões e atinja suas metas com a tecnologia do Bolso+.
            </p>
          </div>
        </div>

        {/* Trust Footer */}
        <div className="relative z-10 flex items-center gap-6 text-slate-500 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-[#10B981]" />
            Dados Protegidos
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#10B981]" />
            Assistência IA Integrada
          </div>
        </div>
      </div>

      {/* Right Column / Mobile Main - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 relative overflow-y-auto">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="lg:hidden flex flex-col items-center mb-8 text-center w-full pt-4">
          <div className="bg-white rounded-3xl p-3.5 shadow-lg border border-slate-100 mb-3 inline-flex">
            <img src="/logo.png" alt="Bolso+" className="h-24 w-24 object-contain" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Bolso<span className="text-emerald-600">+</span>
          </h1>
          <p className="text-slate-500 font-semibold text-xs mt-0.5 max-w-[280px]">
            Seu Dinheiro Mais Perto
          </p>
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px] bg-white rounded-[32px] p-8 sm:p-10 border border-slate-100 shadow-[0_8px_30px_rgba(16,185,129,0.06)] relative z-10"
        >
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 mb-6 transition-colors group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Conhecer o app (Página Inicial)</span>
            </button>
          )}

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              Acessar Conta
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Informe seu e-mail e senha ou entre com o Google.
            </p>
          </div>

          {debugMsg && (
            <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              {debugMsg}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 px-1">
                E-mail
              </label>
              <div className={cn(
                "relative flex items-center w-full rounded-2xl border transition-all duration-200 bg-slate-50",
                isEmailFocused 
                  ? "border-[#10B981] bg-white ring-4 ring-emerald-500/10" 
                  : "border-slate-200 hover:border-slate-300"
              )}>
                <div className="pl-4 pr-2 text-slate-400">
                  <Mail size={18} className={cn("transition-colors", isEmailFocused && "text-[#10B981]")} />
                </div>
                <input
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  placeholder="seuemail@exemplo.com ou admin"
                  required
                  className="w-full bg-transparent py-3.5 pr-4 outline-none text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Senha
                </label>
              </div>
              <div className={cn(
                "relative flex items-center w-full rounded-2xl border transition-all duration-200 bg-slate-50",
                isPasswordFocused 
                  ? "border-[#10B981] bg-white ring-4 ring-emerald-500/10" 
                  : "border-slate-200 hover:border-slate-300"
              )}>
                <div className="pl-4 pr-2 text-slate-400">
                  <Lock size={18} className={cn("transition-colors", isPasswordFocused && "text-[#10B981]")} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-transparent py-3.5 px-1 outline-none text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-4 pl-2 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-12 mt-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Bolso+</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
              Administrador: acesse com <strong className="text-slate-600">admin</strong> ou seu e-mail de gestor.
            </p>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-slate-100 flex-1" />
            <span className="text-[11px] font-bold text-slate-400">ou</span>
            <div className="h-px bg-slate-100 flex-1" />
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleClick}
            disabled={isLoading || isGoogleLoading}
            className="w-full h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all disabled:opacity-70 shadow-sm"
          >
            {isGoogleLoading ? (
              <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                Continuar com o Google
              </>
            )}
          </button>
        </motion.div>

      </div>
    </div>
  );
}

export default Login;
