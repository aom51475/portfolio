// รายละเอียดของแต่ละห้อง: สถาปัตยกรรม ของตกแต่ง และตำแหน่งกรอบรูป
// ของตกแต่งทั้งหมดสร้างจากรูปทรงพื้นฐาน ไม่มีโมเดลจากภายนอก
// ห้องที่มีมาตั้งแต่รอบก่อน (Care a Cat, IYF, มาคุยกัน) เขียนด้วยพิกัดก่อนแทรกห้องใหม่ แล้วเลื่อนทั้งห้องด้วย SHIFT ท้ายไฟล์
// ห้องใหม่ (SOP, ค่ายและจิตอาสา, หอเกียรติบัตร) คิดพิกัดจาก BOUNDS โดยตรง
import * as THREE from 'three';
import { HW, H, DW, DH, BOUNDS, CERT_WALL, SOP, GOALS, CAMP } from './data.js';
import { box, boxb, cyl, torus, ball, flat, put, wuv, column, urn, cardGeo, diceGeo, meepleGeo, coneBetween, mergeGeometries, strokeGeo, rockGeo, stripZ } from './geo.js';
import { rng, board, label } from './tex.js';

const PI = Math.PI;
const FD = '"Unbounded", "Noto Sans Thai", sans-serif';

// ---------- ชิ้นส่วนที่ใช้ซ้ำ ----------
// บัวพื้น คิ้วผนัง และบัวเพดานรอบห้อง
function trim(c, z0, z1, { base, baseH = .35, rail, railY = 1.25, crown, crownH = .3 }) {
  const { b } = c, L = z0 - z1, zc = (z0 + z1) / 2, sw = HW - DW / 2 - .4, sx = DW / 2 + .4 + sw / 2;
  for (const s of [-1, 1]) {
    if (base) {
      b.add(base, boxb(.1, baseH, L, s * (HW - .05), 0, zc), false);
      for (const zz of [z0 - .35, z1 + .35]) b.add(base, boxb(sw, baseH, .1, s * sx, 0, zz), false);
    }
    if (rail) {
      b.add(rail, boxb(.05, .07, L, s * (HW - .1), railY, zc), false);
      for (const zz of [z0 - .4, z1 + .4]) b.add(rail, boxb(sw, .07, .05, s * sx, railY, zz), false);
    }
    if (crown) b.add(crown, boxb(crownH, crownH, L, s * (HW - crownH / 2), H - crownH, zc), false);
  }
  if (crown) for (const zz of [z0 - .3 - crownH / 2, z1 + .3 + crownH / 2]) b.add(crown, boxb(HW * 2, crownH, crownH, 0, H - crownH, zz), false);
}
// โคมติดผนังข้าง (s = ด้านของผนัง -1 ซ้าย 1 ขวา)
function sconce(c, s, y, z, pts) {
  const { b, M } = c, x = s * HW, d = -s;
  b.add(M.gold, box(.05, .5, .2, x + d * .025, y, z), false);
  b.add(M.gold, box(.22, .04, .04, x + d * .13, y - .12, z), false);
  b.add(M.gold, cyl(.07, .05, .1, x + d * .24, y - .12, z, 10), false);
  b.add(M.bulb, ball(.09, x + d * .24, y + .06, z, 10), false, false);
  pts.push([x + d * .24, y + .06, z]);
}
// กรอบคิ้วทองบนผนังข้าง
function mould(c, s, y, z, w, h) {
  const { b, M } = c, x = s * (HW - .015);
  b.add(M.gold, box(.03, .05, w, x, y + h / 2, z), false); b.add(M.gold, box(.03, .05, w, x, y - h / 2, z), false);
  b.add(M.gold, box(.03, h, .05, x, y, z - w / 2), false); b.add(M.gold, box(.03, h, .05, x, y, z + w / 2), false);
}
// แท่นพร้อมแจกันทอง
function pedestal(c, x, z, mat = c.M.inkMarble, s = 1) {
  const { b, M } = c;
  b.add(mat, boxb(.9 * s, .12, .9 * s, x, 0, z));
  b.add(mat, boxb(.7 * s, .9, .7 * s, x, .12, z));
  b.add(mat, boxb(.86 * s, .1, .86 * s, x, 1.02, z));
  b.add(M.gold, urn(.95 * s, x, 1.12, z));
}
// เพิ่มชิ้นส่วนหลายชิ้นที่สร้างในพิกัดของตัวเอง แล้วย้ายไปวางในฉากพร้อมกัน
function place(b, parts, x, y, z, ry = 0, k = 1) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(k, k, k));
  for (const [mat, g, cast = true, recv = true] of parts) b.add(mat, g.applyMatrix4(m), cast, recv);
}

