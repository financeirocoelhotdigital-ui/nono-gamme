import { generateContentServer, Type } from "./geminiClient";

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
    Analise este arquivo de extrato bancário e extraia todas as transações.
    1. Identifique o nome do banco e o período do extrato.
    2. Extraia todas as transações com:
       - date (no formato ISO YYYY-MM-DD)
       - description (como aparece no extrato)
       - value (número absoluto, positivo)
       - type (income se for crédito/entrada, expense se for débito/saída)
       - category (sugira uma das seguintes categorias: ${availableCategories.join(", ")})

    Retorne um objeto JSON com os campos: bankName, period, transactions (array), rawText (todo o texto visível).
    Retorne APENAS o objeto JSON.
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
      model: "gemini-3.8-flash",
      contents: { parts: [filePart, { text: prompt }] },
      config: {
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
