


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