// ======================================================================
// โซน 0: หน้าอาคาร
// ======================================================================
function exterior(c) {
  const { b, g, M, T } = c, r = rng(5);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(430, 32, 20), new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -10; g.add(sky);
  const stars = [];
  for (let i = 0; i < 260; i++) {
    const a = r() * PI * 2, e = .32 + r() * 1.2;
    stars.push([Math.cos(a) * Math.cos(e) * 415, Math.sin(e) * 415, Math.sin(a) * Math.cos(e) * 415]);
  }
  c.glows(stars, 2.6, 0xfff4dc, .9);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(96, 60), new THREE.MeshBasicMaterial({ map: T.glow, color: 0xffc98a, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.position.set(0, 14, -8); halo.renderOrder = -9; g.add(halo);
  // แผ่นแสงนี้อยู่หลังผนังด้านหน้า ต้องซ่อนเมื่อกล้องเข้าอาคารแล้ว ไม่อย่างนั้นจะลอยบังภาพในโถง
  c.anim((dt, t, cam) => { halo.visible = cam.z > 1; });

  const ground = new THREE.Mesh(wuv(put(new THREE.PlaneGeometry(900, 900), 0, -1.5, 0, -PI / 2), 14), M.ground);
  ground.receiveShadow = true; g.add(ground);

  // ทางเดินและโคมข้างทาง
  b.add(M.marble, boxb(7, .1, 66, 0, -1.5, 45.6), false);
  for (const s of [-1, 1]) b.add(M.inkMarble, boxb(.3, .22, 66, s * 3.65, -1.5, 45.6), false);
  const lamps = [];
  for (let z = 20; z <= 70; z += 10) for (const s of [-1, 1]) {
    const x = s * 4.6;
    b.add(M.inkMarble, boxb(.36, .3, .36, x, -1.5, z), false);
    b.add(M.ink, cyl(.05, .07, 2.0, x, -1.2, z, 8), false);
    b.add(M.gold, boxb(.3, .05, .3, x, .8, z), false);
    b.add(M.bulb, box(.2, .3, .2, x, 1.02, z), false, false);
    b.add(M.gold, boxb(.34, .06, .34, x, 1.18, z), false);
    lamps.push([x, 1.02, z]);
  }
  // สระน้ำสองข้าง
  for (const s of [-1, 1]) {
    const x = s * 11.5;
    b.add(M.marble, boxb(8, .32, .5, x, -1.5, 20.25), false); b.add(M.marble, boxb(8, .32, .5, x, -1.5, 47.75), false);
    b.add(M.marble, boxb(.5, .32, 27, x - 3.75, -1.5, 34), false); b.add(M.marble, boxb(.5, .32, 27, x + 3.75, -1.5, 34), false);
    g.add(new THREE.Mesh(put(new THREE.PlaneGeometry(7, 27), x, -1.3, 34, -PI / 2), M.water));
  }
  // แนวต้นสน
  const tree = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 9), M.tree, 28), dm = new THREE.Object3D();
  let ti = 0;
  for (const x of [-19, 19, -27, 27]) for (let z = 16; z <= 76; z += 10) {
    const hgt = 6 + r() * 3.5, w = .9 + r() * .4;
    dm.position.set(x + (r() - .5), -1.5 + hgt / 2, z + (Math.abs(x) > 20 ? 5 : 0));
    dm.scale.set(w, hgt, w); dm.updateMatrix(); tree.setMatrixAt(ti++, dm.matrix);
  }
  g.add(tree);
  // ภูเขาไกลๆ
  for (let i = 0; i < 14; i++) {
    const a = PI * (1.08 + .84 * i / 13), R = 250 + r() * 80, hgt = 26 + r() * 46, rad = 70 + r() * 60;
    b.add(M.mount, put(new THREE.ConeGeometry(rad, hgt, 5), Math.cos(a) * R, -1.5 + hgt / 2, Math.sin(a) * R, 0, r() * 3), false, false);
  }

  // ชานและบันไดหน้าอาคาร
  b.add(M.marble, boxb(30, 1.5, 9, 0, -1.5, 4.5));
  b.add(M.checker, flat(28.4, 8.2, 0, .006, 4.7), false, true);
  for (let i = 1; i <= 5; i++) b.add(M.marble, boxb(30, 1.5 - .25 * i, .72, 0, -1.5, 9 + .72 * (i - .5)));
  for (const s of [-1, 1]) {
    b.add(M.marble, boxb(1.6, 1.75, 4.6, s * 15.8, -1.5, 11.1));
    b.add(M.inkMarble, boxb(1.8, .12, 4.8, s * 15.8, .25, 11.1));
    b.add(M.gold, urn(1.2, s * 15.8, .37, 11.4));
  }
  // เสามีร่องหกต้น
  for (const x of [-13.2, -8.4, -3.2, 3.2, 8.4, 13.2]) column(b, M.marble, x, 7.6, 9, .62);
  // ผนังด้านหน้า
  const sw = 15 - DW / 2;
  for (const s of [-1, 1]) b.add(M.panel, box(sw, 11.25, .3, s * (DW / 2 + sw / 2), 5.625, .15), false);
  b.add(M.panel, box(DW, 11.25 - DH, .3, 0, DH + (11.25 - DH) / 2, .15), false);
  for (const x of [-13.2, -8.4, 8.4, 13.2]) {
    b.add(M.marble, boxb(1.15, 9, .22, x, 0, .41), false);
    b.add(M.marble, boxb(1.4, .4, .34, x, 0, .47), false);
    b.add(M.marble, boxb(1.4, .4, .34, x, 8.6, .47), false);
  }
  b.add(M.inkMarble, boxb(sw - .5, .45, .1, -(DW / 2 + sw / 2) - .2, 0, .35), false);
  b.add(M.inkMarble, boxb(sw - .5, .45, .1, DW / 2 + sw / 2 + .2, 0, .35), false);
  // เพดานชาน คาน และหน้าจั่ว
  b.add(M.cream, boxb(30, .3, 6.1, 0, 9, 3.35), false, false);
  for (const x of [-10.8, -5.8, 0, 5.8, 10.8]) b.add(M.marble, boxb(.5, .3, 6.1, x, 8.72, 3.35), false, false);
  b.add(M.marble, boxb(30.6, .9, 2.4, 0, 9, 7.6), false);
  b.add(M.inkMarble, boxb(30.4, 1.0, 2.3, 0, 9.9, 7.6), false);
  b.add(M.gold, boxb(30.5, .06, 2.36, 0, 9.87, 7.6), false);
  b.add(M.marble, boxb(31.2, .35, 3.0, 0, 10.9, 7.6), false);
  for (let i = 0; i < 44; i++) b.add(M.marble, boxb(.36, .2, .22, -15.05 + i * .7, 10.7, 8.86), false);
  c.text('พอร์ตโฟลิโอของออมสิน', .66, 0, 10.4, 8.77, 0, { gold: true, weight: 700, px: 110 });
  const tri = new THREE.Shape(); tri.moveTo(-15.6, 0); tri.lineTo(15.6, 0); tri.lineTo(0, 4.2); tri.closePath();
  b.add(M.marble, wuv(put(new THREE.ExtrudeGeometry(tri, { depth: 2.4, bevelEnabled: false }), 0, 11.25, 6.4)), false);
  const tri2 = new THREE.Shape(); tri2.moveTo(-12.6, .4); tri2.lineTo(12.6, .4); tri2.lineTo(0, 3.75); tri2.closePath();
  b.add(M.cobalt, put(new THREE.ShapeGeometry(tri2), 0, 11.25, 8.815), false, false);
  for (const s of [-1, 1]) b.add(M.marble, put(new THREE.BoxGeometry(16.7, .42, 2.9), s * 7.8, 13.52, 7.6, 0, 0, -s * .263), false);
  b.add(M.gold, put(new THREE.CylinderGeometry(1.2, 1.2, .14, 40), 0, 12.78, 8.86, PI / 2), false);
  c.text('ออมสิน', .84, 0, 12.78, 8.95, 0, { color: '#141a6a' });
  b.add(M.gold, urn(1.0, 0, 15.55, 7.6), false);
  for (const s of [-1, 1]) { b.add(M.marble, boxb(.9, .5, .9, s * 15.3, 11.25, 7.6), false); b.add(M.gold, ball(.42, s * 15.3, 12.15, 7.6, 16), false); }
  // โคมข้างประตูและธงผ้า
  const dl = [];
  for (const s of [-1, 1]) {
    b.add(M.gold, box(.12, .56, .26, s * 2.9, 4.3, .43), false);
    b.add(M.bulb, box(.2, .34, .2, s * 2.9, 4.3, .68), false, false);
    b.add(M.gold, box(.26, .05, .26, s * 2.9, 4.5, .68), false); b.add(M.gold, box(.26, .05, .26, s * 2.9, 4.1, .68), false);
    dl.push([s * 2.9, 4.3, .72]);
    b.add(M.cobalt, box(1.6, 5.2, .05, s * 5.8, 5.3, .36), false);
    b.add(M.sun, box(1.6, .5, .056, s * 5.8, 3.1, .362), false);
    b.add(M.gold, box(1.9, .08, .08, s * 5.8, 7.95, .4), false);
  }
  // ปีกอาคารสองข้าง
  for (const s of [-1, 1]) {
    b.add(M.panel, boxb(19, 8, 8, s * 24.5, -1.5, -3.7), false);
    b.add(M.marble, boxb(19.5, .4, 8.5, s * 24.5, 6.5, -3.7), false);
    for (const dx of [-6, 0, 6]) b.add(M.marble, boxb(1, 8, .2, s * 24.5 + dx, -1.5, .4), false);
  }
  c.glows(lamps, 2.4, 0xffb45a, .9);
  c.glows(dl, 2.0, 0xffb45a, .8);
}

// ======================================================================
// โซน 1: โถงต้อนรับ
// ======================================================================
function hall(c) {
  const { b, g, M, T } = c, pts = [];
  trim(c, 0, -22, { base: M.inkMarble, rail: M.gold, crown: M.marble, crownH: .34 });
  for (const s of [-1, 1]) b.add(M.gold, boxb(.04, .05, 21.4, s * (HW - .38), H - .44, -11), false);
  for (const z of [-4.5, -11, -17.5]) for (const s of [-1, 1]) column(b, M.marble, s * 6.2, z, H, .42, { trim: M.gold });
  for (const z of [-4.5, -17.5]) b.add(M.marble, boxb(HW * 2, .4, .5, 0, H - .4, z), false, false);
  for (const s of [-1, 1]) b.add(M.marble, boxb(.5, .4, 21.4, s * 6.2, H - .4, -11), false, false);
  // ช่องแสงกลางเพดานและลำแสง
  b.add(M.skyl, put(new THREE.CircleGeometry(2.3, 40), 0, H - .02, -11, PI / 2), false, false);
  b.add(M.gold, torus(2.36, .09, 0, H - .04, -11, 48), false);
  b.add(M.beamWarm, put(new THREE.CylinderGeometry(2.2, 3.2, H - .1, 32, 1, true), 0, (H - .1) / 2, -11), false, false);
  // โคมระย้าทรงวงแหวน
  b.add(M.gold, torus(1.9, .06, 0, 6.6, -11, 48), false);
  b.add(M.gold, torus(1.5, .03, 0, 6.9, -11, 40), false);
  for (let i = 0; i < 8; i++) {
    const a = i * PI / 4, x = Math.cos(a) * 1.9, z = -11 + Math.sin(a) * 1.9;
    b.add(M.gold, cyl(.05, .03, .16, x, 6.62, z, 8), false);
    b.add(M.bulb, ball(.085, x, 6.86, z, 10), false, false);
    pts.push([x, 6.86, z]);
  }
  for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; b.add(M.gold, cyl(.015, .015, H - 6.6, Math.cos(a) * 1.9, 6.6, -11 + Math.sin(a) * 1.9, 6), false); }
  // ลายดาวบนพื้นใต้ช่องแสง
  b.add(M.gold, put(new THREE.RingGeometry(2.0, 2.14, 56), 0, .008, -11, -PI / 2), false, true);
  const star = new THREE.Shape();
  for (let i = 0; i < 16; i++) { const a = i * PI / 8, rr = i % 2 ? .8 : 1.86; star[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  star.closePath();
  b.add(M.cobalt, put(new THREE.ShapeGeometry(star), 0, .007, -11, -PI / 2), false, true);
  b.add(M.gold, put(new THREE.CircleGeometry(.42, 28), 0, .009, -11, -PI / 2), false, true);
  // ม้านั่ง โคมผนัง และคิ้วผนัง
  for (const s of [-1, 1]) for (const z of [-7.75, -14.25]) {
    b.add(M.wood, boxb(.8, .1, 2.6, s * 7.0, .42, z));
    for (const dz of [-1.05, 1.05]) b.add(M.inkMarble, boxb(.7, .42, .22, s * 7.0, 0, z + dz));
    mould(c, s, 4.6, z, 3.6, 4.6);
    sconce(c, s, 4.4, z, pts);
  }
  for (const s of [-1, 1]) { pedestal(c, s * 6.7, -20.5); pedestal(c, s * 6.7, -1.5); }
  // ผนังด้านใน: รูปทีม และป้ายผลการเรียน
  c.addArt('booth-team', -4.6, 3.6, -21.7, 0, 3.6);
  b.add(M.gold, box(3.56, 4.46, .1, 4.6, 3.9, -21.65));
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 4.2), new THREE.MeshBasicMaterial({ map: T.plaque, color: 0xe2e2e2 }));
  pl.position.set(4.6, 3.9, -21.59); g.add(pl);
  b.add(M.washSoft, put(new THREE.PlaneGeometry(5.8, 7), 4.6, 4.4, -21.688), false, false);
  b.add(M.gold, box(3.5, 1.34, .04, 0, 7.2, -21.68), false);
  b.add(M.inkMarble, box(3.36, 1.2, .06, 0, 7.2, -21.67), false);
  c.text('ออมสิน', .9, 0, 7.2, -21.63, 0, { gold: true });
  c.glows(pts, 1.5, 0xffb45a, .85);
}

