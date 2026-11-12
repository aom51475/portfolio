// ตัวควบคุมฉากสามมิติ: ตัววาดภาพ ระดับคุณภาพตามความแรงของเครื่อง การเดินด้วยล้อเมาส์ นิ้ว และคีย์บอร์ด
// การกดเลือกรูปหรือแผ่นป้าย SOP และตัวหนังสือที่ลอยทับฉาก
import * as THREE from 'three';
import { ROOMS, CAPS, K, KP, BOUNDS, PACE, INTRO_T, BENCH_T, END_T, SOP_ZONE } from './data.js';
import { createWorld, zoneAt } from './world.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const tick = () => new Promise(r => setTimeout(r, 0));

// เส้นทางกล้องแบบโค้งต่อเนื่อง (Hermite) ผ่านจุดควบคุมทุกจุด คืนค่าตำแหน่งกล้อง 3 ค่า และจุดที่มอง 3 ค่า
function makePath(keys) {
  const n = keys.length, T = keys.map(k => k[0]), P = keys.map(k => [...k[1], ...k[2]]);
  // ความชันช่วงต่อช่วง แล้วจำกัดความชันที่แต่ละจุด เพื่อไม่ให้โค้งเหวี่ยงเลยจุดควบคุมออกไปชนผนัง
  const D = [];
  for (let i = 0; i < n - 1; i++) D.push(P[i].map((_, j) => (P[i + 1][j] - P[i][j]) / (T[i + 1] - T[i])));
  const Mt = P.map((p, i) => p.map((_, j) => {
    if (i === 0) return D[0][j];
    if (i === n - 1) return D[n - 2][j];
    const a = D[i - 1][j], b = D[i][j];
    if (a * b <= 0) return 0;
    const m = (P[i + 1][j] - P[i - 1][j]) / (T[i + 1] - T[i - 1]);
    return Math.sign(m) * Math.min(Math.abs(m), 3 * Math.min(Math.abs(a), Math.abs(b)));
  }));
  return (t, out) => {
    t = clamp(t, 0, 1);
    let i = 0;
    while (i < n - 2 && t > T[i + 1]) i++;
    const h = T[i + 1] - T[i], s = (t - T[i]) / h, s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    for (let j = 0; j < 6; j++) out[j] = h00 * P[i][j] + h10 * h * Mt[i][j] + h01 * P[i + 1][j] + h11 * h * Mt[i + 1][j];
    return out;
  };
}

