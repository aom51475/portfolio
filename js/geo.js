// ตัวช่วยสร้างรูปทรง: กล่อง เสามีร่อง แจกัน การ์ด ลูกเต๋า หมากเกม
// และตัวรวมชิ้นส่วนที่ใช้วัสดุเดียวกันให้เป็นก้อนเดียว เพื่อให้วาดได้เร็ว
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _eu = new THREE.Euler(), _p3 = new THREE.Vector3(), _s3 = new THREE.Vector3(1, 1, 1);

export function put(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  _q4.setFromEuler(_eu.set(rx, ry, rz));
  g.applyMatrix4(_m4.compose(_p3.set(x, y, z), _q4, _s3));
  return g;
}
// กำหนด UV ตามตำแหน่งจริงในฉาก ลายหินอ่อนจึงต่อเนื่องกันทุกชิ้น (s = จำนวนเมตรต่อลายหนึ่งแผ่น)
export function wuv(g, s = 4) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / s, -p.getZ(i) / s);
    else if (ax >= az) uv.setXY(i, -p.getZ(i) / s, p.getY(i) / s);
    else uv.setXY(i, p.getX(i) / s, p.getY(i) / s);
  }
  return g;
}
export const box = (w, h, d, x, y, z, ry = 0) => wuv(put(new THREE.BoxGeometry(w, h, d), x, y, z, 0, ry, 0));
export const boxb = (w, h, d, x, y0, z, ry = 0) => box(w, h, d, x, y0 + h / 2, z, ry);
export const cyl = (rt, rb, h, x, y0, z, seg = 24, open = false) => put(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), x, y0 + h / 2, z);
export const torus = (R, tube, x, y, z, seg = 32) => put(new THREE.TorusGeometry(R, tube, 8, seg), x, y, z, Math.PI / 2);
export const ball = (r, x, y, z, seg = 14) => put(new THREE.SphereGeometry(r, seg, Math.max(6, seg * .7 | 0)), x, y, z);
// แผ่นระนาบหงายขึ้น (พื้น พรม)
export const flat = (w, d, x, y, z) => wuv(put(new THREE.PlaneGeometry(w, d), x, y, z, -Math.PI / 2));

export class Batch {
  constructor() { this.map = new Map(); }
  add(mat, geo, cast = true, recv = true) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    const key = mat.uuid + (cast ? 1 : 0) + (recv ? 1 : 0);
    let e = this.map.get(key);
    if (!e) this.map.set(key, e = { mat, cast, recv, list: [] });
    e.list.push(g);
    return this;
  }
  flush(group) {
    for (const e of this.map.values()) {
      const merged = mergeGeometries(e.list, false);
      if (!merged) continue;
      const m = new THREE.Mesh(merged, e.mat);
      m.castShadow = e.cast; m.receiveShadow = e.recv;
      group.add(m);
      e.list.forEach(g => g.dispose());
    }
    this.map.clear();
  }
}

