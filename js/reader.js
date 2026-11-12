// หน้าอ่าน SOP ฉบับเต็มแบบเต็มจอ: เลื่อนอ่านได้โดยกล้องไม่ขยับ
// ปิดได้ด้วยปุ่มปิด กดพื้นที่ว่างรอบหน้ากระดาษ ปุ่ม Esc หรือปุ่มย้อนกลับของมือถือ (แบบเดียวกับหน้าดูรูป)
// ข้อความมาจากหน้าเว็บธรรมดา (#sopText) ซึ่งเป็นแหล่งข้อมูลเดียวของ SOP ฉบับเต็ม
// ไฟล์นี้ไม่พึ่ง three.js

export function createReader() {
  const $ = id => document.getElementById(id);
  const html = document.documentElement;
  const root = $('reader'), scroll = $('rScroll'), body = $('rBody'), bClose = $('rClose'), bDone = $('rDone');
  const listeners = [];
  let open = false, pushed = false, lastFocus = null, hideTimer = 0, down = null;

  const src = $('sopText');
  if (src) body.innerHTML = src.innerHTML;

  function doOpen() {
    if (open) return;
    lastFocus = document.activeElement;
    open = true;
    clearTimeout(hideTimer);
    root.hidden = false;
    scroll.scrollTop = 0;
    html.classList.add('viewing');
    try { history.pushState({ reader: true }, ''); pushed = true; } catch { pushed = false; }
    requestAnimationFrame(() => root.classList.add('on'));
    listeners.forEach(fn => fn(true));
    scroll.focus({ preventScroll: true });
  }
  function doClose() {
    if (!open) return;
    open = false;
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

  bClose.addEventListener('click', close);
  bDone.addEventListener('click', close);
  // กดพื้นที่ว่างรอบหน้ากระดาษเพื่อปิด (การลากเพื่อเลื่อนอ่านไม่นับเป็นการกด)
  scroll.addEventListener('pointerdown', e => { down = e.target === scroll ? { x: e.clientX, y: e.clientY, top: scroll.scrollTop } : null; });
  scroll.addEventListener('click', e => {
    const d = down; down = null;
    if (e.target !== scroll || !d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10 && Math.abs(scroll.scrollTop - d.top) < 4) close();
  });

  document.addEventListener('keydown', e => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') {
      // วนโฟกัสอยู่ในหน้านี้: พื้นที่อ่าน ปุ่มปิดด้านล่าง ปุ่มปิดมุมบน
      e.preventDefault();
      const list = [scroll, bDone, bClose], i = list.indexOf(document.activeElement);
      list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length].focus();
    } else if (document.activeElement !== scroll && !(document.activeElement instanceof HTMLButtonElement)) {
      scroll.focus({ preventScroll: true });
    }
    // ปุ่มลูกศร Space PageDown ใช้เลื่อนอ่านตามปกติ และไม่ส่งต่อไปให้ตัวควบคุมการเดิน
    e.stopPropagation();
  }, true);

  return { open: doOpen, close, isOpen: () => open, onChange: fn => listeners.push(fn) };
}
