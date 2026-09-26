


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