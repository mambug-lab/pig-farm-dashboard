const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {loadGs,makeMonth,process,root}=require('./helpers.cjs');const {FakeSheet}=require('./fake-sheets.cjs');
function fixture(){
 const gs=loadGs(),info=makeMonth(gs,2026,9,[{day:1,audits:{G1:90}},{day:2}]);process(gs,[info]);
 const records=gs.collectAnnualDailyKpiRecords_([info]),msy=gs.calculateCumulativeExpectedMsy_(records),month=gs.buildLatestMonthSummary_(records);
 const report=gs.buildInventoryAuditReport_([info],msy,month,'test'),sheet=new FakeSheet('metadata');gs.writeMonthlyDashboardMetadata_(sheet,msy,month,info);
 const rows=[['AUDIT_DETAILS_V1','context',JSON.stringify(report.context)],...report.groups.map(g=>['group',g.key,JSON.stringify(g)]),...report.rooms.map(r=>['room',r.entityKey,JSON.stringify(r)]),['msy','quality',JSON.stringify(msy)]];
 return {rows,metadata:sheet.rows.map(row=>row.slice(10,18))};
}
function loadUi(){
 const elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',hidden:false,setAttribute(k,v){this[k]=v;}});return elements.get(id);};
 const context=vm.createContext({console,setTimeout,clearTimeout,window:{addEventListener(){}},document:{getElementById:element,querySelectorAll(){return [];}},localStorage:{getItem:()=>null,setItem(){}}});
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
 vm.runInContext(inline,context);vm.runInContext(fs.readFileSync(path.join(root,'audit-details.js'),'utf8'),context);return {context,element};
}
test('GS metadata and detail report obey the real HTML parser contract',()=>{
 const {context}=loadUi(),f=fixture();const report=context.parseAuditDetailsRows(f.rows,f.metadata);
 assert.equal(report.groups.length,5);assert.equal(report.groups.find(g=>g.key==='growing').current,90);
 const old=JSON.parse(f.rows[0][2]);old.latestDate='2026-09-01';f.rows[0][2]=JSON.stringify(old);
 assert.throws(()=>context.parseAuditDetailsRows(f.rows,f.metadata),/기준이 다릅니다/);
});
test('details render Korean and Russian, preserving escaped source text',()=>{
 const {context,element}=loadUi(),f=fixture();context.report=context.parseAuditDetailsRows(f.rows,f.metadata);
 context.report.rooms[0].room='<img src=x onerror=alert(1)>';
 vm.runInContext('auditDetailsCache=report;renderAuditDetails()',context);
 assert.match(element('audit-details').innerHTML,/최근 J열 실사일/);
 assert.doesNotMatch(element('audit-details').innerHTML,/<img src=x/);
 vm.runInContext("getLang=()=> 'ru';renderAuditDetails()",context);
 assert.match(element('audit-details').innerHTML,/Последний пересчёт/);
});
test('detail load failure stays inside the panel and permits retry',async()=>{
 const {context,element}=loadUi(),f=fixture();context.metadata=f.metadata;
 vm.runInContext("latestMetaRows=metadata;loadGvizRowsBySheetRange=async()=>{throw new Error('offline')}",context);
 await context.loadAuditDetails();assert.match(element('audit-details').innerHTML,/다시 조회/);
 assert.equal(element('status-text').textContent,'');
});
test('returning to existing rooms hides audit detail and leaves main data untouched',()=>{
 const {context,element}=loadUi();context.setSideView('rooms');assert.equal(element('side-tree').hidden,false);assert.equal(element('audit-details').hidden,true);
});
