# v11.5-RC10 실검증 및 운영 반영 기록

- 검증일: 2026-09-23
- 운영 Apps Script: `1uqBBRRNcoeNhkCxLO-ubm3ZeXJezzRpgf4HNVihyjyykPVzjbh675wbU`
- 테스트 Apps Script: `1xyV6D8yXwhdxbUESSYx1jwsqyWSiwVfglqk7GPjHw_XFC4nnRiiLADi3`
- RC10 `Code.gs` SHA-256: `ace8a522c9544beda78c22552d286bd21236268c4d2ae8199838e1f7748a5d2f`

## 결과

RC10 후보를 독립 테스트 사본에서 실행해 관리사무소 대장 기준 공식 재고가 월초 수기 기초재고로 초기화되지 않고 월 경계를 이어가는 것을 확인했다. 테스트용 트리거 5개는 검증 후 모두 완전삭제했고, 테스트 프로젝트의 트리거가 0개임을 재확인했다.

동일한 RC10 코드를 운영 Apps Script의 `Code.gs`에 저장하고 재접속하여 `Code.gs v11.5-RC10` 표식과 구문 오류 없음, Drive 저장 완료를 확인했다.

운영 프로젝트에서 다음 함수를 실행했다.

- `installDashboardTriggers()` — 편집, 변경, 5분 재시도 트리거 설치 완료
- `installMonthlySheetCreationTrigger()` — 매월 1일 01시경 월 생성 트리거 설치 완료
- `refreshDashboardLinks()` — 월간·연간 연동 갱신 완료

운영 트리거 페이지에는 다음 4개가 중복 없이 표시됐다.

| 함수 | 이벤트 |
| --- | --- |
| `dashboardOnEdit` | 스프레드시트 수정 시 |
| `dashboardOnChange` | 스프레드시트 변경 시 |
| `flushPendingDashboardRefresh` | 시간 기반, 5분 재시도 |
| `createCurrentMonthSheetOnFirstDay` | 시간 기반, 매월 1일 |

## 운영 갱신 결과

- 월간 대상: `Август 2026`
- 유효 작업일: 26일
- 최신 유효일: 2026-08-26
- 월간 복사 종료행: 1014
- 연간 출력: 4,626행
- 실행 종료: 오류 없이 완료

RC10 계산에서는 기존 수기 월 경계 차이를 원자료에서 지우지 않고, 공식 통계는 관리사무소 대장 기준으로 이어간다. 운영 실행 로그에 표시된 수기 차이는 +13, +41, +29, -59두였다.

## 검증 범위

- 로컬 회귀검사: 75건 통과, 실패 0건
- 테스트 사본 월 경계: 5월→6월 5,258두, 6월→7월 5,399두, 7월→8월 5,366두로 공식 재고 연속성 확인
- 테스트 트리거: 편집, 변경, 5분 재시도, 임시 월 생성 실행 완료 및 오류율 0% 확인
- 동일 월이 이미 있을 때 월 생성 함수가 추가 탭을 만들지 않는 것 확인

실제 존재하지 않는 월의 생성 성공 경로와 다음 정규 매월 1일 예약 발화는 해당 시점이 도래한 뒤 실행 이력에서 추가 확인한다.
