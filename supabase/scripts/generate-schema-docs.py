import json,html
from pathlib import Path
root=Path(__file__).resolve().parents[2]
rows=json.loads(Path('/private/tmp/sperm-schema-v2-verified.json').read_text())
common={
'id':'本表 UUID 主鍵，自動產生。','created_by':'建立操作人員的 auth.users.id。','created_at':'建立時間（含時區）。',
'updated_by':'最後修改操作人員的 auth.users.id。','updated_at':'最後修改時間；有對應觸發器的表由資料庫自動更新。',
'patient_id':'對應 patients.id 的病患外鍵。','report_version_id':'對應 report_versions.id，精確指定某一版報告。',
'language':'內容語言代碼；預設 zh，前端現有 zh／en／ko。','to_email':'收件 Email；草稿／寄送各自保存，不隨病患預設 Email 自動改寫。',
'subject':'Email 主旨。','body':'Email 內文。','reviewed_by':'審核操作者 auth.users.id，不等同已驗證醫師資格。',
'reviewed_at':'審核時間（含時區）。','sample_id':'檢體編號，非病患 ID。'}
desc={
'patients':{'patient_code':'唯一病患代碼。','patient_name':'病患姓名。','national_id':'身分證號或病歷識別碼；目前未設唯一約束。','birth_date':'出生日期；年齡由程式計算。','sex':'M／F／UNKNOWN。','phone':'聯絡電話，選填。','health_card_number':'健保卡號，選填。','patient_data_source':'health_card／manual，資料取得方式。','identity_status':'身分註記，選填。','email':'病患預設 Email，選填；實際寄件仍保存獨立收件地址。'},
'examinations':{'examination_code':'唯一檢測代碼。','include_motility':'本次是否選擇活動力分析，預設 false。','template_label':'所選示範範本名稱，選填。','collected_at':'實際檢體採樣時間，未知時 null；不同於資料建立時間。'},
'analysis_records':{'examination_id':'對應 examinations.id。一次檢測可有多筆分析紀錄。','exam_date':'檢驗日期。','clinical_status':'整體判讀／示範標籤；不是工作流程狀態。','processing_state':'待複核／已完成／影像待上傳等工作流程狀態，沿用既有文字。','density':'濃度，numeric；舊文字已轉換。不代表獨立的 Count。','motility':'Excel Motility：活動力百分比數值 0–100，DB 不存 % 字元；活動力定義見 motility_type。','morphology':'Excel Morphology：正常型態比例數值 0–100，DB 不存 % 字元；不是頭身比。','summary':'分析摘要；報告修改另存版本，不覆寫此原始摘要。','ai_result':'原始／示範分析 JSON；isDemo 為示範標記。正式顯示數值以 numeric 欄為準。','boxes':'原圖座標的標記框 JSON；沿用前端百分比座標格式。','original_image_path':'私有 exam-images 的原始影像物件路徑，不存簽名 URL。','analyzed_image_path':'私有 exam-images 的分析後標記影像路徑；未生成則 null。','amount':'Excel Amount，numeric；實際定義及單位待後端定案，未測為 null。','amount_unit':'Amount 的單位代碼；未定不預設。','color':'Excel Color，顏色描述／穩定代碼；文字，不是量測數字。','appearance':'Excel Appearance，外觀描述／穩定代碼；文字。','ph':'Excel pH，numeric，0–14 為結構範圍；未測 null。','count_of_spermatozoa':'Excel Count of spermatozoa，numeric；單位／總數或計數定義尚未定案，不與 density 混用。','count_unit':'Count 的單位代碼，未定 null。','count_definition':'Count 的計數定義／基準，由後端確定。','density_unit':'濃度單位；既有程式使用 million/mL。','motility_type':'活動力分類定義，例如後端定案的 total／progressive；未知 null。','measurement_status':'各量測的狀態 JSON，例如未檢測／失敗／完成；沒有填寫不推論為零。','interpretation':'後端產生的各指標判讀／參考範圍 JSON；不預設門檻。','interpretation_version':'上述判讀規則版本，由後端填。','legacy_metrics':'遷移前 density／motility／morphology 原始文字備存；重跑不覆蓋。','review_note':'這次分析的審核意見；病患長期備註另外存。'},
'patient_notes':{'patient_id':'主鍵兼外鍵 patients.id；一位病患最多一筆長期備註。','note':'可更新的病患長期備註，不是每次檢驗的版本化審核意見。'},
'reports':{'analysis_record_id':'對應 analysis_records.id，唯一；每筆分析最多一份報告身份，各次修改存子表版本。'},
'report_versions':{'report_id':'對應 reports.id。','version':'同一報告從 1 遞增；與 report_id 組成唯一約束。','title':'可修改的報告標題。','summary':'可修改的報告摘要。','conclusion':'可修改的報告結論。','recommendations':'可修改的建議／衛教文字。','patient_snapshot':'保存當時病患資訊，不隨後續病患修改而改寫；預設不含身分證／健保卡號。','measurements_snapshot':'由 DB 從原分析複製的數值、單位、檢驗資訊及示範標記；前端不能傳入改量測值。','interpretation_snapshot':'保存當時後端判讀結果與規則版本。','change_note':'這次改動的說明；透過兩版內容差異還原具體修改。'},
'report_reviews':{'report_version_id':'唯一外鍵，每一版最多一筆確認審核；新版本不繼承。','note':'這一版的審核意見；審核資料不可覆寫。'},
'report_exports':{'file_path':'私有 reports bucket 的 PDF 物件路徑，唯一；由後端生成與上傳。','file_sha256':'PDF 檔案 SHA-256 十六進位摘要，64 位字元；供核對附件內容。'},
'email_drafts':{'revision':'草稿修訂序號，新增 1，每次更新由 DB 遞增，供樂觀鎖定。'},
'email_deliveries':{'draft_id':'來源 email_drafts.id。','draft_revision':'排程當下草稿的 revision，之後草稿修改不影響此筆。','attach_report':'是否附上指定版本報告 PDF；true 時 report_version_id 必填。','report_export_id':'實際附件對應 report_exports.id；排程時可空，後端生成附件後填入且必須符合報告版本。','idempotency_key':'本次發送請求的唯一 UUID；重試沿用，防止重複排程。','status':'queued／sending／accepted／delivered／bounced／failed／unknown；只有後端可更新。','provider':'寄件供應商代碼。','provider_message_id':'供應商郵件 ID，與 provider 組成部分唯一索引。','attempt_count':'實際嘗試次數，初始 0；後端累加。','requested_by':'發送請求人的 auth.users.id，由排程 RPC 設定。','requested_at':'建立發送請求時間，不等於寄出時間。','accepted_at':'供應商接受郵件的時間，不代表送達。','delivered_at':'由已驗證供應商事件確認的送達時間。','last_attempt_at':'最後嘗試寄件的時間。','error_code':'後端／供應商錯誤碼，避免存憑證或完整敏感除錯資料。'},
'email_delivery_events':{'delivery_id':'對應 email_deliveries.id。','provider':'回報事件的寄件供應商。','provider_event_id':'供應商事件識別碼，與 provider 唯一；攔截 webhook 重複事件。','event_type':'queued／sending／accepted／delivered／bounced／failed／unknown。','occurred_at':'供應商事件實際發生時間。','received_at':'系統接收事件時間；可與發生時間不同。','details':'必要且已過濾的供應商事件細節 JSON，不存驗證密鑰。'}
}
summary={'patients':'病患主檔與預設聯絡方式','examinations':'某位病患的一次檢測／檢體','analysis_records':'量測、分析結果與兩張影像路徑','patient_notes':'每位病患一筆長期備註','reports':'分析紀錄的報告身份','report_versions':'每次保存的不可覆寫報告版本','report_reviews':'精確對應某版的審核','report_exports':'某版 PDF 的私有檔案','email_drafts':'可編輯 Email 草稿','email_deliveries':'每次發送凍結內容與後端狀態','email_delivery_events':'供應商事件歷程'}
order=list(summary)
by={t:[r for r in rows if r['table_name']==t] for t in order}
for t,rs in by.items():
 for r in rs:
  r['description']=desc.get(t,{}).get(r['column_name'],common.get(r['column_name']))
  assert r['description'],(t,r['column_name'])
