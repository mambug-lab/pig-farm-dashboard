# Google Apps Script

## 대상 구글시트

양돈장 작업일지 및 대시보드 연동용 시트

## 주요 함수

- setupDashboardLinkedSheets
- refreshDashboardLinks
- refreshMonthlyLinkSheet
- refreshAnnualLinkSheet
- installDashboardTriggers

## 생성되는 시트

- 대시보드_월간연동용
- 대시보드_연간연동용

## 자동 트리거

- onEdit
- onChange

## 유효 작업일지 판단 기준

- E:H열의 실제 입력값 기준
- 자동 수식값은 제외
- ИТОГО와 ВСЕГО는 입력 여부 판정에 사용하지 않음
- ИТОГО는 모돈 부분합 및 MSY 모돈수 산정에 사용
- ВСЕГО는 전체 사육두수·출하·폐사 계산에 사용