import React, { useState } from "react";
import { AdminCliente } from "../../types";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  TrendingUp,
  Download,
  Bell,
  RefreshCw,
  Activity,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MessageCircle,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Sliders,
  Send
} from "lucide-react";

interface AdminDashboardProps {
  clients: AdminCliente[];
  loading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: "dashboard" | "clients" | "create" | "announcements" | "settings") => void;
  onExportCsv: () => void;
  onOpenWhatsApp?: (client: AdminCliente) => void;
}

export default function AdminDashboard({
  clients,
  loading,
  onRefresh,
  onNavigateTab,
  onExportCsv,
  onOpenWhatsApp,
}: AdminDashboardProps) {
  const [radarFilter, setRadarFilter] = useState<"all" | "overdue" | "expiring_soon" | "ok">("overdue");

  const total = clients.length;
  const ativos = clients.filter((c) => c.ativo !== false).length;
  const inativos = total - ativos;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const novosMes = clients.filter(
    (c) => c.createdAt && new Date(c.createdAt) >= thirtyDaysAgo
  ).length;

  const taxaAtivos = total > 0 ? Math.round((ativos / total) * 100) : 100;

  // Expiration Radar Analysis
  const radarClients = clients.map((c) => {
    if (!c.vencimento) {
      return { client: c, status: "vitalicio" as const, daysLeft: 99999, label: "Sem expiração (Vitalício)" };
    }
    const due = new Date(c.vencimento);
    if (isNaN(due.getTime())) {
      return { client: c, status: "vitalicio" as const, daysLeft: 99999, label: "Sem expiração" };
    }
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { client: c, status: "overdue" as const, daysLeft: diffDays, label: `Expirou há ${Math.abs(diffDays)} dia(s)` };
    } else if (diffDays <= 7) {
      return { client: c, status: "expiring_soon" as const, daysLeft: diffDays, label: diffDays === 0 ? "Expira hoje" : `Expira em ${diffDays} dia(s)` };
    } else {
      return { client: c, status: "ok" as const, daysLeft: diffDays, label: `Válido por ${diffDays} dias` };
    }
  });

  const overdueList = radarClients.filter((r) => r.status === "overdue");
  const expiringSoonList = radarClients.filter((r) => r.status === "expiring_soon");
  const okList = radarClients.filter((r) => r.status === "ok");

  const filteredRadar = radarClients.filter((r) => {
    if (radarFilter === "overdue") return r.status === "overdue";
    if (radarFilter === "expiring_soon") return r.status === "expiring_soon";
    if (radarFilter === "ok") return r.status === "ok";
    return true;
  });

  // Recent 6 clients
  const recentClients = [...clients]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 6);

  const getDirectRenewalMsg = (c: AdminCliente, daysLeft: number) => {
    const isOverdue = daysLeft < 0;
    if (isOverdue) {
      return `Olá ${c.nome}! Notamos que seu período de acesso ao Bolso+ expirou. Para renovar seu acesso e continuar gerenciando suas finanças com IA, responda esta mensagem ou entre em contato com nosso suporte!`;
    }
    return `Olá ${c.nome}! Seu acesso ao Bolso+ vence em ${daysLeft} dia(s). Caso deseje renovar antecipadamente pela plataforma oficial, estamos à disposição por aqui!`;
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Visão Geral de Usuários
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              Gestão de Acessos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Controle de contas, ativação de usuários e acompanhamento da validade de acessos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-emerald-600" : ""} />
          </button>

          <button
            onClick={onExportCsv}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Exportar usuários em CSV"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => onNavigateTab("create")}
            className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus size={15} strokeWidth={2.5} />
            <span>Adicionar Usuário</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Usuários */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Total de Usuários
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
              {total}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-blue-500" />
            <span>Contas cadastradas no sistema</span>
          </div>
        </div>

        {/* Card 2: Usuários Ativos */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Acessos Ativos
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 tracking-tight font-mono tabular-nums">
              {ativos}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {taxaAtivos}% da base
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Acesso liberado e sem bloqueio</span>
          </div>
        </div>

        {/* Card 3: Usuários Inativos / Bloqueados */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Acessos Inativos
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <UserX size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
              {inativos}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Login pausado ou suspenso</span>
          </div>
        </div>

        {/* Card 4: Alertas de Vencimento / Radar */}
        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Atenção de Vencimento
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 tracking-tight font-mono tabular-nums">
              {overdueList.length + expiringSoonList.length}
            </span>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
              {overdueList.length} expirados
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <Clock size={13} className="text-amber-500" />
            <span>{expiringSoonList.length} vencem nos próximos 7 dias</span>
          </div>
        </div>
      </div>

      {/* Radar de Validade & Contato via WhatsApp */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              Radar de Validade & Lembretes WhatsApp
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitore o prazo de acesso dos usuários e envie mensagens de contato com 1 clique
            </p>
          </div>

          {/* Filter segment */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setRadarFilter("overdue")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                radarFilter === "overdue"
                  ? "bg-white text-rose-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Expirados ({overdueList.length})
            </button>
            <button
              onClick={() => setRadarFilter("expiring_soon")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                radarFilter === "expiring_soon"
                  ? "bg-white text-amber-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Próximos 7 dias ({expiringSoonList.length})
            </button>
            <button
              onClick={() => setRadarFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                radarFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos ({radarClients.length})
            </button>
          </div>
        </div>

        {filteredRadar.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Nenhum usuário nesta categoria no momento. Todos os acessos monitorados estão regulares!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRadar.slice(0, 5).map(({ client, status, daysLeft, label }) => {
              const cleanPhone = (client.telefone || "").replace(/\D/g, "");
              const hasPhone = cleanPhone.length >= 10;
              const renewalMsg = getDirectRenewalMsg(client, daysLeft);

              return (
                <div key={client.uid || client.email} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      status === "overdue" ? "bg-rose-50 text-rose-700" : status === "expiring_soon" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {(client.nome || client.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {client.nome || "Sem Nome"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          status === "overdue" ? "bg-rose-50 text-rose-700 border border-rose-200" : status === "expiring_soon" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {client.email} {client.telefone ? `• ${client.telefone}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {hasPhone ? (
                      <button
                        onClick={() => {
                          const num = cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone;
                          window.open(`https://wa.me/${num}?text=${encodeURIComponent(renewalMsg)}`, "_blank");
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                        title="Enviar mensagem no WhatsApp"
                      >
                        <MessageCircle size={14} />
                        <span>Avisar no WhatsApp</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Sem WhatsApp</span>
                    )}

                    <button
                      onClick={() => onNavigateTab("clients")}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Gerenciar usuário"
                    >
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Recent Users & Admin Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Registrations */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Últimos Usuários Cadastrados
              </h3>
              <p className="text-xs text-slate-500">
                Contas adicionadas recentemente à plataforma Bolso+
              </p>
            </div>
            <button
              onClick={() => onNavigateTab("clients")}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos ({total})</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {recentClients.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              Nenhum usuário cadastrado até o momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentClients.map((c) => (
                <div key={c.uid || c.email} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {(c.nome || c.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {c.nome || "Sem Nome"}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {c.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                      {c.vencimento ? `Vence: ${new Date(c.vencimento).toLocaleDateString("pt-BR")}` : "Vitalício"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      c.ativo !== false
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      {c.ativo !== false ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Actions & Management */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Sliders size={18} className="text-emerald-600" />
              Ações Rápidas
            </h3>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigateTab("create")}
                className="w-full py-2.5 px-4 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center justify-between transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <UserPlus size={16} />
                  <span>Adicionar Novo Usuário</span>
                </div>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => onNavigateTab("clients")}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-500" />
                  <span>Gerenciar Contas ({total})</span>
                </div>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={onExportCsv}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Download size={16} className="text-slate-500" />
                  <span>Exportar Base em CSV</span>
                </div>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick announcements banner */}
          <div className="bg-gradient-to-br from-slate-900 to-[#06261F] text-white rounded-2xl p-6 shadow-sm border border-slate-800">
            <h4 className="text-sm font-bold mb-1 flex items-center gap-2">
              <Bell size={16} className="text-emerald-400" />
              Mural & Comunicados aos Usuários
            </h4>
            <p className="text-xs text-slate-300 mb-4">
              Publique avisos importantes, novidades de recursos ou manutenções na tela inicial dos usuários.
            </p>
            <button
              onClick={() => onNavigateTab("announcements")}
              className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Criar ou Editar Comunicados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
