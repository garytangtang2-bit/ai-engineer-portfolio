const home = document.querySelector('[data-home]');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

function setupIndex() {
  const panel = document.querySelector('.index-filters');
  const buttons = [...panel.querySelectorAll('button')];
  const cards = [...document.querySelectorAll('.work-tile')];
  const counter = document.querySelector('#result-count');
  const field = document.querySelector('#catalogue-search');
  const noMatches = document.querySelector('.no-matches');
  const validGroups = buttons.map(button => button.dataset.filter);
  const searchText = new Map(cards.map(card => [card,(card.textContent + ' ' + card.dataset.stack).normalize('NFKC').toLowerCase()]));
  function update(group, query = '') {
    if (!validGroups.includes(group)) group = '全部';
    const words = query.normalize('NFKC').trim().toLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const matchesGroup = group === '全部' || group === card.dataset.group;
      card.hidden = !matchesGroup || !words.every(word => searchText.get(card).includes(word));
      if (!card.hidden) count++;
    }
    for (const button of buttons) button.setAttribute('aria-pressed', String(group === button.dataset.filter));
    counter.textContent = count + ' 件作品';
    noMatches.hidden = count > 0;
  }
  function select(group, query) {
      const url = new URL(location.href);
      if (group === '全部') url.searchParams.delete('group');
      else url.searchParams.set('group', group);
      if (query.trim()) url.searchParams.set('q',query.trim());
      else url.searchParams.delete('q');
      url.hash = 'work';
      history.replaceState(null, '', url);
      update(group,query);
  }
  for (const button of buttons) button.addEventListener('click', () => select(button.dataset.filter,field.value));
  field.addEventListener('input', () => select(panel.querySelector('[aria-pressed="true"]').dataset.filter,field.value));
  document.querySelector('#clear-index').addEventListener('click', () => {
    field.value = ''; select('全部',''); field.focus();
  });
  const restore = () => {
    const query = new URL(location.href).searchParams;
    field.value = (query.get('q') || '').slice(0,80);
    update(query.get('group'),field.value);
  };
  window.addEventListener('pageshow', restore);
  window.addEventListener('popstate', restore);
  restore();
  panel.parentElement.hidden = false;
  const returnLink = document.querySelector('.index-return');
  const controls = panel.parentElement;
  const onScroll = () => {
    returnLink.hidden = controls.getBoundingClientRect().bottom > -150 || document.querySelector('#about').getBoundingClientRect().top < innerHeight;
  };
  window.addEventListener('scroll',onScroll,{passive:true});
  onScroll();
  returnLink.addEventListener('click', () => panel.querySelector('[aria-pressed="true"]').focus({preventScroll:true}));
  const labels = ['原始錄音 · 19:06', '同事核實 · 答疑回覆', '英文會議紀錄 · 已核實'];
  const quotes = ['「下星期……四？再確認。」', '「確認，10 月 22 日星期四提交。」', 'The next submission is scheduled for Thursday, 22 October 2026.'];
  const choices = [...document.querySelectorAll('[data-snippet]')];
  choices.forEach((button, index) => button.addEventListener('click', () => {
    choices.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    document.querySelector('#snippet-label').textContent = labels[index];
    const excerpt = document.querySelector('#snippet-text');
    excerpt.textContent = quotes[index];
    excerpt.lang = index === 2 ? 'en' : 'zh-Hant-HK';
    document.querySelector('.signal-scope').dataset.selection = index;
  }));
  const metric = document.querySelector('[data-counter]');
  if (metric && !motion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const step = now => {
        const t = Math.min(1, (now-start)/460);
        metric.textContent = Math.round(70*(1-(1-t)**3));
        if (t<1 && !motion.matches) requestAnimationFrame(step);
        else metric.textContent = '70';
      };
      requestAnimationFrame(step);
    });
    observer.observe(metric);
  }
}

function hashId() {
  try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; }
}

async function applyAnchor() {
  const id = hashId();
  if (!id) return;
  const target = document.getElementById(id);
  if (target) {
    let parent = target.parentElement?.closest('details');
    let revealed = false;
    while (parent) {
      if (!parent.open) {parent.open = true; revealed = true;}
      parent = parent.parentElement?.closest('details');
    }
    if (revealed) target.scrollIntoView();
  } else if (home) {
    const {default: routes} = await import('./legacy-routes.js');
    if (Object.hasOwn(routes, id)) location.replace(new URL(routes[id],location.href));
  }
}

function setupPointer() {
  let pending = 0, active, x, y;
  function reset() {
    if (pending) cancelAnimationFrame(pending);
    pending = 0;
    if (!active) return;
    for (const prop of ['--mx','--my','--dx','--dy']) active.style.removeProperty(prop);
    active = null;
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !finePointer.matches || motion.matches) return;
    const surface = event.target.closest?.('[data-reactive]');
    if (surface !== active) reset();
    if (!surface) return;
    active = surface; x = event.clientX; y = event.clientY;
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      const box = active.getBoundingClientRect();
      const u = Math.min(1,Math.max(0,(x-box.left)/box.width));
      const v = Math.min(1,Math.max(0,(y-box.top)/box.height));
      active.style.setProperty('--mx', u*100+'%');
      active.style.setProperty('--my', v*100+'%');
      active.style.setProperty('--dx',(u-.5)*7+'px');
      active.style.setProperty('--dy',(v-.5)*6+'px');
    });
  }, {passive:true});
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) reset(); });
  motion.addEventListener('change',reset);
}

if (home) setupIndex();
else {
  try {
    const previous = document.referrer && new URL(document.referrer);
    const root = new URL('../../', location.href);
    if (previous.origin === root.origin && previous.pathname.replace(/index\.html$/,'') === root.pathname && (previous.searchParams.has('group') || previous.searchParams.has('q'))) {
      for (const key of ['group','q']) if (previous.searchParams.has(key)) root.searchParams.set(key,previous.searchParams.get(key));
      root.hash = 'work';
      document.querySelectorAll('[data-back]').forEach(a => a.href = root.href);
    }
  } catch { /* Direct access has no referring page. */ }
}
setupPointer();
applyAnchor();
window.addEventListener('hashchange',applyAnchor);
