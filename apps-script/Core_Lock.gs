


function withDocumentLock_(
  operationName,
  callback
) {

  const lock =
    LockService.getDocumentLock();


  if (
    !lock.tryLock(
      MONTHLY_SHEET_CREATION_CONFIG
        .LOCK_TIMEOUT_MS
    )
  ) {
    throw new Error(
      operationName +
      "이 이미 실행 중입니다. 잠시 후 다시 실행하세요."
    );
  }


  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}