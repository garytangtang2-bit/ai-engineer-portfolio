# Gary Tang · AI Engineering Portfolio

中文 AI Engineer 求職作品集。以實際問題、工程流程、交付與可操作證據介紹作品。

[開啟作品集](https://garytangtang2-bit.github.io/ai-engineer-portfolio/) · [履歷 PDF](assets/Gary-Tang-CV.pdf)

## 本地檢視

在此目錄執行 `python -m http.server 7817 --bind 127.0.0.1`，再開啟 `http://127.0.0.1:7817/`。網站無建置步驟，亦毋須 API key。

## 展示方式

- **會議紀錄**：以虛構資料重現原流程。首屏與 PDF 可直達一項答疑，記錄附來源的同事回覆後，會即場更新英文紀錄及解鎖示例下載。五步導覽涵蓋本機轉錄、分級事實和交稿檢查。
- **PDF → Excel**：原 Python 程式處理的 20 頁、20,000 格合成數值表，提供實際 PDF、Excel 與逐格核對紀錄。此測試只涵蓋文字層及指定選區，並非掃描 OCR 準確率測量。
- **ToGoalAi**：正式站的出題、作答與弱項分析畫面。可切換五種教材匯入路徑，並查看以 GitHub 原始碼核對的 RAG、模型路由、簡報、帳戶及營運架構。
- **投標地盤模型**：同一 Three.js 引擎支援快速 3D 導覽和完整編輯器。全新虛構地盤涵蓋 20 個分區、8 段板樁、43 組樁帽、斜道、排水區及 2D 圖則。導覽可旋轉、切換視角和移動剖切線，展示投標方案的施工與支護關係。
- **複雜 PDF 判讀 Skill**：介紹如何讓 AI 按版面、細字、跨頁及覆核規則理解複雜文件，配合工具交付 Excel。互動是流程導覽，版面採合成示意；可下載原程式的合成 Excel 輸出。
- **上傳／影片 Skills**：以原配對程式的合成結果比較兩輪批次預檢，並用可拖動的合成時間軸展示字幕及動畫標記。

公司成效、採用量及投標用途來自本人工作紀錄及陳述，屬個案結果。地盤模型為全新虛構配置；PDF 與 Excel 測試採合成資料。個人聯絡方式只在 PDF 履歷。

## 介面

原生 HTML／CSS／JavaScript，響應式排版、鍵盤可用的流程頁籤及表格、可關閉圖片對話框、按需載入 3D、可暫停模型旋轉，並尊重 `prefers-reduced-motion`。

## 技術與回饋機制

作品索引列出交付和個案成效，所選案例顯示操作示例。展開技術區可看 Python 調用 FFmpeg、faster-whisper／Transformers 本機轉錄、PyMuPDF／OpenCV 表格及字形、RapidOCR／ONNX Runtime、Office 輸出，以及 Remotion 影片製作。

雙模式回饋示例展示「用戶確認 → 記憶更新 → 下次沿用」：語音術語進入經確認的熱詞／校正流程，PDF 字形更新同組讀值並保存字典。示例只操作合成的頁面狀態，不寫入真實知識庫或呼叫模型。實際機制以有來源的知識庫、詞庫及規則累積經驗；候選資料先確認再套用。

第三方授權位於 `fonts/*-OFL.txt` 及 `tools/vendor/three/LICENSE`。
