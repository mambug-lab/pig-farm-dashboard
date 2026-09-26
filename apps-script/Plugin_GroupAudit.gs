


/***************************************************************
 * 구분 합계 실사 입력 읽기/검증
 ***************************************************************/

function readGroupInventoryAuditRecords_(ss) {

  const sheet = ss.getSheetByName(GROUP_INVENTORY_AUDIT_CONFIG.SHEET_NAME);
  const firstDataRow = GROUP_INVENTORY_AUDIT_CONFIG.FIRST_DATA_ROW;

  if (!sheet) {
    return { sheet: null, firstDataRow: firstDataRow, rowCount: 0, records: [] };
  }

  const rowCount = Math.max(0, sheet.getLastRow() - firstDataRow + 1);
  if (!rowCount) {
    return { sheet: sheet, firstDataRow: firstDataRow, rowCount: 0, records: [] };
  }

  const inputRange = sheet.getRange(
    firstDataRow,
    1,
    rowCount,
    GROUP_INVENTORY_AUDIT_CONFIG.COLUMN_COUNT
  );
  const rows = inputRange.getValues();
  const displayRows = inputRange.getDisplayValues();
  const formulas = inputRange.getFormulas();
  const records = [];

  rows.forEach(function(row, index) {
    if (!groupAuditRowHasData_(row)) return;

    const formulaRow = formulas[index] || [];
    const record = {
      rowNum: firstDataRow + index,
      sourceRow: row,
      date: null,
      dateKey: "",
      groupValues: null,
      expectedTotal: null,
      status: String(
        row[
          GROUP_INVENTORY_AUDIT_CONFIG.COL.STATUS - 1
        ] ||
        ""
      ),
      canApply: true,
      matchedInfo: null,
      matchedBlock: null,
      applied: false
    };
    if (formulaRow[GROUP_INVENTORY_AUDIT_CONFIG.COL.AUDIT_DATE - 1]) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "дата инвентаризации не должна быть формулой");
      records.push(record);
      return;
    }
    const displayRow = displayRows[index] || [];
    const parsedDate =
      parseDateFromCell_(
        displayRow[
          GROUP_INVENTORY_AUDIT_CONFIG.COL.AUDIT_DATE - 1
        ]
      ) ||
      parseDateFromCell_(
        row[
          GROUP_INVENTORY_AUDIT_CONFIG.COL.AUDIT_DATE - 1
        ]
      );
    if (!parsedDate) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "не указана корректная дата инвентаризации");
      records.push(record);
      return;
    }
    record.date = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    record.dateKey = dateKey_(record.date);

    const c = GROUP_INVENTORY_AUDIT_CONFIG.COL;
    const fields = {
      sowMain: readGroupAuditInteger_(row[c.SOW_MAIN - 1], formulaRow[c.SOW_MAIN - 1]),
      sowFarrowing: readGroupAuditInteger_(row[c.SOW_FARROWING - 1], formulaRow[c.SOW_FARROWING - 1]),
      suckling: readGroupAuditInteger_(row[c.SUCKLING - 1], formulaRow[c.SUCKLING - 1]),
      weaned: readGroupAuditInteger_(row[c.WEANED - 1], formulaRow[c.WEANED - 1]),
      growing: readGroupAuditInteger_(row[c.GROWING - 1], formulaRow[c.GROWING - 1]),
      fatteningOld: readGroupAuditInteger_(row[c.FATTENING_OLD - 1], formulaRow[c.FATTENING_OLD - 1]),
      fatteningNew: readGroupAuditInteger_(row[c.FATTENING_NEW - 1], formulaRow[c.FATTENING_NEW - 1]),
      replacementGilts: readGroupAuditInteger_(row[c.REPLACEMENT_GILTS - 1], formulaRow[c.REPLACEMENT_GILTS - 1]),
      culledSows: readGroupAuditInteger_(row[c.CULLED_SOWS - 1], formulaRow[c.CULLED_SOWS - 1]),
      boars: readGroupAuditInteger_(row[c.BOARS - 1], formulaRow[c.BOARS - 1])
    };

    if (Object.keys(fields).some(function(key) { return !fields[key].valid; })) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "количество должно быть целым числом 0 или больше");
      records.push(record);
      return;
    }

    const required = ["sowMain", "sowFarrowing", "suckling", "weaned", "growing", "fatteningOld", "fatteningNew"];
    if (required.some(function(key) { return !fields[key].present; })) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "не заполнены все обязательные категории");
      records.push(record);
      return;
    }

    if ([fields.replacementGilts, fields.culledSows, fields.boars].some(function(item) {
      return item.present && item.value > 0;
    })) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.NEEDS_CLARIFICATION, "требуется указать, куда включить ремонтных свинок, выбракованных свиноматок или хряков");
      records.push(record);
      return;
    }

    const sowTotal = fields.sowMain.value + fields.sowFarrowing.value;
    const groupValues = {
      sow: sowTotal,
      suckling: fields.suckling.value,
      weaned: fields.weaned.value,
      growing: fields.growing.value,
      fattening_old: fields.fatteningOld.value,
      fattening_new: fields.fatteningNew.value
    };
    const expectedTotal = GROUP_INVENTORY_AUDIT_CONFIG.GROUP_KEYS.reduce(function(sum, key) {
      return sum + Number(groupValues[key] || 0);
    }, 0);
    const displayedSowTotal = readGroupAuditInteger_(row[c.SOW_TOTAL - 1]);
    const displayedTotal = readGroupAuditInteger_(row[c.AUDIT_TOTAL - 1]);
    if (displayedSowTotal.present && (!displayedSowTotal.valid || displayedSowTotal.value !== sowTotal)) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "итог по свиноматкам не совпадает с двумя исходными графами");
      records.push(record);
      return;
    }
    if (displayedTotal.present && (!displayedTotal.valid || displayedTotal.value !== expectedTotal)) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "общий итог не совпадает с суммой категорий");
      records.push(record);
      return;
    }
    record.groupValues = groupValues;
    record.expectedTotal = expectedTotal;
    records.push(record);
  });

  const recordsByDate = new Map();
  records.filter(function(record) { return record.canApply && record.dateKey; }).forEach(function(record) {
    const sameDate = recordsByDate.get(record.dateKey) || [];
    sameDate.push(record);
    recordsByDate.set(record.dateKey, sameDate);
  });
  recordsByDate.forEach(function(sameDate) {
    if (sameDate.length < 2) return;
    sameDate.forEach(function(record) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "дублируется дата инвентаризации");
    });
  });

  return { sheet: sheet, firstDataRow: firstDataRow, rowCount: rowCount, records: records };
}


