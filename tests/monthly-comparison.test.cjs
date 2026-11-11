const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {loadGs,root}=require('./helpers.cjs');
const {FakeSheet}=require('./fake-sheets.cjs');
function days(gs,y,m,n,sale=10,loss=2){return Array.from({length:n},(_,i)=>({date:new gs.TestDate(y,m-1,i+1,12),sale,loss}));}
function ui(lang='ko'){
 const elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',setAttribute(){}});return elements.get(id);};
 const context=vm.createContext({console,setTimeout,clearTimeout,window:{addEventListener(){}},document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>lang,setItem(){}}});
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 vm.runInContext([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n'),context);
 return {context,element,html};
}
function summary(gs,records){return gs.buildAnnualMonthlySummary_(records);}
test('in-progress month compares through actual journal date, not today or prior whole month',()=>{
 const g=loadGs(),rows=summary(g,[...days(g,2026,10,31),...days(g,2026,11,6,17,3)]),r=rows.at(-1);
 assert.equal(r.cutoffDay,6);assert.equal(r.comparisonMode,'samePeriod');assert.equal(r.comparisonSale,60);assert.equal(r.comparisonLoss,12);assert.equal(r.sale,102);
});
test('complete months compare entire prior months including shorter and longer months',()=>{
 for(const [y,m,prevCount,count] of [[2026,11,31,30],[2026,3,28,31],[2024,3,29,31]]){
  const g=loadGs(),r=summary(g,[...days(g,y,m-1,prevCount),...days(g,y,m,count)]).at(-1);
  assert.equal(r.comparisonMode,'month');assert.equal(r.previousThroughDay,prevCount);assert.equal(r.comparisonSale,prevCount*10);
 }
});
test('partial March caps February at 28 or 29; January reads prior December',()=>{
 for(const [y,m,pY,pM,pCount,count] of [[2026,3,2026,2,28,30],[2024,3,2024,2,29,30],[2027,1,2026,12,31,6]]){
  const g=loadGs(),r=summary(g,[...days(g,pY,pM,pCount),...days(g,y,m,count)]).at(-1);
  assert.equal(r.comparisonMode,'samePeriod');assert.equal(r.previousThroughDay,Math.min(count,pCount));assert.equal(r.comparisonSale,Math.min(count,pCount)*10);
 }
});
test('missing prior month, a missing day in either period, or nonfinite data cannot become zero',()=>{
 const g=loadGs(),prev=days(g,2026,10,31),current=days(g,2026,11,6);
 const cases=[current,[...prev.filter(r=>r.date.getDate()!==3),...current],[...prev,...current.filter(r=>r.date.getDate()!==3)],[...prev.map((r,i)=>i===2?{...r,sale:NaN}:r),...current]];
 for(const records of cases){const r=summary(g,records).at(-1);assert.equal(r.comparisonSale,null);assert.equal(r.comparisonLoss,null);}
});
test('GS output, raw GViz values, HTML parser, and all three languages agree',()=>{
 const g=loadGs(),summaries=summary(g,[...days(g,2026,10,31,0,0),...days(g,2026,11,6,17,3)]);
 const sheet=new FakeSheet('annual');g.writeAnnualMetadata_(sheet,{},summaries);
 const rows=sheet.rows.map(r=>r.slice(10,21));
 for(const [lang,label] of [['ko','전월 동기 대비'],['ru','К тому же периоду прошлого месяца'],['ko_kp','지난달 같은 기간 대비']]){
  const {context:c,element,html}=ui(lang),parsed=c.readAnnualMonthlySummary(rows),stats=c.buildAnnualStats(parsed);c.renderMonthlyStatus(stats);
  assert.equal(stats.previous.sale,0);assert.match(element('monthly-status-body').innerHTML,new RegExp(label));assert.match(element('monthly-status-body').innerHTML,/\+102/);
  assert.match(element('monthly-status-body').innerHTML,/2026.10 · 1–6/);
  assert.doesNotMatch(element('monthly-status-body').innerHTML,/NaN|Infinity/);
  assert.equal((element('monthly-chart').innerHTML.match(/class="monthly-axis-tick"/g)||[]).length,2);
  assert.match(html,/\.monthly-table td,\s*\.monthly-axis-tick\s*\{\s*font-size:\.85rem;\s*font-weight:800;\s*font-family:inherit;/);
  assert.match(html,/"연간 집계 요청",\s*true/);
  assert.ok(vm.runInContext(`Object.hasOwn(I18N,'${lang}')`,c));
 }
});
test('closed month gets full-month labels and an absent schema fails closed',()=>{
 const g=loadGs(),sheet=new FakeSheet('annual');g.writeAnnualMetadata_(sheet,{},summary(g,[...days(g,2026,9,30),...days(g,2026,10,31)]));
 for(const [lang,label] of [['ko','전월 대비'],['ru','К прошлому месяцу'],['ko_kp','지난달 대비']]){
  const {context:c,element}=ui(lang);c.renderMonthlyStatus(c.buildAnnualStats(c.readAnnualMonthlySummary(sheet.rows.map(r=>r.slice(10,21)))));
  assert.match(element('monthly-status-body').innerHTML,new RegExp(label));
  c.renderMonthlyStatus(c.buildAnnualStats(c.readAnnualMonthlySummary([[2026,10,1,1,1],[2026,11,2,2,1]])));
  assert.match(element('monthly-status-body').innerHTML,/—/);
  for(const invalid of [null,undefined,NaN,Infinity])assert.equal(c.formatDelta(1,invalid,'sale').text,'—');
  assert.match(c.formatDelta(0,0,'sale').text,/^0 /);
 }
});
