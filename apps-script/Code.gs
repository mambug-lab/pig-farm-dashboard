/***************************************************************
 * 양돈장 대시보드 자동연동
 * Code.gs v11.0
 *
 * =============================================================
 * [행 간격 제거 리팩터링]
 * =============================================================
 *
 * 기준 버전:
 *   Code.gs v10.2
 *
 * 주요 변경:
 *
 * 1. 13~16 / +39행 고정 검사를 제거
 *
 * 2. 원본 월작업일지에서 날짜행을 먼저 찾음
 *
 * 3. 각 날짜행부터 다음 날짜행 직전까지를
 *    하나의 작업일 블록으로 정의
 *
 * 4. 각 작업일 블록 내부 A열에서 다음 앵커 검색
 *
 *    Отъем поросята
 *    Доращивание
 *    Откорм ст
 *    Откорм нов
 *
 * 5. 앵커가 위치한 같은 행의 E:H를 검사
 *
 * 6. E:H 중 사람이 직접 입력한 숫자가 하나라도 있으면
 *    해당 작업일을 유효 작업일로 판정
 *
 * 7. 수식 셀은 유효 입력에서 제외
 *
 * 8. 직접 입력한 숫자 0은 유효 입력으로 인정
 *
 * 9. 작업일 블록의 행 수가 변경되어도
 *    다음 날짜행 기준으로 자동 대응
 *
 * 10. 월간/연간 연동용 출력 구조,
 *     MSY 계산 방식,
 *     HTML용 K:R 메타정보 구조는 v10.2 유지
 *
 * 11. HTML에서는 작업일 유효성 재판정 안 함
 *
 ***************************************************************/


const DASHBOARD_CONFIG = {

  YEAR: 2026,

  MONTHLY_LINK_SHEET_NAME:
    "대시보드_월간연동용",

  ANNUAL_LINK_SHEET_NAME:
    "대시보드_연간연동용",

  MAX_DATA_COLS: 9,

  OUTPUT_START_ROW: 3,


  /*
   * ===========================================================
   * 유효 작업일 판정 대상
   * ===========================================================
   *
   * A열에서 제목을 찾고
   * 같은 행 E:H를 검사한다.
   */

  VALIDATION_FIRST_COL: 5,   // E

  VALIDATION_LAST_COL: 8,    // H


  /*
   * 사람이 직접 입력한 0도 실제 입력으로 인정
   */
  COUNT_ZERO_AS_VALID_INPUT: true,


  /*
   * 앵커 정의
   */
  INPUT_ANCHORS: [

    {
      key: "weaned",
      canonical: "Отъем поросята",

      aliases: [
        "отъем поросята",
        "отъём поросята"
      ]
    },

    {
      key: "growing",
      canonical: "Доращивание",

      aliases: [
        "доращивание"
      ]
    },

    {
      key: "fattening_old",
      canonical: "Откорм ст",

      aliases: [
        "откорм ст",
        "откорм стар",
        "откорм старый"
      ]
    },

    {
      key: "fattening_new",
      canonical: "Откорм нов",

      aliases: [
        "откорм нов",
        "откорм новый"
      ]
    }

  ],


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


/***************************************************************
 * 메뉴
 ***************************************************************/

function onOpen() {

  SpreadsheetApp
    .getUi()
    .createMenu("양돈장 대시보드")

    .addItem(
      "연동용 시트 전체 갱신",
      "refreshDashboardLinks"
    )

    .addItem(
      "월간 연동용만 갱신",
      "refreshMonthlyLinkSheet"
    )

    .addItem(
      "연간 연동용만 갱신",
      "refreshAnnualLinkSheet"
    )

    .addSeparator()

    .addItem(
      "유효 작업일 진단 로그",
      "showValidationAudit"
    )

    .addItem(
      "앵커 구조 진단 로그",
      "showAnchorStructureAudit"
    )

    .addItem(
      "누적 MSY 진단 로그",
      "showCumulativeMsySummary"
    )

    .addSeparator()

    .addItem(
      "자동 갱신 트리거 설치",
      "installDashboardTriggers"
    )

    .addToUi();
}


/***************************************************************
 * 최초 설치
 ***************************************************************/

function setupDashboardLinkedSheets() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  ensureSheet_(
    ss,
    DASHBOARD_CONFIG.MONTHLY_LINK_SHEET_NAME
  );


  ensureSheet_(
    ss,
    DASHBOARD_CONFIG.ANNUAL_LINK_SHEET_NAME
  );


  refreshDashboardLinks();
}


/***************************************************************
 * 전체 갱신
 ***************************************************************/

function refreshDashboardLinks() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const dailyRecords =
    collectAnnualDailyKpiRecords_(ss);


  const msySummary =
    calculateCumulativeExpectedMsy_(
      dailyRecords
    );


  const latestMonthSummary =
    buildLatestMonthSummary_(
      dailyRecords
    );


  const annualMonthlySummary =
    buildAnnualMonthlySummary_(
      dailyRecords
    );


  refreshMonthlyLinkSheetInternal_(
    ss,
    msySummary,
    latestMonthSummary
  );


  refreshAnnualLinkSheetInternal_(
    ss,
    msySummary,
    annualMonthlySummary
  );
}


/***************************************************************
 * 월간 연동만 갱신
 ***************************************************************/

function refreshMonthlyLinkSheet() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const dailyRecords =
    collectAnnualDailyKpiRecords_(ss);


  const msySummary =
    calculateCumulativeExpectedMsy_(
      dailyRecords
    );


  const latestMonthSummary =
    buildLatestMonthSummary_(
      dailyRecords
    );


  refreshMonthlyLinkSheetInternal_(
    ss,
    msySummary,
    latestMonthSummary
  );
}


/***************************************************************
 * 연간 연동만 갱신
 ***************************************************************/

function refreshAnnualLinkSheet() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const dailyRecords =
    collectAnnualDailyKpiRecords_(ss);


  const msySummary =
    calculateCumulativeExpectedMsy_(
      dailyRecords
    );


  const annualMonthlySummary =
    buildAnnualMonthlySummary_(
      dailyRecords
    );


  refreshAnnualLinkSheetInternal_(
    ss,
    msySummary,
    annualMonthlySummary
  );
}


/***************************************************************
 * 월간 연동 내부
 ***************************************************************/