export async function start({ arts, viewer, reader, showPlain, forceQ, onProgress }) {
  // หน้าดูรูปหรือหน้าอ่าน SOP เปิดอยู่ ระหว่างนี้กล้องต้องไม่ขยับ
  const busy = () => viewer.isOpen() || reader.isOpen();
  const $ = id => document.getElementById(id);
  const canvas = $('c');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- ระดับคุณภาพ ----------
  // 3 = เครื่องคอม (พื้นสะท้อน + แสงฟุ้ง), 2 = พื้นสะท้อนอย่างเดียว, 1 = มือถือทั่วไป (พื้นสะท้อนแบบหยาบ), 0 = เครื่องช้า
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  let tier = forceQ != null ? forceQ : (mem <= 2 || cores <= 2) ? 0 : (coarse && Math.min(screen.width, screen.height) < 900) ? 1 : 3;
  const PR = [1.25, 1.5, 2, 2];
  let scale = 1, dead = false, paused = false, started = false;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier > 0, powerPreference: 'high-performance', stencil: false });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;      // เงาคำนวณครั้งเดียว ไม่กินแรงเครื่องทุกเฟรม
  const camera = new THREE.PerspectiveCamera(55, 1, .15, 620);

  // ---------- โหลดและสร้างฉาก ----------
  // หน้าแรกรอเฉพาะรูปของห้องแรกๆ รูปของห้องที่ยังเดินไม่ถึงโหลดทีหลัง (ดู EAGER_ZONE กับ loadRest ใน world.js)
  let pBuild = 0, pImg = 0;
  const report = () => onProgress(.1 + .56 * pBuild + .3 * pImg);
  report();
  const world = await createWorld({
    renderer, tier, arts,
    onImage: (n, total) => { pImg = Math.max(pImg, Math.min(1, n / Math.max(total, 6))); report(); },
    step: async p => { pBuild = p; report(); await tick(); },
  });
  pBuild = 1; report();
  await Promise.race([world.firstImages, new Promise(r => setTimeout(r, 15000))]);
  pImg = 1; report();

  // ---------- ขนาดจอและมุมกล้อง ----------
  const pathL = makePath(K), pathP = makePath(KP);
  let W = 1, Hh = 1, portrait = false, path = pathL, snap = true, composer = null;
  function resize() {
    W = canvas.clientWidth || innerWidth; Hh = canvas.clientHeight || innerHeight;
    const pr = Math.min(devicePixelRatio || 1, PR[tier]) * scale;
    renderer.setPixelRatio(pr);
    renderer.setSize(W, Hh, false);
    if (composer) { composer.setPixelRatio(pr); composer.setSize(W, Hh); }
    const asp = W / Hh, was = portrait;
    portrait = asp < .9;
    if (portrait) {
      // จอแนวตั้ง: มุมกว้างขึ้น และเลื่อนภาพขึ้นเล็กน้อย ของสำคัญจะได้ไม่ถูกแผ่นคำบรรยายด้านล่างบัง
      const ext = 1.15;
      camera.fov = 75;
      camera.setViewOffset(W, Hh * ext, 0, Hh * (ext - 1), W, Hh);
    } else {
      camera.clearViewOffset();
      camera.fov = asp < 1.25 ? 62 : 55;
      camera.aspect = asp;
    }
    camera.updateProjectionMatrix();
    path = portrait ? pathP : pathL;
    if (was !== portrait) snap = true;
  }
  resize();

  const canFloat = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  // ขนาดภาพสะท้อนบนพื้น: เครื่องคอมใช้ครึ่งหนึ่งของจอ มือถือใช้ไม่เกิน 512 จุด
  function reflectSize() {
    const pr = renderer.getPixelRatio(), cap = tier >= 2 ? 1280 : 512;
    return [Math.max(64, Math.min(cap, W * pr >> 1)), Math.max(64, Math.min(cap, Hh * pr >> 1))];
  }
  async function enableReflect() {
    if (!canFloat) return;
    try {
      const { Reflector } = await import('three/addons/objects/Reflector.js');
      world.setReflect(true, Reflector, reflectSize(), tier >= 2 ? 4 : 0);
    } catch (err) { console.warn('เปิดพื้นสะท้อนไม่ได้', err); }
  }
  async function enableBloom() {
    try {
      if (!canFloat) throw new Error('เครื่องนี้ไม่รองรับภาพแบบ HDR');
      const [ec, rp, ub, op] = await Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'),
        import('three/addons/postprocessing/OutputPass.js'),
      ]);
      const pr = renderer.getPixelRatio(), bw = Math.max(2, W * pr | 0), bh = Math.max(2, Hh * pr | 0);
      const rt = new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType, samples: 4 });
      const comp = new ec.EffectComposer(renderer, rt);
      comp.addPass(new rp.RenderPass(world.scene, camera));
      // เกณฑ์ 1.3 ให้ฟุ้งเฉพาะหลอดไฟ ป้ายเรืองแสง และประกายบนทอง ไม่ให้ผนังที่โดนแดดฟุ้งไปทั้งแผ่น
      comp.addPass(new ub.UnrealBloomPass(new THREE.Vector2(W, Hh), .3, .5, 1.3));
      comp.addPass(new op.OutputPass());
      composer = comp;
      resize();
    } catch (err) {
      console.warn('เปิดเอฟเฟกต์แสงฟุ้งไม่ได้ ใช้แบบไม่มีแสงฟุ้งแทน', err);
      composer = null; tier = 2; world.setTier(2); resize();
    }
  }
  if (tier >= 1) await enableReflect();
  if (tier === 3) await enableBloom();

  // ---------- สถานะการเดิน ----------
  let t = 0, target = 0, vel = 0, kbd = false, bakeNext = true;
  const cur = new Float32Array(6), want = new Float32Array(6);
  const mouse = { x: 0, y: 0, on: false }, par = { x: 0, y: 0 };
  const walking = () => started && !paused && !dead && !busy();

  // ---------- การเลือกรูป ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), v3 = new THREE.Vector3();
  ray.far = 26;
  function pickAt(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return world.pick(ray, camera.position);
  }
  // รูปที่อยู่ตรงหน้ากล้องมากที่สุด ใช้กับปุ่ม Enter และปุ่ม "ดูรูปในห้องนี้"
  function bestArt() {
    const z = zoneAt(camera.position.z);
    let best = null, bs = 1e9;
    for (const a of world.arts) {
      if (!world.zones[a.zone].visible) continue;
      if (v3.copy(a.center).applyMatrix4(camera.matrixWorldInverse).z > -.5) continue;
      const dist = a.center.distanceTo(camera.position);
      v3.copy(a.center).project(camera);
      if (Math.abs(v3.x) > .95 || Math.abs(v3.y) > .95 || dist > 18) continue;
      if (!world.canSee(a, camera.position, a.center)) continue;
      const s = dist + Math.abs(v3.x) * 6;
      if (s < bs) { bs = s; best = a; }
    }
    return best || world.arts.find(a => a.zone === z) || null;
  }
  // เปิดสิ่งที่ถูกกด: รูปเปิดในหน้าดูรูป ส่วนแผ่นป้าย SOP เปิดหน้าอ่านฉบับเต็ม
  function openEntry(a) {
    if (!a) return;
    if (a.act === 'sop') reader.open();
    else viewer.open(a.id);
  }

  // ---------- ล้อเมาส์ ----------
  addEventListener('wheel', e => {
    if (!walking() || e.ctrlKey) return;
    e.preventDefault();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 32; else if (e.deltaMode === 2) d *= innerHeight;
    target = clamp(target + clamp(d, -160, 160) * .00019 * PACE, 0, 1);
    vel = 0; kbd = false;
  }, { passive: false });

  // ---------- นิ้วและการลากเมาส์ ----------
  // ปัดขึ้นเพื่อเดินหน้า ปล่อยนิ้วแล้วไหลต่ออีกนิด การแตะสั้นๆ โดยไม่ลากคือการกดรูป
  const SWIPE = .13 * PACE;      // ลากเต็มความสูงจอ = เดินราว 9% ของเส้นทาง (ราว 3 ถึง 4 จุดชม)
  const ptrs = new Set();
  let drag = null;
  canvas.addEventListener('pointerdown', e => {
    if (!walking() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ไม่เป็นไร */ }
    ptrs.add(e.pointerId);
    const now = performance.now();
    if (ptrs.size > 1) { if (drag) drag.multi = true; return; }
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, y: e.clientY, t0: now, tm: now, moved: 0, v: 0, walk: false, multi: false };
    vel = 0;
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; kbd = false; }
    if (!drag || e.pointerId !== drag.id || !walking()) return;
    const now = performance.now(), dy = e.clientY - drag.y;
    drag.y = e.clientY;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
    if (drag.walk || drag.moved > 10) {
      drag.walk = true;
      const d = -dy / Math.max(320, innerHeight) * SWIPE;
      target = clamp(target + d, 0, 1);
      drag.v = drag.v * .6 + d / Math.max(4, now - drag.tm) * 1000 * .4;
    }
    drag.tm = now;
  });
  function pointerEnd(e) {
    ptrs.delete(e.pointerId);
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag, now = performance.now();
    drag = null;
    if (e.type === 'pointercancel' || !walking()) return;
    if (d.walk) { if (now - d.tm < 80) vel = clamp(d.v, -.15 * PACE, .15 * PACE); return; }
    if (d.moved < 10 && now - d.t0 < 500 && !d.multi) {
      openEntry(pickAt(e.clientX, e.clientY));
    }
  }
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') mouse.on = false; });

  // ---------- คีย์บอร์ด ----------
  addEventListener('keydown', e => {
    if (!walking() || e.altKey || e.ctrlKey || e.metaKey) return;
    const ae = document.activeElement, onCtl = !!ae && (ae.tagName === 'BUTTON' || ae.tagName === 'A');
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    let d = 0;
    if (k === 'ArrowDown' || k === 'ArrowRight' || k === 's' || k === 'd') d = .025 * PACE;
    else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'w' || k === 'a') d = -.025 * PACE;
    else if (k === 'PageDown') d = .06 * PACE;
    else if (k === 'PageUp') d = -.06 * PACE;
    else if (k === ' ') { if (onCtl) return; d = (e.shiftKey ? -.06 : .06) * PACE; }
    else if (k === 'Home') d = -2;
    else if (k === 'End') d = 2;
    else if (k === 'Enter') {
      if (onCtl) return;
      const a = bestArt();
      if (a) { e.preventDefault(); openEntry(a); }
      return;
    } else return;
    e.preventDefault();
    target = clamp(target + d, 0, 1);
    vel = 0; kbd = true;
  });

  // ---------- ตัวหนังสือที่ลอยทับฉาก ----------
  const el = { room: $('roomName'), pics: $('pics'), title: $('title'), cap: $('cap'), end: $('end'), hint: $('hint'), tip: $('tip'), bar: $('bar') };
  const capTag = el.cap.querySelector('.tag'), capSay = el.cap.querySelector('.say'), capBtn = el.cap.querySelector('a'), capAct = el.cap.querySelector('button');
  let capWant = -1, capTimer = 0, lastZone = -1, endOn = false, titleOp = -1;
  if (coarse) el.hint.textContent = 'ปัดขึ้นเพื่อเดินเข้าไป';
  function setCap(i) {
    if (i === capWant) return;
    capWant = i;
    el.cap.classList.add('off');
    clearTimeout(capTimer);
    if (i < 0) return;
    capTimer = setTimeout(() => {
      const c = CAPS[capWant];
      if (!c) return;
      capTag.textContent = c.tag; capSay.textContent = c.say;
      // ปุ่มในคำบรรยายมีสองแบบ: ลิงก์ออกไปข้างนอก (href) กับปุ่มที่เปิดหน้าอ่าน SOP (act)
      capBtn.hidden = !(c.btn && c.href); capAct.hidden = !(c.btn && c.act);
      if (c.btn && c.href) { capBtn.textContent = c.btn; capBtn.href = c.href; }
      if (c.btn && c.act) capAct.textContent = c.btn;
      el.cap.classList.remove('off');
    }, 280);
  }
  function hud() {
    const z = zoneAt(camera.position.z);
    if (z !== lastZone) {
      lastZone = z;
      el.room.textContent = ROOMS[z];
      el.pics.hidden = !world.arts.some(a => a.zone === z);
      el.pics.textContent = z === SOP_ZONE ? 'อ่าน SOP ฉบับเต็ม' : 'ดูรูปในห้องนี้';
    }
    const op = +(1 - smooth(t, .27 * INTRO_T, 1.09 * INTRO_T)).toFixed(2);
    if (op !== titleOp) { titleOp = op; el.title.style.opacity = op; el.title.style.visibility = op ? 'visible' : 'hidden'; }
    el.hint.classList.toggle('off', t > .36 * INTRO_T);
    el.bar.style.transform = `scaleX(${t.toFixed(4)})`;
    const e = t > END_T;
    if (e !== endOn) { endOn = e; el.end.classList.toggle('on', e); el.end.setAttribute('aria-hidden', String(!e)); }
    let ci = -1;
    if (!e) for (let i = 0; i < CAPS.length; i++) if (t >= CAPS[i].a && t <= CAPS[i].b) { ci = i; break; }
    setCap(ci);
  }
  $('toEnd').addEventListener('click', () => { target = 1; vel = 0; if (reduce) { t = 1; snap = true; } });
  $('again').addEventListener('click', () => { target = 0; vel = 0; if (reduce) { t = 0; snap = true; } canvas.focus({ preventScroll: true }); });
  el.pics.addEventListener('click', () => {
    // ในห้อง SOP ปุ่มนี้เปิดอ่านฉบับเต็มเสมอ ไม่ว่ากล้องจะหันไปทางไหน
    openEntry(zoneAt(camera.position.z) === SOP_ZONE ? world.arts.find(a => a.act === 'sop') : bestArt());
  });
  capAct.addEventListener('click', () => { const c = CAPS[capWant]; if (c && c.act === 'sop') reader.open(); });
  // ขีดแบ่งโซนบนแถบความคืบหน้า: หาระยะทางที่กล้องเดินข้ามผนังกั้นห้องแต่ละด้าน
  {
    const box = $('barBox'), tmp = new Float32Array(6);
    let k = 0;
    for (let i = 1; i <= 3000 && k < BOUNDS.length - 1; i++) {
      if (pathL(i / 3000, tmp)[2] >= BOUNDS[k]) continue;
      const tickEl = document.createElement('b');
      tickEl.style.left = (i / 30).toFixed(2) + '%';
      box.appendChild(tickEl); k++;
    }
  }

  // ---------- ลดคุณภาพอัตโนมัติเมื่อเครื่องช้า ----------
  let fAcc = 0, fN = 0, low = 0, grace = 3, toast = null;
  function setTier(n) {
    tier = n;
    if (n < 3 && composer) { composer.dispose(); composer = null; }
    world.setTier(n);
    resize();
    if (n > 0) { world.setReflectSize(reflectSize()); bakeNext = true; }
    grace = 2.5;
  }
  function offerPlain() {
    toast = document.createElement('button');
    toast.type = 'button'; toast.className = 'toast';
    toast.textContent = 'เครื่องนี้แสดงฉากสามมิติได้ช้า แตะที่นี่เพื่อดูแบบหน้าเว็บธรรมดา';
    toast.addEventListener('click', () => { toast.remove(); showPlain(''); });
    $('hud').appendChild(toast);
    setTimeout(() => toast.remove(), 14000);
  }
  function watchFps(raw) {
    if (forceQ != null || !started) return;
    // เฟรมที่ค้างนานผิดปกติ (สลับแท็บ หน้าต่างถูกบัง) ไม่นับ และเริ่มจับเวลาใหม่
    if (raw > .25 || document.hidden) { fAcc = 0; fN = 0; return; }
    if (grace > 0) { grace -= raw; return; }
    fAcc += raw; fN++;
    if (fAcc < 2) return;
    const f = fN / fAcc;
    fAcc = 0; fN = 0;
    low = f < 28 ? low + 1 : 0;
    if (low < 2) return;
    low = 0;
    if (tier > 0) setTier(tier - 1);
    else if (scale > .62) { scale *= .8; resize(); grace = 2; }
    else if (f < 15 && !toast) offerPlain();
  }

  // ---------- วาดภาพทุกเฟรม ----------
  function render() { if (composer) composer.render(); else renderer.render(world.scene, camera); }
  let last = performance.now(), time = 0, benching = null, tipFor = null;
  function frame(now) {
    const raw = (now - last) / 1000, dt = clamp(raw, 0, .05);
    last = now;
    if (dead || busy()) return;
    if (benching) benching.push(raw);
    if (!started && !bakeNext && !benching) return;       // ยังอยู่หน้าแรก ไม่ต้องวาดฉากที่ถูกบังอยู่
    time += dt;
    if (walking()) {
      if (vel) { target = clamp(target + vel * dt, 0, 1); vel *= Math.exp(-dt * 4); if (Math.abs(vel) < .002) vel = 0; }
      if (reduce) t = target;
      else t += clamp((target - t) * (1 - Math.exp(-dt * 4.2)), -.24 * PACE * dt, .24 * PACE * dt);
    }
    path(t, want);
    if (snap || reduce) { cur.set(want); snap = false; }
    else { const k = 1 - Math.exp(-dt * 9); for (let j = 0; j < 6; j++) cur[j] += (want[j] - cur[j]) * k; }
    camera.position.set(cur[0], cur[1], cur[2]);
    camera.lookAt(cur[3], cur[4], cur[5]);
    if (!coarse && !reduce) {
      const k = Math.min(1, dt * 4);
      par.x += ((mouse.on ? mouse.x / W - .5 : 0) - par.x) * k;
      par.y += ((mouse.on ? mouse.y / Hh - .5 : 0) - par.y) * k;
      camera.rotateY(-par.x * .06); camera.rotateX(-par.y * .04);
    }
    camera.updateMatrixWorld();

    let hov = null;
    if (walking()) {
      if (kbd) hov = bestArt();
      else if (mouse.on && !(drag && drag.walk)) hov = pickAt(mouse.x, mouse.y);
    }
    world.setHover(hov);
    const tipOn = !!hov && !kbd;
    canvas.style.cursor = tipOn ? 'pointer' : '';
    if (tipOn && hov !== tipFor) { tipFor = hov; el.tip.textContent = hov.act === 'sop' ? 'กดเพื่ออ่าน SOP ฉบับเต็ม' : 'กดเพื่อดูรูป'; }
    el.tip.classList.toggle('on', tipOn);
    if (tipOn) el.tip.style.transform = `translate(${Math.min(W - (hov.act ? 210 : 120), mouse.x + 16)}px, ${Math.min(Hh - 40, mouse.y + 20)}px)`;

    if (bakeNext) { world.setShowAll(true); renderer.shadowMap.needsUpdate = true; }
    world.update(dt, time, camera.position);
    hud();
    render();
    if (bakeNext) { bakeNext = false; world.setShowAll(false); }
    watchFps(raw);
  }

  // วาดหนึ่งเฟรมโดยเปิดทุกห้อง เพื่อเตรียมวัสดุ รูป และเงาให้พร้อมก่อนเข้าชม
  onProgress(.97);
  await tick();
  frame(performance.now());
  await tick();

  // วัดความเร็วเครื่องสั้นๆ ขณะยังอยู่หน้าโหลด ถ้าช้าให้ลดระดับคุณภาพก่อนเข้าชม ผู้ชมจะไม่เจอภาพกระตุกช่วงแรก
  async function bench() {
    if (forceQ != null || document.hidden) return;
    t = target = BENCH_T; snap = true;
    for (let round = 0; round < 3 && tier > 0; round++) {
      benching = [];
      const t0 = performance.now();
      while (benching.length < 18 && performance.now() - t0 < 2500) await new Promise(r => setTimeout(r, 50));
      const s = benching.slice(4).sort((a, b) => a - b);
      benching = null;
      if (s.length < 8 || s[s.length - 1] > .25 || document.hidden) break;   // วัดไม่ได้ เช่น หน้าต่างถูกบัง
      if (s[s.length >> 1] < .03) break;                                       // เร็วพอแล้ว
      setTier(tier - 1);
    }
    benching = null;
    t = target = 0; snap = true; bakeNext = true;
  }

  const onOverlay = open => {
    vel = 0; drag = null; ptrs.clear();
    if (open) { world.setHover(null); el.tip.classList.remove('on'); canvas.style.cursor = ''; }
    else last = performance.now();
  };
  viewer.onChange(onOverlay);
  reader.onChange(onOverlay);
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    dead = true;
    renderer.setAnimationLoop(null);
    showPlain('ฉากสามมิติหยุดทำงานบนเครื่องนี้ จึงแสดงเนื้อหาแบบหน้าเว็บธรรมดาแทน');
  });
  addEventListener('resize', resize);
  if (window.visualViewport) visualViewport.addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 250));

  function pause(v) {
    paused = v;
    if (dead) return;
    if (v) renderer.setAnimationLoop(null);
    else { last = performance.now(); resize(); renderer.setAnimationLoop(frame); }
  }
  renderer.setAnimationLoop(frame);
  await bench();
  onProgress(1);
  // วัดความเร็วเสร็จแล้วจึงเริ่มทยอยโหลดรูปของห้องท้ายๆ ระหว่างที่ผู้ชมยังอยู่หน้าแรก
  world.loadRest();

  // ---------- ปุ่มเข้าชม ----------
  const enter = $('enter');
  document.querySelector('.load').classList.add('done');
  enter.disabled = false;
  enter.textContent = 'เข้าชม';
  enter.addEventListener('click', () => {
    $('gate').classList.add('gone');
    started = true; grace = 3; last = performance.now();
    canvas.focus({ preventScroll: true });
  });

  // ใช้ตรวจงานจากคอนโซลของเบราว์เซอร์
  window.__walk = {
    go(v) { target = t = clamp(v, 0, 1); vel = 0; snap = true; },
    get t() { return t; }, get target() { return target; }, get tier() { return tier; },
    setQ: setTier, pick: pickAt, best: bestArt, open: id => viewer.open(id), openEntry, reader,
    pathAt: (v, portraitPath) => Array.from((portraitPath ? pathP : pathL)(v, new Float32Array(6))),
    world, camera, renderer, get composer() { return composer; },
  };
  return { pause, alive: () => !dead };
}
