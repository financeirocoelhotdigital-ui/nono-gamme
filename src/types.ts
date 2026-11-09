export type TransactionType = "income" | "expense" | "transfer";
export type Emotion = "feliz" | "neutro" | "triste" | "ansioso" | "irritado" | "empolgado" | "estressado" | "racional" | "culpado" | "inseguro" | "motivado" | "impulsivo";
export type AccountType = "banco" | "carteira" | "digital" | "investimento" | "corrente" | "poupanca" | "dinheiro" | "outro";
export type DebtStatus = "ativa" | "quitada" | "atrasada" | "em_dia" | "proxima_vencimento" | "vencida" | "em_negociacao" | "suspensa";
export type DebtPriority = "baixa" | "media" | "alta" | "urgente";
export type DebtUrgency = "baixa" | "moderada" | "alta" | "critica";
export type InstallmentStatus = "pendente" | "paga" | "atrasada";
export type DebtType = "parcelada" | "unica";
export type InterestType = "simples" | "composto";
export type GoalPriority = "baixa" | "media" | "alta";
export type AIMode = "consultor" | "psicologo" | "planejador" | "hibrido";
export type ReceivableStatus = "em_aberto" | "parcial" | "recebido" | "atrasado";
export type ReceivableType = "emprestimo" | "venda_fiado" | "adiantamento" | "outros";
export type ReceivableRisk = "baixo" | "medio" | "alto" | "critico";
export type CollectionPriority = "cobrar_agora" | "cobrar_em_breve" | "pode_aguardar";
export type ReliabilityLevel = "alta" | "media" | "baixa" | "critica";

export interface FinancialProfile {
  situation: string; // "clt" | "public" | "autonomous" | "business" | "mei" | "liberal" | "freelancer" | "retired" | "pensioner" | "student" | "unemployed" | "transition" | "other"
  mainIncome: number;
  otherIncome: number;
  hasReserve: boolean;
  reserveAmount?: number;
  dependentsCount: number;
  mainGoal: string;
  incomeStability: "baixa" | "media" | "alta";
  activityArea: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  onboardingCompleted?: boolean;
  onboardingData?: OnboardingData;
  settings?: UserSettings;
  financialScore?: number;
  financialProfile?: FinancialProfile;
}

export interface UserSettings {
  currency: string;
  language: string;
  aiMode: AIMode;
  notificationsEnabled: boolean;
  theme: "light" | "dark";
  favoriteModules: string[];
  pinEnabled?: boolean;
  biometricsEnabled?: boolean;
  autoBackupEnabled?: boolean;
  spendingAlertsEnabled?: boolean;
  goalAlertsEnabled?: boolean;
  aiEnabled?: boolean;
  aiSuggestionLevel?: "proactive" | "reactive";
  aiTone?: "formal" | "informal";
  dateFormat?: string;
  autoLockTime?: string;
  name?: string;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}

export interface OnboardingData {
  monthlyIncome: number;
  fixedExpenses: number;
  familyContext: "individual" | "casal_separado" | "casal_unido" | "familia";
  financialGoals: string[];
  riskTolerance: "conservador" | "moderado" | "arrojado";
  incomeType: "fixa" | "variavel";
  mainObjective: "organizar" | "dividas" | "poupar" | "investir";
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface SubCategory {
  id: string;
  userId: string;
  name: string;
  parentCategoryId: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  usageCount: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  title: string;
  description?: string;
  value: number;
  type: TransactionType;
  category: string;
  categoryId?: string;
  subCategory?: string;
  tags?: string[];
  date: string;
  recurrent?: boolean;
  frequency?: "mensal" | "semanal" | "anual";
  installment?: boolean;
  totalInstallments?: number;
  linkedDebtId?: string;
  linkedInstallmentId?: string;
  currentInstallment?: number;
  installmentGroupId?: string; // To link installments of the same purchase
  billingMonth?: number; // 0-11
  billingYear?: number;
  accountId?: string;
  toAccountId?: string;
  cardId?: string;
  invoiceId?: string; // Linked invoice
  notes?: string;
  emotion: Emotion;
  attachmentUrl?: string;
  location?: string;
  essential?: boolean;
  fixed?: boolean;
  incomeSource?: string;
  incomeType?: "fixa" | "variavel";
  establishment?: string;
  isImpulsive?: boolean;
  transferType?: "sent" | "received";
  transferGroupId?: string;
  createdAt: string;
  hasHistory?: boolean;
  reconciled?: boolean;
  isAdjustment?: boolean;
  fiscalType?: FiscalType;
  fiscalCategory?: FiscalCategory;
  fiscalYear?: number;
  items?: { name: string; value: number }[];
}

export interface TransactionHistory {
  id: string;
  userId: string;
  transactionId: string;
  action: "created" | "edited" | "deleted" | "restored";
  date: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
    description: string;
  }[];
  description: string;
  module: string; // e.g., "income", "expense", "transfer"
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  balance: number;
  initialBalance: number;
  type: AccountType;
  institution: string;
  color: string;
  icon?: string;
  isDefault: boolean;
  active: boolean;
  balanceThreshold?: number;
  createdAt: string;
  lastReconciliation?: string;
  notes?: string;
}

