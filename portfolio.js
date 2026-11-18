'use strict';
document.documentElement.classList.add('js');
const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isReduced=()=>reduceMotion.matches||document.documentElement.dataset.motion==='off';
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('seen'); revealObserver.unobserve(entry.target); }
}), {threshold:.06});
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
const nav = $('navigation');
const navSections = [...nav.querySelectorAll('a[href^="#"]')].map(link => ({ link, section: $(link.hash.slice(1)) }));
let activeNavLink;
let scheduled = false;
function updateScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  const current = navSections.filter(({ section }) => section.getBoundingClientRect().top <= 100).at(-1)?.link;
  if (current !== activeNavLink) {
    activeNavLink?.removeAttribute('aria-current');
    current?.setAttribute('aria-current', 'location');
    activeNavLink = current;
  }
  document.documentElement.style.setProperty('--scroll', max > 0 ? Math.min(1,scrollY/max) : 0);
  scheduled = false;
}
addEventListener('scroll', () => {if (!scheduled) {scheduled = true;requestAnimationFrame(updateScroll);}}, {passive:true});
addEventListener('resize',updateScroll);updateScroll();
const menu = document.querySelector('.menu-button');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='目錄 ＋';}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'關閉 ×':'目錄 ＋';nav.classList.toggle('open',open);});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));

function openArchitecture(hash) {
  const section = $(hash.slice(1));
  if (section instanceof HTMLDetailsElement && section.classList.contains('engineering-detail')) {
    section.open = true;
  }
}
document.querySelectorAll('.case-jump').forEach(link => {
  link.addEventListener('click', () => openArchitecture(link.hash));
});
addEventListener('hashchange', () => openArchitecture(location.hash));
openArchitecture(location.hash);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.navbar'))closeMenu();});
const caseObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;document.querySelectorAll('.work-index a').forEach(link=>{if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}),{rootMargin:'-15% 0px -60% 0px'});
document.querySelectorAll('.case').forEach(el=>caseObserver.observe(el));

