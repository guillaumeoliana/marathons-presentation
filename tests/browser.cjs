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
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('canvas').waitFor({timeout:30000});
 await test('transition intro sans écran vide',async()=>{
   for(const ratio of [.65,.75,.82,.92,1]) {
    await page.evaluate(r=>scrollTo(0,document.querySelector('#city-0').offsetTop*r),ratio);
    await page.waitForFunction(()=>Math.max(Number(document.querySelector('.hud').style.opacity),Number(document.querySelector('.intro-copy').style.opacity))>.5);
   }
   await page.evaluate(()=>scrollTo(0,0));
   await page.waitForFunction(()=>Number(document.querySelector('.intro-copy').style.opacity)>.99);
 });
 await test('hero',async()=>{assert.match(await page.locator('h1').innerText(),/COUREZ/);await page.getByRole('button',{name:/Entrer dans/}).click();await page.waitForFunction(()=>!document.querySelector('.hud').inert);assert.match(await chapter(),/Milan/i);});
 for(let i=0;i<10;i++) await test('escale '+(i+1),async()=>{
  await goto(i);
  if(name==='desktop'||name==='iphone-webkit') await page.screenshot({path:`test-results/${name}-${i}.png`,timeout:30000});
  const boxes=await page.evaluate(()=>{
   const box=s=>document.querySelector(s).getBoundingClientRect();
   const clash=(a,b)=>a.width&&b.width&&Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,
    overlaps:[['.story','.mobile-facts'],['.story','.stage-bottom'],['.city','.story']].filter(([a,b])=>clash(box(a),box(b)))};
  });
  assert.equal(boxes.overflow,false,'débordement horizontal');assert.deepEqual(boxes.overlaps,[],'chevauchement '+JSON.stringify(boxes.overlaps));
 });
 await test('photos des dix escales et commandes accessibles',async()=>{
  for(let i=0;i<10;i++) {
   await goto(i);
   await page.locator('.phases').getByRole('button',{name:'À visiter',exact:true}).click();
   await page.waitForFunction(()=>document.querySelectorAll('.visit-photos img').length===2&&[...document.querySelectorAll('.visit-photos img')].every(img=>img.complete&&img.naturalWidth>0));
   const faults=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('.visit-photos a,.stage-bottom button,.story button')];
    return nodes.filter(n=>{
     const r=n.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
     return r.bottom>innerHeight||r.top<0||!n.contains(hit);
    }).map(n=>n.textContent);
   });
   assert.deepEqual(faults,[],'contrôles masqués: '+faults.join(', '));
   if((name==='desktop'||name==='iphone-webkit')&&i<2) await page.screenshot({path:`test-results/${name}-visits-${i}.png`,timeout:30000});
  }
 });
 await test('défilement manuel et retour après redimensionnement',async()=>{
  await goto(0);
  if(engine==='chromium'&&options.isMobile) {
   const cdp=await page.context().newCDPSession(page);
   const x=Math.round(options.viewport.width*.55),bottom=Math.round(options.viewport.height*.75);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:bottom}]});
   for(let step=1;step<=8;step++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:bottom-step*30}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  } else await page.mouse.wheel(0,240);
  await page.waitForFunction(()=>scrollY>document.querySelector('#city-0').offsetTop+30);
  const original=page.viewportSize();await page.setViewportSize({...original,height:original.height-75});
  await page.locator('.phases').getByRole('button',{name:'Transport',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.phases [aria-current]')?.textContent==='Transport');
  await page.setViewportSize(original);await goto(0);
 });
 await test('phases',async()=>{await goto(0);for(const phase of ['À visiter','Transport','Course']){await page.locator('.phases').getByRole('button',{name:phase,exact:true}).click();await page.waitForFunction(p=>document.querySelector('.phases [aria-current]')?.textContent===p,phase);}});
 await test('carnet / budget',async()=>{await page.getByRole('button',{name:/Carnet de voyage/}).click(); const d=page.getByRole('dialog');await d.waitFor(); const before=await d.locator('.total').innerText();await d.getByLabel('Durée du séjour').selectOption('3');assert.notEqual(await d.locator('.total').innerText(),before);await d.getByLabel(/Transport depuis/).selectOption('train');assert.match(await d.locator('dl').innerText(),/Train aller-retour/);await page.keyboard.press('Escape');await d.waitFor({state:'hidden'});});
 await test('navigation suivante',async()=>{await goto(0);await page.getByRole('button',{name:/Prochaine escale/}).click();await page.waitForFunction(()=>document.querySelector('.city h2').textContent==='Lac d’Annecy');});
 await test('sortie et retour',async()=>{await goto(9);await page.getByRole('button',{name:/Les destinations/}).click();await page.getByRole('button',{name:/Revenir au départ/}).click();await page.waitForFunction(()=>scrollY<2);});
 await test('mouvement et visibilité',async()=>{await goto(0);const canvas=page.locator('canvas');const rect=await canvas.boundingBox();const a=await page.screenshot({clip:rect});await page.evaluate(()=>window.scrollBy(0,420));await page.waitForFunction(()=>document.querySelector('.phases [aria-current]')?.textContent==='À visiter'||document.querySelector('.phases [aria-current]')?.textContent==='Transport'||Number(document.querySelector('.progress i').style.height.slice(0,-1))>5);const b=await page.screenshot({clip:rect}); if(name!=='reduced')assert.notDeepEqual(a,b);});
 await test('perte du contexte 3D et navigation de secours',async()=>{
  if(await page.locator('.world').getAttribute('data-renderer')!=='webgl') return;
  await page.evaluate(()=>document.querySelector('canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await page.waitForFunction(()=>document.querySelector('.world').dataset.renderer==='canvas');
  await goto(2);assert.match(await chapter(),/Nantes/);
  await page.locator('.phases').getByRole('button',{name:'À visiter',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.visit-photos img')?.naturalWidth>0);
 });
 if(failures.length||errors.length)process.exitCode=1;
 const layout=failures.length?await page.evaluate(()=>{
   const button=document.querySelector('.stage-bottom button');
   const r=button.getBoundingClientRect();
   return {viewport:[innerWidth,innerHeight,visualViewport.width,visualViewport.height,visualViewport.scale],scrollY,button:[r.x,r.y,r.width,r.height],hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,150)};
 }):undefined;
 console.log(JSON.stringify({engine,name,layout,renderer:await page.locator('.world').getAttribute('data-renderer'),passed,failures,errors}));
 }finally{await browser.close();}
}
(async()=>{const gpuCases=cases.filter(c=>c[2].length===0),cpuCases=cases.filter(c=>c[2].length>0);await Promise.all(cpuCases.map(args=>run(...args)));for(const args of gpuCases)await run(...args);})().catch(e=>{console.error(e);process.exitCode=1});
