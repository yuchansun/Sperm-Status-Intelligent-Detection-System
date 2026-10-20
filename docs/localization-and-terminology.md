# 三語翻譯與術語

支援繁體中文（zh）、英文（en）、韓文（ko）。使用既有語言選單切換，選擇保存在本機；介面、當次產生的報告文字與 Email 內容使用目前語言，不需 SQL 或部署設定。

## 術語對照

- 精蟲濃度 — Sperm concentration — 정자 농도。單位 million/mL；不可翻成 total sperm number。
- 總精蟲數 — Total sperm number — 총 정자 수。與濃度不同；編輯時沿用紀錄既有單位，不由翻譯層重新計算或猜測單位。
- 精蟲活動力 — Sperm motility — 정자 운동성。百分比 %；前進性活動力為 Progressive motility / 전진 운동성，與總活動力分開。
- 正常型態比例 — Normal morphology — 정상 형태 비율。百分比 %；型態本身為 Morphology / 형태，不混用頭身比。
- 精液量 — Semen volume — 정액량。單位 mL；對應 Excel Amount。
- 顏色 — Color — 색상；外觀 — Appearance — 외관；pH 三語均使用 pH。
- 檢體編號 — Specimen number — 검체 번호；檢測 — Examination — 검사；病患 — Patient — 환자。
- 待分析 — Awaiting analysis — 분석 대기；待複核 — Awaiting review — 검토 대기；已完成 — Completed — 완료。
- 醫師複核 — Physician review — 의사 검토；病患備註 — Patient notes — 환자 메모。
- 精確率 — Precision — 정밀도；信心分數 — Confidence score — 신뢰도 점수。兩者不等於濃度或活動力，也不是彼此同義詞。
- 寄送結果與衛教 — Send results and patient education — 검사 결과 및 건강 교육 보내기。
- 健保卡指台灣健保卡：Taiwan NHI card / 대만 건강보험 카드。不是韓國身分證；身分證欄位翻為 National ID / 신분증 번호。

英文術語參考 WHO 第六版精液檢查手冊（僅核對名稱與單位，本次不變更臨床參考門檻）：https://iris.who.int/bitstream/handle/10665/343208/9789240030787-eng.pdf
韓文採對應的檢驗常用詞，由本次人工整理；尚未經韓語母語醫療人員審稿。

## 範圍與資料保留

已處理登入、首頁、病患查詢與讀卡、檢體取號、上傳進度、分析結果、歷史、備註、修改與永久刪除、設定與讀卡說明、私有媒體提示，以及寄送成功／失敗等訊息。補齊原本英文／韓文缺少的字典鍵，表單 label、title 與 aria-label 同步翻譯。

報告／Email 共用 reportText 格式化邏輯：歷史文字報告的複製、下載、分享與 Email，及單筆結果 Email，都使用當前語言與相同術語。保留報告歷史明細、最新結果、衛教與追蹤提示；不增加新的參考值。寄件人名稱也使用當前語言。報告版本與 Email 草稿 API 的預設 language 改成目前語言；已保存的歷史版本不會被翻譯或覆寫。

病患姓名、Email、身分證、備註、人工摘要與已保存的自由文字不做自動翻譯。只有可辨識為系統生成的 Demo 摘要，才依當前語言顯示相同量測內容；資料庫原文不改寫。資料庫的中文狀態碼與權限判斷保持原值，僅顯示時翻譯。

既有 PDF 按鈕仍是原本的模擬下載提示；本次翻譯沒有新增真正的 PDF 產生功能。EmailJS 寄送測試採 mock，未對任何病患實際寄信。

## 維護與驗證

既有頁面鍵在 context/language.js；術語覆寫與缺鍵補齊在 i18n/terms.json、completeLocales.js；新增功能的來源訊息與三語翻譯在 i18n/messages.json。translateText 支援 {{0}} 等插值，保留識別碼、數值與單位。新增訊息須同時提供 zh/en/ko，並保留相同插值。

測試檢查三語鍵完整、英文／韓文系統訊息無中文遺漏、插值完整、動態錯誤保留代碼、報告／Email 一致與自由文字保留，以及表單開啟時切換語言不遺失數值。另執行既有全部測試、lint、型別檢查與建置。
