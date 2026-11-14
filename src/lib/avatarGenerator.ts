import {
  AvatarAccessory,
  AvatarBackgroundMode,
  AvatarBaseStyle,
  AvatarConfig,
  AvatarExpression,
  AvatarFrameStyle,
  AvatarHairStyle,
  AvatarOutfit,
} from "../types";

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  style: "pessoa",
  bgColor: "#064E3B",
  bgColorSecondary: "#10B981",
  bgMode: "gradiente",
  frameStyle: "anel",
  frameColor: "#10B981",
  skinTone: "#E0AC69",
  hairStyle: "topete",
  hairColor: "#1E293B",
  expression: "sorridente",
  accessory: "nenhum",
  outfit: "blazer",
  outfitColor: "#0F172A",
};

export const AVATAR_BG_PALETTE = [
  { name: "Esmeralda", primary: "#064E3B", secondary: "#10B981" },
  { name: "Menta", primary: "#047857", secondary: "#34D399" },
  { name: "Ardósia", primary: "#0F172A", secondary: "#334155" },
  { name: "Oceano", primary: "#1E3A8A", secondary: "#3B82F6" },
  { name: "Dourado", primary: "#92400E", secondary: "#F59E0B" },
  { name: "Vinho", primary: "#881337", secondary: "#F43F5E" },
  { name: "Índigo", primary: "#312E81", secondary: "#6366F1" },
  { name: "Areia", primary: "#78350F", secondary: "#D97706" },
  { name: "Petroleo", primary: "#115E59", secondary: "#14B8A6" },
  { name: "Claro", primary: "#E2E8F0", secondary: "#CBD5E1" },
];

export const AVATAR_SKIN_TONES = [
  { name: "Porcelana", color: "#FDE2CC" },
  { name: "Claro Quente", color: "#F1C27D" },
  { name: "Médio Dourado", color: "#E0AC69" },
  { name: "Bronze", color: "#C68642" },
  { name: "Castanho", color: "#8D5524" },
  { name: "Retinto", color: "#5C3317" },
];

export const AVATAR_HAIR_COLORS = [
  { name: "Preto", color: "#1E293B" },
  { name: "Castanho Escuro", color: "#451A03" },
  { name: "Castanho Claro", color: "#78350F" },
  { name: "Loiro", color: "#D97706" },
  { name: "Ruivo", color: "#B45309" },
  { name: "Grisalho", color: "#94A3B8" },
  { name: "Esmeralda", color: "#059669" },
];

export const AVATAR_OUTFIT_COLORS = [
  { name: "Grafite", color: "#0F172A" },
  { name: "Esmeralda", color: "#065F46" },
  { name: "Azul Marinho", color: "#1E3A8A" },
  { name: "Bordô", color: "#881337" },
  { name: "Cinza Claro", color: "#64748B" },
  { name: "Branco", color: "#F8FAFC" },
  { name: "Terracota", color: "#9A3412" },
  { name: "Roxo", color: "#4C1D95" },
];

export const AVATAR_FRAME_COLORS = [
  { name: "Esmeralda", color: "#10B981" },
  { name: "Ouro", color: "#F59E0B" },
  { name: "Ardósia", color: "#334155" },
  { name: "Azul", color: "#3B82F6" },
  { name: "Coral", color: "#F43F5E" },
  { name: "Branco", color: "#FFFFFF" },
];

