import fs from 'fs';
let content = fs.readFileSync('src/context/PiggyBankContext.tsx', 'utf-8');

// Remove orderBy from query
content = content.replace(
  'const q = query(\n      collection(db, "piggyBanks"),\n      where("userId", "==", uid),\n      orderBy("createdAt", "desc")\n    );',
  'const q = query(\n      collection(db, "piggyBanks"),\n      where("userId", "==", uid)\n    );'
);

// Sort in Javascript
content = content.replace(
  'const banks = snapshot.docs.map(doc => ({\n        id: doc.id,\n        ...doc.data()\n      })) as PiggyBank[];\n      setPiggyBanks(banks);',
  'const banks = snapshot.docs.map(doc => ({\n        id: doc.id,\n        ...doc.data()\n      })) as PiggyBank[];\n      banks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());\n      setPiggyBanks(banks);'
);

fs.writeFileSync('src/context/PiggyBankContext.tsx', content);
