# 변경이력 — 양돈장 종합관리 프로그램

정리일: 2026-09-07. 기준 저장소: `mambug-lab/pig-farm-dashboard`, 기준 커밋 `c0a275a8e35a93314fd45639142fc3f970962807`.

커밋·파일 시각은 별도 표기가 없으면 UTC이다. 기존 대화 요약의 날짜는 해당 요약 표기를 유지한다. 날짜를 알 수 없는 수정은 임의로 날짜를 부여하지 않는다. 여기서 ‘확인’은 아래 구분에 한정되며 운영 성공으로 일괄 해석하지 않는다.

- **요구·제안**: 요청 또는 제공안. 적용을 보장하지 않음.
- **산출물**: 파일 생성·저장 확인. 배포를 보장하지 않음.
- **커밋**: GitHub 변경 확인. Apps Script 실행 환경 반영을 보장하지 않음.
- **배포**: GitHub Pages 작업 성공 기록 확인.
- **기록상 검증**: 당시 문서·대화에 성공이 기록됨. 이번에 재현한 것은 아님.
- **재검증**: 이번 원본 데이터 조회·재집계로 확인.

## 2026-09-19 — v11.5-RC9 적용 및 검증

**코드 수정 / 테스트 시트 검증 / 원본 적용 확인**

- 기준 후보를 `Code.gs v11.5-RC9`으로 갱신하고 사용자 확인에 따라 GitHub에 저장.
- 짧은 달의 29~31일 블록을 삭제할 때 날짜 없는 예비 일지가 삭제된 행을 참조해 발생하던 `#REF!` 오류를 수정.
- 새 월 시트에서는 마지막 날짜 뒤의 무날짜 예비 블록을 먼저 제거한 후, 대상 월에 없는 날짜 블록을 삭제하도록 변경.
- 날짜 처리, F-01/F-03 실사보정, 연도 경계 이월, UI 비의존 오류 처리 등을 포함한 로컬 회귀검사 62건 통과, 실패 0건.
- 폐기 가능한 테스트 통합문서에서 2027년 2월을 재생성하여 날짜 28개, J열 머리글 28개, 이월 상세 12개 및 합계 5,367두 일치, 수식 오류 0건 확인.
- 같은 월 재요청 시 중복 생성하지 않는 동작과 유효 작업일이 없는 2월에서 3월 생성을 차단하는 안전장치 확인.
- 테스트 전용 검증 함수를 최종 RC9 코드에서 제거하고 테스트 Apps Script를 `Code_RC9.gs` 단일 파일로 정리.
- 원본 Apps Script에 RC9을 적용한 후 `refreshDashboardLinks()` 실행 완료. 월간 연동 대상은 Август 2026, 유효 작업일 26일, 최신 유효일 2026-08-26이며 연간 연동 출력은 총 4,626행.
- 원본 실행에서 오류 없이 완료됨. 기존 수동 월 경계 재고 차이 +13, +41, +33, -63두는 RC9 신규 오류가 아닌 원본 데이터 확인 사항으로 유지.
- 테스트 통합문서 이름·ID, 테스트 셀 `E1183=0`, 2027년 테스트 월, 임시 백업명과 검증 함수가 최종 RC9에 고정 참조로 남지 않았음을 확인.
- 대시보드 표시 수치의 원본 대조와 자동 월 생성 트리거의 설치·시간대·실행 이력 검증은 다음 단계로 유지.

검증 보고서: `FINAL_VALIDATION_REPORT_v11.5-RC9.md`. 원본 실행 로그는 2026-09-19 11:38:19~11:38:33에 정상 완료.

## 2026-09-07 — 현황·변경이력 통합

**문서 작성 / 데이터 재검증**

