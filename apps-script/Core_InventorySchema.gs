


function normalizeEntityText_(value) {

  return normalizeText_(
    value
  );
}


function classifyInventoryGroup_(
  currentSection,
  section,
  sub
) {

  const text =
    [
      currentSection,
      section,
      sub
    ]
      .map(
        normalizeEntityText_
      )
      .join(" ");


  if (
    text.indexOf(
      "поросята-сосуны"
    ) !== -1 ||
    text.indexOf(
      "поросята сосуны"
    ) !== -1
  ) {

    return "suckling";
  }


  if (
    text.indexOf(
      "свиномат"
    ) !== -1 ||
    text.indexOf(
      "свино маток"
    ) !== -1 ||
    text.indexOf(
      "супорос"
    ) !== -1 ||
    text.indexOf(
      "лактир"
    ) !== -1 ||
    text.indexOf(
      "холост"
    ) !== -1
  ) {

    return "sow";
  }


  if (
    text.indexOf(
      "отъем"
    ) !== -1 ||
    text.indexOf(
      "отъём"
    ) !== -1
  ) {

    return "weaned";
  }


  if (
    text.indexOf(
      "доращ"
    ) !== -1
  ) {

    return "growing";
  }


  if (
    text.indexOf(
      "откорм"
    ) !== -1
  ) {

    return "fattening";
  }


  return "other";
}


function classifyGroupInventoryTargetKey_(currentSection, section, sub) {
  const sectionText = normalizeEntityText_(section || currentSection);
  const subText = normalizeEntityText_(sub);
  const text = sectionText + " " + subText;
  if (text.indexOf("поросята-сосуны") !== -1 || text.indexOf("поросята сосуны") !== -1) return "suckling";
  if (sectionText.indexOf("отъем поросята") !== -1 || sectionText.indexOf("отъём поросята") !== -1) return "weaned";
  if (sectionText.indexOf("доращ") !== -1) return "growing";
  if (sectionText.indexOf("откорм ст") !== -1 || sectionText.indexOf("откорм стар") !== -1) return "fattening_old";
  if (sectionText.indexOf("откорм нов") !== -1) return "fattening_new";
  if (text.indexOf("свиномат") !== -1 || text.indexOf("свино маток") !== -1 || text.indexOf("супорос") !== -1 || text.indexOf("лактир") !== -1) return "sow";
  return "";
}


/***************************************************************
 * 문자열 판정
 ***************************************************************/

function normalizeText_(value) {

  return String(
    value == null
      ? ""
      : value
  )
    .replace(
      /\u00A0/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .toLowerCase();
}


function isSubTotalLabel_(value) {

  const text =
    normalizeText_(
      value
    );


  return (
    text === "итого" ||
    text === "итог" ||
    text === "subtotal" ||
    text === "합계"
  );
}


function isGrandTotalLabel_(value) {

  const text =
    normalizeText_(
      value
    );


  return (
    text === "всего" ||
    text === "total" ||
    text === "총계"
  );
}


function isAnyTotalLabel_(value) {

  return (
    isSubTotalLabel_(
      value
    ) ||
    isGrandTotalLabel_(
      value
    )
  );
}


function isSowText_(value) {

  const text =
    normalizeText_(
      value
    );


  return (
    text.indexOf(
      "свиномат"
    ) !== -1 ||
    text.indexOf(
      "свино маток"
    ) !== -1
  );
}


/*
 * 실사보정의 entityKey 규칙과 동일한 section|sub#occurrence 식별자를 쓴다.
 * 합계·소계는 이월 대상이 아니며, 상세 돈사/돈방 행만 처리한다.
 */
function collectInventoryEntityRows_(
  scan,
  block,
  requireCurrentStock
) {

  const result = [];

  const occurrenceMap =
    new Map();


  let currentSection =
    "";


  let inAggregateSummary =
    false;


  for (
    let rowNum = block.dateBlockStartRow;
    rowNum <= block.copyEndRow;
    rowNum++
  ) {

    // Date and column headers are never rooms, even while cleared I cells
    // are being matched for first-day D carry.
    if (rowNum <= block.dateBlockStartRow + 1) continue;

    const rowIndex =
      rowNum - 1;


    const valueRow =
      scan.values[rowIndex];


    const displayRow =
      scan.displayValues[rowIndex];


    if (!valueRow || !displayRow) {
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


    // ВСЕГО 뒤에는 작업 메모·교육·서명 영역이 이어질 수 있다.
    // 이 구간의 텍스트를 돈사·돈방 식별자로 다시 해석하지 않는다.
    if (
      isGrandTotalLabel_(section) ||
      isGrandTotalLabel_(sub)
    ) {

      break;
    }


    if (
      section &&
      !isAnyTotalLabel_(section)
    ) {

      inAggregateSummary =
        false;

      currentSection =
        section;
    }


    if (
      isGrandTotalLabel_(section) ||
      isGrandTotalLabel_(sub) ||
      isSubTotalLabel_(section) ||
      isSubTotalLabel_(sub)
    ) {

      inAggregateSummary =
        true;

      continue;
    }


    if (inAggregateSummary) {
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


    if (
      requireCurrentStock &&
      !hasNumericCell_(
        displayRow,
        valueRow,
        MONTHLY_SHEET_CREATION_CONFIG
          .CURRENT_STOCK_COL - 1
      )
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


    result.push({
      groupAuditKey: classifyGroupInventoryTargetKey_(currentSection, section, sub),
      key:
        baseKey +
        "#" +
        occurrence,

      rowNum:
        rowNum,

      currentStock:
        cellNumber_(
          displayRow,
          valueRow,
          MONTHLY_SHEET_CREATION_CONFIG
            .CURRENT_STOCK_COL - 1
        )
    });
  }


  return result;
}


function getGrandTotalStockFromBlock_(
  scan,
  block,
  zeroBasedColumn
) {

  if (!scan || !block) {
    return null;
  }


  for (
    let rowNum = block.dateBlockStartRow;
    rowNum <= block.copyEndRow;
    rowNum++
  ) {

    const values =
      scan.values[rowNum - 1];

    const displays =
      scan.displayValues[rowNum - 1];


    if (!values || !displays) {
      continue;
    }


    if (
      isGrandTotalLabel_(
        cellText_(displays, values, 0)
      ) ||
      isGrandTotalLabel_(
        cellText_(displays, values, 2)
      )
    ) {
      return cellNumber_(
        displays,
        values,
        zeroBasedColumn
      );
    }
  }


  return null;
}