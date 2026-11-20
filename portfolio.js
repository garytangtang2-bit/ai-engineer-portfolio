'use strict';
document.documentElement.classList.add('js');
const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isReduced = () => reduceMotion.matches;
let meetingStep=0,reviewed=false;
const confirmedMinutes = 'The next submission is scheduled for Thursday, 22 October 2026.';
const factRows=`<table class="facts"><thead><tr><th>等級</th><th>事實與來源</th><th>去向</th></tr></thead><tbody><tr><td><span class="confidence">A</span></td><td>西側圖則待顧問回覆<span class="quote">18:32「已經交咗，等緊顧問覆。」</span></td><td>進草稿</td></tr><tr><td><span class="confidence pending">B</span></td><td>下次提交日期未確認<span class="quote">19:06「下星期…四？再確認。」</span></td><td>回問</td></tr><tr><td><span class="confidence exclude">C</span></td><td>舊議程的完成日期<span class="quote">本次會議沒有支持原句</span></td><td>排除表</td></tr></tbody></table>`;
function meetingContent(step){
  if(step===0)return `<h4>先準備完整輸入</h4><p>影片提供本次討論，舊議程提供框架。兩者用途不同，不能把舊狀態直接當新事實。</p><div class="file-stack"><div class="file-card"><span class="file-type">MP4</span><div><strong>約 90 分鐘會議影片</strong><small>本機錄音、畫面與時間定位</small></div></div><div class="file-card"><span class="file-type">PDF</span><div><strong>上次議程與固定框架</strong><small>專案卡、人物卡、既有格式</small></div></div></div>`;
  if (step === 1) return `<h4>先轉錄，再核對</h4><p>Python 用 FFmpeg 整理錄音，再以 faster-whisper 等引擎本機轉錄。專案詞彙和已確認的校正可在下次沿用。</p>`;
  if(step===2)return `<h4>先確認事實，再寫英文紀錄</h4><p>每項附時間及原句。高信心事實進草稿；不確定項目回問，無依據項目留在排除紀錄。</p>${factRows}`;
  if (step === 3) return `<h4>確認有疑點的日期</h4><p>同事聽回 19:06 的原句並核對日程。已確認的答案連同來源寫回事實表。</p><a href="#meeting-demo">返回上方答疑示範 ↑</a>`;
  return `<h4>${reviewed ? '覆核完成，可交付' : '日期待確認，保留草稿'}</h4><ul class="delivery-list"><li>英文會議紀錄 · Word</li><li>下次議程 · Excel</li><li>來源與交稿檢查紀錄</li></ul>`;
}
function renderMeeting(step,focus=false){
  meetingStep=step;
  document.querySelectorAll('[data-step]').forEach((tab, index) => {
    tab.setAttribute('aria-selected', String(index === step));
    tab.tabIndex = index === step ? 0 : -1;
  });
  const panel = $('meeting-panel');
  panel.setAttribute('aria-labelledby', `meeting-tab-${step}`);
  panel.innerHTML = meetingContent(step);
  const delivery = $('meeting-state');
  delivery.textContent = reviewed ? '已覆核 · 可交付' : '待覆核 · 草稿';
  delivery.dataset.confirmed = String(reviewed);
  $('meeting-position').textContent = `0${step + 1} / 05`;
  const next = $('meeting-next');
  next.textContent = step === 4 ? '從頭查看 ↺' : step === 3 ? (reviewed ? '查看交付 →' : '查看待覆核草稿 →') : '下一步 →';
  if(focus)$(`meeting-tab-${step}`).focus();
}
document.querySelectorAll('[data-step]').forEach((tab,i)=>{tab.addEventListener('click',()=>renderMeeting(i));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%5;if(e.key==='ArrowLeft')next=(i+4)%5;if(e.key==='Home')next=0;if(e.key==='End')next=4;if(next!==undefined){e.preventDefault();renderMeeting(next,true);}});});
$('meeting-next').addEventListener('click', () => renderMeeting((meetingStep + 1) % 5));