function refreshMonthlyLinkSheetInternal_(
  ss,
  msySummary,
  latestMonthSummary
) {

  const targetSheet =
    ensureSheet_(
      ss,
      DASHBOARD_CONFIG.MONTHLY_LINK_SHEET_NAME
    );


  ensureColumns_(
    targetSheet,
    18
  );


  clearMainHeader_(
    targetSheet
  );


  clearOutputArea_(
    targetSheet
  );


  clearMetadataArea_(
    targetSheet
  );


  const latestInfo =
    findLatestMonthlySheetWithValidData_(ss);


  writeMonthlyHeader_(
    targetSheet,
    latestInfo
  );


  writeMonthlyDashboardMetadata_(
    targetSheet,
    msySummary,
    latestMonthSummary,
    latestInfo
  );


  if (!latestInfo) {

    targetSheet
      .getRange("A3")
      .setValue(
        "유효한 월별 작업일지 데이터가 없습니다."
      );

    return;
  }


  const values =
    readMonthValuesUntilRow_(
      latestInfo.sheet,
      latestInfo.copyEndRow
    );


  writeValues_(
    targetSheet,
    DASHBOARD_CONFIG.OUTPUT_START_ROW,
    1,
    values
  );


  Logger.log(
    [
      "=== 월간 연동용 갱신 완료 ===",

      "대상: " +
        latestInfo.sheetName,

      "유효 작업일 수: " +
        latestInfo.validCount,

      "최신 유효일: " +
        formatDateForDisplay_(
          latestInfo.latestDate
        ),

      "최신 날짜행: " +
        latestInfo.dateBlockStartRow,

      "다음 날짜행: " +
        (
          latestInfo.nextDateRow ||
          "-"
        ),

      "복사 종료행: " +
        latestInfo.copyEndRow,

      "검출된 앵커: " +
        latestInfo.matchedAnchorCount,

      "직접입력 앵커: " +
        latestInfo.inputAnchorCount

    ].join("\n")
  );
}


/***************************************************************
 * 연간 연동 내부
 ***************************************************************/

function refreshAnnualLinkSheetInternal_(
  ss,
  msySummary,
  annualMonthlySummary
) {

  const targetSheet =
    ensureSheet_(
      ss,
      DASHBOARD_CONFIG.ANNUAL_LINK_SHEET_NAME
    );


  ensureColumns_(
    targetSheet,
    18
  );


  clearMainHeader_(
    targetSheet
  );


  clearOutputArea_(
    targetSheet
  );


  clearMetadataArea_(
    targetSheet
  );


  writeAnnualHeader_(
    targetSheet
  );


  writeAnnualMetadata_(
    targetSheet,
    msySummary,
    annualMonthlySummary
  );


  const allRows = [];

  const usedSheetNames = [];


  DASHBOARD_CONFIG.MONTHS_RU
    .forEach(
      function(monthName, index) {

        const sheetName =
          monthName +
          " " +
          DASHBOARD_CONFIG.YEAR;


        const sheet =
          ss.getSheetByName(
            sheetName
          );


        if (!sheet) {
          return;
        }


        const info =
          analyzeMonthlySheet_(
            sheet,
            sheetName,
            index + 1
          );


        if (
          !info ||
          !info.hasValidInput
        ) {

          return;
        }


        const values =
          readMonthValuesUntilRow_(
            sheet,
            info.copyEndRow
          );


        if (!values.length) {
          return;
        }


        values.forEach(
          function(row) {

            allRows.push(
              row
            );
          }
        );


        usedSheetNames.push(
          sheetName +
          " / 유효 " +
          info.validCount +
          "일 / ~" +
          info.copyEndRow +
          "행"
        );
      }
    );


  if (!allRows.length) {

    targetSheet
      .getRange("A3")
      .setValue(
        "유효한 연간 작업일지 데이터가 없습니다."
      );

    return;
  }


  writeValues_(
    targetSheet,
    DASHBOARD_CONFIG.OUTPUT_START_ROW,
    1,
    allRows
  );


  Logger.log(
    [
      "=== 연간 연동용 갱신 완료 ===",

      usedSheetNames.join("\n"),

      "총 출력 행 수: " +
        allRows.length

    ].join("\n")
  );
}


/***************************************************************
 * 최신 유효 월
 ***************************************************************/

function findLatestMonthlySheetWithValidData_(ss) {

  const candidates = [];


  DASHBOARD_CONFIG.MONTHS_RU
    .forEach(
      function(monthName, index) {

        const sheetName =
          monthName +
          " " +
          DASHBOARD_CONFIG.YEAR;


        const sheet =
          ss.getSheetByName(
            sheetName
          );


        if (!sheet) {
          return;
        }


        const info =
          analyzeMonthlySheet_(
            sheet,
            sheetName,
            index + 1
          );


        if (
          info &&
          info.hasValidInput
        ) {

          candidates.push(
            info
          );
        }
      }
    );


  if (!candidates.length) {
    return null;
  }


  candidates.sort(
    function(a, b) {

      return (
        a.monthIndex -
        b.monthIndex
      );
    }
  );


  return candidates[
    candidates.length - 1
  ];
}


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
      DASHBOARD_CONFIG.MAX_DATA_COLS
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
 * 월 작업일지 분석
 *
 * 날짜행
 *   ↓
 * 다음 날짜행 직전
 *   ↓
 * A열 앵커 검색
 *   ↓
 * 같은 행 E:H 직접입력 검사
 *
 ***************************************************************/

