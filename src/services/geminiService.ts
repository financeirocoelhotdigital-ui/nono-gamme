import { generateContentServer, Type } from "./geminiClient";
import type { FunctionDeclaration } from "@google/genai";
import { Transaction, UserProfile, AIMode, Receivable, Debtor, ReceivableRisk, CollectionPriority, ReliabilityLevel, FamilyMember, DependencyAnalysis, FamilyIncome, FamilyGoal, FamilyFinancialAnalysis, FinancialEvent, Reminder, Account, Goal, Debt, Budget, CashFlowPoint, StrategicInsight, UserEvent } from "../types";

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

const SYSTEM_INSTRUCTIONS = {
  consultor: `Você é um Consultor Financeiro experiente. Analise os dados financeiros do usuário, sugira melhorias, identifique riscos e ajude no planejamento. Seja prático e direto. Use os dados de renda e gastos fixos do perfil para dar conselhos precisos.`,
  psicologo: `Você é um Psicólogo Financeiro. Analise o comportamento emocional do usuário em relação aos gastos (feliz, triste, impulsivo, etc.), detecte padrões de consumo emocional e ajude a criar uma relação saudável com o dinheiro.`,
  planejador: `Você é um Planejador de Vida e Carreira. Ajude o usuário a alinhar suas finanças com seus objetivos de longo prazo (casa, aposentadoria, viagens). Foque em estratégia e visão de futuro.`,
  hibrido: `Você é um Especialista em Finanças Comportamentais. Combine análise racional, emocional e estratégica para dar conselhos holísticos sobre a vida financeira do usuário.`,
  copiloto: `Você é o Consultor Financeiro Inteligente do App. Sua missão é analisar os dados reais do usuário e fornecer orientações financeiras profissionais, humanas e acionáveis.

  DIRETRIZES DE RESPOSTA:
  1. BASEIE-SE EM DADOS: Nunca dê conselhos genéricos como "economize mais". Diga exatamente ONDE e QUANTO o usuário está gastando com base no histórico real fornecido.
  2. ANALISE PADRÕES: Identifique se os gastos em uma categoria (ex: Alimentação) aumentaram em relação ao mês anterior ou à semana passada.
  3. SEJA PROATIVO: Se notar que o saldo está caindo rápido ou que uma meta está em risco, alerte o usuário.
  4. FOCO EM AÇÃO: Toda análise deve vir acompanhada de uma recomendação prática (ex: "Se reduzir R$200 em Lazer, você quita sua dívida X em 3 meses").
  5. TOM HUMANO E SIMPLES: Fale como um consultor que se importa, evitando termos técnicos excessivos sem explicação.
  6. COMPARAÇÃO: Sempre que possível, compare períodos (ex: "Este mês você já gastou 15% a mais que no mesmo período do mês passado").

  CAPACIDADES TÉCNICAS:
  - Você tem acesso a Contas, Transações, Metas, Dívidas, Patrimônio e Orçamentos.
  - Você pode registrar transações e criar metas usando ferramentas.
  - Você deve calcular métricas (como taxa de poupança, comprometimento de renda) na hora para responder.

  Se o usuário perguntar "Estou gastando muito?", analise o orçamento e as transações recentes antes de responder.`
};

