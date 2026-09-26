


/***************************************************************
 * 러시아어 구분 합계 실사 입력시트 설정
 ***************************************************************/

function setupGroupInventoryAuditSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = ensureGroupInventoryAuditSheet_(ss, true);
  SpreadsheetApp.flush();
  refreshDashboardLinks();
  result.sheet.activate();
  Logger.log([
    "=== 구분 합계 실사 입력시트 설정 완료 ===",
    "시트: " + GROUP_INVENTORY_AUDIT_CONFIG.SHEET_NAME,
    "초기자료 등록: " + (result.seeded ? "1~6월 등록" : "기존 자료 유지"),
    "실사일 미확인 초기자료: 각 월 말일 적용",
    "5~6월: 현재 월작업일지에 적용",
    "1~4월: 월작업일지 부재로 보존만 함"
  ].join("\n"));
}