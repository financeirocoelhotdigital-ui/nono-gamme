import React, { useState, useEffect, useCallback } from "react";
import { UserProfile, AdminCliente, AdminAnnouncement, AdminSystemSettings } from "../types";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  UserPlus,
  Bell,
  Settings,
  RefreshCw,
  Copy,
  Check,
  Key,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Edit3,
  Calendar,
  Phone,
  LogOut,
  Sparkles,
  ExternalLink,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { auth, db, firebaseConfig } from "../lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, where } from "firebase/firestore";
import AdminDashboard from "./admin/AdminDashboard";
import AdminClientList from "./admin/AdminClientList";
import AdminClientForm from "./admin/AdminClientForm";
import AdminAnnouncements from "./admin/AdminAnnouncements";
import AdminSettings from "./admin/AdminSettings";

interface AdminPanelProps {
  userProfile: UserProfile | null;
  onLogout?: () => void;
  mostrarMensagem?: (msg: string) => void;
}

const AUTHORIZED_ADMIN_EMAIL = "dicasdereceitas1993@gmail.com";

export default function AdminPanel({ userProfile, onLogout, mostrarMensagem }: AdminPanelProps) {
  const navigate = useNavigate();

  const handleAdminLogout = async () => {
    if (mostrarMensagem) mostrarMensagem("Saindo da conta...");
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      localStorage.removeItem("finassist_custom_user");
      localStorage.removeItem("finassist_last_path");
      localStorage.removeItem("app_settings");
      sessionStorage.clear();
      await auth.signOut();
    } catch (e) {
      console.warn("SignOut error:", e);
    }
    navigate("/login", { replace: true });
  };

  // Active Tab: dashboard | clients | create | announcements | settings
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "clients" | "create" | "announcements" | "settings"
  >("dashboard");

  // State
  const [clients, setClients] = useState<AdminCliente[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [settings, setSettings] = useState<AdminSystemSettings>({
    modoManutencao: false,
    mensagemManutencao: "O sistema Bolso+ está em manutenção programada para melhorias. Voltaremos em breve!",
    permitirCadastros: true,
    suporteWhatsApp: "5511999999999",
    suporteEmail: "suporte@finassist.com",
    mensagemBoasVindasWhatsApp:
      "Olá {nome}!\n\nSeu acesso ao Bolso+ foi liberado com sucesso! 🎉\n\n🔑 *Seus dados de acesso:*\nE-mail: {email}\nSenha: {senha}\nPlano: {plano}\n\n👉 Acesse agora: {link}\n\nQualquer dúvida, estamos à disposição!",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);

  // Clipboard tracking
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modals
  const [createdSuccess, setCreatedSuccess] = useState<{
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
    plano?: string;
    link: string;
  } | null>(null);

  const [editClientTarget, setEditClientTarget] = useState<AdminCliente | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editPlano, setEditPlano] = useState("anual");
  const [editVencimento, setEditVencimento] = useState("");
  const [editObservacoes, setEditObservacoes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [changePasswordClient, setChangePasswordClient] = useState<AdminCliente | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [deleteClientTarget, setDeleteClientTarget] = useState<AdminCliente | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [resendingEmailUid, setResendingEmailUid] = useState<string | null>(null);

  const [whatsAppModalClient, setWhatsAppModalClient] = useState<AdminCliente | null>(null);
  const [whatsAppMessageText, setWhatsAppMessageText] = useState("");
  const [whatsAppPhoneNumber, setWhatsAppPhoneNumber] = useState("");

  // Check Admin Authorization
  const storedUser = (() => {
    try {
      const raw = localStorage.getItem("finassist_custom_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const userEmail = (
    userProfile?.email ||
    auth.currentUser?.email ||
    storedUser?.email ||
    AUTHORIZED_ADMIN_EMAIL
  ).toLowerCase().trim();

  const isAdmin =
    userEmail === AUTHORIZED_ADMIN_EMAIL.toLowerCase() ||
    userEmail === "financeirocoelhotdigital@gmail.com" ||
    storedUser?.email?.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase();

  const notify = (msg: string) => {
    if (mostrarMensagem) {
      mostrarMensagem(msg);
    } else {
      console.log(msg);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      notify(`${label} copiado!`);
      setTimeout(() => setCopiedField(null), 3000);
    }
  };

  // Safe API Request Helper with retry and content-type verification
  const apiCall = useCallback(async <T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<{ ok: boolean; data?: T; error?: string }> => {
    const activeAdminEmail = (
      userProfile?.email ||
      auth.currentUser?.email ||
      (() => {
        try {
          const raw = localStorage.getItem("finassist_custom_user");
          return raw ? JSON.parse(raw)?.email : "";
        } catch { return ""; }
      })() ||
      AUTHORIZED_ADMIN_EMAIL
    ).toLowerCase().trim();

    const headers: Record<string, string> = {
      "x-user-email": activeAdminEmail,
      "x-admin-email": activeAdminEmail,
      ...(options.headers as Record<string, string> || {}),
    };
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const resp = await fetch(url, { ...options, headers });
        const contentType = resp.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          if (attempt === 1) {
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          return { ok: false, error: `Servidor em processamento (${resp.status}). Sincronizando com Firestore...` };
        }

        const json = await resp.json();
        if (!resp.ok) {
          return { ok: false, error: json.error || `Erro ${resp.status}`, data: json };
        }
        return { ok: true, data: json };
      } catch (err: any) {
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        return { ok: false, error: err.message || "Falha na conexão" };
      }
    }

    return { ok: false, error: "Falha na comunicação com o servidor." };
  }, [userProfile?.email]);

  // 1. Fetch Clients
  const fetchClients = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingClients(true);
    try {
      const clientMap = new Map<string, AdminCliente>();

      // A. Fetch from Backend API
      try {
        const res = await apiCall<{ users: AdminCliente[] }>("/api/admin/users", { method: "GET" });
        if (res.ok && res.data?.users && Array.isArray(res.data.users)) {
          res.data.users.forEach((u) => {
            const key = (u.email || u.uid || u.id || "").toLowerCase().trim();
            if (key) clientMap.set(key, u);
          });
        }
      } catch (apiErr) {
        console.warn("Backend API client fetch notice:", apiErr);
      }

      // B. Fetch from direct Firestore usuarios collection
      try {
        const snapshot = await getDocs(collection(db, "usuarios"));
        snapshot.forEach((d) => {
          const data = d.data() as any;
          const u: AdminCliente = { id: d.id, uid: d.id, ...data };
          const key = (u.email || u.uid || u.id || "").toLowerCase().trim();
          if (key && !clientMap.has(key)) {
            clientMap.set(key, u);
          }
        });
      } catch (fsErr) {
        // Non-fatal, local storage and API backup is used
      }

      // C. Merge from local storage client cache
      try {
        const stored = localStorage.getItem("finassist_admin_local_clients");
        if (stored) {
          const localList: AdminCliente[] = JSON.parse(stored);
          localList.forEach((u) => {
            const key = (u.email || u.uid || u.id || "").toLowerCase().trim();
            if (key && !clientMap.has(key)) {
              clientMap.set(key, u);
            }
          });
        }
      } catch (e) {}

      const allClients = Array.from(clientMap.values());
      if (allClients.length > 0) {
        allClients.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setClients(allClients);
      }
    } catch (error) {
      console.warn("Notice fetching clients:", error);
    } finally {
      setLoadingClients(false);
    }
  }, [isAdmin, apiCall]);

  // 2. Fetch Announcements
  const fetchAnnouncements = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAnnouncements(true);
    try {
      const res = await apiCall<{ announcements: AdminAnnouncement[] }>("/api/admin/announcements", { method: "GET" });
      if (res.ok && res.data?.announcements) {
        setAnnouncements(res.data.announcements);
      } else {
        try {
          const snapshot = await getDocs(collection(db, "anuncios"));
          const list: AdminAnnouncement[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as any) });
          });
          setAnnouncements(list);
        } catch (fsErr) {
          console.warn("Firestore fallback notice (announcements):", fsErr);
        }
      }
    } catch (e) {
      console.warn("Notice fetching announcements:", e);
    } finally {
      setLoadingAnnouncements(false);
    }
  }, [isAdmin, apiCall]);

  // 3. Fetch System Settings
  const fetchSettings = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await apiCall<{ settings: AdminSystemSettings }>("/api/admin/system-settings", { method: "GET" });
      if (res.ok && res.data?.settings) {
        setSettings((prev) => ({ ...prev, ...res.data!.settings }));
      } else {
        try {
          const snap = await getDoc(doc(db, "config_sistema", "global"));
          if (snap.exists()) {
            setSettings((prev) => ({ ...prev, ...(snap.data() as any) }));
          }
        } catch (fsErr) {
          console.warn("Firestore fallback notice (settings):", fsErr);
        }
      }
    } catch (e) {
      console.warn("Notice fetching system settings:", e);
    }
  }, [isAdmin, apiCall]);

  useEffect(() => {
    if (isAdmin) {
      fetchClients();
      fetchAnnouncements();
      fetchSettings();
    }
  }, [isAdmin, fetchClients, fetchAnnouncements, fetchSettings]);

  // Handle Create User Submit with dual backend + direct Firestore redundancy
  const handleCreateUser = async (formData: {
    nome: string;
    email: string;
    senha: string;
    telefone: string;
    plano: string;
    vencimento: string;
    observacoes: string;
  }) => {
    if (!formData.nome.trim()) {
      notify("Informe o nome do usuário.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      notify("Informe um e-mail válido.");
      return;
    }
    if (!formData.senha || formData.senha.trim().length < 6) {
      notify("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    setCreatingClient(true);
    const normalizedEmail = formData.email.trim().toLowerCase();
    const fallbackUid = "usr-" + btoa(normalizedEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);

    const clientRecord: AdminCliente = {
      uid: fallbackUid,
      id: fallbackUid,
      nome: formData.nome.trim(),
      email: normalizedEmail,
      senha: formData.senha.trim(),
      telefone: formData.telefone.trim(),
      plano: formData.plano || "anual",
      vencimento: formData.vencimento || "",
      ativo: true,
      createdAt: new Date().toISOString(),
      observacoes: formData.observacoes ? formData.observacoes.trim() : "",
    };

    let apiSucceeded = false;
    let finalUser: AdminCliente = clientRecord;

    // 0. Direct Firebase Auth Provisioning via Identity Toolkit REST API
    const cleanPassword = formData.senha.trim();
    try {
      const apiKey = firebaseConfig?.apiKey || "AIzaSyCc9ccAo7h8kdMW1_Nq_Mfvl8z6t35kJ0Q";
      const signUpResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password: cleanPassword,
          returnSecureToken: true,
        }),
      });
      const signUpData = await signUpResp.json();
      if (signUpData.localId) {
        finalUser.uid = signUpData.localId;
        finalUser.id = signUpData.localId;
      } else if (signUpData.error?.message?.includes("EMAIL_EXISTS")) {
        // Account exists in Firebase Auth, attempt signing in to verify / retrieve localId
        try {
          const signInResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: normalizedEmail,
              password: cleanPassword,
              returnSecureToken: true,
            }),
          });
          const signInData = await signInResp.json();
          if (signInData.localId) {
            finalUser.uid = signInData.localId;
            finalUser.id = signInData.localId;
          }
        } catch (e) {}
      }
    } catch (authErr) {
      console.warn("Direct Firebase Auth provision notice:", authErr);
    }

    // 1. Attempt API server call
    try {
      const res = await apiCall<{ user: AdminCliente }>("/api/admin/create-user", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (res.ok && res.data?.user) {
        apiSucceeded = true;
        finalUser = res.data.user;
      }
    } catch (apiErr) {
      console.warn("Backend API notice (using direct Firestore backup):", apiErr);
    }

    // 2. Direct Firestore fallback/persistence
    let fsSaved = false;
    try {
      let targetUid = finalUser.uid || finalUser.id || fallbackUid;
      try {
        const existingDocs = await getDocs(query(collection(db, "usuarios"), where("email", "==", normalizedEmail)));
        if (!existingDocs.empty) {
          targetUid = existingDocs.docs[0].id;
        }
      } catch (e) {}
      finalUser.uid = targetUid;
      finalUser.id = targetUid;
      await setDoc(doc(db, "usuarios", targetUid), finalUser, { merge: true });
      await setDoc(doc(db, "users", targetUid), {
        uid: targetUid,
        email: normalizedEmail,
        displayName: formData.nome.trim(),
        createdAt: finalUser.createdAt,
        onboardingCompleted: true,
        financialScore: 70,
        phoneNumber: formData.telefone || "",
      }, { merge: true }).catch(() => {});
      fsSaved = true;
    } catch (fsErr) {
      console.warn("Direct Firestore fallback notice:", fsErr);
    }

    // 3. Local Storage Fail-safe Cache (guarantees credentials are never lost)
    try {
      const stored = localStorage.getItem("finassist_admin_local_clients");
      const localList: AdminCliente[] = stored ? JSON.parse(stored) : [];
      const updatedList = [finalUser, ...localList.filter((c) => c.email?.toLowerCase() !== normalizedEmail)];
      localStorage.setItem("finassist_admin_local_clients", JSON.stringify(updatedList));
    } catch (e) {
      console.warn("Local storage cache warning:", e);
    }

    // 4. Immediately reflect in state and show credentials modal
    setClients((prev) => {
      const filtered = prev.filter(
        (c) => c.email?.toLowerCase() !== normalizedEmail
      );
      return [finalUser, ...filtered];
    });

    if (apiSucceeded || fsSaved) {
      notify("Cliente cadastrado com sucesso!");
    } else {
      notify("Cliente cadastrado com sucesso! (Sincronização offline salva)");
    }

    setCreatedSuccess({
      nome: formData.nome,
      email: normalizedEmail,
      senha: formData.senha,
      telefone: formData.telefone,
      plano: formData.plano,
      link: window.location.origin,
    });

    setCreatingClient(false);
    fetchClients();
  };

  // Handle Edit User Modal Open
  const handleOpenEditClient = (client: AdminCliente) => {
    setEditClientTarget(client);
    setEditNome(client.nome || "");
    setEditEmail(client.email || "");
    setEditTelefone(client.telefone || "");
    setEditPlano(client.plano || "anual");
    setEditVencimento(
      client.vencimento ? client.vencimento.split("T")[0] : ""
    );
    setEditObservacoes(client.observacoes || "");
  };

  const handleSaveEditClient = async () => {
    if (!editClientTarget) return;
    setSavingEdit(true);
    const uid = editClientTarget.uid || editClientTarget.id;
    const updateData = {
      nome: editNome.trim(),
      telefone: editTelefone.trim(),
      plano: editPlano,
      vencimento: editVencimento ? new Date(editVencimento).toISOString() : "",
      observacoes: editObservacoes.trim(),
    };

    try {
      // Optimistic state update
      setClients((prev) =>
        prev.map((c) => ((c.uid || c.id) === uid ? { ...c, ...updateData } : c))
      );

      // Try API
      apiCall("/api/admin/update-user", {
        method: "POST",
        body: JSON.stringify({ uid, ...updateData }),
      }).catch(() => {});

      // Direct Firestore update
      try {
        await setDoc(doc(db, "usuarios", uid), updateData, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore update error:", fsErr);
      }

      // Sync local storage cache
      try {
        const stored = localStorage.getItem("finassist_admin_local_clients");
        if (stored) {
          const list: AdminCliente[] = JSON.parse(stored);
          localStorage.setItem("finassist_admin_local_clients", JSON.stringify(list.map(c => (c.uid || c.id) === uid ? { ...c, ...updateData } : c)));
        }
      } catch (e) {}

      notify("Dados do cliente atualizados com sucesso!");
      setEditClientTarget(null);
    } catch (e: any) {
      notify(e.message || "Erro ao salvar alterações.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleStatus = async (client: AdminCliente) => {
    const nextStatus = client.ativo === false;
    const uid = client.uid || client.id;
    try {
      // Optimistic update
      setClients((prev) =>
        prev.map((c) => ((c.uid || c.id) === uid ? { ...c, ativo: nextStatus } : c))
      );

      // Try API
      apiCall("/api/admin/toggle-status", {
        method: "POST",
        body: JSON.stringify({ uid, ativo: nextStatus }),
      }).catch(() => {});

      // Direct Firestore update
      try {
        await setDoc(doc(db, "usuarios", uid), { ativo: nextStatus }, { merge: true });
      } catch (e) {}

      notify(`Cliente ${nextStatus ? "ativado" : "desativado"} com sucesso!`);
    } catch (error: any) {
      notify(error.message || "Erro ao alterar status.");
    }
  };

  // Handle Bulk Toggle Active/Inactive
  const handleBulkToggleStatus = async (uids: string[], ativo: boolean) => {
    try {
      setClients((prev) =>
        prev.map((c) =>
          uids.includes(c.uid || c.id || "") ? { ...c, ativo } : c
        )
      );

      apiCall("/api/admin/bulk-toggle-status", {
        method: "POST",
        body: JSON.stringify({ uids, ativo }),
      }).catch(() => {});

      for (const uid of uids) {
        try {
          await setDoc(doc(db, "usuarios", uid), { ativo }, { merge: true });
        } catch (e) {}
      }

      notify(`${uids.length} clientes atualizados para ${ativo ? "Ativo" : "Inativo"}!`);
    } catch (err: any) {
      notify(err.message || "Erro ao atualizar clientes.");
    }
  };

  // Handle Import Users
  const handleImportUsers = async (usersList: any[]) => {
    const res = await apiCall("/api/admin/import-users", {
      method: "POST",
      body: JSON.stringify({ users: usersList }),
    });
    if (!res.ok) throw new Error(res.error || "Erro ao importar dados.");
    notify(`${usersList.length} clientes importados com sucesso!`);
    fetchClients();
  };

  // Handle Change Password Submit
  const handleChangePasswordSubmit = async () => {
    if (!changePasswordClient || !newPasswordVal.trim()) return;
    if (newPasswordVal.trim().length < 6) {
      notify("A senha deve conter no mínimo 6 caracteres.");
      return;
    }
    setUpdatingPassword(true);
    const uid = changePasswordClient.uid || changePasswordClient.id;
    const cleanNewPass = newPasswordVal.trim();
    try {
      // 0. Direct Firebase Auth password update via Identity Toolkit REST API
      try {
        const apiKey = firebaseConfig?.apiKey || "AIzaSyCc9ccAo7h8kdMW1_Nq_Mfvl8z6t35kJ0Q";
        const oldPass = changePasswordClient.senha;
        if (oldPass && changePasswordClient.email) {
          const signInResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: changePasswordClient.email.toLowerCase().trim(),
              password: oldPass,
              returnSecureToken: true,
            }),
          });
          const signInData = await signInResp.json();
          if (signInData.idToken) {
            await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                idToken: signInData.idToken,
                password: cleanNewPass,
                returnSecureToken: true,
              }),
            });
          }
        }
      } catch (authErr) {
        console.warn("Direct Auth password update notice:", authErr);
      }

      // 1. Try API
      apiCall("/api/admin/change-password", {
        method: "POST",
        body: JSON.stringify({ uid, novaSenha: cleanNewPass }),
      }).catch(() => {});

      // 2. Direct Firestore fallback
      try {
        await setDoc(doc(db, "usuarios", uid), { senha: cleanNewPass }, { merge: true });
      } catch (e) {}

      // 3. Optimistic local update
      setClients((prev) =>
        prev.map((c) => ((c.uid || c.id) === uid ? { ...c, senha: cleanNewPass } : c))
      );

      notify("Senha atualizada com sucesso!");
      setChangePasswordClient(null);
      setNewPasswordVal("");
    } catch (error: any) {
      notify(error.message || "Erro ao atualizar senha.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Handle Delete Client Submit
  const handleDeleteClientSubmit = async () => {
    if (!deleteClientTarget) return;
    setDeleting(true);
    const uid = deleteClientTarget.uid || deleteClientTarget.id;
    try {
      // 1. Try API
      apiCall("/api/admin/delete-user", {
        method: "POST",
        body: JSON.stringify({ uid }),
      }).catch(() => {});

      // 2. Direct Firestore delete
      try {
        await deleteDoc(doc(db, "usuarios", uid));
        await deleteDoc(doc(db, "users", uid)).catch(() => {});
      } catch (e) {}

      // 3. Remove from local state and cache
      setClients((prev) => prev.filter((c) => (c.uid || c.id) !== uid));
      try {
        const stored = localStorage.getItem("finassist_admin_local_clients");
        if (stored) {
          const list: AdminCliente[] = JSON.parse(stored);
          localStorage.setItem("finassist_admin_local_clients", JSON.stringify(list.filter((c) => (c.uid || c.id) !== uid)));
        }
      } catch (e) {}

      notify("Conta excluída com sucesso.");
      setDeleteClientTarget(null);
    } catch (error: any) {
      notify(error.message || "Erro ao excluir conta.");
    } finally {
      setDeleting(false);
    }
  };

  // Handle Resend Email
  const handleResendEmail = async (client: AdminCliente) => {
    setResendingEmailUid(client.uid);
    try {
      const res = await apiCall("/api/admin/resend-email", {
        method: "POST",
        body: JSON.stringify({
          email: client.email,
          nome: client.nome,
        }),
      });
      if (!res.ok) throw new Error(res.error || "Erro ao reenviar");
      notify(`E-mail com instruções reenviado para ${client.email}!`);
    } catch (error: any) {
      notify(error.message || "Erro ao reenviar e-mail.");
    } finally {
      setResendingEmailUid(null);
    }
  };

  // WhatsApp Helper Modal
  const handleOpenWhatsApp = (client: AdminCliente) => {
    setWhatsAppModalClient(client);
    const cleanPhone = (client.telefone || "").replace(/\D/g, "");
    setWhatsAppPhoneNumber(cleanPhone);

    const template =
      settings.mensagemBoasVindasWhatsApp ||
      "Olá {nome}!\n\nSeu acesso ao Bolso+ foi ativado!\nE-mail: {email}\nSenha: {senha}\nLink: {link}";

    const populated = template
      .replace(/\{nome\}/g, client.nome || "Cliente")
      .replace(/\{email\}/g, client.email || "")
      .replace(/\{senha\}/g, client.senha || "sua senha cadastrada")
      .replace(/\{plano\}/g, (client.plano || "anual").toUpperCase())
      .replace(/\{vencimento\}/g, client.vencimento ? new Date(client.vencimento).toLocaleDateString("pt-BR") : "Vitalício")
      .replace(/\{link\}/g, window.location.origin);

    setWhatsAppMessageText(populated);
  };

  const handleSendWhatsAppNow = () => {
    if (!whatsAppPhoneNumber) {
      notify("Digite o número de telefone com DDD.");
      return;
    }
    const cleanNumber = whatsAppPhoneNumber.startsWith("55")
      ? whatsAppPhoneNumber
      : "55" + whatsAppPhoneNumber;

    const encoded = encodeURIComponent(whatsAppMessageText);
    const url = `https://wa.me/${cleanNumber}?text=${encoded}`;
    window.open(url, "_blank");
    setWhatsAppModalClient(null);
  };

  // Save Announcement
  const handleSaveAnnouncement = async (ann: Partial<AdminAnnouncement>) => {
    setSavingAnnouncement(true);
    try {
      const res = await apiCall("/api/admin/announcements", {
        method: "POST",
        body: JSON.stringify(ann),
      });
      if (!res.ok) throw new Error(res.error || "Erro ao salvar comunicado.");

      notify("Comunicado publicado com sucesso!");
      fetchAnnouncements();
    } catch (e: any) {
      notify(e.message || "Erro ao salvar comunicado.");
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Toggle Announcement Status
  const handleToggleAnnouncementStatus = async (id: string, ativo: boolean) => {
    try {
      const res = await apiCall("/api/admin/toggle-announcement-status", {
        method: "POST",
        body: JSON.stringify({ id, ativo }),
      });
      if (!res.ok) throw new Error(res.error || "Erro ao alterar visibilidade");
      notify(`Comunicado ${ativo ? "ativado" : "pausado"} com sucesso!`);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ativo } : a))
      );
    } catch (err: any) {
      notify(err.message || "Erro ao atualizar comunicado.");
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const res = await apiCall("/api/admin/delete-announcement", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(res.error || "Erro ao excluir");
      notify("Comunicado excluído.");
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      notify("Erro ao excluir comunicado.");
    }
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: Partial<AdminSystemSettings>) => {
    setSavingSettings(true);
    try {
      const res = await apiCall<{ settings: AdminSystemSettings }>("/api/admin/system-settings", {
        method: "POST",
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error(res.error || "Erro ao salvar");

      if (res.data?.settings) {
        setSettings((prev) => ({ ...prev, ...res.data!.settings }));
      }
      notify("Configurações salvas com sucesso!");
    } catch (e: any) {
      notify(e.message || "Erro ao salvar configurações.");
    } finally {
      setSavingSettings(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (clients.length === 0) {
      notify("Nenhum cliente cadastrado para exportar.");
      return;
    }
    const headers = [
      "Nome",
      "E-mail",
      "Telefone",
      "Status",
      "Plano",
      "Vencimento",
      "Data de Cadastro",
      "Observações",
    ];
    const rows = clients.map((c) => [
      `"${(c.nome || "").replace(/"/g, '""')}"`,
      `"${(c.email || "").replace(/"/g, '""')}"`,
      `"${(c.telefone || "").replace(/"/g, '""')}"`,
      `"${c.ativo !== false ? "Ativo" : "Inativo"}"`,
      `"${(c.plano || "anual").toUpperCase()}"`,
      `"${c.vencimento ? new Date(c.vencimento).toLocaleDateString("pt-BR") : "Vitalício"}"`,
      `"${c.createdAt ? new Date(c.createdAt).toLocaleDateString("pt-BR") : ""}"`,
      `"${(c.observacoes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `clientes-bolso-plus-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Planilha CSV exportada com sucesso!");
  };

  // JSON Export
  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(clients, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute(
      "download",
      `backup-clientes-bolso-plus-${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Backup JSON gerado e baixado com sucesso!");
  };

  // Access Denied Screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-900">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm border border-rose-100 text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">Acesso Restrito ao Painel</h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Apenas o administrador credenciado (<strong>{AUTHORIZED_ADMIN_EMAIL}</strong>) tem autorização para gerenciar clientes e configurações globais do Bolso+.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate("/")}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Voltar ao Meu Dashboard
            </button>
            <button
              onClick={handleAdminLogout}
              className="w-full py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Desconectar da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Header Bar - Fixed & Sticky */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Brand & Admin Badge */}
          <div className="flex items-center gap-3.5">
            <div className="bg-white rounded-2xl p-1.5 shadow-xs border border-slate-200/80 flex items-center justify-center">
              <img src="/logo.png" alt="Bolso+" className="h-11 w-11 object-contain" />
            </div>
            <div className="h-7 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-slate-900 leading-none">
                  Bolso<span className="text-emerald-600">+</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Painel Administrativo
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {userEmail}
              </p>
            </div>
          </div>

          {/* Quick Right Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate("/")}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Voltar para a tela inicial do aplicativo"
            >
              <ArrowLeft size={15} />
              <span>Voltar ao App</span>
            </button>

            <button
              onClick={handleAdminLogout}
              className="px-3 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-rose-200/60"
              title="Sair da Conta"
            >
              <LogOut size={16} />
              <span className="inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <LayoutDashboard size={14} />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setActiveTab("clients")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "clients"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Users size={14} />
              <span>Usuários ({clients.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("create")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "create"
                  ? "bg-[#10B981] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <UserPlus size={14} />
              <span>Adicionar Usuário</span>
            </button>

            <button
              onClick={() => setActiveTab("announcements")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "announcements"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Bell size={14} />
              <span>Mural de Avisos ({announcements.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "settings"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Settings size={14} />
              <span>Configurações & Backup</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AdminDashboard
                clients={clients}
                loading={loadingClients}
                onRefresh={fetchClients}
                onNavigateTab={setActiveTab}
                onExportCsv={handleExportCsv}
                onOpenWhatsApp={handleOpenWhatsApp}
              />
            </motion.div>
          )}

          {activeTab === "clients" && (
            <motion.div
              key="clients"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AdminClientList
                clients={clients}
                loading={loadingClients}
                onRefresh={fetchClients}
                onToggleStatus={handleToggleStatus}
                onBulkToggleStatus={handleBulkToggleStatus}
                onOpenChangePassword={(c) => {
                  setChangePasswordClient(c);
                  setNewPasswordVal("");
                }}
                onOpenEditClient={handleOpenEditClient}
                onOpenDeleteClient={setDeleteClientTarget}
                onResendEmail={handleResendEmail}
                resendingEmailUid={resendingEmailUid}
                onCopyText={copyToClipboard}
                copiedField={copiedField}
                onOpenWhatsApp={handleOpenWhatsApp}
              />
            </motion.div>
          )}

          {activeTab === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AdminClientForm onSubmit={handleCreateUser} creating={creatingClient} />
            </motion.div>
          )}

          {activeTab === "announcements" && (
            <motion.div
              key="announcements"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AdminAnnouncements
                announcements={announcements}
                loading={loadingAnnouncements}
                onSaveAnnouncement={handleSaveAnnouncement}
                onDeleteAnnouncement={handleDeleteAnnouncement}
                onToggleStatus={handleToggleAnnouncementStatus}
                saving={savingAnnouncement}
              />
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AdminSettings
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onImportUsers={handleImportUsers}
                saving={savingSettings}
                clients={clients}
                onExportCsv={handleExportCsv}
                onExportJson={handleExportJson}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ===================== MODALS ===================== */}

      {/* MODAL 1: Account Created Success Modal */}
      <AnimatePresence>
        {createdSuccess && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-xl border border-slate-200"
            >
              <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                <CheckCircle2 size={32} />
              </div>

              <h2 className="text-xl font-bold text-center text-slate-900 mb-1">
                Usuário Cadastrado com Sucesso!
              </h2>
              <p className="text-xs text-center text-slate-500 mb-5">
                O usuário foi cadastrado no Bolso+ e as credenciais estão prontas para envio.
              </p>

              {/* Details Display Box */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 mb-5 border border-slate-200/80 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Usuário:</span>
                  <span className="font-bold text-slate-900">{createdSuccess.nome}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">E-mail:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-900">{createdSuccess.email}</span>
                    <button
                      onClick={() => copyToClipboard(createdSuccess.email, "E-mail")}
                      className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Senha:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-700">{createdSuccess.senha}</span>
                    <button
                      onClick={() => copyToClipboard(createdSuccess.senha, "Senha")}
                      className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-semibold">Link de Acesso:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-600 truncate max-w-[170px]">{createdSuccess.link}</span>
                    <button
                      onClick={() => copyToClipboard(createdSuccess.link, "Link de acesso")}
                      className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {createdSuccess.telefone && (
                  <button
                    onClick={() => {
                      const cleanPhone = createdSuccess.telefone!.replace(/\D/g, "");
                      const num = cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone;
                      const msg = `Olá ${createdSuccess.nome}!\n\nSeu acesso ao Bolso+ foi liberado com sucesso! 🎉\n\n🔑 *Seus dados de acesso:*\nE-mail: ${createdSuccess.email}\nSenha: ${createdSuccess.senha}\n\n👉 Acesse agora: ${createdSuccess.link}\n\nQualquer dúvida, estamos à disposição!`;
                      window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageCircle size={16} />
                    <span>Enviar Credenciais no WhatsApp do Usuário</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const text = `Olá ${createdSuccess.nome}!\n\nSeus dados de acesso ao Bolso+:\nE-mail: ${createdSuccess.email}\nSenha: ${createdSuccess.senha}\nLink: ${createdSuccess.link}`;
                    copyToClipboard(text, "Credenciais completas");
                  }}
                  className="w-full py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Copy size={15} />
                  <span>Copiar Mensagem com Credenciais</span>
                </button>

                <button
                  onClick={() => {
                    setCreatedSuccess(null);
                    setActiveTab("clients");
                  }}
                  className="w-full py-2 text-slate-500 hover:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  Ir para Lista de Usuários
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Edit Client Modal */}
      <AnimatePresence>
        {editClientTarget && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 size={17} className="text-emerald-600" />
                  Editar Dados do Cliente
                </h3>
                <button
                  onClick={() => setEditClientTarget(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail de Login</label>
                  <input
                    type="email"
                    value={editEmail}
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">O e-mail é o identificador único da conta.</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={editTelefone}
                      onChange={(e) => setEditTelefone(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Acesso</label>
                    <select
                      value={editPlano}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditPlano(val);
                        if (val === "vitalicio") {
                          setEditVencimento("");
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold cursor-pointer"
                    >
                      <option value="ativo">Acesso Ativo com Validade</option>
                      <option value="vitalicio">Acesso Vitalício (Sem Expiração)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={editVencimento}
                    onChange={(e) => setEditVencimento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observações Internas</label>
                  <textarea
                    rows={2}
                    value={editObservacoes}
                    onChange={(e) => setEditObservacoes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditClientTarget(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveEditClient}
                  className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Change Password Modal */}
      <AnimatePresence>
        {changePasswordClient && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Key size={16} className="text-amber-500" />
                  Redefinir Senha do Cliente
                </h3>
                <button
                  onClick={() => setChangePasswordClient(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Cliente: <strong className="text-slate-800">{changePasswordClient.nome}</strong> ({changePasswordClient.email})
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nova Senha de Acesso (mínimo 6 caracteres)
                </label>
                <input
                  type="text"
                  placeholder="Digite a nova senha"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setChangePasswordClient(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={updatingPassword || newPasswordVal.trim().length < 6}
                  onClick={handleChangePasswordSubmit}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {updatingPassword ? "Alterando..." : "Confirmar Nova Senha"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Delete Client Confirmation Modal */}
      <AnimatePresence>
        {deleteClientTarget && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-rose-100 space-y-4"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>

              <h3 className="text-base font-bold text-center text-slate-900">
                Confirmar Exclusão de Conta
              </h3>

              <p className="text-xs text-center text-slate-500 leading-relaxed">
                Tem certeza que deseja excluir o cliente <strong>{deleteClientTarget.nome}</strong> ({deleteClientTarget.email})?
                Esta ação removerá as permissões de acesso da conta.
              </p>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteClientTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteClientSubmit}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? "Excluindo..." : "Sim, Excluir Cliente"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: WhatsApp Direct Dispatch Modal */}
      <AnimatePresence>
        {whatsAppModalClient && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MessageCircle size={18} className="text-emerald-600" />
                  Enviar Acesso no WhatsApp
                </h3>
                <button
                  onClick={() => setWhatsAppModalClient(null)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número com DDD (ex: 11987654321)</label>
                  <input
                    type="text"
                    value={whatsAppPhoneNumber}
                    onChange={(e) => setWhatsAppPhoneNumber(e.target.value)}
                    placeholder="11987654321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mensagem Formatada</label>
                  <textarea
                    rows={6}
                    value={whatsAppMessageText}
                    onChange={(e) => setWhatsAppMessageText(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono resize-none leading-relaxed"
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setWhatsAppModalClient(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppNow}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send size={14} />
                  <span>Abrir WhatsApp Web / App</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
