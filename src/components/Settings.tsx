import React, { useState, useEffect } from "react";
import { UserProfile, Category, SubCategory, Tag, UserSettings } from "../types";
import { useNavigate } from "react-router-dom";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  CreditCard, 
  Trash2, 
  ChevronRight, 
  HelpCircle, 
  LogOut,
  Lock,
  Smartphone,
  Moon,
  Languages,
  Coins,
  CalendarDays,
  Database,
  Download,
  Upload,
  MessageCircle,
  Star,
  Sparkles,
  Fingerprint,
  RefreshCw,
  FileText,
  Mail,
  Camera,
  Key,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  X,
  Check,
  Plus,
  Wallet,
  Target,
  PieChart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { auth, db } from "../lib/firebase";
import { signOut, updateProfile, updatePassword, updateEmail } from "firebase/auth";
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { CategoryManager } from "./CategoryManager";
import { useSettings } from "../context/SettingsContext";

interface SettingsProps {
  user: UserProfile | null;
  onLogout: () => void;
  categories: Category[];
  subCategories: SubCategory[];
  tags: Tag[];
  mostrarMensagem?: (msg: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onLogout, categories, subCategories, tags, mostrarMensagem }) => {
  const navigate = useNavigate();
  const { settings, updateSetting, updateProfile: updateProfileSetting, resetAllData, exportData, importData, logout, executarResetCompleto } = useSettings();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  const [confirmModalContent, setConfirmModalContent] = useState<{
    title: string;
    description: string;
    actionLabel: string;
    requirePrompt?: string;
    promptHint?: string;
    onConfirm: () => void;
  } | null>(null);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Form states
  const [profileForm, setProfileForm] = useState({
    displayName: settings.name || user?.displayName || "",
    photoURL: user?.photoURL || ""
  });
  const [emailForm, setEmailForm] = useState(user?.email || "");
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  // Synchronize form states when user or settings load asynchronously
  useEffect(() => {
    if (user || settings) {
      setProfileForm({
        displayName: settings.name || user?.displayName || "",
        photoURL: user?.photoURL || ""
      });
      setEmailForm(user?.email || "");
    }
  }, [user, settings]);

  const handleLogout = async () => {
    if (mostrarMensagem) mostrarMensagem("Saindo...");
    try {
      await logout(onLogout);
    } catch (error) {
      console.error("Erro no logout:", error);
      onLogout();
    }
  };

  const handleToggle = async (id: string, currentValue: boolean) => {
    const settingsMap: { [key: string]: keyof UserSettings } = {
      "notif_enabled": "notificationsEnabled",
      "spending_alerts": "spendingAlertsEnabled",
      "goal_alerts": "goalAlertsEnabled",
      "ai_enabled": "aiEnabled",
      "sound_enabled": "soundEnabled",
      "vibration_enabled": "vibrationEnabled"
    };

    const field = settingsMap[id];
    if (!field) return;

    let newValue: any = !currentValue;

    await updateSetting(field as keyof UserSettings, newValue);
  };

  const handleUpdateSetting = async (field: keyof UserSettings, value: any) => {
    await updateSetting(field as keyof UserSettings, value);
    setActiveModal(null);
    if (field === 'currency' || field === 'dateFormat' || field === 'language') {
      window.location.reload();
    }
  };

  const handleResetData = () => {
    if (!user) return;
    
    setConfirmModalContent({
      title: "Resetar Dados",
      description: "ATENÇÃO: Isto apagará TODAS as suas transações, contas, metas, dívidas e patrimônio. Esta ação não pode ser desfeita. Deseja continuar?",
      actionLabel: "Apagar Todos os Dados",
      requirePrompt: "APAGAR TUDO",
      promptHint: "Para confirmar, digite 'APAGAR TUDO':",
      onConfirm: async () => {
        setIsSaving(true);
        if (mostrarMensagem) mostrarMensagem("Limpando dados financeiros...");

        try {
          const collectionsToClear = [
            "transactions", "accounts", "goals", "debts", "receivables", 
            "subscriptions", "wealth", "investments", "budgets", "insights",
            "debtors", "documents", "cards", "invoices", "transactionHistory", 
            "family", "family_incomes", "family_goals", "reminders", "user_events", 
            "actionPlans", "actionItems", "diagnoses", "strategic_insights",
            "investment_contributions", "score_history", "user_badges",
            "reconciliationHistory", "lifePlans", "lifePlanSimulations",
            "debtHistory", "installments"
          ];

          for (const collName of collectionsToClear) {
            try {
              const q = query(collection(db, collName), where("userId", "==", user.uid));
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                 await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
              }
            } catch (e) {
              console.warn(`Aviso no resetData: não foi possível limpar ${collName}`, e);
            }
          }

          if (mostrarMensagem) mostrarMensagem("Dados financeiros resetados com sucesso.");
          window.location.reload();
        } catch (error) {
          console.error("Erro ao resetar dados:", error);
          if (mostrarMensagem) mostrarMensagem("Houve erros durante a limpeza.");
        } finally {
          setIsSaving(false);
          setConfirmModalContent(null);
        }
      }
    });
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      await exportData(user.uid);
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      if (mostrarMensagem) mostrarMensagem("Erro ao exportar dados."); else ((window as any).mostrarMensagem || window.alert)("Erro ao exportar dados.");
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setConfirmModalContent({
      title: "Importar Dados",
      description: "Deseja importar os dados? Isso pode duplicar dados existentes caso não tenha resetado o aplicativo antes.",
      actionLabel: "Importar",
      onConfirm: async () => {
        setIsSaving(true);
        try {
          await importData(user.uid, file);
          if (mostrarMensagem) mostrarMensagem("Importação concluída com sucesso!");
          window.location.reload();
        } catch (error: any) {
          console.error("Erro ao importar dados:", error);
          if (mostrarMensagem) mostrarMensagem(`Erro ao importar: ${error.message}`);
        } finally {
          setIsSaving(false);
          setConfirmModalContent(null);
        }
      }
    });
  };

  const [isResetting, setIsResetting] = useState(false);

  const handleResetApp = () => {
    if (isResetting) return;
    
    setConfirmModalContent({
      title: "Resetar Aplicativo",
      description: "TEM CERTEZA?\n\nTodos os dados locais e remotos serão apagados permanentemente e a tela será reiniciada.\nEsta ação não pode ser desfeita.",
      actionLabel: "Resetar Aplicativo",
      onConfirm: async () => {
        setIsResetting(true);
        if (mostrarMensagem) mostrarMensagem("Iniciando reset completo...");
        
        try {
          const collectionsToClear = [
            "transactions", "accounts", "goals", "debts", "receivables", 
            "subscriptions", "wealth", "investments", "budgets", "insights",
            "debtors", "documents", "cards", "invoices", "categories",
            "subCategories", "tags", "transactionHistory", "family",
            "family_incomes", "family_goals", "reminders", "user_events", 
            "actionPlans", "actionItems", "diagnoses", "strategic_insights",
            "investment_contributions", "score_history", "user_badges",
            "reconciliationHistory", "lifePlans", "lifePlanSimulations",
            "debtHistory", "installments", "piggy_banks", "piggy_bank_history"
          ];

          if (user?.uid) {
            for (const collName of collectionsToClear) {
              try {
                const q = query(collection(db, collName), where("userId", "==", user.uid));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                  await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
                }
              } catch (e) {
                console.warn(`Aviso no reset: não foi possível limpar coleção ${collName}`, e);
              }
            }

            try {
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, { 
                settings: {
                  theme: 'light',
                  notificationsEnabled: true,
                  currency: 'BRL (R$)',
                  biometricsEnabled: false
                },
                onboardingCompleted: false,
                onboardingData: null,
                financialScore: 0
              });
            } catch(e) {
              console.warn("Falha ao resetar infos do user_doc", e);
            }
          }

          if (mostrarMensagem) mostrarMensagem("Limpando dados e cache...");
          localStorage.clear();
          sessionStorage.clear();

          try {
            if (window.indexedDB && window.indexedDB.databases) {
              const dbs = await window.indexedDB.databases();
              for (const dbInfo of dbs) {
                if (dbInfo.name) {
                  window.indexedDB.deleteDatabase(dbInfo.name);
                }
              }
            }
          } catch (e) {
            console.warn("IndexedDB clear notice:", e);
          }

          if (mostrarMensagem) mostrarMensagem("Aplicativo resetado com sucesso!");
          setTimeout(() => {
            window.location.href = "/";
          }, 400);
        } catch (error) {
          console.error("Erro principal ao resetar app:", error);
          if (mostrarMensagem) mostrarMensagem("Houve erros durante o reset.");
          setIsResetting(false);
          setConfirmModalContent(null);
        }
      }
    });
  };

  const handleDeleteAccount = () => {
    if (!user) return;
    
    setConfirmModalContent({
      title: "Excluir Minha Conta",
      description: "TEM CERTEZA? Esta ação é IRREVERSÍVEL e apagará todos os seus dados e sua conta permanentemente.",
      actionLabel: "Excluir Conta Definitivamente",
      requirePrompt: user.email || "",
      promptHint: "Para confirmar a exclusão definitiva, digite seu e-mail:",
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const collectionsToDelete = [
            "transactions", "accounts", "goals", "debts", "receivables", 
            "subscriptions", "wealth", "investments", "budgets", "insights", 
            "documents", "debtors", "categories", "subCategories", "tags"
          ];
          
          for (const collName of collectionsToDelete) {
            try {
              const q = query(collection(db, collName), where("userId", "==", user.uid));
              const snapshot = await getDocs(q);
              await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
            } catch (e) {
              console.warn("Aviso:", e);
            }
          }
          await deleteDoc(doc(db, "users", user.uid));

          if (auth.currentUser) {
            await auth.currentUser.delete();
          }
          
          if (mostrarMensagem) mostrarMensagem("Sua conta e dados foram excluídos.");
          onLogout();
        } catch (error: any) {
          console.error("Erro ao excluir conta:", error);
          if (error.code === 'auth/requires-recent-login') {
            if (mostrarMensagem) mostrarMensagem("ERRO: Faça login novamente para excluir a conta.");
          } else {
            if (mostrarMensagem) mostrarMensagem("Erro ao excluir conta. Alguns dados mantidos.");
          }
        } finally {
          setIsSaving(false);
          setConfirmModalContent(null);
        }
      }
    });
  };

  const handleItemClick = (id: string, isSwitch?: boolean, currentValue?: any) => {
    if (isSwitch) {
      handleToggle(id, !!currentValue);
      return;
    }

    if (id === "logout") {
      handleLogout();
    } else if (id === "categories") {
      setShowCategoryManager(true);
    } else if (id === "reset_data") {
      handleResetData();
    } else if (id === "reset_app") {
      handleResetApp();
    } else if (id === "export_data") {
      handleExportData();
    } else if (id === "import_data") {
      document.getElementById("import-file-input")?.click();
    } else if (id === "delete_account") {
      handleDeleteAccount();
    } else if (["accounts", "cards", "goals", "budgeting"].includes(id)) {
      navigate(`/${id}`);
    } else {
      setActiveModal(id);
    }
  };

  const desktopSettingsGroups = [
    {
      title: "Conta",
      items: [
        { id: "edit_profile", label: "Editar Perfil", icon: User, description: "Nome e foto de perfil" },
        { id: "edit_email", label: "E-mail", icon: Mail, description: user?.email || "Alterar e-mail da conta" },
        { id: "change_password", label: "Senha", icon: Key, description: "Alterar sua senha de acesso" },
      ]
    },
    {
      title: "Preferências",
      items: [
        { id: "language", label: "Idioma", icon: Languages, description: settings.language === "pt" ? "Português (Brasil)" : settings.language },
        { id: "currency", label: "Moeda", icon: Coins, description: settings.currency || "Real (R$)" },
        { id: "date_format", label: "Formato de Data", icon: CalendarDays, description: settings.dateFormat || "DD/MM/AAAA" },
      ]
    },
    {
      title: "Financeiro",
      items: [
        { id: "accounts", label: "Contas Bancárias", icon: Wallet, description: "Gerenciar contas e saldos" },
        { id: "cards", label: "Cartões de Crédito", icon: CreditCard, description: "Gerenciar cartões de crédito e faturas" },
        { id: "goals", label: "Metas Financeiras", icon: Target, description: "Acompanhar metas e conquistas" },
        { id: "budgeting", label: "Orçamentos", icon: PieChart, description: "Definir limites por categoria de gasto" },
        { id: "categories", label: "Categorias e Tags", icon: Palette, description: "Gerenciar categorias de gastos" },
        { id: "default_goals", label: "Metas Padrão", icon: Star, description: "Configurar metas sugeridas" },
        { id: "reset_data", label: "Resetar Dados", icon: RefreshCw, description: "Limpar todo o histórico financeiro", color: "text-orange-500" },
      ]
    },
    {
      title: "Dados",
      items: [
        { id: "export_data", label: "Exportar Dados", icon: Download, description: "Baixar backup em JSON" },
        { id: "import_data", label: "Importar Dados", icon: Upload, description: "Restaurar de um arquivo" },
        { id: "reset_app", label: "Resetar Aplicativo", icon: RefreshCw, description: "Apagar tudo e voltar ao início", color: "text-red-500" },
      ]
    },
    {
      title: "Notificações",
      items: [
        { id: "notif_enabled", label: "Ativar Notificações", icon: Bell, description: "Alertas gerais do app", isSwitch: true, value: settings.notificationsEnabled },
        { id: "spending_alerts", label: "Alertas de Gastos", icon: AlertCircle, description: "Aviso ao atingir 80% do orçamento", isSwitch: true, value: settings.spendingAlertsEnabled },
        { id: "goal_alerts", label: "Alertas de Metas", icon: Star, description: "Progresso e conquistas", isSwitch: true, value: settings.goalAlertsEnabled },
      ]
    },
    {
      title: "IA e Assistente",
      items: [
        { id: "ai_enabled", label: "Ativar Assistente IA", icon: Sparkles, description: "Insights e sugestões automáticas", isSwitch: true, value: settings.aiEnabled },
        { id: "ai_level", label: "Nível de Sugestões", icon: TrendingUp, description: settings.aiSuggestionLevel === "proactive" ? "Proativo" : "Reativo" },
        { id: "ai_tone", label: "Tom de Voz", icon: MessageCircle, description: settings.aiTone === "formal" ? "Formal" : "Informal" },
      ]
    },
    {
      title: "Suporte",
      items: [
        { id: "help_center", label: "Central de Ajuda", icon: HelpCircle, description: "Dúvidas frequentes" },
        { id: "terms", label: "Termos e Políticas", icon: FileText, description: "Políticas de privacidade e termos de uso" },
      ]
    }
  ];

  const mobileSettingsGroups = [
    {
      title: "Conta",
      items: [
        { id: "edit_profile", label: "Perfil", icon: User, description: "Alterar nome e foto" },
        { id: "edit_email", label: "Alterar E-mail", icon: Mail, description: user?.email },
        { id: "logout", label: "Sair da Conta", icon: LogOut, description: "Encerrar sessão atual", color: "text-rose-500" },
      ]
    },
    {
      title: "Finanças",
      items: [
        { id: "accounts", label: "Contas Bancárias", icon: Wallet, description: "Gerenciar saldos e contas" },
        { id: "cards", label: "Cartões de Crédito", icon: CreditCard, description: "Meus cartões e faturas" },
        { id: "goals", label: "Metas Financeiras", icon: Target, description: "Objetivos de poupança" },
        { id: "budgeting", label: "Orçamentos", icon: PieChart, description: "Limites e planejamentos" },
        { id: "categories", label: "Categorias e Tags", icon: Palette, description: "Organizar categorias" },
      ]
    },
    {
      title: "App",
      items: [
        { id: "notif_enabled", label: "Notificações", icon: Bell, description: "Alertas e avisos", isSwitch: true, value: settings.notificationsEnabled },
        { id: "language", label: "Idioma", icon: Globe, description: settings.language === "pt" ? "Português" : "English" },
        { id: "sound_enabled", label: "Sons", icon: Bell, description: "Efeitos sonoros", isSwitch: true, value: settings.soundEnabled },
        { id: "vibration_enabled", label: "Vibração", icon: Smartphone, description: "Resposta tátil", isSwitch: true, value: settings.vibrationEnabled },
      ]
    },
    {
      title: "Dados",
      items: [
        { id: "export_data", label: "Exportar Dados", icon: Download, description: "Baixar backup JSON" },
        { id: "reset_app", label: "Resetar Aplicativo", icon: RefreshCw, description: "Limpar tudo e recomeçar", color: "text-red-500" },
      ]
    },
    {
      title: "Suporte",
      items: [
        { id: "help_center", label: "Sobre o App", icon: HelpCircle, description: "Informações e versão" },
        { id: "terms", label: "Termos e Políticas", icon: FileText, description: "Privacidade e uso" },
      ]
    }
  ];

  if (showCategoryManager) {
    return (
      <CategoryManager 
        onClose={() => setShowCategoryManager(false)}
      />
    );
  }

  return (
    <>
      {isMobile ? (
        <div className="pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 font-display">Ajustes</h1>
            <p className="text-sm text-neutral-400 font-medium">Configurações gerais do aplicativo</p>
          </header>

          <div className="space-y-8">
            {mobileSettingsGroups.map((group, idx) => (
              <div key={idx} className="space-y-4">
                <h3 className="px-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">{group.title}</h3>
                <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm divide-y divide-neutral-50 overflow-hidden">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "logout") {
                          handleLogout();
                        } else if (item.isSwitch) {
                          handleToggle(item.id, item.value || false);
                        } else {
                          handleItemClick(item.id);
                        }
                      }}
                      className="w-full flex items-center justify-between p-5 active:bg-neutral-50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors border",
                          item.color ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-neutral-50 text-neutral-600 border-neutral-100"
                        )}>
                          <item.icon size={18} strokeWidth={2} />
                        </div>
                        <div className="text-left">
                          <p className={cn("text-sm font-semibold tracking-tight", item.color || "text-neutral-800")}>
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="text-xs text-neutral-400 font-normal truncate max-w-[180px]">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {item.isSwitch ? (
                        <div className={cn(
                          "w-12 h-6 rounded-full relative p-1 transition-all duration-300",
                          item.value ? "bg-primary-green" : "bg-neutral-200"
                        )}>
                          <motion.div 
                            animate={{ 
                              x: item.value ? 24 : 0
                            }}
                            className="w-4 h-4 rounded-full bg-white shadow-sm"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-50 text-neutral-400 active:text-neutral-800 transition-colors">
                          <ChevronRight size={16} strokeWidth={2} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="text-center pt-8 pb-4 opacity-50">
              <p className="text-xs font-medium text-neutral-400">Versão 2.0.0 (Premium)</p>
              <p className="text-[10px] font-mono text-neutral-400 mt-1">ID: {user?.uid?.substring(0, 8)}</p>
            </div>
          </div>

          {/* Categories Manager Overlay */}
          {showCategoryManager && (
            <div className="fixed inset-0 z-[200] bg-white lg:hidden overflow-y-auto">
               <CategoryManager onClose={() => setShowCategoryManager(false)} />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 font-display">Configurações</h1>
              <p className="text-sm text-neutral-500">Gerencie sua conta e preferências financeiras</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {desktopSettingsGroups.map((group, idx) => (
                <div key={idx} className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-neutral-50/50 border-b border-neutral-100">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{group.title}</h3>
                  </div>
                  <div className="divide-y divide-neutral-50">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.id, item.isSwitch, item.value)}
                        className="w-full flex items-center justify-between p-5 hover:bg-neutral-50/55 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors border",
                            item.color ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-neutral-50 text-neutral-600 border-neutral-100 group-hover:bg-white group-hover:text-slate-900 group-hover:border-primary-dark"
                          )}>
                            <item.icon size={18} />
                          </div>
                          <div className="text-left">
                            <p className={cn("text-sm font-semibold tracking-tight", item.color || "text-neutral-800")}>{item.label}</p>
                            <p className="text-xs text-neutral-400 font-normal">{item.description}</p>
                          </div>
                        </div>
                        {item.isSwitch ? (
                          <div className={cn(
                            "w-12 h-6 rounded-full relative p-1 transition-all duration-300",
                            item.value ? "bg-primary-green" : "bg-neutral-200"
                          )}>
                            <motion.div 
                              animate={{ x: item.value ? 24 : 0 }}
                              className="w-4 h-4 bg-white rounded-full shadow-sm" 
                            />
                          </div>
                        ) : (
                          <ChevronRight size={16} className="text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* No Debug Section */}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm text-center">
                <div 
                  onClick={() => setActiveModal("edit_profile")}
                  className="w-20 h-20 rounded-full bg-neutral-50 flex items-center justify-center mx-auto mb-4 border border-neutral-200 shadow-sm overflow-hidden relative group cursor-pointer"
                  title="Clique para alterar seu avatar ou nome"
                >
                  {user?.photoURL || profileForm.photoURL ? (
                    <img src={profileForm.photoURL || user?.photoURL || ""} alt={user?.displayName || ""} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-10 h-10 text-neutral-500" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={20} />
                  </div>
                </div>
                <h3 className="font-semibold text-neutral-800 tracking-tight">{settings.name || user?.displayName || "Usuário"}</h3>
                <p className="text-xs text-neutral-400 mb-6 font-medium">{user?.email}</p>
                <button 
                  onClick={handleLogout}
                  className="mt-2 w-full py-3 bg-neutral-50 text-neutral-600 border border-neutral-200/60 rounded-2xl font-semibold text-sm hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={16} />
                  Sair da Conta
                </button>
              </div>

              <div className="bg-white rounded-3xl p-6 text-slate-900 shadow-md">
                <h3 className="text-sm font-semibold mb-4 tracking-tight">Sobre o App</h3>
                <div className="space-y-4">
                  <div className="justify-between items-center text-xs flex">
                    <span className="text-neutral-400 font-medium">Versão</span>
                    <span className="font-semibold">2.0.0 (Premium)</span>
                  </div>
                  <div className="justify-between items-center text-xs flex">
                    <span className="text-neutral-400 font-medium">Sincronização na Nuvem</span>
                    <span className="font-semibold flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ativo
                    </span>
                  </div>
                  <div className="justify-between items-center text-xs flex">
                    <span className="text-neutral-400 font-medium">Espaço Usado IA</span>
                    <span className="font-semibold">14.2 KB / 100 KB</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleItemClick("delete_account")}
                className="w-full p-5 bg-rose-50 text-rose-500 rounded-3xl border border-rose-100 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rose-100/60 transition-colors"
              >
                <Trash2 size={16} />
                Excluir Minha Conta
              </button>
            </div>
          </div>

          <input 
            type="file" 
            id="import-file-input" 
            className="hidden" 
            accept=".json" 
            onChange={handleImportData} 
          />
        </div>
      )}

      {/* Modals for Settings */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-white/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {activeModal === "edit_profile" ? "Editar Perfil" : 
                     activeModal === "edit_email" ? "Alterar E-mail" :
                     activeModal === "change_password" ? "Alterar Senha" :
                     activeModal === "currency" ? "Escolher Moeda" :
                     activeModal === "language" ? "Escolher Idioma" :
                     activeModal === "date_format" ? "Formato de Data" :
                     activeModal === "ai_level" ? "Nível da IA" :
                     activeModal === "ai_tone" ? "Tom de Voz IA" :
                     activeModal === "help_center" ? "Central de Ajuda" :
                     activeModal === "default_goals" ? "Metas Padrão" :
                     activeModal === "terms" ? "Termos e Políticas" :
                     "Configuração"}
                  </h2>
                  <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                {activeModal === "default_goals" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 mb-4">Selecione metas sugeridas para adicionar ao seu plano:</p>
                    {[
                      { label: "Reserva de Emergência", value: 10000 },
                      { label: "Viagem de Férias", value: 5000 },
                      { label: "Aposentadoria", value: 500000 },
                      { label: "Comprar Carro", value: 40000 }
                    ].map((goal) => (
                      <button 
                        key={goal.label}
                        onClick={async () => {
                          if (!user) return;
                          try {
                            await addDoc(collection(db, "goals"), {
                              userId: user.uid,
                              title: goal.label,
                              targetValue: goal.value,
                              currentValue: 0,
                              deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                              category: "Geral",
                              status: "em_andamento",
                              createdAt: serverTimestamp()
                            });
                            if (mostrarMensagem) mostrarMensagem(`Meta "${goal.label}" adicionada!`);
                          } catch (error) {
                            if (mostrarMensagem) mostrarMensagem("Erro ao adicionar meta.");
                          }
                        }}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all font-bold text-slate-900"
                      >
                        <span>{goal.label}</span>
                        <Plus size={18} />
                      </button>
                    ))}
                  </div>
                )}

                {activeModal === "edit_profile" && (
                  <div className="space-y-6">
                    {/* Current Avatar Preview & Upload */}
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500 shadow-md bg-neutral-100 flex items-center justify-center">
                        {profileForm.photoURL ? (
                          <img 
                            src={profileForm.photoURL} 
                            alt="Avatar preview" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <User size={40} className="text-neutral-400" />
                        )}
                        <label 
                          htmlFor="avatar-file-input"
                          className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Camera size={20} />
                          <span className="text-[10px] font-bold mt-1">Trocar</span>
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <label 
                          htmlFor="avatar-file-input"
                          className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Upload size={14} /> Enviar Foto do Dispositivo
                        </label>
                        <input 
                          type="file" 
                          id="avatar-file-input" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                if (mostrarMensagem) mostrarMensagem("Aviso: Escolha uma imagem menor que 2MB.");
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const base64 = ev.target?.result as string;
                                setProfileForm(prev => ({ ...prev, photoURL: base64 }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Presets Gallery */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ou escolha um avatar exclusivo:</label>
                      <div className="grid grid-cols-4 gap-2.5">
                        {[
                          "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
                          "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
                          "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
                          "https://api.dicebear.com/7.x/avataaars/svg?seed=Sara",
                          "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas",
                          "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
                          "https://api.dicebear.com/7.x/bottts/svg?seed=FinBot",
                          "https://api.dicebear.com/7.x/lorelei/svg?seed=Luna",
                        ].map((avatarUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setProfileForm(prev => ({ ...prev, photoURL: avatarUrl }))}
                            className={cn(
                              "aspect-square rounded-2xl p-1 border-2 transition-all overflow-hidden flex items-center justify-center hover:scale-105",
                              profileForm.photoURL === avatarUrl 
                                ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20" 
                                : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            )}
                          >
                            <img src={avatarUrl} alt={`Avatar ${idx}`} className="w-full h-full object-contain" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nome de Exibição</label>
                      <input 
                        type="text"
                        value={profileForm.displayName}
                        onChange={(e) => setProfileForm({...profileForm, displayName: e.target.value})}
                        className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-900"
                        placeholder="Seu nome"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">URL da Imagem (Opcional)</label>
                      <input 
                        type="text"
                        value={profileForm.photoURL.startsWith("data:") ? "(Imagem enviada do dispositivo)" : profileForm.photoURL}
                        onChange={(e) => setProfileForm({...profileForm, photoURL: e.target.value})}
                        className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-medium text-slate-800"
                        placeholder="https://..."
                      />
                    </div>

                    <button 
                      disabled={isSaving}
                      onClick={async () => {
                        setIsSaving(true);
                        try {
                          if (auth.currentUser) {
                            try {
                              await updateProfile(auth.currentUser, {
                                displayName: profileForm.displayName,
                                photoURL: profileForm.photoURL
                              });
                            } catch (e) {}
                          }

                          await updateProfileSetting({
                            displayName: profileForm.displayName,
                            photoURL: profileForm.photoURL
                          });

                          await updateSetting("name", profileForm.displayName);

                          // Update custom user in localStorage for guest/offline support
                          try {
                            const customUserStr = localStorage.getItem("finassist_custom_user");
                            const customObj = customUserStr ? JSON.parse(customUserStr) : (user || {});
                            customObj.displayName = profileForm.displayName;
                            customObj.photoURL = profileForm.photoURL;
                            localStorage.setItem("finassist_custom_user", JSON.stringify(customObj));
                            window.dispatchEvent(new CustomEvent("user_profile_updated", { detail: customObj }));
                          } catch (e) {}

                          if (mostrarMensagem) mostrarMensagem("Perfil e avatar atualizados com sucesso!");
                          setActiveModal(null);
                        } catch (error) {
                          console.error("Erro ao atualizar perfil:", error);
                          if (mostrarMensagem) mostrarMensagem("Perfil atualizado localmente!");
                          setActiveModal(null);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>
                )}

                {activeModal === "edit_email" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Novo E-mail</label>
                      <input 
                        type="email"
                        value={emailForm}
                        onChange={(e) => setEmailForm(e.target.value)}
                        placeholder="exemplo@email.com"
                        className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 font-bold"
                      />
                    </div>
                    <button 
                      disabled={isSaving}
                      onClick={async () => {
                        if (!auth.currentUser) return;
                        setIsSaving(true);
                        try {
                          await updateEmail(auth.currentUser, emailForm);
                          if (mostrarMensagem) mostrarMensagem("E-mail atualizado!");
                          setActiveModal(null);
                        } catch (error: any) {
                          if (mostrarMensagem) mostrarMensagem(error.message || "Erro ao atualizar e-mail.");
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-lg shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:bg-white/90 transition-all disabled:opacity-50"
                    >
                      {isSaving ? "Atualizando..." : "Atualizar E-mail"}
                    </button>
                  </div>
                )}

                {activeModal === "change_password" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nova Senha</label>
                      <input 
                        type="password"
                        value={passwordForm.new}
                        onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                        className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confirmar Senha</label>
                      <input 
                        type="password"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                        className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark/5 font-bold"
                      />
                    </div>
                    <button 
                      disabled={isSaving}
                      onClick={async () => {
                        if (!auth.currentUser) return;
                        if (passwordForm.new !== passwordForm.confirm) {
                          if (mostrarMensagem) mostrarMensagem("As senhas não coincidem.");
                          return;
                        }
                        setIsSaving(true);
                        try {
                          await updatePassword(auth.currentUser, passwordForm.new);
                          if (mostrarMensagem) mostrarMensagem("Senha atualizada!");
                          setActiveModal(null);
                        } catch (error: any) {
                          if (mostrarMensagem) mostrarMensagem(error.message || "Erro ao atualizar senha.");
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-lg shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:bg-white/90 transition-all disabled:opacity-50"
                    >
                      {isSaving ? "Atualizando..." : "Atualizar Senha"}
                    </button>
                  </div>
                )}

                {activeModal === "currency" && (
                  <div className="grid grid-cols-1 gap-3">
                    {["BRL (R$)", "USD ($)", "EUR (€)", "GBP (£)"].map((curr) => (
                      <button 
                        key={curr}
                        onClick={() => handleUpdateSetting("currency", curr)}
                        className={cn(
                          "flex items-center justify-between p-5 rounded-2xl border transition-all font-bold cursor-pointer",
                          (settings.currency || "BRL (R$)") === curr ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500" : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        {curr}
                        {(settings.currency || "BRL (R$)") === curr && <Check size={20} className="text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}

                {activeModal === "language" && (
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: "pt", label: "Português (Brasil)" },
                      { id: "en", label: "English (US)" },
                      { id: "es", label: "Español" }
                    ].map((lang) => (
                      <button 
                        key={lang.id}
                        onClick={() => handleUpdateSetting("language", lang.id)}
                        className={cn(
                          "flex items-center justify-between p-5 rounded-2xl border transition-all font-bold cursor-pointer",
                          (settings.language || "pt") === lang.id ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500" : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        {lang.label}
                        {(settings.language || "pt") === lang.id && <Check size={20} className="text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}

                {activeModal === "date_format" && (
                  <div className="grid grid-cols-1 gap-3">
                    {["DD/MM/AAAA", "MM/DD/AAAA", "AAAA-MM-DD"].map((fmt) => (
                      <button 
                        key={fmt}
                        onClick={() => handleUpdateSetting("dateFormat", fmt)}
                        className={cn(
                          "flex items-center justify-between p-5 rounded-2xl border transition-all font-bold cursor-pointer",
                          (settings.dateFormat || "DD/MM/AAAA") === fmt ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500" : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        {fmt}
                        {(settings.dateFormat || "DD/MM/AAAA") === fmt && <Check size={20} className="text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}

                {activeModal === "ai_level" && (
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: "proactive", label: "Proativo", desc: "IA sugere insights sem você pedir" },
                      { id: "reactive", label: "Reativo", desc: "IA responde apenas quando solicitada" }
                    ].map((lvl) => (
                      <button 
                        key={lvl.id}
                        onClick={() => handleUpdateSetting("aiSuggestionLevel", lvl.id as any)}
                        className={cn(
                          "flex flex-col items-start p-5 rounded-2xl border transition-all cursor-pointer",
                          (settings.aiSuggestionLevel || "proactive") === lvl.id ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={cn("font-bold", (settings.aiSuggestionLevel || "proactive") === lvl.id ? "text-emerald-950" : "text-slate-900")}>{lvl.label}</span>
                          {(settings.aiSuggestionLevel || "proactive") === lvl.id && <Check size={20} className="text-emerald-600" />}
                        </div>
                        <span className="text-xs text-gray-500">{lvl.desc}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeModal === "ai_tone" && (
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: "informal", label: "Informal", desc: "Linguagem amigável e descontraída" },
                      { id: "formal", label: "Formal", desc: "Linguagem técnica e direta" }
                    ].map((tone) => (
                      <button 
                        key={tone.id}
                        onClick={() => handleUpdateSetting("aiTone", tone.id as any)}
                        className={cn(
                          "flex flex-col items-start p-5 rounded-2xl border transition-all cursor-pointer",
                          (settings.aiTone || "informal") === tone.id ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500" : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={cn("font-bold", (settings.aiTone || "informal") === tone.id ? "text-emerald-950" : "text-slate-900")}>{tone.label}</span>
                          {(settings.aiTone || "informal") === tone.id && <Check size={20} className="text-emerald-600" />}
                        </div>
                        <span className="text-xs text-gray-500">{tone.desc}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeModal === "help_center" && (
                  <div className="space-y-6">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <h4 className="font-bold text-slate-900 mb-2">Como resetar meus dados?</h4>
                      <p className="text-sm text-gray-500">Vá em Financeiro &gt; Resetar Dados e siga as instruções de confirmação.</p>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <h4 className="font-bold text-slate-900 mb-2">O backup é seguro?</h4>
                      <p className="text-sm text-gray-500">Sim, todos os seus dados são criptografados e armazenados com segurança na nuvem do Google.</p>
                    </div>
                    <button 
                      onClick={() => setActiveModal(null)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                )}

                {activeModal === "terms" && (
                  <div className="space-y-6">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                      <h4 className="font-bold text-slate-900 mb-2">Termos de Uso</h4>
                      <p className="text-sm text-gray-500 mb-4">Ao usar o Bolso+, você concorda que todas as informações registradas são de sua responsabilidade e que o aplicativo não fornece aconselhamento financeiro profissional.</p>
                      <h4 className="font-bold text-slate-900 mb-2">Política de Privacidade</h4>
                      <p className="text-sm text-gray-500">Seus dados são armazenados localmente e/ou em nossos servidores (se estiver com backup ativado) e nunca são compartilhados ou vendidos para terceiros. Você pode apagar todos os seus dados a qualquer momento em "Resetar Dados".</p>
                    </div>
                    <button 
                      onClick={() => setActiveModal(null)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-colors cursor-pointer"
                    >
                      Entendido
                    </button>
                  </div>
                )}

                {!["edit_profile", "edit_email", "change_password", "currency", "language", "date_format", "ai_level", "ai_tone", "help_center", "default_goals", "terms"].includes(activeModal) && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="text-emerald-600" size={32} />
                    </div>
                    <p className="text-gray-500 font-medium">Esta funcionalidade está sendo preparada para a próxima atualização premium.</p>
                    <button 
                      onClick={() => setActiveModal(null)}
                      className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-colors cursor-pointer"
                    >
                      Entendi
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {confirmModalContent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative"
            >
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-center text-slate-900 mb-4 tracking-tight">{confirmModalContent.title}</h3>
              <p className="text-center text-gray-500 mb-6 text-sm font-medium whitespace-pre-wrap">
                {confirmModalContent.description}
              </p>
              
              {confirmModalContent.requirePrompt && (
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
                    {confirmModalContent.promptHint || "Digite para confirmar"}
                  </label>
                  <input
                    type="text"
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    placeholder={confirmModalContent.requirePrompt}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-4 text-center font-bold text-rose-500 outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setConfirmModalContent(null);
                    setPromptValue("");
                  }}
                  className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                  disabled={isSaving || isResetting}
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (confirmModalContent.requirePrompt && promptValue !== confirmModalContent.requirePrompt) {
                      if (mostrarMensagem) mostrarMensagem("Confirmação incorreta.");
                      return;
                    }
                    confirmModalContent.onConfirm();
                  }}
                  disabled={isSaving || isResetting || (confirmModalContent.requirePrompt ? promptValue !== confirmModalContent.requirePrompt : false)}
                  className="flex-1 py-4 font-bold text-white bg-rose-500 rounded-2xl shadow-lg shadow-rose-500/20 hover:bg-rose-600 focus:bg-rose-600 transition-all disabled:opacity-50"
                >
                  {isSaving || isResetting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    confirmModalContent.actionLabel
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Settings;