function groupAuditRowHasData_(row) {
  const c = GROUP_INVENTORY_AUDIT_CONFIG.COL;
  return [c.AUDIT_DATE, c.SOW_MAIN, c.SOW_FARROWING, c.SUCKLING, c.WEANED,
    c.GROWING, c.FATTENING_OLD, c.FATTENING_NEW, c.REPLACEMENT_GILTS,
    c.CULLED_SOWS, c.BOARS, c.NOTE].some(function(oneBasedCol) {
      const value = row[oneBasedCol - 1];
      return !(value === "" || value === null || value === undefined);
    });
}


function readGroupAuditInteger_(value, formula) {
  if (formula) {
    return { present: true, valid: false, value: null };
  }
  if (value === "" || value === null || value === undefined) {
    return { present: false, valid: true, value: null };
  }
  const normalized = typeof value === "number" ? value : Number(String(value)
    .replace(/\u00A0/g, "").replace(/\s/g, "").replace(/,/g, "."));
  const valid = Number.isFinite(normalized) && normalized >= 0 && Number.isInteger(normalized);
  return { present: true, valid: valid, value: valid ? normalized : null };
}


function setGroupAuditRecordStatus_(record, status, detail) {
  record.canApply = status === GROUP_INVENTORY_AUDIT_CONFIG.STATUS.APPLIED;
  record.status = detail ? status + ": " + detail : status;
}


/***************************************************************
 * 구분 합계 실사일과 월작업일지 블록 연결
 ***************************************************************/