function analyzeMonthlySheet_(
  sheet,
  sheetName,
  monthIndex
) {

  const scan =
    scanMonthlySheet_(
      sheet
    );


  const dateRows =
    collectDateRowsForMonth_(
      scan,
      monthIndex
    );


  if (!dateRows.length) {

    return createEmptyMonthlyAnalysis_(
      sheet,
      sheetName,
      monthIndex,
      scan
    );
  }


  const validBlocks = [];

  const allBlocks = [];


  for (
    let i = 0;
    i < dateRows.length;
    i++
  ) {

    const current =
      dateRows[i];


    const nextDateRow =
      findNextDateRowAfter_(
        scan.values,
        scan.displayValues,
        current.row
      );


    const blockEndRow =
      nextDateRow
        ? nextDateRow - 1
        : scan.lastRow;


    const validation =
      inspectAnchorInputsInBlock_(
        scan,
        current.row,
        blockEndRow
      );


    const block = {

      date:
        current.date,

      dateBlockStartRow:
        current.row,

      nextDateRow:
        nextDateRow,

      copyEndRow:
        blockEndRow,

      matchedAnchorCount:
        validation.matchedAnchorCount,

      inputAnchorCount:
        validation.inputAnchorCount,

      matchedAnchors:
        validation.matchedAnchors,

      inputAnchors:
        validation.inputAnchors,

      missingAnchors:
        validation.missingAnchors,

      hasValidInput:
        validation.hasValidInput
    };


    allBlocks.push(
      block
    );


    if (
      validation.hasValidInput
    ) {

      validBlocks.push(
        block
      );
    }
  }


  if (!validBlocks.length) {

    const empty =
      createEmptyMonthlyAnalysis_(
        sheet,
        sheetName,
        monthIndex,
        scan
      );


    empty.allBlocks =
      allBlocks;


    return empty;
  }


  validBlocks.sort(
    function(a, b) {

      return (
        a.date.getTime() -
        b.date.getTime()
      );
    }
  );


  const latest =
    validBlocks[
      validBlocks.length - 1
    ];


  return {

    sheet:
      sheet,

    sheetName:
      sheetName,

    monthIndex:
      monthIndex,

    scan:
      scan,

    hasValidInput:
      true,

    validCount:
      validBlocks.length,

    validBlocks:
      validBlocks,

    allBlocks:
      allBlocks,

    dateBlockStartRow:
      latest.dateBlockStartRow,

    nextDateRow:
      latest.nextDateRow,

    copyEndRow:
      latest.copyEndRow,

    latestDate:
      latest.date,

    matchedAnchorCount:
      latest.matchedAnchorCount,

    inputAnchorCount:
      latest.inputAnchorCount,

    missingAnchors:
      latest.missingAnchors
  };
}


/***************************************************************
 * 빈 월 분석 객체
 ***************************************************************/

function createEmptyMonthlyAnalysis_(
  sheet,
  sheetName,
  monthIndex,
  scan
) {

  return {

    sheet:
      sheet,

    sheetName:
      sheetName,

    monthIndex:
      monthIndex,

    scan:
      scan,

    hasValidInput:
      false,

    validCount:
      0,

    validBlocks:
      [],

    allBlocks:
      [],

    dateBlockStartRow:
      "",

    nextDateRow:
      "",

    copyEndRow:
      0,

    latestDate:
      null,

    matchedAnchorCount:
      0,

    inputAnchorCount:
      0,

    missingAnchors:
      []
  };
}


/***************************************************************
 * 해당 월 날짜행 수집
 ***************************************************************/

function collectDateRowsForMonth_(
  scan,
  monthIndex
) {

  const result = [];


  for (
    let rowNum = 1;
    rowNum <= scan.lastRow;
    rowNum++
  ) {

    const date =
      getDateFromRow_(
        scan.values[
          rowNum - 1
        ],
        scan.displayValues[
          rowNum - 1
        ]
      );


    if (!date) {
      continue;
    }


    if (
      date.getFullYear() !==
        DASHBOARD_CONFIG.YEAR ||
      date.getMonth() + 1 !==
        monthIndex
    ) {

      continue;
    }


    result.push({

      row:
        rowNum,

      date:
        new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        )
    });
  }


  /*
   * 같은 날짜가 여러 행에서 발견될 경우
   * 최초 날짜행만 사용
   */
  const map =
    new Map();


  result.forEach(
    function(item) {

      const key =
        dateKey_(
          item.date
        );


      if (
        !map.has(
          key
        )
      ) {

        map.set(
          key,
          item
        );
      }
    }
  );


  return Array
    .from(
      map.values()
    )
    .sort(
      function(a, b) {

        return (
          a.row -
          b.row
        );
      }
    );
}


/***************************************************************
 * 작업일 블록의 앵커 및 E:H 검사
 ***************************************************************/

function inspectAnchorInputsInBlock_(
  scan,
  startRow,
  endRow
) {

  const anchorMap =
    new Map();


  DASHBOARD_CONFIG.INPUT_ANCHORS
    .forEach(
      function(anchor) {

        anchorMap.set(
          anchor.key,
          {

            config:
              anchor,

            found:
              false,

            row:
              null,

            hasManualInput:
              false,

            inputCells:
              []
          }
        );
      }
    );


  /*
   * 작업일 블록 내부 A열 검색
   */
  for (
    let rowNum = startRow;
    rowNum <= endRow;
    rowNum++
  ) {

    const displayRow =
      scan.displayValues[
        rowNum - 1
      ];


    const formulaRow =
      scan.formulas[
        rowNum - 1
      ];


    if (
      !displayRow ||
      !formulaRow
    ) {

      continue;
    }


    /*
     * A열 제목
     */
    const colAText =
      normalizeAnchorText_(
        displayRow[0]
      );


    if (!colAText) {
      continue;
    }


    const anchor =
      findMatchingInputAnchor_(
        colAText
      );


    if (!anchor) {
      continue;
    }


    const state =
      anchorMap.get(
        anchor.key
      );


    /*
     * 같은 날짜 블록 안에
     * 동일 앵커가 여러 번 있어도
     * 최초 일치행을 기준으로 한다.
     */
    if (state.found) {
      continue;
    }


    state.found =
      true;


    state.row =
      rowNum;


    /*
     * =========================================================
     * E:H 직접입력 검사
     *
     * D열은 검사하지 않는다.
     * =========================================================
     */

    for (
      let colNum =
        DASHBOARD_CONFIG.VALIDATION_FIRST_COL;

      colNum <=
        DASHBOARD_CONFIG.VALIDATION_LAST_COL;

      colNum++
    ) {

      const displayValue =
        displayRow[
          colNum - 1
        ];


      const formula =
        formulaRow[
          colNum - 1
        ];


      if (
        isManualNumericInput_(
          displayValue,
          formula
        )
      ) {

        state.hasManualInput =
          true;


        state.inputCells.push(
          columnNumberToLetter_(
            colNum
          ) +
          rowNum
        );
      }
    }
  }


  const matchedAnchors = [];

  const inputAnchors = [];

  const missingAnchors = [];


  anchorMap.forEach(
    function(state) {

      if (
        state.found
      ) {

        matchedAnchors.push({

          key:
            state.config.key,

          title:
            state.config.canonical,

          row:
            state.row,

          hasManualInput:
            state.hasManualInput,

          inputCells:
            state.inputCells.slice()
        });


        if (
          state.hasManualInput
        ) {

          inputAnchors.push({

            key:
              state.config.key,

            title:
              state.config.canonical,

            row:
              state.row,

            inputCells:
              state.inputCells.slice()
          });
        }

      } else {

        missingAnchors.push(
          state.config.canonical
        );
      }
    }
  );


  return {

    /*
     * 네 앵커 중 한 곳이라도
     * E:H 직접입력이 있으면 유효 작업일
     */
    hasValidInput:
      inputAnchors.length > 0,

    matchedAnchorCount:
      matchedAnchors.length,

    inputAnchorCount:
      inputAnchors.length,

    matchedAnchors:
      matchedAnchors,

    inputAnchors:
      inputAnchors,

    missingAnchors:
      missingAnchors
  };
}