// ======================================================================
// โซน 2: ห้อง SOP (ห้องหนังสือสีกรมท่ากับไม้ เดินผ่าน 4 สถานีตามย่อหน้าของ SOP)
// ======================================================================
// ของประกอบของแต่ละสถานีเขียนในพิกัดของสถานีเอง: x = ไปทางขวาของคนที่หันหน้าเข้าผนัง, y = ความสูง, z = ระยะจากผนังออกมากลางห้อง
function stationFrame(c, s, zs) {
  const ry = -s * PI / 2, grp = new THREE.Group();
  grp.position.set(s * HW, 0, zs); grp.rotation.y = ry; c.g.add(grp);
  return { grp, add: parts => place(c.b, parts, s * HW, 0, zs, ry) };
}
// ท่อหรือเส้นที่ลากผ่านจุดหลายจุด มีข้อต่อกลมทุกมุม
function pipe(P, mat, pts, r) {
  const v = pts.map(q => new THREE.Vector3(...q));
  for (let i = 0; i < v.length; i++) {
    P.push([mat, ball(r * 1.25, v[i].x, v[i].y, v[i].z, 10), false]);
    if (i) P.push([mat, coneBetween(v[i - 1], v[i], r, r, 10), false]);
  }
}
// สถานี 1: จอข่าวกับกราฟเส้น
function propNews(c, s, zs) {
  const { M, T } = c, f = stationFrame(c, s, zs), P = [], sx = -1.2, sz = 1.0;
  for (const dx of [-.8, .8]) P.push([M.ink, boxb(.08, .95, .08, sx + dx, .2, sz)]);
  P.push([M.ink, boxb(2.0, .06, .5, sx, .2, sz)]);
  P.push([M.inkGloss, box(2.36, 1.44, .1, sx, 1.86, sz)]);
  P.push([M.gold, box(2.42, .04, .12, sx, 1.12, sz), false]);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.283), new THREE.MeshBasicMaterial({ map: T.news, fog: false }));
  scr.position.set(sx, 1.86, sz + .056); f.grp.add(scr);
  // กราฟแท่งกับเส้นแนวโน้ม (ไม่มีตัวเลข เป็นของประกอบ ไม่ใช่ข้อมูลจริง)
  const gz = .95, hs = [.78, 1.1, .95, 1.5, 1.3, 1.95, 2.35], line = hs.map((h, i) => new THREE.Vector3(.38 + i * .29, h + .17, gz));
  P.push([M.inkGloss, boxb(2.2, .1, .62, 1.25, .2, gz)]);
  P.push([M.gold, boxb(.04, 2.5, .04, .18, .3, gz), false]);
  hs.forEach((h, i) => P.push([i === hs.length - 1 ? M.sun : i % 2 ? M.cobalt : M.sky, boxb(.2, h - .3, .2, .38 + i * .29, .3, gz)]));
  line.forEach((q, i) => {
    P.push([M.gold, ball(.065, q.x, q.y, q.z, 12), false]);
    if (i) P.push([M.sun, coneBetween(line[i - 1], q, .026, .026, 8), false]);
  });
  f.add(P);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 10), M.ledSun);
  f.grp.add(dot);
  c.anim((dt, t) => {
    const u = (t * .16) % 1 * (line.length - 1), i = Math.min(line.length - 2, u | 0);
    dot.position.lerpVectors(line[i], line[i + 1], u - i);
  });
}
// สถานี 2: ไมโครโฟนกับคลื่นเสียงที่ขยับได้ (ไม่มีภาพหน้าจอโปรแกรม)
function propVoice(c, s, zs) {
  const { M } = c, f = stationFrame(c, s, zs), P = [], mx = -1.45, mz = 1.2, hy = 2.02;
  P.push([M.inkGloss, cyl(.36, .4, .06, mx, .2, mz, 28)]);
  P.push([M.gold, torus(.37, .015, mx, .262, mz, 32), false]);
  P.push([M.ink, cyl(.03, .035, 1.56, mx, .26, mz, 10)]);
  P.push([M.gold, put(new THREE.TorusGeometry(.2, .018, 8, 28, PI), mx, hy, mz, 0, 0, PI), false]);
  for (const [mat, geo] of [
    [M.inkGloss, new THREE.CylinderGeometry(.115, .1, .42, 20)],
    [M.gold, new THREE.CylinderGeometry(.123, .123, .035, 20).translate(0, .21, 0)],
    [M.plate, new THREE.SphereGeometry(.15, 18, 12).scale(1, 1.15, 1).translate(0, .37, 0)],
    [M.ink, new THREE.TorusGeometry(.152, .012, 6, 24).rotateX(PI / 2).translate(0, .37, 0)],
    [M.ink, new THREE.TorusGeometry(.14, .01, 6, 24).rotateX(PI / 2).translate(0, .46, 0)],
  ]) P.push([mat, put(geo, mx, hy, mz, .42, 0, 0)]);
  P.push([M.ink, put(new THREE.TorusGeometry(.2, .012, 6, 28), mx, hy + .3, mz + .46), false]);
  // แผงหลังของคลื่นเสียง
  P.push([M.gold, box(3.06, 2.26, .04, .95, 1.6, .1), false]);
  P.push([M.inkGloss, box(2.96, 2.16, .08, .95, 1.6, .12), false]);
  f.add(P);
  const N = 42, wave = new THREE.InstancedMesh(new THREE.BoxGeometry(.036, 1, .05), new THREE.MeshBasicMaterial({ fog: false }), N);
  const dm = new THREE.Object3D(), ca = new THREE.Color(0xffd400), cb = new THREE.Color(0x7f8cff), col = new THREE.Color();
  for (let i = 0; i < N; i++) wave.setColorAt(i, col.copy(ca).lerp(cb, Math.abs(i / (N - 1) - .5) * 2));
  wave.frustumCulled = false; f.grp.add(wave);
  c.anim((dt, t) => {
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1), env = .28 + .72 * Math.sin(PI * u);
      const a = Math.abs(Math.sin(t * 2.3 + i * .5) * .5 + Math.sin(t * 3.9 + i * .23) * .32 + Math.sin(t * 1.4 - i * .85) * .18);
      dm.position.set(-.35 + u * 2.6, 1.6, .2); dm.scale.set(1, .08 + 1.85 * a * env, 1); dm.updateMatrix();
      wave.setMatrixAt(i, dm.matrix);
    }
    wave.instanceMatrix.needsUpdate = true;
  });
}
// สถานี 3: โต๊ะจำลองโรงงาน มีสายพาน ท่อ และสายไฟ (รูปทรงทั่วไป ไม่ใช้โลโก้หรือภาพจากเกมจริง)
function propFactory(c, s, zs) {
  const { M } = c, f = stationFrame(c, s, zs), P = [], y0 = 1.2, zt = 1.05;
  P.push([M.wood, boxb(4.0, .1, 1.6, 0, 1.06, zt)]);
  for (const dx of [-1.8, 1.8]) for (const dz of [-.65, .65]) P.push([M.woodDark, boxb(.12, .86, .12, dx, .2, zt + dz)]);
  P.push([M.cream, boxb(3.8, .04, 1.4, 0, 1.16, zt), false]);
  // เครื่องจักรสามเครื่องเรียงตามสายพาน
  P.push([M.cobalt, boxb(.7, .5, .6, -1.35, y0, zt)], [M.sun, boxb(.76, .07, .66, -1.35, y0 + .5, zt)], [M.ink, cyl(.06, .07, .42, -1.55, y0 + .57, zt - .12, 10)]);
  P.push([M.inkGloss, boxb(.62, .66, .62, 0, y0, zt)], [M.gold, boxb(.68, .06, .68, 0, y0 + .66, zt), false]);
  P.push([M.sun, boxb(.8, .52, .66, 1.35, y0, zt)], [M.cobaltDeep, boxb(.86, .07, .72, 1.35, y0 + .52, zt)], [M.ink, cyl(.05, .06, .36, 1.6, y0 + .59, zt + .14, 10)]);
  // สายพาน
  P.push([M.ink, boxb(2.72, .05, .22, 0, y0 + .15, zt), false]);
  for (let x = -.95; x <= .96; x += .19) P.push([M.gold, put(new THREE.CylinderGeometry(.028, .028, .26, 8), x, y0 + .13, zt, PI / 2), false]);
  for (const x of [-.8, -.45, .45, .8]) P.push([M.ink, boxb(.04, .15, .2, x, y0, zt), false]);
  // ถังกับท่อ
  P.push([M.sky, cyl(.2, .2, .5, -.72, y0, zt - .45, 20)], [M.gold, ball(.2, -.72, y0 + .5, zt - .45, 16), false]);
  pipe(P, M.coral, [[-.72, y0 + .66, zt - .45], [-.72, y0 + .96, zt - .45], [0, y0 + .96, zt - .45], [0, y0 + .96, zt - .16], [0, y0 + .72, zt - .16]], .035);
  P.push([M.cobaltDeep, cyl(.18, .18, .42, .72, y0, zt - .45, 20)], [M.gold, ball(.18, .72, y0 + .42, zt - .45, 16), false]);
  pipe(P, M.sky, [[.72, y0 + .56, zt - .45], [.72, y0 + .82, zt - .45], [1.35, y0 + .82, zt - .45], [1.35, y0 + .82, zt - .2], [1.35, y0 + .59, zt - .2]], .03);
  // เสาไฟกับสายไฟ
  const zf = zt + .56, tops = [-1.65, -.55, .55, 1.65].map(x => new THREE.Vector3(x, y0 + .62, zf));
  P.push([M.coral, boxb(.3, .24, .24, -1.65, y0, zf - .3)], [M.ink, boxb(.34, .04, .28, -1.65, y0 + .24, zf - .3), false]);
  tops.forEach((q, i) => {
    P.push([M.woodDark, cyl(.018, .024, .62, q.x, y0, zf, 6), false], [M.woodDark, box(.2, .02, .02, q.x, q.y - .04, zf), false]);
    if (i) for (const dz of [-.07, .07]) {
      const a = tops[i - 1].clone(), bq = q.clone(), m = a.clone().lerp(bq, .5);
      a.z += dz; bq.z += dz; m.z += dz; m.y -= .16; a.y -= .04; bq.y -= .04;
      P.push([M.wire, new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, bq), 10, .007, 5), false, false]);
    }
  });
  f.add(P);
  // กล่องสินค้าบนสายพาน: ช่วงก่อนเครื่องกลางเดินช้าและอัดกันแน่น (จุดคอขวด) ผ่านไปแล้วจึงเร็วขึ้น
  const N = 8, crates = new THREE.InstancedMesh(new THREE.BoxGeometry(.11, .1, .11), M.coral, N), dm = new THREE.Object3D();
  crates.castShadow = true; crates.frustumCulled = false; f.grp.add(crates);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), M.ledSun);
  beacon.position.set(0, y0 + .8, zt); f.grp.add(beacon);
  c.anim((dt, t) => {
    for (let i = 0; i < N; i++) {
      const u = (t * .05 + i / N) % 1, x = u < .72 ? -1.0 + u / .72 * 1.0 : (u - .72) / .28 * .98;
      dm.position.set(x, y0 + .25, zt); dm.updateMatrix(); crates.setMatrixAt(i, dm.matrix);
    }
    crates.instanceMatrix.needsUpdate = true;
    beacon.scale.setScalar(.8 + .35 * Math.abs(Math.sin(t * 2.6)));
  });
}
// สถานี 4: บันไดเป้าหมายสามขั้น
function propGoals(c, s, zs) {
  const { M } = c, f = stationFrame(c, s, zs), P = [], mats = [M.cobalt, M.cobaltDeep, M.sun], rh = .62;
  for (let i = 0; i < 3; i++) {
    const d = 1.9 - i * .6, y = .2 + i * rh;
    P.push([mats[i], boxb(4.4, rh, d, 0, y, d / 2)]);
    P.push([M.gold, boxb(4.4, .03, .05, 0, y + rh - .03, d + .005), false]);
    const dark = i === 2, num = label(String(i + 1), { font: FD, weight: 800, color: dark ? '#0c0e1c' : '#ffd400', px: 120 });
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(.4 * num.ar, .4), new THREE.MeshBasicMaterial({ map: num.tex, transparent: true, depthWrite: false }));
    nm.position.set(-.62, y + rh / 2, d + .012); f.grp.add(nm);
    const tx = board({ lines: GOALS[i], color: dark ? '#0c0e1c' : '#f6f1e4', px: 64, lh: 1.32, pad: 6 });
    let th = rh - .1, tw = th * tx.ar;
    if (tw > 2.5) { tw = 2.5; th = tw / tx.ar; }
    const tm = new THREE.Mesh(new THREE.PlaneGeometry(tw, th), new THREE.MeshBasicMaterial({ map: tx.tex, transparent: true, depthWrite: false }));
    tm.position.set(-.34 + tw / 2, y + rh / 2, d + .012); f.grp.add(tm);
  }
  // ธงบนขั้นสูงสุด
  const top = .2 + 3 * rh, flag = new THREE.Shape();
  flag.moveTo(0, 0); flag.lineTo(.6, -.17); flag.lineTo(0, -.34); flag.closePath();
  P.push([M.gold, cyl(.025, .025, .95, 1.72, top, .35, 8)], [M.gold, ball(.055, 1.72, top + .97, .35, 10), false]);
  P.push([M.cobalt, put(new THREE.ExtrudeGeometry(flag, { depth: .02, bevelEnabled: false }), 1.745, top + .92, .34)]);
  f.add(P);
}
const SOP_PROPS = [propNews, propVoice, propFactory, propGoals];