export interface Card {
  id: string;
  userId: string;
  name: string;
  brand: string;
  bank: string;
  limit: number;
  usedLimit: number;
  availableLimit: number;
  closingDay: number;
  dueDay: number;
  color?: string;
  active: boolean;
  createdAt: string;
}

export type InvoiceStatus = "open" | "closed" | "paid" | "partial" | "overdue";

export interface Invoice {
  id: string;
  userId: string;
  cardId: string;
  month: number; // 0-11
  year: number;
  totalValue: number;
  paidValue: number;
  status: InvoiceStatus;
  dueDate: string;
  closingDate: string;
  items?: string[]; // List of transaction IDs
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  priority: GoalPriority;
  imageUrl?: string;
  status: "active" | "completed" | "paused";
  createdAt: string;
  // New fields
  linkedAccountId?: string;
  autoContributionPercentage?: number;
  isDynamic?: boolean;
  inflationRate?: number;
  category?: "reserva" | "viagem" | "bem" | "educacao" | "outros";
  history?: GoalContribution[];
  notified50?: boolean;
  notified80?: boolean;
  notified100?: boolean;
  notifiedNearDeadline?: boolean;
  notifiedOverdue?: boolean;
}

export interface GoalContribution {
  id: string;
  value: number;
  date: string;
  type: "manual" | "auto" | "linked_account";
  description?: string;
  transactionId?: string;
}

export interface DebtHistory {
  id: string;
  userId: string;
  debtId: string;
  installmentId?: string;
  action: "created" | "paid" | "overdue" | "interest_accrued" | "penalty_applied" | "edited" | "deleted" | "renegotiated";
  value?: number;
  date: string;
  description: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  creditor: string;
  originalValue: number; // Valor original da dívida (principal)
  totalValue: number; // Valor total contratado (principal + juros iniciais)
  paidValue: number; // Total já pago
  remainingValue: number; // Saldo devedor atual (principal + juros acumulados - pago)
  currentValue: number; // Valor para quitação hoje (com descontos ou juros do dia)
  interestAccrued: number; // Juros acumulados até o momento
  totalPaidValue: number; // Total pago (incluindo taxas e juros)
  finalTotalCost: number; // Custo total estimado ao final do contrato
  prepaymentSavings: number; // Economia estimada se quitar hoje
  interestRate: number;
  interestType: InterestType;
  penaltyRate?: number; // % penalty for delay
  dailyInterestRate?: number; // % daily interest for delay
  startDate: string;
  dueDate: string;
  endDate?: string;
  type: DebtType;
  status: DebtStatus;
  priority: DebtPriority;
  priorityReason?: string;
  urgency: DebtUrgency;
  urgencyScore: number; // 0-100
  urgencyReason?: string;
  totalInstallments: number;
  paidInstallments: number;
  installmentValue: number;
  nextInstallmentDate?: string;
  createdAt: string;
  updatedAt?: string;
  // Estratégia recomendada
  recommendedStrategy?: "avalanche" | "bola_de_neve";
  strategyReason?: string;
  riskLevel?: "baixo" | "medio" | "alto" | "critico";
  riskReason?: string;
  category?: string;
  fees?: number;
  frequency?: "mensal" | "quinzenal" | "semanal" | "anual";
  accountId?: string;
  notes?: string;
  tags?: string[];
}

export interface Installment {
  id: string;
  userId: string;
  debtId: string;
  installmentNumber: number;
  value: number; // Valor total da parcela
  principalValue: number; // Parte do principal
  interestValue: number; // Parte dos juros
  penaltyValue?: number; // Valor da multa aplicada
  lateInterestValue?: number; // Juros de mora aplicados
  dueDate: string;
  status: InstallmentStatus;
  paymentDate?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt?: string;
}

export type FamilyMemberType = "usuario" | "dependente" | "parceiro" | "outro";
export type FamilyIncomeType = "salario" | "extra" | "passiva";