/***************************************************************
 * 앵커 검색
 ***************************************************************/

function findMatchingInputAnchor_(
  normalizedValue
) {

  for (
    let i = 0;
    i <
      DASHBOARD_CONFIG.INPUT_ANCHORS.length;
    i++
  ) {

    const anchor =
      DASHBOARD_CONFIG.INPUT_ANCHORS[i];


    for (
      let j = 0;
      j < anchor.aliases.length;
      j++
    ) {

      if (
        normalizedValue ===
        normalizeAnchorText_(
          anchor.aliases[j]
        )
      ) {

        return anchor;
      }
    }
  }


  return null;
}


/***************************************************************
 * 앵커 문자열 정규화
 ***************************************************************/

function normalizeAnchorText_(value) {

  return String(
    value == null
      ? ""
      : value
  )
    .replace(
      /\u00A0/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .toLocaleLowerCase(
      "ru-RU"
    );
}


/***************************************************************
 * E:H 직접입력 숫자 판정
 ***************************************************************/

function isManualNumericInput_(
  displayValue,
  formula
) {

  /*
   * 수식 셀 제외
   */
  if (
    String(
      formula == null
        ? ""
        : formula
    ).trim() !== ""
  ) {

    return false;
  }


  const text =
    String(
      displayValue == null
        ? ""
        : displayValue
    )
      .replace(
        /\u00A0/g,
        ""
      )
      .replace(
        /\s/g,
        ""
      )
      .trim();


  if (!text) {
    return false;
  }


  const normalized =
    text.replace(
      /,/g,
      "."
    );


  if (
    !/^-?\d+(\.\d+)?$/
      .test(
        normalized
      )
  ) {

    return false;
  }


  const n =
    Number(
      normalized
    );


  if (
    !Number.isFinite(
      n
    )
  ) {

    return false;
  }


  if (
    n === 0 &&
    !DASHBOARD_CONFIG
      .COUNT_ZERO_AS_VALID_INPUT
  ) {

    return false;
  }


  return true;
}


/***************************************************************
 * 다음 날짜행 찾기
 ***************************************************************/

function findNextDateRowAfter_(
  values,
  displayValues,
  startRow
) {

  for (
    let r =
      startRow + 1;

    r <= values.length;

    r++
  ) {

    if (
      rowHasDate_(
        values[
          r - 1
        ],
        displayValues[
          r - 1
        ]
      )
    ) {

      return r;
    }
  }


  return null;
}


function rowHasDate_(
  valueRow,
  displayRow
) {

  return (
    getDateFromRow_(
      valueRow,
      displayRow
    ) !== null
  );
}


/***************************************************************
 * 행에서 날짜 찾기
 ***************************************************************/

function getDateFromRow_(
  valueRow,
  displayRow
) {

  const cells = [];


  if (valueRow) {

    valueRow.forEach(
      function(value) {

        cells.push(
          value
        );
      }
    );
  }


  if (displayRow) {

    displayRow.forEach(
      function(value) {

        cells.push(
          value
        );
      }
    );
  }


  for (
    let i = 0;
    i < cells.length;
    i++
  ) {

    const date =
      parseDateFromCell_(
        cells[i]
      );


    if (date) {

      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
    }
  }


  return null;
}


/***************************************************************
 * 날짜 파싱
 ***************************************************************/

function parseDateFromCell_(value) {

  if (
    value instanceof Date &&
    !isNaN(
      value.getTime()
    )
  ) {

    return value;
  }


  if (
    typeof value ===
    "number"
  ) {

    if (
      value >= 30000 &&
      value <= 60000
    ) {

      const base =
        new Date(
          1899,
          11,
          30
        );


      const date =
        new Date(
          base.getTime() +
          value *
          86400000
        );


      return isNaN(
        date.getTime()
      )
        ? null
        : date;
    }


    return null;
  }


  const text =
    String(
      value == null
        ? ""
        : value
    ).trim();


  if (!text) {
    return null;
  }


  const match =
    text.match(
      /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/
    );


  if (!match) {
    return null;
  }


  const date =
    new Date(
      Number(
        match[1]
      ),
      Number(
        match[2]
      ) - 1,
      Number(
        match[3]
      )
    );


  return isNaN(
    date.getTime()
  )
    ? null
    : date;
}


/***************************************************************
 * 연간 KPI 기록 수집
 ***************************************************************/

function collectAnnualDailyKpiRecords_(ss) {

  const recordMap =
    new Map();


  DASHBOARD_CONFIG.MONTHS_RU
    .forEach(
      function(monthName, index) {

        const sheetName =
          monthName +
          " " +
          DASHBOARD_CONFIG.YEAR;


        const sheet =
          ss.getSheetByName(
            sheetName
          );


        if (!sheet) {
          return;
        }


        const info =
          analyzeMonthlySheet_(
            sheet,
            sheetName,
            index + 1
          );


        if (
          !info ||
          !info.hasValidInput
        ) {

          return;
        }


        info.validBlocks.forEach(
          function(block) {

            const record =
              extractDailyKpiFromBlock_(
                info.scan,
                block,
                sheetName
              );


            if (
              !record ||
              !record.date
            ) {

              return;
            }


            recordMap.set(
              dateKey_(
                record.date
              ),
              record
            );
          }
        );
      }
    );


  return Array
    .from(
      recordMap.values()
    )
    .sort(
      function(a, b) {

        return (
          a.date.getTime() -
          b.date.getTime()
        );
      }
    );
}


/***************************************************************
 * 1일 KPI 추출
 *
 * ВСЕГО
 *   G = 폐사
 *   H = 출하
 *   I = 총 사육두수
 *
 * 모돈 ИТОГО
 *   I = 모돈수
 ***************************************************************/

function extractDailyKpiFromBlock_(
  scan,
  block,
  sheetName
) {

  let currentSection =
    "";


  let grandTotalFound =
    false;


  let sale =
    0;


  let loss =
    0;


  let totalPigs =
    0;


  let sowCount =
    null;


  for (
    let rowNum =
      block.dateBlockStartRow;

    rowNum <=
      block.copyEndRow;

    rowNum++
  ) {

    const valueRow =
      scan.values[
        rowNum - 1
      ];


    const displayRow =
      scan.displayValues[
        rowNum - 1
      ];


    if (!valueRow) {
      continue;
    }


    const section =
      cellText_(
        displayRow,
        valueRow,
        0
      );


    const sub =
      cellText_(
        displayRow,
        valueRow,
        2
      );


    if (
      section &&
      !isAnyTotalLabel_(
        section
      )
    ) {

      currentSection =
        section;
    }


    if (
      isGrandTotalLabel_(
        section
      ) ||
      isGrandTotalLabel_(
        sub
      )
    ) {

      grandTotalFound =
        true;


      loss =
        cellNumber_(
          displayRow,
          valueRow,
          6
        );


      sale =
        cellNumber_(
          displayRow,
          valueRow,
          7
        );


      totalPigs =
        cellNumber_(
          displayRow,
          valueRow,
          8
        );
    }


    const sowContext =
      isSowText_(
        currentSection
      ) ||
      isSowText_(
        section
      ) ||
      isSowText_(
        sub
      );


    if (
      sowContext &&
      (
        isSubTotalLabel_(
          section
        ) ||
        isSubTotalLabel_(
          sub
        )
      )
    ) {

      const candidate =
        cellNumber_(
          displayRow,
          valueRow,
          8
        );


      if (
        candidate > 0
      ) {

        sowCount =
          candidate;
      }
    }
  }


  return {

    date:
      block.date,

    sheetName:
      sheetName,

    grandTotalFound:
      grandTotalFound,

    sale:
      sale,

    loss:
      loss,

    totalPigs:
      totalPigs,

    sowCount:
      sowCount,

    inputAnchorCount:
      block.inputAnchorCount
  };
}


/***************************************************************
 * 최신 월 요약
 ***************************************************************/

function buildLatestMonthSummary_(
  records
) {

  if (
    !records ||
    !records.length
  ) {

    return null;
  }


  const sorted =
    records
      .slice()
      .sort(
        function(a, b) {

          return (
            a.date.getTime() -
            b.date.getTime()
          );
        }
      );


  const latest =
    sorted[
      sorted.length - 1
    ];


  const year =
    latest.date.getFullYear();


  const month =
    latest.date.getMonth();


  const monthRecords =
    sorted.filter(
      function(record) {

        return (
          record.date.getFullYear() ===
            year &&
          record.date.getMonth() ===
            month
        );
      }
    );


  return {

    year:
      year,

    month:
      month + 1,

    latestDate:
      latest.date,

    validDays:
      monthRecords.length,

    monthSale:
      monthRecords.reduce(
        function(sum, record) {

          return (
            sum +
            Number(
              record.sale || 0
            )
          );
        },
        0
      ),

    monthLoss:
      monthRecords.reduce(
        function(sum, record) {

          return (
            sum +
            Number(
              record.loss || 0
            )
          );
        },
        0
      ),

    daySale:
      Number(
        latest.sale || 0
      ),

    dayLoss:
      Number(
        latest.loss || 0
      ),

    totalPigs:
      Number(
        latest.totalPigs || 0
      ),

    sowCount:
      latest.sowCount !== null
        ? Number(
            latest.sowCount
          )
        : null
  };
}


/***************************************************************
 * 연간 월별 집계
 ***************************************************************/

function buildAnnualMonthlySummary_(
  records
) {

  const map =
    new Map();


  (records || [])
    .forEach(
      function(record) {

        const year =
          record.date.getFullYear();


        const month =
          record.date.getMonth() + 1;


        const key =
          year +
          "-" +
          String(
            month
          ).padStart(
            2,
            "0"
          );


        if (
          !map.has(
            key
          )
        ) {

          map.set(
            key,
            {

              year:
                year,

              month:
                month,

              sale:
                0,

              loss:
                0,

              validDays:
                0
            }
          );
        }


        const item =
          map.get(
            key
          );


        item.sale +=
          Number(
            record.sale || 0
          );


        item.loss +=
          Number(
            record.loss || 0
          );


        item.validDays +=
          1;
      }
    );


  return Array
    .from(
      map.values()
    )
    .sort(
      function(a, b) {

        return (
          (
            a.year * 12 +
            a.month
          ) -
          (
            b.year * 12 +
            b.month
          )
        );
      }
    );
}


/***************************************************************
 * 누적 예상 MSY
 ***************************************************************/

function calculateCumulativeExpectedMsy_(
  records
) {

  if (
    !records ||
    !records.length
  ) {

    return createEmptyMsyResult_(
      "산정 불가: 유효 작업일지 없음"
    );
  }


  const sorted =
    records
      .slice()
      .sort(
        function(a, b) {

          return (
            a.date.getTime() -
            b.date.getTime()
          );
        }
      );


  const startDate =
    sorted[0].date;


  const endDate =
    sorted[
      sorted.length - 1
    ].date;


  const elapsedDays =
    daysInclusive_(
      startDate,
      endDate
    );


  const grandTotalRecords =
    sorted.filter(
      function(record) {

        return (
          record.grandTotalFound ===
          true
        );
      }
    );


  const sowRecords =
    sorted.filter(
      function(record) {

        return (
          record.sowCount !== null &&
          record.sowCount !== undefined &&
          Number(
            record.sowCount
          ) > 0
        );
      }
    );


  const cumulativeSale =
    grandTotalRecords.reduce(
      function(sum, record) {

        return (
          sum +
          Number(
            record.sale || 0
          )
        );
      },
      0
    );


  const sowSum =
    sowRecords.reduce(
      function(sum, record) {

        return (
          sum +
          Number(
            record.sowCount
          )
        );
      },
      0
    );


  const avgSow =
    sowRecords.length > 0
      ? sowSum /
        sowRecords.length
      : null;


  const missingGrandTotalDays =
    sorted.length -
    grandTotalRecords.length;


  const missingSowDays =
    sorted.length -
    sowRecords.length;


  if (
    missingGrandTotalDays > 0
  ) {

    return {

      msy:
        null,

      startDate:
        startDate,

      endDate:
        endDate,

      elapsedDays:
        elapsedDays,

      cumulativeSale:
        cumulativeSale,

      avgSow:
        avgSow,

      validDiaryDays:
        sorted.length,

      grandTotalDays:
        grandTotalRecords.length,

      sowRecordDays:
        sowRecords.length,

      missingGrandTotalDays:
        missingGrandTotalDays,

      missingSowDays:
        missingSowDays,

      status:
        "산정 불가: ВСЕГО 누락 " +
        missingGrandTotalDays +
        "일"
    };
  }


  if (
    missingSowDays > 0 ||
    avgSow === null ||
    avgSow <= 0
  ) {

    return {

      msy:
        null,

      startDate:
        startDate,

      endDate:
        endDate,

      elapsedDays:
        elapsedDays,

      cumulativeSale:
        cumulativeSale,

      avgSow:
        avgSow,

      validDiaryDays:
        sorted.length,

      grandTotalDays:
        grandTotalRecords.length,

      sowRecordDays:
        sowRecords.length,

      missingGrandTotalDays:
        missingGrandTotalDays,

      missingSowDays:
        missingSowDays,

      status:
        "산정 불가: 모돈 ИТОГО 누락 " +
        missingSowDays +
        "일"
    };
  }


  if (
    elapsedDays <= 0
  ) {

    return createEmptyMsyResult_(
      "산정 불가: 누적기간 오류"
    );
  }


  const msy =
    (
      cumulativeSale *
      365
    ) /
    (
      avgSow *
      elapsedDays
    );


  return {

    msy:
      msy,

    startDate:
      startDate,

    endDate:
      endDate,

    elapsedDays:
      elapsedDays,

    cumulativeSale:
      cumulativeSale,

    avgSow:
      avgSow,

    validDiaryDays:
      sorted.length,

    grandTotalDays:
      grandTotalRecords.length,

    sowRecordDays:
      sowRecords.length,

    missingGrandTotalDays:
      0,

    missingSowDays:
      0,

    status:
      "정상"
  };
}


/***************************************************************
 * 빈 MSY
 ***************************************************************/

function createEmptyMsyResult_(
  status
) {

  return {

    msy:
      null,

    startDate:
      null,

    endDate:
      null,

    elapsedDays:
      0,

    cumulativeSale:
      0,

    avgSow:
      null,

    validDiaryDays:
      0,

    grandTotalDays:
      0,

    sowRecordDays:
      0,

    missingGrandTotalDays:
      0,

    missingSowDays:
      0,

    status:
      status
  };
}


/***************************************************************
 * 월간 메타정보 K:R
 ***************************************************************/

function writeMonthlyDashboardMetadata_(
  sheet,
  msy,
  month,
  latestInfo
) {

  ensureColumns_(
    sheet,
    18
  );


  const latestValidDate =
    (
      latestInfo &&
      latestInfo.latestDate
    )
      ? formatDateForDisplay_(
          latestInfo.latestDate
        )
      : "";


  const msyStartDate =
    (
      msy &&
      msy.startDate
    )
      ? formatDateForDisplay_(
          msy.startDate
        )
      : "";


  const msyEndDate =
    (
      msy &&
      msy.endDate
    )
      ? formatDateForDisplay_(
          msy.endDate
        )
      : "";


  const rows = [

    [
      "누적 예상 MSY",

      (
        msy &&
        msy.msy !== null
          ? msy.msy
          : ""
      ),

      "MSY 상태",

      (
        msy
          ? msy.status
          : ""
      ),

      "MSY 시작일",

      msyStartDate,

      "MSY 종료일",

      msyEndDate
    ],


    [
      "MSY 누적 출하",

      (
        msy
          ? msy.cumulativeSale
          : 0
      ),

      "MSY 평균 모돈",

      (
        msy &&
        msy.avgSow !== null
          ? msy.avgSow
          : ""
      ),

      "MSY 누적 달력일",

      (
        msy
          ? msy.elapsedDays
          : 0
      ),

      "MSY 유효 작업일",

      (
        msy
          ? msy.validDiaryDays
          : 0
      )
    ],


    [
      "최신 유효일",

      latestValidDate,

      "월 유효 작업일",

      (
        month
          ? month.validDays
          : 0
      ),

      "월누적 출하",

      (
        month
          ? month.monthSale
          : 0
      ),

      "월누적 폐사",

      (
        month
          ? month.monthLoss
          : 0
      )
    ],


    [
      "당일 출하",

      (
        month
          ? month.daySale
          : 0
      ),

      "당일 폐사",

      (
        month
          ? month.dayLoss
          : 0
      ),

      "총 사육두수",

      (
        month
          ? month.totalPigs
          : 0
      ),

      "모돈수",

      (
        month &&
        month.sowCount !== null
          ? month.sowCount
          : ""
      )
    ]
  ];


  sheet
    .getRange(
      1,
      11,
      rows.length,
      8
    )
    .setValues(
      rows
    );


  sheet
    .getRange("L1")
    .setNumberFormat(
      "0.00"
    );


  sheet
    .getRange("N2")
    .setNumberFormat(
      "0.0"
    );
}


/***************************************************************
 * 연간 메타정보
 ***************************************************************/

function writeAnnualMetadata_(
  sheet,
  msy,
  monthlySummary
) {

  ensureColumns_(
    sheet,
    18
  );


  const msyStartDate =
    (
      msy &&
      msy.startDate
    )
      ? formatDateForDisplay_(
          msy.startDate
        )
      : "";


  const msyEndDate =
    (
      msy &&
      msy.endDate
    )
      ? formatDateForDisplay_(
          msy.endDate
        )
      : "";


  const msyRows = [

    [
      "누적 예상 MSY",

      (
        msy &&
        msy.msy !== null
          ? msy.msy
          : ""
      ),

      "MSY 상태",

      (
        msy
          ? msy.status
          : ""
      ),

      "MSY 시작일",

      msyStartDate,

      "MSY 종료일",

      msyEndDate
    ],


    [
      "MSY 누적 출하",

      (
        msy
          ? msy.cumulativeSale
          : 0
      ),

      "MSY 평균 모돈",

      (
        msy &&
        msy.avgSow !== null
          ? msy.avgSow
          : ""
      ),

      "MSY 누적 달력일",

      (
        msy
          ? msy.elapsedDays
          : 0
      ),

      "MSY 유효 작업일",

      (
        msy
          ? msy.validDiaryDays
          : 0
      )
    ]
  ];


  sheet
    .getRange(
      1,
      11,
      2,
      8
    )
    .setValues(
      msyRows
    );


  sheet
    .getRange("L1")
    .setNumberFormat(
      "0.00"
    );


  sheet
    .getRange("N2")
    .setNumberFormat(
      "0.0"
    );


  sheet
    .getRange("K4")
    .setValue(
      "월별 집계"
    );


  sheet
    .getRange(
      5,
      11,
      1,
      5
    )
    .setValues([
      [
        "연도",
        "월",
        "출하",
        "폐사",
        "유효 작업일"
      ]
    ]);


  if (
    monthlySummary &&
    monthlySummary.length
  ) {

    const rows =
      monthlySummary.map(
        function(item) {

          return [

            item.year,

            item.month,

            item.sale,

            item.loss,

            item.validDays

          ];
        }
      );


    ensureRows_(
      sheet,
      5 +
      rows.length
    );


    sheet
      .getRange(
        6,
        11,
        rows.length,
        5
      )
      .setValues(
        rows
      );
  }
}


/***************************************************************
 * 월간 연동 헤더
 ***************************************************************/

function writeMonthlyHeader_(
  sheet,
  latestInfo
) {

  sheet
    .getRange("A1")
    .setValue(
      "연동 월"
    );


  sheet
    .getRange("B1")
    .setValue(
      latestInfo
        ? latestInfo.sheetName
        : ""
    );


  sheet
    .getRange("C1")
    .setValue(
      "복사 종료 행"
    );


  sheet
    .getRange("D1")
    .setValue(
      latestInfo
        ? latestInfo.copyEndRow
        : ""
    );


  sheet
    .getRange("E1")
    .setValue(
      "최신 날짜행"
    );


  sheet
    .getRange("F1")
    .setValue(
      latestInfo
        ? latestInfo.dateBlockStartRow
        : ""
    );


  sheet
    .getRange("G1")
    .setValue(
      "다음 날짜행"
    );


  sheet
    .getRange("H1")
    .setValue(
      latestInfo &&
      latestInfo.nextDateRow
        ? latestInfo.nextDateRow
        : ""
    );


  sheet
    .getRange("I1")
    .setValue(
      "유효성 판정"
    );


  sheet
    .getRange("J1")
    .setValue(
      "A열 앵커 + E:H 직접입력"
    );


  sheet
    .getRange("A2")
    .setValue(
      "설명"
    );


  sheet
    .getRange("B2")
    .setValue(
      "행 간격 비의존 / 날짜 블록 기준 자동 탐색"
    );


  sheet
    .getRange("E2")
    .setValue(
      "유효 작업일 수"
    );


  sheet
    .getRange("F2")
    .setValue(
      latestInfo
        ? latestInfo.validCount
        : 0
    );


  sheet
    .getRange("G2")
    .setValue(
      "최신 앵커 입력"
    );


  sheet
    .getRange("H2")
    .setValue(
      latestInfo
        ? (
            latestInfo.inputAnchorCount +
            "/" +
            DASHBOARD_CONFIG
              .INPUT_ANCHORS
              .length
          )
        : ""
    );
}


/***************************************************************
 * 연간 헤더
 ***************************************************************/

function writeAnnualHeader_(sheet) {

  sheet
    .getRange("A1")
    .setValue(
      DASHBOARD_CONFIG.YEAR
    );


  sheet
    .getRange("B1")
    .setValue(
      "연간 연동용"
    );


  sheet
    .getRange("C1")
    .setValue(
      "설명"
    );


  sheet
    .getRange("D1")
    .setValue(
      "날짜블록 + A열 앵커 + E:H 직접입력 기준"
    );


  sheet
    .getRange("A2")
    .setValue(
      "용도"
    );


  sheet
    .getRange("B2")
    .setValue(
      "월별 출하·폐사 / 연간누적 / 추이그래프"
    );
}


/***************************************************************
 * 유효 작업일 진단
 ***************************************************************/

function showValidationAudit() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const latest =
    findLatestMonthlySheetWithValidData_(ss);


  if (!latest) {

    Logger.log(
      "유효한 작업일지가 없습니다."
    );

    return;
  }


  const lines = [

    "=== 유효 작업일 판정 점검 ===",

    "원본 시트: " +
      latest.sheetName,

    "판정 기준: A열 앵커 + 같은 행 E:H 직접입력",

    "유효 작업일 수: " +
      latest.validCount,

    "최신 유효일: " +
      formatDateForDisplay_(
        latest.latestDate
      ),

    "",

    "[날짜 | 블록 행 | 검출 앵커 | 직접입력 앵커]"
  ];


  latest.allBlocks.forEach(
    function(block) {

      lines.push(

        formatDateForDisplay_(
          block.date
        ) +

        " | " +

        block.dateBlockStartRow +

        "~" +

        block.copyEndRow +

        " | " +

        block.matchedAnchorCount +

        "/" +

        DASHBOARD_CONFIG
          .INPUT_ANCHORS
          .length +

        " | " +

        block.inputAnchorCount +

        "/" +

        DASHBOARD_CONFIG
          .INPUT_ANCHORS
          .length +

        (
          block.hasValidInput
            ? " | 유효"
            : " | 무효"
        )
      );
    }
  );


  Logger.log(
    lines.join("\n")
  );
}


