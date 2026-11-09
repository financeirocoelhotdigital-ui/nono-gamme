import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseCurrencyInput(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  
  let str = String(value).trim();
  if (!str) return 0;

  // Remove currency prefix and unwanted non-numeric characters (except . and , and -)
  str = str.replace(/[R$\s]/g, "");

  // If contains both '.' and ','
  if (str.includes(".") && str.includes(",")) {
    if (str.indexOf(".") < str.indexOf(",")) {
      // Brazilian format: e.g. "5.000,50" or "1.250.000,00"
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: e.g. "5,000.50"
      str = str.replace(/,/g, "");
    }
    const res = parseFloat(str);
    return isNaN(res) ? 0 : res;
  }

  // If contains comma only: "5000,50" or "5,00" or "5000," -> comma is decimal
  if (str.includes(",")) {
    str = str.replace(",", ".");
    const res = parseFloat(str);
    return isNaN(res) ? 0 : res;
  }

  // If contains dot only: could be "5.000" (pt-BR thousands) or "50.000" or "5.50" (decimal)
  if (str.includes(".")) {
    const parts = str.split(".");
    if (parts.length > 2) {
      // Multiple dots: e.g. "1.000.000" -> thousand separators
      str = parts.join("");
    } else if (parts.length === 2) {
      // If exactly 3 digits after the dot (e.g. "5.000", "50.000", "500.000", "1.500")
      // In Brazil, dots with 3 digits are standard thousand separators!
      if (parts[1].length === 3 && parts[0].length >= 1) {
        str = parts[0] + parts[1]; // "5000"
      }
    }
  }

  const res = parseFloat(str);
  return isNaN(res) ? 0 : res;
}

export function formatCurrency(value: number | undefined | null, currencyCode?: string) {
  const safeValue = typeof value === "number" && !isNaN(value) ? value : 0;
  
  let codeStr = currencyCode;
  if (!codeStr) {
    try {
      const saved = localStorage.getItem('app_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.currency) codeStr = settings.currency;
      }
    } catch(e) {}
    if (!codeStr) codeStr = "BRL (R$)";
  }

  const code = codeStr.split(" ")[0]; // Extract BRL, USD, etc.
  const locale = code === "BRL" ? "pt-BR" : code === "USD" ? "en-US" : code === "EUR" ? "de-DE" : "en-GB";
  
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
  }).format(safeValue);
}

export function cleanData<T extends object>(data: T): T {
  const clean: any = {};
  Object.keys(data).forEach(key => {
    const val = (data as any)[key];
    if (val !== undefined) {
      clean[key] = val;
    }
  });
  return clean;
}

export function parseLocalDate(dateStr: string | Date | undefined | null): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }

  const cleanStr = String(dateStr).trim();
  if (!cleanStr) return null;

  // 1. Year-first format: YYYY-MM-DD or YYYY/MM/DD (ISO standard or year-first)
  const matchISO = cleanStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (matchISO) {
    const year = parseInt(matchISO[1], 10);
    const month = parseInt(matchISO[2], 10) - 1;
    const day = parseInt(matchISO[3], 10);
    return new Date(year, month, day, 12, 0, 0);
  }

  // 2. Day-first format: DD/MM/YYYY or DD-MM-YYYY (Brazilian/European standard)
  const matchBR = cleanStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (matchBR) {
    const day = parseInt(matchBR[1], 10);
    const month = parseInt(matchBR[2], 10) - 1;
    const year = parseInt(matchBR[3], 10);
    return new Date(year, month, day, 12, 0, 0);
  }

  // 3. Fallback for standard ISO timestamp or date string
  const d = new Date(cleanStr);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: string | Date | undefined | null, format?: string): string {
  if (!date) return "—";
  const d = parseLocalDate(date);
  if (!d) return "—";
  
  let formatStr = format;
  if (!formatStr) {
    try {
      const saved = localStorage.getItem('app_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.dateFormat) formatStr = settings.dateFormat;
      }
    } catch(e) {}
    if (!formatStr) formatStr = "DD/MM/AAAA";
  }

  const dayStr = d.getDate().toString().padStart(2, '0');
  const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
  const yearStr = d.getFullYear();

  if (formatStr === "MM/DD/AAAA") {
    return `${monthStr}/${dayStr}/${yearStr}`;
  } else if (formatStr === "AAAA-MM-DD") {
    return `${yearStr}-${monthStr}-${dayStr}`;
  }
  
  return `${dayStr}/${monthStr}/${yearStr}`;
}

export function formatDateForInput(dateStr?: string | Date | null): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const d = parseLocalDate(dateStr);
  if (!d) return new Date().toISOString().split("T")[0];
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDaysRemaining(dueDate: string | undefined | null) {
  if (!dueDate) return 0;
  const target = parseLocalDate(dueDate);
  if (!target) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function getMonthsRemaining(dueDate: string | undefined | null) {
  if (!dueDate) return 0;
  const target = parseLocalDate(dueDate);
  if (!target) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const diff = target.getTime() - today.getTime();
  const months = diff / (1000 * 60 * 60 * 24 * 30.44);
  return Math.max(0, Math.ceil(months));
}

export function getTimeSince(date: string | undefined | null) {
  if (!date) return "—";
  const target = parseLocalDate(date);
  if (!target) return "—";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const diff = today.getTime() - target.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return "Futuro";
  if (days === 0) return "Hoje";
  if (days < 30) return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

export function formatBillingPeriod(month: number, year: number) {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return `${months[month - 1]} ${year}`;
}

/**
 * Utility to compress an image file on the client side using Canvas.
 * Returns a Promise that resolves with a compressed base64 data URL.
 */
export function compressImage(file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions to maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with the requested quality (0.0 to 1.0)
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
}

