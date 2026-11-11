


/***************************************************************
 * 연간 연동 내부
 ***************************************************************/

function refreshAnnualLinkSheetInternal_(
  ss,
  monthlyAnalyses,
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


  let allRows = [];

  const usedSheetNames = [];


  monthlyAnalyses
    .forEach(
      function(info) {

        if (
          !info ||
          !info.hasValidInput
        ) {

          return;
        }


        const values =
          getMonthlyOutputValues_(
            info
          );


        if (!values.length) {
          return;
        }


        allRows =
          allRows.concat(
            values
          );


        usedSheetNames.push(
          info.sheetName +
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
 * 연간 메타정보
 ***************************************************************/

function writeAnnualMetadata_(
  sheet,
  msy,
  monthlySummary
) {

  ensureColumns_(
    sheet,
    21
  );


  // P:U extends the existing monthly summary without touching source diaries.
  sheet.getRange(4, 16, DASHBOARD_CONFIG.METADATA_MANAGED_ROWS - 3, 6).clearContent();
  sheet.getRange(5, 16, 1, 6).setValues([[
    '누계 기준일', '비교 방식', '전월 비교 출하', '전월 비교 폐사', '전월 비교 말일', '비교 스키마'
  ]]);

  const msyRows =
    buildMsyMetadataRows_(
      msy
    );


  sheet
    .getRange(
      1,
      11,
      msyRows.length,
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
    .getRange(
      4,
      11,
      2,
      5
    )
    .setValues([
      [
        "월별 집계",
        "",
        "",
        "",
        ""
      ],
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

            item.validDays,
            item.cutoffDay,
            item.comparisonMode,
            item.comparisonSale === null ? "" : item.comparisonSale,
            item.comparisonLoss === null ? "" : item.comparisonLoss,
            item.previousThroughDay,
            "MONTH_COMPARISON_V1"

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
        11
      )
      .setValues(
        rows
      );
  }
}


/***************************************************************
 * 연간 헤더
 ***************************************************************/

function writeAnnualHeader_(sheet) {

  const rows = [

    [
      getDashboardReportingYear_(),

      "연간 연동용",

      "설명",

      "날짜블록 + A열 앵커 + E:H 직접입력 기준",

      "",

      "",

      "",

      "",

      "",

      ""
    ],


    [
      "용도",

      "월별 출하·폐사 / 연간누적 / 추이그래프",

      "",

      "",

      "",

      "",

      "",

      "",

      "",

      ""
    ]
  ];


  sheet
    .getRange(
      1,
      1,
      rows.length,
      10
    )
    .setValues(
      rows
    );
}