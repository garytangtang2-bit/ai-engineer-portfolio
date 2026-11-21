// Project a folded ribbon into a 2D canvas. Each particle retains its resting position.
export function mountParticles(hero) {
  const canvas = hero.querySelector('canvas');
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const hint = hero.querySelector('.particle-hint');
  let width, height, fieldLeft, fieldWidth, fieldTop, fieldHeight, stars, sheen;
  let frame = 0, pointer = null, start = 0, visible = true, mode = 'idle', entryForce = 0;
  const duration = 480;

  function project(theta, latitude) {
    const spread=latitude*(.56+.18*Math.sin(theta-.7));
    const radial=1+spread*Math.cos(theta*2+.5);
    const px=Math.cos(theta)*radial, py=Math.sin(theta)*radial;
    const depth=spread*Math.sin(theta*2+.5)+.22*Math.sin(2*theta-.9);
    return {
      x:fieldLeft+(.5+.397*px)*fieldWidth,
      y:fieldTop+(.51+.64*(py*.38+depth*.83-px*.22))*fieldHeight
    };
  }

  function makeField() {
    let seed = 710572;
    const rand = () => ((seed = (Math.imul(1664525,seed) + 1013904223) >>> 0) / 4294967296);
    stars = [];
    const strands = width < 701 ? 42 : 64;
    const samples = width < 701 ? 34 : 42;
    for (let row = 0; row < strands; row++) {
      const latitude = row/(strands-1) - .5;
      for (let col = 0; col < samples; col++) {
        const theta = 2*Math.PI*(col+rand()*.92)/samples;
        const {x,y}=project(theta,latitude);
        const warm = .5+.5*Math.cos(theta+.6);
        const edge = Math.abs(latitude)*2;
        const strength = Math.min(1,.19+rand()*.42+edge**6*.41+(1+Math.sin(theta))*.10);
        stars.push({x,y,r:.58+rand()**3*(width<701?1.18:1.65),warm,a:strength,glint:rand()>.994});
      }
    }
    const dust = width < 701 ? 85 : 250;
    for (let i=0; i<dust; i++) {
      stars.push({x:rand()*width,y:rand()*height,r:.35+rand()*.7,warm:rand(),a:.12+rand()*.29,glint:false});
    }
  }

  function glow(context,x,y,r,color) {
    const bloom=context.createRadialGradient(x,y,0,x,y,r);
    bloom.addColorStop(0,color);bloom.addColorStop(1,'transparent');
    context.fillStyle=bloom;context.fillRect(x-r,y-r,r*2,r*2);
  }
  // Rasterize the fine backlit threads once per layout. Only the foreground grains move.
  function backlight() {
    sheen=document.createElement('canvas');sheen.width=canvas.width;sheen.height=canvas.height;
    const g=sheen.getContext('2d');
    g.setTransform(sheen.width/width,0,0,sheen.height/height,0,0);
    const gradient=g.createLinearGradient(fieldLeft,0,fieldLeft+fieldWidth,0);
    gradient.addColorStop(0,'#75c8fb');gradient.addColorStop(.35,'#b6e7ff');
    gradient.addColorStop(.61,'#deddd3');gradient.addColorStop(1,'#ffd28d');
    g.strokeStyle=gradient;
    for(let strand=0;strand<29;strand++) {
      const lat=strand/28-.5;
      g.globalAlpha=strand%7===0?.25:.072;
      g.lineWidth=strand%7===0?.88:.6;
      g.beginPath();
      for(let sample=0;sample<=210;sample++) {
        const {x,y}=project(sample/210*Math.PI*2,lat);
        if(sample===0) g.moveTo(x,y); else g.lineTo(x,y);
      }
      g.closePath();g.stroke();
    }
    g.globalAlpha=1;
    for(const [angle,lat,color] of [[2.82,.36,'150,219,255'],[5.23,-.35,'255,211,144']]) {
      const {x,y}=project(angle,lat);
      const r=Math.min(fieldWidth*.045,34);
      glow(g,x,y,r*1.9,'rgba('+color+',.17)');
      glow(g,x,y,r*.58,'rgba('+color+',.68)');
      g.fillStyle='#fff2d8';g.beginPath();g.arc(x,y,Math.max(1.5,r*.094),0,Math.PI*2);g.fill();
    }
  }
  function paint(now) {
    frame=0;
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(sheen,0,0,width,height);
    const t=Math.min(1,Math.max(0,(now-start)/duration));
    const force=!pointer || reduce.matches ? 0 : mode==='leave' ? entryForce*(1-t)**2 : mode==='tap' ? (1-t)**2 : 1-(1-t)**3;
    const radius=Math.max(82, Math.min(157,fieldWidth*.29));
    const colors=['#a9daff','#c5ecf7','#eef2df','#f3d9ad','#ffd297'];
    if (force) glow(ctx,pointer.x,pointer.y,radius*.75,'rgba(169,218,242,'+force*.13+')');
    for (const s of stars) {
      let x=s.x,y=s.y,boost=0;
      if (force) {
        const dx=x-pointer.x,dy=y-pointer.y,d=Math.hypot(dx,dy);
        if (d<radius) {
          boost=(1-d/radius)**1.6*force;
          const push=boost*radius*.46/Math.max(1,d);
          x+=dx*push-dy*push*.22;y+=dy*push+dx*push*.22;
        }
      }
      ctx.fillStyle=colors[Math.min(4,Math.floor(s.warm*5))];
      ctx.globalAlpha=Math.min(1,s.a+boost*.46);
      const r=s.r+boost*.7;
      ctx.fillRect(x-r*.5,y-r*.5,r*1.42,r*1.42);
      if (s.glint) {
        ctx.globalAlpha*=.54;ctx.fillRect(x-3.5*r,y-.32,7*r,.64);ctx.fillRect(x-.32,y-3.5*r,.64,7*r);
      }
    }
    ctx.globalAlpha=1;
    if (t<1 && pointer && !reduce.matches && visible && !document.hidden) frame=requestAnimationFrame(paint);
    else if (mode==='leave' || mode==='tap') {pointer=null;mode='idle';}
  }
  function redraw() {
    if (!frame && visible && !document.hidden) frame=requestAnimationFrame(paint);
  }
  function resize() {
    const box=hero.getBoundingClientRect();
    width=Math.round(box.width);height=Math.round(box.height);
    const narrow = width<=700;
    fieldWidth=narrow?Math.min(width*1.13,510):Math.min(width*.57,910);
    fieldHeight=narrow?Math.min(width*.47,228):Math.min(height*.81,440);
    fieldLeft=narrow?(width-fieldWidth)*.5:width*.71-fieldWidth*.5;
    fieldTop=narrow?height-fieldHeight-16:(height-fieldHeight)*.5-4;
    const scale=Math.min(devicePixelRatio||1,1.65);
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    ctx.setTransform(scale,0,0,scale,0,0);
    makeField();backlight();redraw();
  }
  function interact(event,touch=false) {
    if (!visible || reduce.matches || (event.pointerType==='touch' && !touch)) return;
    const box=canvas.getBoundingClientRect();
    if (mode!=='hover' || touch) start=performance.now();
    pointer={x:event.clientX-box.left,y:event.clientY-box.top};
    mode=touch?'tap':'hover';redraw();
  }
  hero.addEventListener('pointermove',event=>interact(event),{passive:true});
  hero.addEventListener('pointerdown',event=>{if (event.pointerType!=='mouse') interact(event,true);},{passive:true});
  hero.addEventListener('pointerleave',()=>{
    if (mode!=='hover') return;
    const now=performance.now();
    entryForce=1-(1-Math.min(1,(now-start)/duration))**3;
    start=now;mode='leave';redraw();
  });
  function preference() {pointer=null;mode='idle';hint.hidden=reduce.matches;redraw();}
  reduce.addEventListener('change',preference);
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;redraw();}).observe(hero);
  document.addEventListener('visibilitychange',redraw);
  resize();preference();
}