/***************************************************************
 * 앵커 구조 진단
 ***************************************************************/

function showAnchorStructureAudit() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const latest =
    findLatestMonthlySheetWithValidData_(ss);


  if (!latest) {

    Logger.log(
      "유효한 월작업일지가 없습니다."
    );

    return;
  }


  const lines = [

    "=== 앵커 구조 점검 ===",

    "시트: " +
      latest.sheetName,

    "입력 검사 범위: E:H",

    ""
  ];


  latest.allBlocks.forEach(
    function(block) {

      lines.push(
        "----------------------------------"
      );


      lines.push(
        formatDateForDisplay_(
          block.date
        ) +
        " / " +
        block.dateBlockStartRow +
        "~" +
        block.copyEndRow
      );


      if (
        block.matchedAnchors.length
      ) {

        block.matchedAnchors.forEach(
          function(anchor) {

            lines.push(

              "  " +
              anchor.title +

              " / A" +
              anchor.row +

              " / 입력=" +
              (
                anchor.hasManualInput
                  ? "YES"
                  : "NO"
              ) +

              (
                anchor.inputCells.length
                  ? (
                      " / " +
                      anchor.inputCells.join(", ")
                    )
                  : ""
              )
            );
          }
        );
      }


      if (
        block.missingAnchors.length
      ) {

        lines.push(
          "  누락 앵커: " +
          block.missingAnchors.join(
            ", "
          )
        );
      }
    }
  );


  Logger.log(
    lines.join("\n")
  );
}


