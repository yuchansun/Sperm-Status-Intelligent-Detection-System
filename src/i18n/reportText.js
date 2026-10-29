import { translations } from '../context/language.js'
import { currentLanguage, translateText as tr, displayRecordSummary } from './translate.js'
export function buildResultEmail(record, language = currentLanguage()) {
  const text = (source, args=[]) => tr(source,args,language)
  return {
    subject: text('{{0}}檢測結果與衛教 · {{1}}', [record.isDemo ? 'Demo · ' : '', record.sampleId]),
    body: [text('{{0}} 您好：',[record.patient?.name || '']), '', text(record.isDemo ? 'Demo 分析結果（示範數值）' : '本次檢測結果'),
      text('檢體編號：{{0}}',[record.sampleId]),text('檢測日期：{{0}}',[record.date]),
      text('濃度：{{0}} million/mL',[record.density]),text('活動力：{{0}}',[tr(record.motility,[],language)]),text('正常型態：{{0}}',[record.morphology]),
      '',displayRecordSummary(record,language),'',text('如需進一步了解結果與相關衛教，請洽詢醫療人員。')].join('\n'),
  }
}
export function buildHistoryEmail(patient, records, language = currentLanguage()) {
  const text = (source, args=[]) => tr(source,args,language)
  const t = translations[language] || translations.zh
  const sorted=[...records].sort((a,b)=>b.date.localeCompare(a.date))
  return {
    subject: `${text('精蟲檢驗歷史與衛教')} — ${patient.name}`,
    body: [text('歷史檢測報告'), '', text('【一、病患與報告資訊】'), text('病患姓名：{{0}}',[patient.name]),text('年齡：{{0}}',[patient.age]),
      text('聯絡電話：{{0}}',[patient.phone]),text('主治醫師：{{0}}',[patient.doctor || '—']),text('檢驗紀錄筆數：{{0}} 筆',[records.length]),'',text('【二、歷史檢驗結果】'),
      ...sorted.flatMap((record,index)=>[text('第 {{0}} 筆檢驗',[index+1]),record.isDemo?'Demo':'',
        text('檢驗日期：{{0}}',[record.date]),text('檢體編號：{{0}}',[record.sampleId]),
        text('處理狀態：{{0}}',[tr(record.processingState,[],language)]),text('濃度：{{0}} million/mL',[record.density]),
        text('活動力：{{0}}',[tr(record.motility,[],language)]),text('正常型態：{{0}}',[record.morphology]),
        text('AI 辨識精確度：{{0}}',[tr(record.aiResult?.precision || '—',[],language)]),text('AI 辨識信心度：{{0}}',[tr(record.aiResult?.confidence || '—',[],language)]),text('AI 分析耗時：{{0}}',[tr(record.aiResult?.processingTime || '—',[],language)]),
        text('檢驗摘要：{{0}}',[displayRecordSummary(record,language)]),text('醫師備註：{{0}}',[record.patient?.note || text('無備註')]),'']),
      text('【三、目前結果判讀】'),
      text('最新檢驗日期：{{0}}',[sorted[0]?.date || '—']),text('最新檢體編號：{{0}}',[sorted[0]?.sampleId || '—']),
      text('目前濃度：{{0}} M/mL',[sorted[0]?.density ?? '—']),text('目前活動力：{{0}}',[sorted[0]?.motility ?? '—']),text('目前正常型態：{{0}}',[sorted[0]?.morphology ?? '—']),
      text('判讀摘要：{{0}}',[displayRecordSummary(sorted[0],language)]),'',
      text('【四、紅綠燈指標說明】'),text('● 綠燈：代表該項數值目前達到系統參考標準。'),
      text('● 黃燈：代表數值接近下限或需要持續追蹤，請配合醫師建議複檢。'),text('● 紅燈：代表數值明顯異常，建議儘早回診並由專業醫師進一步評估。'),
      text('本報告中的燈號為 AI 輔助提示，不代表單獨的醫療診斷。'),'',text('【五、生活與健康衛教】'),t.emailEducationDetailed,'',
      text('【六、後續檢查建議】'),text('1. 若本次結果為待追蹤或異常，請依醫師安排於適當時間複檢。'),
      text('2. 複檢前請依醫療人員指示維持適當禁慾天數，避免自行比較不同檢驗條件下的數值。'),
      text('3. 若有備孕需求、持續數值異常或其他不適，請攜帶本報告與歷史趨勢諮詢泌尿科或生殖醫學科。'),'',text('【重要提醒】'),
      text('本信件內容為檢驗資料整理與一般性衛教資訊，不能取代醫師問診、身體檢查或正式醫療診斷。若您有任何疑問，請直接諮詢您的主治醫師。'),
      text('本報告由精蟲 AI 智慧輔助檢驗平台產生。請勿將本報告轉寄給非相關人員，以保護個人健康資料。')].filter(line=>line!==undefined).join('\n'),
  }
}
