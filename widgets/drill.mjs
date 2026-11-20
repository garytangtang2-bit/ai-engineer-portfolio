const $ = id => document.getElementById(id);
const pdfSkillSteps=[
  ['先認版面','Skill 先引導 AI 定位欄線、合併格與分頁邊界，建立資料之間的關係。','先分清欄位，才讀內容'],
  ['讀細字與上下文','按文件情況放大、使用 OCR 或字形比對，再將數字與正確的欄、列及跨頁記錄對齊。','細字、薄格與跨頁內容一起核對'],
  ['保留覆核線索','將結構化資料交給 Python 整理成 Excel；保留來源及警告，不確定的地方回到原圖讓人確認。','能確認的交付，有疑點的留待覆核']
];
function showPdfSkill(i){
  document.querySelectorAll('[data-pdf-skill]').forEach((b,n)=>{b.setAttribute('aria-selected',String(n===i));b.tabIndex=n===i?0:-1;});
  $('skill-document').dataset.stage=String(i);$('doc-callout').textContent=pdfSkillSteps[i][2];
  const panel=$('pdf-skill-panel');panel.setAttribute('aria-labelledby',`skill-tab-${i}`);panel.replaceChildren();
  const h=document.createElement('h4'),p=document.createElement('p');h.textContent=pdfSkillSteps[i][0];p.textContent=pdfSkillSteps[i][1];panel.append(h,p);
}
document.querySelectorAll('[data-pdf-skill]').forEach((b,i)=>{
  b.addEventListener('click',()=>showPdfSkill(i));
  b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%3;else if(e.key==='ArrowLeft')n=(i+2)%3;else if(e.key==='Home')n=0;else if(e.key==='End')n=2;else return;e.preventDefault();showPdfSkill(n);document.querySelector(`[data-pdf-skill="${n}"]`).focus();});
});
