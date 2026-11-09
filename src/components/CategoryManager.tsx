import React, { useState } from "react";
import { Category, SubCategory, Tag } from "../types";
import { db, auth } from "../lib/firebase";
import { useCategorias } from "../context/CategoriasContext";
import { 
  addCategory, 
  updateCategory, 
  deleteCategory, 
  addSubCategory, 
  updateSubCategory, 
  deleteSubCategory 
} from "../services/categoryService";
import { cn } from "../lib/utils";
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Sparkles, 
  Search,
  Tag as TagIcon,
  Layers,
  ArrowLeft,
  Palette,
  Type
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";

interface CategoryManagerProps {
  categories: Category[];
  subCategories: SubCategory[];
  tags: Tag[];
  onClose: () => void;
  initialTab?: "expense" | "income" | "tags";
}

const COLORS = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", 
  "#F43F5E", "#14B8A6", "#06B6D4", "#0EA5E9", "#64748B", "#475569", "#1E293B"
];

const ICONS = [
  "Utensils", "Home", "Car", "HeartPulse", "GraduationCap", "Gamepad2", 
  "ShoppingBag", "CreditCard", "Banknote", "FileText", "MoreHorizontal",
  "Briefcase", "Laptop", "Tag", "TrendingUp", "Percent", "Key", "Coffee",
  "Smartphone", "Plane", "Gift", "Music", "Camera", "Dumbbell"
];

