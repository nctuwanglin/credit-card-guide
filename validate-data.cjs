const fs=require('node:fs');
const path=require('node:path');
const defaultFile=path.join(__dirname,fs.existsSync(path.join(__dirname,'2026信用卡回饋指南.html'))?'2026信用卡回饋指南.html':'index.html');
function readData(file=process.env.DASHBOARD_FILE||defaultFile){
  const html=fs.readFileSync(file,'utf8');
  return {cards:JSON.parse(html.match(/const cards =\s*(\[[\s\S]*?\n\]);/)[1]),scenarios:JSON.parse(html.match(/const scenarios = (\[[^\n]+\]);/)[1])};
}
function validateData({cards,scenarios}){
  const errors=[],warnings=[],ids=new Set();
  const periods=new Set(['month','statement','quarter','year','campaign','day','membership','benefitYear','postingMonth','reportingMonth','paymentMonth']);
  const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  const url=v=>{try{return new URL(v).protocol==='https:';}catch{return false;}};
  if(!Array.isArray(cards)||!Array.isArray(scenarios))return {errors:['缺少卡片或情境陣列'],warnings};
  const allowed=new Set([...scenarios.filter(s=>s!=='全部'),'哩程']);
  for(const c of cards){
    const fail=m=>errors.push(`${c.id||'未知卡片'}：${m}`);
    if(!c.id||ids.has(c.id))fail('卡片 id 缺少或重複');ids.add(c.id);
    if(!c.name||!url(c.url))fail('缺少卡名或有效 HTTPS 官網');
    if(c.tiers!==undefined&&c.schemes!==undefined)fail('tiers 與 schemes 必須互斥，否則展示與推薦不一致');
    if(c.feeSource&&!url(c.feeSource))fail('feeSource 連結無效');
    if(c.pointSources!==undefined&&(!Array.isArray(c.pointSources)||c.pointSources.some(s=>!url(s))))fail('pointSources 連結無效');
    for(const k of ['feeCheckedAt','pointsCheckedAt','end'])if(c[k]!=null&&!date(c[k]))fail(`${k} 日期無效`);
    if(!Array.isArray(c.tags)||c.tags.some(s=>!allowed.has(s)))fail('tags 情境無效');
    const offers=[...(c.tiers||[]),...(c.schemes||[]).flatMap(s=>(s.tiers||[]).map(t=>({...t,source:t.source||s.source})))];
    if(!offers.length)fail('缺少優惠層');
    for(const t of offers){
      const error=m=>fail(`${t.label||'未命名優惠'}：${m}`);
      const warn=m=>warnings.push(`${c.id}/${t.label}：${m}`);
      if(!t.label||typeof t.rate!=='string'||!t.rate.trim())error('缺少 label/rate');
      else if(!/^\d+(\.\d+)?$/.test(t.rate)&&!(/^\d+(\.\d+)?元\/哩$/.test(t.rate)&&parseFloat(t.rate)>0)&&!/^\d+(H|折|點|元券)$/.test(t.rate)&&!/^\$\d+$/.test(t.rate)&&!['權益','折扣','☕'].includes(t.rate)&&!(/^\+\d+(\.\d+)?$/.test(t.rate)&&Array.isArray(t.scenarios)&&t.scenarios.length===0))error('rate 格式無效');
      if(!url(t.source))error('缺少有效 HTTPS source');
      if(t.search!==undefined){
        const s=t.search;
        if(!s||!['verified','expired','nonMerchant','unresolved'].includes(s.status))error('search 狀態無效');
        else {
          if(typeof s.reason!=='string'||!s.reason.trim())error('search 缺少覆蓋說明');
          if(!Array.isArray(s.merchants)||s.merchants.some(n=>typeof n!=='string'||!n.trim())||new Set(s.merchants).size!==s.merchants.length)error('search 商家清單無效');
          if(s.aliases&&(typeof s.aliases!=='object'||Array.isArray(s.aliases)||Object.entries(s.aliases).some(([n,a])=>!s.merchants?.includes(n)||!Array.isArray(a)||a.some(x=>typeof x!=='string'||!x.trim()))))error('search 別名對應無效');
          if(s.status==='verified'){
            if(!s.merchants?.length||!url(s.source)||!date(s.checkedAt)||!date(s.end))error('verified search 缺少有效商家／來源／日期');
            if(!Array.isArray(s.channels)||!s.channels.length||s.channels.some(x=>typeof x!=='string'||!x.trim()))error('search 缺少交易方式');
            if(!['cash','mile','perk'].includes(s.searchType))error('searchType 無效');
            if(s.searchType==='cash'&&!/^\d+(\.\d+)?$/.test(t.rate))error('cash search 回饋單位無效');
            if(s.searchType==='mile'&&!/^\d+(\.\d+)?元\/哩$/.test(t.rate))error('mile search 回饋單位無效');
            if(date(t.end)&&s.end>t.end)error('search 日期不能超過優惠期間');
          }
          if(s.status==='unresolved')warn('搜尋涵蓋待確認：'+s.reason);
          if(s.gaps!==undefined&&(!Array.isArray(s.gaps)||s.gaps.some(x=>typeof x!=='string'||!x.trim())))error('search gaps 無效');
          for(const gap of Array.isArray(s.gaps)?s.gaps:[])warn('搜尋部分缺口：'+gap);
          if(s.rules!==undefined&&(!Array.isArray(s.rules)||!s.rules.length))error('search rules 無效');
          const groups=Array.isArray(s.rules)?s.rules:[];
          const groupKeys=new Set(['merchants','aliases','channels','qualifier','queryScenarios']);
          for(const g of groups){
            if(!g||Object.keys(g).some(k=>!groupKeys.has(k))){error('search group 不可覆寫回饋或查證欄位');continue;}
            if(!Array.isArray(g.merchants)||!g.merchants.length||g.merchants.some(n=>!s.merchants?.includes(n))||new Set(g.merchants).size!==g.merchants.length)error('search group 商家無效');
            if(!Array.isArray(g.channels)||!g.channels.length||g.channels.some(x=>typeof x!=='string'||!x.trim()))error('search group 交易方式無效');
            if(g.aliases&&(typeof g.aliases!=='object'||Object.entries(g.aliases).some(([n,a])=>!g.merchants?.includes(n)||!Array.isArray(a)||a.some(x=>typeof x!=='string'||!x.trim()))))error('search group 別名無效');
            if(g.qualifier!==undefined&&typeof g.qualifier!=='string')error('search group 條件無效');
          }
          if(groups.length&&s.merchants?.some(n=>!groups.some(g=>g?.merchants?.includes(n))))error('search 商家缺少分組規則');
          for(const g of [s,...groups].filter(Boolean))for(const [n,scenario] of Object.entries(g.queryScenarios||{}))if(!g.merchants?.includes(n)||!Number.isFinite(t.scenarioRates?.[scenario]))error('search queryScenarios 必須引用既有回饋');
        }
      }
      if(t.merchants!==undefined){
        if(!Array.isArray(t.merchants)||!t.merchants.length||t.merchants.some(n=>typeof n!=='string'||!n.trim())||new Set(t.merchants).size!==t.merchants.length)error('merchants 必須是不重複的商家名稱陣列');
        if(!date(t.merchantCheckedAt)||!date(t.merchantEnd))error('商家對應必須有有效查證與截止日期');
      }
      if(t.merchantForeignRate!==undefined&&(!(t.merchants||t.search?.merchants?.length)||!Number.isFinite(t.merchantForeignRate)||t.merchantForeignRate<=0))error('merchantForeignRate 必須是有商家對應的正有限數字');
      for(const k of ['capSource'])if(t[k]&&!url(t[k]))error(`${k} 連結無效`);
      for(const k of ['start','end','checkedAt'])if(t[k]!=null&&!date(t[k]))error(`${k} 日期無效`);
      if(date(t.start)&&date(t.end)&&t.start>t.end)error('起訖日期顛倒');
      if(!t.checkedAt)warn('未記錄查證日期');
      if(!t.verifiedFields)error('缺少 verifiedFields 查證範圍');
      if(!Array.isArray(t.scenarios)||t.scenarios.some(s=>!allowed.has(s)))error('情境 mapping 無效');
      if((t.scenarios||[]).some(s=>!(c.tags||[]).includes(s)))error('優惠情境未列在卡片 tags');
      if(!['regular','limited'].includes(t.kind))error('kind 無效');
      if(t.highlight!==undefined&&typeof t.highlight!=='boolean')error('highlight 必須是布林值');
      if(!['all','new'].includes(t.audience))error('audience 無效');
      if(t.capSpend!=null&&(!Number.isFinite(t.capSpend)||t.capSpend<0))error('capSpend 必須是非負有限數字');
      if(t.capPeriod!=null&&!periods.has(t.capPeriod))error('capPeriod 週期無效');
      if(t.capSpend!=null&&!t.capPeriod)warn('可刷金額週期待確認，不視為無上限');
      if(!t.cap||/待確認|未知|待核實|請自行|未載|未註明/.test(t.cap))warn('上限待確認');
      if(!t.end)warn('截止日未確認');
      for(const [s,v] of Object.entries(t.scenarioRates||{}))if(!(t.scenarios||[]).includes(s)||!Number.isFinite(v)||v<=0)error('scenarioRates 情境或數值無效');
    }
  }
  return {errors,warnings};
}
module.exports={readData,validateData};
if(require.main===module){
  const result=validateData(readData(process.argv[2]));
  for(const e of result.errors)console.error(`ERROR ${e}`);
  for(const w of result.warnings)console.warn(`WARN ${w}`);
  console.log(`資料驗證：${result.errors.length} errors，${result.warnings.length} warnings（未知不等於無上限／已核實）`);
  process.exitCode=result.errors.length?1:0;
}