export interface AvatarPreset {
  id: string;
  label: string;
  config: AvatarConfig;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "executivo",
    label: "Executivo Esmeralda",
    config: {
      style: "pessoa",
      bgColor: "#064E3B",
      bgColorSecondary: "#10B981",
      bgMode: "gradiente",
      frameStyle: "anel",
      frameColor: "#10B981",
      skinTone: "#E0AC69",
      hairStyle: "topete",
      hairColor: "#1E293B",
      expression: "confiante",
      accessory: "oculos_classico",
      outfit: "blazer",
      outfitColor: "#0F172A",
    },
  },
  {
    id: "criativa",
    label: "Estilo Solar",
    config: {
      style: "pessoa",
      bgColor: "#92400E",
      bgColorSecondary: "#F59E0B",
      bgMode: "gradiente",
      frameStyle: "duplo",
      frameColor: "#F59E0B",
      skinTone: "#C68642",
      hairStyle: "cacheado",
      hairColor: "#451A03",
      expression: "sorridente",
      accessory: "oculos_redondo",
      outfit: "gola_alta",
      outfitColor: "#065F46",
    },
  },
  {
    id: "urbano",
    label: "Urbano Tech",
    config: {
      style: "pessoa",
      bgColor: "#0F172A",
      bgColorSecondary: "#334155",
      bgMode: "gradiente",
      frameStyle: "destaque",
      frameColor: "#3B82F6",
      skinTone: "#F1C27D",
      hairStyle: "curto",
      hairColor: "#78350F",
      expression: "piscadela",
      accessory: "fones",
      outfit: "moletom",
      outfitColor: "#1E3A8A",
    },
  },
  {
    id: "classica",
    label: "Elegância Minimal",
    config: {
      style: "pessoa",
      bgColor: "#115E59",
      bgColorSecondary: "#14B8A6",
      bgMode: "gradiente",
      frameStyle: "anel",
      frameColor: "#FFFFFF",
      skinTone: "#FDE2CC",
      hairStyle: "coque",
      hairColor: "#451A03",
      expression: "tranquilo",
      accessory: "nenhum",
      outfit: "blazer",
      outfitColor: "#881337",
    },
  },
  {
    id: "bot_fin",
    label: "Assistente Tech",
    config: {
      style: "bot",
      bgColor: "#064E3B",
      bgColorSecondary: "#0F172A",
      bgMode: "gradiente",
      frameStyle: "duplo",
      frameColor: "#10B981",
      skinTone: "#E2E8F0",
      hairStyle: "curto",
      hairColor: "#10B981",
      expression: "sorridente",
      accessory: "fones",
      outfit: "gola_alta",
      outfitColor: "#059669",
    },
  },
  {
    id: "monograma_ouro",
    label: "Monograma Premium",
    config: {
      style: "monograma",
      bgColor: "#0F172A",
      bgColorSecondary: "#064E3B",
      bgMode: "gradiente",
      frameStyle: "duplo",
      frameColor: "#F59E0B",
      skinTone: "#E0AC69",
      hairStyle: "curto",
      hairColor: "#F59E0B",
      expression: "confiante",
      accessory: "nenhum",
      outfit: "blazer",
      outfitColor: "#10B981",
    },
  },
];

