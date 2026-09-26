


/***************************************************************
 * 월간 연동 내부
 ***************************************************************/

function refreshMonthlyLinkSheetInternal_(
  ss,
  monthlyAnalyses,
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
    findLatestMonthlySheetWithValidData_(
      monthlyAnalyses
    );


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
    getMonthlyOutputValues_(
      latestInfo
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


  const rows =
    buildMsyMetadataRows_(
      msy
    );


  rows.push(

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
  );


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
  const groupRows = buildOfficialGroupStockMetadata_(latestInfo);
  if (groupRows.length) {
    sheet.getRange(6, 11, 7, 8).setValues([
      ['GROUP_STOCK_V1', latestValidDate, '', '', '', '', '', ''],
      ['group', 'official_previous', 'official_current', 'detail_previous', 'detail_current', 'residual', 'pending_rooms', 'room_count']
    ].concat(groupRows));
  }

}


/***************************************************************
 * 월간 연동 헤더
 ***************************************************************/

function writeMonthlyHeader_(
  sheet,
  latestInfo
) {

  const rows = [

    [
      "연동 월",

      latestInfo
        ? latestInfo.sheetName
        : "",

      "복사 종료 행",

      latestInfo
        ? latestInfo.copyEndRow
        : "",

      "최신 날짜행",

      latestInfo
        ? latestInfo.dateBlockStartRow
        : "",

      "다음 날짜행",

      (
        latestInfo &&
        latestInfo.nextDateRow
      )
        ? latestInfo.nextDateRow
        : "",

      "유효성 판정",

      "A열 앵커 + E:H 직접입력"
    ],


    [
      "설명",

      "행 간격 비의존 / 날짜 블록 기준 자동 탐색",

      "",

      "",

      "유효 작업일 수",

      latestInfo
        ? latestInfo.validCount
        : 0,

      "최신 앵커 입력",

      latestInfo
        ? (
            latestInfo.inputAnchorCount +
            "/" +
            DASHBOARD_CONFIG
              .INPUT_ANCHORS
              .length
          )
        : "",

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