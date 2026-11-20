const $ = id => document.getElementById(id);
const isReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
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
