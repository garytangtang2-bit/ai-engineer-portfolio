const $ = id => document.getElementById(id);
const usageInput = $('usage-json');
const usageMessage = $('usage-message');
let usageExamples;
function fetchUsageSample() {
  usageExamples ??= fetch('../../evidence/token-usage-workflow.json').then(async response => {
    if (!response.ok) throw new Error('未能讀取工作流範例。');
    const workflow = await response.json();
    const source = workflow.nodes.find(node => node.type === 'n8n-nodes-base.set');
    return source.parameters.jsonOutput;
  }).catch(error => { usageExamples = undefined; throw error; });
  return usageExamples;
}
let inputEdited = false;
function clearUsageReport(message) {
  $('usage-rows').replaceChildren();
  $('usage-chart').hidden = true;
  $('usage-summary').textContent = '執行後可查看配對結果。';
  usageMessage.textContent = message;
}
usageInput.addEventListener('input', () => {
  inputEdited = true;
  clearUsageReport('輸入已更新，可重新對帳。');
});
async function populateSample(reset = false) {
  const source = await fetchUsageSample();
  if (reset || !inputEdited) { usageInput.value = source; inputEdited = false; }
}
usageInput.closest('details').addEventListener('toggle', event => {
  if (event.target.open && !usageInput.value && !inputEdited) populateSample().catch(() => { usageMessage.textContent = '未能讀取範例，可自行貼入紀錄。'; });
});
$('usage-reset').addEventListener('click', async () => {
  try { await populateSample(true); clearUsageReport('已還原示例例子，可重新對帳。'); }
  catch { usageMessage.textContent = '範例暫未能載入。'; }
});
$('usage-run').addEventListener('click', async () => {
  const button = $('usage-run');
  if (button.getAttribute('aria-disabled') === 'true') return;
  button.setAttribute('aria-disabled', 'true');
  const rows = $('usage-rows');
  rows.replaceChildren();
  const chart = $('usage-chart');
  chart.hidden = true;
  const summary = $('usage-summary');
  try {
    if (!usageInput.value && !inputEdited) await populateSample();
    const { compareRuns, summarizePairs } = await import('../token-audit.mjs');
    const payload = JSON.parse(usageInput.value);
    const report = summarizePairs(compareRuns(Array.isArray(payload) ? payload : payload?.runs));
    const fmt = value => value === null ? '缺資料' : value.toLocaleString('en-US');
    if (report.accepted) {
      const change = report.savedTokens === 0 ? '用量相同' :
        (report.savedTokens > 0 ? '減少 ' : '增加 ') + fmt(Math.abs(report.savedTokens)) + ' Token';
      const percent = report.savedTokens && report.reductionPercent !== null
        ? '（' + fmt(Math.abs(report.reductionPercent)) + '%）' : '';
      summary.textContent = '通過驗收的個案共用 ' + fmt(report.before) + ' → ' + fmt(report.after) +
        ' Token，' + change + percent + '。';
      const scale = Math.max(1, report.before, report.after);
      [report.before, report.after].forEach((amount, index) => {
        const bar = chart.children[index];
        bar.querySelector('b').style.width = (amount / scale * 100) + '%';
        bar.querySelector('output').textContent = fmt(amount);
      });
      chart.hidden = false;
    } else {
      summary.textContent = '本批沒有前後均通過驗收的配對。';
    }
    for (const pair of report.pairs) {
      const row = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = pair.caseId;
      const status = document.createElement('small');
      const labels = {accepted: '納入比較', unpaired: '欠缺配對', review: '待覆核'};
      status.textContent = fmt(pair.before) + ' → ' + fmt(pair.after) + ' · ' + labels[pair.status];
      row.append(title, status);
      rows.append(row);
    }
    usageMessage.textContent = (inputEdited ? '輸入資料' : '示例測試') + '已完成對帳。納入 ' + report.accepted + ' 項，另列 ' + report.pending + ' 項。';
  } catch (error) {
    summary.textContent = '修正輸入後可再執行。';
    usageMessage.textContent = error instanceof SyntaxError ? 'JSON 格式有誤，請檢查括號和逗號。' : error.message;
  } finally {
    button.removeAttribute('aria-disabled');
  }
});
