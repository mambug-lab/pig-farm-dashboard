


/***************************************************************
 * 작업일 블록의 J열 실사두수 검사
 *
 * - J열 직접입력 숫자만 인정
 * - 수식은 실사입력으로 인정하지 않음
 * - I열에 재고 숫자가 있는 상세행만 대상
 * - ИТОГО / ВСЕГО 합계행 입력은 제외
 ***************************************************************/

function inspectInventoryAuditInputsInBlock_(
  scan,
  startRow,
  endRow
) {

  const cells = [];


  let inAggregateSummary =
    false;


  for (
    let rowNum = startRow;
    rowNum <= endRow;
    rowNum++
  ) {

    const valueRow =
      scan.values[
        rowNum - 1
      ];


    const displayRow =
      scan.displayValues[
        rowNum - 1
      ];


    const formulaRow =
      scan.formulas[
        rowNum - 1
      ];


    if (
      !valueRow ||
      !displayRow ||
      !formulaRow
    ) {

      continue;
    }


    const section =
      cellText_(
        displayRow,
        valueRow,
        0
      );


    const sub =
      cellText_(
        displayRow,
        valueRow,
        2
      );


    if (
      isSubTotalLabel_(section) ||
      isSubTotalLabel_(sub)
    ) {

      inAggregateSummary =
        true;

      continue;
    }


    if (
      isGrandTotalLabel_(section) ||
      isGrandTotalLabel_(sub)
    ) {

      continue;
    }


    if (
      section &&
      !isAnyTotalLabel_(
        section
      )
    ) {

      inAggregateSummary =
        false;
    }


    if (
      inAggregateSummary &&
      !section
    ) {

      continue;
    }


    if (
      !hasNumericCell_(
        displayRow,
        valueRow,
        8
      )
    ) {

      continue;
    }


    const audit =
      manualInventoryAuditValue_(
        displayRow,
        valueRow,
        formulaRow,
        DASHBOARD_CONFIG
          .INVENTORY_AUDIT_COL - 1
      );


    if (!audit.hasValue) {
      continue;
    }


    cells.push(
      columnNumberToLetter_(
        DASHBOARD_CONFIG
          .INVENTORY_AUDIT_COL
      ) +
      rowNum
    );
  }


  return {
    count:
      cells.length,

    cells:
      cells
  };
}


/***************************************************************
 * 돈사/돈방별 비정기 실사보정
 *
 * J열에 실사두수가 있는 상세행은 그 날짜의 확정 재고다.
 * 보정 차이는 같은 돈사/돈방의 다음 실사일까지 승계한다.
 * 원본 시트는 변경하지 않고 연동용 A:I 출력만 보정한다.
 ***************************************************************/

function applyInventoryAuditAdjustments_(
  monthlyAnalyses
) {

  const analyses =
    monthlyAnalyses ||
    [];


  const chronologicalBlocks = [];


  analyses.forEach(
    function(info, analysisIndex) {

      info.outputValues =
        (info.scan.values || [])
          .map(
            function(row) {

              return row.slice(
                0,
                DASHBOARD_CONFIG.MAX_DATA_COLS
              );
            }
          );


      (info.allBlocks || info.validBlocks || [])
        .forEach(
          function(block, blockIndex) {

            chronologicalBlocks.push({
              info:
                info,
              block:
                block,
              resetDetailedOffsets:
                Boolean(
                  analysisIndex > 0 &&
                  blockIndex === 0
                )
            });
          }
        );
    }
  );


  chronologicalBlocks.sort(
    function(a, b) {

      const dateDiff =
        a.block.date.getTime() -
        b.block.date.getTime();


      if (dateDiff !== 0) {
        return dateDiff;
      }


      return (
        a.info.monthIndex -
        b.info.monthIndex
      );
    }
  );


  const entityStates =
    new Map();


  chronologicalBlocks.forEach(
    function(item) {

      if (item.resetDetailedOffsets) {
        entityStates.clear();
      }

      applyInventoryAuditToBlock_(
        item.info,
        item.block,
        entityStates
      );
    }
  );


  analyses.forEach(
    function(info) {

      const adjustedValues =
        (info.scan.values || [])
          .map(
            function(sourceRow, index) {

              const row =
                sourceRow.slice();


              const outputRow =
                info.outputValues[index] ||
                [];


              for (
                let col = 0;
                col <
                  DASHBOARD_CONFIG.MAX_DATA_COLS;
                col++
              ) {

                row[col] =
                  outputRow[col];
              }


              return row;
            }
          );


      info.adjustedScan = {
        lastRow:
          info.scan.lastRow,

        values:
          adjustedValues,

        displayValues:
          info.scan.displayValues,

        formulas:
          info.scan.formulas
      };
    }
  );
}


