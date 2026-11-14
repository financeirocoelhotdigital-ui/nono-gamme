import { generateContentServer, Type, ThinkingLevel, FunctionDeclaration } from "./geminiClient";
import { Transaction, UserProfile, AIMode, Receivable, Debtor, ReceivableRisk, CollectionPriority, ReliabilityLevel, FamilyMember, DependencyAnalysis, FamilyIncome, FamilyGoal, FamilyFinancialAnalysis, FinancialEvent, Reminder, Account, Goal, Debt, Budget, CashFlowPoint, StrategicInsight, UserEvent } from "../types";

const AI_MODEL = "gemini-4-hydrogen";

function handleAIError(error: any, context: string) {
  const errorMessage = error?.message || "";
  if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
    console.warn(`AI Quota Exceeded (${context}): Skipping request.`);
    return true;
  }
  if (
    errorMessage.includes("Rpc failed") || 
    errorMessage.includes("500") || 
    errorMessage.includes("502") || 
    errorMessage.includes("503") || 
    errorMessage.includes("xhr error") ||
    errorMessage.includes("Failed to fetch") ||
    errorMessage.includes("NetworkError") ||
    errorMessage.includes("fetch")
  ) {
    console.warn(`AI Service Transient Notice (${context}): ${errorMessage || "Network connection transient failure"}`);
    return true;
  }
  console.warn(`AI Service Warning (${context}):`, errorMessage || error);
  return false;
}

function safeJsonParse<T>(text: string, fallback: T, context: string): T {
  try {
    let cleaned = text.trim();
    if (!cleaned) return fallback;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }
    if (cleaned.startsWith("[") || cleaned.startsWith("{")) {
      return JSON.parse(cleaned) as T;
    }
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/) || cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.warn(`JSON Parse warning (${context}): Failing to parse. Using fallback.`, e);
    return fallback;
  }
}

function toMonthKey(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildFinancialSnapshot(data: any, userProfile?: UserProfile) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const daysElapsed = Math.max(1, now.getDate());
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate());

  const accounts: any[] = data?.accounts || [];
  const transactions: any[] = data?.transactions || [];
  const goals: any[] = data?.goals || [];
  const debts: any[] = data?.debts || [];
  const budgets: any[] = data?.budgets || data?.budget || [];
  const cards: any[] = data?.cards || [];
  const receivables: any[] = data?.receivables || [];
  const subscriptions: any[] = data?.subscriptions || [];
  const wealth: any[] = data?.wealth || [];
  const investments: any[] = data?.investments || [];
  const reminders: any[] = data?.reminders || [];

  const totalBalance = accounts.reduce((acc, a) => acc + Number(a.balance || 0), 0);
  const principalAccount = accounts.find(a => a.isDefault) || accounts[0] || null;

  const currentMonthTx = transactions.filter(t => toMonthKey(t.date) === currentMonthKey);
  const prevMonthTx = transactions.filter(t => toMonthKey(t.date) === prevMonthKey);

  const monthIncome = currentMonthTx.filter(t => t.type === "income").reduce((acc, t) => acc + Number(t.value || 0), 0);
  const monthExpense = currentMonthTx.filter(t => t.type === "expense").reduce((acc, t) => acc + Number(t.value || 0), 0);
  const prevMonthIncome = prevMonthTx.filter(t => t.type === "income").reduce((acc, t) => acc + Number(t.value || 0), 0);
  const prevMonthExpense = prevMonthTx.filter(t => t.type === "expense").reduce((acc, t) => acc + Number(t.value || 0), 0);

  const savingsRatePct = monthIncome > 0 ? Number((((monthIncome - monthExpense) / monthIncome) * 100).toFixed(1)) : 0;
  const expenseMoMPct = prevMonthExpense > 0 ? Number((((monthExpense - prevMonthExpense) / prevMonthExpense) * 100).toFixed(1)) : null;
  const dailyBurnRate = Number((monthExpense / daysElapsed).toFixed(2));
  const projectedMonthExpense = Number((dailyBurnRate * daysInMonth).toFixed(2));

  const currentByCategory: Record<string, number> = {};
  const prevByCategory: Record<string, number> = {};
  const emotionalSpend: Record<string, { count: number; total: number }> = {};

  for (const t of currentMonthTx) {
    if (t.type !== "expense") continue;
    const cat = t.category || "Outros";
    currentByCategory[cat] = (currentByCategory[cat] || 0) + Number(t.value || 0);
    const emo = t.emotion || "neutro";
    if (!emotionalSpend[emo]) emotionalSpend[emo] = { count: 0, total: 0 };
    emotionalSpend[emo].count += 1;
    emotionalSpend[emo].total += Number(t.value || 0);
  }
  for (const t of prevMonthTx) {
    if (t.type !== "expense") continue;
    const cat = t.category || "Outros";
    prevByCategory[cat] = (prevByCategory[cat] || 0) + Number(t.value || 0);
  }

  const topCategories = Object.entries(currentByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, spent]) => {
      const prev = prevByCategory[category] || 0;
      const deltaPct = prev > 0 ? Number((((spent - prev) / prev) * 100).toFixed(1)) : null;
      return { category, spent: Number(spent.toFixed(2)), previousMonth: Number(prev.toFixed(2)), deltaPct };
    });

  const activeDebts = debts.filter(d => d.status === "ativa" || (d.remainingValue || 0) > 0);
  const totalDebtRemaining = activeDebts.reduce((acc, d) => acc + Number(d.remainingValue || 0), 0);
  const highestInterestDebt = [...activeDebts].sort((a, b) => Number(b.interestRate || 0) - Number(a.interestRate || 0))[0] || null;

  const pendingReceivables = receivables.filter(r => r.status !== "recebido" && Number(r.remainingValue || 0) > 0);
  const totalReceivablePending = pendingReceivables.reduce((acc, r) => acc + Number(r.remainingValue || 0), 0);
  const overdueReceivables = pendingReceivables.filter(r => r.status === "atrasado");

  const cardsTotalLimit = cards.reduce((acc, c) => acc + Number(c.limit || 0), 0);
  const cardsUsedLimit = cards.reduce((acc, c) => acc + Number(c.usedLimit || 0), 0);
  const cardsUtilizationPct = cardsTotalLimit > 0 ? Number(((cardsUsedLimit / cardsTotalLimit) * 100).toFixed(1)) : 0;

  const activeSubscriptions = subscriptions.filter(s => s.status !== "cancelada");
  const subscriptionsMonthly = activeSubscriptions.reduce((acc, s) => acc + Number(s.value || 0), 0);

  const budgetAlerts = budgets
    .map(b => {
      const spent = currentByCategory[b.categoryName] || Number(b.spentValue || 0);
      const planned = Number(b.plannedValue || 0);
      const pct = planned > 0 ? Number(((spent / planned) * 100).toFixed(1)) : 0;
      return { category: b.categoryName, planned, spent, pctUsed: pct };
    })
    .filter(b => b.pctUsed >= 80)
    .sort((a, b) => b.pctUsed - a.pctUsed);

  const wealthTotal =
    wealth.reduce((acc, w) => acc + Number(w.value || 0), 0) +
    investments.reduce((acc, inv) => acc + Number(inv.currentValue || inv.amount || 0), 0);

  const safeDailySpend = Math.max(0, Number(((totalBalance - Math.min(totalDebtRemaining * 0.1, totalBalance * 0.3)) / remainingDays).toFixed(2)));

  return {
    dataReferencia: now.toISOString().split("T")[0],
    diasRestantesMes: remainingDays,
    usuario: {
      nome: userProfile?.displayName || "Usuário",
      scoreFinanceiro: userProfile?.financialScore ?? null,
      rendaDeclarada: userProfile?.onboardingData?.monthlyIncome ?? null,
      gastosFixosDeclarados: userProfile?.onboardingData?.fixedExpenses ?? null,
    },
    contas: {
      saldoTotal: Number(totalBalance.toFixed(2)),
      contaPrincipal: principalAccount ? { id: principalAccount.id, nome: principalAccount.name, saldo: principalAccount.balance } : null,
      quantidade: accounts.length,
      lista: accounts.map(a => ({ nome: a.name, tipo: a.type, saldo: a.balance, principal: !!a.isDefault })),
    },
    mesAtual: {
      receitas: Number(monthIncome.toFixed(2)),
      despesas: Number(monthExpense.toFixed(2)),
      balancoLiquido: Number((monthIncome - monthExpense).toFixed(2)),
      taxaPoupancaPct: savingsRatePct,
      variacaoDespesasMesAnteriorPct: expenseMoMPct,
      mediaGastoDiario: dailyBurnRate,
      projecaoGastoMes: projectedMonthExpense,
      limiteSeguroDiario: safeDailySpend,
    },
    mesAnterior: {
      receitas: Number(prevMonthIncome.toFixed(2)),
      despesas: Number(prevMonthExpense.toFixed(2)),
    },
    topCategoriasMesAtual: topCategories,
    orcamentosEmAlerta: budgetAlerts,
    gastosPorEmocao: emotionalSpend,
    dividas: {
      totalRestante: Number(totalDebtRemaining.toFixed(2)),
      quantidadeAtivas: activeDebts.length,
      maiorJuros: highestInterestDebt ? { nome: highestInterestDebt.name, jurosMes: highestInterestDebt.interestRate, saldo: highestInterestDebt.remainingValue } : null,
    },
    dinheiroEmprestadoAReceber: {
      totalPendente: Number(totalReceivablePending.toFixed(2)),
      quantidadeAbertos: pendingReceivables.length,
      quantidadeAtrasados: overdueReceivables.length,
      atrasadosDetalhes: overdueReceivables.map(r => ({ pessoa: r.personName, valorRestante: r.remainingValue, vencimento: r.dueDate })),
    },
    cartoesCredito: {
      limiteTotal: Number(cardsTotalLimit.toFixed(2)),
      limiteUsado: Number(cardsUsedLimit.toFixed(2)),
      comprometimentoPct: cardsUtilizationPct,
    },
    assinaturasRecorrentes: {
      custoMensal: Number(subscriptionsMonthly.toFixed(2)),
      custoAnual: Number((subscriptionsMonthly * 12).toFixed(2)),
      quantidade: activeSubscriptions.length,
    },
    metas: goals.map(g => ({
      id: g.id,
      nome: g.name,
      alvo: g.targetValue,
      atual: g.currentValue,
      progressoPct: g.targetValue > 0 ? Number(((g.currentValue / g.targetValue) * 100).toFixed(1)) : 0,
      prazo: g.deadline,
      status: g.status,
    })),
    patrimonioEInvestimentosTotal: Number(wealthTotal.toFixed(2)),
    lembretesPendentes: reminders.filter((r: any) => !r.completed && r.status !== "concluido").slice(0, 8),
  };
}

