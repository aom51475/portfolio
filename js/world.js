// โครงของฉาก: วัสดุ ผนังพื้นเพดานของแต่ละห้อง ประตู กรอบรูปที่กดได้ แสง และบรรยากาศที่เปลี่ยนไปตามห้อง
// จำนวนโซนคิดจาก BOUNDS ใน data.js ข้อมูลประจำโซน (ATM, LAMPS, พื้น ผนัง เพดาน) ต้องมีครบทุกโซน
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { HW, H, DW, DH, BOUNDS, NZ } from './data.js';
import { Batch, box, boxb, put, wuv } from './geo.js';
import { makeTextures, label } from './tex.js';
import { BUILD, SHIFT } from './rooms.js';

const LAST = NZ - 1;                       // หมายเลขโซนสุดท้าย
const END = BOUNDS[LAST];                  // ผนังท้ายอาคาร
const mid = i => (BOUNDS[i - 1] + BOUNDS[i]) / 2;
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
// หมายเลขห้องที่กล้องอยู่ (0 = หน้าอาคาร)
export const zoneAt = z => { let n = 0; for (let k = 0; k < LAST; k++) if (z < BOUNDS[k]) n++; return n; };
// หมายเลขห้องแบบต่อเนื่อง ใช้ไล่บรรยากาศระหว่างห้อง
const zoneF = z => { let f = 0; for (let k = 0; k < LAST; k++) f += smooth(BOUNDS[k] + 2.5 - z, 0, 5); return f; };

// บรรยากาศของแต่ละห้อง: สีหมอก ระยะหมอก ความสว่างของแสงแต่ละชนิด
const ATM = [
  // แสงอาทิตย์ (sun) ต้องเด่นกว่าแสงเสริม (hemi, env) ไม่อย่างนั้นเงาจะถูกกลบจนมองไม่เห็น
  { fog: 0xf6c592, near: 80, far: 420, hemi: .5, sun: 2.4, env: .2, sky: 0xffe6cc, gnd: 0x5560b8 },    // หน้าอาคาร
  { fog: 0xe9e2d2, near: 30, far: 110, hemi: .5, sun: 2.4, env: .12, sky: 0xffffff, gnd: 0xa89c84 },   // โถงต้อนรับ
  { fog: 0x1a2050, near: 28, far: 100, hemi: .5, sun: 2.3, env: .12, sky: 0xfff0dc, gnd: 0x58506e },   // ห้อง SOP (ห้องหนังสือสีกรมท่ากับไม้)
  { fog: 0x1b2bd0, near: 26, far: 90, hemi: .6, sun: 2.4, env: .12, sky: 0xe6eaff, gnd: 0x4a58e0 },    // ห้อง Care a Cat
  { fog: 0x05060f, near: 14, far: 60, hemi: .2, sun: .7, env: .08, sky: 0x8ea0ff, gnd: 0x141838 },     // ห้อง IYF
  { fog: 0xdbe6f4, near: 34, far: 130, hemi: .8, sun: 2.7, env: .14, sky: 0xf4f8ff, gnd: 0xe8dfc8 },  // ห้องค่ายและจิตอาสา (กลางแจ้ง)
  { fog: 0xf1ead9, near: 30, far: 120, hemi: .5, sun: 2.4, env: .12, sky: 0xffffff, gnd: 0xa89c84 },   // หอเกียรติบัตร
  { fog: 0xffd400, near: 22, far: 90, hemi: .95, sun: 2.4, env: .22, sky: 0xffffff, gnd: 0xffd65a },   // มาคุยกัน
];
// ไฟประจำห้อง: pt = [x, y, z, สี, ความสว่าง, ระยะ], sp = [x, y, z, เป้า x, y, z, สี, ความสว่าง, มุม, ระยะ]
const LAMPS = [
  { pt: [0, 5.2, 4.6, 0xffc070, 14, 26] },
  { pt: [0, 5.6, -11, 0xffe2b0, 14, 30], sp: [0, 8.2, -13, 0, 3.6, -21.7, 0xfff0d8, 60, .62, 30] },
  { pt: [0, 5.4, mid(2), 0xffdcaa, 16, 32], sp: [0, 8.6, mid(2), 0, 0, mid(2), 0xffeccc, 60, .9, 26] },
  { pt: [-1.6, 5.0, mid(3) - .5, 0xfff0d0, 14, 28], sp: [-1.6, 8.6, mid(3) - .5, -1.6, 0, mid(3) - .5, 0xfff2d6, 50, .5, 22] },
  { pt: [0, 3.9, mid(4), 0x5f7bff, 30, 24], sp: [0, 8.6, mid(4), 0, 0, mid(4), 0x9aaaff, 200, .55, 22] },
  { pt: [0, 6.2, mid(5), 0xfff6e6, 10, 36] },
  { pt: [0, 6, mid(6), 0xfff0dc, 18, 48], sp: [0, 8.8, mid(6), 0, 0, mid(6), 0xfff4e0, 60, 1.0, 26] },
  { pt: [0, 5.5, END + 8, 0xfff2c0, 30, 30] },
];
const SHORT = {
  'cert-iyf': 'IYF LEADERS CONFERENCE 2026', 'cert-ws3': 'WORKSHOP #3', 'cert-ws12': 'WORKSHOP #1-2',
  'cert-camp1': 'ENGLISH DAY CAMP 2025', 'cert-camp2': 'ENGLISH CAMP 2026', 'cert-volunteer': 'เยาวชนจิตอาสา 2568',
  'camp1-group': 'ENGLISH CAMP · นครนายก 2025', 'camp2-group': 'ENGLISH CAMP · จันทบุรี 2026', 'volunteer-group': 'โครงการเยาวชนจิตอาสา',
};
// รูปของห้องตั้งแต่โซนนี้ลงไปโหลดพร้อมหน้าแรก ห้องที่ลึกกว่านี้โหลดทีหลังเมื่อเดินเข้าใกล้ หรือทยอยโหลดตอนเครื่องว่าง
const EAGER_ZONE = 3;

