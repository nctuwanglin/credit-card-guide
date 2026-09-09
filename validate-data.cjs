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
      for(const k of ['capSource'])if(t[k]&&!url(t[k]))error(`${k} 連結無效`);
      for(const k of ['start','end','checkedAt'])if(t[k]!=null&&!date(t[k]))error(`${k} 日期無效`);
      if(date(t.start)&&date(t.end)&&t.start>t.end)error('起訖日期顛倒');
      if(!t.checkedAt)warn('未記錄查證日期');
      if(!t.verifiedFields)error('缺少 verifiedFields 查證範圍');
      if(!Array.isArray(t.scenarios)||t.scenarios.some(s=>!allowed.has(s)))error('情境 mapping 無效');
      if((t.scenarios||[]).some(s=>!(c.tags||[]).includes(s)))error('優惠情境未列在卡片 tags');
      if(!['regular','limited'].includes(t.kind))error('kind 無效');
      if(!['all','new'].includes(t.audience))error('audience 無效');
      if(t.capSpend!=null&&(!Number.isFinite(t.capSpend)||t.capSpend<0))error('capSpend 必須是非負有限數字');
      if(t.capPeriod!=null&&!periods.has(t.capPeriod))error('capPeriod 週期無效');
      if(t.capSpend!=null&&!t.capPeriod)warn('可刷金額週期待確認，不視為無上限');
      if(!t.cap||/待確認|未知|待核實|請自行/.test(t.cap))warn('上限待確認');
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