function applyInventoryAuditToBlock_(
  info,
  block,
  entityStates
) {

  let currentSection =
    "";


  const occurrenceMap =
    new Map();


  const sectionPreviousDeltas =
    new Map();


  const sectionCurrentDeltas =
    new Map();


  const groupPreviousDeltas =
    new Map();


  const groupCurrentDeltas =
    new Map();


  let inAggregateSummary =
    false;


  let grandPreviousDelta =
    0;


  let grandCurrentDelta =
    0;


  block.appliedInventoryAudits =
    [];


  for (
    let rowNum =
      block.dateBlockStartRow;

    rowNum <=
      block.copyEndRow;

    rowNum++
  ) {

    const valueRow =
      info.scan.values[
        rowNum - 1
      ];


    const displayRow =
      info.scan.displayValues[
        rowNum - 1
      ];


    const formulaRow =
      info.scan.formulas[
        rowNum - 1
      ];


    const outputRow =
      info.outputValues[
        rowNum - 1
      ];


    if (
      !valueRow ||
      !displayRow ||
      !formulaRow ||
      !outputRow
    ) {

      continue;
    }


    const section =
      cellText_(
        displayRow,
        valueRow,
        0
      );


    const sub =
      cellText_(
        displayRow,
        valueRow,
        2
      );


    if (
      section &&
      !isAnyTotalLabel_(
        section
      )
    ) {

      inAggregateSummary =
        false;

      currentSection =
        section;
    }


    if (
      isGrandTotalLabel_(section) ||
      isGrandTotalLabel_(sub)
    ) {

      applyDeltaToOutputCell_(
        outputRow,
        displayRow,
        valueRow,
        3,
        grandPreviousDelta
      );


      applyDeltaToOutputCell_(
        outputRow,
        displayRow,
        valueRow,
        8,
        grandCurrentDelta
      );


      continue;
    }


    if (
      isSubTotalLabel_(section) ||
      isSubTotalLabel_(sub)
    ) {

      const sectionKey =
        normalizeEntityText_(
          currentSection
        );


      const groupKey =
        classifyInventoryGroup_(
          currentSection,
          section,
          sub
        );


      const previousDelta =
        groupKey !== "other"
          ? Number(
              groupPreviousDeltas.get(
                groupKey
              ) || 0
            )
          : Number(
              sectionPreviousDeltas.get(
                sectionKey
              ) || 0
            );


      const currentDelta =
        groupKey !== "other"
          ? Number(
              groupCurrentDeltas.get(
                groupKey
              ) || 0
            )
          : Number(
              sectionCurrentDeltas.get(
                sectionKey
              ) || 0
            );


      applyDeltaToOutputCell_(
        outputRow,
        displayRow,
        valueRow,
        3,
        previousDelta
      );


      applyDeltaToOutputCell_(
        outputRow,
        displayRow,
        valueRow,
        8,
        currentDelta
      );


      inAggregateSummary =
        true;


      continue;
    }


    if (
      inAggregateSummary &&
      !section &&
      hasNumericCell_(
        displayRow,
        valueRow,
        8
      )
    ) {

      const groupKey =
        classifyInventoryGroup_(
          currentSection,
          section,
          sub
        );


      if (groupKey !== "other") {

        applyDeltaToOutputCell_(
          outputRow,
          displayRow,
          valueRow,
          3,
          Number(
            groupPreviousDeltas.get(
              groupKey
            ) || 0
          )
        );


        applyDeltaToOutputCell_(
          outputRow,
          displayRow,
          valueRow,
          8,
          Number(
            groupCurrentDeltas.get(
              groupKey
            ) || 0
          )
        );
      }


      continue;
    }


    if (
      !hasNumericCell_(
        displayRow,
        valueRow,
        8
      )
    ) {

      continue;
    }


    const sectionKey =
      normalizeEntityText_(
        currentSection
      );


    const subKey =
      normalizeEntityText_(
        sub
      );


    if (
      !sectionKey &&
      !subKey
    ) {

      continue;
    }


    const baseKey =
      sectionKey +
      "|" +
      subKey;


    const occurrence =
      Number(
        occurrenceMap.get(
          baseKey
        ) || 0
      ) +
      1;


    occurrenceMap.set(
      baseKey,
      occurrence
    );


    const entityKey =
      baseKey +
      "#" +
      occurrence;


    const groupKey =
      classifyInventoryGroup_(
        currentSection,
        section,
        sub
      );


    const state =
      entityStates.get(
        entityKey
      ) ||
      {
        offset:
          0
      };


    const rawPrevious =
      cellNumber_(
        displayRow,
        valueRow,
        3
      );


    const rawCurrent =
      cellNumber_(
        displayRow,
        valueRow,
        8
      );


    const previousOffset =
      Number(
        state.offset || 0
      );


    const adjustedPrevious =
      rawPrevious +
      previousOffset;


    const audit =
      manualInventoryAuditValue_(
        displayRow,
        valueRow,
        formulaRow,
        DASHBOARD_CONFIG
          .INVENTORY_AUDIT_COL - 1
      );


    let adjustedCurrent =
      rawCurrent +
      previousOffset;


    let currentOffset =
      previousOffset;


    if (audit.hasValue) {

      adjustedCurrent =
        audit.value;


      currentOffset =
        adjustedCurrent -
        rawCurrent;


      block.appliedInventoryAudits.push({
        cell:
          columnNumberToLetter_(
            DASHBOARD_CONFIG
              .INVENTORY_AUDIT_COL
          ) +
          rowNum,

        entityKey:
          entityKey,

        groupAuditKey:
          classifyGroupInventoryTargetKey_(
            currentSection,
            section,
            sub
          ),

        previousCalculated:
          rawCurrent +
          previousOffset,

        actual:
          adjustedCurrent,

        correction:
          adjustedCurrent -
          (
            rawCurrent +
            previousOffset
          )
      });
    }


    outputRow[3] =
      adjustedPrevious;


    outputRow[8] =
      adjustedCurrent;


    const previousDelta =
      adjustedPrevious -
      rawPrevious;


    const currentDelta =
      adjustedCurrent -
      rawCurrent;


    sectionPreviousDeltas.set(
      sectionKey,
      Number(
        sectionPreviousDeltas.get(
          sectionKey
        ) || 0
      ) +
      previousDelta
    );


    sectionCurrentDeltas.set(
      sectionKey,
      Number(
        sectionCurrentDeltas.get(
          sectionKey
        ) || 0
      ) +
      currentDelta
    );


    groupPreviousDeltas.set(
      groupKey,
      Number(
        groupPreviousDeltas.get(
          groupKey
        ) || 0
      ) +
      previousDelta
    );


    groupCurrentDeltas.set(
      groupKey,
      Number(
        groupCurrentDeltas.get(
          groupKey
        ) || 0
      ) +
      currentDelta
    );


    grandPreviousDelta +=
      previousDelta;


    grandCurrentDelta +=
      currentDelta;


    state.offset =
      currentOffset;


    entityStates.set(
      entityKey,
      state
    );
  }
}


