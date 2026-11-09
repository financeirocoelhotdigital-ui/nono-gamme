import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Reminder, UserEvent, ReminderStatus, UserEventStatus, ActionItem, ActionPriority } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { transacoes } from "../modules/transacoesModule";
import { getActiveUserId } from "../lib/authUtils";

const LOCAL_STORAGE_REMINDERS = "finance_local_reminders_v1";
const LOCAL_STORAGE_USER_EVENTS = "finance_local_user_events_v1";

export function getStoredReminders(): Reminder[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_REMINDERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar lembretes locais:", e);
  }
  return [];
}

export function saveStoredReminders(items: Reminder[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_REMINDERS, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("local_reminders_changed"));
  } catch (e) {
    console.warn("Erro ao salvar lembretes locais:", e);
  }
}

export function getStoredUserEvents(): UserEvent[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_USER_EVENTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar eventos locais:", e);
  }
  return [];
}

export function saveStoredUserEvents(items: UserEvent[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_USER_EVENTS, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("local_user_events_changed"));
  } catch (e) {
    console.warn("Erro ao salvar eventos locais:", e);
  }
}

interface ReminderContextType {
  reminders: Reminder[];
  userEvents: UserEvent[];
  loading: boolean;
  addReminder: (reminder: Omit<Reminder, "id" | "userId" | "createdAt" | "status">) => Promise<string>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  addUserEvent: (event: Omit<UserEvent, "id" | "userId" | "createdAt" | "status">) => Promise<string>;
  updateUserEvent: (id: string, updates: Partial<UserEvent>) => Promise<void>;
  deleteUserEvent: (id: string) => Promise<void>;
  markReminderAsDone: (id: string) => Promise<void>;
  executeReminder: (reminder: Reminder, accountId: string) => Promise<void>;
  checkOverdueEvents: () => Promise<void>;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export function ReminderProvider({ children }: { children: ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>(getStoredReminders);
  const [userEvents, setUserEvents] = useState<UserEvent[]>(getStoredUserEvents);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setReminders(getStoredReminders());
      setUserEvents(getStoredUserEvents());
    };
    window.addEventListener("local_reminders_changed", handleStorageChange);
    window.addEventListener("local_user_events_changed", handleStorageChange);
    return () => {
      window.removeEventListener("local_reminders_changed", handleStorageChange);
      window.removeEventListener("local_user_events_changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribeReminders: (() => void) | null = null;
    let unsubscribeEvents: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeReminders) unsubscribeReminders();
      if (unsubscribeEvents) unsubscribeEvents();

      if (user) {
        // Query by userId without composite index constraint
        const remindersQuery = query(
          collection(db, "reminders"),
          where("userId", "==", user.uid)
        );

        unsubscribeReminders = onSnapshot(remindersQuery, (snapshot) => {
          const remoteData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
          const localList = getStoredReminders();
          const merged = [...remoteData];
          for (const item of localList) {
            if (!merged.some(r => r.id === item.id)) {
              if (item.userId === user.uid || !item.userId || item.userId === "default_user") {
                merged.push({ ...item, userId: user.uid });
              }
            }
          }
          merged.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
          setReminders(merged);
          saveStoredReminders(merged);
        }, (error) => {
          console.warn("Notice: reminders snapshot warning (using local):", error);
          setReminders(getStoredReminders());
        });

        const eventsQuery = query(
          collection(db, "user_events"),
          where("userId", "==", user.uid)
        );

        unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
          const remoteData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserEvent));
          const localList = getStoredUserEvents();
          const merged = [...remoteData];
          for (const item of localList) {
            if (!merged.some(r => r.id === item.id)) {
              if (item.userId === user.uid || !item.userId || item.userId === "default_user") {
                merged.push({ ...item, userId: user.uid });
              }
            }
          }
          merged.sort((a, b) => new Date(a.dateInicio || 0).getTime() - new Date(b.dateInicio || 0).getTime());
          setUserEvents(merged);
          saveStoredUserEvents(merged);
          setLoading(false);
        }, (error) => {
          console.warn("Notice: user_events snapshot warning (using local):", error);
          setUserEvents(getStoredUserEvents());
          setLoading(false);
        });
      } else {
        setReminders(getStoredReminders());
        setUserEvents(getStoredUserEvents());
        setLoading(false);
        unsubscribeReminders = null;
        unsubscribeEvents = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeReminders) unsubscribeReminders();
      if (unsubscribeEvents) unsubscribeEvents();
    };
  }, []);

  const addReminder = async (reminderData: Omit<Reminder, "id" | "userId" | "createdAt" | "status">): Promise<string> => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const tempId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newReminder: Reminder = {
      ...reminderData,
      id: tempId,
      userId: uid,
      status: "ativo" as ReminderStatus,
      createdAt: nowIso
    };

    const currentList = getStoredReminders();
    const updatedList = [newReminder, ...currentList.filter(r => r.id !== tempId)];
    saveStoredReminders(updatedList);
    setReminders(updatedList);

    if (auth.currentUser) {
      try {
        const docRef = await addDoc(collection(db, "reminders"), {
          ...reminderData,
          userId: auth.currentUser.uid,
          status: "ativo" as ReminderStatus,
          createdAt: nowIso
        });
        const firestoreId = docRef.id;
        const syncedList = getStoredReminders().map(r => r.id === tempId ? { ...r, id: firestoreId, userId: auth.currentUser!.uid } : r);
        saveStoredReminders(syncedList);
        setReminders(syncedList);
        return firestoreId;
      } catch (error) {
        console.warn("Notice: reminder saved locally, Firestore sync notice:", error);
      }
    }

    return tempId;
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    const currentList = getStoredReminders();
    const updatedList = currentList.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r);
    saveStoredReminders(updatedList);
    setReminders(updatedList);

    if (auth.currentUser && !id.startsWith("rem_")) {
      try {
        await updateDoc(doc(db, "reminders", id), { ...updates, updatedAt: new Date().toISOString() });
      } catch (error) {
        console.warn("Notice: Firestore updateReminder notice:", error);
      }
    }
  };

  const deleteReminder = async (id: string) => {
    const currentList = getStoredReminders();
    const updatedList = currentList.filter(r => r.id !== id);
    saveStoredReminders(updatedList);
    setReminders(updatedList);

    if (auth.currentUser && !id.startsWith("rem_")) {
      try {
        await deleteDoc(doc(db, "reminders", id));
      } catch (error) {
        console.warn("Notice: Firestore deleteReminder notice:", error);
      }
    }
  };

  const addUserEvent = async (eventData: Omit<UserEvent, "id" | "userId" | "createdAt" | "status">): Promise<string> => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const tempId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newEvent: UserEvent = {
      ...eventData,
      id: tempId,
      userId: uid,
      status: "pendente" as UserEventStatus,
      createdAt: nowIso
    };

    const currentList = getStoredUserEvents();
    const updatedList = [newEvent, ...currentList.filter(e => e.id !== tempId)];
    saveStoredUserEvents(updatedList);
    setUserEvents(updatedList);

    if (auth.currentUser) {
      try {
        const docRef = await addDoc(collection(db, "user_events"), {
          ...eventData,
          userId: auth.currentUser.uid,
          status: "pendente" as UserEventStatus,
          createdAt: nowIso
        });
        const firestoreId = docRef.id;
        const syncedList = getStoredUserEvents().map(e => e.id === tempId ? { ...e, id: firestoreId, userId: auth.currentUser!.uid } : e);
        saveStoredUserEvents(syncedList);
        setUserEvents(syncedList);

        // Integration with Action Plan: generate task
        await addDoc(collection(db, "actionItems"), {
          userId: auth.currentUser.uid,
          title: `Compromisso: ${eventData.name}`,
          description: `Evento agendado para ${new Date(eventData.dateInicio).toLocaleDateString()}.`,
          why: "Organização e pontualidade financeira.",
          priority: "importante" as ActionPriority,
          status: "pendente",
          type: "outro",
          executable: false,
          impact: "Garante que você não esqueça compromissos importantes.",
          createdAt: nowIso
        }).catch(() => {});

        return firestoreId;
      } catch (error) {
        console.warn("Notice: event saved locally, Firestore sync notice:", error);
      }
    }

    return tempId;
  };

  const updateUserEvent = async (id: string, updates: Partial<UserEvent>) => {
    const currentList = getStoredUserEvents();
    const updatedList = currentList.map(e => e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e);
    saveStoredUserEvents(updatedList);
    setUserEvents(updatedList);

    if (auth.currentUser && !id.startsWith("ev_")) {
      try {
        await updateDoc(doc(db, "user_events", id), { ...updates, updatedAt: new Date().toISOString() });
      } catch (error) {
        console.warn("Notice: Firestore updateUserEvent notice:", error);
      }
    }
  };

  const deleteUserEvent = async (id: string) => {
    const currentList = getStoredUserEvents();
    const updatedList = currentList.filter(e => e.id !== id);
    saveStoredUserEvents(updatedList);
    setUserEvents(updatedList);

    if (auth.currentUser && !id.startsWith("ev_")) {
      try {
        await deleteDoc(doc(db, "user_events", id));
      } catch (error) {
        console.warn("Notice: Firestore deleteUserEvent notice:", error);
      }
    }
  };

  const markReminderAsDone = async (id: string) => {
    await updateReminder(id, { status: "concluido" });
  };

  const executeReminder = async (reminder: Reminder, accountId: string) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    if (!reminder.actionData) return;

    try {
      await transacoes.registrarTransacao({
        userId: uid,
        title: reminder.title,
        value: reminder.actionData.value || 0,
        type: reminder.actionData.transactionType || "expense",
        category: reminder.actionData.category || "Outros",
        date: new Date().toISOString(),
        accountId,
        emotion: "racional",
        notes: `Execução automática do lembrete: ${reminder.title}`,
        createdAt: new Date().toISOString()
      });

      await markReminderAsDone(reminder.id);
    } catch (error) {
      console.warn("Notice: executeReminder warning:", error);
      await markReminderAsDone(reminder.id);
    }
  };

  const checkOverdueEvents = async () => {
    const now = new Date();
    userEvents.forEach(async (ev) => {
      if (ev.status === "pendente" && new Date(ev.dateFim) < now) {
        await updateUserEvent(ev.id, { status: "atrasado" });
      }
    });
  };

  return (
    <ReminderContext.Provider value={{
      reminders,
      userEvents,
      loading,
      addReminder,
      updateReminder,
      deleteReminder,
      addUserEvent,
      updateUserEvent,
      deleteUserEvent,
      markReminderAsDone,
      executeReminder,
      checkOverdueEvents
    }}>
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminders() {
  const context = useContext(ReminderContext);
  if (context === undefined) {
    throw new Error("useReminders must be used within a ReminderProvider");
  }
  return context;
}