(root/'docs/supabase-schema-v2.json').write_text(json.dumps({'status':'locally_verified_not_remotely_applied','columns':rows},ensure_ascii=False,indent=2)+'\n')
# Real SQL column comments are generated from the same field dictionary.
p=root/'supabase/migrations/202610190001_complete_records.sql';s=p.read_text();s=s[:s.index('-- COLUMN_DICTIONARY')] if '-- COLUMN_DICTIONARY' in s else s.replace("notify pgrst, 'reload schema';\ncommit;",'')
s+='-- COLUMN_DICTIONARY\n'
for r in rows:s+=f"comment on column public.{r['table_name']}.{r['column_name']} is '{r['description'].replace(chr(39),chr(39)*2)}';\n"
s+="notify pgrst, 'reload schema';\ncommit;\n";p.write_text(s)
relations=[('patients','||','o{','examinations','patient_id'),('patients','||','o|','patient_notes','patient_id'),('examinations','||','o{','analysis_records','examination_id'),('analysis_records','||','o|','reports','analysis_record_id'),('reports','||','o{','report_versions','report_id'),('report_versions','||','o|','report_reviews','report_version_id'),('report_versions','||','o{','report_exports','report_version_id'),('patients','||','o{','email_drafts','patient_id'),('report_versions','o|','o{','email_drafts','report_version_id'),('email_drafts','||','o{','email_deliveries','draft_id'),('patients','||','o{','email_deliveries','patient_id'),('report_versions','o|','o{','email_deliveries','report_version_id'),('report_exports','o|','o{','email_deliveries','report_export_id'),('email_deliveries','||','o{','email_delivery_events','delivery_id')]
mmd='erDiagram\n'
for a,ac,bc,b,label in relations:mmd+=f'    {a} {ac}--{bc} {b} : {label}\n'
for t,rs in by.items():
 mmd+=f'    {t} {{\n'
 for r in rs:
  typ={'timestamp with time zone':'timestamptz'}.get(r['data_type'],r['data_type'])
  key=' PK' if r['column_name']=='id' or (t=='patient_notes' and r['column_name']=='patient_id') else ''
  mmd+=f"        {typ} {r['column_name']}{key}\n"
 mmd+='    }\n'