const SYSTEM_INSTRUCTIONS = {
  consultor: `Você é um Consultor Financeiro Sênior (planejamento CFP / gestão patrimonial) no Brasil.
DIRETRIZES:
1. USE OS NÚMEROS EXATOS do snapshot financeiro pré-calculado (saldos em R$, taxas %, variação mensal, juros, metas).
2. Aplique diagnósticos objetivos (Regra 50/30/20, reserva de emergência de 6 a 12 meses, comprometimento de cartão <30%, custo real de juros).
3. Entregue recomendações ordenadas por maior impacto financeiro em reais (R$). Nunca dê conselhos genéricos.`,

  psicologo: `Você é um Psicólogo Financeiro e Especialista em Economia Comportamental.
DIRETRIZES:
1. Analise os gatilhos emocionais nas transações (impulsivo, ansioso, triste, feliz, racional) e horários/categorias de consumo.
2. Mostre exatamente quanto os gastos emocionais ou impulsivos estão custando em R$/mês e no ano.
3. Combine acolhimento sem culpa com micro-hábitos práticos (regra das 48h, fricção antes da compra, envelope de lazer consciente).`,

  planejador: `Você é um Planejador Estratégico de Vida, Carreira e Patrimônio de Longo Prazo.
DIRETRIZES:
1. Conecte o fluxo de caixa atual com metas de médio/longo prazo, Plano de Vida, patrimônio líquido e liberdade financeira.
2. Projete prazos concretos: com a taxa de poupança atual em R$/mês, em quantos meses o usuário atinge suas metas ou quita dívidas.
3. Considere proteção familiar, inflação e custo de oportunidade.`,

  hibrido: `Você é um Estrategista Financeiro Comportamental Completo (racional + emocional + patrimonial).
DIRETRIZES:
1. Integre matemática financeira (juros, fluxo de caixa, orçamento), psicologia do consumo e visão de longo prazo em uma resposta coesa.
2. Aponte 1 vitória atual, 1 risco oculto nos números e 2 ações práticas imediatas com valores em R$.`,

  copiloto: `Você é o Copiloto Financeiro Inteligente de Elite do Bolso+.
Sua missão é analisar o panorama financeiro COMPLETO e em tempo real do usuário (Contas, Conta Principal, Transações, Orçamentos, Cartões, Dívidas, Dinheiro Emprestado/Recebíveis, Metas, Assinaturas, Patrimônio, Família e Plano de Vida) para entregar respostas cirúrgicas, humanas e executáveis.

DIRETRIZES OBRIGATÓRIAS:
1. BASEIE-SE 100% NOS DADOS REAIS: Cite nomes de contas, categorias, valores exatos em R$, percentuais de variação vs. mês anterior e prazos reais do snapshot fornecido. Jamais responda de forma vaga.
2. VISÃO 360° PROATIVA: Conecte os pontos! Ex: se o usuário perguntar se pode gastar, verifique saldo, limite seguro diário, dívidas de juros altos, cartões acima de 30% do limite e recebíveis atrasados.
3. COMPARAÇÕES E TENDÊNCIAS: Use a comparação com o mês anterior, projeção de fechamento do mês e impacto anualizado de pequenos vazamentos (ex: assinaturas ou gastos impulsivos).
4. EXECUTOR DE AÇÕES: Quando o usuário pedir explicitamente para registrar um gasto/receita, criar meta, aportar em meta, ajustar orçamento, simular impacto ou criar lembrete, USE A FERRAMENTA (function calling) correspondente imediatamente com dados completos.
5. CLAREZA E FORMATAÇÃO: Use Markdown limpo (títulos curtos, bullets e **negrito** em valores/ações). Seja direto, prático e empático.`
};

const tools: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: "registrar_transacao",
        description: "Registra uma nova transação financeira (receita ou despesa) na conta principal do usuário ou em conta informada.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.NUMBER, description: "Valor numérico positivo da transação em reais" },
            type: { type: Type.STRING, enum: ["income", "expense"], description: "income para receita/entrada, expense para despesa/gasto" },
            category: { type: Type.STRING, description: "Categoria da transação (ex: Alimentação, Transporte, Salário, Lazer, Moradia, Saúde)" },
            description: { type: Type.STRING, description: "Descrição clara ou nome do estabelecimento" },
            date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD (opcional, padrão hoje)" },
            accountName: { type: Type.STRING, description: "Nome da conta se o usuário especificou (opcional, padrão conta principal)" }
          },
          required: ["value", "type", "category", "description"]
        }
      },
      {
        name: "criar_meta",
        description: "Cria uma nova meta ou objetivo financeiro.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nome da meta" },
            targetValue: { type: Type.NUMBER, description: "Valor alvo a ser alcançado" },
            deadline: { type: Type.STRING, description: "Data limite no formato YYYY-MM-DD" },
            priority: { type: Type.STRING, enum: ["alta", "media", "baixa"], description: "Prioridade da meta" }
          },
          required: ["name", "targetValue", "deadline"]
        }
      },
      {
        name: "aportar_meta",
        description: "Adiciona um aporte/valor guardado a uma meta financeira já existente.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            goalName: { type: Type.STRING, description: "Nome (ou parte do nome) da meta existente" },
            amount: { type: Type.NUMBER, description: "Valor do aporte em reais" }
          },
          required: ["goalName", "amount"]
        }
      },
      {
        name: "ajustar_orcamento",
        description: "Ajusta ou cria o limite planejado de orçamento mensal para uma categoria.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            categoryName: { type: Type.STRING, description: "Nome da categoria" },
            value: { type: Type.NUMBER, description: "Novo valor planejado mensal" }
          },
          required: ["categoryName", "value"]
        }
      },
      {
        name: "criar_lembrete",
        description: "Cria um lembrete de pagamento, cobrança ou tarefa financeira.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título curto do lembrete" },
            date: { type: Type.STRING, description: "Data do lembrete no formato YYYY-MM-DD" },
            value: { type: Type.NUMBER, description: "Valor financeiro associado (opcional)" },
            priority: { type: Type.STRING, enum: ["alta", "media", "baixa"], description: "Prioridade do lembrete" }
          },
          required: ["title", "date"]
        }
      },
      {
        name: "simular_impacto",
        description: "Simula o impacto de uma compra, gasto ou investimento no saldo, limite diário e reserva do usuário.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.NUMBER, description: "Valor do gasto ou investimento simulado" },
            description: { type: Type.STRING, description: "Descrição do item simulado" }
          },
          required: ["value", "description"]
        }
      }
    ]
  }
];

