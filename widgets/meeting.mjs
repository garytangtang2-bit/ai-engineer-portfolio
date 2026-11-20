const $ = id => document.getElementById(id);
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


renderMeeting(0);
renderFeedback(0);
