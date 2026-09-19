/***************************************************************
 * 양돈장 대시보드 자동연동
 * Code.gs v11.5-RC9
 * (자동 월 작업일지 우선 + 무날짜 예비 블록 제거)
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
 * =============================================================
 * [v11.1-RC1 성능/구조 리팩터링]
 * =============================================================
 *
 * 기준 정본:
 *   Code.gs v11.0
 *   GitHub blob 8b9ec6b35f5c4021438caa078d453b5ac9a59d37
 *
 * 변경 범위:
 *   - 실행 1회당 월별 원본 분석 1회로 통합
 *   - 수집한 날짜행으로 다음 블록 시작행 재사용
 *   - 분석 시 읽은 A:I 값을 연동용 복사에 재사용
 *   - K:R 초기화를 명시된 관리 범위로 제한
 *   - A1:J2 헤더 쓰기를 배치 처리
 *   - 월간/연간 공통 MSY 메타 행 생성 통합
 *
 * [v11.2-RC1 실사보정]
 *   - 원본 월작업일지 J열을 선택형 실사두수 입력으로 사용
 *   - 날짜/돈사/돈방은 같은 작업일 블록의 A/C열에서 자동 인식
 *   - 돈사/돈방별 실사값을 해당 날짜의 확정 재고로 적용
 *   - 보정 차이를 다음 실사일까지 전일/금일 재고에 승계
 *   - 판매/폐사/분만 원인은 실사값만으로 추정하지 않음
 *   - 연동용 출력은 기존 A:I, K:R, K:O 계약 유지
 *
 * [v11.3-RC1 신규 월 작업일지 자동생성]
 *   - 최초 1회 전월 시트를 숨김 템플릿으로 자동 복제
 *   - 매월 1일 현재 월 시트를 자동 생성, 수동 생성도 지원
 *   - 템플릿의 수식·서식·병합·유효성·보호 구조를 복제
 *   - 전월 실사보정 후 최종재고를 새 월 1일 전일재고(D열)로 이월
 *   - 판매·폐사·분만 원인은 생성하거나 추정하지 않음
 *   - 기존 대시보드 자동갱신 트리거 및 HTML은 변경하지 않음
 *
 * [v11.4-RC1 구분 합계 실사보정]
 *   - 러시아어 입력시트 "Инвентаризация поголовья" 추가
 *   - 월별 구분 합계 실사값을 대시보드 출력과 KPI에만 보정
 *   - 상세 돈사/돈방 행에는 차이를 임의 배분하지 않음
 *   - 실제 실사일 우선, 미확인 자료는 월말 적용
 *   - 미분류 후보돈·도태모돈·웅돈 또는 J열 실사 충돌 시 미적용
 *
 * [v11.5-RC1 자동 월 생성 우선]
 *   - 기존 수동 작성 월 시트는 참고 원본으로 보존하고 덮어쓰지 않음
 *   - 가장 늦은 기존 월 다음 달을 연도 경계와 무관하게 자동 생성
 *   - 31일 전체 구조를 가진 참고 월에서 숨김 템플릿을 생성/검증
 *   - 자동 생성 탭에 개발자 메타데이터를 기록해 상세 J 보정의 중복승계 방지
 *   - 생성 시 전월 보정 후 상세 최종재고와 새 월 D열을 전 행 대조
 *   - 월 작업일지 생성과 대시보드 갱신을 문서 잠금으로 직렬화
 *   - 농장 기준 시간대(Asia/Vladivostok)로 월초 트리거와 날짜를 통일
 *   - 연간 대시보드 기준연도는 농장 현지 현재연도로 자동 전환
 *
 * [v11.5-RC2 F-01/F-03 후속 후보]
 *   - 그룹 잔차/미확정 돈방은 별도 상태로 유지, 상세 J값과 D이월에 배분 금지
 *   - 모든 돈방의 후속 J 실사 완료 시 잔차 종료, 같은 날 전체 J 충돌 거부
 *   - 월간 K6:R12 GROUP_STOCK_V1 공식 그룹값 제공 (짝 HTML 필요)
 *
 * [v11.5-RC3 미사용 미래 날짜 블록 제외]
 *   - 실제 입력이나 그룹 실사가 없는 미래 템플릿 블록은 그룹 상태 재생에서 제외
 *
 * [v11.5-RC4 날짜 전용값 처리 보강]
 *   - 시트 표시 날짜를 원시 Date보다 우선해 스프레드시트/스크립트 시간대 차이 제거
 *   - 러시아식 dd.MM.yyyy와 기존 yyyy-MM-dd/년월일 표시를 모두 엄격 검증
 *   - 구분 합계 실사일도 getDisplayValues 기준으로 읽어 하루 이동 방지
 *
 * [v11.5-RC5 실제 월 시트 템플릿 대응]
 *   - 1~31일 날짜 블록이 있으면 다음 달 날짜 경계행 없이도 템플릿 인정
 *   - 첫 날짜 직접입력 + 후속 날짜 수식 구조는 첫 날짜만 갱신해 수식 보존
 *   - 무날짜 예비 블록을 월말 경계로 인식해 재고 중복 집계 방지
 *
 * [v11.5-RC6 자동 월 생성 실행시간 단축]
 *   - J열 서식 복사를 날짜별 31회에서 월 전체 1회로 통합
 *   - 날짜별 J열 머리글 값·메모를 RangeList 배치 처리
 *   - 생성 단계별 로그를 남겨 제한시간 병목을 확인 가능하게 함
 *
 * 보류/유지:
 *   - onEdit/onChange 트리거 구성은 별도 검증 단계에서 정리
 *   - Dashboard L3 별도 GViz 요청은 이 파일의 범위 아님
 *   - Dashboard 고정 상세 조회 범위는 이 파일의 범위 아님
 *
 ***************************************************************/