const confirmReview = $('confirm-review');
confirmReview.addEventListener('click', () => {
  reviewed = !reviewed;
  const minutes = $('quick-minutes');
  minutes.textContent = reviewed ? confirmedMinutes : '草稿 · 日期待確認';
  if (reviewed) minutes.lang = 'en';
  else minutes.removeAttribute('lang');
  $('minutes-source').hidden = !reviewed;
  $('minutes-download').hidden = !reviewed;
  $('minutes-download').classList.toggle('primary', reviewed);
  $('meeting-output-trace').dataset.confirmed = String(reviewed);
  confirmReview.classList.toggle('primary', !reviewed);
  confirmReview.textContent = reviewed ? '重試答疑' : '採用同事回覆';
  renderMeeting(meetingStep);
  if (reviewed) $('meeting-output-trace').scrollIntoView({ block: 'nearest' });
});
$('minutes-download').addEventListener('click', () => {
  download('示例會議紀錄.txt', `虛構文字示例\n2026.10.12 會議\n\nWest-side drawings were submitted and are awaiting the consultant’s response.\n${confirmedMinutes}\n\n來源示例 18:32 / 19:06 · 同事已確認`);
});


function download(name, content) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// Synthetic examples of the source tools' human-feedback flow. No model or persistent write.
const feedbackExamples = [
  {before:'pile cab', correct:'pile cap', kind:'語音疑點', memory:'術語／音近校正', record:'"pile cab" → "pile cap"', later:'熱詞提示＋校正表', explanation:'答案先附來源存入事實庫；經人工確認併入通用詞庫後，供下一次轉錄提示及後處理使用。', source:'ask_pack.py → facts_db.py → 確認併入詞庫 → hotwords.py / apply_fixes'},
  {before:'字形 G12：讀作 8', correct:'3', kind:'PDF 字形疑點', memory:'同類字形記憶', record:'label: "3", confirmed: true', later:'同組更新＋字形字典', explanation:'確認字形標籤後，程式更新同組儲存格，保存字形記憶。之後遇到相符字形可再比對，表頭別名另存供同類文件使用。', source:'ai_tool.py glyphs / label → glyphs.json；learn_cad.py → 表頭別名'}
];
let feedbackMode=0;
const feedbackConfirmed=[false,false];
function renderFeedback(mode, focus=false){
  feedbackMode=mode;const example=feedbackExamples[mode],confirmed=feedbackConfirmed[mode];
  document.querySelectorAll('[data-feedback]').forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===mode));tab.tabIndex=i===mode?0:-1;});
  const panel=$('feedback-panel');panel.setAttribute('aria-labelledby',`feedback-tab-${mode}`);panel.dataset.confirmed=String(confirmed);
  panel.innerHTML=`<ol class="feedback-stages"><li><span class="feedback-number">01 / REVIEW</span><h5>${example.kind}</h5><p class="feedback-value">${example.before}</p><p>回到來源，由用戶確認正確讀法。</p></li><li><span class="feedback-number">02 / REMEMBER</span><h5>${example.memory}</h5><p class="feedback-value">${confirmed?example.record:'等待確認'}</p><p>${confirmed?'本頁示例：確認結果已加入流程狀態。':'未確認的猜測，先留在候選清單。'}</p></li><li><span class="feedback-number">03 / REUSE</span><h5>${example.later}</h5><p class="feedback-value">${confirmed?example.correct:'沿用前先確認'}</p><p>${confirmed?example.explanation:'按下方按鈕，看看確認後的記憶與再使用方式。'}</p></li></ol><div class="feedback-action"><button id="feedback-confirm" class="button ${confirmed?'':'primary'}">${confirmed?'重設這個示例 ↺':`模擬用戶確認「${example.correct}」 →`}</button><p id="feedback-status" role="status">${confirmed?'示例已確認・下次沿用的路徑已顯示':'示例尚未確認・按鈕只操作本頁示意'}</p></div><p class="feedback-source">${example.source}</p>`;
  $('feedback-confirm').addEventListener('click',()=>{feedbackConfirmed[mode]=!confirmed;renderFeedback(mode);$('feedback-confirm').focus({preventScroll:true});});
  if(focus)$(`feedback-tab-${mode}`).focus();
}
document.querySelectorAll('[data-feedback]').forEach((tab,i)=>{
  tab.addEventListener('click',()=>renderFeedback(i));
  tab.addEventListener('keydown',event=>{let next;if(['ArrowRight','ArrowLeft'].includes(event.key))next=1-i;else if(event.key==='Home')next=0;else if(event.key==='End')next=1;else return;event.preventDefault();renderFeedback(next,true);});
});

