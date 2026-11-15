const {chromium,webkit,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
fs.mkdirSync('test-results',{recursive:true});
const engine=process.env.WEBKIT?'webkit':'chromium';
const url=process.env.QA_URL||'http://127.0.0.1:4180';
const cases=engine==='webkit'?[['iphone-webkit',{...devices['iPhone 13'],defaultBrowserType:undefined},[]]]:[
 ['desktop', {viewport:{width:1440,height:900}}, []],
 ['tablet', {viewport:{width:768,height:1024}}, ['--disable-webgl']],
 ['mobile', {...devices['iPhone 13'],defaultBrowserType:undefined}, ['--disable-webgl']],
 ['compact', {...devices['iPhone SE'],defaultBrowserType:undefined,viewport:{width:320,height:568}}, ['--disable-webgl']],
 ['reduced', {viewport:{width:1280,height:720},reducedMotion:'reduce'}, ['--disable-webgl']]
];
async function run(name, options, extra) {
 const browser=await (engine==='webkit'?webkit.launch():chromium.launch({executablePath:process.env.CHROMIUM_BIN,args:['--no-sandbox','--enable-unsafe-swiftshader',...extra]}));
 let errors=[], failures=[], passed=0;
 const page=await browser.newPage({...options,ignoreHTTPSErrors:true}); page.setDefaultTimeout(9000);
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());
 page.on('pageerror',e=>errors.push(e.message));
 const test=async(label,fn)=>{try{await fn();passed++}catch(e){failures.push(label+': '+e.message.split('\n').slice(0,14).join(' | '))}};
 const menu=page.locator('#escales');
 const chapter=()=>page.locator('.city h2').innerText();
 const goto=async i=>{await page.locator('.menu-button').click();await menu.locator('button').nth(i).click();await page.waitForFunction(i=>document.querySelector('.city .label')?.textContent.includes('ESCALE '+String(i+1).padStart(2,'0'))&&!document.querySelector('.hud').inert,i);await page.waitForFunction(i=>Math.abs(scrollY-document.querySelector('#city-'+i).offsetTop)<8,i);};
 try {
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('canvas').waitFor();
 await test('transition intro sans écran vide',async()=>{
   await page.evaluate(()=>scrollTo(0,document.querySelector('#city-0').offsetTop*.92));
   await page.waitForFunction(()=>Number(document.querySelector('.hud').style.opacity)>.75);
   await page.evaluate(()=>scrollTo(0,0));
   await page.waitForFunction(()=>Number(document.querySelector('.intro-copy').style.opacity)>.99);
 });
 await test('hero',async()=>{assert.match(await page.locator('h1').innerText(),/COUREZ/);await page.getByRole('button',{name:/Entrer dans/}).click();await page.waitForFunction(()=>!document.querySelector('.hud').inert);assert.match(await chapter(),/Milan/i);});
 for(let i=0;i<10;i++) await test('escale '+(i+1),async()=>{
  await goto(i);
  if(name==='desktop'||name==='iphone-webkit') await page.screenshot({path:`test-results/${name}-${i}.png`});
  const boxes=await page.evaluate(()=>{
   const box=s=>document.querySelector(s).getBoundingClientRect();
   const clash=(a,b)=>a.width&&b.width&&Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,
    overlaps:[['.story','.mobile-facts'],['.story','.stage-bottom'],['.city','.story']].filter(([a,b])=>clash(box(a),box(b)))};
  });
  assert.equal(boxes.overflow,false,'débordement horizontal');assert.deepEqual(boxes.overlaps,[],'chevauchement '+JSON.stringify(boxes.overlaps));
 });
 await test('phases',async()=>{await goto(0);for(const phase of ['À visiter','Transport','Course']){await page.locator('.phases').getByRole('button',{name:phase,exact:true}).click();await page.waitForFunction(p=>document.querySelector('.phases [aria-current]')?.textContent===p,phase);}});
 await test('carnet / budget',async()=>{await page.getByRole('button',{name:/Carnet de voyage/}).click(); const d=page.getByRole('dialog');await d.waitFor(); const before=await d.locator('.total').innerText();await d.getByLabel('Durée du séjour').selectOption('3');assert.notEqual(await d.locator('.total').innerText(),before);await d.getByLabel(/Transport depuis/).selectOption('train');assert.match(await d.locator('dl').innerText(),/Train aller-retour/);await page.keyboard.press('Escape');await d.waitFor({state:'hidden'});});
 await test('navigation suivante',async()=>{await goto(0);await page.getByRole('button',{name:/Prochaine escale/}).click();await page.waitForFunction(()=>document.querySelector('.city h2').textContent==='Lac d’Annecy');});
 await test('sortie et retour',async()=>{await goto(9);await page.getByRole('button',{name:/Les destinations/}).click();await page.getByRole('button',{name:/Revenir au départ/}).click();await page.waitForFunction(()=>scrollY<2);});
 await test('mouvement et visibilité',async()=>{await goto(0);const canvas=page.locator('canvas');const a=await canvas.screenshot();await page.evaluate(()=>window.scrollBy(0,420));await page.waitForFunction(()=>document.querySelector('.phases [aria-current]')?.textContent==='À visiter'||document.querySelector('.phases [aria-current]')?.textContent==='Transport'||Number(document.querySelector('.progress i').style.height.slice(0,-1))>5);const b=await canvas.screenshot(); if(name!=='reduced')assert.notDeepEqual(a,b);});
 if(failures.length||errors.length)process.exitCode=1;
 const layout=failures.length?await page.evaluate(()=>{
   const button=document.querySelector('.stage-bottom button');
   const r=button.getBoundingClientRect();
   return {viewport:[innerWidth,innerHeight,visualViewport.width,visualViewport.height,visualViewport.scale],scrollY,button:[r.x,r.y,r.width,r.height],hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,150)};
 }):undefined;
 console.log(JSON.stringify({engine,name,layout,renderer:await page.locator('.world').getAttribute('data-renderer'),passed,failures,errors}));
 }finally{await browser.close();}
}
(async()=>{await Promise.all(cases.map(args=>run(...args)));})().catch(e=>{console.error(e);process.exitCode=1});
