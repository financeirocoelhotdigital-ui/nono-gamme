const fs = require('fs');
let code = fs.readFileSync('src/components/Income.tsx', 'utf8');

code = code.replace(
  /if \(\!value \|\| \!category \|\| \!accountId\) return;/,
  `if (!value) {\n      alert("Por favor, preencha o valor da transação.");\n      return;\n    }\n    if (showInlineAddCategory && newCategoryName.trim()) {\n      alert("Você está criando uma nova categoria. Por favor, clique em OK ao lado do nome da categoria primeiro.");\n      return;\n    }\n    if (!category) {\n      alert("Por favor, selecione uma categoria.");\n      return;\n    }\n    if (!accountId) {\n      alert("Por favor, selecione uma conta.");\n      return;\n    }`
);

fs.writeFileSync('src/components/Income.tsx', code);
