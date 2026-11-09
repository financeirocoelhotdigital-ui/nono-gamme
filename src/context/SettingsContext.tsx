import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile, UserSettings } from '../types';

interface SettingsContextType {
  settings: UserSettings;
  updateSetting: (field: keyof UserSettings, value: any) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  resetAllData: (userId: string) => Promise<void>;
  exportData: (userId: string) => Promise<void>;
  importData: (userId: string, file: File) => Promise<void>;
  logout: (onLogout: () => void) => Promise<void>;
  executarResetCompleto: (userId: string) => Promise<void>;
  resetAppData: (userId: string) => Promise<void>;
}

const defaultSettings: UserSettings = {
  theme: 'light',
  notificationsEnabled: true,
  spendingAlertsEnabled: true,
  goalAlertsEnabled: true,
  biometricsEnabled: false,
  pinEnabled: false,
  currency: 'BRL (R$)',
  language: 'pt',
  aiMode: 'hibrido',
  favoriteModules: [],
  aiEnabled: true,
  aiSuggestionLevel: 'proactive',
  aiTone: 'informal',
  dateFormat: 'DD/MM/AAAA',
  autoLockTime: 'Após 5 minutos',
  name: 'Usuário',
  soundEnabled: true,
  vibrationEnabled: true
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  // Apply theme immediately
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  // Sync with Firestore when user is logged in
  useEffect(() => {
    let unsubscribeSnap: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribeSnap) unsubscribeSnap();

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        unsubscribeSnap = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (data.settings) {
              setSettings(prev => ({ ...prev, ...data.settings }));
            }
          }
        }, (error) => {
          console.error('Error in settings snapshot:', error);
          // Don't use handleFirestoreError here to avoid circular dependencies or complex error objects for settings
        });
      } else {
        unsubscribeSnap = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnap) unsubscribeSnap();
    };
  }, []);

  const updateSetting = async (field: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          [`settings.${field}`]: value
        });
      } catch (error) {
        console.error('Error updating setting in Firestore:', error);
      }
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, data);
      } catch (error) {
        console.error('Error updating profile in Firestore:', error);
      }
    }
  };

  const resetAllData = async (userId: string) => {
    const collectionsToClear = [
      "transactions", "accounts", "goals", "debts", "receivables", 
      "subscriptions", "wealth", "investments", "budgets", "insights",
      "debtors", "documents", "cards", "invoices", "categories",
      "subCategories", "tags", "transactionHistory", "family",
      "family_incomes", "family_goals", "reminders", "user_events", 
      "actionPlans", "actionItems", "diagnoses", "strategic_insights",
      "investment_contributions", "score_history", "user_badges",
      "reconciliationHistory", "lifePlans", "lifePlanSimulations",
      "debtHistory", "installments"
    ];
    const { collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
    
    // Fetch all snapshots in parallel for speed
    const snapshots = await Promise.all(
      collectionsToClear.map(collName => 
        getDocs(query(collection(db, collName), where("userId", "==", userId)))
      )
    );

    let batch = writeBatch(db);
    let count = 0;

    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        if (count >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  };

  const exportData = async (userId: string) => {
    const collectionsToExport = [
      "transactions", "accounts", "goals", "debts", "receivables", 
      "subscriptions", "wealth", "investments", "budgets"
    ];
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const allData: any = {
      exportDate: new Date().toISOString(),
      userId: userId,
      settings: settings
    };

    for (const collName of collectionsToExport) {
      const q = query(collection(db, collName), where("userId", "==", userId));
      const snapshot = await getDocs(q);
      allData[collName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_financas_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (userId: string, file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          if (!data.userId || !data.exportDate) {
            throw new Error("Arquivo de backup inválido.");
          }

          const { doc, writeBatch, collection } = await import('firebase/firestore');
          let batch = writeBatch(db);
          let opCount = 0;
          
          if (data.settings) {
            const userRef = doc(db, "users", userId);
            batch.update(userRef, { settings: data.settings });
            opCount++;
          }

          const collectionsToImport = [
            "transactions", "accounts", "goals", "debts", "receivables", 
            "subscriptions", "wealth", "investments", "budgets"
          ];

          for (const collName of collectionsToImport) {
            if (data[collName] && Array.isArray(data[collName])) {
              for (const item of data[collName]) {
                const itemData = { ...item };
                const itemId = itemData.id;
                delete itemData.id; // remove id from fields
                
                // Ensure userId is correct
                itemData.userId = userId;

                // Create a doc reference
                const docRef = itemId ? doc(db, collName, itemId) : doc(collection(db, collName));
                batch.set(docRef, itemData, { merge: true });
                opCount++;

                if (opCount >= 400) {
                  await batch.commit();
                  batch = writeBatch(db);
                  opCount = 0;
                }
              }
            }
          }

          if (opCount > 0) {
            await batch.commit();
          }

          console.log("Dados importados com sucesso para o usuário:", userId);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
      reader.readAsText(file);
    });
  };

  const logout = async (onLogout: () => void) => {
    try {
      localStorage.removeItem('app_settings');
      localStorage.removeItem('finassist_custom_user');
      localStorage.removeItem('finassist_last_path');
      sessionStorage.clear();
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    } catch (e) {
      console.warn("Logout notice in SettingsContext:", e);
    }
    setSettings(defaultSettings);
    if (onLogout) {
      onLogout();
    }
  };

  const executarResetCompleto = async (userId: string) => {
    
    
    
    try {
      // 1. Clear Firestore data (receitas, despesas, dividas, emprestimos, metas, patrimonio, contas, transacoes)
      await resetAllData(userId);
      

      // 2. Reset settings to default
      const resetSettings: UserSettings = {
        ...defaultSettings,
        theme: 'light',
        notificationsEnabled: true,
        currency: 'BRL (R$)',
        biometricsEnabled: false
      };
      
      setSettings(resetSettings);
      
      // 3. Clear all local storage and session storage
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('app_settings', JSON.stringify(resetSettings));
      

      // 4. Update settings in Firestore if user still logged in
      const user = auth.currentUser;
      if (user) {
        const { doc, updateDoc } = await import('firebase/firestore');
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          settings: resetSettings,
          onboardingCompleted: false,
          onboardingData: null
        });
        
      }

      
      
    } catch (error) {
      console.error("Erro durante o reset do app:", error);
      throw error;
    }
  };

  const resetAppData = async (userId: string) => {
    await executarResetCompleto(userId);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, updateProfile, resetAllData, exportData, importData, logout, executarResetCompleto, resetAppData }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
