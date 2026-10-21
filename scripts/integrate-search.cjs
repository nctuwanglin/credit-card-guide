const fs=require('node:fs');
const path=require('node:path');
function allTiers(cards){return cards.flatMap(c=>c.schemes?c.schemes.flatMap(s=>s.tiers.map(t=>({c,t,scheme:s.name}))):(c.tiers||[]).map(t=>({c,t,scheme:null})));}
const key=x=>JSON.stringify([x.cardId,x.scheme||null,x.label]);
const CANONICAL={'臺鐵':'台鐵','LINEGO':'LINE GO','PChome 24h購物':'PChome','台灣中油直營站':'中油直營','唐吉軻德':'唐吉訶德','大阪環球影城':'日本環球影城','毛蔬 亞洲蔬食':'毛蔬亞洲蔬食'};
function normalizeNames(rule){
  const aliases={},name=n=>CANONICAL[n]||n;
  for(const n of rule.merchants||[]){const k=name(n);aliases[k]=[...new Set([...(aliases[k]||[]),...(rule.aliases?.[n]||[]),...(n===k?[]:[n])])];}
  rule.merchants=[...new Set((rule.merchants||[]).map(name))];
  if(rule.aliases||Object.values(aliases).some(a=>a.length))rule.aliases=aliases;
  if(rule.queryScenarios)rule.queryScenarios=Object.fromEntries(Object.entries(rule.queryScenarios).map(([n,v])=>[name(n),v]));
  for(const g of rule.rules||[])normalizeNames(g);
}
function integrateSearch(cards,rows){
  const tiers=allTiers(cards),known=new Map(tiers.map(x=>[key({cardId:x.c.id,scheme:x.scheme,label:x.t.label}),x]));
  const seen=new Set();
  for(const r of rows){
    const k=key(r);if(!known.has(k))throw Error('不存在的優惠層 '+k);
    if(seen.has(k))throw Error('重複的優惠層 '+k);seen.add(k);
    if(!['verified','expired','nonMerchant','unresolved'].includes(r.status))throw Error('無效狀態 '+k);
  }
  const missing=[...known.keys()].filter(k=>!seen.has(k));if(missing.length)throw Error('缺少搜尋覆蓋紀錄 '+missing.join('\n'));
  for(const r of rows){
    const {t}=known.get(key(r));
    const allowed=['status','reason','merchants','aliases','source','checkedAt','end','channels','searchType','rules','queryScenarios','qualifier','gaps'];
    t.search=Object.fromEntries(allowed.filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));
    t.search.merchants ||= [];
    // Deep copy: normalizing output must not mutate the raw audit supplied by callers.
    t.search=structuredClone(t.search);normalizeNames(t.search);
    for(const k of ['merchants','merchantCheckedAt','merchantEnd','merchantNote'])delete t[k];
  }
  return cards;
}
function coverageReport(cards){
  const tiers=allTiers(cards),counts={verified:0,expired:0,nonMerchant:0,unresolved:0,missing:0};
  for(const {t} of tiers)counts[t.search?.status||'missing']++;
  const partial=tiers.filter(x=>x.t.search?.status==='verified'&&x.t.search?.gaps?.length).length;
  const pending=counts.unresolved+counts.missing+partial;
  let out='# 商家搜尋覆蓋報告\n\n'+`${cards.length}張卡／${tiers.length}層；已確認 ${counts.verified}、已過期 ${counts.expired}、非商家型 ${counts.nonMerchant}、待確認 ${counts.unresolved}、缺少紀錄 ${counts.missing}。\n\n`;
  out+=`已確認層中仍有 ${partial} 層只完成部分商家／渠道；已確認不等於完整名單。\n\n`;
  out+=pending?'**未完成完整涵蓋**：以下待確認項目不進入搜尋推薦；部分完成層僅推薦已核實的子項目。\n\n':'所有層已有狀態；仍須依各銀行名單完整性確認，不代表全市場或任意交易皆適用。\n\n';
  out+='| 卡片 | 已確認 | 其中部分完成 | 已過期 | 非商家型 | 未決 |\n|---|---:|---:|---:|---:|---:|\n';
  for(const c of cards){const a=tiers.filter(x=>x.c.id===c.id);const n=s=>a.filter(x=>x.t.search?.status===s).length;out+=`| ${c.name} | ${n('verified')} | ${a.filter(x=>x.t.search?.status==='verified'&&x.t.search?.gaps?.length).length} | ${n('expired')} | ${n('nonMerchant')} | ${a.length-n('verified')-n('expired')-n('nonMerchant')} |\n`;}
  for(const c of cards){out+=`\n## ${c.name}\n\n`;for(const {t,scheme} of tiers.filter(x=>x.c.id===c.id)){const s=t.search;out+=`- **${s?.status||'missing'}** ${scheme?scheme+'／':''}${t.label}：${s?.reason||'尚無紀錄'}\n`;
    if(s?.merchants?.length)out+=`  - 商家／查詢項目：${s.merchants.join('、')}\n`;
    if(s?.source)out+=`  - 來源：${s.source}；查證：${s.checkedAt||'未知'}；截止：${s.end||'未知'}\n`;
    for(const gap of s?.gaps||[])out+=`  - 未完成：${gap}\n`;
  }}return out;
}
module.exports={integrateSearch,coverageReport,allTiers};
if(require.main===module){
  const root=path.resolve(__dirname,'..');
  const file=path.join(root,fs.existsSync(path.join(root,'2026信用卡回饋指南.html'))?'2026信用卡回饋指南.html':'index.html');
  const html=fs.readFileSync(file,'utf8'),match=html.match(/const cards =\s*(\[[\s\S]*?\n\]);/);
  const cards=JSON.parse(match[1]);
  const rows=['esun','plans','ubot-dbs','miles-ctbc'].flatMap(g=>JSON.parse(fs.readFileSync(path.join(root,'research',`search-${g}.json`),'utf8')));
  integrateSearch(cards,rows);
  const {validateData}=require('../validate-data.cjs');
  const scenarios=JSON.parse(html.match(/const scenarios = (\[[^\n]+\]);/)[1]);
  const validation=validateData({cards,scenarios});
  if(validation.errors.length)throw Error(validation.errors.join('\n'));
  if(process.argv.includes('--write')){
    fs.writeFileSync(file,html.replace(match[0],'const cards = '+JSON.stringify(cards,null,2)+';'));
    fs.writeFileSync(path.join(root,'搜尋覆蓋報告.md'),coverageReport(cards));
  }
  console.log(coverageReport(cards).split('\n').slice(0,7).join('\n'));
}
