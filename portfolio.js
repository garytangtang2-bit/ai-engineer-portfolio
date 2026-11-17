'use strict';
document.documentElement.classList.add('js');
const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isReduced=()=>reduceMotion.matches||document.documentElement.dataset.motion==='off';
const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('seen'); revealObserver.unobserve(entry.target); }
}), {threshold:.06});
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
let scheduled = false;
function updateScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  document.documentElement.style.setProperty('--scroll', max > 0 ? Math.min(1,scrollY/max) : 0);
  scheduled = false;
}
addEventListener('scroll', () => {if (!scheduled) {scheduled = true;requestAnimationFrame(updateScroll);}}, {passive:true});
addEventListener('resize',updateScroll);updateScroll();
const nav = $('navigation');
const menu = document.querySelector('.menu-button');
function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='目錄 ＋';}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'關閉 ×':'目錄 ＋';nav.classList.toggle('open',open);});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.navbar'))closeMenu();});
const caseObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;document.querySelectorAll('.work-index a').forEach(link=>{if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}),{rootMargin:'-15% 0px -60% 0px'});
document.querySelectorAll('.case').forEach(el=>caseObserver.observe(el));

let meetingStep=0,reviewed=false;
const factRows=`<table class="facts"><thead><tr><th>等級</th><th>事實與來源</th><th>去向</th></tr></thead><tbody><tr><td><span class="confidence">A</span></td><td>西側圖則待顧問回覆<span class="quote">18:32「已經交咗，等緊顧問覆。」</span></td><td>進草稿</td></tr><tr><td><span class="confidence pending">B</span></td><td>下次提交日期未確認<span class="quote">19:06「下星期…四？再確認。」</span></td><td>回問</td></tr><tr><td><span class="confidence exclude">C</span></td><td>舊議程的完成日期<span class="quote">本次會議沒有支持原句</span></td><td>排除表</td></tr></tbody></table>`;
function meetingContent(step){
  if(step===0)return `<h4>先準備完整輸入</h4><p>影片提供本次討論，舊議程提供框架。兩者用途不同，不能把舊狀態直接當新事實。</p><div class="file-stack"><div class="file-card"><span class="file-type">MP4</span><div><strong>約 90 分鐘會議影片</strong><small>本機錄音、畫面與時間定位</small></div></div><div class="file-card"><span class="file-type">PDF</span><div><strong>上次議程與固定框架</strong><small>專案卡、人物卡、既有格式</small></div></div></div>`;
  if(step===1)return `<h4>六引擎轉錄，程式先整理</h4><p>按本機資源循序執行，再整理時間、詞典與畫面線索。模型接收結構化資料，而不是任意重寫整份議程。</p><div class="asr-engines">${['qwen17','hf_jacky_turbo','w_large_v3','hf_buzz','glm_nano','w_large_v2'].map(x=>`<span>${x}</span>`).join('')}</div><p class="asr-note">多個引擎有共同技術來源，仍需來源核對及人手處理疑點。</p>`;
  if(step===2)return `<h4>先確認事實，再寫英文紀錄</h4><p>每項附時間及原句。高信心事實進草稿；不確定項目回問，無依據項目留在排除紀錄。</p>${factRows}`;
  if(step===3)return `<h4>人只回答真正的疑點</h4><p>正式工具為問題附相關音段，並在提問前鎖定 AI 答案，保留獨立核對依據。</p><div class="review-question"><p><strong>示例疑點：下次提交日期？</strong></p><span class="quote">19:06 · 相關音段約 26 秒（此導覽不提供公司錄音）</span><p>覆核者已確認：星期四。</p><button class="button small ${reviewed?'':'primary'}" id="confirm-review" ${reviewed?'disabled':''}>${reviewed?'已記錄覆核答案 ✓':'記錄這項覆核答案 →'}</button></div><p class="review-status">${reviewed?'答案已記錄，可前往交付。':'尚未覆核：交付維持草稿。'}</p>`;
  return `<h4>${reviewed?'覆核完成，才交付。':'疑點未答，先保留草稿。'}</h4><p>${reviewed?'原流程會更新來源核對及交稿檢查，再產生以下交付。這裏可下載虛構文字示例。':'你可返回「答疑」記錄覆核答案，看看交付狀態怎樣改變。'}</p><ul class="delivery-list ${reviewed?'':'locked'}"><li>英文會議紀錄 · TXT / Word</li><li>下一次議程 · Excel</li><li>來源、排除表與檢查紀錄</li><li>最終修改差異 → 詞典／流程修訂</li></ul><div style="margin-top:1.2rem">${reviewed?'<button class="button small primary" id="minutes-download">下載虛構紀錄 TXT ↓</button>':'<button class="button small" id="back-review">前往答疑 →</button>'}</div>`;
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

async function loadTable(){
  const response=await fetch('evidence/table-preview.json');if(!response.ok)throw Error('資料無法載入');
  const {pages}=await response.json();const sel=$('pdf-page');
  pages.forEach((_,i)=>sel.add(new Option(String(i+1),String(i+1))));
  function render(){
    const p=pages[Number(sel.value)-1];
    $('pdf-source-img').src=`assets/pdf-page-${p.page}.webp`;$('pdf-source-img').alt=`原始合成 PDF 第 ${p.page} 頁，50列乘20欄數值表格`;$('pdf-source-caption').textContent=`原 PDF 第 ${p.page} 頁 · 對照相同頁的 Excel 輸出。`;
    $('actual-table').innerHTML=`<caption class="sr-only">第 ${p.page} 頁實際 Excel 輸出：50 列、20 欄</caption><thead><tr><th scope="col">列</th>${Array.from({length:20},(_,c)=>`<th scope="col">${String.fromCharCode(65+c)}</th>`).join('')}</tr></thead><tbody>${p.rows.map((row,r)=>`<tr><th scope="row">${r+1}</th>${row.map((val,c)=>`<td><button tabindex="${r===0&&c===0?'0':'-1'}" data-r="${r}" data-c="${c}" aria-label="第${p.page}頁 ${String.fromCharCode(65+c)}${r+1}，${val.toFixed(2)}">${val.toFixed(2)}</button></td>`).join('')}</tr>`).join('')}</tbody>`;
    $('cell-info').textContent=`第 ${p.page} 頁 · 50 列 × 20 欄。點選或用方向鍵查看儲存格。`;
    $('excel-view').scrollTop=0;
  }
  sel.addEventListener('change',render);render();
  $('actual-table').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(!b)return;document.querySelectorAll('#actual-table button[tabindex="0"]').forEach(x=>x.tabIndex=-1);document.querySelectorAll('.selected-cell').forEach(x=>x.classList.remove('selected-cell'));b.tabIndex=0;b.classList.add('selected-cell');$('cell-info').textContent=`第 ${Number(sel.value)} 頁 · ${String.fromCharCode(65+Number(b.dataset.c))}${Number(b.dataset.r)+1} = ${b.textContent} · Excel 數值型儲存格`;});
  $('actual-table').addEventListener('keydown',e=>{const b=e.target.closest('button[data-r]');if(!b)return;let r=Number(b.dataset.r),c=Number(b.dataset.c);if(e.key==='ArrowRight')c++;else if(e.key==='ArrowLeft')c--;else if(e.key==='ArrowDown')r++;else if(e.key==='ArrowUp')r--;else return;e.preventDefault();const next=$('actual-table').querySelector(`button[data-r="${Math.max(0,Math.min(49,r))}"][data-c="${Math.max(0,Math.min(19,c))}"]`);next.click();next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});});
}
loadTable().catch(()=>{$('cell-info').textContent='預覽暫時無法載入；你仍可直接下載下方完整 Excel 與 PDF。';});
function tableMode(source){$('source-view').hidden=!source;$('excel-view').hidden=source;$('show-source').setAttribute('aria-pressed',String(source));$('show-excel').setAttribute('aria-pressed',String(!source));$('show-source').classList.toggle('selected',source);$('show-excel').classList.toggle('selected',!source);$('cell-info').hidden=source;}
$('show-source').addEventListener('click',()=>tableMode(true));$('show-excel').addEventListener('click',()=>tableMode(false));

