import React, { useMemo } from "react";
import { formatCurrency, cn } from "../lib/utils";
import { CloudUpload, FileText, Download, Trash2, Plus, Search, Filter, Edit2, Check, UploadCloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/error-handler";

interface Document {
  id: string;
  name: string;
  date: string;
  type: string;
  size: string;
  userId: string;
  fileData?: string;
}

interface DocumentsProps {
  documents: Document[];
}

export const Documents: React.FC<DocumentsProps> = ({ documents }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingDoc, setEditingDoc] = React.useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedType, setSelectedType] = React.useState<string | null>(null);

  const categoryCounts = useMemo(() => [
    { label: "Recibos", count: documents.filter(d => d.type === "Recibo").length, color: "bg-[#10B981]" },
    { label: "Notas Fiscais", count: documents.filter(d => d.type === "Nota Fiscal").length, color: "bg-[#EF4444]" },
    { label: "Contratos", count: documents.filter(d => d.type === "Contrato").length, color: "bg-[#F59E0B]" },
    { label: "Comprovantes", count: documents.filter(d => d.type === "Comprovante").length, color: "bg-[#3B82F6]" },
    { label: "Outros", count: documents.filter(d => d.type === "Outros").length, color: "bg-[#8B5CF6]" },
  ], [documents]);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType ? doc.type === selectedType : true;
    return matchesSearch && matchesType;
  });

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir este documento?")) {
      try {
        await deleteDoc(doc(db, "documents", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
      }
    }
  };

  const handleDownload = (docItem: Document) => {
    if (docItem.fileData) {
      const link = window.document.createElement("a");
      link.href = docItem.fileData;
      link.download = docItem.name;
      link.click();
    } else {
      // Create a textual receipt blob
      const content = `BOLSO+ DOCUMENTO FINANCEIRO\nNome: ${docItem.name}\nTipo: ${docItem.type}\nData de Registro: ${docItem.date}\nTamanho: ${docItem.size}\n`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `${docItem.name}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documentos e Comprovantes</h1>
          <p className="text-sm text-slate-500">Centralize seus arquivos e recibos fiscais</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#10B981] text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-[#059669] transition-all active:scale-95 text-sm"
        >
          <CloudUpload size={18} />
          <span>Upload</span>
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <DocumentForm onClose={() => setIsAdding(false)} />
        )}
        {editingDoc && (
          <DocumentForm onClose={() => setEditingDoc(null)} initialData={editingDoc} />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome ou tipo de documento..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#10B981] transition-all"
              />
            </div>
            {selectedType && (
              <button 
                onClick={() => setSelectedType(null)}
                className="px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100"
              >
                Limpar filtro
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-base font-bold text-slate-900">
                Seus Arquivos ({filteredDocs.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredDocs.map((docItem) => (
                <motion.div 
                  key={docItem.id}
                  whileHover={{ y: -2 }}
                  className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-start justify-between group hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate max-w-[150px]">{docItem.name}</h4>
                      <p className="text-xs text-slate-500">{docItem.type} • {docItem.size}</p>
                      <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{docItem.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button 
                      onClick={() => handleDownload(docItem)}
                      title="Baixar arquivo"
                      className="p-2 text-slate-400 hover:text-[#10B981] transition-colors rounded-lg hover:bg-slate-50"
                    >
                      <Download size={17} />
                    </button>
                    <button 
                      onClick={() => setEditingDoc(docItem)}
                      title="Editar documento"
                      className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50"
                    >
                      <Edit2 size={17} />
                    </button>
                    <button 
                      onClick={() => handleDelete(docItem.id)}
                      title="Excluir documento"
                      className="p-2 text-slate-400 hover:text-[#EF4444] transition-colors rounded-lg hover:bg-slate-50"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </motion.div>
              ))}
              {filteredDocs.length === 0 && (
                <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8">
                  <CloudUpload className="mx-auto text-slate-300 mb-3" size={44} />
                  <p className="text-slate-600 font-bold text-sm">Nenhum documento anexado ainda.</p>
                  <p className="text-slate-400 text-xs mt-1 mb-4">Mantenha notas, comprovantes e recibos salvos em um só lugar.</p>
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="px-4 py-2 bg-[#10B981] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-600 transition-colors"
                  >
                    Fazer primeiro upload
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categories and Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#F4F9F6] to-[#E8F5E9] rounded-3xl p-6 border border-emerald-100">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FileText size={16} className="text-[#10B981]" />
              Dica de Organização
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Mantenha seus comprovantes de despesas dedutíveis (saúde, educação, previdência) organizados para facilitar o controle e sua declaração do Imposto de Renda.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Categorias de Arquivos</h3>
            <div className="space-y-2">
              {categoryCounts.map((cat, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedType(selectedType === cat.label ? null : cat.label)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer",
                    selectedType === cat.label ? "bg-emerald-50 border border-emerald-200" : "hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2.5 h-2.5 rounded-full", cat.color)} />
                    <span className="text-xs font-bold text-slate-800">{cat.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentForm: React.FC<{ onClose: () => void, initialData?: Document }> = ({ onClose, initialData }) => {
  const [name, setName] = React.useState(initialData?.name || "");
  const [type, setType] = React.useState(initialData?.type || "Recibo");
  const [fileSize, setFileSize] = React.useState(initialData?.size || "");
  const [fileData, setFileData] = React.useState(initialData?.fileData || "");
  const [selectedFileName, setSelectedFileName] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setSelectedFileName(selected.name);
      if (!name) {
        setName(selected.name.replace(/\.[^/.]+$/, ""));
      }
      
      const kb = selected.size / 1024;
      if (kb >= 1024) {
        setFileSize(`${(kb / 1024).toFixed(1)} MB`);
      } else {
        setFileSize(`${Math.max(1, Math.round(kb))} KB`);
      }

      // Read small preview if image or text
      if (selected.size < 2 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            setFileData(reader.result);
          }
        };
        reader.readAsDataURL(selected);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const uid = auth.currentUser?.uid || "default_user";

    try {
      if (initialData) {
        await updateDoc(doc(db, "documents", initialData.id), {
          name: name.trim(),
          type,
          size: fileSize || initialData.size || "15 KB",
          ...(fileData ? { fileData } : {}),
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, "documents"), {
          userId: uid,
          name: name.trim(),
          type,
          date: new Date().toLocaleDateString("pt-BR"),
          size: fileSize || "24 KB",
          ...(fileData ? { fileData } : {}),
          createdAt: new Date().toISOString()
        });
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, initialData ? OperationType.UPDATE : OperationType.WRITE, initialData ? `documents/${initialData.id}` : "documents");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100"
      >
        <div className="p-7">
          <h2 className="text-xl font-bold text-slate-900 mb-5">
            {initialData ? "Editar Documento" : "Novo Documento"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File upload input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Arquivo / Comprovante
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer bg-slate-50/70 hover:bg-emerald-50/40 transition-colors"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden" 
                />
                <UploadCloud size={24} className="mx-auto text-emerald-600 mb-1" />
                {selectedFileName ? (
                  <p className="text-xs font-bold text-slate-800 truncate">{selectedFileName} ({fileSize})</p>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-700">Clique para selecionar arquivo</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG ou comprovantes</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Nome do Arquivo
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#10B981] transition-all"
                placeholder="Ex: Recibo Aluguel Março"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Tipo
              </label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#10B981] transition-all"
              >
                <option value="Recibo">Recibo</option>
                <option value="Nota Fiscal">Nota Fiscal</option>
                <option value="Comprovante">Comprovante</option>
                <option value="Contrato">Contrato</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 px-4 bg-[#10B981] text-white rounded-2xl font-bold text-sm hover:bg-[#059669] shadow-md shadow-emerald-500/20 transition-all"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Documents;
