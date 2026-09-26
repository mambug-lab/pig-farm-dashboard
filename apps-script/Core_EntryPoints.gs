


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

    .addItem(
      "실사보정 진단 로그",
      "showInventoryAuditSummary"
    )

    .addItem(
      "월 경계 이월재고 진단 로그",
      "showMonthlyCarryoverAudit"
    )

    .addSeparator()

    .addItem(
      "실사두수 J열 입력란 설정",
      "setupInventoryAuditInputColumn"
    )

    .addItem(
      "러시아어 구분 실사입력 시트 설정",
      "setupGroupInventoryAuditSheet"
    )

    .addSeparator()

    .addItem(
      "신규 월 작업일지 생성…",
      "promptCreateMonthlySheet"
    )

    .addItem(
      "다음 월 작업일지 생성",
      "createNextMonthlySheet"
    )

    .addItem(
      "월 작업일지 자동생성 설치",
      "installMonthlySheetCreationTrigger"
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

  return withDocumentLock_(
    "대시보드 연동 갱신",
    function() {
      return refreshDashboardLinksUnlocked_();
    }
  );
}


/***************************************************************
 * 월간 연동만 갱신
 ***************************************************************/

function refreshMonthlyLinkSheet() {
  return withDocumentLock_(
    "월간 연동 갱신",
    function() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const monthlyAnalyses =
    collectMonthlyAnalyses_(ss);


  const dailyRecords =
    collectAnnualDailyKpiRecords_(
      monthlyAnalyses
    );


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
    monthlyAnalyses,
    msySummary,
    latestMonthSummary
  );

    }
  );
}


/***************************************************************
 * 연간 연동만 갱신
 ***************************************************************/

function refreshAnnualLinkSheet() {
  return withDocumentLock_(
    "연간 연동 갱신",
    function() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const monthlyAnalyses =
    collectMonthlyAnalyses_(ss);


  const dailyRecords =
    collectAnnualDailyKpiRecords_(
      monthlyAnalyses
    );


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
    monthlyAnalyses,
    msySummary,
    annualMonthlySummary
  );

    }
  );
}


/***************************************************************
 * 신규 월 작업일지 자동생성
 *
 * 원칙
 * - 전월 원본 시트는 변경하지 않는다.
 * - 최초 한 번만 전월 시트를 숨김 템플릿으로 복제한다.
 * - 새 월은 템플릿을 복제한 뒤, 직접입력 수치만 비운다.
 * - 수식·서식·병합·유효성·보호는 Sheet.copyTo() 결과를 유지한다.
 * - 전월의 v11.2 실사보정 후 최종재고만 새 월 1일 D열로 이월한다.
 ***************************************************************/

function promptCreateMonthlySheet() {

  const ui =
    SpreadsheetApp.getUi();


  const response =
    ui.prompt(
      "신규 월 작업일지 생성",
      "생성할 월을 YYYY-MM 형식으로 입력하세요.\n예: 2026-10",
      ui.ButtonSet.OK_CANCEL
    );


  if (
    response.getSelectedButton() !==
    ui.Button.OK
  ) {

    return;
  }


  try {

    const target =
      parseMonthlySheetTarget_(
        response.getResponseText()
      );


    const result =
      createMonthlySheetForTarget_(
        target.year,
        target.month
      );


    ui.alert(
      result.message
    );

  } catch (error) {

    ui.alert(
      "신규 월 작업일지 생성 중단\n\n" +
      error.message
    );
  }
}


function createNextMonthlySheet() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  try {

    const next =
      findNextMonthlySheetTarget_(
        ss
      );


    const result =
      createMonthlySheetForTarget_(
        next.year,
        next.month
      );


    notifyUserSafely_(
      result.message,
      "다음 월 작업일지 생성"
    );


    return result;

  } catch (error) {

    const message =
      "다음 월 작업일지 생성 중단\n\n" +
      error.message;


    Logger.log(
      error && error.stack
        ? error.stack
        : message
    );


    notifyUserSafely_(
      message,
      "다음 월 작업일지 생성"
    );


    throw error;
  }
}