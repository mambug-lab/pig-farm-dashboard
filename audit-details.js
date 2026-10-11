/* Optional, read-only detail view. Its failures never change the main dashboard. */
const AUDIT_REPORT_SHEET_NAME = '대시보드_실사검증용';
let auditDetailsCache = null;
let auditDetailsRequest = null;
let auditDetailsGeneration = 0;
let auditHistoryPage = 0;
const AUDIT_TEXT = {
  ko: {
    rooms:'돈사별 두수', audit:'실사 · MSY 확인', loading:'실사 검증 정보를 읽고 있습니다.',
    retry:'다시 조회', unavailable:'실사 검증 정보를 불러오지 못했습니다.',
    loadMain:'대시보드 조회가 완료된 후 다시 선택해 주세요.', mismatch:'메인 화면과 실사 정보의 기준이 다릅니다. 대시보드를 새로고침해 주세요.',
    semantics:'J열은 당일 이동 작업 후 최종 실사입니다. 실사두수는 다음 날 시작 재고로 이어집니다.',
    basisDate:'작업일지 기준일', latest:'최근 J열 실사일', none:'실사 기록 없음',
    unaudited:'미실사 돈방', residual:'미해결 차이 · 공식 합계와 상세 합계', detail:'상세 돈방 합계', official:'공식 합계',
    adjustments:'원인 미확인 실사조정 (건 / 순증감 / 절대합)', adjustmentNote:'실사로 현재 두수가 맞아져도 과거 차이의 원인은 확인되지 않습니다. 이동·출하·폐사 원기록을 바로잡으면 조정값을 다시 계산합니다.',
    carryConflicts:'기초두수 확인 필요', carryNote:'다른 수식 또는 수기값이 있어 D열을 자동 교체하지 않은 셀입니다.',
    coverage:'미실사는 현재 기록 범위에서 J열 실사가 없거나 그룹 기준일보다 이전인 돈방입니다.',
    pending:'그룹 잔차를 해소하려면 남은 돈방의 실사가 필요합니다.',
    opposite:'돈군별 차이의 부호가 달라 순합계만으로는 미해결 차이를 판단할 수 없습니다.',
    room:'돈방', stock:'두수', recheck:'재확인 필요', msy:'MSY 계산 · 신뢰도',
    complete:'기록 요건 충족', provisional:'잠정', unknown:'산정 불가',
    msyBasis:'분만·임신 여부와 관계없이 모돈군 전체의 일별 시작 두수를 반영합니다. 마지막 실제 변동·실사일까지 집계하며, 그 사이 이동란의 빈칸과 0은 모두 변동 없음입니다.',
    msyCaution:'기록 요건 충족은 실제 출하전표와 모든 실사를 대조했다는 뜻은 아닙니다.',
    value:'연환산 MSY', days:'누적 달력일', validDays:'유효 작업일', average:'일평균 모돈수',
    missing:'날짜 블록 누락', movement:'이동 기록 미확인', noMovement:'변동 없는 날', sowResidual:'모돈 잔차 미해결', sowCorrection:'모돈 실사차이 원인 미확인',
    history:'실사 조정 이력', historyNote:'시스템이 관측한 J열과 계산 결과의 변경 이력입니다. 관측 시각은 실제 입력 시각이 아닙니다.',
    empty:'기록이 없습니다.', date:'실사일', next:'다음 날 적용', before:'실사 전 계산', actual:'실사', correction:'조정', source:'원본',
    observed:'최초 관측', revised:'변경 관측', removed:'삭제 관측', prevPage:'이전', nextPage:'다음',
    sow:'모돈', suckling:'포유자돈', weaned:'이유자돈', growing:'육성돈', fattening:'비육돈', fattening_old:'기존 비육', fattening_new:'신규 비육'
  },
  ru: {
    rooms:'Поголовье по помещениям', audit:'Инвентаризация · MSY', loading:'Загрузка данных проверки…',
    retry:'Повторить', unavailable:'Не удалось загрузить данные проверки.',
    loadMain:'Дождитесь загрузки панели и выберите раздел повторно.', mismatch:'Данные проверки и панели не совпадают. Обновите панель.',
    semantics:'J — фактический остаток после всех перемещений за день. Он переносится на начало следующего дня.',
    basisDate:'Дата журнала', latest:'Последний пересчёт в J', none:'Нет записи пересчёта',
    unaudited:'Помещения без пересчёта', residual:'Разница официального итога и помещений', detail:'Сумма помещений', official:'Официальный итог',
    adjustments:'Необъяснённые поправки (число / итог / сумма модулей)', adjustmentNote:'Совпадение текущего остатка не объясняет прошлые расхождения. После исправления исходных перемещений, продаж или падежа поправки пересчитываются.',
    carryConflicts:'Проверить начальные остатки', carryNote:'Ячейки D с другой формулой или ручным значением сохранены без автоматической замены.',
    coverage:'Без пересчёта: нет J в доступных записях либо J старше группового остатка.',
    pending:'Для снятия групповой разницы требуется пересчёт оставшихся помещений.',
    opposite:'Разницы категорий имеют разные знаки; общий остаток не отражает всех расхождений.',
    room:'Помещение', stock:'Голов', recheck:'Нужен пересчёт', msy:'MSY · достоверность',
    complete:'Записи полные', provisional:'Предварительно', unknown:'Расчёт недоступен',
    msyBasis:'Учитываются все свиноматки, включая холостых, по поголовью на начало каждого дня. Расчёт — до последнего фактического движения или пересчёта; внутри периода пустые клетки перемещений и 0 одинаково означают отсутствие изменений.',
    msyCaution:'Полнота записей не означает сверку всех накладных и фактического поголовья.',
    value:'MSY в годовом выражении', days:'Календарных дней', validDays:'Дней журнала', average:'Среднее поголовье свиноматок',
    missing:'Нет блока даты', movement:'Перемещения не подтверждены', noMovement:'Дней без изменений', sowResidual:'Разница по свиноматкам', sowCorrection:'Причина поправки свиноматок не выяснена',
    history:'История поправок', historyNote:'Изменения J и расчётов, обнаруженные системой. Время обнаружения не является временем ввода.',
    empty:'Нет записей.', date:'Дата пересчёта', next:'Начало следующего дня', before:'До пересчёта', actual:'Факт', correction:'Поправка', source:'Источник',
    observed:'Первое наблюдение', revised:'Изменение', removed:'Удаление', prevPage:'Назад', nextPage:'Далее',
    sow:'Свиноматки', suckling:'Поросята-сосуны', weaned:'Отъём', growing:'Доращивание', fattening:'Откорм', fattening_old:'Откорм ст.', fattening_new:'Откорм нов.'
  }
};
function auditText(key) { return (AUDIT_TEXT[getLang() === 'ru' ? 'ru' : 'ko'][key] || key); }
function updateAuditLabels() {
  document.getElementById('side-rooms-tab').textContent = auditText('rooms');
  document.getElementById('side-audit-tab').textContent = auditText('audit');
}
function resetAuditDetails() {
  auditDetailsGeneration++;
  auditDetailsCache = null; auditDetailsRequest = null; auditHistoryPage = 0;
  document.getElementById('audit-details').innerHTML = '';
  setSideView('rooms');
}
function setSideView(view) {
  const isAudit = view === 'audit';
  document.getElementById('side-tree').hidden = isAudit;
  document.getElementById('audit-details').hidden = !isAudit;
  document.getElementById('side-rooms-tab').setAttribute('aria-selected', String(!isAudit));
  document.getElementById('side-audit-tab').setAttribute('aria-selected', String(isAudit));
  if (isAudit) loadAuditDetails();
}
function auditDateKey(date) {
  return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
}
function parseAuditDetailsRows(rows, monthlyMetaRows) {
  if (!rows.length || rows[0][0] !== 'AUDIT_DETAILS_V1') throw new Error(auditText('unavailable'));
  const report = {context:JSON.parse(rows[0][2]),groups:[],rooms:[],revisions:[],carryConflicts:[],msy:null};
  rows.slice(1).forEach(function(row) {
    if (!row[0]) return;
    const payload = JSON.parse(row[2]);
    if (row[0] === 'group') report.groups.push(payload);
    else if (row[0] === 'room') report.rooms.push(payload);
    else if (row[0] === 'revision') report.revisions.push(payload);
    else if (row[0] === 'carryConflict') report.carryConflicts.push(payload);
    else if (row[0] === 'msy') report.msy = payload;
    else throw new Error(auditText('unavailable'));
  });
  const meta = readMonthlyMetadata(monthlyMetaRows), context = report.context;
  const expected = ['sow','suckling','weaned','growing','fattening'];
  if (!meta.latestDate || context.latestDate !== auditDateKey(meta.latestDate) ||
      context.totalPigs !== meta.totalPigs || context.sowCount !== meta.sowCount ||
      context.msy !== meta.msy || context.msyStatus !== meta.msyStatus ||
      report.groups.length !== 5 || expected.some(function(key) { return report.groups.filter(g=>g.key===key).length !== 1; }) ||
      !report.msy || !report.msy.quality) throw new Error(auditText('mismatch'));
  const official = readOfficialGroupStocks(monthlyMetaRows, meta.latestDate);
  report.groups.forEach(function(group) {
    const source = official.get(group.key);
    if (!Number.isFinite(group.current) || group.current !== source.current ||
        group.detailCurrent !== source.detailCurrent || group.residual !== source.residual) throw new Error(auditText('mismatch'));
  });
  return report;
}
async function loadAuditDetails() {
  if (auditDetailsCache) return renderAuditDetails();
  if (auditDetailsRequest) return auditDetailsRequest;
  const target = document.getElementById('audit-details'), generation = auditDetailsGeneration;
  if (!latestMetaRows.length) { target.textContent = auditText('loadMain'); return; }
  target.textContent = auditText('loading');
  auditDetailsRequest = (async function() {
    try {
      const rows = await loadGvizRowsBySheetRange(AUDIT_REPORT_SHEET_NAME, 'A1:C', auditText('audit'), true);
      if (generation !== auditDetailsGeneration) return;
      auditDetailsCache = parseAuditDetailsRows(rows, latestMetaRows);
      renderAuditDetails();
    } catch (error) {
      if (generation !== auditDetailsGeneration) return;
      target.innerHTML = '<p class="audit-error">' + escapeHtml(auditText('unavailable')) + '</p><p>' +
        escapeHtml(error.message) + '</p><button onclick="loadAuditDetails()">' + escapeHtml(auditText('retry')) + '</button>';
    } finally { if (generation === auditDetailsGeneration) auditDetailsRequest = null; }
  })();
  return auditDetailsRequest;
}
function auditFacts(pairs) {
  return '<dl class="audit-facts">' + pairs.map(function(pair) {
    return '<dt>' + escapeHtml(pair[0]) + '</dt><dd>' + escapeHtml(pair[1]) + '</dd>';
  }).join('') + '</dl>';
}
function renderAuditDetails() {
  if (!auditDetailsCache) return;
  const report = auditDetailsCache, esc = escapeHtml;
  let html = '<p class="audit-note">' + esc(auditText('semantics')) + '<br>' + esc(auditText('basisDate')) + ': ' + esc(report.context.latestDate) + '</p>';
  report.groups.forEach(function(group) {
    const rooms = report.rooms.filter(function(room) { return group.key === 'fattening' ? room.groupKey.startsWith('fattening_') : room.groupKey === group.key; });
    html += '<details><summary>' + esc(auditText(group.key)) + ' · ' + esc(formatHead(group.current)) + '</summary><div class="audit-content">';
    html += auditFacts([[auditText('latest'),group.latestAuditDate || auditText('none')],
      [auditText('unaudited'),group.unauditedKeys.length + ' / ' + rooms.length],
      [auditText('official'),group.current],[auditText('detail'),group.detailCurrent],[auditText('residual'),formatSigned(group.residual)]]);
    html += auditFacts([[auditText('adjustments'),group.unexplainedAdjustmentCount+' / '+formatSigned(group.unexplainedAdjustmentNet)+' / '+group.unexplainedAdjustmentMagnitude]]);
    if (group.unexplainedAdjustmentCount) html += '<p class="audit-warning">'+esc(auditText('adjustmentNote'))+'</p>';
    html += '<p class="audit-note">' + esc(auditText('coverage')) + '</p>';
    if (group.pendingKeys.length) html += '<p class="audit-warning">' + esc(auditText('pending')) + '</p>';
    if (group.unresolvedMagnitude > Math.abs(group.residual)) html += '<p class="audit-warning">' + esc(auditText('opposite')) + ' ' + group.parts.map(p=>esc(auditText(p.key)+': '+formatSigned(p.residual))).join(' · ') + '</p>';
    html += '<table><thead><tr>' + ['room','stock','latest'].map(k=>'<th>'+esc(auditText(k))+'</th>').join('') + '</tr></thead><tbody>';
    rooms.forEach(function(room) {
      html += '<tr><td>' + esc(translateTerm(room.section)+' / '+translateTerm(room.room)) +
        (group.pendingKeys.includes(room.entityKey) ? '<br>'+esc(auditText('recheck')) : '') + '</td><td>' + esc(room.current) + '</td><td>' + esc(room.auditDate || auditText('none')) + '</td></tr>';
    });
    html += '</tbody></table></div></details>';
  });
  const msy = report.msy, quality = msy.quality;
  html += '<details><summary>' + esc(auditText('msy')) + ' · ' + esc(auditText(quality.confidence === 'complete_records' ? 'complete' : quality.confidence === 'provisional' ? 'provisional' : 'unknown')) + '</summary><div class="audit-content">';
  html += auditFacts([[auditText('value'),msy.msy === null ? '-' : msy.msy.toFixed(2)],
    [auditText('days'),msy.elapsedDays],[auditText('validDays'),msy.validDiaryDays],
    [auditText('average'),msy.avgSow === null ? '-' : msy.avgSow.toFixed(2)],
    [auditText('noMovement'),(quality.noMovementDates || []).length]]);
  html += '<p class="audit-note">'+esc(auditText('msyBasis'))+'</p>';
  [['missing','missingDates'],['sowResidual','unresolvedSowDates'],['sowCorrection','sowAdjustmentDates']].forEach(function(pair) {
    const dates = quality[pair[1]] || [];
    if (dates.length) html += '<p class="audit-warning">'+esc(auditText(pair[0]))+' ('+dates.length+'): '+esc(dates.join(', '))+'</p>';
  });
  html += '<p class="audit-note">'+esc(auditText('msyCaution'))+'</p></div></details>';
  if (report.carryConflicts.length) {
    html += '<details><summary>'+esc(auditText('carryConflicts'))+' · '+report.carryConflicts.length+'</summary><div class="audit-content"><p>'+esc(auditText('carryNote'))+'</p><ul>';
    html += report.carryConflicts.map(function(item) { return '<li>'+esc(item.sheet+'!'+item.cell)+'</li>'; }).join('');
    html += '</ul></div></details>';
  }
  html += '<details id="audit-history"><summary>'+esc(auditText('history'))+' · '+report.revisions.length+'</summary><div class="audit-content"><p class="audit-note">'+esc(auditText('historyNote'))+'</p><div id="audit-history-page"></div></div></details>';
  document.getElementById('audit-details').innerHTML = html;
  renderAuditHistoryPage(0);
}
function renderAuditHistoryPage(page) {
  const revisions = auditDetailsCache.revisions.slice().reverse(), size = 20;
  auditHistoryPage = Math.max(0,Math.min(page,Math.max(0,Math.ceil(revisions.length/size)-1)));
  const esc=escapeHtml, rows=revisions.slice(auditHistoryPage*size,(auditHistoryPage+1)*size);
  let html = '';
  rows.forEach(function(revision) {
    const audit=revision.audit;
    const source = audit.sheetId === null ? esc(audit.sheetName+'!'+audit.cell) :
      '<a target="_blank" rel="noopener" href="https://docs.google.com/spreadsheets/d/'+encodeURIComponent(SHEET_ID)+'/edit#gid='+encodeURIComponent(audit.sheetId)+'&range='+encodeURIComponent(audit.cell)+'">'+esc(audit.sheetName+'!'+audit.cell)+'</a>';
    html += '<details><summary>'+esc(audit.date+' · '+translateTerm(audit.section)+' / '+translateTerm(audit.room)+' · '+formatSigned(audit.correction))+'</summary><div class="audit-content">';
    html += auditFacts([[auditText('next'),audit.effectiveDate],[auditText('before'),audit.previousCalculated],[auditText('actual'),audit.actual],[auditText('correction'),formatSigned(audit.correction)]]);
    html += '<p>'+source+'</p><p class="audit-note">'+esc(auditText(revision.action)+' · '+revision.observedAt)+'</p></div></details>';
  });
  if (!rows.length) html='<p>'+esc(auditText('empty'))+'</p>';
  html += '<div class="audit-pager"><button onclick="renderAuditHistoryPage(auditHistoryPage-1)" '+(auditHistoryPage===0?'disabled':'')+'>'+esc(auditText('prevPage'))+'</button><span>'+(revisions.length ? auditHistoryPage*size+1 : 0)+'–'+Math.min((auditHistoryPage+1)*size,revisions.length)+' / '+revisions.length+'</span><button onclick="renderAuditHistoryPage(auditHistoryPage+1)" '+((auditHistoryPage+1)*size>=revisions.length?'disabled':'')+'>'+esc(auditText('nextPage'))+'</button></div>';
  document.getElementById('audit-history-page').innerHTML=html;
}