let meetingStep=0,reviewed=false;
const factRows=`<table class="facts"><thead><tr><th>等級</th><th>事實與來源</th><th>去向</th></tr></thead><tbody><tr><td><span class="confidence">A</span></td><td>西側圖則待顧問回覆<span class="quote">18:32「已經交咗，等緊顧問覆。」</span></td><td>進草稿</td></tr><tr><td><span class="confidence pending">B</span></td><td>下次提交日期未確認<span class="quote">19:06「下星期…四？再確認。」</span></td><td>回問</td></tr><tr><td><span class="confidence exclude">C</span></td><td>舊議程的完成日期<span class="quote">本次會議沒有支持原句</span></td><td>排除表</td></tr></tbody></table>`;
function meetingContent(step){
  if(step===0)return `<h4>先準備完整輸入</h4><p>影片提供本次討論，舊議程提供框架。兩者用途不同，不能把舊狀態直接當新事實。</p><div class="file-stack"><div class="file-card"><span class="file-type">MP4</span><div><strong>約 90 分鐘會議影片</strong><small>本機錄音、畫面與時間定位</small></div></div><div class="file-card"><span class="file-type">PDF</span><div><strong>上次議程與固定框架</strong><small>專案卡、人物卡、既有格式</small></div></div></div>`;
  if(step===1)return `<h4>六引擎轉錄，程式先整理</h4><p>FFmpeg 先整理音訊；faster-whisper 與 Transformers 依序轉錄。議程、畫面及已確認校正組成熱詞，按各模型的上下文限制載入。</p><div class="asr-engines">${['qwen17','hf_jacky_turbo','w_large_v3','hf_buzz','glm_nano','w_large_v2'].map(x=>`<span>${x}</span>`).join('')}</div><p class="asr-note">多個引擎有共同技術來源，仍需來源核對及人手處理疑點。</p>`;
  if(step===2)return `<h4>先確認事實，再寫英文紀錄</h4><p>每項附時間及原句。高信心事實進草稿；不確定項目回問，無依據項目留在排除紀錄。</p>${factRows}`;
  if(step===3)return `<h4>人只回答真正的疑點</h4><p>正式工具以 FFmpeg 切出相關音段，提問前先鎖定 AI 答案。用戶答覆另存入有來源、日期及適用範圍的知識庫。</p><div class="review-question"><p><strong>示例疑點：下次提交日期？</strong></p><span class="quote">19:06 · 相關音段約 26 秒（此導覽不提供公司錄音）</span><p>覆核者已確認：星期四。</p><button class="button small ${reviewed?'':'primary'}" id="confirm-review" ${reviewed?'disabled':''}>${reviewed?'已記錄覆核答案 ✓':'記錄這項覆核答案 →'}</button></div><p class="review-status">${reviewed?'答案已記錄，可前往交付。':'尚未覆核：交付維持草稿。'}</p>`;
  return `<h4>${reviewed?'覆核完成，才交付。':'疑點未答，先保留草稿。'}</h4><p>${reviewed?'原流程會更新來源核對及交稿檢查，再產生以下交付。這裏可下載虛構文字示例。':'你可返回「答疑」記錄覆核答案，看看交付狀態怎樣改變。'}</p><ul class="delivery-list ${reviewed?'':'locked'}"><li>英文會議紀錄 · TXT / Word</li><li>下一次議程 · Excel</li><li>來源、排除表與檢查紀錄</li><li>learn_cycle → 刪除／補充／聽錯候選 → 詞庫與規則</li></ul><div style="margin-top:1.2rem">${reviewed?'<button class="button small primary" id="minutes-download">下載虛構紀錄 TXT ↓</button>':'<button class="button small" id="back-review">前往答疑 →</button>'}</div>`;
}
function renderMeeting(step,focus=false){
  meetingStep=step;
  document.querySelectorAll('[data-step]').forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===step));tab.tabIndex=i===step?0:-1;});
  const panel=$('meeting-panel');panel.setAttribute('aria-labelledby',`meeting-tab-${step}`);panel.innerHTML=meetingContent(step);
  if(!isReduced())panel.animate([{opacity:.35,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:250,easing:'ease-out'});
  $('meeting-position').textContent=`0${step+1} / 05`;
  $('meeting-next').textContent=step===4?'從頭查看 ↺':'下一步 →';
  $('confirm-review')?.addEventListener('click',()=>{reviewed=true;renderMeeting(3);$('meeting-next').focus();});
  $('back-review')?.addEventListener('click',()=>renderMeeting(3,true));
  $('minutes-download')?.addEventListener('click',()=>download('示例會議紀錄.txt','公開互動導覽 · 虛構文字\n\nWest-side drawings were submitted and are awaiting the consultant’s response.\nThe next submission is scheduled for Thursday (human confirmation recorded).\n\n來源示例：18:32 / 19:06\n此檔案是流程導覽資料，並非公司原會議紀錄。'));
  if(focus)$(`meeting-tab-${step}`).focus();
}
document.querySelectorAll('[data-step]').forEach((tab,i)=>{tab.addEventListener('click',()=>renderMeeting(i));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%5;if(e.key==='ArrowLeft')next=(i+4)%5;if(e.key==='Home')next=0;if(e.key==='End')next=4;if(next!==undefined){e.preventDefault();renderMeeting(next,true);}});});
$('meeting-next').addEventListener('click',()=>renderMeeting((meetingStep+1)%5));renderMeeting(0);
function download(name,content){const u=URL.createObjectURL(new Blob(['\uFEFF',content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);}


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
  if(!isReduced())panel.animate([{opacity:.45,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
  if(focus)$(`feedback-tab-${mode}`).focus();
}
document.querySelectorAll('[data-feedback]').forEach((tab,i)=>{
  tab.addEventListener('click',()=>renderFeedback(i));
  tab.addEventListener('keydown',event=>{let next;if(['ArrowRight','ArrowLeft'].includes(event.key))next=1-i;else if(event.key==='Home')next=0;else if(event.key==='End')next=1;else return;event.preventDefault();renderFeedback(next,true);});
});
renderFeedback(0);

async function loadTable(){
  const response=await fetch('evidence/table-preview.json');if(!response.ok)throw Error('資料無法載入');
  const {pages}=await response.json();const sel=$('pdf-page');
  pages.forEach((_,i)=>sel.add(new Option(String(i+1),String(i+1))));
  function render(){
    const p=pages[Number(sel.value)-1];
    $('pdf-source-img').src=`assets/pdf-page-${p.page}.webp`;$('pdf-source-img').alt=`原始合成 PDF 第 ${p.page} 頁，50列乘20欄數值表格`;$('pdf-source-caption').textContent=`原 PDF 第 ${p.page} 頁 · 對照相同頁的 Excel 輸出。`;
    $('actual-table').innerHTML=`<caption class="sr-only">第 ${p.page} 頁實際 Excel 輸出：50 列、20 欄</caption><thead><tr><th scope="col">列</th>${Array.from({length:20},(_,c)=>`<th scope="col">${String.fromCharCode(65+c)}</th>`).join('')}</tr></thead><tbody>${p.rows.map((row,r)=>`<tr><th scope="row">${r+1}</th>${row.map((val,c)=>`<td><button tabindex="${r===0&&c===0?'0':'-1'}" data-r="${r}" data-c="${c}" aria-label="第${p.page}頁 ${String.fromCharCode(65+c)}${r+1}，${val.toFixed(2)}">${val.toFixed(2)}</button></td>`).join('')}</tr>`).join('')}</tbody>`;
    $('cell-info').textContent=`第 ${p.page} 頁 · 50 列 × 20 欄。點選或用方向鍵查看儲存格。`;
    $('cell-location').textContent=`第 ${p.page} 頁・A1`;$('cell-value').textContent=p.rows[0][0].toFixed(2);
    $('excel-view').scrollTop=0;
  }
  sel.addEventListener('change',render);render();
  $('actual-table').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(!b)return;document.querySelectorAll('#actual-table button[tabindex="0"]').forEach(x=>x.tabIndex=-1);document.querySelectorAll('.selected-cell').forEach(x=>x.classList.remove('selected-cell'));b.tabIndex=0;b.classList.add('selected-cell');const location=`${String.fromCharCode(65+Number(b.dataset.c))}${Number(b.dataset.r)+1}`;$('cell-location').textContent=`第 ${Number(sel.value)} 頁・${location}`;$('cell-value').textContent=b.textContent;$('cell-info').textContent=`第 ${Number(sel.value)} 頁 · ${location} = ${b.textContent} · Excel 數值型儲存格`;});
  $('actual-table').addEventListener('keydown',e=>{const b=e.target.closest('button[data-r]');if(!b)return;let r=Number(b.dataset.r),c=Number(b.dataset.c);if(e.key==='ArrowRight')c++;else if(e.key==='ArrowLeft')c--;else if(e.key==='ArrowDown')r++;else if(e.key==='ArrowUp')r--;else return;e.preventDefault();const next=$('actual-table').querySelector(`button[data-r="${Math.max(0,Math.min(49,r))}"][data-c="${Math.max(0,Math.min(19,c))}"]`);next.click();next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});});
}
loadTable().catch(()=>{$('cell-info').textContent='預覽暫時無法載入；你仍可直接下載下方完整 Excel 與 PDF。';});
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
loadReviewRule().catch(()=>{$('review-rule-run').textContent='結果暫未載入，請查看下方測試紀錄';});
function tableMode(source){$('source-view').hidden=!source;$('excel-view').hidden=source;$('show-source').setAttribute('aria-pressed',String(source));$('show-excel').setAttribute('aria-pressed',String(!source));$('show-source').classList.toggle('selected',source);$('show-excel').classList.toggle('selected',!source);$('cell-detail').hidden=source;$('table-zoom').hidden=source;}
$('show-source').addEventListener('click',()=>tableMode(true));$('show-excel').addEventListener('click',()=>tableMode(false));
$('table-zoom').addEventListener('click',()=>{const zoomed=$('table-zoom').getAttribute('aria-pressed')!=='true';$('table-zoom').setAttribute('aria-pressed',String(zoomed));$('excel-view').dataset.zoom=String(zoomed);$('table-zoom').textContent=zoomed?'一般數值 −':'放大數值 ＋';});

