


/***************************************************************
 * 실사보정 진단
 ***************************************************************/

function showInventoryAuditSummary() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const monthlyAnalyses =
    collectMonthlyAnalysesReadOnly_(
      ss
    );


  const lines = [
    "=== 상세/구분 합계 실사보정 점검 ==="
  ];

  const detailedLines = [];
  const groupLines = [];
  const issueLines = [];
  let detailedCount = 0;
  let groupDateCount = 0;
  let groupValueCount = 0;
  const appliedGroupRows = new Set();


  monthlyAnalyses.forEach(
    function(info) {

      (info.validBlocks || [])
        .forEach(
          function(block) {

            (block.appliedInventoryAudits || [])
              .forEach(
                function(audit) {

                  detailedCount += 1;


                  detailedLines.push(
                    [
                      info.sheetName,
                      formatDateForDisplay_(
                        block.date
                      ),
                      audit.cell,
                      audit.entityKey,
                      "보정 전=" +
                        audit.previousCalculated,
                      "실사=" +
                        audit.actual,
                      "차이=" +
                        audit.correction
                    ].join(" | ")
                  );
                }
              );

            const groupRecord = block.groupInventoryAuditRecord || null;
            if (groupRecord && groupRecord.applied && !appliedGroupRows.has(groupRecord.rowNum)) {
              groupDateCount += 1;
              appliedGroupRows.add(groupRecord.rowNum);
              groupLines.push([
                info.sheetName,
                formatDateForDisplay_(block.date),
                GROUP_INVENTORY_AUDIT_CONFIG.SHEET_NAME + "!A" + groupRecord.rowNum,
                "전체 실사=" + groupRecord.expectedTotal
              ].join(" | "));
            }
            (block.appliedGroupInventoryAudits || []).forEach(function(audit) {
              groupValueCount += 1;
              groupLines.push([
                "  " + groupInventoryAuditLabel_(audit.groupKey),
                "대상행=" + audit.rowNum,
                "보정 전=" + audit.previousCalculated,
                "실사=" + audit.actual,
                "차이=" + audit.correction,
                "승계 보정값=" + audit.carriedOffset
              ].join(" | "));
            });
          }
        );
    }
  );

  const groupContext = monthlyAnalyses.groupInventoryAuditContext || { records: [] };
  (groupContext.records || []).forEach(function(record) {
    if (record.applied) return;
    issueLines.push([
      GROUP_INVENTORY_AUDIT_CONFIG.SHEET_NAME + "!A" + record.rowNum,
      record.date ? formatDateForDisplay_(record.date) : "날짜 없음",
      record.status || GROUP_INVENTORY_AUDIT_CONFIG.STATUS.NOT_APPLIED
    ].join(" | "));
  });

  if (detailedLines.length) {
    lines.push("", "[상세 J열 실사]");
    Array.prototype.push.apply(lines, detailedLines);
  }
  if (groupLines.length) {
    lines.push("", "[구분 합계 실사]");
    Array.prototype.push.apply(lines, groupLines);
  }
  if (issueLines.length) {
    lines.push("", "[구분 합계 미적용/확인 필요]");
    Array.prototype.push.apply(lines, issueLines);
  }
  if (detailedCount === 0 && groupDateCount === 0) {
    lines.push("", "적용된 실사입력이 없습니다.");
  }
  lines.push(
    "",
    "상세 J열 실사입력: " + detailedCount,
    "구분 합계 실사일: " + groupDateCount,
    "구분 합계 보정값: " + groupValueCount,
    "구분 합계 미적용/확인 필요: " + issueLines.length
  );


  Logger.log(
    lines.join("\n")
  );
}


/***************************************************************
 * 유효 작업일 진단
 ***************************************************************/

function showValidationAudit() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const monthlyAnalyses =
    collectMonthlyAnalysesReadOnly_(ss);


  const latest =
    findLatestMonthlySheetWithValidData_(
      monthlyAnalyses
    );


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


  const monthlyAnalyses =
    collectMonthlyAnalysesReadOnly_(ss);


  const latest =
    findLatestMonthlySheetWithValidData_(
      monthlyAnalyses
    );


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


  const monthlyAnalyses =
    collectMonthlyAnalysesReadOnly_(ss);


  const records =
    collectAnnualDailyKpiRecords_(
      monthlyAnalyses
    );


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


function showMonthlyCarryoverAudit() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const result =
    auditMonthlyCarryovers_(
      collectMonthlyAnalysesReadOnly_(ss)
    );


  Logger.log(
    result.message
  );
}