function matchGroupInventoryAuditsToBlocks_(analyses, records) {
  const firstDate = (analyses || []).reduce(function(first, info) {
    return (info.allBlocks || []).reduce(function(value, block) {
      return !value || block.date < value ? block.date : value;
    }, first);
  }, null);
  const openingDate = firstDate ? new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate() - 1, 12) : null;
  const analysisYears = new Set(
    (analyses || []).map(function(info) {
      return Number(info && info.year);
    })
  );

  (records || []).forEach(function(record) {
    if (!record.canApply || !record.date) return;
    // Exact previous calendar day only: do not invent movements across a gap.
    if (openingDate && dateKey_(record.date) === dateKey_(openingDate)) {
      record.openingOfficeBaseline = true;
      return;
    }

    if (!analysisYears.has(record.date.getFullYear())) {
      return;
    }

    const info = (analyses || []).filter(function(item) {
      return item &&
        item.year === record.date.getFullYear() &&
        item.monthIndex === record.date.getMonth() + 1;
    })[0] || null;
    if (!info) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.NOT_APPLIED, "нет листа месячного журнала");
      return;
    }
    const block = (info.allBlocks || []).filter(function(item) {
      return item && item.date && dateKey_(item.date) === record.dateKey;
    })[0] || null;
    if (!block) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "в месячном журнале нет блока указанной даты");
      return;
    }
    record.matchedInfo = info;
    record.matchedBlock = block;
    block.groupInventoryAuditRecord = record;
  });
}


/***************************************************************
 * 구분 합계 실사보정
 * 상세행에는 차이를 배분하지 않고 대표행과 ВСЕГО만 보정한다.
 ***************************************************************/

