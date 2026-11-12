// พื้นผิวทั้งหมดวาดขึ้นเองด้วย canvas (หินอ่อน ไม้ ปูน ลายตาราง แสง ป้ายตัวหนังสือ)
// ไม่มีไฟล์ texture จากภายนอก
import * as THREE from 'three';

const FD = '"Unbounded", "Noto Sans Thai", sans-serif';
const FT = '"Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
let ANISO = 4;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function cv(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
export function toTex(c, rep = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = ANISO;
  return t;
}
// วาดซ้ำ 9 ตำแหน่งรอบขอบ เพื่อให้ลายต่อกันสนิทเมื่อปูซ้ำ
function tile(g, S, fn) {
  for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { g.save(); g.translate(ox * S, oy * S); fn(); g.restore(); }
}
function blob(g, x, y, rad, col, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, rad);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}
function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function marble(S, base, clouds, veins, seed, { nc = 46, nv = 9 } = {}) {
  const [c, g] = cv(S), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < nc; i++) {
    const x = r() * S, y = r() * S, rad = S * (.08 + r() * .22), col = clouds[i % clouds.length], a = .1 + r() * .22;
    tile(g, S, () => blob(g, x, y, rad, col, a));
  }
  for (let i = 0; i < nv; i++) {
    let x = r() * S, y = r() * S, ang = r() * Math.PI * 2;
    const pts = [[x, y]], n = 26 + (r() * 30 | 0);
    for (let k = 0; k < n; k++) { ang += (r() - .5) * .9; x += Math.cos(ang) * S * .03; y += Math.sin(ang) * S * .03; pts.push([x, y]); }
    const col = veins[i % veins.length], lw = S / 1024 * (.8 + r() * 2.2), a = .25 + r() * .4;
    tile(g, S, () => {
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.strokeStyle = rgba(col, a * .22); g.lineWidth = lw * 6; g.stroke();
      g.strokeStyle = rgba(col, a); g.lineWidth = lw; g.stroke();
    });
  }
  return c;
}
// ลายตารางหมากรุก ช่องละ 2 เมตร (ภาพหนึ่งแผ่นคลุม 4 x 4 เมตร)
function checker(S, A, B) {
  const [c, g] = cv(S), h = S / 2, j = Math.max(1, S / 380);
  g.drawImage(A, 0, 0, h, h, 0, 0, h, h);
  g.drawImage(B, h, 0, h, h, h, 0, h, h);
  g.drawImage(B, 0, h, h, h, 0, h, h, h);
  g.drawImage(A, h, h, h, h, h, h, h, h);
  g.fillStyle = 'rgba(20,18,30,.55)';
  g.fillRect(h - j / 2, 0, j, S); g.fillRect(0, h - j / 2, S, j);
  g.fillRect(0, 0, j / 2, S); g.fillRect(S - j / 2, 0, j / 2, S); g.fillRect(0, 0, S, j / 2); g.fillRect(0, S - j / 2, S, j / 2);
  return c;
}
// ผนังกรุแผ่นหิน แผ่นละ 2 x 1 เมตร เรียงเหลื่อมกัน
function panel(S, Mb, seed) {
  const [c, g] = cv(S), r = rng(seed), rh = S / 4, w = S / 2, j = Math.max(1, S / 420);
  g.drawImage(Mb, 0, 0, S, S);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? w / 2 : 0;
    let first = 0;
    for (let k = -1; k < 2; k++) {
      let t = r();
      if (off) { if (k === -1) first = t; if (k === 1) t = first; }
      g.fillStyle = t > .5 ? `rgba(255,255,255,${(t - .5) * .16})` : `rgba(70,58,34,${(.5 - t) * .13})`;
      g.fillRect(k * w + off, row * rh, w, rh);
      g.fillStyle = 'rgba(84,72,48,.5)'; g.fillRect(k * w + off - j / 2, row * rh, j, rh);
    }
    g.fillStyle = 'rgba(84,72,48,.5)'; g.fillRect(0, row * rh, S, j);
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, row * rh + j, S, j * .8);
  }
  return c;
}
function wood(S, base, dark, light, seed) {
  const [c, g] = cv(S), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 300; i++) {
    const y = r() * S, h = (1 + r() * 3) * S / 512;
    g.fillStyle = rgba(r() > .3 ? dark : light, .05 + r() * .16);
    g.fillRect(0, y, S, h);
  }
  for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(30,16,6,.5)'; g.fillRect(0, i * S / 4, S, Math.max(1, S / 300)); }
  return c;
}
function noise(S, base, cols, seed, n = 70, amax = .1) {
  const [c, g] = cv(S), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * S, rad = S * (.05 + r() * .2), col = cols[i % cols.length], a = amax * (.4 + r() * .6);
    tile(g, S, () => blob(g, x, y, rad, col, a));
  }
  for (let i = 0; i < S * 5; i++) {
    g.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '0,0,0'},${.015 + r() * .035})`;
    g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
  }
  return c;
}

// พื้นไม้ปาร์เกต์ลายสาน: ช่องละ 1 เมตร (ภาพหนึ่งแผ่นคลุม 4 x 4 เมตร) แต่ละช่องมีไม้ 4 แผ่น สลับแนวกัน
function parquet(S, seed) {
  const [c, g] = cv(S), r = rng(seed), n = 4, cs = S / n, pw = cs / 4, j = Math.max(1, S / 512);
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
    const horiz = (i + k) % 2 === 0;
    for (let q = 0; q < 4; q++) {
      const x = i * cs + (horiz ? 0 : q * pw), y = k * cs + (horiz ? q * pw : 0), w = horiz ? cs : pw, h = horiz ? pw : cs;
      g.fillStyle = `hsl(${23 + r() * 8}, ${40 + r() * 14}%, ${33 + r() * 13}%)`;
      g.fillRect(x, y, w, h);
      for (let m = 0; m < 12; m++) {
        g.fillStyle = `rgba(${r() > .5 ? '40,20,8' : '255,220,170'},${.04 + r() * .08})`;
        if (horiz) g.fillRect(x, y + r() * h, w, j + r() * j); else g.fillRect(x + r() * w, y, j + r() * j, h);
      }
      g.strokeStyle = 'rgba(30,16,6,.6)'; g.lineWidth = j; g.strokeRect(x + j / 2, y + j / 2, w - j, h - j);
    }
  }
  return c;
}
// ทรายมีริ้วคลื่นแบบหาดช่วงน้ำลง
function sand(S, seed) {
  const [c, g] = cv(S), r = rng(seed), u = S / 512;
  g.fillStyle = '#e7d7ad'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) {
    const x = r() * S, y = r() * S, rad = S * (.06 + r() * .2), col = ['#f6ecd0', '#cdb98a', '#dccb9f'][i % 3], a = .1 + r() * .2;
    tile(g, S, () => blob(g, x, y, rad, col, a));
  }
  for (let i = 0; i < 44; i++) {
    const y = r() * S, amp = S * (.005 + r() * .012), ph = r() * 7, k = 2 + (r() * 3 | 0), a = .5 + r() * .5;
    const wave = (off, col, lw) => {
      g.beginPath();
      for (let x = 0; x <= S; x += S / 64) { const yy = y + off + Math.sin(x / S * Math.PI * 2 * k + ph) * amp; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); }
      g.strokeStyle = col; g.lineWidth = lw; g.stroke();
    };
    tile(g, S, () => { wave(0, `rgba(140,116,72,${.3 * a})`, 2.4 * u); wave(2.6 * u, `rgba(255,250,230,${.4 * a})`, 1.8 * u); });
  }
  return c;
}
// ชื่อ AOM ที่เขียนด้วยนิ้วบนทราย (อ้างจากรูปจริง) วาดเป็นร่องเส้น ไม่ใช้ฟอนต์
function aom() {
  const W = 768, Hh = 320, [c, g] = cv(W, Hh);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const draw = (dy, col, lw) => {
    g.strokeStyle = col; g.lineWidth = lw;
    g.beginPath();
    g.moveTo(70, 262 + dy); g.lineTo(152, 58 + dy); g.lineTo(238, 266 + dy);
    g.moveTo(106, 192 + dy); g.lineTo(208, 184 + dy);
    g.moveTo(470, 166 + dy); g.ellipse(384, 162 + dy, 86, 100, .06, 0, Math.PI * 2);
    g.moveTo(522, 266 + dy); g.lineTo(542, 60 + dy); g.lineTo(612, 192 + dy); g.lineTo(678, 56 + dy); g.lineTo(706, 262 + dy);
    g.stroke();
  };
  draw(6, 'rgba(255,250,232,.6)', 17);
  draw(0, 'rgba(118,96,58,.85)', 16);
  draw(-1, 'rgba(92,74,42,.5)', 7);
  return c;
}
// ผิวน้ำลำธาร: ริ้วน้ำสีขาวไหลตามแนวตั้งของภาพ ปูซ้ำได้
function stream(seed) {
  const S = 256, [c, g] = cv(S), r = rng(seed);
  const gr = g.createLinearGradient(0, 0, S, 0);
  gr.addColorStop(0, '#1f30d0'); gr.addColorStop(.5, '#4f68ff'); gr.addColorStop(1, '#1f30d0');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.lineCap = 'round';
  for (let i = 0; i < 30; i++) {
    const x = r() * S, y = r() * S, len = 30 + r() * 80, a = .14 + r() * .34, w = 1 + r() * 2.6, bend = (r() - .5) * 26;
    tile(g, S, () => { g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + bend, y + len / 2, x, y + len); g.stroke(); });
  }
  return c;
}
// คลื่นซัดหาด: ด้านซ้ายของภาพโปร่งใส ถัดมาเป็นแนวฟองสีขาวที่หยัก แล้วเป็นน้ำทะเล ปูซ้ำได้ตามแนวตั้ง
function foam() {
  const W = 128, Hh = 256, [c, g] = cv(W, Hh), im = g.createImageData(W, Hh), d = im.data;
  for (let y = 0; y < Hh; y++) {
    const ph = y / Hh * Math.PI * 2, e = 30 + 11 * Math.sin(ph * 2) + 6 * Math.sin(ph * 5 + 1);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, t = x - e;
      let rr = 255, gg = 255, a = 0;
      if (t > -9 && t <= 6) a = t < 0 ? (t + 9) / 9 : 1;
      else if (t > 6) { const k = Math.min(1, (t - 6) / 26); rr = 255 - k * 205; gg = 255 - k * 180; a = .96 - k * .16; }
      d[i] = rr; d[i + 1] = gg; d[i + 2] = 255; d[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(im, 0, 0);
  return c;
}

// ---------- แสงและเอฟเฟกต์ ----------
function glow() {
  const [c, g] = cv(128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, '#fff'); gr.addColorStop(.16, 'rgb(190,190,190)'); gr.addColorStop(.45, 'rgb(46,46,46)'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return c;
}
function beam() {
  const [c, g] = cv(8, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgb(235,235,235)'); gr.addColorStop(.35, 'rgb(90,90,90)'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  return c;
}
function shaft() {
  const [c, g] = cv(128, 256);
  let gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#fff'); gr.addColorStop(.5, 'rgb(120,120,120)'); gr.addColorStop(1, 'rgb(20,20,20)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  g.globalCompositeOperation = 'multiply';
  gr = g.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, '#000'); gr.addColorStop(.3, 'rgb(180,180,180)'); gr.addColorStop(.5, '#fff'); gr.addColorStop(.7, 'rgb(180,180,180)'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  return c;
}
function wash() {
  const [c, g] = cv(128);
  let gr = g.createRadialGradient(64, 4, 0, 64, 4, 124);
  gr.addColorStop(0, '#fff'); gr.addColorStop(.35, 'rgb(130,130,130)'); gr.addColorStop(.7, 'rgb(40,40,40)'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.globalCompositeOperation = 'multiply';
  gr = g.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, '#000'); gr.addColorStop(.28, '#fff'); gr.addColorStop(.72, '#fff'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return c;
}
function sky() {
  const [c, g] = cv(8, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#070a3a'); gr.addColorStop(.2, '#1420a8'); gr.addColorStop(.34, '#3b47e0');
  gr.addColorStop(.42, '#9a86dc'); gr.addColorStop(.465, '#ffb78c'); gr.addColorStop(.5, '#f6c592'); gr.addColorStop(1, '#f6c592');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 512);
  return c;
}
function water() {
  const [c, g] = cv(64, 256), r = rng(7);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#ffc79a'); gr.addColorStop(.3, '#b99ad6'); gr.addColorStop(.7, '#2f3bd0'); gr.addColorStop(1, '#101660');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${.03 + r() * .07})`; g.fillRect(r() * 64 - 10, r() * 256, 10 + r() * 40, 1); }
  return c;
}
function halo() {
  const [c, g] = cv(256);
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#fff'; g.shadowColor = '#fff';
  for (const [blur, lw] of [[44, 14], [24, 8], [10, 4]]) { g.shadowBlur = blur; g.lineWidth = lw; g.strokeRect(42, 42, 172, 172); }
  return c;
}
function plus() {
  const [c, g] = cv(96);
  g.fillStyle = 'rgba(12,14,28,.35)'; g.beginPath(); g.arc(48, 51, 42, 0, 7); g.fill();
  g.fillStyle = '#ffd400'; g.beginPath(); g.arc(48, 46, 42, 0, 7); g.fill();
  g.strokeStyle = '#0c0e1c'; g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(48, 26); g.lineTo(48, 66); g.moveTo(28, 46); g.lineTo(68, 46); g.stroke();
  return c;
}

