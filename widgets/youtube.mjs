const $ = id => document.getElementById(id);
async function loadUploadPreflight() {
  const files = $('batch-files');
  const modes = $('upload-states').querySelectorAll('[data-batch]');
  const labels = {
    ready: '可處理', blocked: '缺少封面', prepared: '跳過 · 已準備',
    changed: '重新排程 · 素材已替換', empty: '跳過 · 空檔',
  };

  try {
    const response = await fetch('../../evidence/upload-preflight.json');
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

loadUploadPreflight();
