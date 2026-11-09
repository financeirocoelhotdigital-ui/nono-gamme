import { db } from "../lib/firebase";
import { collection, addDoc, query, where, getDocs, getDocsFromCache, orderBy, limit, doc, updateDoc } from "firebase/firestore";
import { FinancialDiagnosis, UserBadge, ScoreHistory, UserLevel, Badge, Transaction, Account, Goal, Debt, Budget, CashFlowPoint } from "../types";

export const BADGES: Badge[] = [
  {
    id: "controlador_gastos",
    name: "Controlador de Gastos",
    description: "Manteve as despesas abaixo das receitas por 3 meses consecutivos.",
    icon: "Target",
    category: "gastos",
    condition: "Despesas < Receitas por 3 meses"
  },
  {
    id: "livre_dividas",
    name: "Livre de Dívidas",
    description: "Não possui dívidas ativas no momento.",
    icon: "ShieldCheck",
    category: "dividas",
    condition: "Zero dívidas ativas"
  },
  {
    id: "investidor_iniciante",
    name: "Investidor Iniciante",
    description: "Possui pelo menos um investimento ou meta de investimento.",
    icon: "TrendingUp",
    category: "investimentos",
    condition: "Possui investimentos"
  },
  {
    id: "planejador",
    name: "Planejador",
    description: "Possui um plano de vida estruturado e metas definidas.",
    icon: "Map",
    category: "planejamento",
    condition: "Plano de vida + 3 metas"
  },
  {
    id: "organizado",
    name: "Mestre da Organização",
    description: "Categorizou 100% das transações no último mês.",
    icon: "LayoutGrid",
    category: "organizacao",
    condition: "100% transações categorizadas"
  }
];

export interface DiagnosisResult {
  score: number;
  level: UserLevel;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendations: string[];
  missingInfo: string[];
  analysis: string;
  metrics: {
    emergencyReserveCoverMonths: number;
    debtCompromiseRate: number;
    savingsRate: number;
    totalAvailableBalance: number;
    totalInvested: number;
    totalDebt: number;
  };
}

