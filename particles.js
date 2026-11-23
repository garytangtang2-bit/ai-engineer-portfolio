// Particle ribbon hero. The ribbons are made only of particles: tens of thousands of soft points spread along the
// folded orbit ribbon, with a gaussian-like cross-section (dense bright cores, sparse edges). Shape and glow come
// from particle density plus additive blending (WebGL2; Canvas 2D fallback at a reduced count).
//
// Physics (CPU, semi-implicit Euler; each frame advances by exactly the measured frame time in equal substeps of
// at most 1/60 s, so motion stays even at 60, 75, 120, 144 or 165 Hz) runs only on an ACTIVE SET: particles that are displaced
// or moving. Resting particles sit at home (ribbon position + ambient drift, computed in the vertex shader).
// - Cursor motion transfers momentum: particles in the radius are pulled toward the cursor's velocity plus a smooth,
//   low-frequency swirl field (wavelength ~120 px), divided by mass. Afterwards they glide on with inertia.
// - Air drag (linear + small quadratic) slows them over ~1 s.
// - Per particle: 250 ms after the cursor last touched it, a soft spring eases in over 0.5 s and brings it home
//   along a curved, slightly under-damped path (~2.5 s). Particles the cursor left behind return while it stirs
//   elsewhere.
// - Moving particles collide (uniform-grid spatial hash over the moving set, impulse response, restitution 0.7,
//   momentum-conserving, with positional correction).
// - Offsets have a soft limit: a stiffer spring beyond 220 px instead of a hard clamp.
// All arrays are allocated per layout; nothing is allocated per frame.
// Particles are stored in 16 random tiers, each sorted by home x, so the adaptive count drops whole tiers and the
// particles near the cursor sit in a few contiguous index runs: only those runs are uploaded each frame.
// Points are drawn as crisp anti-aliased discs (about one device pixel of edge) with a faint tight glow.
export function mountParticles(hero) {
  const canvas = hero.querySelector('canvas');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const hint = hero.querySelector('.particle-hint');
  const textColumn = hero.querySelector('.hero-type');
  const PALETTE = ['#4f86ff','#8fb8ff','#dce9ff','#f3f6fc','#c3ccda','#d9c39a'].map(h => [1,3,5].map(k => parseInt(h.slice(k,k+2),16)/255));

  // Physics tuning.
  const DT = 1/60, MAX_SUBSTEPS = 3;    // substep cap (stable: stiffest spring gives omega*h ~ 0.2); 3/60 s covers a 50 ms frame
  const DRAG = 3, DRAG2 = .0012;          // linear (1/s) and quadratic (1/px) air drag
  const HOME_W = 2.4;                       // return spring (rad/s); with the drag this gives zeta ~0.6-0.7, ~2.5 s
  const HOME_DELAY = .25, HOME_RAMP = .5;   // s untouched before the spring starts, and its fade-in
  const SOFT_LIMIT = 220, SOFT_K = 140;      // beyond this offset a stiffer spring takes over
  const RESTITUTION = .7;
  const COLL_SET_CAP = 5000, COLL_TEST_CAP = 70000, COLL_CELL = 6;
  const TIERS = 16, CHUNK = 64;              // count steps by whole tiers; dirty upload tracked per 64 particles

  let gl = null, ctx2d = null;
  try { gl = canvas.getContext('webgl2', {alpha:true, premultipliedAlpha:true, antialias:false, depth:false, stencil:false}); } catch (e) { gl = null; }
  if (!gl) { ctx2d = canvas.getContext('2d', {alpha:true}); if (!ctx2d) return; }

  let width = 0, height = 0, scale = 1, narrow = false, fine = false, fieldLeft, fieldWidth, fieldTop, fieldHeight, radius = 160;
  let MAX = 0, N = 0, NMIN = 0, NMAX = 0;
  // Per particle: home, static look, phase for the swirl field, physics state.
  let HX, HY, STAT, KP, CKP, SKP, INVM, RC, TT, ACT, AL, na = 0, DYN;
  // Static home grid (resting particles near the cursor) and the collision grid.
  let HG_CELL = 32, HG_W = 0, HG_H = 0, HG_START, HG_ITEMS, AG_START, AG_ITEMS, AG_CELL;
  let CG_W = 0, CG_H = 0, CG_START, CG_ITEMS, CSET, CCELL;
  let stars = [];
  let cue = new Float32Array([-1e4, -1e4, -1e4, -1e4]);   // scroll cue box: particles dim behind it
  let mask = null;                           // {from, to, box:[x0,y0,x1,y1]} in CSS px, or null
  let mask2d = null;
  let frame = 0, last = 0, visible = true, running = false, dirty = true, t0 = performance.now();
  let ptrX = 0, ptrY = 0, segX0 = 0, segY0 = 0, pending = false, tracking = false;
  let collisions = 0, collisionsTotal = 0;
  let REL, nrel = 0, CDIRTY, fullUpload = true, TIER = 1;   // released this frame, dirty chunks
  // Adaptive count: frame intervals over 2 s windows.
  const FT = new Float32Array(240); let ftN = 0, ftStart = 0, adjustments = 0;

  function project(theta, latitude, out) {
    const spread = latitude*(.74+.23*Math.sin(theta-.7));
    const radial = 1+spread*Math.cos(theta*2+.65);
    const qx = Math.cos(theta)*radial, qy = Math.sin(theta)*radial;
    const depth = spread*Math.sin(theta*2+.65)+.27*Math.sin(2*theta-.9);
    out[0] = fieldLeft+(.5+.407*qx)*fieldWidth;
    out[1] = fieldTop+(.51+.83*(qy*.36+depth*.83-qx*.25))*fieldHeight;
    out[2] = depth;
    return out;
  }

  // Cross-section of the ribbon as a mixture of bands: [centre latitude, sigma, weight, gold?].
  // Fine threads (old strands) weighted by the old strand brightness, brighter edge bands, the champagne band,
  // and a sparse body across the whole ribbon width.
  function bands() {
    const out = [];
    for (let s = 0; s < 57; s++) {
      const lat = s/56-.5;
      const lobe = Math.max(Math.exp(-((lat+.41)**2)/.005), Math.exp(-((lat-.34)**2)/.007));
      out.push([lat, .0028, .03 + lobe*.33 + (s%11 === 0 ? .14 : 0), false]);
    }
    for (const e of [-.46,-.32,.27,.49]) out.push([e, .011, .75, false]);
    out.push([-.35, .009, 1.05, true]);
    out.push([0, 0, 1.3, false]);            // sigma 0 = uniform body
    let sum = 0; for (const b of out) sum += b[2];
    let c = 0; for (const b of out) { c += b[2]/sum; b[4] = c; }
    return out;
  }

  function layout() {
    let seed = 710572;
    const rand = () => ((seed = (Math.imul(1664525,seed) + 1013904223) >>> 0) / 4294967296);
    const gauss = () => Math.sqrt(-2*Math.log(rand()+1e-9))*Math.cos(6.2831853*rand());
    // Points are ~1.5x (desktop) / ~1.3x (phone) the old size, so fewer are needed for the same light.
    // Low-DPR screens: the canvas is supersampled (see resize), so points shrink to ~1-2.6 CSS px and get brighter.
    // Big faint discs there blur into a grainy haze; small bright ones read as crisp points.
    const SIZE = (narrow ? 1.3 : 1.5)*(fine ? .62 : 1), ALPHA = (narrow ? .95 : .86)*(fine ? 2.3 : 1);
    if (gl) { NMAX = narrow ? 17600 : 72000; NMIN = narrow ? 6600 : 22500; }
    else { NMAX = NMIN = 6400; }
    if (!MAX || MAX !== NMAX) { MAX = NMAX; N = gl ? (narrow ? 13200 : 54000) : 6400; adjustments = 0; }
    TIER = MAX/TIERS;
    HX = new Float32Array(MAX); HY = new Float32Array(MAX); KP = new Float32Array(MAX); CKP = new Float32Array(MAX); SKP = new Float32Array(MAX);
    INVM = new Float32Array(MAX); RC = new Float32Array(MAX); TT = new Float32Array(MAX);
    ACT = new Uint8Array(MAX); AL = new Int32Array(MAX); na = 0;
    DYN = new Float32Array(MAX*4); REL = new Int32Array(MAX); nrel = 0;
    CDIRTY = new Uint8Array(Math.ceil(MAX/CHUNK)); fullUpload = true;
    STAT = new Float32Array(MAX*9);          // home x,y | size, alpha, phase, depth | r,g,b
    const B = bands(), p = [0,0,0];
    for (let i = 0; i < MAX; i++) {
      let x, y, depth, lat = 0, gold = false, theta = rand()*Math.PI*2;
      if (rand() < .015) {                   // background dust across the hero
        x = rand()*width; y = rand()*height; depth = rand()*.6;
      } else {
        const u = rand(); let b = B[B.length-1];
        for (const c of B) if (u <= c[4]) { b = c; break; }
        lat = b[1] ? b[0] + gauss()*b[1] : rand()-.5;
        gold = b[3];
        project(theta, lat, p); x = p[0]; y = p[1];
        depth = Math.min(1, Math.max(0, .5 + p[2]*.9));
      }
      const sparkle = rand() < .015;
      const diam = sparkle ? 4 + rand()*2 : 1.5 + 2*Math.pow(rand(), 2.6);
      const warm = .5+.5*Math.cos(theta+.6);
      // Icy blue dominates (#8fb8ff to #dce9ff), deeper blue in the shadowed side, silver accents; near-white only
      // for sparkles; champagne on its band plus a light scatter.
      const hue = warm*.45 + rand()*.55;
      const col = gold || rand() < .035 ? 5 : sparkle ? (rand() < .3 ? 3 : 2) : hue < .2 ? 0 : hue < .62 ? 1 : hue < .93 ? 2 : 4;
      const alpha = (sparkle ? .5 : .09 + rand()*.17) * (.6+.4*depth) * (lat ? 1 : 1.6);
      HX[i] = x; HY[i] = y;
      KP[i] = lat*7 + rand()*.35; CKP[i] = Math.cos(KP[i]); SKP[i] = Math.sin(KP[i]);
      const mass = (diam/2.2)**2 * (.8 + rand()*.4);   // physics keeps the unscaled size
      INVM[i] = 1/mass; RC[i] = Math.min(3, diam*.5*1.35);
      const o = i*9, c = PALETTE[col];
      STAT[o] = x; STAT[o+1] = y; STAT[o+2] = diam*(sparkle ? (fine ? .55 : .8) : SIZE)*(.85+.3*depth); STAT[o+3] = alpha*ALPHA; STAT[o+4] = rand()*6.2832; STAT[o+5] = depth;
      // (sparkles stay small so they read as points, not bubbles)
      STAT[o+6] = c[0]; STAT[o+7] = c[1]; STAT[o+8] = c[2];
    }
    // Density balance: where the projection folds the ribbon onto itself, thousands of particles stack in a few pixels.
    // There, ordinary particles get dimmer and slightly smaller (sparkles keep full strength), so the core stays
    // bright but grainy instead of merging into a solid line. Runs once per layout (WebGL path; 8k in 2D never stacks).
    if (gl) {
      const DC = 3, dw = Math.ceil(width/DC)+1, dh = Math.ceil(height/DC)+1, dens = new Uint16Array(dw*dh);
      const cell = i => Math.min(dh-1, Math.max(0, (HY[i]/DC)|0))*dw + Math.min(dw-1, Math.max(0, (HX[i]/DC)|0));
      for (let i = 0; i < MAX; i++) { const c = cell(i); if (dens[c] < 65535) dens[c]++; }
      const D0 = 6*(MAX/(width*height))/(120000/(1440*829));   // same threshold per unit of particle density
      for (let i = 0; i < MAX; i++) {
        const d = dens[cell(i)]; if (d <= D0) continue;
        const f = D0/d, o = i*9;
        if (STAT[o+2] < 4*SIZE) { STAT[o+3] *= Math.pow(f, .5); STAT[o+2] *= .8 + .2*f; }
        else STAT[o+3] *= Math.pow(f, .25);
      }
    }
    // Tiers: particle i (generated in random order) joins tier i % TIERS; inside a tier, sort by home x.
    {
      const order = new Uint32Array(MAX), key = new Float64Array(MAX);
      for (let i = 0; i < MAX; i++) { order[i] = i; key[i] = (i % TIERS)*1e7 + HX[i] + 2e5; }
      order.sort((a, b) => key[a] - key[b]);
      const perm = (A, k) => { const C = A.slice(); for (let j = 0; j < MAX; j++) for (let q = 0; q < k; q++) A[j*k+q] = C[order[j]*k+q]; };
      perm(HX, 1); perm(HY, 1); perm(KP, 1); perm(CKP, 1); perm(SKP, 1); perm(INVM, 1); perm(RC, 1); perm(STAT, 9);
    }
    // Highlight stars, dropped where they would sit behind the text block.
    stars = [[5.23,-.35,5,58,0],[2.82,.36,1,52,2.1],[.65,.38,3,24,4.2],[4.20,.24,2,22,1.3]]
      .map(([angle,lat,col,size,phase]) => { project(angle,lat,p); return [p[0],p[1],size,col,phase]; })
      .filter(s => !mask || s[0] < mask.box[0] || s[0] > mask.box[2] || s[1] < mask.box[1] || s[1] > mask.box[3]);
    // Grids.
    HG_W = Math.ceil(width/HG_CELL)+1; HG_H = Math.ceil(height/HG_CELL)+1;
    HG_START = new Int32Array(HG_W*HG_H+1); HG_ITEMS = new Int32Array(MAX);
    AG_START = new Int32Array(HG_W*HG_H+1); AG_ITEMS = new Int32Array(MAX); AG_CELL = new Int32Array(MAX);
    CG_W = Math.ceil(width/COLL_CELL)+3; CG_H = Math.ceil(height/COLL_CELL)+3;
    CG_START = new Int32Array(CG_W*CG_H+1); CG_ITEMS = new Int32Array(COLL_SET_CAP);
    CSET = new Int32Array(COLL_SET_CAP); CCELL = new Int32Array(COLL_SET_CAP);
    buildHomeGrid();
    if (gl) uploadStatic();
    dirty = true;
  }

  function buildHomeGrid() {
    HG_START.fill(0);
    for (let i = 0; i < N; i++) HG_START[homeCell(i)+1]++;
    for (let c = 0; c < HG_W*HG_H; c++) HG_START[c+1] += HG_START[c];
    // Second pass places items; HG_START[c] is used as a moving cursor, then restored.
    for (let i = 0; i < N; i++) { const c = homeCell(i); HG_ITEMS[HG_START[c]++] = i; }
    for (let c = HG_W*HG_H; c > 0; c--) HG_START[c] = HG_START[c-1];
    HG_START[0] = 0;
  }
  function buildActiveGrid() {
    AG_START.fill(0);
    for (let a = 0; a < na; a++) { const i = AL[a]; AG_CELL[a] = posCell(i); AG_START[AG_CELL[a]+1]++; }
    for (let c = 0; c < HG_W*HG_H; c++) AG_START[c+1] += AG_START[c];
    for (let a = 0; a < na; a++) AG_ITEMS[AG_START[AG_CELL[a]]++] = AL[a];
    for (let c = HG_W*HG_H; c > 0; c--) AG_START[c] = AG_START[c-1];
    AG_START[0] = 0;
  }
  function posCell(i) {
    const cx = Math.min(HG_W-1, Math.max(0, ((HX[i]+DYN[i*4])/HG_CELL)|0)), cy = Math.min(HG_H-1, Math.max(0, ((HY[i]+DYN[i*4+1])/HG_CELL)|0));
    return cy*HG_W+cx;
  }
  function homeCell(i) {
    const cx = Math.min(HG_W-1, Math.max(0, (HX[i]/HG_CELL)|0)), cy = Math.min(HG_H-1, Math.max(0, (HY[i]/HG_CELL)|0));
    return cy*HG_W+cx;
  }

  function setCount(n) {
    n = Math.max(NMIN, Math.min(NMAX, Math.round(n/TIER)*TIER));
    if (n === N) return;
    for (let a = 0; a < na; a++) { const i = AL[a]; if (i >= n) { ACT[i] = 0; DYN.fill(0, i*4, i*4+4); AL[a] = AL[--na]; a--; } }
    N = n; buildHomeGrid(); dirty = true; fullUpload = true;
  }

  // ---------- physics ----------
  function activate(i) { if (!ACT[i]) { ACT[i] = 1; AL[na++] = i; } }

  // Momentum transfer at one point of the cursor stroke.
  function pull(i, x, y, cx, cy, vcx, vcy, spd, G, t) {
    const dx = x-cx, dy = y-cy, d2 = dx*dx+dy*dy;
    if (d2 >= radius*radius) return;
    const fall = 1-Math.sqrt(d2)/radius, c = Math.min(.85, fall*fall*G*INVM[i]);
    if (c < .012 && !ACT[i]) return;         // the faint outer rim does not wake resting particles
    // Smooth swirl field (wavelength ~120 px), sampled on a 16 px lattice around the cursor and interpolated
    // bilinearly, then rotated by the particle's latitude phase (so neighbouring bands shear apart).
    const lx = Math.min(FW-1.001, Math.max(0, (x-FX0)/FIELD_STEP)), ly = Math.min(FW-1.001, Math.max(0, (y-FY0)/FIELD_STEP));
    const ix = lx|0, iy = ly|0, fx = lx-ix, fy = ly-iy, b = (iy*FW+ix)*2, b2 = b+FW*2;
    const w00 = (1-fx)*(1-fy), w10 = fx*(1-fy), w01 = (1-fx)*fy, w11 = fx*fy;
    const fc = FIELD[b]*w00 + FIELD[b+2]*w10 + FIELD[b2]*w01 + FIELD[b2+2]*w11;
    const fs = FIELD[b+1]*w00 + FIELD[b+3]*w10 + FIELD[b2+1]*w01 + FIELD[b2+3]*w11;
    const dc = fc*CKP[i] - fs*SKP[i], ds = fs*CKP[i] + fc*SKP[i];
    const o = i*4;
    DYN[o+2] += c*(.65*vcx + .45*spd*dc - DYN[o+2]);
    DYN[o+3] += c*(.65*vcy + .45*spd*ds - DYN[o+3]);
    TT[i] = t;
    activate(i);
  }

  const FIELD_STEP = 16, FIELD = new Float32Array(2*40*40);
  let FX0 = 0, FY0 = 0, FW = 0;
  function stir(cx, cy, vcx, vcy, spd, G, t) {
    FX0 = cx-radius-FIELD_STEP; FY0 = cy-radius-FIELD_STEP; FW = Math.min(40, Math.ceil((2*radius+2*FIELD_STEP)/FIELD_STEP)+1);
    for (let gy = 0; gy < FW; gy++) for (let gx = 0; gx < FW; gx++) {
      const x = FX0+gx*FIELD_STEP, y = FY0+gy*FIELD_STEP;
      const ang = 1.1*Math.sin(x*.05+t*1.1+.8*Math.sin(y*.035)) + 1.1*Math.cos(y*.05-t*.8+.8*Math.sin(x*.03));
      FIELD[(gy*FW+gx)*2] = Math.cos(ang); FIELD[(gy*FW+gx)*2+1] = Math.sin(ang);
    }
    // Resting particles: found through the static home grid.
    const x0 = Math.max(0, ((cx-radius)/HG_CELL)|0), x1 = Math.min(HG_W-1, ((cx+radius)/HG_CELL)|0);
    const y0 = Math.max(0, ((cy-radius)/HG_CELL)|0), y1 = Math.min(HG_H-1, ((cy+radius)/HG_CELL)|0);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const c = gy*HG_W+gx;
      for (let k = HG_START[c], e = HG_START[c+1]; k < e; k++) { const i = HG_ITEMS[k]; if (!ACT[i]) pull(i, HX[i], HY[i], cx, cy, vcx, vcy, spd, G, t); }
    }
    // Particles already in motion: found through the active grid (built once per frame from current positions).
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const c = gy*HG_W+gx;
      for (let k = AG_START[c], e = AG_START[c+1]; k < e; k++) { const i = AG_ITEMS[k], o = i*4; pull(i, HX[i]+DYN[o], HY[i]+DYN[o+1], cx, cy, vcx, vcy, spd, G, t); }
    }
  }

  function step(t, h) {
    for (let a = 0; a < na; a++) {
      const i = AL[a], o = i*4;
      let ox = DYN[o], oy = DYN[o+1], vx = DYN[o+2], vy = DYN[o+3];
      const u = Math.min(1, Math.max(0, (t-TT[i]-HOME_DELAY)/HOME_RAMP)), s = u*u*(3-2*u);
      const sp = Math.sqrt(vx*vx+vy*vy), drag = DRAG + DRAG2*sp, k = s*HOME_W*HOME_W;
      let ax = -drag*vx - k*ox, ay = -drag*vy - k*oy;
      const o2 = ox*ox+oy*oy;
      if (o2 > SOFT_LIMIT*SOFT_LIMIT) { const d = Math.sqrt(o2), f = SOFT_K*(d-SOFT_LIMIT)/d; ax -= f*ox; ay -= f*oy; }
      vx += ax*h; vy += ay*h; ox += vx*h; oy += vy*h;   // semi-implicit Euler
      if (s >= 1 && ox*ox+oy*oy < .25 && vx*vx+vy*vy < 1) {   // within half a pixel: snap home
        DYN[o] = DYN[o+1] = DYN[o+2] = DYN[o+3] = 0; ACT[i] = 0; AL[a] = AL[--na]; a--; REL[nrel++] = i;
        continue;
      }
      DYN[o] = ox; DYN[o+1] = oy; DYN[o+2] = vx; DYN[o+3] = vy;
    }
  }

  // Impulse response between two particles; conserves linear momentum.
  function collide(i, j) {
    const oi = i*4, oj = j*4;
    const dx = HX[j]+DYN[oj]-HX[i]-DYN[oi], dy = HY[j]+DYN[oj+1]-HY[i]-DYN[oi+1];
    const rr = RC[i]+RC[j], d2 = dx*dx+dy*dy;
    if (d2 >= rr*rr || d2 < 1e-6) return false;
    const d = Math.sqrt(d2), nx = dx/d, ny = dy/d, wi = INVM[i], wj = INVM[j], w = wi+wj;
    const corr = (rr-d)*.8/w;                // push apart, mass-weighted
    DYN[oi] -= nx*corr*wi; DYN[oi+1] -= ny*corr*wi; DYN[oj] += nx*corr*wj; DYN[oj+1] += ny*corr*wj;
    const vrel = (DYN[oj+2]-DYN[oi+2])*nx + (DYN[oj+3]-DYN[oi+3])*ny;
    if (vrel >= 0) return false;
    const J = -(1+RESTITUTION)*vrel/w;
    DYN[oi+2] -= J*wi*nx; DYN[oi+3] -= J*wi*ny; DYN[oj+2] += J*wj*nx; DYN[oj+3] += J*wj*ny;
    return true;
  }

  let collRot = 0;
  function collideAll() {
    // Collision set: clearly moving particles (|v| > 60 px/s), capped; the start rotates so every particle gets turns.
    // Slow particles easing home skip collisions, so overlapping home positions never jitter.
    let m = 0;
    const start = na ? collRot % na : 0;
    for (let k = 0; k < na && m < COLL_SET_CAP; k++) {
      const i = AL[(start+k) % na], o = i*4;
      if (DYN[o+2]*DYN[o+2]+DYN[o+3]*DYN[o+3] > 3600) CSET[m++] = i;
    }
    collRot += 997;
    if (m < 2) return;
    CG_START.fill(0);
    for (let k = 0; k < m; k++) {
      const i = CSET[k], o = i*4;
      const cx = Math.min(CG_W-1, Math.max(0, ((HX[i]+DYN[o])/COLL_CELL+1)|0)), cy = Math.min(CG_H-1, Math.max(0, ((HY[i]+DYN[o+1])/COLL_CELL+1)|0));
      CCELL[k] = cy*CG_W+cx; CG_START[CCELL[k]+1]++;
    }
    for (let c = 0; c < CG_W*CG_H; c++) CG_START[c+1] += CG_START[c];
    for (let k = 0; k < m; k++) CG_ITEMS[CG_START[CCELL[k]]++] = k;
    for (let c = CG_W*CG_H; c > 0; c--) CG_START[c] = CG_START[c-1];
    CG_START[0] = 0;
    let tests = 0;
    for (let k = 0; k < m && tests < COLL_TEST_CAP; k++) {
      const i = CSET[k], c = CCELL[k], cx = c % CG_W, cy = (c/CG_W)|0;
      for (let gy = Math.max(0, cy-1); gy <= Math.min(CG_H-1, cy+1); gy++) for (let gx = Math.max(0, cx-1); gx <= Math.min(CG_W-1, cx+1); gx++) {
        const g = gy*CG_W+gx;
        for (let q = CG_START[g], e = CG_START[g+1]; q < e; q++) {
          const kk = CG_ITEMS[q];
          if (kk <= k) continue;             // each pair once
          tests++;
          if (collide(i, CSET[kk])) collisions++;
        }
      }
    }
  }

  // ---------- WebGL2 renderer ----------
  let prog, vao, starVao, bufStatic, bufDyn, bufStar, U = {}, maxPoint = 64;
  // HDR path: particles accumulate in a half-float target, then a tone-map pass compresses the brightest cores
  // (hue-preserving, log-like shoulder) so dense folds stay grainy instead of clipping to a flat white line.
  let hdr = false, toneProg, toneU = {}, fbo = null, fboTex = null, fboW = 0, fboH = 0;
  const TONE_VS = `#version 300 es
  void main() { vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); gl_Position = vec4(p*2.-1., 0., 1.); }`;
  const TONE_FS = `#version 300 es
  precision highp float;
  uniform sampler2D uTex; out vec4 o;
  void main() {
    vec4 c = texelFetch(uTex, ivec2(gl_FragCoord.xy), 0);
    float m = max(max(c.r, c.g), c.b);
    // Linear up to the knee; above it a logarithmic shoulder that keeps ratios (grain) visible and never reaches 1
    // before ~48x the knee.
    float k = .55, tm = m <= k ? m : k + (1.-k)*min(1., log(m/k)/log(48.));
    vec3 rgb = m > 0. ? c.rgb*(tm/m) : vec3(0.);
    float a = max(tm, min(1., 1.-exp(-c.a)));
    o = vec4(rgb, a);
  }`;
  const VS = `#version 300 es
  layout(location=0) in vec2 aHome; layout(location=1) in vec4 aProp; layout(location=2) in vec3 aCol; layout(location=3) in vec4 aDyn;
  uniform vec2 uRes; uniform float uScale, uTime, uMotion, uMaxPt, uStar, uMaskOn; uniform vec4 uBox, uCue; uniform vec2 uGrad;
  out vec3 vCol; out float vA, vLen, vR, vPt; out vec2 vDir;
  void main() {
    float ph = aProp.z, depth = aProp.w;
    vec2 drift = uMotion*uStar*0. + uMotion*(1.-uStar)*vec2(sin(uTime*.55+ph)*.9, cos(uTime*.47+ph)*.7)*depth;
    vec2 p = aHome + drift + aDyn.xy;
    vec2 v = aDyn.zw*uMotion; float sp = length(v);
    float boost = min(1., sp/520.);
    float r = aProp.x*.5*(1.+boost*.25);
    if (uStar > .5) r *= 1. + .06*uMotion*sin(uTime*1.3+ph);
    float L = sp > 260. ? min(5., (sp-260.)*.01) : 0.;   // short streak, fast particles only
    vDir = sp > .001 ? v/sp : vec2(1., 0.); vLen = L; vR = r;
    float pt = min(uMaxPt/uScale, (uStar > .5 ? r*2. + 2. : r*2.8 + 2./uScale) + L);
    vPt = pt; gl_PointSize = pt*uScale;
    float tw = uStar > .5 ? 1. : mix(1., .78+.22*sin(uTime*(1.1+depth*1.7)+ph*3.), uMotion);
    float a = min(1., aProp.y*tw + boost*.25);
    float keep = 1.;
    if (uMaskOn > .5) {
      float f = clamp((p.x-uGrad.x)/max(1., uGrad.y-uGrad.x), 0., 1.);
      float g = f < .5 ? mix(.6, .22, f*2.) : mix(.22, 0., f*2.-1.);
      vec2 q = max(vec2(0.), max(uBox.xy-p, p-uBox.zw));
      float b = .45*(1.-smoothstep(0., 36., length(q)));
      keep = (1.-g)*(1.-b);
    }
    vec2 qc = max(vec2(0.), max(uCue.xy-p, p-uCue.zw));
    keep *= 1. - .7*(1.-smoothstep(0., 28., length(qc)));
    vA = a*keep; vCol = aCol;
    gl_Position = vec4(p.x/uRes.x*2.-1., 1.-p.y/uRes.y*2., 0., 1.);
  }`;
  const FS = `#version 300 es
  precision highp float;
  in vec3 vCol; in float vA, vLen, vR, vPt; in vec2 vDir; uniform float uStar, uScale; out vec4 o;
  void main() {
    vec2 q = (gl_PointCoord-.5)*vPt;
    vec2 d = q - vDir*clamp(dot(q, vDir), -vLen*.5, vLen*.5);
    float d2 = dot(d, d)/(vR*vR);
    float a;
    if (uStar > .5) a = exp(-d2*90.) + .32*exp(-d2*9.) + .1*exp(-d2*2.2);
    else {
      // Crisp disc: anti-aliased edge one device pixel wide, plus a faint glow that fades out within ~1.4 radii.
      float e = .5/uScale, dd = sqrt(dot(d, d));
      a = (1. - smoothstep(vR - e, vR + e, dd))*(1. - .3*min(1., dd/vR)) + .03*exp(-d2*2.5);   // slightly brighter centre
      a *= vLen > 0. ? vR*2./(vR*2.+vLen*.5) : 1.;
    }
    a *= vA;
    if (a < .003) discard;
    o = vec4(vCol*a, a);
  }`;

  function initGL() {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    for (const n of ['uRes','uScale','uTime','uMotion','uMaxPt','uStar','uMaskOn','uBox','uCue','uGrad']) U[n] = gl.getUniformLocation(prog, n);
    maxPoint = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64;
    bufStatic = gl.createBuffer(); bufDyn = gl.createBuffer(); bufStar = gl.createBuffer();
    const staticAttribs = buf => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 36, 8);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 36, 24);
    };
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    staticAttribs(bufStatic);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufDyn); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 16, 0);
    starVao = gl.createVertexArray(); gl.bindVertexArray(starVao);
    staticAttribs(bufStar);
    gl.disableVertexAttribArray(3);
    gl.bindVertexArray(null);
    hdr = !!gl.getExtension('EXT_color_buffer_float');
    if (hdr) {
      toneProg = gl.createProgram();
      gl.attachShader(toneProg, sh(gl.VERTEX_SHADER, TONE_VS)); gl.attachShader(toneProg, sh(gl.FRAGMENT_SHADER, TONE_FS));
      gl.linkProgram(toneProg);
      if (!gl.getProgramParameter(toneProg, gl.LINK_STATUS)) hdr = false;
      else toneU.uTex = gl.getUniformLocation(toneProg, 'uTex');
    }
    fbo = fboTex = null; fboW = fboH = 0;
  }

  function ensureTarget() {
    if (!hdr) return false;
    if (fbo && fboW === canvas.width && fboH === canvas.height) return true;
    if (fboTex) gl.deleteTexture(fboTex);
    if (!fbo) fbo = gl.createFramebuffer();
    fboTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fboTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, canvas.width, canvas.height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) { hdr = false; return false; }
    fboW = canvas.width; fboH = canvas.height;
    return true;
  }

  function uploadStatic() {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufStatic); gl.bufferData(gl.ARRAY_BUFFER, STAT, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufDyn); gl.bufferData(gl.ARRAY_BUFFER, DYN.byteLength, gl.DYNAMIC_DRAW);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, DYN);
    const S = new Float32Array(stars.length*9);
    stars.forEach(([x,y,size,col,phase], k) => { const c = PALETTE[col]; S.set([x, y, size, .95, phase, 1, c[0], c[1], c[2]], k*9); });
    gl.bindBuffer(gl.ARRAY_BUFFER, bufStar); gl.bufferData(gl.ARRAY_BUFFER, S, gl.STATIC_DRAW);
  }

  // Upload only the chunks touched this frame (active particles plus those that just snapped home), merged into runs.
  function uploadDyn() {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufDyn);
    if (fullUpload) { gl.bufferSubData(gl.ARRAY_BUFFER, 0, DYN, 0, N*4); fullUpload = false; nrel = 0; return; }
    const nc = Math.ceil(N/CHUNK);
    for (let a = 0; a < na; a++) CDIRTY[(AL[a]/CHUNK)|0] = 1;
    for (let k = 0; k < nrel; k++) CDIRTY[(REL[k]/CHUNK)|0] = 1;
    nrel = 0;
    for (let c = 0; c < nc; c++) {
      if (!CDIRTY[c]) continue;
      let e = c, gap = 0;
      for (let k = c+1; k < nc && gap <= 4; k++) { if (CDIRTY[k]) { e = k; gap = 0; } else gap++; }   // bridge small gaps
      const i0 = c*CHUNK, i1 = Math.min(N, (e+1)*CHUNK);
      gl.bufferSubData(gl.ARRAY_BUFFER, i0*16, DYN, i0*4, (i1-i0)*4);
      CDIRTY.fill(0, c, e+1); c = e;
    }
  }

  function drawGL(t, still) {
    const useHdr = ensureTarget();
    gl.bindFramebuffer(gl.FRAMEBUFFER, useHdr ? fbo : null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(prog);
    gl.uniform2f(U.uRes, width, height); gl.uniform1f(U.uScale, scale); gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uMotion, still ? 0 : 1); gl.uniform1f(U.uMaxPt, maxPoint);
    gl.uniform1f(U.uMaskOn, mask ? 1 : 0);
    if (mask) { gl.uniform4f(U.uBox, mask.box[0], mask.box[1], mask.box[2], mask.box[3]); gl.uniform2f(U.uGrad, mask.from, mask.to); }
    gl.uniform4f(U.uCue, cue[0], cue[1], cue[2], cue[3]);
    if (dirty) uploadDyn();
    gl.uniform1f(U.uStar, 0); gl.bindVertexArray(vao); gl.drawArrays(gl.POINTS, 0, N);
    if (stars.length) { gl.uniform1f(U.uStar, 1); gl.bindVertexArray(starVao); gl.vertexAttrib4f(3, 0, 0, 0, 0); gl.drawArrays(gl.POINTS, 0, stars.length); }
    gl.bindVertexArray(null);
    if (useHdr) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.BLEND);
      gl.useProgram(toneProg);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fboTex); gl.uniform1i(toneU.uTex, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  // ---------- Canvas 2D fallback ----------
  function draw2D(t, still) {
    const c = ctx2d;
    c.setTransform(canvas.width/width, 0, 0, canvas.height/height, 0, 0);
    c.clearRect(0, 0, width, height);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const s = i*9, o = i*4, depth = STAT[s+5], ph = STAT[s+4];
      const x = HX[i] + (still ? 0 : Math.sin(t*.55+ph)*.9*depth) + DYN[o], y = HY[i] + (still ? 0 : Math.cos(t*.47+ph)*.7*depth) + DYN[o+1];
      const vx = still ? 0 : DYN[o+2], vy = still ? 0 : DYN[o+3], sp = Math.sqrt(vx*vx+vy*vy), boost = Math.min(1, sp/520);
      const a = Math.min(1, STAT[s+3]*(still ? 1 : .78+.22*Math.sin(t*(1.1+depth*1.7)+ph*3)) + boost*.25);
      const r = STAT[s+2]*.5*(1+boost*.25);
      c.globalAlpha = Math.min(1, a*2.6);   // ~1/12 of the WebGL count, so each point carries more light
      c.fillStyle = c.strokeStyle = `rgb(${STAT[s+6]*255|0},${STAT[s+7]*255|0},${STAT[s+8]*255|0})`;
      if (sp > 260) { const len = Math.min(5, (sp-260)*.01)/sp; c.lineWidth = r*1.4; c.beginPath(); c.moveTo(x-vx*len, y-vy*len); c.lineTo(x, y); c.stroke(); }
      else { c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }
    }
    for (const [x, y, size, col] of stars) {
      const g = c.createRadialGradient(x, y, 0, x, y, size), rgb = PALETTE[col].map(v => v*255|0).join(',');
      g.addColorStop(0, '#fff'); g.addColorStop(.08, `rgba(${rgb},.9)`); g.addColorStop(.35, `rgba(${rgb},.15)`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.globalAlpha = .9; c.fillStyle = g; c.fillRect(x-size, y-size, size*2, size*2);
    }
    c.globalCompositeOperation = 'source-over';
    if (mask2d) { c.globalAlpha = 1; c.globalCompositeOperation = 'destination-out'; c.drawImage(mask2d, 0, 0, width, height); c.globalCompositeOperation = 'source-over'; }
    c.globalAlpha = 1;
  }

  // ---------- frame loop ----------
  // Start at a default count; over the first seconds step up toward the max while p95 stays within budget, or down
  // when it does not. Afterwards keep watching: a 2 s window over budget (e.g. while stirring) steps down again.
  let downs = 0;
  function adapt(now, interval) {
    if (!gl || downs >= 4) return;
    if (!ftStart) { ftStart = now; ftN = 0; return; }
    if (ftN < FT.length && interval < 100) FT[ftN++] = interval;   // ignore one-off stalls (tab switches, page work)
    if (now - ftStart < 2000) return;
    FT.subarray(0, ftN).sort();
    const p95 = FT[Math.floor(ftN*.95)] || 0;
    if (p95 > 18 && N > NMIN) { setCount(N*(adjustments < 4 ? .72 : .85)); downs++; adjustments = 4; }
    else if (adjustments < 4) { if (p95 < 17.4 && N < NMAX) { setCount(N*1.2); adjustments++; } else adjustments = 4; }
    ftStart = now; ftN = 0;
  }

  function paint(now) {
    frame = 0;
    const still = reduce.matches;
    const interval = last ? now-last : 16.7;
    const dts = Math.min(.05, interval/1000);
    last = now;
    const t = (now-t0)/1000;
    if (!still) {
      adapt(now, interval);
      if (pending) {
        const mx = ptrX-segX0, my = ptrY-segY0, len = Math.hypot(mx, my);
        if (len > .5) {
          const f = Math.min(1, 2400/(len/Math.max(dts, .008)));
          const vcx = mx/Math.max(dts, .008)*f, vcy = my/Math.max(dts, .008)*f, spd = Math.hypot(vcx, vcy);
          const steps = Math.min(6, Math.max(1, Math.ceil(len/(radius*.45))));
          buildActiveGrid();
          for (let s = 1; s <= steps; s++) stir(segX0+mx*s/steps, segY0+my*s/steps, vcx, vcy, spd, .42/Math.sqrt(steps), t);
        }
        segX0 = ptrX; segY0 = ptrY; pending = false;
      }
      const hadActive = na > 0;
      if (na) {   // advance by exactly this frame's time, in equal substeps of at most DT
        const n = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(dts/DT - 1e-6))), h = Math.min(dts, MAX_SUBSTEPS*DT)/n;
        for (let k = 0; k < n; k++) step(t, h);
      }
      if (na) collideAll();
      if (hadActive || na) dirty = true;
    }
    if (gl) drawGL(t, still); else draw2D(t, still);
    dirty = false;
    if (running && !still) frame = requestAnimationFrame(paint);
  }

  function setRunning() {
    const should = visible && !document.hidden && !reduce.matches;
    if (should && !running) { running = true; last = 0; if (!frame) frame = requestAnimationFrame(paint); }
    else if (!should && running) { running = false; if (frame) cancelAnimationFrame(frame); frame = 0; }
    if (!should && visible && !frame) frame = requestAnimationFrame(paint); // one static frame
  }

  function buildMask(box) {
    mask = null; mask2d = null;
    const cueEl = hero.parentElement && hero.parentElement.querySelector('.scroll-cue');
    if (cueEl) { const r = cueEl.getBoundingClientRect(); cue[0] = r.left-box.left-10; cue[1] = r.top-box.top-6; cue[2] = r.right-box.left+10; cue[3] = r.bottom-box.top+6; }
    if (width <= 700 || !textColumn) return;
    const tb = textColumn.getBoundingClientRect(), pad = 24;
    const right = tb.right-box.left;
    mask = {from: Math.max(0, right - width*.05), to: Math.min(width, right + width*.1),
      box: [tb.left-box.left-pad, tb.top-box.top-pad, tb.right-box.left+pad, tb.bottom-box.top+pad]};
    if (gl) return;
    const m = document.createElement('canvas'); m.width = canvas.width; m.height = canvas.height;
    const g = m.getContext('2d');
    g.setTransform(m.width/width,0,0,m.height/height,0,0);
    const grad = g.createLinearGradient(0,0,width,0), from = mask.from/width, to = mask.to/width;
    grad.addColorStop(0,'rgba(0,0,0,.6)'); grad.addColorStop(from,'rgba(0,0,0,.6)');
    grad.addColorStop(from+(to-from)*.5,'rgba(0,0,0,.22)'); grad.addColorStop(to,'rgba(0,0,0,0)'); grad.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0,0,width,height);
    const [x0, y0, x1, y1] = mask.box, shift = width+400;
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 36; g.shadowOffsetX = shift*m.width/width;
    g.fillStyle = '#000'; g.fillRect(x0-shift, y0, x1-x0, y1-y0);
    mask2d = m;
  }

  function resize() {
    const box = hero.getBoundingClientRect();
    const w = Math.round(box.width), h = Math.round(box.height);
    if (w === width && h === height && HX) return;
    width = w; height = h;
    narrow = width <= 700;
    fieldWidth = narrow ? Math.min(width*1.1,560) : Math.min(width*.61,1000);
    fieldHeight = narrow ? Math.min(width*.61,284) : Math.min(height*.89,510);
    // Desktop: composition centred at ~59% of the width, so the ribbons sweep in behind the headline's right side.
    fieldLeft = narrow ? (width-fieldWidth)*.5 : width*.595-fieldWidth*.5;
    fieldTop = narrow ? height-fieldHeight-12 : (height-fieldHeight)*.5-5;
    radius = narrow ? 110 : Math.max(140, Math.min(180, fieldWidth*.2));
    const dpr = devicePixelRatio||1;
    // WebGL renders at 2x even on 1x screens (capped near 6.2 M device px) and the browser downsamples: round, sub-pixel dots.
    scale = gl ? Math.max(Math.min(dpr, 2), Math.min(2, Math.sqrt(6.2e6/Math.max(1, width*height)))) : Math.min(dpr, width > 1100 ? 1.5 : 2);
    fine = !!gl && dpr < 1.75;
    canvas.width = Math.max(1,Math.round(width*scale)); canvas.height = Math.max(1,Math.round(height*scale));
    buildMask(box);
    layout();
    if (!running && !frame) frame = requestAnimationFrame(paint);
  }

  function locate(event) {
    const box = canvas.getBoundingClientRect();
    return [event.clientX-box.left, event.clientY-box.top];
  }
  function move(event) {
    if (reduce.matches) return;
    if (event.pointerType !== 'mouse' && !tracking) return;   // touch: only while the finger is down
    const [x, y] = locate(event);
    if (!pending) { segX0 = tracking ? ptrX : x; segY0 = tracking ? ptrY : y; }
    ptrX = x; ptrY = y; tracking = pending = true;
  }
  function down(event) {
    if (reduce.matches) return;
    const [x, y] = locate(event);
    ptrX = segX0 = x; ptrY = segY0 = y; tracking = true; pending = false;
  }
  function up(event) { if (event.pointerType !== 'mouse' || event.type === 'pointerleave') { tracking = false; pending = false; } }
  hero.addEventListener('pointermove', move, {passive:true});
  hero.addEventListener('pointerdown', down, {passive:true});
  hero.addEventListener('pointerup', up, {passive:true});
  hero.addEventListener('pointercancel', up, {passive:true});
  hero.addEventListener('pointerleave', up, {passive:true});

  if (gl) {
    try { initGL(); } catch (e) { console.warn('particles: WebGL2 setup failed', e); return; }
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); running = false; if (frame) cancelAnimationFrame(frame); frame = 0; });
    canvas.addEventListener('webglcontextrestored', () => { initGL(); uploadStatic(); dirty = true; setRunning(); });
  }
  function preference() { tracking = pending = false; if (hint) hint.hidden = reduce.matches; setRunning(); }
  reduce.addEventListener('change', preference);
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; setRunning(); }).observe(hero);
  document.addEventListener('visibilitychange', setRunning);
  resize(); preference();
}