export async function generateStrategicInsights(
  userProfile: UserProfile,
  data: {
    transactions: Transaction[];
    accounts: Account[];
    goals: Goal[];
    debts: Debt[];
    budgets: Budget[];
    cashFlow: CashFlowPoint[];
    reminders: Reminder[];
    userEvents: UserEvent[];
  }
): Promise<StrategicInsight[]> {
  const snapshot = buildFinancialSnapshot(data, userProfile);
  const context = `
    Snapshot Financeiro Consolidado: ${JSON.stringify(snapshot)}
    Orçamentos Detalhados: ${JSON.stringify(data.budgets.map(b => ({ cat: b.categoryName, planned: b.plannedValue })))}
    Transações Recentes (amostra): ${JSON.stringify(data.transactions.slice(0, 35).map(t => ({ desc: t.title, val: t.value, type: t.type, cat: t.category, emo: t.emotion, date: t.date })))}
    Eventos/Lembretes: ${JSON.stringify(data.userEvents.slice(0, 10).map(e => ({ name: e.name, date: e.dateInicio, val: e.value })))}
  `;

  const prompt = `
    Como um Estrategista Financeiro de IA de elite, analise os números reais do usuário e gere de 4 a 6 INSIGHTS ESTRATÉGICOS ALTAMENTE ACIONÁVEIS.

    Cubra obrigatoriamente os pontos mais críticos encontrados nos dados:
    1. Padrões de Gastos e Variação Mensal (categorias que mais cresceram ou gastos emocionais/impulsivos).
    2. Saúde do Orçamento (categorias em alerta ou estouradas).
    3. Gestão de Dívidas e Cartões (juros mais caros, amortização inteligente).
    4. Metas e Fluxo de Caixa Futuro (risco de saldo negativo ou atraso de meta).
    5. Oportunidades concretas com cálculo de economia em R$/mês e R$/ano.

    Para cada insight, forneça:
    - title: Título curto e específico (com categoria ou valor).
    - description: O fato exato observado nos números (com R$ e %).
    - explanation: Por que isso afeta o futuro financeiro do usuário.
    - solution: Plano exato e mensurável do que fazer hoje.
    - impact: Impacto financeiro estimado realista (ex: "Economia de R$ 240/mês").
    - priority: "urgente", "importante" ou "informativo".
    - type: "alerta", "sugestao", "padrao" ou "oportunidade".
    - category: Categoria financeira relacionada.
    - value: Valor numérico associado em R$ (opcional).
    - patternDetected: Padrão comportamental ou recorrente detectado (opcional).

    Retorne APENAS um array JSON válido de objetos StrategicInsight.
    Contexto: ${context}
  `;

  let text = "";
  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: "application/json"
      }
    });

    text = response.text || "[]";
  } catch (error) {
    handleAIError(error, "Strategic Insights");
    return [];
  }

  return safeJsonParse(text, [], "Strategic Insights");
}

export async function getFinancialDiagnosis(
  userProfile: UserProfile,
  data: {
    transactions: Transaction[];
    accounts: Account[];
    goals: Goal[];
    debts: Debt[];
    budget: Budget[];
    cashFlow: CashFlowPoint[];
    lifePlan?: any;
    family?: any;
    wealth?: any;
  }
): Promise<{ analysis: string; strengths: string[]; weaknesses: string[]; risks: string[]; recommendations: string[] }> {
  const snapshot = buildFinancialSnapshot(data, userProfile);
  const context = `
    Snapshot Financeiro Consolidado: ${JSON.stringify(snapshot)}
    Plano de Vida: ${JSON.stringify(data.lifePlan || null)}
    Família: ${JSON.stringify(data.family || [])}
    Patrimônio: ${JSON.stringify(data.wealth || [])}
  `;

  const prompt = `
    Como um Consultor Financeiro Sênior, elabore um DIAGNÓSTICO FINANCEIRO COMPLETO E PERSONALIZADO.
    Cite valores reais em R$, taxas de poupança, nomes de metas/dívidas e tendências do mês atual vs. mês anterior.

    Gere um JSON estritamente com estas chaves:
    - analysis: Texto executivo claro (2 a 3 parágrafos objetivos) explicando o momento atual, taxa de poupança, folga ou déficit mensal e tendência patrimonial.
    - strengths: Lista de 3 a 4 pontos fortes concretos identificados nos números.
    - weaknesses: Lista de 3 a 4 pontos fracos ou gargalos reais.
    - risks: Lista de riscos financeiros imediatos e de médio prazo (ex: liquidez baixa, juros rotativos, gastos emocionais).
    - recommendations: Lista de 4 a 5 ações práticas ordenadas por prioridade, com valores sugeridos em R$.

    Contexto: ${context}
  `;

  let text = "";
  const fallback = {
    analysis: "Não foi possível gerar a análise detalhada no momento.",
    strengths: [],
    weaknesses: [],
    risks: [],
    recommendations: []
  };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.XHIGH },
        responseMimeType: "application/json"
      }
    });
    
    text = response.text || "";
  } catch (error) {
    handleAIError(error, "Financial Diagnosis");
    return fallback;
  }

  return safeJsonParse(text, fallback, "Financial Diagnosis");
}

export async function getAIResponse(
  mode: AIMode | "copiloto",
  userProfile: UserProfile,
  data: {
    transactions: Transaction[];
    accounts: any[];
    goals: any[];
    debts: any[];
    family: any[];
    wealth: any[];
    subscriptions: any[];
    budget?: any[];
    cashFlow?: any[];
    diagnosis?: any;
    badges?: any[];
    lifePlan?: any;
    cards?: any[];
    receivables?: any[];
    reminders?: any[];
    investments?: any[];
    activeTab?: string;
  },
  userMessage: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[] = []
) {
  const snapshot = buildFinancialSnapshot(data, userProfile);
  const thinkingLevel =
    mode === "hibrido" || mode === "planejador"
      ? ThinkingLevel.HIGH
      : ThinkingLevel.MEDIUM;

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS[mode as keyof typeof SYSTEM_INSTRUCTIONS] || SYSTEM_INSTRUCTIONS.copiloto,
        thinkingConfig: { thinkingLevel },
        tools: mode === "copiloto" ? tools : undefined,
      },
      contents: [
        ...history,
        {
          role: "user",
          parts: [
            {
              text: `PANORAMA FINANCEIRO PRÉ-CALCULADO (EM TEMPO REAL):
${JSON.stringify(snapshot)}

TELA ATUAL DO USUÁRIO: ${data.activeTab || "chat"}
DIAGNÓSTICO RECENTE: ${JSON.stringify(data.diagnosis || {})}
PLANO DE VIDA: ${JSON.stringify(data.lifePlan || null)}
FAMÍLIA: ${JSON.stringify(data.family || [])}
CARTÕES: ${JSON.stringify((data.cards || []).map(c => ({ nome: c.name, limite: c.limit, usado: c.usedLimit, fechamento: c.closingDay, vencimento: c.dueDay })))}
DÍVIDAS DETALHADAS: ${JSON.stringify((data.debts || []).map(d => ({ nome: d.name, restante: d.remainingValue, jurosMes: d.interestRate, status: d.status, risco: d.riskLevel })))}
RECEBÍVEIS (DINHEIRO EMPRESTADO): ${JSON.stringify((data.receivables || []).map(r => ({ pessoa: r.personName, restante: r.remainingValue, vencimento: r.dueDate, status: r.status, risco: r.risk })))}
ASSINATURAS: ${JSON.stringify((data.subscriptions || []).map(s => ({ nome: s.name, valor: s.value, status: s.status })))}
TRANSAÇÕES RECENTES (últimas 45): ${JSON.stringify((data.transactions || []).slice(0, 45).map(t => ({ desc: t.title || t.establishment, val: t.value, type: t.type, cat: t.category, emo: t.emotion, date: t.date })))}

MENSAGEM DO USUÁRIO: ${userMessage}`
            }
          ]
        }
      ]
    });

    if (!response.text && !response.functionCalls) {
      throw new Error("Resposta da IA vazia ou inválida.");
    }

    return {
      text: response.text,
      functionCalls: response.functionCalls
    };
  } catch (error) {
    handleAIError(error, "Copiloto Response");
    const localFallbackText = generateLocalCopilotResponse(userMessage, data, userProfile);
    return {
      text: localFallbackText
    };
  }
}

export async function continueAIConversationAfterTools(
  mode: AIMode | "copiloto",
  userMessage: string,
  toolExecutions: { name: string; args: any; result: string }[],
  snapshotSummary: any
): Promise<string> {
  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTIONS[mode as keyof typeof SYSTEM_INSTRUCTIONS] || SYSTEM_INSTRUCTIONS.copiloto}
Você acabou de executar ações no sistema para o usuário. Confirme brevemente o que foi feito com base nos resultados abaixo e dê 1 insight prático ou alerta relevante sobre o impacto financeiro dessa ação (máximo 2-3 frases curtas em Markdown).`,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Pedido original: "${userMessage}"
Ações executadas: ${JSON.stringify(toolExecutions)}
Resumo financeiro atual: ${JSON.stringify(snapshotSummary)}`
            }
          ]
        }
      ]
    });
    return (response.text || "").trim();
  } catch {
    return "";
  }
}