export interface FamilyIncome {
  id: string;
  userId: string;
  memberId: string;
  type: FamilyIncomeType;
  value: number;
  recurrent: boolean;
  receiveDate: string;
  description?: string;
  createdAt: string;
}

export interface FamilyGoal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  status: "ativa" | "concluida" | "pausada";
  memberContributions: {
    [memberId: string]: number; // Total contributed by this member
  };
  plannedMonthlyContributions: {
    [memberId: string]: {
      value: number;
      type: "fixed" | "percentage";
    };
  };
  createdAt: string;
}

export interface FamilyDistribution {
  expenses: number; // %
  lifestyle: number; // %
  goals: number; // %
  reserve: number; // %
}

export interface FamilyFinancialAnalysis {
  totalIncome: number;
  incomeByMember: {
    [memberId: string]: number;
  };
  contributionPercentageByMember: {
    [memberId: string]: number;
  };
  distribution: FamilyDistribution;
  goalsProgress: number;
  aiSuggestions?: string;
  balanceAnalysis?: string;
  alerts: {
    type: "info" | "warning" | "danger";
    message: string;
  }[];
}

export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  type: FamilyMemberType;
  income: number;
  monthlyExpenses: number;
  contributionPercentage: number;
  dependencyOf?: string; // ID do membro de quem depende
  createdAt: string;
  updatedAt?: string;
}

