const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.clock.setFixedTime(new Date('2026-09-08T12:00:00+08:00'));
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
    expect(await page.locator('.card').count()).toBe(await page.getByRole('heading',{level:2}).count());
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
