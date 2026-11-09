import React from "react";
import { Transaction, Account, Card, Emotion } from "../types";
import { cn, formatCurrency } from "../lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Repeat, 
  Landmark, 
  Target, 
  Trophy, 
  CreditCard, 
  Wallet, 
  Sparkles, 
  CheckCircle2, 
  History,
  MessageSquare,
  FileText
} from "lucide-react";
import { BankIcon } from "./BankIcon";

interface TransactionItemProps {
  transaction: Transaction;
  index: number;
  accounts: Account[];
  cards: Card[];
  filterAccount?: string;
  onSelect: () => void;
  onViewHistory: () => void;
  isReconciliationMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

// Visual definitions per category type to implement identity per type
export const getTransactionTypeIdentity = (t: Transaction) => {
  const catLower = t.category?.toLowerCase() || "";
  const titleLower = t.title?.toLowerCase() || t.notes?.toLowerCase() || "";
  
  // 1. Pagamento de Dívida (Debt Payment) -> Laranja (Orange)
  const isDebtPayment = 
    catLower.includes("dívida") || 
    catLower.includes("divida") || 
    catLower.includes("empréstimo") || 
    catLower.includes("emprestimo") || 
    titleLower.includes("pagamento de dívida") || 
    titleLower.includes("renegociação") || 
    t.tags?.some(tag => tag.toLowerCase().includes("divida") || tag.toLowerCase().includes("renegociacao"));

  if (isDebtPayment) {
    return {
      type: "debt" as const,
      color: "text-orange-600 bg-orange-50 border-orange-200",
      icon: Landmark,
      label: "Pagamento de Dívida"
    };
  }

  // 2. Meta (Goal contribution) -> Roxo (Purple)
  const isGoal = 
    catLower.includes("meta") || 
    catLower.includes("objetivo") || 
    titleLower.includes("meta") || 
    titleLower.includes("poupança") || 
    t.tags?.some(tag => tag.toLowerCase().includes("meta") || tag.toLowerCase().includes("objetivo"));

  if (isGoal) {
    return {
      type: "goal" as const,
      color: "text-purple-600 bg-purple-50 border-purple-200",
      icon: Target,
      label: "Reserva para Meta"
    };
  }

  // 3. Investimento (Investment) -> Turquesa (Turquoise)
  const isInvestment = 
    catLower.includes("investimento") || 
    titleLower.includes("investimento") || 
    t.tags?.some(tag => tag.toLowerCase().includes("investimento") || tag.toLowerCase().includes("investing"));

  if (isInvestment) {
    return {
      type: "investment" as const,
      color: "text-teal-600 bg-teal-50 border-teal-200",
      icon: Wallet,
      label: "Investimento"
    };
  }

  // 4. Cartão de Crédito (Credit card expense) -> Amarelo (Yellow)
  if (t.cardId) {
    return {
      type: "card" as const,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      icon: CreditCard,
      label: "Cartão de Crédito"
    };
  }

  // 5. Transferência (Transfer) -> Azul (Blue)
  if (t.type === "transfer") {
    return {
      type: "transfer" as const,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      icon: Repeat,
      label: "Transferência"
    };
  }

  // 6. Receita (Income) -> Verde (Green)
  if (t.type === "income") {
    return {
      type: "income" as const,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      icon: TrendingUp,
      label: "Receita"
    };
  }

  // 7. Despesa Padrão (Expense) -> Vermelho (Red)
  return {
    type: "expense" as const,
    color: "text-rose-600 bg-rose-50 border-rose-200",
    icon: TrendingDown,
    label: "Despesa"
  };
};

export function TransactionItem({ 
  transaction: t, 
  index, 
  accounts, 
  cards, 
  filterAccount,
  onSelect,
  onViewHistory,
  isReconciliationMode,
  isSelected,
  onToggleSelect
}: TransactionItemProps) {
  
  const account = accounts.find(a => a.id === t.accountId);
  const toAccount = accounts.find(a => a.id === t.toAccountId);
  const card = cards.find(c => c.id === t.cardId);
  const bankName = account?.institution || card?.bank;

  const identity = getTransactionTypeIdentity(t);
  const IconComponent = identity.icon;

  const isSent = filterAccount && filterAccount !== "all" && t.accountId === filterAccount;
  const isReceived = filterAccount && filterAccount !== "all" && t.toAccountId === filterAccount;

  const getTransferTitle = () => {
    if (isSent) return "Transferência enviada";
    if (isReceived) return "Transferência recebida";
    return t.notes || t.title || "Transferência";
  };

  const getTransferSubtitle = () => {
    if (isSent) return `Para: ${toAccount?.name || 'Conta destino'}`;
    if (isReceived) return `De: ${account?.name || 'Conta origem'}`;
    return `${account?.name || 'Origem'} ➔ ${toAccount?.name || 'Destino'}`;
  };

  const displayTitle = t.type === "transfer" 
    ? getTransferTitle() 
    : t.title || t.establishment || t.incomeSource || t.category;

  const displaySubtitle = t.type === "transfer" 
    ? getTransferSubtitle() 
    : t.category;

  // Formatting value with correct prefixes
  const getValueString = () => {
    const valStr = formatCurrency(t.value);
    if (t.type === "income") return `+ ${valStr}`;
    if (t.type === "transfer") {
      if (isSent) return `- ${valStr}`;
      if (isReceived) return `+ ${valStr}`;
      return valStr;
    }
    return `- ${valStr}`;
  };

  // Determining active value text colors based on context
  const getValueColor = () => {
    if (t.type === "income") return "text-emerald-600";
    if (t.type === "transfer") {
      if (isSent) return "text-rose-600";
      if (isReceived) return "text-emerald-600";
      return "text-blue-600";
    }
    return "text-rose-600";
  };

  return (
    <div
      onClick={(e) => {
        if (isReconciliationMode && onToggleSelect) {
          e.stopPropagation();
          onToggleSelect();
        } else {
          onSelect();
        }
      }}
      className={cn(
        "group relative flex items-center justify-between p-4 bg-white hover:bg-gray-50/80 border-b border-gray-100 last:border-b-0",
        "active:bg-gray-100/80 transition-colors cursor-pointer",
        isSelected && "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.05]"
      )}
    >
      {/* Left indicator line for reconciled status */}
      <div className={cn(
        "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full h-8 transition-colors",
        t.reconciled ? "bg-emerald-500" : "bg-amber-400 opacity-50"
      )} />

      <div className="flex items-center gap-3 flex-1 pl-2">
        {/* Bulk select check box */}
        {isReconciliationMode && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleSelect) onToggleSelect();
            }}
            className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer border",
              isSelected 
                ? "bg-emerald-600 border-emerald-600 text-white" 
                : "border-gray-300 hover:border-gray-400 bg-white"
            )}
          >
            {isSelected && <CheckCircle2 size={12} className="text-white" />}
          </div>
        )}

        <div className="relative shrink-0">
          <div className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105",
            identity.color
          )}>
            <IconComponent size={20} strokeWidth={2} />
          </div>
          {bankName && (
            <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-white shadow-sm overflow-hidden">
              <BankIcon bankName={bankName} className="h-4 w-4" size={10} />
            </div>
          )}
        </div>
        
        <div className="min-w-0 flex-1 ml-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight truncate max-w-[200px] sm:max-w-[300px]">
              {displayTitle}
            </h4>
            
            {t.isImpulsive && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-[9px] font-bold text-rose-600">
                Impulsivo
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-gray-500">
            <span className="text-[11px] font-medium truncate max-w-[120px]">
              {displaySubtitle}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="text-[11px] font-medium">
              {card ? card.name : account ? account.name : "Geral"}
            </span>
            
            {(t.notes || t.attachmentUrl || t.hasHistory) && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <div className="flex items-center gap-1">
                  {t.notes && <MessageSquare size={10} />}
                  {t.attachmentUrl && <FileText size={10} />}
                  {t.hasHistory && <History size={10} />}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0 ml-4">
        <div className={cn("text-sm font-bold tracking-tight", getValueColor())}>
          {getValueString()}
        </div>
        
        <div className="text-[10px] text-gray-400 font-medium mt-0.5">
          {new Date(t.date).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
          {t.totalInstallments && (
            <span className="ml-1 text-gray-500 font-semibold">
              ({t.currentInstallment}/{t.totalInstallments})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
