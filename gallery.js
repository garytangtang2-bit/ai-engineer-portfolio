const home = document.querySelector('[data-home]');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

function setupIndex() {
  const panel = document.querySelector('.index-filters');
  const buttons = [...panel.querySelectorAll('button')];
  const cards = [...document.querySelectorAll('.work-tile')];
  const cardSections = [...document.querySelectorAll('[data-card-section]')];
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
    for (const section of cardSections) section.hidden = !section.querySelector('.work-tile:not([hidden])');
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

const TILT = '[data-reactive],.module-index a,.related-tools a,.reel-gallery figure,.angle-strip figure';
function setupPointer() {
  let pending = 0, active, x, y;
  function reset() {
    if (pending) cancelAnimationFrame(pending);
    pending = 0;
    if (!active) return;
    for (const prop of ['--mx','--my','--rx','--ry']) active.style.removeProperty(prop);
    active = null;
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !finePointer.matches || motion.matches) return;
    const surface = event.target.closest?.(TILT);
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
      // Gentle tilt toward the cursor; larger surfaces tilt less.
      const k = Math.min(1, 380 / Math.max(box.width, box.height)) * 5;
      active.style.setProperty('--rx', ((.5-v)*k).toFixed(2)+'deg');
      active.style.setProperty('--ry', ((u-.5)*k).toFixed(2)+'deg');
    });
  }, {passive:true});
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) reset(); });
  motion.addEventListener('change',reset);
}

function setupProofViewer() {
  const viewer = document.querySelector('.proof-viewer');
  const links = [...document.querySelectorAll('.proof-open')];
  if (!viewer || !links.length || !viewer.showModal) return;
  let link = links[0];
  const note = viewer.querySelector(':scope > p');
  const defaultNote = note ? note.textContent : '';
  const scale = viewer.querySelector('.proof-scale');
  const image = viewer.querySelector('.proof-scroll img');
  function showScaleOption() {
    if (viewer.open && image.naturalWidth && !viewer.classList.contains('original-size')) {
      scale.hidden = image.naturalWidth <= image.clientWidth && image.naturalHeight <= image.clientHeight;
    }
  }
  for (const opener of links) opener.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    link = opener;
    image.alt = opener.querySelector('img')?.alt || '';
    if (note) note.textContent = opener.dataset.caption || defaultNote;
    image.src = opener.href;
    viewer.showModal();
    showScaleOption();
    document.documentElement.classList.add('viewing-proof');
  });
  function fit() {
    scale.setAttribute('aria-pressed','false');
    viewer.classList.remove('original-size');
  }
  image.addEventListener('load', showScaleOption);
  window.addEventListener('resize', showScaleOption);
  scale.addEventListener('click', () => {
    scale.setAttribute('aria-pressed',String(viewer.classList.toggle('original-size')));
  });
  viewer.querySelector('.proof-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const {left, top, right, bottom} = viewer.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    fit();
    document.documentElement.classList.remove('viewing-proof');
    link.focus({preventScroll:true});
  });
}

function setupReels() {
  const reels = [...document.querySelectorAll('video[data-reel]')];
  if (!reels.length) return;
  const play = video => {
    if (motion.matches) return;
    const mount = video.closest('.proof-mount');
    video.play().then(() => mount.classList.add('playing')).catch(() => {});
  };
  const stop = video => { video.pause(); video.closest('.proof-mount').classList.remove('playing'); };
  // Case-hero reels play whenever they are in view (any pointer) and carry their own pause button.
  const heroes = reels.filter(video => video.dataset.reel === 'view');
  for (const video of heroes) {
    const toggle = video.parentElement.querySelector('.reel-toggle');
    video.paused_by_user = false;
    if (toggle) toggle.addEventListener('click', () => {
      video.paused_by_user = !video.paused_by_user;
      toggle.setAttribute('aria-pressed', String(video.paused_by_user));
      toggle.textContent = video.paused_by_user ? '播放片段' : '暫停片段';
      video.paused_by_user ? stop(video) : play(video);
    });
  }
  if ('IntersectionObserver' in window && heroes.length) {
    const inView = new IntersectionObserver(entries => {
      for (const entry of entries) entry.isIntersecting && !entry.target.paused_by_user ? play(entry.target) : stop(entry.target);
    }, {threshold: .35});
    heroes.forEach(video => inView.observe(video));
  }
  for (const video of reels.filter(v => v.dataset.reel !== 'view')) {
    const tile = video.closest('.work-tile') || video.parentElement;
    tile.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') play(video); });
    tile.addEventListener('pointerleave', () => stop(video));
    tile.addEventListener('focusin', () => play(video));
    tile.addEventListener('focusout', () => stop(video));
  }
  if (!finePointer.matches && 'IntersectionObserver' in window) {
    const seen = new IntersectionObserver(entries => {
      for (const entry of entries) entry.isIntersecting ? play(entry.target) : stop(entry.target);
    }, {threshold: .6});
    reels.filter(v => v.dataset.reel !== 'view').forEach(video => seen.observe(video));
  }
  motion.addEventListener('change', () => { if (motion.matches) reels.forEach(stop); });
}