const DASHBOARD_CONFIG = {

  YEAR: 2026,

  MONTHLY_LINK_SHEET_NAME:
    "대시보드_월간연동용",

  ANNUAL_LINK_SHEET_NAME:
    "대시보드_연간연동용",

  MAX_DATA_COLS: 9,

  /*
   * 원본은 A:I 작업일지 + J 실사두수를 읽는다.
   * Dashboard 연동 출력은 기존 A:I 9열을 유지한다.
   */
  SOURCE_DATA_COLS: 10,

  INVENTORY_AUDIT_COL: 10,  // J

  INVENTORY_AUDIT_HEADER:
    "Факт. поголовье",

  OUTPUT_START_ROW: 3,

  /*
   * Dashboard가 사용하는 KPI/월별 요약 관리 영역.
   * 이전 요약의 잔존값 제거를 포함해 K:R 1~30행만 관리한다.
   */
  METADATA_MANAGED_ROWS: 30,


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


/*
 * 신규 월 작업일지 자동생성 설정.
 * 템플릿은 최초 생성 때만 전월 시트에서 만들며, 이후 직접 수정하지 않는다.
 */
const MONTHLY_SHEET_CREATION_CONFIG = {

  TEMPLATE_SHEET_NAME:
    "월작업일지_자동생성_템플릿",

  AUTO_CREATE_HANDLER:
    "createCurrentMonthSheetOnFirstDay",

  AUTO_CREATE_HOUR:
    1,

  OPERATION_TIME_ZONE:
    "Asia/Vladivostok",

  AUTO_GENERATED_METADATA_KEY:
    "PIG_DASHBOARD_AUTO_MONTH",

  MIN_TEMPLATE_CALENDAR_DAYS:
    31,

  LOCK_TIMEOUT_MS:
    30000,

  /* 기존 수동 월 탭의 1일 D열은 농장 실측 재설정값으로 취급한다. */
  LEGACY_MANUAL_MONTH_START_REBASE:
    true,

  FIRST_DAY:
    1,

  PREVIOUS_STOCK_COL:
    4,  // D: 전일재고

  CURRENT_STOCK_COL:
    9,  // I: 금일재고

  FIRST_ENTRY_COL:
    4,  // D

  LAST_ENTRY_COL:
    10  // J (실사두수 포함)
};


/*
 * 러시아 현지 운영자용 구분 합계 실사 입력시트.
 * K:M의 후보돈·도태모돈·웅돈은 분류 지시가 없으면 적용하지 않는다.
 */
const GROUP_INVENTORY_AUDIT_CONFIG = {
  SHEET_NAME: "Инвентаризация поголовья",
  HEADER_ROW: 1,
  FIRST_DATA_ROW: 2,
  MANAGED_ROWS: 200,
  COLUMN_COUNT: 16,
  COL: {
    AUDIT_DATE: 1,
    REPORTING_MONTH: 2,
    SOW_MAIN: 3,
    SOW_FARROWING: 4,
    SOW_TOTAL: 5,
    SUCKLING: 6,
    WEANED: 7,
    GROWING: 8,
    FATTENING_OLD: 9,
    FATTENING_NEW: 10,
    REPLACEMENT_GILTS: 11,
    CULLED_SOWS: 12,
    BOARS: 13,
    AUDIT_TOTAL: 14,
    STATUS: 15,
    NOTE: 16
  },
  STATUS: {
    APPLIED: "Применено",
    NEEDS_CLARIFICATION: "Требуется уточнение",
    DATA_ERROR: "Ошибка данных",
    NOT_APPLIED: "Не применяется"
  },
  GROUP_KEYS: [
    "sow", "suckling", "weaned", "growing", "fattening_old", "fattening_new"
  ],
  INITIAL_DATA_YEAR: 2026,
  /* 첨부된 поголовье 2026.xlsx. 정확한 일자가 없어 월말로 입력한다. */
  INITIAL_DATA: [
    { month: 1, sowMain: 312, sowFarrowing: 30, suckling: 283, weaned: 980, growing: 489, fatteningOld: 1329, fatteningNew: 1095 },
    { month: 2, sowMain: 317, sowFarrowing: 37, suckling: 357, weaned: 800, growing: 532, fatteningOld: 1477, fatteningNew: 1170 },
    { month: 3, sowMain: 302, sowFarrowing: 44, suckling: 407, weaned: 758, growing: 602, fatteningOld: 1568, fatteningNew: 1187 },
    { month: 4, sowMain: 326, sowFarrowing: 31, suckling: 484, weaned: 723, growing: 631, fatteningOld: 1631, fatteningNew: 1232 },
    { month: 5, sowMain: 313, sowFarrowing: 59, suckling: 375, weaned: 855, growing: 613, fatteningOld: 1689, fatteningNew: 1350 },
    { month: 6, sowMain: 321, sowFarrowing: 58, suckling: 422, weaned: 1137, growing: 580, fatteningOld: 1535, fatteningNew: 1357 }
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


function refreshDashboardLinksUnlocked_() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const monthlyAnalyses =
    collectMonthlyAnalyses_(ss);


  const carryoverAudit =
    auditMonthlyCarryovers_(
      monthlyAnalyses.carryContextAnalyses ||
      monthlyAnalyses
    );


  if (carryoverAudit.issues.length) {

    Logger.log(
      carryoverAudit.message
    );


    if (
      carryoverAudit.issues.some(
        function(item) {
          return item.autoGenerated;
        }
      )
    ) {
      throw new Error(
        "자동 생성 월의 이월재고가 전월 최종재고와 일치하지 않습니다.\n" +
        carryoverAudit.message
      );
    }
  }


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


  const annualMonthlySummary =
    buildAnnualMonthlySummary_(
      dailyRecords
    );


  refreshMonthlyLinkSheetInternal_(
    ss,
    monthlyAnalyses,
    msySummary,
    latestMonthSummary
  );


  refreshAnnualLinkSheetInternal_(
    ss,
    monthlyAnalyses,
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


/***************************************************************
 * 연간 연동만 갱신
 ***************************************************************/

function refreshAnnualLinkSheet() {

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
 * 실행 1회용 월별 분석 컨텍스트
 ***************************************************************/

function collectMonthlyAnalyses_(ss, reportingYear) {

  const year =
    Number(
      reportingYear ||
      getDashboardReportingYear_()
    );


  const descriptors =
    DASHBOARD_CONFIG.MONTHS_RU
      .map(
        function(monthName, index) {

          const sheetName =
            monthName +
            " " +
            year;


          const sheet =
            ss.getSheetByName(
              sheetName
            );


          return sheet
            ? {
                year: year,
                month: index + 1,
                sheetName: sheetName,
                sheet: sheet
              }
            : null;
        }
      )
      .filter(
        function(item) {
          return Boolean(item);
        }
      );


  const contextDescriptors =
    prependMonthlyCarryContextDescriptors_(
      ss,
      descriptors
    );


  const contextAnalyses =
    collectMonthlyAnalysesFromDescriptors_(
      ss,
      contextDescriptors,
      true
    );


  const reportingAnalyses =
    contextAnalyses.filter(
      function(info) {
        return info.year === year;
      }
    );


  reportingAnalyses.carryContextAnalyses =
    contextAnalyses;


  reportingAnalyses.groupInventoryAuditContext =
    contextAnalyses.groupInventoryAuditContext;


  return reportingAnalyses;
}


/*
 * 자동 생성 탭은 구분 합계 실사보정 오프셋을 상세행 D열에 배분하지 않는다.
 * 연도가 바뀌어도 오프셋이 끊기지 않도록 현재 연도의 첫 월 앞에서부터
 * 직전 수동 월(새 실측 기준점)까지의 연속 월을 계산 문맥에만 포함한다.
 */
function prependMonthlyCarryContextDescriptors_(
  ss,
  reportingDescriptors
) {

  const current =
    (reportingDescriptors || [])
      .slice()
      .sort(
        function(a, b) {
          return (
            a.year - b.year ||
            a.month - b.month
          );
        }
      );


  if (!current.length) {
    return current;
  }


  const all =
    listMonthlySheetDescriptors_(
      ss
    );


  const byKey =
    new Map();


  all.forEach(
    function(item) {
      byKey.set(
        item.year * 12 +
        item.month - 1,
        item
      );
    }
  );


  const first =
    current[0];


  let cursor =
    first.year * 12 +
    first.month - 2;


  const prefix = [];


  while (byKey.has(cursor)) {

    const item =
      byKey.get(cursor);


    prefix.unshift(
      item
    );


    if (
      !isAutoGeneratedMonthlySheet_(
        item.sheet,
        item.year,
        item.month
      )
    ) {
      break;
    }


    cursor -= 1;
  }


  return prefix.concat(
    current
  );
}


function collectMonthlyAnalysesThrough_(
  ss,
  throughYear,
  throughMonth
) {

  const limit =
    Number(throughYear) * 100 +
    Number(throughMonth);


  const descriptors =
    listMonthlySheetDescriptors_(
      ss
    )
      .filter(
        function(item) {
          return (
            item.year * 100 +
            item.month <=
            limit
          );
        }
      );


  return collectMonthlyAnalysesFromDescriptors_(
    ss,
    descriptors,
    true
  );
}


function collectMonthlyAnalysesFromDescriptors_(
  ss,
  descriptors,
  writeStatuses
) {

  const analyses =
    (descriptors || [])
      .slice()
      .sort(
        function(a, b) {
          return (
            a.year - b.year ||
            a.month - b.month
          );
        }
      )
      .map(
        function(item) {
          return analyzeMonthlySheet_(
            item.sheet,
            item.sheetName,
            item.month,
            item.year
          );
        }
      );


  const groupAuditContext =
    readGroupInventoryAuditRecords_(ss);


  matchGroupInventoryAuditsToBlocks_(
    analyses,
    groupAuditContext.records
  );

  applyInventoryAuditAdjustments_(analyses);
  applyGroupInventoryAuditAdjustments_(
    analyses,
    groupAuditContext.records
  );


  if (writeStatuses) {
    writeGroupInventoryAuditStatuses_(
      groupAuditContext
    );
  }


  analyses.groupInventoryAuditContext =
    groupAuditContext;


  return analyses;
}


/***************************************************************
 * 최신 유효 월
 ***************************************************************/

function findLatestMonthlySheetWithValidData_(
  monthlyAnalyses
) {

  const candidates =
    (monthlyAnalyses || [])
      .filter(
        function(info) {

          return (
            info &&
            info.hasValidInput
          );
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
  monthIndex,
  reportingYear
) {

  const year =
    Number(
      reportingYear ||
      getDashboardReportingYear_()
    );

  const scan =
    scanMonthlySheet_(
      sheet
    );


  const dateRows =
    collectDateRowsForMonth_(
      scan,
      monthIndex,
      year
    );


  if (!dateRows.length) {

    return createEmptyMonthlyAnalysis_(
      sheet,
      sheetName,
      monthIndex,
      year,
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
      current.nextDateRow;


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


    const inventoryAudit =
      inspectInventoryAuditInputsInBlock_(
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

      inventoryAuditCount:
        inventoryAudit.count,

      inventoryAuditCells:
        inventoryAudit.cells,

      hasValidInput:
        (
          validation.hasValidInput ||
          inventoryAudit.count > 0
        )
    };


    allBlocks.push(
      block
    );


    if (
      block.hasValidInput
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
        year,
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

    year:
      year,

    autoGenerated:
      isAutoGeneratedMonthlySheet_(
        sheet,
        year,
        monthIndex
      ),

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
      latest.missingAnchors,

    inventoryAuditCount:
      validBlocks.reduce(
        function(sum, block) {
          return (
            sum +
            Number(
              block.inventoryAuditCount || 0
            )
          );
        },
        0
      )
  };
}


/***************************************************************
 * 빈 월 분석 객체
 ***************************************************************/

function createEmptyMonthlyAnalysis_(
  sheet,
  sheetName,
  monthIndex,
  reportingYear,
  scan
) {

  return {

    sheet:
      sheet,

    sheetName:
      sheetName,

    monthIndex:
      monthIndex,

    year:
      Number(reportingYear),

    autoGenerated:
      isAutoGeneratedMonthlySheet_(
        sheet,
        Number(reportingYear),
        monthIndex
      ),

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
      [],

    inventoryAuditCount:
      0,

    groupInventoryAuditCount:
      0,

    outputValues:
      [],

    reportingOutputValues:
      []
  };
}


/***************************************************************
 * 해당 월 날짜행 수집
 ***************************************************************/

function collectDateRowsForMonth_(
  scan,
  monthIndex,
  reportingYear
) {

  const result = [];

  const allDateRows = [];

  const seenDateKeys =
    new Set();


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


    const item = {

      row:
        rowNum,

      date:
        new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        ),

      nextDateRow:
        null
    };


    if (allDateRows.length) {

      allDateRows[
        allDateRows.length - 1
      ].nextDateRow =
        rowNum;
    }


    allDateRows.push(
      item
    );


    if (
      date.getFullYear() !==
        Number(reportingYear) ||
      date.getMonth() + 1 !==
        monthIndex
    ) {

      continue;
    }


    /*
     * 같은 날짜가 여러 행에서 발견될 경우
     * 최초 날짜행만 사용한다.
     *
     * nextDateRow는 월/연도와 무관한 바로 다음 날짜행이다.
     * 기존 findNextDateRowAfter_()의 경계 판정을 그대로 보존한다.
     */
    const key =
      dateKey_(
        item.date
      );


    if (
      !seenDateKeys.has(
        key
      )
    ) {

      seenDateKeys.add(
        key
      );

      result.push(
        item
      );
    }
  }


  if (
    allDateRows.length &&
    !allDateRows[
      allDateRows.length - 1
    ].nextDateRow
  ) {

    const trailingBoundaryRow =
      findTrailingUndatedTemplateBoundaryRow_(
        scan,
        allDateRows[
          allDateRows.length - 1
        ].row
      );


    if (trailingBoundaryRow) {
      allDateRows[
        allDateRows.length - 1
      ].nextDateRow =
        trailingBoundaryRow;
    }
  }


  return result;
}


/*
 * 실제 작업일지에는 31일 뒤에 날짜 셀만 빈 예비 작업 블록이 있다.
 * 날짜가 없더라도 바로 다음 행이 월 작업일지 열 제목이면 그 빈 날짜행을
 * 마지막 실제 날짜 블록의 경계로 사용해 월말 재고가 중복 집계되지 않게 한다.
 */
function findTrailingUndatedTemplateBoundaryRow_(
  scan,
  afterRow
) {

  if (!scan) {
    return null;
  }


  for (
    let rowNum = Number(afterRow || 0) + 1;
    rowNum < scan.lastRow;
    rowNum++
  ) {

    const valueRow =
      scan.values[rowNum - 1];


    const displayRow =
      scan.displayValues[rowNum - 1];


    const formulaRow =
      scan.formulas[rowNum - 1];


    const boundaryRowIsBlank =
      Array.from({
        length:
          DASHBOARD_CONFIG.SOURCE_DATA_COLS
      }).every(
        function(_, col) {
          return (
            cellText_(
              displayRow,
              valueRow,
              col
            ) === "" &&
            String(
              formulaRow &&
              formulaRow[col] ||
              ""
            ).trim() === ""
          );
        }
      );


    if (!boundaryRowIsBlank) {
      continue;
    }


    const nextValueRow =
      scan.values[rowNum];


    const nextDisplayRow =
      scan.displayValues[rowNum];


    if (
      normalizeText_(
        cellText_(
          nextDisplayRow,
          nextValueRow,
          0
        )
      ) === "отделение" &&
      normalizeText_(
        cellText_(
          nextDisplayRow,
          nextValueRow,
          3
        )
      ) === "предыдущий день" &&
      normalizeText_(
        cellText_(
          nextDisplayRow,
          nextValueRow,
          8
        )
      ) === "текущий день"
    ) {
      return rowNum;
    }
  }


  return null;
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
 * 작업일 블록의 J열 실사두수 검사
 *
 * - J열 직접입력 숫자만 인정
 * - 수식은 실사입력으로 인정하지 않음
 * - I열에 재고 숫자가 있는 상세행만 대상
 * - ИТОГО / ВСЕГО 합계행 입력은 제외
 ***************************************************************/

function inspectInventoryAuditInputsInBlock_(
  scan,
  startRow,
  endRow
) {

  const cells = [];


  let inAggregateSummary =
    false;


  for (
    let rowNum = startRow;
    rowNum <= endRow;
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


    const formulaRow =
      scan.formulas[
        rowNum - 1
      ];


    if (
      !valueRow ||
      !displayRow ||
      !formulaRow
    ) {

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
      isSubTotalLabel_(section) ||
      isSubTotalLabel_(sub)
    ) {

      inAggregateSummary =
        true;

      continue;
    }


    if (
      isGrandTotalLabel_(section) ||
      isGrandTotalLabel_(sub)
    ) {

      continue;
    }


    if (
      section &&
      !isAnyTotalLabel_(
        section
      )
    ) {

      inAggregateSummary =
        false;
    }


    if (
      inAggregateSummary &&
      !section
    ) {

      continue;
    }


    if (
      !hasNumericCell_(
        displayRow,
        valueRow,
        8
      )
    ) {

      continue;
    }


    const audit =
      manualInventoryAuditValue_(
        displayRow,
        valueRow,
        formulaRow,
        DASHBOARD_CONFIG
          .INVENTORY_AUDIT_COL - 1
      );


    if (!audit.hasValue) {
      continue;
    }


    cells.push(
      columnNumberToLetter_(
        DASHBOARD_CONFIG
          .INVENTORY_AUDIT_COL
      ) +
      rowNum
    );
  }


  return {
    count:
      cells.length,

    cells:
      cells
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
 * 행에서 날짜 찾기
 ***************************************************************/

function getDateFromRow_(
  valueRow,
  displayRow
) {

  const cells = [];


  /*
   * Google Sheets 날짜는 스프레드시트 시간대의 달력값이다.
   * Apps Script 프로젝트 시간대가 다르면 getValues()의 Date를 먼저
   * 해석할 때 전날/다음 날로 이동할 수 있으므로 표시값을 우선한다.
   */
  if (displayRow) {

    displayRow
      .slice(
        0,
        DASHBOARD_CONFIG.MAX_DATA_COLS
      )
      .forEach(
        function(value) {

          cells.push(
            value
          );
        }
      );
  }


  if (valueRow) {

    valueRow
      .slice(
        0,
        DASHBOARD_CONFIG.MAX_DATA_COLS
      )
      .forEach(
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


  const yearFirst =
    text.match(
      /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/
    );


  if (yearFirst) {

    return createValidatedCalendarDate_(
      Number(yearFirst[1]),
      Number(yearFirst[2]),
      Number(yearFirst[3])
    );
  }


  const dayFirst =
    text.match(
      /(?:^|\D)(\d{1,2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(20\d{2})(?:\D|$)/
    );


  if (dayFirst) {

    return createValidatedCalendarDate_(
      Number(dayFirst[3]),
      Number(dayFirst[2]),
      Number(dayFirst[1])
    );
  }


  return null;
}


function createValidatedCalendarDate_(
  year,
  month,
  day
) {

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 2000 ||
    year > 2099 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {

    return null;
  }


  const date =
    new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0,
      0
    );


  if (
    isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {

    return null;
  }


  return date;
}


/***************************************************************
 * 돈사/돈방별 비정기 실사보정
 *
 * J열에 실사두수가 있는 상세행은 그 날짜의 확정 재고다.
 * 보정 차이는 같은 돈사/돈방의 다음 실사일까지 승계한다.
 * 원본 시트는 변경하지 않고 연동용 A:I 출력만 보정한다.
 ***************************************************************/

function applyInventoryAuditAdjustments_(
  monthlyAnalyses
) {

  const analyses =
    monthlyAnalyses ||
    [];


  const chronologicalBlocks = [];


  analyses.forEach(
    function(info, analysisIndex) {

      info.outputValues =
        (info.scan.values || [])
          .map(
            function(row) {

              return row.slice(
                0,
                DASHBOARD_CONFIG.MAX_DATA_COLS
              );
            }
          );


      (info.allBlocks || info.validBlocks || [])
        .forEach(
          function(block, blockIndex) {

            chronologicalBlocks.push({
              info:
                info,
              block:
                block,
              resetDetailedOffsets:
                Boolean(
                  analysisIndex > 0 &&
                  blockIndex === 0
                )
            });
          }
        );
    }
  );


  chronologicalBlocks.sort(
    function(a, b) {

      const dateDiff =
        a.block.date.getTime() -
        b.block.date.getTime();


      if (dateDiff !== 0) {
        return dateDiff;
      }


      return (
        a.info.monthIndex -
        b.info.monthIndex
      );
    }
  );


  const entityStates =
    new Map();


  chronologicalBlocks.forEach(
    function(item) {

      if (item.resetDetailedOffsets) {
        entityStates.clear();
      }

      applyInventoryAuditToBlock_(
        item.info,
        item.block,
        entityStates
      );
    }
  );


  analyses.forEach(
    function(info) {

      const adjustedValues =
        (info.scan.values || [])
          .map(
            function(sourceRow, index) {

              const row =
                sourceRow.slice();


              const outputRow =
                info.outputValues[index] ||
                [];


              for (
                let col = 0;
                col <
                  DASHBOARD_CONFIG.MAX_DATA_COLS;
                col++
              ) {

                row[col] =
                  outputRow[col];
              }


              return row;
            }
          );


      info.adjustedScan = {
        lastRow:
          info.scan.lastRow,

        values:
          adjustedValues,

        displayValues:
          info.scan.displayValues,

        formulas:
          info.scan.formulas
      };
    }
  );
}


function applyInventoryAuditToBlock_(
  info,
  block,
  entityStates
) {

  let currentSection =
    "";


  const occurrenceMap =
    new Map();


  const sectionPreviousDeltas =
    new Map();


  const sectionCurrentDeltas =
    new Map();


  const groupPreviousDeltas =
    new Map();


  const groupCurrentDeltas =
    new Map();


  let inAggregateSummary =
    false;


  let grandPreviousDelta =
    0;


  let grandCurrentDelta =
    0;


  block.appliedInventoryAudits =
    [];


  for (
    let rowNum =
      block.dateBlockStartRow;

    rowNum <=
      block.copyEndRow;

    rowNum++
  ) {

    const valueRow =
      info.scan.values[
        rowNum - 1
      ];


    const displayRow =
      info.scan.displayValues[
        rowNum - 1
      ];


    const formulaRow =
      info.scan.formulas[
        rowNum - 1
      ];


    const outputRow =
      info.outputValues[
        rowNum - 1
      ];


    if (
      !valueRow ||
      !displayRow ||
      !formulaRow ||
      !outputRow
    ) {

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

      inAggregateSummary =
        false;

      currentSection =
        section;
    }


    if (
      isGrandTotalLabel_(section) ||
      isGrandTotalLabel_(sub)
    ) {

      applyDeltaToOutputCell_(
        outputRow,
        displayRow,
        valueRow,
        3,
        grandPreviousDelta
      );


      applyDeltaToOutputCell_(
        outputRow,
        displayRow,
        valueRow,
        8,
        grandCurrentDelta
      );


      continue;
    }


    if (
      isSubTotalLabel_(section) ||
      isSubTotalLabel_(sub)
    ) {

      const sectionKey =
        normalizeEntityText_(
          currentSection
        );


      const groupKey =
        classifyInventoryGroup_(
          currentSection,
          section,
          sub
        );


      const previousDelta =
        groupKey !== "other"
          ? Number(
              groupPreviousDeltas.get(
                groupKey
              ) || 0
            )
          : Number(
              sectionPreviousDeltas.get(
                sectionKey
              ) || 0
            );


      const currentDelta =
        groupKey !== "other"
          ? Number(
              groupCurrentDeltas.get(
                groupKey
              ) || 0
            )
          : Number(
              sectionCurrentDeltas.get(
                sectionKey
              ) || 0
            );


      applyDeltaToOutputCell_(
        outputRow,
        displayRow,
        valueRow,
        3,
        previousDelta
      );


      applyDeltaToOutputCell_(
        outputRow,
        displayRow,
        valueRow,
        8,
        currentDelta
      );


      inAggregateSummary =
        true;


      continue;
    }


    if (
      inAggregateSummary &&
      !section &&
      hasNumericCell_(
        displayRow,
        valueRow,
        8
      )
    ) {

      const groupKey =
        classifyInventoryGroup_(
          currentSection,
          section,
          sub
        );


      if (groupKey !== "other") {

        applyDeltaToOutputCell_(
          outputRow,
          displayRow,
          valueRow,
          3,
          Number(
            groupPreviousDeltas.get(
              groupKey
            ) || 0
          )
        );


        applyDeltaToOutputCell_(
          outputRow,
          displayRow,
          valueRow,
          8,
          Number(
            groupCurrentDeltas.get(
              groupKey
            ) || 0
          )
        );
      }


      continue;
    }


    if (
      !hasNumericCell_(
        displayRow,
        valueRow,
        8
      )
    ) {

      continue;
    }


    const sectionKey =
      normalizeEntityText_(
        currentSection
      );


    const subKey =
      normalizeEntityText_(
        sub
      );


    if (
      !sectionKey &&
      !subKey
    ) {

      continue;
    }


    const baseKey =
      sectionKey +
      "|" +
      subKey;


    const occurrence =
      Number(
        occurrenceMap.get(
          baseKey
        ) || 0
      ) +
      1;


    occurrenceMap.set(
      baseKey,
      occurrence
    );


    const entityKey =
      baseKey +
      "#" +
      occurrence;


    const groupKey =
      classifyInventoryGroup_(
        currentSection,
        section,
        sub
      );


    const state =
      entityStates.get(
        entityKey
      ) ||
      {
        offset:
          0
      };


    const rawPrevious =
      cellNumber_(
        displayRow,
        valueRow,
        3
      );


    const rawCurrent =
      cellNumber_(
        displayRow,
        valueRow,
        8
      );


    const previousOffset =
      Number(
        state.offset || 0
      );


    const adjustedPrevious =
      rawPrevious +
      previousOffset;


    const audit =
      manualInventoryAuditValue_(
        displayRow,
        valueRow,
        formulaRow,
        DASHBOARD_CONFIG
          .INVENTORY_AUDIT_COL - 1
      );


    let adjustedCurrent =
      rawCurrent +
      previousOffset;


    let currentOffset =
      previousOffset;


    if (audit.hasValue) {

      adjustedCurrent =
        audit.value;


      currentOffset =
        adjustedCurrent -
        rawCurrent;


      block.appliedInventoryAudits.push({
        cell:
          columnNumberToLetter_(
            DASHBOARD_CONFIG
              .INVENTORY_AUDIT_COL
          ) +
          rowNum,

        entityKey:
          entityKey,

        groupAuditKey:
          classifyGroupInventoryTargetKey_(
            currentSection,
            section,
            sub
          ),

        previousCalculated:
          rawCurrent +
          previousOffset,

        actual:
          adjustedCurrent,

        correction:
          adjustedCurrent -
          (
            rawCurrent +
            previousOffset
          )
      });
    }


    outputRow[3] =
      adjustedPrevious;


    outputRow[8] =
      adjustedCurrent;


    const previousDelta =
      adjustedPrevious -
      rawPrevious;


    const currentDelta =
      adjustedCurrent -
      rawCurrent;


    sectionPreviousDeltas.set(
      sectionKey,
      Number(
        sectionPreviousDeltas.get(
          sectionKey
        ) || 0
      ) +
      previousDelta
    );


    sectionCurrentDeltas.set(
      sectionKey,
      Number(
        sectionCurrentDeltas.get(
          sectionKey
        ) || 0
      ) +
      currentDelta
    );


    groupPreviousDeltas.set(
      groupKey,
      Number(
        groupPreviousDeltas.get(
          groupKey
        ) || 0
      ) +
      previousDelta
    );


    groupCurrentDeltas.set(
      groupKey,
      Number(
        groupCurrentDeltas.get(
          groupKey
        ) || 0
      ) +
      currentDelta
    );


    grandPreviousDelta +=
      previousDelta;


    grandCurrentDelta +=
      currentDelta;


    state.offset =
      currentOffset;


    entityStates.set(
      entityKey,
      state
    );
  }
}


function applyDeltaToOutputCell_(
  outputRow,
  displayRow,
  valueRow,
  zeroBasedCol,
  delta
) {

  if (
    !delta ||
    !hasNumericCell_(
      displayRow,
      valueRow,
      zeroBasedCol
    )
  ) {

    return;
  }


  outputRow[
    zeroBasedCol
  ] =
    cellNumber_(
      displayRow,
      valueRow,
      zeroBasedCol
    ) +
    delta;
}


function normalizeEntityText_(value) {

  return normalizeText_(
    value
  );
}


function classifyInventoryGroup_(
  currentSection,
  section,
  sub
) {

  const text =
    [
      currentSection,
      section,
      sub
    ]
      .map(
        normalizeEntityText_
      )
      .join(" ");


  if (
    text.indexOf(
      "поросята-сосуны"
    ) !== -1 ||
    text.indexOf(
      "поросята сосуны"
    ) !== -1
  ) {

    return "suckling";
  }


  if (
    text.indexOf(
      "свиномат"
    ) !== -1 ||
    text.indexOf(
      "свино маток"
    ) !== -1 ||
    text.indexOf(
      "супорос"
    ) !== -1 ||
    text.indexOf(
      "лактир"
    ) !== -1 ||
    text.indexOf(
      "холост"
    ) !== -1
  ) {

    return "sow";
  }


  if (
    text.indexOf(
      "отъем"
    ) !== -1 ||
    text.indexOf(
      "отъём"
    ) !== -1
  ) {

    return "weaned";
  }


  if (
    text.indexOf(
      "доращ"
    ) !== -1
  ) {

    return "growing";
  }


  if (
    text.indexOf(
      "откорм"
    ) !== -1
  ) {

    return "fattening";
  }


  return "other";
}


/***************************************************************
 * 구분 합계 실사 입력 읽기/검증
 ***************************************************************/

function readGroupInventoryAuditRecords_(ss) {

  const sheet = ss.getSheetByName(GROUP_INVENTORY_AUDIT_CONFIG.SHEET_NAME);
  const firstDataRow = GROUP_INVENTORY_AUDIT_CONFIG.FIRST_DATA_ROW;

  if (!sheet) {
    return { sheet: null, firstDataRow: firstDataRow, rowCount: 0, records: [] };
  }

  const rowCount = Math.max(0, sheet.getLastRow() - firstDataRow + 1);
  if (!rowCount) {
    return { sheet: sheet, firstDataRow: firstDataRow, rowCount: 0, records: [] };
  }

  const inputRange = sheet.getRange(
    firstDataRow,
    1,
    rowCount,
    GROUP_INVENTORY_AUDIT_CONFIG.COLUMN_COUNT
  );
  const rows = inputRange.getValues();
  const displayRows = inputRange.getDisplayValues();
  const formulas = inputRange.getFormulas();
  const records = [];

  rows.forEach(function(row, index) {
    if (!groupAuditRowHasData_(row)) return;

    const formulaRow = formulas[index] || [];
    const record = {
      rowNum: firstDataRow + index,
      sourceRow: row,
      date: null,
      dateKey: "",
      groupValues: null,
      expectedTotal: null,
      status: String(
        row[
          GROUP_INVENTORY_AUDIT_CONFIG.COL.STATUS - 1
        ] ||
        ""
      ),
      canApply: true,
      matchedInfo: null,
      matchedBlock: null,
      applied: false
    };
    if (formulaRow[GROUP_INVENTORY_AUDIT_CONFIG.COL.AUDIT_DATE - 1]) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "дата инвентаризации не должна быть формулой");
      records.push(record);
      return;
    }
    const displayRow = displayRows[index] || [];
    const parsedDate =
      parseDateFromCell_(
        displayRow[
          GROUP_INVENTORY_AUDIT_CONFIG.COL.AUDIT_DATE - 1
        ]
      ) ||
      parseDateFromCell_(
        row[
          GROUP_INVENTORY_AUDIT_CONFIG.COL.AUDIT_DATE - 1
        ]
      );
    if (!parsedDate) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "не указана корректная дата инвентаризации");
      records.push(record);
      return;
    }
    record.date = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    record.dateKey = dateKey_(record.date);

    const c = GROUP_INVENTORY_AUDIT_CONFIG.COL;
    const fields = {
      sowMain: readGroupAuditInteger_(row[c.SOW_MAIN - 1], formulaRow[c.SOW_MAIN - 1]),
      sowFarrowing: readGroupAuditInteger_(row[c.SOW_FARROWING - 1], formulaRow[c.SOW_FARROWING - 1]),
      suckling: readGroupAuditInteger_(row[c.SUCKLING - 1], formulaRow[c.SUCKLING - 1]),
      weaned: readGroupAuditInteger_(row[c.WEANED - 1], formulaRow[c.WEANED - 1]),
      growing: readGroupAuditInteger_(row[c.GROWING - 1], formulaRow[c.GROWING - 1]),
      fatteningOld: readGroupAuditInteger_(row[c.FATTENING_OLD - 1], formulaRow[c.FATTENING_OLD - 1]),
      fatteningNew: readGroupAuditInteger_(row[c.FATTENING_NEW - 1], formulaRow[c.FATTENING_NEW - 1]),
      replacementGilts: readGroupAuditInteger_(row[c.REPLACEMENT_GILTS - 1], formulaRow[c.REPLACEMENT_GILTS - 1]),
      culledSows: readGroupAuditInteger_(row[c.CULLED_SOWS - 1], formulaRow[c.CULLED_SOWS - 1]),
      boars: readGroupAuditInteger_(row[c.BOARS - 1], formulaRow[c.BOARS - 1])
    };

    if (Object.keys(fields).some(function(key) { return !fields[key].valid; })) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "количество должно быть целым числом 0 или больше");
      records.push(record);
      return;
    }

    const required = ["sowMain", "sowFarrowing", "suckling", "weaned", "growing", "fatteningOld", "fatteningNew"];
    if (required.some(function(key) { return !fields[key].present; })) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "не заполнены все обязательные категории");
      records.push(record);
      return;
    }

    if ([fields.replacementGilts, fields.culledSows, fields.boars].some(function(item) {
      return item.present && item.value > 0;
    })) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.NEEDS_CLARIFICATION, "требуется указать, куда включить ремонтных свинок, выбракованных свиноматок или хряков");
      records.push(record);
      return;
    }

    const sowTotal = fields.sowMain.value + fields.sowFarrowing.value;
    const groupValues = {
      sow: sowTotal,
      suckling: fields.suckling.value,
      weaned: fields.weaned.value,
      growing: fields.growing.value,
      fattening_old: fields.fatteningOld.value,
      fattening_new: fields.fatteningNew.value
    };
    const expectedTotal = GROUP_INVENTORY_AUDIT_CONFIG.GROUP_KEYS.reduce(function(sum, key) {
      return sum + Number(groupValues[key] || 0);
    }, 0);
    const displayedSowTotal = readGroupAuditInteger_(row[c.SOW_TOTAL - 1]);
    const displayedTotal = readGroupAuditInteger_(row[c.AUDIT_TOTAL - 1]);
    if (displayedSowTotal.present && (!displayedSowTotal.valid || displayedSowTotal.value !== sowTotal)) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "итог по свиноматкам не совпадает с двумя исходными графами");
      records.push(record);
      return;
    }
    if (displayedTotal.present && (!displayedTotal.valid || displayedTotal.value !== expectedTotal)) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "общий итог не совпадает с суммой категорий");
      records.push(record);
      return;
    }
    record.groupValues = groupValues;
    record.expectedTotal = expectedTotal;
    records.push(record);
  });

  const recordsByDate = new Map();
  records.filter(function(record) { return record.canApply && record.dateKey; }).forEach(function(record) {
    const sameDate = recordsByDate.get(record.dateKey) || [];
    sameDate.push(record);
    recordsByDate.set(record.dateKey, sameDate);
  });
  recordsByDate.forEach(function(sameDate) {
    if (sameDate.length < 2) return;
    sameDate.forEach(function(record) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "дублируется дата инвентаризации");
    });
  });

  return { sheet: sheet, firstDataRow: firstDataRow, rowCount: rowCount, records: records };
}


