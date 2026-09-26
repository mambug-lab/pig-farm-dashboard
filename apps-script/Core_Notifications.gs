


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