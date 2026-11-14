import React, { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import {
  Check,
  Image as ImageIcon,
  Layers,
  Palette,
  RotateCcw,
  Save,
  Shirt,
  Shuffle,
  Smile,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  AVATAR_BG_PALETTE,
  AVATAR_FRAME_COLORS,
  AVATAR_HAIR_COLORS,
  AVATAR_OUTFIT_COLORS,
  AVATAR_PRESETS,
  AVATAR_SKIN_TONES,
  avatarConfigToDataUri,
  compressAvatarFile,
  DEFAULT_AVATAR_CONFIG,
  generateRandomAvatarConfig,
} from "../lib/avatarGenerator";
import {
  AvatarAccessory,
  AvatarBaseStyle,
  AvatarConfig,
  AvatarExpression,
  AvatarFrameStyle,
  AvatarHairStyle,
  AvatarOutfit,
  UserProfile,
} from "../types";
import { useSettings } from "../context/SettingsContext";
import { UserAvatar } from "./UserAvatar";
import { cn } from "../lib/utils";

interface AvatarCustomizerProps {
  userProfile: UserProfile | null;
  mostrarMensagem?: (msg: string) => void;
}

type StudioTab = "estilo" | "rosto" | "visual" | "acessorios" | "foto";

const HAIR_STYLES: { id: AvatarHairStyle; label: string }[] = [
  { id: "curto", label: "Curto Clássico" },
  { id: "topete", label: "Topete Moderno" },
  { id: "ondulado", label: "Ondulado" },
  { id: "longo", label: "Longo Liso" },
  { id: "cacheado", label: "Cacheado" },
  { id: "coque", label: "Coque Alto" },
  { id: "raspado", label: "Raspado" },
];

const EXPRESSIONS: { id: AvatarExpression; label: string }[] = [
  { id: "sorridente", label: "Sorridente" },
  { id: "confiante", label: "Confiante" },
  { id: "tranquilo", label: "Tranquilo" },
  { id: "piscadela", label: "Piscadela" },
  { id: "focado", label: "Focado" },
];

const OUTFITS: { id: AvatarOutfit; label: string }[] = [
  { id: "blazer", label: "Blazer Executivo" },
  { id: "camiseta", label: "Camiseta Casual" },
  { id: "moletom", label: "Moletom Urbano" },
  { id: "gola_alta", label: "Gola Alta" },
];

const ACCESSORIES: { id: AvatarAccessory; label: string }[] = [
  { id: "nenhum", label: "Nenhum" },
  { id: "oculos_classico", label: "Óculos Clássico" },
  { id: "oculos_redondo", label: "Óculos Redondo" },
  { id: "oculos_sol", label: "Óculos de Sol" },
  { id: "fones", label: "Fones de Ouvido" },
  { id: "bone", label: "Boné" },
];

const FRAMES: { id: AvatarFrameStyle; label: string }[] = [
  { id: "nenhuma", label: "Sem Moldura" },
  { id: "anel", label: "Anel Clássico" },
  { id: "duplo", label: "Anel Duplo" },
  { id: "destaque", label: "Brilho Destaque" },
];

export default function AvatarCustomizer({
  userProfile,
  mostrarMensagem,
}: AvatarCustomizerProps) {
  const { settings, updateSetting, updateProfile: updateProfileContext } = useSettings();

  const initialConfig = useMemo<AvatarConfig>(() => {
    return (
      userProfile?.avatarConfig ||
      settings.avatarConfig ||
      DEFAULT_AVATAR_CONFIG
    );
  }, [userProfile?.avatarConfig, settings.avatarConfig]);

  const [config, setConfig] = useState<AvatarConfig>(initialConfig);
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || settings.name || "Usuário"
  );
  const [customPhoto, setCustomPhoto] = useState<string>(() => {
    const existing = userProfile?.photoURL || "";
    if (existing && !existing.startsWith("data:image/svg+xml")) {
      return existing;
    }
    return "";
  });
  const [useCustomPhoto, setUseCustomPhoto] = useState<boolean>(() => {
    const existing = userProfile?.photoURL || "";
    return Boolean(
      existing &&
        !existing.startsWith("data:image/svg+xml") &&
        !existing.includes("api.dicebear.com")
    );
  });

  const [activeTab, setActiveTab] = useState<StudioTab>("estilo");
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (userProfile?.displayName) {
      setDisplayName(userProfile.displayName);
    }
    if (userProfile?.avatarConfig) {
      setConfig(userProfile.avatarConfig);
    }
  }, [userProfile?.displayName, userProfile?.avatarConfig]);

  const generatedSvgUri = useMemo(
    () => avatarConfigToDataUri(config, displayName),
    [config, displayName]
  );

  const previewPhotoUrl = useCustomPhoto && customPhoto.trim() ? customPhoto.trim() : generatedSvgUri;

  const notify = (msg: string) => {
    if (mostrarMensagem) mostrarMensagem(msg);
  };

  const updateConfig = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    setUseCustomPhoto(false);
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyPreset = (presetConfig: AvatarConfig) => {
    setUseCustomPhoto(false);
    setConfig({ ...presetConfig });
  };

  const handleRandomize = () => {
    setUseCustomPhoto(false);
    setConfig(generateRandomAvatarConfig());
  };

  const handleReset = () => {
    setUseCustomPhoto(false);
    setConfig(DEFAULT_AVATAR_CONFIG);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressAvatarFile(file);
      setCustomPhoto(compressed);
      setUseCustomPhoto(true);
      notify("Foto carregada e ajustada para o avatar!");
    } catch (err: any) {
      notify(err?.message || "Não foi possível carregar esta imagem.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleSaveAvatar = async () => {
    if (saving) return;
    setSaving(true);
    const cleanName = displayName.trim() || "Usuário";
    const finalPhotoURL = previewPhotoUrl;

    try {
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: cleanName,
            ...(finalPhotoURL.length < 1800 ? { photoURL: finalPhotoURL } : {}),
          });
        } catch {
          // Firebase Auth URL length limits are expected for SVG data URIs
        }

        try {
          await setDoc(
            doc(db, "users", auth.currentUser.uid),
            {
              displayName: cleanName,
              photoURL: finalPhotoURL,
              avatarConfig: config,
            },
            { merge: true }
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
        }
      }

      await updateProfileContext({
        displayName: cleanName,
        photoURL: finalPhotoURL,
        avatarConfig: config,
      });
      await updateSetting("name", cleanName);
      await updateSetting("avatarConfig", config);

      try {
        const storedRaw = localStorage.getItem("finassist_custom_user");
        const storedObj = storedRaw
          ? JSON.parse(storedRaw)
          : { uid: userProfile?.uid, email: userProfile?.email };
        const updatedUser = {
          ...storedObj,
          displayName: cleanName,
          photoURL: finalPhotoURL,
          avatarConfig: config,
        };
        localStorage.setItem("finassist_custom_user", JSON.stringify(updatedUser));
        window.dispatchEvent(
          new CustomEvent("user_profile_updated", { detail: updatedUser })
        );
      } catch {
        // ignore localStorage failure
      }

      setSavedFeedback(true);
      notify("Seu avatar personalizado foi salvo com sucesso!");
      setTimeout(() => setSavedFeedback(false), 3000);
    } catch {
      notify("Erro ao salvar avatar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: StudioTab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "estilo", label: "Estilo & Fundo", Icon: Palette },
    { id: "rosto", label: "Rosto & Cabelo", Icon: User },
    { id: "visual", label: "Expressão & Roupa", Icon: Shirt },
    { id: "acessorios", label: "Acessórios & Moldura", Icon: Layers },
    { id: "foto", label: "Foto Própria", Icon: ImageIcon },
  ];

  return (
    <div className="space-y-8 pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <Smile size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              Personalização do Meu Avatar
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Monte sua identidade visual no Bolso+ combinando estilo, traços, roupas, moldura ou enviando uma foto.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRandomize}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Shuffle size={15} />
            <span>Surpreender</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAvatar}
            disabled={saving}
            className="px-5 py-2.5 bg-[#064E3B] hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {savedFeedback ? <Check size={15} /> : <Save size={15} />}
            <span>
              {saving ? "Salvando..." : savedFeedback ? "Salvo" : "Salvar Meu Avatar"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Showcase & Presets */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center space-y-5">
            <div className="pt-2">
              <UserAvatar
                photoURL={previewPhotoUrl}
                avatarConfig={config}
                displayName={displayName}
                size="2xl"
              />
            </div>

            <div className="w-full space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 text-left">
                Nome de Exibição
              </label>
              <input
                type="text"
                maxLength={60}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como você quer ser chamado"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            {/* Context Size Previews */}
            <div className="w-full pt-4 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 mb-3 text-left">
                Prévia nos espaços do app
              </p>
              <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar
                    photoURL={previewPhotoUrl}
                    avatarConfig={config}
                    displayName={displayName}
                    size="sm"
                  />
                  <div className="text-left min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {displayName || "Usuário"}
                    </p>
                    <p className="text-[11px] text-slate-500">Menu & Topo</p>
                  </div>
                </div>
                <UserAvatar
                  photoURL={previewPhotoUrl}
                  avatarConfig={config}
                  displayName={displayName}
                  size="lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-between w-full gap-2 pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Restaurar Padrão</span>
              </button>
              <button
                type="button"
                onClick={handleRandomize}
                className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Gerar Aleatório</span>
              </button>
            </div>
          </div>

          {/* Curated Quick Presets */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Modelos Prontos</h2>
              <span className="text-xs text-slate-500">1 clique</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {AVATAR_PRESETS.map((preset) => {
                const uri = avatarConfigToDataUri(preset.config, displayName);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.config)}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors flex flex-col items-center gap-2 text-center cursor-pointer"
                  >
                    <UserAvatar
                      photoURL={uri}
                      avatarConfig={preset.config}
                      displayName={displayName}
                      size="md"
                    />
                    <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Customization Controls */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {/* Segmented Studio Navigation */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center gap-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer",
                    isActive
                      ? "bg-[#064E3B] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                  )}
                >
                  <tab.Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6 space-y-6">
            {activeTab === "estilo" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2.5">
                    Tipo de Avatar
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(
                      [
                        { id: "pessoa", label: "Retrato Ilustrado", desc: "Cabelos, rosto e roupas" },
                        { id: "bot", label: "Assistente Tech", desc: "Estilo futurista digital" },
                        { id: "monograma", label: "Monograma", desc: "Suas iniciais em destaque" },
                      ] as { id: AvatarBaseStyle; label: string; desc: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateConfig("style", opt.id)}
                        className={cn(
                          "p-3.5 rounded-xl border text-left transition-colors cursor-pointer",
                          config.style === opt.id && !useCustomPhoto
                            ? "bg-emerald-50 border-emerald-600 text-emerald-950"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <p className="text-xs font-bold">{opt.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-bold text-slate-700">Modo de Fundo</h3>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateConfig("bgMode", "gradiente")}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors",
                          config.bgMode === "gradiente"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600"
                        )}
                      >
                        Gradiente
                      </button>
                      <button
                        type="button"
                        onClick={() => updateConfig("bgMode", "solido")}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors",
                          config.bgMode === "solido"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-600"
                        )}
                      >
                        Sólido
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
                    {AVATAR_BG_PALETTE.map((swatch) => {
                      const active =
                        config.bgColor === swatch.primary &&
                        config.bgColorSecondary === swatch.secondary;
                      return (
                        <button
                          key={swatch.name}
                          type="button"
                          title={swatch.name}
                          onClick={() => {
                            setUseCustomPhoto(false);
                            setConfig((prev) => ({
                              ...prev,
                              bgColor: swatch.primary,
                              bgColorSecondary: swatch.secondary,
                            }));
                          }}
                          style={{
                            background:
                              config.bgMode === "gradiente"
                                ? `linear-gradient(135deg, ${swatch.primary}, ${swatch.secondary})`
                                : swatch.primary,
                          }}
                          className={cn(
                            "h-11 rounded-xl border-2 transition-transform cursor-pointer flex items-center justify-center",
                            active
                              ? "border-slate-900 scale-105"
                              : "border-transparent hover:scale-105"
                          )}
                        >
                          {active && <Check size={15} className="text-white drop-shadow" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "rosto" && (
              <div className="space-y-6">
                {config.style !== "pessoa" && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                    <p className="text-xs text-amber-900 font-medium">
                      As opções de pele e cabelo se aplicam ao estilo{" "}
                      <strong>Retrato Ilustrado</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => updateConfig("style", "pessoa")}
                      className="px-3 py-1.5 bg-amber-900 text-white rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Mudar para Retrato
                    </button>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2.5">Tom de Pele</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {AVATAR_SKIN_TONES.map((tone) => {
                      const active = config.skinTone === tone.color;
                      return (
                        <button
                          key={tone.name}
                          type="button"
                          onClick={() => {
                            updateConfig("style", "pessoa");
                            updateConfig("skinTone", tone.color);
                          }}
                          className={cn(
                            "p-2 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition-colors",
                            active
                              ? "border-emerald-600 bg-emerald-50/70"
                              : "border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          <span
                            className="w-7 h-7 rounded-full border border-black/10"
                            style={{ backgroundColor: tone.color }}
                          />
                          <span className="text-[11px] font-medium text-slate-700 truncate w-full text-center">
                            {tone.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2.5">
                    Estilo de Cabelo
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {HAIR_STYLES.map((hair) => {
                      const active = config.hairStyle === hair.id;
                      return (
                        <button
                          key={hair.id}
                          type="button"
                          onClick={() => {
                            updateConfig("style", "pessoa");
                            updateConfig("hairStyle", hair.id);
                          }}
                          className={cn(
                            "py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors",
                            active
                              ? "bg-[#064E3B] text-white border-[#064E3B]"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {hair.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2.5">
                    Cor do Cabelo
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
                    {AVATAR_HAIR_COLORS.map((hc) => {
                      const active = config.hairColor === hc.color;
                      return (
                        <button
                          key={hc.name}
                          type="button"
                          title={hc.name}
                          onClick={() => {
                            updateConfig("style", "pessoa");
                            updateConfig("hairColor", hc.color);
                          }}
                          className={cn(
                            "p-2 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-colors",
                            active
                              ? "border-emerald-600 bg-emerald-50/70"
                              : "border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          <span
                            className="w-6 h-6 rounded-full border border-black/10"
                            style={{ backgroundColor: hc.color }}
                          />
                          <span className="text-[10px] font-medium text-slate-700 truncate w-full text-center">
                            {hc.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "visual" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2.5">
                    Expressão Facial
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {EXPRESSIONS.map((exp) => {
                      const active = config.expression === exp.id;
                      return (
                        <button
                          key={exp.id}
                          type="button"
                          onClick={() => updateConfig("expression", exp.id)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors",
                            active
                              ? "bg-[#064E3B] text-white border-[#064E3B]"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {exp.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2.5">
                    Vestimenta / Estilo
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {OUTFITS.map((outfit) => {
                      const active = config.outfit === outfit.id;
                      return (
                        <button
                          key={outfit.id}
                          type="button"
                          onClick={() => updateConfig("outfit", outfit.id)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors",
                            active
                              ? "bg-[#064E3B] text-white border-[#064E3B]"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {outfit.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2.5">Cor da Roupa</h3>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                    {AVATAR_OUTFIT_COLORS.map((oc) => {
                      const active = config.outfitColor === oc.color;
                      return (
                        <button
                          key={oc.name}
                          type="button"
                          title={oc.name}
                          onClick={() => updateConfig("outfitColor", oc.color)}
                          style={{ backgroundColor: oc.color }}
                          className={cn(
                            "h-10 rounded-xl border-2 cursor-pointer flex items-center justify-center transition-transform",
                            active
                              ? "border-emerald-600 scale-105 ring-2 ring-emerald-500/20"
                              : "border-slate-200 hover:scale-105"
                          )}
                        >
                          {active && (
                            <Check
                              size={15}
                              className={oc.color === "#F8FAFC" ? "text-slate-900" : "text-white"}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "acessorios" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2.5">Acessórios</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {ACCESSORIES.map((acc) => {
                      const active = config.accessory === acc.id;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => updateConfig("accessory", acc.id)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors",
                            active
                              ? "bg-[#064E3B] text-white border-[#064E3B]"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {acc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2.5">
                    Estilo da Moldura
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {FRAMES.map((fr) => {
                      const active = config.frameStyle === fr.id;
                      return (
                        <button
                          key={fr.id}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({ ...prev, frameStyle: fr.id }))
                          }
                          className={cn(
                            "py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors",
                            active
                              ? "bg-[#064E3B] text-white border-[#064E3B]"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {fr.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-2.5">
                    Cor da Moldura
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {AVATAR_FRAME_COLORS.map((fc) => {
                      const active = config.frameColor === fc.color;
                      return (
                        <button
                          key={fc.name}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({ ...prev, frameColor: fc.color }))
                          }
                          className={cn(
                            "p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors",
                            active
                              ? "border-emerald-600 bg-emerald-50/70"
                              : "border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: fc.color }}
                          />
                          <span className="text-[11px] font-semibold text-slate-700 truncate">
                            {fc.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "foto" && (
              <div className="space-y-5">
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Enviar Foto do Dispositivo
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Formatos PNG, JPG ou WebP. A imagem é centralizada e comprimida automaticamente.
                    </p>
                  </div>
                  <label
                    htmlFor="avatar-studio-file"
                    className="px-4 py-2.5 bg-[#064E3B] hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Upload size={15} />
                    <span>{uploadingPhoto ? "Processando..." : "Escolher Foto"}</span>
                  </label>
                  <input
                    id="avatar-studio-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Ou usar link direto de imagem (HTTPS)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customPhoto.startsWith("data:") ? "" : customPhoto}
                      onChange={(e) => {
                        setCustomPhoto(e.target.value);
                        setUseCustomPhoto(Boolean(e.target.value.trim()));
                      }}
                      placeholder="https://exemplo.com/minha-foto.jpg"
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                    {useCustomPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomPhoto(false);
                          setCustomPhoto("");
                        }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        Usar Avatar Ilustrado
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