function groupAuditRowHasData_(row) {
  const c = GROUP_INVENTORY_AUDIT_CONFIG.COL;
  return [c.AUDIT_DATE, c.SOW_MAIN, c.SOW_FARROWING, c.SUCKLING, c.WEANED,
    c.GROWING, c.FATTENING_OLD, c.FATTENING_NEW, c.REPLACEMENT_GILTS,
    c.CULLED_SOWS, c.BOARS, c.NOTE].some(function(oneBasedCol) {
      const value = row[oneBasedCol - 1];
      return !(value === "" || value === null || value === undefined);
    });
}


function readGroupAuditInteger_(value, formula) {
  if (formula) {
    return { present: true, valid: false, value: null };
  }
  if (value === "" || value === null || value === undefined) {
    return { present: false, valid: true, value: null };
  }
  const normalized = typeof value === "number" ? value : Number(String(value)
    .replace(/\u00A0/g, "").replace(/\s/g, "").replace(/,/g, "."));
  const valid = Number.isFinite(normalized) && normalized >= 0 && Number.isInteger(normalized);
  return { present: true, valid: valid, value: valid ? normalized : null };
}


function setGroupAuditRecordStatus_(record, status, detail) {
  record.canApply = status === GROUP_INVENTORY_AUDIT_CONFIG.STATUS.APPLIED;
  record.status = detail ? status + ": " + detail : status;
}