// ---------- ของประกอบฉากห้องบอร์ดเกม (ลายอุ้งเท้าแมวทั่วไป ไม่ใช่การ์ดจริงของเกม) ----------
function paw(g, x, y, s, col) {
  g.fillStyle = col;
  g.beginPath(); g.ellipse(x, y + s * .2, s * .36, s * .3, 0, 0, 7); g.fill();
  for (const [dx, dy, r] of [[-.42, -.14, .14], [-.16, -.42, .155], [.16, -.42, .155], [.42, -.14, .14]]) {
    g.beginPath(); g.ellipse(x + dx * s, y + dy * s, r * s, r * s * 1.15, 0, 0, 7); g.fill();
  }
}
function cards() {
  const W = 256, Hh = 358, [c, g] = cv(W * 4, Hh);
  // ช่อง 0: หลังการ์ด
  g.fillStyle = '#2a3cff'; g.fillRect(0, 0, W, Hh);
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 10;
  for (let i = -Hh; i < W; i += 34) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + Hh, Hh); g.stroke(); }
  g.strokeStyle = '#ffd400'; g.lineWidth = 8; rrect(g, 16, 16, W - 32, Hh - 32, 20); g.stroke();
  paw(g, W / 2, Hh / 2, 92, '#ffd400');
  // ช่อง 1 ถึง 3: หน้าการ์ด
  ['#ffd400', '#ff6b4a', '#7f8cff'].forEach((col, i) => {
    const x = (i + 1) * W;
    g.fillStyle = '#f6f1e4'; g.fillRect(x, 0, W, Hh);
    g.fillStyle = col; rrect(g, x + 18, 18, W - 36, 176, 18); g.fill();
    paw(g, x + W / 2, 104, 78, '#f6f1e4');
    g.fillStyle = 'rgba(12,14,28,.78)'; rrect(g, x + 30, 216, W - 110, 16, 8); g.fill();
    g.fillStyle = 'rgba(12,14,28,.22)';
    for (let k = 0; k < 3; k++) { rrect(g, x + 30, 250 + k * 24, W - 60 - k * 34, 10, 5); g.fill(); }
    g.fillStyle = col; g.beginPath(); g.arc(x + W - 40, 318, 14, 0, 7); g.fill();
    g.strokeStyle = 'rgba(12,14,28,.25)'; g.lineWidth = 3; g.strokeRect(x + 1.5, 1.5, W - 3, Hh - 3);
  });
  return c;
}
function dice() {
  const S = 128, [c, g] = cv(S * 3, S * 2);
  const pips = { 1: [[.5, .5]], 2: [[.28, .28], [.72, .72]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.28, .28], [.72, .28], [.28, .72], [.72, .72]],
    5: [[.26, .26], [.74, .26], [.5, .5], [.26, .74], [.74, .74]], 6: [[.28, .24], [.72, .24], [.28, .5], [.72, .5], [.28, .76], [.72, .76]] };
  [1, 6, 2, 5, 3, 4].forEach((n, i) => {
    const x = (i % 3) * S, y = (i / 3 | 0) * S;
    g.fillStyle = '#d9d2c0'; g.fillRect(x, y, S, S);
    g.fillStyle = '#f6f1e4'; rrect(g, x + 5, y + 5, S - 10, S - 10, 20); g.fill();
    for (const [px, py] of pips[n]) { g.fillStyle = n === 1 ? '#ff6b4a' : '#0c0e1c'; g.beginPath(); g.arc(x + px * S, y + py * S, n === 1 ? 19 : 11.5, 0, 7); g.fill(); }
  });
  return c;
}