// Show the same first nine cells as the crop of the synthetic source PDF.
function showQuickCells(rows) {
  const grid = $('quick-cells');
  const marker = $('source-marker');
  const cells = [];
  rows.slice(0, 3).forEach((row, rowIndex) => {
    row.slice(0, 3).forEach((value, columnIndex) => {
      const cell = document.createElement('button');
      const address = `${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}`;
      const number = value.toFixed(2);
      cell.type = 'button';
      cell.textContent = number;
      cell.setAttribute('aria-label', `${address}，${number}`);
      cell.addEventListener('click', () => {
        cells.forEach(button => button.setAttribute('aria-pressed', String(button === cell)));
        marker.style.setProperty('--row', rowIndex);
        marker.style.setProperty('--column', columnIndex);
        $('cell-match').textContent = `${address} · 原 PDF 與 Excel 都是 ${number}`;
      });
      cells.push(cell);
    });
  });
  grid.replaceChildren(...cells);
  cells[0].click();
}

async function loadTable(){
  const response=await fetch('evidence/table-preview.json');if(!response.ok)throw Error('資料無法載入');
  const {pages}=await response.json();const sel=$('pdf-page');
  showQuickCells(pages[0].rows);
  pages.forEach((_,i)=>sel.add(new Option(String(i+1),String(i+1))));
  function render(){
    const p=pages[Number(sel.value)-1];
    $('pdf-source-img').src=`assets/pdf-page-${p.page}.webp`;$('pdf-source-img').alt=`原始合成 PDF 第 ${p.page} 頁，50列乘20欄數值表格`;$('pdf-source-caption').textContent=`原 PDF 第 ${p.page} 頁 · 對照相同頁的 Excel 輸出。`;
    $('actual-table').innerHTML=`<caption class="sr-only">第 ${p.page} 頁實際 Excel 輸出：50 列、20 欄</caption><thead><tr><th scope="col">列</th>${Array.from({length:20},(_,c)=>`<th scope="col">${String.fromCharCode(65+c)}</th>`).join('')}</tr></thead><tbody>${p.rows.map((row,r)=>`<tr><th scope="row">${r+1}</th>${row.map((val,c)=>`<td><button tabindex="${r===0&&c===0?'0':'-1'}" data-r="${r}" data-c="${c}" aria-label="第${p.page}頁 ${String.fromCharCode(65+c)}${r+1}，${val.toFixed(2)}">${val.toFixed(2)}</button></td>`).join('')}</tr>`).join('')}</tbody>`;
    $('cell-info').textContent=`第 ${p.page} 頁 · 50 列 × 20 欄。點選或用方向鍵查看儲存格。`;
    $('cell-location').textContent=`第 ${p.page} 頁・A1`;$('cell-value').textContent=p.rows[0][0].toFixed(2);
    $('excel-view').scrollTop=0;
  }
  sel.addEventListener('change', render);
  $('actual-table').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(!b)return;document.querySelectorAll('#actual-table button[tabindex="0"]').forEach(x=>x.tabIndex=-1);document.querySelectorAll('.selected-cell').forEach(x=>x.classList.remove('selected-cell'));b.tabIndex=0;b.classList.add('selected-cell');const location=`${String.fromCharCode(65+Number(b.dataset.c))}${Number(b.dataset.r)+1}`;$('cell-location').textContent=`第 ${Number(sel.value)} 頁・${location}`;$('cell-value').textContent=b.textContent;$('cell-info').textContent=`第 ${Number(sel.value)} 頁 · ${location} = ${b.textContent} · Excel 數值型儲存格`;});
  $('actual-table').addEventListener('keydown',e=>{const b=e.target.closest('button[data-r]');if(!b)return;let r=Number(b.dataset.r),c=Number(b.dataset.c);if(e.key==='ArrowRight')c++;else if(e.key==='ArrowLeft')c--;else if(e.key==='ArrowDown')r++;else if(e.key==='ArrowUp')r--;else return;e.preventDefault();const next=$('actual-table').querySelector(`button[data-r="${Math.max(0,Math.min(49,r))}"][data-c="${Math.max(0,Math.min(19,c))}"]`);next.click();next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});});
  return render;
}
async function loadReviewRule(){
  const response=await fetch('evidence/review-rule-audit.json');if(!response.ok)throw Error('Rule result unavailable');
  const audit=await response.json(),example=audit.cases.find(c=>c.id==='ambiguous-header');
  if(!example?.needs_review)throw Error('Unexpected review fixture');
  const button=$('review-rule-run');button.disabled=false;button.textContent='查看判斷與修正方式 →';
  button.addEventListener('click',()=>{
    const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));
    $('review-rule-output').hidden=!open;button.textContent=open?'收起覆核案例 ↑':'查看判斷與修正方式 →';
    $('review-rule-status').textContent=`原函數結果：待人覆核 · 保留讀值 ${example.text}`;
  });
}
function tableMode(source){$('source-view').hidden=!source;$('excel-view').hidden=source;$('show-source').setAttribute('aria-pressed',String(source));$('show-excel').setAttribute('aria-pressed',String(!source));$('show-source').classList.toggle('selected',source);$('show-excel').classList.toggle('selected',!source);$('cell-detail').hidden=source;$('table-zoom').hidden=source;}
$('show-source').addEventListener('click',()=>tableMode(true));$('show-excel').addEventListener('click',()=>tableMode(false));
$('table-zoom').addEventListener('click',()=>{const zoomed=$('table-zoom').getAttribute('aria-pressed')!=='true';$('table-zoom').setAttribute('aria-pressed',String(zoomed));$('excel-view').dataset.zoom=String(zoomed);$('table-zoom').textContent=zoomed?'一般數值 −':'放大數值 ＋';});

