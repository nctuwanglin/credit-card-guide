const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateData}=require('./validate-data.cjs');
test('grouped search rejects unbound merchants, rate overrides and invalid scenario references',()=>{
  const search={status:'verified',reason:'核實',merchants:['商家'],source:'https://bank.example',checkedAt:'2026-10-21',end:'2026-12-31',channels:['direct'],searchType:'cash'};
  for(const group of [{merchants:['別家'],channels:['direct']},{merchants:['商家'],channels:[]},{merchants:['商家'],channels:['direct'],rate:99},{merchants:['商家'],channels:['direct'],queryScenarios:{'商家':'旅日'}}]){
    const d=fixture();d.cards[0].tiers[0].search={...search,rules:[group]};assert.ok(validateData(d).errors.length,JSON.stringify(group));
  }
});
test('verified search rejects missing evidence, invalid aliases, channels and reward units',()=>{
  const valid={status:'verified',reason:'官方指定',merchants:['商家'],aliases:{'商家':['別名']},channels:['direct'],searchType:'cash',source:'https://bank.example/offer',checkedAt:'2026-10-21',end:'2026-12-31'};
  for(const change of [{source:''},{end:'2026-02-30'},{channels:[]},{merchants:[]},{aliases:{'別家':['別名']}},{searchType:'mile'}]){
    const d=fixture();d.cards[0].tiers[0].search={...valid,...change};assert.ok(validateData(d).errors.length,JSON.stringify(change));
  }
  const d=fixture();d.cards[0].tiers[0].search=valid;assert.equal(validateData(d).errors.length,0);
});
test('merchant mappings require dates, unique names and a finite foreign rate',()=>{
  for(const fields of [{merchants:['淘寶']},{merchants:['淘寶','淘寶'],merchantCheckedAt:'2026-10-19',merchantEnd:'2026-12-31'},{merchantForeignRate:Infinity}]){
    const d=fixture();Object.assign(d.cards[0].tiers[0],fields);
    assert.ok(validateData(d).errors.length);
  }
});
function fixture(){return {scenarios:['全部','網購'],cards:[{id:'test',name:'測試銀行 測試卡',url:'https://bank.example/card',tags:['網購'],tiers:[{label:'網購',rate:'3',scenarios:['網購'],kind:'regular',audience:'all',start:'2026-01-01',end:'2026-12-31',source:'https://bank.example/offer',checkedAt:'2026-09-08',verifiedFields:'比率／日期',cap:'上限待確認'}]}]};}
test('explicit unknown cap is permitted and reported as warning',()=>{const r=validateData(fixture());assert.equal(r.errors.length,0);assert.ok(r.warnings.length);});
test('duplicate card ids and unknown scenarios fail validation',()=>{const d=fixture();d.cards.push(structuredClone(d.cards[0]));d.cards[0].tiers[0].scenarios=['不存在'];assert.match(validateData(d).errors.join('\n'),/重複|情境/);});
test('impossible or reversed dates fail validation',()=>{const d=fixture();d.cards[0].tiers[0].start='2026-02-30';assert.match(validateData(d).errors.join('\n'),/日期/);d.cards[0].tiers[0].start='2027-01-01';assert.match(validateData(d).errors.join('\n'),/起訖/);});
test('unsafe or missing source and missing checked scope fail',()=>{for(const [key,value] of [['source','javascript:alert(1)'],['source',''],['verifiedFields','']]){const d=fixture();d.cards[0].tiers[0][key]=value;assert.ok(validateData(d).errors.length,key);}});
test('numeric cap needs valid nonnegative amount and valid period',()=>{for(const [capSpend,capPeriod] of [[-1,'month'],[Infinity,'month'],[1000,'typo']]){const d=fixture();Object.assign(d.cards[0].tiers[0],{capSpend,capPeriod});assert.ok(validateData(d).errors.length);}});
test('known amount with unknown period is a warning, not an invented period',()=>{const d=fixture();Object.assign(d.cards[0].tiers[0],{capSpend:1000,capPeriod:null});const r=validateData(d);assert.equal(r.errors.length,0);assert.match(r.warnings.join('\n'),/週期待確認/);});
test('tier recommendation must be reachable through card tags',()=>{const d=fixture();d.cards[0].tags=[];assert.match(validateData(d).errors.join('\n'),/tags/);});
test('card cannot define both tiers and schemes',()=>{const d=fixture();d.cards[0].schemes=[{tiers:d.cards[0].tiers}];assert.match(validateData(d).errors.join('\n'),/互斥/);});
test('malformed reward rates are rejected',()=>{for(const rate of ['6％','-3','hello','0元/哩']){const d=fixture();d.cards[0].tiers[0].rate=rate;assert.ok(validateData(d).errors.length,rate);}});
test('fee and point sources and verification dates are checked',()=>{for(const [key,value] of [['feeSource','javascript:alert(1)'],['feeCheckedAt','2026-02-30'],['pointsCheckedAt','tomorrow'],['pointSources',['https://bank.example/points','http://unsafe.example']]]){const d=fixture();d.cards[0][key]=value;assert.ok(validateData(d).errors.length,key);}});
