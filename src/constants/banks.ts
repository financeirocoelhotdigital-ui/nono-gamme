export interface BankInfo {
  id: string;
  name: string;
  fullName: string;
  color: string;
  icon: string;
  isPopular?: boolean;
}

export const BRAZILIAN_BANKS: BankInfo[] = [
  {
    id: "nubank",
    name: "Nubank",
    fullName: "Nubank S.A.",
    color: "#820ad1",
    icon: "/assets/banks/nubank.png",
    isPopular: true
  },
  {
    id: "itau",
    name: "Itaú",
    fullName: "Banco Itaú Unibanco S.A.",
    color: "#ec7000",
    icon: "/assets/banks/itau.png",
    isPopular: true
  },
  {
    id: "bradesco",
    name: "Bradesco",
    fullName: "Banco Bradesco S.A.",
    color: "#cc092f",
    icon: "/assets/banks/bradesco.png",
    isPopular: true
  },
  {
    id: "santander",
    name: "Santander",
    fullName: "Banco Santander (Brasil) S.A.",
    color: "#ec0000",
    icon: "/assets/banks/santander.png",
    isPopular: true
  },
  {
    id: "bb",
    name: "Banco do Brasil",
    fullName: "Banco do Brasil S.A.",
    color: "#fcfc30",
    icon: "/assets/banks/banco_do_brasil.png",
    isPopular: true
  },
  {
    id: "caixa",
    name: "Caixa",
    fullName: "Caixa Econômica Federal",
    color: "#005ca9",
    icon: "/assets/banks/caixa.png",
    isPopular: true
  },
  {
    id: "inter",
    name: "Inter",
    fullName: "Banco Inter S.A.",
    color: "#ff7a00",
    icon: "/assets/banks/inter.png",
    isPopular: true
  },
  {
    id: "c6",
    name: "C6 Bank",
    fullName: "C6 Bank S.A.",
    color: "#212121",
    icon: "/assets/banks/c6.png",
    isPopular: true
  },
  {
    id: "next",
    name: "Next",
    fullName: "Banco Next S.A.",
    color: "#00ff5f",
    icon: "/assets/banks/next.png"
  },
  {
    id: "original",
    name: "Original",
    fullName: "Banco Original S.A.",
    color: "#00a859",
    icon: "/assets/banks/original.png"
  },
  {
    id: "neon",
    name: "Neon",
    fullName: "Neon Pagamentos S.A.",
    color: "#00e5ff",
    icon: "/assets/banks/neon.png"
  },
  {
    id: "pagbank",
    name: "PagBank",
    fullName: "PagSeguro Internet S.A.",
    color: "#3d9b35",
    icon: "/assets/banks/pagbank.png"
  },
  {
    id: "picpay",
    name: "PicPay",
    fullName: "PicPay Serviços S.A.",
    color: "#21c25e",
    icon: "/assets/banks/picpay.png"
  },
  {
    id: "mercado_pago",
    name: "Mercado Pago",
    fullName: "Mercado Pago S.A.",
    color: "#009ee3",
    icon: "/assets/banks/mercado_pago.png"
  },
  {
    id: "will_bank",
    name: "Will Bank",
    fullName: "Will Bank S.A.",
    color: "#ffff00",
    icon: "/assets/banks/will_bank.png"
  },
  {
    id: "pan",
    name: "Banco Pan",
    fullName: "Banco Pan S.A.",
    color: "#00a9e0",
    icon: "/assets/banks/pan.png"
  },
  {
    id: "sofisa",
    name: "Sofisa Direto",
    fullName: "Banco Sofisa S.A.",
    color: "#004a80",
    icon: "/assets/banks/sofisa.png"
  },
  {
    id: "modalmais",
    name: "Modalmais",
    fullName: "Banco Modal S.A.",
    color: "#000000",
    icon: "/assets/banks/modalmais.png"
  },
  {
    id: "btg",
    name: "BTG Pactual",
    fullName: "Banco BTG Pactual S.A.",
    color: "#002b5c",
    icon: "/assets/banks/btg.png"
  },
  {
    id: "xp",
    name: "XP Investimentos",
    fullName: "XP Investimentos CCTVM S.A.",
    color: "#000000",
    icon: "/assets/banks/xp.png"
  },
  {
    id: "rico",
    name: "Rico",
    fullName: "Rico Investimentos",
    color: "#ff6b00",
    icon: "/assets/banks/rico.png"
  },
  {
    id: "clear",
    name: "Clear",
    fullName: "Clear Corretora",
    color: "#000000",
    icon: "/assets/banks/clear.png"
  },
  {
    id: "stone",
    name: "Stone",
    fullName: "Stone Pagamentos",
    color: "#00a859",
    icon: "/assets/banks/stone.png"
  },
  {
    id: "infinitepay",
    name: "InfinitePay",
    fullName: "CloudWalk",
    color: "#000000",
    icon: "/assets/banks/infinitepay.png"
  }
];

export const INTERNATIONAL_BANKS: BankInfo[] = [
  {
    id: "paypal",
    name: "PayPal",
    fullName: "PayPal Holdings, Inc.",
    color: "#003087",
    icon: "/assets/banks/paypal.png"
  },
  {
    id: "wise",
    name: "Wise",
    fullName: "Wise Payments Limited",
    color: "#00b9ff",
    icon: "/assets/banks/wise.png"
  },
  {
    id: "revolut",
    name: "Revolut",
    fullName: "Revolut Ltd",
    color: "#000000",
    icon: "/assets/banks/revolut.png"
  },
  {
    id: "stripe",
    name: "Stripe",
    fullName: "Stripe, Inc.",
    color: "#635bff",
    icon: "/assets/banks/stripe.png"
  },
  {
    id: "chase",
    name: "Chase",
    fullName: "JPMorgan Chase Bank",
    color: "#117aca",
    icon: "/assets/banks/chase.png"
  },
  {
    id: "bankofamerica",
    name: "Bank of America",
    fullName: "Bank of America Corporation",
    color: "#012169",
    icon: "/assets/banks/bankofamerica.png"
  }
];

export const GENERIC_BANKS: BankInfo[] = [
  {
    id: "carteira",
    name: "Carteira",
    fullName: "Dinheiro em Espécie",
    color: "#10b981",
    icon: "Wallet"
  },
  {
    id: "outro",
    name: "Outro",
    fullName: "Outra Instituição",
    color: "#6b7280",
    icon: "Bank"
  }
];

export const ALL_BANKS = [...BRAZILIAN_BANKS, ...INTERNATIONAL_BANKS, ...GENERIC_BANKS];

export function normalizeBankName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .replace(/[^\w]/g, ""); // Remove non-alphanumeric except underscore
}

export function getBankByName(name: string): BankInfo | undefined {
  const normalizedSearch = normalizeBankName(name);
  return ALL_BANKS.find(b => normalizeBankName(b.name) === normalizedSearch);
}

export function getBankById(id: string): BankInfo | undefined {
  return ALL_BANKS.find(b => b.id === id);
}
