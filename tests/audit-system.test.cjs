const test=require('node:test'), assert=require('node:assert/strict');
const {loadGs,makeMonth,process,openingAudit}=require('./helpers.cjs');
const {FakeSpreadsheet}=require('./fake-sheets.cjs');
test('audit log appends once and preserves edits, removal and restoration',()=>{
  const c=loadGs(),ss=new FakeSpreadsheet(),info=makeMonth(c,2026,9,[{day:1,audits:{G1:90}}]);process(c,[info]);
  const history=c.collectInventoryAuditHistory_([info]);
  assert.equal(c.appendInventoryAuditHistory_(ss,[info],history,'t1').length,1);
  assert.equal(c.appendInventoryAuditHistory_(ss,[info],history,'t2').length,1);
  history[0].actual=89;history[0].correction=-11;
  assert.equal(c.appendInventoryAuditHistory_(ss,[info],history,'t3').at(-1).action,'revised');
  assert.equal(c.appendInventoryAuditHistory_(ss,[info],[],'t4').at(-1).action,'removed');
  assert.equal(c.appendInventoryAuditHistory_(ss,[info],[],'t5').length,3);
  const restored=c.appendInventoryAuditHistory_(ss,[info],history,'t6');
  assert.equal(restored.length,4);assert.equal(restored[0].audit.actual,90);
});
test('same-day group and complete J disagreement stops conflicting publication',()=>{
  const c=loadGs(), info=makeMonth(c,2026,9,[{day:1,audits:{G1:90}}]);
  const record=openingAudit(c,info);record.date=info.allBlocks[0].date;record.dateKey='2026-09-01';
  assert.throws(()=>process(c,[info],[record]),/동일 날짜/);
});
test('invalid census never silently becomes zero or a valid count',()=>{
  const c=loadGs();
  for(const value of [-1,1.5,'90','오류']) assert.throws(()=>c.manualInventoryAuditValue_([String(value)],[value],[''],0),/J열/);
  assert.throws(()=>c.manualInventoryAuditValue_(['90'],[90],['=90'],0),/J열/);
});
test('formula migration preserves unrelated manual values and ignores nonconsecutive dates',()=>{
  const c=loadGs(),a=makeMonth(c,2026,9,[{day:30}]);
  const b=makeMonth(c,2026,10,[{day:1}],{opening:{G1:77}});
  let plan=c.buildAuditCarryFormulaPlan_([a,b]);
  assert.equal(plan.updates.length,5);assert.equal(plan.conflicts.length,1);
  assert.match(plan.updates[0].formula,/'2026-9'!J3/);
  b.allBlocks[0].date=new c.TestDate(2026,9,2,12);assert.equal(c.buildAuditCarryFormulaPlan_([a,b]).updates.length,0);
});
test('after a J census, an old manual month opening cannot reset the room',()=>{
  const c=loadGs(),a=makeMonth(c,2026,9,[{day:29,audits:{G1:90}},{day:30}]);
  const b=makeMonth(c,2026,10,[{day:1}],{opening:{G1:77}});
  const plan=c.buildAuditCarryFormulaPlan_([a,b]);
  assert.ok(plan.updates.some(u=>u.sheet===b.sheetName&&u.cell==='D6'));
  assert.equal(plan.conflicts.length,0);
});
test('migration does not infer the month-end count from an unused template',()=>{
  const c=loadGs(),a=makeMonth(c,2026,9,[{day:30,template:true}]),b=makeMonth(c,2026,10,[{day:1}]);
  assert.equal(c.buildAuditCarryFormulaPlan_([a,b]).updates.length,0);
});
test('blank opening is not evidence of a copied nonzero inventory before the first J',()=>{
  const c=loadGs(),a=makeMonth(c,2026,9,[{day:30}]),b=makeMonth(c,2026,10,[{day:1}]);
  b.scan.values[5][3]='';b.scan.displayValues[5][3]='';
  const plan=c.buildAuditCarryFormulaPlan_([a,b]);assert.equal(plan.updates.length,5);assert.equal(plan.conflicts[0].cell,'D6');
});
test('manual opening fallback survives J deletion and a replacement census updates its guard',()=>{
  const c=loadGs(),a=makeMonth(c,2026,9,[{day:29,audits:{G1:90}},{day:30}]),b=makeMonth(c,2026,10,[{day:1}],{opening:{G1:77}});
  const first=c.buildAuditCarryFormulaPlan_([a,b]).updates.find(u=>u.sheet===b.sheetName&&u.cell==='D6');
  assert.match(first.formula,/^=IF\(COUNT\('2026-9'!J6\)>0,/);assert.match(first.formula,/,77\)$/);
  b.scan.formulas[5][3]=first.formula;
  a.scan.values[5][9]='';a.scan.displayValues[5][9]='';
  assert.ok(!c.buildAuditCarryFormulaPlan_([a,b]).updates.some(u=>u.sheet===b.sheetName&&u.cell==='D6'));
  a.scan.values[14][9]=89;a.scan.displayValues[14][9]='89';
  const replacement=c.buildAuditCarryFormulaPlan_([a,b]).updates.find(u=>u.sheet===b.sheetName&&u.cell==='D6');
  assert.match(replacement.formula,/COUNT\('2026-9'!J15\)/);assert.match(replacement.formula,/,77\)$/);
});
test('migration recognizes the existing SUM(single previous I) template',()=>{
  const c=loadGs(),info=makeMonth(c,2026,9,[{day:1},{day:2}]);
  info.scan.formulas[11][3]='=SUM($I$3)';
  const plan=c.buildAuditCarryFormulaPlan_([info]);
  assert.equal(plan.updates.length,6);assert.equal(plan.conflicts.length,0);
  assert.match(plan.updates[0].formula,/IF\(AND\(J3>=0,INT\(J3\)=J3\)/);
});
test('unexplained J corrections remain visible after residual reaches zero',()=>{
  const c=loadGs(),info=makeMonth(c,2026,9,[{day:1,audits:{G1:90}},{day:2}]);process(c,[info]);
  const records=c.collectAnnualDailyKpiRecords_([info]);
  const report=c.buildInventoryAuditReport_([info],c.calculateCumulativeExpectedMsy_(records),c.buildLatestMonthSummary_(records),'t');
  const group=report.groups.find(g=>g.key==='growing');
  assert.equal(group.residual,0);assert.equal(group.unexplainedAdjustmentCount,1);assert.equal(group.unexplainedAdjustmentNet,-10);
});
test('year boundary retains census and distinguishes source already carried from stale',()=>{
  const c=loadGs(),a=makeMonth(c,2026,12,[{day:31,audits:{S1:80}}]),b=makeMonth(c,2027,1,[{day:1}],{opening:{S1:80}});
  process(c,[a,b]);assert.equal(b.allBlocks[0].officialGroupStocks.sow.previous,80);assert.equal(b.allBlocks[0].officialGroupStocks.sow.current,80);
});
