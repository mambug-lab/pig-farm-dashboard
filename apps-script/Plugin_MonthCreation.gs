


function ensureMonthlyDiaryTemplate_(
  ss,
  sourceSheet
) {

  let templateSheet =
    ss.getSheetByName(
      MONTHLY_SHEET_CREATION_CONFIG
        .TEMPLATE_SHEET_NAME
    );


  if (
    templateSheet &&
    hasCompleteMonthlyTemplate_(
      templateSheet
    )
  ) {
    return templateSheet;
  }


  const candidates =
    [sourceSheet]
      .concat(
        listMonthlySheetDescriptors_(ss)
          .sort(
            function(a, b) {
              return (
                b.year - a.year ||
                b.month - a.month
              );
            }
          )
          .map(
            function(item) {
              return item.sheet;
            }
          )
      )
      .filter(
        function(sheet, index, list) {
          return (
            sheet &&
            list.indexOf(sheet) === index
          );
        }
      );


  const referenceSheet =
    candidates.filter(
      function(sheet) {
        return hasCompleteMonthlyTemplate_(
          sheet
        );
      }
    )[0] ||
    null;


  if (!referenceSheet) {
    throw new Error(
      "1일부터 31일까지 전체 날짜 블록이 있는 참고 월 시트를 찾지 못했습니다."
    );
  }


  const oldTemplate =
    templateSheet;


  const oldTemplateName =
    oldTemplate
      ? MONTHLY_SHEET_CREATION_CONFIG.TEMPLATE_SHEET_NAME +
        "_교체_" +
        new Date().getTime()
      : "";


  if (oldTemplate) {
    oldTemplate.setName(
      oldTemplateName
    );
  }


  try {

    templateSheet =
      referenceSheet.copyTo(
        ss
      );


    templateSheet
      .setName(
        MONTHLY_SHEET_CREATION_CONFIG
          .TEMPLATE_SHEET_NAME
      )
      .hideSheet();


    if (oldTemplate) {
      ss.deleteSheet(
        oldTemplate
      );
    }

  } catch (error) {

    if (
      oldTemplate &&
      !ss.getSheetByName(
        MONTHLY_SHEET_CREATION_CONFIG
          .TEMPLATE_SHEET_NAME
      )
    ) {
      oldTemplate.setName(
        MONTHLY_SHEET_CREATION_CONFIG
          .TEMPLATE_SHEET_NAME
      );
    }

    throw error;
  }


  Logger.log(
    "월 작업일지 자동생성 템플릿을 만들었습니다: " +
    templateSheet.getName() +
    " / 참고 시트: " +
    referenceSheet.getName()
  );


  return templateSheet;
}


function clearManualMonthlyEntries_(
  sheet,
  dateBlocks
) {

  const lastRow =
    Math.max(
      1,
      sheet.getLastRow()
    );


  const scanRange =
    sheet.getRange(
      1,
      1,
      lastRow,
      DASHBOARD_CONFIG.SOURCE_DATA_COLS
    );


  const values =
    scanRange.getValues();


  const displayValues =
    scanRange.getDisplayValues();


  const formulas =
    scanRange.getFormulas();


  const cellsToClear = [];


  (dateBlocks || [])
    .forEach(
      function(block) {

        for (
          let rowNum = block.dateBlockStartRow;
          rowNum <= block.copyEndRow;
          rowNum++
        ) {

          const rowIndex =
            rowNum - 1;


          const rowHasEntityLabel =
            Boolean(
              cellText_(
                displayValues[rowIndex],
                values[rowIndex],
                0
              ) ||
              cellText_(
                displayValues[rowIndex],
                values[rowIndex],
                2
              )
            );


          if (
            rowNum === block.dateBlockStartRow ||
            rowNum === block.dateBlockStartRow + 1 ||
            !rowHasEntityLabel
          ) {
            continue;
          }


          for (
            let column =
              MONTHLY_SHEET_CREATION_CONFIG
                .FIRST_ENTRY_COL;
            column <=
              MONTHLY_SHEET_CREATION_CONFIG
                .LAST_ENTRY_COL;
            column++
          ) {

            const zeroBasedCol =
              column - 1;


            if (
              String(
                formulas[rowIndex][zeroBasedCol] || ""
              ).trim() !== ""
            ) {

              continue;
            }


            const displayed =
              String(
                displayValues[rowIndex][zeroBasedCol] == null
                  ? ""
                  : displayValues[rowIndex][zeroBasedCol]
              ).trim();


            const raw =
              values[rowIndex][zeroBasedCol];


            if (
              displayed !== "" ||
              !(
                raw === "" ||
                raw === null ||
                raw === undefined
              )
            ) {

              cellsToClear.push(
                columnNumberToLetter_(column) +
                rowNum
              );
            }
          }
        }
      }
    );


  if (cellsToClear.length) {

    sheet
      .getRangeList(
        cellsToClear
      )
      .clearContent();
  }
}