/***************************************************************
 * 구분 합계 실사일과 월작업일지 블록 연결
 ***************************************************************/

function matchGroupInventoryAuditsToBlocks_(analyses, records) {
  const analysisYears = new Set(
    (analyses || []).map(function(info) {
      return Number(info && info.year);
    })
  );

  (records || []).forEach(function(record) {
    if (!record.canApply || !record.date) return;

    if (!analysisYears.has(record.date.getFullYear())) {
      return;
    }

    const info = (analyses || []).filter(function(item) {
      return item &&
        item.year === record.date.getFullYear() &&
        item.monthIndex === record.date.getMonth() + 1;
    })[0] || null;
    if (!info) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.NOT_APPLIED, "нет листа месячного журнала");
      return;
    }
    const block = (info.allBlocks || []).filter(function(item) {
      return item && item.date && dateKey_(item.date) === record.dateKey;
    })[0] || null;
    if (!block) {
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR, "в месячном журнале нет блока указанной даты");
      return;
    }
    record.matchedInfo = info;
    record.matchedBlock = block;
    block.groupInventoryAuditRecord = record;
  });
}


/***************************************************************
 * 구분 합계 실사보정
 * 상세행에는 차이를 배분하지 않고 대표행과 ВСЕГО만 보정한다.
 ***************************************************************/

// Residual state is replayed from audit history, including prior-year carry context.
// It is never copied into a room's D/I cell or divided among rooms.
function applyGroupInventoryAuditAdjustments_(analyses, records) {
  const keys = GROUP_INVENTORY_AUDIT_CONFIG.GROUP_KEYS;
  const chronological = [];
  (analyses || []).forEach(function(info, analysisIndex) {
    info.reportingOutputValues = info.outputValues.map(function(row) { return row.slice(); });
    info.groupInventoryAuditCount = 0;
    (info.allBlocks || []).forEach(function(block, blockIndex) {
      block.appliedGroupInventoryAudits = [];
      block.officialGroupStocks = null;
      chronological.push({info: info, block: block,
        reset: Boolean(MONTHLY_SHEET_CREATION_CONFIG.LEGACY_MANUAL_MONTH_START_REBASE &&
          !info.autoGenerated && analysisIndex > 0 && blockIndex === 0)});
    });
  });
  chronological.sort(function(a, b) { return a.block.date - b.block.date; });
  const states = new Map();
  chronological.forEach(function(item) {
    const info = item.info, block = item.block;
    if (item.reset) states.clear();
    // A template-only date is not an inventory event. Keep month-start rebase
    // above, but do not inspect its room topology or consume residual coverage.
    // A valid group audit alone must still be processed and activate the date.
    const pendingRecord = block.groupInventoryAuditRecord;
    if (!block.hasValidInput && !(pendingRecord && pendingRecord.canApply && pendingRecord.groupValues)) return;
    const entities = collectInventoryEntityRows_(info.adjustedScan || info.scan, block, true);
    const byGroup = {};
    keys.forEach(function(key) { byGroup[key] = entities.filter(function(e) { return e.groupAuditKey === key; }); });
    const audited = new Set((block.appliedInventoryAudits || []).map(function(a) { return a.entityKey; }));
    const targets = findGroupInventoryTargetRows_(info.scan, block);
    const record = block.groupInventoryAuditRecord;
    let applyRecord = Boolean(record && record.canApply && record.groupValues);
    if (applyRecord) {
      const missing = keys.filter(function(key) { return !byGroup[key].length; });
      const conflicts = keys.filter(function(key) {
        const members = byGroup[key];
        return members.length && members.every(function(e) { return audited.has(e.key); }) &&
          members.reduce(function(sum, e) { return sum + e.currentStock; }, 0) !== record.groupValues[key];
      });
      if (missing.length || conflicts.length || !targets.grandTotalRow) {
        setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.DATA_ERROR,
          conflicts.length ? 'конфликт полной инвентаризации J и итога группы: ' + conflicts.join(', ') :
          'не найдены подробные помещения всех групп или ВСЕГО: ' + missing.join(', '));
        applyRecord = false;
      }
    }
    if (applyRecord) activateGroupAuditBlock_(info, block);
    const official = {};
    let previousResidual = 0, currentResidual = 0;
    keys.forEach(function(key) {
      const members = byGroup[key];
      const memberKeys = new Set(members.map(function(e) { return e.key; }));
      const detailPrevious = members.reduce(function(sum, e) {
        const idx = e.rowNum - 1;
        return sum + cellNumber_(info.scan.displayValues[idx], info.outputValues[idx], 3);
      }, 0);
      const detailCurrent = members.reduce(function(sum, e) { return sum + e.currentStock; }, 0);
      let state = states.get(key);
      const before = state ? state.offset : 0;
      // A changed room identity cannot be resolved by guessing its share.
      if (state && state.offset !== 0 && !applyRecord &&
          (state.members.size !== memberKeys.size || Array.from(state.members).some(function(k) { return !memberKeys.has(k); }))) {
        throw new Error('그룹 잔차가 남아 있는 돈방 구조가 변경되었습니다: ' + key + ' / ' + dateKey_(block.date));
      }
      if (state) {
        audited.forEach(function(k) { state.pending.delete(k); });
        if (!state.pending.size) state.offset = 0;
      }
      if (applyRecord) {
        state = {offset: Number(record.groupValues[key]) - detailCurrent,
          members: memberKeys,
          pending: new Set(members.filter(function(e) { return !audited.has(e.key); }).map(function(e) { return e.key; })),
          auditDate: dateKey_(block.date)};
        if (!state.pending.size) state.offset = 0; // full same-day J already checked above
        states.set(key, state);
        block.appliedGroupInventoryAudits.push({groupKey: key, rowNum: targets.groups[key] || null,
          previousCalculated: detailCurrent + before, actual: Number(record.groupValues[key]),
          correction: Number(record.groupValues[key]) - (detailCurrent + before), carriedOffset: state.offset});
      }
      const residual = state ? state.offset : 0;
      official[key] = {previous: detailPrevious + before, current: detailCurrent + residual,
        detailPrevious: detailPrevious, detailCurrent: detailCurrent, residual: residual,
        pendingKeys: state ? Array.from(state.pending) : [], count: members.length,
        auditDate: state ? state.auditDate : ''};
      previousResidual += before;
      currentResidual += residual;
      // Only genuine summary rows may receive a group value. A single-room
      // row can also be an old "group target"; it MUST remain its J-adjusted value.
      const target = targets.groups[key];
      if (state && target && !entities.some(function(e) { return e.rowNum === target; })) {
        const row = info.reportingOutputValues[target - 1];
        row[3] = official[key].previous;
        row[8] = official[key].current;
      }
    });
    block.officialGroupStocks = official;
    block.groupResidualState = keys.map(function(key) {
      const g = official[key];
      return {groupKey: key, residual: g.residual, pendingKeys: g.pendingKeys.slice(), auditDate: g.auditDate};
    });
    if (targets.grandTotalRow && (previousResidual || currentResidual)) {
      const idx = targets.grandTotalRow - 1;
      const row = info.reportingOutputValues[idx];
      row[3] = cellNumber_(info.scan.displayValues[idx], info.outputValues[idx], 3) + previousResidual;
      row[8] = cellNumber_(info.scan.displayValues[idx], info.outputValues[idx], 8) + currentResidual;
    }
    if (applyRecord) {
      record.applied = true;
      info.groupInventoryAuditCount++;
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.APPLIED, formatDateForDisplay_(record.date));
    }
  });
  (analyses || []).forEach(function(info) {
    info.reportingScan = {lastRow: info.scan.lastRow,
      values: info.scan.values.map(function(row, i) {
        const copy = row.slice();
        for (let col = 0; col < DASHBOARD_CONFIG.MAX_DATA_COLS; col++) copy[col] = info.reportingOutputValues[i][col];
        return copy;
      }), displayValues: info.scan.displayValues, formulas: info.scan.formulas};
  });
  (records || []).forEach(function(record) {
    if (record.canApply && record.matchedBlock && !record.applied && !record.status)
      setGroupAuditRecordStatus_(record, GROUP_INVENTORY_AUDIT_CONFIG.STATUS.NOT_APPLIED, 'запись не была обработана');
  });
}

// Explicit presentation contract. Fattening aggregation belongs to GS, not HTML.
function buildOfficialGroupStockMetadata_(latestInfo) {
  const block = latestInfo && (latestInfo.validBlocks || []).slice(-1)[0];
  if (!block || !block.officialGroupStocks) return [];
  const stocks = block.officialGroupStocks;
  const mappings = [['sow'], ['suckling'], ['weaned'], ['growing'], ['fattening_old', 'fattening_new']];
  return mappings.map(function(parts) {
    const gs = parts.map(function(key) { return stocks[key]; });
    const sum = function(field) { return gs.reduce(function(n, g) { return n + g[field]; }, 0); };
    return [parts.length === 2 ? 'fattening' : parts[0], sum('previous'), sum('current'),
      sum('detailPrevious'), sum('detailCurrent'), sum('residual'),
      gs.reduce(function(n, g) { return n + g.pendingKeys.length; }, 0), sum('count')];
  });
}

function activateGroupAuditBlock_(info, block) {
  if (!(info.validBlocks || []).some(function(item) { return item === block; })) info.validBlocks.push(block);
  block.hasValidInput = true;
  info.validBlocks.sort(function(a, b) { return a.date.getTime() - b.date.getTime(); });
  info.hasValidInput = info.validBlocks.length > 0;
  info.validCount = info.validBlocks.length;
  const latest = info.validBlocks[info.validBlocks.length - 1];
  if (!latest) return;
  info.dateBlockStartRow = latest.dateBlockStartRow;
  info.nextDateRow = latest.nextDateRow;
  info.copyEndRow = latest.copyEndRow;
  info.latestDate = latest.date;
  info.matchedAnchorCount = latest.matchedAnchorCount;
  info.inputAnchorCount = latest.inputAnchorCount;
  info.missingAnchors = latest.missingAnchors;
}


