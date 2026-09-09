const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(process.env.DASHBOARD_FILE||__dirname+'/'+(fs.existsSync(__dirname+'/2026信用卡回饋指南.html')?'2026信用卡回饋指南.html':'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].split('// 瀏覽統計：')[0];
test('cards do not display audit records while retaining official links',()=>{const b=boot();const rendered=b.get('grid').children.map(c=>c.innerHTML).join('');assert.doesNotMatch(rendered,/資料來源與查證紀錄|class="audit"/);assert.match(rendered,/信用卡官網/);});
function boot(saved, now='2026-09-08T12:00:00+08:00'){
  const elements=new Map();
  const element=(tag='div')=>({tagName:tag.toUpperCase(),innerHTML:'',textContent:'',style:{},attrs:{},children:[],classList:{toggle(){},add(){},remove(){}},setAttribute(k,v){this.attrs[k]=String(v)},appendChild(e){this.children.push(e)},scrollIntoView(){},focus(){}});
  const get=k=>{if(!elements.has(k))elements.set(k,element());return elements.get(k);};
  const storage=new Map(saved===undefined?[]:[['ccg-visible',JSON.stringify(saved)]]);
  const ctx=vm.createContext({Date:class extends Date{static now(){return new Date(now).getTime();}},matchMedia:()=>({matches:false}),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:get,querySelector:get,querySelectorAll:()=>[],createElement:element}});
  vm.runInContext(script,ctx);
  return {run:s=>vm.runInContext(s,ctx),get,storage};
}
test('expired offers do not appear in LINE Pay recommendations',()=>{
  const b=boot();b.run("cards.push({id:'expired-fixture',name:'過期測試卡',tags:['LINE Pay'],tiers:[{rate:'99',scenarios:['LINE Pay'],end:'2026-08-31'}]});visibleCards.add('expired-fixture');activeScenario='LINE Pay';renderReco()");
  assert.doesNotMatch(b.get('reco').innerHTML,/過期測試卡/);
});
test('expiry changes immediately after Taiwan midnight',()=>{
  const b=boot(undefined,'2026-09-01T00:00:00+08:00');
  assert.match(b.run("expBadge({end:'2026-08-31'})"),/已到期/);
});
test('expiry includes last second of final Taiwan day',()=>{
  const b=boot(undefined,'2026-08-31T23:59:59+08:00');
  assert.doesNotMatch(b.run("expBadge({end:'2026-08-31'})"),/已到期/);
});
test('empty saved selection is restored',()=>assert.equal(boot([]).run('visibleCards.size'),0));
test('new cards are selected but known deselections remain',()=>{
  const b=boot({version:2,known:['pi','ubear'],selected:['pi']});
  assert.equal(b.run("visibleCards.has('ubear')"),false);
  assert.equal(b.run("visibleCards.has('kumamon')"),true);
});
test('mile strip clears with selection',()=>{
  const b=boot();b.run("switchTab('mile');selectAll(false)");
  assert.doesNotMatch(b.get('mileStrip').innerHTML,/NT\$9\/哩|NT\$10\/哩/);
});
test('unknown cap is not unlimited',()=>assert.equal(boot().run("capOf({id:'unknown'},'旅日')"),null));
test('different cap periods do not determine tie order',()=>{
  const b=boot();assert.equal(b.run("compareCaps({cap:10000,period:'month'},{cap:30000,period:'quarter'})"),0);
});
test('expired tier visibly marked, independent of later card expiry',()=>{
  assert.match(boot().run("renderTier({rate:'16',label:'活動',end:'2026-08-31'},'2026-12-31')"),/已到期/);
});
test('same period finite caps compare larger first',()=>{
  assert.equal(boot().run("compareCaps({cap:10000,period:'month'},{cap:30000,period:'month'})"),20000);
});
test('unknown period is explicit in ranking',()=>{
  const b=boot();b.run("cards.push({id:'unknown-period',name:'未知週期測試卡',tags:['網購'],tiers:[{rate:'99',scenarios:['網購'],capSpend:1000}]});visibleCards.add('unknown-period');activeScenario='網購';renderReco()");
  assert.match(b.get('reco').innerHTML,/週期待確認/);
});
test('tier does not repeat the card homepage but preserves a different activity link',()=>{
  const b=boot();
  assert.doesNotMatch(b.run("renderTier({rate:'3',label:'test',source:'https://bank.test/card'},undefined,'https://bank.test/card')"),/href=/);
  assert.match(b.run("renderTier({rate:'3',label:'test',source:'https://bank.test/activity'},undefined,'https://bank.test/card')"),/href="https:\/\/bank.test\/activity"/);
});
test('audit records are collapsed, deduplicate sources and include cap evidence',()=>{
  const b=boot();const result=b.run("renderAudit({url:'https://bank.test/card',feeSource:'https://bank.test/card',tiers:[{label:'優惠A',source:'https://bank.test/card',capSource:'https://bank.test/cap',checkedAt:'2026-09-08',verifiedFields:'比率'},{label:'優惠B',source:'https://bank.test/cap'}]})");
  assert.match(result,/<details class="audit">/);
  assert.doesNotMatch(result,/<details[^>]*\bopen\b/);
  assert.equal((result.match(/href="https:\/\/bank.test\/cap"/g)||[]).length,1);
  assert.doesNotMatch(result,/href="https:\/\/bank.test\/card"/);
  assert.match(result,/優惠A/);assert.match(result,/2026-09-08/);assert.match(result,/比率/);
});
test('uncertain verification remains visible outside collapsed audit',()=>{
  assert.match(boot().run("renderTier({rate:'3',label:'test',checkedAt:'2026-09-08',verifiedFields:'比率；上限待確認'})"),/上限待確認/);
  assert.match(boot().run("renderTier({rate:'3',label:'test',checkedAt:'2026-09-08',verifiedFields:'舊活動期限；2026續行未確認'})"),/2026續行未確認/);
});
test('audit preserves scheme name and inherited scheme source',()=>{
  const result=boot().run("renderAudit({url:'https://bank.test/card',schemes:[{name:'方案一',source:'https://bank.test/scheme',tiers:[{label:'一般回饋'}]}]})");
  assert.match(result,/方案一／一般回饋/);
  assert.match(result,/href="https:\/\/bank.test\/scheme"/);
});
test('Breeze city parking uses the current notice without changing mall parking',()=>{
  const b=boot();
  assert.equal(b.run("cards.find(c=>c.id==='breeze').tiers.find(t=>t.label.startsWith('市區停車')).end"),'2027-01-31');
  assert.match(b.run("cards.find(c=>c.id==='breeze').tiers.find(t=>t.label.startsWith('市區停車')).sub"),/8,000/);
  assert.equal(b.run("cards.find(c=>c.id==='breeze').tiers.find(t=>t.label.startsWith('微風百貨停車')).rate"),'4H');
});
test('point redemption sources remain reachable in audit records',()=>{
  assert.match(boot().run("renderAudit({url:'https://bank.test/card',tiers:[],pointSources:['https://bank.test/points']})"),/href="https:\/\/bank.test\/points"/);
});
test('Richart insurance cap and starway month use verified periods',()=>{
  const b=boot();
  assert.match(b.run("allOffers(cards.find(c=>c.id==='richart')).find(t=>t.label==='保費消費').cap"),/合併/);
  assert.equal(b.run("allOffers(cards.find(c=>c.id==='dbs-aov')).find(t=>t.label.startsWith('星耀')).capPeriod"),'month');
});
test('verified mile base periods expire rather than remaining indefinitely active',()=>{
  const b=boot(undefined,'2027-01-01T00:00:00+08:00');
  assert.equal(b.run("bestOffer(cards.find(c=>c.id==='esun-starlux'),'哩程')"),null);
  assert.equal(b.run("bestOffer(cards.find(c=>c.id==='cathay-eva'),'哩程')"),null);
});
test('DAWHO Plus auto topup participates in conditional maximum',()=>{
  assert.equal(boot().run("bestOffer(cards.find(c=>c.name.includes('DAWHO')),'悠遊卡加值').value"),5);
});
test('LINE Pay card overseas and Klook offers appear in their scenarios',()=>{
  const b=boot();
  assert.equal(b.run("bestOffer(cards.find(c=>c.id==='ctbc-linepay'),'旅日').value"),5);
  assert.equal(b.run("bestOffer(cards.find(c=>c.id==='ctbc-linepay'),'旅遊機票').value"),12);
});
test('known formula cap remains visible without numeric spending capacity',()=>{
  const b=boot();b.run("cards.push({id:'formula-cap',name:'公式上限',tags:['網購'],tiers:[{rate:'99',scenarios:['網購'],cap:'信用額度加50萬元'}]});visibleCards.add('formula-cap');activeScenario='網購';renderReco()");
  assert.match(b.get('reco').innerHTML,/信用額度加50萬元/);
});
test('all tier scenarios are reachable and every card can render in every scenario',()=>{
  const b=boot();
  assert.equal(b.run("cards.flatMap(c=>allOffers(c)).flatMap(t=>t.scenarios||[]).filter(s=>s!=='哩程'&&!scenarios.includes(s)).join(',')"),'');
  b.run("for(const scenario of scenarios){activeScenario=scenario;renderGrid();renderReco()}activeTab='mile';renderGrid();renderMileStrip()");
});
test('card selector and scenarios use native buttons with pressed states',()=>{
  const b=boot();
  for(const e of [...b.get('selGrid').children,...b.get('chips').children]){
    assert.equal(e.tagName,'BUTTON');
    assert.ok(['true','false'].includes(e.attrs['aria-pressed']));
  }
});
test('tabs expose native keyboard controls',()=>{
  assert.match(html,/<button[^>]*id="tabCash"[^>]*aria-pressed="true"/);
  assert.match(html,/<button[^>]*id="tabMile"[^>]*aria-pressed="false"/);
});
test('ranking navigates to focusable card and labels conditional maximum',()=>{
  const b=boot();b.run("activeScenario='LINE Pay';renderReco();renderGrid()");
  assert.match(b.get('reco').innerHTML,/符合條件時最高回饋/);
  assert.match(b.get('reco').innerHTML,/<a[^>]*href="#card-/);
  assert.ok(b.get('grid').children.some(e=>e.id?.startsWith('card-')&&e.tabIndex===-1));
});
test('future offers are not active',()=>{
  const b=boot();assert.equal(b.run("offerActive({start:'2026-10-01',end:'2026-12-31'})"),false);
});
test('new user and limited filters affect recommendation selection',()=>{
  const b=boot();
  assert.equal(b.run("offerAllowed({audience:'new',kind:'limited'})"),false);
  assert.equal(b.run("showLimited=false;offerAllowed({audience:'all',kind:'limited'})"),false);
  assert.equal(b.run("offerAllowed({audience:'all',kind:'regular'})"),true);
});
test('relevant tier highlighted without hiding other benefits',()=>{
  assert.match(boot().run("activeScenario='網購';renderTier({rate:'3',label:'網購',scenarios:['網購']})"),/tier relevant/);
});
test('missing offer cap/date/source verification are explicit',()=>{
  const result=boot().run("renderTier({rate:'1',label:'一般'})");
  assert.match(result,/上限待確認/);assert.match(result,/日期待確認/);assert.match(result,/待查證/);
});
test('recommendations derive rate and expiry from the same displayed tier',()=>{
  const b=boot();
  assert.equal(b.run("const fixture={tiers:[{rate:'4',scenarios:['網購'],end:'2026-12-31',kind:'regular'}]};bestOffer(fixture,'網購').value"),4);
  assert.equal(b.run("fixture.tiers[0].rate='2';bestOffer(fixture,'網購').value"),2);
  assert.equal(b.run("fixture.tiers[0].end='2026-08-31';bestOffer(fixture,'網購')"),null);
});
test('excluding limited offer falls back to eligible regular offer',()=>{
  const b=boot();
  assert.equal(b.run("showLimited=false;bestOffer({tiers:[{rate:'10',kind:'limited',scenarios:['網購']},{rate:'3',kind:'regular',scenarios:['網購']}]},'網購').value"),3);
});
test('U Bear renewal and subscription cap match latest official period',()=>{
  const b=boot();assert.equal(b.run("bestOffer(cards.find(c=>c.id==='ubear'),'影音訂閱').capSpend"),1000);
  assert.equal(b.run("bestOffer(cards.find(c=>c.id==='ubear'),'LINE Pay').end"),'2027-02-28');
});
test('SPORT full-rate capacity respects both bonus caps',()=>{
  assert.equal(boot().run("bestOffer(cards.find(c=>c.id==='sport'),'Apple/Google/Samsung Pay').capSpend"),5000);
});
test('LINE Bank specified domestic rate is base one plus three',()=>{
  assert.equal(boot().run("bestOffer(cards.find(c=>c.id==='linebank'),'網購').value"),4);
});
test('unverified Breeze shopping renewal cannot enter ranking',()=>{
  assert.equal(boot().run("bestOffer(cards.find(c=>c.id==='breeze'),'百貨')"),null);
});
test('Richart Taishin Pay does not rank as Apple Google Samsung Pay',()=>{
  assert.equal(boot().run("bestOffer(cards.find(c=>c.id==='richart'),'Apple/Google/Samsung Pay')"),null);
});
test('M card 6 percent total cap is not treated as bonus-only cap',()=>{
  assert.equal(boot().run("bestOffer(cards.find(c=>c.id==='mcard'),'旅遊機票').capSpend"),5000);
});
