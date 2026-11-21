# Gary Tang · AI Engineering Portfolio

靜態中文求職作品集。首頁展示工作成果與可按類別篩選的作品目錄。每件作品都有可分享的個案網址、技術選擇及交付說明。

[公開網站](https://garytangtang2-bit.github.io/ai-engineer-portfolio/) · [履歷 PDF](assets/Gary-Tang-CV.pdf)

## 維護與預覽

修改 `content/projects.json` 後執行 `python -B tools/build_portfolio.py`。原生 HTML 會寫入首頁和 `projects/<id>/index.html`，GitHub Pages 直接提供這些檔案。本機可用 `python -B -m http.server 7817 --bind 127.0.0.1` 預覽。

互動個案的 HTML 位於 `content/widgets/`，操作程式位於 `widgets/`。會議可核實原句並下載英文紀錄，PDF 可核對公開 Excel，ToGoalAi 可切換正式站畫面及教材處理路線。虛構地盤模型在操作時載入 Three.js。其他獨立示範涵蓋文件判讀、用量對帳、影片製作及批次上傳預檢。舊作品錨點透過 `legacy-routes.js` 對應新頁面。

將自我介紹成片放入 `assets/introduction.mp4`，可選字幕放入 `assets/introduction.zh-Hant.vtt`，然後重新產生靜態頁面。播放器會出現在個人介紹與 AutoCut 個案頁，由訪客啟動。

個案工時及採用情況來自本人工作紀錄。網站的合成例子、重新設計的地盤模型及正式站截圖均按來源標示。

各作品在 `assets/work/` 保留原有實物圖，圖說位於 `content/work-images.json`。新版介面的實際操作截圖及縮圖位於 `assets/interfaces/`，圖說、替代文字及來源位於 `content/interface-images.json`。個案頁可放大新版截圖，亦可開啟原圖。可展開的輸出及設定紀錄由 `content/inspection.json` 產生。

首頁光帶由 `particles.js` 在 Canvas 繪製，支援滑鼠與觸控。訪客啟用減少動態效果時，光帶維持靜止。

### n8n 用量對帳

將 [工作流 JSON](evidence/token-usage-workflow.json) 以 **Import from File** 匯入 n8n。在編輯器從「手動測試」開始執行，即可試跑內建合成資料，或在「用量紀錄」替換輸入。如要給其他工作流調用，先在自己的 n8n 發佈此工作流，再由上游的 Execute Sub-workflow 傳入一個含 `runs` 陣列的項目，或逐項傳入用量紀錄。

每個 `caseId` 需要一筆 `before` 和一筆 `after`。先按版本加總每次模型呼叫（包括重試）的輸入和輸出 Token，再用相同標準填寫 `accepted`。兩個版本都通過才納入用量合計。未配對及待覆核個案另列，重複紀錄會提示錯誤。網站可在瀏覽器本機執行同一套邏輯。

已在 n8n 2.48.6 由上游工作流執行同一份匯出檔。內置合成測試有兩個配對納入比較，合計由 1,800 降至 400 Token，一個配對留待覆核。[開啟執行輸出](evidence/token-usage-result.json)

第三方授權見 `fonts/*-OFL.txt`、`tools/vendor/three/LICENSE` 及 `tools/vendor/fflate/LICENSE`。技術標誌取自 [Simple Icons](https://github.com/simple-icons/simple-icons)。
