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
    
    // Only remove harmless debug logs, keep warns and errors
    const patterns = [
        /console\.log\("Iniciando processamento da imagem\.\.\."\);/g,
        /console\.log\("Dados extraídos com sucesso:", data\);/g,
        /console\.log\("Creating with data:", data\);/g,
        /console\.log\("\[Wealth\].*"\);/g,
        /console\.log\("Botão funcionando"\);/g,
        /console\.log\("Iniciando reset total do aplicativo.*"\);/g,
        /console\.log\("Dados do Firestore limpos.*"\);/g,
        /console\.log\("Armazenamento local e cache limpos\."\);/g,
        /console\.log\("Perfil do usuário resetado no Firestore\."\);/g,
        /console\.log\("Reset executado"\);/g,
        /console\.log\("Reset concluído.*"\);/g,
        /console\.log\("CREATING ACCOUNT PAYLOAD: ".*?\);/g,
        /console\.log\("Debug:".*?\);/g
    ];

    patterns.forEach(pattern => {
        if (content.match(pattern)) {
            content = content.replace(pattern, '');
            changed = true;
        }
    });
    
    if (changed) {
        fs.writeFileSync(file, content);
    }
});