function sop(c) {
  const { b, g, M, T } = c, z0 = BOUNDS[1], z1 = BOUNDS[2], zc = (z0 + z1) / 2, zw = z1 + .3, pts = [];
  trim(c, z0, z1, { base: M.woodDark, baseH: 1.25, rail: M.gold, railY: 1.27, crown: M.woodDark, crownH: .3 });
  // คานไม้ใต้เพดาน และโคมแขวนกลางห้อง
  for (let z = z0 - 3; z > z1 + 1; z -= 6) b.add(M.woodDark, boxb(HW * 2, .34, .42, 0, H - .34, z), false, false);
  for (const z of [z0 - 6, zc, z1 + 6]) {
    b.add(M.ink, cyl(.012, .012, H - 6.2, 0, 6.2, z, 6), false);
    b.add(M.ink2, cyl(.16, .62, .5, 0, 5.7, z, 28, true), false);
    b.add(M.gold, torus(.62, .02, 0, 5.7, z, 40), false);
    b.add(M.bulb, ball(.1, 0, 5.82, z, 12), false, false);
    pts.push([0, 5.78, z]);
  }
  // สี่สถานี: แท่นจัดแสดงชิดผนัง ประโยคเด่นตัวใหญ่บนผนัง โคมส่อง และของประกอบหนึ่งชุด
  SOP.forEach((st, i) => {
    const s = st.side, zs = st.z, ry = -s * PI / 2;
    b.add(M.inkMarble, boxb(2.0, .2, 4.6, s * 7.0, 0, zs));
    b.add(M.gold, boxb(.05, .05, 4.6, s * 5.98, .16, zs), false);
    const q = board({ tag: `${st.n} · ${st.tag}`, lines: st.lines, px: 78 });
    const bw = 4.5, bh = bw / q.ar, by = 3.3 + bh / 2, ly = by + bh / 2 + .5;
    c.sign(q, bw, s * (HW - .03), by, zs, ry);
    mould(c, s, by, zs, bw + .5, bh + .36);
    b.add(M.gold, box(.38, .04, .04, s * (HW - .19), ly + .02, zs), false);
    b.add(M.gold, put(new THREE.CylinderGeometry(.05, .05, bw * .5, 10), s * (HW - .38), ly, zs, PI / 2), false);
    b.add(M.bulb, box(.05, .02, bw * .46, s * (HW - .38), ly - .056, zs), false, false);
    b.add(M.washCool, put(new THREE.PlaneGeometry(bw + 2.2, bh + 2.8), s * (HW - .012), by + .5, zs, 0, ry), false, false);
    SOP_PROPS[i](c, s, zs);
  });
  // ปลายห้อง: แผ่นป้าย SOP กับแท่นหนังสือ กดแล้วเปิดอ่านฉบับเต็ม
  const px = -4.7, py = 3.78, lz = zw + 1.3;
  b.add(M.gold, box(3.3, 4.34, .1, px, py, zw + .05));
  const page = new THREE.Mesh(new THREE.PlaneGeometry(3.06, 4.08), new THREE.MeshBasicMaterial({ map: T.sopPage, color: 0xe4e4e4 }));
  page.position.set(px, py, zw + .11); g.add(page);
  b.add(M.washCool, put(new THREE.PlaneGeometry(5.6, 6.8), px, py + .5, zw + .012), false, false);
  c.addSpot('sop', px, py, zw + .1, 0, 3.06, 4.08);
  b.add(M.woodDark, boxb(.8, .1, .7, px, 0, lz));
  b.add(M.woodDark, boxb(.3, 1.0, .3, px, .1, lz));
  b.add(M.gold, boxb(.36, .04, .36, px, 1.06, lz), false);
  b.add(M.woodDark, put(new THREE.BoxGeometry(.96, .06, .68), px, 1.22, lz, .4));
  for (const d of [-1, 1]) b.add(M.cream, put(new THREE.BoxGeometry(.4, .035, .52), px + d * .21, 1.27, lz + .01, .4, 0, d * .07));
  b.add(M.coral, put(new THREE.BoxGeometry(.03, .04, .56), px, 1.285, lz + .01, .4), false);
  // ชั้นหนังสืออีกฝั่งของประตู
  const bx = 4.9, bw = 3.2, r = rng(77), bookM = [M.cream, M.cobalt, M.sun, M.coral, M.sky, M.inkGloss, M.cobaltDeep, M.plate];
  b.add(M.woodDark, box(bw + .2, 5.12, .06, bx, 2.56, zw + .03), false);
  for (const d of [-1, 1]) b.add(M.woodDark, boxb(.1, 5.12, .5, bx + d * (bw / 2 + .05), 0, zw + .25));
  for (let k = 0; k <= 6; k++) b.add(M.woodDark, boxb(bw, .07, .5, bx, k * .842, zw + .25));
  for (let k = 0; k < 6; k++) {
    let x = bx - bw / 2 + .05;
    while (x < bx + bw / 2 - .17) {
      const w = .06 + r() * .09, h = .44 + r() * .28;
      if (r() < .1) { x += .16 + r() * .2; continue; }
      b.add(bookM[r() * bookM.length | 0], boxb(w, h, .3 + r() * .06, x + w / 2, k * .842 + .07, zw + .22), false);
      x += w + .012;
    }
  }
  // ป้ายเหนือประตูทางออก
  b.add(M.gold, box(5.5, 1.14, .04, 0, 7.2, zw + .02), false);
  b.add(M.inkMarble, box(5.36, 1.0, .06, 0, 7.2, zw + .03), false);
  c.sign(label('STATEMENT OF PURPOSE', { gold: true, font: FD, weight: 800 }), 4.7, 0, 7.2, zw + .07);
  for (const s of [-1, 1]) pedestal(c, s * 6.7, z0 - 1.5);
  c.glows(pts, 1.6, 0xffc070, .85);
}