function findGroupInventoryTargetRows_(scan, block) {
  const candidates = {};
  GROUP_INVENTORY_AUDIT_CONFIG.GROUP_KEYS.forEach(function(key) { candidates[key] = []; });
  const grandTotalCandidates = [];
  let currentSection = "";
  let inAggregateSummary = false;

  for (let rowNum = block.dateBlockStartRow; rowNum <= block.copyEndRow; rowNum++) {
    const valueRow = scan.values[rowNum - 1];
    const displayRow = scan.displayValues[rowNum - 1];
    if (!valueRow || !displayRow) continue;
    const section = cellText_(displayRow, valueRow, 0);
    const sub = cellText_(displayRow, valueRow, 2);
    if (section && !isAnyTotalLabel_(section)) {
      currentSection = section;
      inAggregateSummary = false;
    }
    if (isGrandTotalLabel_(section) || isGrandTotalLabel_(sub)) {
      grandTotalCandidates.push(rowNum);
      continue;
    }
    if (isSubTotalLabel_(section) || isSubTotalLabel_(sub)) {
      if (classifyGroupInventoryTargetKey_(currentSection, section, sub) === "sow") candidates.sow.push(rowNum);
      inAggregateSummary = true;
      continue;
    }
    if (inAggregateSummary && !section) {
      if (classifyGroupInventoryTargetKey_(currentSection, section, sub) === "suckling") candidates.suckling.push(rowNum);
      continue;
    }
    const key = classifyGroupInventoryTargetKey_(currentSection, section, sub);
    if (["weaned", "growing", "fattening_old", "fattening_new"].indexOf(key) !== -1 && Boolean(section) && hasNumericCell_(displayRow, valueRow, 8)) {
      candidates[key].push(rowNum);
    }
  }

  const groups = {};
  GROUP_INVENTORY_AUDIT_CONFIG.GROUP_KEYS.forEach(function(key) {
    if (candidates[key].length === 1) groups[key] = candidates[key][0];
  });
  return {
    groups: groups,
    grandTotalRow: grandTotalCandidates.length === 1 ? grandTotalCandidates[0] : null,
    ambiguousKeys: GROUP_INVENTORY_AUDIT_CONFIG.GROUP_KEYS.filter(function(key) { return candidates[key].length > 1; }),
    grandTotalCandidateCount: grandTotalCandidates.length
  };
}


function classifyGroupInventoryTargetKey_(currentSection, section, sub) {
  const sectionText = normalizeEntityText_(section || currentSection);
  const subText = normalizeEntityText_(sub);
  const text = sectionText + " " + subText;
  if (text.indexOf("поросята-сосуны") !== -1 || text.indexOf("поросята сосуны") !== -1) return "suckling";
  if (sectionText.indexOf("отъем поросята") !== -1 || sectionText.indexOf("отъём поросята") !== -1) return "weaned";
  if (sectionText.indexOf("доращ") !== -1) return "growing";
  if (sectionText.indexOf("откорм ст") !== -1 || sectionText.indexOf("откорм стар") !== -1) return "fattening_old";
  if (sectionText.indexOf("откорм нов") !== -1) return "fattening_new";
  if (text.indexOf("свиномат") !== -1 || text.indexOf("свино маток") !== -1 || text.indexOf("супорос") !== -1 || text.indexOf("лактир") !== -1) return "sow";
  return "";
}


function writeGroupInventoryAuditStatuses_(context) {
  if (!context || !context.sheet || !context.rowCount) return;
  const statuses = Array.from({ length: context.rowCount }, function() { return [""]; });
  (context.records || []).forEach(function(record) {
    const index = record.rowNum - context.firstDataRow;
    if (index >= 0 && index < statuses.length) {
      statuses[index][0] = record.status || GROUP_INVENTORY_AUDIT_CONFIG.STATUS.NOT_APPLIED;
    }
  });
  context.sheet.getRange(context.firstDataRow, GROUP_INVENTORY_AUDIT_CONFIG.COL.STATUS, context.rowCount, 1).setValues(statuses);
}


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


function ensureGroupInventoryAuditSheet_(ss, seedInitialData) {
  let sheet = ss.getSheetByName(GROUP_INVENTORY_AUDIT_CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(GROUP_INVENTORY_AUDIT_CONFIG.SHEET_NAME);
  ensureRows_(sheet, GROUP_INVENTORY_AUDIT_CONFIG.MANAGED_ROWS);
  ensureColumns_(sheet, GROUP_INVENTORY_AUDIT_CONFIG.COLUMN_COUNT);
  configureGroupInventoryAuditSheet_(sheet);
  return {
    sheet: sheet,
    seeded: seedInitialData ? seedInitialGroupInventoryAuditData_(sheet) : false
  };
}


function configureGroupInventoryAuditSheet_(sheet) {
  const c = GROUP_INVENTORY_AUDIT_CONFIG.COL;
  const firstDataRow = GROUP_INVENTORY_AUDIT_CONFIG.FIRST_DATA_ROW;
  const dataRowCount = GROUP_INVENTORY_AUDIT_CONFIG.MANAGED_ROWS - firstDataRow + 1;
  const headers = [[
    "Дата инвентаризации", "Отчётный месяц", "Свиноматки",
    "Свиноматки в родильном отделении", "Всего свиноматок", "Поросята-сосуны",
    "Отъём", "Доращивание", "Откорм ст.", "Откорм нов.", "Ремонтные свинки",
    "Свиноматки (выбраковка)", "Хряки", "Итого по инвентаризации",
    "Статус применения", "Примечание"
  ]];
  const notes = [[
    "Укажите фактическую дату инвентаризации. Если дата неизвестна, используется последний календарный день месяца.",
    "Заполняется автоматически по дате инвентаризации.",
    "Поголовье свиноматок вне родильного отделения.",
    "Поголовье свиноматок в родильном отделении.",
    "Автоматическая сумма двух граф по свиноматкам.",
    "Общее количество поросят-сосунов.",
    "Общее количество поросят на отъёме.",
    "Общее количество на доращивании.",
    "Общее количество в старом откормочном отделении.",
    "Общее количество в новом откормочном отделении.",
    "При наличии значения требуется указание, в какую категорию его включить.",
    "При наличии значения требуется указание, в какую категорию его включить.",
    "При наличии значения требуется указание, в какую категорию его включить.",
    "Автоматическая проверочная сумма всех исходных категорий.",
    "Заполняется автоматически. Не редактировать.",
    "Укажите источник, уточнение категории или другую необходимую информацию."
  ]];
  sheet.getRange(1, 1, 1, GROUP_INVENTORY_AUDIT_CONFIG.COLUMN_COUNT)
    .setValues(headers).setNotes(notes).setBackground("#274e13")
    .setFontColor("#ffffff").setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);

  function formulas(formula) {
    return Array.from({ length: dataRowCount }, function() { return [formula]; });
  }
  sheet.getRange(firstDataRow, c.REPORTING_MONTH, dataRowCount, 1)
    .setFormulasR1C1(formulas('=IF(RC[-1]="","",TEXT(RC[-1],"yyyy-mm"))'));
  sheet.getRange(firstDataRow, c.SOW_TOTAL, dataRowCount, 1)
    .setFormulasR1C1(formulas('=IF(COUNTA(RC[-2]:RC[-1])=0,"",SUM(RC[-2]:RC[-1]))'));
  sheet.getRange(firstDataRow, c.AUDIT_TOTAL, dataRowCount, 1)
    .setFormulasR1C1(formulas('=IF(COUNTA(RC[-11]:RC[-10],RC[-8]:RC[-1])=0,"",SUM(RC[-11]:RC[-10],RC[-8]:RC[-1]))'));

  const numberValidation = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false)
    .setHelpText("Введите целое количество голов 0 или больше.").build();
  const dateValidation = SpreadsheetApp.newDataValidation().requireDate()
    .setAllowInvalid(false).setHelpText("Введите дату фактической инвентаризации.").build();
  sheet.getRange(firstDataRow, c.AUDIT_DATE, dataRowCount, 1)
    .setDataValidation(dateValidation).setNumberFormat("dd.MM.yyyy").setBackground("#fff2cc");
  [[c.SOW_MAIN, 2], [c.SUCKLING, 8]].forEach(function(spec) {
    sheet.getRange(firstDataRow, spec[0], dataRowCount, spec[1])
      .setDataValidation(numberValidation).setNumberFormat("0").setBackground("#fff2cc");
  });
  sheet.getRange(firstDataRow, c.NOTE, dataRowCount, 1).setBackground("#fff2cc").setWrap(true);
  [c.REPORTING_MONTH, c.SOW_TOTAL, c.AUDIT_TOTAL, c.STATUS].forEach(function(column) {
    sheet.getRange(firstDataRow, column, dataRowCount, 1).setBackground("#eeeeee");
  });
  sheet.getRange(firstDataRow, 1, dataRowCount, GROUP_INVENTORY_AUDIT_CONFIG.COLUMN_COUNT)
    .setVerticalAlignment("middle");
  sheet.setFrozenRows(1);
  sheet.setHiddenGridlines(true);
  sheet.setRowHeight(1, 42);
  [125,100,95,180,115,120,85,95,95,95,120,165,80,145,235,330].forEach(function(width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
}


function seedInitialGroupInventoryAuditData_(sheet) {
  const c = GROUP_INVENTORY_AUDIT_CONFIG.COL;
  const existing = sheet.getRange(
    GROUP_INVENTORY_AUDIT_CONFIG.FIRST_DATA_ROW,
    1,
    GROUP_INVENTORY_AUDIT_CONFIG.MANAGED_ROWS - 1,
    c.BOARS
  ).getValues();
  const inputIndexes = [0,2,3,5,6,7,8,9,10,11,12];
  if (existing.some(function(row) {
    return inputIndexes.some(function(index) {
      return !(row[index] === "" || row[index] === null || row[index] === undefined);
    });
  })) return false;

  const sourceNote = "Источник: поголовье 2026.xlsx. Точная дата не указана; применён последний календарный день месяца.";
  const rows = GROUP_INVENTORY_AUDIT_CONFIG.INITIAL_DATA.map(function(item) {
    const row = Array(GROUP_INVENTORY_AUDIT_CONFIG.COLUMN_COUNT).fill("");
    row[c.AUDIT_DATE - 1] = createSafeCalendarDate_(
      GROUP_INVENTORY_AUDIT_CONFIG.INITIAL_DATA_YEAR,
      item.month,
      0
    );
    row[c.SOW_MAIN - 1] = item.sowMain;
    row[c.SOW_FARROWING - 1] = item.sowFarrowing;
    row[c.SUCKLING - 1] = item.suckling;
    row[c.WEANED - 1] = item.weaned;
    row[c.GROWING - 1] = item.growing;
    row[c.FATTENING_OLD - 1] = item.fatteningOld;
    row[c.FATTENING_NEW - 1] = item.fatteningNew;
    row[c.NOTE - 1] = sourceNote;
    return row;
  });
  sheet.getRange(GROUP_INVENTORY_AUDIT_CONFIG.FIRST_DATA_ROW, 1, rows.length, GROUP_INVENTORY_AUDIT_CONFIG.COLUMN_COUNT).setValues(rows);
  /* setValues가 계산 열 수식을 비우므로 다시 설정한다. */
  configureGroupInventoryAuditSheet_(sheet);
  return true;
}


/***************************************************************
 * 월작업일지 J열 실사두수 입력란 설정
 *
 * 기존 J열 값은 지우지 않는다.
 * I열 서식을 J열로 복사하고 상세 재고행만 입력색을 적용한다.
 ***************************************************************/

function setupInventoryAuditInputColumn() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  let configuredSheets =
    0;


  let configuredBlocks =
    0;


  const reportingYear =
    getDashboardReportingYear_();


  DASHBOARD_CONFIG.MONTHS_RU
    .forEach(
      function(monthName, index) {

        const sheetName =
          monthName +
          " " +
          reportingYear;


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
            index + 1,
            reportingYear
          );


        const inputCells =
          [];


        (info.allBlocks || [])
          .forEach(
            function(block) {

              const rowCount =
                block.copyEndRow -
                block.dateBlockStartRow +
                1;


              if (rowCount < 1) {
                return;
              }


              sheet
                .getRange(
                  block.dateBlockStartRow,
                  9,
                  rowCount,
                  1
                )
                .copyFormatToRange(
                  sheet,
                  DASHBOARD_CONFIG
                    .INVENTORY_AUDIT_COL,
                  DASHBOARD_CONFIG
                    .INVENTORY_AUDIT_COL,
                  block.dateBlockStartRow,
                  block.copyEndRow
                );


              const headerRow =
                block.dateBlockStartRow +
                1;


              if (
                headerRow <=
                block.copyEndRow
              ) {

                sheet
                  .getRange(
                    headerRow,
                    DASHBOARD_CONFIG
                      .INVENTORY_AUDIT_COL
                  )
                  .setValue(
                    DASHBOARD_CONFIG
                      .INVENTORY_AUDIT_HEADER
                  )
                  .setNote(
                    "실사한 경우에만 실제 개체수를 0 이상의 정수로 입력합니다. " +
                    "빈칸은 실사 없음이며 숫자 0도 유효합니다."
                  );
              }


              collectInventoryAuditCandidateCells_(
                info.scan,
                block
              )
                .forEach(
                  function(cell) {
                    inputCells.push(
                      cell
                    );
                  }
                );


              configuredBlocks +=
                1;
            }
          );


        if (inputCells.length) {

          sheet
            .getRangeList(
              inputCells
            )
            .setBackground(
              "#fff2cc"
            )
            .setNumberFormat(
              "0"
            );
        }


        configuredSheets +=
          1;
      }
    );


  Logger.log(
    [
      "=== 실사두수 J열 입력란 설정 완료 ===",
      "대상 월시트: " +
        configuredSheets,
      "설정 날짜블록: " +
        configuredBlocks,
      "입력 방법: 해당 날짜의 돈사/돈방 행 J열에 실제 두수 입력",
      "주의: ИТОГО / ВСЕГО 합계행에는 입력하지 않음"
    ].join("\n")
  );
}


