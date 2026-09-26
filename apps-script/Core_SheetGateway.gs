


/***************************************************************
 * 원본 월시트 읽기
 *
 * 고정 39행 구조에 의존하지 않는다.
 ***************************************************************/

function scanMonthlySheet_(sheet) {

  const lastRow =
    Math.max(
      1,
      sheet.getLastRow()
    );


  const range =
    sheet.getRange(
      1,
      1,
      lastRow,
      DASHBOARD_CONFIG.SOURCE_DATA_COLS
    );


  return {

    lastRow:
      lastRow,

    values:
      range.getValues(),

    displayValues:
      range.getDisplayValues(),

    formulas:
      range.getFormulas()
  };
}


/***************************************************************
 * 상단 초기화
 ***************************************************************/

function clearMainHeader_(sheet) {

  sheet
    .getRange(
      1,
      1,
      2,
      10
    )
    .clearContent();
}


/***************************************************************
 * A3:I 초기화
 ***************************************************************/

function clearOutputArea_(sheet) {

  const startRow =
    DASHBOARD_CONFIG.OUTPUT_START_ROW;


  const maxRows =
    sheet.getMaxRows();


  if (
    maxRows <
    startRow
  ) {

    return;
  }


  sheet
    .getRange(
      startRow,
      1,
      maxRows -
        startRow +
        1,
      DASHBOARD_CONFIG.MAX_DATA_COLS
    )
    .clearContent();
}


/***************************************************************
 * K:R 관리 영역 초기화
 ***************************************************************/

function clearMetadataArea_(sheet) {

  ensureColumns_(
    sheet,
    18
  );


  const clearRows =
    Math.min(
      sheet.getMaxRows(),
      DASHBOARD_CONFIG
        .METADATA_MANAGED_ROWS
    );


  if (clearRows < 1) {
    return;
  }


  sheet
    .getRange(
      1,
      11,
      clearRows,
      8
    )
    .clearContent();
}


/***************************************************************
 * 값 출력
 ***************************************************************/

function writeValues_(
  sheet,
  startRow,
  startCol,
  values
) {

  if (
    !values ||
    !values.length
  ) {

    return;
  }


  const requiredRows =
    startRow +
    values.length -
    1;


  ensureRows_(
    sheet,
    requiredRows
  );


  sheet
    .getRange(
      startRow,
      startCol,
      values.length,
      DASHBOARD_CONFIG.MAX_DATA_COLS
    )
    .setValues(
      values
    );
}


/***************************************************************
 * 시트 확보
 ***************************************************************/

function ensureSheet_(
  ss,
  sheetName
) {

  let sheet =
    ss.getSheetByName(
      sheetName
    );


  if (!sheet) {

    sheet =
      ss.insertSheet(
        sheetName
      );
  }


  return sheet;
}


/***************************************************************
 * 행 확보
 ***************************************************************/

function ensureRows_(
  sheet,
  requiredRows
) {

  const current =
    sheet.getMaxRows();


  if (
    current >=
    requiredRows
  ) {

    return;
  }


  sheet.insertRowsAfter(
    current,
    requiredRows -
      current
  );
}


/***************************************************************
 * 열 확보
 ***************************************************************/

function ensureColumns_(
  sheet,
  requiredCols
) {

  const current =
    sheet.getMaxColumns();


  if (
    current >=
    requiredCols
  ) {

    return;
  }


  sheet.insertColumnsAfter(
    current,
    requiredCols -
      current
  );
}