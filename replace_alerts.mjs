import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let changed = false;
    
    if (content.includes('alert(') || content.includes('window.alert(')) {
        content = content.replace(/window\.alert\(/g, '(window as any).mostrarMensagem ? (window as any).mostrarMensagem(');
        // Be careful not to replace things like `some_alert(` but strictly `alert(` or ` alert(`
        content = content.replace(/(?<!\w)alert\(/g, '(window as any).mostrarMensagem ? (window as any).mostrarMensagem(');
        changed = true;
    }
    
    if (changed) {
        fs.writeFileSync(file, content);
    }
});
