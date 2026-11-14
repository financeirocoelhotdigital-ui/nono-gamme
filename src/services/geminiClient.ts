export enum Type {
  TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED",
  STRING = "STRING",
  NUMBER = "NUMBER",
  INTEGER = "INTEGER",
  BOOLEAN = "BOOLEAN",
  ARRAY = "ARRAY",
  OBJECT = "OBJECT",
  NULL = "NULL",
}

export enum ThinkingLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  XHIGH = "XHIGH",
}

export interface Schema {
  type?: Type;
  description?: string;
  enum?: string[];
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
}

export interface FunctionDeclaration {
  name: string;
  description?: string;
  parameters?: Schema;
}

export interface GenerateContentParams {
  model?: string;
  contents: any;
  config?: any;
}

export interface GenerateContentResponse {
  text: string;
  functionCalls?: any;
  modelUsed?: string;
  temporaryUnavailable?: boolean;
  notice?: string;
}

export async function generateContentServer(params: GenerateContentParams): Promise<GenerateContentResponse> {
  const requested = params.model;
  const isInvalid =
    !requested ||
    requested.includes("3.8") ||
    requested.includes("3.7") ||
    requested.includes("3.6") ||
    requested.includes("3.5") ||
    requested.includes("2.5") ||
    requested.includes("1.5") ||
    requested.includes("2.0") ||
    requested.includes("flash-latest") ||
    requested.includes("pro");
  const model = isInvalid ? "gemini-4-hydrogen" : requested;

  let lastError: any = null;
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          contents: params.contents,
          config: params.config,
        }),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (_) {}
        const errMsg = errorData?.error || `Gemini API request failed with status ${response.status}`;
        const err = new Error(errMsg);
        (err as any).status = response.status;
        (err as any).code = errorData?.code;
        throw err;
      }

      const data = await response.json();
      return {
        text: data.text || "",
        functionCalls: data.functionCalls || undefined,
        modelUsed: data.modelUsed,
        temporaryUnavailable: data.temporaryUnavailable,
        notice: data.notice,
      };
    } catch (error: any) {
      lastError = error;
      const msg = String(error?.message || "");
      const isTransient =
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("503") ||
        msg.includes("502") ||
        msg.includes("504") ||
        msg.includes("high demand") ||
        error?.status === 503 ||
        error?.status === 429;

      if (attempt < maxAttempts - 1 && isTransient) {
        await new Promise((r) => setTimeout(r, 1000 + Math.random() * 500));
        continue;
      }
      break;
    }
  }

  return {
    text: "",
    functionCalls: undefined,
    temporaryUnavailable: true,
    notice: lastError?.message,
  };
}
