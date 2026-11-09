# 🚀 Como Subir o Bolso+ na Vercel

Os arquivos do projeto já estão **100% configurados e prontos** para deploy direto na Vercel com suporte completo para a aplicação React/Vite (Frontend SPA) e as funções de API/IA (Backend Serverless).

### 🩺 Correção da "Tela Branca" no Deploy:
Identificamos e corrigimos as 4 causas que provocavam a tela branca na Vercel:
1. **Dependência circular no Rollup (`vendor` ➔ `react-vendor` ➔ `vendor`):** O `vite.config.ts` anterior dividia pedaços do React e bibliotecas de forma que o navegador tentava carregar variáveis do React antes de inicializá-las. Removemos o particionamento manual incorreto, garantindo carregamento 100% limpo.
2. **Reescrita incorreta de assets no `vercel.json`:** Ajustamos o regex do rewrite (`/((?!assets/|.*\\..*).*)`) para que arquivos `.js` e `.css` nunca sejam redirecionados para o HTML (o que causava erro de MIME type no navegador).
3. **Resiliência do Firebase:** O Firebase agora possui fallbacks caso o navegador restrinja IndexedDB ou cache de abas.
4. **Timeout de carregamento e ErrorBoundary:** Adicionado timeout de 2.5s no `App.tsx` e tela de carregamento visual no `index.html` para impedir que a tela fique branca enquanto conecta à nuvem.

---

## 📁 Arquivos de Configuração Inclusos
1. **`vercel.json`**: Configura o build do Vite, a pasta `dist` e o roteamento automático do `/api/*` e do SPA.
2. **`api/index.ts`**: Ponto de entrada das funções serverless da Vercel (Gemini AI, gestão de usuários, comunicados e relatórios).
3. **`server.ts`**: Compatibilizado tanto para rodar localmente quanto na Vercel sem conflito de portas ou leitura de arquivos somente leitura.
4. **`.env.example`**: Lista de variáveis de ambiente necessárias.

---

## 🛠️ Passo a Passo para o Deploy

### Opção 1: Conectando com GitHub (Recomendado)
1. Suba o código do projeto para um repositório no seu **GitHub** (pode ser público ou privado).
2. Acesse [vercel.com](https://vercel.com) e faça login.
3. Clique em **"Add New..."** ➔ **"Project"**.
4. Importe o repositório do seu GitHub.
5. **Project Name (Nome do Projeto):** A Vercel costuma sugerir o nome da pasta ou branch (ex: `bolso-main`). **Altere o campo "Project Name" para `bolso-plus`** (assim seu domínio será `https://bolso-plus.vercel.app` em vez de `bolso-main`).
   > *Se você já criou o projeto com o nome `bolso-main`, basta ir em **Settings ➔ General ➔ Project Name**, alterar para `bolso-plus` e clicar em **Save**.*
6. Em **Framework Preset**, a Vercel detectará automaticamente **Vite**.
7. Em **Environment Variables (Variáveis de Ambiente)**, adicione:
   - `GEMINI_API_KEY`: Sua chave de API do Google Gemini (para as funções de IA).
   - `ADMIN_EMAIL`: `dicasdereceitas1993@gmail.com`
8. Clique em **Deploy**! Em menos de 1 minuto seu app estará no ar com link `https://bolso-plus.vercel.app`.

---

### Opção 2: Pelo Terminal via Vercel CLI
Se preferir subir direto pelo terminal da sua máquina:
```bash
# 1. Instale a Vercel CLI (caso ainda não tenha)
npm install -g vercel

# 2. Faça login na sua conta Vercel
vercel login

# 3. Na raiz do projeto, execute o comando de deploy:
vercel --prod
```

---

## ⚠️ Passo Importante no Firebase (Login com Google & Autenticação)
Para que o login com Google e o Firebase Auth funcionem no domínio da Vercel:
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Selecione o projeto `gen-lang-client-0297514368`.
3. Vá em **Authentication** ➔ aba **Settings (Configurações)** ➔ **Authorized domains (Domínios autorizados)**.
4. Clique em **Add domain** e adicione o seu domínio da Vercel (ex: `seu-projeto.vercel.app`).
5. Salve. Pronto! O login com Google e e-mail funcionará perfeitamente.
