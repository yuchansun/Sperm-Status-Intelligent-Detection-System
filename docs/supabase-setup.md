> 新版欄位更新：請優先閱讀 `supabase/README.md`。新版前端須在執行 v2 SQL 後使用；下文為第一階段串接紀錄。

# Supabase 串接接手狀態

已保留既有 package.json / package-lock.json 修改；原先只加入 Supabase 套件，沒有遠端資料存取實作。
登入現改用 Supabase Email + 密碼，不再接受本機固定帳密或 sperm-ai-authenticated 旗標。
病患、檢測、分析紀錄、備註及影像已改用 `src/services/cloudApi.js`；保留原有本機服務檔案，但正式頁面不再呼叫或匯入原有本機資料。
已依使用者提供的欄位 JSON、外鍵、RLS 與 bucket 設定完成對應；未修改遠端結構或權限。

## 已核對的資料對應

- patients：使用 UUID 作為關聯 ID；patient_code 為穩定產生的識別碼，national_id 查找既有病患，填寫資料會更新既有病患。若查到多筆相同 national_id，停止儲存，請管理者核對。資料庫尚未強制 national_id 唯一；舊資料或其他客戶端仍可能製造重複。
- examinations：patient_id 關聯病患；檢體編號存 sample_id，另產生唯一 examination_code。
- analysis_records：examination_id 關聯檢測；ai_result.isDemo 明確標示示範，固定濃度 48、正常型態 4%，活動力選擇分析時為示範 32%，未選則為 null。標註框也是示範，不代表上傳影像的實際辨識。
- patient_notes：以 patient_id 主鍵 upsert，一位病患一筆備註，寫入 updated_by 與 updated_at。
- exam-images：只上傳本次明確選取的 JPEG／PNG／WebP，限制 10 MB。DB 只存物件路徑；顯示時取得 5 分鐘簽名連結，開啟中的影像每 4 分鐘更新連結，沒有 public URL。
- 寫入流程不是資料庫交易：病患、檢測、分析、影像依序存入。若中途失敗，保留已寫入內容，當頁重試沿用相同檢測與分析 ID；重新整理後不能自動恢復未上傳的檔案。影像失敗時紀錄標記「影像待上傳」，不可直接複核完成；不自動刪除孤立或部分資料。


## 本機設定

在專案根目錄 `.env.local` 保留原有 EmailJS 設定，追加：

```dotenv
VITE_SUPABASE_URL=https://你的專案代碼.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=你的公開金鑰
```

也支援 VITE_SUPABASE_ANON_KEY（舊版 anon key）。只填 publishable 或 anon 公開金鑰，不可填 secret 或 service_role。修改後重新啟動 `npm run dev`。
`.env.local` 已被 Git 忽略。不要將帳號密碼寫進環境變數或程式。

## 結構查詢備查（本次已取得）

以下是本次核對使用的唯讀查詢，保留供日後結構變更時重新確認。

```sql
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('patients', 'examinations', 'analysis_records', 'patient_notes')
order by table_name, ordinal_position;

select c.relname as table_name, con.conname,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('patients', 'examinations', 'analysis_records', 'patient_notes');

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in
  ('patients', 'examinations', 'analysis_records', 'patient_notes'))
  or (schemaname = 'storage' and tablename = 'objects');

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'exam-images';
```

## 保留本機資料

既有 `sperm-ai-patients`、`sperm-ai-history-records`、`sperm-ai-patient-notes` 不刪除、不自動匯入。首頁及歷史列表僅列雲端紀錄，不再混入預設假資料；空清單表示尚無雲端分析紀錄，不代表本機資料消失。

## 本機驗證

靜態檢查：`npm run lint`、`npm run type-check`、`npm test`、`npm run build`。
連線設定已填妥，還需使用手動建立的帳號驗證登入、重新整理、登出、過期工作階段，以及未登入時的 RLS 拒絕行為。
另需以真實連線驗證新增病患、重開紀錄、修改備註、私有影像上傳與簽名讀取；不能僅以建置成功宣稱串接成功。

## 手動驗收步驟（尚待真實帳號驗證）

1. 啟動 `npm run dev`，使用已建立的 Email 帳號登入；重新整理應保留登入，登出後直接開啟歷史網址應回登入頁。
2. 用可識別的測試病患與測試檢體建立示範檢測；先不附圖，再另建一筆附圖。測試資料會保留於 Supabase，本程式不自動刪除。
3. 至歷史列表重開病患，確認兩筆檢測、日期、空白活動力及示範標示；改備註後重新整理，確認儲存仍在。
4. 對待複核紀錄點選完成，確認狀態、首頁數量同步；不改寫示範標記或臨床判讀。
5. 檢視附圖紀錄，確認是上傳影像，URL 為簽名連結；未附圖的示範紀錄只顯示標示的範例影像。
6. 嘗試 SVG、超過 10 MB 檔案，以及斷線儲存，確認失敗會顯示錯誤，不會宣告成功。斷線重試需停留原頁。
7. 檢查 Supabase 表格的外鍵與 original_image_path，並確認 bucket 仍為 private。未登入的 REST／Storage 請求應受 RLS 阻擋。

參考：[Supabase 關聯查詢](https://supabase.com/docs/guides/database/joins-and-nesting)、[私有影像簽名連結](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl)。
