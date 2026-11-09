import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// revert the mess
content = content.replace(/  const mostrarMensagem = \(msg: string\) => \{\n    setDebugMsg\(msg\);\n    setTimeout\(\(\) => setDebugMsg\(null\), 3000\);\n  \};\n  \n  useEffect\(\(\) => \{\n    \(window as any\).mostrarMensagem = mostrarMensagem;\n  \}, \[\]\);\n  \n  \/\/ ignore this to avoid duplicating if we run it twice\n  const _mostrarMensagem = \(msg: string\) => \{/, "  const mostrarMensagem = (msg: string) => {");

const properReplace = `
  const mostrarMensagem = (msg: string) => {
    setDebugMsg(msg);
    if (!(window as any).mostrarMensagem) {
      (window as any).mostrarMensagem = (m: string) => {
         setDebugMsg(m);
         setTimeout(() => setDebugMsg(null), 3000);
      };
    }
`;

content = content.replace("  const mostrarMensagem = (msg: string) => {", properReplace);
fs.writeFileSync('src/App.tsx', content);