// ======================================================================
// โซน 3: ห้อง Care a Cat (โลกของบอร์ดเกม) พิกัดในห้องนี้เป็นพิกัดก่อนแทรกห้อง SOP
// ======================================================================
function catParts(M) {
  const S = (r, sx, sy, sz, x, y, z) => put(new THREE.SphereGeometry(r, 20, 14).scale(sx, sy, sz), x, y, z);
  return [
    [M.cream, S(.34, 1, 1.2, .95, 0, .4, 0)],
    [M.cream, S(.27, 1.08, .95, 1, 0, .95, .1)],
    [M.cream, put(new THREE.ConeGeometry(.1, .22, 12), -.16, 1.24, .08, 0, 0, .25)],
    [M.cream, put(new THREE.ConeGeometry(.1, .22, 12), .16, 1.24, .08, 0, 0, -.25)],
    [M.coral, put(new THREE.ConeGeometry(.05, .12, 10), -.16, 1.22, .11, 0, 0, .25)],
    [M.coral, put(new THREE.ConeGeometry(.05, .12, 10), .16, 1.22, .11, 0, 0, -.25)],
    [M.ink, S(.036, 1, 1.25, .6, -.105, .99, .35)],
    [M.ink, S(.036, 1, 1.25, .6, .105, .99, .35)],
    [M.coral, S(.026, 1.2, .8, .8, 0, .91, .375)],
    [M.cream, S(.09, 1, .8, 1.2, -.14, .08, .28)],
    [M.cream, S(.09, 1, .8, 1.2, .14, .08, .28)],
    [M.cream, put(new THREE.TorusGeometry(.34, .055, 8, 18, PI * 1.05), .02, .07, -.06, PI / 2, 0, -.6)],
    [M.sun, put(new THREE.TorusGeometry(.205, .034, 8, 24), 0, .73, .07, PI / 2 - .12)],
    [M.gold, S(.055, 1, 1, 1, 0, .67, .27)],
  ];
}
function bunting(c, z, n = 15) {
  const pos = [], col = [];
  const cs = [0xffd400, 0xebe6da, 0xff6b4a, 0x7f8cff, 0x2a3cff].map(h => new THREE.Color(h));
  const P = u => [-HW + u * HW * 2, 7.5 + 4 * (u - .5) * (u - .5), z];
  const line = [];
  for (let i = 0; i <= 32; i++) line.push(new THREE.Vector3(...P(i / 32)));
  for (let i = 0; i < n; i++) {
    const a = P((i + .12) / n), bb = P((i + .88) / n), m = P((i + .5) / n), k = cs[i % cs.length];
    pos.push(...a, ...bb, m[0], m[1] - .66, z);
    for (let j = 0; j < 3; j++) col.push(k.r, k.g, k.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  c.g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .8 })));
  c.g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(line), new THREE.LineBasicMaterial({ color: 0xebe6da })));
}
function cat(c) {
  const { b, g, M, T } = c, pts = [], tx = -1.6, tz = -36.5;
  trim(c, -22, -50, { base: M.ink, baseH: 1.2, rail: M.sun, railY: 1.2, crown: M.sun, crownH: .22 });
  // ช่องเดินของกระดานเกมรอบห้อง
  const spots = [];
  for (let i = 0; i < 25; i++) for (const s of [-1, 1]) spots.push([s * 6.72, -23.52 - i * 1.04, i + (s > 0 ? 2 : 0)]);
  for (let j = 0; j < 12; j++) { const x = -5.67 + j * 1.03; if (Math.abs(x) > 2.3) { spots.push([x, -23.52, j + 1]); spots.push([x, -48.48, j + 3]); } }
  const cols = [0xffd400, 0xebe6da, 0xff6b4a, 0x7f8cff].map(h => new THREE.Color(h));
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(.9, .05, .9), M.tile, spots.length), dm = new THREE.Object3D();
  spots.forEach(([x, z, k], i) => { dm.position.set(x, .025, z); dm.updateMatrix(); tiles.setMatrixAt(i, dm.matrix); tiles.setColorAt(i, cols[k % 4]); });
  tiles.receiveShadow = true; g.add(tiles);

  // รูปบนผนังซ้ายและผนังด้านใน
  c.addArt('sketch', -HW, 3.5, -27.6, PI / 2, 3.4, { dark: true });
  c.addArt('cafe-team', -HW, 3.5, -32.4, PI / 2, 3.4, { dark: true });
  c.addArt('booth-tablets', -HW, 3.5, -40.6, PI / 2, 3.4, { dark: true });
  c.addArt('booth-visitors', -HW, 3.5, -45.4, PI / 2, 3.4, { dark: true });
  c.addArt('selfie-mall', 4.7, 3.5, -49.7, 0, 3.4, { dark: true });

  // โต๊ะเล่นเกมกลางห้อง
  b.add(M.woodDark, cyl(.9, 1.1, .12, tx, 0, tz, 28));
  b.add(M.woodDark, cyl(.28, .42, .78, tx, .12, tz, 20));
  b.add(M.wood, cyl(2.0, 1.9, .12, tx, .9, tz, 48));
  b.add(M.sun, torus(2.0, .05, tx, 1.02, tz, 56));
  b.add(M.felt, cyl(1.78, 1.78, .02, tx, 1.02, tz, 48), false);
  const ty = 1.04;
  b.add(M.cards, put(cardGeo(.42, .6, .14, 1), tx - .95, ty + .07, tz + .55, PI / 2, 0, .3));
  b.add(M.cards, put(cardGeo(.42, .6, .08, 2), tx - 1.05, ty + .04, tz - .5, PI / 2, 0, -.4));
  [[.75, .75, .5, 1], [1.05, .35, .15, 2], [1.2, -.15, -.2, 3], [.55, 1.15, .9, 2], [-.25, 1.2, 1.4, 3]].forEach(([dx, dz, yaw, f], i) => {
    b.add(M.cards, put(cardGeo(.42, .6, .012, f), tx + dx, ty + .008 + i * .002, tz + dz, -PI / 2, 0, yaw), false);
  });
  b.add(M.dice, put(diceGeo(.17), tx + .5, ty + .085, tz - 1.05, 0, .5));
  b.add(M.dice, put(diceGeo(.17), tx + .85, ty + .085, tz - .8, 0, 1.2));
  [[-.3, -1.25, M.sun, .3], [.15, -1.4, M.coral, -.4], [-.75, -1.1, M.sky, .9]].forEach(([dx, dz, m, ry]) => b.add(m, put(meepleGeo(.3), tx + dx, ty, tz + dz, 0, ry)));
  place(b, catParts(M), tx - .1, ty, tz - .1, PI / 2, 1.05);
  // การ์ดลอยหมุนเป็นเกลียวเหนือโต๊ะ
  const hg = [];
  for (let i = 0; i < 14; i++) {
    const a = i * .9, y = 2.7 + i * .17;
    hg.push(put(cardGeo(.5, .7, .014, 1 + i % 3), Math.cos(a) * .95, y, Math.sin(a) * .95, 0, PI / 2 - a, .2));
  }
  const helix = new THREE.Mesh(mergeGeometries(hg, false), M.cards);
  helix.position.set(tx, 0, tz); g.add(helix);
  c.anim((dt, t) => { helix.rotation.y = t * .28; helix.position.y = Math.sin(t * .8) * .08; });
  // โคมแขวน
  for (const [x, z, beam] of [[tx, tz, true], [6.3, -32.6, false], [6.3, -40.4, false]]) {
    b.add(M.ink, cyl(.012, .012, H - 5.9, x, 5.9, z, 6), false);
    b.add(M.sun2, cyl(.14, .72, .6, x, 5.3, z, 28, true), false);
    b.add(M.bulb, ball(.1, x, 5.42, z, 12), false, false);
    pts.push([x, 5.36, z]);
    if (beam) b.add(M.beamWarm, put(new THREE.CylinderGeometry(.7, 2.2, 4.2, 28, 1, true), x, 3.2, z), false, false);
  }
  // ลูกเต๋ายักษ์และหมากเกมยักษ์
  b.add(M.dice, put(diceGeo(1.1), -6.55, .55, -36.5, 0, .4));
  b.add(M.dice, put(diceGeo(.8), -6.6, 1.5, -36.45, 0, -.3));
  b.add(M.dice, put(diceGeo(.55), -6.55, 2.175, -36.5, 0, .75));
  for (const [x, z, s, m, ry] of [[-6.5, -24.3, 2.0, M.sun, .5], [6.6, -24.4, 1.7, M.coral, -.6], [7.0, -47.9, 1.5, M.cream, -.8], [-6.7, -48.4, 1.6, M.sky, .7]]) {
    b.add(m, put(meepleGeo(s), x, 0, z, 0, ry));
  }
  // การ์ดยักษ์บนผนังขวา
  [[-29, 1, .06], [-36.5, 2, -.05], [-44, 3, .07]].forEach(([z, f, tilt]) => {
    b.add(M.cards, put(cardGeo(2.2, 3.1, .06, f), 7.95, 3.9, z, 0, -PI / 2, tilt));
    b.add(M.washHard, put(new THREE.PlaneGeometry(4.4, 5.6), 7.985, 4.5, z, 0, -PI / 2), false, false);
  });
  bunting(c, -25.4); bunting(c, -46.8);
  c.text('CARE A CAT', .8, 0, 7.1, -49.68, 0, { color: '#ffd400', font: FD, weight: 800 });
  c.glows(pts, 1.8, 0xffc060, .9);
}