const pdfSkillSteps=[
  ['先認版面','Skill 先引導 AI 定位欄線、合併格與分頁邊界，建立資料之間的關係。','先分清欄位，才讀內容'],
  ['讀細字與上下文','按文件情況放大、使用 OCR 或字形比對，再將數字與正確的欄、列及跨頁記錄對齊。','細字、薄格與跨頁內容一起核對'],
  ['保留覆核線索','將結構化資料交給 Python 整理成 Excel；保留來源及警告，不確定的地方回到原圖讓人確認。','能確認的交付，有疑點的留待覆核']
];
function showPdfSkill(i){
  document.querySelectorAll('[data-pdf-skill]').forEach((b,n)=>{b.setAttribute('aria-selected',String(n===i));b.tabIndex=n===i?0:-1;});
  $('skill-document').dataset.stage=String(i);$('doc-callout').textContent=pdfSkillSteps[i][2];
  const panel=$('pdf-skill-panel');panel.setAttribute('aria-labelledby',`skill-tab-${i}`);panel.replaceChildren();
  const h=document.createElement('h4'),p=document.createElement('p');h.textContent=pdfSkillSteps[i][0];p.textContent=pdfSkillSteps[i][1];panel.append(h,p);
}
document.querySelectorAll('[data-pdf-skill]').forEach((b,i)=>{
  b.addEventListener('click',()=>showPdfSkill(i));
  b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%3;else if(e.key==='ArrowLeft')n=(i+2)%3;else if(e.key==='Home')n=0;else if(e.key==='End')n=2;else return;e.preventDefault();showPdfSkill(n);document.querySelector(`[data-pdf-skill="${n}"]`).focus();});
});
async function loadUploadPreflight() {
  const files = $('batch-files');
  const modes = $('upload-states').querySelectorAll('[data-batch]');
  const labels = {
    ready: '可處理', blocked: '缺少封面', prepared: '跳過 · 已準備',
    changed: '重新排程 · 素材已替換', empty: '跳過 · 空檔',
  };

  try {
    const response = await fetch('evidence/upload-preflight.json');
    if (!response.ok) throw new Error('Preflight evidence unavailable');
    const { initial, replay } = await response.json();
    const snapshots = { initial, replay };

    function showBatch(mode) {
      const rows = snapshots[mode];
      modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.batch === mode)));
      files.replaceChildren(...rows.map(({ file, state }) => {
        const row = document.createElement('div');
        const name = document.createElement('dt');
        const status = document.createElement('dd');
        row.dataset.state = state;
        name.textContent = file;
        status.textContent = labels[state];
        row.append(name, status);
        return row;
      }));
      const queued = rows.filter(row => ['ready', 'changed'].includes(row.state)).length;
      $('batch-result').textContent = `${queued} 個排入佇列 · ${rows.length - queued} 個需修正或略過`;
    }

    modes.forEach(button => {
      button.addEventListener('click', () => showBatch(button.dataset.batch));
      button.disabled = false;
    });
    showBatch('initial');
  } catch {
    $('batch-result').textContent = '未能載入預檢結果。';
  }
}
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
  const path = `assets/${name}`;
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

