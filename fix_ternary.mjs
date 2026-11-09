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
    
    // We replaced `alert(` with `(window as any).mostrarMensagem ? (window as any).mostrarMensagem(`
    // We can change it to `((window as any).mostrarMensagem || window.alert)(`
    
    if (content.includes('(window as any).mostrarMensagem ? (window as any).mostrarMensagem(')) {
        content = content.replace(/\(window as any\)\.mostrarMensagem \? \(window as any\)\.mostrarMensagem\(/g, '((window as any).mostrarMensagem || window.alert)(');
        changed = true;
    }
    
    if (changed) {
        fs.writeFileSync(file, content);
    }
});
