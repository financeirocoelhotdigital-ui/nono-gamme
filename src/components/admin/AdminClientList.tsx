import React, { useState } from "react";
import { AdminCliente } from "../../types";
import {
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Key,
  Power,
  Trash2,
  Send,
  Copy,
  Check,
  Edit3,
  MessageCircle,
  Calendar,
  Phone,
  LayoutGrid,
  List,
  Filter,
  CreditCard,
  AlertCircle,
  Eye,
  CheckSquare,
  Square,
  Download,
  Clock,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminClientListProps {
  clients: AdminCliente[];
  loading: boolean;
  onRefresh: () => void;
  onToggleStatus: (client: AdminCliente) => void;
  onBulkToggleStatus?: (uids: string[], ativo: boolean) => Promise<void>;
  onOpenChangePassword: (client: AdminCliente) => void;
  onOpenEditClient: (client: AdminCliente) => void;
  onOpenDeleteClient: (client: AdminCliente) => void;
  onResendEmail: (client: AdminCliente) => void;
  resendingEmailUid: string | null;
  onCopyText: (text: string, label: string) => void;
  copiedField: string | null;
  onOpenWhatsApp: (client: AdminCliente) => void;
}

export default function AdminClientList({
  clients,
  loading,
  onRefresh,
  onToggleStatus,
  onBulkToggleStatus,
  onOpenChangePassword,
  onOpenEditClient,
  onOpenDeleteClient,
  onResendEmail,
  resendingEmailUid,
  onCopyText,
  copiedField,
  onOpenWhatsApp,
}: AdminClientListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [expiryFilter, setExpiryFilter] = useState<"all" | "overdue" | "expiring_7d" | "expiring_30d">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "expiry">("newest");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Selection for bulk actions
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [bulkOperating, setBulkOperating] = useState(false);

  // Client Details Modal
  const [inspectClient, setInspectClient] = useState<AdminCliente | null>(null);

  const now = new Date();

  // Helper for expiration status
  const getExpirationInfo = (vencimento?: string) => {
    if (!vencimento) {
      return { status: "vitalicio", text: "Vitalício", badgeClass: "bg-purple-50 text-purple-700 border-purple-200", days: 99999 };
    }
    const d = new Date(vencimento);
    if (isNaN(d.getTime())) {
      return { status: "vitalicio", text: "Vitalício", badgeClass: "bg-purple-50 text-purple-700 border-purple-200", days: 99999 };
    }
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) {
      return {
        status: "overdue",
        text: `Vencido há ${Math.abs(diff)}d`,
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
        days: diff
      };
    } else if (diff === 0) {
      return {
        status: "expiring_today",
        text: "Vence hoje!",
        badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
        days: 0
      };
    } else if (diff <= 7) {
      return {
        status: "expiring_soon",
        text: `Vence em ${diff}d`,
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 font-bold",
        days: diff
      };
    } else if (diff <= 30) {
      return {
        status: "expiring_month",
        text: `Vence em ${diff}d`,
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
        days: diff
      };
    } else {
      return {
        status: "ok",
        text: d.toLocaleDateString("pt-BR"),
        badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
        days: diff
      };
    }
  };

  // Filtering
  const filtered = clients.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (c.nome || "").toLowerCase().includes(term) ||
      (c.email || "").toLowerCase().includes(term) ||
      (c.telefone || "").toLowerCase().includes(term);

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && c.ativo !== false) ||
      (statusFilter === "inactive" && c.ativo === false);

    // Expiry filter
    let matchExpiry = true;
    if (expiryFilter !== "all") {
      const exp = getExpirationInfo(c.vencimento);
      if (expiryFilter === "overdue") matchExpiry = exp.days < 0;
      else if (expiryFilter === "expiring_7d") matchExpiry = exp.days >= 0 && exp.days <= 7;
      else if (expiryFilter === "expiring_30d") matchExpiry = exp.days >= 0 && exp.days <= 30;
    }

    return matchSearch && matchStatus && matchExpiry;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "newest") {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    }
    if (sortBy === "oldest") {
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    }
    if (sortBy === "name") {
      return (a.nome || "").localeCompare(b.nome || "");
    }
    if (sortBy === "expiry") {
      const expA = getExpirationInfo(a.vencimento).days;
      const expB = getExpirationInfo(b.vencimento).days;
      return expA - expB;
    }
    return 0;
  });

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedUids.length === sorted.length) {
      setSelectedUids([]);
    } else {
      setSelectedUids(sorted.map((c) => c.uid || c.id || ""));
    }
  };

  const toggleSelectOne = (uid: string) => {
    if (selectedUids.includes(uid)) {
      setSelectedUids(selectedUids.filter((id) => id !== uid));
    } else {
      setSelectedUids([...selectedUids, uid]);
    }
  };

  const handleBulkToggle = async (ativo: boolean) => {
    if (!onBulkToggleStatus || selectedUids.length === 0) return;
    setBulkOperating(true);
    try {
      await onBulkToggleStatus(selectedUids, ativo);
      setSelectedUids([]);
    } finally {
      setBulkOperating(false);
    }
  };

  const handleExportSelectedCsv = () => {
    const selectedClients = clients.filter((c) => selectedUids.includes(c.uid || c.id || ""));
    if (selectedClients.length === 0) return;

    const headers = ["Nome", "E-mail", "Telefone", "Status", "Plano", "Vencimento", "Observações"];
    const rows = selectedClients.map((c) => [
      `"${(c.nome || "").replace(/"/g, '""')}"`,
      `"${(c.email || "").replace(/"/g, '""')}"`,
      `"${(c.telefone || "").replace(/"/g, '""')}"`,
      `"${c.ativo !== false ? "Ativo" : "Inativo"}"`,
      `"${(c.plano || "anual").toUpperCase()}"`,
      `"${c.vencimento ? new Date(c.vencimento).toLocaleDateString("pt-BR") : "Vitalício"}"`,
      `"${(c.observacoes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `clientes-selecionados-${selectedClients.length}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou telefone com DDD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Right Controls: View mode and refresh */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Visualização em Tabela"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid size={16} />
              </button>
            </div>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-emerald-600" : ""} />
            </button>
          </div>
        </div>

        {/* Filter Pills / Segments */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Status:</span>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos ({clients.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === "active" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Ativos ({clients.filter((c) => c.ativo !== false).length})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === "inactive" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Inativos ({clients.filter((c) => c.ativo === false).length})
            </button>
          </div>

          {/* Expiry and Sort Filters */}
          <div className="flex items-center gap-2">

            <select
              value={expiryFilter}
              onChange={(e: any) => setExpiryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Qualquer Vencimento</option>
              <option value="overdue">Vencidos</option>
              <option value="expiring_7d">Vencem em 7 dias</option>
              <option value="expiring_30d">Vencem em 30 dias</option>
            </select>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="newest">Mais Recentes</option>
              <option value="oldest">Mais Antigos</option>
              <option value="name">Nome (A-Z)</option>
              <option value="expiry">Próximo Vencimento</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Sticky Bar when items are selected */}
      {selectedUids.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-20 z-30 bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-800"
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
              {selectedUids.length}
            </span>
            <span>clientes selecionados de {sorted.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkToggle(true)}
              disabled={bulkOperating}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck size={14} />
              <span>Ativar em massa</span>
            </button>

            <button
              onClick={() => handleBulkToggle(false)}
              disabled={bulkOperating}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <UserX size={14} />
              <span>Bloquear em massa</span>
            </button>

            <button
              onClick={handleExportSelectedCsv}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Exportar selecionados</span>
            </button>

            <button
              onClick={() => setSelectedUids([])}
              className="px-3 py-1.5 text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Clients Presentation */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <User size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800">Nenhum cliente encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Não há clientes correspondentes aos filtros aplicados. Tente ajustar os termos de busca ou filtros de status.
          </p>
        </div>
      ) : viewMode === "table" ? (
        /* ================= HIGH-DENSITY TABLE VIEW ================= */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="cursor-pointer text-slate-400 hover:text-slate-700"
                      title="Selecionar todos"
                    >
                      {selectedUids.length === sorted.length ? (
                        <CheckSquare size={16} className="text-emerald-600" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">WhatsApp / Tel</th>
                  <th className="py-3 px-4">Validade do Acesso</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sorted.map((client) => {
                  const uid = client.uid || client.id || "";
                  const isSelected = selectedUids.includes(uid);
                  const expInfo = getExpirationInfo(client.vencimento);
                  const cleanPhone = (client.telefone || "").replace(/\D/g, "");
                  const hasPhone = cleanPhone.length >= 10;

                  return (
                    <tr
                      key={uid}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isSelected ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleSelectOne(uid)}
                          className="cursor-pointer text-slate-400 hover:text-slate-700"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-emerald-600" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>

                      {/* Client Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {(client.nome || client.email || "C").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => setInspectClient(client)}
                              className="font-bold text-slate-900 hover:text-emerald-700 text-left truncate block cursor-pointer"
                            >
                              {client.nome || "Sem Nome"}
                            </button>
                            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                              <span className="truncate max-w-[200px]">{client.email}</span>
                              <button
                                onClick={() => onCopyText(client.email, "E-mail")}
                                className="hover:text-slate-700 cursor-pointer"
                                title="Copiar e-mail"
                              >
                                {copiedField === "E-mail" ? (
                                  <Check size={11} className="text-emerald-600" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4">
                        {hasPhone ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                            <span>{client.telefone}</span>
                            <button
                              onClick={() => onOpenWhatsApp(client)}
                              className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
                              title="Abrir no WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">Não inf.</span>
                        )}
                      </td>

                      {/* Expiration / Validade */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${expInfo.badgeClass}`}>
                          {expInfo.text}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onToggleStatus(client)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                            client.ativo !== false
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                          }`}
                          title="Clique para alternar status ativo/inativo"
                        >
                          {client.ativo !== false ? "Ativo" : "Inativo"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setInspectClient(client)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Ficha completa do cliente"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            onClick={() => onOpenWhatsApp(client)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </button>

                          <button
                            onClick={() => onOpenEditClient(client)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Editar dados"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            onClick={() => onOpenChangePassword(client)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                            title="Redefinir senha"
                          >
                            <Key size={15} />
                          </button>

                          <button
                            onClick={() => onResendEmail(client)}
                            disabled={resendingEmailUid === client.uid}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer disabled:opacity-50"
                            title="Reenviar e-mail de acesso"
                          >
                            <Send size={15} className={resendingEmailUid === client.uid ? "animate-spin" : ""} />
                          </button>

                          <button
                            onClick={() => onOpenDeleteClient(client)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Excluir conta"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= CARD GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((client) => {
            const uid = client.uid || client.id || "";
            const isSelected = selectedUids.includes(uid);
            const expInfo = getExpirationInfo(client.vencimento);
            const cleanPhone = (client.telefone || "").replace(/\D/g, "");
            const hasPhone = cleanPhone.length >= 10;

            return (
              <div
                key={uid}
                className={`bg-white rounded-2xl p-5 border transition-all ${
                  isSelected
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                    : "border-slate-200/80 shadow-xs hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleSelectOne(uid)}
                      className="cursor-pointer text-slate-400 hover:text-slate-700 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-emerald-600" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {(client.nome || client.email || "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {client.nome || "Sem Nome"}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {client.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleStatus(client)}
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer shrink-0 ${
                      client.ativo !== false
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {client.ativo !== false ? "Ativo" : "Inativo"}
                  </button>
                </div>

                {/* Badges strip */}
                <div className="flex flex-wrap items-center gap-1.5 py-2.5 border-t border-b border-slate-100 text-[11px] mb-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${expInfo.badgeClass}`}>
                    {expInfo.text}
                  </span>
                  {hasPhone && (
                    <span className="text-slate-500 font-mono text-[11px] ml-auto">
                      {client.telefone}
                    </span>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setInspectClient(client)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Ficha
                    </button>
                    <button
                      onClick={() => onOpenWhatsApp(client)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                      title="WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </button>
                    <button
                      onClick={() => onOpenEditClient(client)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenChangePassword(client)}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                      title="Senha"
                    >
                      <Key size={15} />
                    </button>
                    <button
                      onClick={() => onOpenDeleteClient(client)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: CLIENT FULL DETAILS (DRAWER/FICHA) ================= */}
      <AnimatePresence>
        {inspectClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 space-y-5"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-lg">
                    {(inspectClient.nome || inspectClient.email || "C").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{inspectClient.nome}</h3>
                    <p className="text-xs text-slate-500 font-mono">{inspectClient.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectClient(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                      inspectClient.ativo !== false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {inspectClient.ativo !== false ? "Ativo no Sistema" : "Acesso Bloqueado"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Tipo de Acesso</span>
                    <span className="text-slate-900 font-bold uppercase">
                      {inspectClient.vencimento ? "Com Validade" : "Acesso Vitalício"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Vencimento</span>
                    <span className="text-slate-900 font-mono">
                      {inspectClient.vencimento ? new Date(inspectClient.vencimento).toLocaleDateString("pt-BR") : "Vitalício"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Data de Cadastro</span>
                    <span className="text-slate-900 font-mono">
                      {inspectClient.createdAt ? new Date(inspectClient.createdAt).toLocaleDateString("pt-BR") : "—"}
                    </span>
                  </div>
                </div>

                {inspectClient.senha && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Senha Cadastrada</span>
                      <span className="font-mono font-bold text-slate-800">{inspectClient.senha}</span>
                    </div>
                    <button
                      onClick={() => onCopyText(inspectClient.senha || "", "Senha")}
                      className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Copy size={12} />
                      <span>Copiar</span>
                    </button>
                  </div>
                )}

                {inspectClient.observacoes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Observações Internas</span>
                    <p className="text-slate-700 italic text-xs">{inspectClient.observacoes}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    const c = inspectClient;
                    setInspectClient(null);
                    onOpenWhatsApp(c);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>Conversar no WhatsApp</span>
                </button>
                <button
                  onClick={() => {
                    const c = inspectClient;
                    setInspectClient(null);
                    onOpenEditClient(c);
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Editar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