const pdfSkillSteps=[
  ['先認版面，避免讀錯欄。','Skill 先引導 AI 定位欄線、合併格與分頁邊界，建立資料之間的關係。','先分清欄位，才讀內容'],
  ['讀細字，也要保留上下文。','按文件情況放大、使用 OCR 或字形比對，再將數字與正確的欄、列及跨頁記錄對齊。','細字、薄格與跨頁內容一起核對'],
  ['輸出資料，同時留下覆核線索。','將結構化資料交給 Python 整理成 Excel；保留來源及警告，不確定的地方回到原圖讓人確認。','能確認的交付，有疑點的留待覆核']
];
function showPdfSkill(i){
  document.querySelectorAll('[data-pdf-skill]').forEach((b,n)=>{b.setAttribute('aria-selected',String(n===i));b.tabIndex=n===i?0:-1;});
  $('skill-document').dataset.stage=String(i);$('doc-callout').textContent=pdfSkillSteps[i][2];
  const panel=$('pdf-skill-panel');panel.setAttribute('aria-labelledby',`skill-tab-${i}`);panel.replaceChildren();
  const h=document.createElement('h4'),p=document.createElement('p');h.textContent=pdfSkillSteps[i][0];p.textContent=pdfSkillSteps[i][1];panel.append(h,p);
  if(!isReduced())panel.animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:220});
}
document.querySelectorAll('[data-pdf-skill]').forEach((b,i)=>{
  b.addEventListener('click',()=>showPdfSkill(i));
  b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%3;else if(e.key==='ArrowLeft')n=(i+2)%3;else if(e.key==='Home')n=0;else if(e.key==='End')n=2;else return;e.preventDefault();showPdfSkill(n);document.querySelector(`[data-pdf-skill="${n}"]`).focus();});
});
document.querySelectorAll('[id^="site-view-"]').forEach(b=>b.addEventListener('click',()=>{
  const plan=b.id==='site-view-plan',img=$('full-site-preview'),zoom=$('full-site-image');
  const src=plan?'assets/els-full-plan.webp':'assets/els-full-site.webp';img.src=src;zoom.dataset.zoom=src;
  const title=plan?'完整地盤 2D 圖則 · 全新虛構示例':'完整地盤 3D 模型 · 全新虛構示例';
  img.alt=title;zoom.dataset.title=title;zoom.setAttribute('aria-label','放大'+title);
  $('site-view-plan').setAttribute('aria-pressed',String(plan));$('site-view-3d').setAttribute('aria-pressed',String(!plan));
  $('site-view-plan').classList.toggle('selected',plan);$('site-view-3d').classList.toggle('selected',!plan);
}));
async function loadUploadPreflight() {
  const trigger = $('upload-inspect');
  const result = $('upload-states');
  const files = $('batch-files');
  const modes = result.querySelectorAll('[data-batch]');
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
      if (!isReduced()) files.animate([{ opacity: .6 }, { opacity: 1 }], { duration: 180 });
    }

    modes.forEach(button => button.addEventListener('click', () => showBatch(button.dataset.batch)));
    trigger.addEventListener('click', () => {
      result.hidden = !result.hidden;
      trigger.setAttribute('aria-expanded', String(!result.hidden));
      trigger.textContent = result.hidden ? '查看預檢結果 ↓' : '收起預檢結果 ↑';
    });
    showBatch('initial');
    trigger.disabled = false;
    trigger.textContent = '查看預檢結果 ↓';
  } catch {
    trigger.textContent = '未能載入預檢結果';
  }
}
loadUploadPreflight();
const videoSteps=[
  ['先定內容，再定分鏡','劇本 Skill 將主題拆成段落與鏡頭；核心指令保持精簡，所需規格與元件參考按步驟讀取。劇本標籤再控制字幕、畫面及 Remotion 動畫。'],
  ['Python × FFmpeg × Remotion','faster-whisper 對齊劇本；NumPy 以人聲響度辨識停頓，Python 呼叫 FFmpeg 剪接。OpenCV / rembg 處理人像，再由 React / Remotion 組合字幕與動畫。'],
  ['量度聲音，也檢查畫面','FFmpeg 完成人聲 EQ、降噪與壓縮，master.py 統一響度並限制真峰值；ffprobe 檢查輸出規格，audit.py 重新轉錄核對內容，再檢查構圖、字幕及轉場。'],
  ['先過檢查，再輸出及發佈','run_all.py 先檢查再渲染，記錄狀態方便針對失敗步驟重跑。流程輸出直式 1080 × 1920、60 fps 影片；求職介紹片由本人另拍素材。']
];
function showVideo(i){document.querySelectorAll('[data-video]').forEach((b,n)=>b.setAttribute('aria-pressed',String(n===i)));$('video-description').replaceChildren();const strong=document.createElement('strong');strong.textContent=videoSteps[i][0];const p=document.createElement('p');p.textContent=videoSteps[i][1];$('video-description').append(strong,p);if(!isReduced())$('video-description').animate([{opacity:.4,transform:'translateX(5px)'},{opacity:1,transform:'none'}],{duration:220});}
document.querySelectorAll('[data-video]').forEach((b,i)=>b.addEventListener('click',()=>showVideo(i)));showVideo(0);

