/* Generated, hidden system sheets only. No new fields in the farm diary.
 * The log records observed source revisions, not an invented input timestamp
 * or author. Existing J cells remain the only physical-count input.
 */
const AUDIT_DETAILS_CONFIG = {
  REPORT_SHEET: '대시보드_실사검증용',
  LOG_SHEET: '시스템_실사이력',
  REPORT_SCHEMA: 'AUDIT_DETAILS_V1', LOG_SCHEMA: 'AUDIT_LOG_V1'
};

function ensureAuditSystemSheet_(ss, name, marker, columns) {
  let sheet = ss.getSheetByName(name);
  if (sheet && sheet.getLastRow() && sheet.getRange(1, 1).getValue() !== marker) {
    throw new Error('시스템 시트 이름이 기존 자료와 충돌합니다: ' + name);
  }
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  // Also finish hiding a sheet left by an interrupted creation attempt.
  sheet.hideSheet();
  ensureColumns_(sheet, columns);
  return sheet;
}

function collectInventoryAuditHistory_(analyses) {
  const history = [];
  (analyses.carryContextAnalyses || analyses).forEach(function(info) {
    (info.allBlocks || []).forEach(function(block) {
      (block.appliedInventoryAudits || []).forEach(function(audit) {
        history.push(Object.assign({}, audit, {
          id: info.sheetName + '!' + audit.cell + '|' + audit.date + '|' + audit.entityKey,
          sheetId: info.sheet && info.sheet.getSheetId ? info.sheet.getSheetId() : null,
          cause: audit.correction ? 'unresolved' : 'matched'
        }));
      });
    });
  });
  return history;
}

function appendInventoryAuditHistory_(ss, analyses, history, timestamp) {
  const sheet = ensureAuditSystemSheet_(ss, AUDIT_DETAILS_CONFIG.LOG_SHEET, AUDIT_DETAILS_CONFIG.LOG_SCHEMA, 5);
  const count = sheet.getLastRow();
  const rows = count > 1 ? sheet.getRange(2, 1, count - 1, 5).getValues() : [];
  const latest = new Map();
  rows.forEach(function(row) {
    if (row[0] !== AUDIT_DETAILS_CONFIG.LOG_SCHEMA) throw new Error('실사 이력 형식 오류');
    latest.set(row[2], row);
  });
  const additions = [], present = new Set();
  history.forEach(function(audit) {
    present.add(audit.id);
    const payload = JSON.stringify(audit), previous = latest.get(audit.id);
    if (!previous || previous[3] === 'removed' || previous[4] !== payload) {
      additions.push([AUDIT_DETAILS_CONFIG.LOG_SCHEMA, timestamp, audit.id,
        previous ? 'revised' : 'observed', payload]);
    }
  });
  const scopes = new Set((analyses.carryContextAnalyses || analyses).map(function(info) { return info.sheetName; }));
  latest.forEach(function(row, id) {
    if (row[3] !== 'removed' && !present.has(id) && scopes.has(JSON.parse(row[4]).sheetName)) {
      additions.push([AUDIT_DETAILS_CONFIG.LOG_SCHEMA, timestamp, id, 'removed', row[4]]);
    }
  });
  if (!count) sheet.getRange(1, 1, 1, 5).setValues([[AUDIT_DETAILS_CONFIG.LOG_SCHEMA, 'observed_at_utc', 'source_id', 'change', 'payload']]);
  if (additions.length) {
    const start = Math.max(count + 1, 2);
    ensureRows_(sheet, start + additions.length - 1);
    sheet.getRange(start, 1, additions.length, 5).setValues(additions);
  }
  return rows.concat(additions).map(function(row) {
    return {observedAt: row[1], action: row[3], audit: JSON.parse(row[4])};
  });
}

