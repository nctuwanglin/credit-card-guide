const {test}=require('node:test');
const assert=require('node:assert/strict');
const {integrateSearch,coverageReport}=require('./scripts/integrate-search.cjs');
const {readData}=require('./validate-data.cjs');
test('all 23 cards and every offer have an explicit search coverage decision',()=>{
  const {cards}=readData();assert.equal(cards.length,23);
  for(const c of cards)for(const t of [...(c.tiers||[]),...(c.schemes||[]).flatMap(s=>s.tiers)]){
    assert.ok(t.search,c.id+'/'+t.label+' missing search coverage');
    assert.ok(['verified','expired','nonMerchant','unresolved'].includes(t.search.status));
    assert.ok(t.search.reason);
  }
});
const sample=()=>[{id:'a',name:'測試卡',tiers:[{label:'一般消費',rate:'1',source:'https://bank.example',end:'2026-12-31'}]}];
const row=()=>({cardId:'a',scheme:null,label:'一般消費',status:'verified',reason:'核實',merchants:['國內一般消費'],aliases:{},channels:['direct'],searchType:'cash',source:'https://bank.example',checkedAt:'2026-10-21',end:'2026-12-31'});
test('integration retains grouped rules and partial gaps remain incomplete',()=>{
  const cards=sample(),r={...row(),rules:[{merchants:['國內一般消費'],channels:['direct'],qualifier:'資格限制'}],gaps:['完整附件尚未取得']};
  integrateSearch(cards,[r]);
  assert.deepEqual(cards[0].tiers[0].search.rules,r.rules);
  assert.match(coverageReport(cards),/未完成完整涵蓋/);
  assert.match(coverageReport(cards),/完整附件尚未取得/);
});
test('integration refuses missing, duplicate and unknown tier rows',()=>{
  assert.throws(()=>integrateSearch(sample(),[]),/缺少/);
  assert.throws(()=>integrateSearch(sample(),[row(),row()]),/重複/);
  assert.throws(()=>integrateSearch(sample(),[{...row(),label:'不存在'}]),/不存在/);
});
test('integration preserves existing reward and coverage report exposes unresolved work',()=>{
  const cards=sample();integrateSearch(cards,[row()]);
  assert.equal(cards[0].tiers[0].rate,'1');
  assert.equal(cards[0].tiers[0].search.merchants[0],'國內一般消費');
  integrateSearch(cards,[{...row(),status:'unresolved',reason:'官方未公布'}]);
  assert.match(coverageReport(cards),/未完成/);
  assert.match(coverageReport(cards),/官方未公布/);
});
test('integration unifies confirmed spelling variants without merging distinct services',()=>{
  const cards=sample();integrateSearch(cards,[{...row(),merchants:['臺鐵'],aliases:{'臺鐵':['TRA']},rules:[{merchants:['臺鐵'],channels:['direct']}]}]);
  assert.equal(cards[0].tiers[0].search.merchants[0],'台鐵');
  assert.equal(cards[0].tiers[0].search.rules[0].merchants[0],'台鐵');
  assert.ok(cards[0].tiers[0].search.aliases['台鐵'].includes('TRA'));
});
