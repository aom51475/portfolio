// หน้าดูรูปเต็มจอ: ซูมด้วยล้อเมาส์ สองนิ้ว หรือปุ่ม ลากเพื่อเลื่อนรูป ปัดซ้ายขวาเพื่อเปลี่ยนรูป
// ปิดได้ด้วยปุ่มปิด กดพื้นที่ว่างรอบรูป ปุ่ม Esc หรือปุ่มย้อนกลับของมือถือ
// ไฟล์นี้ไม่พึ่ง three.js จึงใช้กับหน้าเว็บธรรมดาได้ด้วย

export function createViewer(arts) {
  const $ = id => document.getElementById(id);
  const html = document.documentElement;
  const root = $('viewer'), stage = $('vStage'), img = $('vImg');
  const bClose = $('vClose'), bPrev = $('vPrev'), bNext = $('vNext'), bIn = $('vIn'), bOut = $('vOut');
  const info = root.querySelector('.v-info');
  const focusables = [bClose, bPrev, bNext, bOut, bIn];
  const MAX = 6;

  let open = false, cur = 0, token = 0, pushed = false, lastFocus = null, hideTimer = 0;
  let bw = 1, bh = 1, cx0 = 0, cy0 = 0;      // ขนาดและตำแหน่งรูปตอนยังไม่ซูม
  let s = 1, tx = 0, ty = 0, swipeX = 0;     // ซูมและการเลื่อน
  const listeners = [];
  const ptrs = new Map();
  let g = null, pinch = null, lastTap = null;

  if (arts.length < 2) { bPrev.hidden = true; bNext.hidden = true; }

  function apply(anim) {
    img.style.transition = anim ? 'transform .22s ease' : 'none';
    img.style.transform = `translate3d(${cx0 + tx + swipeX}px, ${cy0 + ty}px, 0) scale(${s})`;
    root.classList.toggle('zoomed', s > 1.01);
  }
  function clamp() {
    s = Math.min(MAX, Math.max(1, s));
    tx = Math.min(0, Math.max(-(s - 1) * bw, tx));
    ty = Math.min(0, Math.max(-(s - 1) * bh, ty));
  }
  function layout() {
    const W = root.clientWidth || innerWidth, H = root.clientHeight || innerHeight;
    const a = arts[cur];
    const padX = W < 600 ? 10 : 70;
    const padT = H < 480 ? 10 : bClose.getBoundingClientRect().bottom + 8;
    const padB = Math.max(10, info.offsetHeight - 30);
    const aw = Math.max(40, W - padX * 2), ah = Math.max(40, H - padT - padB);
    if (a.ar > aw / ah) { bw = aw; bh = aw / a.ar; } else { bh = ah; bw = ah * a.ar; }
    cx0 = (W - bw) / 2; cy0 = padT + (ah - bh) / 2;
    img.style.width = bw + 'px'; img.style.height = bh + 'px';
    clamp(); apply(false);
  }
  function zoomAt(px, py, ns, anim) {
    ns = Math.min(MAX, Math.max(1, ns));
    const fx = px - cx0, fy = py - cy0;
    tx = fx - (fx - tx) * ns / s; ty = fy - (fy - ty) * ns / s; s = ns;
    clamp(); apply(anim);
  }
  function resetZoom(anim) { s = 1; tx = 0; ty = 0; swipeX = 0; apply(anim); }
  const center = () => [cx0 + bw / 2, cy0 + bh / 2];

  function show(i) {
    cur = (i + arts.length) % arts.length;
    const a = arts[cur], t = ++token;
    $('vKind').textContent = a.kind;
    $('vTitle').textContent = a.title;
    $('vText').textContent = a.text;
    $('vCount').textContent = `${cur + 1} / ${arts.length}`;
    img.alt = a.alt;
    // แสดงไฟล์เล็กที่โหลดไว้แล้วก่อน แล้วสลับเป็นไฟล์ใหญ่เมื่อโหลดเสร็จ
    const fimg = a.fig && a.fig.querySelector('img');
    if (fimg && fimg.complete && fimg.naturalWidth) img.src = a.full;
    else {
      img.src = a.tex;
      const im = new Image();
      im.onload = () => { if (t === token && open) img.src = a.full; };
      im.src = a.full;
    }
    s = 1; tx = 0; ty = 0; swipeX = 0;
    layout();
  }
  function go(d) { if (arts.length > 1) show(cur + d); }

  function doOpen(id) {
    const i = typeof id === 'number' ? id : arts.findIndex(a => a.id === id);
    if (i < 0) return;
    if (!open) {
      lastFocus = document.activeElement;
      open = true;
      clearTimeout(hideTimer);
      root.hidden = false;
      html.classList.add('viewing');
      try { history.pushState({ viewer: true }, ''); pushed = true; } catch { pushed = false; }
      requestAnimationFrame(() => root.classList.add('on'));
      listeners.forEach(fn => fn(true));
    }
    show(i);
    bClose.focus({ preventScroll: true });
  }
  function doClose() {
    if (!open) return;
    open = false; token++;
    ptrs.clear(); g = null; pinch = null;
    root.classList.remove('on');
    html.classList.remove('viewing');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { root.hidden = true; }, 230);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch { /* ไม่เป็นไร */ } }
    listeners.forEach(fn => fn(false));
  }
  function close() {
    if (!open) return;
    const p = pushed; pushed = false;
    doClose();
    if (p) { try { history.back(); } catch { /* ไม่เป็นไร */ } }
  }
  addEventListener('popstate', () => { if (open) { pushed = false; doClose(); } });

  // ---------- ปุ่ม ----------
  bClose.addEventListener('click', close);
  bPrev.addEventListener('click', () => go(-1));
  bNext.addEventListener('click', () => go(1));
  bIn.addEventListener('click', () => zoomAt(...center(), s * 1.5, true));
  bOut.addEventListener('click', () => zoomAt(...center(), s / 1.5, true));

  // ---------- เมาส์และนิ้ว ----------
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function pinchStart() {
    const [a, b] = [...ptrs.values()];
    pinch = { d: Math.max(1, dist(a, b)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    if (g) g.pinched = true;
    swipeX = 0;
  }
  stage.addEventListener('pointerdown', e => {
    if (!open || (e.pointerType === 'mouse' && e.button !== 0)) return;
    try { stage.setPointerCapture(e.pointerId); } catch { /* ไม่เป็นไร */ }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) g = { x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: 0, onImg: e.target === img, pinched: false, type: e.pointerType };
    else if (ptrs.size === 2) pinchStart();
    apply(false);
  });
  stage.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if (!p || !open) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()];
      const d = Math.max(1, dist(a, b)), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAt(mx, my, s * d / pinch.d, false);
      tx += mx - pinch.mx; ty += my - pinch.my;
      pinch.d = d; pinch.mx = mx; pinch.my = my;
      clamp(); apply(false);
    } else if (g && !g.pinched) {
      const ax = e.clientX - g.x0, ay = e.clientY - g.y0;
      g.moved = Math.max(g.moved, Math.hypot(ax, ay));
      if (s > 1.01) { tx += dx; ty += dy; clamp(); apply(false); }
      else if (arts.length > 1 && Math.abs(ax) > 8 && Math.abs(ax) > Math.abs(ay)) { swipeX = ax; apply(false); }
    } else if (g && s > 1.01) { tx += dx; ty += dy; clamp(); apply(false); }
  });
  function up(e) {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size >= 2) { pinchStart(); return; }
    if (ptrs.size === 1) { pinch = null; return; }
    pinch = null;
    const gg = g; g = null;
    if (!gg || !open) return;
    if (gg.pinched) { if (s < 1.03) resetZoom(true); return; }
    const dt = performance.now() - gg.t0;
    if (s <= 1.01 && Math.abs(swipeX) > 60) { const d = swipeX < 0 ? 1 : -1; swipeX = 0; go(d); return; }
    if (swipeX) { swipeX = 0; apply(true); }
    if (e.type === 'pointercancel' || gg.moved >= 8 || dt >= 500) return;
    // แตะหรือคลิกสั้นๆ
    if (!gg.onImg) { close(); return; }
    const toggle = () => { if (s > 1.01) resetZoom(true); else zoomAt(e.clientX, e.clientY, 2.5, true); };
    if (gg.type === 'mouse') { toggle(); return; }
    const now = performance.now();
    if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) { lastTap = null; toggle(); }
    else lastTap = { t: now, x: e.clientX, y: e.clientY };
  }
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  root.addEventListener('wheel', e => {
    if (!open) return;
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    zoomAt(e.clientX, e.clientY, s * Math.exp(-Math.max(-300, Math.min(300, dy)) * .0015), false);
  }, { passive: false });
  root.addEventListener('contextmenu', e => { if (e.target === img) e.preventDefault(); });

  // ---------- คีย์บอร์ด ----------
  document.addEventListener('keydown', e => {
    if (!open) return;
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); close(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (k === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (k === '+' || k === '=') { e.preventDefault(); zoomAt(...center(), s * 1.5, true); }
    else if (k === '-' || k === '_') { e.preventDefault(); zoomAt(...center(), s / 1.5, true); }
    else if (k === '0') { e.preventDefault(); resetZoom(true); }
    else if (k === 'Tab') {
      e.preventDefault();
      const list = focusables.filter(b => !b.hidden);
      const i = list.indexOf(document.activeElement);
      list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length].focus();
    } else if (k === ' ' || k === 'Enter' || k === 'PageDown' || k === 'PageUp' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'Home' || k === 'End') {
      // กันไม่ให้หน้าเว็บด้านหลังเลื่อน แต่ยังให้ปุ่มที่โฟกัสอยู่ทำงานได้
      if (!(document.activeElement instanceof HTMLButtonElement) || (k !== ' ' && k !== 'Enter')) e.preventDefault();
    }
    e.stopPropagation();
  }, true);

  addEventListener('resize', () => { if (open) { s = 1; tx = 0; ty = 0; swipeX = 0; layout(); } });

  return { open: doOpen, close, isOpen: () => open, onChange: fn => listeners.push(fn) };
}
