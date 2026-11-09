import React from "react";
import { getBankByName, normalizeBankName } from "../constants/banks";
import { cn } from "../lib/utils";
import { Landmark, Wallet, Banknote } from "lucide-react";

interface BankIconProps {
  bankName?: string;
  className?: string;
  size?: number;
}

export const BankIcon: React.FC<BankIconProps> = ({ bankName, className, size = 24 }) => {
  const [imgError, setImgError] = React.useState(false);
  const [defaultFallbackError, setDefaultFallbackError] = React.useState(false);
  const bank = bankName ? getBankByName(bankName) : null;

  const renderFallback = () => {
    if (bank) {
      if (bank.icon === "Wallet") return <Wallet size={size} />;
      if (bank.icon === "Banknote") return <Banknote size={size} />;
      
      // If we are here, it means the specific icon failed or doesn't exist
      // We try initials as a last resort if bank_default also fails
      return (
        <span className="font-bold text-xs uppercase" style={{ fontSize: size * 0.5 }}>
          {bank.name.substring(0, 2)}
        </span>
      );
    }
    return <Landmark size={size} />;
  };

  // If no bank is found, we try to normalize the name and see if we can find an icon path
  const normalizedName = bankName ? normalizeBankName(bankName) : "";
  const potentialIconPath = normalizedName ? `/assets/banks/${normalizedName}.png` : "";

  const iconSrc = bank?.icon && bank.icon.startsWith("/") ? bank.icon : potentialIconPath;

  if (iconSrc && !imgError) {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl overflow-hidden bg-white p-1", className)}>
        <img 
          src={iconSrc} 
          alt={bankName || "Bank"} 
          className="w-full h-full object-contain" 
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // If specific icon failed, try bank_default.png
  if (!defaultFallbackError && bankName && bankName !== "Carteira" && bankName !== "Dinheiro") {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl overflow-hidden bg-white p-1", className)}>
        <img 
          src="/assets/banks/bank_default.png" 
          alt="Default Bank" 
          className="w-full h-full object-contain" 
          referrerPolicy="no-referrer"
          onError={() => setDefaultFallbackError(true)}
        />
      </div>
    );
  }

  return (
    <div 
      className={cn("flex items-center justify-center rounded-2xl text-slate-900 p-2", className)}
      style={{ backgroundColor: bank?.color || "#6b7280" }}
    >
      {renderFallback()}
    </div>
  );
};
