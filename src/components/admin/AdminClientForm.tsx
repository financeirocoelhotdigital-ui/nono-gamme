import React, { useState } from "react";
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Phone,
  Calendar,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck
} from "lucide-react";

interface AdminClientFormProps {
  onSubmit: (formData: {
    nome: string;
    email: string;
    senha: string;
    telefone: string;
    plano: string;
    vencimento: string;
    observacoes: string;
  }) => Promise<void>;
  creating: boolean;
}

export default function AdminClientForm({ onSubmit, creating }: AdminClientFormProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [validadeTipo, setValidadeTipo] = useState<"vitalicio" | "1ano" | "6meses" | "30dias" | "custom">("1ano");
  const [vencimento, setVencimento] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [observacoes, setObservacoes] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleValidadeTipoChange = (tipo: "vitalicio" | "1ano" | "6meses" | "30dias" | "custom") => {
    setValidadeTipo(tipo);
    const d = new Date();
    if (tipo === "vitalicio") {
      setVencimento("");
    } else if (tipo === "1ano") {
      d.setFullYear(d.getFullYear() + 1);
      setVencimento(d.toISOString().split("T")[0]);
    } else if (tipo === "6meses") {
      d.setMonth(d.getMonth() + 6);
      setVencimento(d.toISOString().split("T")[0]);
    } else if (tipo === "30dias") {
      d.setDate(d.getDate() + 30);
      setVencimento(d.toISOString().split("T")[0]);
    }
  };

  const generateStrongPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const special = "!@#$%";
    const all = upper + lower + digits + special;

    let pass = "";
    pass += upper[Math.floor(Math.random() * upper.length)];
    pass += lower[Math.floor(Math.random() * lower.length)];
    pass += digits[Math.floor(Math.random() * digits.length)];
    pass += special[Math.floor(Math.random() * special.length)];

    for (let i = 4; i < 10; i++) {
      pass += all[Math.floor(Math.random() * all.length)];
    }

    return pass.split("").sort(() => 0.5 - Math.random()).join("");
  };

  const handleGeneratePassword = () => {
    const p = generateStrongPassword();
    setSenha(p);
    setShowPassword(true);
    setCopiedPass(false);
    setFormError(null);
  };

  const copyPassword = () => {
    if (senha && navigator.clipboard) {
      navigator.clipboard.writeText(senha);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nome.trim()) {
      setFormError("Por favor, preencha o nome completo do usuário.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormError("Por favor, insira um e-mail válido.");
      return;
    }
    if (senha.trim().length < 6) {
      setFormError("A senha deve conter no mínimo 6 caracteres para garantir o acesso.");
      return;
    }

    try {
      await onSubmit({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha: senha.trim(),
        telefone: telefone.trim(),
        plano: validadeTipo === "vitalicio" ? "vitalicio" : "ativo",
        vencimento: vencimento ? new Date(vencimento).toISOString() : "",
        observacoes: observacoes.trim(),
      });

      // Clear inputs upon successful creation
      setNome("");
      setEmail("");
      setSenha("");
      setTelefone("");
      setObservacoes("");
      setFormError(null);
    } catch (err: any) {
      setFormError(err.message || "Erro ao cadastrar usuário. Verifique os dados.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <UserPlus size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Adicionar Novo Usuário
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cadastre as credenciais de acesso do usuário. O usuário poderá fazer login imediatamente com o e-mail e senha configurados.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Dados do Usuário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nome Completo do Usuário <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Silveira"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                E-mail de Acesso <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="email"
                  required
                  placeholder="usuario@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Telefone / WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                WhatsApp com DDD <span className="text-slate-400 font-normal">(para envio do acesso)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="tel"
                  placeholder="Ex: (11) 98765-4321"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">
                    Senha Inicial de Acesso <span className="text-rose-500">*</span>
                  </label>
                  {senha.length > 0 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        senha.length >= 6
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {senha.length >= 6
                        ? "Senha válida"
                        : `Mínimo 6 caracteres (faltam ${6 - senha.length})`}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Gerar Senha Segura</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 font-mono"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {senha && (
                    <button
                      type="button"
                      onClick={copyPassword}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                      title="Copiar senha"
                    >
                      {copiedPass ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Validade do Acesso */}
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Clock size={14} className="text-slate-400" />
              <span>Validade do Acesso</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Período de Acesso
                </label>
                <select
                  value={validadeTipo}
                  onChange={(e) => handleValidadeTipoChange(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="1ano">1 Ano (12 meses)</option>
                  <option value="vitalicio">Acesso Vitalício (Sem Expiração)</option>
                  <option value="6meses">6 Meses</option>
                  <option value="30dias">30 Dias</option>
                  <option value="custom">Data Personalizada</option>
                </select>
              </div>

              {validadeTipo !== "vitalicio" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Data de Vencimento do Acesso
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      type="date"
                      value={vencimento}
                      onChange={(e) => {
                        setVencimento(e.target.value);
                        setValidadeTipo("custom");
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Acesso ilimitado e sem data de expiração cadastrada.</span>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Identificação da Venda / Observações <span className="text-slate-400 font-normal">(uso interno)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Compra confirmada na Kiwify/Hotmart, ID do pedido #4892..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 resize-none"
            ></textarea>
          </div>

          {/* Error Banner */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <span className="font-bold">Atenção:</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={creating}
              className="px-6 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <UserPlus size={16} strokeWidth={2.5} className={creating ? "animate-spin" : ""} />
              <span>{creating ? "Cadastrando Usuário..." : "Cadastrar Usuário"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