export const diagnosisModule = {
  async getLatestDiagnosis(userId: string): Promise<FinancialDiagnosis | null> {
    const q = query(
      collection(db, "diagnoses"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    let snap;
    try {
      snap = await getDocs(q);
    } catch (e: any) {
      if (e.code === 'unavailable' || e.message?.includes('offline')) {
        snap = await getDocsFromCache(q);
      } else throw e;
    }
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as FinancialDiagnosis;
  },

  async getScoreHistory(userId: string): Promise<ScoreHistory[]> {
    const q = query(
      collection(db, "score_history"),
      where("userId", "==", userId),
      orderBy("date", "asc")
    );
    let snap;
    try {
      snap = await getDocs(q);
    } catch (e: any) {
      if (e.code === 'unavailable' || e.message?.includes('offline')) {
        snap = await getDocsFromCache(q);
      } else throw e;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ScoreHistory));
  },

  async getUserBadges(userId: string): Promise<UserBadge[]> {
    let localBadges: UserBadge[] = [];
    try {
      const stored = localStorage.getItem("finance_local_badges_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) localBadges = parsed;
      }
    } catch {}

    if (!userId || userId.startsWith("local_")) {
      return localBadges;
    }

    try {
      const q = query(
        collection(db, "user_badges"),
        where("userId", "==", userId)
      );
      let snap;
      try {
        snap = await getDocs(q);
      } catch (e: any) {
        if (e.code === 'unavailable' || e.message?.includes('offline')) {
          snap = await getDocsFromCache(q);
        } else throw e;
      }
      const remoteBadges = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserBadge));
      const merged = [...remoteBadges];
      for (const lb of localBadges) {
        if (!merged.some(mb => mb.badgeId === lb.badgeId)) {
          merged.push(lb);
        }
      }
      return merged;
    } catch {
      return localBadges;
    }
  },

  calculateScore(data: {
    transactions: Transaction[];
    accounts: Account[];
    goals: Goal[];
    debts: Debt[];
    budgets: Budget[];
    cashFlow: CashFlowPoint[];
    wealth?: any[];
    investments?: any[];
    cards?: any[];
    financialProfile?: any;
  }): DiagnosisResult {
    const transactions = Array.isArray(data?.transactions) ? data.transactions : [];
    const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
    const goals = Array.isArray(data?.goals) ? data.goals : [];
    const debts = Array.isArray(data?.debts) ? data.debts : [];
    const budgets = Array.isArray(data?.budgets) ? data.budgets : [];
    const cashFlow = Array.isArray(data?.cashFlow) ? data.cashFlow : [];

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const risks: string[] = [];
    const recommendations: string[] = [];
    const missingInfo: string[] = [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 0. Missing Information Tracker
    if (transactions.length === 0) {
      missingInfo.push("Histórico de Transações: Adicione receitas e despesas para mapear seu fluxo real.");
    }
    if (accounts.length === 0) {
      missingInfo.push("Contas Bancárias: Vincule ou crie pelo menos uma conta para calcular o saldo disponível.");
    }
    if (budgets.length === 0) {
      missingInfo.push("Orçamentos de Categoria: Defina limites de gastos mensais para as categorias.");
    }
    if (!data.financialProfile) {
      missingInfo.push("Perfil de Consultoria: Configure sua situação de emprego e rendas para um diagnóstico personalizado.");
    }

    // 1. Establish Income and Expenses
    const monthlyTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const transactionIncome = data.transactions
      .filter(t => t.type === "income")
      .reduce((acc, t) => acc + t.value, 0) / Math.max(1, data.transactions.filter(t => t.type === "income").length / 3); // Average monthly
    
    const profileMainIncome = data.financialProfile?.mainIncome || 0;
    const profileOtherIncome = data.financialProfile?.otherIncome || 0;
    const profileIncome = profileMainIncome + profileOtherIncome;

    // We use profile income if available, otherwise transactions
    const incomeToUse = profileIncome > 0 ? profileIncome : (transactionIncome > 0 ? transactionIncome : 0);
    
    // Monthly fixed and variable expenses
    const monthlyExpense = monthlyTransactions
      .filter(t => t.type === "expense")
      .reduce((acc, t) => acc + t.value, 0);

    const averageExpense = data.transactions
      .filter(t => t.type === "expense")
      .reduce((acc, t) => acc + t.value, 0) / Math.max(1, data.transactions.filter(t => t.type === "expense").length / 3);

    const expenseToUse = monthlyExpense > 0 ? monthlyExpense : (averageExpense > 0 ? averageExpense : 0);

    // 2. Available Balance & Investments
    const totalAvailableBalance = data.accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
    const totalInvested = (data.investments || []).reduce((acc, inv) => acc + (inv.investedValue || 0), 0);
    const totalAssetsValue = (data.wealth || []).reduce((acc, item) => acc + (item.value || 0), 0);

    // 3. Debt commitment
    const activeDebts = data.debts.filter(d => d.status === "ativa");
    const totalDebt = activeDebts.reduce((acc, d) => acc + d.remainingValue, 0);
    const monthlyDebtPayment = activeDebts.reduce((acc, d) => acc + (d.installmentValue || 0), 0);

    const debtCompromiseRate = incomeToUse > 0 ? (monthlyDebtPayment / incomeToUse) * 100 : 0;

    // 4. Savings rate
    const savingsRate = incomeToUse > 0 ? ((incomeToUse - expenseToUse) / incomeToUse) * 100 : 0;

    // 5. Emergency reserve coverage
    // Calculate total emergency reserve (e.g. from profile, or liquid accounts, or piggy banks)
    let reserveValue = 0;
    if (data.financialProfile?.hasReserve && data.financialProfile?.reserveAmount) {
      reserveValue = data.financialProfile.reserveAmount;
    } else {
      // Find liquid balances
      const liquidAccounts = data.accounts.filter(a => a.type === "carteira" || a.type === "digital");
      const liquidBalance = liquidAccounts.reduce((acc, a) => acc + (a.balance || 0), 0);
      reserveValue = Math.max(0, liquidBalance);
    }

    const emergencyReserveCoverMonths = expenseToUse > 0 ? reserveValue / expenseToUse : 0;

    // Determine stability and target reserve months based on profile situation
    const situation = data.financialProfile?.situation || "clt";
    let requiredReserveMonths = 6;
    let situationLabel = "Empregado (CLT)";

    if (situation === "clt" || situation === "public") {
      requiredReserveMonths = 4; // Lower risk
      situationLabel = situation === "clt" ? "Empregado (CLT)" : "Servidor Público";
    } else if (["autonomous", "business", "mei", "liberal", "freelancer"].includes(situation)) {
      requiredReserveMonths = 8; // Higher income volatility
      situationLabel = "Profissional Independente / Empresário";
    } else if (situation === "unemployed") {
      requiredReserveMonths = 12; // Critical vulnerability
      situationLabel = "Desempregado";
    } else if (situation === "student") {
      requiredReserveMonths = 6;
      situationLabel = "Estudante";
    } else if (situation === "retired" || situation === "pensioner") {
      requiredReserveMonths = 6;
      situationLabel = "Aposentado / Pensionista";
    } else if (situation === "transition") {
      requiredReserveMonths = 9;
      situationLabel = "Transição de Carreira";
    }

    // SCORING ENGINE (0-100)
    let scoreSavings = 0; // max 25
    let scoreDebt = 25;    // max 25
    let scoreReserve = 0; // max 25
    let scoreOrg = 15;     // max 15
    let scoreAssets = 0;  // max 10

    // A. Savings Rate Score
    if (savingsRate > 20) scoreSavings = 25;
    else if (savingsRate > 10) scoreSavings = 18;
    else if (savingsRate > 0) scoreSavings = 10;
    else scoreSavings = 0;

    // B. Debt Commitment Score
    if (debtCompromiseRate === 0) scoreDebt = 25;
    else if (debtCompromiseRate < 15) scoreDebt = 20;
    else if (debtCompromiseRate < 30) scoreDebt = 12;
    else if (debtCompromiseRate < 50) scoreDebt = 5;
    else scoreDebt = 0;

    // C. Emergency Reserve Score
    const reserveRatio = emergencyReserveCoverMonths / requiredReserveMonths;
    if (reserveRatio >= 1) scoreReserve = 25;
    else if (reserveRatio >= 0.5) scoreReserve = 15;
    else if (reserveRatio > 0) scoreReserve = 8;
    else scoreReserve = 0;

    // D. Organization Score
    const budgetsCount = budgets.length;
    const transactionsCount = monthlyTransactions.length;
    const uncategorized = monthlyTransactions.filter(t => !t.category || t.category === "Outros");
    const uncategorizedRatio = transactionsCount > 0 ? uncategorized.length / transactionsCount : 0;

    if (budgetsCount > 0 && uncategorizedRatio < 0.1) scoreOrg = 15;
    else if (budgetsCount > 0 || uncategorizedRatio < 0.2) scoreOrg = 10;
    else scoreOrg = 5;

    // E. Assets & Investments Score
    if (totalInvested > 0 || totalAssetsValue > 0) {
      scoreAssets = 10;
    } else if (data.goals.some(g => g.category === "reserva")) {
      scoreAssets = 5;
    }

    let score = scoreSavings + scoreDebt + scoreReserve + scoreOrg + scoreAssets;
    score = Math.min(100, Math.max(0, Math.round(score)));

    // Generate analytical strengths, weaknesses, risks and recommendations based on calculations
    
    // Strengths
    if (savingsRate > 15) {
      strengths.push(`Sua taxa de poupança está saudável (${savingsRate.toFixed(0)}% da renda livre).`);
    } else if (savingsRate > 0) {
      strengths.push(`Você está conseguindo fechar o mês no positivo, poupando ${savingsRate.toFixed(0)}%.`);
    }
    
    if (totalDebt === 0) {
      strengths.push("Parabéns! Você está livre de dívidas ativas estruturadas.");
    } else if (debtCompromiseRate < 20) {
      strengths.push(`Seu nível de endividamento mensal é controlado (${debtCompromiseRate.toFixed(0)}% da renda).`);
    }

    if (emergencyReserveCoverMonths >= requiredReserveMonths) {
      strengths.push(`Reserva de Emergência sólida que cobre ${emergencyReserveCoverMonths.toFixed(1)} meses de custos de vida.`);
    }

    if (totalInvested > 0) {
      strengths.push(`Você possui um portfólio de investimentos de R$ ${totalInvested.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`);
    }

    // Weaknesses & Risks
    if (savingsRate <= 0) {
      weaknesses.push(`Suas despesas mensais estão consumindo toda a sua renda (Déficit de ${Math.abs(savingsRate).toFixed(0)}%).`);
      risks.push("Risco severo de endividamento por fluxo de caixa mensal deficitário.");
      recommendations.push("Ação Imediata: Reduza despesas supérfluas e trace um plano emergencial para restaurar o superávit.");
    }

    if (debtCompromiseRate >= 30) {
      weaknesses.push(`Comprometimento alarmante de renda com dívidas (${debtCompromiseRate.toFixed(0)}%). O recomendado é abaixo de 20%.`);
      risks.push("Estrangulamento financeiro caso haja perda ou redução de renda principal.");
      recommendations.push("Prioridade Alta: Renegocie os juros das dívidas ativas ou busque amortização com prioridade.");
    }

    if (emergencyReserveCoverMonths < requiredReserveMonths * 0.5) {
      weaknesses.push(`Sua reserva financeira cobre apenas ${emergencyReserveCoverMonths.toFixed(1)} meses de gastos (Alvo ideal para seu perfil: ${requiredReserveMonths} meses).`);
      risks.push("Alta vulnerabilidade a imprevistos de saúde, desemprego ou crises de mercado.");
      recommendations.push(`Foque em poupar até atingir a meta de R$ ${(expenseToUse * requiredReserveMonths).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} de reserva.`);
    }

    // Profile-Specific Recommendations and Warning Rules
    if (situation === "unemployed") {
      weaknesses.push("A ausência de fonte de renda ativa eleva drasticamente o risco do patrimônio.");
      if (emergencyReserveCoverMonths < 6) {
        risks.push("Risco crítico de escassez de recursos de sobrevivência básica nos próximos meses.");
      }
      recommendations.push("Corte de Custos Radical: Congele todas as assinaturas e despesas não-essenciais imediatamente.");
      recommendations.push("Foco em Renda Extra: Utilize habilidades para freelancer ou trabalhos autônomos temporários.");
    } else if (["autonomous", "business", "mei", "liberal", "freelancer"].includes(situation)) {
      if (data.financialProfile?.incomeStability === "baixa") {
        weaknesses.push("Renda principal caracterizada por alta volatilidade mensal.");
        risks.push("Risco de inadimplência em meses de baixa sazonalidade.");
        recommendations.push("Regra dos Baldes: Guarde pelo menos 30% dos ganhos nos meses bons para financiar os meses fracos.");
      }
      recommendations.push("Finanças Separadas: Garanta que nenhuma despesa da sua empresa/atividade física se misture com a pessoal.");
    } else if (situation === "clt") {
      recommendations.push("FGTS & Benefícios: Planeje a destinação de bônus ou décimo terceiro para aportes em investimentos de longo prazo.");
    }

    // Default recommendations if lists are short
    if (recommendations.length === 0) {
      recommendations.push("Mantenha o bom hábito de registrar todas as despesas diariamente.");
      recommendations.push("Inicie a automatização de poupança investindo 10% da sua renda assim que recebê-la.");
    }

    let level: UserLevel = "iniciante";
    if (score >= 85) level = "expert";
    else if (score >= 70) level = "avancado";
    else if (score >= 45) level = "intermediario";

    // Build standard descriptive text summary
    let analysis = `Seu Índice de Saúde Financeira é de ${score}/100. Você se enquadra na classificação de nível ${level.toUpperCase()}. `;
    if (score >= 85) {
      analysis += "Excelente! Suas finanças estão extremamente organizadas e protegidas. Continue investindo e ampliando seus horizontes.";
    } else if (score >= 70) {
      analysis += "Muito bem! Você tem as bases estruturadas, mas precisa refinar sua reserva financeira e otimizar aportes mensais.";
    } else if (score >= 45) {
      analysis += "Atenção: Suas finanças estão em equilíbrio instável. Ajustes no orçamento e controle rígido são cruciais para sua tranquilidade.";
    } else {
      analysis += "Alerta Crítico: Suas finanças necessitam de reestruturação imediata. Foque em reduzir gastos e eliminar dívidas caras.";
    }

    return {
      score,
      level,
      strengths,
      weaknesses,
      risks,
      recommendations,
      missingInfo,
      analysis,
      metrics: {
        emergencyReserveCoverMonths,
        debtCompromiseRate,
        savingsRate,
        totalAvailableBalance,
        totalInvested,
        totalDebt
      }
    };
  },

  async saveDiagnosis(userId: string, diagnosis: Omit<FinancialDiagnosis, "id" | "createdAt">) {
    const docRef = await addDoc(collection(db, "diagnoses"), {
      ...diagnosis,
      userId,
      createdAt: new Date().toISOString()
    });

    // Save score history
    await addDoc(collection(db, "score_history"), {
      userId,
      score: diagnosis.score,
      date: new Date().toISOString(),
      reason: "Atualização periódica de diagnóstico"
    });

    // Update user profile score
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { financialScore: diagnosis.score });

    return docRef.id;
  },

  async checkAndUnlockBadges(userId: string, data: any): Promise<Badge[]> {
    const activeUserId = userId || "local_user";
    const userBadges = await this.getUserBadges(activeUserId);
    const unlockedBadgeIds = userBadges.map(ub => ub.badgeId);
    const newlyUnlocked: Badge[] = [];

    for (const badge of BADGES) {
      if (unlockedBadgeIds.includes(badge.id)) continue;

      let shouldUnlock = false;
      
      if (badge.id === "livre_dividas") {
        const activeDebts = (data.debts || []).filter((d: Debt) => d.status === "ativa");
        if (activeDebts.length === 0) shouldUnlock = true;
      }

      if (badge.id === "planejador") {
        const activeGoals = (data.goals || []).filter((g: Goal) => g.status === "active");
        if (activeGoals.length >= 1 || data.lifePlan) shouldUnlock = true;
      }

      if (badge.id === "investidor_iniciante") {
        const hasInvestments = (data.accounts || []).some((a: Account) => a.type === "investimento") || 
                             (data.goals || []).some((g: Goal) => g.category === "reserva") ||
                             (data.investments || []).length > 0;
        if (hasInvestments) shouldUnlock = true;
      }

      if (badge.id === "organizado") {
        const txs = data.transactions || [];
        if (txs.length >= 1 && txs.every((t: any) => t.category && t.category.trim() !== "")) {
          shouldUnlock = true;
        }
      }

      if (badge.id === "controlador_gastos") {
        const txs = data.transactions || [];
        const incomes = txs.filter((t: any) => t.type === "income").reduce((acc: number, t: any) => acc + (t.value || 0), 0);
        const expenses = txs.filter((t: any) => t.type === "expense").reduce((acc: number, t: any) => acc + (t.value || 0), 0);
        if (incomes >= expenses && txs.length >= 2) {
          shouldUnlock = true;
        }
      }

      if (shouldUnlock) {
        const newBadgeItem: UserBadge = {
          id: `ub_${Date.now()}_${badge.id}`,
          userId: activeUserId,
          badgeId: badge.id,
          unlockedAt: new Date().toISOString()
        };

        try {
          const currentLocal = JSON.parse(localStorage.getItem("finance_local_badges_v1") || "[]");
          if (!currentLocal.some((b: any) => b.badgeId === badge.id)) {
            currentLocal.push(newBadgeItem);
            localStorage.setItem("finance_local_badges_v1", JSON.stringify(currentLocal));
          }
        } catch {}

        if (userId && !userId.startsWith("local_")) {
          try {
            await addDoc(collection(db, "user_badges"), {
              userId,
              badgeId: badge.id,
              unlockedAt: new Date().toISOString()
            });
          } catch (e) {
            console.warn("Badge firestore save notice:", e);
          }
        }
        newlyUnlocked.push(badge);
      }
    }

    return newlyUnlocked;
  }
};
