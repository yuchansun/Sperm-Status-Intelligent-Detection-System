> 檢體編號即時顯示：執行 `migrations/202610200007_reserve_specimen.sql`（依賴 003），詳見 `docs/specimen-reservation.md`。

> 永久刪除與釋放雲端檔案空間：完成 001–005 後執行 `migrations/202610200006_permanent_delete.sql`。SQL 安裝不會自動刪除資料，詳見 `docs/permanent-deletion.md`。

> 病患修改／刪除：完成 001–004 後執行 `migrations/202610200005_patient_management.sql`。詳見 `docs/patient-management.md`。

> 修改／刪除檢測：完成 001–003 後執行 `migrations/202610200004_record_management.sql`。功能與保留資料方式見 `docs/record-management.md`。

> 檢體自動流水號：完成 001、002 後，在 SQL Editor 執行 `migrations/202610190003_sample_serial.sql`；詳細說明見 `docs/specimen-number-and-demo.md`。

> 新增單檔影片與病患選取功能：先套用本文件的 v2，再執行 `migrations/202610190002_exam_media.sql`。完整步驟與新增 exam_media 欄位見 `docs/patient-selection-and-video.md`。

# Supabase v2 更新步驟

此資料夾是可執行的更新方案，不代表遠端已套用。不要重新建專案，也不用刪除舊表。

## 執行順序

1. 先從 Supabase Table Editor 匯出現有四張表的資料留存。原程式修改尚未部署；先暫停新增／編輯檢驗，再進行欄位轉型。
2. Supabase → SQL Editor → New query。完整貼入 `migrations/202610190001_complete_records.sql`，一次執行整份（含 BEGIN／COMMIT）。不要分段執行。
3. 若顯示 `Cannot convert metric` 或 `Percentage exceeds 100`，代表舊資料中有不明字串／不合理百分比，整批會回滾，不要刪資料。先用查詢取得該欄位與紀錄 ID 交由開發者核對；不可使用把所有非數字刪掉的方式強制轉型。遇到其他錯誤也先確認交易已 rollback，再處理錯誤後重跑完整腳本。
4. 執行下方驗證 SQL。預期 public 共有本專案 11 張表；density、motility、morphology、amount、ph、count_of_spermatozoa 均為 numeric。Color／Appearance 是文字描述，不改成數字。
5. 本機以新版程式建立一筆測試檢測，確認讀寫正常，再更新既有 Vercel 專案。不要先部署會寫入新版欄位的程式，卻還沒執行 SQL。
6. 同學以 `src/services/reportEmailApi.js` 的介面開發報告／Email 編輯 UI。報告的每次修改存新版本；Email 的「排程成功」僅代表 queued，不能顯示已寄出或已送達。

```sql
select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public'
  and table_name in ('patients','examinations','analysis_records','patient_notes',
    'reports','report_versions','report_reviews','report_exports',
    'email_drafts','email_deliveries','email_delivery_events')
order by table_name,ordinal_position;

select id, sample_id, density, motility, morphology, legacy_metrics,
       amount, color, appearance, ph, count_of_spermatozoa,
       original_image_path, analyzed_image_path
from public.analysis_records order by created_at desc limit 10;

select id,public,allowed_mime_types from storage.buckets
where id in ('exam-images','reports');
```

## 這次更新的內容

- Excel 七項都有固定欄位，即使尚未量測也保留為 null。Amount 與 Count 的單位未定，所以單位欄位允許 null，不擅自預設。既有 density 仍是濃度，與 Count 分開。
- 三項舊指標轉成 numeric；`32%` 轉成 `32`，不除以 100。legacy_metrics 保留遷移前文字值。不可把同一欄混用 0–1 與 0–100。
- pH 0–14、比例 0–100、其他量測非負有限數值，只是資料格式限制，並非老師的臨床參考範圍。實際燈號／參考值由後端決定，interpretation 與 interpretation_version 僅提供儲存空間。
- 新增 patients.email；影像維持兩個既有路徑欄位。檔案仍在私有 Storage，DB 不存圖片本體／公開 URL。
- 報告允許改 title／summary／conclusion／recommendations／language／change_note。量測快照由資料庫從原分析複製，不接受前端偷偷改原始數值。若未來要修正量測值，必須另設受控修正流程，目前未開放。
- reports 是報告身份；report_versions 是不可覆寫的每版內容；report_reviews 是對特定版本的審核；report_exports 是特定版本 PDF 的私有物件路徑及 SHA-256。每次修改為新版本，不會沿用上一版的審核。
- 分析狀態改為已完成時，資料庫記錄操作者及時間；已完成後修改量測或內容會回到待複核。舊紀錄不捏造原審核者與審核時間。
- email_drafts 保存可修改草稿；email_deliveries 凍結每次寄送的內容、附件版本與狀態；email_delivery_events 保存供應商事件，避免 webhook 重複寫入。
- 新增 private reports bucket（PDF，20 MB）；前端只能讀，產生及上傳由後端處理。不改動 exam-images 權限，不自動產生或上傳任何 PDF／影像。

