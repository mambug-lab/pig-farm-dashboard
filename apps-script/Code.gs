/*******************************************************
 * 양돈장 대시보드 연동용 시트 자동 생성 스크립트 v7
 *
 * 핵심 수정:
 * - 더 이상 날짜 블록을 26행 고정으로 자르지 않음
 * - 유효 입력이 확인된 날짜의 시작 행을 찾음
 * - 그 다음 날짜 행 직전까지 해당 작업일지 전체를 복사
 *
 * 즉:
 * 2026.7.12 작업일지가 유효하면
 * 2026.7.12 날짜 행부터
 * 2026.7.13 날짜 행 바로 전까지 전체 복사
 *******************************************************/

const DASHBOARD_CONFIG = {
  YEAR: 2026,

  MONTHLY_LINK_SHEET_NAME: "대시보드_월간연동용",
  ANNUAL_LINK_SHEET_NAME: "대시보드_연간연동용",

  MAX_ROWS_PER_MONTH: 1210,
  MAX_COLS: 9,

  OUTPUT_START_ROW: 3,

  // E:H 열
  VALID_INPUT_FIRST_COL: 5,
  VALID_INPUT_LAST_COL: 8,

  // false: 0만 입력된 셀은 유효 입력으로 보지 않음
  // 현장 입력에서 "0"도 작업 완료 표시로 쓰려면 true로 변경 가능
  COUNT_ZERO_AS_VALID_INPUT: false,

  MONTHS_RU: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь"
  ]
};


function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("양돈장 대시보드")
    .addItem("연동용 시트 전체 갱신", "refreshDashboardLinks")
    .addItem("월간 연동용만 갱신", "refreshMonthlyLinkSheet")
    .addItem("연간 연동용만 갱신", "refreshAnnualLinkSheet")
    .addSeparator()
    .addItem("자동 갱신 트리거 설치", "installDashboardTriggers")
    .addToUi();
}


function setupDashboardLinkedSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, DASHBOARD_CONFIG.MONTHLY_LINK_SHEET_NAME);
  ensureSheet_(ss, DASHBOARD_CONFIG.ANNUAL_LINK_SHEET_NAME);

  refreshDashboardLinks();
}


function refreshDashboardLinks() {
  refreshMonthlyLinkSheet();
  refreshAnnualLinkSheet();
}


function refreshMonthlyLinkSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheet = ensureSheet_(ss, DASHBOARD_CONFIG.MONTHLY_LINK_SHEET_NAME);

  const latestInfo = findLatestMonthlySheetWithValidData_(ss);

  clearOutputArea_(targetSheet);
  writeMonthlyHeader_(targetSheet, latestInfo);

  if (!latestInfo) {
    targetSheet.getRange("A3").setValue("유효한 월별 작업일지 데이터가 없습니다.");
    return;
  }

  const values = readMonthValuesUntilRow_(latestInfo.sheet, latestInfo.copyEndRow);
  writeValues_(targetSheet, DASHBOARD_CONFIG.OUTPUT_START_ROW, 1, values);

  Logger.log(
    `월간 연동용 갱신 완료: ${latestInfo.sheetName}, ` +
    `유효 입력 확인 행 ${latestInfo.validInputStartRow}~${latestInfo.validInputEndRow}, ` +
    `날짜 블록 행 ${latestInfo.dateBlockStartRow}~${latestInfo.copyEndRow}, ` +
    `다음 날짜 행 ${latestInfo.nextDateRow || "-"}, ` +
    `${values.length}행`
  );
}


function refreshAnnualLinkSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheet = ensureSheet_(ss, DASHBOARD_CONFIG.ANNUAL_LINK_SHEET_NAME);

  clearOutputArea_(targetSheet);

  targetSheet.getRange("A1").setValue(DASHBOARD_CONFIG.YEAR);
  targetSheet.getRange("B1").setValue("연간 연동용");
  targetSheet.getRange("C1").setValue("설명");
  targetSheet.getRange("D1").setValue("각 월의 실제 수동 입력 마지막 작업일지 전체까지 자동 통합");

  const allRows = [];
  const usedSheetNames = [];

  DASHBOARD_CONFIG.MONTHS_RU.forEach((monthName, index) => {
    const sheetName = `${monthName} ${DASHBOARD_CONFIG.YEAR}`;
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) return;

    const info = analyzeMonthlySheet_(sheet, sheetName, index + 1);

    if (!info || !info.hasValidInput) return;

    const values = readMonthValuesUntilRow_(sheet, info.copyEndRow);

    if (values.length === 0) return;

    usedSheetNames.push(`${sheetName}~${info.copyEndRow}행`);

    values.forEach(row => allRows.push(row));
  });

  if (allRows.length === 0) {
    targetSheet.getRange("A3").setValue("유효한 연간 작업일지 데이터가 없습니다.");
    return;
  }

  writeValues_(targetSheet, DASHBOARD_CONFIG.OUTPUT_START_ROW, 1, allRows);

  Logger.log(`연간 연동용 갱신 완료: ${usedSheetNames.join(", ")}, 총 ${allRows.length}행`);
}


function installDashboardTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(trigger => {
    const fn = trigger.getHandlerFunction();

    if (fn === "refreshDashboardLinks") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("refreshDashboardLinks")
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  ScriptApp.newTrigger("refreshDashboardLinks")
    .forSpreadsheet(ss)
    .onChange()
    .create();

  SpreadsheetApp.getUi().alert("자동 갱신 트리거 설치가 완료되었습니다.");
}


function findLatestMonthlySheetWithValidData_(ss) {
  const candidates = [];

  DASHBOARD_CONFIG.MONTHS_RU.forEach((monthName, index) => {
    const sheetName = `${monthName} ${DASHBOARD_CONFIG.YEAR}`;
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) return;

    const info = analyzeMonthlySheet_(sheet, sheetName, index + 1);

    if (!info || !info.hasValidInput) return;

    candidates.push(info);
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.monthIndex - b.monthIndex);

  return candidates[candidates.length - 1];
}


/**
 * 월별 시트 분석
 *
 * 1. 시트에서 날짜 행을 모두 찾음
 * 2. 각 날짜 행부터 다음 날짜 행 직전까지를 하나의 작업일지 블록으로 봄
 * 3. 블록의 E:H에서 수식이 아닌 수동 입력 숫자를 찾음
 *    (ИТОГО/ВСЕГО 행은 유효 입력 판정에서 제외)
 * 4. 유효한 마지막 날짜 블록의 끝까지 복사
 */
function analyzeMonthlySheet_(sheet, sheetName, monthIndex) {
  const maxRows = Math.min(DASHBOARD_CONFIG.MAX_ROWS_PER_MONTH, sheet.getMaxRows());

  const range = sheet.getRange(1, 1, maxRows, DASHBOARD_CONFIG.MAX_COLS);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const formulas = range.getFormulas();

  const dateRows = findDateRows_(values, displayValues);
  let latestValid = null;

  for (let i = 0; i < dateRows.length; i++) {
    const dateBlockStartRow = dateRows[i];
    const nextDateRow = i + 1 < dateRows.length ? dateRows[i + 1] : null;
    const copyEndRow = nextDateRow ? nextDateRow - 1 : maxRows;

    const hasInput = hasManualNumericInputInDateBlock_(
      values,
      displayValues,
      formulas,
      dateBlockStartRow,
      copyEndRow
    );

    if (!hasInput) continue;

    latestValid = {
      sheet,
      sheetName,
      monthIndex,
      hasValidInput: true,
      validInputStartRow: dateBlockStartRow,
      validInputEndRow: copyEndRow,
      dateBlockStartRow,
      nextDateRow,
      copyEndRow
    };
  }

  if (!latestValid) {
    return {
      sheet,
      sheetName,
      monthIndex,
      hasValidInput: false,
      validInputStartRow: "",
      validInputEndRow: "",
      dateBlockStartRow: "",
      nextDateRow: "",
      copyEndRow: 0
    };
  }

  return latestValid;
}


function hasManualNumericInputInDateBlock_(
  values,
  displayValues,
  formulas,
  startRow,
  endRow
) {
  for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
    const row = displayValues[rowNum - 1];
    const valueRow = values[rowNum - 1];
    const formulaRow = formulas[rowNum - 1];

    if (!row || !valueRow || !formulaRow) continue;
    if (rowHasValidityExcludedLabel_(valueRow, row)) continue;

    for (
      let colNum = DASHBOARD_CONFIG.VALID_INPUT_FIRST_COL;
      colNum <= DASHBOARD_CONFIG.VALID_INPUT_LAST_COL;
      colNum++
    ) {
      const value = valueRow[colNum - 1];
      const displayValue = row[colNum - 1];
      const formula = formulaRow[colNum - 1];

      if (isManualNumericInput_(value, displayValue, formula)) {
        return true;
      }
    }
  }

  return false;
}


