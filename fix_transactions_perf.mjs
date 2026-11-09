import fs from 'fs';
let content = fs.readFileSync('src/context/TransacoesContext.tsx', 'utf-8');

const oldLogic = `          // Merge Firestore docs with local storage
          const localList = getStoredTransactions();
          const merged = [...transactionsData];
          
          for (const localTx of localList) {
            if (!merged.some(t => t.id === localTx.id)) {
              merged.push(localTx);
            }
          }
          
          merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());`;

const newLogic = `          // Merge Firestore docs with local storage
          const mergedMap = new Map();
          transactionsData.forEach(t => mergedMap.set(t.id, t));
          
          const localList = getStoredTransactions();
          for (const localTx of localList) {
            if (!mergedMap.has(localTx.id)) {
              mergedMap.set(localTx.id, localTx);
            }
          }
          
          const merged = Array.from(mergedMap.values());
          merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/context/TransacoesContext.tsx', content);
