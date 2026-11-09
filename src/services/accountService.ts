import { db } from "../lib/firebase";
import { doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { Account } from "../types";

export async function updateAccountBalance(accountId: string, amount: number) {
  if (!accountId) return;
  const accountRef = doc(db, "accounts", accountId);
  try {
    await updateDoc(accountRef, {
      balance: increment(amount)
    });
  } catch (error) {
    console.error("Error updating account balance:", error);
  }
}

export async function getAccount(accountId: string): Promise<Account | null> {
  if (!accountId) return null;
  const accountRef = doc(db, "accounts", accountId);
  const snap = await getDoc(accountRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as Account;
  }
  return null;
}

export async function setDefaultAccount(userId: string, accountId: string, accounts: Account[]) {
  // First, unset all other default accounts
  const batch: Promise<any>[] = [];
  accounts.forEach(acc => {
    if (acc.isDefault && acc.id !== accountId) {
      batch.push(updateDoc(doc(db, "accounts", acc.id), { isDefault: false }));
    }
  });
  
  // Set the new default
  batch.push(updateDoc(doc(db, "accounts", accountId), { isDefault: true }));
  
  await Promise.all(batch);
}