(root/'docs/database-erd.mmd').write_text(mmd)
md='# 資料庫 v2：ERD 與逐欄說明\n\n狀態：已在本機 PostgreSQL 相容環境執行驗證，尚未套用遠端 Supabase。11 張業務資料表、133 個欄位。更新方式見 `supabase/README.md`。\n\n不含 Supabase 自行管理的 auth／storage 內部全表；操作者 UUID 參照 auth.users.id，物件路徑指向私有 Storage，不是 SQL 外鍵。\n\n```mermaid\n'+mmd+'```\n\n'
for t,rs in by.items():
 md+=f'## {t}：{summary[t]}\n\n'
 for r in rs:
  d=r['column_default']
  md+=f"- **{r['column_name']}** — `{r['data_type']}`；{'必填' if r['is_nullable']=='NO' else '可空'}；預設 `{d if d is not None else '無'}`。{r['description']}\n"
 md+='\n'
(root/'docs/database-schema-v2.md').write_text(md)
# A compact ERD for immediate viewing, with full searchable dictionary below.
pos={'patients':(25,65),'examinations':(320,65),'analysis_records':(615,65),'reports':(910,65),'report_versions':(1205,65),'patient_notes':(25,330),'email_drafts':(320,590),'email_deliveries':(615,590),'email_delivery_events':(910,590),'report_reviews':(1205,330),'report_exports':(1205,590)}
keyfields={'patients':['PK id','UK patient_code','email'], 'examinations':['PK id','FK patient_id','collected_at'], 'analysis_records':['PK id','FK examination_id','Excel 七項 + density','原圖／分析後圖路徑'], 'reports':['PK id','UK FK analysis_record_id'], 'report_versions':['PK id','FK report_id','UK report_id + version','病患／量測／判讀快照'], 'patient_notes':['PK FK patient_id','note'], 'email_drafts':['PK id','FK patient_id','FK report_version_id?','revision'], 'email_deliveries':['PK id','FK draft_id / patient_id','FK report_version_id?','FK report_export_id?','status / idempotency_key'], 'email_delivery_events':['PK id','FK delivery_id','UK provider + event_id'], 'report_reviews':['PK id','UK FK report_version_id','reviewed_by / reviewed_at'], 'report_exports':['PK id','FK report_version_id','file_path / file_sha256']}
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 880" role="img" aria-label="資料庫 v2 關聯圖"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8b98a6"/></marker></defs><rect width="1500" height="880" fill="#fff"/>']
# Main flow and branch links. Additional explicit FKs are shown in full Mermaid source/dictionary.
edges=[('patients','examinations','1 → N'),('examinations','analysis_records','1 → N'),('analysis_records','reports','1 → 0..1'),('reports','report_versions','1 → N'),('patients','patient_notes','1 → 0..1'),('patients','email_drafts','病患 1 → N'),('report_versions','report_reviews','1 → 0..1'),('report_versions','report_exports','版本 1 → N'),('email_drafts','email_deliveries','1 → N'),('email_deliveries','email_delivery_events','1 → N')]
for a,b,label in edges:
 x,y=pos[a];xx,yy=pos[b]
 if a=='report_versions' and b=='report_exports':
  sx,sy,tx,ty=x+265,y+100,xx+265,yy+100;path=f'M{sx},{sy} H1490 V{ty} H{tx}';lx=1370;ly=570
 elif a=='patients' and b=='email_drafts':
  sx,sy,tx,ty=x+265,y+165,xx+132,yy;path=f'M{sx},{sy} H300 V570 H{tx} V{ty}';lx=310;ly=560
 elif y==yy:
  if xx>x: sx,sy,tx,ty=x+265,y+95,xx,yy+95
  else:sx,sy,tx,ty=x,y+165,xx+265,yy+165
  path=f'M{sx},{sy} L{tx},{ty}';lx=(sx+tx)/2;ly=sy-9
 elif x==xx:
  sx,sy,tx,ty=x+132,y+210,xx+132,yy;path=f'M{sx},{sy} L{tx},{ty}';lx=sx+8;ly=(sy+ty)/2
 else:
  sx,sy,tx,ty=x+132,y+210,xx+132,yy;mid=(sy+ty)/2;path=f'M{sx},{sy} V{mid} H{tx} V{ty}';lx=(sx+tx)/2;ly=mid-7
 svg.append(f'<path d="{path}" fill="none" stroke="#8b98a6" stroke-width="1.6" marker-end="url(#arrow)"/><text x="{lx}" y="{ly}" font-size="12" fill="#52606d">{label}</text>')
