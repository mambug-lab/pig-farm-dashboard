const test = require('node:test');
const assert = require('node:assert/strict');
const {loadGs, makeMonth, openingAudit, process, defaultRooms} = require('./helpers.cjs');

test('post-movement J sets closing; next opening and movements use it without changing source or sale/death', () => {
  const c = loadGs(), info = makeMonth(c, 2026, 9, [
    {day: 15, moves: {G1:[10,0,1,9]}, audits: {G1:90}},
    {day: 16, moves: {G1:[5,0,2,3]}}
  ]);
  const before = JSON.stringify(info.scan);
  process(c, [info], [openingAudit(c,info)]);
  const first = info.allBlocks[0], second = info.allBlocks[1];
  assert.equal(first.officialGroupStocks.growing.current,90);
  assert.equal(second.officialGroupStocks.growing.previous,90);
  assert.equal(second.officialGroupStocks.growing.current,90);
  const audit=first.appliedInventoryAudits[0];
  assert.equal(audit.previousCalculated,100); assert.equal(audit.correction,-10);
  assert.equal(audit.effectiveDate,'2026-09-16');
  const records=c.collectAnnualDailyKpiRecords_([info]);
  assert.equal(records.reduce((n,r)=>n+r.sale,0),12);
  assert.equal(records.reduce((n,r)=>n+r.loss,0),3);
  assert.equal(JSON.stringify(info.scan),before);
});

for (const rawOpening of [100,90]) test(`month carry preserves J without double correction when raw D=${rawOpening}`,()=>{
  const c=loadGs();
  const a=makeMonth(c,2026,9,[{day:30,audits:{G1:90}}]);
  const b=makeMonth(c,2026,10,[{day:1,moves:{G1:[0,0,1,2]}}],{opening:{G1:rawOpening}});
  process(c,[a,b],[openingAudit(c,a)]);
  assert.equal(b.allBlocks[0].officialGroupStocks.growing.previous,90);
  assert.equal(b.allBlocks[0].officialGroupStocks.growing.current,87);
  assert.equal(b.allBlocks[0].roomAuditStates.find(r=>r.room==='G1').auditDate,'2026-09-30');
});

test('zero J empties room; blank J does not count as census; repeat refresh is idempotent',()=>{
  const c=loadGs(), info=makeMonth(c,2026,9,[{day:1,audits:{G1:0}},{day:2}]);
  process(c,[info]);
  assert.equal(info.allBlocks[1].officialGroupStocks.growing.current,0);
  assert.equal(info.allBlocks[1].appliedInventoryAudits.length,0);
  const first=JSON.stringify(info.reportingOutputValues);
  process(c,[info]); assert.equal(JSON.stringify(info.reportingOutputValues),first);
});

test('partial census never distributes old residual; all affected rooms release the baseline',()=>{
  const c=loadGs(), rooms=defaultRooms.concat([['growing','Доращивание','G2']]);
  const info=makeMonth(c,2026,9,[{day:1,audits:{G1:90}},{day:2,audits:{G2:100}}],{rooms});
  process(c,[info],[openingAudit(c,info,{growing:210})]);
  const a=info.allBlocks[0].officialGroupStocks.growing,b=info.allBlocks[1].officialGroupStocks.growing;
  assert.equal(a.current,210); assert.equal(a.detailCurrent,190); assert.equal(a.residual,20);
  assert.equal(a.pendingKeys.length,1);
  assert.equal(b.current,190); assert.equal(b.residual,0); assert.equal(b.pendingKeys.length,0);
});

test('newer complete J census replaces an earlier group count',()=>{
  const c=loadGs(), info=makeMonth(c,2026,9,[{day:1,audits:{G1:90}}]);
  process(c,[info],[openingAudit(c,info,{growing:110})]);
  assert.equal(info.allBlocks[0].officialGroupStocks.growing.current,90);
});

test('unused future templates do not consume audit carry state',()=>{
  const c=loadGs(), a=makeMonth(c,2026,9,[{day:29,audits:{G1:90}},{day:30,template:true}]);
  const b=makeMonth(c,2026,10,[{day:1,moves:{G1:[0,0,1,0]}}]);
  process(c,[a,b]); assert.equal(b.allBlocks[0].officialGroupStocks.growing.current,89);
});

test('late movement correction changes audit adjustment, not actual count; no double loss',()=>{
  const c=loadGs();
  const initial=makeMonth(c,2026,9,[{day:1,audits:{G1:90}},{day:2}]);
  const corrected=makeMonth(c,2026,9,[{day:1,audits:{G1:90},moves:{G1:[0,0,0,10]}},{day:2}]);
  process(c,[initial]);process(c,[corrected]);
  assert.equal(initial.allBlocks[0].appliedInventoryAudits[0].correction,-10);
  assert.equal(corrected.allBlocks[0].appliedInventoryAudits[0].correction,0);
  assert.equal(corrected.allBlocks[1].officialGroupStocks.growing.current,90);
});

test('sow closing census affects MSY exposure the following day',()=>{
  const c=loadGs(), info=makeMonth(c,2026,9,[{day:1,audits:{S1:90}},{day:2}]);
  process(c,[info]);
  const records=c.collectAnnualDailyKpiRecords_([info]);
  assert.equal(records[0].sowCount,90);assert.equal(records[0].msySowCount,100);
  assert.equal(records[1].msySowCount,90);
  const result=c.calculateCumulativeExpectedMsy_(records);
  assert.equal(result.avgSow,95);assert.match(result.status,/잠정/);
});