function generateLocalCopilotResponse(
  userMessage: string,
  data: any,
  userProfile: any
): string {
  const query = (userMessage || "").toLowerCase();
  const snapshot = buildFinancialSnapshot(data, userProfile);
  const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (query.includes("quanto posso gastar") || query.includes("gastar hoje") || query.includes("limite diario")) {
    return `### 💡 Limite Seguro de Gasto para Hoje

- **Saldo total em contas:** ${fmt(snapshot.contas.saldoTotal)}${snapshot.contas.contaPrincipal ? ` (Principal: **${snapshot.contas.contaPrincipal.nome}** — ${fmt(snapshot.contas.contaPrincipal.saldo)})` : ""}
- **Dias restantes no mês:** ${snapshot.diasRestantesMes} dias
- **Valor seguro diário:** **${fmt(snapshot.mesAtual.limiteSeguroDiario)}/dia**
- **Ritmo atual de gasto diário:** ${fmt(snapshot.mesAtual.mediaGastoDiario)}/dia

> **Dica do Copiloto:** Mantendo seus gastos dentro de **${fmt(snapshot.mesAtual.limiteSeguroDiario)}/dia**, você protege seu fechamento mensal sem comprometer suas reservas.`;
  }

  if (query.includes("gastando muito") || query.includes("gasto muito") || query.includes("estou gastando") || query.includes("desperdi")) {
    const topList = snapshot.topCategoriasMesAtual
      .slice(0, 3)
      .map(c => `- **${c.category}:** ${fmt(c.spent)}${c.deltaPct !== null ? ` (${c.deltaPct >= 0 ? "+" : ""}${c.deltaPct}% vs. mês passado)` : ""}`)
      .join("\n");

    const isHigh = snapshot.mesAtual.despesas > snapshot.mesAtual.receitas && snapshot.mesAtual.receitas > 0;
    return `### 📊 Análise do Seu Ritmo de Gastos

- **Receitas no mês:** ${fmt(snapshot.mesAtual.receitas)}
- **Despesas no mês:** ${fmt(snapshot.mesAtual.despesas)}
- **Balanço líquido:** ${fmt(snapshot.mesAtual.balancoLiquido)} (Taxa de poupança: **${snapshot.mesAtual.taxaPoupancaPct}%**)
- **Projeção até o fim do mês:** ${fmt(snapshot.mesAtual.projecaoGastoMes)}

**Maiores categorias do mês:**
${topList || "- Nenhuma despesa expressiva registrada ainda."}

${isHigh ? "⚠️ **Atenção:** Suas despesas superaram as receitas do mês. Priorize cortar excessos nas categorias acima." : "✅ **Bom controle:** Suas despesas estão abaixo das receitas acumuladas neste mês."}`;
  }

  if (query.includes("divida") || query.includes("dívida") || query.includes("sair das")) {
    if (snapshot.dividas.quantidadeAtivas === 0) {
      return `### 🛡️ Situação de Dívidas

Você **não possui dívidas ativas registradas** no momento! 🎉
${snapshot.dinheiroEmprestadoAReceber.totalPendente > 0 ? `\nVocê tem **${fmt(snapshot.dinheiroEmprestadoAReceber.totalPendente)}** em dinheiro emprestado para receber (${snapshot.dinheiroEmprestadoAReceber.quantidadeAtrasados} em atraso).` : ""}
Foque em fortalecer sua **Reserva de Emergência** e acelerar suas metas.`;
    }
    return `### 🎯 Plano Estratégico para Quitar Dívidas

- **Total em dívidas ativas:** ${fmt(snapshot.dividas.totalRestante)} (${snapshot.dividas.quantidadeAtivas} dívida(s))
${snapshot.dividas.maiorJuros ? `- **Prioridade nº 1 (maior juros):** **${snapshot.dividas.maiorJuros.nome}** (${snapshot.dividas.maiorJuros.jurosMes}% a.m. • Restante: ${fmt(snapshot.dividas.maiorJuros.saldo)})` : ""}

**Próximos passos recomendados:**
1. **Método Avalanche:** Direcione qualquer sobra para **${snapshot.dividas.maiorJuros?.nome || "a dívida de maior juro"}** para estancar juros compostos.
2. **Revisão de assinaturas:** Você gasta ${fmt(snapshot.assinaturasRecorrentes.custoMensal)}/mês (${fmt(snapshot.assinaturasRecorrentes.custoAnual)}/ano) em assinaturas recorrentes.`;
  }

  if (query.includes("emprest") || query.includes("receber") || query.includes("devedor")) {
    return `### 🤝 Panorama de Dinheiro Emprestado

- **Total a receber:** ${fmt(snapshot.dinheiroEmprestadoAReceber.totalPendente)} (${snapshot.dinheiroEmprestadoAReceber.quantidadeAbertos} em aberto)
- **Em atraso:** ${snapshot.dinheiroEmprestadoAReceber.quantidadeAtrasados} registro(s)
${snapshot.dinheiroEmprestadoAReceber.atrasadosDetalhes.map((r: any) => `- **${r.pessoa}:** ${fmt(r.valorRestante)} (venceu em ${r.vencimento})`).join("\n")}`;
  }

  const topList = snapshot.topCategoriasMesAtual
    .slice(0, 3)
    .map(c => `- **${c.category}:** ${fmt(c.spent)}`)
    .join("\n");

  return `### 📑 Panorama Financeiro em Tempo Real

- **Saldo em Contas:** ${fmt(snapshot.contas.saldoTotal)}
- **Receitas (Mês):** ${fmt(snapshot.mesAtual.receitas)} | **Despesas:** ${fmt(snapshot.mesAtual.despesas)}
- **Taxa de Poupança:** ${snapshot.mesAtual.taxaPoupancaPct}% | **Limite Seguro Hoje:** ${fmt(snapshot.mesAtual.limiteSeguroDiario)}/dia
- **Dívidas Ativas:** ${fmt(snapshot.dividas.totalRestante)} | **A Receber:** ${fmt(snapshot.dinheiroEmprestadoAReceber.totalPendente)}
- **Uso de Cartões:** ${snapshot.cartoesCredito.comprometimentoPct}% (${fmt(snapshot.cartoesCredito.limiteUsado)} de ${fmt(snapshot.cartoesCredito.limiteTotal)})

**Top gastos do mês:**
${topList || "- Sem gastos expressivos no mês."}

Você pode me pedir para **registrar gastos**, **criar metas**, **simular compras** ou analisar qualquer área das suas finanças!`;
}

export async function analyzeDebtUrgency(
  debt: any,
  userProfile: any,
  monthlyIncome: number,
  monthlyExpenses: number
) {
  const fallback = {
    urgency: "moderada",
    urgencyScore: 50,
    urgencyReason: "Análise baseada em juros padrão e prazo.",
    priority: "media",
    priorityReason: "Recomendamos priorizar dívidas com juros maiores que 5% ao mês.",
    riskLevel: "medio",
    riskReason: "Risco moderado baseado no histórico de pagamentos."
  };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Você é um Especialista em Recuperação de Crédito e Matemática Financeira. 
        Sua tarefa é analisar uma dívida específica e determinar URGÊNCIA, PRIORIDADE de pagamento e RISCO com rigor técnico.
        
        Critérios de Análise:
        1. Juros: Taxas acima de 5% a.m. são críticas (Cartão de Crédito, Cheque Especial). Acima de 2% a.m. são altas.
        2. Atraso: Dívidas com parcelas vencidas têm urgência crítica/máxima.
        3. Impacto no Orçamento: Porcentagem da renda comprometida pela parcela (>30% é crítico).
        4. Tipo e Garantia: Financiamentos com garantia real (imóvel/veículo) trazem risco patrimonial.
        5. Crescimento Composto: Velocidade de bola de neve se não amortizada.
        
        Retorne APENAS um JSON no formato:
        {
          "urgency": "critica" | "alta" | "moderada" | "baixa",
          "urgencyScore": number,
          "urgencyReason": "Explicação técnica direta citando juros, prazo e comprometimento da renda",
          "priority": "alta" | "media" | "baixa",
          "priorityReason": "Explicação estratégica de por que pagar agora ou depois",
          "riskLevel": "baixo" | "medio" | "alto" | "critico",
          "riskReason": "Explicação objetiva do risco de inadimplência ou perda patrimonial"
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Dívida Atual: ${JSON.stringify(debt)}
              Perfil do Usuário: ${JSON.stringify(userProfile)}
              Renda Mensal Disponível: ${monthlyIncome}
              Gastos Fixos Mensais: ${monthlyExpenses}
              Folga Mensal Estimada: ${monthlyIncome - monthlyExpenses}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    const result = safeJsonParse(response.text || "", fallback, "Debt Urgency");
    if (!["critica", "alta", "moderada", "baixa"].includes(result.urgency)) result.urgency = "moderada";
    if (!["alta", "media", "baixa"].includes(result.priority)) result.priority = "media";
    if (!["baixo", "medio", "alto", "critico"].includes(result.riskLevel)) result.riskLevel = "medio";
    if (typeof result.urgencyScore !== "number") result.urgencyScore = 50;
    return result;
  } catch (error) {
    handleAIError(error, "Debt Urgency");
    return fallback;
  }
}

