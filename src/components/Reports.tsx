import React from "react";
import { formatCurrency, cn } from "../lib/utils";
import { FileText, Download, TrendingUp, TrendingDown, PieChart, BarChart, Calendar, Filter, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

import { Transaction, Debt } from "../types";

import { useTransacoes } from "../context/TransacoesContext";
import { useDebts } from "../context/DebtsContext";

interface ReportsProps {}

const Reports: React.FC<ReportsProps> = () => {
  const { transactions } = useTransacoes();
  const { debts } = useDebts();
  
  const exportToCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ["Data", "Descrição", "Categoria", "Valor", "Tipo", "Conta"];
    const rows = transactions.map(t => [
      t.date,
      t.description || t.establishment || "Sem descrição",
      t.category,
      t.value.toString(),
      t.type,
      t.accountId
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDebtsToCSV = () => {
    if (debts.length === 0) return;
    
    const headers = ["Dívida", "Credor", "Valor Total", "Valor Pago", "Restante", "Status", "Urgência"];
    const rows = debts.map(d => [
      d.name,
      d.creditor,
      d.totalValue.toString(),
      d.paidValue.toString(),
      d.remainingValue.toString(),
      d.status,
      d.urgency
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_dividas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCategoriesToCSV = () => {
    const expenseTx = transactions.filter(t => t.type === "expense");
    if (expenseTx.length === 0) return;

    const categoriesMap: { [key: string]: number } = {};
    let totalExpenses = 0;
    expenseTx.forEach(t => {
      categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.value;
      totalExpenses += t.value;
    });

    const headers = ["Categoria", "Total Gasto", "Porcentagem (%)"];
    const rows = Object.entries(categoriesMap).map(([catName, value]) => [
      catName,
      value.toFixed(2),
      ((value / totalExpenses) * 100).toFixed(1) + "%"
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_gastos_categoria_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportEmotionsToCSV = () => {
    const emotionTx = transactions.filter(t => t.emotion);
    if (emotionTx.length === 0) return;

    const emotionsMap: { [key: string]: { total: number, count: number } } = {};
    emotionTx.forEach(t => {
      if (!t.emotion) return;
      if (!emotionsMap[t.emotion]) {
        emotionsMap[t.emotion] = { total: 0, count: 0 };
      }
      emotionsMap[t.emotion].total += t.value;
      emotionsMap[t.emotion].count += 1;
    });

    const headers = ["Emoção", "Total Gasto", "Quantidade de Transações", "Ticket Médio"];
    const rows = Object.entries(emotionsMap).map(([emotion, data]) => [
      emotion,
      data.total.toFixed(2),
      data.count.toString(),
      (data.total / data.count).toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_gastos_emocionais_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFamilyIncomeToCSV = () => {
    const incomeTx = transactions.filter(t => t.type === "income");
    if (incomeTx.length === 0) return;

    const sourcesMap: { [key: string]: number } = {};
    let totalIncome = 0;
    incomeTx.forEach(t => {
      const src = t.incomeSource || t.category || "Outros";
      sourcesMap[src] = (sourcesMap[src] || 0) + t.value;
      totalIncome += t.value;
    });

    const headers = ["Fonte de Renda", "Total Recebido", "Porcentagem (%)"];
    const rows = Object.entries(sourcesMap).map(([src, value]) => [
      src,
      value.toFixed(2),
      ((value / totalIncome) * 100).toFixed(1) + "%"
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_renda_familiar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportWealthToCSV = () => {
    const headers = ["Data", "Descrição", "Tipo", "Categoria", "Valor"];
    const rows = transactions.map(t => [
      t.date,
      t.description || t.establishment || "Sem descrição",
      t.type === "income" ? "Entrada" : t.type === "expense" ? "Saída" : "Transferência",
      t.category,
      t.value.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_evolucao_patrimonial_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportCategories = [
    { id: "general", label: "Relatório Geral", icon: FileText, color: "bg-slate-900 text-white" },
    { id: "categories", label: "Gastos por Categoria", icon: PieChart, color: "bg-emerald-600 text-white" },
    { id: "emotions", label: "Gastos por Emoção", icon: TrendingUp, color: "bg-rose-500 text-white" },
    { id: "family", label: "Renda Familiar", icon: Calendar, color: "bg-orange-500 text-white" },
    { id: "wealth", label: "Evolução Patrimonial", icon: BarChart, color: "bg-emerald-600 text-white" },
    { id: "debts", label: "Relatório de Dívidas", icon: AlertCircle, color: "bg-rose-500 text-white" },
  ];

  const recentReports = [
    { name: "Fechamento Mensal - Fevereiro 2026", date: "01/03/2026", size: "1.2 MB", format: "PDF" },
    { name: "Análise de Gastos Emocionais Q1", date: "25/02/2026", size: "850 KB", format: "PDF" },
    { name: "Extrato Consolidado 2025", date: "10/01/2026", size: "4.5 MB", format: "XLSX" },
  ];

  const handleReportClick = (id: string) => {
    if (id === "general") exportToCSV();
    else if (id === "debts") exportDebtsToCSV();
    else if (id === "categories") exportCategoriesToCSV();
    else if (id === "emotions") exportEmotionsToCSV();
    else if (id === "family") exportFamilyIncomeToCSV();
    else if (id === "wealth") exportWealthToCSV();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios e Análises</h1>
          <p className="text-sm text-gray-500">Exporte e analise seus dados financeiros</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 border border-gray-200 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all active:scale-95">
          <Filter size={18} />
          <span>Filtros Avançados</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportCategories.map((cat) => (
                <motion.button
                  key={cat.id}
                  whileHover={{ y: -4 }}
                  onClick={() => handleReportClick(cat.id)}
                  className="bg-white p-6 rounded-4xl border border-gray-100 premium-shadow flex flex-col items-center text-center gap-4 group transition-all hover:border-primary-green/30 cursor-pointer"
                >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg", cat.color)}>
                  <cat.icon size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{cat.label}</h4>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Gerar Agora</p>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="bg-white rounded-4xl p-6 border border-gray-100 premium-shadow">
            <h3 className="text-lg font-bold text-slate-900 mb-6 px-2">Relatórios Recentes</h3>
            <div className="space-y-3">
              {recentReports.map((report, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 group hover:bg-white hover:shadow-sm transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{report.name}</p>
                      <p className="text-xs text-gray-500">{report.date} • {report.size} • {report.format}</p>
                    </div>
                  </div>
                  <button className="p-2 text-slate-900 hover:bg-emerald-50 rounded-xl transition-colors">
                    <Download size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-4xl p-6 text-slate-900 border border-gray-100 premium-shadow">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600" />
              Análise de Tendência
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              Seus gastos na categoria "Lazer" aumentaram 15% nos últimos 3 meses. Gerar um relatório detalhado pode ajudar a identificar onde economizar.
            </p>
            <button className="mt-6 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer">
              Ver Análise Completa
            </button>
          </div>

          <div className="bg-white rounded-4xl p-6 border border-gray-100 premium-shadow">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Formatos de Exportação</h3>
            <div className="grid grid-cols-3 gap-2">
              {["PDF", "Excel", "CSV"].map((fmt, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs font-bold text-slate-900">{fmt}</span>
                  <div className="w-6 h-6 rounded bg-primary-green/20 flex items-center justify-center text-slate-900">
                    <Download size={12} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
