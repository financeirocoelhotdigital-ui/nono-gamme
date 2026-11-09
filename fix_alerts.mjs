import fs from 'fs';
let content = fs.readFileSync('src/components/Settings.tsx', 'utf-8');

content = content.replace(/alert\("Erro ao exportar dados\."\);/g, 'if (mostrarMensagem) mostrarMensagem("Erro ao exportar dados."); else alert("Erro ao exportar dados.");');
content = content.replace(/alert\(`Meta "\$\{goal.label\}" adicionada!`\);/g, 'if (mostrarMensagem) mostrarMensagem(`Meta "${goal.label}" adicionada!`);');
content = content.replace(/alert\("Erro ao adicionar meta\."\);/g, 'if (mostrarMensagem) mostrarMensagem("Erro ao adicionar meta.");');
content = content.replace(/alert\("Perfil atualizado!"\);/g, 'if (mostrarMensagem) mostrarMensagem("Perfil atualizado!");');
content = content.replace(/alert\("Erro ao atualizar perfil\."\);/g, 'if (mostrarMensagem) mostrarMensagem("Erro ao atualizar perfil.");');
content = content.replace(/alert\("E-mail atualizado!"\);/g, 'if (mostrarMensagem) mostrarMensagem("E-mail atualizado!");');
content = content.replace(/alert\(error.message \|\| "Erro ao atualizar e-mail\."\);/g, 'if (mostrarMensagem) mostrarMensagem(error.message || "Erro ao atualizar e-mail.");');
content = content.replace(/alert\("As senhas não coincidem\."\);/g, 'if (mostrarMensagem) mostrarMensagem("As senhas não coincidem.");');
content = content.replace(/alert\("Senha atualizada!"\);/g, 'if (mostrarMensagem) mostrarMensagem("Senha atualizada!");');
content = content.replace(/alert\(error.message \|\| "Erro ao atualizar senha\."\);/g, 'if (mostrarMensagem) mostrarMensagem(error.message || "Erro ao atualizar senha.");');

fs.writeFileSync('src/components/Settings.tsx', content);
