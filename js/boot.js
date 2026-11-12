// จุดเริ่มของหน้าเว็บ: เตรียมหน้าดูรูป หน้าอ่าน SOP และหน้าเว็บธรรมดาก่อน แล้วค่อยโหลดฉากสามมิติ
// ถ้าเครื่องเปิดฉากสามมิติไม่ได้ หรือโหลดไม่สำเร็จ จะสลับไปหน้าเว็บธรรมดาที่มีเนื้อหาและรูปครบ
import { readArts } from './data.js';
import { createViewer } from './viewer.js';
import { createReader } from './reader.js';

const $ = id => document.getElementById(id);
const html = document.documentElement;
const arts = readArts();
const viewer = createViewer(arts);
const reader = createReader();
let app = null;

for (const a of arts) {
  const b = a.fig.querySelector('button');
  if (b) b.addEventListener('click', () => viewer.open(a.id));
}
// รูปที่แสดงซ้ำในหัวข้ออื่นของหน้าเว็บธรรมดา (data-ref) เปิดรูปเดียวกับตัวจริง
for (const fig of document.querySelectorAll('#plain figure[data-ref]')) {
  const b = fig.querySelector('button');
  if (b) b.addEventListener('click', () => viewer.open(fig.dataset.ref));
}

function showPlain(msg) {
  html.classList.remove('walk');
  html.classList.add('plain');
  $('plain').hidden = false;
  const note = $('plainNote');
  note.textContent = msg || '';
  note.hidden = !msg;
  if (app) app.pause(true);
  scrollTo(0, 0);
}
function show3d() {
  html.classList.remove('plain');
  html.classList.add('walk');
  $('plain').hidden = true;
  scrollTo(0, 0);
  app.pause(false);
}

$('goPlain').addEventListener('click', () => showPlain(''));
$('endPlain').addEventListener('click', () => showPlain(''));
$('to3d').addEventListener('click', e => {
  // ถ้าฉากสามมิติยังทำงานอยู่ก็สลับกลับได้ทันที ถ้าไม่ ลิงก์จะโหลดหน้าใหม่เอง
  if (app && app.alive()) { e.preventDefault(); show3d(); }
});

// กันหน้าเว็บเด้งหรือรีเฟรชเองตอนปัดนิ้วในโหมดเดินชมและหน้าดูรูป ยกเว้นในหน้าอ่าน SOP ที่ต้องเลื่อนอ่านได้
const locked = () => html.classList.contains('walk') || html.classList.contains('viewing');
const inReader = e => reader.isOpen() && e.target instanceof Element && !!e.target.closest('.r-scroll');
document.addEventListener('touchmove', e => { if (locked() && !inReader(e)) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', e => { if (locked()) e.preventDefault(); }, { passive: false });

function hasGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch { return false; }
}

const onProgress = p => { $('loadBar').style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`; };

async function load3d() {
  const qs = new URLSearchParams(location.search);
  const forceQ = qs.has('q') ? Math.max(0, Math.min(3, parseInt(qs.get('q'), 10) || 0)) : null;
  onProgress(.06);
  try {
    const m = await Promise.race([
      import('./main.js'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('โหลดฉากสามมิตินานเกินไป')), 25000)),
    ]);
    app = await m.start({ arts, viewer, reader, showPlain, forceQ, onProgress });
    if (html.classList.contains('plain')) app.pause(true);
  } catch (err) {
    console.error(err);
    showPlain('โหลดฉากสามมิติไม่สำเร็จ จึงแสดงเนื้อหาแบบหน้าเว็บธรรมดาแทน ลองโหลดหน้าใหม่อีกครั้งได้');
  }
}

if (new URLSearchParams(location.search).has('plain')) {
  showPlain('');
} else if (!hasGL()) {
  $('to3d').hidden = true;
  showPlain('อุปกรณ์หรือเบราว์เซอร์นี้เปิดฉากสามมิติไม่ได้ จึงแสดงเนื้อหาแบบหน้าเว็บธรรมดาแทน เนื้อหาและรูปครบเหมือนกัน');
} else {
  load3d();
}
