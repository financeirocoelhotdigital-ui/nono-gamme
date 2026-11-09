import { Transaction, Debt, UserProfile, FamilyMember, Account } from "../types";

export function calculateFinancialProtection(
  accounts: Account[] = [],
  transactions: Transaction[] = [],
  debts: Debt[] = [],
  userProfile: UserProfile | null = null,
  family: FamilyMember[] = []
) {
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeDebts = Array.isArray(debts) ? debts : [];
  const safeFamily = Array.isArray(family) ? family : [];

  // 1. Reserva Atual (Contas de Investimento, Poupança, Digital/Caixinhas ou identificadas como Reserva)
  const reserveAccounts = safeAccounts.filter(acc => {
    if (!acc) return false;
    const isExplicitReserve = /reserva|emerg[eê]ncia|poupan[cç]a|cdb|selic|caixinha/i.test(acc.name || "") ||
                             /reserva|emerg[eê]ncia/i.test(acc.notes || "");
    const isReserveType = acc.type === "investimento" || acc.type === "poupanca" || acc.type === "digital";
    return isExplicitReserve || isReserveType;
  });

  let currentReserve = reserveAccounts.reduce((acc, curr) => acc + (curr?.balance || 0), 0);

  // Se não houver saldo em contas específicas mas o perfil possuir reserva informada
  if (currentReserve <= 0 && userProfile?.financialProfile?.reserveAmount) {
    currentReserve = userProfile.financialProfile.reserveAmount;
  }

  // 2. Custo de Vida Mensal (Média 30 dias ou onboarding)
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  const expenses = safeTransactions
    .filter(t => t && t.type === "expense" && t.date && new Date(t.date) >= last30Days)
    .reduce((acc, curr) => acc + (curr?.value || 0), 0);
  
  const monthlyExpenses = expenses || userProfile?.onboardingData?.fixedExpenses || 0;

  // 3. Meses Ideais baseados em risco
  let idealMonths = 6;
  const incomeType = userProfile?.onboardingData?.incomeType || "fixa";
  const riskTolerance = userProfile?.onboardingData?.riskTolerance || "moderado";
  const hasDependents = safeFamily.length > 0;
  const monthlyIncome = userProfile?.onboardingData?.monthlyIncome || 0;
  const hasHighDebts = monthlyIncome > 0 && safeDebts.some(d => (d?.remainingValue || 0) > monthlyIncome * 2);

  if (incomeType === "variavel") idealMonths = 12;
  else if (incomeType === "fixa" && riskTolerance === "conservador") idealMonths = 6;
  else if (incomeType === "fixa" && riskTolerance === "arrojado") idealMonths = 3;

  if (hasDependents) idealMonths += 2;
  if (hasHighDebts) idealMonths += 2;
  idealMonths = Math.min(idealMonths, 12);

  const targetValue = monthlyExpenses * idealMonths;
  const monthsCovered = monthlyExpenses > 0 ? (currentReserve / monthlyExpenses) : 0;

  // 4. Score (0-100)
  let score = 0;
  score += Math.min((monthsCovered / (idealMonths || 1)) * 50, 50);
  
  const totalDebt = safeDebts.reduce((acc, curr) => acc + (curr?.remainingValue || 0), 0);
  const income = monthlyIncome;
  const debtRatio = income > 0 ? totalDebt / income : 0;
  if (debtRatio < 0.5) score += 30;
  else if (debtRatio < 1) score += 20;
  else if (debtRatio < 2) score += 10;
  
  if (userProfile?.onboardingData?.incomeType === "fixa") score += 20;
  else score += 10;

  return {
    currentReserve,
    monthlyExpenses,
    idealMonths,
    targetValue,
    monthsCovered,
    securityScore: Math.round(score),
    daysSurvival: monthsCovered * 30
  };
}

export function calculateAccountBalance(account: Account, transactions: Transaction[]) {
  const accountTransactions = transactions.filter(
    (t) => t.accountId === account.id || t.toAccountId === account.id
  );

  const calculatedBalance = accountTransactions.reduce((acc, t) => {
    if (t.type === "income") {
      return acc + t.value;
    } else if (t.type === "expense") {
      return acc - t.value;
    } else if (t.type === "transfer") {
      if (t.accountId === account.id) {
        return acc - t.value; // Sent transfer
      } else if (t.toAccountId === account.id) {
        return acc + t.value; // Received transfer
      }
    }
    return acc;
  }, account.initialBalance || 0);

  return calculatedBalance;
}
