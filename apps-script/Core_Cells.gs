


/***************************************************************
 * 셀 문자열
 ***************************************************************/

function cellText_(
  displayRow,
  valueRow,
  zeroBasedCol
) {

  let value = "";


  if (
    displayRow &&
    displayRow[
      zeroBasedCol
    ] !== undefined &&
    displayRow[
      zeroBasedCol
    ] !== null
  ) {

    value =
      displayRow[
        zeroBasedCol
      ];

  } else if (
    valueRow &&
    valueRow[
      zeroBasedCol
    ] !== undefined &&
    valueRow[
      zeroBasedCol
    ] !== null
  ) {

    value =
      valueRow[
        zeroBasedCol
      ];
  }


  return String(
    value
  )
    .replace(
      /\u00A0/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


/***************************************************************
 * 셀 숫자
 ***************************************************************/

function cellNumber_(
  displayRow,
  valueRow,
  zeroBasedCol
) {

  let value = "";


  if (
    valueRow &&
    valueRow[
      zeroBasedCol
    ] !== undefined &&
    valueRow[
      zeroBasedCol
    ] !== null &&
    valueRow[
      zeroBasedCol
    ] !== ""
  ) {

    value =
      valueRow[
        zeroBasedCol
      ];

  } else if (
    displayRow
  ) {

    value =
      displayRow[
        zeroBasedCol
      ];
  }


  if (
    typeof value ===
    "number"
  ) {

    return Number.isFinite(
      value
    )
      ? value
      : 0;
  }


  const cleaned =
    String(
      value == null
        ? ""
        : value
    )
      .replace(
        /\u00A0/g,
        ""
      )
      .replace(
        /\s/g,
        ""
      )
      .replace(
        /,/g,
        "."
      )
      .replace(
        /[^0-9.\-]/g,
        ""
      );


  const n =
    Number(
      cleaned
    );


  return Number.isFinite(
    n
  )
    ? n
    : 0;
}


/***************************************************************
 * 숫자 셀 존재 여부
 *
 * 빈 셀과 숫자 0을 구분한다.
 ***************************************************************/

function hasNumericCell_(
  displayRow,
  valueRow,
  zeroBasedCol
) {

  let value =
    valueRow &&
    valueRow[
      zeroBasedCol
    ] !== undefined &&
    valueRow[
      zeroBasedCol
    ] !== null &&
    valueRow[
      zeroBasedCol
    ] !== ""
      ? valueRow[
          zeroBasedCol
        ]
      : (
          displayRow
            ? displayRow[
                zeroBasedCol
              ]
            : ""
        );


  if (
    typeof value ===
    "number"
  ) {

    return Number.isFinite(
      value
    );
  }


  const text =
    String(
      value == null
        ? ""
        : value
    )
      .replace(
        /\u00A0/g,
        ""
      )
      .replace(
        /\s/g,
        ""
      )
      .replace(
        /,/g,
        "."
      )
      .trim();


  return (
    text !== "" &&
    /^-?\d+(\.\d+)?$/
      .test(
        text
      ) &&
    Number.isFinite(
      Number(
        text
      )
    )
  );
}


/***************************************************************
 * 수식이 아닌 직접입력 숫자 읽기
 ***************************************************************/

function manualNumericValue_(
  displayRow,
  valueRow,
  formulaRow,
  zeroBasedCol
) {

  const formula =
    formulaRow &&
    formulaRow[
      zeroBasedCol
    ] !== undefined &&
    formulaRow[
      zeroBasedCol
    ] !== null
      ? String(
          formulaRow[
            zeroBasedCol
          ]
        ).trim()
      : "";


  if (formula !== "") {

    return {
      hasValue:
        false,
      value:
        null
    };
  }


  if (
    !hasNumericCell_(
      displayRow,
      valueRow,
      zeroBasedCol
    )
  ) {

    return {
      hasValue:
        false,
      value:
        null
    };
  }


  return {
    hasValue:
      true,
    value:
      cellNumber_(
        displayRow,
        valueRow,
        zeroBasedCol
      )
  };
}


/***************************************************************
 * 열번호 → 문자
 ***************************************************************/

function columnNumberToLetter_(column) {

  let result = "";

  let n =
    column;


  while (
    n > 0
  ) {

    const remainder =
      (
        n - 1
      ) %
      26;


    result =
      String.fromCharCode(
        65 +
        remainder
      ) +
      result;


    n =
      Math.floor(
        (
          n - 1
        ) /
        26
      );
  }


  return result;
}