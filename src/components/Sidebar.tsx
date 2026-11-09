import React from "react";
import { 
  Home, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  List, 
  Repeat, 
  Tags, 
  Layers,
  History, 
  CreditCard, 
  Wallet, 
  Target, 
  ShieldCheck, 
  AlertCircle, 
  Users, 
  PieChart, 
  Calendar, 
  FileText, 
  CloudUpload, 
  MessageSquare, 
  Sparkles, 
  Heart, 
  Zap, 
  Brain, 
  Settings, 
  LogOut, 
  HelpCircle, 
  ChevronRight,
  Star,
  Bell,
  Calculator,
  Briefcase,
  Award,
  Menu,
  Landmark,
  PiggyBank as PiggyIcon
} from "lucide-react";
import { UserProfile, AIMode, Debt, Receivable } from "../types";
import { cn, getDaysRemaining } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { useDebts } from "../context/DebtsContext";
import { useReceivables } from "../context/ReceivablesContext";
import { useReminders } from "../context/ReminderContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isMini?: boolean;
  onToggleMini?: () => void;
  isDesktop?: boolean;
  mostrarMensagem?: (msg: string) => void;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ 
  isOpen, 
  onClose, 
  user, 
  activeTab, 
  setActiveTab, 
  onLogout,
  isMini = false,
  onToggleMini,
  isDesktop = false,
  mostrarMensagem
}) => {
  const { debts } = useDebts();
  const { receivables } = useReceivables();
  const { reminders, userEvents } = useReminders();

  const { overdueCount, criticalCount, overdueReceivables, highRiskReceivables, activeReminders, overdueReminders, overdueEvents, totalAlerts } = React.useMemo(() => {
    const oC = debts.filter(d => d.status !== "quitada" && getDaysRemaining(d.dueDate) < 0).length;
    const cC = debts.filter(d => d.status !== "quitada" && d.urgency === "critica").length;
    const oR = receivables.filter(r => r.status !== "recebido" && getDaysRemaining(r.dueDate) < 0).length;
    const hRR = receivables.filter(r => r.status !== "recebido" && (r.risk === "alto" || r.risk === "critico")).length;
    const aR = reminders.filter(r => r.status === "ativo").length;
    const oRem = reminders.filter(r => r.status === "ativo" && new Date(r.date) < new Date()).length;
    const oE = userEvents.filter(e => e.status === "atrasado").length;
    return {
      overdueCount: oC,
      criticalCount: cC,
      overdueReceivables: oR,
      highRiskReceivables: hRR,
      activeReminders: aR,
      overdueReminders: oRem,
      overdueEvents: oE,
      totalAlerts: oRem + oE
    };
  }, [debts, receivables, reminders, userEvents]);

  const handleLogoutClick = () => {
    if (mostrarMensagem) mostrarMensagem("Saindo...");
    try {
      if (onClose) onClose();
      onLogout();
    } catch (error) {
      console.error("Erro no logout sidebar:", error);
    }
  };

  const isAdminUser = user?.email?.toLowerCase().trim() === "dicasdereceitas1993@gmail.com";

  const menuGroups = React.useMemo(() => {
    const adminSection = isAdminUser ? [
      {
        title: "Administração",
        items: [
          { id: "admin", label: "Painel Admin", icon: ShieldCheck }
        ]
      }
    ] : [];

    const standardGroups = [
      {
        title: "Geral",
        items: [
          { id: "dashboard", label: "Dashboard", icon: Home },
          { id: "reports", label: "Relatórios", icon: PieChart },
        ]
      },
      {
        title: "Financeiro",
        items: [
          { id: "income", label: "Receitas", icon: TrendingUp },
          { id: "expenses", label: "Despesas", icon: TrendingDown },
          { id: "transfers", label: "Transferências", icon: Repeat },
          { id: "statement", label: "Extrato", icon: List },
          { id: "cash_flow", label: "Fluxo de Caixa", icon: Layers },
          { id: "accounts", label: "Contas", icon: Wallet },
          { id: "cards", label: "Cartões", icon: CreditCard },
          { id: "invoices", label: "Faturas", icon: FileText },
          { id: "reconciliation", label: "Conciliação", icon: ShieldCheck },
          { 
            id: "debts", 
            label: "Dívidas", 
            icon: AlertCircle,
            badge: overdueCount > 0 ? overdueCount : (criticalCount > 0 ? "!" : null),
            badgeColor: overdueCount > 0 ? "bg-primary-red" : "bg-white"
          },
          { 
            id: "receivables", 
            label: "A Receber", 
            icon: TrendingUp,
            badge: overdueReceivables > 0 ? overdueReceivables : (highRiskReceivables > 0 ? "!" : null),
            badgeColor: overdueReceivables > 0 ? "bg-primary-red" : "bg-white"
          },
          { id: "budgeting", label: "Orçamento", icon: PieChart },
          { id: "subscriptions", label: "Assinaturas", icon: Repeat },
          { id: "irsim", label: "Imposto de Renda", icon: Calculator },
        ]
      },
      {
        title: "Patrimônio",
        items: [
          { id: "wealth", label: "Patrimônio", icon: Briefcase },
          { id: "investments", label: "Investimentos", icon: Landmark },
          { id: "piggy_banks", label: "Cofrinho", icon: PiggyIcon },
          { id: "goals", label: "Metas", icon: Target },
          { id: "emergency_reserve", label: "R. Emergência", icon: ShieldCheck },
          { id: "life_planning", label: "Plano de Vida", icon: Heart },
          { id: "family", label: "Família", icon: Users },
        ]
      },
      {
        title: "Produtividade",
        items: [
          { 
            id: "reminders", 
            label: "Tarefas", 
            icon: Bell,
            badge: totalAlerts > 0 ? totalAlerts : null,
            badgeColor: "bg-primary-red"
          },
          { id: "calendar", label: "Calendário", icon: Calendar },
          { id: "documents", label: "Documentos", icon: FileText },
        ]
      },
      {
        title: "Inteligência",
        items: [
          { id: "aichat", label: "IA / Chat", icon: MessageSquare },
          { id: "insights", label: "Insights", icon: Sparkles },
          { id: "diagnosis", label: "Diagnóstico", icon: Award },
          { id: "ai_action_plan", label: "Plano de Ação", icon: Brain },
        ]
      },
      {
        title: "Sistema",
        items: [
          { id: "categories", label: "Categorias", icon: Tags },
          { id: "history", label: "Histórico Global", icon: History },
          { id: "settings", label: "Configurações", icon: Settings },
          { id: "landing", label: "Apresentação do App", icon: Sparkles },
        ]
      }
    ];

    return [...adminSection, ...standardGroups];
  }, [overdueCount, criticalCount, overdueReceivables, highRiskReceivables, totalAlerts, user, isAdminUser]);

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[105] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isMini ? 84 : 270,
          x: (isOpen || isDesktop) ? 0 : "-100%" 
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "fixed top-0 left-0 h-screen bg-[#064E3B] z-[999] shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden transition-all duration-300 border-r border-emerald-900/80 text-white",
          "md:relative md:translate-x-0 md:z-0 md:shadow-none"
        )}
      >
        {/* Top Bar with Brand Logo and Mini Toggle */}
        <div className={cn(
          "flex items-center justify-between px-5 pt-6 pb-5",
          isMini ? "flex-col gap-5 px-0 pt-6" : ""
        )}>
          {!isMini ? (
            <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
              <div className="bg-white rounded-2xl p-2 flex items-center justify-center shadow-md border border-white/30 shrink-0">
                <img src="/logo.png" alt="Bolso+" className="w-12 h-12 object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-black tracking-tight text-white leading-none">
                  Bolso<span className="text-emerald-300">+</span>
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-200 mt-1 truncate">
                  Seu Dinheiro Mais Perto
                </span>
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md border border-white/20">
              <img src="/logo.png" alt="Bolso+" className="w-full h-full object-contain" />
            </div>
          )}

          <button 
            onClick={onToggleMini}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-700/70 transition-all active:scale-95 cursor-pointer shadow-xs"
            title={isMini ? "Expandir Menu" : "Recolher Menu"}
          >
            <Menu size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Profile Card */}
        {!isMini && (
          <div className="px-4 mb-3">
            <div className="bg-emerald-950/60 rounded-2xl p-3 border border-emerald-800/80 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-900/90 flex-shrink-0 flex items-center justify-center overflow-hidden border border-emerald-700/80 shadow-xs text-white">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ""} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-emerald-200 font-black text-xs">{user?.displayName?.charAt(0) || "U"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xs font-black text-white truncate tracking-tight">
                    {user?.displayName || "Usuário"}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] text-emerald-300 font-extrabold uppercase tracking-wider">
                      {isAdminUser ? "Administrador" : "Acesso Ativo"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Access Grid (Mobile Overlay) */}
        <AnimatePresence>
          {!isMini && !isDesktop && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-3 grid grid-cols-4 gap-2 flex-shrink-0 overflow-hidden"
            >
              <button 
                onClick={() => { setActiveTab("income?add=income"); onClose(); }}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-emerald-900/80 text-emerald-200 flex items-center justify-center transition-all group-hover:bg-white group-hover:text-emerald-900 group-active:scale-90 border border-emerald-700/60 shadow-xs">
                  <PlusCircle size={18} strokeWidth={2.5} />
                </div>
                <span className="text-[8px] font-black text-emerald-200 uppercase tracking-wider group-hover:text-white transition-colors truncate w-full text-center">Receita</span>
              </button>
              <button 
                onClick={() => { setActiveTab("expenses?add=expense"); onClose(); }}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-rose-950/70 text-rose-300 flex items-center justify-center transition-all group-hover:bg-[#EF4444] group-hover:text-white group-active:scale-90 border border-rose-800/60 shadow-xs">
                  <PlusCircle size={18} strokeWidth={2.5} />
                </div>
                <span className="text-[8px] font-black text-emerald-200 uppercase tracking-wider group-hover:text-white transition-colors truncate w-full text-center">Despesa</span>
              </button>
              <button 
                onClick={() => { setActiveTab("transfers?add=transfer"); onClose(); }}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-950/70 text-blue-300 flex items-center justify-center transition-all group-hover:bg-[#3B82F6] group-hover:text-white group-active:scale-90 border border-blue-800/60 shadow-xs">
                  <Repeat size={18} strokeWidth={2.5} />
                </div>
                <span className="text-[8px] font-black text-emerald-200 uppercase tracking-wider group-hover:text-white transition-colors truncate w-full text-center">Transf.</span>
              </button>
              <button 
                onClick={() => { setActiveTab("statement"); onClose(); }}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-950/70 text-purple-300 flex items-center justify-center transition-all group-hover:bg-[#8B5CF6] group-hover:text-white group-active:scale-90 border border-purple-800/60 shadow-xs">
                  <List size={18} strokeWidth={2.5} />
                </div>
                <span className="text-[8px] font-black text-emerald-200 uppercase tracking-wider group-hover:text-white transition-colors truncate w-full text-center">Extrato</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu Items Container */}
        <div className={cn(
          "flex-1 overflow-y-auto custom-scrollbar",
          isMini ? "px-2 py-3" : "px-3.5 py-2"
        )}>
          {menuGroups.map((group, idx) => (
            <div key={idx} className="mb-6 last:mb-2">
              {!isMini && (
                <div className="px-3 mb-2 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-300/60">
                    {group.title}
                  </span>
                  <div className="h-px flex-1 bg-emerald-800/60" />
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { 
                        if (mostrarMensagem) mostrarMensagem(`clicou ${item.label}`);
                        setActiveTab(item.id); 
                        onClose(); 
                      }}
                      className={cn(
                        "w-full flex items-center transition-all duration-200 group relative overflow-hidden cursor-pointer",
                        isMini 
                          ? "justify-center w-11 h-11 rounded-xl mx-auto" 
                          : "gap-3 px-3.5 py-2.5 rounded-xl",
                        isActive 
                          ? "bg-white text-emerald-950 shadow-lg shadow-black/15 font-extrabold" 
                          : "text-emerald-100/75 hover:bg-white/10 hover:text-white border border-transparent font-medium"
                      )}
                      title={isMini ? item.label : ""}
                    >
                      <item.icon 
                        size={18} 
                        strokeWidth={isActive ? 2.5 : 2}
                        className={cn(
                          "transition-colors relative z-10 flex-shrink-0",
                          isActive ? "text-emerald-700" : "text-emerald-300/80 group-hover:text-white"
                        )} 
                      />

                      {!isMini && (
                        <div className="flex-1 flex items-center justify-between overflow-hidden">
                          <span className={cn(
                            "text-xs tracking-tight truncate",
                            isActive ? "text-emerald-950 font-black" : "text-emerald-100/80 group-hover:text-white font-semibold"
                          )}>
                            {item.label}
                          </span>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {(item as any).badge && (
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-black shadow-xs",
                                isActive 
                                  ? "bg-emerald-100 text-emerald-900" 
                                  : ((item as any).badgeColor === "bg-primary-red" 
                                      ? "bg-[#EF4444] text-white" 
                                      : "bg-emerald-900 text-emerald-200 border border-emerald-700/60")
                              )}>
                                {(item as any).badge}
                              </span>
                            )}
                            {isActive && (
                              <ChevronRight size={13} strokeWidth={3} className="text-emerald-700" />
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Area with Logout Button */}
        <div className={cn(
          "p-3.5 border-t border-emerald-900/70 bg-[#053F30] flex-shrink-0 relative z-50",
          !isDesktop && "pb-[calc(5.5rem+env(safe-area-inset-bottom,20px))]"
        )}>
          <button 
            onClick={handleLogoutClick}
            className={cn(
              "w-full flex items-center justify-center gap-2.5 rounded-xl text-emerald-200 hover:text-white hover:bg-rose-950/50 hover:border-rose-700/60 transition-all active:scale-95 border border-emerald-800/80 cursor-pointer shadow-xs bg-emerald-950/40 font-bold text-xs uppercase tracking-wider",
              isMini ? "w-11 h-11 p-0 mx-auto" : "px-4 py-3"
            )}
            title="Sair da Conta"
          >
            <LogOut size={16} strokeWidth={2.5} className="text-emerald-300 group-hover:text-rose-400" />
            {!isMini && (
              <span className="whitespace-nowrap">
                Sair da Conta
              </span>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
});

export default Sidebar;
