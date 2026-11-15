import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Headphones,
  HelpCircle,
  Mail,
  MessageSquarePlus,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import {
  SupportCategory,
  SupportPriority,
  SupportStatus,
  SupportTicket,
  UserProfile,
} from "../types";
import {
  createSupportTicket,
  fetchSupportChannels,
  mergeAndSortTickets,
  replyToSupportTicket,
  subscribeUserSupportTickets,
  SupportChannels,
  updateSupportTicketStatus,
} from "../services/supportService";
import { cn } from "../lib/utils";

interface SupportProps {
  userProfile: UserProfile | null;
  mostrarMensagem?: (msg: string) => void;
}

const CATEGORY_LABELS: Record<SupportCategory, string> = {
  duvida: "Dúvida de Uso",
  bug: "Erro / Bug Técnico",
  financeiro: "Financeiro / Assinatura",
  conta: "Acesso & Conta",
  sugestao: "Sugestão de Melhoria",
};

const PRIORITY_LABELS: Record<SupportPriority, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

const STATUS_CONFIG: Record<
  SupportStatus,
  { label: string; colorClass: string; Icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  aberto: {
    label: "Aberto",
    colorClass: "text-amber-700 bg-amber-50 border-amber-200",
    Icon: Clock,
  },
  em_atendimento: {
    label: "Em Atendimento",
    colorClass: "text-blue-700 bg-blue-50 border-blue-200",
    Icon: Headphones,
  },
  resolvido: {
    label: "Resolvido",
    colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
    Icon: CheckCircle2,
  },
  fechado: {
    label: "Fechado",
    colorClass: "text-slate-600 bg-slate-100 border-slate-200",
    Icon: XCircle,
  },
};

const FAQ_ITEMS = [
  {
    q: "Como definir ou alterar minha Conta Principal?",
    a: "Acesse Contas no menu lateral, clique no menu da conta desejada e selecione 'Definir como Principal'. Novas receitas, despesas e ajustes usam a conta principal como padrão.",
  },
  {
    q: "Como funciona o rendimento e o Lucro Manual em Investimentos?",
    a: "Ao abrir um ativo em Investimentos, você pode informar rendimentos manualmente em 'Lucro Manual'. O lucro líquido e a rentabilidade acumulada são atualizados imediatamente sem precisar esperar fechamento diário.",
  },
  {
    q: "Como guardar valores no Cofrinho sem duplicar movimentações?",
    a: "Ao depositar ou resgatar em um Cofrinho, informe a conta de origem ou destino se desejar refletir no saldo bancário. Cada operação gera um registro único vinculado ao seu cofrinho.",
  },
  {
    q: "Como exportar um backup completo dos meus dados?",
    a: "Vá em Configurações > Dados > Exportar Dados. Será gerado um arquivo JSON criptografável com suas contas, transações, metas e histórico.",
  },
  {
    q: "Qual o prazo de resposta do suporte?",
    a: "Chamados abertos pelo sistema são respondidos em até 4 horas úteis. Caso prefira, entre em contato diretamente pelo e-mail financeirocoelhotdigital@gmail.com.",
  },
];

