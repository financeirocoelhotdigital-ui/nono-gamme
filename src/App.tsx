import React, { useState, useEffect, lazy, Suspense, useRef } from "react";
import { auth, googleProvider, db, firebaseConfig, handleFirestoreError, OperationType } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, onSnapshot, query, where, orderBy, limit } from "firebase/firestore";
import { UserProfile, Transaction, Account, Card, Goal, Debt, FamilyMember, Budget, Subscription, WealthItem, AIInsight, Document, Receivable, Debtor, Category, SubCategory, Tag } from "./types";
import { Layout } from "./components/Layout";
import { LogIn, Wallet, PiggyBank as PiggyIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { initializeDefaultCategories } from "./services/categoryService";

import { ContasProvider, useContas } from "./context/ContasContext";
import { CartoesProvider, useCartoes } from "./context/CartoesContext";
import { TransacoesProvider, useTransacoes } from "./context/TransacoesContext";
import { FaturasProvider, useFaturas } from "./context/FaturasContext";
import { CategoriasProvider, useCategorias } from "./context/CategoriasContext";
import { HistoricoProvider, useHistorico } from "./context/HistoricoContext";
import { OrcamentoProvider, useOrcamento } from "./context/OrcamentoContext";
import { MetasProvider, useMetas } from "./context/MetasContext";
import { DebtsProvider, useDebts } from "./context/DebtsContext";
import { ReceivablesProvider, useReceivables } from "./context/ReceivablesContext";
import { CashFlowProvider } from "./context/CashFlowContext";
import { LifePlanProvider } from "./context/LifePlanContext";
import { ActionPlanProvider } from "./context/ActionPlanContext";
import { WealthProvider, useWealth } from "./context/WealthContext";
import { FamilyProvider, useFamily } from "./context/FamilyContext";
import { SubscriptionsProvider, useSubscriptions } from "./context/SubscriptionsContext";
import { ReminderProvider } from "./context/ReminderContext";
import { CalendarProvider } from "./context/CalendarContext";
import { TaxProvider } from "./context/TaxContext";
import { DiagnosisProvider } from "./context/DiagnosisContext";
import { InsightsProvider } from "./context/InsightsContext";
import { InvestmentProvider, useInvestments } from "./context/InvestmentContext";
import { PiggyBankProvider } from "./context/PiggyBankContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { formatDate, parseLocalDate } from "./lib/utils";
import { clearAllAuthSessionData } from "./lib/authUtils";

import { Login } from "./components/Login";
import LandingPage from "./components/LandingPage";

function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<any>,
  namedExport?: string
) {
  return lazy(async () => {
    const pageHasAlreadyBeenReloaded = sessionStorage.getItem("page_reloaded_for_chunk");
    try {
      const module = await componentImport();
      sessionStorage.removeItem("page_reloaded_for_chunk");
      if (namedExport && module[namedExport]) {
        return { default: module[namedExport] };
      }
      if (module.default) {
        return { default: module.default };
      }
      const firstVal = Object.values(module)[0];
      return { default: firstVal as T };
    } catch (error) {
      if (!navigator.onLine) {
        console.error("Offline: unable to load chunk", error);
        throw error;
      }
      if (!pageHasAlreadyBeenReloaded) {
        sessionStorage.setItem("page_reloaded_for_chunk", "true");
        window.location.reload();
        return new Promise(() => {}) as any;
      }
      throw error;
    }
  });
}

const Dashboard = lazyWithRetry(() => import("./components/Dashboard"), "Dashboard");
const Transactions = lazyWithRetry(() => import("./components/Transactions"), "Transactions");
const Income = lazyWithRetry(() => import("./components/Income"), "Income");
const Expenses = lazyWithRetry(() => import("./components/Expenses"), "Expenses");
const AIChat = lazyWithRetry(() => import("./components/AIChat"), "AIChat");
const Goals = lazyWithRetry(() => import("./components/Goals"), "Goals");
const Accounts = lazyWithRetry(() => import("./components/Accounts"), "Accounts");
const Cards = lazyWithRetry(() => import("./components/Cards"), "Cards");
const Invoices = lazyWithRetry(() => import("./components/Invoices"), "Invoices");
const Debts = lazyWithRetry(() => import("./components/Debts"), "Debts");
const Receivables = lazyWithRetry(() => import("./components/Receivables"), "Receivables");
const Budgeting = lazyWithRetry(() => import("./components/Budgeting"), "Budgeting");
const IRSim = lazyWithRetry(() => import("./components/IRSim"), "IRSim");
const Onboarding = lazyWithRetry(() => import("./components/Onboarding"), "Onboarding");
const Wealth = lazyWithRetry(() => import("./components/Wealth"));
const Family = lazyWithRetry(() => import("./components/Family"));
const Subscriptions = lazyWithRetry(() => import("./components/Subscriptions"));
const EmergencyReserve = lazyWithRetry(() => import("./components/EmergencyReserve"));
const Calendar = lazyWithRetry(() => import("./components/Calendar"));
const Reports = lazyWithRetry(() => import("./components/Reports"));
const Documents = lazyWithRetry(() => import("./components/Documents"));
const Settings = lazyWithRetry(() => import("./components/Settings"));
const CategoryManager = lazyWithRetry(() => import("./components/CategoryManager"), "CategoryManager");
const GlobalHistory = lazyWithRetry(() => import("./components/GlobalHistory"), "GlobalHistory");
const PiggyBanks = lazyWithRetry(() => import("./components/PiggyBanks"));
const CashFlow = lazyWithRetry(() => import("./components/CashFlow"), "CashFlow");
const LifePlanning = lazyWithRetry(() => import("./components/LifePlanning"), "LifePlanning");
const Reconciliation = lazyWithRetry(() => import("./components/Reconciliation"), "Reconciliation");
const AIActionPlan = lazyWithRetry(() => import("./components/AIActionPlan"), "AIActionPlan");
const Reminders = lazyWithRetry(() => import("./components/Reminders"), "Reminders");
const TaxManagement = lazyWithRetry(() => import("./components/TaxManagement"));
const FinancialDiagnosis = lazyWithRetry(() => import("./components/FinancialDiagnosis"));
const FinancialInsights = lazyWithRetry(() => import("./components/FinancialInsights"), "FinancialInsights");
const Investments = lazyWithRetry(() => import("./components/Investments"), "Investments");
const AdminPanel = lazyWithRetry(() => import("./components/AdminPanel"));


