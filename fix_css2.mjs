import fs from 'fs';
let content = fs.readFileSync('src/index.css', 'utf-8');
content = content.replace('--color-primary-dark: #FFFFFF;', '--color-primary-dark: #0F172A;'); // Slate 900
fs.writeFileSync('src/index.css', content);