// ---------- ป้ายตัวหนังสือ ----------
function fit(g, text, maxW, px, weight, family) {
  let s = px;
  do { g.font = `${weight} ${s}px ${family}`; s -= 2; } while (g.measureText(text).width > maxW && s > 8);
}
function plaque() {
  const W = 660, Hh = 840, [c, g] = cv(W, Hh);
  const bg = g.createLinearGradient(0, 0, 0, Hh);
  bg.addColorStop(0, '#161a45'); bg.addColorStop(1, '#0a0c1c');
  g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
  g.strokeStyle = '#d9a441'; g.lineWidth = 6; g.strokeRect(22, 22, W - 44, Hh - 44);
  g.lineWidth = 2; g.strokeRect(38, 38, W - 76, Hh - 76);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#e2b44e'; fit(g, 'GPAX', 300, 56, 600, FD); g.fillText('GPAX', W / 2, 160);
  g.fillStyle = '#ffd400'; fit(g, '3.57', 500, 210, 800, FD); g.fillText('3.57', W / 2, 330);
  g.fillStyle = '#d9a441'; g.fillRect(W / 2 - 150, 462, 300, 3);
  g.fillStyle = '#ebe6da'; fit(g, 'เกรดเฉลี่ยสะสม', 480, 50, 700, FT); g.fillText('เกรดเฉลี่ยสะสม', W / 2, 532);
  g.fillStyle = '#d9a441'; g.save(); g.translate(W / 2, 600); g.rotate(Math.PI / 4); g.fillRect(-8, -8, 16, 16); g.restore();
  g.fillStyle = '#ebe6da'; fit(g, 'แผนการเรียนภาษาอังกฤษ', 500, 38, 500, FT); g.fillText('แผนการเรียนภาษาอังกฤษ', W / 2, 668);
  g.fillStyle = '#ffd400'; fit(g, 'โรงเรียนวัดสุทธิวราราม', 500, 40, 700, FT); g.fillText('โรงเรียนวัดสุทธิวราราม', W / 2, 734);
  return c;
}
function led() {
  const W = 1024, Hh = 272, [c, g] = cv(W, Hh);
  const bg = g.createRadialGradient(W / 2, Hh / 2, 20, W / 2, Hh / 2, W * .6);
  bg.addColorStop(0, '#2433e6'); bg.addColorStop(1, '#070a2a');
  g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffffff'; fit(g, 'YOUTH FOR SOCIAL CHANGE', 900, 74, 800, FD); g.fillText('YOUTH FOR SOCIAL CHANGE', W / 2, 108);
  g.fillStyle = '#ffd400'; fit(g, '2026 LEADERS CONFERENCE IN THAILAND', 800, 36, 600, FD); g.fillText('2026 LEADERS CONFERENCE IN THAILAND', W / 2, 196);
  g.fillStyle = 'rgba(0,0,12,.22)';
  for (let x = 0; x < W; x += 4) g.fillRect(x, 0, 1, Hh);
  for (let y = 0; y < Hh; y += 4) g.fillRect(0, y, W, 1);
  return c;
}
function rollup() {
  const W = 256, Hh = 640, [c, g] = cv(W, Hh);
  g.fillStyle = '#f2ede0'; g.fillRect(0, 0, W, Hh);
  g.fillStyle = '#2a3cff'; g.fillRect(0, 0, W, 262);
  g.fillStyle = '#ffd400'; g.fillRect(0, 262, W, 10); g.fillRect(0, Hh - 34, W, 34);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffd400'; fit(g, '2026', 200, 58, 800, FD); g.fillText('2026', W / 2, 62);
  g.fillStyle = '#ffffff';
  fit(g, 'LEADERS', 214, 44, 800, FD); g.fillText('LEADERS', W / 2, 124);
  fit(g, 'CONFERENCE', 214, 44, 800, FD); g.fillText('CONFERENCE', W / 2, 170);
  fit(g, 'IN THAILAND', 214, 30, 600, FD); g.fillText('IN THAILAND', W / 2, 216);
  g.fillStyle = '#0c0e1c'; fit(g, 'หัวข้อ', 200, 28, 700, FT); g.fillText('หัวข้อ', W / 2, 322);
  g.fillStyle = '#2a3cff'; fit(g, 'การป้องกัน', 216, 42, 900, FT); g.fillText('การป้องกัน', W / 2, 376);
  fit(g, 'และลดยาเสพติด', 216, 42, 900, FT); g.fillText('และลดยาเสพติด', W / 2, 428);
  g.fillStyle = '#d9a441'; g.fillRect(W / 2 - 50, 480, 100, 3);
  g.fillStyle = '#0c0e1c'; fit(g, '26–27 FEBRUARY 2026', 214, 22, 600, FD); g.fillText('26–27 FEBRUARY 2026', W / 2, 540);
  return c;
}