- `docs/PROJECT_STATUS.md`, `docs/CHANGELOG.md`, `docs/SHEET_STRUCTURE.md` 작성 및 사용자 요청에 따라 GitHub main에 문서만 커밋. 기존 `apps-script/docs/` 문서는 과거 기록으로 보존.
- 과거 Chat 요약, 검색 가능한 대화 기록, 프로젝트 생성 결과물, Drive 백업, GitHub 파일·커밋·배포 이력, 현재 Sheets 자료를 비교.
- 5~8월 원본 값·수식에 원본 E13:H16,+39행 규칙을 적용해 유효일 115개, 출하 1,143두, 폐사 410두, 평균 모돈 366.147826…두 확인.
- 2026-05-01~2026-08-26의 달력 118일로 MSY 9.656074…를 재산출하여 시트 표시 9.66과 일치 확인.
- 8월 26일까지 유효일 26일, 출하 343두, 폐사 119두 확인.
- GitHub GS의 이전 검사 방식과 Drive v10·현재 메타 출력의 불일치를 PM-01로 등록.
- 원본 행 13~16과 연동용 행 15~18의 2행 차이를 문서에 명확히 구분.
- 조선어 UI 미구현, 트리거 실동작·현재 화면 확인 미완료를 잔여 사항으로 기록.
- 프로그램 코드, 일지 입력값, Apps Script, 트리거, 배포 설정은 변경하지 않음.