export function CategoryManager({ onClose, initialTab = "expense" }: { onClose: () => void, initialTab?: "expense" | "income" | "tags" }) {
  const { categories, subCategories, tags } = useCategorias();
  const [activeTab, setActiveTab] = useState<"expense" | "income" | "tags">(initialTab);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingSubCategory, setIsAddingSubCategory] = useState<string | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: "category" | "subcategory";
    id: string;
    name: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("MoreHorizontal");
  const [catColor, setCatColor] = useState(COLORS[0]);
  const [catType, setCatType] = useState<"expense" | "income">("expense");
  const [subName, setSubName] = useState("");

  const filteredCategories = categories.filter(c => 
    c.type === (activeTab === "tags" ? "expense" : activeTab) && 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTags = tags.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.usageCount - a.usageCount);

  const handleSaveCategory = async () => {
    if (!catName.trim()) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: catName,
          icon: catIcon,
          color: catColor,
          type: catType
        });
      } else {
        await addCategory({
          userId: uid,
          name: catName,
          type: catType,
          icon: catIcon,
          color: catColor
        });
        setActiveTab(catType);
      }
      resetCatForm();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveSubCategory = async (parentId: string) => {
    if (!subName.trim()) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      if (editingSubCategory) {
        await updateSubCategory(editingSubCategory.id, { name: subName });
      } else {
        await addSubCategory({
          userId: uid,
          name: subName,
          parentCategoryId: parentId
        });
      }
      resetSubForm();
    } catch (error) {
      console.error(error);
    }
  };

  const resetCatForm = () => {
    setCatName("");
    setCatIcon("MoreHorizontal");
    setCatColor(COLORS[0]);
    setCatType("expense");
    setIsAddingCategory(false);
    setEditingCategory(null);
  };

  const resetSubForm = () => {
    setSubName("");
    setIsAddingSubCategory(null);
    setEditingSubCategory(null);
  };

  const handleSuggestSubCategories = async (category: Category) => {
    const { suggestSubCategories } = await import("../services/geminiService");
    const suggestions = await suggestSubCategories(category.name);
    
    if (suggestions && suggestions.length > 0) {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      for (const name of suggestions) {
        // Avoid duplicates
        if (!subCategories.some(s => s.parentCategoryId === category.id && s.name.toLowerCase() === name.toLowerCase())) {
          await addSubCategory({
            userId: uid,
            name,
            parentCategoryId: category.id
          });
        }
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      setErrorMessage(null);
      if (deleteConfirmation.type === "category") {
        await deleteCategory(deleteConfirmation.id);
      } else {
        await deleteSubCategory(deleteConfirmation.id);
      }
      setDeleteConfirmation(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setErrorMessage("Erro ao excluir. Verifique suas permissões.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-50 md:relative md:z-0 md:h-full md:rounded-[40px] md:shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="bg-white px-6 py-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Gerenciar Categorias</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Organize suas finanças com inteligência</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setCatType(activeTab === "income" ? "income" : "expense");
              setIsAddingCategory(true);
            }}
            className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-90 transition-all"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-2xl">
          <button 
            onClick={() => setActiveTab("expense")}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === "expense" ? "bg-white text-slate-900 shadow-sm" : "text-gray-400"
            )}
          >
            Despesas
          </button>
          <button 
            onClick={() => setActiveTab("income")}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === "income" ? "bg-white text-slate-900 shadow-sm" : "text-gray-400"
            )}
          >
            Receitas
          </button>
          <button 
            onClick={() => setActiveTab("tags")}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === "tags" ? "bg-white text-slate-900 shadow-sm" : "text-gray-400"
            )}
          >
            Tags
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text"
            placeholder={`Pesquisar ${activeTab === "tags" ? "tags" : "categorias"}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-xl py-3 pl-10 pr-4 text-xs font-bold focus:ring-2 focus:ring-primary-lime/20"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {activeTab !== "tags" ? (
          <div className="space-y-3">
            {filteredCategories.map(cat => (
              <CategoryItem 
                key={cat.id}
                category={cat}
                subCategories={subCategories.filter(s => s.parentCategoryId === cat.id)}
                isExpanded={expandedCategory === cat.id}
                onToggle={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                onEdit={() => {
                  setEditingCategory(cat);
                  setCatName(cat.name);
                  setCatIcon(cat.icon);
                  setCatColor(cat.color);
                  setCatType(cat.type);
                  setIsAddingCategory(true);
                }}
                onDelete={() => {
                  setDeleteConfirmation({
                    type: "category",
                    id: cat.id,
                    name: cat.name
                  });
                }}
                onAddSub={() => setIsAddingSubCategory(cat.id)}
                onEditSub={(sub) => {
                  setEditingSubCategory(sub);
                  setSubName(sub.name);
                  setIsAddingSubCategory(cat.id);
                }}
                onDeleteSub={(sub) => {
                  setDeleteConfirmation({
                    type: "subcategory",
                    id: sub.id,
                    name: sub.name
                  });
                }}
                onSuggestSub={() => handleSuggestSubCategories(cat)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredTags.map(tag => (
              <div key={tag.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <TagIcon size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 tracking-tight">{tag.name}</div>
                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{tag.usageCount} usos</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Category Modal */}
      <AnimatePresence>
        {isAddingCategory && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-lg bg-white rounded-t-[40px] p-8 pb-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </h3>
                <button onClick={resetCatForm} className="text-gray-400"><X size={24} /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nome da Categoria</label>
                  <div className="relative">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSaveCategory(); } }}
                      placeholder="Ex: Alimentação, Salário..."
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary-lime/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Tipo de Fluxo</label>
                  <div className="flex p-1 bg-gray-100 rounded-2xl">
                    <button 
                      type="button"
                      onClick={() => setCatType("expense")}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        catType === "expense" ? "bg-white text-rose-600 shadow-sm font-bold" : "text-gray-400 font-medium"
                      )}
                    >
                      Despesa
                    </button>
                    <button 
                      type="button"
                      onClick={() => setCatType("income")}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        catType === "income" ? "bg-white text-emerald-600 shadow-sm font-bold" : "text-gray-400 font-medium"
                      )}
                    >
                      Receita
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cor</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(color => (
                      <button 
                        key={color}
                        onClick={() => setCatColor(color)}
                        className={cn(
                          "h-8 w-8 rounded-full transition-all active:scale-90",
                          catColor === color ? "ring-4 ring-gray-200 scale-110" : ""
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Ícone</label>
                  <div className="grid grid-cols-6 gap-2">
                    {ICONS.map(iconName => {
                      const IconComp = (LucideIcons as any)[iconName];
                      return (
                        <button 
                          key={iconName}
                          onClick={() => setCatIcon(iconName)}
                          className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                            catIcon === iconName ? "bg-white text-slate-900 shadow-lg" : "bg-gray-50 text-gray-400"
                          )}
                        >
                          {IconComp && <IconComp size={20} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  onClick={handleSaveCategory}
                  className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-[0_8px_30px_rgba(0,0,0,0.04)] active:scale-95 transition-all"
                >
                  {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit SubCategory Modal */}
      <AnimatePresence>
        {isAddingSubCategory && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic mb-6">
                {editingSubCategory ? "Editar Subcategoria" : "Nova Subcategoria"}
              </h3>

              <div className="space-y-4">
                <input 
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSaveSubCategory(isAddingSubCategory as string); } }}
                  placeholder="Nome da subcategoria..."
                  autoFocus
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary-lime/20"
                />

                <div className="flex gap-2">
                  <button 
                    onClick={resetSubForm}
                    className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleSaveSubCategory(isAddingSubCategory)}
                    className="flex-1 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {deleteConfirmation && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4 text-rose-500">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
                  Confirmar Exclusão
                </h3>
                <p className="text-sm font-medium text-gray-500 mb-6">
                  {deleteConfirmation.type === "category" 
                    ? `Deseja realmente excluir a categoria "${deleteConfirmation.name}" e todas as suas subcategorias?`
                    : `Deseja realmente excluir a subcategoria "${deleteConfirmation.name}"?`}
                </p>
                {errorMessage && (
                  <p className="text-xs text-rose-500 mb-4 font-bold">{errorMessage}</p>
                )}
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => {
                      setDeleteConfirmation(null);
                      setErrorMessage(null);
                    }}
                    className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmDelete}
                    className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-rose-600 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryItem({ 
  category, 
  subCategories, 
  isExpanded, 
  onToggle, 
  onEdit, 
  onDelete, 
  onAddSub, 
  onEditSub, 
  onDeleteSub,
  onSuggestSub
}: { 
  category: Category; 
  subCategories: SubCategory[]; 
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSub: () => void;
  onEditSub: (sub: SubCategory) => void;
  onDeleteSub: (sub: SubCategory) => void;
  onSuggestSub: () => void;
}) {
  const IconComp = (LucideIcons as any)[category.icon] || LucideIcons.MoreHorizontal;
  const [isSuggesting, setIsSuggesting] = useState(false);

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={onToggle}>
          <div 
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-slate-900 shadow-lg"
            style={{ backgroundColor: category.color }}
          >
            <IconComp size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 tracking-tight">{category.name}</h4>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{subCategories.length} subcategorias</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 text-gray-400 hover:text-slate-900 transition-colors"><Edit2 size={16} /></button>
          <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
          <button onClick={onToggle} className="p-2 text-gray-400 transition-transform duration-300" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}>
            <ChevronDown size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-gray-50/50 border-t border-gray-100"
          >
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Subcategorias</h5>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      setIsSuggesting(true);
                      await onSuggestSub();
                      setIsSuggesting(false);
                    }}
                    disabled={isSuggesting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-slate-900 text-[9px] font-black uppercase tracking-tight active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    {isSuggesting ? "Sugerindo..." : "IA Sugerir"}
                  </button>
                  <button 
                    onClick={onAddSub}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-900 text-[9px] font-black uppercase tracking-tight active:scale-95 transition-all"
                  >
                    <Plus size={12} />
                    Adicionar
                  </button>
                </div>
              </div>

              {subCategories.length > 0 ? (
                <div className="space-y-1">
                  {subCategories.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-100 group">
                      <span className="text-xs font-bold text-gray-600">{sub.name}</span>
                      <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEditSub(sub)} className="p-1.5 text-gray-400 hover:text-slate-900"><Edit2 size={12} /></button>
                        <button onClick={() => onDeleteSub(sub)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-[10px] text-gray-400 font-medium">Nenhuma subcategoria definida</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
