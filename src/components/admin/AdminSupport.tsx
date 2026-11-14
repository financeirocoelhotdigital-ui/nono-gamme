import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Headphones,
  Mail,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { SupportCategory, SupportStatus, SupportTicket } from "../../types";
import { cn } from "../../lib/utils";

interface AdminSupportProps {
  tickets: SupportTicket[];
  loading: boolean;
  onRefresh: () => void;
  onReply: (ticket: SupportTicket, text: string) => Promise<void>;
  onUpdateStatus: (ticket: SupportTicket, status: SupportStatus) => Promise<void>;
}

const CATEGORY_LABELS: Record<SupportCategory, string> = {
  duvida: "Dúvida",
  bug: "Bug / Erro",
  financeiro: "Financeiro",
  conta: "Acesso & Conta",
  sugestao: "Sugestão",
};

const STATUS_BADGES: Record<
  SupportStatus,
  { label: string; className: string; Icon: React.ComponentType<{ size?: number }> }
> = {
  aberto: {
    label: "Aberto",
    className: "text-amber-700 bg-amber-50 border-amber-200",
    Icon: Clock,
  },
  em_atendimento: {
    label: "Em Atendimento",
    className: "text-blue-700 bg-blue-50 border-blue-200",
    Icon: Headphones,
  },
  resolvido: {
    label: "Resolvido",
    className: "text-emerald-700 bg-emerald-50 border-emerald-200",
    Icon: CheckCircle2,
  },
  fechado: {
    label: "Fechado",
    className: "text-slate-600 bg-slate-100 border-slate-200",
    Icon: XCircle,
  },
};

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminSupport({
  tickets,
  loading,
  onRefresh,
  onReply,
  onUpdateStatus,
}: AdminSupportProps) {
  const [filter, setFilter] = useState<"all" | SupportStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id || null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        return (
          t.subject.toLowerCase().includes(s) ||
          t.protocol.toLowerCase().includes(s) ||
          t.userName.toLowerCase().includes(s) ||
          t.userEmail.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [tickets, filter, search]);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) || filtered[0] || null,
    [tickets, selectedId, filtered]
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !replyText.trim() || sending) return;
    setSending(true);
    try {
      await onReply(selected, replyText.trim());
      setReplyText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Headphones size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Central de Chamados & Suporte
            </h2>
            <p className="text-xs text-slate-500">
              Responda solicitações enviadas pelos usuários e gerencie o status de atendimento.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Atualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket Queue */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 flex flex-col overflow-hidden min-h-[460px]">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar usuário, e-mail ou protocolo..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {[
                { id: "all", label: "Todos" },
                { id: "aberto", label: "Abertos" },
                { id: "em_atendimento", label: "Atendendo" },
                { id: "resolvido", label: "Resolvidos" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id as any)}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors",
                    filter === tab.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[520px]">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhum chamado encontrado neste filtro.
              </div>
            ) : (
              filtered.map((ticket) => {
                const badge = STATUS_BADGES[ticket.status] || STATUS_BADGES.aberto;
                const Icon = badge.Icon;
                const active = selected?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedId(ticket.id)}
                    className={cn(
                      "w-full text-left p-4 transition-colors cursor-pointer block",
                      active ? "bg-emerald-50/70" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-mono font-bold text-slate-500 tabular-nums">
                        {ticket.protocol}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold whitespace-nowrap",
                          badge.className
                        )}
                      >
                        <Icon size={11} />
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {ticket.subject}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 truncate">
                      <span className="font-semibold text-slate-700">{ticket.userName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{CATEGORY_LABELS[ticket.category]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatDateTime(ticket.updatedAt)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Ticket Thread & Controls */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 flex flex-col overflow-hidden min-h-[460px]">
          {selected ? (
            <>
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-mono font-bold text-slate-700 tabular-nums">
                      {selected.protocol}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selected.userName}</span>
                    {selected.userEmail && (
                      <>
                        <span aria-hidden="true">·</span>
                        <a
                          href={`mailto:${selected.userEmail}`}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-mono"
                        >
                          <Mail size={12} />
                          {selected.userEmail}
                        </a>
                      </>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{selected.subject}</h3>
                </div>

                <select
                  value={selected.status}
                  onChange={(e) =>
                    onUpdateStatus(selected, e.target.value as SupportStatus)
                  }
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer shrink-0"
                >
                  <option value="aberto">Aberto</option>
                  <option value="em_atendimento">Em Atendimento</option>
                  <option value="resolvido">Resolvido</option>
                  <option value="fechado">Fechado</option>
                </select>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50 max-h-[380px]">
                {(selected.messages || []).map((msg) => {
                  const isAdminMsg = msg.senderRole === "admin";
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        isAdminMsg ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1 px-1">
                        <span className="font-semibold text-slate-700">
                          {isAdminMsg ? `${msg.senderName} (Suporte)` : msg.senderName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDateTime(msg.createdAt)}</span>
                      </div>
                      <div
                        className={cn(
                          "px-4 py-3 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed border",
                          isAdminMsg
                            ? "bg-slate-900 text-white border-slate-900 rounded-tr-xs"
                            : "bg-white text-slate-900 border-slate-200 rounded-tl-xs"
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleSend}
                className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
              >
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Responder ao usuário..."
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-5 py-3 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <Send size={14} />
                  <span>{sending ? "Enviando..." : "Enviar Resposta"}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-10 text-xs text-slate-500">
              Selecione um chamado na lista ao lado para visualizar a conversa.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