const tools: { functionDeclarations: FunctionDeclaration[] }[] = [
  {
    functionDeclarations: [
      {
        name: "registrar_transacao",
        description: "Registra uma nova transação (receita ou despesa) no sistema.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.NUMBER, description: "Valor da transação" },
            type: { type: Type.STRING, enum: ["income", "expense"], description: "Tipo da transação" },
            category: { type: Type.STRING, description: "Categoria da transação" },
            description: { type: Type.STRING, description: "Descrição ou estabelecimento" },
            date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD (opcional, padrão hoje)" }
          },
          required: ["value", "type", "category", "description"]
        }
      },
      {
        name: "criar_meta",
        description: "Cria uma nova meta financeira.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nome da meta" },
            targetValue: { type: Type.NUMBER, description: "Valor alvo a ser poupado" },
            deadline: { type: Type.STRING, description: "Data limite no formato YYYY-MM-DD" }
          },
          required: ["name", "targetValue", "deadline"]
        }
      },
      {
        name: "ajustar_orcamento",
        description: "Ajusta o valor planejado para uma categoria de orçamento.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            categoryName: { type: Type.STRING, description: "Nome da categoria" },
            value: { type: Type.NUMBER, description: "Novo valor planejado" }
          },
          required: ["categoryName", "value"]
        }
      },
      {
        name: "simular_impacto",
        description: "Simula o impacto de um gasto ou investimento no saldo futuro e metas.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.NUMBER, description: "Valor do evento simulado" },
            description: { type: Type.STRING, description: "O que está sendo simulado" }
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
  const context = `
    Usuário: ${userProfile.displayName || "Usuário"}
    Renda Mensal: ${data.transactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.value, 0)}
    Despesas Mensais: ${data.transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.value, 0)}
    Saldo Total: ${data.accounts.reduce((acc, a) => acc + a.balance, 0)}
    Dívidas Ativas: ${data.debts.filter(d => d.status === "ativa").length}
    Metas Ativas: ${data.goals.filter(g => g.status === "active").length}
    Orçamento: ${JSON.stringify(data.budgets.map(b => ({ cat: b.categoryName, planned: b.plannedValue })))}
    Transações Recentes: ${JSON.stringify(data.transactions.slice(0, 30).map(t => ({ desc: t.title, val: t.value, type: t.type, cat: t.category, date: t.date })))}
    Eventos/Lembretes: ${JSON.stringify(data.userEvents.slice(0, 10).map(e => ({ name: e.name, date: e.dateInicio, val: e.value })))}
  `;

  const prompt = `
    Como um Estrategista Financeiro de IA de elite, analise os dados financeiros do usuário e gere uma lista de INSIGHTS ESTRATÉGICOS E SUGESTÕES PRÁTICAS.
    
    Seus insights devem cobrir:
    1. Padrões de Gastos: Aumentos significativos, categorias dominantes, gastos fora do padrão.
    2. Saúde do Orçamento: Categorias estouradas ou próximas do limite.
    3. Gestão de Dívidas: Priorização e riscos.
    4. Metas: Progresso e atrasos.
    5. Fluxo de Caixa: Riscos de saldo negativo no futuro.
    6. Oportunidades: Onde economizar ou investir melhor.

    Para cada insight, você deve fornecer:
    - title: Título curto e impactante.
    - description: O que está acontecendo (o fato).
    - explanation: Por que isso é um problema ou uma oportunidade.
    - solution: O que o usuário deve fazer exatamente.
    - impact: Qual o impacto financeiro esperado (ex: "Economia de R$ 200/mês").
    - priority: "urgente", "importante" ou "informativo".
    - type: "alerta", "sugestao", "padrao" ou "oportunidade".
    - category: A categoria financeira relacionada.
    - value: Valor financeiro associado (opcional).
    - patternDetected: Descrição do padrão identificado (opcional).

    Retorne APENAS um array JSON de objetos StrategicInsight.
    Contexto: ${context}
  `;

  let text = "";
  try {
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
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
  const context = `
    Usuário: ${userProfile.displayName || "Usuário"}
    Score Atual: ${userProfile.financialScore || 0}
    Renda Mensal: ${data.transactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.value, 0)}
    Despesas Mensais: ${data.transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.value, 0)}
    Saldo Total: ${data.accounts.reduce((acc, a) => acc + a.balance, 0)}
    Dívidas Ativas: ${data.debts.filter(d => d.status === "ativa").length}
    Metas Ativas: ${data.goals.filter(g => g.status === "active").length}
    Patrimônio: ${data.wealth?.reduce((acc: number, w: any) => acc + w.value, 0) || 0}
  `;

  const prompt = `
    Como um Consultor Financeiro Expert, realize um diagnóstico completo da saúde financeira deste usuário.
    Analise os dados fornecidos e gere um relatório estruturado em JSON com as seguintes chaves:
    - analysis: Um texto curto (2-3 parágrafos) resumindo a situação atual.
    - strengths: Uma lista de pontos fortes encontrados.
    - weaknesses: Uma lista de pontos fracos encontrados.
    - risks: Uma lista de riscos financeiros detectados.
    - recommendations: Uma lista de ações práticas para melhorar o score e a saúde financeira.

    Contexto: ${context}
    Seja direto, profissional e motivador.
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
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
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
  },
  userMessage: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[] = []
) {
  try {
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS[mode as keyof typeof SYSTEM_INSTRUCTIONS] || SYSTEM_INSTRUCTIONS.copiloto,
        tools: mode === "copiloto" ? tools : undefined,
      },
      contents: [
        ...history,
        {
          role: "user",
          parts: [
            {
              text: `CONTEXTO FINANCEIRO ATUAL:
              Perfil: ${JSON.stringify(userProfile)}
              Saldo Total: ${data.accounts.reduce((acc, a) => acc + a.balance, 0)}
              Contas: ${JSON.stringify(data.accounts.map(a => ({ name: a.name, balance: a.balance, type: a.type })))}
              Metas: ${JSON.stringify(data.goals.map(g => ({ name: g.name, target: g.targetValue, current: g.currentValue, deadline: g.deadline })))}
              Dívidas: ${JSON.stringify(data.debts.map(d => ({ name: d.name, remaining: d.remainingValue, interest: d.interestRate })))}
              Orçamento: ${JSON.stringify(data.budget || [])}
              Diagnóstico Atual: ${JSON.stringify(data.diagnosis || {})}
              Insígnias Conquistadas: ${JSON.stringify(data.badges || [])}
              Planejamento de Vida: ${JSON.stringify(data.lifePlan || {})}
              Família: ${JSON.stringify(data.family || [])}
              Patrimônio: ${JSON.stringify(data.wealth || [])}
              Assinaturas Mensais: ${JSON.stringify(data.subscriptions.map(s => ({ name: s.name, value: s.value })))}
              Transações Recentes (últimas 50): ${JSON.stringify(data.transactions.slice(0, 50).map(t => ({ desc: t.title || t.establishment, val: t.value, type: t.type, cat: t.category, date: t.date })))}
              
              RESUMO DE GASTOS POR CATEGORIA (Mês Atual): ${JSON.stringify(
                data.transactions
                  .filter(t => t.type === "expense" && new Date(t.date).getMonth() === new Date().getMonth() && new Date(t.date).getFullYear() === new Date().getFullYear())
                  .reduce((acc: any, t) => {
                    acc[t.category] = (acc[t.category] || 0) + t.value;
                    return acc;
                  }, {})
              )}
              RESUMO DE GASTOS POR CATEGORIA (Mês Anterior): ${JSON.stringify(
                data.transactions
                  .filter(t => {
                    const d = new Date(t.date);
                    const now = new Date();
                    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                    return t.type === "expense" && d.getMonth() === prevMonth && d.getFullYear() === prevYear;
                  })
                  .reduce((acc: any, t) => {
                    acc[t.category] = (acc[t.category] || 0) + t.value;
                    return acc;
                  }, {})
              )}
              
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

function generateLocalCopilotResponse(
  userMessage: string,
  data: any,
  userProfile: any
): string {
  const query = (userMessage || "").toLowerCase();
  const accounts = data?.accounts || [];
  const transactions = data?.transactions || [];
  const debts = data?.debts || [];
  const goals = data?.goals || [];

  const totalBalance = accounts.reduce((acc: number, a: any) => acc + (a.balance || 0), 0);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate());

  const currentMonthExpenses = transactions
    .filter((t: any) => t.type === "expense" && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear())
    .reduce((acc: number, t: any) => acc + (t.value || 0), 0);

  const currentMonthIncomes = transactions
    .filter((t: any) => t.type === "income" && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear())
    .reduce((acc: number, t: any) => acc + (t.value || 0), 0);

  const totalDebts = debts.filter((d: any) => d.status === "ativa").reduce((acc: number, d: any) => acc + (d.remainingValue || 0), 0);

  const expensesByCategory: Record<string, number> = {};
  transactions
    .filter((t: any) => t.type === "expense" && new Date(t.date).getMonth() === now.getMonth())
    .forEach((t: any) => {
      const cat = t.category || "Outros";
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (t.value || 0);
    });
  const topCategories = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);

  if (query.includes("quanto posso gastar") || query.includes("gastar hoje") || query.includes("limite diario")) {
    const safeDaily = Math.max(0, (totalBalance - (totalDebts > 0 ? totalDebts * 0.1 : 0)) / remainingDays);
    return `### 💡 Limite de Gasto Sugerido para Hoje\n\n- **Saldo total em contas:** R$ ${totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n- **Dias restantes no mês:** ${remainingDays} dias\n- **Valor seguro diário:** **R$ ${safeDaily.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**\n\n> **Dica do Copiloto:** Mantendo seus gastos médios dentro desse valor diário, você fecha o mês com saldo positivo e sem comprometer suas reservas!`;
  }

  if (query.includes("gastando muito") || query.includes("gasto muito") || query.includes("estou gastando")) {
    const isSpendingHigh = currentMonthExpenses > currentMonthIncomes && currentMonthIncomes > 0;
    const topCatText = topCategories.length > 0 
      ? `A sua maior despesa deste mês é **${topCategories[0][0]}** (R$ ${topCategories[0][1].toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).` 
      : "Você ainda não possui muitas despesas registradas este mês.";

    return `### 📊 Análise do Seu Ritmo de Gastos\n\n- **Receitas este mês:** R$ ${currentMonthIncomes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n- **Despesas este mês:** R$ ${currentMonthExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n- **Balanço líquido:** R$ ${(currentMonthIncomes - currentMonthExpenses).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n${topCatText}\n\n${isSpendingHigh ? "⚠️ **Atenção:** Suas despesas do mês superaram suas receitas até o momento. Recomendamos segurar gastos não essenciais nas próximas semanas." : "✅ **Boa notícia:** Suas despesas estão controladas e abaixo das receitas deste mês!"}`;
  }

  if (query.includes("divida") || query.includes("dividas") || query.includes("sair das dívidas")) {
    if (totalDebts === 0) {
      return `### 🛡️ Situação de Dívidas\n\nParabéns! Você **não possui dívidas ativas registradas** no sistema! 🎉\n\nO próximo passo ideal é focar na formação da sua **Reserva de Emergência** e começar a investir em metas de médio/longo prazo.`;
    }
    return `### 🎯 Plano Estratégico para Quitar Dívidas\n\n- **Total em dívidas ativas:** R$ ${totalDebts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n- **Quantidade de dívidas:** ${debts.filter((d: any) => d.status === "ativa").length}\n\n**Passo a passo recomendado:**\n1. **Método Avalanche:** Priorize quitar primeiro a dívida com maior taxa de juros para estancar os custos financeiros.\n2. **Renegociação:** Entre em contato com credores para descontos em pagamentos à vista.\n3. **Corte temporário:** Reduza 15% a 20% das despesas não essenciais deste mês e direcione a diferença diretamente para amortização.`;
  }

  if (query.includes("resumo") || query.includes("resumo deste mês") || query.includes("balanço")) {
    const topList = topCategories.slice(0, 3).map(([c, v]) => `- **${c}:** R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`).join("\n");
    return `### 📑 Resumo Financeiro do Mês\n\n- **Receitas Totais:** R$ ${currentMonthIncomes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n- **Despesas Totais:** R$ ${currentMonthExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n- **Saldo Restante:** R$ ${(currentMonthIncomes - currentMonthExpenses).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n- **Saldo em Contas:** R$ ${totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n**Principais Categorias de Gastos:**\n${topList || "Nenhuma despesa expressiva registrada."}\n\n- **Metas ativas:** ${goals.length} metas configuradas.`;
  }

  return `### 💡 Análise do Copiloto Financeiro\n\nAnalisei seus dados em tempo real:\n- **Saldo Geral:** R$ ${totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n- **Receitas (Mês):** R$ ${currentMonthIncomes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n- **Despesas (Mês):** R$ ${currentMonthExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n- **Dívidas Ativas:** R$ ${totalDebts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\nVocê pode clicar nos botões rápidos abaixo ou me perguntar sobre seus gastos, limites e dívidas!`;
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
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Especialista em Recuperação de Crédito e Planejamento Financeiro de elite. 
        Sua tarefa é analisar uma dívida específica e determinar o grau de URGÊNCIA, a PRIORIDADE de pagamento e o RISCO.
        
        Critérios de Análise:
        1. Juros: Taxas acima de 5% a.m. são críticas (Cartão de Crédito, Cheque Especial).
        2. Atraso: Dívidas já vencidas têm urgência máxima.
        3. Impacto no Orçamento: Qual a porcentagem da renda que a parcela consome? (>30% é perigoso).
        4. Tipo de Dívida: Financiamentos (casa/carro) têm garantia, cartões não mas juros são maiores.
        5. Relação Dívida/Renda: O total da dívida em relação à renda anual.
        6. Crescimento: Se os juros acumulados estão crescendo rápido demais em relação ao principal.
        
        Classificações de Urgência: critica, alta, moderada, baixa.
        Classificações de Prioridade: alta, media, baixa.
        Grau de Urgência: 0 a 100 (onde 100 é urgência máxima).
        Nível de Risco: baixo, medio, alto, critico.
        
        Retorne APENAS um JSON no formato:
        {
          "urgency": "critica" | "alta" | "moderada" | "baixa",
          "urgencyScore": number,
          "urgencyReason": "Explicação técnica e direta do porquê desta urgência",
          "priority": "alta" | "media" | "baixa",
          "priorityReason": "Explicação estratégica de por que pagar esta dívida agora ou depois",
          "riskLevel": "baixo" | "medio" | "alto" | "critico",
          "riskReason": "Explicação do risco de inadimplência ou crescimento da dívida"
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
              Data Atual: ${new Date().toISOString()}`
            }
          ]
        }
      ]
    });

    const result = safeJsonParse(response.text || "", fallback, "Debt Urgency");
    // Ensure values are valid
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
      avalanche: { savings: 0, timeMonths: 12, pros: ["Economia de juros"], cons: ["Demora para quitar a primeira"] },
      snowball: { savings: 0, timeMonths: 14, pros: ["Motivação rápida"], cons: ["Paga mais juros"] }
    },
    steps: ["Liste todas as dívidas", "Negocie juros", "Pague o mínimo de todas e o máximo na prioritária"],
    estimatedTimeMonths: 12,
    potentialSavings: 0,
    priorityList: []
  };

  try {
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Estrategista Financeiro especializado em quitação de dívidas. 
        Sua tarefa é analisar a lista de dívidas do usuário e propor uma estratégia otimizada de pagamento, comparando os métodos Avalanche e Bola de Neve.
        
        Considere:
        1. Método Avalanche: Focar na dívida com maior taxa de juros primeiro (matematicamente mais eficiente).
        2. Método Bola de Neve: Focar na dívida de menor valor para ganhar motivação psicológica (comportamentalmente mais eficiente).
        3. Capacidade de Pagamento: Quanto sobra da renda após gastos fixos.
        4. Economia de Juros: Calcule a economia estimada ao antecipar pagamentos.
        
        Retorne APENAS um JSON no formato:
        {
          "strategyName": "Avalanche" | "Bola de Neve" | "Híbrida",
          "explanation": "Por que esta estratégia é a melhor para este usuário?",
          "comparison": {
            "avalanche": { "savings": number, "timeMonths": number, "pros": string[], "cons": string[] },
            "snowball": { "savings": number, "timeMonths": number, "pros": string[], "cons": string[] }
          },
          "steps": string[],
          "estimatedTimeMonths": number,
          "potentialSavings": number (estimativa de quanto economizará em juros),
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
  const fallback = {
    securityLevel: "risco",
    score: 50,
    alerts: ["Não foi possível realizar a análise completa."],
    recommendations: ["Mantenha sua reserva em liquidez diária."],
    crisisAnalysis: "Sua reserva atual cobre aproximadamente 3 meses de gastos essenciais."
  };

  try {
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Especialista em Gestão de Riscos e Segurança Financeira. 
        Sua tarefa é analisar a Proteção Financeira do usuário e gerar alertas e recomendações.
        
        Critérios:
        1. Reserva vs Custo de Vida: Ter menos de 3 meses é risco.
        2. Dívidas: Dívidas altas reduzem a segurança.
        3. Dependência: Mais dependentes exigem reserva maior.
        4. Tipo de Renda: Renda variável exige reserva de 12 meses.
        
        Retorne APENAS um JSON no formato:
        {
          "securityLevel": "critico" | "risco" | "estavel" | "seguro",
          "score": number (0-100),
          "alerts": string[],
          "recommendations": string[],
          "crisisAnalysis": "Análise de quanto tempo o usuário sobreviveria em crise total"
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Dados de Proteção: ${JSON.stringify(data)}
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
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Especialista em Gestão de Crédito e Cobrança de elite. 
        Sua tarefa é analisar o risco de inadimplência de um empréstimo ou conta a receber e prever o comportamento de pagamento.
        
        Critérios de Análise:
        1. Tempo decorrido vs tempo para vencimento.
        2. Valor em relação a um perfil médio de empréstimo pessoal.
        3. Histórico do devedor (se disponível): atrasos anteriores, total já pago.
        4. Comportamento de pagamento: frequência e pontualidade.
        
        Retorne APENAS um JSON no formato:
        {
          "risk": "baixo" | "medio" | "alto" | "critico",
          "reason": "Explicação técnica e direta (ex: 'Alto risco: histórico de atrasos + valor alto')",
          "priority": "cobrar_agora" | "cobrar_em_breve" | "pode_aguardar",
          "probabilityOfReceiving": number (0-100),
          "estimatedReceiptDate": "YYYY-MM-DD" (data estimada real de recebimento),
          "probableDelayDays": number (dias de atraso provável em relação ao vencimento),
          "aiAnalysis": "Análise detalhada do comportamento de pagamento e impacto financeiro"
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Dados do Recebível: ${JSON.stringify(receivable)}
              Dados do Devedor: ${JSON.stringify(debtor || "Não disponível")}
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
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Analista de Crédito Bancário. 
        Sua tarefa é avaliar a confiabilidade de um devedor e recomendar um limite de crédito seguro.
        
        Critérios:
        1. Taxa de atraso (delayRate).
        2. Total emprestado vs Total recebido.
        3. Frequência de empréstimos e pagamentos.
        4. Tempo médio de pagamento.
        
        Retorne APENAS um JSON no formato:
        {
          "reliability": "alta" | "media" | "baixa" | "critica",
          "recommendedLimit": number (valor sugerido para novos empréstimos),
          "delayRate": number (0-100),
          "analysis": "Explicação do perfil de pagador"
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
  const defaultMsg = `Olá ${debtor?.name || receivable.personName}, passando para lembrar do valor de R$ ${receivable.remainingValue} referente ao ${receivable.type}.`;

  try {
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Assistente de Cobrança Inteligente. 
        Gere uma mensagem de cobrança para WhatsApp baseada no tom solicitado e no risco do devedor.
        
        Tons:
        - friendly: Amigável, leve, lembrete casual.
        - neutral: Profissional, direto, sem rodeios.
        - firm: Firme, sério, enfatizando o atraso e a necessidade de pagamento.
        
        Retorne APENAS o texto da mensagem formatado para WhatsApp (use emojis se apropriado).`,
      },
      contents: [
        {
          parts: [
            {
              text: `Recebível: ${JSON.stringify(receivable)}
              Devedor: ${JSON.stringify(debtor || { name: receivable.personName })}
              Tom solicitado: ${tone}
              Data Atual: ${new Date().toISOString()}`
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
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Analista de Renda e Estabilidade Financeira. 
        Analise o padrão de ganhos do usuário, a variação da renda e a tendência de crescimento ou queda.
        
        Retorne APENAS um JSON no formato:
        {
          "stability": "estavel" | "instavel" | "crescente" | "em_queda",
          "score": number (0-100),
          "analysis": "Análise detalhada do padrão de ganhos",
          "trend": "Sua renda está crescendo" | "Sua renda é instável" | "Sua renda está em queda" | "Sua renda está estável",
          "recommendations": string[]
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Transações de Receita: ${JSON.stringify(transactions.filter(t => t.type === "income").slice(0, 50))}
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
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Especialista em Comportamento de Consumo e Psicologia Financeira. 
        Analise os padrões de consumo, gastos por emoção, desperdícios e comportamento impulsivo.
        
        Retorne APENAS um JSON no formato:
        {
          "behavior": "controlado" | "impulsivo" | "emocional" | "excessivo",
          "score": number (0-100),
          "impulsiveRate": number (0-100),
          "emotionalAnalysis": "Análise de como as emoções afetam os gastos",
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
              text: `Transações de Despesa: ${JSON.stringify(transactions.filter(t => t.type === "expense").slice(0, 50))}
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
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Analista Financeiro de Alta Performance. 
        Sua tarefa é analisar o EXTRATO UNIFICADO do usuário e fornecer insights estratégicos.
        
        Analise:
        1. Equilíbrio entre Entradas e Saídas.
        2. Gastos atípicos ou picos de despesa.
        3. Categorias que estão consumindo mais recursos que o normal.
        4. Oportunidades de economia imediata.
        5. Alertas de duplicidade ou inconsistência (se houver).
        
        Retorne APENAS um JSON no formato:
        {
          "healthScore": number (0-100),
          "summary": "Resumo executivo da situação financeira do período",
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
              text: `Extrato de Transações: ${JSON.stringify(transactions.slice(0, 50))}
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
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Especialista em Recuperação de Crédito e Cobrança Inteligente. 
        Analise a carteira de recebíveis (dinheiro emprestado) do usuário e gere uma estratégia de cobrança eficaz.
        
        Retorne APENAS um JSON no formato:
        {
          "overallRisk": "baixo" | "medio" | "alto" | "critico",
          "totalToReceive": number,
          "expectedThisMonth": number,
          "strategies": [
            {
              "debtorName": "string",
              "priority": "cobrar_agora" | "cobrar_em_breve" | "pode_aguardar",
              "action": "string (ex: Enviar mensagem firme, Ligar, Aguardar)",
              "suggestedMessage": "string (uma sugestão de mensagem curta e eficaz)",
              "reason": "string (por que essa abordagem?)"
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
                totalEmprestado: d.totalLent
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
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Analista de Fluxo de Caixa e Movimentações Internas. 
        Sua tarefa é analisar as TRANSFERÊNCIAS entre contas do usuário e identificar padrões, 
        eficiência de alocação e possíveis otimizações.
        
        Analise:
        1. Frequência de transferências entre contas específicas.
        2. Volume de movimentação interna.
        3. Se as transferências parecem ser para cobrir saldos negativos ou para investimentos/reservas.
        4. Sugestões para automatizar ou reduzir a necessidade de movimentações manuais.
        
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
      model: "gemini-3.8-flash",
      contents: `Sugira 5 subcategorias lógicas para a categoria de finanças: "${categoryName}".
      Retorne APENAS um array JSON de strings. Exemplo: ["Sub1", "Sub2", "Sub3", "Sub4", "Sub5"]`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
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
    category: transaction.type === "income" ? "Outros" : "Outros",
    subCategory: "Geral",
    tags: [],
    reasoning: "Não foi possível gerar sugestões automáticas."
  };

  try {
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Assistente de Organização Financeira Inteligente. 
        Sua tarefa é sugerir a melhor CATEGORIA, SUBCATEGORIA e TAGS para uma transação.
        
        Regras:
        1. Use as categorias existentes se elas forem adequadas.
        2. Sugira subcategorias lógicas (ex: Categoria 'Alimentação' -> Subcategoria 'Restaurante' ou 'Mercado').
        3. Sugira tags úteis para análise (ex: #lazer, #trabalho, #essencial).
        4. Crie "Smart Tags" obrigatórias baseadas em:
           - Valor: #GastoAlto (se > R$ 500), #PequenoValor (se < R$ 50).
           - Comportamento: #Impulsivo (se for lazer/compras não planejado), #Essencial (se for moradia/saúde/transporte).
           - Frequência: #Recorrente (se houver transações similares no histórico), #Eventual (se for algo raro).
        
        Retorne APENAS um JSON no formato:
        {
          "category": "Nome da Categoria",
          "subCategory": "Nome da Subcategoria",
          "tags": string[],
          "reasoning": "Breve explicação da sugestão"
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
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Assistente de Organização Pessoal e Financeira. 
        Sua tarefa é analisar o histórico de transações do usuário e identificar padrões de gastos recorrentes que ainda não possuem lembretes configurados.
        
        Critérios:
        1. Identifique transações com descrições similares que ocorrem mensalmente (ex: Internet, Aluguel, Academia).
        2. Sugira a criação de um lembrete para essas contas.
        3. Verifique se o lembrete já existe na lista de lembretes atuais para evitar duplicidade.
        
        Retorne APENAS um JSON no formato:
        {
          "suggestions": [
            {
              "title": "string",
              "description": "string",
              "type": "financeiro" | "conta",
              "date": "YYYY-MM-DD" (próxima data provável),
              "recurrent": true,
              "frequency": "mensal",
              "priority": "media" | "alta",
              "reason": "Por que você está sugerindo isso? (ex: 'Você paga a Internet todo dia 10')"
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
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Especialista em Orçamento e Comportamento Financeiro. 
        Analise os orçamentos planejados versus os gastos reais do usuário.
        Identifique categorias com maior estouro, padrões mensais e dê recomendações para manter o orçamento sob controle.
        
        Retorne APENAS um JSON no formato:
        {
          "analysis": "Análise detalhada do cumprimento do orçamento",
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
              Transações do Mês: ${JSON.stringify(transactions.slice(0, 50))}
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
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Estrategista Financeiro e Planejador de Metas de elite. 
        Sua tarefa é analisar a carteira de objetivos do usuário e propor uma estratégia otimizada de aportes e priorização.
        
        Analise:
        1. Prioridade das metas (alta, media, baixa).
        2. Saúde das metas (atrasada, no ritmo, adiantada).
        3. Disponibilidade financeira (contas e fluxo de caixa).
        4. Impacto de dívidas ou gastos excessivos nas metas.
        
        Retorne APENAS um JSON no formato:
        {
          "prioritySuggestion": "Qual meta deve ser o foco principal agora e por quê?",
          "adjustments": "Sugestões de pausa, aceleração ou replanejamento de prazos",
          "healthCheck": "Análise geral do ritmo de conquista das metas",
          "futureVision": "Previsão de quando as principais metas serão atingidas se mantiver o ritmo atual",
          "tips": string[] (3 dicas práticas para otimizar os aportes)
        }`,
        responseMimeType: "application/json"
      },
      contents: [
        {
          parts: [
            {
              text: `Metas Atuais: ${JSON.stringify(goals)}
              Transações Recentes: ${JSON.stringify(transactions.slice(0, 30))}
              Contas: ${JSON.stringify(accounts)}
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

/**
 * Analisa o fluxo de caixa futuro e fornece insights estratégicos.
 */
export async function analyzeFutureCashFlow(
  projection: any[],
  accounts: any[],
  debts: any[],
  receivables: any[]
) {
  const prompt = `
    Analise o fluxo de caixa futuro (projeção de saldo) de um usuário e forneça insights estratégicos.
    
    Dados de Projeção (últimos 30-90 dias):
    ${JSON.stringify(projection.map(p => ({ date: p.date, balance: p.balance, income: p.income, expense: p.expense })))}
    
    Contas Atuais:
    ${JSON.stringify(accounts.map(a => ({ name: a.name, balance: a.balance })))}
    
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
    ${JSON.stringify(receivables.map(r => ({ name: r.personName, value: r.remainingValue, due: r.dueDate })))}
    
    Responda em JSON com o seguinte formato:
    {
      "diagnosis": "Resumo da saúde financeira futura",
      "risks": ["Lista de riscos detectados (ex: saldo negativo em X dias)"],
      "opportunities": ["Oportunidades (ex: antecipar pagamento, investir excesso)"],
      "suggestions": [
        { "title": "Título da sugestão", "description": "Explicação detalhada", "impact": "Alto/Médio/Baixo" }
      ],
      "futureVision": "Como as finanças estarão se nada for feito",
      "actionPlan": ["Passos práticos para melhorar o fluxo"]
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
      model: "gemini-3.8-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
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
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Estrategista de Vida e Planejador Financeiro de Elite. 
        Sua tarefa é analisar o Plano de Vida do usuário, as projeções financeiras de longo prazo e fornecer uma visão estratégica.
        
        Analise:
        1. Viabilidade do Plano: O usuário conseguirá atingir seus objetivos no horizonte definido?
        2. Riscos de Longo Prazo: Inflação, falta de diversificação, excesso de gastos, dívidas.
        3. Oportunidades: Aumentar aportes, mudar perfil de investimento, antecipar metas.
        4. Visão de Futuro: Como estará a vida financeira do usuário daqui a 5, 10, 20 anos?
        5. Plano de Ação: Passos concretos para o próximo ano.
        
        Retorne APENAS um JSON no formato:
        {
          "diagnosis": "Análise profunda da situação atual vs objetivos",
          "risks": string[],
          "opportunities": string[],
          "futureVision": "Descrição inspiradora e realista do futuro projetado",
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
              Objetivos Vinculados: ${JSON.stringify(goals.filter(g => lifePlan.linkedGoalIds.includes(g.id)))}
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

  Forneça uma análise estratégica curta e direta (máximo 3 frases) em português, identificando riscos de colapso financeiro ou sobrecarga excessiva.`;

  try {
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      contents: prompt,
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
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é um Especialista em Previsão Financeira e Gestão de Fluxo de Caixa. 
        Sua tarefa é analisar o CALENDÁRIO FINANCEIRO do usuário, identificar padrões, prever o saldo futuro e alertar sobre riscos.
        
        Analise:
        1. Padrões de gastos recorrentes.
        2. Dias com alta concentração de pagamentos (conflitos).
        3. Risco de saldo negativo em datas específicas.
        4. Sugestões de ajustes (ex: adiar um pagamento, antecipar um recebimento).
        
        Você deve retornar um JSON válido de acordo com o esquema solicitado.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiSuggestions: {
              type: Type.STRING,
              description: "Resumo estratégico e sugestões de ações"
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
 
  Forneça duas análises curtas e diretas em português (máximo 3 frases cada):
  1. aiSuggestions: Sugestões de como melhorar a distribuição da renda e acelerar as metas.
  2. balanceAnalysis: Análise de equilíbrio e justiça na contribuição de cada membro, identificando sobrecargas.
 
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
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
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

  let responseText = "";
  try {
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: `Você é o Copiloto Financeiro Inteligente definitivo. 
        Sua missão é analisar toda a vida financeira do usuário e gerar um Plano de Ação personalizado, prático e executável.
        
        Diretrizes Específicas para Dívidas:
        1. Analise o 'riskLevel' e 'urgencyScore' das dívidas. Priorize ações para dívidas com risco 'alto' ou 'critico'.
        2. Sugira antecipações de parcelas para dívidas com juros altos, mencionando a 'prepaymentSavings' (economia estimada).
        3. Se o usuário tiver saldo em conta e dívidas críticas, sugira o pagamento imediato ou amortização.
        4. Identifique se o usuário está seguindo a 'recommendedStrategy' (Avalanche ou Bola de Neve).
        
        Diretrizes Gerais:
        1. Identifique problemas reais (gastos excessivos, dívidas altas, parcelas atrasadas, falta de reserva, metas atrasadas, dependência familiar excessiva, assinaturas inúteis).
        2. Defina prioridades claras (urgente, importante, opcional).
        3. Gere ações práticas com título, descrição, porquê, valor sugerido, prazo e impacto.
        4. Crie uma sequência lógica de passos.
        5. Identifique se a ação é "executável" pelo sistema (ex: criar uma transação de pagamento de dívida ou aporte em meta).
        6. Seja empático, mas direto e focado em resultados.
        
        Retorne APENAS um JSON no formato:
        {
          "summary": "Resumo executivo da situação atual e do plano proposto",
          "actions": [
            {
              "title": "string",
              "description": "string",
              "why": "string (Por que essa ação foi sugerida?)",
              "suggestedValue": number | null,
              "deadline": "string (ex: 'Até o fim do mês', 'Imediato')",
              "impact": "string (ex: 'Redução de 10% nos juros', 'Criação de reserva')",
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
              text: `Perfil do Usuário: ${JSON.stringify(userProfile)}
              Contas: ${JSON.stringify(data.accounts)}
              Transações Recentes: ${JSON.stringify(data.transactions.slice(0, 50))}
              Metas: ${JSON.stringify(data.goals)}
              Dívidas: ${JSON.stringify(data.debts)}
              Parcelas de Dívidas: ${JSON.stringify(data.installments)}
              Orçamentos: ${JSON.stringify(data.budgets)}
              Cartões: ${JSON.stringify(data.cards)}
              Recebíveis: ${JSON.stringify(data.receivables)}
              Patrimônio: ${JSON.stringify(data.wealth)}
              Família: ${JSON.stringify(data.family)}
              Assinaturas: ${JSON.stringify(data.subscriptions)}
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

  const context = `
    Usuário: ${userProfile.displayName || "Usuário"}
    Renda Mensal Declarada: ${userProfile.onboardingData?.monthlyIncome || "Não especificada"}
    Limite Geral de Orçamento: ${userProfile.onboardingData?.fixedExpenses || "Não especificado"}
    Despesas Recentes (últimas 30 transações): ${JSON.stringify(
      transactions
        .filter(t => t.type === "expense")
        .slice(0, 30)
        .map(t => ({ desc: t.title || t.description, val: t.value, cat: t.category, date: t.date }))
    )}
    Orçamentos Configurados: ${JSON.stringify(
      budgets.map(b => ({ category: b.categoryName, planned: b.plannedValue, spent: b.spentValue }))
    )}
  `;

  const prompt = `
    Você é um assistente financeiro inteligente especializado em economia de dinheiro de forma saudável e realista.
    Com base no perfil do usuário e no histórico de consumo recente abaixo, crie uma única Dica do Dia de economia curta, extremamente personalizada, prática e acionável.
    Evite clichês genéricos como "coma menos fora". Analise os dados de consumo fornecidos para encontrar um padrão específico ou dar uma sugestão específica para este usuário.

    Retorne APENAS um objeto JSON no seguinte formato, sem formatação Markdown extra:
    {
      "title": "Título curto e chamativo para a dica",
      "tip": "Descrição curta, amigável e acionável (máximo 2 a 3 frases) em português.",
      "category": "A categoria relacionada ao gasto (ex: Alimentação, Transporte, Lazer, etc.)",
      "estimatedSavings": "Economia estimada realista baseada nos gastos (ex: 'R$ 40/mês', 'R$ 15/semana', ou semelhante)"
    }

    Dados do Usuário:
    ${context}
  `;

  try {
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "Você é um consultor de economia pessoal focado em microeconomia comportamental. Forneça respostas estritamente em formato JSON válido."
      }
    });

    const text = response.text || "";
    return safeJsonParse(text, fallback, "Tip of the Day");
  } catch (error) {
    handleAIError(error, "Tip of the Day");
    return fallback;
  }
}