const productScreens = {
  home: ['togoalai-live.webp', '正式站首頁', '公開首頁介紹筆記、練習及複習工具。切換上面三項可看公開模擬考試展示。', 1440, 700],
  setup: ['togoalai-demo-setup.webp', '設定考試', '設定考試主題、涵蓋範圍及題量，再交給 AI 生成題目。', 896, 504],
  question: ['togoalai-demo-question.webp', '作答介面', '作答時可看進度、選項及示例回饋。', 896, 504],
  result: ['togoalai-demo-result.webp', '結果與弱點', '總分、分項成績及弱項建議在同一畫面，讓使用者知道下一步應複習甚麼。', 896, 504],
};
const productChoices = document.querySelectorAll('[data-product-screen]');
const productZoom = $('togoal-zoom');
productChoices.forEach(button => button.addEventListener('click', () => {
  const view = button.dataset.productScreen;
  const [name, title, description, width, height] = productScreens[view];
  productChoices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
  const path = `assets/${name}`;
  productZoom.dataset.screen = view;
  productZoom.dataset.zoom = path;
  productZoom.dataset.title = `ToGoalAi｜${title}`;
  productZoom.setAttribute('aria-label', `放大 ToGoalAi ${title}`);
  const screenshot = productZoom.querySelector('img');
  screenshot.src = path;
  screenshot.alt = `ToGoalAi 正式站公開畫面。${description}`;
  screenshot.width = width;
  screenshot.height = height;
  $('product-screen-note').textContent = description;
  if (!isReduced()) screenshot.animate([{ opacity: .6 }, { opacity: 1 }], { duration: 180 });
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
  if (!isReduced()) productRouteSteps.animate([{ opacity: .5 }, { opacity: 1 }], { duration: 180 });
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
renderReel(0);

const dialog=$('image-dialog');document.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>{$('image-dialog-title').textContent=b.dataset.title;$('dialog-image').src=b.dataset.zoom;$('dialog-image').alt=b.dataset.title;dialog.showModal();}));$('close-dialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});

// Load the original tool only when requested; closing releases its render loop.
const elsOpen=$('els-inline-open'), elsFrame=$('els-frame');
let elsReadyTimer;
function waitForElsReady(started=performance.now()){
 clearTimeout(elsReadyTimer);if($('els-inline').hidden)return;
 try{
  const editor=elsFrame.contentDocument?.getElementById('view')?.contentWindow?.__ed;
  if(editor?.REGIONS?.length){$('els-load-state').textContent=`完整地盤已開啟 · ${editor.REGIONS.length} 分區 · 可旋轉、剖面及編輯`;$('els-rotate').disabled=false;return;}
 }catch(e){/* Wait for the original inner editor to finish initialising. */}
 if(performance.now()-started>120000){$('els-load-state').textContent='模型載入較慢，可使用上方「開啟完整編輯器」。';return;}
 elsReadyTimer=setTimeout(()=>waitForElsReady(started),300);
}
elsOpen.addEventListener('click',()=>{
  $('els-inline').hidden=false;elsOpen.setAttribute('aria-expanded','true');
  $('els-rotate').disabled=true;
  $('els-load-state').textContent='載入完整地盤模型…';
  elsFrame.src='tools/els.html';
  $('els-inline').scrollIntoView({behavior:isReduced()?'instant':'smooth',block:'start'});
});
elsFrame.addEventListener('load',()=>waitForElsReady());
$('els-inline-close').addEventListener('click',()=>{clearTimeout(elsReadyTimer);$('els-rotate').disabled=true;$('els-rotate').setAttribute('aria-pressed','false');$('els-rotate').textContent='播放模型旋轉 ▶';$('els-inline').hidden=true;elsFrame.src='about:blank';elsOpen.setAttribute('aria-expanded','false');elsOpen.focus({preventScroll:true});});

$('els-rotate').addEventListener('click',()=>{
 try{const tool=elsFrame.contentDocument.getElementById('view').contentDocument;
 const control=tool.getElementById('rotBtn');if(!control)return;control.click();
 const on=control.classList.contains('on');$('els-rotate').setAttribute('aria-pressed',String(on));$('els-rotate').textContent=on?'暫停模型旋轉 Ⅱ':'播放模型旋轉 ▶';
 }catch(e){$('els-load-state').textContent='模型仍在準備，請稍後再試或另頁開啟。';}
});

const siteTour = $('site-tour');
const tourFrame = $('site-tour-frame');
const tourViews = [...siteTour.querySelectorAll('[data-tour-view]')];
const tourSection = $('site-tour-section');
const tourCut = $('site-tour-cut');
const tourStatus = $('site-tour-status');
const tourDescriptions = {
  iso: '斜視可同時看到開挖分區、斜道和支護配置。',
  plan: '俯視可沿斜道查看各施工區怎樣接通。',
  front: '側視可比較各施工區標高。',
};
let tourEngine;
let tourTimer;
let tourTrigger;
let tourView = 'iso';
let sectionIsOpen = false;

function showTourState() {
  tourViews.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tourView === tourView)));
  tourSection.setAttribute('aria-pressed', String(sectionIsOpen));
  $('site-tour-cut-control').hidden = !sectionIsOpen;
  tourStatus.textContent = sectionIsOpen
    ? '剖面已開啟。左右移動剖切線可比較不同位置的開挖與支護。'
    : tourDescriptions[tourView];
}

