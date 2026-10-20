# 永久刪除與釋放 Storage 空間

此功能取代 004／005 的介面軟刪除行為。需先套用 001–005，再於 Supabase SQL Editor 執行 `supabase/migrations/202610200006_permanent_delete.sql` 全部內容，成功後重新整理本機網站。不需 Edge Function、部署網站或前端管理金鑰。安裝 SQL 本身不會清除任何現有資料。

- 刪除單筆檢測：永久移除分析紀錄、私有原圖／標記圖／影片、相關報告版本／匯出／複核，以及相關 Email 草稿、寄送追蹤與事件。病患主檔及其他檢測保留；僅在沒有其他分析時刪除其 examination。
- 刪除病患：永久移除病患、備註、全部檢測及上述相關內容。
- 歷史紀錄頁「已刪除項目」可逐筆確認清理先前軟刪除資料；沒有自動或一鍵批次清空。
- 已寄出的 Email 無法撤回；使用者本機原始檔不受影響。

流程：prepare_permanent_delete 驗證登入與 updated_at、建立工作並先隱藏／凍結目標；前端依伺服器提供的精確清單呼叫 Storage remove；finish_permanent_delete 再確認檔案 metadata 已不存在，才在單一交易內移除關聯資料。檔案刪除與資料庫交易無法跨系統原子回復；中途失敗時可能已有部分檔案被永久移除，但資料列與工作保留，必須使用原刪除帳號在原頁或已刪除項目重試。成功完成前不顯示成功。

權限：未開放所有檔案任意 DELETE。Storage 政策僅允許目前登入者清除自己已確認工作內仍由該工作獨佔引用的路徑。資料庫永久刪除使用固定 search_path 的 security definer RPC，明確檢查 auth.uid、工作所有者及目標版本。其他已登入人員仍具有系統原本共用的操作權限。報告不可變規則只對該 RPC 的指定刪除工作例外；一般修改仍不允許。

si_purge_jobs 為內部追蹤表，前端無直接存取權；保留 UUID、範圍、執行帳號及完成時間，完成時清空路徑清單，不保留患者姓名、量測或檔案內容。這些小型工作紀錄不會佔用影像／影片 Storage 配額。共用檔案仍被其他檢測引用時保留。未被任何資料列引用的歷史孤立檔案不在此自動掃描清除範圍。

實際檔案經 Storage API 移除才釋放檔案空間；單純刪 storage.objects metadata 不會清除底層檔案。資料表 DELETE 後的 PostgreSQL 檔案大小由資料庫 vacuum／空間重用管理，不保證儀表板數字立即下降。

本機驗證：前端 Storage 成功／失敗／重試／缺 migration 測試；隔離 PostgreSQL 驗證關聯刪除、匿名阻擋、指定檔案權限、檔案未清除時阻擋完成、凍結編輯、保留其他病患檢測與重試冪等。沒有刪除遠端真實資料；需套用 SQL 後以可丟棄的檢測進行實際 Storage 整合驗證。

官方參考：https://supabase.com/docs/guides/storage/management/delete-objects