/***************************************************************
 * MSY 진단
 ***************************************************************/

function showCumulativeMsySummary() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const records =
    collectAnnualDailyKpiRecords_(ss);


  const result =
    calculateCumulativeExpectedMsy_(
      records
    );


  Logger.log(
    [
      "=== 누적 예상 MSY 점검 ===",

      "시작일: " +
        (
          result.startDate
            ? formatDateForDisplay_(
                result.startDate
              )
            : "-"
        ),

      "최신일: " +
        (
          result.endDate
            ? formatDateForDisplay_(
                result.endDate
              )
            : "-"
        ),

      "누적 달력일수: " +
        result.elapsedDays,

      "유효 작업일: " +
        result.validDiaryDays,

      "ВСЕГО 확인일: " +
        result.grandTotalDays,

      "모돈 ИТОГО 확인일: " +
        result.sowRecordDays,

      "누적 출하: " +
        result.cumulativeSale,

      "평균 모돈수: " +
        (
          result.avgSow !== null
            ? result.avgSow.toFixed(1)
            : "-"
        ),

      "누적 예상 MSY: " +
        (
          result.msy !== null
            ? result.msy.toFixed(2)
            : "-"
        ),

      "상태: " +
        result.status

    ].join("\n")
  );
}


/***************************************************************
 * 문자열 판정
 ***************************************************************/