// ======================================================================
// โซน 4: ห้อง IYF (เวทีนานาชาติ) พิกัดในห้องนี้เป็นพิกัดก่อนแทรกห้อง SOP
// ======================================================================
function iyf(c) {
  const { b, g, M, T } = c, cz = -62;
  trim(c, -50, -74, { base: M.inkGloss, baseH: .3 });
  // ผนังระแนงและเส้นไฟ
  for (const s of [-1, 1]) {
    for (let z = -51.5; z > -73; z -= 1.5) b.add(M.inkGloss, boxb(.14, H - .5, .24, s * (HW - .07), .3, z), false);
    for (let z = -52.25; z > -73; z -= 3) b.add(M.ledCobalt, boxb(.03, H - 1.4, .05, s * (HW - .02), .8, z), false, false);
    b.add(M.ledCobalt, boxb(.05, .05, 23.4, s * (HW - .3), H - .22, cz), false, false);
    // ธงผ้าสีพื้น (ไม่ใช่ธงชาติ)
    [M.cobalt, M.sun, M.cream, M.coral, M.sky].forEach((m, i) => {
      const z = -54.5 - i * 3.75;
      b.add(m, box(.04, 3.0, 1.0, s * (HW - .32), 5.6, z), false);
      b.add(M.gold, box(.06, .06, 1.2, s * (HW - .32), 7.13, z), false);
    });
  }
  for (const zz of [-50.55, -73.45]) b.add(M.ledCobalt, boxb(HW * 2 - .7, .05, .05, 0, H - .22, zz), false, false);
  // เวทีกลมสองชั้น
  b.add(M.inkGloss, cyl(3.2, 3.2, .28, 0, 0, cz, 56));
  b.add(M.gold, torus(3.2, .04, 0, .28, cz, 72), false);
  b.add(M.inkGloss, cyl(2.3, 2.3, .24, 0, .28, cz, 48));
  b.add(M.gold, torus(2.3, .035, 0, .52, cz, 64), false);
  b.add(M.ledCobalt, torus(3.3, .03, 0, .04, cz, 72), false, false);
  b.add(M.ledSun, torus(2.36, .02, 0, .31, cz, 64), false, false);
  b.add(M.inkMarble, cyl(.36, .52, 1.0, 0, .52, cz, 24));
  b.add(M.gold, torus(.4, .04, 0, 1.52, cz, 24), false);
  b.add(M.gold, cyl(.05, .07, .8, 0, 1.52, cz, 10), false);
  // ลูกโลกโครงเส้น
  const R = 1.6, wire = [];
  for (const lat of [-60, -40, -20, 0, 20, 40, 60]) { const a = lat * PI / 180; wire.push(torus(R * Math.cos(a), .014, 0, R * Math.sin(a), 0, 48)); }
  for (let i = 0; i < 6; i++) wire.push(put(new THREE.TorusGeometry(R, .014, 6, 64), 0, 0, 0, 0, i * PI / 6));
  const globe = new THREE.Group();
  globe.position.set(0, 3.9, cz); globe.rotation.z = .41;
  globe.add(new THREE.Mesh(mergeGeometries(wire.map(w => (w.index ? w.toNonIndexed() : w)), false), M.wire));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * .96, 32, 20), M.cobaltDeep));
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.05, .03, 8, 72), M.gold), ringB = new THREE.Mesh(new THREE.TorusGeometry(2.3, .024, 8, 72), M.gold);
  ringA.position.copy(globe.position); ringB.position.copy(globe.position);
  g.add(globe, ringA, ringB);
  c.anim((dt, t) => {
    globe.rotation.y = t * .22;
    ringA.rotation.set(1.2 + Math.sin(t * .3) * .3, t * .35, 0);
    ringB.rotation.set(.5, -t * .27, .9 + Math.cos(t * .25) * .3);
  });
  // โครงไฟเวทีและลำแสง
  b.add(M.ink, torus(3.8, .06, 0, 7.7, cz, 48), false);
  b.add(M.ink, torus(3.8, .06, 0, 8.1, cz, 48), false);
  const lens = [];
  for (let i = 0; i < 12; i++) {
    const a = i * PI / 6, x = Math.cos(a) * 3.8, z = cz + Math.sin(a) * 3.8;
    b.add(M.ink, cyl(.03, .03, .4, x, 7.7, z, 6), false);
    if (i % 3 === 0) b.add(M.ink, cyl(.02, .02, H - 8.1, x, 8.1, z, 6), false);
    if (i % 2 === 0) {
      b.add(M.ink, cyl(.16, .2, .36, x, 7.26, z, 12), false);
      const sunny = i % 4 === 0;
      b.add(sunny ? M.ledSun : M.ledCobalt, ball(.13, x, 7.24, z, 10), false, false);
      lens.push([x, 7.2, z]);
      b.add(sunny ? M.beamSun : M.beamCobalt, coneBetween(new THREE.Vector3(x, 7.2, z), new THREE.Vector3(x * .15, .5, cz + (z - cz) * .15), .14, 1.25), false, false);
    }
  }
  c.glows(lens, 1.6, 0x8ea0ff, .9);
  // แท่นพูดและป้ายตั้งพื้น
  b.add(M.inkGloss, boxb(2.4, .2, 1.7, 5.3, 0, -71.0));
  b.add(M.woodDark, boxb(.72, 1.1, .5, 5.3, .2, -71.1));
  b.add(M.gold, box(.5, .5, .02, 5.3, .85, -70.84), false);
  b.add(M.woodDark, put(new THREE.BoxGeometry(.84, .05, .62), 5.3, 1.34, -71.1, .3));
  b.add(M.ink, put(new THREE.CylinderGeometry(.012, .012, .5, 6), 5.42, 1.56, -70.98, .5), false);
  b.add(M.ink, ball(.04, 5.42, 1.79, -70.86, 8), false);
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(.92, 2.3), new THREE.MeshBasicMaterial({ map: T.rollup, color: 0xcfcfcf }));
  ban.position.set(6.95, 1.33, -72.4); ban.rotation.y = -.5; g.add(ban);
  b.add(M.ink, put(new THREE.BoxGeometry(1.0, .06, .3), 6.95, .09, -72.42, 0, -.5));
  b.add(M.ink, put(new THREE.BoxGeometry(.96, 2.34, .02), 6.96, 1.33, -72.43, 0, -.5), false);
  // เก้าอี้ผู้ฟัง
  const chair = mergeGeometries([
    new THREE.BoxGeometry(.5, .06, .5).translate(0, .46, 0), new THREE.BoxGeometry(.5, .56, .05).translate(0, .78, .23),
    ...[[-.21, -.21], [.21, -.21], [-.21, .21], [.21, .21]].map(([x, z]) => new THREE.BoxGeometry(.04, .44, .04).translate(x, .22, z)),
  ].map(q => q.toNonIndexed()), false);
  const chairs = new THREE.InstancedMesh(chair, M.cobaltDeep, 12), dm = new THREE.Object3D();
  let n = 0;
  for (const z of [-53, -54.6, -56.2]) for (const x of [-6.6, -5.5, -4.4, -3.3]) { dm.position.set(x, 0, z); dm.rotation.y = -.18; dm.updateMatrix(); chairs.setMatrixAt(n++, dm.matrix); }
  chairs.castShadow = true; chairs.receiveShadow = true; g.add(chairs);
  // จอเหนือประตูและเกียรติบัตร
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.9), new THREE.MeshBasicMaterial({ map: T.led, fog: false }));
  scr.material.color.setRGB(1.25, 1.25, 1.25);
  scr.position.set(0, 7.3, -73.64); g.add(scr);
  b.add(M.inkGloss, box(7.5, 2.2, .08, 0, 7.3, -73.66), false);
  c.addArt('cert-iyf', -4.9, 3.5, -73.7, 0, 4.0, { dark: true });
}