// Residual state is replayed from audit history, including prior-year carry context.
// It is never copied into a room's D/I cell or divided among rooms.
function applyGroupInventoryAuditAdjustments_(analyses, records) {
  const keys = GROUP_INVENTORY_AUDIT_CONFIG.GROUP_KEYS;
  const chronological = [];
  (analyses || []).forEach(function(info, analysisIndex) {
    info.reportingOutputValues = info.outputValues.map(function(row) { return row.slice(); });
    info.groupInventoryAuditCount = 0;
    (info.allBlocks || []).forEach(function(block, blockIndex) {
      block.appliedGroupInventoryAudits = [];
      block.officialGroupStocks = null;
      chronological.push({info: info, block: block});
    });
  });
  chronological.sort(function(a, b) { return a.block.date - b.block.date; });
  const states = new Map();
  (records || []).filter(function(record) {
    return record.canApply && record.openingOfficeBaseline;
  }).forEach(function(record) {
    keys.forEach(function(key) {
      states.set(key, {current: Number(record.groupValues[key]), offset: 0,
        pending: new Set(), auditDate: dateKey_(record.date)});
    });
    record.applied = true;
    setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.APPLIED,
      formatDateForDisplay_(record.date) + ' (начальный остаток следующего журнала)');
  });
  chronological.forEach(function(item) {
    const info = item.info, block = item.block;
    // RC10: office baseline survives manual month-start values.
    // A template-only date is not an inventory event.
    // A valid group audit alone must still be processed and activate the date.
    const pendingRecord = block.groupInventoryAuditRecord;
    if (!block.hasValidInput && !(pendingRecord && pendingRecord.canApply && pendingRecord.groupValues)) return;
    const entities = collectInventoryEntityRows_(info.adjustedScan || info.scan, block, true);
    const byGroup = {};
    keys.forEach(function(key) { byGroup[key] = entities.filter(function(e) { return e.groupAuditKey === key; }); });
    const targets = findGroupInventoryTargetRows_(info.scan, block);
    const record = block.groupInventoryAuditRecord;
    let applyRecord = Boolean(record && record.canApply && record.groupValues);
    if (applyRecord) {
      const missing = keys.filter(function(key) { return !byGroup[key].length; });
      if (missing.length || !targets.grandTotalRow) {
        setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR,
          'не найдены подробные помещения всех групп или ВСЕГО: ' + missing.join(', '));
        applyRecord = false;
      }
    }
    if (applyRecord) activateGroupAuditBlock_(info, block);
    const official = {};
    let previousResidual = 0, currentResidual = 0;
    keys.forEach(function(key) {
      const members = byGroup[key];
      const memberKeys = new Set(members.map(function(e) { return e.key; }));
      const detailPrevious = members.reduce(function(sum, e) {
        const idx = e.rowNum - 1;
        return sum + cellNumber_(info.scan.displayValues[idx], info.outputValues[idx], 3);
      }, 0);
      const detailCurrent = members.reduce(function(sum, e) { return sum + e.currentStock; }, 0);
      let state = states.get(key);
      // Office totals are authoritative. J and manual D remain detail-only.
      // Roll forward using journal movements, never the manually reset opening.
      const movement = members.reduce(function(sum, e) {
        const row = info.scan.values[e.rowNum - 1];
        const display = info.scan.displayValues[e.rowNum - 1];
        return sum + cellNumber_(display, row, 4) - cellNumber_(display, row, 5) -
          cellNumber_(display, row, 6) - cellNumber_(display, row, 7);
      }, 0);
      const officialPrevious = state ? state.current : detailPrevious;
      const before = officialPrevious - detailPrevious;
      if (state && !members.length) {
        throw new Error('관리사무소 기준 재고의 돈군을 찾을 수 없습니다: ' + key + ' / ' + dateKey_(block.date));
      }
      if (state) {
        state.current += movement;
        state.offset = state.current - detailCurrent;
        state.pending = new Set(state.offset ? Array.from(memberKeys) : []);
      }
      if (applyRecord) {
        const calculated = state ? state.current : detailCurrent;
        const actual = Number(record.groupValues[key]);
        state = {current: actual, offset: actual - detailCurrent,
          members: memberKeys,
          pending: new Set(actual !== detailCurrent ? Array.from(memberKeys) : []),
          auditDate: dateKey_(block.date)};
        states.set(key, state);
        block.appliedGroupInventoryAudits.push({groupKey: key, rowNum: targets.groups[key] || null,
          previousCalculated: calculated, actual: actual,
          correction: actual - calculated, carriedOffset: state.offset});
      }
      const residual = state ? state.offset : 0;
      official[key] = {previous: detailPrevious + before, current: detailCurrent + residual,
        detailPrevious: detailPrevious, detailCurrent: detailCurrent, residual: residual,
        pendingKeys: state ? Array.from(state.pending) : [], count: members.length,
        auditDate: state ? state.auditDate : ''};
      previousResidual += before;
      currentResidual += residual;
      // Only genuine summary rows may receive a group value. A single-room
      // row can also be an old "group target"; it MUST remain its J-adjusted value.
      const target = targets.groups[key];
      if (state && target && !entities.some(function(e) { return e.rowNum === target; })) {
        const row = info.reportingOutputValues[target - 1];
        row[3] = official[key].previous;
        row[8] = official[key].current;
      }
    });
    block.officialGroupStocks = official;
    block.groupResidualState = keys.map(function(key) {
      const g = official[key];
      return {groupKey: key, residual: g.residual, pendingKeys: g.pendingKeys.slice(), auditDate: g.auditDate};
    });
    if (targets.grandTotalRow && (previousResidual || currentResidual)) {
      const idx = targets.grandTotalRow - 1;
      const row = info.reportingOutputValues[idx];
      row[3] = cellNumber_(info.scan.displayValues[idx], info.outputValues[idx], 3) + previousResidual;
      row[8] = cellNumber_(info.scan.displayValues[idx], info.outputValues[idx], 8) + currentResidual;
    }
    if (applyRecord) {
      record.applied = true;
      info.groupInventoryAuditCount++;
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.APPLIED, formatDateForDisplay_(record.date));
    }
  });
  (analyses || []).forEach(function(info) {
    info.reportingScan = {lastRow: info.scan.lastRow,
      values: info.scan.values.map(function(row, i) {
        const copy = row.slice();
        for (let col = 0; col < DASHBOARD_CONFIG.MAX_DATA_COLS; col++) copy[col] = info.reportingOutputValues[i][col];
        return copy;
      }), displayValues: info.scan.displayValues, formulas: info.scan.formulas};
  });
  (records || []).forEach(function(record) {
    if (record.canApply && record.matchedBlock && !record.applied && !record.status)
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.NOT_APPLIED, 'запись не была обработана');
  });
}

// Explicit presentation contract. Fattening aggregation belongs to GS, not HTML.
function buildOfficialGroupStockMetadata_(latestInfo) {
  const block = latestInfo && (latestInfo.validBlocks || []).slice(-1)[0];
  if (!block || !block.officialGroupStocks) return [];
  const stocks = block.officialGroupStocks;
  const mappings = [['sow'], ['suckling'], ['weaned'], ['growing'], ['fattening_old', 'fattening_new']];
  return mappings.map(function(parts) {
    const gs = parts.map(function(key) { return stocks[key]; });
    const sum = function(field) { return gs.reduce(function(n, g) { return n + g[field]; }, 0); };
    return [parts.length === 2 ? 'fattening' : parts[0], sum('previous'), sum('current'),
      sum('detailPrevious'), sum('detailCurrent'), sum('residual'),
      gs.reduce(function(n, g) { return n + g.pendingKeys.length; }, 0), sum('count')];
  });
}

