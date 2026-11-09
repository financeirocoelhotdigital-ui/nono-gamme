import React from "react";
import { Sliders, Eye, EyeOff, Pin, ArrowUp, ArrowDown, Check, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";

export interface DashboardCard {
  id: string;
  title: string;
  visible: boolean;
  pinned: boolean;
}

interface DashboardPersonalizePanelProps {
  layout: DashboardCard[];
  onToggleVisibility: (id: string) => void;
  onTogglePin: (id: string) => void;
  onMoveCard: (index: number, direction: "up" | "down") => void;
  onReset: () => void;
  onClose: () => void;
}

export function DashboardPersonalizePanel({
  layout,
  onToggleVisibility,
  onTogglePin,
  onMoveCard,
  onReset,
  onClose,
}: DashboardPersonalizePanelProps) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-xl space-y-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
      
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-slate-900" />
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Personalizar Dashboard</h3>
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
            Organize, fixe ou oculte os painéis da sua tela inicial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            title="Restaurar padrão"
            className="p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-50 rounded-xl transition-all"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-sm"
          >
            Concluir
          </button>
        </div>
      </div>

      <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
        {layout.map((card, idx) => (
          <div
            key={card.id}
            className={cn(
              "flex items-center justify-between p-3.5 rounded-2xl border transition-all",
              card.visible 
                ? "bg-gray-50/50 border-gray-100 hover:border-gray-200" 
                : "bg-gray-100/30 border-dashed border-gray-200 opacity-60"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-gray-400 w-5 text-right">{idx + 1}.</span>
              <span className={cn(
                "text-xs font-bold",
                card.visible ? "text-slate-900" : "text-gray-400 line-through"
              )}>
                {card.title}
              </span>
              {card.pinned && (
                <span className="text-[8px] font-black text-emerald-600 bg-white px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                  <Pin size={8} /> Fixado
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Move Buttons */}
              <button
                disabled={idx === 0}
                onClick={() => onMoveCard(idx, "up")}
                className="p-1.5 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                title="Mover para cima"
              >
                <ArrowUp size={14} />
              </button>
              <button
                disabled={idx === layout.length - 1}
                onClick={() => onMoveCard(idx, "down")}
                className="p-1.5 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                title="Mover para baixo"
              >
                <ArrowDown size={14} />
              </button>

              <div className="h-4 w-px bg-gray-200 mx-1"></div>

              {/* Pin Toggle */}
              <button
                onClick={() => onTogglePin(card.id)}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  card.pinned 
                    ? "bg-emerald-50 text-slate-900 hover:bg-emerald-500/30" 
                    : "text-gray-400 hover:text-slate-900 hover:bg-gray-100"
                )}
                title={card.pinned ? "Desfixar do topo" : "Fixar no topo"}
              >
                <Pin size={14} className={cn(card.pinned && "fill-current")} />
              </button>

              {/* Visibility Toggle */}
              <button
                onClick={() => onToggleVisibility(card.id)}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  card.visible 
                    ? "text-gray-400 hover:text-red-500 hover:bg-red-50" 
                    : "text-slate-900 bg-emerald-50 hover:bg-emerald-50"
                )}
                title={card.visible ? "Ocultar painel" : "Mostrar painel"}
              >
                {card.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