// ======================================================================
// โซน 5: ห้องค่ายและจิตอาสา (ลานกลางแจ้งใต้ระแนงไม้: ซ้ายคือลำธารนครนายก ขวาคือหาดจันทบุรี ปลายห้องคือมุมจิตอาสา)
// ======================================================================
function tree(b, M, mat, x, z, h) {
  b.add(M.woodDark, cyl(h * .022, h * .034, h * .3, x, .04, z, 8));
  for (let k = 0; k < 3; k++) {
    const ch = h * .38, rad = h * .2 * (1 - k * .2);
    b.add(mat, put(new THREE.ConeGeometry(rad, ch, 8), x, h * .26 + k * h * .19 + ch / 2, z, 0, k * .4));
  }
}
function camp(c) {
  const { b, g, M, T } = c, z0 = BOUNDS[4], z1 = BOUNDS[5], L = z0 - z1, zc = (z0 + z1) / 2, zw = z1 + .3, r = rng(19);
  trim(c, z0, z1, { base: M.marble, baseH: .3, crown: M.marble, crownH: .26 });
  // หลังคากระจกกับระแนงไม้ ระแนงทำให้เกิดเงาลายทางบนพื้นและผนัง
  b.add(M.skyRoof, put(new THREE.PlaneGeometry(HW * 2 - 1.2, L - 1.6), 0, H - .03, zc, PI / 2), false, false);
  for (let z = z0 - 1.5; z > z1 + 1; z -= 2.6) b.add(M.woodDark, boxb(HW * 2, .22, .26, 0, H - .5, z), true, false);
  for (const x of [-5.4, -2.7, 0, 2.7, 5.4]) b.add(M.woodDark, boxb(.26, .2, L - .6, x, H - .28, zc), true, false);
  // ทางเดินไม้กลางห้อง
  b.add(M.wood, boxb(5.2, .06, L - .7, 0, 0, zc), false);
  for (const s of [-1, 1]) b.add(M.woodDark, boxb(.14, .1, L - .7, s * 2.6, 0, zc), false);
  // ป้ายบอกทางหน้าห้อง
  const sx = -3.15, sz = z0 - 2.4, arrow = d => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -.15); sh.lineTo(d * .86, -.15); sh.lineTo(d * 1.06, 0); sh.lineTo(d * .86, .15); sh.lineTo(0, .15); sh.closePath();
    return new THREE.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: false });
  };
  b.add(M.woodDark, cyl(.045, .055, 2.5, sx, .04, sz, 8));
  b.add(M.wood, put(arrow(-1), sx + .1, 2.18, sz + .03));
  b.add(M.wood, put(arrow(1), sx - .1, 1.8, sz + .03));
  c.text('นครนายก 2025', .15, sx - .4, 2.18, sz + .09, 0, { color: '#0c0e1c', weight: 700, px: 60 });
  c.text('จันทบุรี 2026', .15, sx + .38, 1.8, sz + .09, 0, { color: '#0c0e1c', weight: 700, px: 60 });

  // ---------- ผนังซ้าย: ค่ายครั้งที่ 1 นครนายก (ลำธารหินกับต้นไม้) ----------
  b.add(M.meadow, boxb(5.33, .05, L - .7, -5.335, 0, zc), false);
  const fx = z => -4.9 + .75 * Math.sin(z * .42) + .2 * Math.sin(z * 1.1), fw = z => 1.15 + .25 * Math.sin(z * .7);
  const water = new THREE.Mesh(stripZ(z0 - .8, z1 + .8, fx, fw, .075, 90, 2.6), new THREE.MeshBasicMaterial({ map: T.stream }));
  g.add(water);
  c.anim((dt, t) => { T.stream.offset.y = (t * .2) % 1; });
  for (let i = 0; i < 64; i++) {
    const z = z0 - 1.2 - r() * (L - 2.4), side = r() < .5 ? -1 : 1, rad = .13 + r() * .3;
    const x = Math.max(-7.7, fx(z) + side * (fw(z) / 2 + .02 + r() * .5));
    b.add(i % 6 === 0 ? M.rockDark : M.rock, put(rockGeo(rad, r), x, .05 + rad * .28, z));
  }
  for (let i = 0; i < 9; i++) { const z = z0 - 2 - r() * (L - 4); b.add(M.rock, put(rockGeo(.1 + r() * .1, r), fx(z) + (r() - .5) * .5, .1, z)); }
  // พุ่มไม้เตี้ยใต้รูปและข้อความ ต้นไม้สูงอยู่ช่วงท้ายผนังที่ไม่มีรูป
  for (let i = 0; i < 12; i++) {
    const z = z0 - 2.4 - i * 1.2 - r() * .5, rad = .32 + r() * .26;
    b.add([M.tree, M.leafCobalt, M.tree, M.leafSun][i % 4], put(new THREE.IcosahedronGeometry(rad, 1).scale(1.2, .8, 1.2), -7.35 + r() * .3, rad * .6, z));
  }
  tree(b, M, M.tree, -7.05, z0 - 1.25, 3.0);
  [[-7.1, 16.9, 4.6, M.tree], [-6.2, 18.4, 3.4, M.leafSun], [-7.2, 20.0, 5.6, M.leafCobalt], [-6.3, 21.6, 4.0, M.tree], [-7.1, 23.2, 6.0, M.tree], [-6.5, 24.8, 3.2, M.leafCobalt]]
    .forEach(([x, dz, h, mat]) => tree(b, M, mat, x, z0 - dz, h));
  // ภาพเขาบนผนังเป็นแผ่นสีเรียบสองชั้น เตี้ยในช่วงที่มีรูป สูงขึ้นช่วงท้ายห้อง
  const hill = (k, ph, lift) => {
    const sh = new THREE.Shape();
    sh.moveTo(-(z0 - .3), 0);
    for (let z = z0 - .3; z >= z1 + .3; z -= .5) {
      const far = Math.min(1, Math.max(0, (CAMP.q1 - 3.4 - z) / 2));
      sh.lineTo(-z, lift + .55 + .5 * Math.abs(Math.sin(z * k + ph)) + far * (1.5 + 1.1 * Math.abs(Math.sin(z * k * .7 + ph))));
    }
    sh.lineTo(-(z1 + .3), 0); sh.closePath();
    return new THREE.ShapeGeometry(sh);
  };
  b.add(M.sky, put(hill(.52, .4, .4), -HW + .004, 0, 0, 0, PI / 2), false);
  b.add(M.cobaltDeep, put(hill(.74, 1.9, 0), -HW + .008, 0, 0, 0, PI / 2), false);
  c.addArt('camp1-group', -HW, 3.9, CAMP.p1, PI / 2, 4.0);
  const q1 = board({ ...CAMP.camp1, color: '#0c0e1c', tagColor: '#2a3cff', footColor: '#3a3d55', px: 82 });
  const w1 = 4.2, h1 = w1 / q1.ar, y1 = 2.55 + h1 / 2;
  c.sign(q1, w1, -HW + .03, y1, CAMP.q1, PI / 2);
  mould(c, -1, y1, CAMP.q1, w1 + .5, h1 + .36);

  // ---------- ผนังขวา: ค่ายครั้งที่ 2 จันทบุรี (หาดทรายกับคลื่นทะเล) ----------
  b.add(M.sand, boxb(5.33, .05, L - .7, 5.335, 0, zc), false);
  T.foam.repeat.set(1, L / 4);
  const waves = [0, 1].map(k => {
    const m = new THREE.Mesh(put(new THREE.PlaneGeometry(2.7, L - .7), 0, 0, 0, -PI / 2), new THREE.MeshBasicMaterial({ map: T.foam, transparent: true, depthWrite: false, opacity: k ? .6 : 1 }));
    m.position.set(7.1, .06 + k * .012, zc); m.renderOrder = 1 + k; g.add(m);
    return m;
  });
  c.anim((dt, t) => {
    waves[0].position.x = 7.1 + .34 * Math.sin(t * .7);
    waves[1].position.x = 6.82 + .42 * Math.sin(t * .7 - 1.3);
    waves[1].position.z = zc + 1.3;
  });
  // ชื่อ AOM บนทราย อยู่ใต้รูปเขียนชื่อบนหาดทรายพอดี หันให้อ่านได้จากทางเดิน
  const aom = new THREE.Mesh(put(new THREE.PlaneGeometry(2.9, 1.21).rotateX(-PI / 2), 4.45, .058, CAMP.p3, 0, -PI / 2), new THREE.MeshBasicMaterial({ map: T.aom, transparent: true, depthWrite: false }));
  g.add(aom);
  for (let i = 0; i < 7; i++) b.add(M.rock, put(rockGeo(.07 + r() * .09, r), 3.1 + r() * 2.6, .08, z0 - 1.5 - r() * (L - 3)));
  // ภาพทะเลบนผนัง: แถบน้ำ เส้นขอบฟ้า ดวงอาทิตย์ครึ่งดวง และเกาะ
  b.add(M.cobalt, box(.008, 1.45, L - .6, HW - .004, .725, zc), false);
  b.add(M.sky, box(.008, .12, L - .6, HW - .004, 1.51, zc), false);
  b.add(M.sun, put(new THREE.CircleGeometry(2.3, 48, 0, PI).translate(z0 - 4.6, 1.57, 0), HW - .005, 0, 0, 0, -PI / 2), false, false);
  const isle = new THREE.Shape();
  isle.moveTo(z0 - 8.6, 1.57); isle.quadraticCurveTo(z0 - 7.9, 2.25, z0 - 7.1, 1.57); isle.closePath();
  b.add(M.cobaltDeep, put(new THREE.ShapeGeometry(isle), HW - .009, 0, 0, 0, -PI / 2), false, false);
  c.addArt('camp2-group', HW, 3.9, CAMP.p2, -PI / 2, 3.8);
  c.addArt('camp2-beach', HW, 4.1, CAMP.p3, -PI / 2, 2.5);
  const q2 = board({ ...CAMP.camp2, color: '#0c0e1c', tagColor: '#2a3cff', footColor: '#3a3d55', px: 82 });
  const w2 = 4.0, h2 = w2 / q2.ar, y2 = 2.7 + h2 / 2;
  c.sign(q2, w2, HW - .03, y2, CAMP.q2, -PI / 2);
  mould(c, 1, y2, CAMP.q2, w2 + .5, h2 + .36);

  // ---------- ผนังปลายห้อง: มุมจิตอาสา (ริบบิ้นแดงเหนือประตู รูปหมู่ และข้อความจากเกียรติบัตร) ----------
  const band = [[-.78, -1.3], [-.36, -.72], [0, -.22], [.36, .3], [.5, .72], [.36, 1.08], [0, 1.25]], k = .8, ry0 = 7.42;
  b.add(M.tile, put(new THREE.CylinderGeometry(1.27, 1.27, .04, 56), 0, ry0, zw + .03, PI / 2), false);
  b.add(M.gold, put(new THREE.TorusGeometry(1.27, .04, 8, 64), 0, ry0, zw + .05), false);
  b.add(M.red, put(strokeGeo(band, .36, .1).scale(k, k, 1), 0, ry0, zw + .13));
  b.add(M.red, put(strokeGeo(band.map(([x, y]) => [-x, y]), .36, .1).scale(k, k, 1), 0, ry0, zw + .25));
  c.addArt('volunteer-group', -4.9, 3.6, zw, 0, 3.6);
  const vb = board({ ...CAMP.volunteer, color: '#0c0e1c', tagColor: '#d3222e', footColor: '#3a3d55', px: 60 });
  const vw = 3.6, vh = vw / vb.ar, vx = 4.9, vy = 3.7;
  c.sign(vb, vw, vx, vy, zw + .03);
  for (const d of [-1, 1]) {
    b.add(M.gold, box(vw + .5, .05, .03, vx, vy + d * (vh / 2 + .2), zw + .015), false);
    b.add(M.gold, box(.05, vh + .4, .03, vx + d * (vw / 2 + .25), vy, zw + .015), false);
  }
  b.add(M.red, box(vw + .5, .1, .03, vx, vy - vh / 2 - .42, zw + .015), false);
}

