


/***************************************************************
 * 월간/연간 공통 MSY 메타정보 2행 생성
 ***************************************************************/

function buildMsyMetadataRows_(msy) {

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


  return [

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
}


/***************************************************************
 * 분석 시 읽은 원본 A:J에서 연동용 A:I 출력값 구성
 ***************************************************************/

function getMonthlyOutputValues_(analysis) {

  if (
    !analysis ||
    !analysis.scan ||
    !analysis.scan.values ||
    !analysis.copyEndRow
  ) {

    return [];
  }


  const safeEndRow =
    Math.max(
      1,
      Math.min(
        analysis.copyEndRow,
        analysis.scan.lastRow,
        analysis.scan.values.length
      )
    );


  const source =
    analysis.reportingOutputValues &&
    analysis.reportingOutputValues.length
      ? analysis.reportingOutputValues
      : (
          analysis.outputValues &&
          analysis.outputValues.length
            ? analysis.outputValues
            : analysis.scan.values
        );


  return source
    .slice(
      0,
      safeEndRow
    )
    .map(
      function(row) {

        return row.slice(
          0,
          DASHBOARD_CONFIG.MAX_DATA_COLS
        );
      }
    );
}