test('MSY calendar average estimates missing days and cannot label sparse records normal',()=>{
  const c=loadGs(), Date=c.TestDate;
  const result=c.calculateCumulativeExpectedMsy_([
    {date:new Date(2026,8,1,12),sowCount:100,msySowCount:100,sale:10,grandTotalFound:true},
    {date:new Date(2026,8,4,12),sowCount:90,msySowCount:100,sale:10,grandTotalFound:true}
  ]);
  assert.equal(result.avgSow,100);assert.equal(result.quality.estimatedDays,2);
  assert.equal(result.msy,20*365/400);assert.match(result.status,/잠정/);
});

test('J-only day with blank movements is valid under the farm no-movement rule',()=>{
  const c=loadGs(), info=makeMonth(c,2026,9,[{day:1,audits:{G1:90},unconfirmed:true}]);
  process(c,[info]);const result=c.calculateCumulativeExpectedMsy_(c.collectAnnualDailyKpiRecords_([info]));
  assert.equal(result.quality.unconfirmedMovementDates.length,0);assert.equal(result.status,'정상');
});

test('blank and zero movements have identical stock, MSY, coverage and last-event cutoff',()=>{
  const results=[];
  for(const blank of [false,true]) {
    const c=loadGs(),info=makeMonth(c,2026,9,[
      {day:1,moves:{F1:[0,0,0,2]}},{day:2},{day:3,moves:{F1:[0,0,0,4]}},{day:4}
    ]);
    if(blank) for(let r=0;r<info.scan.values.length;r++) for(let col=4;col<=7;col++) {
      if(info.scan.values[r][col]===0) info.scan.values[r][col]=info.scan.displayValues[r][col]='';
    }
    c.activateNoMovementDiaryDays_([info]);process(c,[info]);
    const records=c.collectAnnualDailyKpiRecords_([info]);
    const result=c.calculateCumulativeExpectedMsy_(records);
    assert.equal(records.length,3);assert.equal(c.dateKey_(info.latestDate),'2026-09-03');
    assert.equal(info.allBlocks[3].hasValidInput,false);
    assert.equal(result.sowDays,300);assert.equal(result.msy,6*365/300);
    assert.equal(result.quality.missingDates.length,0);
    assert.equal(result.quality.noMovementDates.join(','),'2026-09-02');
    assert.equal(result.status,'정상');
    results.push(JSON.stringify(result));
  }
  assert.equal(results[0],results[1]);
});

test('zero-only templates never establish a reporting date; zero J does',()=>{
  const c=loadGs(),info=makeMonth(c,2026,9,[{day:1},{day:2},{day:3}]);
  assert.equal(c.activateNoMovementDiaryDays_([info]),null);
  assert.equal(info.hasValidInput,false);
  info.scan.values[14][9]=0;info.scan.displayValues[14][9]='0';
  c.activateNoMovementDiaryDays_([info]);
  assert.equal(c.dateKey_(info.latestDate),'2026-09-02');assert.equal(info.validCount,2);
});

test('no-movement month-end participates in J carry and all calendar days',()=>{
  const c=loadGs(),a=makeMonth(c,2026,9,[{day:29,audits:{S1:90}},{day:30,template:true}]);
  const b=makeMonth(c,2026,10,[{day:1,moves:{F1:[0,0,0,5]}},{day:2,template:true}]);
  c.activateNoMovementDiaryDays_([a,b]);process(c,[a,b]);
  assert.equal(a.validCount,2);assert.equal(b.validCount,1);
  assert.equal(b.allBlocks[0].officialGroupStocks.sow.previous,90);
  assert.equal(c.calculateCumulativeExpectedMsy_(c.collectAnnualDailyKpiRecords_([a,b])).sowDays,280);
  assert.ok(c.buildAuditCarryFormulaPlan_([a,b]).updates.some(u=>u.sheet===b.sheetName));
});

test('MSY includes barren sows throughout no-farrowing and no-movement days',()=>{
  const c=loadGs(),rooms=defaultRooms.concat([['sow','Холостые','S2']]);
  const info=makeMonth(c,2026,9,[{day:1},{day:2},{day:3,moves:{F1:[0,0,0,6]}}],
    {rooms,opening:{S1:120,S2:80}});
  c.activateNoMovementDiaryDays_([info]);process(c,[info]);
  const records=c.collectAnnualDailyKpiRecords_([info]);
  assert.ok(records.every(r=>r.msySowCount===200));
  const result=c.calculateCumulativeExpectedMsy_(records);
  assert.equal(result.sowDays,600);assert.equal(result.avgSow,200);assert.equal(result.msy,3.65);
  assert.equal(result.status,'정상');
});

test('monthly scanner recognizes movement outside anchor rows and excludes trailing zero-only date',()=>{
  const c=loadGs(),fixture=makeMonth(c,2026,9,[{day:1},{day:2,moves:{F1:[0,0,0,6]}},{day:3}]);
  c.scanMonthlySheet_=()=>fixture.scan;c.isAutoGeneratedMonthlySheet_=()=>false;
  const info=c.analyzeMonthlySheet_(fixture.sheet,'Сентябрь 2026',9,2026);
  assert.equal(info.validCount,1);assert.equal(info.allBlocks[0].hasValidInput,false);
  assert.equal(c.dateKey_(info.latestDate),'2026-09-02');
  c.activateNoMovementDiaryDays_([info]);
  assert.equal(info.validCount,2);assert.equal(info.allBlocks[2].hasValidInput,false);
});
