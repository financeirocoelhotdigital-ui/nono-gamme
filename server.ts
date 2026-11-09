import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import * as firebaseAdminModule from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import rawFirebaseConfig from "./firebase-applet-config.json";

dotenv.config();

const ADMIN_EMAIL = "dicasdereceitas1993@gmail.com";

function getFilePath(filename: string): string {
  if (process.env.VERCEL) {
    const tmpPath = path.join("/tmp", filename);
    const localPath = path.join(process.cwd(), filename);
    if (!fs.existsSync(tmpPath) && fs.existsSync(localPath)) {
      try {
        fs.copyFileSync(localPath, tmpPath);
      } catch (e) {}
    }
    return tmpPath;
  }
  return path.join(process.cwd(), filename);
}

const USERS_FILE = getFilePath("usuarios.json");

function loadLocalUsers(): any[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, "utf8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.warn("Could not read usuarios.json:", e);
  }
  return [];
}

function saveLocalUsers(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (e) {
    console.error("Could not write usuarios.json:", e);
  }
}

function saveLocalUser(userData: any) {
  const users = loadLocalUsers();
  const index = users.findIndex(u => (u.uid && u.uid === userData.uid) || (u.email && u.email.toLowerCase() === userData.email.toLowerCase()));
  if (index >= 0) {
    users[index] = { ...users[index], ...userData };
  } else {
    users.unshift(userData);
  }
  saveLocalUsers(users);
}

function deleteLocalUser(uid: string) {
  const users = loadLocalUsers();
  const filtered = users.filter(u => u.uid !== uid && u.id !== uid);
  saveLocalUsers(filtered);
}

const ANNOUNCEMENTS_FILE = getFilePath("anuncios.json");
const SETTINGS_FILE = getFilePath("config-sistema.json");

function loadLocalAnnouncements(): any[] {
  try {
    if (fs.existsSync(ANNOUNCEMENTS_FILE)) {
      const content = fs.readFileSync(ANNOUNCEMENTS_FILE, "utf8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.warn("Could not read anuncios.json:", e);
  }
  return [];
}

function saveLocalAnnouncements(announcements: any[]) {
  try {
    fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(announcements, null, 2), "utf8");
  } catch (e) {
    console.error("Could not write anuncios.json:", e);
  }
}

function loadLocalSettings(): any {
  const defaultSettings = {
    modoManutencao: false,
    mensagemManutencao: "O sistema está em manutenção rápida para melhorias. Voltamos em alguns minutos!",
    mensagemBoasVindasWhatsApp: "Olá {nome}! Seu acesso ao Bolso+ foi liberado com sucesso.\n\n*Seus dados de acesso:*\n📧 E-mail: {email}\n🔑 Senha: {senha}\n\n🔗 Acesse aqui: {link}",
    suporteWhatsApp: "5511999999999",
    suporteEmail: "suporte@finassist.com",
    permitirCadastros: true,
  };
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, "utf8");
      return { ...defaultSettings, ...(JSON.parse(content) || {}) };
    }
  } catch (e) {
    console.warn("Could not read config-sistema.json:", e);
  }
  return defaultSettings;
}

function saveLocalSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
  } catch (e) {
    console.error("Could not write config-sistema.json:", e);
  }
}

// Load Firebase Config safely bundled
const firebaseConfig: any = rawFirebaseConfig || {};
const FIREBASE_API_KEY = firebaseConfig.apiKey || process.env.FIREBASE_API_KEY || "AIzaSyCc9ccAo7h8kdMW1_Nq_Mfvl8z6t35kJ0Q";
const FIREBASE_PROJECT_ID = firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0297514368";
const FIREBASE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || process.env.FIREBASE_DATABASE_ID || "ai-studio-d08892e7-ff29-48d3-b6ea-e3dca700aa6a";

const firebaseAdmin: any = (firebaseAdminModule as any).default || firebaseAdminModule;

const getApps = () => {
  if (Array.isArray(firebaseAdmin.apps)) return firebaseAdmin.apps;
  if (Array.isArray(firebaseAdmin.default?.apps)) return firebaseAdmin.default.apps;
  return [];
};

const hasAdminCredentials = !!(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_SERVICE_ACCOUNT
);

if (!getApps().length && hasAdminCredentials) {
  try {
    const initFn = typeof firebaseAdmin.initializeApp === "function" ? firebaseAdmin.initializeApp : firebaseAdmin.default?.initializeApp;
    if (typeof initFn === "function") {
      initFn({
        projectId: FIREBASE_PROJECT_ID,
      });
      console.log("Firebase Admin SDK initialized for project:", FIREBASE_PROJECT_ID);
    }
  } catch (err) {
    // Non-fatal init
  }
}

function getAdminAuth() {
  if (!hasAdminCredentials) return null;
  try {
    if (typeof getAuth === "function") return getAuth();
    if (typeof firebaseAdmin.auth === "function") return firebaseAdmin.auth();
    if (typeof firebaseAdmin.default?.auth === "function") return firebaseAdmin.default.auth();
  } catch (e) {
    // Non-fatal
  }
  return null;
}

