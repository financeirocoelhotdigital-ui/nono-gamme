import { generateContentServer, Type } from "./geminiClient";

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
    Analyze this receipt image and extract the following information:
    1. All visible text in the receipt (raw text).
    2. Structured data in JSON format:
       - establishment (name of the store/market)
       - date (in ISO format YYYY-MM-DD)
       - total (total value as a number)
       - items (list of products with name and value)
       - category (suggest one of the following categories: ${availableCategories.join(", ")})

    Return a JSON object with the fields: rawText, establishment, date, total, items, category.
    Return ONLY the JSON object.
  `;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };

  try {
    const response = await generateContentServer({
      model: "gemini-3.8-flash",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
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