function isManualNumericInput_(value, displayValue, formula) {
  if (String(formula ?? "").trim() !== "") {
    return false;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return DASHBOARD_CONFIG.COUNT_ZERO_AS_VALID_INPUT || value !== 0;
  }

  // 숫자 서식/로케일에 따라 getValues()가 문자열을 반환하는 경우를 보조 처리한다.
  const text = String(displayValue ?? "")
    .replace(/\u00A0/g, " ")
    .trim();

  if (!text) return false;

  const normalized = text
    .replace(/\s/g, "")
    .replace(/,/g, ".");

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return false;
  }

  const n = Number(normalized);

  if (!Number.isFinite(n)) return false;

  if (!DASHBOARD_CONFIG.COUNT_ZERO_AS_VALID_INPUT && n === 0) {
    return false;
  }

  return true;
}


function rowHasValidityExcludedLabel_(valueRow, displayRow) {
  const cells = [];

  if (valueRow) cells.push(...valueRow);
  if (displayRow) cells.push(...displayRow);

  return cells.some(cell => {
    const text = String(cell ?? "")
      .replace(/\u00A0/g, " ")
      .trim()
      .toUpperCase();

    return /(^|[^А-ЯЁ])(ИТОГО|ВСЕГО)(?=$|[^А-ЯЁ])/.test(text);
  });
}


function findDateRows_(values, displayValues) {
  const dateRows = [];

  for (let r = 1; r <= values.length; r++) {
    if (rowHasDate_(values[r - 1], displayValues[r - 1])) {
      dateRows.push(r);
    }
  }

  return dateRows;
}


function rowHasDate_(valueRow, displayRow) {
  if (!valueRow && !displayRow) return false;

  const combined = [];

  if (valueRow) combined.push(...valueRow);
  if (displayRow) combined.push(...displayRow);

  for (const cell of combined) {
    if (parseDateFromCell_(cell)) {
      return true;
    }
  }

  return false;
}


function parseDateFromCell_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    if (value >= 30000 && value <= 60000) {
      const base = new Date(1899, 11, 30);
      const date = new Date(base.getTime() + value * 24 * 60 * 60 * 1000);

      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  const text = String(value ?? "").trim();

  if (!text) return null;

  let match = text.match(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    const d = Number(match[3]);

    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }

  match = text.match(/(20\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    const d = Number(match[3]);

    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}


function readMonthValuesUntilRow_(sheet, copyEndRow) {
  const safeEndRow = Math.max(1, Math.min(copyEndRow, sheet.getMaxRows()));

  return sheet
    .getRange(1, 1, safeEndRow, DASHBOARD_CONFIG.MAX_COLS)
    .getValues();
}


function writeMonthlyHeader_(targetSheet, latestInfo) {
  targetSheet.getRange("A1").setValue("연동 월");
  targetSheet.getRange("B1").setValue(latestInfo ? latestInfo.sheetName : "");

  targetSheet.getRange("C1").setValue("복사 종료 행");
  targetSheet.getRange("D1").setValue(latestInfo ? latestInfo.copyEndRow : "");

  targetSheet.getRange("E1").setValue("유효 입력 확인 행");
  targetSheet.getRange("F1").setValue(
    latestInfo
      ? `${latestInfo.validInputStartRow}~${latestInfo.validInputEndRow}`
      : ""
  );

  targetSheet.getRange("G1").setValue("날짜 블록 행");
  targetSheet.getRange("H1").setValue(
    latestInfo
      ? `${latestInfo.dateBlockStartRow}~${latestInfo.copyEndRow}`
      : ""
  );

  targetSheet.getRange("I1").setValue("다음 날짜 행");
  targetSheet.getRange("J1").setValue(latestInfo && latestInfo.nextDateRow ? latestInfo.nextDateRow : "");

  targetSheet.getRange("A2").setValue("설명");
  targetSheet.getRange("B2").setValue(
    "A3:I 영역은 실제 수동 입력이 있는 마지막 날짜의 전체 작업일지 블록까지 Apps Script가 자동 생성합니다."
  );
}


function clearOutputArea_(sheet) {
  const startRow = DASHBOARD_CONFIG.OUTPUT_START_ROW;
  const maxRows = sheet.getMaxRows();
  const rowsToClear = Math.max(1, maxRows - startRow + 1);

  sheet
    .getRange(startRow, 1, rowsToClear, DASHBOARD_CONFIG.MAX_COLS)
    .clearContent();
}


function writeValues_(sheet, startRow, startCol, values) {
  if (!values || values.length === 0) return;

  const requiredRows = startRow + values.length - 1;

  ensureRows_(sheet, requiredRows);

  sheet
    .getRange(startRow, startCol, values.length, DASHBOARD_CONFIG.MAX_COLS)
    .setValues(values);
}


function ensureSheet_(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  return sheet;
}


function ensureRows_(sheet, requiredRows) {
  const currentMaxRows = sheet.getMaxRows();

  if (currentMaxRows >= requiredRows) return;

  sheet.insertRowsAfter(currentMaxRows, requiredRows - currentMaxRows);
}
