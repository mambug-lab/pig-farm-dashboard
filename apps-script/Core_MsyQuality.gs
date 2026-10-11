/* J is the post-movement closing census. Daily sow exposure uses opening stock.
 * Missing dates are carried as estimates and explicitly remain provisional.
 * Inventory corrections never create sales, deaths, births or transfers.
 */
function calculateCumulativeExpectedMsy_(records) {
  const result = calculateObservedMsy_(records);
  const quality = {
    basis: 'daily_opening_stock', cutoffPolicy: 'last_movement_or_census',
    missingDates: [], unconfirmedMovementDates: [], noMovementDates: [],
    unresolvedSowDates: [], sowAdjustmentDates: [], estimatedDays: 0,
    confidence: 'unavailable'
  };
  result.quality = quality;
  if (!records || !records.length) return result;
  const sorted = records.slice().sort(function(a, b) { return a.date - b.date; });
  const byDate = new Map(sorted.map(function(record) { return [dateKey_(record.date), record]; }));
  const first = sorted[0].date, last = sorted[sorted.length - 1].date;
  let previousClosing = null, sowDays = 0, unknownSowDays = 0;
  for (let day = new Date(first.getFullYear(), first.getMonth(), first.getDate(), 12);
       dateKey_(day) <= dateKey_(last); day.setDate(day.getDate() + 1)) {
    const key = dateKey_(day), record = byDate.get(key);
    let count = previousClosing;
    if (record) {
      count = record.msySowCount === undefined ? record.sowCount : record.msySowCount;
      previousClosing = record.sowCount;
      if (record.noMovement) quality.noMovementDates.push(key);
      if (record.sowResidual) quality.unresolvedSowDates.push(key);
      if (record.sowAuditCorrection) quality.sowAdjustmentDates.push(key);
    } else {
      quality.missingDates.push(key);
      quality.estimatedDays++;
    }
    if (!Number.isFinite(count) || count < 0) unknownSowDays++;
    else sowDays += count;
  }
  result.missingSowDays = unknownSowDays;
  result.sowDays = sowDays;
  result.avgSow = unknownSowDays ? null : sowDays / result.elapsedDays;
  if (unknownSowDays || result.missingGrandTotalDays || !sowDays) {
    result.msy = null;
    result.status = unknownSowDays
      ? '산정 불가: 일별 모돈수 미확인 ' + unknownSowDays + '일' : result.status;
    return result;
  }
  result.msy = result.cumulativeSale * 365 / sowDays;
  const warnings = [];
  if (quality.missingDates.length) warnings.push('일지 누락 ' + quality.missingDates.length + '일');
  if (quality.unresolvedSowDates.length) warnings.push('모돈 잔차 미해결');
  if (quality.sowAdjustmentDates.length) warnings.push('모돈 실사차이 원인 미확인');
  quality.confidence = warnings.length ? 'provisional' : 'complete_records';
  result.status = warnings.length ? '잠정: ' + warnings.join(' / ') : '정상';
  return result;
}