// ลำเสามีร่อง (fluted shaft) สอบเข้าหาปลายบน
export function shaftGeo(r0, r1, h, flutes = 20) {
  const g = new THREE.CylinderGeometry(r1, r0, h, flutes * 6, 1, true);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const f = Math.abs(Math.sin(Math.atan2(z, x) * flutes / 2));
    const k = 1 - .075 * (1 - (1 - f) * (1 - f));
    p.setXYZ(i, x * k, p.getY(i), z * k);
    uv.setY(i, uv.getY(i) * h / 4);
  }
  g.computeVertexNormals();
  return g;
}
// เสาทั้งต้น: ฐาน บัวฐาน ลำเสามีร่อง บัวหัวเสา
export function column(b, mat, x, z, h, r, { y0 = 0, trim = mat, cast = true, flutes = 20 } = {}) {
  const pl = r * .34, capH = r * .475;
  b.add(trim, boxb(r * 2.7, pl, r * 2.7, x, y0, z), cast);
  b.add(trim, torus(r * 1.12, r * .2, x, y0 + pl + r * .18, z), cast);
  b.add(trim, torus(r * 1.0, r * .12, x, y0 + pl + r * .42, z), cast);
  const s0 = y0 + pl + r * .5, s1 = y0 + h - capH * 2;
  b.add(mat, put(shaftGeo(r, r * .86, s1 - s0, flutes), x, (s0 + s1) / 2, z), cast);
  b.add(trim, torus(r * .9, r * .09, x, s1 - r * .12, z), cast);
  b.add(trim, cyl(r * 1.32, r * .9, capH, x, s1, z, 24), cast);
  b.add(trim, boxb(r * 2.9, capH, r * 2.9, x, y0 + h - capH, z), cast);
}
// แจกันทรงคลาสสิก
export function urn(s, x, y, z) {
  const prof = [[0, 0], [.22, 0], [.24, .04], [.12, .1], [.1, .2], [.3, .42], [.36, .62], [.3, .82], [.2, .9], [.24, .96], [.26, 1.0], [.2, 1.0], [0, .98]];
  return put(new THREE.LatheGeometry(prof.map(([a, c]) => new THREE.Vector2(a * s, c * s)), 20), x, y, z);
}
// การ์ด: หน้าการ์ดใช้ช่อง face (1 ถึง 3) ของแผ่นลาย หลังการ์ดใช้ช่อง 0
export function cardGeo(w, h, t, face) {
  const g = new THREE.BoxGeometry(w, h, t), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const f = i / 4 | 0;
    if (f === 4) uv.setX(i, (face + uv.getX(i)) / 4);
    else if (f === 5) uv.setX(i, uv.getX(i) / 4);
    else uv.setXY(i, (face + .03) / 4, .5);
  }
  return g;
}
// ลูกเต๋า: แผ่นลาย 3 x 2 ช่อง เรียงตามลำดับหน้าของกล่อง
export function diceGeo(s) {
  const g = new THREE.BoxGeometry(s, s, s), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const f = i / 4 | 0;
    uv.setXY(i, (f % 3 + uv.getX(i)) / 3, (1 - (f / 3 | 0) + uv.getY(i)) / 2);
  }
  return g;
}
// หมากเกมรูปคน (ทรงทั่วไปของบอร์ดเกม) สูง s
export function meepleGeo(s) {
  const sh = new THREE.Shape();
  sh.moveTo(-.42, 0); sh.lineTo(-.13, 0); sh.lineTo(0, .17); sh.lineTo(.13, 0); sh.lineTo(.42, 0);
  sh.quadraticCurveTo(.4, .26, .27, .37);
  sh.lineTo(.5, .44); sh.quadraticCurveTo(.56, .52, .5, .6);
  sh.lineTo(.17, .66);
  sh.absarc(0, .82, .18, -Math.PI / 3, Math.PI * 4 / 3, false);
  sh.lineTo(-.17, .66); sh.lineTo(-.5, .6); sh.quadraticCurveTo(-.56, .52, -.5, .44);
  sh.lineTo(-.27, .37); sh.quadraticCurveTo(-.4, .26, -.42, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: .26, bevelEnabled: true, bevelThickness: .045, bevelSize: .04, bevelSegments: 3, curveSegments: 14 });
  g.translate(0, .04, -.13);
  g.scale(s, s, s);
  return g;
}
// ทรงกรวยแสง จากจุดกำเนิด a ไปยังจุดตก b
export function coneBetween(a, b, r0, r1, seg = 20) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}
// แถบหนาตามเส้นโค้งในระนาบ XY (ใช้ทำริบบิ้น): pts = จุดบนเส้นกลาง, w = ความกว้างแถบ, depth = ความหนา
export function strokeGeo(pts, w, depth) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], 0)), false, 'catmullrom', .5);
  const P = curve.getSpacedPoints(56), L = [], R = [];
  P.forEach((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const tx = b.x - a.x, ty = b.y - a.y, n = Math.hypot(tx, ty) || 1, nx = -ty / n * w / 2, ny = tx / n * w / 2;
    L.push(new THREE.Vector2(p.x + nx, p.y + ny)); R.push(new THREE.Vector2(p.x - nx, p.y - ny));
  });
  const g = new THREE.ExtrudeGeometry(new THREE.Shape([...L, ...R.reverse()]), { depth, bevelEnabled: true, bevelThickness: depth * .25, bevelSize: depth * .2, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -depth / 2);
  return g;
}
// ก้อนหินเหลี่ยม: rnd คือตัวสุ่มที่ให้ค่า 0 ถึง 1
export function rockGeo(r, rnd) {
  const g = new THREE.DodecahedronGeometry(r, 0);
  g.scale(1 + rnd() * .5, .5 + rnd() * .3, 1 + rnd() * .4);
  g.rotateY(rnd() * 6.28);
  return g;
}
// แถบแบนคดเคี้ยวตามแนว z หงายขึ้น (ใช้ทำลำธาร): fx(z) = ตำแหน่งกึ่งกลาง, fw(z) = ความกว้าง, vs = ความยาวต่อลายหนึ่งแผ่น
export function stripZ(z0, z1, fx, fw, y, n = 64, vs = 3) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const z = z0 + (z1 - z0) * i / n, x = fx(z), w = fw(z) / 2, v = Math.abs(z - z0) / vs;
    pos.push(x - w, y, z, x + w, y, z); uv.push(0, v, 1, v);
    if (i < n) { const a = i * 2; if (z1 < z0) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
export { mergeGeometries };