function applyDeltaToOutputCell_(
  outputRow,
  displayRow,
  valueRow,
  zeroBasedCol,
  delta
) {

  if (
    !delta ||
    !hasNumericCell_(
      displayRow,
      valueRow,
      zeroBasedCol
    )
  ) {

    return;
  }


  outputRow[
    zeroBasedCol
  ] =
    cellNumber_(
      displayRow,
      valueRow,
      zeroBasedCol
    ) +
    delta;
}


function collectInventoryAuditCandidateCells_(
  scan,
  block
) {

  const cells = [];


  let inAggregateSummary =
    false;


  for (
    let rowNum =
      block.dateBlockStartRow;

    rowNum <=
      block.copyEndRow;

    rowNum++
  ) {

    const valueRow =
      scan.values[
        rowNum - 1
      ];


    const displayRow =
      scan.displayValues[
        rowNum - 1
      ];


    if (
      !valueRow ||
      !displayRow
    ) {

      continue;
    }


    const section =
      cellText_(
        displayRow,
        valueRow,
        0
      );


    const sub =
      cellText_(
        displayRow,
        valueRow,
        2
      );


    if (
      isSubTotalLabel_(section) ||
      isSubTotalLabel_(sub)
    ) {

      inAggregateSummary =
        true;

      continue;
    }


    if (
      isGrandTotalLabel_(section) ||
      isGrandTotalLabel_(sub)
    ) {

      continue;
    }


    if (
      section &&
      !isAnyTotalLabel_(
        section
      )
    ) {

      inAggregateSummary =
        false;
    }


    if (
      inAggregateSummary &&
      !section
    ) {

      continue;
    }


    if (
      !hasNumericCell_(
        displayRow,
        valueRow,
        8
      )
    ) {

      continue;
    }


    cells.push(
      columnNumberToLetter_(
        DASHBOARD_CONFIG
          .INVENTORY_AUDIT_COL
      ) +
      rowNum
    );
  }


  return cells;
}


/***************************************************************
 * 실사두수 직접입력 읽기
 *
 * 개체수이므로 0 이상의 정수만 유효하다.
 ***************************************************************/

function manualInventoryAuditValue_(
  displayRow,
  valueRow,
  formulaRow,
  zeroBasedCol
) {

  const result =
    manualNumericValue_(
      displayRow,
      valueRow,
      formulaRow,
      zeroBasedCol
    );


  if (
    !result.hasValue ||
    result.value < 0 ||
    !Number.isInteger(
      result.value
    )
  ) {

    return {
      hasValue:
        false,
      value:
        null
    };
  }


  return result;
}