근거: [현재 시트](https://docs.google.com/spreadsheets/d/1DcnLGcjh5m2zfilXzDLQCv7u6dOyzyXdUJol2Svk3IA/edit), [검토 기준 GitHub](https://github.com/mambug-lab/pig-farm-dashboard/tree/c0a275a8e35a93314fd45639142fc3f970962807). 상세 근거와 한계는 [PROJECT_STATUS.md](PROJECT_STATUS.md) 참조.

## 2026-09-05 — 최종 HTML 연동 수정 및 배포

### 15:34:39 — `c0a275a` / Update index.html

**커밋 / 배포 확인**

- `index.html` 수정. 커밋 차이 497행.
- GID 후보·빈 GID 방식에서 월간/연간 탭명 및 지정 범위 조회로 변경.
- 월간 데이터 `A1:I1215`, 메타 `K1:R10`, 최신 유효일 `L3:L3`, 연간 집계 `K1:O30`을 분리해 조회.
- 언어 변경 시 월간 데이터·메타·날짜 조회 결과를 유지하여 다시 표시.
- 현행 HTML은 유효일을 다시 판정하지 않고 GS가 제공하는 최신일·KPI와 월별 요약을 사용. 비육돈 및 돈군 상세는 해당일 상세행에서 집계.
- 해당 커밋의 Pages 배포 작업이 15:35:28까지 완료·success.
- 배포 성공과 별도로 이번 실제 브라우저 UI 연동 검증은 미완료.

근거: [커밋 c0a275a](https://github.com/mambug-lab/pig-farm-dashboard/commit/c0a275a8e35a93314fd45639142fc3f970962807), [Pages 실행](https://github.com/mambug-lab/pig-farm-dashboard/actions/runs/33975230616).

### 14:42:07 — Drive `code.gs v10.txt` 수정

**산출물 확인 / 실행 원본 동일성 미확인**

- 본문 버전 v10.0.
- 원본 E13:H16부터 39행 간격, 높이 4행으로 수동 숫자 입력 검사.
- 수식 제외, 사람이 직접 입력한 숫자 0 인정.
- 원본 1행부터 마지막 유효일 전체 끝까지 월간 A3:I로 복사. 연간은 월 순서로 연결.
- 같은 유효일 판정으로 일별 KPI, 월별 요약, 누적 예상 MSY를 생성.
- MSY는 누적 출하 × 365 ÷ 평균 모돈 ÷ 누적 달력일수.
- 월간 K:R KPI, 연간 K:O 월별 요약 출력 포함. 현재 시트 값·표제와 구조 일치.
- 저장소 `apps-script/Code.gs`는 이 버전으로 갱신되어 있지 않음.

근거: [Drive v10](https://drive.google.com/file/d/1DO0U-He1dkwrRy4OygVLLrG4ClGBKPtv/view). 저장시각은 Apps Script 적용시각이 아님.

### 13:28:14 — `f1da68f` / main 병합

**커밋 확인**

- GitHub main 병합 커밋. 부모는 `d317445`와 `05745e3`.
- 메시지는 main 브랜치 병합이며 개별 기능 완료의 증거로 사용하지 않음.

근거: [커밋 f1da68f](https://github.com/mambug-lab/pig-farm-dashboard/commit/f1da68fa4202520c741670d5a400459120af9ca4).

### 13:24:14 — `05745e3` / HTML 대규모 변경

**커밋 확인**

- 실제 변경 파일은 `index.html`, 커밋 차이 6,726행.
- 커밋 제목은 `Update print statement from '\''Hello'\'' to '\''Goodbye'\''`, 본문은 `pdate dashboard monthly sales mortality panel`로 불명확함.
- 제목을 그대로 기능 설명으로 전환하지 않음. 이후 c0a275a가 추가 수정한 사실과 함께 관리.

근거: [커밋 05745e3](https://github.com/mambug-lab/pig-farm-dashboard/commit/05745e3d29e19d7ae28a23bec14f91fde2bdfcea).

### 03:16~03:19 — v10 보류 및 v9.1 제공 논의

**요구·제안 / 과거 대화 검색 근거**

- 기존 39행 구조와 원본부터 최신 유효일 끝까지의 복사 구조를 유지하라는 요청.
- v10을 즉시 적용하지 말라는 당시 지시 및 v9.1 GS/HTML 제공 기록.
- 월 유효일 26일·출하 343두·폐사 119두를 검증 기대값으로 제시.
- 이는 같은 날 오후의 Drive 저장·GitHub 커밋보다 이전 기록이다. 이 기록만으로 현재 v10이 적용되지 않았다고 판단하지 않음.
- 검색 결과에 원본/연동용 행 15~18 설명이 혼재하므로 현재 원본 13~16,+39 및 연동용 +2행으로 구분.

근거: 과거 대화 검색 반환 기록. 원문 링크 미반환, 해당 구간 전체 대화는 재열람하지 못함.

## 2026-09-04 — Drive 백업 자료

**산출물 확인**

- `구글대시보드_유효일지기준수정_v4.html`의 Drive 수정시각 09:29:58.
- 이 파일은 2026-07-16 생성 v4 결과물과 앞뒤 공백을 제외한 텍스트가 같음. 9월 신규 기능 버전으로 분류하지 않음.
- 별도 Drive `index.html` 수정시각 14:08:10, 메타정보상 크기 130,782바이트. 현재 GitHub index 94,131바이트와 다른 파일.
- 따라서 Drive에 있는 여러 index 중 수정일 또는 파일명만으로 운영 정본을 선택하지 않음.

근거: [Drive v4](https://drive.google.com/file/d/1FgdxW5H-D0DSJ3Mdj988PBKu-nUnrPvb/view), [Drive index](https://drive.google.com/file/d/1yGo5Z1OvEOoY1bs1dTGceIoOSyZRh9gs/view), 프로젝트 생성 v4 결과물.

## 2026-08-26 — 동적 작업일 블록 및 대시보드 계산 수정

**커밋 / 기록상 검증**

| 시각 | 커밋 | 실제 변경 |
| --- | --- | --- |
| 07:05:12 | [19aeb94](https://github.com/mambug-lab/pig-farm-dashboard/commit/19aeb94acc016274a306f6766b1606e90ebd9c5d) | `apps-script/docs/PROJECT_STATUS.md` 수정. 당시 운영·검증 결과 기록 |
| 06:56:50 | [db12188](https://github.com/mambug-lab/pig-farm-dashboard/commit/db12188ec3c6a5b0cbaf8ee6b58e0bec2d2f6d1e) | `index.html` 계산 및 데이터 상태 처리 변경 |
| 06:56:12 | [e595905](https://github.com/mambug-lab/pig-farm-dashboard/commit/e595905cbf5bd3b795d8ecfcf5e0b5fbb44b93f4) | 실제 변경은 `PROJECT_STATUS.md`만. 메시지의 Code.gs 수정 언급과 파일 변경을 구분 |
| 06:30:21 | [caac9c8](https://github.com/mambug-lab/pig-farm-dashboard/commit/caac9c8007361accecb4b5c222845b7e56ef273c) | `apps-script/Code.gs` 날짜 블록 동적 탐지 변경 |

- 당시 GS는 각 날짜행~다음 날짜행 직전 전체 E:H에서 수동 숫자를 검사하도록 변경. ИТОГО/ВСЕГО는 유효성 판정에서 제외하고 KPI에 활용.
- 당시 HTML은 Apps Script가 생성한 최신 블록을 사용하고, 연간 자료를 별도 조회하며 모돈 강제값 375 및 최신 모돈수 대체값을 제거했다고 기록됨.
- 당시 Apps Script에 `Code.gs`와 `Code 사본.gs`가 함께 있어 `DASHBOARD_CONFIG` 중복 선언 오류 발생. 사본 삭제 후 해결했다고 기존 문서에 기록됨.
- 당시 문서 확인값: 기준일 2026-08-23, MSY 9.55, 총 5,486두, 모돈 363두. 이 수치는 현재 수치가 아닌 당시 검증 기록.
- 이후 대화 요약에는 F2=26, L3=2026.08.26 확인 후 HTML 연동 실패 재보고가 있음. 개별 메시지 일시가 충분히 확인되지 않아 위 성공 기록 뒤의 미해결 이력으로만 보존.

근거: 위 커밋과 [당시 상태 문서가 포함된 현행 파일](https://github.com/mambug-lab/pig-farm-dashboard/blob/c0a275a8e35a93314fd45639142fc3f970962807/apps-script/docs/PROJECT_STATUS.md), 제공된 「대시보드 하단부 변경」 대화 요약.

## 2026-08-05 — 하단 월별 현황판 요청

**요구·제안**

- 하단을 좌우 50:50으로 나누어 왼쪽 돈군 이동·재고, 오른쪽 월간 폐사·판매 현황판 배치 요청.
- 월별 판매두수·폐사두수, 연간 누적, 월별 추이 그래프 요구. 폐사율은 제외.
- 현재 HTML에는 해당 구성이 존재하나 최초 적용일은 이 요청일과 동일하다고 확정하지 않음.
- 같은 날짜에 대시보드 생성 이미지가 있으나 이미지 생성 자체를 실제 코드 배포로 인정하지 않음.

근거: 제공된 대화 요약과 프로젝트 생성 이미지 메타정보, [현행 index.html](https://github.com/mambug-lab/pig-farm-dashboard/blob/c0a275a8e35a93314fd45639142fc3f970962807/index.html).

## 2026-07-29 — 프로젝트 관리 문서·매니페스트 추가

**커밋 확인**

| 커밋 | 내용 |
| --- | --- |
| [d317445](https://github.com/mambug-lab/pig-farm-dashboard/commit/d31744525a16f22953464c9084aa97194b55477d) | SESSION_STARTER.md 생성 |
| [dc7a214](https://github.com/mambug-lab/pig-farm-dashboard/commit/dc7a21475a431e5d57baae71a04c74e6906a29d9) | SHEET_STRUCTURE.md 생성 |
| [d6e93dc](https://github.com/mambug-lab/pig-farm-dashboard/commit/d6e93dc013e4d983801e3a269305204d0fd9a879) | PROJECT_STATUS.md 수정 |
| [d49e95c](https://github.com/mambug-lab/pig-farm-dashboard/commit/d49e95c48075791ce9be9c8ca54d37cef2422640) | PROJECT_STATUS.md 생성 |
| [9160273](https://github.com/mambug-lab/pig-farm-dashboard/commit/91602733d1351e8f0ffb28c91c74cd8bae0c6c15) | Apps Script 운영 README 생성 |
| [bfa1f89](https://github.com/mambug-lab/pig-farm-dashboard/commit/bfa1f89399208d009b9848d52426083fb187b6df) | appscript.json 백업 추가 |

- 당시 버전 표기 `v0.1.0-dev`, 개발·검증 중.
- 7월 12일 마지막 5행 복사 문제를 수정·검증했다고 문서에 기록. HTML 계산은 당시 재검증 필요 상태.
- 현재 확인되는 문서는 루트 docs가 아닌 `apps-script/docs/`에 있으며 README는 `apps-script/apps-script/README.md`에 위치.

## 2026-07-27 — GS 정본 최초 커밋 및 v7 자료

**커밋 / 산출물 확인**

- [599a2cb](https://github.com/mambug-lab/pig-farm-dashboard/commit/599a2cb521203933ba3fbcc8384c1e5be2bb534a): `Code.gs` 추가.
- 프로젝트의 `붙여넣은 텍스트 (2).txt`는 헤더 v7. 날짜 블록 복사 끝을 다음 날짜 직전으로 처리하는 취지이나 검사 설정은 첫행 15, 반복 26행, 수동 0 제외.
- ‘복사 길이를 고정하지 않음’과 ‘유효 입력 검사 간격이 26행’은 별개 설정이었다. v7이라는 이름만으로 현재 규칙과 같다고 판단하지 않음.

## 2026-07-16 — 유효일지·합계행 구분 결과물

**산출물 확인 / 적용 여부 개별 미확인**

- HTML 유효일지기준수정 v1~v5, ИТОГО/ВСЕГО 구분수정 v6 생성 결과물 존재.
- v6 주요 로직에서 ВСЕГО를 농장 전체 총계로, ИТОГО를 부분합으로 구분하는 처리 확인.
- GS `AppsScript_월간연동_수동입력기준_v5.gs`는 E:H의 15~18,+26행 검사, 수식·수동 0 제외 설정.
- GS `AppsScript_수동입력기준_ИТОГОВСЕГО무시_v4.gs`는 파일명 v4와 본문 헤더 v3가 다르고 수동 0 인정 설정이 존재. 버전명만으로 정책을 추정하면 안 되는 사례.
- 모든 결과물은 개발 이력이며 현재 정본으로 재적용하지 않음.

근거: 프로젝트 폴더의 생성 파일 본문·메타정보. 대표 식별자는 PROJECT_STATUS 출처 A1·A4 참조.

## 2026-06-18 — 대시보드 저장소 시작

**커밋 확인**

- [b4b4b6f](https://github.com/mambug-lab/pig-farm-dashboard/commit/b4b4b6f418eb252662a1c32001ed83313e8b8fb3): `Add dashboard index.html`.
- 커밋 메시지에 월간·연간 연동용 시트를 자동 생성하여 공유할 파일 작성 중이라고 기재.
- 검토한 저장소 커밋 이력의 가장 오래된 항목. 프로젝트 자체의 시작일과는 다름.

## 2026-05-21~22 — Google Sheets 연결 대시보드

**산출물 / 과거 대화상 검증**

- 5월 21일 HTML 자료에서 예상 MSY, 총두수, 출하·폐사, 돈군 현황 표시 확인.
- 과거 대화 검색에 5월 22일 JSONP 연동 성공 및 5,138두·폐사 1두·출하 11두·MSY 10.71 표시 기록이 반환됨. 과거 assistant 기록으로, 당시 원본 화면을 이번에 다시 검증하지 않음.
- 얇은 상태바, 돈군 요약, 좌측 돈사별 상세 트리 등 수정안 제공 이력.
- 코드 수정은 부분 설명보다 전체 수정본 제공을 우선한다는 사용자 운영 선호 확립.

## 2026-05-03 — 초기 시제품 및 다국어 설계

**산출물 / 요구·제안**

- 브라우저 메모리 기반 단일 HTML 시제품과 Streamlit 방식 검토 기록.
- `Pasted code(4).py`에서 Streamlit, dashboard/sheets 모듈 참조, 한국어 ko·러시아어 ru·조선어 ko_kp 설정 확인.
- 이 초기 코드의 조선어 설정이 현재 GitHub Pages HTML에 이어졌다고 판단하지 않음.

## 2026-01-02 — 양돈관리일지 Word 양식 요청

**요구 확인**

- 손글씨 양돈관리일지 사진을 Word로 작성하라는 요청이 제공된 프로젝트 대화 요약에 존재.
- Drive에서 조선어 일지와 러시아어·한글 일지의 생산·관리작업·사료/약품·교육 항목을 확인.
- 발견된 문서가 해당 1월 2일 요청의 정확한 최종 결과물인지는 확인되지 않아 동일 산출물로 연결하지 않음.

## 날짜 미확정 이력

- 월말→월초 수식 복사, 빈 양식이 최신일로 선택되는 문제, 모돈/총계 혼동, 월간·연간 QUERY 오류, 상세 돈사 수 불일치 등의 보고가 기존 요약에 존재.
- 실제 변경일·코드 버전·검증 근거가 충분하지 않은 항목은 독립 ‘수정 완료’ 릴리스로 만들지 않음.
- 「구글 연동 대시보드 작성」 세션의 시작일과 그 안의 모든 후속 메시지 날짜를 동일하게 취급하지 않음.

관련 문서: [PROJECT_STATUS.md](PROJECT_STATUS.md), [SHEET_STRUCTURE.md](SHEET_STRUCTURE.md).

