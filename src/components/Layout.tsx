import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { User } from "firebase/auth";
import { Menu, Bell, Search, Plus, Home, List, Wallet, MessageSquare, Settings, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, X, LogOut, ShieldCheck, Target, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import Sidebar from "./Sidebar";
import { UserProfile, Debt, Receivable } from "../types";
import { FloatingAIChat } from "./FloatingAIChat";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  userProfile: UserProfile | null;
  onLogout: () => void;
  mostrarMensagem?: (msg: string) => void;
}

export function Layout({ children, activeTab, setActiveTab, user, userProfile, onLogout, mostrarMensagem }: LayoutProps) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [activeAnnouncements, setActiveAnnouncements] = useState<any[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem("dismissed_announcements");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isAdminUser = userProfile?.email?.toLowerCase().trim() === "dicasdereceitas1993@gmail.com";
  const isAdminView = activeTab === "admin" || location.pathname.startsWith("/admin");

  useEffect(() => {
    fetch("/api/public/announcements")
      .then((r) => {
        if (r.ok && r.headers.get("content-type")?.includes("application/json")) {
          return r.json();
        }
        return null;
      })
      .then((data) => {
        if (data && data.announcements) {
          setActiveAnnouncements(data.announcements);
        }
      })
      .catch(() => {});
  }, []);

  const dismissAnnouncement = (id: string) => {
    const updated = [...dismissedAnnouncements, id];
    setDismissedAnnouncements(updated);
    try {
      sessionStorage.setItem("dismissed_announcements", JSON.stringify(updated));
    } catch {}
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      // Auto-collapse on tablet
      if (width >= 768 && width < 1024) {
        setIsSidebarCollapsed(true);
      } else if (width >= 1024) {
        setIsSidebarCollapsed(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Registrar handler global para abrir a sidebar no mobile
    (window as any).openSidebar = () => {
      setIsSidebarOpen(true);
    };

    return () => {
      window.removeEventListener('resize', handleResize);
      delete (window as any).openSidebar;
    };
  }, []);

  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;
  
  const effectiveIsMini = isSidebarCollapsed || isTablet;

  const abrirReceita = () => {
    if (mostrarMensagem) mostrarMensagem("função abrirReceita executando");
    if (typeof window !== "undefined" && (window as any).abrirModalReceita) {
      (window as any).abrirModalReceita();
    } else {
      setActiveTab("income?add=income");
    }
    setIsQuickMenuOpen(false);
  };

  const abrirDespesa = () => {
    if (mostrarMensagem) mostrarMensagem("função abrirDespesa executando");
    if (typeof window !== "undefined" && (window as any).abrirModalDespesa) {
      (window as any).abrirModalDespesa();
    } else {
      setActiveTab("expenses?add=expense");
    }
    setIsQuickMenuOpen(false);
  };

  const abrirTransferencia = () => {
    if (mostrarMensagem) mostrarMensagem("função abrirTransferencia executando");
    if (typeof window !== "undefined" && (window as any).abrirModalTransferencia) {
      (window as any).abrirModalTransferencia();
    } else {
      setActiveTab("transfers?add=transfer");
    }
    setIsQuickMenuOpen(false);
  };

  const abrirDividas = () => {
    if (mostrarMensagem) {
      mostrarMensagem("clicou Dívidas");
      mostrarMensagem("função abrirDividas executando");
    }
    setActiveTab("debts");
    setIsQuickMenuOpen(false);
  };

  const abrirCartoes = () => {
    if (mostrarMensagem) {
      mostrarMensagem("clicou Cartões");
      mostrarMensagem("função abrirCartoes executando");
    }
    setActiveTab("cards");
    setIsQuickMenuOpen(false);
  };

  const abrirPatrimonio = () => {
    if (mostrarMensagem) {
      mostrarMensagem("clicou Patrimônio");
      mostrarMensagem("função abrirPatrimonio executando");
    }
    setActiveTab("wealth");
    setIsQuickMenuOpen(false);
  };

  const abrirInvestimentos = () => {
    if (mostrarMensagem) {
      mostrarMensagem("clicou Investimentos");
      mostrarMensagem("função abrirInvestimentos executando");
    }
    setActiveTab("investments");
    setIsQuickMenuOpen(false);
  };

  const allNavItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "statement", label: "Extrato" },
    { id: "income", label: "Receitas" },
    { id: "expenses", label: "Despesas" },
    { id: "accounts", label: "Contas" },
    { id: "piggy_banks", label: "Cofrinho" },
    { id: "goals", label: "Metas" },
    { id: "budgeting", label: "Orçamento" },
    { id: "debts", label: "Dívidas" },
    { id: "cards", label: "Cartões" },
    { id: "wealth", label: "Patrimônio" },
    { id: "investments", label: "Investimentos" },
    { id: "aichat", label: "IA Chat" },
    { id: "insights", label: "Insights" },
    { id: "diagnosis", label: "Diagnóstico" },
    { id: "reports", label: "Relatórios" },
    { id: "categories", label: "Categorias" },
    { id: "settings", label: "Configurações" },
    { id: "admin", label: "Painel Admin" },
  ];

  const navItems = isAdminUser ? [
    { id: "admin", icon: ShieldCheck, label: "Admin" },
    { id: "logout", icon: LogOut, label: "Sair" }
  ] : [
    { id: "dashboard", icon: Home, label: "Início" },
    { id: "statement", icon: ArrowLeftRight, label: "Transações" },
    { id: "quick_actions", icon: Plus, label: "", isCenter: true },
    { id: "goals", icon: Target, label: "Metas" },
    { id: "settings", icon: MoreHorizontal, label: "Mais" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7F6] font-sans text-slate-900 flex overflow-hidden">
      {/* Desktop & Tablet Layout Structure (>= 768px) */}
      {windowWidth >= 768 && (
        <div className="flex w-full h-screen overflow-hidden bg-[#F4F7F6]">
          {/* Sidebar Container */}
          <motion.div 
            animate={{ width: effectiveIsMini ? 84 : 270 }}
            className="flex-shrink-0 z-30 border-r border-emerald-900/80 bg-[#064E3B] shadow-[1px_0_12px_rgba(0,0,0,0.15)]"
          >
            <Sidebar 
              isOpen={true} 
              onClose={() => {}} 
              user={userProfile}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onLogout={onLogout}
              isMini={effectiveIsMini}
              onToggleMini={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              isDesktop={true}
              mostrarMensagem={mostrarMensagem}
            />
          </motion.div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top Action Bar (Desktop/Tablet) - Hidden on Admin */}
            {!isAdminView && (
              <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 z-20 flex-shrink-0">
                <div className="flex items-center gap-6">
                  <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">
                    {isAdminUser ? "Painel Administrativo" : (allNavItems.find(i => i.id === activeTab)?.label || activeTab)}
                  </h1>
                  {!isAdminUser && (
                    <>
                      <div className="h-6 w-px bg-gray-100"></div>
                      <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Pesquisar..." 
                          className="bg-gray-50 border-none rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold w-64 focus:ring-2 focus:ring-primary-lime/20 transition-all"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {!isAdminUser && (
                    <div className="flex items-center gap-2 mr-4">
                      <button 
                        onClick={abrirReceita}
                        className="flex items-center gap-3 px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95 shadow-sm"
                      >
                        <Plus size={16} strokeWidth={3} />
                        <span className="hidden lg:inline">Nova Receita</span>
                      </button>
                      <button 
                        onClick={abrirDespesa}
                        className="flex items-center gap-3 px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95 shadow-sm"
                      >
                        <Plus size={16} strokeWidth={3} />
                        <span className="hidden lg:inline">Nova Despesa</span>
                      </button>
                      <button 
                        onClick={abrirTransferencia}
                        className="flex items-center gap-3 px-6 py-4 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95 shadow-sm"
                      >
                        <Plus size={16} strokeWidth={3} />
                        <span className="hidden lg:inline">Nova Transferência</span>
                      </button>
                    </div>
                  )}
                  {!isAdminUser && (
                    <button className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-50 text-gray-400 transition-all active:scale-95 relative">
                      <Bell size={22} />
                      <span className="absolute top-3 right-3 w-2 h-2 bg-primary-red rounded-full border-2 border-white"></span>
                    </button>
                  )}
                  <div className="h-8 w-px bg-gray-100 mx-2"></div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden xl:block">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{userProfile?.displayName}</p>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{isAdminUser ? "Administrador" : "Premium Member"}</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-white text-emerald-600 flex items-center justify-center font-black shadow-lg shadow-primary-dark/10">
                      {userProfile?.displayName?.charAt(0)}
                    </div>
                    <button
                      onClick={onLogout}
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ml-1 border border-transparent hover:border-rose-100"
                      title="Sair da Conta"
                    >
                      <LogOut size={18} />
                      <span className="hidden xl:inline text-xs font-bold">Sair</span>
                    </button>
                  </div>
                </div>
              </header>
            )}

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              <main className={cn(
                "flex-1 overflow-y-auto custom-scrollbar",
                isAdminView ? "p-0 bg-slate-50" : (activeTab === "dashboard" ? "p-8 xl:p-12 bg-white" : "p-8 xl:p-12 bg-[#F4F7F6]")
              )}>
                <div className={cn(
                  "w-full transition-all duration-300",
                  isAdminView ? "max-w-none" : "max-w-7xl mx-auto"
                )}>
                  {/* Public Announcements Banner - Hidden on Admin */}
                  {!isAdminView && activeAnnouncements
                    .filter((a) => !dismissedAnnouncements.includes(a.id))
                    .map((ann) => (
                      <div
                        key={ann.id}
                        className="mb-6 p-4 rounded-2xl border flex items-start justify-between gap-4 bg-purple-50/90 border-purple-200 text-purple-950 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <Bell size={18} className="text-purple-600 mt-0.5 shrink-0" />
                          <div>
                            <h4 className="text-xs font-black text-purple-900 uppercase tracking-wide">
                              {ann.titulo}
                            </h4>
                            <p className="text-xs text-purple-800 mt-0.5">{ann.conteudo}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => dismissAnnouncement(ann.id)}
                          className="text-purple-400 hover:text-purple-700 p-1 rounded-lg transition-colors"
                          title="Dispensar aviso"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  {children}
                </div>
              </main>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Chat (All Platforms - Except Admin) */}
      {userProfile && !isAdminUser && !isAdminView && <FloatingAIChat userProfile={userProfile} activeTab={activeTab} />}

      {/* Mobile Layout Structure (< 768px) */}
      {windowWidth < 768 && (
        <div className="flex flex-1 flex-col h-screen overflow-hidden relative">
        {/* Sidebar (Mobile Overlay) */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          user={userProfile}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={onLogout}
          mostrarMensagem={mostrarMensagem}
        />

        {/* Header - Hidden on Dashboard and Admin for custom top area */}
        {activeTab !== "dashboard" && activeTab !== "piggy_banks" && !isAdminView && (
          <header className="h-20 flex items-center justify-between px-6 bg-white/80 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-100/50">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 -ml-2 rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
              >
                <Menu size={22} className="text-gray-700" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="bg-white rounded-xl p-1 shadow-2xs border border-slate-200/60 flex items-center justify-center shrink-0">
                  <img src="/logo.png" alt="Bolso+" className="h-8 w-8 object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-tight text-slate-900 leading-tight">
                    {isAdminUser ? "Painel Administrativo" : (allNavItems.find(item => item.id === activeTab)?.label || "Bolso+ IA")}
                  </span>
                  <span className="text-[9px] font-medium text-emerald-700 uppercase tracking-widest">{isAdminUser ? "Administrador" : "Premium Access"}</span>
                </div>
              </div>
            </div>

            {!isAdminUser && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { if (mostrarMensagem) mostrarMensagem("Pesquisar clicado"); }}
                  className="p-2.5 rounded-2xl hover:bg-gray-50 transition-all text-gray-400 hover:text-slate-900 active:scale-95"
                >
                  <Search size={20} />
                </button>
                <button 
                  onClick={() => { if (mostrarMensagem) mostrarMensagem("Notificações clicado"); }}
                  className="p-2.5 rounded-2xl hover:bg-gray-50 transition-all text-gray-400 hover:text-slate-900 relative active:scale-95"
                >
                  <Bell size={20} />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary-red rounded-full border-2 border-white"></span>
                </button>
              </div>
            )}
          </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#F4F7F6]">
          <div className={cn(
            "w-full mx-auto",
            (activeTab === "dashboard" || activeTab === "piggy_banks" || isAdminView) ? "p-0 max-w-none" : "p-6 pb-32 max-w-7xl"
          )}>
            {/* Public Announcements Banner Mobile - Hidden on Admin */}
            {!isAdminView && activeAnnouncements
              .filter((a) => !dismissedAnnouncements.includes(a.id))
              .map((ann) => (
                <div
                  key={ann.id}
                  className="mx-4 mt-3 mb-4 p-3.5 rounded-2xl border flex items-start justify-between gap-3 bg-purple-50 border-purple-200 text-purple-950 shadow-sm text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <Bell size={16} className="text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-[11px] font-black text-purple-900 uppercase tracking-wide">
                        {ann.titulo}
                      </h4>
                      <p className="text-[11px] text-purple-800 mt-0.5">{ann.conteudo}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAnnouncement(ann.id)}
                    className="text-purple-400 hover:text-purple-700 p-0.5 rounded-lg"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            {children}
          </div>
        </main>

        {/* Bottom Navigation Bar (Mobile) - Hidden on Admin */}
        {!isAdminView && (
          <div className="fixed bottom-0 left-0 right-0 z-40">
          {/* Quick Actions Menu Overlay */}
          <AnimatePresence>
            {!isAdminUser && isQuickMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsQuickMenuOpen(false)}
                  className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[90]"
                />
                
                {/* Radial Buttons Container */}
                <div className="fixed bottom-24 left-1/2 z-[110] pointer-events-none">
                  {/* Receita (Top: -90°) */}
                  <motion.div
                    key="radial-income"
                    initial={{ opacity: 0, x: "-50%", y: 0, scale: 0.1 }}
                    animate={{ opacity: 1, x: "-50%", y: -120, scale: 1 }}
                    exit={{ opacity: 0, x: "-50%", y: 0, scale: 0.1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 25,
                      scale: { delay: 0.05 },
                      opacity: { duration: 0.2 }
                    }}
                    className="absolute flex flex-col items-center gap-1.5 pointer-events-auto"
                  >
                    <button
                      onClick={() => {
                        if (mostrarMensagem) mostrarMensagem("clicou Receita");
                        abrirReceita();
                      }}
                      className="w-16 h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-500/40 flex items-center justify-center active:scale-90 transition-transform cursor-pointer border-2 border-white/80"
                    >
                      <ArrowUpRight size={28} strokeWidth={2.5} />
                    </button>
                    <span className="text-[10px] font-black text-white bg-slate-900/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">Receita</span>
                  </motion.div>

                  {/* Despesa (Left: -150°) */}
                  <motion.div
                    key="radial-expense"
                    initial={{ opacity: 0, x: "-50%", y: 0, scale: 0.1 }}
                    animate={{ opacity: 1, x: "calc(-50% - 100px)", y: -40, scale: 1 }}
                    exit={{ opacity: 0, x: "-50%", y: 0, scale: 0.1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 25, 
                      delay: 0.05,
                      scale: { delay: 0.1 },
                      opacity: { duration: 0.2 }
                    }}
                    className="absolute flex flex-col items-center gap-1.5 pointer-events-auto"
                  >
                    <button
                      onClick={() => {
                        if (mostrarMensagem) mostrarMensagem("clicou Despesa");
                        abrirDespesa();
                      }}
                      className="w-16 h-16 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg shadow-rose-500/40 flex items-center justify-center active:scale-90 transition-transform cursor-pointer border-2 border-white/80"
                    >
                      <ArrowDownLeft size={28} strokeWidth={2.5} />
                    </button>
                    <span className="text-[10px] font-black text-white bg-slate-900/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">Despesa</span>
                  </motion.div>

                  {/* Transferência (Right: -30°) */}
                  <motion.div
                    key="radial-transfer"
                    initial={{ opacity: 0, x: "-50%", y: 0, scale: 0.1 }}
                    animate={{ opacity: 1, x: "calc(-50% + 100px)", y: -40, scale: 1 }}
                    exit={{ opacity: 0, x: "-50%", y: 0, scale: 0.1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 25, 
                      delay: 0.1,
                      scale: { delay: 0.15 },
                      opacity: { duration: 0.2 }
                    }}
                    className="absolute flex flex-col items-center gap-1.5 pointer-events-auto"
                  >
                    <button
                      onClick={() => {
                        if (mostrarMensagem) mostrarMensagem("clicou Transf.");
                        abrirTransferencia();
                      }}
                      className="w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center active:scale-90 transition-transform cursor-pointer border-2 border-white/80"
                    >
                      <ArrowLeftRight size={28} strokeWidth={2.5} />
                    </button>
                    <span className="text-[10px] font-black text-white bg-slate-900/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">Transf.</span>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>

          <nav className="h-[calc(4.5rem+env(safe-area-inset-bottom,1.5rem))] bg-white shadow-[0_-5px_30px_rgba(0,0,0,0.03)] flex items-start justify-around px-4 border-t border-slate-100 pt-2 pb-[env(safe-area-inset-bottom,1.5rem)] relative z-[100]">
            {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "logout") {
                  onLogout();
                } else if (item.isCenter) {
                  setIsQuickMenuOpen(!isQuickMenuOpen);
                } else {
                  setActiveTab(item.id);
                  setIsQuickMenuOpen(false);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center transition-all relative",
                item.isCenter ? "w-14 h-14 -mt-6 bg-[#10B981] rounded-full shadow-lg shadow-emerald-500/20 text-white z-50 flex items-center justify-center active:scale-95" : "w-14 h-12 pt-1",
                activeTab === item.id && !item.isCenter ? "text-[#10B981]" : !item.isCenter ? "text-slate-400" : ""
              )}
            >
              <motion.div
                animate={{ rotate: item.isCenter && isQuickMenuOpen ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {item.isCenter && isQuickMenuOpen ? (
                  <X size={26} strokeWidth={2.5} />
                ) : (
                  <item.icon size={item.isCenter ? 26 : 22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                )}
              </motion.div>
              {!item.isCenter && (
                <span className={cn(
                  "text-[10px] font-bold mt-1 transition-all",
                  activeTab === item.id ? "opacity-100 text-[#10B981]" : "opacity-100 text-slate-400"
                )}>
                  {item.label}
                </span>
              )}
            </button>
            ))}
          </nav>
        </div>
        )}
        </div>
      )}
    </div>
  );
}