// Synthetic timeline with the editor's line, chunk and spoken-word time fields.
const reelDemo = {
  duration: 8,
  lines: [
    { tag: 'align', label: '對齊錄音', start: 0, end: 2.6, say: [['錄', .74]], chunks: [
      { start: 0, end: 1.35, text: '先把錄音對齊劇本' }, { start: 1.35, end: 2.6, text: '保留字頭與字尾' },
    ] },
    { tag: 'captions', label: '字幕與動畫', start: 2.6, end: 5.4, say: [['同', 4.12]], chunks: [
      { start: 2.6, end: 3.8, text: '載入字幕和畫面標籤' }, { start: 3.8, end: 5.4, text: '同一個時間軸同步合成' },
    ] },
    { tag: 'check', label: '輸出質檢', start: 5.4, end: 8, say: [['核', 6.16]], chunks: [
      { start: 5.4, end: 6.75, text: '量度音量並核對規格' }, { start: 6.75, end: 8, text: '再按劇本檢查漏字' },
    ] },
  ],
};
const reelSlider = $('reel-position');
const reelPlayer = $('reel-play');
const reelVisual = $('reel-visual');
const reelJumps = document.querySelectorAll('[data-reel-jump]');
let reelFrame = 0;
let activeReelChunk;

function renderReel(time) {
  const atEnd = time === reelDemo.duration;
  const scene = atEnd ? reelDemo.lines.at(-1) : reelDemo.lines.find(line => time >= line.start && time < line.end);
  const caption = atEnd ? scene.chunks.at(-1) : scene.chunks.find(chunk => time >= chunk.start && time < chunk.end);
  const cue = scene.say[0][1];
  const cueFired = time >= cue;
  const formatted = time.toFixed(2);

  reelSlider.value = time;
  reelSlider.setAttribute('aria-valuetext', `${formatted} 秒`);
  $('reel-time').textContent = `${formatted} / ${reelDemo.duration.toFixed(2)} s`;
  reelVisual.dataset.scene = scene.tag;
  reelVisual.dataset.cued = String(cueFired);
  const graphicProgress = cueFired ? Math.min(1, (time - cue) * 3.8) : 0;
  reelVisual.style.setProperty('--cue-amount', isReduced() && cueFired ? 1 : graphicProgress);
  $('reel-cue').textContent = `${cue.toFixed(2)} s · ${cueFired ? '已觸發' : '等待'}`;

  if (caption !== activeReelChunk) {
    activeReelChunk = caption;
    $('reel-scene-label').textContent = scene.label;
    $('reel-caption').textContent = caption.text;
    $('reel-caption-time').textContent = `${caption.start.toFixed(2)}–${caption.end.toFixed(2)} s`;
    reelJumps.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.reelJump) === scene.start)));
  }
}

function pauseReel() {
  cancelAnimationFrame(reelFrame);
  reelFrame = 0;
  reelPlayer.textContent = Number(reelSlider.value) === reelDemo.duration ? '重播 ↻' : '播放 ▶';
}

reelPlayer.addEventListener('click', () => {
  if (reelFrame) {
    pauseReel();
    return;
  }
  const position = Number(reelSlider.value);
  const startedAt = performance.now() - (position === reelDemo.duration ? 0 : position * 1000);
  reelPlayer.textContent = '暫停 Ⅱ';
  function tick(now) {
    const time = Math.min(reelDemo.duration, Math.max(0, (now - startedAt) / 1000));
    renderReel(time);
    if (time === reelDemo.duration) pauseReel();
    else reelFrame = requestAnimationFrame(tick);
  }
  reelFrame = requestAnimationFrame(tick);
});

function seekReel(time) {
  renderReel(time);
  pauseReel();
}
reelSlider.addEventListener('input', () => seekReel(Number(reelSlider.value)));
reelJumps.forEach(button => button.addEventListener('click', () => seekReel(Number(button.dataset.reelJump))));
const reelVisibility = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting && reelFrame) pauseReel(); });
reelVisibility.observe($('reel-lab'));
document.addEventListener('visibilitychange', () => { if (document.hidden && reelFrame) pauseReel(); });


// Load comparison data on the first visit to the PDF demo, and build the large grid only on demand.
const fullPdf = $('pdf-full-view');
let pdfTable;
let fullPdfReady = false;
function preparePdf() {
  pdfTable ??= loadTable().catch(() => {
    $('cell-match').textContent = '預覽暫未載入，可下載 Excel 及原 PDF。';
    $('cell-info').textContent = '預覽暫未載入。';
    pdfTable = undefined;
  });
  return pdfTable;
}
fullPdf.addEventListener('toggle', async () => {
  if (!fullPdf.open || fullPdfReady) return;
  const render = await preparePdf();
  if (!fullPdf.open || fullPdfReady || !render) return;
  fullPdfReady = true;
  render();
  loadReviewRule().catch(() => {
    $('review-rule-run').textContent = '結果暫未載入，請查看下方測試紀錄';
  });
});