export async function createWorld({ renderer, tier, arts, onImage = () => {}, step }) {
  const T = await makeTextures(tier, renderer, () => step(.12));
  await step(.3);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(ATM[0].fog);
  scene.fog = new THREE.Fog(ATM[0].fog, ATM[0].near, ATM[0].far);
  const pm = new THREE.PMREMGenerator(renderer), envScene = new RoomEnvironment();
  scene.environment = pm.fromScene(envScene, .04).texture;
  pm.dispose();
  scene.environmentIntensity = ATM[0].env;

  // ---------- วัสดุ ----------
  const std = o => new THREE.MeshStandardMaterial(o);
  const basic = o => new THREE.MeshBasicMaterial(o);
  // แสงเรืองแบบบวก: เมื่อเปิดเอฟเฟกต์แสงฟุ้ง ภาพจะถูกผสมสีแบบเชิงเส้น แสงพวกนี้จึงแรงขึ้นมากจนย้อมสีกรมท่าเป็นน้ำตาล ต้องลดลงด้วย glowK
  let glowK = 1;
  const addList = [];
  const additive = m => { m.userData.op = m.opacity; m.opacity *= glowK; addList.push(m); return m; };
  const glowy = (map, color, opacity) => additive(basic({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  const hdrList = [];
  const hdr = (r, g, b) => { const m = basic({ fog: false }); m.userData.hdr = [r, g, b]; hdrList.push(m); return m; };
  // เครื่องที่ไม่มีเอฟเฟกต์แสงฟุ้ง ให้ลดค่าสีลง ไม่อย่างนั้นสีจะกลายเป็นขาวล้วน
  function applyHdr(t) {
    for (const m of hdrList) {
      const [r, g, b] = m.userData.hdr, k = t === 3 ? 1 : Math.min(1, 1.15 / Math.max(r, g, b));
      m.color.setRGB(r * k, g * k, b * k);
    }
    glowK = t === 3 ? .4 : 1;
    for (const m of addList) m.opacity = m.userData.op * glowK;
  }
  const M = {
    marble: std({ map: T.marble, roughness: .4 }),
    panel: std({ map: T.panel, roughness: .62 }),
    inkMarble: std({ map: T.ink, roughness: .2 }),
    cobaltMarble: std({ map: T.cobalt, roughness: .25 }),
    checker: std({ map: T.checkHall, roughness: .22 }),
    gold: std({ color: 0xd9a441, roughness: .26, metalness: 1 }),
    plate: std({ color: 0xead9a8, roughness: .45, metalness: .35 }),
    ink: std({ color: 0x0c0e1c, roughness: .6 }),
    inkGloss: std({ color: 0x10143a, roughness: .18, metalness: .15 }),
    ink2: std({ color: 0x10143a, roughness: .35, side: THREE.DoubleSide }),
    cream: std({ color: 0xebe6da, roughness: .75 }),
    ceil: std({ color: 0xf2eee4, roughness: .95 }),
    cobalt: std({ color: 0x2a3cff, roughness: .5 }),
    cobaltDeep: std({ color: 0x1524b8, roughness: .55 }),
    sun: std({ color: 0xffd400, roughness: .5 }),
    sun2: std({ color: 0xffd400, roughness: .5, side: THREE.DoubleSide }),
    sunLite: std({ color: 0xffdd33, roughness: .7 }),
    sunDark: std({ color: 0xf4c600, roughness: .7 }),
    coral: std({ color: 0xff6b4a, roughness: .5 }),
    sky: std({ color: 0x7f8cff, roughness: .5 }),
    wood: std({ map: T.wood, roughness: .5 }),
    woodDark: std({ map: T.wood, color: 0x6a4a38, roughness: .45 }),
    felt: std({ color: 0x1a2ad0, roughness: .95 }),
    plasterCobalt: std({ map: T.plaster, color: 0x2538ee, roughness: .85 }),
    plasterInk: std({ map: T.plaster, color: 0x161a3a, roughness: .8 }),
    plasterSun: std({ map: T.plaster, color: 0xffd400, roughness: .8 }),
    plasterNavy: std({ map: T.plaster, color: 0x1c2460, roughness: .82 }),
    plasterCream: std({ map: T.plaster, color: 0xfff6e6, roughness: .9 }),
    ground: std({ map: T.ground, color: 0x2a35a8, roughness: .95 }),
    tree: std({ color: 0x101a66, roughness: .9, flatShading: true }),
    leafCobalt: std({ color: 0x2233d8, roughness: .9, flatShading: true }),
    leafSun: std({ color: 0xf2c200, roughness: .9, flatShading: true }),
    mount: std({ color: 0x2733bd, roughness: 1, flatShading: true }),
    rock: std({ map: T.marble, color: 0xdcd6c8, roughness: .8, flatShading: true }),
    rockDark: std({ color: 0x4a5080, roughness: .85, flatShading: true }),
    meadow: std({ map: T.plaster, color: 0xe6d584, roughness: .95 }),
    sand: std({ map: T.sand, roughness: .95 }),
    red: std({ color: 0xd3222e, roughness: .42 }),
    tile: std({ color: 0xffffff, roughness: .5 }),
    cards: std({ map: T.cards, roughness: .5 }),
    dice: std({ map: T.dice, roughness: .35 }),
    water: basic({ map: T.water }),
    bulb: hdr(6, 4.2, 2.0), ledCobalt: hdr(.5, .9, 6), ledSun: hdr(6, 4.6, .3), skyl: hdr(3.2, 3.0, 2.6), wire: hdr(1.5, 1.15, .35),
    // หลังคากระจกของห้องค่าย: สว่างแค่พอให้เป็นท้องฟ้า ไม่ถึงเกณฑ์แสงฟุ้ง ภาพจึงไม่ขุ่น
    skyRoof: hdr(1.12, 1.18, 1.28),
    beamWarm: glowy(T.beam, 0xffe2b0, .15), beamCobalt: glowy(T.beam, 0x5f7bff, .3), beamSun: glowy(T.beam, 0xffd400, .2),
    shaft: glowy(T.shaft, 0xfff0d0, .28), washSoft: glowy(T.wash, 0xffe9c4, .2), washHard: glowy(T.wash, 0xffe2b0, .5),
    // แสงตกบนผนังสีกรมท่าต้องเป็นโทนฟ้า ถ้าใช้โทนส้มผนังจะกลายเป็นสีน้ำตาล
    washCool: glowy(T.wash, 0x5468ff, .34),
  };
  // โลหะสีทองต้องมีภาพสะท้อนจึงจะดูเป็นทอง
  M.gold.envMap = scene.environment; M.gold.envMapIntensity = 1.3;
  M.plate.envMap = scene.environment; M.plate.envMapIntensity = 1.4;
  applyHdr(tier);

  // พื้น ผนัง เพดาน ของแต่ละโซน (โซน 0 คือด้านนอก ไม่มี)
  const floorM = [null,
    std({ map: T.checkHall, roughness: .12 }),
    std({ map: T.parquet, roughness: .2 }),
    std({ map: T.cobalt, color: 0x8088c8, roughness: .15 }),
    std({ map: T.ink, roughness: .08 }),
    std({ map: T.plaster, color: 0xeadfc6, roughness: .9 }),
    std({ map: T.checkCert, roughness: .12 }),
    std({ map: T.plaster, color: 0xffd400, roughness: .3 }),
  ];
  const floorOp = [0, .68, .74, .6, .5, 1, .7, .76];
  const wallM = [null, M.panel, M.plasterNavy, M.plasterCobalt, M.plasterInk, M.plasterCream, M.panel, M.plasterSun];
  const ceilM = [null, M.ceil, M.ceil, M.cobaltDeep, M.ink, M.ceil, M.ceil, M.plasterSun];
  const dustCol = [0, 0xfff0d0, 0xffe6c0, 0xbfc8ff, 0x8ea0ff, 0xffffff, 0xfff0d0, 0xffffff];
  for (const [name, list] of Object.entries({ ATM, LAMPS, floorM, floorOp, wallM, ceilM, dustCol, BUILD })) {
    if (list.length !== NZ) throw new Error(`ข้อมูล ${name} มี ${list.length} โซน แต่อาคารมี ${NZ} โซน`);
  }

  // ---------- โซน ----------
  const zones = [], batches = [], anims = [], artReg = [];
  for (let i = 0; i <= LAST; i++) { const g = new THREE.Group(); scene.add(g); zones.push(g); batches.push(new Batch()); }

  function doorSlab(b, mat, zc) {
    const sw = HW - DW / 2;
    b.add(mat, box(sw, H, .3, -(DW / 2 + sw / 2), H / 2, zc), false, true);
    b.add(mat, box(sw, H, .3, DW / 2 + sw / 2, H / 2, zc), false, true);
    b.add(mat, box(DW, H - DH, .3, 0, DH + (H - DH) / 2, zc), false, true);
  }
  const floors = [];
  for (let i = 1; i <= LAST; i++) {
    const z0 = BOUNDS[i - 1], z1 = BOUNDS[i], L = z0 - z1, zc = (z0 + z1) / 2, b = batches[i];
    const f = new THREE.Mesh(wuv(put(new THREE.PlaneGeometry(HW * 2, L), 0, 0, zc, -Math.PI / 2)), floorM[i]);
    f.receiveShadow = true; f.renderOrder = -1; zones[i].add(f); floors[i] = f;
    b.add(ceilM[i], box(HW * 2 + .6, .3, L, 0, H + .15, zc), false, false);
    b.add(wallM[i], box(.3, H, L, -HW - .15, H / 2, zc), false, true);
    b.add(wallM[i], box(.3, H, L, HW + .15, H / 2, zc), false, true);
    doorSlab(b, wallM[i], z0 - .15);
    if (i < LAST) doorSlab(b, wallM[i], z1 + .15);
    else b.add(wallM[i], box(HW * 2, H, .3, 0, H / 2, z1 + .15), false, true);
  }

  // ---------- ประตู ----------
  const doors = [];
  for (let k = 0; k < LAST; k++) {
    const z = BOUNDS[k], grp = new THREE.Group(), b = new Batch();
    scene.add(grp);
    for (const s of [-1, 1]) {
      b.add(M.inkMarble, boxb(.36, DH + .18, .86, s * (DW / 2 + .18), 0, z), false);
      for (const fz of [-.42, .42]) b.add(M.gold, boxb(.05, DH, .06, s * (DW / 2 + .005), 0, z + fz), false);
    }
    b.add(M.inkMarble, boxb(DW + 1.1, .46, .92, 0, DH, z), false);
    b.add(M.gold, boxb(DW + 1.3, .08, 1.0, 0, DH + .46, z), false);
    for (const fz of [-.42, .42]) b.add(M.gold, boxb(DW + .04, .05, .06, 0, DH - .03, z + fz), false);
    b.flush(grp);
    const lw = DW / 2 - .02, leaves = [];
    for (const s of [-1, 1]) {
      const piv = new THREE.Group(), lb = new Batch(), d = -s;   // d = ทิศที่บานประตูยื่นออกจากบานพับ
      piv.position.set(s * DW / 2, 0, z);
      lb.add(M.inkGloss, new THREE.BoxGeometry(lw, DH - .06, .09).translate(d * lw / 2, DH / 2, 0), false);
      for (const [py, ph] of [[1.5, 2.2], [4.05, 2.3]]) for (const fz of [-.05, .05]) {
        const fw = lw - .5, cx = d * lw / 2;
        lb.add(M.gold, new THREE.BoxGeometry(fw, .04, .02).translate(cx, py + ph / 2, fz), false);
        lb.add(M.gold, new THREE.BoxGeometry(fw, .04, .02).translate(cx, py - ph / 2, fz), false);
        lb.add(M.gold, new THREE.BoxGeometry(.04, ph, .02).translate(cx - fw / 2, py, fz), false);
        lb.add(M.gold, new THREE.BoxGeometry(.04, ph, .02).translate(cx + fw / 2, py, fz), false);
      }
      for (const fz of [-.09, .09]) lb.add(M.gold, new THREE.SphereGeometry(.07, 12, 8).translate(d * (lw - .16), 2.75, fz), false);
      lb.flush(piv);
      grp.add(piv); leaves.push(piv);
    }
    doors.push({ k, z, grp, L: leaves[0], R: leaves[1], open: 0 });
  }

  // ---------- ตัวช่วยที่ห้องต่างๆ ใช้ร่วมกัน ----------
  function text(zi, str, h, x, y, z, ry = 0, o = {}) {
    const { tex, ar } = label(str, o);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(h * ar, h), basic({ map: tex, transparent: true, depthWrite: false }));
    m.position.set(x, y, z); m.rotation.y = ry; zones[zi].add(m);
    return m;
  }
  // แผ่นป้ายจากพื้นผิวพื้นใสที่เตรียมไว้แล้ว (เช่น ประโยคเด่นหลายบรรทัด) กว้าง w เมตร
  function sign(zi, t, w, x, y, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / t.ar), basic({ map: t.tex, transparent: true, depthWrite: false }));
    m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 2;      // วาดทีหลังแสงที่ตกบนผนัง ตัวหนังสือจะไม่ถูกย้อมสี
    zones[zi].add(m);
    return m;
  }
  function glows(zi, pts, size, color, opacity = 1) {
    if (!pts.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
    const p = new THREE.Points(g, additive(new THREE.PointsMaterial({ map: T.glow, size, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false })));
    zones[zi].add(p);
    return p;
  }

  // ---------- รูปในกรอบ: โหลดเฉพาะห้องแรกๆ ก่อน ที่เหลือโหลดทีหลัง ----------
  const eagerLoader = new THREE.TextureLoader(), artById = new Map(arts.map(a => [a.id, a]));
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // รูปที่ยังโหลดไม่เสร็จแสดงเป็นแผ่นสีกรมท่า ใช้พื้นผิว 1 จุดแทนไว้ก่อน เมื่อรูปมาถึงจึงไม่ต้องสร้างโปรแกรมวาดใหม่
  const blank = new THREE.DataTexture(new Uint8Array([28, 32, 60, 255]), 1, 1);
  blank.colorSpace = THREE.SRGBColorSpace; blank.needsUpdate = true;
  const slots = new Map(), firstLoads = [];
  let eagerAsked = 0, eagerDone = 0;
  function slotOf(id) {
    let s = slots.get(id);
    if (!s) slots.set(id, s = { mats: [], tex: null, promise: null });
    return s;
  }
  function loadArt(id, eager = false) {
    const s = slotOf(id);
    if (s.promise) return s.promise;
    if (eager) eagerAsked++;
    s.promise = new Promise(res => {
      const done = ok => { if (eager) { eagerDone++; onImage(eagerDone, eagerAsked); } res(ok); };
      eagerLoader.load(artById.get(id).tex, t => {
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
        s.tex = t;
        for (const m of s.mats) m.map = t;
        try { renderer.initTexture(t); } catch { /* จะถูกส่งขึ้นการ์ดจอตอนวาดครั้งแรกแทน */ }
        done(true);
      }, undefined, () => { console.warn('โหลดรูปไม่สำเร็จ', id); done(false); });
    });
    return s.promise;
  }

  // ---------- จุดที่กดได้ (รูปในกรอบ และแผ่นป้าย SOP) ----------
  // แสงเรืองรอบกรอบตอนชี้ เครื่องหมายบวกบอกว่ากดได้ และกล่องล่องหนสำหรับรับการกด
  function hotspot(zi, grp, w, h, x, y, z, ry, extra) {
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(w + 1.5, h + 1.5), basic({ map: T.halo, color: 0xffd400, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.position.z = .13; glow.visible = false; grp.add(glow);
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(.46, .46), basic({ map: T.plus, transparent: true, depthWrite: false }));
    badge.position.set(w / 2 + .02, -h / 2 - .02, .14); grp.add(badge);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(w + .7, h + .7, .5), basic({ visible: false }));
    hit.position.z = .25; grp.add(hit);
    const entry = { zone: zi, grp, hit, glow, badge, hover: 0, w, h, center: new THREE.Vector3(x, y, z), normal: new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)), ...extra };
    hit.userData.art = entry;
    artReg.push(entry);
    return entry;
  }
  function addArt(zi, id, x, y, z, ry, w, { dark = false } = {}) {
    const meta = artById.get(id);
    if (!meta) return null;
    const h = w / meta.ar, b = batches[zi], bw = .13, d = .11;
    const mtx = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    const loc = g => g.applyMatrix4(mtx);
    const lbox = (bx, by, bz, px, py, pz) => loc(new THREE.BoxGeometry(bx, by, bz).translate(px, py, pz));
    // กรอบทอง
    b.add(M.gold, lbox(w + bw * 2, bw, d, 0, h / 2 + bw / 2, d / 2));
    b.add(M.gold, lbox(w + bw * 2, bw, d, 0, -h / 2 - bw / 2, d / 2));
    b.add(M.gold, lbox(bw, h, d, -w / 2 - bw / 2, 0, d / 2));
    b.add(M.gold, lbox(bw, h, d, w / 2 + bw / 2, 0, d / 2));
    b.add(M.ink, lbox(w + .04, h + .04, .03, 0, 0, .015), false);
    // โคมส่องรูปและแสงที่ตกบนผนัง
    const ly = h / 2 + bw + .32;
    b.add(M.gold, lbox(.04, .04, .36, 0, ly + .02, .18), false);
    b.add(M.gold, loc(put(new THREE.CylinderGeometry(.05, .05, w * .5, 10), 0, ly, .36, 0, 0, Math.PI / 2)), false);
    b.add(M.bulb, lbox(w * .46, .02, .05, 0, ly - .056, .36), false, false);
    b.add(dark ? M.washHard : M.washSoft, loc(new THREE.PlaneGeometry(w + 2.4, h + 2.8).translate(0, .5, .012)), false, false);

    const grp = new THREE.Group();
    grp.position.set(x, y, z); grp.rotation.y = ry; zones[zi].add(grp);
    const s = slotOf(id), mat = basic({ map: s.tex || blank, color: 0xdcdcdc });
    s.mats.push(mat);
    if (zi <= EAGER_ZONE) firstLoads.push(loadArt(id, true));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    pic.position.z = .05; grp.add(pic);
    // ป้ายชื่อใต้กรอบ
    const lab = label(SHORT[id] || meta.title, { px: 44, weight: 700, color: '#f6e9c3', pad: 8 });
    let lh = .21, lw = lh * lab.ar;
    if (lw > w - .3) { lw = w - .3; lh = lw / lab.ar; }
    const py = -h / 2 - bw - .37;
    b.add(M.gold, lbox(lw + .38, .4, .02, 0, py, .01), false);
    b.add(M.ink, lbox(lw + .3, .32, .03, 0, py, .015), false);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), basic({ map: lab.tex, transparent: true, depthWrite: false }));
    tag.position.set(0, py, .034); grp.add(tag);
    return hotspot(zi, grp, w, h, x, y, z, ry, { id, meta });
  }
  // จุดกดที่ไม่ใช่รูป: act บอกว่ากดแล้วให้ทำอะไร (ตอนนี้มีแต่ 'sop' = เปิดอ่าน SOP ฉบับเต็ม)
  function addSpot(zi, act, x, y, z, ry, w, h) {
    const grp = new THREE.Group();
    grp.position.set(x, y, z); grp.rotation.y = ry; zones[zi].add(grp);
    return hotspot(zi, grp, w, h, x, y, z, ry, { id: null, meta: null, act });
  }

  // ---------- สร้างห้อง ----------
  // ห้องเดิมเขียนด้วยพิกัดก่อนแทรกห้องใหม่ จึงเลื่อนทั้งห้องตามแกน z ด้วย SHIFT ตอนประกอบฉาก (ห้องใหม่เขียนด้วยพิกัดจริง ค่าเลื่อนเป็น 0)
  for (let i = 0; i <= LAST; i++) {
    const dz = SHIFT[i], real = batches[i];
    let g = zones[i], b = real;
    if (dz) {
      g = new THREE.Group(); g.position.z = dz; zones[i].add(g);
      b = { add: (mat, geo, cast, recv) => { geo.translate(0, 0, dz); real.add(mat, geo, cast, recv); return b; } };
    }
    BUILD[i]({
      zi: i, g, b, M, T, tier,
      text: (str, h, x, y, z, ...r) => text(i, str, h, x, y, z + dz, ...r),
      sign: (t, w, x, y, z, ry) => sign(i, t, w, x, y, z + dz, ry),
      glows: (pts, ...r) => glows(i, dz ? pts.map(p => [p[0], p[1], p[2] + dz]) : pts, ...r),
      anim: fn => anims.push({ zi: i, fn }),
      addArt: (id, x, y, z, ...r) => addArt(i, id, x, y, z + dz, ...r),
      addSpot: (act, x, y, z, ...r) => addSpot(i, act, x, y, z + dz, ...r),
    });
    real.flush(zones[i]);
    await step(.36 + .5 * i / LAST);
  }
  // ชิ้นส่วนที่อยู่นิ่งไม่ต้องคำนวณตำแหน่งใหม่ทุกเฟรม
  scene.updateMatrixWorld(true);

  // ---------- ฝุ่นลอยในแสง ----------
  const dust = [];
  if (tier > 0) {
    for (let i = 1; i <= LAST; i++) {
      const z0 = BOUNDS[i - 1], z1 = BOUNDS[i], n = Math.round((tier >= 2 ? 7.5 : 3.2) * (z0 - z1)), pos = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { pos[k * 3] = (Math.random() - .5) * 15; pos[k * 3 + 1] = .4 + Math.random() * 8; pos[k * 3 + 2] = z1 + Math.random() * (z0 - z1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pale = i === LAST || i === 5;      // ห้องสว่างจัด ฝุ่นต้องจางลง
      const p = new THREE.Points(g, additive(new THREE.PointsMaterial({ map: T.glow, size: .07, color: dustCol[i], transparent: true, opacity: pale ? .35 : .6, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })));
      zones[i].add(p); dust.push(p);
      anims.push({ zi: i, fn: (dt, t) => { p.position.set(Math.sin(t * .11 + i) * .7, Math.sin(t * .07 + i * 2) * .5, Math.cos(t * .09 + i) * .7); } });
    }
  }

  // ---------- แสง ----------
  const hemi = new THREE.HemisphereLight(ATM[0].sky, ATM[0].gnd, ATM[0].hemi);
  scene.add(hemi);
  // แสงหลักดวงเดียวที่ทำให้เกิดเงาตกจริงทั้งอาคาร คำนวณเงาครั้งเดียวตอนโหลด
  // ทิศแสงคงเดิม (15.4, 44.1, 19.9) ส่วนจุดเล็งกับกรอบเงาคิดจากความยาวอาคาร ตั้งแต่มุขหน้า (z = 12) ถึงผนังท้าย
  const sun = new THREE.DirectionalLight(0xfff1dc, ATM[0].sun);
  const FRONT = 12, zMid = (FRONT + END) / 2, half = (FRONT - END) / 2, sunDir = new THREE.Vector3(15.4, 44.1, 19.9).normalize();
  sun.target.position.set(0, 0, zMid);
  sun.position.copy(sun.target.position).addScaledVector(sunDir, 96);
  scene.add(sun, sun.target);
  const sc = sun.shadow.camera;
  // กรอบเงาครอบเฉพาะตัวอาคารกับมุขหน้า แผนที่เงาจึงละเอียดพอให้ขอบเงาคม (แกนตั้งของกรอบเอียงตามทิศแสง จึงคูณ .92)
  sc.up.set(0, 0, -1); sc.left = -15; sc.right = 12; sc.top = half * .92 + 7; sc.bottom = -(half * .92 + 3); sc.near = 1; sc.far = 96 + half * .4 + 22;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  const maxTex = renderer.capabilities.maxTextureSize;
  function shadowSize(t) {
    // อาคารยาวขึ้น แผนที่เงาจึงยาวขึ้นตาม เครื่องคอมใช้ 1280 x 8192 มือถือใช้ 1024 x 4096
    const w = t >= 2 ? 1280 : 1024, hh = Math.min(maxTex, t >= 2 ? 8192 : 4096);
    if (sun.shadow.mapSize.x === w && sun.shadow.mapSize.y === hh) return;
    sun.shadow.mapSize.set(w, hh);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  shadowSize(tier);
  sun.castShadow = tier > 0;
  // แสงเสริมจากฝั่งตรงข้ามดวงอาทิตย์ ไม่มีเงา ช่วยให้ผนังด้านที่แดดส่องไม่ถึงไม่มืดทึบ
  const fill = new THREE.DirectionalLight(0xfff3e0, 0);
  fill.position.set(-14, 16, zMid + 12); fill.target = sun.target;
  scene.add(fill);

  // ไฟประจำห้องมีสองชุด สลับกันไปตามห้องที่กล้องอยู่และห้องถัดไป จำนวนไฟจึงคงที่เสมอ
  const lampSlots = [0, 1].map(par => {
    const pt = new THREE.PointLight(0xffffff, 0, 30, 2), spot = new THREE.SpotLight(0xffffff, 0, 30, .6, .6, 2);
    scene.add(pt, spot, spot.target);
    spot.visible = tier > 0;
    return { par, pt, spot, zone: -1, k: 0, I: 0, S: 0 };
  });
  function setLamp(s, zi) {
    const L = LAMPS[zi];
    s.zone = zi;
    s.pt.position.set(L.pt[0], L.pt[1], L.pt[2]); s.pt.color.setHex(L.pt[3]); s.I = L.pt[4]; s.pt.distance = L.pt[5];
    if (L.sp) {
      s.spot.position.set(L.sp[0], L.sp[1], L.sp[2]); s.spot.target.position.set(L.sp[3], L.sp[4], L.sp[5]);
      s.spot.color.setHex(L.sp[6]); s.S = L.sp[7]; s.spot.angle = L.sp[8]; s.spot.distance = L.sp[9];
      s.spot.target.updateMatrixWorld();
    } else s.S = 0;
  }
  setLamp(lampSlots[0], 0); setLamp(lampSlots[1], 1);

  // ---------- พื้นสะท้อนเงา (เฉพาะเครื่องแรง) ----------
  let mirror = null, reflectOn = false;
  function setReflect(on, Reflector, size, multisample = 4) {
    if (on && !mirror && Reflector) {
      // แผ่นสะท้อนแผ่นเดียวยาวตลอดอาคาร
      mirror = new Reflector(new THREE.PlaneGeometry(HW * 2, -END), { textureWidth: size[0], textureHeight: size[1], clipBias: .003, color: 0x7f7f7f, multisample });
      mirror.material.uniforms.color.value.setRGB(.5, .5, .5);
      mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, -.015, END / 2);
      scene.add(mirror);
    }
    reflectOn = !!(on && mirror);
    if (mirror) mirror.visible = reflectOn;
    for (let i = 1; i <= LAST; i++) {
      const m = floorM[i], see = reflectOn && floorOp[i] < 1;      // พื้นทึบ (เช่น พื้นทราย) ไม่ต้องโปร่งใส
      m.transparent = see; m.opacity = see ? floorOp[i] : 1; m.needsUpdate = true;
    }
  }

  function setTier(t) {
    applyHdr(t);
    sun.castShadow = t > 0;
    if (t > 0) shadowSize(t);
    for (const s of lampSlots) s.spot.visible = t > 0;
    for (const d of dust) d.visible = t > 0;
    if (t < 1) setReflect(false);
  }
  function setReflectSize(size) { if (mirror) mirror.getRenderTarget().setSize(size[0], size[1]); }

  // ---------- อัปเดตทุกเฟรม ----------
  const cB = new THREE.Color();
  let showAll = false, hovered = null, lastZone = -1;
  function update(dt, time, cam) {
    const f = zoneF(cam.z), i0 = Math.min(LAST - 1, Math.floor(f)), k = f - i0, A = ATM[i0], B = ATM[i0 + 1];
    scene.fog.color.setHex(A.fog).lerp(cB.setHex(B.fog), k);
    scene.background.copy(scene.fog.color);
    scene.fog.near = lerp(A.near, B.near, k); scene.fog.far = lerp(A.far, B.far, k);
    hemi.intensity = lerp(A.hemi, B.hemi, k);
    hemi.color.setHex(A.sky).lerp(cB.setHex(B.sky), k);
    hemi.groundColor.setHex(A.gnd).lerp(cB.setHex(B.gnd), k);
    sun.intensity = lerp(A.sun, B.sun, k);
    fill.intensity = sun.intensity * .38;
    scene.environmentIntensity = lerp(A.env, B.env, k);

    zones[0].visible = showAll || cam.z > -14;
    for (let i = 1; i <= LAST; i++) zones[i].visible = showAll || (cam.z < BOUNDS[i - 1] + 16 && cam.z > BOUNDS[i] - 16);
    for (const d of doors) {
      d.grp.visible = showAll || Math.abs(cam.z - d.z) < 34 || (d.k === 0 && cam.z > 0);
      d.open = 1 - smooth(Math.abs(cam.z - d.z), 5, 15);
      d.L.rotation.y = d.open * 1.75; d.R.rotation.y = -d.open * 1.75;
    }
    if (mirror) mirror.visible = reflectOn && cam.z < 14;

    for (const s of lampSlots) {
      let want = s.par, best = 99;
      for (let z = s.par; z <= LAST; z += 2) { const dd = Math.abs(z - (f + .25)); if (dd < best) { best = dd; want = z; } }
      if (want !== s.zone) { s.k -= dt * 4; if (s.k <= 0) { s.k = 0; setLamp(s, want); } }
      else s.k = Math.min(1, s.k + dt * 2);
      s.pt.intensity = s.I * s.k; s.spot.intensity = s.S * s.k;
    }

    // รูปของห้องที่กำลังจะเดินถึง (ล่วงหน้าสองห้อง) เริ่มโหลดตอนนี้
    const zc = zoneAt(cam.z);
    if (zc !== lastZone) {
      lastZone = zc;
      for (const a of artReg) if (a.id && Math.abs(a.zone - zc) <= 2) loadArt(a.id);
    }

    for (const a of anims) if (zones[a.zi].visible) a.fn(dt, time, cam);
    for (const a of artReg) {
      a.hover += ((a === hovered ? 1 : 0) - a.hover) * Math.min(1, dt * 10);
      const on = a.hover > .01;
      a.glow.visible = on;
      if (on) a.glow.material.opacity = a.hover * .95;
      const sc2 = 1 + .07 * Math.sin(time * 3 + a.center.z) + a.hover * .3;
      a.badge.scale.set(sc2, sc2, 1);
    }
  }
  // ทยอยโหลดรูปที่เหลือทีละรูปตอนเครื่องว่าง ผู้ชมที่เดินเร็วหรือกดข้ามไปห้องท้ายจะไม่เจอกรอบเปล่า
  let restStarted = false;
  async function loadRest() {
    if (restStarted) return;
    restStarted = true;
    for (const a of artReg) {
      if (!a.id || slotOf(a.id).promise) continue;
      await loadArt(a.id);
      await new Promise(r => setTimeout(r, 150));
    }
  }

  // ---------- การเลือกรูป ----------
  // ตรวจว่ามองเห็นรูปจริง ไม่ได้มองทะลุผนังหรือบานประตูที่ยังปิดอยู่
  function canSee(a, cam, p) {
    if ((cam.x - a.center.x) * a.normal.x + (cam.z - a.center.z) * a.normal.z <= 0) return false;
    for (let k = 0; k < LAST; k++) {
      const Bz = BOUNDS[k];
      if ((cam.z - Bz) * (p.z - Bz) < 0) {
        const s = (Bz - cam.z) / (p.z - cam.z), x = cam.x + (p.x - cam.x) * s, y = cam.y + (p.y - cam.y) * s;
        if (Math.abs(x) > DW / 2 || y > DH || doors[k].open < .5) return false;
      }
    }
    return true;
  }
  const hitList = [];
  function pick(ray, cam) {
    hitList.length = 0;
    for (const a of artReg) if (zones[a.zone].visible) hitList.push(a.hit);
    for (const h of ray.intersectObjects(hitList, false)) {
      const a = h.object.userData.art;
      if (canSee(a, cam, h.point)) return a;
    }
    return null;
  }

  step(.96);
  return {
    scene, zones, arts: artReg, doors, sun, M, ATM, LAMPS,
    firstImages: Promise.all(firstLoads), loadRest,
    imageState: () => [...slots].map(([id, s]) => [id, !!s.tex]),
    relamp() { for (const s of lampSlots) setLamp(s, s.zone); },
    update, pick, canSee, setReflect, setReflectSize, setTier,
    setHover(a) { hovered = a; },
    setShowAll(v) { showAll = v; },
  };
}