function activateGroupAuditBlock_(info, block) {
  if (!(info.validBlocks || []).some(function(item) { return item === block; })) info.validBlocks.push(block);
  block.hasValidInput = true;
  info.validBlocks.sort(function(a, b) { return a.date.getTime() - b.date.getTime(); });
  info.hasValidInput = info.validBlocks.length > 0;
  info.validCount = info.validBlocks.length;
  const latest = info.validBlocks[info.validBlocks.length - 1];
  if (!latest) return;
  info.dateBlockStartRow = latest.dateBlockStartRow;
  info.nextDateRow = latest.nextDateRow;
  info.copyEndRow = latest.copyEndRow;
  info.latestDate = latest.date;
  info.matchedAnchorCount = latest.matchedAnchorCount;
  info.inputAnchorCount = latest.inputAnchorCount;
  info.missingAnchors = latest.missingAnchors;
}


function findGroupInventoryTargetRows_(scan, block) {
  const candidates = {};
  GROUP_INVENTORY_AUDIT_CONFIG.GROUP_KEYS.forEach(function(key) { candidates[key] = []; });
  const grandTotalCandidates = [];
  let currentSection = "";
  let inAggregateSummary = false;

  for (let rowNum = block.dateBlockStartRow; rowNum <= block.copyEndRow; rowNum++) {
    const valueRow = scan.values[rowNum - 1];
    const displayRow = scan.displayValues[rowNum - 1];
    if (!valueRow || !displayRow) continue;
    const section = cellText_(displayRow, valueRow, 0);
    const sub = cellText_(displayRow, valueRow, 2);
    if (section && !isAnyTotalLabel_(section)) {
      currentSection = section;
      inAggregateSummary = false;
    }
    if (isGrandTotalLabel_(section) || isGrandTotalLabel_(sub)) {
      grandTotalCandidates.push(rowNum);
      continue;
    }
    if (isSubTotalLabel_(section) || isSubTotalLabel_(sub)) {
      if (classifyGroupInventoryTargetKey_(currentSection, section, sub) === "sow") candidates.sow.push(rowNum);
      inAggregateSummary = true;
      continue;
    }
    if (inAggregateSummary && !section) {
      if (classifyGroupInventoryTargetKey_(currentSection, section, sub) === "suckling") candidates.suckling.push(rowNum);
      continue;
    }
    const key = classifyGroupInventoryTargetKey_(currentSection, section, sub);
    if (["weaned", "growing", "fattening_old", "fattening_new"].indexOf(key) !== -1 && Boolean(section) && hasNumericCell_(displayRow, valueRow, 8)) {
      candidates[key].push(rowNum);
    }
  }

  const groups = {};
  GROUP_INVENTORY_AUDIT_CONFIG.GROUP_KEYS.forEach(function(key) {
    if (candidates[key].length === 1) groups[key] = candidates[key][0];
  });
  return {
    groups: groups,
    grandTotalRow: grandTotalCandidates.length === 1 ? grandTotalCandidates[0] : null,
    ambiguousKeys: GROUP_INVENTORY_AUDIT_CONFIG.GROUP_KEYS.filter(function(key) { return candidates[key].length > 1; }),
    grandTotalCandidateCount: grandTotalCandidates.length
  };
}


function writeGroupInventoryAuditStatuses_(context) {
  if (!context || !context.sheet || !context.rowCount) return;
  const statuses = Array.from({ length: context.rowCount }, function() { return [""]; });
  (context.records || []).forEach(function(record) {
    const index = record.rowNum - context.firstDataRow;
    if (index >= 0 && index < statuses.length) {
      statuses[index][0] = record.status || GROUP_INVENTORY_AUDIT_CONFIG.STATUS.NOT_APPLIED;
    }
  });
  context.sheet.getRange(context.firstDataRow, GROUP_INVENTORY_AUDIT_CONFIG.COL.STATUS, context.rowCount, 1).setValues(statuses);
}


function groupInventoryAuditLabel_(groupKey) {
  const labels = {
    sow: "Всего свиноматок",
    suckling: "Поросята-сосуны",
    weaned: "Отъём",
    growing: "Доращивание",
    fattening_old: "Откорм ст.",
    fattening_new: "Откорм нов."
  };
  return labels[groupKey] || String(groupKey || "");
}