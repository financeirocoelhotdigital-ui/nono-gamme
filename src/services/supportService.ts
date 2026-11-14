import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  SupportCategory,
  SupportMessage,
  SupportPriority,
  SupportStatus,
  SupportTicket,
} from "../types";

export interface SupportChannels {
  whatsapp: string;
  email: string;
}

const DEFAULT_CHANNELS: SupportChannels = {
  whatsapp: "5511999999999",
  email: "suporte@finassist.com",
};

const LOCAL_TICKETS_KEY = "finance_local_support_tickets_v1";

function loadLocalTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(LOCAL_TICKETS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalTickets(tickets: SupportTicket[]) {
  try {
    localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(tickets));
  } catch {
    // ignore storage quota
  }
}

export function mergeAndSortTickets(...lists: SupportTicket[][]): SupportTicket[] {
  const map = new Map<string, SupportTicket>();
  lists.forEach((list) => {
    list.forEach((item) => {
      if (!item?.id) return;
      const prev = map.get(item.id);
      if (!prev) {
        map.set(item.id, item);
      } else {
        const prevTime = String(prev.updatedAt || prev.createdAt || "");
        const nextTime = String(item.updatedAt || item.createdAt || "");
        if (nextTime >= prevTime) {
          map.set(item.id, item);
        }
      }
    });
  });

  return Array.from(map.values()).sort((a, b) =>
    String(b.updatedAt || b.createdAt || "").localeCompare(
      String(a.updatedAt || a.createdAt || "")
    )
  );
}

export async function fetchSupportChannels(): Promise<SupportChannels> {
  try {
    const resp = await fetch("/api/public/system-status");
    if (resp.ok && resp.headers.get("content-type")?.includes("application/json")) {
      const data = await resp.json();
      if (data?.suporteWhatsApp || data?.suporteEmail) {
        return {
          whatsapp: String(data.suporteWhatsApp || DEFAULT_CHANNELS.whatsapp).trim(),
          email: String(data.suporteEmail || DEFAULT_CHANNELS.email).trim(),
        };
      }
    }
  } catch {
    // fallback to Firestore
  }

  try {
    const snap = await getDoc(doc(db, "config_sistema", "global"));
    if (snap.exists()) {
      const data = snap.data() as any;
      return {
        whatsapp: String(data?.suporteWhatsApp || DEFAULT_CHANNELS.whatsapp).trim(),
        email: String(data?.suporteEmail || DEFAULT_CHANNELS.email).trim(),
      };
    }
  } catch {
    // fallback to default
  }

  return DEFAULT_CHANNELS;
}

export function normalizeWhatsAppNumber(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function formatSupportProtocol(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randPart = Math.floor(1000 + Math.random() * 9000);
  return `SUP-${datePart}-${randPart}`;
}

export async function fetchUserTicketsFromApi(
  userId: string,
  userEmail?: string
): Promise<SupportTicket[]> {
  try {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (userEmail) params.set("userEmail", userEmail);
    const resp = await fetch(`/api/support/tickets?${params.toString()}`);
    if (resp.ok && resp.headers.get("content-type")?.includes("application/json")) {
      const data = await resp.json();
      if (Array.isArray(data?.tickets)) {
        return data.tickets;
      }
    }
  } catch {
    // ignore network failure
  }
  return [];
}

export function subscribeUserSupportTickets(
  userId: string,
  userEmail: string,
  onUpdate: (tickets: SupportTicket[]) => void
): () => void {
  const localForUser = loadLocalTickets().filter(
    (t) =>
      t.userId === userId ||
      (userEmail && t.userEmail?.toLowerCase() === userEmail.toLowerCase())
  );
  onUpdate(localForUser);

  let latestFirestore: SupportTicket[] = [];
  let latestApi: SupportTicket[] = [];

  const emitMerged = () => {
    const localCurrent = loadLocalTickets().filter(
      (t) =>
        t.userId === userId ||
        (userEmail && t.userEmail?.toLowerCase() === userEmail.toLowerCase())
    );
    const merged = mergeAndSortTickets(localCurrent, latestApi, latestFirestore);
    const otherUsers = loadLocalTickets().filter(
      (t) =>
        t.userId !== userId &&
        (!userEmail || t.userEmail?.toLowerCase() !== userEmail.toLowerCase())
    );
    saveLocalTickets([...merged, ...otherUsers]);
    onUpdate(merged);
  };

  fetchUserTicketsFromApi(userId, userEmail).then((apiList) => {
    latestApi = apiList;
    emitMerged();
  });

  if (!auth.currentUser) {
    return () => {};
  }

  const targetUid = auth.currentUser.uid;
  const q = query(
    collection(db, "support_tickets"),
    where("userId", "==", targetUid)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      latestFirestore = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as any) } as SupportTicket)
      );
      emitMerged();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, "support_tickets");
    }
  );

  return () => unsub();
}