// ---------- ของประกอบฉากห้อง SOP ----------
// จอข่าว: มีแต่หัวข้อกว้างๆ จาก SOP กับแถบสีแทนเนื้อข่าว และกราฟเส้นที่ไม่มีตัวเลข ไม่มีข่าวหรือราคาจริง
function news() {
  const W = 768, Hh = 448, [c, g] = cv(W, Hh);
  const bg = g.createLinearGradient(0, 0, 0, Hh);
  bg.addColorStop(0, '#141a52'); bg.addColorStop(1, '#090b22');
  g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
  g.fillStyle = '#ffd400'; g.fillRect(28, 30, 14, 46);
  g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillStyle = '#ebe6da'; fit(g, 'ข่าวเศรษฐกิจและเทคโนโลยี', 560, 42, 900, FT); g.fillText('ข่าวเศรษฐกิจและเทคโนโลยี', 58, 54);
  ['เศรษฐกิจ', 'การลงทุน', 'AI'].forEach((t, i) => {
    const y = 110 + i * 92;
    g.fillStyle = ['#ffd400', '#7f8cff', '#ff6b4a'][i]; rrect(g, 28, y, 136, 36, 18); g.fill();
    g.fillStyle = '#0c0e1c'; g.textAlign = 'center'; fit(g, t, 116, 24, 700, FT); g.fillText(t, 96, y + 19);
    g.fillStyle = 'rgba(235,230,218,.55)'; rrect(g, 28, y + 48, 296 - i * 34, 10, 5); g.fill();
    g.fillStyle = 'rgba(235,230,218,.28)'; rrect(g, 28, y + 66, 236 - i * 22, 10, 5); g.fill();
  });
  const x0 = 384, y0 = 104, w = 356, h = 256;
  g.fillStyle = 'rgba(42,60,255,.3)'; rrect(g, x0, y0, w, h, 14); g.fill();
  g.strokeStyle = 'rgba(235,230,218,.16)'; g.lineWidth = 1;
  for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x0 + 14, y0 + i * h / 5); g.lineTo(x0 + w - 14, y0 + i * h / 5); g.stroke(); }
  const ys = [.74, .62, .68, .5, .57, .42, .47, .28, .35, .16];
  const P = ys.map((v, i) => [x0 + 22 + i * (w - 44) / (ys.length - 1), y0 + v * h]);
  g.beginPath(); P.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
  g.lineTo(P[P.length - 1][0], y0 + h - 12); g.lineTo(P[0][0], y0 + h - 12); g.closePath();
  g.fillStyle = 'rgba(255,212,0,.16)'; g.fill();
  g.beginPath(); P.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
  g.strokeStyle = '#ffd400'; g.lineWidth = 5; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
  g.fillStyle = '#ffd400'; g.beginPath(); g.arc(P[P.length - 1][0], P[P.length - 1][1], 9, 0, 7); g.fill();
  g.fillStyle = '#2a3cff'; g.fillRect(0, Hh - 52, W, 52);
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * 126;
    g.fillStyle = '#ffd400'; g.beginPath(); g.moveTo(x, Hh - 18); g.lineTo(x + 9, Hh - 34); g.lineTo(x + 18, Hh - 18); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; rrect(g, x + 28, Hh - 31, 70, 10, 5); g.fill();
  }
  g.fillStyle = 'rgba(0,0,12,.18)';
  for (let y = 0; y < Hh; y += 4) g.fillRect(0, y, W, 1);
  return c;
}
// แผ่นป้าย SOP ที่กดเปิดอ่านฉบับเต็มได้: หน้ากระดาษย่อ มีแถบสีแทนย่อหน้าทั้งสี่ (ข้อความจริงอยู่ในหน้าอ่าน SOP)
function sopPage() {
  const W = 660, Hh = 880, [c, g] = cv(W, Hh);
  g.fillStyle = '#f6f1e4'; g.fillRect(0, 0, W, Hh);
  g.fillStyle = '#10143a'; g.fillRect(0, 0, W, 172);
  g.fillStyle = '#ffd400'; g.fillRect(0, 172, W, 10);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffd400'; fit(g, 'STATEMENT OF PURPOSE', 570, 42, 800, FD); g.fillText('STATEMENT OF PURPOSE', W / 2, 66);
  g.fillStyle = '#ebe6da'; fit(g, 'สิทธินนท์ สร้อยทองดี (ออมสิน)', 540, 36, 700, FT); g.fillText('สิทธินนท์ สร้อยทองดี (ออมสิน)', W / 2, 124);
  let y = 228;
  for (let p = 0; p < 4; p++) {
    g.fillStyle = '#2a3cff'; g.beginPath(); g.arc(72, y + 14, 22, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.font = `800 22px ${FD}`; g.fillText(String(p + 1), 72, y + 16);
    g.fillStyle = 'rgba(12,14,28,.62)'; rrect(g, 112, y, 300 + (p % 2) * 90, 15, 7); g.fill();
    g.fillStyle = 'rgba(12,14,28,.2)';
    for (let k = 0; k < 4; k++) { rrect(g, 112, y + 32 + k * 22, k === 3 ? 290 : 480 - (k * 37 + p * 23) % 70, 10, 5); g.fill(); }
    y += 132;
  }
  g.fillStyle = '#ffd400'; rrect(g, 110, 772, W - 220, 74, 37); g.fill();
  g.fillStyle = '#0c0e1c'; fit(g, 'กดเพื่ออ่านฉบับเต็ม', W - 290, 36, 900, FT); g.fillText('กดเพื่ออ่านฉบับเต็ม', W / 2, 811);
  return c;
}

// ป้ายข้อความหลายบรรทัดพื้นใส: หัวข้อเล็กด้านบน ประโยคเด่นตัวใหญ่ และบรรทัดท้าย ใช้กับประโยคเด่นบนผนัง
// บรรทัดถูกตัดมาแล้วจาก data.js จึงไม่ต้องตัดคำภาษาไทยเอง ถ้าบรรทัดยาวเกินจะย่อตัวอักษรทั้งป้ายให้พอดี
export function board({ tag = '', lines = [], foot = '', color = '#ebe6da', tagColor = '#ffd400', footColor = color, px = 88, weight = 900, lh = 1.42, W = 1024, pad = 22 } = {}) {
  const [, m] = cv(4, 4), txt = lines.map(l => l.trim());
  let s = px;
  const widest = () => { m.font = `${weight} ${s}px ${FT}`; return Math.max(...txt.map(t => m.measureText(t).width)); };
  while (widest() > W - pad * 2 && s > 20) s -= 2;
  let tp = Math.round(s * .4), fp = Math.round(s * .4);
  const shrink = (str, w, size, min) => { let q = size; do { m.font = `${w} ${q}px ${FD}`; q--; } while (m.measureText(str).width > W - pad * 2 && q > min); return q + 1; };
  if (tag) tp = shrink(tag, 800, tp, 12);
  if (foot) fp = shrink(foot, 500, fp, 12);
  const top = pad + (tag ? tp * 2.5 : 0), bodyH = txt.length * s * lh;
  const Hh = Math.ceil(top + bodyH + (foot ? fp * 2.3 : 0) + pad);
  const [c, g] = cv(W, Hh);
  g.textBaseline = 'middle'; g.textAlign = 'left';
  if (tag) {
    g.fillStyle = tagColor; g.font = `800 ${tp}px ${FD}`; g.fillText(tag, pad, pad + tp * .7);
    g.fillRect(pad, pad + tp * 1.6, Math.min(W - pad * 2, tp * 5), Math.max(3, tp * .16));
  }
  g.fillStyle = color; g.font = `${weight} ${s}px ${FT}`;
  txt.forEach((t, i) => g.fillText(t, pad, top + (i + .5) * s * lh));
  if (foot) { g.fillStyle = footColor; g.font = `500 ${fp}px ${FD}`; g.fillText(foot, pad, top + bodyH + fp * 1.25); }
  return { tex: toTex(c, false), ar: W / Hh };
}

// ป้ายตัวหนังสือพื้นใส ใช้กับป้ายชื่อห้องและป้ายใต้กรอบรูป
export function label(text, { px = 96, font = FT, weight = 900, color = '#ebe6da', gold = false, ls = 0, pad = 12 } = {}) {
  const [c, g] = cv(4, 4);
  const f = `${weight} ${px}px ${font}`;
  const prep = () => { g.font = f; if (ls) { try { g.letterSpacing = ls + 'px'; } catch { /* เบราว์เซอร์เก่า */ } } };
  prep();
  const m = g.measureText(text);
  const asc = Math.ceil(m.actualBoundingBoxAscent || px * .8), desc = Math.ceil(m.actualBoundingBoxDescent || px * .25);
  const left = Math.max(0, m.actualBoundingBoxLeft || 0);
  const w = Math.ceil(Math.max(m.width, left + (m.actualBoundingBoxRight || 0))) + pad * 2, h = asc + desc + pad * 2;
  c.width = w; c.height = h;
  prep();
  g.textBaseline = 'alphabetic';
  if (gold) {
    const gr = g.createLinearGradient(0, pad, 0, h - pad);
    gr.addColorStop(0, '#fbe7a1'); gr.addColorStop(.5, '#e2b44e'); gr.addColorStop(1, '#b9832a');
    g.fillStyle = gr;
  } else g.fillStyle = color;
  g.fillText(text, pad + left, pad + asc);
  return { tex: toTex(c, false), ar: w / h };
}

async function fontsReady() {
  if (!document.fonts || !document.fonts.load) return;
  const want = ['800 40px "Unbounded"', '600 40px "Unbounded"', '900 40px "Noto Sans Thai"', '700 40px "Noto Sans Thai"', '500 40px "Noto Sans Thai"'];
  try {
    await Promise.race([
      Promise.all(want.map(f => document.fonts.load(f, 'ออมสิน Aa0'))),
      new Promise(r => setTimeout(r, 2500)),
    ]);
  } catch { /* ใช้ฟอนต์สำรองของเครื่อง */ }
}

export async function makeTextures(tier, renderer, pause = async () => {}) {
  ANISO = Math.min(tier >= 2 ? 8 : 4, renderer.capabilities.getMaxAnisotropy());
  await fontsReady();
  const S = tier >= 2 ? 1024 : 512;
  const cream = marble(S, '#efe9dc', ['#ffffff', '#d9cfb8', '#e6dcc6'], ['#a89a7c', '#8f8468', '#c9b58a'], 11);
  await pause();
  const ink = marble(S, '#0d1024', ['#1a1f4a', '#05060f', '#141a40'], ['#c9a85a', '#5a64b8', '#e8dcc0'], 23, { nv: 7 });
  await pause();
  const cob = marble(S, '#2233d8', ['#3d4dff', '#1420a8', '#2a3cff'], ['#9aa4ff', '#0d1680', '#e8dcc0'], 37, { nv: 6 });
  await pause();
  const T = {
    marble: toTex(cream), ink: toTex(ink), cobalt: toTex(cob),
    checkHall: toTex(checker(S, cream, ink)), checkCert: toTex(checker(S, cream, cob)),
    panel: toTex(panel(S, cream, 5)),
    wood: toTex(wood(S / 2, '#9a673a', '#4a2a12', '#c99560', 3)),
    plaster: toTex(noise(S / 2, '#f1f1f1', ['#ffffff', '#cfcfcf', '#e2e2e2'], 9, 60, .22)),
    ground: toTex(noise(S / 2, '#8a8a8a', ['#ffffff', '#3a3a3a', '#b0b0b0'], 15, 80, .2)),
    glow: toTex(glow(), false), beam: toTex(beam(), false), shaft: toTex(shaft(), false), wash: toTex(wash(), false),
    sky: toTex(sky(), false), water: toTex(water(), false), halo: toTex(halo(), false), plus: toTex(plus(), false),
    cards: toTex(cards(), false), dice: toTex(dice(), false),
    plaque: toTex(plaque(), false), led: toTex(led(), false), rollup: toTex(rollup(), false),
    // ห้อง SOP และห้องค่ายและจิตอาสา
    parquet: toTex(parquet(S, 41)), news: toTex(news(), false), sopPage: toTex(sopPage(), false),
    sand: toTex(sand(S / 2, 51)), aom: toTex(aom(), false), stream: toTex(stream(61)), foam: toTex(foam()),
  };
  T.foam.wrapS = THREE.ClampToEdgeWrapping;
  await pause();
  return T;
}