// Nav glass gets denser once the page scrolls under it.
function setupMast() {
  const mast = document.querySelector('.mast');
  if (!mast) return;
  let ticking = false;
  const update = () => { ticking = false; mast.classList.toggle('is-scrolled', scrollY > 12); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, {passive:true});
  update();
}

// Staggered reveal for content that starts below the fold; anything already visible is left alone.
const REVEAL = '.section-line,.work-tile,.compact-section>h3,.instrument,.feature-copy,.about-band,.method>h2,.build-steps li,.tech-pills,'
  + '.case-demo,.reader-section,.modules-head,.module-index li,.module-card,.tuning-row,.asr-case,.reel-hero,.reel-gallery figure,'
  + '.angle-strip figure,.related-tools a,.next-case,.render-section,.calibration,.folio-footer>*,'
  + '.eng-block>h2,.eng-grid,.eng-part,.code-panel,.tier-title,.data-note';
function setupReveal() {
  if (motion.matches || !('IntersectionObserver' in window)) return;
  const fold = innerHeight * .96;
  const items = [...document.querySelectorAll(REVEAL)].filter(el => el.getBoundingClientRect().top > fold);
  if (!items.length) return;
  const seen = new IntersectionObserver(entries => {
    let batch = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      el.style.setProperty('--reveal-delay', Math.min(batch++, 6) * 70 + 'ms');
      el.classList.add('is-in');
      seen.unobserve(el);
      el.addEventListener('transitionend', () => el.removeAttribute('data-reveal'), {once:true});
    }
  }, {rootMargin:'0px 0px -8% 0px', threshold:.08});
  for (const el of items) { el.setAttribute('data-reveal',''); seen.observe(el); }
  motion.addEventListener('change', () => items.forEach(el => { el.classList.add('is-in'); el.removeAttribute('data-reveal'); }));
}

// Count numbers up when they scroll into view. Only the first number in the element's own text is animated.
function setupCounters() {
  if (motion.matches || !('IntersectionObserver' in window)) return;
  const targets = [...document.querySelectorAll('.case-outcome strong,.reader-stat strong,.metric-rail strong:not([data-counter]),.module-result strong')];
  const jobs = [];
  for (const el of targets) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (el.textContent.includes('→')) break;
      const match = node.nodeValue.match(/\d[\d,]*(?:\.\d+)?/);
      if (!match) continue;
      const raw = match[0], value = parseFloat(raw.replace(/,/g,''));
      if (!(value >= 2)) break;
      const decimals = (raw.split('.')[1] || '').length, commas = raw.includes(',');
      const format = n => { const s = n.toFixed(decimals); return commas ? Number(s).toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}) : s; };
      jobs.push({el, node, before: node.nodeValue.slice(0, match.index), after: node.nodeValue.slice(match.index + raw.length), value, format, final: node.nodeValue});
      break;
    }
  }
  if (!jobs.length) return;
  const run = job => {
    const start = performance.now(), length = 900;
    const step = now => {
      const t = Math.min(1, (now - start) / length), eased = 1 - (1 - t) ** 4;
      job.node.nodeValue = t < 1 ? job.before + job.format(job.value * eased) + job.after : job.final;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const seen = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      seen.unobserve(entry.target);
      jobs.filter(job => job.el === entry.target).forEach(run);
    }
  }, {threshold:.6});
  for (const job of jobs) {
    // Keep the width steady while counting, and keep the real value for assistive tech.
    job.el.style.fontVariantNumeric = 'tabular-nums';
    seen.observe(job.el);
  }
}

if (home) {
  setupIndex();
  setupReels();
  const hero = document.querySelector('.hero-stage');
  if (hero) import('./particles.js').then(({mountParticles}) => mountParticles(hero));
}
else {
  setupProofViewer();
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
setupMast();
setupReveal();
setupCounters();
applyAnchor();
window.addEventListener('hashchange',applyAnchor);
