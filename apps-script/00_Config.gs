/***************************************************************
 * 양돈장 대시보드 자동연동
 * Code.gs v11.5-RC10
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

  /* 월초 수기 D는 원본 보존. 관리사무소 공식 재고는 월 경계를 넘어 유지한다. */
  LEGACY_MANUAL_MONTH_START_REBASE:
    false,

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