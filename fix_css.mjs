import fs from 'fs';
let content = fs.readFileSync('src/index.css', 'utf-8');
content = content.replace('--color-bg-light: #F9FAFB;', '--color-bg-light: #F4F7F6;');
content = content.replace('--color-primary-dark: #06261F;', '--color-primary-dark: #FFFFFF;');
fs.writeFileSync('src/index.css', content);
