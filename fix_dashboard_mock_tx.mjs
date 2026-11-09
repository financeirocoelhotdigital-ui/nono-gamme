import fs from 'fs';
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

const oldMock = `  const mockRecentTxs = [
    { id: '1', name: 'Salário', type: 'income', category: 'Receita', value: 6250.00, date: 'Hoje', icon: <Wallet size={18} />, iconBg: 'bg-[#10B981]' },
    { id: '2', name: 'Supermercado', type: 'expense', category: 'Despesa', value: 320.50, date: 'Hoje', icon: <ShoppingBag size={18} />, iconBg: 'bg-[#EF4444]' },
    { id: '3', name: 'Combustível', type: 'expense', category: 'Despesa', value: 180.00, date: 'Ontem', icon: <Car size={18} />, iconBg: 'bg-[#3B82F6]' },
    { id: '4', name: 'Freelance', type: 'income', category: 'Receita', value: 1200.00, date: 'Ontem', icon: <Briefcase size={18} />, iconBg: 'bg-[#8B5CF6]' }
  ];`;

const newMock = `  const mockRecentTxs = transactions.slice(0, 4).map(t => {
    return {
      id: t.id,
      name: t.description || t.category,
      type: t.type,
      category: t.category,
      value: t.value,
      date: new Date(t.date).toLocaleDateString(),
      icon: t.type === 'income' ? <Wallet size={18} /> : <ShoppingBag size={18} />,
      iconBg: t.type === 'income' ? 'bg-[#10B981]' : 'bg-[#EF4444]'
    };
  });`;

content = content.replace(oldMock, newMock);
fs.writeFileSync('src/components/Dashboard.tsx', content);