function closeTourWithEscape(event) {
  if (event.key !== 'Escape' || !siteTour.open) return;
  event.preventDefault();
  closeSiteTour();
}

function waitForTour(started) {
  if (!siteTour.open) return;
  const frame = tourFrame.contentDocument?.getElementById('view');
  const renderer = frame?.contentWindow;
  if (renderer?.__ready && renderer.__portfolioPreview) {
    tourEngine = renderer.__portfolioPreview;
    renderer.addEventListener('keydown', closeTourWithEscape);
    tourFrame.contentWindow.addEventListener('keydown', closeTourWithEscape);
    tourFrame.removeAttribute('aria-hidden');
    $('site-tour-viewport').dataset.ready = 'true';
    [...tourViews, tourSection, tourCut].forEach(control => { control.disabled = false; });
    showTourState();
    return;
  }
  if (performance.now() - started > 20000) {
    tourFrame.hidden = true;
    tourFrame.src = 'about:blank';
    tourStatus.textContent = '3D 模型暫未載入。可查看目前的模型圖，或另開完整編輯器。';
    return;
  }
  tourTimer = setTimeout(() => waitForTour(started), 120);
}

document.querySelectorAll('[data-site-tour]').forEach(trigger => trigger.addEventListener('click', () => {
  tourTrigger = trigger;
  tourView = 'iso';
  sectionIsOpen = false;
  tourCut.value = '55';
  showTourState();
  tourStatus.textContent = '正在建立 3D 模型…';
  tourFrame.hidden = false;
  tourFrame.setAttribute('aria-hidden', 'true');
  siteTour.showModal();
  tourFrame.src = 'tools/els.html?preview=1';
  waitForTour(performance.now());
}));