export interface DependencyAnalysis {
  totalDependents: number;
  totalDependentCost: number;
  dependencyIndex: number; // (total gastos dependentes / renda total do usuário)
  riskLevel: "saudavel" | "atencao" | "risco_alto";
  userOverload: boolean;
  aiInsights?: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  plannedValue: number;
  month: number; // 0-11
  year: number;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  value: number;
  billingCycle: "mensal" | "anual";
  category: string;
  nextBilling: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type WealthAssetType = "terreno" | "imovel" | "veiculo" | "item" | "outro";

export type WealthEvolutionType = "transformacao" | "investimento" | "valorizacao" | "desvalorizacao" | "renomear" | "ajuste" | "venda" | "reforma" | "construcao";

export type ConstructionStatus = "em_andamento" | "concluida";
export type ConstructionStepStatus = "pendente" | "em_andamento" | "concluido";

export interface Construction {
  id: string;
  userId: string;
  wealthItemId: string;
  name: string;
  status: ConstructionStatus;
  progress: number; // 0-100
  totalInvested: number;
  targetValue?: number;
  plannedSteps?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConstructionStep {
  id: string;
  userId: string;
  constructionId: string;
  name: string;
  value: number;
  status: ConstructionStepStatus;
  date: string;
  createdAt: string;
}

export interface WealthSnapshot {
  name: string;
  type: WealthAssetType;
  value: number;
}

export interface WealthEvolution {
  id: string;
  wealthItemId: string;
  userId: string;
  type: WealthEvolutionType;
  value: number;
  description: string;
  date: string;
  // Fields for specific types
  oldType?: WealthAssetType;
  newType?: WealthAssetType;
  oldName?: string;
  newName?: string;
  addToAssetValue?: boolean; // For investments
  accountId?: string; // If linked to a transaction
  beforeState?: WealthSnapshot;
  afterState?: WealthSnapshot;
  tags?: string[];
  createdAt: string;
}

export interface WealthItem {
  id: string;
  userId: string;
  name: string;
  type: WealthAssetType;
  value: number; // Valor Atual
  purchaseValue: number; // Valor de Compra (Investimento Inicial)
  totalInvested: number; // purchaseValue + sum of investedValue in history (where addToAssetValue is true)
  purchaseDate: string; // Data de Compra
  category: string;
  imageUrl?: string;
  description?: string;
  observations?: string;
  lastUpdate: string;
  totalAppreciation: number;
  percentageAppreciation: number;
  status: "ativo" | "vendido";
  saleValue?: number;
  saleDate?: string;
  profit?: number;
  profitPercentage?: number;
  destinationAccountId?: string;
  createdAt: string;
}

export type InvestmentType = "cdb" | "poupanca" | "acoes" | "cripto" | "fundo" | "tesouro" | "lci" | "lca" | "bitcoin" | "ethereum" | "tether" | "bnb" | "solana" | "xrp" | "usdc" | "cardano" | "avalanche" | "dogecoin" | "outro";

export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: InvestmentType;
  investedValue: number;
  monthlyYield: number; // %
  annualYield: number; // %
  startDate: string;
  currentYield: number; // Valor absoluto acumulado
  currentValue: number; // investedValue + currentYield
  status: "active" | "redeemed";
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentContribution {
  id: string;
  userId: string;
  investmentId: string;
  value: number;
  date: string;
  type: "aporte" | "rendimento" | "resgate";
  createdAt: string;
}

export interface AIInsight {
  id: string;
  userId: string;
  type: "alerta" | "sugestao" | "elogio";
  title: string;
  content: string;
  date: string;
  read: boolean;
}

export type InsightPriority = "urgente" | "importante" | "informativo";
export type InsightType = "alerta" | "sugestao" | "padrao" | "oportunidade";
export type InsightStatus = "ativo" | "arquivado" | "executado";

export interface StrategicInsight {
  id: string;
  userId: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  explanation: string;
  solution: string;
  impact: string;
  category: string;
  value?: number;
  status: InsightStatus;
  actionGenerated?: boolean;
  actionId?: string;
  patternDetected?: string;
  date: string;
  createdAt: string;
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  date: string;
  type: string;
  size: string;
  createdAt: string;
}

export interface Debtor {
  id: string;
  userId: string;
  name: string;
  photoURL?: string;
  phone?: string;
  totalLent: number;
  totalReceived: number;
  delayRate: number;
  reliability: ReliabilityLevel;
  recommendedLimit: number;
  lastLoanDate?: string;
  createdAt: string;
}

export interface Receivable {
  id: string;
  userId: string;
  debtorId?: string;
  personName: string;
  totalValue: number;
  receivedValue: number;
  remainingValue: number;
  loanDate: string;
  dueDate: string;
  type: ReceivableType;
  notes?: string;
  status: ReceivableStatus;
  risk: ReceivableRisk;
  riskReason?: string;
  probabilityOfReceiving?: number;
  estimatedReceiptDate?: string;
  probableDelayDays?: number;
  aiAnalysis?: string;
  priority: CollectionPriority;
  history: ReceivablePayment[];
  createdAt: string;
}

export interface ReceivablePayment {
  id: string;
  value: number;
  date: string;
  notes?: string;
}

export type FinancialEventStatus = "pendente" | "pago" | "atrasado";
export type FinancialEventOrigin = "conta" | "divida" | "cartao" | "meta" | "recebivel" | "assinatura" | "manual" | "transacao" | "lembrete" | "evento";

export interface FinancialEvent {
  id: string;
  userId: string;
  type: "entrada" | "saida";
  category: string;
  value: number;
  date: string;
  recurrent: boolean;
  frequency?: "mensal" | "semanal" | "anual";
  origin: FinancialEventOrigin;
  originId?: string;
  status: FinancialEventStatus;
  description: string;
  createdAt: string;
}

export interface CalendarDaySummary {
  date: string;
  totalIn: number;
  totalOut: number;
  balance: number;
  events: FinancialEvent[];
  hasConflict: boolean;
  conflictReason?: string;
}

export interface CalendarAnalysis {
  aiSuggestions: string;
  forecast: {
    date: string;
    expectedBalance: number;
  }[];
  alerts: {
    type: "info" | "warning" | "danger";
    message: string;
    date: string;
  }[];
}

export interface FutureEvent {
  id: string;
  userId: string;
  type: "income" | "expense";
  value: number;
  date: string;
  description: string;
  origin: "transaction" | "card" | "debt" | "receivable" | "subscription" | "simulation" | "goal";
  recurrent?: boolean;
  frequency?: "mensal" | "semanal" | "anual";
  isSimulated?: boolean;
  status: "pending" | "confirmed";
}

export interface CashFlowPoint {
  date: string;
  balance: number;
  income: number;
  expense: number;
  events: FutureEvent[];
}

export type LifePlanProfile = "conservador" | "moderado" | "agressivo";
export type LifePlanScenario = "otimista" | "realista" | "pessimista";

export interface LifePlan {
  id: string;
  userId: string;
  name: string;
  horizonYears: number; // 5, 10, 20
  currentIncome: number;
  currentExpenses: number;
  currentWealth: number;
  linkedGoalIds: string[];
  profile: LifePlanProfile;
  createdAt: string;
  updatedAt: string;
}

export interface LifePlanEvent {
  id: string;
  year: number;
  month: number;
  type: "meta" | "conquista" | "evento";
  title: string;
  description?: string;
  value?: number;
  impact?: number;
}

export interface LifePlanSimulation {
  id: string;
  name: string;
  type: "compra" | "renda" | "estilo_vida";
  value: number;
  date: string;
  description?: string;
}

export interface LifePlanProjectionPoint {
  year: number;
  wealth: number;
  income: number;
  expenses: number;
  goalsProgress: number;
}

export interface LifePlanHistory {
  id: string;
  userId: string;
  date: string;
  action: string;
  description: string;
}

export interface ReconciliationHistory {
  id: string;
  userId: string;
  accountId: string;
  date: string;
  calculatedBalance: number;
  storedBalance: number;
  difference: number;
  adjustmentTransactionId?: string;
  notes?: string;
  status: "success" | "divergence" | "adjusted";
  periodStart?: string;
  periodEnd?: string;
}

export type ActionPriority = "urgente" | "importante" | "opcional";
export type ActionStatus = "pendente" | "concluido" | "ignorado";
export type FiscalType = "tributavel" | "isento" | "nao_tributavel" | "dedutivel";
export type FiscalCategory = "salario" | "renda_extra" | "aluguel" | "investimentos" | "despesas_medicas" | "educacao" | "pensao" | "outros";

export type ReminderType = "financeiro" | "pessoal" | "meta" | "divida" | "conta";
export type ReminderPriority = "baixa" | "media" | "alta";
export type ReminderStatus = "ativo" | "concluido" | "cancelado";
export type ReminderFrequency = "diario" | "semanal" | "mensal";

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: ReminderType;
  date: string;
  time?: string;
  recurrent: boolean;
  frequency?: ReminderFrequency;
  priority: ReminderPriority;
  status: ReminderStatus;
  createdAt: string;
  updatedAt?: string;
  actionData?: {
    transactionType?: TransactionType;
    category?: string;
    value?: number;
    accountId?: string;
  };
}

export type UserEventType = "entrada" | "saida" | "compromisso";
export type UserEventStatus = "pendente" | "concluido" | "atrasado";

export interface UserEvent {
  id: string;
  userId: string;
  name: string;
  type: UserEventType;
  value?: number;
  dateInicio: string;
  dateFim?: string;
  origin: FinancialEventOrigin;
  originId?: string;
  status: UserEventStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ActionItem {
  id: string;
  userId: string;
  planId: string;
  title: string;
  description: string;
  why: string;
  suggestedValue?: number;
  deadline?: string;
  impact: string;
  priority: ActionPriority;
  status: ActionStatus;
  type: "corte_gastos" | "pagamento_divida" | "reserva" | "investimento" | "meta" | "outro";
  executable: boolean;
  executionData?: {
    transactionType?: TransactionType;
    category?: string;
    accountId?: string;
    value?: number;
  };
  createdAt: string;
  completedAt?: string;
}

export interface ActionPlan {
  id: string;
  userId: string;
  date: string;
  summary: string;
  status: "ativo" | "arquivado";
  createdAt: string;
}

export type UserLevel = "iniciante" | "intermediario" | "avancado" | "expert";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "gastos" | "dividas" | "investimentos" | "planejamento" | "organizacao";
  condition: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  unlockedAt: string;
}

export interface FinancialDiagnosis {
  id: string;
  userId: string;
  score: number;
  level: UserLevel;
  date: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendations: string[];
  aiAnalysis?: string;
  createdAt: string;
  history?: { date: string; score: number }[];
}

export interface PiggyBank {
  id: string;
  userId: string;
  name: string;
  targetValue: number;
  currentValue: number;
  icon: string;
  color: string;
  status: "active" | "completed";
  autoSave: boolean;
  autoSaveType?: "fixed" | "surplus";
  autoSaveValue?: number;
  createdAt: string;
  updatedAt: string;
  history: PiggyBankHistory[];
}

export interface PiggyBankHistory {
  id: string;
  type: "in" | "out";
  value: number;
  date: string;
  description?: string;
  accountId?: string;
}

export interface ScoreHistory {
  id: string;
  userId: string;
  score: number;
  date: string;
  reason?: string;
}

export interface AdminCliente {
  uid: string;
  id?: string;
  nome: string;
  email: string;
  senha?: string;
  ativo: boolean;
  createdAt: string;
  observacoes?: string;
  telefone?: string;
  plano?: "mensal" | "anual" | "vitalicio" | "trial" | "custom" | string;
  vencimento?: string;
  ultimoAcesso?: string;
}

export interface AdminAnnouncement {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: "info" | "alerta" | "sucesso" | "novidade";
  ativo: boolean;
  createdAt: string;
  exibirAte?: string;
}

export interface AdminSystemSettings {
  modoManutencao: boolean;
  mensagemManutencao?: string;
  mensagemBoasVindasWhatsApp?: string;
  suporteWhatsApp?: string;
  suporteEmail?: string;
  permitirCadastros?: boolean;
}

