const {test,expect}=require('@playwright/test');
test('country overview separates specified Japan rewards and updates Korea US without leaking countries',async({page})=>{
  await page.goto('/');
  await page.locator('#merchantQuery').fill('日本消費');
  await expect(page.locator('.merchant-conditional').filter({hasText:'熊本熊'})).toContainText('8.5%');
  await expect(page.locator('#merchantResults ol > li').filter({hasText:'熊本熊'})).toContainText('2.5%');
  for(const country of ['韓國','美國']){
    await page.locator('#merchantQuery').fill(country+'消費');
    await expect(page.locator('#merchantStatus')).toContainText(country+'實體一般消費');
    await expect(page.locator('#merchantResults ol > li').filter({hasText:'Unicard'})).toContainText('4.5%');
    await expect(page.locator('#merchantResults ol > li').filter({hasText:'eco'})).toContainText('5%');
    await expect(page.locator('#merchantResults')).not.toContainText('熊本熊');
  }
  await page.locator('#tabMile').click();
  await expect(page.locator('#merchantResults ol')).toContainText('10元/哩');
  await expect(page.locator('#merchantResults ol')).not.toContainText('%');
});
test('Japan query immediately compares four cards with conditions',async({page})=>{
  await page.goto('/');
  await page.locator('#merchantQuery').fill('日本消費');
  await expect(page.locator('#merchantStatus')).toContainText('日本實體一般消費');
  for(const [name,rate] of [['玉山 Unicard','4.5%'],['富邦 J 卡','6%'],['星展 傳說對決','5%'],['星展 eco 永續','5%']]){
    await expect(page.locator('#merchantResults ol > li').filter({hasText:name})).toContainText(rate);
  }
  await expect(page.locator('#merchantResults')).toContainText('UP選');
  await expect(page.locator('#merchantResults')).toContainText('1,000');
});
test('search stays available in mile tab and suggestions do not guess a merchant',async({page})=>{
  await page.goto('/');
  await page.locator('#merchantQuery').fill('Agod');
  await expect(page.locator('#merchantResults ol > li')).toHaveCount(0);
  await page.locator('#merchantResults').getByRole('button',{name:'Agoda',exact:true}).click();
  await expect(page.locator('#merchantQuery')).toHaveValue('Agoda');
  await page.locator('#tabMile').click();
  await expect(page.locator('#merchantQuery')).toBeVisible();
  await expect(page.getByLabel('排除新戶／新卡專屬')).toBeVisible();
  await page.getByRole('button',{name:'清除搜尋',exact:true}).click();
  await expect(page.locator('#merchantResults')).toBeEmpty();
});
test('search separates channels, mile units and venue perks in the rendered page',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{
    const rule={status:'verified',reason:'fixture',merchants:['測試通路'],aliases:{},source:'https://bank.example',checkedAt:'2026-10-01',end:'2026-12-31',channels:['online']};
    for(const [id,rate,type] of [['cash','6','cash'],['mile','10元/哩','mile'],['perk','4H','perk']]){
      cards.push({id:'qa-'+id,name:'測試銀行 '+id,tags:type==='mile'?['哩程']:[],tiers:[{label:'測試通路權益',rate,cap:'每月300',kind:'regular',audience:'all',end:'2026-12-31',search:{...rule,searchType:type}}]});visibleCards.add('qa-'+id);
    }
  });
  await page.locator('#merchantQuery').fill('測試通路');
  await expect(page.locator('#merchantResults ol > li')).toHaveCount(0);
  await page.getByRole('button',{name:'線上直接刷卡',exact:true}).click();
  await expect(page.locator('#merchantResults ol')).toContainText('6%');
  await expect(page.locator('#merchantResults ul')).toContainText('4H');
  await page.locator('#tabMile').click();
  await expect(page.locator('#merchantResults ol')).toContainText('10元/哩');
  await expect(page.locator('#merchantResults')).not.toContainText('10%');
});
test('merchant composing input updates results without relying on compositionend',async({page})=>{
  await page.goto('/');
  await page.locator('#merchantQuery').evaluate(el=>{el.value='淘寶';el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'寶'}));});
  await expect(page.locator('#merchantStatus')).toContainText('淘寶：');
});
test('merchant search has no redundant button and Enter reads the current input',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('button',{name:'搜尋推薦',exact:true})).toHaveCount(0);
  await page.locator('#merchantQuery').fill('淘寶');
  await expect(page.locator('#merchantStatus')).toContainText('淘寶：');
  await page.getByRole('button',{name:'清除搜尋',exact:true}).click();
  await page.locator('#merchantQuery').evaluate(el=>{el.value='淘寶';});
  await page.locator('#merchantQuery').press('Enter');
  await expect(page.locator('#merchantStatus')).toContainText('淘寶：');
});
test('merchant search ranks verified offers, handles currency, clears and fits mobile',async({page})=>{
  await page.clock.setFixedTime(new Date('2026-10-19T12:00:00+08:00'));
  await page.setViewportSize({width:320,height:844});await page.goto('/');
  await page.locator('#merchantQuery').fill('淘寶');
  const results=page.locator('#merchantResults');
  await expect(results.locator('ol > li').first()).toContainText('10%');
  await expect(page.locator('#merchantCurrency')).toHaveCount(0);
  await expect(results).toContainText('國泰世華 CUBE');
  await expect(results.locator('details')).toHaveCount(0);
  await expect(results.locator('ol > li').first()).toContainText('500點');
  await expect(results.locator('ol > li').filter({hasText:'聯邦 LINE Bank'})).toContainText('新臺幣 4%／外幣 5.5%');
  await page.locator('#merchantQuery').fill('agoda');
  await page.locator('#merchantChannels').getByRole('button',{name:'平台線上即時付款',exact:true}).click();
  await expect(results.locator('ol > li').filter({hasText:'玉山 Unicard'})).toContainText('4.5%');
  await expect(results).toContainText('5,000點');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#merchantQuery').fill('TAOBAO');
  await expect(results.locator('ol > li').first()).toContainText('10%');
  await page.locator('#merchantQuery').fill('沒有這家商店');
  await expect(results.locator('ol > li')).toHaveCount(0);
  await page.locator('#merchantQuery').fill('<img src=x onerror=alert(1)>');
  await expect(results.locator('img')).toHaveCount(0);
});
test('open and closed detail states survive scenario, offer-filter and tab changes',async({page})=>{
  await page.goto('/');
  const card=page.locator('#card-unicard');
  const offer=card.locator('.offer-details').first();
  await offer.locator('summary').click();
  await page.getByRole('button',{name:'網購',exact:true}).click();
  await expect(card.locator('.offer-details').first()).toHaveAttribute('open','');
  await page.getByLabel('排除新戶／新卡專屬').uncheck();
  await expect(card.locator('.offer-details').first()).toHaveAttribute('open','');
  await page.locator('#tabMile').click();await page.locator('#tabCash').click();
  await expect(card.locator('.offer-details').first()).toHaveAttribute('open','');
  await card.locator('.offer-details').first().locator('summary').click();
  await page.getByRole('button',{name:'全部',exact:true}).click();
  await expect(card.locator('.offer-details').first()).not.toHaveAttribute('open','');
  await page.reload();await expect(card.locator('.offer-details').first()).not.toHaveAttribute('open','');
});
test('all expanded cards expose complete rules, plan names and caps in the visible page',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  for(const tab of ['#tabCash','#tabMile']){
    await page.locator(tab).click();
    for(const scenario of ['全部','旅日','網購']){
      const button=page.getByRole('button',{name:scenario,exact:true});
      if(!await button.isVisible())continue;
      await button.click();
      const missing=await page.evaluate(()=>{
        document.querySelectorAll('#grid details').forEach(d=>d.open=true);
        // scheme-name uses CSS uppercase; compare content independently of casing/whitespace.
        const norm=s=>String(s).replace(/\s+/g,'').toUpperCase();
        const plain=s=>{const e=document.createElement('div');e.innerHTML=s;return norm(e.textContent);};
        const missing=[];
        for(const c of cards){
          const el=document.getElementById('card-'+c.id);if(!el)continue;
          const visible=norm(el.innerText);
          for(const o of cardOffers(c).filter(o=>offerAllowed(o.t)&&!expired(o.t.end))){
            for(const field of ['sub','condition','cap','start','end'])
              if(o.t[field]&&!visible.includes(plain(o.t[field])))missing.push(c.id+'/'+o.t.label+'/'+field);
            if(o.s&&!visible.includes(plain(o.s)))missing.push(c.id+'/scheme');
          }
        }
        return missing;
      });
      expect(missing).toEqual([]);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
  }
});
test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.clock.setFixedTime(new Date('2026-10-01T12:00:00+08:00'));
});
for(const width of [320,390,768,1280]){
  test(`responsive ${width}: both tabs, all cards, hidden audit and overflow`,async({page})=>{
    await page.setViewportSize({width,height:844});await page.goto('/');
    for(const tab of ['cash','mile']){
      await page.locator(tab==='cash'?'#tabCash':'#tabMile').click();
      await expect(page.locator('.card').first()).toBeVisible();
      await expect(page.locator('.audit')).toHaveCount(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const clipped=await page.locator('.card').evaluateAll(cards=>cards.filter(c=>c.scrollWidth>c.clientWidth+2).map(c=>c.id));
      expect(clipped).toEqual([]);
      await page.screenshot({path:`test-results/${test.info().project.name}-${width}-${tab}.png`,fullPage:false});
    }
  });
}
test('axe: cash and mile without audit records',async({page})=>{
  await page.goto('/');await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  for(const id of ['#tabCash','#tabMile']){
    await page.locator(id).click();await expect(page.locator('.audit')).toHaveCount(0);
    await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
    const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
    expect(violations).toEqual([]);
  }
});
test('keyboard: skip, tab buttons, selection, recommendation target',async({page})=>{
  await page.goto('/');await page.keyboard.press(test.info().project.name==='webkit'?'Alt+Tab':'Tab');await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');await expect(page.locator('#mainContent')).toBeFocused();
  await page.locator('#tabMile').focus();await page.keyboard.press('Space');await expect(page.locator('#tabMile')).toHaveAttribute('aria-pressed','true');
  await page.locator('#tabCash').focus();await page.keyboard.press('Enter');
  const pill=page.locator('.sel-pill').first();await pill.focus();await page.keyboard.press('Space');await expect(pill).toBeFocused();await expect(pill).toHaveAttribute('aria-pressed','false');await page.keyboard.press('Space');
  await expect(page.locator('.audit')).toHaveCount(0);
  await page.getByRole('button',{name:'網購',exact:true}).focus();await page.keyboard.press('Enter');
  const link=page.locator('#reco a').first();const href=await link.getAttribute('href');await link.focus();await page.keyboard.press('Enter');await expect(page.locator(href)).toBeFocused();
  const y=await page.locator(href).evaluate(e=>e.getBoundingClientRect().top);const bottom=await page.locator('.filter').evaluate(e=>e.getBoundingClientRect().bottom);expect(y).toBeGreaterThanOrEqual(bottom-2);
});
test('CSS zoom 200 percent: both tabs, hidden audit records and no clipping',async({page})=>{
  await page.setViewportSize({width:640,height:800});await page.goto('/');
  await page.addStyleTag({content:'body{zoom:2}'});
  for(const id of ['#tabCash','#tabMile']){
    await page.locator(id).click();await expect(page.locator(id)).toBeVisible();
    await expect(page.locator('.audit')).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.locator('.card').evaluateAll(cs=>cs.filter(c=>c.scrollWidth>c.clientWidth+2||c.scrollHeight>c.clientHeight+2).map(c=>c.id))).toEqual([]);
    await page.locator('.official').last().scrollIntoViewIfNeeded();await expect(page.locator('.official').last()).toBeInViewport();
  }
});
test('sequential Tab and Shift Tab reach selectors, scenarios and settings',async({page})=>{
  await page.goto('/');const key=test.info().project.name==='webkit'?'Alt+Tab':'Tab';
  const targets=[page.locator('.skip-link'),page.locator('#tabCash'),page.locator('#tabMile'),page.getByRole('button',{name:'全選',exact:true}),page.getByRole('button',{name:'全部取消',exact:true})];
  for(const target of targets){await page.keyboard.press(key);await expect(target).toBeFocused();}
  await page.keyboard.press(test.info().project.name==='webkit'?'Alt+Shift+Tab':'Shift+Tab');await expect(targets[3]).toBeFocused();await page.keyboard.press(key);
  for(const selector of ['.sel-pill','#chips button','.offer-controls input']){
    for(const target of await page.locator(selector).all()){await page.keyboard.press(key);await expect(target).toBeFocused();}
  }
});
test('mobile: every scenario, headings, hidden audit records and filter states',async({page})=>{
  await page.setViewportSize({width:320,height:844});await page.goto('/');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.locator('#selToggle')).toHaveAttribute('aria-expanded','false');
  await page.locator('#selToggle').click();await expect(page.locator('#selGrid')).toBeVisible();
  const labels=await page.locator('#chips button').allTextContents();
  for(const label of labels){
    await page.getByRole('button',{name:label,exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.locator('.card').count()).toBe(await page.locator('#grid').getByRole('heading',{level:2}).count());
  }
  await page.getByRole('button',{name:'全部',exact:true}).click();
  await page.getByLabel('排除新戶／新卡專屬').uncheck();
  await expect(page.locator('.audit')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
  const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
  expect(violations).toEqual([]);expect(errors).toEqual([]);
});
test('compact cards: collapsed height stays under two screens and details open by keyboard',async({page})=>{
  await page.setViewportSize({width:1280,height:900});await page.goto('/');
  const heights=await page.locator('.card').evaluateAll(cs=>cs.map(c=>[c.id,c.getBoundingClientRect().height]));
  for(const [id,h] of heights)expect(h,id).toBeLessThan(1100);
  const summary=page.locator('details.more > summary').first();
  await summary.focus();await page.keyboard.press('Enter');
  await expect(page.locator('details.more').first()).toHaveAttribute('open','');
  await expect(page.locator('.tier.inactive:visible')).toHaveCount(0);
});
test('summary conditions are accessible by keyboard and mobile click',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  const pi=page.locator('.card').filter({has:page.getByRole('heading',{name:/Pi/})});
  const details=pi.locator('.offer-details').first();
  await details.locator('summary').focus();await page.keyboard.press('Enter');
  await expect(details.getByText(/單筆滿499元/)).toBeVisible();
  await page.keyboard.press('Space');await expect(details).not.toHaveAttribute('open','');
  await details.locator('summary').click();await expect(details.getByText(/單筆滿499元/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const unicard=page.locator('.card').filter({has:page.getByRole('heading',{name:/Unicard/})});
  await expect(unicard.getByText('UP選 訂閱制 149點/月',{exact:true})).toBeVisible();
});