export async function generateDebtPaymentStrategy(
  debts: any[],
  userProfile: any,
  monthlyIncome: number,
  monthlyExpenses: number
) {
  const fallback = {
    strategyName: "Híbrida",
    explanation: "Foque em pagar as dívidas com juros maiores que 5% ao mês primeiro.",
    comparison: {
      avalanche: { savings: 0, timeMonths: 12, pros: ["Economia máxima de juros"], cons: ["Demora psicológica para quitar a primeira"] },
      snowball: { savings: 0, timeMonths: 14, pros: ["Vitórias rápidas motivadoras"], cons: ["Custo maior de juros totais"] }
    },
    steps: ["Liste todas as dívidas com juros", "Negocie taxas acima de 3% a.m.", "Pague o mínimo das demais e concentre a folga na prioritária"],
    estimatedTimeMonths: 12,
    potentialSavings: 0,
    priorityList: []
  };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: `Você é um Estrategista Matemático e Comportamental de Quitação de Dívidas.
        Compare matematicamente os métodos Avalanche (maior juros primeiro) e Bola de Neve (menor saldo primeiro) usando a folga mensal real.
        Calcule estimativas realistas de economia de juros (savings) e prazo em meses (timeMonths).
        
        Retorne APENAS um JSON no formato:
        {
          "strategyName": "Avalanche" | "Bola de Neve" | "Híbrida",
          "explanation": "Por que esta estratégia vence matematicamente ou comportamentalmente para este perfil?",
          "comparison": {
            "avalanche": { "savings": number, "timeMonths": number, "pros": string[], "cons": string[] },
            "snowball": { "savings": number, "timeMonths": number, "pros": string[], "cons": string[] }
          },
          "steps": string[],
          "estimatedTimeMonths": number,
          "potentialSavings": number,
          "priorityList": { "debtId": string, "reason": string, "method": "avalanche" | "snowball" }[]
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Lista de Dívidas: ${JSON.stringify(debts)}
              Perfil do Usuário: ${JSON.stringify(userProfile)}
              Renda Mensal: ${monthlyIncome}
              Gastos Fixos: ${monthlyExpenses}
              Capacidade Mensal de Amortização Estimada: ${Math.max(0, monthlyIncome - monthlyExpenses)}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Debt Payment Strategy");
  } catch (error) {
    handleAIError(error, "Debt Payment Strategy");
    return fallback;
  }
}

export async function analyzeFinancialProtection(
  data: {
    currentReserve: number;
    monthlyExpenses: number;
    essentialExpenses: number;
    debts: any[];
    income: number;
    incomeType: string;
    dependents: number;
    riskTolerance: string;
  }
) {
  const monthsCovered = data.essentialExpenses > 0 ? Number((data.currentReserve / data.essentialExpenses).toFixed(1)) : 0;
  const fallback = {
    securityLevel: monthsCovered >= 6 ? "seguro" : monthsCovered >= 3 ? "estavel" : "risco",
    score: Math.min(100, Math.round(monthsCovered * 12)),
    alerts: monthsCovered < 3 ? ["Sua reserva cobre menos de 3 meses de gastos essenciais."] : [],
    recommendations: ["Mantenha sua reserva em liquidez diária (Tesouro Selic ou CDB 100% CDI)."],
    crisisAnalysis: `Sua reserva atual cobre aproximadamente ${monthsCovered} meses de gastos essenciais.`
  };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Você é um Especialista em Gestão de Riscos, Liquidez e Blindagem Financeira.
        Analise a Reserva de Emergência e a Proteção Financeira do usuário considerando tipo de renda, dependentes e dívidas.
        
        Retorne APENAS um JSON no formato:
        {
          "securityLevel": "critico" | "risco" | "estavel" | "seguro",
          "score": number (0-100),
          "alerts": string[],
          "recommendations": string[],
          "crisisAnalysis": "Análise exata de quantos meses o usuário sobreviveria em queda total de renda e qual a meta ideal em R$"
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Dados de Proteção: ${JSON.stringify(data)}
              Meses de Gastos Essenciais Cobertos: ${monthsCovered}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Financial Protection");
  } catch (e) {
    handleAIError(e, "Financial Protection");
    return fallback;
  }
}

export async function analyzeReceivableRisk(receivable: Receivable, debtor?: Debtor) {
  const fallback = {
    risk: "medio" as ReceivableRisk,
    reason: "Análise baseada no prazo de vencimento padrão.",
    priority: "cobrar_em_breve" as CollectionPriority,
    probabilityOfReceiving: 70,
    estimatedReceiptDate: receivable.dueDate,
    probableDelayDays: 0,
    aiAnalysis: "Aguardando mais dados históricos para uma análise precisa."
  };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Você é um Especialista em Análise de Crédito Pessoal e Recuperação de Recebíveis.
        Avalie o risco real de inadimplência do empréstimo considerando valor, prazo, confiabilidade prévia, taxa de atraso do devedor e proporção já quitada.
        
        Retorne APENAS um JSON no formato:
        {
          "risk": "baixo" | "medio" | "alto" | "critico",
          "reason": "Explicação técnica e direta",
          "priority": "cobrar_agora" | "cobrar_em_breve" | "pode_aguardar",
          "probabilityOfReceiving": number (0-100),
          "estimatedReceiptDate": "YYYY-MM-DD",
          "probableDelayDays": number,
          "aiAnalysis": "Análise detalhada do comportamento de pagamento e recomendação de acompanhamento"
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Dados do Recebível: ${JSON.stringify(receivable)}
              Dados do Devedor: ${JSON.stringify(debtor || "Primeiro registro sem histórico")}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Receivable Risk");
  } catch (e) {
    handleAIError(e, "Receivable Risk");
    return fallback;
  }
}

export async function analyzeDebtorReliability(debtor: Partial<Debtor>, history: Receivable[]) {
  const fallback = {
    reliability: "media" as ReliabilityLevel,
    recommendedLimit: 500,
    delayRate: 0,
    analysis: "Perfil em análise inicial."
  };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Você é um Analista de Crédito Bancário.
        Avalie a confiabilidade deste devedor com base no histórico completo e recomende um limite seguro de exposição em R$.
        
        Retorne APENAS um JSON no formato:
        {
          "reliability": "alta" | "media" | "baixa" | "critica",
          "recommendedLimit": number,
          "delayRate": number (0-100),
          "analysis": "Explicação objetiva do histórico de pagamento"
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Dados do Devedor: ${JSON.stringify(debtor)}
              Histórico de Empréstimos: ${JSON.stringify(history)}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Debtor Reliability");
  } catch (e) {
    handleAIError(e, "Debtor Reliability");
    return fallback;
  }
}

export async function generateCollectionMessage(
  receivable: Receivable, 
  tone: "friendly" | "neutral" | "firm",
  debtor?: Debtor
) {
  const defaultMsg = `Olá ${debtor?.name || receivable.personName}, passando para lembrar do valor de R$ ${receivable.remainingValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} referente ao ${receivable.type}.`;

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: `Você é um Especialista em Comunicação Financeira e Cobrança Empática e Eficaz.
        Gere uma mensagem pronta para WhatsApp (natural, educada e persuasiva, preservando o relacionamento quando friendly/neutral e sendo clara sobre prazo/acordo quando firm).
        
        Tons:
        - friendly: Amigável, leve, lembrete natural sem constrangimento.
        - neutral: Profissional, objetiva, solicitando previsão de pagamento ou Pix.
        - firm: Firme e respeitosa, destacando o atraso e propondo data limite ou parcelamento imediato.
        
        Retorne APENAS o texto pronto da mensagem para copiar/enviar no WhatsApp.`,
      },
      contents: [
        {
          parts: [
            {
              text: `Recebível: ${JSON.stringify(receivable)}
              Devedor: ${JSON.stringify(debtor || { name: receivable.personName })}
              Tom solicitado: ${tone}
              Data Atual: ${new Date().toISOString().split("T")[0]}`
            }
          ]
        }
      ]
    });

    return response.text || defaultMsg;
  } catch (e) {
    handleAIError(e, "Collection Message");
    return defaultMsg;
  }
}

export async function analyzeIncomeStability(transactions: Transaction[]) {
  const fallback = {
    stability: "estavel",
    score: 70,
    analysis: "Análise baseada no histórico recente de recebimentos.",
    trend: "Sua renda está estável",
    recommendations: ["Mantenha o controle das suas fontes de renda."]
  };

  try {
    const incomes = transactions.filter(t => t.type === "income").slice(0, 60);
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Você é um Analista de Renda, Previsibilidade de Receitas e Fluxo de Entrada.
        Avalie regularidade mensal, concentração em única fonte, variação entre meses e tendência de crescimento ou queda.
        
        Retorne APENAS um JSON no formato:
        {
          "stability": "estavel" | "instavel" | "crescente" | "em_queda",
          "score": number (0-100),
          "analysis": "Análise detalhada citando médias, concentração de fontes e sazonalidade",
          "trend": "Sua renda está crescendo" | "Sua renda é instável" | "Sua renda está em queda" | "Sua renda está estável",
          "recommendations": string[]
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Transações de Receita: ${JSON.stringify(incomes)}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Income Stability");
  } catch (e) {
    handleAIError(e, "Income Stability");
    return fallback;
  }
}

export async function analyzeExpenseBehavior(transactions: Transaction[]) {
  const fallback = {
    behavior: "controlado",
    score: 80,
    impulsiveRate: 10,
    emotionalAnalysis: "Seus gastos parecem equilibrados emocionalmente.",
    wasteAlerts: [],
    trend: "Seu comportamento de gasto está saudável",
    recommendations: ["Continue monitorando seus gastos por categoria."]
  };

  try {
    const expenses = transactions.filter(t => t.type === "expense").slice(0, 60);
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Você é um Especialista em Psicologia Econômica e Auditoria de Gastos Pessoais.
        Identifique padrões de consumo por emoção, pequenos gastos recorrentes ("efeito cafezinho"), picos de final de semana e desperdícios quantificáveis em R$.
        
        Retorne APENAS um JSON no formato:
        {
          "behavior": "controlado" | "impulsivo" | "emocional" | "excessivo",
          "score": number (0-100),
          "impulsiveRate": number (0-100),
          "emotionalAnalysis": "Análise profunda ligando emoções, categorias e valor gasto em R$",
          "wasteAlerts": string[],
          "trend": "Você está gastando acima do normal" | "Seu comportamento de gasto está saudável" | "Atenção a gastos impulsivos",
          "recommendations": string[]
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Transações de Despesa: ${JSON.stringify(expenses)}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Expense Behavior");
  } catch (e) {
    handleAIError(e, "Expense Behavior");
    return fallback;
  }
}

export async function analyzeStatement(transactions: Transaction[]) {
  const fallback = {
    healthScore: 75,
    summary: "Seu extrato mostra um fluxo financeiro regular.",
    insights: ["Suas despesas estão dentro do esperado para o período."],
    warnings: [],
    unusualTransactions: [],
    recommendations: ["Mantenha o registro detalhado de todas as movimentações."]
  };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Você é um Auditor Financeiro de Alta Performance.
        Analise o EXTRATO UNIFICADO para detectar:
        1. Equilíbrio real entre entradas e saídas.
        2. Transações atípicas, picos fora da curva ou possíveis cobranças duplicadas.
        3. Categorias dominantes e oportunidades imediatas de corte.
        
        Retorne APENAS um JSON no formato:
        {
          "healthScore": number (0-100),
          "summary": "Resumo executivo com valores totais e conclusão objetiva",
          "insights": string[],
          "warnings": string[],
          "unusualTransactions": string[] (IDs de transações atípicas),
          "recommendations": string[]
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Extrato de Transações: ${JSON.stringify(transactions.slice(0, 60))}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Statement Analysis");
  } catch (e) {
    handleAIError(e, "Statement Analysis");
    return fallback;
  }
}

export async function generateCollectionStrategy(
  receivables: Receivable[],
  debtors: Debtor[],
  userProfile: UserProfile
): Promise<{
  overallRisk: ReceivableRisk;
  totalToReceive: number;
  expectedThisMonth: number;
  strategies: {
    debtorName: string;
    priority: CollectionPriority;
    action: string;
    suggestedMessage: string;
    reason: string;
  }[];
  recommendations: string[];
}> {
  const fallback = {
    overallRisk: "medio" as ReceivableRisk,
    totalToReceive: receivables.reduce((acc, r) => acc + r.remainingValue, 0),
    expectedThisMonth: 0,
    strategies: [],
    recommendations: ["Mantenha um registro rigoroso de todas as datas de vencimento.", "Considere pedir garantias para empréstimos de alto valor."]
  };

  let responseText = "";
  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: `Você é um Especialista em Recuperação de Crédito e Cobrança Estratégica.
        Analise toda a carteira de recebíveis e gere um plano individualizado por devedor, priorizando maior risco/valor e fornecendo mensagens prontas de WhatsApp persuasivas.
        
        Retorne APENAS um JSON no formato:
        {
          "overallRisk": "baixo" | "medio" | "alto" | "critico",
          "totalToReceive": number,
          "expectedThisMonth": number,
          "strategies": [
            {
              "debtorName": "string",
              "priority": "cobrar_agora" | "cobrar_em_breve" | "pode_aguardar",
              "action": "string",
              "suggestedMessage": "string",
              "reason": "string"
            }
          ],
          "recommendations": string[]
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Perfil do Usuário: ${userProfile.displayName || "Usuário"}
              Recebíveis: ${JSON.stringify(receivables.map(r => ({
                pessoa: r.personName,
                valorTotal: r.totalValue,
                valorRecebido: r.receivedValue,
                valorRestante: r.remainingValue,
                dataEmprestimo: r.loanDate,
                dataVencimento: r.dueDate,
                status: r.status,
                tipo: r.type,
                risco: r.risk,
                prioridade: r.priority
              })))}
              Devedores: ${JSON.stringify(debtors.map(d => ({
                nome: d.name,
                confiabilidade: d.reliability,
                taxaAtraso: d.delayRate,
                totalEmprestado: d.totalLent,
                totalRecebido: d.totalReceived
              })))}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    responseText = response.text || "";
  } catch (error) {
    handleAIError(error, "Collection Strategy");
    return fallback;
  }

  return safeJsonParse(responseText, fallback, "Collection Strategy");
}

