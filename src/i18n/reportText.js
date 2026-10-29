import { currentLanguage, translateText as tr, displayRecordSummary } from './translate.js'

function percent(value) {
  if (value === null || value === undefined || value === '' || value === '—') return '—'
  const text = String(value)
  return text.includes('%') ? text : `${text}%`
}

function referenceNote(language) {
  return tr('老師 Excel 參考範圍：濃度 20–120 ×10⁶/mL、活動力 >50%、正常型態比例 >15%；等於界線時視為未達。', [], language)
}

function recordLines(record, language, index) {
  const text = (source, args = []) => tr(source, args, language)
  return [
    text('第 {{0}} 筆檢測', [index + 1]),
    record.isDemo ? text('示範資料：以下數值為模擬值，並非實際分析結果。') : '',
    text('檢測日期：{{0}}', [record.date]),
    text('檢體編號：{{0}}', [record.sampleId]),
    text('精蟲濃度：{{0}} ×10⁶/mL', [record.density ?? '—']),
    text('活動力：{{0}}', [percent(record.motility)]),
    text('正常型態比例：{{0}}', [percent(record.morphology)]),
    displayRecordSummary(record, language),
    '',
  ]
}

export function buildResultEmail(record, language = currentLanguage()) {
  const text = (source, args = []) => tr(source, args, language)
  return {
    subject: text('{{0}}檢測結果 · {{1}}', [record.isDemo ? 'Demo · ' : '', record.sampleId]),
    body: [
      text('{{0}} 您好：', [record.patient?.name || '']),
      '',
      text(record.isDemo ? '示範資料：以下數值為模擬值，並非實際分析結果。' : '本次檢測結果'),
      text('檢測日期：{{0}}', [record.date]),
      text('檢體編號：{{0}}', [record.sampleId]),
      text('精蟲濃度：{{0}} ×10⁶/mL', [record.density ?? '—']),
      text('活動力：{{0}}', [percent(record.motility)]),
      text('正常型態比例：{{0}}', [percent(record.morphology)]),
      '',
      referenceNote(language),
      '',
      text('此信件僅整理檢測數值與 Excel 參考範圍，不提供診斷或治療建議。'),
    ].join('\n'),
  }
}

export function buildHistoryEmail(patient, records, language = currentLanguage()) {
  const text = (source, args = []) => tr(source, args, language)
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
  return {
    subject: `${text('檢測歷史紀錄')} — ${patient.name}`,
    body: [
      text('檢測歷史紀錄'),
      '',
      text('病患姓名：{{0}}', [patient.name]),
      text('檢測紀錄筆數：{{0}} 筆', [records.length]),
      '',
      ...sorted.flatMap((record, index) => recordLines(record, language, index)),
      referenceNote(language),
      '',
      text('此信件僅整理檢測數值與 Excel 參考範圍，不提供診斷或治療建議。'),
    ].join('\n'),
  }
}