for t,(x,y) in pos.items():
 svg.append(f'<g><rect x="{x}" y="{y}" width="265" height="210" rx="8" fill="#f8fafc" stroke="#cbd5e1"/><text x="{x+14}" y="{y+28}" font-size="17" font-weight="650" fill="#102c42">{t}</text><text x="{x+14}" y="{y+51}" font-size="12" fill="#52606d">{summary[t]}</text>')
 for i,f in enumerate(keyfields[t]):svg.append(f'<text x="{x+14}" y="{y+80+i*23}" font-family="system-ui" font-size="13" fill="#334155">{html.escape(f)}</text>')
 svg.append('</g>')
svg.append('<text x="25" y="845" font-size="14" fill="#52606d">? 表示可空。此圖簡化跨區連線；完整外鍵見 Mermaid ERD 與逐欄字典。操作者參照 auth.users；Storage 路徑非外鍵。</text></svg>')
svg=''.join(svg);(root/'docs/database-erd.svg').write_text(svg)
sections=[]
for t,rs in by.items():
 trs=[]
 for r in rs:
  vals=[r['column_name'],r['data_type'],'必填' if r['is_nullable']=='NO' else '可空',str(r['column_default'] or '無'),r['description']]
  trs.append('<tr>'+''.join('<td>'+html.escape(v)+'</td>' for v in vals)+'</tr>')
 sections.append(f'<section id="{t}"><h2>{t} <small>{summary[t]}</small></h2><table><thead><tr><th>欄位</th><th>型別</th><th>空值</th><th>預設</th><th>用途</th></tr></thead><tbody>{"".join(trs)}</tbody></table></section>')