## 後端還要實作，不能只靠建表完成

1. 指標計算、Amount／Count 單位及活動力分類；寫入數值欄位與 measurement_status。
2. 參考值版本與 interpretation，禁止把缺值當零。表內不預設門檻。
3. 分析後影像產生及 analyzed_image_path 寫入。
4. PDF 產生 → 私有 reports 上傳 → report_exports 寫入。
5. 寄件 worker／Edge Function：以原子操作認領 queued 工作、防止重複處理，使用 provider 支援的 idempotency key；逾時而無法確認供應商是否接受時標記 unknown 並查詢，不能直接盲目重寄。
6. Email 服務供應商 API 金鑰只放後端。accepted 表示供應商接受，delivered 必須由驗證過簽章的 webhook／供應商查詢確認。Webhook 驗證後再以 service_role 更新狀態並寫事件；保留未到順序的事件，不得因延遲 accepted 事件把 delivered 降級。

原有歷史頁 EmailJS 按鈕仍為舊流程，尚未改成新的草稿／寄件佇列；同學開發新版時需接上上述 API。結果頁 PDF 仍為示範按鈕。資料表及 helper 已備好，不代表寄件 worker、附件、編輯 UI 已實作。

## 權限邊界

沿用目前「已登入者共用資料」模式，新表也只允許登入者讀取。草稿可新增／修改；報告版本、審核與寄件排程只能透過 RPC 寫入；寄送狀態、事件與 PDF 匯出只能由後端更新。沒有新增前端管理金鑰。

這次記錄的是已登入操作人員的審核，不代表已建立醫師資格／角色驗證。若需求改為只有醫師能審核，仍需另做角色表與資料庫授權，不能只藏按鈕。此限制與原本的共用權限相同。

## 同學可用的 API

- `saveReportVersion`：首次 expectedVersion=0；之後傳目前版本號，版本衝突會拒絕，需重新讀取。快照自動帶病患／數值／判讀，不含身分證及健保卡號。
- `getReportVersions`：查詢某筆分析的報告各版本。
- `saveEmailDraft`：新增草稿，或帶 id／revision 修改；資料庫自動遞增 revision。
- `queueEmailDelivery`：帶草稿 revision 與本次固定 idempotencyKey；重試沿用 key，新一次寄送才換 key。attachReport=true 時需指定草稿的 reportVersionId；僅排程，不實寄。
- `getEmailDeliveries`：查病患寄送紀錄。
- SQL RPC `review_report_version`：記錄某一版的審核；每版一筆，不覆寫。

## 本機驗證

`tests/verify-migration.mjs` 使用獨立 PGlite PostgreSQL，引入舊表結構／假資料，不接遠端 Supabase。覆蓋數值遷移、失敗回滾、重跑、報告版本、審核、Email 凍結／重試／權限等。測試 auth 與 storage 是最小模擬，不等同真實 Supabase 整合測試。

測試工具安裝於臨時目錄，不改專案套件：

```sh
npm install --prefix /private/tmp/sperm-db-verification --no-audit --no-fund @electric-sql/pglite
node supabase/tests/verify-migration.mjs /private/tmp/sperm-db-verification/node_modules/@electric-sql/pglite/dist/index.js
```

執行遠端 SQL 後，請提供驗證查詢結果，才能把「已本機驗證的目標結構」改記為「遠端已套用」。