export async function createSupportTicket(params: {
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  description: string;
}): Promise<SupportTicket> {
  const now = new Date().toISOString();
  const effectiveUid = auth.currentUser?.uid || params.userId;
  const ticketRef = doc(collection(db, "support_tickets"));
  const ticketId = ticketRef.id || `sup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const cleanSubject = params.subject.trim().slice(0, 160);
  const cleanDescription = params.description.trim().slice(0, 4000);

  const newTicket: SupportTicket = {
    id: ticketId,
    protocol: formatSupportProtocol(),
    userId: effectiveUid,
    userName: (params.userName || "Usuário").trim().slice(0, 160),
    userEmail: (params.userEmail || "").trim().slice(0, 200),
    subject: cleanSubject,
    category: params.category,
    priority: params.priority,
    status: "aberto",
    description: cleanDescription,
    messages: [
      {
        id: `msg_${Date.now()}`,
        senderRole: "user",
        senderName: (params.userName || "Usuário").trim().slice(0, 160),
        senderEmail: (params.userEmail || "").trim().slice(0, 200),
        text: cleanDescription,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  // Persist locally immediately
  const mergedLocal = mergeAndSortTickets([newTicket], loadLocalTickets());
  saveLocalTickets(mergedLocal);

  // Persist to Firestore if authenticated via Firebase Auth
  if (auth.currentUser) {
    try {
      await setDoc(ticketRef, newTicket);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `support_tickets/${ticketId}`);
    }
  }

  // Also persist to backend API
  try {
    await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTicket),
    });
  } catch {
    // non-fatal
  }

  return newTicket;
}

export async function replyToSupportTicket(params: {
  ticket: SupportTicket;
  senderRole: "user" | "admin";
  senderName: string;
  senderEmail?: string;
  text: string;
  nextStatus?: SupportStatus;
}): Promise<SupportTicket> {
  const now = new Date().toISOString();
  const cleanText = params.text.trim().slice(0, 4000);

  const newMessage: SupportMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    senderRole: params.senderRole,
    senderName: params.senderName.trim().slice(0, 160),
    senderEmail: (params.senderEmail || "").trim().slice(0, 200),
    text: cleanText,
    createdAt: now,
  };

  const resolvedStatus: SupportStatus =
    params.nextStatus ||
    (params.senderRole === "admin"
      ? "em_atendimento"
      : params.ticket.status === "resolvido" || params.ticket.status === "fechado"
      ? "aberto"
      : params.ticket.status);

  const updatedTicket: SupportTicket = {
    ...params.ticket,
    status: resolvedStatus,
    updatedAt: now,
    messages: [...(params.ticket.messages || []), newMessage].slice(-200),
  };

  saveLocalTickets(mergeAndSortTickets([updatedTicket], loadLocalTickets()));

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, "support_tickets", updatedTicket.id), updatedTicket, {
        merge: true,
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `support_tickets/${updatedTicket.id}`
      );
    }
  }

  try {
    await fetch(`/api/support/tickets/${encodeURIComponent(updatedTicket.id)}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderRole: params.senderRole,
        senderName: params.senderName,
        senderEmail: params.senderEmail,
        text: cleanText,
        status: resolvedStatus,
      }),
    });
  } catch {
    // non-fatal
  }

  return updatedTicket;
}

export async function updateSupportTicketStatus(
  ticket: SupportTicket,
  status: SupportStatus,
  adminEmail?: string
): Promise<SupportTicket> {
  const updatedTicket: SupportTicket = {
    ...ticket,
    status,
    updatedAt: new Date().toISOString(),
  };

  saveLocalTickets(mergeAndSortTickets([updatedTicket], loadLocalTickets()));

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, "support_tickets", ticket.id), updatedTicket, {
        merge: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `support_tickets/${ticket.id}`);
    }
  }

  try {
    await fetch(`/api/admin/support-tickets/${encodeURIComponent(ticket.id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(adminEmail ? { "x-user-email": adminEmail, "x-admin-email": adminEmail } : {}),
      },
      body: JSON.stringify({ status }),
    });
  } catch {
    // non-fatal
  }

  return updatedTicket;
}

export async function fetchAllAdminTickets(adminEmail: string): Promise<SupportTicket[]> {
  let apiTickets: SupportTicket[] = [];
  let fsTickets: SupportTicket[] = [];

  try {
    const resp = await fetch("/api/admin/support-tickets", {
      headers: {
        "x-user-email": adminEmail,
        "x-admin-email": adminEmail,
      },
    });
    if (resp.ok && resp.headers.get("content-type")?.includes("application/json")) {
      const data = await resp.json();
      if (Array.isArray(data?.tickets)) {
        apiTickets = data.tickets;
      }
    }
  } catch {
    // non-fatal
  }

  if (auth.currentUser) {
    try {
      const snap = await getDocs(collection(db, "support_tickets"));
      fsTickets = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as any) } as SupportTicket)
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "support_tickets");
    }
  }

  const merged = mergeAndSortTickets(loadLocalTickets(), apiTickets, fsTickets);
  saveLocalTickets(merged);
  return merged;
}
