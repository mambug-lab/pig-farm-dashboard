


/***************************************************************
 * 자동갱신 트리거
 ***************************************************************/

function dashboardSourceEvent_(event) {
  if (!event || !event.range) return true;
  const name = event.range.getSheet().getName();
  return Boolean(parseMonthlySheetName_(name)) || name === GROUP_INVENTORY_AUDIT_CONFIG.SHEET_NAME;
}

function dashboardOnEdit(event) {
  if (!dashboardSourceEvent_(event)) return;
  return requestDashboardRefresh_();
}

function dashboardOnChange(event) {
  // An ordinary edit also emits onChange(EDIT); onEdit owns that event.
  if (event && event.changeType === 'EDIT') return;
  return requestDashboardRefresh_();
}

function requestDashboardRefresh_() {
  const properties = PropertiesService.getDocumentProperties();
  properties.setProperty('DASHBOARD_REFRESH_PENDING', '1');
  return flushPendingDashboardRefresh();
}

function flushPendingDashboardRefresh() {
  const properties = PropertiesService.getDocumentProperties();
  if (properties.getProperty('DASHBOARD_REFRESH_PENDING') !== '1') return;
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(1000)) {
    Logger.log('갱신 요청 대기: 실행 중인 작업 후 예약 재시도');
    return;
  }
  try {
    // Clear before reading; edits during the refresh set it again for retry.
    properties.deleteProperty('DASHBOARD_REFRESH_PENDING');
    return refreshDashboardLinksUnlocked_();
  } catch (error) {
    properties.setProperty('DASHBOARD_REFRESH_PENDING', '1');
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function installDashboardTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const handlers = ['refreshDashboardLinks', 'dashboardOnEdit', 'dashboardOnChange', 'flushPendingDashboardRefresh'];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (handlers.indexOf(trigger.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('dashboardOnEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('dashboardOnChange').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('flushPendingDashboardRefresh').timeBased().everyMinutes(5).create();
  Logger.log('대시보드 트리거 설치 완료: 편집/구조변경 분리, 대기 요청 5분 간격 재시도');
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