const videoCase = $('video');
let uploadPreflightReady = false;
videoCase.addEventListener('toggle', () => {
  if (videoCase.open && !uploadPreflightReady) {
    uploadPreflightReady = true;
    renderReel(Number(reelSlider.value));
    loadUploadPreflight();
  }
  if (!videoCase.open && reelFrame) pauseReel();
});

const caseDialog = $('case-dialog');
const imageDialog = $('image-dialog');
const demoStyle = $('demo-style');
const primaryCases = [...caseDialog.querySelectorAll('[data-case-title]')];
let meetingReady = false;
let caseTrigger;
let imageTrigger;

function closeOnBackdrop(dialog) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
}

function loadDemoStyle() {
  demoStyle.media = 'all';
}
document.addEventListener('toggle', event => {
  if (event.target instanceof HTMLDetailsElement && event.target.open) loadDemoStyle();
}, true);

document.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => {
  loadDemoStyle();
  imageTrigger = button;
  $('image-dialog-title').textContent = button.dataset.title;
  $('dialog-image').src = button.dataset.zoom;
  $('dialog-image').alt = button.dataset.title;
  imageDialog.showModal();
  $('close-dialog').focus({ preventScroll: true });
  updateModelActivity();
}));
$('close-dialog').addEventListener('click', () => imageDialog.close());
imageDialog.addEventListener('close', () => {
  imageTrigger?.focus({ preventScroll: true });
  updateModelActivity();
});
closeOnBackdrop(imageDialog);
closeOnBackdrop(caseDialog);