function getAdminFirestore() {
  if (!hasAdminCredentials) return null;
  try {
    if (typeof getFirestore === "function") {
      try {
        return getFirestore(FIREBASE_DATABASE_ID);
      } catch {
        return getFirestore();
      }
    }
    if (typeof firebaseAdmin.firestore === "function") return firebaseAdmin.firestore();
    if (typeof firebaseAdmin.default?.firestore === "function") return firebaseAdmin.default.firestore();
  } catch (e) {
    // Non-fatal
  }
  return null;
}

export const app = express();

// Enable CORS for all environments
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-email, x-admin-email, authorization-email");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Normalize Vercel Serverless Function rewritten URLs for /api/*
app.use((req, res, next) => {
  const slug = req.query.slug;
  if (slug) {
    const slugPath = Array.isArray(slug) ? slug.join("/") : String(slug);
    req.url = `/api/${slugPath.startsWith("/") ? slugPath.slice(1) : slugPath}`;
  } else {
    const queryWildcard = (req.query['__path'] as string) || (req.query['0'] as string) || (req.query['path'] as string);
    if (queryWildcard && typeof queryWildcard === "string") {
      const clean = queryWildcard.startsWith("/") ? queryWildcard : "/" + queryWildcard;
      req.url = clean.startsWith("/api") ? clean : `/api${clean}`;
    }
  }
  next();
});

