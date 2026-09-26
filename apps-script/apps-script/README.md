# Google Apps Script — RC10 기반 Plugin 분리본

실제 배포 파일은 이 문서의 상위 폴더 `apps-script/`에 있는 **25개 .gs와 appsscript.json**입니다. 하나의 스프레드시트 연결 Apps Script 프로젝트에 함께 저장합니다. 시간대는 Asia/Vladivostok이며 V8을 사용합니다.

## 파일 구성

- `00_Config.gs`: 공통 설정.
- `Core_*.gs`: 공개 진입점, 분석·갱신 흐름, 잠금, 날짜·셀·출력 규약.
- `Plugin_*.gs`: 일지 분석, 실사 보정, KPI/MSY, 월 생성, 출력, 진단, 트리거.
- `appsscript.json`: 실제 Apps Script 매니페스트.

기존 단일 Code.gs와 검증 전용 Stage4Verification·Stage6Verification은 운영 파일 목록에서 제외합니다. 같은 함수나 설정을 중복 정의하지 않도록 전체 목록으로 관리합니다.

## 주요 실행 함수

- `refreshDashboardLinks`: 전체 연동 갱신.
- `refreshMonthlyLinkSheet`, `refreshAnnualLinkSheet`: 문서 잠금 안에서 단독 갱신.
- 진단 5개: 분석 결과를 로그로 확인하며 실사대장 상태 열을 쓰지 않음.
- 월 생성: `promptCreateMonthlySheet`, `createNextMonthlySheet`.

## 기존 자동 실행

`dashboardOnEdit`, `dashboardOnChange`, `flushPendingDashboardRefresh`, `createCurrentMonthSheetOnFirstDay`의 4개 트리거를 사용합니다. 파일 분리를 이유로 다시 설치할 필요는 없습니다.

## 연결 규약

유효 작업일은 날짜 블록 안의 앵커 행 E:H에 입력된 수식이 아닌 숫자로 판정합니다. 수동 0은 인정합니다. 상세 J열과 관리사무소 그룹 실사대장을 읽고, 대시보드 출력에는 공식 그룹값과 상세값·잔차를 구분해 제공합니다.

[프로젝트 현황](../../docs/PROJECT_STATUS.md) · [시트 규약](../../docs/SHEET_STRUCTURE.md) · [릴리스와 복구](../../docs/PLUGIN_RELEASE_2026-09-26.md)
