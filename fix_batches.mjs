import fs from 'fs';
let content = fs.readFileSync('src/components/Settings.tsx', 'utf-8');

// In handleResetData
content = content.replace(/const batch = writeBatch\(db\);\s*snapshot\.forEach\(\(doc\) => batch\.delete\(doc\.ref\)\);\s*await batch\.commit\(\);/g, 
  'await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));');

// In handleResetApp
content = content.replace(/const batch = writeBatch\(db\);\s*snapshot\.forEach\(doc => batch\.delete\(doc\.ref\)\);\s*await batch\.commit\(\);/g, 
  'await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));');

fs.writeFileSync('src/components/Settings.tsx', content);
