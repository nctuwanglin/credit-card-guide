const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(process.env.DASHBOARD_FILE||__dirname+'/'+(fs.existsSync(__dirname+'/2026信用卡回饋指南.html')?'2026信用卡回饋指南.html':'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].split('// 瀏覽統計：')[0];
test('CUBE Q4 birthday delivery offer is eligible in October',()=>{
  const b=boot(undefined,'2026-10-01T12:00:00+08:00');
  assert.equal(b.run("bestOffer(cards.find(c=>c.id==='cube'),'美食外送').value"),3.5);
});
test('Fubon J Q4 offers remain eligible through December and expire in January',()=>{
  const oct=boot(undefined,'2026-10-01T12:00:00+08:00');
  assert.equal(oct.run("bestOffer(cards.find(c=>c.id==='fubon-j'),'旅日').rate"),'10');
  assert.equal(oct.run("bestOffer(cards.find(c=>c.id==='fubon-j'),'旅韓').rate"),'6');
  const jan=boot(undefined,'2027-01-01T12:00:00+08:00');
  assert.equal(jan.run("bestOffer(cards.find(c=>c.id==='fubon-j'),'旅韓')"),null);
});
test('October insurance uses Q4 promotion and falls back to standard when limited offers excluded',()=>{
  const b=boot(undefined,'2026-10-01T12:00:00+08:00');
  assert.equal(b.run("bestOffer(cards.find(c=>c.id==='fubon-j'),'保費').rate"),'2');
  assert.equal(b.run("bestOffer(cards.find(c=>c.id==='costco'),'保費').rate"),'2');
  b.run('showLimited=false');
  assert.equal(b.run("bestOffer(cards.find(c=>c.id==='fubon-j'),'保費').rate"),'0.5');
  assert.equal(b.run("bestOffer(cards.find(c=>c.id==='costco'),'保費').rate"),'0.5');
});
test('October Kumamon gifts are visible without inflating Japan reward ranking',()=>{
  const b=boot(undefined,'2026-10-01T12:00:00+08:00');
  assert.equal(b.run("bestOffer(cards.find(c=>c.id==='kumamon'),'旅日').rate"),'8.5');
  const rendered=b.get('grid').children.map(c=>c.innerHTML).join('');
  assert.match(rendered,/環球影城/);
  assert.match(rendered,/披肩毯/);
});
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
  const b=boot(undefined,'2026-10-01T12:00:00+08:00');
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
// ---- 摘要＋展開（卡片精簡呈現）----
test('compact summary preserves shared reward cap as well as spend estimate',()=>{
  const b=boot(undefined,'2026-10-03T12:00:00+08:00');
  const out=b.run("renderCompactTier({rate:'3',label:'測試',cap:'兩方案共用上限1,000點／月；正附卡合併',capSpend:50000,capPeriod:'month'})").split('<details')[0];
  assert.match(out,/>兩方案共用上限1,000點／月；正附卡合併</);
  assert.match(out,/可刷約50,000／日曆月/);
});
test('unknown reward cap stays explicit even when a spend estimate exists',()=>{
  const out=boot().run("renderCompactTier({rate:'3',label:'測試',capSpend:5000,capPeriod:'month'})").split('<details')[0];
  assert.match(out,/上限待確認/);
  assert.match(out,/可刷約5,000/);
});
test('every eligible offer keeps complete stored rules across all scenarios',()=>{
  const b=boot(undefined,'2026-10-03T12:00:00+08:00');
  const gaps=b.run(`(()=>{const gaps=[];for(const scn of scenarios){activeScenario=scn;for(const c of cards){const body=renderCardBody(c);for(const o of cardOffers(c).filter(o=>offerAllowed(o.t)&&!expired(o.t.end))){for(const f of ['sub','condition','cap','start','end'])if(o.t[f]&&!body.includes(o.t[f]))gaps.push(c.id+'/'+scn+'/'+o.t.label+'/'+f);if(o.s&&!body.includes(o.s))gaps.push(c.id+'/'+scn+'/scheme');if(o.t.source!==c.url&&!body.includes(o.t.source))gaps.push(c.id+'/'+scn+'/source');}}}return gaps})()`);
  assert.deepEqual(Array.from(gaps),[]);
});
test('highlighted Pi offer keeps its spending and enrollment requirements accessible',()=>{
  const b=boot(undefined,'2026-10-03T12:00:00+08:00');
  const out=b.run("renderCardBody(cards.find(c=>c.id==='pi'))");
  assert.match(out,/單筆滿499元，須登錄、帳單e化及玉山自扣/);
  assert.match(out,/<details class="more offer-details"[^>]*>/);
});
test('overseas headline uses scenario rate and all-scenario retains domestic and overseas rates',()=>{
  const b=boot(undefined,'2026-10-03T12:00:00+08:00');
  const out=b.run("activeScenario='旅日';renderCardBody(cards.find(c=>c.name.includes('DAWHO')))");
  assert.match(out,/class="rate hi">6<small>%/);
  const all=b.run("activeScenario='全部';renderCardBody(cards.find(c=>c.name.includes('DAWHO')))");
  assert.match(all,/國內5%／國外6%/);
});
test('Breeze pins active parking before secondary expired offers',()=>{
  const b=boot(undefined,'2026-10-03T12:00:00+08:00');
  assert.ok(summaryOf(b,'breeze').some(t=>t.rate==='4H'));
  const out=b.run("renderCardBody(cards.find(c=>c.id==='breeze'))");
  assert.ok(out.indexOf('微風百貨停車')<out.indexOf('舊滿額刷卡金'));
  assert.match(out,/<summary>過期待確認/);
});
test('Unicard summary retains plan names and full conditions without hover',()=>{
  const b=boot(undefined,'2026-10-03T12:00:00+08:00');
  const out=b.run("renderCardBody(cards.find(c=>c.id==='unicard'))");
  assert.match(out,/UP選 訂閱制 149點\/月/);
  assert.match(out,/>需UP選資格或付149點／月</);
});
const OCT='2026-10-01T12:00:00+08:00';
function summaryOf(b,id,scn='全部'){
  return b.run(`(()=>{const c=cards.find(x=>x.id==='${id}');activeScenario='${scn}';const live=cardOffers(c).filter(o=>offerAllowed(o.t)&&!expired(o.t.end));return pickHighlights(c,activeScenario,live).map(o=>o.t)})()`);
}
test('summary shows at most 4 active regular offers including pinned benefits',()=>{
  const b=boot(undefined,OCT);
  for(const id of b.run("cards.map(c=>c.id)")){
    const picks=summaryOf(b,id);
    assert.ok(picks.length<=4,id+' summary too long');
    for(const t of picks){assert.ok(t.highlight||/^[0-9.]+(元\/哩)?$/.test(t.rate),id+' non-numeric '+t.rate);assert.notEqual(t.kind,'limited',id+' limited in 全部 summary');}
  }
});
test('Kumamon Japan summary leads with 8.5 percent and CUBE cards stay short',()=>{
  const b=boot(undefined,OCT);
  assert.equal(summaryOf(b,'kumamon','旅日')[0].rate,'8.5');
  b.run("activeScenario='全部'");
  const html=b.run("renderCardBody(cards.find(c=>c.id==='cube'))");
  assert.ok((html.match(/class="ctier"/g)||[]).length<=4);
  assert.match(html,/<details class="more"[^>]*>/);
});
test('selected scenario never backfills with unrelated high-rate tiers',()=>{
  const b=boot(undefined,OCT);
  for(const id of ['richart','mcard','pi']){
    const picks=summaryOf(b,id,'保費');
    assert.ok(picks.length>0);
    for(const t of picks)assert.ok(t.scenarios.includes('保費'),id+' backfilled '+t.label);
  }
});
test('expired tiers are not rendered on the card but every live tier is shown exactly once',()=>{
  const b=boot(undefined,'2026-10-01T12:00:00+08:00');
  b.run("cards.push({id:'fx',name:'測試卡',tags:['網購'],tiers:[{rate:'5',label:'有效層',scenarios:['網購'],kind:'regular',audience:'all',end:'2026-12-31'},{rate:'9',label:'過期層',scenarios:['網購'],kind:'limited',audience:'all',end:'2026-08-31'},{rate:'權益',label:'權益層',kind:'regular',audience:'all'}]});activeScenario='全部'");
  const html=b.run("renderCardBody(cards.find(c=>c.id==='fx'))");
  assert.doesNotMatch(html,/過期層/);
  assert.equal((html.match(/class="ctier-label">有效層</g)||[]).length,1);
  assert.match(html,/權益層/);
});
test('limited and plus-rate offers are collapsed, still present in card HTML',()=>{
  const b=boot(undefined,OCT);
  const html=b.run("renderCardBody(cards.find(c=>c.id==='kumamon'))");
  assert.match(html,/限時／活動優惠/);
  const summary=html.split('<details')[0];
  assert.doesNotMatch(summary,/名古屋|九州|披肩毯/);
  assert.match(html,/九州JR博多/);
});
test('long condition and cap text is shortened in chips with full text kept in title',()=>{
  const b=boot();
  const out=b.run("renderCompactTier({rate:'3',label:'x',condition:'切換對應方案並具LEVEL2（台新帳戶自扣依生效規則；新申辦60天試用）',cap:'無上限',checkedAt:'2026-10-01',verifiedFields:'日期'})");
  assert.match(out,/title="切換對應方案並具LEVEL2（台新帳戶自扣依生效規則；新申辦60天試用）"/);
  assert.doesNotMatch(out.split('<details')[0],/>切換對應方案並具LEVEL2（/);
  assert.match(out,/<div class="tier-sub">切換對應方案並具LEVEL2（/);
});
test('thousands separator in cap chip is not treated as a clause break',()=>{
  const out=boot().run("renderCompactTier({rate:'8.5',label:'x',capSpend:8333,capPeriod:'statement',cap:'加碼上限500/期 · 可刷8,333',checkedAt:'2026-10-01',verifiedFields:'日期'})");
  assert.match(out,/可刷約8,333／每期帳單/);
});
test('expired offer with unconfirmed continuation stays visible on the card face',()=>{
  const b=boot(undefined,'2026-10-01T12:00:00+08:00');
  const html=b.run("renderCardBody(cards.find(c=>c.id==='breeze'))");
  assert.match(html,/class="ctier stale"/);
  assert.match(html,/續行待確認/);
});
test('plain expired offers are hidden but uncertain ones are not',()=>{
  const b=boot(undefined,'2026-10-01T12:00:00+08:00');
  b.run("cards.push({id:'fx2',name:'測試卡2',tags:['網購'],tiers:[{rate:'5',label:'有效層',scenarios:['網購'],kind:'regular',audience:'all',end:'2026-12-31'},{rate:'9',label:'確定過期層',scenarios:['網購'],kind:'regular',audience:'all',end:'2026-08-31'},{rate:'7',label:'疑似續行（續行待確認）',scenarios:['網購'],kind:'regular',audience:'all',end:'2026-08-31'}]});activeScenario='全部'");
  const html=b.run("renderCardBody(cards.find(c=>c.id==='fx2'))");
  assert.doesNotMatch(html,/確定過期層/);
  assert.match(html,/疑似續行/);
});
test('validator treats official-silence wording as unknown, not as verified',()=>{
  const {validateData}=require('./validate-data.cjs');
  const base={id:'x',name:'x',url:'https://a.test/',tags:['網購'],tiers:[{rate:'3',label:'a',scenarios:['網購'],kind:'regular',audience:'all',source:'https://a.test/',verifiedFields:'v',checkedAt:'2026-10-01',end:'2026-12-31',cap:'官網未載基本哩上限'}]};
  const r=validateData({cards:[base],scenarios:['全部','網購']});
  assert.equal(r.errors.length,0);
  assert.ok(r.warnings.some(w=>/上限待確認/.test(w)));
});
