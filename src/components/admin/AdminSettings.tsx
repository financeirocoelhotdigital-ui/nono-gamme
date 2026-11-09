import React, { useState, useEffect } from "react";
import { AdminSystemSettings, AdminCliente } from "../../types";
import {
  Settings,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  MessageSquare,
  AlertTriangle,
  Save,
  CheckCircle2,
  Server,
  ShieldCheck,
  RefreshCw,
  Phone,
  Mail,
  Check,
  Copy
} from "lucide-react";

interface AdminSettingsProps {
  settings: AdminSystemSettings;
  onSaveSettings: (settings: Partial<AdminSystemSettings>) => Promise<void>;
  onImportUsers?: (users: any[]) => Promise<void>;
  saving: boolean;
  clients: AdminCliente[];
  onExportCsv: () => void;
  onExportJson: () => void;
}

export default function AdminSettings({
  settings,
  onSaveSettings,
  onImportUsers,
  saving,
  clients,
  onExportCsv,
  onExportJson,
}: AdminSettingsProps) {
  const [modoManutencao, setModoManutencao] = useState(settings.modoManutencao || false);
  const [mensagemManutencao, setMensagemManutencao] = useState(
    settings.mensagemManutencao || "O sistema Bolso+ está em manutenção programada para melhorias. Voltaremos em breve!"
  );
  const [mensagemBoasVindasWhatsApp, setMensagemBoasVindasWhatsApp] = useState(
    settings.mensagemBoasVindasWhatsApp ||
      "Olá {nome}!\n\nSeu acesso ao Bolso+ foi liberado com sucesso! 🎉\n\n🔑 *Seus dados de acesso:*\nE-mail: {email}\nSenha: {senha}\nPlano: {plano}\n\n👉 Acesse agora: {link}\n\nQualquer dúvida, estamos à disposição!"
  );
  const [suporteWhatsApp, setSuporteWhatsApp] = useState(settings.suporteWhatsApp || "");
  const [suporteEmail, setSuporteEmail] = useState(settings.suporteEmail || "");
  const [permitirCadastros, setPermitirCadastros] = useState(settings.permitirCadastros !== false);

  // Import JSON Modal / State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    setModoManutencao(settings.modoManutencao || false);
    setMensagemManutencao(settings.mensagemManutencao || "O sistema Bolso+ está em manutenção programada. Voltaremos em breve!");
    setMensagemBoasVindasWhatsApp(
      settings.mensagemBoasVindasWhatsApp ||
        "Olá {nome}!\n\nSeu acesso ao Bolso+ foi liberado com sucesso! 🎉\n\n🔑 *Seus dados de acesso:*\nE-mail: {email}\nSenha: {senha}\nPlano: {plano}\n\n👉 Acesse agora: {link}\n\nQualquer dúvida, estamos à disposição!"
    );
    setSuporteWhatsApp(settings.suporteWhatsApp || "");
    setSuporteEmail(settings.suporteEmail || "");
    setPermitirCadastros(settings.permitirCadastros !== false);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      modoManutencao,
      mensagemManutencao,
      mensagemBoasVindasWhatsApp,
      suporteWhatsApp,
      suporteEmail,
      permitirCadastros,
    });
  };

  // Sample data for live preview
  const livePreviewText = mensagemBoasVindasWhatsApp
    .replace(/\{nome\}/g, "Carlos Santos")
    .replace(/\{email\}/g, "carlos@email.com")
    .replace(/\{senha\}/g, "Tax!2026")
    .replace(/\{plano\}/g, "ANUAL")
    .replace(/\{vencimento\}/g, "21/10/2027")
    .replace(/\{link\}/g, window.location.origin);

  const handleProcessImport = async () => {
    setImportError(null);
    setImportSuccess(null);
    if (!importJsonText.trim()) {
      setImportError("Cole o conteúdo JSON dos clientes.");
      return;
    }
    try {
      const parsed = JSON.parse(importJsonText);
      const list = Array.isArray(parsed) ? parsed : parsed.users || parsed.clientes;
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error("O JSON precisa conter um array de usuários/clientes.");
      }

      setImporting(true);
      if (onImportUsers) {
        await onImportUsers(list);
        setImportSuccess(`${list.length} clientes importados com sucesso!`);
        setTimeout(() => {
          setShowImportModal(false);
          setImportJsonText("");
          setImportSuccess(null);
        }, 1800);
      }
    } catch (err: any) {
      setImportError(err.message || "Erro ao processar JSON.");
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Maintenance Mode Alert Banner if active */}
      {modoManutencao && (
        <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl flex items-center justify-between gap-4 font-bold shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <div>
              <p className="text-sm">O Modo de Manutenção está ATIVADO no momento!</p>
              <p className="text-xs font-normal opacity-90">Usuários comuns verão a mensagem de bloqueio ao tentar usar o aplicativo.</p>
            </div>
          </div>
          <button
            onClick={() => setModoManutencao(false)}
            className="px-3 py-1.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-900 cursor-pointer shrink-0"
          >
            Desativar Agora
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
          <Settings size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Configurações do Sistema & Backups do Bolso+
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie modos operacionais, templates de mensagens do WhatsApp, canais de suporte e rotinas de backup.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Block 1: Modo Operacional e Manutenção */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Server size={17} className="text-emerald-600" />
            Status Operacional do Sistema
          </h3>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-800">Modo de Manutenção Programada</p>
              <p className="text-[11px] text-slate-500">
                Quando ativado, exibe uma tela amigável avisando que o sistema está em manutenção rápida.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={modoManutencao}
                onChange={(e) => setModoManutencao(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {modoManutencao && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mensagem Exibida aos Usuários durante a Manutenção
              </label>
              <textarea
                rows={2}
                value={mensagemManutencao}
                onChange={(e) => setMensagemManutencao(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              ></textarea>
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-800">Permitir Novos Cadastros pela Tela de Login</p>
              <p className="text-[11px] text-slate-500">
                Se desativado, apenas o administrador poderá criar novas contas no painel administrativo.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={permitirCadastros}
                onChange={(e) => setPermitirCadastros(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
            </label>
          </div>
        </div>

        {/* Block 2: WhatsApp Template with Live Preview */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare size={17} className="text-emerald-600" />
              Template de Mensagem de Boas-Vindas (WhatsApp)
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold">Variáveis disponíveis: &#123;nome&#125;, &#123;email&#125;, &#123;senha&#125;, &#123;plano&#125;, &#123;link&#125;</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Editor do Texto da Mensagem
              </label>
              <textarea
                rows={8}
                value={mensagemBoasVindasWhatsApp}
                onChange={(e) => setMensagemBoasVindasWhatsApp(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none leading-relaxed"
              ></textarea>
            </div>

            {/* Live WhatsApp chat simulation */}
            <div className="bg-[#EFEAE2] p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Prévia no WhatsApp do Cliente
                </span>
                <div className="bg-white p-3.5 rounded-xl rounded-tl-none shadow-xs text-xs text-slate-900 whitespace-pre-line leading-relaxed max-w-[95%]">
                  {livePreviewText}
                  <span className="text-[10px] text-slate-400 block text-right mt-1">14:02 ✓✓</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-3 italic">
                * As variáveis serão substituídas pelos dados reais do cliente no momento do clique.
              </p>
            </div>
          </div>
        </div>

        {/* Block 3: Suporte */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Phone size={17} className="text-emerald-600" />
            Canais de Suporte ao Cliente
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                WhatsApp Oficial do Suporte (com DDD)
              </label>
              <input
                type="text"
                placeholder="Ex: 5511999999999"
                value={suporteWhatsApp}
                onChange={(e) => setSuporteWhatsApp(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                E-mail do Suporte Técnico
              </label>
              <input
                type="email"
                placeholder="suporte@finassist.com"
                value={suporteEmail}
                onChange={(e) => setSuporteEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            <span>{saving ? "Salvando..." : "Salvar Todas as Configurações"}</span>
          </button>
        </div>
      </form>

      {/* Block 4: Backups & Data Management */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Download size={17} className="text-emerald-600" />
          Exportação de Dados & Restauração de Backup
        </h3>
        <p className="text-xs text-slate-500">
          Faça download completo dos dados de clientes em CSV para Excel ou JSON completo para segurança e migração.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={onExportCsv}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Exportar CSV</p>
              <p className="text-[10px] text-slate-500">Planilha Excel formatada</p>
            </div>
          </button>

          <button
            onClick={onExportJson}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <FileCode size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Exportar Backup JSON</p>
              <p className="text-[10px] text-slate-500">Estrutura completa de dados</p>
            </div>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <Upload size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Restaurar JSON</p>
              <p className="text-[10px] text-slate-500">Importar arquivo de backup</p>
            </div>
          </button>
        </div>
      </div>

      {/* Modal: Import Backup JSON */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload size={17} className="text-emerald-600" />
                Importar Backup de Clientes (JSON)
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Você pode selecionar um arquivo <code>.json</code> exportado anteriormente ou colar o array de clientes abaixo:
            </p>

            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />

            <textarea
              rows={6}
              placeholder="Cole o JSON de clientes aqui..."
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            ></textarea>

            {importError && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {importError}
              </p>
            )}

            {importSuccess && (
              <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                {importSuccess}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={importing || !importJsonText.trim()}
                className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {importing ? "Processando..." : "Confirmar Importação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
