// Viewport from the original pile workbench's GEO step. The public fixture uses local coordinates created for this page.
const root = document.querySelector('[data-pile-map]');
const $ = selector => root.querySelector(selector);
const selector = $('#demo-hole');
const css = property => getComputedStyle(root).getPropertyValue(property).trim();
const dpr = Math.min(2, window.devicePixelRatio || 1);
const coordinates = [
  [0,4,7.6,2.1],[21,1,8.1,1.0],[43,3,8.6,-1.9],[66,8,9.1,-4.9],
  [6,16,8.0,1.6],[27,20,9.0,1.1],[49,22,9.4,null],[71,25,9.7,-6.4],
  [1,36,9.8,2.7],[20,38,10.2,1.6],[43,43,10.5,-2.1],[65,45,10.9,-4.9],
  [12,55,10.3,null],[31,59,11.1,1.8],[55,57,11.4,-2.5],
];
const S = {holes: coordinates.map(([e,n,gl,rl], index) => ({
  hole: 'H' + String(index + 1).padStart(2,'0'), e, n, gl, rl, end: 12 + index % 6
})), piles: [
  {e:14,n:12,gl:8.2,toe:-2.8},{e:35,n:13,gl:8.7,toe:-4.2},
  {e:53,n:16,gl:9.0,toe:-6.8},{e:26,n:30,gl:9.8,toe:-3.8},
  {e:58,n:34,gl:10.0,toe:-8.2},{e:39,n:50,gl:10.8,toe:-6.0},
]};
const glPts = S.holes.map(h => ({e:h.e,n:h.n,v:h.gl}));
const rockPts = S.holes.filter(h => h.rl !== null).map(h => ({e:h.e,n:h.n,v:h.rl}));
const piles3 = () => S.piles;
let yaw = -.53;
let pitch = .83;

function idw(e,n,pts,k=4){const ds=pts.map(p=>({d:Math.hypot(p.e-e,p.n-n),v:p.v,p})).sort((a,b)=>a.d-b.d).slice(0,k);if(!ds.length)return null;
  if(ds[0].d<0.01)return {v:ds[0].v,dmin:ds[0].d,spread:0,near:ds[0].p};let sw=0,s=0;ds.forEach(x=>{const w=1/(x.d*x.d);sw+=w;s+=w*x.v});const vs=ds.slice(0,3).map(x=>x.v);
  return {v:s/sw,dmin:ds[0].d,spread:Math.max(...vs)-Math.min(...vs),near:ds[0].p}}

const stops=['--r5','--r4','--r3','--r2','--r1'],RGB=new Map();
function rgbOf(c){if(!RGB.has(c)){const x=document.createElement('canvas').getContext('2d');x.fillStyle=c;x.fillRect(0,0,1,1);const d=x.getImageData(0,0,1,1).data;RGB.set(c,[d[0],d[1],d[2]])}return RGB.get(c)}
function mixC(a,b,f){const A=rgbOf(a),B=rgbOf(b);return `rgb(${Math.round(A[0]*(1-f)+B[0]*f)},${Math.round(A[1]*(1-f)+B[1]*f)},${Math.round(A[2]*(1-f)+B[2]*f)})`}
function scaleRL(){const v=rockPts.map(p=>p.v);return v.length?[Math.min(...v),Math.max(...v)]:[0,1]}
function rlColor(rl,rng){if(rl==null)return css('--gfill');const [a,b]=rng||scaleRL(),t=Math.max(0,Math.min(1,(rl-a)/((b-a)||1)))*(stops.length-1),i=Math.min(stops.length-2,Math.floor(t));return mixC(css(stops[i]),css(stops[i+1]),t-i)}
function bounds(){const es=S.holes.map(h=>h.e).concat(S.piles.map(p=>p.e)),ns=S.holes.map(h=>h.n).concat(S.piles.map(p=>p.n));return {e0:Math.min(...es)-14,e1:Math.max(...es)+14,n0:Math.min(...ns)-14,n1:Math.max(...ns)+14}}

