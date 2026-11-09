import { db } from "../lib/firebase";
import { collection, addDoc, query, where, getDocs, orderBy, limit, doc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { StrategicInsight } from "../types";

export const insightsModule = {
  async getInsights(userId: string): Promise<StrategicInsight[]> {
    const q = query(
      collection(db, "strategic_insights"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StrategicInsight));
  },

  async saveInsights(userId: string, insights: StrategicInsight[]) {
    const batch = writeBatch(db);
    
    // First, archive old active insights of the same type to avoid clutter
    // Or just add new ones. Let's just add new ones for now.
    
    for (const insight of insights) {
      const docRef = doc(collection(db, "strategic_insights"));
      batch.set(docRef, {
        ...insight,
        id: docRef.id,
        userId,
        status: "ativo",
        createdAt: new Date().toISOString()
      });
    }
    
    await batch.commit();
  },

  async updateInsightStatus(insightId: string, status: StrategicInsight["status"]) {
    const docRef = doc(db, "strategic_insights", insightId);
    await updateDoc(docRef, { status });
  },

  async deleteInsight(insightId: string) {
    await deleteDoc(doc(db, "strategic_insights", insightId));
  }
};