function darkenHex(hex: string, amount = 0.18): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#0F172A";
  const r = Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function getInitials(name?: string): string {
  const clean = (name || "Bolso").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "B+";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function renderAvatarSvg(config: AvatarConfig, displayName?: string): string {
  const cfg = { ...DEFAULT_AVATAR_CONFIG, ...config };
  const bgFill =
    cfg.bgMode === "gradiente"
      ? `<defs>
          <linearGradient id="avBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${cfg.bgColor}" />
            <stop offset="100%" stop-color="${cfg.bgColorSecondary}" />
          </linearGradient>
        </defs>
        <rect width="160" height="160" fill="url(#avBgGrad)" />`
      : `<rect width="160" height="160" fill="${cfg.bgColor}" />`;

  if (cfg.style === "monograma") {
    const initials = getInitials(displayName);
    const textColor = cfg.bgColor === "#E2E8F0" ? "#0F172A" : "#FFFFFF";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
      ${bgFill}
      <circle cx="80" cy="80" r="62" fill="none" stroke="${cfg.frameColor}" stroke-opacity="0.28" stroke-width="2" />
      <circle cx="128" cy="34" r="14" fill="${cfg.outfitColor}" fill-opacity="0.22" />
      <text x="80" y="96" text-anchor="middle" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="52" font-weight="800" letter-spacing="-1" fill="${textColor}">${initials}</text>
    </svg>`;
  }

  if (cfg.style === "bot") {
    const bodyDark = darkenHex(cfg.outfitColor, 0.25);
    const visorEye =
      cfg.expression === "piscadela"
        ? `<circle cx="64" cy="76" r="6" fill="#34D399" />
           <path d="M90 76 Q97 70 104 76" stroke="#34D399" stroke-width="4" stroke-linecap="round" fill="none" />`
        : cfg.expression === "focado"
        ? `<rect x="57" y="73" width="15" height="6" rx="3" fill="#34D399" />
           <rect x="88" y="73" width="15" height="6" rx="3" fill="#34D399" />`
        : `<circle cx="64" cy="76" r="6.5" fill="#34D399" />
           <circle cx="96" cy="76" r="6.5" fill="#34D399" />`;

    const headphones =
      cfg.accessory === "fones"
        ? `<path d="M36 74 C36 42, 124 42, 124 74" stroke="#0F172A" stroke-width="6" fill="none" />
           <rect x="28" y="66" width="12" height="24" rx="6" fill="${cfg.frameColor}" />
           <rect x="120" y="66" width="12" height="24" rx="6" fill="${cfg.frameColor}" />`
        : "";

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
      ${bgFill}
      <line x1="80" y1="22" x2="80" y2="38" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round" />
      <circle cx="80" cy="19" r="6" fill="${cfg.frameColor}" />
      <path d="M34 160 C34 128, 52 118, 80 118 C108 118, 126 128, 126 160 Z" fill="${cfg.outfitColor}" />
      <path d="M62 118 L80 134 L98 118 Z" fill="${bodyDark}" />
      <rect x="40" y="38" width="80" height="72" rx="24" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2.5" />
      <rect x="50" y="56" width="60" height="38" rx="14" fill="#0F172A" />
      ${visorEye}
      <path d="M70 86 Q80 91 90 86" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" fill="none" />
      ${headphones}
    </svg>`;
  }

  // Estilo "pessoa"
  const skinShadow = darkenHex(cfg.skinTone, 0.14);
  const outfitDark = darkenHex(cfg.outfitColor, 0.2);

  // Back hair layer (longo / ondulado / cacheado)
  let backHair = "";
  if (cfg.hairStyle === "longo") {
    backHair = `<path d="M38 74 C36 40, 124 40, 122 74 L126 126 C116 132, 108 128, 106 116 L54 116 C52 128, 44 132, 34 126 Z" fill="${cfg.hairColor}" />`;
  } else if (cfg.hairStyle === "ondulado") {
    backHair = `<path d="M38 76 C34 38, 126 38, 122 76 C125 96, 118 110, 112 114 L48 114 C42 110, 35 96, 38 76 Z" fill="${cfg.hairColor}" />`;
  } else if (cfg.hairStyle === "cacheado") {
    backHair = `<g fill="${cfg.hairColor}">
      <circle cx="46" cy="56" r="15" />
      <circle cx="64" cy="40" r="16" />
      <circle cx="84" cy="36" r="17" />
      <circle cx="104" cy="44" r="15" />
      <circle cx="116" cy="60" r="14" />
      <circle cx="42" cy="76" r="13" />
      <circle cx="118" cy="76" r="13" />
    </g>`;
  } else if (cfg.hairStyle === "coque") {
    backHair = `<circle cx="80" cy="28" r="16" fill="${cfg.hairColor}" />`;
  }

  // Front hair layer
  let frontHair = "";
  if (cfg.hairStyle === "curto") {
    frontHair = `<path d="M44 68 C44 40, 116 40, 116 68 C110 54, 96 50, 80 50 C64 50, 50 54, 44 68 Z" fill="${cfg.hairColor}" />`;
  } else if (cfg.hairStyle === "topete") {
    frontHair = `<path d="M44 70 C42 42, 66 30, 88 32 C108 34, 118 48, 116 70 C110 55, 95 49, 76 52 C60 54, 50 59, 44 70 Z" fill="${cfg.hairColor}" />`;
  } else if (cfg.hairStyle === "ondulado") {
    frontHair = `<path d="M44 68 C44 42, 116 42, 116 68 C105 56, 94 50, 80 54 C66 50, 55 56, 44 68 Z" fill="${cfg.hairColor}" />`;
  } else if (cfg.hairStyle === "longo") {
    frontHair = `<path d="M44 68 C46 40, 114 40, 116 68 C104 53, 92 48, 80 53 C68 48, 56 53, 44 68 Z" fill="${cfg.hairColor}" />`;
  } else if (cfg.hairStyle === "coque") {
    frontHair = `<path d="M45 68 C46 42, 114 42, 115 68 C104 54, 90 50, 80 50 C70 50, 56 54, 45 68 Z" fill="${cfg.hairColor}" />`;
  } else if (cfg.hairStyle === "cacheado") {
    frontHair = `<path d="M46 66 C52 46, 108 46, 114 66 C100 54, 88 52, 80 54 C72 52, 60 54, 46 66 Z" fill="${cfg.hairColor}" />`;
  } else if (cfg.hairStyle === "raspado") {
    frontHair = `<path d="M46 64 C48 44, 112 44, 114 64" stroke="${cfg.hairColor}" stroke-opacity="0.35" stroke-width="3" fill="none" />`;
  }

  // Outfit
  let outfitSvg = "";
  if (cfg.outfit === "blazer") {
    outfitSvg = `
      <path d="M26 160 C28 126, 50 116, 80 116 C110 116, 132 126, 134 160 Z" fill="${cfg.outfitColor}" />
      <path d="M62 116 L80 156 L98 116 Z" fill="#F8FAFC" />
      <path d="M62 116 L71 142 L56 138 Z" fill="${outfitDark}" />
      <path d="M98 116 L89 142 L104 138 Z" fill="${outfitDark}" />
    `;
  } else if (cfg.outfit === "gola_alta") {
    outfitSvg = `
      <path d="M26 160 C28 126, 50 118, 80 118 C110 118, 132 126, 134 160 Z" fill="${cfg.outfitColor}" />
      <rect x="64" y="109" width="32" height="16" rx="6" fill="${outfitDark}" />
    `;
  } else if (cfg.outfit === "moletom") {
    outfitSvg = `
      <path d="M26 160 C28 126, 50 118, 80 118 C110 118, 132 126, 134 160 Z" fill="${cfg.outfitColor}" />
      <path d="M58 118 C64 130, 96 130, 102 118" stroke="${outfitDark}" stroke-width="5" fill="none" stroke-linecap="round" />
      <line x1="72" y1="128" x2="72" y2="146" stroke="#E2E8F0" stroke-width="2.5" stroke-linecap="round" />
      <line x1="88" y1="128" x2="88" y2="146" stroke="#E2E8F0" stroke-width="2.5" stroke-linecap="round" />
    `;
  } else {
    outfitSvg = `
      <path d="M26 160 C28 126, 50 118, 80 118 C110 118, 132 126, 134 160 Z" fill="${cfg.outfitColor}" />
      <path d="M64 118 Q80 132 96 118" fill="${cfg.skinTone}" />
    `;
  }

  // Facial expression
  let eyesAndMouth = "";
  const eyeColor = "#0F172A";
  const brows =
    cfg.expression === "focado"
      ? `<path d="M56 67 L70 70" stroke="${cfg.hairColor}" stroke-width="2.6" stroke-linecap="round" />
         <path d="M104 67 L90 70" stroke="${cfg.hairColor}" stroke-width="2.6" stroke-linecap="round" />`
      : `<path d="M56 68 Q64 64 71 68" stroke="${cfg.hairColor}" stroke-width="2.4" stroke-linecap="round" fill="none" />
         <path d="M89 68 Q96 64 104 68" stroke="${cfg.hairColor}" stroke-width="2.4" stroke-linecap="round" fill="none" />`;

  if (cfg.expression === "sorridente") {
    eyesAndMouth = `
      ${brows}
      <circle cx="64" cy="77" r="3.6" fill="${eyeColor}" />
      <circle cx="96" cy="77" r="3.6" fill="${eyeColor}" />
      <path d="M68 92 Q80 102 92 92 Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="1.6" stroke-linejoin="round" />
    `;
  } else if (cfg.expression === "piscadela") {
    eyesAndMouth = `
      ${brows}
      <circle cx="64" cy="77" r="3.6" fill="${eyeColor}" />
      <path d="M90 77 Q96 72 102 77" stroke="${eyeColor}" stroke-width="2.6" stroke-linecap="round" fill="none" />
      <path d="M70 93 Q80 100 90 92" stroke="#0F172A" stroke-width="2.4" stroke-linecap="round" fill="none" />
    `;
  } else if (cfg.expression === "tranquilo") {
    eyesAndMouth = `
      ${brows}
      <path d="M59 77 Q64 74 69 77" stroke="${eyeColor}" stroke-width="2.4" stroke-linecap="round" fill="none" />
      <path d="M91 77 Q96 74 101 77" stroke="${eyeColor}" stroke-width="2.4" stroke-linecap="round" fill="none" />
      <path d="M72 93 Q80 98 88 93" stroke="#0F172A" stroke-width="2.2" stroke-linecap="round" fill="none" />
    `;
  } else if (cfg.expression === "focado") {
    eyesAndMouth = `
      ${brows}
      <circle cx="64" cy="77" r="3.6" fill="${eyeColor}" />
      <circle cx="96" cy="77" r="3.6" fill="${eyeColor}" />
      <line x1="72" y1="94" x2="88" y2="94" stroke="#0F172A" stroke-width="2.4" stroke-linecap="round" />
    `;
  } else {
    // confiante
    eyesAndMouth = `
      ${brows}
      <circle cx="64" cy="77" r="3.6" fill="${eyeColor}" />
      <circle cx="96" cy="77" r="3.6" fill="${eyeColor}" />
      <path d="M69 92 Q80 100 92 91" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round" fill="none" />
    `;
  }

  // Accessories
  let accessorySvg = "";
  if (cfg.accessory === "oculos_classico") {
    accessorySvg = `
      <rect x="52" y="69" width="24" height="16" rx="4" fill="#FFFFFF" fill-opacity="0.18" stroke="#0F172A" stroke-width="2.5" />
      <rect x="84" y="69" width="24" height="16" rx="4" fill="#FFFFFF" fill-opacity="0.18" stroke="#0F172A" stroke-width="2.5" />
      <line x1="76" y1="76" x2="84" y2="76" stroke="#0F172A" stroke-width="2.5" />
    `;
  } else if (cfg.accessory === "oculos_redondo") {
    accessorySvg = `
      <circle cx="64" cy="77" r="11" fill="#FFFFFF" fill-opacity="0.18" stroke="#1E293B" stroke-width="2.4" />
      <circle cx="96" cy="77" r="11" fill="#FFFFFF" fill-opacity="0.18" stroke="#1E293B" stroke-width="2.4" />
      <line x1="75" y1="77" x2="85" y2="77" stroke="#1E293B" stroke-width="2.4" />
    `;
  } else if (cfg.accessory === "oculos_sol") {
    accessorySvg = `
      <rect x="51" y="69" width="25" height="16" rx="5" fill="#0F172A" />
      <rect x="84" y="69" width="25" height="16" rx="5" fill="#0F172A" />
      <line x1="76" y1="75" x2="84" y2="75" stroke="#0F172A" stroke-width="3" />
      <line x1="55" y1="73" x2="62" y2="73" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="1.8" stroke-linecap="round" />
      <line x1="88" y1="73" x2="95" y2="73" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="1.8" stroke-linecap="round" />
    `;
  } else if (cfg.accessory === "fones") {
    accessorySvg = `
      <path d="M40 74 C40 36, 120 36, 120 74" stroke="#0F172A" stroke-width="5" fill="none" />
      <rect x="33" y="67" width="10" height="22" rx="5" fill="${cfg.frameColor}" stroke="#0F172A" stroke-width="1.8" />
      <rect x="117" y="67" width="10" height="22" rx="5" fill="${cfg.frameColor}" stroke="#0F172A" stroke-width="1.8" />
    `;
  } else if (cfg.accessory === "bone") {
    accessorySvg = `
      <path d="M42 58 C44 33, 116 33, 118 58 Z" fill="${cfg.outfitColor}" />
      <path d="M40 57 L126 57 C128 63, 108 65, 92 61 L40 59 Z" fill="${outfitDark}" />
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    ${bgFill}
    ${backHair}
    ${outfitSvg}
    <rect x="69" y="102" width="22" height="22" rx="8" fill="${skinShadow}" />
    <circle cx="44" cy="79" r="7" fill="${skinShadow}" />
    <circle cx="116" cy="79" r="7" fill="${skinShadow}" />
    <rect x="46" y="45" width="68" height="68" rx="34" fill="${cfg.skinTone}" />
    <path d="M78 80 L76 86 L82 86" stroke="${skinShadow}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <circle cx="58" cy="86" r="5" fill="#F43F5E" fill-opacity="0.14" />
    <circle cx="102" cy="86" r="5" fill="#F43F5E" fill-opacity="0.14" />
    ${eyesAndMouth}
    ${frontHair}
    ${accessorySvg}
  </svg>`;
}

export function avatarConfigToDataUri(config: AvatarConfig, displayName?: string): string {
  const svg = renderAvatarSvg(config, displayName)
    .replace(/\s+/g, " ")
    .trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function generateRandomAvatarConfig(): AvatarConfig {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const bg = pick(AVATAR_BG_PALETTE);
  const styles: AvatarBaseStyle[] = ["pessoa", "pessoa", "pessoa", "bot", "monograma"];
  const hairStyles: AvatarHairStyle[] = ["curto", "ondulado", "longo", "cacheado", "coque", "topete", "raspado"];
  const expressions: AvatarExpression[] = ["sorridente", "confiante", "tranquilo", "piscadela", "focado"];
  const accessories: AvatarAccessory[] = ["nenhum", "nenhum", "oculos_classico", "oculos_redondo", "oculos_sol", "fones", "bone"];
  const outfits: AvatarOutfit[] = ["blazer", "camiseta", "moletom", "gola_alta"];
  const frames: AvatarFrameStyle[] = ["nenhuma", "anel", "duplo", "destaque"];
  const modes: AvatarBackgroundMode[] = ["gradiente", "solido"];

  return {
    style: pick(styles),
    bgColor: bg.primary,
    bgColorSecondary: bg.secondary,
    bgMode: pick(modes),
    frameStyle: pick(frames),
    frameColor: pick(AVATAR_FRAME_COLORS).color,
    skinTone: pick(AVATAR_SKIN_TONES).color,
    hairStyle: pick(hairStyles),
    hairColor: pick(AVATAR_HAIR_COLORS).color,
    expression: pick(expressions),
    accessory: pick(accessories),
    outfit: pick(outfits),
    outfitColor: pick(AVATAR_OUTFIT_COLORS).color,
  };
}

export function compressAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo de imagem."));
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida ou não suportada."));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        try {
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          resolve(compressed);
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