const legacyAnchors = {
  'case-view': 'work',
  'els-frame': 'els-editor-link',
  'els-inline': 'site-tour',
  'els-inline-close': 'site-tour',
  'els-inline-open': 'site-model-open',
  'els-load-state': 'site-tour-status',
  'els-rotate': 'site-model-open',
  'hero-stars': 'site-tour',
  'hero-model': 'site-tour-viewport',
  'hero-model-preview': 'full-site-preview',
  'hero-model-open': 'site-model-open',
  'hero-model-spin': 'site-view-3d',
  'hero-model-status': 'site-tour-status',
  jobs: 'other-work',
  'jobs-architecture': 'other-work',
  recovery: 'other-work',
  'recovery-architecture': 'other-work',
  'site-tour-close': 'site-tour',
  'site-tour-frame': 'site-tour-viewport',
};
function hashTarget(hash) {
  try {
    const id = decodeURIComponent(hash.slice(1));
    return $(legacyAnchors[id] ?? id);
  } catch {
    return null;
  }
}
function revealDetails(target) {
  for (let detail = target.closest('details'); detail; detail = detail.parentElement.closest('details')) {
    detail.open = true;
  }
}
function showCase(project, target, trigger) {
  loadDemoStyle();
  const changing = project.hidden || !caseDialog.open;
  primaryCases.forEach(item => { item.hidden = item !== project; });
  $('case-title').textContent = project.dataset.caseTitle;
  if (project.id === 'pdf') preparePdf();
  if (project.id === 'meeting' && !meetingReady) {
    meetingReady = true;
    renderMeeting(0);
    renderFeedback(0);
  }
  revealDetails(target);
  if (!caseDialog.open) {
    caseTrigger = trigger ?? document.querySelector('[data-case-open][href="#' + project.id + '"]');
    caseDialog.showModal();
    $('case-close').focus({ preventScroll: true });
    updateModelActivity();
  }
  if (changing) caseDialog.scrollTop = 0;
  if (target !== project) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
}
function followHash() {
  const target = hashTarget(location.hash);
  const project = target?.closest('[data-case-title]');
  if (project) {
    showCase(project, target);
    return;
  }
  if (caseDialog.open) caseDialog.close();
  if (target && !target.closest('dialog')) {
    const needsReveal = target.closest('details:not([open])') || legacyAnchors[location.hash.slice(1)];
    revealDetails(target);
    if (needsReveal) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
}
function followCaseClick(event) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const target = hashTarget(link.hash);
  const project = target?.closest('[data-case-title]');
  if (!project) return;
  event.preventDefault();
  if (!caseDialog.open) history.pushState({ portfolioCase: true }, '', link.hash);
  else history.replaceState(history.state, '', link.hash);
  showCase(project, target, link);
  if (target !== project && target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
}
$('case-close').addEventListener('click', () => caseDialog.close());
caseDialog.addEventListener('close', () => {
  if (caseDialog.open) return;
  caseTrigger?.focus({ preventScroll: true });
  if (hashTarget(location.hash)?.closest('[data-case-title]')) {
    if (history.state?.portfolioCase) history.back();
    else {
      history.replaceState(null, '', '#work');
      caseTrigger?.scrollIntoView({ block: 'nearest' });
    }
  }
  updateModelActivity();
});
addEventListener('hashchange', followHash);
document.addEventListener('click', followCaseClick);

// The full bid model is loaded only when the visitor opens the exhibit.
const siteModel = $('site-tour-viewport');
const siteOpen = $('site-model-open');
const tourSection = $('site-tour-section');
const tourCut = $('site-tour-cut');
const tourStatus = $('site-tour-status');
const tour3d = $('site-view-3d');
const tourPlan = $('site-view-plan');
const tourViewButtons = [...document.querySelectorAll('[data-tour-view]')];
const tourDescriptions = {
  iso: '斜視可同時看到開挖分區、斜道和支護配置。',
  plan: '俯視可沿斜道查看各施工區怎樣接通。',
  front: '側視可比較各施工區標高。',
};
const smallScreen = matchMedia('(max-width: 759px), (pointer: coarse)');
const modelFrame = document.createElement('iframe');
modelFrame.id = 'site-tour-frame';
modelFrame.title = '可操作的 ELS 地盤模型';
modelFrame.tabIndex = -1;
let modelLoading = false;
let modelEngine;

let tourView = 'iso';
let inPlan = false;
let sectionIsOpen = false;

let siteVisible = false;
let failedSite = false;

function updateModelActivity() {
  modelEngine?.setPaused(!siteVisible || inPlan || document.hidden || caseDialog.open || imageDialog.open);
}
function showTourState() {
  tour3d.setAttribute('aria-pressed', String(!inPlan));
  tourPlan.setAttribute('aria-pressed', String(inPlan));
  tourSection.setAttribute('aria-pressed', String(!inPlan && sectionIsOpen));
  $('full-site-preview').hidden = inPlan;
  $('plan-preview').hidden = !inPlan;
  $('full-site-image').hidden = !inPlan;
  $('site-tour-cut-control').hidden = inPlan || !sectionIsOpen;
  tourViewButtons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.tourView === tourView));
    button.disabled = inPlan;
  });
  if (inPlan) tourStatus.textContent = '同一地盤的 2D 圖則。可放大查看分區及施工路線。';
  else if (failedSite) tourStatus.textContent = '3D 暫未載入。可重試、查看圖則或開啟編輯器。';
  else if (modelLoading) tourStatus.textContent = '正在載入 3D 模型…';
  else if (!modelEngine) tourStatus.textContent = '開啟 3D 模型後可拖動，亦可切換角度或查看剖面。';
  else if (sectionIsOpen) tourStatus.textContent = '移動剖切線，比較不同位置的開挖與支護。';
  else tourStatus.textContent = tourDescriptions[tourView];
}
function syncModel() {
  if (!modelEngine) return;
  modelEngine.setRotate(false);
  modelEngine.setView(tourView, true);
  modelEngine.setSection(sectionIsOpen, Number(tourCut.value) / 100);
  modelEngine.draw();
  updateModelActivity();
}
function waitForModel(started) {
  const renderer = modelFrame.contentDocument?.getElementById('view')?.contentWindow;
  if (renderer?.__ready && renderer.__portfolioPreview) {
    modelEngine = renderer.__portfolioPreview;
    modelLoading = false;
    const moveFocus = document.activeElement === siteOpen && !inPlan;
    siteOpen.hidden = true;
    siteOpen.removeAttribute('aria-disabled');
    if (!inPlan) siteModel.dataset.ready = '';
    modelFrame.tabIndex = 0;
    modelFrame.removeAttribute('aria-hidden');
    syncModel();
    showTourState();
    if (moveFocus) renderer.document.querySelector('canvas')?.focus({ preventScroll: true });
    return;
  }
  if (performance.now() - started < 25000) {
    setTimeout(() => waitForModel(started), 140);
    return;
  }
  failedSite = true;
  modelLoading = false;
  modelFrame.remove();
  siteOpen.removeAttribute('aria-disabled');
  siteOpen.querySelector('span').textContent = '重試 3D 模型';
  showTourState();
}
function showTour3d() {
  inPlan = false;
  modelFrame.hidden = false;
  siteOpen.hidden = Boolean(modelEngine);
  if (modelEngine) {
    siteModel.dataset.ready = '';
    syncModel();
  } else if (!modelLoading) {
    failedSite = false;
    modelLoading = true;
    siteOpen.setAttribute('aria-disabled', 'true');
    siteOpen.querySelector('span').textContent = '載入中…';
    modelFrame.setAttribute('aria-hidden', 'true');
    modelFrame.src = 'tools/els.html?preview=1&scene=portfolio' + (smallScreen.matches ? '&quality=low' : '');
    siteModel.append(modelFrame);
    waitForModel(performance.now());
  }
  showTourState();
}
siteOpen.addEventListener('click', showTour3d);
tour3d.addEventListener('click', showTour3d);
tourPlan.addEventListener('click', () => {
  inPlan = true;
  modelFrame.hidden = true;
  delete siteModel.dataset.ready;
  siteOpen.hidden = true;
  showTourState();
  updateModelActivity();
});
tourViewButtons.forEach(button => button.addEventListener('click', () => {
  tourView = button.dataset.tourView;
  if (!modelEngine || inPlan) showTour3d();
  else {
    modelEngine.setView(tourView, isReduced());
    showTourState();
  }
}));
tourSection.addEventListener('click', () => {
  sectionIsOpen = !sectionIsOpen;
  showTour3d();
});
tourCut.addEventListener('input', () => modelEngine?.setSection(sectionIsOpen, Number(tourCut.value) / 100));
new IntersectionObserver(([entry]) => {
  siteVisible = entry.isIntersecting;
  updateModelActivity();
}).observe(siteModel);
document.addEventListener('visibilitychange', updateModelActivity);

