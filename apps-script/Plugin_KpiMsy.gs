


/***************************************************************
 * 연간 KPI 기록 수집
 ***************************************************************/

function collectAnnualDailyKpiRecords_(
  monthlyAnalyses
) {

  const recordMap =
    new Map();


  (monthlyAnalyses || [])
    .forEach(
      function(info) {

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
                (
                  info.reportingScan ||
                  info.adjustedScan ||
                  info.scan
                ),
                block,
                info.sheetName
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


  if (block.officialGroupStocks && block.officialGroupStocks.sow.count > 0) {
    sowCount = block.officialGroupStocks.sow.current;
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