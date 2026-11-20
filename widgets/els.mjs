const $ = id => document.getElementById(id);
const isReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const imageDialog = $('image-dialog');
let imageTrigger;
function closeOnBackdrop(dialog) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
}

document.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => {
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
  modelEngine?.setPaused(!siteVisible || inPlan || document.hidden || imageDialog.open);
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
    modelFrame.src = '../../tools/els.html?preview=1&scene=portfolio' + (smallScreen.matches ? '&quality=low' : '');
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
