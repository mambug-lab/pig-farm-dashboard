# 프로젝트 현황

## 현재 운영 버전

- 프로젝트 버전: v0.1.0-dev
- 상태: 개발 및 검증 중
- 기준일: 2026-07-29
- GitHub 저장소: pig-farm-dashboard
- 기본 브랜치: main

### 운영 파일

- 대시보드: `index.html`
- Apps Script: `apps-script/Code.gs`
- Apps Script 매니페스트: `apps-script/appsscript.json`
- GitHub Pages: `https://mambug-lab.github.io/pig-farm-dashboard/`
- Google Sheets 월간연동용 GID: `46976503`

### 현재 확인된 상태

- 최신 입력 월 자동 선택: 정상
- 현재 최신 입력 월: Июль 2026
- 월간연동용 시트 생성: 정상
- 7월 12일 마지막 5개 행 복사: 수정 및 검증 완료
- 월간연동용 시트 F1에서 유효 입력 확인 행이 665~668 3개 행인 것에 대한 확인 필요
- HTML 대시보드 계산: 재검증 필요

# 프로젝트 현황

## 현재 운영 버전

- 프로젝트 버전: `v0.1.0-dev`
- 상태: Apps Script 및 HTML 대시보드 수정·검증 완료
- 기준일: 2026-08-26
- GitHub 저장소: `mambug-lab/pig-farm-dashboard`
- 기본 브랜치: `main`

## 운영 파일

- 대시보드: `index.html`
- Apps Script: `apps-script/Code.gs`
- Apps Script 매니페스트: `apps-script/appsscript.json`
- GitHub Pages: `https://mambug-lab.github.io/pig-farm-dashboard/`
- Google Sheets 월간연동용 GID: `46976503`

## Google Apps Script 수정

### 관련 커밋

- 커밋: `caac9c8`
- 커밋 메시지: `Fix dynamic workday block detection`
- 변경 파일: `apps-script/Code.gs`

### 수정 내용

- 기존 26행 고정 간격 유효 작업일지 검사 방식 제거
- 각 월별 시트에서 날짜 행을 동적으로 탐지
- 현재 날짜 행부터 다음 날짜 행 직전까지를 하나의 작업일지 블록으로 판정
- 각 날짜 블록의 E:H열에서 수동으로 입력된 숫자가 있는지 검사
- 수식으로 생성된 값은 유효 입력에서 제외
- `ИТОГО`와 `ВСЕГО` 행은 유효 작업일 판정에서 제외
- `ИТОГО` 행은 모돈 부분합 및 MSY 모돈수 계산 자료로 유지
- `ВСЕГО` 행은 전체 사육두수·출하·폐사 계산 자료로 유지
- 월간연동용 및 연간연동용 시트 생성 방식 유지
- `onEdit`, `onChange` 자동 갱신 트리거 유지

### 실행 중 확인된 문제와 조치

Apps Script 프로젝트에 `Code.gs`와 `Code 사본.gs`가 동시에 존재해 다음 오류가 발생했다.

`SyntaxError: Identifier 'DASHBOARD_CONFIG' has already been declared`

Apps Script의 모든 `.gs` 파일은 하나의 실행 범위를 공유하므로, 두 파일에 동일한 전역 상수가 선언되어 충돌한 것이 원인이었다.

`Code 사본.gs`를 삭제한 후 `refreshDashboardLinks()`를 다시 실행해 문제를 해결했다.

### 검증 결과

- 8월 작업일지 입력값 정상 인식
- `대시보드_월간연동용` 갱신 정상
- `대시보드_연간연동용` 갱신 정상
- 최신 작업일지 데이터가 2026년 8월까지 연동되는 것을 확인
- 고정 26행 검사 구간에 의존하지 않고 날짜 블록 전체를 검사하는 것을 확인

## HTML 대시보드 수정

### 관련 커밋

- 커밋: `db12188`
- 커밋 메시지: `Fix dashboard linked-sheet calculations`
- 변경 파일: `index.html`

### 수정 내용

