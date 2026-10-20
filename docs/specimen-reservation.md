# 檢體編號即時顯示

在完成現有 migration 後，將 `supabase/migrations/202610200007_reserve_specimen.sql` 全部內容貼到 SQL Editor 執行；成功後重新整理本機網站。此功能依賴 003 的 specimen_number_seq。SQL 可重複執行，不改寫既有檢體編號。

確認病患時呼叫 reserve_specimen_number，為本次 examination UUID 預先保留唯一流水號，以文字顯示。ensure_examination 在正式提交時沿用同號碼，不接受前端自行指定編號。相同 UUID 重試會回傳同號；更換病患或重新開啟新檢測會取得新 UUID 與號碼。預留號碼不會提前建立病患、檢測、量測或上傳檔案；取消可能跳號。

新增內部表 specimen_reservations：
- examination_id（uuid，主鍵）：本次提交 UUID。
- sample_id（text，唯一）：伺服器產生的 SMP 流水號。
- reserved_by（uuid，auth.users 外鍵）：取號帳號。
- created_at（timestamptz）：取號時間。

表啟用 RLS，瀏覽器沒有直接讀寫權限。取號 RPC 驗證登入與預約帳號，同一 UUID 用資料庫鎖避免同時重複取號。紀錄不存病患個資、檢測數值或媒體；保留作為取號憑據，永久刪除檢測不會回收其流水號。
