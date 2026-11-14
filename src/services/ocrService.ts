import { generateContentServer, Type, ThinkingLevel } from "./geminiClient";

export interface ExtractedReceiptData {
  establishment: string;
  date: string;
  total: number;
  items: { name: string; value: number }[];
  category?: string;
  rawText?: string;
}

export const extractDataFromReceipt = async (base64Image: string, availableCategories: string[]): Promise<ExtractedReceiptData> => {
  const prompt = `
    Analise esta imagem de nota fiscal, cupom fiscal ou comprovante (PIX, cartão, mercado) e extraia com máxima precisão:
    1. Todo o texto visível no documento (rawText).
    2. Dados estruturados em JSON:
       - establishment: nome do estabelecimento / recebedor.
       - date: data da compra no formato ISO YYYY-MM-DD (converta DD/MM/YYYY para YYYY-MM-DD; se não houver data visível, use ${new Date().toISOString().split("T")[0]}).
       - total: valor total numérico (ex: R$ 1.250,40 -> 1250.40).
       - items: lista de itens/produtos com nome e valor numérico (se não houver itens discriminados, crie 1 item com o resumo da compra e o valor total).
       - category: escolha a melhor categoria entre: ${availableCategories.join(", ") || "Alimentação, Mercado, Transporte, Saúde, Lazer, Compras, Outros"}.

    Retorne APENAS o objeto JSON válido.
  `;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };

  try {
    const response = await generateContentServer({
      model: "gemini-4-hydrogen",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rawText: { type: Type.STRING },
            establishment: { type: Type.STRING },
            date: { type: Type.STRING },
            total: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                },
                required: ["name", "value"],
              },
            },
            category: { type: Type.STRING },
          },
          required: ["rawText", "establishment", "date", "total", "items"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Could not extract data from receipt");

    return JSON.parse(text) as ExtractedReceiptData;
  } catch (error) {
    console.warn("Notice in receipt OCR:", error);
    throw new Error("Erro ao processar imagem da nota fiscal.");
  }
};