// A real file opts the introduction into playback. The portrait is the default.
const introMedia = $('intro-media');
if (introMedia.dataset.videoSrc) {
  const video = document.createElement('video');
  video.controls = true;
  video.playsInline = true;
  video.preload = 'none';
  video.poster = introMedia.querySelector('img').src;
  video.src = introMedia.dataset.videoSrc;
  video.setAttribute('aria-label', 'Gary Tang 的 AutoCut 自我介紹');
  if (introMedia.dataset.captionSrc) {
    const track = document.createElement('track');
    Object.assign(track, { kind: 'captions', srclang: 'zh-Hant', label: '繁體中文', src: introMedia.dataset.captionSrc, default: true });
    video.append(track);
  }
  video.addEventListener('error', () => {
    video.remove();
    introMedia.querySelector('img').hidden = false;
    $('intro-film-label').textContent = '自介短片暫未能播放';
  }, { once: true });
  introMedia.querySelector('img').hidden = true;
  introMedia.append(video);
  $('intro-film-label').textContent = '以 AutoCut 製作的自介短片';
  $('intro-film-label').nextElementSibling.textContent = '由腳本、對稿、字幕到剪接，這段自介使用我的 AutoCut Skills 製作。';
}

// Final values remain part of the HTML for quick reading and reduced motion.
if (!isReduced()) {
  const entrances = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('entered');
    entrances.unobserve(entry.target);
  }), { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(element => entrances.observe(element));
  document.querySelectorAll('[data-count]').forEach(figure => {
    const label = document.createElement('span');
    label.className = 'metric-static';
    label.textContent = figure.textContent;
    const wheel = document.createElement('span');
    wheel.className = 'metric-wheel';
    for (const portion of [0, .32, .62, .85, 1]) {
      const number = document.createElement('span');
      number.textContent = Math.round(Number(figure.dataset.count) * portion);
      wheel.append(number);
    }
    figure.replaceChildren(label, wheel);
    entrances.observe(figure);
  });
}
const precisePointer = matchMedia('(hover: hover) and (pointer: fine)');
document.querySelectorAll('.archive-card').forEach(card => {
  card.addEventListener('pointermove', event => {
    if (isReduced() || !precisePointer.matches || card.open) return;
    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    card.style.setProperty('--tilt-x', (-y * 5) + 'deg');
    card.style.setProperty('--tilt-y', (x * 5) + 'deg');
    card.style.setProperty('--light-x', (50 + x * 100) + '%');
    card.style.setProperty('--light-y', (50 + y * 100) + '%');
  });
});

followHash();
