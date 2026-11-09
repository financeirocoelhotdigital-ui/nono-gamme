import fs from 'fs';
let content = fs.readFileSync('src/components/Settings.tsx', 'utf-8');

const oldDelete = `const batch = writeBatch(db);
          for (const collName of collectionsToDelete) {
            const q = query(collection(db, collName), where("userId", "==", user.uid));
            const snapshot = await getDocs(q);
            snapshot.forEach((doc) => batch.delete(doc.ref));
          }
          
          batch.delete(doc(db, "users", user.uid));
          await batch.commit();`;

const newDelete = `for (const collName of collectionsToDelete) {
            try {
              const q = query(collection(db, collName), where("userId", "==", user.uid));
              const snapshot = await getDocs(q);
              await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
            } catch (e) {
              console.warn("Aviso:", e);
            }
          }
          await deleteDoc(doc(db, "users", user.uid));`;

content = content.replace(oldDelete, newDelete);
fs.writeFileSync('src/components/Settings.tsx', content);