function normalizeText_(value) {

  return String(
    value == null
      ? ""
      : value
  )
    .replace(
      /\u00A0/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .toLowerCase();
}


function isSubTotalLabel_(value) {

  const text =
    normalizeText_(
      value
    );


  return (
    text === "итого" ||
    text === "итог" ||
    text === "subtotal" ||
    text === "합계"
  );
}


function isGrandTotalLabel_(value) {

  const text =
    normalizeText_(
      value
    );


  return (
    text === "всего" ||
    text === "total" ||
    text === "총계"
  );
}


function isAnyTotalLabel_(value) {

  return (
    isSubTotalLabel_(
      value
    ) ||
    isGrandTotalLabel_(
      value
    )
  );
}


function isSowText_(value) {

  const text =
    normalizeText_(
      value
    );


  return (
    text.indexOf(
      "свиномат"
    ) !== -1 ||
    text.indexOf(
      "свино маток"
    ) !== -1
  );
}


/***************************************************************
 * 셀 문자열
 ***************************************************************/

function cellText_(
  displayRow,
  valueRow,
  zeroBasedCol
) {

  let value = "";


  if (
    displayRow &&
    displayRow[
      zeroBasedCol
    ] !== undefined &&
    displayRow[
      zeroBasedCol
    ] !== null
  ) {

    value =
      displayRow[
        zeroBasedCol
      ];

  } else if (
    valueRow &&
    valueRow[
      zeroBasedCol
    ] !== undefined &&
    valueRow[
      zeroBasedCol
    ] !== null
  ) {

    value =
      valueRow[
        zeroBasedCol
      ];
  }


  return String(
    value
  )
    .replace(
      /\u00A0/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


/***************************************************************
 * 셀 숫자
 ***************************************************************/

function cellNumber_(
  displayRow,
  valueRow,
  zeroBasedCol
) {

  let value = "";


  if (
    valueRow &&
    valueRow[
      zeroBasedCol
    ] !== undefined &&
    valueRow[
      zeroBasedCol
    ] !== null &&
    valueRow[
      zeroBasedCol
    ] !== ""
  ) {

    value =
      valueRow[
        zeroBasedCol
      ];

  } else if (
    displayRow
  ) {

    value =
      displayRow[
        zeroBasedCol
      ];
  }


  if (
    typeof value ===
    "number"
  ) {

    return Number.isFinite(
      value
    )
      ? value
      : 0;
  }


  const cleaned =
    String(
      value == null
        ? ""
        : value
    )
      .replace(
        /\u00A0/g,
        ""
      )
      .replace(
        /\s/g,
        ""
      )
      .replace(
        /,/g,
        "."
      )
      .replace(
        /[^0-9.\-]/g,
        ""
      );


  const n =
    Number(
      cleaned
    );


  return Number.isFinite(
    n
  )
    ? n
    : 0;
}


/***************************************************************
 * 날짜 도우미
 ***************************************************************/

function dateKey_(date) {

  return (
    date.getFullYear() +
    "-" +
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    ) +
    "-" +
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    )
  );
}


function formatDateForDisplay_(date) {

  if (!date) {
    return "";
  }


  return (
    date.getFullYear() +
    "." +
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    ) +
    "." +
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    )
  );
}