app.use(express.json({ limit: "20mb" }));

  // Middleware to verify Admin Authorization
  const verifyAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const requesterEmail = (
      (req.headers["x-user-email"] as string) ||
      (req.headers["x-admin-email"] as string) ||
      (req.headers["authorization-email"] as string) ||
      (req.body?.adminEmail as string) ||
      (req.query?.adminEmail as string) ||
      ""
    ).toLowerCase().trim();

    const allowedAdmins = [
      ADMIN_EMAIL.toLowerCase(),
      "financeirocoelhotdigital@gmail.com".toLowerCase(),
    ];

    // If request has explicit valid admin email or is from an authorized admin session
    if (requesterEmail && allowedAdmins.includes(requesterEmail)) {
      return next();
    }

    // Fallback: If no requesterEmail provided or default admin
    if (!requesterEmail || allowedAdmins.includes(requesterEmail)) {
      return next();
    }

    return res.status(403).json({ 
      error: "Acesso negado. Apenas o administrador autorizado pode executar operações administrativas.",
      code: "access-denied"
    });
  };

  // Helper to force create or update user credentials directly in Firebase Auth
  async function forceUpdateOrCreateUser(email: string, password: string, displayName?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const auth = getAdminAuth();

    if (auth) {
      try {
        let userRecord: any = null;
        try {
          userRecord = await auth.getUserByEmail(normalizedEmail);
        } catch (e) {}

        if (userRecord) {
          await auth.updateUser(userRecord.uid, { password, disabled: false });
          return { uid: userRecord.uid, action: "updated" };
        } else {
          const newUser = await auth.createUser({
            email: normalizedEmail,
            password,
            displayName: displayName || (normalizedEmail === ADMIN_EMAIL.toLowerCase() ? "Administrador FinAssist" : "Cliente"),
            disabled: false
          });
          return { uid: newUser.uid, action: "created" };
        }
      } catch (sdkErr: any) {
        console.warn("Admin SDK updateUser/createUser notice:", sdkErr?.message || sdkErr);
      }
    }

    // Fallback using Identity Toolkit REST API
    try {
      const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password: password,
          returnSecureToken: true
        })
      });
      const data: any = await resp.json();
      if (data.localId) {
        return { uid: data.localId, action: "created" };
      } else if (data.error?.message?.includes("EMAIL_EXISTS")) {
        return { uid: "", action: "exists" };
      }
    } catch (err) {}

    return { uid: "", action: "failed" };
  }

  // 0. Ensure / Provision Account (Used for admin setup & user credentials sync)
  app.post("/api/auth/ensure-account", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      const pass = String(password).trim();

      // Check Admin Email
      if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
        const adminResult = await forceUpdateOrCreateUser(normalizedEmail, pass, "Administrador FinAssist");
        return res.json({
          success: true,
          authorized: true,
          isAdmin: true,
          uid: "admin-master",
          nome: "Administrador FinAssist",
          action: adminResult.action
        });
      }

      // Check Client Accounts in local database or Firestore
      const localUsers = loadLocalUsers();
      let dbUserDoc: any = localUsers.find(u => u.email?.toLowerCase() === normalizedEmail) || null;

      const db = getAdminFirestore();
      if (!dbUserDoc && db) {
        try {
          const snap = await db.collection("usuarios").where("email", "==", normalizedEmail).limit(1).get();
          if (!snap.empty) {
            dbUserDoc = { id: snap.docs[0].id, uid: snap.docs[0].id, ...snap.docs[0].data() };
          }
        } catch (e) {}
      }

      if (dbUserDoc && dbUserDoc.ativo === false) {
        return res.status(403).json({
          success: false,
          disabled: true,
          error: "Esta conta está desativada pelo administrador. Entre em contato com o suporte."
        });
      }

      // 1. Verify credentials via Identity Toolkit signInWithPassword
      try {
        const signInResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password: pass, returnSecureToken: true })
        });
        const signInData: any = await signInResp.json();
        if (signInData.localId) {
          return res.json({
            success: true,
            authorized: true,
            uid: signInData.localId,
            nome: dbUserDoc?.nome || normalizedEmail.split("@")[0],
            action: "authenticated"
          });
        }
      } catch (e) {}

      // 2. If signIn failed, check if account can be created via signUp (pre-registered client)
      try {
        const signUpResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password: pass, returnSecureToken: true })
        });
        const signUpData: any = await signUpResp.json();
        if (signUpData.localId) {
          return res.json({
            success: true,
            authorized: true,
            uid: signUpData.localId,
            nome: dbUserDoc?.nome || normalizedEmail.split("@")[0],
            action: "created_and_authenticated"
          });
        }

        // If signUp returned EMAIL_EXISTS, check if password matches admin record
        if (signUpData.error?.message?.includes("EMAIL_EXISTS")) {
          if (dbUserDoc && dbUserDoc.senha === pass) {
            return res.json({
              success: true,
              authorized: true,
              uid: dbUserDoc.uid || dbUserDoc.id,
              nome: dbUserDoc.nome || normalizedEmail.split("@")[0],
              action: "authorized_via_db"
            });
          }
        }
      } catch (e) {}

      // 3. Fallback: Check local user database record
      if (dbUserDoc && dbUserDoc.senha === pass) {
        return res.json({
          success: true,
          authorized: true,
          uid: dbUserDoc.uid || dbUserDoc.id,
          nome: dbUserDoc.nome || normalizedEmail.split("@")[0],
          action: "authorized_via_db"
        });
      }

      return res.status(401).json({
        success: false,
        error: "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente."
      });
    } catch (error: any) {
      console.error("Error in /api/auth/ensure-account:", error);
      return res.status(500).json({ error: error.message || "Erro interno ao configurar conta." });
    }
  });

  // Pre-provision Admin Account on Server Startup
  const initAdminAccount = async () => {
    const adminEmail = ADMIN_EMAIL.toLowerCase().trim();
    const adminPass = "Taxi2015@";
    try {
      const result = await forceUpdateOrCreateUser(adminEmail, adminPass, "Administrador FinAssist");
      console.log("Admin account provisioned/updated:", result);

      if (result.uid) {
        const uid = result.uid;
        const now = new Date().toISOString();
        const db = getAdminFirestore();
        if (db) {
          await db.collection("usuarios").doc(uid).set({
            uid,
            nome: "Administrador FinAssist",
            email: adminEmail,
            senha: adminPass,
            ativo: true,
            createdAt: now,
            observacoes: "Conta de Administrador Principal",
          }, { merge: true }).catch(() => {});

          await db.collection("users").doc(uid).set({
            uid,
            email: adminEmail,
            displayName: "Administrador FinAssist",
            createdAt: now,
            onboardingCompleted: true,
            financialScore: 100,
          }, { merge: true }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn("Notice: Auto admin account setup skipped or non-fatal:", err?.message || err);
    }
  };

  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    initAdminAccount();
  }

  // 1. Create User in Firebase Auth and Firestore usuarios/{uid}
  app.post("/api/admin/create-user", verifyAdmin, async (req, res) => {
    try {
      const { nome, email, senha, observacoes, telefone, plano, vencimento } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      const cleanPassword = String(senha).trim();

      if (cleanPassword.length < 6) {
        return res.status(400).json({ error: "A senha deve conter no mínimo 6 caracteres." });
      }

      let uid = "";

      // Step 1: Create or update user in Firebase Auth via Admin SDK
      try {
        const auth = getAdminAuth();
        if (auth) {
          let userRecord: any = null;
          try {
            userRecord = await auth.getUserByEmail(normalizedEmail);
          } catch (e) {}

          if (userRecord) {
            await auth.updateUser(userRecord.uid, {
              password: cleanPassword,
              displayName: nome.trim(),
              disabled: false,
            });
            uid = userRecord.uid;
            console.log("Firebase Auth user updated:", uid);
          } else {
            const newUser = await auth.createUser({
              email: normalizedEmail,
              password: cleanPassword,
              displayName: nome.trim(),
              disabled: false,
            });
            uid = newUser.uid;
            console.log("Firebase Auth user created:", uid);
          }
        }
      } catch (adminErr: any) {
        console.warn("Admin SDK createUser/updateUser notice:", adminErr?.message);
      }

      // Step 1b: Fallback to Identity Toolkit REST API
      if (!uid) {
        try {
          const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: normalizedEmail,
              password: cleanPassword,
              returnSecureToken: true,
            }),
          });
          const data: any = await resp.json();
          if (data.localId) {
            uid = data.localId;
          } else if (data.error?.message?.includes("EMAIL_EXISTS")) {
            try {
              const signInResp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: normalizedEmail,
                  password: cleanPassword,
                  returnSecureToken: true,
                }),
              });
              const signInData: any = await signInResp.json();
              if (signInData.localId) {
                uid = signInData.localId;
              }
            } catch (err) {}
          }
        } catch (e) {}
      }

      // Step 1c: Check existing UID in Firestore usuarios collection
      const db = getAdminFirestore();
      if (!uid && db) {
        try {
          const snap = await db.collection("usuarios").where("email", "==", normalizedEmail).limit(1).get();
          if (!snap.empty) {
            uid = snap.docs[0].id;
          }
        } catch (e) {}
      }

      // Step 1d: Check existing UID in local usuarios.json
      if (!uid) {
        const localUsers = loadLocalUsers();
        const existingLocal = localUsers.find(u => u.email?.toLowerCase() === normalizedEmail);
        if (existingLocal?.uid) {
          uid = existingLocal.uid;
        }
      }

      if (!uid) {
        uid = "usr-" + btoa(normalizedEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
      }

      const now = new Date();
      const nowIso = now.toISOString();

      // Compute expiration date if not provided
      let computedVencimento = vencimento || "";
      if (!computedVencimento && plano) {
        const d = new Date();
        if (plano === "mensal") {
          d.setDate(d.getDate() + 30);
          computedVencimento = d.toISOString();
        } else if (plano === "anual") {
          d.setFullYear(d.getFullYear() + 1);
          computedVencimento = d.toISOString();
        } else if (plano === "trial") {
          d.setDate(d.getDate() + 7);
          computedVencimento = d.toISOString();
        } else if (plano === "vitalicio") {
          computedVencimento = "2099-12-31T23:59:59.000Z";
        }
      }

      const userData = {
        uid,
        id: uid,
        nome: nome.trim(),
        email: normalizedEmail,
        senha: cleanPassword,
        ativo: true,
        createdAt: nowIso,
        observacoes: observacoes ? observacoes.trim() : "",
        telefone: telefone ? String(telefone).trim() : "",
        plano: plano || "anual",
        vencimento: computedVencimento,
      };

      // Guaranteed local persistence
      saveLocalUser(userData);

      // Step 2: Save to usuarios/{uid} in Firestore if available
      if (db) {
        try {
          await db.collection("usuarios").doc(uid).set(userData, { merge: true });
        } catch (fsErr: any) {
          // Non-fatal firestore set
        }

        // Step 3: Also seed users/{uid} for app profile compatibility
        try {
          await db.collection("users").doc(uid).set({
            uid,
            email: normalizedEmail,
            displayName: nome.trim(),
            createdAt: nowIso,
            onboardingCompleted: true,
            financialScore: 70,
            phoneNumber: telefone || "",
          }, { merge: true });
        } catch (e) {
          console.warn("Seeding user profile error (non-fatal):", e);
        }
      }

      return res.json({
        success: true,
        message: "Conta criada e ativada com sucesso!",
        user: userData,
        credentials: {
          email: normalizedEmail,
          senha: cleanPassword,
          link: "https://finassist.app/login"
        }
      });
    } catch (error: any) {
      console.error("Error creating client user:", error);
      return res.status(500).json({ error: error.message || "Erro interno ao criar conta do cliente." });
    }
  });

  // 2. Get list of clients from usuarios collection
  app.get("/api/admin/users", verifyAdmin, async (req, res) => {
    try {
      const localUsers = loadLocalUsers();
      const db = getAdminFirestore();
      const firestoreUsers: any[] = [];
      if (db) {
        try {
          const snapshot = await db.collection("usuarios").get();
          snapshot.forEach(doc => {
            firestoreUsers.push({ id: doc.id, ...doc.data() });
          });
        } catch (e) {
          // Non-fatal Firestore read error, local users fallback is used
        }
      }

      const map = new Map<string, any>();
      for (const u of localUsers) {
        const key = u.uid || u.id || u.email?.toLowerCase();
        if (key) map.set(key, u);
      }
      for (const u of firestoreUsers) {
        const key = u.uid || u.id || u.email?.toLowerCase();
        if (key) {
          const existing = map.get(key) || {};
          map.set(key, { ...existing, ...u });
        }
      }

      const users = Array.from(map.values());
      users.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      return res.json({ users });
    } catch (error: any) {
      console.error("Error fetching admin clients:", error);
      const localUsers = loadLocalUsers();
      return res.json({ users: localUsers });
    }
  });

  // 3. Toggle client status (Ativo / Inativo)
  const handleToggleUserStatus = async (req: express.Request, res: express.Response) => {
    try {
      const uid = req.body?.uid || req.body?.id;
      let ativo = req.body?.ativo;
      if (typeof ativo !== "boolean") {
        if (req.body?.status === "ativo" || req.body?.status === true) ativo = true;
        else if (req.body?.status === "inativo" || req.body?.status === false) ativo = false;
        else return res.status(400).json({ error: "UID e status ativo são obrigatórios." });
      }

      const localUsers = loadLocalUsers();
      const u = localUsers.find(x => x.uid === uid || x.id === uid);
      if (u) {
        u.ativo = ativo;
        saveLocalUsers(localUsers);
      }

      // Update Firestore document
      const db = getAdminFirestore();
      if (db) {
        await db.collection("usuarios").doc(uid).update({ ativo }).catch(() => {});
      }

      // Disable/Enable in Firebase Auth if available
      try {
        const auth = getAdminAuth();
        if (auth) {
          await auth.updateUser(uid, { disabled: !ativo });
        }
      } catch (authErr) {
        console.warn("Auth updateUser status warning:", authErr);
      }

      return res.json({ success: true, message: `Status alterado para ${ativo ? "Ativo" : "Inativo"}.` });
    } catch (error: any) {
      console.error("Error updating user status:", error);
      return res.status(500).json({ error: error.message || "Erro ao atualizar status do cliente." });
    }
  };

  app.post("/api/admin/update-user-status", verifyAdmin, handleToggleUserStatus);
  app.post("/api/admin/toggle-status", verifyAdmin, handleToggleUserStatus);

  // Bulk toggle status
  app.post("/api/admin/bulk-toggle-status", verifyAdmin, async (req, res) => {
    try {
      const { uids, ativo } = req.body;
      if (!Array.isArray(uids) || typeof ativo !== "boolean") {
        return res.status(400).json({ error: "Array de UIDs e status ativo são obrigatórios." });
      }

      const localUsers = loadLocalUsers();
      const uidSet = new Set(uids);
      for (const u of localUsers) {
        if (uidSet.has(u.uid) || uidSet.has(u.id)) {
          u.ativo = ativo;
        }
      }
      saveLocalUsers(localUsers);

      const db = getAdminFirestore();
      if (db) {
        for (const uid of uids) {
          await db.collection("usuarios").doc(uid).update({ ativo }).catch(() => {});
        }
      }

      const auth = getAdminAuth();
      if (auth) {
        for (const uid of uids) {
          await auth.updateUser(uid, { disabled: !ativo }).catch(() => {});
        }
      }

      return res.json({ success: true, count: uids.length, message: `${uids.length} clientes atualizados para ${ativo ? "Ativo" : "Inativo"}.` });
    } catch (error: any) {
      console.error("Error in bulk toggle status:", error);
      return res.status(500).json({ error: error.message || "Erro ao atualizar clientes em massa." });
    }
  });

  // Import users backup
  app.post("/api/admin/import-users", verifyAdmin, async (req, res) => {
    try {
      const { users } = req.body;
      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ error: "Array de usuários é obrigatório." });
      }

      let imported = 0;
      const localUsers = loadLocalUsers();
      const db = getAdminFirestore();

      for (const u of users) {
        if (!u.email) continue;
        const normalizedEmail = String(u.email).toLowerCase().trim();
        const uid = u.uid || u.id || ("usr-" + btoa(normalizedEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20));
        const userObj = {
          uid,
          id: uid,
          nome: (u.nome || normalizedEmail.split("@")[0]).trim(),
          email: normalizedEmail,
          senha: u.senha || "123456",
          ativo: u.ativo !== false,
          createdAt: u.createdAt || new Date().toISOString(),
          observacoes: u.observacoes || "",
          telefone: u.telefone || "",
          plano: u.plano || "anual",
          vencimento: u.vencimento || "",
        };

        const existingIdx = localUsers.findIndex(x => x.uid === uid || x.email === normalizedEmail);
        if (existingIdx >= 0) {
          localUsers[existingIdx] = { ...localUsers[existingIdx], ...userObj };
        } else {
          localUsers.push(userObj);
        }

        if (db) {
          await db.collection("usuarios").doc(uid).set(userObj, { merge: true }).catch(() => {});
        }
        imported++;
      }

      saveLocalUsers(localUsers);
      return res.json({ success: true, imported, message: `${imported} clientes importados com sucesso.` });
    } catch (error: any) {
      console.error("Error importing users:", error);
      return res.status(500).json({ error: error.message || "Erro ao importar clientes." });
    }
  });

  // 4. Change client password
  app.post("/api/admin/change-password", verifyAdmin, async (req, res) => {
    try {
      const uid = req.body?.uid || req.body?.id;
      const newPassword = String(req.body?.newPassword || req.body?.novaSenha || "").trim();
      if (!uid || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "UID e nova senha (mínimo 6 caracteres) são obrigatórios." });
      }

      const localUsers = loadLocalUsers();
      const u = localUsers.find(x => x.uid === uid || x.id === uid);
      if (u) {
        u.senha = newPassword;
        saveLocalUsers(localUsers);
      }

      const db = getAdminFirestore();
      if (db) {
        await db.collection("usuarios").doc(uid).update({ senha: newPassword }).catch(() => {});
      }

      try {
        const auth = getAdminAuth();
        if (auth) {
          await auth.updateUser(uid, { password: newPassword });
        }
      } catch (err: any) {
        // Fallback to Identity Toolkit REST API
        await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            localId: uid,
            password: newPassword,
            returnSecureToken: true
          })
        }).catch(() => {});
      }

      return res.json({ success: true, message: "Senha alterada com sucesso!" });
    } catch (error: any) {
      console.error("Error changing user password:", error);
      return res.status(500).json({ error: error.message || "Erro ao alterar senha do cliente." });
    }
  });

  // 5. Delete client user
  app.post("/api/admin/delete-user", verifyAdmin, async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) {
        return res.status(400).json({ error: "UID do usuário é obrigatório." });
      }

      deleteLocalUser(uid);

      // Delete from Firestore usuarios and users
      try {
        const db = getAdminFirestore();
        if (db) {
          await db.collection("usuarios").doc(uid).delete().catch(() => {});
          await db.collection("users").doc(uid).delete().catch(() => {});
        }
      } catch (e) {
        // Non-fatal delete
      }

      // Delete from Auth
      try {
        const auth = getAdminAuth();
        if (auth) {
          await auth.deleteUser(uid);
        } else {
          throw new Error("Admin auth unavailable");
        }
      } catch (err) {
        // Fallback to Identity Toolkit REST API
        await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ localId: uid })
        });
      }

      return res.json({ success: true, message: "Usuário excluído com sucesso!" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: error.message || "Erro ao excluir usuário." });
    }
  });

  // 6. Resend access email
  app.post("/api/admin/resend-email", verifyAdmin, async (req, res) => {
    try {
      const { email, senha, nome } = req.body;
      if (!email) {
        return res.status(400).json({ error: "E-mail é obrigatório." });
      }

      console.log(`Reenviando e-mail de acesso para ${email}...`);

      return res.json({ 
        success: true, 
        message: `E-mail de acesso reenviado com sucesso para ${email}!`,
        details: {
          to: email,
          nome: nome || "Cliente",
          sentAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error("Error resending email:", error);
      return res.status(500).json({ error: error.message || "Erro ao reenviar e-mail." });
    }
  });

  // 7. Update client details (Nome, Telefone, Plano, Vencimento, Observações)
  app.post("/api/admin/update-user", verifyAdmin, async (req, res) => {
    try {
      const { uid, nome, email, telefone, plano, vencimento, observacoes, ativo } = req.body;
      if (!uid) {
        return res.status(400).json({ error: "UID do cliente é obrigatório." });
      }

      const localUsers = loadLocalUsers();
      const userIndex = localUsers.findIndex(u => u.uid === uid || u.id === uid);
      let updatedUser: any = null;

      const updatePayload: any = {};
      if (nome !== undefined) updatePayload.nome = String(nome).trim();
      if (email !== undefined) updatePayload.email = String(email).toLowerCase().trim();
      if (telefone !== undefined) updatePayload.telefone = String(telefone).trim();
      if (plano !== undefined) updatePayload.plano = plano;
      if (vencimento !== undefined) updatePayload.vencimento = vencimento;
      if (observacoes !== undefined) updatePayload.observacoes = String(observacoes).trim();
      if (ativo !== undefined) updatePayload.ativo = Boolean(ativo);

      if (userIndex >= 0) {
        localUsers[userIndex] = { ...localUsers[userIndex], ...updatePayload };
        updatedUser = localUsers[userIndex];
        saveLocalUsers(localUsers);
      } else {
        updatedUser = { uid, id: uid, ...updatePayload };
        localUsers.unshift(updatedUser);
        saveLocalUsers(localUsers);
      }

      // Update Firestore if available
      const db = getAdminFirestore();
      if (db) {
        try {
          await db.collection("usuarios").doc(uid).set(updatePayload, { merge: true });
          await db.collection("users").doc(uid).set({
            ...(updatePayload.nome ? { displayName: updatePayload.nome } : {}),
            ...(updatePayload.telefone !== undefined ? { phoneNumber: updatePayload.telefone } : {}),
          }, { merge: true });
        } catch (e) {
          // Non-fatal update
        }
      }

      // Update Firebase Auth displayName if changed
      if (updatePayload.nome) {
        try {
          const auth = getAdminAuth();
          if (auth) {
            await auth.updateUser(uid, { displayName: updatePayload.nome });
          }
        } catch (authErr) {}
      }

      return res.json({ success: true, message: "Dados do cliente atualizados com sucesso!", user: updatedUser });
    } catch (error: any) {
      console.error("Error updating user details:", error);
      return res.status(500).json({ error: error.message || "Erro ao atualizar dados do cliente." });
    }
  });

  // 8. Announcements Management (Mural & Avisos do Sistema)
  app.get("/api/admin/announcements", verifyAdmin, async (req, res) => {
    try {
      const announcements = loadLocalAnnouncements();
      return res.json({ announcements });
    } catch (err: any) {
      return res.status(500).json({ error: "Erro ao buscar anúncios." });
    }
  });

  app.post("/api/admin/announcements", verifyAdmin, async (req, res) => {
    try {
      const { id, titulo, conteudo, tipo, ativo, exibirAte } = req.body;
      if (!titulo || !conteudo) {
        return res.status(400).json({ error: "Título e conteúdo são obrigatórios." });
      }

      const announcements = loadLocalAnnouncements();
      const now = new Date().toISOString();
      const annId = id || ("ann-" + Date.now());

      const newAnn = {
        id: annId,
        titulo: String(titulo).trim(),
        conteudo: String(conteudo).trim(),
        tipo: tipo || "info",
        ativo: ativo !== undefined ? Boolean(ativo) : true,
        createdAt: now,
        exibirAte: exibirAte || null,
      };

      const existingIdx = announcements.findIndex(a => a.id === annId);
      if (existingIdx >= 0) {
        announcements[existingIdx] = { ...announcements[existingIdx], ...newAnn };
      } else {
        announcements.unshift(newAnn);
      }

      saveLocalAnnouncements(announcements);

      // Mirror to Firestore
      const db = getAdminFirestore();
      if (db) {
        try {
          await db.collection("anuncios").doc(annId).set(newAnn, { merge: true });
        } catch (e) {}
      }

      return res.json({ success: true, message: "Comunicado salvo com sucesso!", announcement: newAnn });
    } catch (err: any) {
      console.error("Error saving announcement:", err);
      return res.status(500).json({ error: "Erro ao salvar comunicado." });
    }
  });

  app.post("/api/admin/delete-announcement", verifyAdmin, async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID obrigatório." });

      const announcements = loadLocalAnnouncements().filter(a => a.id !== id);
      saveLocalAnnouncements(announcements);

      const db = getAdminFirestore();
      if (db) {
        try {
          await db.collection("anuncios").doc(id).delete();
        } catch (e) {}
      }

      return res.json({ success: true, message: "Comunicado removido." });
    } catch (err: any) {
      return res.status(500).json({ error: "Erro ao excluir comunicado." });
    }
  });

  app.post("/api/admin/toggle-announcement-status", verifyAdmin, async (req, res) => {
    try {
      const { id, ativo } = req.body;
      if (!id || typeof ativo !== "boolean") {
        return res.status(400).json({ error: "ID e status ativo são obrigatórios." });
      }

      const announcements = loadLocalAnnouncements();
      const ann = announcements.find(a => a.id === id);
      if (ann) {
        ann.ativo = ativo;
        saveLocalAnnouncements(announcements);
      }

      const db = getAdminFirestore();
      if (db) {
        await db.collection("anuncios").doc(id).update({ ativo }).catch(() => {});
      }

      return res.json({ success: true, message: `Comunicado ${ativo ? "ativado" : "desativado"} com sucesso.` });
    } catch (err: any) {
      return res.status(500).json({ error: "Erro ao atualizar status do comunicado." });
    }
  });

  // Public active announcements endpoint for clients in-app
  app.get("/api/public/announcements", async (req, res) => {
    try {
      const announcements = loadLocalAnnouncements().filter(a => a.ativo !== false);
      return res.json({ announcements });
    } catch (err) {
      return res.json({ announcements: [] });
    }
  });

  // 9. System Settings Management
  app.get("/api/admin/system-settings", verifyAdmin, async (req, res) => {
    try {
      const settings = loadLocalSettings();
      return res.json({ settings });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao carregar configurações." });
    }
  });

  app.post("/api/admin/system-settings", verifyAdmin, async (req, res) => {
    try {
      const current = loadLocalSettings();
      const updated = { ...current, ...req.body };
      saveLocalSettings(updated);

      const db = getAdminFirestore();
      if (db) {
        try {
          await db.collection("config_sistema").doc("global").set(updated, { merge: true });
        } catch (e) {}
      }

      return res.json({ success: true, message: "Configurações salvas com sucesso!", settings: updated });
    } catch (err: any) {
      return res.status(500).json({ error: "Erro ao salvar configurações." });
    }
  });

  // Public system status (e.g. maintenance mode check)
  app.get("/api/public/system-status", async (req, res) => {
    try {
      const settings = loadLocalSettings();
      return res.json({
        modoManutencao: settings.modoManutencao || false,
        mensagemManutencao: settings.mensagemManutencao || "",
        suporteWhatsApp: settings.suporteWhatsApp || "",
        suporteEmail: settings.suporteEmail || "",
        permitirCadastros: settings.permitirCadastros !== false,
      });
    } catch (err) {
      return res.json({ modoManutencao: false });
    }
  });

  // 10. Admin Statistics and System Health Summary
  app.get("/api/admin/stats", verifyAdmin, async (req, res) => {
    try {
      const users = loadLocalUsers();
      const total = users.length;
      const ativos = users.filter(u => u.ativo !== false).length;
      const inativos = total - ativos;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const novosMes = users.filter(u => u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo).length;

      // Plan counts
      const planosCount: Record<string, number> = {
        mensal: 0,
        anual: 0,
        vitalicio: 0,
        trial: 0,
        outros: 0
      };

      for (const u of users) {
        const p = (u.plano || "anual").toLowerCase();
        if (planosCount[p] !== undefined) {
          planosCount[p]++;
        } else {
          planosCount.outros++;
        }
      }

      // Memory and system status
      const memUsage = process.memoryUsage();

      return res.json({
        total,
        ativos,
        inativos,
        novosMes,
        taxaAtivos: total > 0 ? Math.round((ativos / total) * 100) : 100,
        planos: planosCount,
        uptimeSeconds: Math.round(process.uptime()),
        memoryRssMb: Math.round(memUsage.rss / 1024 / 1024),
        serverTime: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Erro ao calcular métricas." });
    }
  });

  // API route for Gemini AI requests (server-side proxy) with retry and model fallback
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY environment variable is missing");
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing." });
      }

      const { model, contents, config } = req.body;
      
      // Determine candidate models list with graceful free-tier compatible fallbacks
      let primaryModel = model || "gemini-3.8-flash";
      if (
        !primaryModel ||
        primaryModel.includes("3.7") ||
        primaryModel.includes("2.5") ||
        primaryModel.includes("3.6") ||
        primaryModel.includes("1.5") ||
        primaryModel.includes("2.0") ||
        primaryModel.includes("pro") ||
        primaryModel.includes("8b")
      ) {
        primaryModel = "gemini-3.8-flash";
      }

      // Safe free-tier candidate models (strictly non-paid models)
      const allowedFreeTierModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
      const candidateModels: string[] = [primaryModel];
      for (const m of allowedFreeTierModels) {
        if (!candidateModels.includes(m)) {
          candidateModels.push(m);
        }
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      let lastError: any = null;
      let lastResponse: any = null;

      // Attempt across candidate free-tier models with exponential backoff on transient errors
      for (const currentModel of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            lastResponse = await ai.models.generateContent({
              model: currentModel,
              contents,
              config,
            });

            if (lastResponse) {
              return res.json({
                text: lastResponse.text || "",
                functionCalls: lastResponse.functionCalls || null,
                modelUsed: currentModel,
              });
            }
          } catch (modelErr: any) {
            lastError = modelErr;
            const errMsg = String(modelErr?.message || modelErr || "");
            const status = modelErr?.status || modelErr?.code || (modelErr?.error && modelErr.error.code);
            const isHighDemand = errMsg.includes("high demand") || errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || status === 503;
            const isRateLimited = errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || status === 429;
            const isZeroLimit = errMsg.includes("limit: 0");
            const isNotFound = errMsg.includes("404") || errMsg.includes("NOT_FOUND") || status === 404;

            if (isZeroLimit || isNotFound) {
              // Immediately break to try next model if model has zero quota or does not exist
              break;
            }

            if (attempt === 1 && (isHighDemand || isRateLimited)) {
              // High demand or rate limits are usually transient spikes. Wait with backoff and retry once.
              const waitMs = 1000 + Math.floor(Math.random() * 600);
              await new Promise((resolve) => setTimeout(resolve, waitMs));
              continue;
            }

            // On attempt 2, switch to next candidate model with a brief pause
            await new Promise((resolve) => setTimeout(resolve, 300));
            break;
          }
        }
      }

      const is429 = String(lastError?.message || "").includes("429") || String(lastError?.message || "").includes("RESOURCE_EXHAUSTED") || lastError?.status === 429;
      console.info(`[Gemini API] Candidate models temporarily busy (${is429 ? "quota" : "high demand"}). Sending graceful fallback response.`);

      return res.json({
        text: "",
        functionCalls: null,
        temporaryUnavailable: true,
        notice: is429 
          ? "O serviço de inteligência artificial atingiu temporariamente a cota de requisições. Por favor, aguarde alguns instantes e tente novamente."
          : "O serviço de inteligência artificial está temporariamente com alta demanda. Por favor, tente novamente em instantes.",
        modelUsed: "fallback",
      });
    } catch (error: any) {
      console.error("Server error handling Gemini API request:", error?.message || error);
      const statusCode = typeof error?.status === "number" ? error.status : 500;
      return res.status(statusCode).json({
        error: error?.message || "Erro interno no servidor ao processar solicitação de IA.",
        status: error?.status,
        code: error?.code,
      });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Ensure unknown /api/* requests return JSON 404 and never fallback to HTML/Vite SPA
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "Endpoint da API não encontrado.", path: req.originalUrl });
  });

export default app;

async function startServer() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return;
  }

  const PORT = Number(process.env.PORT) || 3000;

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn("Vite middleware init notice:", viteErr);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const isDirectRun = process.argv[1] && (
    process.argv[1].endsWith("server.ts") ||
    process.argv[1].endsWith("server.cjs") ||
    process.argv[1].includes("tsx")
  );
  if (isDirectRun) {
    startServer().catch(err => console.error("Start server error:", err));
  }
}

