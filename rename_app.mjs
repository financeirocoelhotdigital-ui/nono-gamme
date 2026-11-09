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
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.html') || file.endsWith('.json')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('src');
files.push('index.html');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let changed = false;
    
    if (content.includes('FinAssist')) {
        content = content.replace(/FinAssist/g, 'Bolso+');
        changed = true;
    }
    
    if (changed) {
        fs.writeFileSync(file, content);
    }
});