function daysInclusive_(
  startDate,
  endDate
) {

  if (
    !startDate ||
    !endDate
  ) {

    return 0;
  }


  const startUtc =
    Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );


  const endUtc =
    Date.UTC(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );


  return (
    Math.floor(
      (
        endUtc -
        startUtc
      ) /
      86400000
    ) +
    1
  );
}


/***************************************************************
 * 열번호 → 문자
 ***************************************************************/

function columnNumberToLetter_(column) {

  let result = "";

  let n =
    column;


  while (
    n > 0
  ) {

    const remainder =
      (
        n - 1
      ) %
      26;


    result =
      String.fromCharCode(
        65 +
        remainder
      ) +
      result;


    n =
      Math.floor(
        (
          n - 1
        ) /
        26
      );
  }


  return result;
}


/***************************************************************
 * 원본 데이터 읽기
 ***************************************************************/

function readMonthValuesUntilRow_(
  sheet,
  copyEndRow
) {

  const safeEndRow =
    Math.max(
      1,
      Math.min(
        copyEndRow,
        sheet.getLastRow()
      )
    );


  return sheet
    .getRange(
      1,
      1,
      safeEndRow,
      DASHBOARD_CONFIG.MAX_DATA_COLS
    )
    .getValues();
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
 * K:R 초기화
 ***************************************************************/

function clearMetadataArea_(sheet) {

  ensureColumns_(
    sheet,
    18
  );


  sheet
    .getRange(
      1,
      11,
      sheet.getMaxRows(),
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


/***************************************************************
 * 자동갱신 트리거
 ***************************************************************/

function installDashboardTriggers() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(trigger) {

        if (
          trigger.getHandlerFunction() ===
          "refreshDashboardLinks"
        ) {

          ScriptApp.deleteTrigger(
            trigger
          );
        }
      }
    );


  ScriptApp
    .newTrigger(
      "refreshDashboardLinks"
    )
    .forSpreadsheet(
      ss
    )
    .onEdit()
    .create();


  ScriptApp
    .newTrigger(
      "refreshDashboardLinks"
    )
    .forSpreadsheet(
      ss
    )
    .onChange()
    .create();


  Logger.log(
    "대시보드 자동 갱신 트리거 설치 완료"
  );
}