function formatDateTimePt(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function Support({ userProfile, mostrarMensagem }: SupportProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [channels, setChannels] = useState<SupportChannels>({
    whatsapp: "",
    email: "financeirocoelhotdigital@gmail.com",
  });
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  // New ticket form state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>("duvida");
  const [priority, setPriority] = useState<SupportPriority>("normal");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const notify = (msg: string) => {
    if (mostrarMensagem) mostrarMensagem(msg);
  };

  useEffect(() => {
    fetchSupportChannels().then(setChannels);
  }, []);

  useEffect(() => {
    const newParam = searchParams.get("new");
    const catParam = searchParams.get("category") as SupportCategory | null;
    if (newParam === "1") {
      setIsCreating(true);
      if (catParam && CATEGORY_LABELS[catParam]) {
        setCategory(catParam);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const unsub = subscribeUserSupportTickets(
      userProfile.uid,
      userProfile.email || "",
      (list) => {
        setTickets(list);
        setSelectedTicketId((prev) => {
          if (prev && list.some((t) => t.id === prev)) return prev;
          return list[0]?.id || null;
        });
      }
    );
    return () => unsub();
  }, [userProfile?.uid, userProfile?.email]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  useEffect(() => {
    if (selectedTicket && !isCreating) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedTicket?.messages?.length, selectedTicketId, isCreating]);

  const counts = useMemo(() => {
    const open = tickets.filter(
      (t) => t.status === "aberto" || t.status === "em_atendimento"
    ).length;
    const resolved = tickets.filter(
      (t) => t.status === "resolvido" || t.status === "fechado"
    ).length;
    return { total: tickets.length, open, resolved };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter === "open" && t.status !== "aberto" && t.status !== "em_atendimento") {
        return false;
      }
      if (statusFilter === "resolved" && t.status !== "resolvido" && t.status !== "fechado") {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        return (
          t.subject.toLowerCase().includes(term) ||
          t.protocol.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [tickets, statusFilter, searchTerm]);

  const handleCopy = (value: string, key: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
      setCopiedKey(key);
      notify(`${label} copiado!`);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleStartNewTicket = () => {
    setIsCreating(true);
    setSearchParams({}, { replace: true });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!userProfile?.uid) {
      notify("Sessão não identificada. Faça login novamente.");
      return;
    }
    if (subject.trim().length < 2) {
      notify("Informe um assunto com pelo menos 2 caracteres.");
      return;
    }
    if (description.trim().length < 5) {
      notify("Descreva sua solicitação com mais detalhes.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createSupportTicket({
        userId: userProfile.uid,
        userName: userProfile.displayName || userProfile.email || "Usuário",
        userEmail: userProfile.email || "",
        subject,
        category,
        priority,
        description,
      });

      setTickets((prev) => mergeAndSortTickets([created], prev));
      setSelectedTicketId(created.id);
      setIsCreating(false);
      setSubject("");
      setDescription("");
      setPriority("normal");
      setCategory("duvida");
      notify(`Chamado ${created.protocol} aberto com sucesso!`);
    } catch (err: any) {
      notify(err?.message || "Erro ao abrir chamado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || sendingReply || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const updated = await replyToSupportTicket({
        ticket: selectedTicket,
        senderRole: "user",
        senderName: userProfile?.displayName || userProfile?.email || "Você",
        senderEmail: userProfile?.email || "",
        text: replyText,
      });
      setTickets((prev) => mergeAndSortTickets([updated], prev));
      setReplyText("");
      notify("Mensagem enviada para o suporte.");
    } catch {
      notify("Não foi possível enviar a mensagem.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleTicketResolution = async () => {
    if (!selectedTicket || updatingStatus) return;
    setUpdatingStatus(true);
    const nextStatus: SupportStatus =
      selectedTicket.status === "resolvido" || selectedTicket.status === "fechado"
        ? "aberto"
        : "resolvido";
    try {
      const updated = await updateSupportTicketStatus(selectedTicket, nextStatus);
      setTickets((prev) => mergeAndSortTickets([updated], prev));
      notify(
        nextStatus === "resolvido"
          ? "Chamado marcado como resolvido."
          : "Chamado reaberto para atendimento."
      );
    } catch {
      notify("Erro ao atualizar status do chamado.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const supportEmail = channels.email || "financeirocoelhotdigital@gmail.com";
  const mailtoSubject = encodeURIComponent(
    `[Suporte Bolso+] Solicitação de ${userProfile?.displayName || userProfile?.email || "Usuário"}`
  );
  const mailtoUrl = `mailto:${supportEmail}?subject=${mailtoSubject}`;

  return (
    <div className="space-y-8 pb-24 max-w-6xl mx-auto">
      {/* Top Bar Summary & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <Headphones size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              Falar com Suporte
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              <span>Central de atendimento técnico e financeiro</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-medium text-slate-700">
                {counts.open} em aberto
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{counts.resolved} resolvidos</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartNewTicket}
          className="px-5 py-2.5 bg-[#064E3B] hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <MessageSquarePlus size={16} />
          <span>Novo Chamado</span>
        </button>
      </div>

      {/* Direct Support Channel: Email Only */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <Mail size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 block">
              E-mail de Suporte
            </span>
            <p className="text-base font-mono font-semibold text-slate-900 truncate">
              {supportEmail}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Envie dúvidas, anexos, comprovantes ou solicitações diretamente para o nosso e-mail oficial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={mailtoUrl}
            className="py-2.5 px-4 bg-[#064E3B] hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Mail size={14} />
            <span>Enviar E-mail</span>
          </a>
          <button
            type="button"
            onClick={() => handleCopy(supportEmail, "email", "E-mail do suporte")}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            title="Copiar e-mail do suporte"
          >
            {copiedKey === "email" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copiedKey === "email" ? "Copiado" : "Copiar"}</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Ticket List + Thread / New Ticket Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Ticket List & Filters */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden min-h-[460px]">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">Meus Chamados</h2>
              <span className="text-xs text-slate-500 tabular-nums">
                {filteredTickets.length} {filteredTickets.length === 1 ? "registro" : "registros"}
              </span>
            </div>

            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por protocolo ou assunto..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            {/* Segmented Filter Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {[
                { id: "all", label: `Todos (${counts.total})` },
                { id: "open", label: `Abertos (${counts.open})` },
                { id: "resolved", label: `Resolvidos (${counts.resolved})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={cn(
                    "flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer tabular-nums",
                    statusFilter === tab.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[540px]">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                  <HelpCircle size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {tickets.length === 0
                    ? "Nenhum chamado aberto ainda"
                    : "Nenhum chamado encontrado"}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  {tickets.length === 0
                    ? "Quando você enviar uma dúvida, relato ou sugestão, ela aparecerá aqui com acompanhamento em tempo real."
                    : "Tente ajustar o termo de pesquisa ou o filtro de status."}
                </p>
                <button
                  type="button"
                  onClick={handleStartNewTicket}
                  className="mt-4 px-4 py-2 bg-[#064E3B] hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Abrir Primeiro Chamado
                </button>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const statusInfo = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.aberto;
                const StatusIcon = statusInfo.Icon;
                const isSelected = !isCreating && selectedTicketId === ticket.id;

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setSelectedTicketId(ticket.id);
                    }}
                    className={cn(
                      "w-full text-left p-4 transition-colors cursor-pointer block",
                      isSelected ? "bg-emerald-50/70" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-mono font-semibold text-slate-500 tabular-nums">
                        {ticket.protocol}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap",
                          statusInfo.colorClass
                        )}
                      >
                        <StatusIcon size={12} />
                        {statusInfo.label}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {ticket.subject}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
                      <span>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {formatDateTimePt(ticket.updatedAt || ticket.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Create Ticket Form or Conversation Thread */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden min-h-[460px]">
          {isCreating ? (
            <form onSubmit={handleCreateSubmit} className="flex flex-col h-full">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Abrir Novo Chamado
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Descreva o que aconteceu e nossa equipe responderá nesta tela.
                  </p>
                </div>
                {tickets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Voltar aos Chamados
                  </button>
                )}
              </div>

              <div className="p-5 space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Assunto do Chamado
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Dúvida sobre sincronização da Conta Principal"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Categoria
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as SupportCategory)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 cursor-pointer"
                    >
                      <option value="duvida">Dúvida de Uso</option>
                      <option value="bug">Erro / Bug Técnico</option>
                      <option value="financeiro">Financeiro / Assinatura</option>
                      <option value="conta">Acesso & Conta</option>
                      <option value="sugestao">Sugestão de Melhoria</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Prioridade
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as SupportPriority)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 cursor-pointer"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="normal">Normal</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Descrição Detalhada
                    </label>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {description.length}/4000
                    </span>
                  </div>
                  <textarea
                    required
                    rows={6}
                    maxLength={4000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explique o passo a passo, em qual tela ocorreu e o resultado esperado..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 resize-y"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-3">
                {tickets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#064E3B] hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <Send size={15} />
                  <span>{submitting ? "Enviando..." : "Enviar Chamado"}</span>
                </button>
              </div>
            </form>
          ) : selectedTicket ? (
            <div className="flex flex-col h-full">
              {/* Ticket Thread Header */}
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          selectedTicket.protocol,
                          `proto_${selectedTicket.id}`,
                          "Protocolo"
                        )
                      }
                      className="inline-flex items-center gap-1 font-mono font-semibold text-slate-700 hover:text-slate-900 cursor-pointer tabular-nums"
                      title="Copiar número de protocolo"
                    >
                      <span>{selectedTicket.protocol}</span>
                      {copiedKey === `proto_${selectedTicket.id}` ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                    <span aria-hidden="true">·</span>
                    <span>{CATEGORY_LABELS[selectedTicket.category]}</span>
                    <span aria-hidden="true">·</span>
                    <span>Prioridade {PRIORITY_LABELS[selectedTicket.priority]}</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 break-words">
                    {selectedTicket.subject}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(() => {
                    const info = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.aberto;
                    const Icon = info.Icon;
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap",
                          info.colorClass
                        )}
                      >
                        <Icon size={13} />
                        {info.label}
                      </span>
                    );
                  })()}
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={handleToggleTicketResolution}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    {selectedTicket.status === "resolvido" ||
                    selectedTicket.status === "fechado"
                      ? "Reabrir"
                      : "Marcar Resolvido"}
                  </button>
                </div>
              </div>

              {/* Conversation History */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 max-h-[380px]">
                {(selectedTicket.messages && selectedTicket.messages.length > 0
                  ? selectedTicket.messages
                  : [
                      {
                        id: "initial",
                        senderRole: "user" as const,
                        senderName: selectedTicket.userName || "Você",
                        text: selectedTicket.description,
                        createdAt: selectedTicket.createdAt,
                      },
                    ]
                ).map((msg) => {
                  const isUser = msg.senderRole === "user";
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        isUser ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1 px-1">
                        <span className="font-semibold text-slate-700">
                          {isUser ? msg.senderName || "Você" : msg.senderName || "Equipe de Suporte"}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDateTimePt(msg.createdAt)}</span>
                      </div>
                      <div
                        className={cn(
                          "px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed border",
                          isUser
                            ? "bg-[#064E3B] text-white border-emerald-900 rounded-tr-xs"
                            : "bg-white text-slate-900 border-slate-200 rounded-tl-xs"
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              <form
                onSubmit={handleSendReply}
                className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
              >
                <textarea
                  rows={2}
                  maxLength={4000}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escreva uma nova mensagem para o atendimento..."
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 resize-none"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-5 py-3 bg-[#064E3B] hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Send size={14} />
                  <span>{sendingReply ? "Enviando..." : "Responder"}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-4">
                <MessageSquarePlus size={22} />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Precisa de ajuda com sua conta?
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed">
                Selecione um chamado ao lado para acompanhar as respostas ou abra uma nova solicitação para falar diretamente com a nossa equipe.
              </p>
              <button
                type="button"
                onClick={handleStartNewTicket}
                className="mt-5 px-5 py-2.5 bg-[#064E3B] hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <MessageSquarePlus size={15} />
                <span>Abrir Novo Chamado</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Self-Service FAQ Accordion */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Perguntas Frequentes</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Respostas rápidas sobre os recursos do Bolso+
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartNewTicket}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <AlertCircle size={14} />
            <span>Não encontrou sua dúvida? Abrir chamado</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = expandedFaqIndex === idx;
            return (
              <div key={idx} className="py-3.5">
                <button
                  type="button"
                  onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 text-left cursor-pointer group"
                >
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors">
                    {item.q}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-slate-400 shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180 text-emerald-700"
                    )}
                  />
                </button>
                {isOpen && (
                  <p className="text-xs text-slate-600 leading-relaxed mt-2 pr-6">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
