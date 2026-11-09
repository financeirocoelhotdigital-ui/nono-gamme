import React, { useState } from 'react';
import { useTax } from '../context/TaxContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  ChevronRight, 
  Download, 
  Search, 
  Filter, 
  Calendar,
  Calculator,
  Plus,
  Edit2,
  Trash2,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiscalType, FiscalCategory, Transaction } from '../types';

const TaxManagement: React.FC = () => {
  const { 
    fiscalYear, 
    setFiscalYear, 
    summary, 
    transactions, 
    updateFiscalClassification, 
    alerts 
  } = useTax();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions' | 'reports' | 'simulator'>('summary');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = transactions.filter(t => 
    (t.title || t.establishment || t.incomeSource || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fiscalTypes: { value: FiscalType; label: string; color: string }[] = [
    { value: 'tributavel', label: 'Tributável', color: 'text-red-600 bg-red-50' },
    { value: 'isento', label: 'Isento', color: 'text-green-600 bg-green-50' },
    { value: 'nao_tributavel', label: 'Não Tributável', color: 'text-gray-600 bg-gray-50' },
    { value: 'dedutivel', label: 'Dedutível', color: 'text-blue-600 bg-blue-50' },
  ];

  const fiscalCategories: { value: FiscalCategory; label: string }[] = [
    { value: 'salario', label: 'Salário' },
    { value: 'renda_extra', label: 'Renda Extra' },
    { value: 'aluguel', label: 'Aluguel' },
    { value: 'investimentos', label: 'Investimentos' },
    { value: 'despesas_medicas', label: 'Despesas Médicas' },
    { value: 'educacao', label: 'Educação' },
    { value: 'pensao', label: 'Pensão' },
    { value: 'outros', label: 'Outros' },
  ];

  const renderSummary = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-400">Total Rendimentos</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalIncome)}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs font-medium text-gray-400">Base Tributável</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalTaxable)}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-400">Total Isento</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalExempt)}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Calculator className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-400">Total Dedutível</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalDeductible)}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Alertas e Sugestões Fiscais</h3>
            <div className="space-y-4">
              {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                  <div key={index} className={`p-4 rounded-xl flex items-start gap-4 ${
                    alert.type === 'error' ? 'bg-red-50 border border-red-100' :
                    alert.type === 'warning' ? 'bg-amber-50 border border-amber-100' :
                    'bg-blue-50 border border-blue-100'
                  }`}>
                    <div className={`p-2 rounded-lg ${
                      alert.type === 'error' ? 'bg-red-100 text-red-600' :
                      alert.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {alert.type === 'error' ? <AlertTriangle className="w-5 h-5" /> :
                       alert.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                       <Info className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        alert.type === 'error' ? 'text-red-900' :
                        alert.type === 'warning' ? 'text-amber-900' :
                        'text-blue-900'
                      }`}>{alert.message}</p>
                      {alert.transactionId && (
                        <button 
                          onClick={() => {
                            const t = transactions.find(tx => tx.id === alert.transactionId);
                            if (t) setSelectedTransaction(t);
                          }}
                          className="mt-2 text-xs font-semibold underline"
                        >
                          Classificar agora
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 text-green-200 mx-auto mb-3" />
                  <p>Tudo em ordem com seus dados fiscais!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-slate-900">
            <h3 className="text-lg font-semibold mb-4">Simulação de Imposto</h3>
            <div className="space-y-4">
              <div>
                <p className="text-blue-100 text-sm">Imposto Estimado (Anual)</p>
                <p className="text-3xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.estimatedTax)}
                </p>
              </div>
              <div className="pt-4 border-t border-gray-50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-blue-100">Base de Cálculo</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalTaxable - summary.totalDeductible)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-100">Alíquota Efetiva</span>
                  <span className="font-medium">
                    {((summary.estimatedTax / (summary.totalTaxable || 1)) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('simulator')}
                className="w-full py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl font-semibold text-sm"
              >
                Ver Detalhes da Simulação
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo Fiscal</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria Fiscal</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {format(new Date(t.date), 'dd MMM', { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{t.title || t.establishment || t.incomeSource || 'Sem título'}</div>
                    <div className="text-xs text-gray-400">{t.category}</div>
                  </td>
                  <td className={`px-6 py-4 text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value)}
                  </td>
                  <td className="px-6 py-4">
                    {t.fiscalType ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        fiscalTypes.find(ft => ft.value === t.fiscalType)?.color
                      }`}>
                        {fiscalTypes.find(ft => ft.value === t.fiscalType)?.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Não classificado</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {fiscalCategories.find(fc => fc.value === t.fiscalCategory)?.label || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedTransaction(t)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Imposto de Renda</h1>
          <p className="text-gray-500">Organização e simulação fiscal para o ano de {fiscalYear}</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
          {[2024, 2025, 2026].map(year => (
            <button
              key={year}
              onClick={() => setFiscalYear(year)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                fiscalYear === year 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        {[
          { id: 'summary', label: 'Resumo Fiscal', icon: FileText },
          { id: 'transactions', label: 'Transações', icon: Receipt },
          { id: 'simulator', label: 'Simulador', icon: Calculator },
          { id: 'reports', label: 'Relatórios', icon: Download },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'summary' && renderSummary()}
          {activeTab === 'transactions' && renderTransactions()}
          {activeTab === 'simulator' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-center mb-8">
                <Calculator className="w-12 h-12 text-blue-200 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Simulador Detalhado</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  Compare a declaração simplificada e completa com base nos seus dados atuais.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-blue-100 bg-blue-50/30 p-6 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-full tracking-wider">Desconto 20%</div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Modelo Simplificado</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rendimento Tributável</span>
                      <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalTaxable)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Desconto Padrão</span>
                      <span className="font-semibold text-green-600">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalTaxable * 0.2)}</span>
                    </div>
                    <div className="h-px w-full bg-gray-200 my-2"></div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-gray-700">Base de Cálculo</span>
                      <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalTaxable * 0.8)}</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-blue-100">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Imposto Estimado</p>
                    <p className="text-2xl font-black text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalTaxable * 0.8 * 0.15)}</p>
                  </div>
                </div>

                <div className="border border-indigo-100 bg-indigo-50/30 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Modelo Completo</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rendimento Tributável</span>
                      <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalTaxable)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total de Deduções</span>
                      <span className="font-semibold text-green-600">- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalDeductible)}</span>
                    </div>
                    <div className="h-px w-full bg-gray-200 my-2"></div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-gray-700">Base de Cálculo</span>
                      <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, summary.totalTaxable - summary.totalDeductible))}</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-indigo-100">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Imposto Estimado</p>
                    <p className="text-2xl font-black text-indigo-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.estimatedTax)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'reports' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center py-20">
              <Download className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Relatórios para Declaração</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Gere arquivos prontos para importar no programa da Receita Federal ou PDFs organizados para seu contador.
              </p>
              <button className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                Gerar Relatório {fiscalYear}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Classification Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTransaction(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-slate-900">Classificação Fiscal</h3>
                <p className="text-sm text-gray-500">{selectedTransaction.title || selectedTransaction.establishment || selectedTransaction.incomeSource || 'Sem título'}</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo Fiscal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {fiscalTypes.map(ft => (
                      <button
                        key={ft.value}
                        onClick={() => {
                          updateFiscalClassification(selectedTransaction.id, ft.value, selectedTransaction.fiscalCategory || 'outros');
                          setSelectedTransaction({ ...selectedTransaction, fiscalType: ft.value });
                        }}
                        className={`p-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                          selectedTransaction.fiscalType === ft.value
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-100 hover:border-gray-200 text-gray-600'
                        }`}
                      >
                        {ft.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Categoria Fiscal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {fiscalCategories.map(fc => (
                      <button
                        key={fc.value}
                        onClick={() => {
                          updateFiscalClassification(selectedTransaction.id, selectedTransaction.fiscalType || 'nao_tributavel', fc.value);
                          setSelectedTransaction({ ...selectedTransaction, fiscalCategory: fc.value });
                        }}
                        className={`p-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                          selectedTransaction.fiscalCategory === fc.value
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-100 hover:border-gray-200 text-gray-600'
                        }`}
                      >
                        {fc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setSelectedTransaction(null)}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                >
                  Fechar
                </button>
                <button 
                  onClick={() => setSelectedTransaction(null)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaxManagement;
