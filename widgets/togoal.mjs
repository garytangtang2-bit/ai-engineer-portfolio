const $ = id => document.getElementById(id);
const productScreens = {
  home: ['togoalai-live.webp', '正式站首頁', '公開首頁介紹筆記、練習及複習工具。切換上面三項可看公開模擬考試展示。', 1440, 700],
  setup: ['togoalai-demo-setup.webp', '設定考試', '設定考試主題、涵蓋範圍及題量，再交給 AI 生成題目。', 896, 504],
  question: ['togoalai-demo-question.webp', '作答介面', '作答時可看進度、選項及示例回饋。', 896, 504],
  result: ['togoalai-demo-result.webp', '結果與弱點', '總分、分項成績及弱項建議在同一畫面，讓使用者知道下一步應複習甚麼。', 896, 504],
};
const productChoices = document.querySelectorAll('[data-product-screen]');
const productZoom = $('togoal-zoom');
const productPicture = $('togoal-picture');
function zoomProduct(enlarged) {
  productZoom.setAttribute('aria-pressed', String(enlarged));
  productZoom.textContent = enlarged ? '縮回畫面 −' : '放大畫面 ＋';
  productPicture.dataset.enlarged = String(enlarged);
  productPicture.scrollLeft = 0;
}
productZoom.addEventListener('click', () => zoomProduct(productZoom.getAttribute('aria-pressed') !== 'true'));
productChoices.forEach(button => button.addEventListener('click', () => {
  const view = button.dataset.productScreen;
  const [name, title, description, width, height] = productScreens[view];
  productChoices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
  const path = `../../assets/${name}`;
  zoomProduct(false);
  const screenshot = productPicture.querySelector('img');
  screenshot.src = path;
  screenshot.alt = `ToGoalAi 正式站公開畫面。${description}`;
  screenshot.width = width;
  screenshot.height = height;
  $('product-screen-note').textContent = description;
}));

const productRoutes = {
  pdf: ['文字 PDF 或掃描件', 'unpdf 先取文字層。缺少有效文字時，交 Gemini 直接讀 PDF。'],
  office: ['DOCX 講義或 PPTX 投影片', 'Mammoth 取出 Word 文字。JSZip 解開 PPTX，按順序讀投影片 XML。'],
  web: ['教材或文章網址', 'Cheerio 從 HTML 取出正文，排除導覽及其他頁面元素。'],
  youtube: ['附字幕或逐字稿的 YouTube 影片', 'Supadata API 取逐字稿，按長度分段生成筆記，合併、去重並重編段落索引。'],
  audio: ['課堂錄音或筆記圖片', 'Gemini 多模態直接讀聲音或圖像，轉成結構化筆記段落。'],
};
const productRouteChoices = document.querySelectorAll('[data-product-route]');
const productRouteSteps = $('product-route-steps');
const productRouteText = productRouteSteps.querySelectorAll('dd');
productRouteChoices.forEach(button => button.addEventListener('click', () => {
  productRouteChoices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
  productRoutes[button.dataset.productRoute].forEach((step, index) => {
    productRouteText[index].textContent = step;
  });
}));