- HTML에서 `ВСЕГО` 값이 0이 아닌지를 기준으로 유효 작업일을 다시 판정하던 로직 제거
- Apps Script가 월간연동용 시트에 생성한 마지막 날짜 블록을 최신 작업일지로 사용
- 월간연동용 시트는 최신 현황과 월 누적 계산에 사용
- 연간연동용 시트를 시트 이름으로 별도 로드
- 연간연동용 데이터를 MSY 계산 자료로 사용
- 모돈수를 찾지 못할 때 `375`를 표시하던 강제값 제거
- 과거 작업일지에 해당 날짜의 모돈수가 없을 때 최신 모돈수를 대신 적용하던 fallback 제거
- 해당 날짜에 유효한 모돈수가 없으면 그 날짜를 MSY 계산에서 제외
- `ИТОГО`는 모돈수 계산에 사용
- `ВСЕГО`는 총 사육두수·당일 출하·당일 폐사·월 누적 계산에 사용
- 언어 변경 후에도 월간·연간 데이터가 유지되도록 상태 저장 로직 보완
- 빈 GID를 이용해 첫 번째 시트로 연결하던 fallback 제거

## 최종 배포 및 확인 결과

GitHub Pages에 수정된 `index.html`이 정상 배포된 것을 확인했다.

### 확인된 대시보드 값

- 최신 작업일지: `2026.08.23`
- 예상 MSY: `9.55`
- 총 사육두수: `5,486두`
- 모돈수: `363두`
- 월간연동용 시트 연결: 정상
- 연간연동용 시트 연결: 정상
- Google Sheets 실시간 데이터 조회: 정상

### 데이터 조회 범위

- 월간연동용 데이터 최종 날짜: `2026.08.23`
- 연간연동용 데이터 최종 날짜: `2026.08.23`

## 현재 상태

- `Code.gs` 동적 날짜 블록 탐지: 완료
- 월간연동용 시트 갱신: 정상
- 연간연동용 시트 갱신: 정상
- 8월 작업일지 인식: 정상
- HTML 최신 작업일 표시: 정상
- 총 사육두수 계산: 정상
- 모돈수 계산: 정상
- 연간자료 기반 MSY 계산: 정상
- GitHub Pages 배포: 정상
- 모바일 접속: 정상

## 휴대폰 사용 방법

휴대폰에서는 다음 GitHub Pages 주소로 접속한다.

`https://mambug-lab.github.io/pig-farm-dashboard/`

Android Chrome 또는 iPhone Safari에서 해당 페이지를 연 뒤 ‘홈 화면에 추가’를 선택하면 앱처럼 바로 실행할 수 있다.

대시보드 HTML 파일을 Google Drive에 별도로 복사할 필요는 없다.

## 운영 시 주의사항

- GitHub의 `Code.gs` 변경 사항은 Google Apps Script에 자동 반영되지 않는다.
- Apps Script 코드 수정 시 Google 시트의 Apps Script 편집기에도 직접 반영해야 한다.
- Apps Script 프로젝트에 `Code.gs` 사본을 `.gs` 파일로 보관하면 전역 상수와 함수가 중복될 수 있다.
- 백업 파일은 Apps Script 프로젝트 외부에 보관하는 것이 안전하다.
- 작업일지 입력 후 연동 시트가 자동 갱신되지 않으면 `refreshDashboardLinks()`를 수동 실행한다.
- 트리거가 없을 때만 `installDashboardTriggers()`를 실행한다.
- HTML 수정 후 GitHub Pages 배포에는 짧은 반영 시간이 필요할 수 있다.

## 다음 확인 사항

- 신규 작업일지 입력 후 `onEdit` 및 `onChange` 자동 갱신 상태 확인
- 다음 달 시트 입력 시 최신 월 자동 선택 상태 확인
- 월 누적 출하·폐사 값을 원본 시트와 정기적으로 대조
- 연간 누적 출하량과 MSY 계산 결과 정기 검증
- 모돈 `ИТОГО` 행이 없는 날짜가 MSY 계산에서 정상 제외되는지 확인
- 모바일 화면의 표와 돈사별 상세 패널 사용성 확인
