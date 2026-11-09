const fs = require('fs');
let code = fs.readFileSync('src/components/Investments.tsx', 'utf8');

const regex = /<div className="grid grid-cols-2 gap-4">\s*<div className="space-y-2">\s*<label className="text-\[10px\] font-black text-gray-400 uppercase tracking-\[0.1em\] ml-1">Tipo<\/label>[\s\S]*?Rentabilidade \(%\)<\/label>\s*<input\s*type="number"\s*step="0.01"\s*required\s*value=\{monthlyYield\}[\s\S]*?<\/div>\s*<\/div>/;

const replacement = `<div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Tipo</label>
              <select 
                value={mainType}
                onChange={e => setMainType(e.target.value)} 
                className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-gray-900 cursor-pointer"
              >
                <optgroup label="Tradicionais">
                  <option value="cdb">CDB</option>
                  <option value="poupanca">Poupança</option>
                  <option value="acoes">Ações</option>
                  <option value="fundo">Fundos</option>
                  <option value="tesouro">Tesouro Direto</option>
                  <option value="lci">LCI</option>
                  <option value="lca">LCA</option>
                </optgroup>
                <option value="cripto">Criptomoedas</option>
                <optgroup label="Outros">
                  <option value="outro">Outro</option>
                </optgroup>
              </select>
            </div>
            
            {mainType === "cripto" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Moeda</label>
                <select 
                  value={cryptoCoin}
                  onChange={e => setCryptoCoin(e.target.value)} 
                  className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-gray-900 cursor-pointer"
                >
                  <option value="bitcoin">Bitcoin (BTC)</option>
                  <option value="ethereum">Ethereum (ETH)</option>
                  <option value="tether">Tether (USDT)</option>
                  <option value="bnb">BNB</option>
                  <option value="solana">Solana (SOL)</option>
                  <option value="xrp">XRP</option>
                  <option value="usdc">USDC</option>
                  <option value="cardano">Cardano (ADA)</option>
                  <option value="avalanche">Avalanche (AVAX)</option>
                  <option value="dogecoin">Dogecoin (DOGE)</option>
                  <option value="cripto">Outra Criptomoeda</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Data de Início</label>
                <input 
                  type="date" 
                  required 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-gray-900" 
                />
              </div>
            )}
          </div>
          
          {mainType === "cripto" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Data de Início</label>
              <input 
                type="date" 
                required 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-gray-900" 
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Valor Inicial</label>
              <input 
                type="number" 
                step="0.01" 
                required 
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-gray-900"
                placeholder="R$ 0,00" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] ml-1">Rentabilidade (%)</label>
              <div className="flex flex-col gap-2">
                <input 
                  type="number" 
                  step="0.01" 
                  required={!isManualYield}
                  disabled={isManualYield}
                  value={isManualYield ? "" : monthlyYield}
                  onChange={e => setMonthlyYield(e.target.value)}
                  className="w-full rounded-[16px] bg-gray-50 border border-gray-200 py-4 px-5 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all text-gray-900 disabled:opacity-50"
                  placeholder={isManualYield ? "N/A" : "0,00%"} 
                />
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input 
                    type="checkbox" 
                    checked={isManualYield}
                    onChange={e => setIsManualYield(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] font-medium text-gray-600">Lucro manual</span>
                </label>
              </div>
            </div>
          </div>`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/components/Investments.tsx', code);
  console.log('Regex replace successful');
} else {
  console.log('Regex target not found');
}