export async function analyzeTransfers(transactions: Transaction[]) {
  const fallback = {
    efficiencyScore: 80,
    summary: "Suas transferências internas seguem um padrão regular de movimentação.",
    patterns: ["Movimentações frequentes entre conta corrente e poupança."],
    recommendations: ["Considere automatizar transferências para reserva financeira."],
    optimizationTips: ["Verifique se há taxas de transferência entre bancos diferentes."]
  };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Você é um Analista de Tesouraria Pessoal e Alocação entre Contas.
        Analise as transferências internas identificando cobertura de saldo negativo, aportes para reserva/investimentos e oportunidades de automação.
        
        Retorne APENAS um JSON no formato:
        {
          "efficiencyScore": number (0-100),
          "summary": "Resumo da dinâmica de transferências",
          "patterns": string[],
          "recommendations": string[],
          "optimizationTips": string[]
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Transferências: ${JSON.stringify(transactions.filter(t => t.type === "transfer").slice(0, 50))}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Transfers Analysis");
  } catch (e) {
    handleAIError(e, "Transfers Analysis");
    return fallback;
  }
}

export async function suggestSubCategories(categoryName: string): Promise<string[]> {
  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      contents: `Sugira 5 subcategorias práticas e comuns no Brasil para a categoria de finanças pessoais: "${categoryName}".
      Retorne APENAS um array JSON de strings. Exemplo: ["Sub1", "Sub2", "Sub3", "Sub4", "Sub5"]`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return [];
    return safeJsonParse<string[]>(text, [], "Suggest Subcategories");
  } catch (error) {
    handleAIError(error, "Suggest Subcategories");
    return [];
  }
}

export async function suggestCategoryAndTags(
  transaction: {
    type: "income" | "expense";
    value: number;
    description: string;
    establishment?: string;
    incomeSource?: string;
    date: string;
  },
  existingCategories: any[],
  existingTags: any[],
  history: Transaction[]
) {
  const fallback = {
    category: "Outros",
    subCategory: "Geral",
    tags: [],
    reasoning: "Não foi possível gerar sugestões automáticas."
  };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: `Você é um Classificador Financeiro Inteligente de alta precisão.
        Analise descrição, estabelecimento, valor e histórico para sugerir a CATEGORIA exata (priorizando as categorias existentes), SUBCATEGORIA e Smart Tags.
        
        Regras de Smart Tags:
        - Valor: #GastoAlto (> R$ 500), #PequenoValor (< R$ 50)
        - Comportamento: #Essencial ou #EstiloDeVida ou #Impulsivo
        - Frequência: #Recorrente (se aparecer no histórico) ou #Eventual
        
        Retorne APENAS um JSON no formato:
        {
          "category": "Nome da Categoria",
          "subCategory": "Nome da Subcategoria",
          "tags": string[],
          "reasoning": "Breve explicação da classificação"
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Transação Atual: ${JSON.stringify(transaction)}
              Categorias Disponíveis: ${JSON.stringify(existingCategories)}
              Tags Existentes: ${JSON.stringify(existingTags)}
              Histórico Recente: ${JSON.stringify(history.slice(0, 20))}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Suggest Category");
  } catch (e) {
    handleAIError(e, "Suggest Category");
    return fallback;
  }
}

export async function suggestReminders(transactions: Transaction[], currentReminders: Reminder[]) {
  const fallback = { suggestions: [] };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Você é um Assistente de Prevenção de Atrasos Financeiros.
        Analise transações recorrentes (aluguel, internet, energia, academia, assinaturas, parcelas) que ainda não possuem lembrete cadastrado e sugira lembretes com a próxima data provável.
        
        Retorne APENAS um JSON no formato:
        {
          "suggestions": [
            {
              "title": "string",
              "description": "string",
              "type": "financeiro" | "conta",
              "date": "YYYY-MM-DD",
              "recurrent": true,
              "frequency": "mensal",
              "priority": "media" | "alta",
              "reason": "string"
            }
          ]
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Histórico de Transações: ${JSON.stringify(transactions.slice(0, 50))}
              Lembretes Atuais: ${JSON.stringify(currentReminders)}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Suggest Reminders");
  } catch (e) {
    handleAIError(e, "Suggest Reminders");
    return fallback;
  }
}

export async function analyzeBudgetBehavior(
  budgets: any[],
  transactions: Transaction[],
  userProfile: UserProfile
) {
  const fallback = {
    analysis: "Seu orçamento está sendo monitorado.",
    alerts: [],
    recommendations: ["Mantenha o registro de todas as despesas para uma análise precisa."],
    topOverspentCategories: [],
    behaviorTrend: "Seu orçamento está equilibrado"
  };

  try {
    const snapshot = buildFinancialSnapshot({ budgets, transactions, accounts: [] }, userProfile);
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: `Você é um Especialista em Orçamento Base Zero e Controle de Limites.
        Compare orçamentos planejados vs. gastos reais, identifique categorias críticas e sugira remanejamentos práticos entre categorias.
        
        Retorne APENAS um JSON no formato:
        {
          "analysis": "Análise detalhada citando categorias, percentuais e valores em R$",
          "alerts": string[],
          "recommendations": string[],
          "topOverspentCategories": string[],
          "behaviorTrend": "Você está melhorando seu controle" | "Atenção: seus gastos estão subindo" | "Seu orçamento está equilibrado"
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Orçamentos Atuais: ${JSON.stringify(budgets)}
              Alertas Pré-Calculados: ${JSON.stringify(snapshot.orcamentosEmAlerta)}
              Top Categorias Mês Atual: ${JSON.stringify(snapshot.topCategoriasMesAtual)}
              Perfil do Usuário: ${JSON.stringify(userProfile)}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Budget Behavior");
  } catch (e) {
    handleAIError(e, "Budget Behavior");
    return fallback;
  }
}

