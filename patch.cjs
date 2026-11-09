const fs = require('fs');
let code = fs.readFileSync('src/components/Investments.tsx', 'utf8');

code = code.replace(
  'const [type, setType] = useState<InvestmentType>("cdb");',
  'const [mainType, setMainType] = useState<string>("cdb");\n  const [cryptoCoin, setCryptoCoin] = useState<string>("bitcoin");\n  const [isManualYield, setIsManualYield] = useState(false);'
);

code = code.replace(
  'type,',
  'type: mainType === "cripto" ? cryptoCoin : mainType,'
);

code = code.replace(
  'value={type}',
  'value={mainType}'
);

code = code.replace(
  'onChange={e => setType(e.target.value as any)}',
  'onChange={e => setType(e.target.value as any)} // will be replaced next'
);

fs.writeFileSync('src/components/Investments.tsx', code);
console.log('Done replacing state variables');
