import { auth } from "./firebase";
import { UserProfile } from "../types";

export function getActiveUserId(): string {
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  try {
    const stored = localStorage.getItem("finassist_custom_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.uid) return parsed.uid;
    }
  } catch (e) {
    console.warn("Error reading finassist_custom_user from localStorage:", e);
  }
  return "default_user";
}

export function getActiveUserProfile(): UserProfile {
  const uid = getActiveUserId();
  try {
    const stored = localStorage.getItem("finassist_custom_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        uid: parsed.uid || uid,
        email: parsed.email || "",
        displayName: parsed.displayName || "Usuário",
        photoURL: parsed.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(uid)}`,
        createdAt: parsed.createdAt || new Date().toISOString(),
        onboardingCompleted: true,
        financialScore: parsed.financialScore || 80
      };
    }
  } catch {}
  return {
    uid,
    email: auth.currentUser?.email || "",
    displayName: auth.currentUser?.displayName || "Usuário",
    photoURL: auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(uid)}`,
    createdAt: new Date().toISOString(),
    onboardingCompleted: true,
    financialScore: 80
  };
}

export async function clearAllAuthSessionData(): Promise<void> {
  try {
    localStorage.removeItem("finassist_custom_user");
    localStorage.removeItem("finassist_last_path");
    localStorage.removeItem("app_settings");
    sessionStorage.removeItem("finassist_last_path");
    sessionStorage.removeItem("page_reloaded_for_chunk");
  } catch (e) {
    console.warn("Storage cleanup notice:", e);
  }

  try {
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
  } catch (e) {
    console.warn("Firebase signOut notice:", e);
  }
}