export async function analyzeGoalsStrategy(goals: any[], transactions: any[], accounts: any[]) {
  const fallback = {
    prioritySuggestion: "Foque na sua meta de maior prioridade ou na reserva de emergência.",
    adjustments: "Mantenha o ritmo atual de aportes.",
    healthCheck: "Suas metas estão sendo monitoradas.",
    futureVision: "Continue poupando para atingir seus objetivos no prazo planejado.",
    tips: ["Automatize seus aportes", "Revise suas metas mensalmente", "Use a sobra do orçamento para acelerar metas"]
  };

  try {
    const snapshot = buildFinancialSnapshot({ goals, transactions, accounts });
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: `Você é um Estrategista Financeiro e Planejador de Metas de Elite.
        Calcule o aporte mensal necessário para cada meta considerando o prazo e a sobra real do usuário. Sugira priorização realista.
        
        Retorne APENAS um JSON no formato:
        {
          "prioritySuggestion": "Qual meta priorizar agora, quanto aportar por mês (R$) e por quê?",
          "adjustments": "Sugestões concretas de aceleração ou ajuste de prazo",
          "healthCheck": "Avaliação realista do ritmo atual frente aos prazos",
          "futureVision": "Projeção de conquista mantendo a capacidade atual de poupança",
          "tips": string[] (3 dicas práticas)
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Metas Atuais: ${JSON.stringify(snapshot.metas)}
              Fluxo Mensal Atual: ${JSON.stringify(snapshot.mesAtual)}
              Saldo em Contas: ${JSON.stringify(snapshot.contas)}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Goals Strategy");
  } catch (e) {
    handleAIError(e, "Goals Strategy");
    return fallback;
  }
}

export async function analyzeFutureCashFlow(
  projection: any[],
  accounts: any[],
  debts: any[],
  receivables: any[]
) {
  const prompt = `
    Analise com precisão matemática o fluxo de caixa futuro (projeção de 30-90 dias) do usuário e forneça insights estratégicos.
    
    Dados de Projeção:
    ${JSON.stringify(projection.map(p => ({ date: p.date, balance: p.balance, income: p.income, expense: p.expense })))}
    
    Contas Atuais:
    ${JSON.stringify(accounts.map(a => ({ name: a.name, balance: a.balance, principal: !!a.isDefault })))}
    
    Dívidas:
    ${JSON.stringify(debts.map(d => ({ 
      name: d.name, 
      remaining: d.remainingValue, 
      next: d.nextInstallmentDate,
      risk: d.riskLevel,
      interestRate: d.interestRate,
      totalCost: d.finalTotalCost
    })))}
    
    Recebíveis:
    ${JSON.stringify(receivables.map(r => ({ name: r.personName, value: r.remainingValue, due: r.dueDate, status: r.status })))}
    
    Responda em JSON com o seguinte formato:
    {
      "diagnosis": "Resumo preciso da saúde futura citando menor saldo projetado e data crítica",
      "risks": ["Lista de riscos detectados com datas e valores"],
      "opportunities": ["Oportunidades concretas (ex: amortizar juros, aplicar sobra)"],
      "suggestions": [
        { "title": "Título da sugestão", "description": "Explicação detalhada com valores", "impact": "Alto/Médio/Baixo" }
      ],
      "futureVision": "Projeção realista se mantiver o ritmo atual",
      "actionPlan": ["Passos práticos para os próximos 30 dias"]
    }
  `;

  const fallback = {
    diagnosis: "Seu fluxo de caixa está sob monitoramento preventivo.",
    risks: [],
    opportunities: [],
    suggestions: [
      { title: "Reserva de Otimização", description: "Considere automatizar a transferência de sobras mensais para uma conta de rendimento automático.", impact: "Médio" }
    ],
    futureVision: "Manter a consistência atual ajudará a evitar surpresas no fluxo de caixa futuro.",
    actionPlan: ["Revise as datas de vencimento de suas despesas fixas para coincidir com as de recebimentos principais."]
  };

  let responseText = "";
  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: "application/json"
      }
    });
    responseText = response.text || "";
  } catch (error) {
    handleAIError(error, "Future Cash Flow");
    return fallback;
  }

  return safeJsonParse(responseText, fallback, "Future Cash Flow");
}

export async function analyzeLifePlan(
  lifePlan: any,
  projections: any,
  goals: any[],
  accounts: any[],
  debts: any[],
  receivables: any[]
) {
  const fallback = {
    diagnosis: "Seu plano de vida está em fase de estruturação.",
    risks: ["Falta de dados históricos para projeção precisa."],
    opportunities: ["Defina metas claras para cada etapa do seu horizonte."],
    futureVision: "Com disciplina e planejamento, você alcançará sua independência financeira.",
    actionPlan: ["Revise seus gastos mensais", "Aumente sua taxa de poupança"],
    healthScore: 50,
    status: "yellow"
  };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: `Você é um Estrategista de Vida, Independência Financeira e Alocação Patrimonial de Elite.
        Avalie a viabilidade matemática do Plano de Vida frente a renda, gastos, dívidas, metas e perfil de risco.
        
        Retorne APENAS um JSON no formato:
        {
          "diagnosis": "Análise profunda da sustentabilidade do plano e taxa de poupança",
          "risks": string[],
          "opportunities": string[],
          "futureVision": "Visão realista do patrimônio em 5, 10 e no fim do horizonte",
          "actionPlan": string[],
          "healthScore": number (0-100),
          "status": "green" | "yellow" | "red"
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Plano de Vida: ${JSON.stringify(lifePlan)}
              Projeções (Realista): ${JSON.stringify(projections.realista)}
              Objetivos Vinculados: ${JSON.stringify(goals.filter(g => lifePlan.linkedGoalIds?.includes(g.id)))}
              Contas Atuais: ${JSON.stringify(accounts)}
              Dívidas: ${JSON.stringify(debts)}
              Recebíveis: ${JSON.stringify(receivables)}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    return safeJsonParse(response.text || "", fallback, "Life Plan");
  } catch (e) {
    handleAIError(e, "Life Plan");
    return fallback;
  }
}

export async function analyzeFinancialDependency(members: FamilyMember[], analysis: DependencyAnalysis): Promise<string> {
  const prompt = `Analise a dependência financeira desta família:
  Membros: ${JSON.stringify(members.map(m => ({ name: m.name, type: m.type, income: m.income, expenses: m.monthlyExpenses })))}
  Indicadores:
  - Total de Dependentes: ${analysis.totalDependents}
  - Custo Total dos Dependentes: R$ ${analysis.totalDependentCost.toFixed(2)}
  - Índice de Dependência: ${analysis.dependencyIndex.toFixed(1)}%
  - Nível de Risco: ${analysis.riskLevel}
  - Sobrecarga do Usuário: ${analysis.userOverload ? "Sim" : "Não"}

  Forneça uma análise estratégica curta e direta (máximo 3 frases) em português, identificando riscos de sobrecarga financeira e 1 ação prática de proteção/equilíbrio.`;

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM }
      }
    });
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    handleAIError(error, "Dependency Analysis");
    return "Erro ao processar análise de IA.";
  }
}