function updateMonthlyDateCells_(
  sheet,
  dateBlocks,
  targetYear,
  targetMonth
) {

  const daysInTargetMonth =
    new Date(
      targetYear,
      targetMonth,
      0
    ).getDate();


  const scan =
    scanMonthlySheet_(
      sheet
    );


  const plan =
    getMonthlyTemplateDatePlan_(
      dateBlocks
    );


  if (
    plan.primaryBlocks.length <
      MONTHLY_SHEET_CREATION_CONFIG.MIN_TEMPLATE_CALENDAR_DAYS
  ) {
    throw new Error(
      "자동생성 템플릿에 1~31일 날짜 블록이 모두 필요합니다."
    );
  }


  let updatedCount =
    0;


  (dateBlocks || [])
    .forEach(
      function(block) {

        const rowIndex =
          block.dateBlockStartRow - 1;


        let targetDate =
          null;


        if (
          plan.primaryBlocks.indexOf(
            block
          ) !== -1 &&
          block.date.getDate() <=
            daysInTargetMonth
        ) {

          targetDate =
            createSafeCalendarDate_(
              targetYear,
              targetMonth - 1,
              block.date.getDate()
            );

        } else if (
          block ===
          plan.sentinelBlock
        ) {

          targetDate =
            createSafeCalendarDate_(
              targetYear,
              targetMonth,
              1
            );
        }


        for (
          let col = 0;
          col < DASHBOARD_CONFIG.MAX_DATA_COLS;
          col++
        ) {

          const formula =
            String(
              scan.formulas[rowIndex][col] || ""
            ).trim();


          if (formula !== "") {
            continue;
          }


          if (
            !parseDateFromCell_(
              scan.values[rowIndex][col]
            )
          ) {

            continue;
          }


          const cell =
            sheet.getRange(
              block.dateBlockStartRow,
              col + 1
            );


          if (targetDate) {

            cell.setValue(
              targetDate
            );

          } else {

            cell.clearContent();
          }


          updatedCount +=
            1;
        }
      }
    );


  if (!updatedCount) {

    throw new Error(
      "템플릿의 날짜 셀을 갱신하지 못했습니다. 날짜가 직접입력 값인지 확인하세요."
    );
  }
  // The undated reserve diary is not part of the target month. Remove it
  // before shorter-month rows so its references to day 31 cannot become #REF!.
  // This function is used only on the newly copied monthly sheet.
  const finalCalendarBlock = plan.primaryBlocks[plan.primaryBlocks.length - 1];
  const reserveStart = !plan.sentinelBlock && finalCalendarBlock
    ? findTrailingUndatedTemplateBoundaryRow_(scan, finalCalendarBlock.dateBlockStartRow)
    : null;
  if (reserveStart) {
    sheet.deleteRows(reserveStart, sheet.getMaxRows() - reserveStart + 1);
  }

  // Clearing only the date merges unused 29/30/31 blocks into the last valid
  // day. Remove those complete blocks in descending order on the NEW sheet.
  plan.primaryBlocks.filter(function(block) {
    return block.date.getDate() > daysInTargetMonth;
  }).sort(function(a, b) {
    return b.dateBlockStartRow - a.dateBlockStartRow;
  }).forEach(function(block) {
    sheet.deleteRows(block.dateBlockStartRow, block.copyEndRow - block.dateBlockStartRow + 1);
  });

}


function buildAdjustedClosingInventoryMap_(
  monthlyInfo
) {

  const result =
    new Map();


  const blocks =
    (monthlyInfo.validBlocks || [])
      .slice()
      .sort(
        function(a, b) {

          return (
            a.date.getTime() -
            b.date.getTime()
          );
        }
      );


  if (!blocks.length) {
    return result;
  }


  const lastBlock =
    blocks[
      blocks.length - 1
    ];


  const adjustedScan =
    monthlyInfo.adjustedScan ||
    monthlyInfo.scan;


  collectInventoryEntityRows_(
    adjustedScan,
    lastBlock,
    true
  )
    .forEach(
      function(item) {

        result.set(
          item.key,
          item.currentStock
        );
      }
    );


  return result;
}