function collectInventoryAuditCandidateCells_(
  scan,
  block
) {

  const cells = [];


  let inAggregateSummary =
    false;


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


    if (
      !valueRow ||
      !displayRow
    ) {

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
      isSubTotalLabel_(section) ||
      isSubTotalLabel_(sub)
    ) {

      inAggregateSummary =
        true;

      continue;
    }


    if (
      isGrandTotalLabel_(section) ||
      isGrandTotalLabel_(sub)
    ) {

      continue;
    }


    if (
      section &&
      !isAnyTotalLabel_(
        section
      )
    ) {

      inAggregateSummary =
        false;
    }


    if (
      inAggregateSummary &&
      !section
    ) {

      continue;
    }


    if (
      !hasNumericCell_(
        displayRow,
        valueRow,
        8
      )
    ) {

      continue;
    }


    cells.push(
      columnNumberToLetter_(
        DASHBOARD_CONFIG
          .INVENTORY_AUDIT_COL
      ) +
      rowNum
    );
  }


  return cells;
}


/***************************************************************
 * 실사보정 진단
 ***************************************************************/

function showInventoryAuditSummary() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const monthlyAnalyses =
    collectMonthlyAnalyses_(
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


function groupInventoryAuditLabel_(groupKey) {
  const labels = {
    sow: "Всего свиноматок",
    suckling: "Поросята-сосуны",
    weaned: "Отъём",
    growing: "Доращивание",
    fattening_old: "Откорм ст.",
    fattening_new: "Откорм нов."
  };
  return labels[groupKey] || String(groupKey || "");
}


/***************************************************************
 * 유효 작업일 진단
 ***************************************************************/

function showValidationAudit() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const monthlyAnalyses =
    collectMonthlyAnalyses_(ss);


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
    collectMonthlyAnalyses_(ss);


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
    collectMonthlyAnalyses_(ss);


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
 * 숫자 셀 존재 여부
 *
 * 빈 셀과 숫자 0을 구분한다.
 ***************************************************************/

function hasNumericCell_(
  displayRow,
  valueRow,
  zeroBasedCol
) {

  let value =
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
      ? valueRow[
          zeroBasedCol
        ]
      : (
          displayRow
            ? displayRow[
                zeroBasedCol
              ]
            : ""
        );


  if (
    typeof value ===
    "number"
  ) {

    return Number.isFinite(
      value
    );
  }


  const text =
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
      .trim();


  return (
    text !== "" &&
    /^-?\d+(\.\d+)?$/
      .test(
        text
      ) &&
    Number.isFinite(
      Number(
        text
      )
    )
  );
}


/***************************************************************
 * 수식이 아닌 직접입력 숫자 읽기
 ***************************************************************/

function manualNumericValue_(
  displayRow,
  valueRow,
  formulaRow,
  zeroBasedCol
) {

  const formula =
    formulaRow &&
    formulaRow[
      zeroBasedCol
    ] !== undefined &&
    formulaRow[
      zeroBasedCol
    ] !== null
      ? String(
          formulaRow[
            zeroBasedCol
          ]
        ).trim()
      : "";


  if (formula !== "") {

    return {
      hasValue:
        false,
      value:
        null
    };
  }


  if (
    !hasNumericCell_(
      displayRow,
      valueRow,
      zeroBasedCol
    )
  ) {

    return {
      hasValue:
        false,
      value:
        null
    };
  }


  return {
    hasValue:
      true,
    value:
      cellNumber_(
        displayRow,
        valueRow,
        zeroBasedCol
      )
  };
}


/***************************************************************
 * 실사두수 직접입력 읽기
 *
 * 개체수이므로 0 이상의 정수만 유효하다.
 ***************************************************************/

function manualInventoryAuditValue_(
  displayRow,
  valueRow,
  formulaRow,
  zeroBasedCol
) {

  const result =
    manualNumericValue_(
      displayRow,
      valueRow,
      formulaRow,
      zeroBasedCol
    );


  if (
    !result.hasValue ||
    result.value < 0 ||
    !Number.isInteger(
      result.value
    )
  ) {

    return {
      hasValue:
        false,
      value:
        null
    };
  }


  return result;
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


/*
 * 메뉴·에디터·트리거 등 실행 문맥에 따라 UI 사용 가능 여부가 다르다.
 * 알림 실패가 본 작업의 성공/실패 상태를 바꾸지 않도록 단계적으로 대체한다.
 */
function notifyUserSafely_(message, title) {

  const text =
    String(
      message || ""
    );


  try {

    SpreadsheetApp
      .getUi()
      .alert(
        text
      );


    return "alert";

  } catch (uiError) {

    Logger.log(
      "UI 알림 사용 불가: " +
      uiError.message
    );
  }


  try {

    const ss =
      SpreadsheetApp
        .getActiveSpreadsheet();


    if (
      ss &&
      typeof ss.toast === "function"
    ) {

      ss.toast(
        text,
        title || "양돈장 대시보드",
        10
      );


      return "toast";
    }

  } catch (toastError) {

    Logger.log(
      "토스트 알림 사용 불가: " +
      toastError.message
    );
  }


  Logger.log(
    text
  );


  return "log";
}


/*
 * 월 1일 설치형 시간 트리거용 함수.
 * 이미 같은 이름의 월 시트가 있으면 중복 생성 없이 종료한다.
 */
function createCurrentMonthSheetOnFirstDay() {

  const now =
    new Date();


  const timeZone =
    MONTHLY_SHEET_CREATION_CONFIG
      .OPERATION_TIME_ZONE;


  const year =
    Number(
      Utilities.formatDate(
        now,
        timeZone,
        "yyyy"
      )
    );


  const month =
    Number(
      Utilities.formatDate(
        now,
        timeZone,
        "M"
      )
    );


  try {

    const result =
      createMonthlySheetForTarget_(
        year,
        month
      );


    Logger.log(
      result.message
    );

  } catch (error) {

    Logger.log(
      "=== 월 작업일지 자동생성 중단 ===\n" +
      error.message
    );

    throw error;
  }
}


function installMonthlySheetCreationTrigger() {

  ScriptApp
    .getProjectTriggers()
    .forEach(
      function(trigger) {

        if (
          trigger.getHandlerFunction() ===
          MONTHLY_SHEET_CREATION_CONFIG
            .AUTO_CREATE_HANDLER
        ) {

          ScriptApp.deleteTrigger(
            trigger
          );
        }
      }
    );


  ScriptApp
    .newTrigger(
      MONTHLY_SHEET_CREATION_CONFIG
        .AUTO_CREATE_HANDLER
    )
    .timeBased()
    .onMonthDay(
      MONTHLY_SHEET_CREATION_CONFIG
        .FIRST_DAY
    )
    .atHour(
      MONTHLY_SHEET_CREATION_CONFIG
        .AUTO_CREATE_HOUR
    )
    .inTimezone(
      MONTHLY_SHEET_CREATION_CONFIG
        .OPERATION_TIME_ZONE
    )
    .create();


  Logger.log(
    "월 작업일지 자동생성 트리거 설치 완료: 매월 1일 01시경 실행"
  );
}


function createMonthlySheetForTarget_(
  year,
  month
) {

  return withDocumentLock_(
    "신규 월 작업일지 생성",
    function() {
      return createMonthlySheetForTargetUnlocked_(
        year,
        month
      );
    }
  );
}


function createMonthlySheetForTargetUnlocked_(
  year,
  month
) {

  validateMonthlySheetTarget_(
    year,
    month
  );


  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const targetSheetName =
    getMonthlySheetName_(
      year,
      month
    );


  const existing =
    ss.getSheetByName(
      targetSheetName
    );


  if (existing) {

    return {
      created:
        false,

      sheet:
        existing,

      message:
        targetSheetName +
        " 시트가 이미 있으므로 새로 만들지 않았습니다."
    };
  }


  const previous =
    getPreviousMonthTarget_(
      year,
      month
    );


  const previousSheetName =
    getMonthlySheetName_(
      previous.year,
      previous.month
    );


  const previousSheet =
    ss.getSheetByName(
      previousSheetName
    );


  if (!previousSheet) {

    throw new Error(
      "전월 원본 시트가 없습니다: " +
      previousSheetName +
      "\n전월 시트를 먼저 확인한 뒤 다시 실행하세요."
    );
  }


  const monthlyAnalyses =
    collectMonthlyAnalysesThrough_(
      ss,
      previous.year,
      previous.month
    );


  const previousInfo =
    findMonthlyAnalysisBySheetName_(
      monthlyAnalyses,
      previousSheetName
    );


  if (
    !previousInfo ||
    !previousInfo.hasValidInput ||
    !previousInfo.validBlocks.length
  ) {

    throw new Error(
      previousSheetName +
      "에 유효 작업일지가 없어 최종재고를 안전하게 이월할 수 없습니다."
    );
  }


  const closingInventory =
    buildAdjustedClosingInventoryMap_(
      previousInfo
    );


  if (!closingInventory.size) {

    throw new Error(
      previousSheetName +
      "에서 이월 가능한 상세 최종재고를 찾지 못했습니다."
    );
  }


  const templateSheet =
    ensureMonthlyDiaryTemplate_(
      ss,
      previousSheet
    );


  let targetSheet =
    null;


  try {

    targetSheet =
      templateSheet.copyTo(
        ss
      );


  targetSheet
    .setName(
      targetSheetName
    )
    .showSheet();


  markAutoGeneratedMonthlySheet_(
    targetSheet,
    year,
    month
  );


  Logger.log(
    "신규 월 시트 복제 완료: " +
    targetSheetName
  );


  const copiedBlocks =
    collectAllDateBlocks_(
      targetSheet
    );


  if (!copiedBlocks.length) {

    throw new Error(
      "자동생성 템플릿에서 날짜 블록을 찾지 못했습니다. 템플릿 구조를 확인하세요."
    );
  }


  clearManualMonthlyEntries_(
    targetSheet,
    copiedBlocks
  );


  updateMonthlyDateCells_(
    targetSheet,
    copiedBlocks,
    year,
    month
  );


  SpreadsheetApp.flush();


  Logger.log(
    "신규 월 날짜 갱신 완료: " +
    targetSheetName
  );


  const targetInfo =
    analyzeMonthlySheet_(
      targetSheet,
      targetSheetName,
      month,
      year
    );


  const expectedCalendarDays =
    new Date(
      year,
      month,
      0
    ).getDate();


  if (
    targetInfo.allBlocks.length !==
    expectedCalendarDays
  ) {
    throw new Error(
      "새 월 날짜 블록 수가 올바르지 않습니다. 기대 " +
      expectedCalendarDays +
      "일 / 확인 " +
      targetInfo.allBlocks.length +
      "일"
    );
  }


  const firstBlock =
    findFirstCalendarDayBlock_(
      targetInfo.allBlocks
    );


  if (!firstBlock) {

    throw new Error(
      "새 월 시트에서 " +
      year + "." + month + ".01 날짜 블록을 찾지 못했습니다."
    );
  }


  const carryResult =
    carryClosingInventoryToFirstDay_(
      targetSheet,
      targetInfo.scan,
      firstBlock,
      closingInventory
    );


  if (
    !carryResult.carriedCount ||
    carryResult.missingKeys.length ||
    carryResult.unusedKeys.length
  ) {

    throw new Error(
      "전월 최종재고와 새 월 1일 돈사·돈방 구조가 완전히 일치하지 않습니다.\n" +
      "이월: " + carryResult.carriedCount +
      ", 새 월 미일치: " + carryResult.missingKeys.length +
      ", 전월 미사용: " + carryResult.unusedKeys.length
    );
  }


  Logger.log(
    "신규 월 이월재고 적용 완료: " +
    carryResult.carriedCount +
    "개 상세행"
  );


  configureInventoryAuditInputForMonthlySheet_(
      targetSheet,
      targetSheetName,
      month,
      year
    );


  Logger.log(
    "신규 월 J열 실사입력 설정 완료: " +
    targetSheetName
  );


  refreshDashboardLinksUnlocked_();


  Logger.log(
    [
      "=== 신규 월 작업일지 생성 완료 ===",
      "생성 시트: " + targetSheetName,
      "템플릿: " + templateSheet.getName(),
      "전월: " + previousSheetName,
      "실사보정 후 이월 재고행: " + carryResult.carriedCount,
      "대시보드 연동: 갱신 완료"
    ].join("\n")
  );


  return {
    created:
      true,

    sheet:
      targetSheet,

    message:
      targetSheetName +
      " 시트를 생성했습니다.\n" +
      "전월 실사보정 후 최종재고 " +
      carryResult.carriedCount +
      "개 상세행을 1일 전일재고로 이월했고, 대시보드 연동도 갱신했습니다."
  };

  } catch (error) {

    if (
      targetSheet &&
      ss.getSheetByName(
        targetSheetName
      ) === targetSheet
    ) {

      ss.deleteSheet(
        targetSheet
      );
    }


    throw new Error(
      error.message +
      "\n생성 중이던 " +
      targetSheetName +
      " 시트는 자동으로 제거했습니다."
    );
  }
}


function ensureMonthlyDiaryTemplate_(
  ss,
  sourceSheet
) {

  let templateSheet =
    ss.getSheetByName(
      MONTHLY_SHEET_CREATION_CONFIG
        .TEMPLATE_SHEET_NAME
    );


  if (
    templateSheet &&
    hasCompleteMonthlyTemplate_(
      templateSheet
    )
  ) {
    return templateSheet;
  }


  const candidates =
    [sourceSheet]
      .concat(
        listMonthlySheetDescriptors_(ss)
          .sort(
            function(a, b) {
              return (
                b.year - a.year ||
                b.month - a.month
              );
            }
          )
          .map(
            function(item) {
              return item.sheet;
            }
          )
      )
      .filter(
        function(sheet, index, list) {
          return (
            sheet &&
            list.indexOf(sheet) === index
          );
        }
      );


  const referenceSheet =
    candidates.filter(
      function(sheet) {
        return hasCompleteMonthlyTemplate_(
          sheet
        );
      }
    )[0] ||
    null;


  if (!referenceSheet) {
    throw new Error(
      "1일부터 31일까지 전체 날짜 블록이 있는 참고 월 시트를 찾지 못했습니다."
    );
  }


  const oldTemplate =
    templateSheet;


  const oldTemplateName =
    oldTemplate
      ? MONTHLY_SHEET_CREATION_CONFIG.TEMPLATE_SHEET_NAME +
        "_교체_" +
        new Date().getTime()
      : "";


  if (oldTemplate) {
    oldTemplate.setName(
      oldTemplateName
    );
  }


  try {

    templateSheet =
      referenceSheet.copyTo(
        ss
      );


    templateSheet
      .setName(
        MONTHLY_SHEET_CREATION_CONFIG
          .TEMPLATE_SHEET_NAME
      )
      .hideSheet();


    if (oldTemplate) {
      ss.deleteSheet(
        oldTemplate
      );
    }

  } catch (error) {

    if (
      oldTemplate &&
      !ss.getSheetByName(
        MONTHLY_SHEET_CREATION_CONFIG
          .TEMPLATE_SHEET_NAME
      )
    ) {
      oldTemplate.setName(
        MONTHLY_SHEET_CREATION_CONFIG
          .TEMPLATE_SHEET_NAME
      );
    }

    throw error;
  }


  Logger.log(
    "월 작업일지 자동생성 템플릿을 만들었습니다: " +
    templateSheet.getName() +
    " / 참고 시트: " +
    referenceSheet.getName()
  );


  return templateSheet;
}


function clearManualMonthlyEntries_(
  sheet,
  dateBlocks
) {

  const lastRow =
    Math.max(
      1,
      sheet.getLastRow()
    );


  const scanRange =
    sheet.getRange(
      1,
      1,
      lastRow,
      DASHBOARD_CONFIG.SOURCE_DATA_COLS
    );


  const values =
    scanRange.getValues();


  const displayValues =
    scanRange.getDisplayValues();


  const formulas =
    scanRange.getFormulas();


  const cellsToClear = [];


  (dateBlocks || [])
    .forEach(
      function(block) {

        for (
          let rowNum = block.dateBlockStartRow;
          rowNum <= block.copyEndRow;
          rowNum++
        ) {

          const rowIndex =
            rowNum - 1;


          const rowHasEntityLabel =
            Boolean(
              cellText_(
                displayValues[rowIndex],
                values[rowIndex],
                0
              ) ||
              cellText_(
                displayValues[rowIndex],
                values[rowIndex],
                2
              )
            );


          if (
            rowNum === block.dateBlockStartRow ||
            rowNum === block.dateBlockStartRow + 1 ||
            !rowHasEntityLabel
          ) {
            continue;
          }


          for (
            let column =
              MONTHLY_SHEET_CREATION_CONFIG
                .FIRST_ENTRY_COL;
            column <=
              MONTHLY_SHEET_CREATION_CONFIG
                .LAST_ENTRY_COL;
            column++
          ) {

            const zeroBasedCol =
              column - 1;


            if (
              String(
                formulas[rowIndex][zeroBasedCol] || ""
              ).trim() !== ""
            ) {

              continue;
            }


            const displayed =
              String(
                displayValues[rowIndex][zeroBasedCol] == null
                  ? ""
                  : displayValues[rowIndex][zeroBasedCol]
              ).trim();


            const raw =
              values[rowIndex][zeroBasedCol];


            if (
              displayed !== "" ||
              !(
                raw === "" ||
                raw === null ||
                raw === undefined
              )
            ) {

              cellsToClear.push(
                columnNumberToLetter_(column) +
                rowNum
              );
            }
          }
        }
      }
    );


  if (cellsToClear.length) {

    sheet
      .getRangeList(
        cellsToClear
      )
      .clearContent();
  }
}


function updateMonthlyDateCells_(
  sheet,
  dateBlocks,
  targetYear,
  targetMonth
) {

  const daysInTargetMonth =
    new Date(
      targetYear,
      targetMonth,
      0
    ).getDate();


  const scan =
    scanMonthlySheet_(
      sheet
    );


  const plan =
    getMonthlyTemplateDatePlan_(
      dateBlocks
    );


  if (
    plan.primaryBlocks.length <
      MONTHLY_SHEET_CREATION_CONFIG.MIN_TEMPLATE_CALENDAR_DAYS
  ) {
    throw new Error(
      "자동생성 템플릿에 1~31일 날짜 블록이 모두 필요합니다."
    );
  }


  let updatedCount =
    0;


  (dateBlocks || [])
    .forEach(
      function(block) {

        const rowIndex =
          block.dateBlockStartRow - 1;


        let targetDate =
          null;


        if (
          plan.primaryBlocks.indexOf(
            block
          ) !== -1 &&
          block.date.getDate() <=
            daysInTargetMonth
        ) {

          targetDate =
            createSafeCalendarDate_(
              targetYear,
              targetMonth - 1,
              block.date.getDate()
            );

        } else if (
          block ===
          plan.sentinelBlock
        ) {

          targetDate =
            createSafeCalendarDate_(
              targetYear,
              targetMonth,
              1
            );
        }


        for (
          let col = 0;
          col < DASHBOARD_CONFIG.MAX_DATA_COLS;
          col++
        ) {

          const formula =
            String(
              scan.formulas[rowIndex][col] || ""
            ).trim();


          if (formula !== "") {
            continue;
          }


          if (
            !parseDateFromCell_(
              scan.values[rowIndex][col]
            )
          ) {

            continue;
          }


          const cell =
            sheet.getRange(
              block.dateBlockStartRow,
              col + 1
            );


          if (targetDate) {

            cell.setValue(
              targetDate
            );

          } else {

            cell.clearContent();
          }


          updatedCount +=
            1;
        }
      }
    );


  if (!updatedCount) {

    throw new Error(
      "템플릿의 날짜 셀을 갱신하지 못했습니다. 날짜가 직접입력 값인지 확인하세요."
    );
  }
  // The undated reserve diary is not part of the target month. Remove it
  // before shorter-month rows so its references to day 31 cannot become #REF!.
  // This function is used only on the newly copied monthly sheet.
  const finalCalendarBlock = plan.primaryBlocks[plan.primaryBlocks.length - 1];
  const reserveStart = !plan.sentinelBlock && finalCalendarBlock
    ? findTrailingUndatedTemplateBoundaryRow_(scan, finalCalendarBlock.dateBlockStartRow)
    : null;
  if (reserveStart) {
    sheet.deleteRows(reserveStart, sheet.getMaxRows() - reserveStart + 1);
  }

  // Clearing only the date merges unused 29/30/31 blocks into the last valid
  // day. Remove those complete blocks in descending order on the NEW sheet.
  plan.primaryBlocks.filter(function(block) {
    return block.date.getDate() > daysInTargetMonth;
  }).sort(function(a, b) {
    return b.dateBlockStartRow - a.dateBlockStartRow;
  }).forEach(function(block) {
    sheet.deleteRows(block.dateBlockStartRow, block.copyEndRow - block.dateBlockStartRow + 1);
  });

}


function buildAdjustedClosingInventoryMap_(
  monthlyInfo
) {

  const result =
    new Map();


  const blocks =
    (monthlyInfo.validBlocks || [])
      .slice()
      .sort(
        function(a, b) {

          return (
            a.date.getTime() -
            b.date.getTime()
          );
        }
      );


  if (!blocks.length) {
    return result;
  }


  const lastBlock =
    blocks[
      blocks.length - 1
    ];


  const adjustedScan =
    monthlyInfo.adjustedScan ||
    monthlyInfo.scan;


  collectInventoryEntityRows_(
    adjustedScan,
    lastBlock,
    true
  )
    .forEach(
      function(item) {

        result.set(
          item.key,
          item.currentStock
        );
      }
    );


  return result;
}


function carryClosingInventoryToFirstDay_(
  sheet,
  targetScan,
  firstBlock,
  closingInventory
) {

  let carriedCount =
    0;


  const missingKeys = [];

  const usedKeys =
    new Set();


  const targetRows =
    collectInventoryEntityRows_(
    targetScan,
    firstBlock,
    false
  );


  targetRows
    .forEach(
      function(item) {

        if (
          !closingInventory.has(
            item.key
          )
        ) {

          missingKeys.push(
            item.key
          );

          return;
        }


        sheet
          .getRange(
            item.rowNum,
            MONTHLY_SHEET_CREATION_CONFIG
              .PREVIOUS_STOCK_COL
          )
          .setValue(
            closingInventory.get(
              item.key
            )
          );


        carriedCount +=
          1;

        usedKeys.add(
          item.key
        );
      }
    );


  const unusedKeys =
    Array.from(
      closingInventory.keys()
    )
      .filter(
        function(key) {
          return !usedKeys.has(key);
        }
      );


  return {
    carriedCount: carriedCount,
    targetCount: targetRows.length,
    closingCount: closingInventory.size,
    missingKeys: missingKeys,
    unusedKeys: unusedKeys
  };
}


/*
 * 실사보정의 entityKey 규칙과 동일한 section|sub#occurrence 식별자를 쓴다.
 * 합계·소계는 이월 대상이 아니며, 상세 돈사/돈방 행만 처리한다.
 */
function collectInventoryEntityRows_(
  scan,
  block,
  requireCurrentStock
) {

  const result = [];

  const occurrenceMap =
    new Map();


  let currentSection =
    "";


  let inAggregateSummary =
    false;


  for (
    let rowNum = block.dateBlockStartRow;
    rowNum <= block.copyEndRow;
    rowNum++
  ) {

    // Date and column headers are never rooms, even while cleared I cells
    // are being matched for first-day D carry.
    if (rowNum <= block.dateBlockStartRow + 1) continue;

    const rowIndex =
      rowNum - 1;


    const valueRow =
      scan.values[rowIndex];


    const displayRow =
      scan.displayValues[rowIndex];


    if (!valueRow || !displayRow) {
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


    // ВСЕГО 뒤에는 작업 메모·교육·서명 영역이 이어질 수 있다.
    // 이 구간의 텍스트를 돈사·돈방 식별자로 다시 해석하지 않는다.
    if (
      isGrandTotalLabel_(section) ||
      isGrandTotalLabel_(sub)
    ) {

      break;
    }


    if (
      section &&
      !isAnyTotalLabel_(section)
    ) {

      inAggregateSummary =
        false;

      currentSection =
        section;
    }


    if (
      isGrandTotalLabel_(section) ||
      isGrandTotalLabel_(sub) ||
      isSubTotalLabel_(section) ||
      isSubTotalLabel_(sub)
    ) {

      inAggregateSummary =
        true;

      continue;
    }


    if (inAggregateSummary) {
      continue;
    }


    const sectionKey =
      normalizeEntityText_(
        currentSection
      );


    const subKey =
      normalizeEntityText_(
        sub
      );


    if (
      !sectionKey &&
      !subKey
    ) {

      continue;
    }


    if (
      requireCurrentStock &&
      !hasNumericCell_(
        displayRow,
        valueRow,
        MONTHLY_SHEET_CREATION_CONFIG
          .CURRENT_STOCK_COL - 1
      )
    ) {

      continue;
    }


    const baseKey =
      sectionKey +
      "|" +
      subKey;


    const occurrence =
      Number(
        occurrenceMap.get(
          baseKey
        ) || 0
      ) +
      1;


    occurrenceMap.set(
      baseKey,
      occurrence
    );


    result.push({
      groupAuditKey: classifyGroupInventoryTargetKey_(currentSection, section, sub),
      key:
        baseKey +
        "#" +
        occurrence,

      rowNum:
        rowNum,

      currentStock:
        cellNumber_(
          displayRow,
          valueRow,
          MONTHLY_SHEET_CREATION_CONFIG
            .CURRENT_STOCK_COL - 1
        )
    });
  }


  return result;
}


function configureInventoryAuditInputForMonthlySheet_(
  sheet,
  sheetName,
  monthIndex,
  reportingYear
) {

  const info =
    analyzeMonthlySheet_(
      sheet,
      sheetName,
      monthIndex,
      reportingYear
    );


  const inputCells = [];


  const headerCells = [];


  const blocks =
    info.allBlocks || [];


  if (blocks.length) {

    const firstRow =
      blocks.reduce(
        function(minimum, block) {
          return Math.min(
            minimum,
            block.dateBlockStartRow
          );
        },
        blocks[0].dateBlockStartRow
      );


    const lastRow =
      blocks.reduce(
        function(maximum, block) {
          return Math.max(
            maximum,
            block.copyEndRow
          );
        },
        blocks[0].copyEndRow
      );


    sheet
      .getRange(
        firstRow,
        9,
        lastRow - firstRow + 1,
        1
      )
      .copyFormatToRange(
        sheet,
        DASHBOARD_CONFIG.INVENTORY_AUDIT_COL,
        DASHBOARD_CONFIG.INVENTORY_AUDIT_COL,
        firstRow,
        lastRow
      );
  }


  blocks
    .forEach(
      function(block) {

        const headerRow =
          block.dateBlockStartRow +
          1;


        if (headerRow <= block.copyEndRow) {
          headerCells.push(
            columnNumberToLetter_(
              DASHBOARD_CONFIG.INVENTORY_AUDIT_COL
            ) +
            headerRow
          );
        }


        collectInventoryAuditCandidateCells_(
          info.scan,
          block
        )
          .forEach(
            function(cell) {
              inputCells.push(cell);
            }
          );
      }
    );


  if (headerCells.length) {

    sheet
      .getRangeList(
        headerCells
      )
      .setValue(
        DASHBOARD_CONFIG.INVENTORY_AUDIT_HEADER
      )
      .setNote(
        "실사한 경우에만 실제 개체수를 0 이상의 정수로 입력합니다. " +
        "빈칸은 실사 없음이며 숫자 0도 유효합니다."
      );
  }


  if (inputCells.length) {

    sheet
      .getRangeList(
        inputCells
      )
      .setBackground(
        "#fff2cc"
      )
      .setNumberFormat(
        "0"
      );
  }
}


function collectAllDateBlocks_(sheet) {

  const scan =
    scanMonthlySheet_(
      sheet
    );


  const dateRows = [];


  for (
    let rowNum = 1;
    rowNum <= scan.lastRow;
    rowNum++
  ) {

    const date =
      getDateFromRow_(
        scan.values[rowNum - 1],
        scan.displayValues[rowNum - 1]
      );


    if (!date) {
      continue;
    }


    dateRows.push({
      date:
        date,

      dateBlockStartRow:
        rowNum,

      nextDateRow:
        null,

      copyEndRow:
        scan.lastRow
    });
  }


  dateRows.forEach(
    function(block, index) {

      const next =
        dateRows[index + 1];


      if (next) {

        block.nextDateRow =
          next.dateBlockStartRow;

        block.copyEndRow =
          next.dateBlockStartRow - 1;
      }
    }
  );


  if (dateRows.length) {

    const lastBlock =
      dateRows[
        dateRows.length - 1
      ];


    const trailingBoundaryRow =
      findTrailingUndatedTemplateBoundaryRow_(
        scan,
        lastBlock.dateBlockStartRow
      );


    if (trailingBoundaryRow) {
      lastBlock.nextDateRow =
        trailingBoundaryRow;

      lastBlock.copyEndRow =
        trailingBoundaryRow - 1;
    }
  }


  return dateRows;
}


function findFirstCalendarDayBlock_(blocks) {

  return (blocks || [])
    .filter(
      function(block) {

        return (
          block &&
          block.date &&
          block.date.getDate() === 1
        );
      }
    )
    .sort(
      function(a, b) {

        return (
          a.dateBlockStartRow -
          b.dateBlockStartRow
        );
      }
    )[0] || null;
}


function findMonthlyAnalysisBySheetName_(
  analyses,
  sheetName
) {

  return (analyses || [])
    .filter(
      function(info) {

        return (
          info &&
          info.sheetName === sheetName
        );
      }
    )[0] || null;
}


function getDashboardReportingYear_() {

  const now =
    new Date();


  if (
    typeof Utilities !== "undefined" &&
    Utilities.formatDate
  ) {
    return Number(
      Utilities.formatDate(
        now,
        MONTHLY_SHEET_CREATION_CONFIG.OPERATION_TIME_ZONE,
        "yyyy"
      )
    );
  }


  return now.getFullYear();
}


function parseMonthlySheetName_(sheetName) {

  const text =
    String(sheetName || "").trim();


  for (
    let index = 0;
    index < DASHBOARD_CONFIG.MONTHS_RU.length;
    index++
  ) {

    const prefix =
      DASHBOARD_CONFIG.MONTHS_RU[index] +
      " ";


    if (
      text.indexOf(prefix) !== 0
    ) {
      continue;
    }


    const yearText =
      text.slice(prefix.length);


    if (!/^20\d{2}$/.test(yearText)) {
      return null;
    }


    return {
      year: Number(yearText),
      month: index + 1
    };
  }


  return null;
}


function listMonthlySheetDescriptors_(ss) {

  return (ss.getSheets() || [])
    .map(
      function(sheet) {

        const parsed =
          parseMonthlySheetName_(
            sheet.getName()
          );


        return parsed
          ? {
              year: parsed.year,
              month: parsed.month,
              sheetName: sheet.getName(),
              sheet: sheet
            }
          : null;
      }
    )
    .filter(
      function(item) {
        return Boolean(item);
      }
    )
    .sort(
      function(a, b) {
        return (
          a.year - b.year ||
          a.month - b.month
        );
      }
    );
}


function getAutoGeneratedMonthValue_(
  year,
  month
) {

  return (
    String(year) +
    "-" +
    String(month).padStart(2, "0")
  );
}


function markAutoGeneratedMonthlySheet_(
  sheet,
  year,
  month
) {

  const key =
    MONTHLY_SHEET_CREATION_CONFIG
      .AUTO_GENERATED_METADATA_KEY;


  (sheet.getDeveloperMetadata() || [])
    .filter(
      function(item) {
        return item.getKey() === key;
      }
    )
    .forEach(
      function(item) {
        item.remove();
      }
    );


  sheet.addDeveloperMetadata(
    key,
    getAutoGeneratedMonthValue_(
      year,
      month
    )
  );
}


function isAutoGeneratedMonthlySheet_(
  sheet,
  year,
  month
) {

  if (
    !sheet ||
    typeof sheet.getDeveloperMetadata !== "function"
  ) {
    return false;
  }


  const key =
    MONTHLY_SHEET_CREATION_CONFIG
      .AUTO_GENERATED_METADATA_KEY;


  const expected =
    getAutoGeneratedMonthValue_(
      year,
      month
    );


  return (sheet.getDeveloperMetadata() || [])
    .some(
      function(item) {
        return (
          item.getKey() === key &&
          item.getValue() === expected
        );
      }
    );
}


function createSafeCalendarDate_(
  year,
  zeroBasedMonth,
  day
) {

  return new Date(
    year,
    zeroBasedMonth,
    day,
    12,
    0,
    0,
    0
  );
}


function getMonthlyTemplateDatePlan_(
  dateBlocks
) {

  const groups =
    new Map();


  (dateBlocks || [])
    .forEach(
      function(block) {

        if (!block || !block.date) {
          return;
        }


        const key =
          block.date.getFullYear() +
          "-" +
          String(
            block.date.getMonth() + 1
          ).padStart(2, "0");


        const group =
          groups.get(key) ||
          [];


        group.push(block);
        groups.set(key, group);
      }
    );


  const primaryBlocks =
    Array.from(groups.values())
      .sort(
        function(a, b) {
          return (
            new Set(
              b.map(function(item) {
                return item.date.getDate();
              })
            ).size -
            new Set(
              a.map(function(item) {
                return item.date.getDate();
              })
            ).size
          );
        }
      )[0] ||
    [];


  primaryBlocks.sort(
    function(a, b) {
      return (
        a.dateBlockStartRow -
        b.dateBlockStartRow
      );
    }
  );


  const lastPrimaryRow =
    primaryBlocks.length
      ? primaryBlocks[
          primaryBlocks.length - 1
        ].dateBlockStartRow
      : 0;


  const sentinelBlock =
    (dateBlocks || [])
      .filter(
        function(block) {
          return (
            primaryBlocks.indexOf(block) === -1 &&
            block.dateBlockStartRow >
              lastPrimaryRow
          );
        }
      )
      .sort(
        function(a, b) {
          return (
            a.dateBlockStartRow -
            b.dateBlockStartRow
          );
        }
      )[0] ||
    null;


  return {
    primaryBlocks: primaryBlocks,
    sentinelBlock: sentinelBlock
  };
}


function hasCompleteMonthlyTemplate_(sheet) {

  const plan =
    getMonthlyTemplateDatePlan_(
      collectAllDateBlocks_(sheet)
    );


  const days =
    new Set(
      plan.primaryBlocks.map(
        function(block) {
          return block.date.getDate();
        }
      )
    );


  for (
    let day = 1;
    day <= MONTHLY_SHEET_CREATION_CONFIG.MIN_TEMPLATE_CALENDAR_DAYS;
    day++
  ) {
    if (!days.has(day)) {
      return false;
    }
  }


  return true;
}


function withDocumentLock_(
  operationName,
  callback
) {

  const lock =
    LockService.getDocumentLock();


  if (
    !lock.tryLock(
      MONTHLY_SHEET_CREATION_CONFIG
        .LOCK_TIMEOUT_MS
    )
  ) {
    throw new Error(
      operationName +
      "이 이미 실행 중입니다. 잠시 후 다시 실행하세요."
    );
  }


  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}


function getGrandTotalStockFromBlock_(
  scan,
  block,
  zeroBasedColumn
) {

  if (!scan || !block) {
    return null;
  }


  for (
    let rowNum = block.dateBlockStartRow;
    rowNum <= block.copyEndRow;
    rowNum++
  ) {

    const values =
      scan.values[rowNum - 1];

    const displays =
      scan.displayValues[rowNum - 1];


    if (!values || !displays) {
      continue;
    }


    if (
      isGrandTotalLabel_(
        cellText_(displays, values, 0)
      ) ||
      isGrandTotalLabel_(
        cellText_(displays, values, 2)
      )
    ) {
      return cellNumber_(
        displays,
        values,
        zeroBasedColumn
      );
    }
  }


  return null;
}


function auditMonthlyCarryovers_(analyses) {

  const ordered =
    (analyses || [])
      .slice()
      .sort(
        function(a, b) {
          return (
            a.year - b.year ||
            a.monthIndex - b.monthIndex
          );
        }
      );


  const issues = [];


  for (
    let index = 1;
    index < ordered.length;
    index++
  ) {

    const previous =
      ordered[index - 1];

    const current =
      ordered[index];


    const previousKey =
      previous.year * 12 +
      previous.monthIndex;

    const currentKey =
      current.year * 12 +
      current.monthIndex;


    if (currentKey - previousKey !== 1) {
      continue;
    }


    const previousBlock =
      (previous.validBlocks || []).slice(-1)[0] ||
      (previous.allBlocks || []).slice(-1)[0] ||
      null;

    const currentBlock =
      (current.allBlocks || [])[0] ||
      null;


    const closing =
      getGrandTotalStockFromBlock_(
        current.autoGenerated
          ? (
              previous.adjustedScan ||
              previous.scan
            )
          : previous.scan,
        previousBlock,
        8
      );

    const opening =
      getGrandTotalStockFromBlock_(
        current.scan,
        currentBlock,
        3
      );


    if (
      closing === null ||
      opening === null ||
      closing === opening
    ) {
      continue;
    }


    issues.push({
      previousSheetName: previous.sheetName,
      currentSheetName: current.sheetName,
      closing: closing,
      opening: opening,
      difference: opening - closing,
      autoGenerated: Boolean(current.autoGenerated)
    });
  }


  const lines =
    issues.map(
      function(item) {
        return (
          item.previousSheetName +
          " 최종 " +
          item.closing +
          " → " +
          item.currentSheetName +
          " 최초 " +
          item.opening +
          " (차이 " +
          item.difference +
          ")" +
          (
            item.autoGenerated
              ? " [자동생성 탭 오류]"
              : " [기존 수동 탭/실측 재설정 확인 필요]"
          )
        );
      }
    );


  return {
    issues: issues,
    message: issues.length
      ? "=== 월 경계 이월재고 불일치 ===\n" +
        lines.join("\n")
      : "월 경계 이월재고 불일치 없음"
  };
}


function showMonthlyCarryoverAudit() {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const result =
    auditMonthlyCarryovers_(
      collectMonthlyAnalyses_(ss)
    );


  Logger.log(
    result.message
  );
}


function findNextMonthlySheetTarget_(ss) {

  const descriptors =
    listMonthlySheetDescriptors_(
      ss
    );


  if (!descriptors.length) {

    throw new Error(
      "기준이 될 기존 월 작업일지 시트를 찾지 못했습니다."
    );
  }


  const latest =
    descriptors[
      descriptors.length - 1
    ];


  const next =
    new Date(
      latest.year,
      latest.month,
      1,
      12,
      0,
      0
    );


  return {
    year:
      next.getFullYear(),

    month:
      next.getMonth() + 1
  };
}


function parseMonthlySheetTarget_(text) {

  const match =
    String(text || "")
      .trim()
      .match(
        /^(20\d{2})\s*[-./]\s*(0?[1-9]|1[0-2])$/
      );


  if (!match) {

    throw new Error(
      "입력 형식이 올바르지 않습니다. YYYY-MM 형식으로 입력하세요."
    );
  }


  return {
    year:
      Number(match[1]),

    month:
      Number(match[2])
  };
}


function validateMonthlySheetTarget_(
  year,
  month
) {

  if (
    !Number.isInteger(year) ||
    year < 2026 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {

    throw new Error(
      "생성 연월이 올바르지 않습니다. 2026-01부터 2100-12 사이의 연월을 입력하세요."
    );
  }
}


function getPreviousMonthTarget_(
  year,
  month
) {

  const date =
    new Date(
      year,
      month - 2,
      1
    );


  return {
    year:
      date.getFullYear(),

    month:
      date.getMonth() + 1
  };
}


function getMonthlySheetName_(
  year,
  month
) {

  return (
    DASHBOARD_CONFIG.MONTHS_RU[
      month - 1
    ] +
    " " +
    year
  );
}