async function loadDrill(){
  const response=await fetch('evidence/drill-cases.json');if(!response.ok)throw Error('資料無法載入');const cases=await response.json();let current;
  function showWindow(i){const w=current.result.windows[i];$('window-calc').textContent=w?`${w.a.toFixed(2)}–${w.b.toFixed(2)} m\n${w.calc}\n\n加權有效 TCR = ${w.tcr.toFixed(2)}%`: '此情況沒有可計算窗口。';$('drill-window').value=String(i);document.querySelectorAll('#window-chart button').forEach((b,n)=>b.setAttribute('aria-pressed',String(n===Number(i))));}
  function render(){current=cases.find(c=>c.id===$('drill-case').value);const r=current.result;
    $('drill-result').replaceChildren();const strong=document.createElement('strong');strong.textContent=r.depth===null?'不建議岩面位置':`${r.depth.toFixed(2)} m 深`;
    const info=document.createElement('span');info.textContent=r.depth===null?r.no_rock_reason:`原函數結果 · 85% 門檻 · 敏感度${r.stable?'穩定':'需留意變化'} · 工程師覆核`;$('drill-result').append(strong,info);
    $('drill-window').innerHTML='';r.windows.forEach((w,i)=>$('drill-window').add(new Option(`${w.a.toFixed(1)}–${w.b.toFixed(1)} m · ${w.tcr.toFixed(1)}%`,String(i))));
    $('window-chart').innerHTML=r.windows.map((w,i)=>`<button class="${w.tcr<85?'bad':''}" style="height:${Math.max(3,w.tcr)}%" data-window="${i}" tabindex="-1" aria-label="${w.a.toFixed(1)}至${w.b.toFixed(1)}米，${w.tcr.toFixed(1)}%" title="${w.a.toFixed(1)}–${w.b.toFixed(1)} m: ${w.tcr.toFixed(1)}%"></button>`).join('');
    const idx=r.fail?r.windows.findIndex(w=>w.a===r.fail.a):0;showWindow(Math.max(0,idx));
  }
  $('drill-case').addEventListener('change',render);$('drill-window').addEventListener('change',e=>showWindow(Number(e.target.value)));$('window-chart').addEventListener('click',e=>{if(e.target.dataset.window!==undefined)showWindow(Number(e.target.dataset.window));});render();
}
loadDrill().catch(()=>{$('drill-result').textContent='計算追蹤暫時無法載入；可下載原程式 Excel 報告查看。';});
$('upload-inspect').addEventListener('click',()=>{const shown=!$('upload-states').hidden;$('upload-states').hidden=shown;$('upload-inspect').textContent=shown?'查看原流程如何處理 →':'收起流程 ↑';$('upload-inspect').setAttribute('aria-expanded',String(!shown));});
$('upload-inspect').setAttribute('aria-controls','upload-states');$('upload-inspect').setAttribute('aria-expanded','false');
const videoSteps=[['先定內容，再定分鏡','劇本 Skill 將主題拆成清晰段落及鏡頭；核心指令保持精簡，所需規格及參考資料按步驟讀取。'],['Whisper × FFmpeg × Remotion','以轉錄時間對齊說話、剪去停頓，配合程式動畫、字幕與圖像組件；將反覆執行的動作交給工具。'],['逐段檢查，再看整片','檢查字幕時間、轉場、構圖、音效及人聲；統一響度，再做輸出前質檢，避免只看「程式成功」就交貨。'],['輸出完成，才進入發佈','依流程輸出直式 1080 × 1920、60 fps 影片，接上自動發佈步驟；求職介紹片將由本人另拍素材。']];
function showVideo(i){document.querySelectorAll('[data-video]').forEach((b,n)=>b.setAttribute('aria-pressed',String(n===i)));$('video-description').replaceChildren();const strong=document.createElement('strong');strong.textContent=videoSteps[i][0];const p=document.createElement('p');p.textContent=videoSteps[i][1];$('video-description').append(strong,p);if(!isReduced())$('video-description').animate([{opacity:.4,transform:'translateX(5px)'},{opacity:1,transform:'none'}],{duration:220});}
document.querySelectorAll('[data-video]').forEach((b,i)=>b.addEventListener('click',()=>showVideo(i)));showVideo(0);
const dialog=$('image-dialog');document.querySelectorAll('[data-zoom]').forEach(b=>b.addEventListener('click',()=>{$('image-dialog-title').textContent=b.dataset.title;$('dialog-image').src=b.dataset.zoom;$('dialog-image').alt=b.dataset.title;dialog.showModal();}));$('close-dialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});

// Load the original tool only when requested; closing releases its render loop.
const elsOpen=$('els-inline-open'), elsFrame=$('els-frame');
elsOpen.addEventListener('click',()=>{
  $('els-inline').hidden=false;elsOpen.setAttribute('aria-expanded','true');
  $('els-load-state').textContent='載入原 ELS 編輯器…';
  elsFrame.src='tools/els.html';
  $('els-inline').scrollIntoView({behavior:isReduced()?'instant':'smooth',block:'start'});
});
elsFrame.addEventListener('load',()=>{if(!$('els-inline').hidden){$('els-load-state').textContent='原編輯器已開啟 · DEMO 地盤 · 可旋轉、剖面及編輯';$('els-rotate').disabled=false;}});
$('els-inline-close').addEventListener('click',()=>{$('els-rotate').disabled=true;$('els-rotate').setAttribute('aria-pressed','false');$('els-rotate').textContent='播放模型旋轉 ▶';$('els-inline').hidden=true;elsFrame.src='about:blank';elsOpen.setAttribute('aria-expanded','false');elsOpen.focus({preventScroll:true});});

$('els-rotate').addEventListener('click',()=>{
 try{const tool=elsFrame.contentDocument.getElementById('view').contentDocument;
 const control=tool.getElementById('rotBtn');if(!control)return;control.click();
 const on=control.classList.contains('on');$('els-rotate').setAttribute('aria-pressed',String(on));$('els-rotate').textContent=on?'暫停模型旋轉 Ⅱ':'播放模型旋轉 ▶';
 }catch(e){$('els-load-state').textContent='模型仍在準備，請稍後再試或另頁開啟。';}
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
