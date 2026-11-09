import React, { useState } from "react";
import { AdminAnnouncement } from "../../types";
import {
  Bell,
  Plus,
  Trash2,
  Power,
  Info,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Calendar,
  Send,
  Eye,
  Check,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminAnnouncementsProps {
  announcements: AdminAnnouncement[];
  loading: boolean;
  onSaveAnnouncement: (ann: Partial<AdminAnnouncement>) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onToggleStatus?: (id: string, ativo: boolean) => Promise<void>;
  saving: boolean;
}

export default function AdminAnnouncements({
  announcements,
  loading,
  onSaveAnnouncement,
  onDeleteAnnouncement,
  onToggleStatus,
  saving,
}: AdminAnnouncementsProps) {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [tipo, setTipo] = useState<"novidade" | "alerta" | "sucesso" | "info">("novidade");
  const [exibirAte, setExibirAte] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;

    await onSaveAnnouncement({
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      tipo,
      ativo: true,
      exibirAte: exibirAte ? new Date(exibirAte).toISOString() : undefined,
    });

    setTitulo("");
    setConteudo("");
    setExibirAte("");
  };

  const getTypeStyle = (t: string) => {
    switch (t) {
      case "alerta":
        return {
          label: "Aviso Importante",
          badge: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <AlertTriangle size={15} className="text-amber-600" />,
          previewBg: "bg-amber-50/80 border-amber-200 text-amber-950",
        };
      case "sucesso":
        return {
          label: "Sucesso / Conquista",
          badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <CheckCircle2 size={15} className="text-emerald-600" />,
          previewBg: "bg-emerald-50/80 border-emerald-200 text-emerald-950",
        };
      case "novidade":
        return {
          label: "Nova Funcionalidade",
          badge: "bg-purple-50 text-purple-800 border-purple-200",
          icon: <Sparkles size={15} className="text-purple-600" />,
          previewBg: "bg-purple-50/80 border-purple-200 text-purple-950",
        };
      default:
        return {
          label: "Informação Geral",
          badge: "bg-blue-50 text-blue-800 border-blue-200",
          icon: <Info size={15} className="text-blue-600" />,
          previewBg: "bg-blue-50/80 border-blue-200 text-blue-950",
        };
    }
  };

  const filtered = announcements.filter((a) => {
    if (statusFilter === "active") return a.ativo !== false;
    if (statusFilter === "inactive") return a.ativo === false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Description */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Bell size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Mural de Comunicados Globais do Bolso+
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Publique avisos e novidades na tela inicial de todos os usuários cadastrados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Todos ({announcements.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "active" ? "bg-white text-emerald-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Ativos ({announcements.filter((a) => a.ativo !== false).length})
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "inactive" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Inativos ({announcements.filter((a) => a.ativo === false).length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form + Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus size={16} className="text-emerald-600" />
              Criar Novo Comunicado
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tipo de Aviso
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTipo("novidade")}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                      tipo === "novidade" ? "border-purple-500 bg-purple-50/50 text-purple-900 font-bold" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Sparkles size={14} className="text-purple-600" />
                    <span>Novidade</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("alerta")}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                      tipo === "alerta" ? "border-amber-500 bg-amber-50/50 text-amber-900 font-bold" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span>Alerta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("sucesso")}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                      tipo === "sucesso" ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 font-bold" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Sucesso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("info")}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                      tipo === "info" ? "border-blue-500 bg-blue-50/50 text-blue-900 font-bold" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Info size={14} className="text-blue-600" />
                    <span>Informação</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Título do Comunicado <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Atualização: Leitor de Notas Fiscais com IA!"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mensagem / Conteúdo <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva o comunicado de forma clara e amigável..."
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Exibir até <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={exibirAte}
                  onChange={(e) => setExibirAte(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !titulo.trim() || !conteudo.trim()}
                className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Send size={14} />
                <span>{saving ? "Publicando..." : "Publicar no Mural"}</span>
              </button>
            </form>
          </div>

          {/* Live Preview Card */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-300 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Pré-visualização no App do Usuário
            </span>
            <div className={`p-4 rounded-xl border shadow-xs ${getTypeStyle(tipo).previewBg}`}>
              <div className="flex items-center gap-2 mb-1.5">
                {getTypeStyle(tipo).icon}
                <span className="font-bold text-xs">
                  {titulo.trim() || "Título do comunicado"}
                </span>
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                {conteudo.trim() || "O texto do aviso aparecerá aqui para todos os usuários."}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: List of Published Announcements (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span>Comunicados Publicados ({filtered.length})</span>
            </h3>

            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                Nenhum comunicado encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((ann) => {
                  const style = getTypeStyle(ann.tipo || "info");
                  const isConfirming = deleteConfirmId === ann.id;

                  return (
                    <div
                      key={ann.id}
                      className={`p-4 rounded-xl border transition-all ${
                        ann.ativo !== false ? "bg-white border-slate-200" : "bg-slate-50/70 border-slate-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${style.badge}`}>
                            {style.icon}
                            <span>{style.label}</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString("pt-BR") : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {onToggleStatus && (
                            <button
                              onClick={() => onToggleStatus(ann.id, ann.ativo === false)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                ann.ativo !== false
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                              }`}
                              title="Alternar visibilidade do comunicado"
                            >
                              {ann.ativo !== false ? "Ativo" : "Pausado"}
                            </button>
                          )}

                          {isConfirming ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  onDeleteAnnouncement(ann.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 text-slate-400 hover:text-slate-700 rounded text-[10px] cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(ann.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Excluir comunicado"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mb-1">{ann.titulo}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{ann.conteudo}</p>

                      {ann.exibirAte && (
                        <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar size={11} />
                          <span>Exibir até {new Date(ann.exibirAte).toLocaleDateString("pt-BR")}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