function buildInventoryAuditReport_(analyses, msy, month, timestamp) {
  const latest = findLatestMonthlySheetWithValidData_(analyses);
  const block = latest && latest.validBlocks.slice(-1)[0];
  const rooms = block ? (block.roomAuditStates || []).map(function(room) { return Object.assign({}, room); }) : [];
  const stocks = block && block.officialGroupStocks;
  const adjustments = collectInventoryAuditHistory_(analyses).filter(function(audit) { return audit.correction !== 0; });
  const mappings = [['sow'], ['suckling'], ['weaned'], ['growing'], ['fattening_old', 'fattening_new']];
  const groups = !stocks ? [] : mappings.map(function(keys) {
    const members = rooms.filter(function(room) { return keys.indexOf(room.groupKey) !== -1; });
    const unaudited = members.filter(function(room) {
      const baseline = stocks[room.groupKey].auditDate;
      return !room.auditDate || (baseline && room.auditDate < baseline);
    });
    const dates = members.map(function(room) { return room.auditDate; }).filter(Boolean).sort();
    const pending = [].concat.apply([], keys.map(function(key) { return stocks[key].pendingKeys; }));
    const unknownAdjustments = adjustments.filter(function(audit) { return keys.indexOf(audit.groupAuditKey) !== -1; });
    return {
      key: keys.length === 2 ? 'fattening' : keys[0],
      current: keys.reduce(function(n, key) { return n + stocks[key].current; }, 0),
      detailCurrent: keys.reduce(function(n, key) { return n + stocks[key].detailCurrent; }, 0),
      residual: keys.reduce(function(n, key) { return n + stocks[key].residual; }, 0),
      // Opposite residuals must not cancel the warning for old/new fattening.
      unresolvedMagnitude: keys.reduce(function(n, key) { return n + Math.abs(stocks[key].residual); }, 0),
      unexplainedAdjustmentCount: unknownAdjustments.length,
      unexplainedAdjustmentNet: unknownAdjustments.reduce(function(n, audit) { return n + audit.correction; }, 0),
      unexplainedAdjustmentMagnitude: unknownAdjustments.reduce(function(n, audit) { return n + Math.abs(audit.correction); }, 0),
      latestAuditDate: dates.length ? dates[dates.length - 1] : '',
      unauditedKeys: unaudited.map(function(room) { return room.entityKey; }), pendingKeys: pending,
      parts: keys.map(function(key) { return {key: key, residual: stocks[key].residual}; })
    };
  });
  const context = {
    schema: AUDIT_DETAILS_CONFIG.REPORT_SCHEMA, generatedAt: timestamp,
    latestDate: latest ? dateKey_(latest.latestDate) : '',
    totalPigs: month ? month.totalPigs : 0, sowCount: month ? month.sowCount : null,
    msy: msy.msy, msyStatus: msy.status,
    semantics: 'J=end_of_day_after_movements;next_day_opening=J',
    historySemantics: 'observed_source_revisions'
  };
  return {context: context, groups: groups, rooms: rooms, msy: msy};
}

function refreshInventoryAuditDetails_(ss, analyses, msy, month) {
  const timestamp = new Date().toISOString();
  const report = buildInventoryAuditReport_(analyses, msy, month, timestamp);
  const revisions = appendInventoryAuditHistory_(ss, analyses, collectInventoryAuditHistory_(analyses), timestamp);
  const rows = [[AUDIT_DETAILS_CONFIG.REPORT_SCHEMA, 'context', JSON.stringify(report.context)]];
  report.groups.forEach(function(group) { rows.push(['group', group.key, JSON.stringify(group)]); });
  report.rooms.forEach(function(room) { rows.push(['room', room.entityKey, JSON.stringify(room)]); });
  rows.push(['msy', 'quality', JSON.stringify(report.msy)]);
  const review = ss.getSheetByName('시스템_실사이월확인');
  const conflicts = review && review.getLastRow()>1 ? review.getRange(2,3,review.getLastRow()-1,1).getValues().map(function(row) { return JSON.parse(row[0]); }) : [];
  conflicts.forEach(function(conflict, index) { rows.push(['carryConflict', String(index + 1), JSON.stringify(conflict)]); });
  revisions.forEach(function(revision, index) { rows.push(['revision', String(index + 1), JSON.stringify(revision)]); });
  if (rows.some(function(row) { return row[2].length > 45000; })) throw new Error('실사 검증 데이터 셀 크기 초과');
  const sheet = ensureAuditSystemSheet_(ss, AUDIT_DETAILS_CONFIG.REPORT_SHEET, AUDIT_DETAILS_CONFIG.REPORT_SCHEMA, 3);
  const oldRows = sheet.getLastRow();
  ensureRows_(sheet, rows.length);
  // Write the complete report in one call; clear only its old trailing rows.
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  if (oldRows > rows.length) sheet.getRange(rows.length + 1, 1, oldRows - rows.length, 3).clearContent();
}
