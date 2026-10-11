/* One-time installation in existing diaries; also used for new months.
 * Only D references are changed. J inputs, I formulas and all formatting stay.
 * Every replaced formula/value is backed up before the write.
 */
function buildAuditCarryFormulaPlan_(analyses) {
  const blocks = [];
  analyses.forEach(function(info) { (info.allBlocks || []).forEach(function(block) { blocks.push({info:info,block:block}); }); });
  blocks.sort(function(a,b) { return a.block.date-b.block.date; });
  const updates = [], conflicts = [], auditReferences = new Map();
  for (let index=1; index<blocks.length; index++) {
    const before=blocks[index-1], after=blocks[index];
    if (daysInclusive_(before.block.date,after.block.date)!==2) continue;
    const crossMonth=before.info.sheetName!==after.info.sheetName;
    const previous=new Map(collectInventoryEntityRows_(before.info.scan,before.block,true).map(function(row) { return [row.key,row]; }));
    if (before.block.hasValidInput) previous.forEach(function(source) {
      const idx=source.rowNum-1;
      if (manualInventoryAuditValue_(before.info.scan.displayValues[idx],before.info.scan.values[idx],before.info.scan.formulas[idx],9).hasValue) {
        const refs=auditReferences.get(source.key)||[];
        refs.push("'"+before.info.sheetName.replace(/'/g,"''")+"'!J"+source.rowNum);
        auditReferences.set(source.key,refs);
      }
    });
    collectInventoryEntityRows_(after.info.scan,after.block,false).forEach(function(row) {
      const source=previous.get(row.key);
      if (!source) { conflicts.push({sheet:after.info.sheetName,cell:'D'+row.rowNum,reason:'돈방 식별 불일치'}); return; }
      // An unused month-end template is not evidence for replacing a month-start input.
      if (crossMonth && !before.block.hasValidInput) return;
      const prefix=crossMonth ? "'"+before.info.sheetName.replace(/'/g,"''")+"'!" : '';
      const j=prefix+'J'+source.rowNum, i=prefix+'I'+source.rowNum;
      let formula='=IF(ISNUMBER('+j+'),IF(AND('+j+'>=0,INT('+j+')='+j+'),'+j+','+i+'),'+i+')';
      const oldFormula=(after.info.scan.formulas[row.rowNum-1]||[])[3]||'';
      const oldValue=(after.info.scan.values[row.rowNum-1]||[])[3];
      const refs=auditReferences.get(row.key)||[];
      const savedFallback=oldFormula.match(/,(-?\d+(?:\.\d+)?|"")\)$/);
      const guardedFormula=oldFormula.indexOf('=IF(COUNT(')===0 && savedFallback && oldFormula.indexOf(')>0,'+formula.slice(1)+',')!==-1;
      if (guardedFormula) {
        // Deleting the last J automatically restores the original manual opening.
        if (!refs.length) return;
        formula='=IF(COUNT('+refs.join(',')+')>0,'+formula.slice(1)+','+savedFallback[1]+')';
      }
      if (oldFormula===formula) return;
      const directFormula=('='+i).replace(/\$/g,'').toLowerCase();
      const normalizedFormula=oldFormula.replace(/\s/g,'').replace(/\$/g,'').toLowerCase();
      const directReference=directFormula.replace(/\s/g,'');
      const simpleReference=normalizedFormula===directReference || normalizedFormula==='=sum('+directReference.slice(1)+')';
      const previousActual=manualInventoryAuditValue_(before.info.scan.displayValues[source.rowNum-1],before.info.scan.values[source.rowNum-1],before.info.scan.formulas[source.rowNum-1],9);
      const emptyValue=oldValue==='' || oldValue===null || oldValue===undefined;
      const copiedValue=!oldFormula && ((emptyValue && source.currentStock===0) ||
        oldValue===source.currentStock || (previousActual.hasValue && oldValue===previousActual.value));
      // Once this room has a J census, a copied/manual month opening cannot reset it.
      // Before the first J, preserve historical month-start differences for review.
      const auditedMonthOpening=refs.length && !oldFormula && (typeof oldValue==='number' || emptyValue);
      if (!simpleReference && !copiedValue && !auditedMonthOpening && !guardedFormula) {
        conflicts.push({sheet:after.info.sheetName,cell:'D'+row.rowNum,reason:'기존 수기값 또는 다른 수식 보존'});
        return;
      }
      if (auditedMonthOpening && !copiedValue) {
        formula='=IF(COUNT('+refs.join(',')+')>0,'+formula.slice(1)+','+(emptyValue?'""':oldValue)+')';
      }
      updates.push({sheet:after.info.sheetName,row:row.rowNum,cell:'D'+row.rowNum,
        oldValue:oldValue===undefined?'':oldValue,oldFormula:oldFormula,formula:formula});
    });
  }
  return {updates:updates,conflicts:conflicts};
}

function installClosingCensusCarryover() {
  return withDocumentLock_('J열 실사 이월 수식 설정', function() {
    return installClosingCensusCarryoverUnlocked_(SpreadsheetApp.getActiveSpreadsheet());
  });
}

function installClosingCensusCarryoverUnlocked_(ss) {
    const analyses=listMonthlySheetDescriptors_(ss).map(function(item) {
      return analyzeMonthlySheet_(item.sheet,item.sheetName,item.month,item.year);
    });
    const plan=buildAuditCarryFormulaPlan_(analyses);
    const backup=ensureAuditSystemSheet_(ss,'시스템_실사수식원본','AUDIT_FORMULA_BACKUP_V1',4);
    if (!backup.getLastRow()) backup.getRange(1,1,1,4).setValues([['AUDIT_FORMULA_BACKUP_V1','recorded_at_utc','target','original_and_replacement']]);
    const sourceRanges=new Map();
    plan.updates.forEach(function(update) {
      if (sourceRanges.has(update.sheet)) return;
      const sheet=ss.getSheetByName(update.sheet), range=sheet.getRange(1,4,sheet.getLastRow(),1);
      sourceRanges.set(update.sheet,{values:range.getValues(),formulas:range.getFormulas()});
    });
    // Validate all targets again before any source edit (one column read per sheet).
    plan.updates.forEach(function(update) {
      const snapshot=sourceRanges.get(update.sheet), idx=update.row-1;
      if (snapshot.formulas[idx][0]!==update.oldFormula || (!update.oldFormula && snapshot.values[idx][0]!==update.oldValue)) {
        throw new Error('설정 중 원본이 변경되었습니다: '+update.sheet+'!'+update.cell);
      }
    });
    if (plan.updates.length) {
      const timestamp=new Date().toISOString(), start=backup.getLastRow()+1;
      const rows=plan.updates.map(function(update) { return ['AUDIT_FORMULA_BACKUP_V1',timestamp,update.sheet+'!'+update.cell,JSON.stringify(update)]; });
      ensureRows_(backup,start+rows.length-1);
      backup.getRange(start,1,rows.length,4).setValues(rows);
      const batches=[];
      plan.updates.forEach(function(update) {
        const last=batches[batches.length-1];
        if (last && last.sheet===update.sheet && last.row+last.formulas.length===update.row) last.formulas.push([update.formula]);
        else batches.push({sheet:update.sheet,row:update.row,formulas:[[update.formula]]});
      });
      batches.forEach(function(batch) { ss.getSheetByName(batch.sheet).getRange(batch.row,4,batch.formulas.length,1).setFormulas(batch.formulas); });
      SpreadsheetApp.flush();
      const saved=new Map();
      sourceRanges.forEach(function(_snapshot,name) {
        const sheet=ss.getSheetByName(name);
        saved.set(name,sheet.getRange(1,4,sheet.getLastRow(),1).getFormulas());
      });
      plan.updates.forEach(function(update) {
        if (saved.get(update.sheet)[update.row-1][0]!==update.formula) {
          throw new Error('이월 수식 저장 확인 실패: '+update.sheet+'!'+update.cell);
        }
      });
    }
    const review=ensureAuditSystemSheet_(ss,'시스템_실사이월확인','AUDIT_CARRY_REVIEW_V1',3);
    const reviewRows=[['AUDIT_CARRY_REVIEW_V1','cell','details']].concat(plan.conflicts.map(function(item) {
      return [item.sheet,item.cell,JSON.stringify(item)];
    }));
    const oldReviewRows=review.getLastRow();
    ensureRows_(review,reviewRows.length);
    review.getRange(1,1,reviewRows.length,3).setValues(reviewRows);
    if (oldReviewRows>reviewRows.length) review.getRange(reviewRows.length+1,1,oldReviewRows-reviewRows.length,3).clearContent();
    Logger.log(JSON.stringify({updated:plan.updates.length,preserved:plan.conflicts}));
    return {updated:plan.updates.length,conflicts:plan.conflicts};
}
