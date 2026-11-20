const $ = id => document.getElementById(id);
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
  const response=await fetch('../../evidence/table-preview.json');if(!response.ok)throw Error('資料無法載入');
  const {pages}=await response.json();const sel=$('pdf-page');
  showQuickCells(pages[0].rows);
  pages.forEach((_,i)=>sel.add(new Option(String(i+1),String(i+1))));
  function render(){
    const p=pages[Number(sel.value)-1];
    $('pdf-source-img').src=`../../assets/pdf-page-${p.page}.webp`;$('pdf-source-img').alt=`原始合成 PDF 第 ${p.page} 頁，50列乘20欄數值表格`;$('pdf-source-caption').textContent=`原 PDF 第 ${p.page} 頁 · 對照相同頁的 Excel 輸出。`;
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
  const response=await fetch('../../evidence/review-rule-audit.json');if(!response.ok)throw Error('Rule result unavailable');
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
const auditButton = $('audit-run');
const auditStatus = $('audit-status');
const auditPages = Array.from({ length: 20 }, (_, index) => {
  const mark = document.createElement('span');
  mark.textContent = String(index + 1).padStart(2, '0');
  return mark;
});
$('audit-sheets').replaceChildren(...auditPages);
auditButton.addEventListener('click', async () => {
  if (auditButton.getAttribute('aria-disabled') === 'true') return;
  auditButton.setAttribute('aria-disabled', 'true');
  auditButton.textContent = '核對中…';
  auditStatus.textContent = '正在讀取公開 Excel 及核對數值。';
  auditPages.forEach(mark => delete mark.dataset.result);
  try {
    const { verifyWorkbook } = await import('../verify-workbook.mjs');
    const result = await verifyWorkbook((index, passed) => {
      auditPages[index].dataset.result = passed ? 'pass' : 'fail';
    });
    const passed = result.matches === result.total && !result.extra;
    auditStatus.textContent = passed
      ? '20 頁已核對。20,000 格的格位、數值及數字型別全部吻合。'
      : '已核對。相符 ' + result.matches.toLocaleString('en-US') + ' 格，多出 ' + result.extra + ' 格。' +
        (result.firstIssue ? '首個差異位於' + result.firstIssue + '。' : '');
  } catch {
    auditStatus.textContent = '未能完成核對。可重試，或開啟原轉換測試紀錄。';
  } finally {
    auditButton.removeAttribute('aria-disabled');
    auditButton.textContent = '重新核對';
  }
});


preparePdf();