// ======================================================================
// โซน 6: หอเกียรติบัตร
// ======================================================================
function certs(c) {
  const { b, M } = c, pts = [], z0 = BOUNDS[5], z1 = BOUNDS[6], L = z0 - z1, zc = (z0 + z1) / 2;
  trim(c, z0, z1, { base: M.inkMarble, rail: M.gold, railY: 1.3 });
  // บัวเพดานแบบฟันบัว
  for (const s of [-1, 1]) {
    b.add(M.marble, boxb(.5, .42, L - .6, s * (HW - .25), H - .7, zc), false);
    b.add(M.marble, boxb(.7, .28, L - .6, s * (HW - .35), H - .28, zc), false);
    b.add(M.gold, boxb(.04, .05, L - .6, s * (HW - .52), H - .76, zc), false);
    for (let z = z0 - .6; z > z1 + .5; z -= .505) b.add(M.marble, boxb(.16, .16, .26, s * (HW - .58), H - .88, z), false);
  }
  // เสาอิงและคานเพดาน อยู่กึ่งกลางระหว่างเกียรติบัตรแต่ละใบ
  for (let z = z0 - 3.5; z > z1 + 1; z -= 5) {
    for (const s of [-1, 1]) {
      const x = s * (HW - .11);
      b.add(M.marble, boxb(.22, H - 1.1, .56, x, 0, z), false);
      b.add(M.marble, boxb(.34, .42, .72, s * (HW - .17), 0, z), false);
      b.add(M.gold, boxb(.36, .08, .74, s * (HW - .18), H - 1.3, z), false);
      b.add(M.marble, boxb(.34, .26, .72, s * (HW - .17), H - 1.22, z), false);
    }
    b.add(M.marble, boxb(HW * 2 - 1, .34, .44, 0, H - .34, z), false, false);
  }
  // พรมทางเดิน
  b.add(M.cobalt, boxb(2.2, .02, L - .8, 0, 0, zc), false);
  for (const s of [-1, 1]) b.add(M.sun, boxb(.1, .024, L - .8, s * 1.15, 0, zc), false);
  // เกียรติบัตร 8 ใบ เรียงตามเวลา พร้อมช่องแสงเหนือศีรษะและลำแสงที่ส่องลงมา
  const shaftPos = [], shaftUv = [];
  for (const cw of CERT_WALL) {
    const s = cw.side, z = cw.z;
    c.addArt(cw.id, s * HW, 3.6, z, -s * PI / 2, 3.5);
    b.add(M.skyl, put(new THREE.PlaneGeometry(3.2, 1.7), s * 1.9, H - .02, z, PI / 2), false, false);
    for (const [bw, bd, dx, dz] of [[3.4, .1, 0, -.9], [3.4, .1, 0, .9], [.1, 1.9, -1.65, 0], [.1, 1.9, 1.65, 0]]) b.add(M.gold, box(bw, .08, bd, s * 1.9 + dx, H - .04, z + dz), false);
    for (const dz of [-.55, 0, .55]) {
      const A = [s * .5, H - .06, z + dz], B = [s * 3.3, H - .06, z + dz], C = [s * (HW - .1), 5.9, z + dz], D = [s * (HW - .1), 1.2, z + dz];
      shaftPos.push(...A, ...B, ...C, ...A, ...C, ...D);
      shaftUv.push(0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0);
    }
    // ฝั่งตรงข้ามเป็นคิ้วผนังและโคม
    mould(c, -s, 4.2, z, 3.4, 4.4);
    sconce(c, -s, 4.3, z, pts);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(shaftPos, 3));
  sg.setAttribute('uv', new THREE.Float32BufferAttribute(shaftUv, 2));
  sg.computeVertexNormals();
  b.add(M.shaft, sg, false, false);
  for (const s of [-1, 1]) { pedestal(c, s * 6.8, z0 - 1.3); pedestal(c, s * 6.8, z1 + 1.3); }
  b.add(M.gold, box(4.7, 1.34, .04, 0, 7.2, z1 + .32), false);
  b.add(M.inkMarble, box(4.56, 1.2, .06, 0, 7.2, z1 + .33), false);
  c.text('เกียรติบัตร', .9, 0, 7.2, z1 + .37, 0, { gold: true });
  c.glows(pts, 1.5, 0xffb45a, .85);
}

// ======================================================================
// โซน 7: ห้องสุดท้าย (มาคุยกัน) พิกัดในห้องนี้เป็นพิกัดก่อนแทรกห้องใหม่
// ======================================================================
function final(c) {
  const { b, M } = c, zb = -123.69;
  trim(c, -106, -124, { base: M.sunDark, baseH: .4, crown: M.sunLite, crownH: .3 });
  b.add(M.sunDark, boxb(DW + .8, .4, .1, 0, 0, -123.65), false);
  // ลายรัศมีบนผนังด้านใน ทำให้จางเพื่อไม่กวนตัวหนังสือ
  for (let i = 0; i < 18; i++) {
    const a = i * PI / 9, a2 = a + PI / 22, r0 = 1.5, r1 = 12;
    const sh = new THREE.Shape();
    sh.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); sh.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    sh.lineTo(Math.cos(a2) * r1, Math.sin(a2) * r1); sh.lineTo(Math.cos(a2) * r0, Math.sin(a2) * r0); sh.closePath();
    const geo = new THREE.ShapeGeometry(sh), p = geo.attributes.position;
    // ตัดส่วนที่เลยผนังออก
    for (let k = 0; k < p.count; k++) p.setXY(k, Math.max(-HW + .05, Math.min(HW - .05, p.getX(k))), Math.max(-4.1, Math.min(4.7, p.getY(k))));
    b.add(M.sunLite, put(geo, 0, 4.2, zb), false, false);
  }
  b.add(M.sunDark, put(new THREE.RingGeometry(1.3, 1.5, 48), 0, 4.2, zb + .004), false, false);
  b.add(M.sunDark, put(new THREE.RingGeometry(3.0, 3.08, 64), 0, 4.2, zb + .004), false, false);
  // เสาและธงผ้า
  for (const z of [-111, -119]) for (const s of [-1, 1]) column(b, M.cobalt, s * 6, z, H, .42, { trim: M.gold });
  for (const s of [-1, 1]) for (const z of [-115]) {
    b.add(M.cobalt, box(.05, 5, 1.8, s * (HW - .1), 5, z), false);
    b.add(M.gold, box(.08, .08, 2.1, s * (HW - .1), 7.55, z), false);
    b.add(M.gold, box(.055, .12, 1.8, s * (HW - .1), 3.0, z), false);
  }
  // พรมและแท่นกลม
  b.add(M.cobalt, boxb(2.4, .02, 8.6, 0, 0, -110.3), false);
  for (const s of [-1, 1]) b.add(M.gold, boxb(.08, .024, 8.6, s * 1.24, 0, -110.3), false);
  b.add(M.cobalt, cyl(2.6, 2.6, .2, 0, 0, -117, 56));
  b.add(M.gold, torus(2.6, .05, 0, .2, -117, 72), false);
  b.add(M.gold, torus(2.0, .02, 0, .205, -117, 64), false);
  for (const s of [-1, 1]) pedestal(c, s * 6.8, -122.6, M.cobaltMarble);
}

export const BUILD = [exterior, hall, sop, cat, iyf, camp, certs, final];
// ระยะที่ต้องเลื่อนห้องเดิมไปตามแกน z (ผนังหน้าห้องเดิมเคยอยู่ที่ -22, -50 และ -106)
export const SHIFT = [0, 0, 0, BOUNDS[2] + 22, BOUNDS[3] + 50, 0, 0, BOUNDS[6] + 106];
