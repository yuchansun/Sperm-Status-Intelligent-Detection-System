# 固定三組 Demo 登入帳號

登入頁輸入 admin、doctor 或 demo，程式轉成對應 Email 交給 Supabase 驗證使用者輸入的密碼。前端沒有固定密碼驗證或 localStorage 假登入，也不使用共用管理金鑰。既有 Email 帳號仍可直接登入。

需先在 Supabase → Authentication → Users → Add user → Create new user，建立三個使用者，並勾選 Auto Confirm User：

- admin 對應 admin@sperm-demo.example.com
- doctor 對應 doctor@sperm-demo.example.com
- demo 對應 demo@sperm-demo.example.com

Email 是固定帳號的內部識別碼，example.com 為示範用途，不用寄邀請信，也無法用它接收重設密碼信。密碼在 Supabase 建立時設定。帳號別名不是角色權限，依現有 RLS 三組仍共享讀寫與刪除權限。公開註冊保持關閉，不需要新增 SQL。

原本 AuthContext 中三組名稱由版本歷史確認；目前僅恢復輸入方式，須完成上述 Auth 帳號建立後才能實際驗證登入。管理者也可繼續使用已存在的 Email 帳號登入。