function carryClosingInventoryToFirstDay_(
  sheet,
  targetScan,
  firstBlock,
  closingInventory
) {

  let carriedCount =
    0;


  const missingKeys = [];

  const usedKeys =
    new Set();


  const targetRows =
    collectInventoryEntityRows_(
    targetScan,
    firstBlock,
    false
  );


  targetRows
    .forEach(
      function(item) {

        if (
          !closingInventory.has(
            item.key
          )
        ) {

          missingKeys.push(
            item.key
          );

          return;
        }


        sheet
          .getRange(
            item.rowNum,
            MONTHLY_SHEET_CREATION_CONFIG
              .PREVIOUS_STOCK_COL
          )
          .setValue(
            closingInventory.get(
              item.key
            )
          );


        carriedCount +=
          1;

        usedKeys.add(
          item.key
        );
      }
    );


  const unusedKeys =
    Array.from(
      closingInventory.keys()
    )
      .filter(
        function(key) {
          return !usedKeys.has(key);
        }
      );


  return {
    carriedCount: carriedCount,
    targetCount: targetRows.length,
    closingCount: closingInventory.size,
    missingKeys: missingKeys,
    unusedKeys: unusedKeys
  };
}


function getMonthlyTemplateDatePlan_(
  dateBlocks
) {

  const groups =
    new Map();


  (dateBlocks || [])
    .forEach(
      function(block) {

        if (!block || !block.date) {
          return;
        }


        const key =
          block.date.getFullYear() +
          "-" +
          String(
            block.date.getMonth() + 1
          ).padStart(2, "0");


        const group =
          groups.get(key) ||
          [];


        group.push(block);
        groups.set(key, group);
      }
    );


  const primaryBlocks =
    Array.from(groups.values())
      .sort(
        function(a, b) {
          return (
            new Set(
              b.map(function(item) {
                return item.date.getDate();
              })
            ).size -
            new Set(
              a.map(function(item) {
                return item.date.getDate();
              })
            ).size
          );
        }
      )[0] ||
    [];


  primaryBlocks.sort(
    function(a, b) {
      return (
        a.dateBlockStartRow -
        b.dateBlockStartRow
      );
    }
  );


  const lastPrimaryRow =
    primaryBlocks.length
      ? primaryBlocks[
          primaryBlocks.length - 1
        ].dateBlockStartRow
      : 0;


  const sentinelBlock =
    (dateBlocks || [])
      .filter(
        function(block) {
          return (
            primaryBlocks.indexOf(block) === -1 &&
            block.dateBlockStartRow >
              lastPrimaryRow
          );
        }
      )
      .sort(
        function(a, b) {
          return (
            a.dateBlockStartRow -
            b.dateBlockStartRow
          );
        }
      )[0] ||
    null;


  return {
    primaryBlocks: primaryBlocks,
    sentinelBlock: sentinelBlock
  };
}


function hasCompleteMonthlyTemplate_(sheet) {

  const plan =
    getMonthlyTemplateDatePlan_(
      collectAllDateBlocks_(sheet)
    );


  const days =
    new Set(
      plan.primaryBlocks.map(
        function(block) {
          return block.date.getDate();
        }
      )
    );


  for (
    let day = 1;
    day <= MONTHLY_SHEET_CREATION_CONFIG.MIN_TEMPLATE_CALENDAR_DAYS;
    day++
  ) {
    if (!days.has(day)) {
      return false;
    }
  }


  return true;
}


function findNextMonthlySheetTarget_(ss) {

  const descriptors =
    listMonthlySheetDescriptors_(
      ss
    );


  if (!descriptors.length) {

    throw new Error(
      "기준이 될 기존 월 작업일지 시트를 찾지 못했습니다."
    );
  }


  const latest =
    descriptors[
      descriptors.length - 1
    ];


  const next =
    new Date(
      latest.year,
      latest.month,
      1,
      12,
      0,
      0
    );


  return {
    year:
      next.getFullYear(),

    month:
      next.getMonth() + 1
  };
}


function parseMonthlySheetTarget_(text) {

  const match =
    String(text || "")
      .trim()
      .match(
        /^(20\d{2})\s*[-./]\s*(0?[1-9]|1[0-2])$/
      );


  if (!match) {

    throw new Error(
      "입력 형식이 올바르지 않습니다. YYYY-MM 형식으로 입력하세요."
    );
  }


  return {
    year:
      Number(match[1]),

    month:
      Number(match[2])
  };
}


function validateMonthlySheetTarget_(
  year,
  month
) {

  if (
    !Number.isInteger(year) ||
    year < 2026 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {

    throw new Error(
      "생성 연월이 올바르지 않습니다. 2026-01부터 2100-12 사이의 연월을 입력하세요."
    );
  }
}