import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy } from "firebase/firestore";
import { WealthItem, WealthEvolution, WealthEvolutionType, WealthAssetType, Transaction } from "../types";
import { cleanData } from "../lib/utils";
import { transacoes } from "./transacoesModule";
import { insightsModule } from "./insightsModule";

export const wealthModule = {
  async addWealthItem(item: Omit<WealthItem, "id">) {
    try {
      const val = Number(item.value) || 0;
      const purchaseVal = Number(item.purchaseValue) || 0;
      const totalAppreciation = val - purchaseVal;
      const percentageAppreciation = purchaseVal > 0 ? (totalAppreciation / purchaseVal) * 100 : 0;

      const docRef = await addDoc(collection(db, "wealth"), cleanData({
        ...item,
        value: val,
        purchaseValue: purchaseVal,
        status: item.status || "ativo",
        totalInvested: purchaseVal,
        totalAppreciation,
        percentageAppreciation,
        createdAt: item.createdAt || new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      }));

      // Create initial evolution record
      try {
        await addDoc(collection(db, "wealth_evolutions"), cleanData({
          wealthItemId: docRef.id,
          userId: item.userId,
          type: "ajuste",
          value: purchaseVal,
          description: "Aquisição inicial",
          date: item.purchaseDate || new Date().toISOString(),
          createdAt: new Date().toISOString()
        }));
      } catch (evoErr) {
        console.warn("Notice: Non-critical failure saving initial evolution to Firestore:", evoErr);
      }

      return docRef.id;
    } catch (error) {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.CREATE, "wealth");
      }
      throw error;
    }
  },

  async updateWealthItem(id: string, item: Partial<WealthItem>) {
    try {
      const docRef = doc(db, "wealth", id);
      await updateDoc(docRef, cleanData(item));
    } catch (error) {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.UPDATE, `wealth/${id}`);
      }
      throw error;
    }
  },

  async getEvolutions(wealthItemId: string, userId: string) {
    try {
      const q = query(
        collection(db, "wealth_evolutions"),
        where("userId", "==", userId),
        where("wealthItemId", "==", wealthItemId)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WealthEvolution));
      return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    } catch (error) {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, "wealth_evolutions");
      }
      throw error;
    }
  },

  async getAllEvolutions(userId: string) {
    try {
      const q = query(
        collection(db, "wealth_evolutions"),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WealthEvolution));
      return items.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    } catch (error) {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, "wealth_evolutions");
      }
      throw error;
    }
  },

  async evolveWealthItem(id: string, evolutionData: {
    value: number,
    type: WealthEvolutionType,
    description: string,
    date: string,
    addToAssetValue?: boolean,
    newType?: WealthAssetType,
    newName?: string,
    accountId?: string,
    tags?: string[]
  }, currentItem: WealthItem) {
    try {
      const evolutionRef = collection(db, "wealth_evolutions");
      
      // Calculate new values for the item
      let newValue = currentItem.value;
      let newTotalInvested = currentItem.totalInvested || currentItem.purchaseValue;
      let newType = currentItem.type;
      let newName = currentItem.name;

      switch (evolutionData.type) {
        case "valorizacao":
          newValue += evolutionData.value;
          break;
        case "desvalorizacao":
          newValue -= evolutionData.value;
          break;
        case "investimento":
        case "reforma":
        case "construcao":
          if (evolutionData.addToAssetValue) {
            newValue += evolutionData.value;
            newTotalInvested += evolutionData.value;
          }
          break;
        case "transformacao":
          if (evolutionData.newType) newType = evolutionData.newType;
          if (evolutionData.newName) newName = evolutionData.newName;
          // Transformation cost is added to value and invested
          newValue += evolutionData.value;
          newTotalInvested += evolutionData.value;
          break;
        case "renomear":
          if (evolutionData.newName) newName = evolutionData.newName;
          break;
        case "ajuste":
          newValue = evolutionData.value;
          break;
      }

      const evolution: Omit<WealthEvolution, "id"> = {
        wealthItemId: id,
        userId: currentItem.userId,
        type: evolutionData.type,
        value: evolutionData.value,
        description: evolutionData.description,
        date: evolutionData.date,
        oldType: evolutionData.type === "transformacao" ? currentItem.type : undefined,
        newType: evolutionData.newType,
        oldName: (evolutionData.type === "renomear" || evolutionData.type === "transformacao") ? currentItem.name : undefined,
        newName: evolutionData.newName,
        addToAssetValue: evolutionData.addToAssetValue,
        accountId: evolutionData.accountId,
        tags: evolutionData.tags,
        beforeState: {
          name: currentItem.name,
          type: currentItem.type,
          value: currentItem.value
        },
        afterState: {
          name: newName,
          type: newType,
          value: newValue
        },
        createdAt: new Date().toISOString()
      };

      await addDoc(evolutionRef, cleanData(evolution));

      const totalAppreciation = newValue - newTotalInvested;
      const percentageAppreciation = newTotalInvested > 0 ? (totalAppreciation / newTotalInvested) * 100 : 0;

      await this.updateWealthItem(id, {
        value: newValue,
        totalInvested: newTotalInvested,
        type: newType,
        name: newName,
        totalAppreciation,
        percentageAppreciation,
        lastUpdate: new Date().toISOString()
      });

      // If it's an investment/transformation/reform/construction with an account, create a transaction
      if (evolutionData.accountId && evolutionData.value > 0 && ["investimento", "transformacao", "reforma", "construcao"].includes(evolutionData.type)) {
        await transacoes.registrarTransacao({
          userId: currentItem.userId,
          type: "expense",
          value: evolutionData.value,
          title: `Investimento em ${newName}: ${evolutionData.description}`,
          description: `Evolução patrimonial: ${evolutionData.type}`,
          category: "Patrimônio",
          date: evolutionData.date,
          accountId: evolutionData.accountId,
          emotion: "racional",
          createdAt: new Date().toISOString()
        });
      }

      // Generate insight
      if (evolutionData.type === "transformacao" || evolutionData.type === "construcao" || (evolutionData.value / currentItem.value > 0.15)) {
        const isBigGrowth = (evolutionData.value / currentItem.value > 0.15);
        await insightsModule.saveInsights(currentItem.userId, [{
          title: isBigGrowth ? "Crescimento Patrimonial Expressivo!" : "Patrimônio Evoluído!",
          description: evolutionData.type === "transformacao" 
            ? `Seu ${evolution.beforeState?.type} agora é um ${evolution.afterState?.type}. Isso pode aumentar significativamente seu valor de mercado.`
            : `Você registrou uma evolução de ${evolutionData.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em seu bem.`,
          explanation: `A evolução constante de ativos é a chave para a construção de riqueza a longo prazo.`,
          solution: "Continue monitorando as melhorias e a valorização de mercado.",
          impact: isBigGrowth 
            ? `Este evento representou um crescimento de ${((evolutionData.value / currentItem.value) * 100).toFixed(1)}% no valor deste bem.`
            : `Seu patrimônio agora está mais valorizado e detalhado.`,
          priority: isBigGrowth ? "importante" : "informativo",
          type: "padrao",
          category: "Patrimônio",
          status: "ativo"
        } as any]);
      }

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `wealth/${id}/evolve`);
      throw error;
    }
  },

  async sellWealthItem(id: string, saleData: { 
    saleValue: number, 
    saleDate: string, 
    accountId: string, 
    notes?: string 
  }, currentItem: WealthItem, skipTransaction: boolean = false) {
    try {
      const totalInvested = currentItem.totalInvested || currentItem.purchaseValue;
      const profit = saleData.saleValue - totalInvested;
      const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

      await this.updateWealthItem(id, {
        status: "vendido",
        saleValue: saleData.saleValue,
        saleDate: saleData.saleDate,
        profit,
        profitPercentage,
        destinationAccountId: saleData.accountId,
        lastUpdate: new Date().toISOString()
      });

      // Create evolution record for sale
      await addDoc(collection(db, "wealth_evolutions"), cleanData({
        wealthItemId: id,
        userId: currentItem.userId,
        type: "venda",
        value: saleData.saleValue,
        description: `Venda concluída. ${saleData.notes || ""}`,
        date: saleData.saleDate,
        createdAt: new Date().toISOString()
      }));

      // Create income transaction if not already registered
      if (!skipTransaction && saleData.saleValue > 0) {
        await transacoes.registrarTransacao({
          userId: currentItem.userId,
          type: "income",
          value: saleData.saleValue,
          title: `Venda de Patrimônio: ${currentItem.name}`,
          description: `Venda concluída em ${saleData.saleDate}. ${saleData.notes || ""}`.trim(),
          category: "Patrimônio",
          date: saleData.saleDate,
          accountId: saleData.accountId || undefined,
          emotion: "feliz",
          createdAt: new Date().toISOString()
        });
      }

      // Generate insight
      await insightsModule.saveInsights(currentItem.userId, [{
        title: "Patrimônio Vendido",
        description: `Você vendeu ${currentItem.name} com um ${profit >= 0 ? "lucro" : "prejuízo"} de ${profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
        explanation: `A liquidação de ativos faz parte da gestão estratégica de patrimônio.`,
        solution: "Considere reinvestir o capital para manter o crescimento.",
        impact: `Aumento de liquidez imediata.`,
        priority: "high",
        type: "padrao",
        category: "Patrimônio",
        status: "ativo"
      } as any]);

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `wealth/${id}/sell`);
      throw error;
    }
  },

  async deleteWealthItem(id: string) {
    try {
      const uid = auth.currentUser?.uid;
      const docRef = doc(db, "wealth", id);
      await deleteDoc(docRef);
      
      // Delete evolutions
      const q = uid
        ? query(collection(db, "wealth_evolutions"), where("userId", "==", uid), where("wealthItemId", "==", id))
        : query(collection(db, "wealth_evolutions"), where("wealthItemId", "==", id));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `wealth/${id}`);
      throw error;
    }
  },
  
  async deleteEvolution(evolutionId: string, wealthItemId: string, currentItem: WealthItem) {
    try {
      const evolutions = await this.getEvolutions(wealthItemId, currentItem.userId);
      const evoToDelete = evolutions.find(e => e.id === evolutionId);
      
      if (!evoToDelete) throw new Error("Evolução não encontrada");

      // Delete the evolution record
      await deleteDoc(doc(db, "wealth_evolutions", evolutionId));

      // Recalculate item values based on remaining evolutions
      // Start from initial state (purchase)
      let newValue = currentItem.purchaseValue;
      let newTotalInvested = currentItem.purchaseValue;
      let newType = currentItem.type; // This is a bit tricky if we delete a transformation
      
      // Better approach: fetch all remaining evolutions, sorted by date ASC, and replay them
      const remainingEvolutions = evolutions.filter(e => e.id !== evolutionId).sort((a, b) => a.date.localeCompare(b.date));
      
      // Reset current item values in memory for calculation
      // But we need to know the very first name/type if multiple transformations happened.
      // Usually the first evolution is "ajuste" (Aquisição inicial) created in addWealthItem.
      
      for (const evo of remainingEvolutions) {
        switch (evo.type) {
          case "valorizacao":
            newValue += evo.value;
            break;
          case "desvalorizacao":
            newValue -= evo.value;
            break;
          case "investimento":
          case "reforma":
          case "construcao":
            if (evo.addToAssetValue) {
              newValue += evo.value;
              newTotalInvested += evo.value;
            }
            break;
          case "transformacao":
            if (evo.newType) newType = evo.newType;
            newValue += evo.value;
            newTotalInvested += evo.value;
            break;
          case "ajuste":
            newValue = evo.value;
            break;
        }
      }

      const totalAppreciation = newValue - newTotalInvested;
      const percentageAppreciation = newTotalInvested > 0 ? (totalAppreciation / newTotalInvested) * 100 : 0;

      await this.updateWealthItem(wealthItemId, {
        value: newValue,
        totalInvested: newTotalInvested,
        totalAppreciation,
        percentageAppreciation,
        lastUpdate: new Date().toISOString()
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `wealth_evolutions/${evolutionId}`);
      throw error;
    }
  }
};