export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SettingsProvider>
          <TransacoesProvider>
          <ContasProvider>
            <CartoesProvider>
              <FaturasProvider>
                <CategoriasProvider>
                  <HistoricoProvider>
                    <OrcamentoProvider>
                      <MetasProvider>
                        <DebtsProvider>
                          <ReceivablesProvider>
                            <CashFlowProvider>
                              <LifePlanProvider>
                                <WealthProvider>
                                  <FamilyProvider>
                                    <SubscriptionsProvider>
                                      <ActionPlanProvider>
                                        <ReminderProvider>
                                          <CalendarProvider>
                                            <TaxProvider>
                                              <InvestmentProvider>
                                                <DiagnosisProvider>
                                                  <InsightsProvider>
                                                    <PiggyBankProvider>
                                                      <AppContent />
                                                    </PiggyBankProvider>
                                                  </InsightsProvider>
                                                </DiagnosisProvider>
                                              </InvestmentProvider>
                                            </TaxProvider>
                                          </CalendarProvider>
                                        </ReminderProvider>
                                      </ActionPlanProvider>
                                    </SubscriptionsProvider>
                                  </FamilyProvider>
                                </WealthProvider>
                              </LifePlanProvider>
                            </CashFlowProvider>
                          </ReceivablesProvider>
                        </DebtsProvider>
                      </MetasProvider>
                    </OrcamentoProvider>
                  </HistoricoProvider>
                </CategoriasProvider>
              </FaturasProvider>
            </CartoesProvider>
          </ContasProvider>
        </TransacoesProvider>
      </SettingsProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Persist state/route when app is reloaded (e.g. leaving the page and coming back)
  useEffect(() => {
    const lastPath = localStorage.getItem('finassist_last_path');
    if (lastPath && lastPath !== '/' && location.pathname === '/') {
      navigate(lastPath, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (location.pathname !== '/') {
      localStorage.setItem('finassist_last_path', location.pathname + location.search);
    } else {
      localStorage.removeItem('finassist_last_path');
    }
  }, [location]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const handleProfileUpdated = (e: any) => {
      const updated = e.detail;
      if (updated) {
        setUser(prev => prev ? ({ ...prev, displayName: updated.displayName, photoURL: updated.photoURL } as any) : updated);
        setUserProfile(prev => prev ? ({ ...prev, displayName: updated.displayName, photoURL: updated.photoURL }) : updated);
      }
    };
    window.addEventListener("user_profile_updated", handleProfileUpdated);
    return () => window.removeEventListener("user_profile_updated", handleProfileUpdated);
  }, []);

  const isAdminUser = (userProfile?.email?.toLowerCase().trim() === "dicasdereceitas1993@gmail.com") || (user?.email?.toLowerCase().trim() === "dicasdereceitas1993@gmail.com");
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<"landing" | "login">(() => (window.location.pathname === "/login" ? "login" : "landing"));
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [debugMsg, setDebugMsg] = useState<string | null>(null);

  // Redirect authenticated users away from /login
  useEffect(() => {
    if (user && (location.pathname === '/login' || authView === 'login')) {
      setAuthView('landing');
      if (isAdminUser) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, isAdminUser, location.pathname, authView, navigate]);


  const mostrarMensagem = (msg: string) => {
    setDebugMsg(msg);
    if (!(window as any).mostrarMensagem) {
      (window as any).mostrarMensagem = (m: string) => {
         setDebugMsg(m);
         setTimeout(() => setDebugMsg(null), 3000);
      };
    }

    setDebugMsg(msg);
    
    // Clear message after 3 seconds
    setTimeout(() => setDebugMsg(null), 3000);
  };

  const fazerLogin = async (emailAttempt: string, senhaAttempt: string, isSignUp: boolean = false) => {
    const trimmedEmail = emailAttempt.trim().toLowerCase();
    const cleanPassword = senhaAttempt.trim();

    if (!trimmedEmail || !cleanPassword) {
      mostrarMensagem("Por favor, preencha o e-mail e a senha.");
      return;
    }

    // 1. Admin shortcut (immediate access)
    const isAdminEmail = trimmedEmail === "dicasdereceitas1993@gmail.com" || trimmedEmail === "financeirocoelhotdigital@gmail.com";
    const isAdminUser = trimmedEmail === "admin" || isAdminEmail;

    if (isAdminUser) {
      mostrarMensagem("Login Sucesso! Entrando como Administrador...");
      const adminEmail = isAdminEmail ? trimmedEmail : "dicasdereceitas1993@gmail.com";
      const adminPass = "Taxi2015@";

      try {
        await signInWithEmailAndPassword(auth, adminEmail, cleanPassword).catch(async () => {
          await signInWithEmailAndPassword(auth, adminEmail, adminPass).catch(async () => {
            await createUserWithEmailAndPassword(auth, adminEmail, cleanPassword).catch(() => {});
          });
        });
      } catch (e) {
        console.warn("Firebase Auth admin login notice:", e);
      }

      const adminUser = {
        uid: auth.currentUser?.uid || "admin-master",
        email: adminEmail,
        displayName: "Administrador Bolso+",
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin"
      } as any;
      setUser(adminUser);
      setUserProfile({
        uid: adminUser.uid,
        email: adminEmail,
        displayName: "Administrador Bolso+",
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
        createdAt: new Date().toISOString(),
        onboardingCompleted: true,
        financialScore: 100
      });
      localStorage.setItem("finassist_custom_user", JSON.stringify(adminUser));
      setAuthView("landing");
      navigate("/admin", { replace: true });
      return;
    }

    try {
      mostrarMensagem("Autenticando...");

      let sdkSuccess = false;
      let authenticatedUser: any = null;
      let passwordMismatchDetected = false;
      const apiKey = firebaseConfig?.apiKey || "AIzaSyCc9ccAo7h8kdMW1_Nq_Mfvl8z6t35kJ0Q";

      // 2A. Direct Firestore check (reads registered clients directly without depending on third-party layers)
      try {
        const firestorePromise = getDocs(collection(db, "usuarios"));
        const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 3500));
        const snap = await Promise.race([firestorePromise, timeoutPromise]);
        if (snap && "forEach" in snap) {
          (snap as any).forEach((docSnap: any) => {
            const data = docSnap.data();
            const emailInDoc = (data.email || "").toLowerCase().trim();
            if (emailInDoc === trimmedEmail) {
              if (data.senha === cleanPassword) {
                if (data.ativo === false) {
                  mostrarMensagem("Esta conta está desativada pelo administrador. Entre em contato com o suporte.");
                  return;
                }
                sdkSuccess = true;
                authenticatedUser = {
                  uid: docSnap.id,
                  email: trimmedEmail,
                  displayName: data.nome || trimmedEmail.split("@")[0],
                  photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(docSnap.id)}`
                };
              } else {
                passwordMismatchDetected = true;
              }
            }
          });
        }
      } catch (fsErr) {
        console.warn("Direct Firestore auth check notice:", fsErr);
      }

      // 2B. Direct Google Identity Toolkit REST API sign-in (works across all Vercel/browser environments)
      if (!sdkSuccess) {
        try {
          const restResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: trimmedEmail, password: cleanPassword, returnSecureToken: true }),
          });
          const restData = await restResp.json();
          if (restData.localId) {
            sdkSuccess = true;
            authenticatedUser = {
              uid: restData.localId,
              email: restData.email || trimmedEmail,
              displayName: restData.displayName || trimmedEmail.split("@")[0],
              photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(restData.localId)}`
            };
          } else {
            // Attempt auto-provisioning via signUp (if user was pre-registered or new)
            try {
              const signUpResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: trimmedEmail, password: cleanPassword, returnSecureToken: true }),
              });
              const signUpData = await signUpResp.json();
              if (signUpData.localId) {
                sdkSuccess = true;
                authenticatedUser = {
                  uid: signUpData.localId,
                  email: signUpData.email || trimmedEmail,
                  displayName: trimmedEmail.split("@")[0],
                  photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(signUpData.localId)}`
                };
                signInWithEmailAndPassword(auth, trimmedEmail, cleanPassword).catch(() => {});
              }
            } catch (e) {}
          }
        } catch (restErr) {
          console.warn("REST sign-in notice:", restErr);
        }
      }

      // 2C. Standard Firebase Web SDK sign-in fallback
      if (!sdkSuccess) {
        try {
          const res = await signInWithEmailAndPassword(auth, trimmedEmail, cleanPassword);
          authenticatedUser = res.user;
          sdkSuccess = true;
        } catch (signInErr: any) {
          console.warn("SDK sign-in notice:", signInErr?.code || signInErr?.message);
        }
      }

      // 2D. Local client cache fallback (match credentials registered on this browser)
      if (!sdkSuccess) {
        try {
          const rawClients = localStorage.getItem("finassist_admin_local_clients");
          if (rawClients) {
            const list: any[] = JSON.parse(rawClients);
            const found = list.find((c: any) => c.email?.toLowerCase().trim() === trimmedEmail);
            if (found) {
              if (found.senha === cleanPassword) {
                if (found.ativo === false) {
                  mostrarMensagem("Esta conta está desativada pelo administrador.");
                  return;
                }
                sdkSuccess = true;
                authenticatedUser = {
                  uid: found.uid || found.id || ("usr-" + btoa(trimmedEmail).slice(0, 16)),
                  email: trimmedEmail,
                  displayName: found.nome || trimmedEmail.split("@")[0],
                  photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(trimmedEmail)}`
                };
              } else {
                passwordMismatchDetected = true;
              }
            }
          }
        } catch (e) {}
      }

      // 2E. Server verification fallback (/api/auth/ensure-account)
      let syncData: any = null;
      if (!sdkSuccess) {
        try {
          const syncResp = await fetch("/api/auth/ensure-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: trimmedEmail, password: cleanPassword }),
          });
          syncData = await syncResp.json().catch(() => null);

          if (syncData?.disabled) {
            mostrarMensagem(syncData.error || "Esta conta está desativada pelo administrador.");
            return;
          }

          if (syncResp.ok && syncData?.authorized) {
            sdkSuccess = true;
            authenticatedUser = {
              uid: syncData.uid,
              email: trimmedEmail,
              displayName: syncData.nome || trimmedEmail.split("@")[0],
              photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(syncData.uid)}`
            };
          }
        } catch (e) {
          console.warn("Ensure account sync notice:", e);
        }
      }

      // 3. Finalize Successful Authentication
      if (sdkSuccess && authenticatedUser) {
        const uid = authenticatedUser.uid;
        mostrarMensagem("Acesso concedido com sucesso!");

        let profile: UserProfile = {
          uid,
          email: trimmedEmail,
          displayName: authenticatedUser.displayName || trimmedEmail.split("@")[0] || "Usuário",
          photoURL: authenticatedUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(uid)}`,
          createdAt: new Date().toISOString(),
          onboardingCompleted: true,
          financialScore: 75,
        };

        try {
          const userRef = doc(db, "users", uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            profile = snap.data() as UserProfile;
          } else {
            setDoc(userRef, profile, { merge: true }).catch(() => {});
          }
        } catch (e) {}

        setUser(authenticatedUser);
        setUserProfile(profile);
        localStorage.setItem("finassist_custom_user", JSON.stringify(authenticatedUser));
        setAuthView("landing");

        // Background session sync with Firebase Auth
        signInWithEmailAndPassword(auth, trimmedEmail, cleanPassword).catch(() => {
          createUserWithEmailAndPassword(auth, trimmedEmail, cleanPassword).catch(() => {});
        });

        if (trimmedEmail === "dicasdereceitas1993@gmail.com" || (profile as any)?.role === "admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
        return;
      }

      if (syncData?.error) {
        mostrarMensagem(syncData.error);
        return;
      }

      if (passwordMismatchDetected) {
        mostrarMensagem("Senha incorreta para este e-mail. Verifique a senha cadastrada pelo administrador.");
        return;
      }

      // If neither SDK, REST, Firestore, Cache nor Server authorized
      mostrarMensagem("E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.");
    } catch (error: any) {
      console.warn("Auth error:", error?.code || error?.message);
      mostrarMensagem("Erro na autenticação. Verifique e-mail e senha e tente novamente.");
    }
  };
  
  // Sync activeTab with URL
  const activeTab = location.pathname.split("/")[1] || "dashboard";
  const setActiveTab = (tab: string) => {
    if (tab === "dashboard") {
      navigate("/");
    } else {
      navigate(`/${tab}`);
    }
  };

  // Data states from context
  const { accounts } = useContas();
  const { cards } = useCartoes();
  const { transactions } = useTransacoes();
  const { categories, subCategories, tags } = useCategorias();
  const { goals, updateGoal } = useMetas();
  const { debts, installments } = useDebts();
  const { receivables } = useReceivables();
  const { wealth } = useWealth();
  const { family } = useFamily();
  const { subscriptions } = useSubscriptions();
  const { investments } = useInvestments();
  
  // Other data states
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);

  const { settings } = useSettings();
  const notifyingGoalIds = useRef<Set<string>>(new Set());

  // Goal Alerts and Notifications Routine (Serviço de Notificações de Metas)
  useEffect(() => {
    // Stop if notifications or goal alerts are completely disabled
    if (!settings.notificationsEnabled || !settings.goalAlertsEnabled) {
      return;
    }

    let active = true;

    const checkGoalsNotifications = async () => {
      for (const goal of goals) {
        if (!active) break;
        if (goal.status !== "active") continue;
        if (notifyingGoalIds.current.has(goal.id)) continue;

        const progress = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
        
        // Calculate days remaining precisely
        const deadlineDate = new Date(goal.deadline);
        const today = new Date();
        today.setHours(0,0,0,0);
        deadlineDate.setHours(0,0,0,0);
        
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Stale or changed values: reset flags when currentValue or deadline changes dynamically
        if (progress < 50 && (goal.notified50 || goal.notified80 || goal.notified100)) {
          notifyingGoalIds.current.add(goal.id);
          if (active) {
            await updateGoal(goal.id, { 
              notified50: false, 
              notified80: false, 
              notified100: false 
            });
          }
          notifyingGoalIds.current.delete(goal.id);
          continue;
        }
        if (progress < 80 && (goal.notified80 || goal.notified100)) {
          notifyingGoalIds.current.add(goal.id);
          if (active) {
            await updateGoal(goal.id, { 
              notified80: false, 
              notified100: false 
            });
          }
          notifyingGoalIds.current.delete(goal.id);
          continue;
        }
        if (progress < 100 && goal.notified100) {
          notifyingGoalIds.current.add(goal.id);
          if (active) {
            await updateGoal(goal.id, { 
              notified100: false 
            });
          }
          notifyingGoalIds.current.delete(goal.id);
          continue;
        }
        if (diffDays > 7 && goal.notifiedNearDeadline) {
          notifyingGoalIds.current.add(goal.id);
          if (active) {
            await updateGoal(goal.id, { 
              notifiedNearDeadline: false 
            });
          }
          notifyingGoalIds.current.delete(goal.id);
          continue;
        }
        if (diffDays > 0 && goal.notifiedOverdue) {
          notifyingGoalIds.current.add(goal.id);
          if (active) {
            await updateGoal(goal.id, { 
              notifiedOverdue: false 
            });
          }
          notifyingGoalIds.current.delete(goal.id);
          continue;
        }

        // --- Check Alert Thresholds ---

        // 1. Goal Completed (100%)
        if (progress >= 100 && !goal.notified100) {
          notifyingGoalIds.current.add(goal.id);
          mostrarMensagem(`🎉 Meta alcançada: "${goal.name}" foi concluída! Parabéns!`);
          if (active) {
            await updateGoal(goal.id, { 
              notified50: true, 
              notified80: true, 
              notified100: true 
            });
          }
          notifyingGoalIds.current.delete(goal.id);
          continue;
        }

        // 2. Goal reached 80%
        if (progress >= 80 && progress < 100 && !goal.notified80) {
          notifyingGoalIds.current.add(goal.id);
          mostrarMensagem(`🚀 Incrível! A meta "${goal.name}" atingiu 80% do objetivo!`);
          if (active) {
            await updateGoal(goal.id, { 
              notified50: true, 
              notified80: true 
            });
          }
          notifyingGoalIds.current.delete(goal.id);
          continue;
        }

        // 3. Goal reached 50%
        if (progress >= 50 && progress < 80 && !goal.notified50) {
          notifyingGoalIds.current.add(goal.id);
          mostrarMensagem(`⭐ Muito bem! A meta "${goal.name}" atingiu 50% do objetivo!`);
          if (active) {
            await updateGoal(goal.id, { 
              notified50: true 
            });
          }
          notifyingGoalIds.current.delete(goal.id);
          continue;
        }

        // 4. Near deadline (within 7 days)
        if (diffDays <= 7 && diffDays > 0 && progress < 100 && !goal.notifiedNearDeadline) {
          notifyingGoalIds.current.add(goal.id);
          mostrarMensagem(`⏳ Atenção: A meta "${goal.name}" está próxima do vencimento (${diffDays} dias restantes)!`);
          if (active) {
            await updateGoal(goal.id, { 
              notifiedNearDeadline: true 
            });
          }
          notifyingGoalIds.current.delete(goal.id);
          continue;
        }

        // 5. Overdue (expired and not completed)
        if (diffDays <= 0 && progress < 100 && !goal.notifiedOverdue) {
          notifyingGoalIds.current.add(goal.id);
          mostrarMensagem(`⚠️ Vencida: A meta "${goal.name}" passou do prazo de vencimento sem ser concluída.`);
          if (active) {
            await updateGoal(goal.id, { 
              notifiedOverdue: true 
            });
          }
          notifyingGoalIds.current.delete(goal.id);
          continue;
        }
      }
    };

    if (goals && goals.length > 0) {
      checkGoalsNotifications();
    }

    return () => {
      active = false;
    };
  }, [goals, settings.notificationsEnabled, settings.goalAlertsEnabled]);

  const notifyingDebtIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!settings.notificationsEnabled) {
      return;
    }

    const checkDebtsNotifications = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      installments.forEach((inst) => {
        if (inst.status === "paga") return;

        const debt = debts.find((d) => d.id === inst.debtId);
        if (!debt) return;

        const dueDate = parseLocalDate(inst.dueDate);
        if (!dueDate) return;
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        const alertKey = `${inst.id}_${diffDays}`;

        if (notifyingDebtIds.current.has(alertKey)) return;

        if (diffDays === 15) {
          mostrarMensagem(`🔔 Vencimento em 15 dias: Parcela ${inst.installmentNumber} da dívida "${debt.name}" vence em 15 dias (${formatDate(inst.dueDate)}).`);
          notifyingDebtIds.current.add(alertKey);
        } else if (diffDays === 7) {
          mostrarMensagem(`🔔 Vencimento em 7 dias: Parcela ${inst.installmentNumber} da dívida "${debt.name}" vence em uma semana.`);
          notifyingDebtIds.current.add(alertKey);
        } else if (diffDays === 3) {
          mostrarMensagem(`🔔 Vencimento em 3 dias: Parcela ${inst.installmentNumber} da dívida "${debt.name}" vence em 3 dias! Organize o pagamento.`);
          notifyingDebtIds.current.add(alertKey);
        } else if (diffDays === 1) {
          mostrarMensagem(`⚠️ Vencimento Amanhã: Parcela ${inst.installmentNumber} da dívida "${debt.name}" vence AMANHÃ!`);
          notifyingDebtIds.current.add(alertKey);
        } else if (diffDays === 0) {
          mostrarMensagem(`🚨 Vence Hoje: Parcela ${inst.installmentNumber} da dívida "${debt.name}" vence HOJE! Não se esqueça de pagar.`);
          notifyingDebtIds.current.add(alertKey);
        } else if (diffDays < 0) {
          mostrarMensagem(`❌ Parcela Atrasada: Parcela ${inst.installmentNumber} da dívida "${debt.name}" está atrasada há ${Math.abs(diffDays)} dias!`);
          notifyingDebtIds.current.add(alertKey);
        }
      });
    };

    if (installments && installments.length > 0 && debts && debts.length > 0) {
      checkDebtsNotifications();
    }
  }, [installments, debts, settings.notificationsEnabled]);

  useEffect(() => {
    // Safety fallback timer to prevent indefinite loading on initial visit
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(safetyTimer);
      if (currentUser) {
        setUser(currentUser);
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || "",
              displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "Usuário",
              photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.uid)}`,
              createdAt: new Date().toISOString(),
              onboardingCompleted: true,
              financialScore: 75,
            };
            await setDoc(userRef, newProfile).catch(() => {});
            setUserProfile(newProfile);
            await initializeDefaultCategories(currentUser.uid).catch(() => {});
          } else {
            const profile = userSnap.data() as UserProfile;
            setUserProfile(profile);
          }
        } catch (err) {
          console.warn("Firestore user profile fetch notice:", err);
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || "",
            displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "Usuário",
            photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.uid)}`,
            createdAt: new Date().toISOString(),
            onboardingCompleted: true,
            financialScore: 75,
          });
        }
      } else {
        const storedCustom = localStorage.getItem("finassist_custom_user");
        if (storedCustom) {
          try {
            const customUser = JSON.parse(storedCustom);
            setUser(customUser);
            setUserProfile({
              uid: customUser.uid,
              email: customUser.email || "",
              displayName: customUser.displayName || customUser.email?.split("@")[0] || "Usuário",
              photoURL: customUser.photoURL || "",
              createdAt: new Date().toISOString(),
              onboardingCompleted: true,
              financialScore: 80
            });
            if (customUser.email?.toLowerCase().trim() === "dicasdereceitas1993@gmail.com" && !auth.currentUser) {
              signInWithEmailAndPassword(auth, "dicasdereceitas1993@gmail.com", "Taxi2015@").catch(() => {});
            }
          } catch (e) {
            setUser(null);
            setUserProfile(null);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });
    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const handleOnboardingComplete = (data: any) => {
    setUserProfile((prev) => prev ? { ...prev, onboardingCompleted: true, onboardingData: data } : null);
  };

  useEffect(() => {
    if (!user || !auth.currentUser) {
      setBudgets([]);
      setInsights([]);
      setDocuments([]);
      setDebtors([]);
      return;
    }

    const currentUid = auth.currentUser.uid;
    const qBudgets = query(collection(db, "budgets"), where("userId", "==", currentUid));
    const unsubBudgets = onSnapshot(qBudgets, (snap) => {
      setBudgets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
    }, (error) => {
      console.warn("Notice: budgets snapshot warning:", error);
    });

    const qInsights = query(collection(db, "insights"), where("userId", "==", currentUid));
    const unsubInsights = onSnapshot(qInsights, (snap) => {
      setInsights(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIInsight)));
    }, (error) => {
      console.warn("Notice: insights snapshot warning:", error);
    });

    const qDocs = query(collection(db, "documents"), where("userId", "==", currentUid));
    const unsubDocs = onSnapshot(qDocs, (snap) => {
      setDocuments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document)));
    }, (error) => {
      console.warn("Notice: documents snapshot warning:", error);
    });

    const qDebtors = query(collection(db, "debtors"), where("userId", "==", currentUid));
    const unsubDebtors = onSnapshot(qDebtors, (snap) => {
      setDebtors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debtor)));
    }, (error) => {
      console.warn("Notice: debtors snapshot warning:", error);
    });

    return () => {
      unsubBudgets();
      unsubInsights();
      unsubDocs();
      unsubDebtors();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === "auth/popup-closed-by-user") {
        mostrarMensagem("A janela de login foi fechada antes de concluir.");
      } else if (error.code === "auth/popup-blocked") {
        mostrarMensagem("O seu navegador bloqueou o pop-up de login. Por favor, autorize pop-ups para este site.");
      } else {
        mostrarMensagem("Erro ao tentar entrar com Google. Tente novamente.");
      }
    }
  };

  const handleLogout = async () => {
    mostrarMensagem("Saindo da conta...");
    try {
      await clearAllAuthSessionData();
    } catch (error) {
      console.error("Logout failed", error);
    }
    setUser(null);
    setUserProfile(null);
    setAuthView("login");
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#F4F7F6] gap-3">
        <div className="w-16 h-16 rounded-3xl bg-white p-2.5 shadow-md flex items-center justify-center border border-slate-100">
          <img src="/logo.png" alt="Bolso+" className="w-full h-full object-contain" />
        </div>
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent mt-1"></div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carregando Bolso+...</span>
      </div>
    );
  }

  if (!user) {
    if (authView === "login" || location.pathname === "/login") {
      return (
        <Login 
          onGoogleLogin={handleLogin}
          onEmailLogin={fazerLogin}
          debugMsg={debugMsg}
          onBackToLanding={() => {
            setAuthView("landing");
            if (location.pathname === "/login") {
              navigate("/", { replace: true });
            }
          }}
        />
      );
    }

    return (
      <LandingPage 
        onGoToLogin={() => setAuthView("login")} 
        isLoggedIn={false}
      />
    );
  }

  if (userProfile && !userProfile.onboardingCompleted) {
    return <Onboarding userProfile={userProfile} onComplete={handleOnboardingComplete} />;
  }

  const isDashboardActive = location.pathname === "/";

  const renderRoutes = () => {
    return (
      <Routes>
        <Route path="/" element={
          <Dashboard 
            userProfile={userProfile!} 
            family={family}
            insights={insights}
            debtors={debtors}
            onTabChange={setActiveTab}
            mostrarMensagem={mostrarMensagem}
          />
        } />
      
      <Route path="/transactions" element={<Transactions userProfile={userProfile!} />} />
      <Route path="/transacoes" element={<Navigate to="/transactions" replace />} />
      
      <Route path="/income" element={<Transactions mode="income" userProfile={userProfile!} />} />
      <Route path="/receitas" element={<Navigate to="/income" replace />} />
      
      <Route path="/expenses" element={<Transactions mode="expenses" userProfile={userProfile!} />} />
      <Route path="/despesas" element={<Navigate to="/expenses" replace />} />

      <Route path="/transfers" element={<Transactions mode="transfers" userProfile={userProfile!} />} />
      <Route path="/transferencias" element={<Navigate to="/transfers" replace />} />

      <Route path="/categories" element={<CategoryManager onClose={() => navigate("/")} />} />
      <Route path="/categorias" element={<Navigate to="/categories" replace />} />

      <Route path="/tags" element={<CategoryManager onClose={() => navigate("/")} initialTab="tags" />} />

      <Route path="/aichat" element={
        <AIChat userProfile={userProfile!} family={family} wealth={wealth} subscriptions={subscriptions} />
      } />

      <Route path="/ai_insights" element={<Navigate to="/insights" replace />} />
      <Route path="/ai_action_plan" element={<AIActionPlan />} />
      <Route path="/plano-de-acao" element={<Navigate to="/ai_action_plan" replace />} />

      <Route path="/goals" element={<Goals />} />
      <Route path="/piggy_banks" element={<PiggyBanks />} />
      <Route path="/cash_flow" element={<CashFlow />} />
      <Route path="/life_planning" element={<LifePlanning />} />

      <Route path="/accounts" element={<Accounts />} />
      <Route path="/contas" element={<Navigate to="/accounts" replace />} />
      <Route path="/cards" element={<Cards />} />
      <Route path="/cartoes" element={<Navigate to="/cards" replace />} />
      <Route path="/invoices" element={<Invoices />} />
      <Route path="/faturas" element={<Navigate to="/invoices" replace />} />
      <Route path="/fatura" element={<Navigate to="/invoices" replace />} />
      <Route path="/reconciliation" element={<Reconciliation />} />

      <Route path="/debts" element={<Debts userProfile={userProfile!} />} />
      <Route path="/dividas" element={<Navigate to="/debts" replace />} />

      <Route path="/receivables" element={<Receivables debtors={debtors} userProfile={userProfile!} />} />
      <Route path="/contas-receber" element={<Navigate to="/receivables" replace />} />

      <Route path="/budgeting" element={<Budgeting />} />
      <Route path="/diagnosis" element={<FinancialDiagnosis userProfile={userProfile!} />} />
      <Route path="/insights" element={<FinancialInsights userProfile={userProfile!} />} />
      <Route path="/diagnostico" element={<Navigate to="/diagnosis" replace />} />
      <Route path="/irsim" element={<TaxManagement />} />
      <Route path="/imposto-de-renda" element={<Navigate to="/irsim" replace />} />
      
      <Route path="/wealth" element={<Wealth />} />
      <Route path="/investments" element={<Investments userProfile={userProfile!} />} />

      <Route path="/family" element={<Family />} />
      <Route path="/dependency_analysis" element={<Navigate to="/family" replace />} />

      <Route path="/subscriptions" element={<Subscriptions subscriptions={subscriptions} />} />
      
      <Route path="/emergency_reserve" element={
        <EmergencyReserve 
          userProfile={userProfile!} 
          family={family} 
        />
      } />

      <Route path="/calendar" element={<Calendar />} />
      <Route path="/reminders" element={<Reminders />} />
      <Route path="/lembretes" element={<Navigate to="/reminders" replace />} />
      <Route path="/eventos" element={<Navigate to="/reminders" replace />} />

      <Route path="/reports" element={<Reports />} />
      <Route path="/emotional_analysis" element={<Navigate to="/reports" replace />} />
      <Route path="/consumption_habits" element={<Navigate to="/reports" replace />} />

      <Route path="/documents" element={<Documents documents={documents} />} />
      <Route path="/fiscal_docs" element={<Navigate to="/documents" replace />} />

      <Route path="/settings" element={
        <Settings 
          user={userProfile} 
          onLogout={handleLogout} 
          categories={categories}
          subCategories={subCategories}
          tags={tags}
          mostrarMensagem={mostrarMensagem}
        />
      } />
      <Route path="/security" element={<Navigate to="/settings" replace />} />

      <Route path="/admin" element={<AdminPanel userProfile={userProfile!} onLogout={handleLogout} mostrarMensagem={mostrarMensagem} />} />

      <Route path="/landing" element={<LandingPage onGoToLogin={() => {}} isLoggedIn={true} onGoToApp={() => navigate("/")} />} />
      <Route path="/login" element={<Navigate to={isAdminUser ? "/admin" : "/"} replace />} />
      <Route path="/inicio" element={<LandingPage onGoToLogin={() => {}} isLoggedIn={true} onGoToApp={() => navigate("/")} />} />
      <Route path="/apresentacao" element={<LandingPage onGoToLogin={() => {}} isLoggedIn={true} onGoToApp={() => navigate("/")} />} />
      <Route path="/planos" element={<Navigate to="/" replace />} />
      <Route path="/vendas" element={<Navigate to="/" replace />} />

      <Route path="/statement" element={<Transactions mode="statement" userProfile={userProfile!} />} />
      <Route path="/extrato" element={<Navigate to="/statement" replace />} />
      <Route path="/history" element={<GlobalHistory />} />
      <Route path="/historico" element={<Navigate to="/history" replace />} />

      <Route path="/help" element={
        <div className="max-w-4xl mx-auto p-8 bg-white rounded-5xl premium-shadow border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-primary-lime rounded-2xl flex items-center justify-center">
              <span className="text-primary-dark font-black text-2xl">?</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-primary-dark tracking-tight">Central de Ajuda</h2>
              <p className="text-sm text-gray-400 font-medium">Tire suas dúvidas e aprenda a usar o Bolso+</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <h3 className="text-lg font-bold text-primary-dark mb-2">Como adicionar uma transação?</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Vá até a aba "Transações" ou use os botões rápidos na tela inicial. Escolha entre Receita ou Despesa, insira o valor e a categoria correspondente.
              </p>
            </div>
            
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <h3 className="text-lg font-bold text-primary-dark mb-2">Como planejar meu orçamento?</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Acesse a aba "Orçamento" no menu. Você pode definir limites para diferentes áreas da sua vida e acompanhar se está dentro do planejado.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <h3 className="text-lg font-bold text-primary-dark mb-2">Para que serve o Plano de Ação?</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                O Plano de Ação, localizado em Inteligência, sugere passos gerados por IA para melhorar sua saúde financeira baseada no seu padrão de gastos.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <h3 className="text-lg font-bold text-primary-dark mb-2">Meus dados estão seguros?</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Sim! Todos os seus dados são criptografados e armazenados com segurança. Nenhuma informação pessoal é compartilhada sem sua permissão.
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-primary-dark text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold mb-1">Ainda tem dúvidas?</h3>
              <p className="text-xs text-white/60">Nossa equipe de suporte está pronta para ajudar.</p>
            </div>
            <button onClick={() => window.open("mailto:suporte@finassist.com", "_blank")} className="px-6 py-3 bg-primary-lime text-primary-dark font-bold rounded-2xl whitespace-nowrap hover:scale-105 transition-transform">
              Falar com Suporte
            </button>
          </div>
        </div>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    );
  };

  return (
    <Layout 
       activeTab={activeTab} 
       setActiveTab={setActiveTab} 
       user={user} 
       userProfile={userProfile} 
       onLogout={handleLogout} 
       mostrarMensagem={mostrarMensagem}
    >
      <div className="h-full w-full">
        <Suspense fallback={
          <div className="flex h-full w-full items-center justify-center bg-[#F4F7F6]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#10B981]/30 border-t-[#10B981] rounded-full animate-spin"></div>
              <div className="text-[#10B981] text-xs font-black tracking-[0.2em] uppercase animate-pulse">Carregando...</div>
            </div>
          </div>
        }>
          {renderRoutes()}
        </Suspense>
      </div>
      {debugMsg && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/50 px-4 py-3 text-white text-xs font-medium shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{debugMsg}</span>
        </div>
      )}
    </Layout>
  );
}