export async function analyzeCalendar(events: FinancialEvent[]) {
  let responseText = "";
  const defaultFallback = {
    aiSuggestions: "Seu calendário financeiro está sendo processado.",
    forecast: [],
    alerts: []
  };

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Você é um Especialista em Previsão Financeira e Gestão de Liquidez Diária.
        Analise os eventos futuros do calendário para detectar dias com concentração perigosa de contas, risco de saldo negativo e oportunidades de ajuste de datas.
        Retorne um JSON válido de acordo com o esquema solicitado.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiSuggestions: {
              type: Type.STRING,
              description: "Resumo estratégico e sugestões práticas de ajuste de vencimentos"
            },
            forecast: {
              type: Type.ARRAY,
              description: "Previsão de saldos",
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  expectedBalance: { type: Type.NUMBER }
                },
                required: ["date", "expectedBalance"]
              }
            },
            alerts: {
              type: Type.ARRAY,
              description: "Alertas de conflito ou risco",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "pode ser info, warning ou danger" },
                  message: { type: Type.STRING },
                  date: { type: Type.STRING }
                },
                required: ["type", "message", "date"]
              }
            }
          },
          required: ["aiSuggestions", "forecast", "alerts"]
        }
      },
      contents: [
        {
          parts: [
            {
              text: `Eventos do Calendário: ${JSON.stringify(events.slice(0, 50))}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });
    responseText = response.text || "";
  } catch (error: any) {
    handleAIError(error, "Calendar Analysis");
    
    const errorMessage = error?.message || "";
    if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
      return {
        aiSuggestions: "Limite de análise atingido temporariamente. Tente novamente em alguns minutos.",
        forecast: [],
        alerts: [{ type: "info", message: "Quota da IA excedida. As previsões automáticas estão pausadas.", date: new Date().toISOString() }]
      };
    }

    if (errorMessage.includes("Rpc failed") || errorMessage.includes("500") || errorMessage.includes("xhr error")) {
      return {
        aiSuggestions: "O serviço de análise inteligente está temporariamente instável. Suas previsões básicas continuam funcionando.",
        forecast: [],
        alerts: [{ type: "warning", message: "Conexão com a IA instável. Tentaremos novamente em breve.", date: new Date().toISOString() }]
      };
    }

    return defaultFallback;
  }

  return safeJsonParse(responseText, defaultFallback, "Calendar Analysis");
}

export async function analyzeFamilyFinances(
  members: FamilyMember[],
  incomes: FamilyIncome[],
  goals: FamilyGoal[],
  analysis: FamilyFinancialAnalysis
): Promise<{ aiSuggestions: string; balanceAnalysis: string }> {
  const prompt = `Analise as finanças desta família:
  Membros: ${JSON.stringify(members.map(m => ({ id: m.id, name: m.name, type: m.type })))}
  Rendas: ${JSON.stringify(incomes.map(i => ({ memberId: i.memberId, type: i.type, value: i.value })))}
  Metas: ${JSON.stringify(goals.map(g => ({ name: g.name, target: g.targetValue, current: g.currentValue })))}
  Indicadores:
  - Renda Total: R$ ${analysis.totalIncome.toFixed(2)}
  - Contribuição por Membro (%): ${JSON.stringify(analysis.contributionPercentageByMember)}
  - Progresso das Metas: ${analysis.goalsProgress.toFixed(1)}%
  - Distribuição Atual: ${JSON.stringify(analysis.distribution)}
 
  Forneça duas análises curtas, humanas e práticas em português (máximo 3 frases cada):
  1. aiSuggestions: Sugestões concretas para acelerar as metas familiares e otimizar a divisão de despesas.
  2. balanceAnalysis: Análise de proporcionalidade na contribuição de cada membro, apontando eventuais sobrecargas.
 
  Retorne um JSON no formato:
  {
    "aiSuggestions": "string",
    "balanceAnalysis": "string"
  }`;

  const fallback = {
    aiSuggestions: "Não foi possível gerar sugestões no momento.",
    balanceAnalysis: "Não foi possível analisar o equilíbrio no momento."
  };

  let responseText = "";
  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: "application/json"
      }
    });
    responseText = response.text || "";
  } catch (error) {
    handleAIError(error, "Family Finances Analysis");
    return fallback;
  }

  return safeJsonParse(responseText, fallback, "Family Finances Analysis");
}

export async function generateActionPlan(
  userProfile: UserProfile,
  data: {
    transactions: Transaction[];
    accounts: any[];
    goals: any[];
    debts: any[];
    installments: any[];
    budgets: any[];
    cards: any[];
    receivables: any[];
    wealth: any[];
    family: any[];
    subscriptions: any[];
  }
) {
  const fallback = {
    summary: "Não foi possível gerar um plano detalhado no momento. Continue monitorando seus gastos.",
    actions: []
  };

  const snapshot = buildFinancialSnapshot(data, userProfile);

  let responseText = "";
  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.XHIGH },
        systemInstruction: `Você é o Copiloto Financeiro Inteligente Definitivo.
        Analise toda a vida financeira do usuário usando o snapshot pré-calculado e gere um Plano de Ação cirúrgico, ordenado por impacto financeiro em reais (R$).
        
        Prioridades:
        1. Dívidas críticas / juros altos (use saldo disponível ou cortes específicos para amortizar e cite economia).
        2. Estouro de orçamento / desperdícios recorrentes / assinaturas ociosas.
        3. Cartões acima de 30% do limite e recebíveis atrasados que exigem cobrança.
        4. Formação de Reserva de Emergência e aportes em Metas atrasadas.
        5. Marque como "executable": true apenas quando houver valor exato e tipo de transação claro.
        
        Retorne APENAS um JSON no formato:
        {
          "summary": "Resumo executivo direto com diagnóstico em R$ e objetivo principal deste mês",
          "actions": [
            {
              "title": "string",
              "description": "string",
              "why": "string (citando dados reais encontrados)",
              "suggestedValue": number | null,
              "deadline": "string (ex: 'Imediato', 'Próximos 7 dias', 'Fim do mês')",
              "impact": "string (ex: 'Economia de R$ 180/mês')",
              "priority": "urgente" | "importante" | "opcional",
              "type": "corte_gastos" | "pagamento_divida" | "reserva" | "investimento" | "meta" | "outro",
              "executable": boolean,
              "executionData": {
                "transactionType": "income" | "expense" | "transfer",
                "category": "string",
                "accountId": "string (opcional)",
                "value": number (opcional)
              }
            }
          ]
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Snapshot Financeiro Consolidado: ${JSON.stringify(snapshot)}
              Parcelas de Dívidas: ${JSON.stringify(data.installments.slice(0, 30))}
              Orçamentos: ${JSON.stringify(data.budgets)}
              Cartões: ${JSON.stringify(data.cards)}
              Recebíveis: ${JSON.stringify(data.receivables)}
              Transações Recentes: ${JSON.stringify(data.transactions.slice(0, 40))}
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });
    responseText = response.text || "";
  } catch (e) {
    handleAIError(e, "Action Plan");
    return fallback;
  }

  return safeJsonParse(responseText, fallback, "Action Plan");
}

export interface TipOfTheDay {
  title: string;
  tip: string;
  category: string;
  estimatedSavings: string;
}

export async function generateTipOfTheDay(
  userProfile: UserProfile,
  transactions: Transaction[],
  budgets: any[] = []
): Promise<TipOfTheDay> {
  const fallback: TipOfTheDay = {
    title: "Dica de Economia",
    tip: "Acompanhe seus gastos diários para identificar pequenas oportunidades de economia no seu dia a dia.",
    category: "Geral",
    estimatedSavings: "Sob Medida"
  };

  const snapshot = buildFinancialSnapshot({ transactions, budgets }, userProfile);
  const context = `
    Usuário: ${userProfile.displayName || "Usuário"}
    Renda Mensal Declarada: ${userProfile.onboardingData?.monthlyIncome || "Não especificada"}
    Resumo do Mês: ${JSON.stringify(snapshot.mesAtual)}
    Top Categorias: ${JSON.stringify(snapshot.topCategoriasMesAtual)}
    Gastos por Emoção: ${JSON.stringify(snapshot.gastosPorEmocao)}
    Despesas Recentes: ${JSON.stringify(
      transactions
        .filter(t => t.type === "expense")
        .slice(0, 30)
        .map(t => ({ desc: t.title || t.description, val: t.value, cat: t.category, emo: t.emotion, date: t.date }))
    )}
    Orçamentos: ${JSON.stringify(
      budgets.map(b => ({ category: b.categoryName, planned: b.plannedValue, spent: b.spentValue }))
    )}
  `;

  const prompt = `
    Com base nos gastos REAIS e emoções registradas pelo usuário, gere 1 única Dica do Dia cirúrgica, prática e personalizada.
    Cite uma categoria, hábito ou padrão real observado nos dados e calcule uma economia realista.

    Retorne APENAS um objeto JSON válido:
    {
      "title": "Título curto e específico",
      "tip": "Descrição clara, humana e acionável em português (2 a 3 frases).",
      "category": "Categoria relacionada",
      "estimatedSavings": "Economia realista estimada (ex: 'R$ 120/mês')"
    }

    Dados do Usuário:
    ${context}
  `;

  try {
    const response = await generateContentServer({
      model: AI_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        systemInstruction: "Você é um consultor de microeconomia comportamental focado em economia prática mensurável em R$."
      }
    });

    const text = response.text || "";
    return safeJsonParse(text, fallback, "Tip of the Day");
  } catch (error) {
    handleAIError(error, "Tip of the Day");
    return fallback;
  }
}