tourViews.forEach(button => button.addEventListener('click', () => {
  tourView = button.dataset.tourView;
  tourEngine?.setView(tourView, isReduced());
  showTourState();
}));
tourSection.addEventListener('click', () => {
  sectionIsOpen = !sectionIsOpen;
  tourEngine?.setSection(sectionIsOpen, Number(tourCut.value) / 100);
  showTourState();
});
tourCut.addEventListener('input', () => tourEngine?.setSection(sectionIsOpen, Number(tourCut.value) / 100));
function closeSiteTour() {
  clearTimeout(tourTimer);
  tourEngine = undefined;
  tourFrame.hidden = true;
  tourFrame.src = 'about:blank';
  delete $('site-tour-viewport').dataset.ready;
  [...tourViews, tourSection, tourCut].forEach(control => { control.disabled = true; });
  siteTour.close();
  tourTrigger?.focus({ preventScroll: true });
}
$('site-tour-close').addEventListener('click', closeSiteTour);
siteTour.addEventListener('cancel', event => {
  event.preventDefault();
  closeSiteTour();
});

const motionButton=$('motion-toggle');
function motionState(){
 motionButton.disabled=reduceMotion.matches;
 const paused=document.documentElement.dataset.motion==='off';
 motionButton.setAttribute('aria-pressed',String(paused||reduceMotion.matches));
 motionButton.textContent=reduceMotion.matches?'已依系統減少動效':paused?'恢復裝飾動效':'暫停裝飾動效';
}
motionButton.addEventListener('click',()=>{document.documentElement.dataset.motion=document.documentElement.dataset.motion==='off'?'on':'off';motionState();});
reduceMotion.addEventListener('change',motionState);motionState();