page='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>精蟲分析系統｜資料庫 v2 交接</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#203346;font:15px/1.65 system-ui,sans-serif}header,main{max-width:1500px;margin:auto;padding:28px}h1{font-size:26px;margin:0}h2{font-size:20px;margin:32px 0 12px}small{display:block;font-size:14px;font-weight:400;color:#607284}.status{display:inline-block;padding:4px 12px;background:#e4edf5;border-radius:4px;color:#274961}nav{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}a{color:#215d8b}nav a{padding:4px 10px;background:white;border:1px solid #d5dfe7;border-radius:4px;text-decoration:none}aside{padding:16px 20px;background:white;border-left:4px solid #477594}svg{width:100%;height:auto;min-width:900px}.diagram{overflow:auto;border:1px solid #d5dfe7;background:white}input{width:100%;padding:12px;border:1px solid #bbcbd8;border-radius:4px;font:inherit;margin:20px 0 0}table{width:100%;border-collapse:collapse;background:#fff}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #e1e8ee;vertical-align:top}th{background:#eaf0f5;font-size:13px}td:first-child{font-family:ui-monospace,monospace;font-size:13px;width:20%;overflow-wrap:anywhere}td:nth-child(2){width:14%}td:nth-child(4){font-family:monospace;font-size:12px;width:17%;overflow-wrap:anywhere}footer{margin:30px 0;color:#607284}@media(max-width:760px){header,main{padding:16px}table{font-size:12px}td,th{padding:7px}h2{font-size:18px}}@media print{body{background:white}input,nav{display:none}header,main{padding:0}.diagram{overflow:visible}svg{min-width:0}section{break-inside:auto}tr{break-inside:avoid}h2{break-after:avoid}}
</style><header><p class="status">本機驗證完成 · 遠端尚未套用</p><h1>資料庫 v2：ERD 與逐欄字典</h1><p>2026-10-19 · 11 張業務表 · 133 個欄位 · 來源：已執行本機遷移的實際 PostgreSQL 中繼資料</p><aside>Excel 七項皆保留。數值不含 % 字元；Color／Appearance 為文字。null 表示缺值，0 表示測得零。Amount／Count 的單位與參考範圍交由後端定案。建表不會自行產生 PDF 或寄信。</aside><nav>'''+''.join(f'<a href="#{t}">{t}</a>' for t in order)+'''</nav></header><main><h2>關聯圖 <small>主流程、報告版本與寄件追蹤；完整外鍵見 database-erd.mmd。</small></h2><div class="diagram">'''+svg+'''</div><input id="search" aria-label="搜尋欄位、型別或用途" placeholder="搜尋欄位，例如 Email、審核、motility、影像…">'''+''.join(sections)+'''<footer>auth.users 與 storage 為 Supabase 管理的系統資料，本字典只列本專案業務表。執行步驟及權限／後端待辦見 supabase/README.md。</footer></main><script>document.getElementById('search').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();for(const s of document.querySelectorAll('section')){let n=0;for(const r of s.querySelectorAll('tbody tr')){const show=!q||s.querySelector('h2').textContent.toLowerCase().includes(q)||r.textContent.toLowerCase().includes(q);r.hidden=!show;if(show)n++}s.hidden=n===0}})</script></html>'''
(root/'docs/database-schema-v2.html').write_text(page)
print('Generated: full Mermaid ERD, SVG overview, searchable HTML, Markdown dictionary, JSON metadata and 133 SQL column comments.')