function draw3D(){const cv=$('#c3d');if(!cv||!cv.parentElement.clientWidth)return;const W=Math.max(230,cv.parentElement.clientWidth),H=Math.round(W*(W<550?.86:.56));cv.style.width=W+'px';cv.style.height=H+'px';cv.width=W*dpr;cv.height=H*dpr;const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0); ctx.textAlign='center'; ctx.textBaseline='middle';
  const b=bounds(),nx=26,ny=26,vex=+$('#vex').value,ec=(b.e0+b.e1)/2,nc=(b.n0+b.n1)/2,rng=scaleRL(),zs=S.holes.flatMap(h=>[h.gl,h.gl-h.end]),zc=(Math.max(...zs)+Math.min(...zs))/2;
  const gg=[],rr=[];for(let i=0;i<=nx;i++){gg.push([]);rr.push([]);for(let j=0;j<=ny;j++){const e=b.e0+(b.e1-b.e0)*i/nx,n=b.n0+(b.n1-b.n0)*j/ny,a=idw(e,n,glPts),c=idw(e,n,rockPts);gg[i].push(a&&a.dmin<=45?a.v:null);rr[i].push(c&&c.dmin<=45?c.v:null)}}
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),P=(e,n,z)=>{const x=e-ec,y=n-nc,zz=(z-zc)*vex,x1=x*cy-y*sy,y1=x*sy+y*cy;return {x:x1,y:zz*cp+y1*sp,d:y1*cp-zz*sp}};
  const quads=[],add=(grid,kind)=>{for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const v=[grid[i][j],grid[i+1][j],grid[i+1][j+1],grid[i][j+1]];if(v.some(t=>t==null))continue;const es=[b.e0+(b.e1-b.e0)*i/nx,b.e0+(b.e1-b.e0)*(i+1)/nx],ns=[b.n0+(b.n1-b.n0)*j/ny,b.n0+(b.n1-b.n0)*(j+1)/ny],pts=[P(es[0],ns[0],v[0]),P(es[1],ns[0],v[1]),P(es[1],ns[1],v[2]),P(es[0],ns[1],v[3])];quads.push({pts,d:pts.reduce((a,p)=>a+p.d,0)/4,kind,z:(v[0]+v[1]+v[2]+v[3])/4})}};const show=($('#show3')||{value:'both'}).value;if(show!=='rock')add(gg,'g');if(show!=='ground')add(rr,'r');
  const segs=[];S.holes.forEach(h=>segs.push({a:P(h.e,h.n,h.gl),b:P(h.e,h.n,h.gl-h.end),c:css('--muted'),w:1}));piles3().forEach(p=>segs.push({a:P(p.e,p.n,p.gl),b:P(p.e,p.n,p.toe),c:css('--accent'),w:3}));
  const all=[];quads.forEach(q=>all.push(...q.pts));segs.forEach(s=>all.push(s.a,s.b));if(!all.length)return;const x0=Math.min(...all.map(p=>p.x)),x1=Math.max(...all.map(p=>p.x)),y0=Math.min(...all.map(p=>p.y)),y1=Math.max(...all.map(p=>p.y)),k=Math.min((W-30)/(x1-x0||1),(H-30)/(y1-y0||1)),T=p=>[15+(p.x-x0)*k+((W-30)-(x1-x0)*k)/2,H-15-(p.y-y0)*k-((H-30)-(y1-y0)*k)/2];
  quads.sort((a,b)=>b.d-a.d);const gr=rgbOf(css('--g2'));quads.forEach(q=>{ctx.beginPath();q.pts.forEach((p,i)=>{const [x,y]=T(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();if(q.kind==='g'){ctx.fillStyle=`rgba(${gr[0]},${gr[1]},${gr[2]},.22)`;ctx.strokeStyle=`rgba(${gr[0]},${gr[1]},${gr[2]},.35)`}else{ctx.fillStyle=rlColor(q.z,rng);ctx.strokeStyle=css('--panel')}ctx.fill();ctx.lineWidth=.5;ctx.stroke()});
  segs.forEach(s=>{const [ax,ay]=T(s.a),[bx,by]=T(s.b);ctx.strokeStyle=s.c;ctx.lineWidth=s.w;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke()});
  for (const h of S.holes) {
    const [x,y] = T(P(h.e,h.n,h.rl ?? h.gl));
    const selected = h.hole === selector.value;
    const radius = selected ? 7 : 4.5;
    ctx.beginPath();
    if (h.rl === null) ctx.arc(x,y,radius,0,Math.PI*2);
    else {
      ctx.moveTo(x,y-radius);ctx.lineTo(x+radius,y);ctx.lineTo(x,y+radius);ctx.lineTo(x-radius,y);ctx.closePath();
    }
    const markerColor = h.rl === null ? '#b4c3da' : '#8fb8ff';
    ctx.fillStyle = markerColor;ctx.fill();
    ctx.strokeStyle='#0d1728';ctx.lineWidth=1.5;ctx.stroke();
    if (W > 490 || selected) {
      ctx.font = (selected ? '700 13px' : '600 11px') + ' system-ui';
      ctx.lineWidth=3.6;ctx.strokeStyle='#09101c';ctx.strokeText(h.hole,x,y-12);
      ctx.fillStyle=selected?'#ffffff':'#e4eeff';ctx.fillText(h.hole,x,y-12);
    }
  }
}


const canvas = $('#c3d');
let drag;
canvas.addEventListener('pointerdown', event => {
  drag = {x:event.clientX,y:event.clientY,yaw,pitch};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!drag) return;
  yaw = drag.yaw + (event.clientX - drag.x) * .01;
  pitch = Math.min(1.45, Math.max(.1, drag.pitch + (event.clientY - drag.y) * .01));
  draw3D();
});
canvas.addEventListener('lostpointercapture', () => { drag = null; });
root.querySelectorAll('[data-orbit]').forEach(button => button.addEventListener('click', () => {
  const move = Number(button.dataset.orbit);
  yaw = move ? yaw + move : -.53;
  if (!move) pitch = .83;
  draw3D();
}));
$('#show3').addEventListener('change',draw3D);
$('#vex').addEventListener('input', () => {
  $('#vexV').textContent = '×' + $('#vex').value;
  draw3D();
});
for (const hole of S.holes) selector.add(new Option(hole.hole,hole.hole));
function selectHole() {
  const h = S.holes[selector.selectedIndex];
  const metres = value => value.toFixed(1) + ' m';
  $('#demo-reading').textContent = h.hole + ' · E ' + metres(h.e) + ' · N ' + metres(h.n)
    + ' · 地面 ' + metres(h.gl) + ' · 石面 ' + (h.rl === null ? '待確定' : metres(h.rl));
  draw3D();
}
selector.addEventListener('change',selectHole);
new ResizeObserver(draw3D).observe(canvas.parentElement);
selectHole();
