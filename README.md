# Gary Tang · AI Engineering Portfolio

中文 AI Engineer 求職作品集。首頁先展示交付成果，三個精選案例在同頁開啟互動示範。其他工具集中在六個入口。

[開啟作品集](https://garytangtang2-bit.github.io/ai-engineer-portfolio/) · [履歷 PDF](assets/Gary-Tang-CV.pdf)

## 本地檢視

在此目錄執行 `python -m http.server 7817 --bind 127.0.0.1`，再開啟 `http://127.0.0.1:7817/`。網站無建置步驟，亦毋須 API key。

## 展示方式

- **會議紀錄**：用虛構資料重現原流程。採用附時間碼的同事回覆後，可即場核對及下載更新的英文紀錄。
- **PDF → Excel**：點選數值會標出合成原 PDF 的對應位置。完整測試由原 Python 程式處理 20 頁及 20,000 格，涵蓋文字層及指定選區。可下載兩個檔案及查看逐格核對紀錄。
- **ToGoalAi**：以獨立交付為主，介紹介面、前後端、API、RAG 與部署。可切換正式站畫面，並操作五種教材的匯入分流。
- **投標地盤模型**：同一 Three.js 引擎支援快速 3D 導覽和完整編輯器。全新虛構地盤涵蓋 20 個分區、8 段板樁、43 組樁帽、斜道、排水區及 2D 圖則。導覽可旋轉、切換視角和移動剖切線，展示投標方案的施工與支護關係。
- **複雜 PDF 判讀 Skill**：介紹如何讓 AI 按版面、細字、跨頁及覆核規則理解複雜文件，配合工具交付 Excel。互動是流程導覽，版面採合成示意；可下載原程式的合成 Excel 輸出。
- **上傳／影片 Skills**：以原配對程式的合成結果比較兩輪批次預檢，並用可拖動的合成時間軸展示字幕及動畫標記。
- **其他工具**：涵蓋 Excel 公式預檢、PDF 批註與合併、CAD、模型檢查、講座摘要、程式動畫及內容同步。

公司成效、採用量及投標用途來自本人工作紀錄及陳述，屬個案結果。地盤模型為全新虛構配置；PDF 與 Excel 測試採合成資料。個人聯絡方式只在 PDF 履歷。

## 介面

原生 HTML／CSS／JavaScript。示範視窗可按 Esc 關閉，保留舊作品錨點。首頁以合成的會議節錄進入答疑示範。會議個案呈現製作工時、兩次會議之間的人工交接及技術分工。投標展示先顯示 WebP，操作時才載入 Three.js，支援 2D、3D 及剖切，並尊重 `prefers-reduced-motion`。

## 技術與回饋機制

主打作品卡列出交付和個案成效。試玩視窗顯示操作示例和工程取捨，包括 Python 調用 FFmpeg、faster-whisper 本機轉錄、PyMuPDF／OpenCV 表格與字形，以及 Word、Excel 輸出。影片卡介紹 Remotion 的時間軸及上傳預檢。

雙模式回饋示例展示「用戶確認 → 記憶更新 → 下次沿用」：語音術語進入經確認的熱詞／校正流程，PDF 字形更新同組讀值並保存字典。示例只操作合成的頁面狀態，不寫入真實知識庫或呼叫模型。實際機制以有來源的知識庫、詞庫及規則累積經驗；候選資料先確認再套用。

訪客可在「逐格核對」讀取公開 Excel 實檔。瀏覽器解開 XLSX，按照工作簿關係讀取每張表，核對合成資料的格位、數字型別和預期值，並指出第一處差異。

### n8n 用量對帳

將 [工作流 JSON](evidence/token-usage-workflow.json) 以 **Import from File** 匯入 n8n。在編輯器從「手動測試」開始執行，即可試跑內建合成資料，或在「用量紀錄」替換輸入。如要給其他工作流調用，先在自己的 n8n 發佈此工作流，再由上游的 Execute Sub-workflow 傳入一個含 `runs` 陣列的項目，或逐項傳入用量紀錄。

每個 `caseId` 需要一筆 `before` 和一筆 `after`。先按版本加總每次模型呼叫（包括重試）的輸入和輸出 Token，再用相同標準填寫 `accepted`。兩個版本都通過才納入用量合計。未配對及待覆核個案另列，重複紀錄會提示錯誤。網站可在瀏覽器本機執行同一套邏輯。

已在 n8n 2.48.6 由上游工作流執行同一份匯出檔。內置合成測試有兩個配對納入比較，合計由 1,800 降至 400 Token，一個配對留待覆核。[開啟執行輸出](evidence/token-usage-result.json)

第三方授權見 `fonts/*-OFL.txt`、`tools/vendor/three/LICENSE` 及 `tools/vendor/fflate/LICENSE`。技術標誌取自 [Simple Icons](https://github.com/simple-icons/simple-icons)。


## 更新 AutoCut 自我介紹

成片獲准公開後，把 MP4 及可選的繁體中文字幕 VTT 放入 `assets/`。在 `index.html` 的 `#intro-media` 填入 `data-video-src` 及 `data-caption-src` 的相對路徑，例如 `assets/introduction.mp4` 和 `assets/introduction.zh-Hant.vtt`。影片留空時展示照片和文字自介。填入成片後會顯示原生播放器，由訪客啟動。
