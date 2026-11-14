import { generateContentServer, Type, ThinkingLevel } from "./geminiClient";

export interface ExtractedTransaction {
  date: string;
  description: string;
  value: number;
  type: "income" | "expense";
  category?: string;
}

export interface ExtractedStatementData {
  bankName: string;
  period: string;
  transactions: ExtractedTransaction[];
  rawText?: string;
}

export const extractDataFromStatement = async (
  fileBase64: string, 
  mimeType: string,
  availableCategories: string[]
): Promise<ExtractedStatementData> => {
  const prompt = `
    Analise este arquivo de extrato bancário ou fatura de cartão brasileiro e extraia TODAS as transações financeiras válidas (ignore linhas de "Saldo Anterior", "Saldo do Dia", "Limite Disponível" ou totais resumidos para não duplicar).
    1. Identifique o nome do banco/instituição e o período do extrato.
    2. Extraia cada transação com:
       - date: formato ISO YYYY-MM-DD (converta datas DD/MM/AAAA ou DD/MM para YYYY-MM-DD usando o ano do extrato).
       - description: descrição limpa e legível (ex: PIX, mercado, farmácia, assinatura, parcela 02/10).
       - value: valor numérico absoluto positivo (converta formato brasileiro 1.234,56 -> 1234.56).
       - type: "income" para créditos/entradas/PIX recebido/estornos; "expense" para débitos/saídas/compras/PIX enviado/boletos.
       - category: escolha a melhor categoria entre: ${availableCategories.join(", ") || "Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Assinaturas, Salário, Transferências, Outros"}.

    Retorne APENAS o objeto JSON válido com os campos: bankName, period, transactions, rawText.
  `;

  const filePart = {
    inlineData: {
      mimeType,
      data: fileBase64,
    },
  };

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("O processamento está demorando mais que o esperado. Tente um arquivo menor ou com menos páginas.")), 240000)
  );

  try {
    const responsePromise = generateContentServer({
      model: "gemini-4-hydrogen",
      contents: { parts: [filePart, { text: prompt }] },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bankName: { type: Type.STRING },
            period: { type: Type.STRING },
            rawText: { type: Type.STRING },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  description: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  type: { type: Type.STRING, enum: ["income", "expense"] },
                  category: { type: Type.STRING },
                },
                required: ["date", "description", "value", "type"],
              },
            },
          },
          required: ["bankName", "period", "transactions"],
        },
      },
    });

    const response = await Promise.race([responsePromise, timeoutPromise]) as any;

    const text = response.text;
    if (!text) throw new Error("Não foi possível extrair dados do extrato");

    return JSON.parse(text) as ExtractedStatementData;
  } catch (error) {
    if (error instanceof Error && error.message.includes("demorando mais que o esperado")) {
      throw error;
    }
    console.warn("Notice in statement extraction:", error);
    throw new Error("Erro ao processar o arquivo. Verifique se o arquivo não é muito grande ou complexo.");
  }
};
