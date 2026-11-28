// The apartment: a 14 x 11 block studio, 4 blocks tall.
// x runs west to east, z runs north to south, y is up. 1 unit = 1 block.

import * as THREE from "./vendor/three.js";
import * as T from "./textures.js";
import { stations } from "./content.js";
import * as ui from "./ui.js";

const W = 14, D = 11, H = 4;
const EYE = 1.62;
const RADIUS = 0.3;
const REACH = 4.5;
const SPAWN = { x: 12.5, z: 9.6, yaw: 0.9 };

const canvas = document.getElementById("game");
const touch = matchMedia("(pointer: coarse)").matches;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.body.classList.toggle("touch", touch);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch {
  document.body.classList.add("no-webgl");
  throw new Error("WebGL is not available");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0d0d10");
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 100);
camera.rotation.order = "YXZ";

// ---------- materials ----------

const maxAniso = renderer.capabilities.getMaxAnisotropy();

// Cut-out textures (leaves, pennants, the net) skip mipmaps so their edges stay crisp.
function texture(canvas, { cutout = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = cutout ? THREE.NearestFilter : THREE.NearestMipmapLinearFilter;
  t.generateMipmaps = !cutout;
  t.anisotropy = maxAniso;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const lit = (canvas, opts = {}) => new THREE.MeshLambertMaterial({ map: texture(canvas), ...opts });
const cutout = (canvas) =>
  new THREE.MeshLambertMaterial({ map: texture(canvas, { cutout: true }), alphaTest: 0.5, side: THREE.DoubleSide });

// A texture stretched across one whole face of size w x h blocks, instead of tiling.
function art(canvas, w, h, { glow = false, ...opts } = {}) {
  const map = texture(canvas);
  map.repeat.set(1 / w, 1 / h);
  return glow ? new THREE.MeshBasicMaterial({ map, ...opts }) : new THREE.MeshLambertMaterial({ map, ...opts });
}

const colors = new Map();
function color(hex, amount = 0.06) {
  if (!colors.has(hex)) colors.set(hex, lit(T.solid(hex, amount)));
  return colors.get(hex);
}

const M = {
  floor: lit(T.planks("#a8774f", 7)),
  wall: lit(T.paint()),
  accent: lit(T.paint("#9fb09a", 5)),
  ceiling: lit(T.paint("#f7f4ee", 4)),
  tile: lit(T.tile()),
  trim: color("#f7f5f0", 0.02),
  darkWood: lit(T.planks("#6b4527", 9)),
  lightWood: lit(T.planks("#c99a66", 15)),
  cabinet: lit(T.cabinet()),
  cabinetDark: lit(T.cabinet("#6b4527", 21)),
  counter: lit(T.stone()),
  steel: color("#b9c0c7"),
  black: color("#1c1d21", 0.1),
  fridge: color("#e9ecef", 0.03),
  couch: lit(T.fabric("#3d6b6b", 5)),
  couchLight: lit(T.fabric("#4a7d7d", 6)),
  sheet: lit(T.fabric("#f1efe9", 8)),
  blanket: lit(T.fabric("#2c5282", 9)),
  chair: lit(T.fabric("#4a4e57", 10)),
  keyboard: lit(T.keyboard()),
  pot: lit(T.solid("#b5653d", 0.12, 2)),
  leaves: cutout(T.leaves()),
};

// ---------- building blocks ----------

// Everything you can bump into or stand on: a footprint plus a bottom and top height.
// `bounce` makes landing on it springy ("bed" or "trampoline").
const colliders = [];
const stationGroups = {};

function block(x0, z0, x1, z1, top, { bottom = 0, bounce } = {}) {
  colliders.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, bottom, top, bounce });
}

// One cuboid from corner (x0, y0, z0) to (x1, y1, z1), in the parent's coordinates.
// Textures tile once per block, the way they would in a voxel game.
function box(x0, y0, z0, x1, y1, z1, material, { parent = scene, solid = false, bounce } = {}) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const faceSize = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x -x +y -y +z -z
  for (let f = 0; f < 6; f++)
    for (let i = f * 4; i < f * 4 + 4; i++) uv.setXY(i, uv.getX(i) * faceSize[f][0], uv.getY(i) * faceSize[f][1]);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
  parent.add(mesh);
  if (solid) block(x0, z0, x1, z1, y1, { bottom: y0, bounce });
  return mesh;
}

// Same material on every face, except the ones named: { px, nx, py, ny, pz, nz }.
function faces(base, overrides) {
  return ["px", "nx", "py", "ny", "pz", "nz"].map((k) => overrides[k] || base);
}

// Something on a wall. `a` runs along the wall; `d` is depth, where 0 is the wall's
// surface, positive goes into the wall, and negative comes out into the room.
const INWARD = { north: "pz", south: "nz", west: "px", east: "nx" };
function onWall(side, a0, a1, y0, y1, d0, d1, material, opts) {
  if (side === "north") return box(a0, y0, -d1, a1, y1, -d0, material, opts);
  if (side === "south") return box(a0, y0, D + d0, a1, y1, D + d1, material, opts);
  if (side === "west") return box(-d1, y0, a0, -d0, y1, a1, material, opts);
  return box(W + d0, y0, a0, W + d1, y1, a1, material, opts);
}
const front = (side, base, material) => faces(base, { [INWARD[side]]: material });

function station(id) {
  const g = new THREE.Group();
  g.userData.station = id;
  scene.add(g);
  stationGroups[id] = g;
  return g;
}

const legs = (x0, z0, x1, z1, top, mat, parent, t = 0.08) => {
  for (const [x, z] of [[x0, z0], [x1 - t, z0], [x0, z1 - t], [x1 - t, z1 - t]]) box(x, 0, z, x + t, top, z + t, mat, { parent });
};

// ---------- the room ----------

const WIN_Y0 = 1.4, WIN_Y1 = 3.4;

// A wall with window openings (pairs of positions along the wall).
function wall(side, length, material, holes = []) {
  let a = -1;
  for (const [h0, h1] of holes) {
    onWall(side, a, h0, 0, H, 0, 1, material);
    onWall(side, h0, h1, 0, WIN_Y0, 0, 1, material);
    onWall(side, h0, h1, WIN_Y1, H, 0, 1, material);
    a = h1;
  }
  onWall(side, a, length + 1, 0, H, 0, 1, material);
}

// A window: the view, set back in the wall, with a white frame and sill.
function windowOn(side, a0, a1, view, parent = scene) {
  const p = { parent };
  const mid = (a0 + a1) / 2, midY = (WIN_Y0 + WIN_Y1) / 2;
  const glass = art(view, a1 - a0, WIN_Y1 - WIN_Y0, { glow: true });
  onWall(side, a0, a1, WIN_Y0, WIN_Y1, 0.8, 0.9, front(side, M.trim, glass), p);
  onWall(side, a0 - 0.15, a1 + 0.15, WIN_Y0 - 0.1, WIN_Y0 + 0.02, -0.14, 0.8, M.trim, p);
  onWall(side, a0 - 0.1, a1 + 0.1, WIN_Y1 - 0.04, WIN_Y1 + 0.06, -0.04, 0.8, M.trim, p);
  onWall(side, a0 - 0.1, a0 + 0.02, WIN_Y0, WIN_Y1, -0.04, 0.8, M.trim, p);
  onWall(side, a1 - 0.02, a1 + 0.1, WIN_Y0, WIN_Y1, -0.04, 0.8, M.trim, p);
  onWall(side, mid - 0.04, mid + 0.04, WIN_Y0, WIN_Y1, 0.72, 0.8, M.trim, p);
  onWall(side, a0, a1, midY - 0.04, midY + 0.04, 0.72, 0.8, M.trim, p);
  return glass;
}

box(-1, -1, -1, W + 1, 0, D + 1, M.floor);
box(-1, H, -1, W + 1, H + 1, D + 1, M.ceiling);
wall("north", W, M.wall, [[7.5, 11.5]]);
wall("south", W, M.wall, [[7.4, 11.4]]);
wall("west", D, M.accent, [[1.5, 4.5]]);
wall("east", D, M.wall);
block(-1, -1, 0, D + 1, 99, { bottom: -99 });
block(W, -1, W + 1, D + 1, 99, { bottom: -99 });
block(-1, -1, W + 1, 0, 99, { bottom: -99 });
block(-1, D, W + 1, D + 1, 99, { bottom: -99 });

// Baseboards, crown molding, and ceiling beams
for (const [side, length] of [["north", W], ["south", W], ["west", D], ["east", D]]) {
  onWall(side, 0, length, 0, 0.18, -0.05, 0, M.trim);
  onWall(side, 0, length, H - 0.1, H, -0.06, 0, M.trim);
}
box(0, 3.78, 2.2, W, H, 2.5, M.darkWood);
box(0, 3.78, 8.5, W, H, 8.8, M.darkWood);

// Ceiling light
box(6.5, 3.94, 4.5, 7.5, 4, 5.5, new THREE.MeshBasicMaterial({ color: "#fff8e1" }));

// ---------- windows ----------

windowOn("north", 7.5, 11.5, T.windowView(), station("window")); // the bridge
windowOn("west", 1.5, 4.5, T.beachView()); // mountains and beach, over the table
const dreamBackground = T.dreamBackground();
const dreamCanvas = document.createElement("canvas");
dreamCanvas.width = 64;
dreamCanvas.height = 32;
const dreamCtx = dreamCanvas.getContext("2d");
T.drawDream(dreamCtx, dreamBackground, 0);
const dreamGlass = windowOn("south", 7.4, 11.4, dreamCanvas, station("dream")); // the city that could be

// ---------- kitchen (north-west) ----------
{
  const p = { parent: station("fridge") };
  box(0, 0, 0, 1, 2.6, 0.95, faces(M.fridge, { pz: art(T.fridgeFront(), 1, 2.6) }), { ...p, solid: true });
  // Recipe cards and notes held up by magnets
  const paper = art(T.paper(), 1, 1);
  box(0.12, 1.35, 0.95, 0.42, 1.72, 0.965, paper, p);
  box(0.5, 1.45, 0.95, 0.76, 1.7, 0.965, color("#f6e05e"), p);
  box(0.18, 0.85, 0.95, 0.5, 1.2, 0.965, paper, p);
  box(0.56, 0.95, 0.95, 0.8, 1.18, 0.965, color("#68d391"), p);
  for (const [x, y, c] of [[0.25, 1.68, "#e53e3e"], [0.6, 1.65, "#3182ce"], [0.32, 1.15, "#d69e2e"]])
    box(x, y, 0.965, x + 0.05, y + 0.05, 0.99, color(c), p);
}
box(1, 0, 0, 6, 0.85, 0.9, faces(M.cabinet, { py: M.counter }), { solid: true });
box(1, 0.85, 0, 6, 0.95, 0.97, M.counter, { solid: true });
onWall("north", 1, 6, 0.95, 2.1, -0.02, 0, M.tile); // backsplash
box(3, 0.95, 0.06, 4, 0.96, 0.9, faces(M.black, { py: art(T.stove(), 1, 0.84) })); // cooktop
box(3.06, 0.12, 0.9, 3.94, 0.72, 0.92, color("#26272b")); // oven door
box(3.2, 0.96, 0.2, 3.58, 1.2, 0.58, color("#4a4c52", 0.1)); // pot
box(3.58, 1.12, 0.35, 3.8, 1.16, 0.43, M.black);
box(4.7, 0.95, 0.1, 5.7, 0.956, 0.8, faces(M.steel, { py: art(T.sink(), 1, 0.7) })); // sink
box(5.15, 0.95, 0.04, 5.25, 1.3, 0.14, M.steel);
box(5.15, 1.22, 0.04, 5.25, 1.3, 0.42, M.steel);
box(1.3, 0.95, 0.2, 2.1, 0.985, 0.65, M.lightWood); // cutting board
box(1, 2.1, 0, 6, 3.1, 0.55, faces(M.cabinet, { ny: M.trim }), { solid: true }); // upper cabinets
// Little table and stools, under the beach window
box(1.4, 0.85, 2.6, 3, 0.95, 3.8, M.lightWood, { solid: true });
legs(1.45, 2.65, 2.95, 3.75, 0.85, M.darkWood);
// A pint of Guinness on a coaster, settled, with its creamy head
box(2.22, 0.95, 2.92, 2.48, 0.958, 3.18, color("#c9a46a")); // coaster
box(2.29, 0.958, 2.99, 2.41, 1.1, 3.11, color("#1e0f0a", 0.15)); // stout, narrow at the bottom
box(2.28, 1.1, 2.98, 2.42, 1.2, 3.12, faces(color("#1e0f0a", 0.15), { px: art(T.pintFront(), 0.14, 0.1) })); // flaring out, G facing the room
box(2.28, 1.2, 2.98, 2.42, 1.245, 3.12, color("#efe4c8", 0.04)); // head
for (const [x, z] of [[1.95, 4.1], [1.95, 1.9]]) {
  box(x, 0.5, z, x + 0.5, 0.58, z + 0.5, M.darkWood, { solid: true });
  legs(x + 0.03, z + 0.03, x + 0.47, z + 0.47, 0.5, M.darkWood, scene, 0.06);
}

// ---------- desk (under the window) ----------
const monitorCanvas = document.createElement("canvas");
monitorCanvas.width = 32;
monitorCanvas.height = 18;
const monitorCtx = monitorCanvas.getContext("2d");
monitorCtx.drawImage(T.monitor(true), 0, 0);
const monitorScreen = art(monitorCanvas, 1.3, 0.72, { glow: true });
{
  const p = { parent: station("desk") };
  box(8, 0.88, 0, 11, 0.98, 0.9, M.darkWood, { ...p, solid: true });
  legs(8.03, 0.03, 9, 0.87, 0.88, M.darkWood, p.parent);
  box(10.1, 0.3, 0.02, 10.97, 0.88, 0.88, faces(M.darkWood, { pz: M.cabinetDark }), p); // drawers
  box(9.25, 0.98, 0.12, 9.75, 1.0, 0.42, M.black, p);
  box(9.45, 1.0, 0.22, 9.55, 1.25, 0.3, M.black, p);
  box(8.85, 1.2, 0.2, 10.15, 1.92, 0.28, faces(M.black, { pz: monitorScreen }), { ...p, solid: true });
  box(9.05, 0.98, 0.48, 9.95, 1.01, 0.72, M.keyboard, p);
  box(10.1, 0.98, 0.52, 10.2, 1.01, 0.66, color("#cbd5e0"), p);
  box(8.2, 0.98, 0.35, 8.65, 0.99, 0.8, faces(M.trim, { py: art(T.paper(), 0.45, 0.45) }), p); // resume
  box(8.75, 0.98, 0.12, 8.9, 1.13, 0.27, color("#e2e8f0"), p); // mug
}
// Chair
box(9.15, 0, 1.2, 9.85, 0.08, 1.9, M.black);
box(9.45, 0.08, 1.5, 9.55, 0.45, 1.6, M.black);
box(9.1, 0.45, 1.15, 9.9, 0.55, 1.95, M.chair);
box(9.1, 0.55, 1.85, 9.9, 1.25, 1.95, M.chair);
block(9.1, 1.15, 9.9, 1.95, 0.55);
block(9.1, 1.85, 9.9, 1.95, 1.25);

// Desk lamp: click to toggle
const lampLight = new THREE.PointLight("#ffd9a0", 1.2, 6, 1.5);
lampLight.position.set(10.72, 1.35, 0.45);
scene.add(lampLight);
const bulbOn = new THREE.MeshBasicMaterial({ color: "#fff1c1" });
const bulbOff = color("#5f5a4c");
let lampHead;
{
  const p = { parent: station("lamp") };
  box(10.55, 0.98, 0.12, 10.85, 1.01, 0.42, color("#2f855a"), p);
  box(10.67, 1.01, 0.22, 10.73, 1.52, 0.28, color("#d69e2e"), { ...p, solid: true });
  lampHead = box(10.5, 1.5, 0.18, 10.92, 1.62, 0.58, faces(color("#2f855a"), { ny: bulbOn }), p);
}

// ---------- plant (north-east corner) ----------
box(13.2, 0, 0.2, 13.8, 0.55, 0.8, M.pot, { solid: true });
box(13.05, 0.55, 0.05, 13.95, 1.55, 0.95, M.leaves, { solid: true });
box(13.25, 1.55, 0.25, 13.75, 1.95, 0.75, M.leaves);

// ---------- TV (east wall) ----------
const tvCanvas = document.createElement("canvas");
tvCanvas.width = 64;
tvCanvas.height = 36;
const tvCtx = tvCanvas.getContext("2d");
T.drawTV(tvCtx, -1);
const tvScreen = art(tvCanvas, 2.8, 1.58, { glow: true });
{
  const p = { parent: station("tv") };
  box(13.3, 0, 3.4, 14, 0.6, 6.6, faces(M.darkWood, { nx: M.cabinetDark }), { ...p, solid: true });
  box(13.55, 0.6, 4.6, 13.95, 0.63, 5.4, M.black, p);
  box(13.7, 0.6, 4.9, 13.9, 0.86, 5.1, M.black, p);
  box(13.72, 0.85, 3.6, 13.86, 2.43, 6.4, faces(M.black, { nx: tvScreen }), { ...p, solid: true });
}

// ---------- pennants (above the TV) ----------
{
  const g = station("pennants");
  const len = 0.85;
  [["bengals", 3.55, 0.07], ["lakers", 4.5, -0.05], ["dodgers", 5.45, 0.04], ["yale", 6.4, -0.06]].forEach(([kind, z, tilt], i) => {
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(len, len / 2), cutout(T.pennant(kind)));
    flag.position.set(W - 0.03 - i * 0.004, 3.0, z);
    flag.rotation.set(0, -Math.PI / 2, tilt);
    g.add(flag);
    box(W - 0.05, 3.15, z - len / 2 + 0.03, W - 0.02, 3.21, z - len / 2 + 0.09, color("#a0aec0"), { parent: g });
  });
}

// ---------- living room ----------
box(10.2, 0.001, 3, 12.7, 0.02, 7, faces(M.floor, { py: art(T.rug(), 2.5, 4) }));
// Couch, facing the TV
box(8.6, 0, 3.2, 9.6, 0.15, 6.8, M.darkWood);
box(8.6, 0.15, 3.2, 9.6, 0.5, 6.8, M.couch);
box(8.6, 0.5, 3.2, 8.95, 1.15, 6.8, M.couch);
box(8.95, 0.5, 3.2, 9.6, 0.82, 3.5, M.couch);
box(8.95, 0.5, 6.5, 9.6, 0.82, 6.8, M.couch);
box(8.95, 0.5, 3.5, 9.58, 0.6, 4.98, M.couchLight);
box(8.95, 0.5, 5.02, 9.58, 0.6, 6.5, M.couchLight);
box(8.97, 0.6, 3.6, 9.17, 0.95, 4.1, color("#d69e2e"));
block(8.6, 3.2, 9.6, 6.8, 0.6);
block(8.6, 3.2, 8.95, 6.8, 1.15);
block(8.95, 3.2, 9.6, 3.5, 0.82);
block(8.95, 6.5, 9.6, 6.8, 0.82);
// Coffee table
box(10.8, 0.4, 4.3, 11.8, 0.48, 5.7, M.lightWood, { solid: true });
legs(10.84, 4.34, 11.76, 5.66, 0.4, M.darkWood);
box(11.2, 0.48, 4.6, 11.3, 0.505, 4.85, M.black); // remote
box(11.3, 0.48, 5.1, 11.65, 0.56, 5.5, color("#2e4a8b"));
box(11.33, 0.56, 5.13, 11.62, 0.62, 5.45, color("#c9a227"));

// ---------- bed (west wall) ----------
box(0, 0, 6.3, 0.15, 1.25, 8.7, M.darkWood, { solid: true });
box(0.15, 0, 6.4, 3, 0.3, 8.6, M.darkWood, { solid: true });
box(0.15, 0.3, 6.45, 2.95, 0.6, 8.55, M.sheet, { solid: true, bounce: "bed" });
box(1.1, 0.28, 6.42, 2.98, 0.66, 8.58, M.blanket, { solid: true, bounce: "bed" });
box(0.25, 0.6, 6.6, 0.75, 0.78, 7.45, M.sheet);
box(0.25, 0.6, 7.55, 0.75, 0.78, 8.4, M.sheet);
// Nightstand and lamp
box(0, 0, 8.8, 0.7, 0.6, 9.5, faces(M.lightWood, { px: M.cabinet }), { solid: true });
box(0.25, 0.6, 9.05, 0.45, 0.65, 9.25, M.black);
box(0.31, 0.65, 9.11, 0.39, 0.85, 9.19, M.black);
box(0.18, 0.85, 8.98, 0.52, 1.1, 9.32, new THREE.MeshLambertMaterial({ color: "#f5e9c8", emissive: "#6b5a33" }));
const bedLight = new THREE.PointLight("#ffd9a0", 0.6, 4, 1.5);
bedLight.position.set(0.6, 1.0, 9.15);
scene.add(bedLight);

// ---------- map (above the bed) ----------
const parks = stations.map.sections.flatMap((s) => s.items).filter((i) => i.lat != null);
box(0, 1.3, 5.25, 0.08, 3.7, 9.75, faces(M.darkWood, { px: art(T.map(parks), 4.5, 2.4) }), { parent: station("map") });

// ---------- bookshelf (south wall) ----------
{
  const p = { parent: station("bookshelf") };
  box(3, 0, 10.2, 6, 3, 11, faces(M.darkWood, { nz: art(T.bookshelf(), 3, 3) }), { ...p, solid: true });
}
box(5.3, 3, 10.4, 5.7, 3.3, 10.8, M.pot);
box(5.2, 3.3, 10.3, 5.8, 3.75, 10.9, M.leaves);

// ---------- front door (south wall), with a crucifix above it ----------
{
  const p = { parent: station("door") };
  box(11.9, 0, 10.92, 13.1, 2.2, 11, faces(M.darkWood, { nz: art(T.door(), 1.2, 2.2) }), p);
  box(11.8, 0, 10.94, 11.9, 2.3, 11, M.trim, p);
  box(13.1, 0, 10.94, 13.2, 2.3, 11, M.trim, p);
  box(11.8, 2.2, 10.94, 13.2, 2.3, 11, M.trim, p);
}
box(11.9, 0.001, 10.1, 13.1, 0.02, 10.85, color("#7b5e3b", 0.15)); // doormat
{
  const p = { parent: station("crucifix") };
  onWall("south", 12.46, 12.54, 2.45, 3.3, -0.05, 0, M.darkWood, p);
  onWall("south", 12.27, 12.73, 3.0, 3.08, -0.05, 0, M.darkWood, p);
  onWall("south", 12.44, 12.56, 3.22, 3.28, -0.07, -0.05, color("#f4f1ea"), p);
  const figure = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.6), cutout(T.corpus()));
  figure.position.set(12.5, 2.905, D - 0.065);
  figure.rotation.y = Math.PI;
  p.parent.add(figure);
}

// ---------- Our Lady of Guadalupe (east wall), with votive candles ----------
const candleLight = new THREE.PointLight("#ff9a4a", 0.6, 3, 1.5);
candleLight.position.set(W - 0.4, 1.5, 8);
scene.add(candleLight);
{
  const p = { parent: station("guadalupe") };
  onWall("east", 7.4, 8.6, 1.45, 3.25, -0.06, 0, front("east", color("#c9a227"), art(T.guadalupe(), 1.2, 1.8)), p);
  onWall("east", 7.5, 8.5, 1.15, 1.21, -0.26, 0, M.darkWood, p);
  const glass = new THREE.MeshLambertMaterial({ color: "#c53030", emissive: "#7a1010" });
  const flame = new THREE.MeshBasicMaterial({ color: "#ffd27a" });
  for (const z of [7.72, 8.16]) {
    onWall("east", z, z + 0.12, 1.21, 1.37, -0.2, -0.08, glass, p);
    onWall("east", z + 0.04, z + 0.08, 1.37, 1.44, -0.16, -0.12, flame, p);
  }
}

// ---------- skis by the door ----------
{
  const g = station("skis");
  g.position.set(13.72, 0, 9.9);
  g.rotation.z = -0.12;
  const red = color("#c53030");
  box(-0.04, 0, -0.22, 0, 1.75, -0.1, red, { parent: g });
  box(-0.04, 0, 0.04, 0, 1.75, 0.16, red, { parent: g });
  box(-0.05, 0.5, -0.22, 0.01, 0.62, 0.16, color("#1c1d21"), { parent: g });
  box(-0.12, 0, -0.32, -0.09, 1.3, -0.29, M.steel, { parent: g });
  box(-0.12, 0, 0.26, -0.09, 1.3, 0.29, M.steel, { parent: g });
  block(13.5, 9.5, W, 10.3, 1.75);
}

// ---------- spikeball set (it's bouncy) ----------
{
  const g = station("spikeball");
  const cx = 10.65, cz = 9.45, cell = 0.08;
  const rim = [color("#f5c518"), color("#d9a90f")];
  for (let i = 0; i < 12; i++)
    for (let j = 0; j < 12; j++) {
      const d = Math.hypot(i - 5.5, j - 5.5);
      if (d < 4.4 || d > 6.1) continue;
      const x = cx + (i - 6) * cell, z = cz + (j - 6) * cell;
      box(x, 0.15, z, x + cell, 0.24, z + cell, rim[(i + j) % 4 ? 0 : 1], { parent: g });
    }
  const net = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), cutout(T.spikeballNet()));
  net.rotation.x = -Math.PI / 2;
  net.position.set(cx, 0.2, cz);
  g.add(net);
  for (let k = 0; k < 5; k++) {
    const x = cx + Math.cos((k * 2 * Math.PI) / 5) * 0.4, z = cz + Math.sin((k * 2 * Math.PI) / 5) * 0.4;
    box(x - 0.03, 0, z - 0.03, x + 0.03, 0.15, z + 0.03, M.black, { parent: g });
  }
  box(11.25, 0, 9.55, 11.43, 0.18, 9.73, color("#f6e05e"), { parent: g });
  block(10.2, 9.0, 11.1, 9.9, 0.24, { bounce: "trampoline" });
}

// ---------- light ----------

scene.add(new THREE.HemisphereLight("#fff4e0", "#c9b8a0", 2.0));
const sun = new THREE.DirectionalLight("#fff1d6", 1.1);
sun.position.set(9.5, 7, -5);
sun.target.position.set(6, 0, 7);
scene.add(sun, sun.target);
const ceilingLight = new THREE.PointLight("#fff3dc", 1.4, 14, 1);
ceilingLight.position.set(7, 3.6, 5);
scene.add(ceilingLight);

// ---------- selection outline ----------

const outline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
  new THREE.LineBasicMaterial({ color: "#000000", transparent: true, opacity: 0.7 }),
);
outline.visible = false;
scene.add(outline);
const bounds = new THREE.Box3();

function highlight(id) {
  if (!id) return void (outline.visible = false);
  bounds.setFromObject(stationGroups[id]).expandByScalar(0.03);
  bounds.getCenter(outline.position);
  bounds.getSize(outline.scale);
  outline.visible = true;
}

// ---------- player ----------

const HEIGHT = 1.8; // head clearance
const STEP = 0.35; // walk straight up onto anything this low
const GRAVITY = 22;
const JUMP = 7.4; // about 1.25 blocks

const player = { x: SPAWN.x, z: SPAWN.z, y: 0, vy: 0, onGround: true, yaw: SPAWN.yaw, pitch: -0.08, bob: 0, phase: 0 };
const keys = new Set();
const stick = { x: 0, y: 0, jump: false }; // from the touch arrow pad

const over = (c, x, z) => x + RADIUS > c.minX && x - RADIUS < c.maxX && z + RADIUS > c.minZ && z - RADIUS < c.maxZ;

// Would standing at (x, y, z) put you inside something?
function blocked(x, z, y) {
  return colliders.some((c) => over(c, x, z) && y + STEP < c.top && y + HEIGHT > c.bottom);
}

// The highest surface under you that you could be standing on.
function support(x, z, y) {
  let top = 0, under = null;
  for (const c of colliders) if (over(c, x, z) && c.top <= y + STEP && c.top > top) (top = c.top), (under = c);
  return { top, under };
}

// How high your feet can go before your head hits something.
function headroom(x, z, y) {
  let limit = H;
  for (const c of colliders) if (over(c, x, z) && c.bottom >= y + HEIGHT - 0.01 && c.bottom < limit) limit = c.bottom;
  return limit - HEIGHT;
}

function move(dt) {
  const p = player;
  const k = (...codes) => (codes.some((c) => keys.has(c)) ? 1 : 0);
  let fwd = k("KeyW", "ArrowUp") - k("KeyS", "ArrowDown") - stick.y;
  let side = k("KeyD", "ArrowRight") - k("KeyA", "ArrowLeft") + stick.x;
  const len = Math.hypot(fwd, side);
  if (len > 1) (fwd /= len), (side /= len);
  const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 5.5 : 3.6;
  const s = Math.sin(p.yaw), c = Math.cos(p.yaw);
  const dx = (-s * fwd + c * side) * speed * dt;
  const dz = (-c * fwd - s * side) * speed * dt;
  if (!blocked(p.x + dx, p.z, p.y)) p.x += dx;
  if (!blocked(p.x, p.z + dz, p.y)) p.z += dz;

  const ground = support(p.x, p.z, p.y);
  if (p.onGround && ground.top > p.y) p.y = ground.top; // step up
  if (p.onGround && (keys.has("Space") || stick.jump)) p.vy = JUMP;

  p.vy -= GRAVITY * dt;
  let y = p.y + p.vy * dt;
  const ceiling = headroom(p.x, p.z, p.y);
  if (y > ceiling) (y = ceiling), (p.vy = Math.min(p.vy, 0));
  p.onGround = false;
  if (y <= ground.top) {
    const fall = -p.vy;
    y = ground.top;
    p.vy = 0;
    p.onGround = true;
    const bounce = ground.under?.bounce;
    if (bounce === "trampoline" && fall > 2) p.vy = Math.max(fall * 0.85, 9);
    if (bounce === "bed" && fall > 3) p.vy = fall * 0.6;
    if (p.vy > 0) p.onGround = false;
  }
  p.y = y;

  const moving = len > 0.1 && p.onGround;
  if (moving && !reducedMotion) p.phase += dt * speed * 2.4;
  p.bob += ((moving && !reducedMotion ? Math.sin(p.phase) * 0.04 : 0) - p.bob) * Math.min(1, dt * 12);

  camera.position.set(p.x, EYE + p.y + p.bob, p.z);
  camera.rotation.set(p.pitch, p.yaw, 0);
}

function look(dx, dy) {
  player.yaw -= dx;
  player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch - dy));
}

// ---------- what are you looking at? ----------

const ray = new THREE.Raycaster();
ray.far = REACH;
const ndc = new THREE.Vector2();
const solids = [];
scene.traverse((o) => o.isMesh && solids.push(o));

function stationAt(x = 0, y = 0) {
  ndc.set(x, y);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(solids, false)[0];
  for (let o = hit?.object; o; o = o.parent) if (o.userData.station) return ui.clickable(o.userData.station) ? o.userData.station : null;
  return null;
}

// ---------- doing things ----------

let state = "menu"; // menu | playing | panel
let target = null;
let tvOnAt = null;
let lampOn = true;

function setState(next) {
  state = next;
  keys.clear();
  resetPad();
  ui.showMenu(state === "menu");
  if (state !== "panel") ui.showCursor(false);
  document.body.classList.toggle("playing", state === "playing");
  if (state !== "playing") {
    target = null;
    highlight(null);
    ui.setHover(null);
  }
}

function use(id) {
  if (!id) return;
  ui.markFound(id);
  if (id === "lamp") {
    lampOn = !lampOn;
    lampLight.visible = lampOn;
    lampHead.material[3] = lampOn ? bulbOn : bulbOff;
    return;
  }
  if (id === "tv" && tvOnAt === null) tvOnAt = performance.now();
  setState("panel");
  ui.openPanel(id);
  // Keep the mouse captured and steer a little in-game cursor instead, so closing the
  // panel drops you straight back in without the browser making you click first.
  ui.showCursor(locked());
}

// Back into the game. Browsers often won't re-capture the mouse without a click
// (after Esc, say), so you can keep playing without it: WASD works, the mouse still
// turns you, and your next click captures it again.
const locked = () => document.pointerLockElement === canvas;
function lock() {
  if (touch || locked()) return;
  try {
    canvas.requestPointerLock()?.catch?.(() => {});
  } catch {}
}
function resume() {
  setState("playing");
  lock();
}

ui.init({
  onEnter: resume,
  onClose: resume,
  onPick: (id) => use(id),
});

let lockedAt = 0;
document.addEventListener("pointerlockchange", () => {
  if (locked()) {
    lockedAt = performance.now();
    if (state === "panel") ui.showCursor(true);
    else if (state !== "playing") setState("playing");
  } else if (state === "panel") {
    // The browser took the mouse back with a panel open (Esc, outside fullscreen).
    // Treat it as closing the panel.
    ui.closePanel();
  } else if (state === "playing" && performance.now() - lockedAt > 500) {
    // The player pressed Esc. (Losing the mouse a moment after getting it back is
    // just the browser being fussy, so that one we ignore.)
    setState("menu");
  }
});
// Going in or out of fullscreen can drop the mouse; grab it again if we can.
document.addEventListener("fullscreenchange", () => state === "playing" && lock());

document.addEventListener("keydown", (e) => {
  if (state !== "playing") return;
  keys.add(e.code);
  if (e.code === "KeyE") use(stationAt());
  if (e.code === "KeyF") ui.toggleFullscreen();
  if (e.code === "Escape") {
    // In fullscreen, Esc comes to us instead of the browser, so pause ourselves.
    setState("menu");
    if (locked()) document.exitPointerLock();
  }
  // Any key except Esc counts as a gesture, so the browser lets us grab the mouse again.
  // (Not if that key just opened a panel: the panel works with the normal cursor.)
  else if (state === "playing" && !locked() && e.code !== "KeyF") lock();
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
});
document.addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());

document.addEventListener("mousemove", (e) => {
  if (state === "panel" && locked()) return ui.moveCursor(e.movementX, e.movementY);
  if (state !== "playing" || touch || !(locked() || e.target === canvas)) return;
  if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return; // browsers glitch on lock changes
  look(e.movementX * 0.0022, e.movementY * 0.0022);
});
document.addEventListener("mousedown", (e) => {
  if (state === "panel" && locked() && e.button === 0) return ui.clickCursor();
  if (state !== "playing" || touch || e.button !== 0 || !(locked() || e.target === canvas)) return;
  const id = stationAt();
  if (id) use(id);
  else lock();
});

// With the mouse captured, the scroll wheel goes to the game, so pass it to the panel.
document.addEventListener("wheel", (e) => state === "panel" && locked() && ui.scrollPanel(e.deltaY), { passive: true });

// Without the mouse captured, the hidden cursor can hit the edge of the window and stop
// you turning. So pushing it against the left or right edge keeps turning you that way,
// but only while you're actually pushing: once the mouse goes still, so do you.
const pointer = { x: 0, inside: false, movedAt: 0, dir: 0 };
canvas.addEventListener("mousemove", (e) => {
  pointer.x = e.clientX;
  pointer.inside = true;
  pointer.movedAt = performance.now();
  pointer.dir = Math.sign(e.movementX);
});
canvas.addEventListener("mouseleave", () => (pointer.inside = false));
function edgeTurn(dt) {
  if (touch || locked() || !pointer.inside || performance.now() - pointer.movedAt > 120) return;
  const zone = Math.min(60, innerWidth * 0.06);
  let push = 0;
  if (pointer.x < zone) push = -(1 - pointer.x / zone);
  else if (pointer.x > innerWidth - zone) push = 1 - (innerWidth - pointer.x) / zone;
  if (push && pointer.dir !== -Math.sign(push)) look(push * 1.6 * dt, 0); // not while pulling away
}

// Touch, Pocket Edition style: an arrow pad in the corner (jump in the middle),
// drag anywhere else to look around, tap things to use them.
const touches = new Map();
canvas.addEventListener(
  "touchstart",
  (e) => {
    if (state !== "playing") return;
    e.preventDefault();
    for (const t of e.changedTouches)
      touches.set(t.identifier, { x: t.clientX, y: t.clientY, t0: performance.now(), moved: 0 });
  },
  { passive: false },
);
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const s = touches.get(t.identifier);
      if (!s) continue;
      s.moved += Math.hypot(t.clientX - s.x, t.clientY - s.y);
      look((t.clientX - s.x) * 0.006, (t.clientY - s.y) * 0.006);
      s.x = t.clientX;
      s.y = t.clientY;
    }
  },
  { passive: false },
);
const endTouch = (e) => {
  for (const t of e.changedTouches) {
    const s = touches.get(t.identifier);
    if (!s) continue;
    touches.delete(t.identifier);
    if (s.moved < 12 && performance.now() - s.t0 < 350 && state === "playing") {
      use(stationAt((t.clientX / innerWidth) * 2 - 1, -(t.clientY / innerHeight) * 2 + 1));
    }
  }
};
canvas.addEventListener("touchend", endTouch);
canvas.addEventListener("touchcancel", endTouch);

// The arrow pad. Each finger on it presses whichever button it's over, so you can
// slide your thumb from one arrow to another without lifting it.
const dpad = document.getElementById("dpad");
const pads = new Map(); // touch id -> button under that finger
const DIRS = { f: [0, -1], b: [0, 1], l: [-1, 0], r: [1, 0], fl: [-1, -1], fr: [1, -1] };
const buttonAt = (x, y) => document.elementFromPoint(x, y)?.closest("#dpad [data-dir]")?.dataset.dir ?? null;

function updatePad() {
  let x = 0, y = 0;
  for (const d of pads.values()) if (DIRS[d]) (x += DIRS[d][0]), (y += DIRS[d][1]);
  const pressed = new Set(pads.values());
  stick.x = Math.sign(x);
  stick.y = Math.sign(y);
  stick.jump = pressed.has("jump");
  for (const b of dpad.querySelectorAll("[data-dir]")) b.classList.toggle("on", pressed.has(b.dataset.dir));
  // The diagonals only show up while you're walking forward.
  dpad.classList.toggle("forward", pressed.has("f") || pressed.has("fl") || pressed.has("fr"));
}
function resetPad() {
  pads.clear();
  updatePad();
}
const padTouch = (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (e.type === "touchend" || e.type === "touchcancel") pads.delete(t.identifier);
    else if (state === "playing" && (e.type === "touchstart" || pads.has(t.identifier))) pads.set(t.identifier, buttonAt(t.clientX, t.clientY));
  }
  updatePad();
};
for (const type of ["touchstart", "touchmove", "touchend", "touchcancel"]) dpad.addEventListener(type, padTouch, { passive: false });

// ---------- loop ----------

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 85 : 70; // wider on phones held upright
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

const cursorFrames = [T.monitor(true), T.monitor(false)];
let last = performance.now();
let lastSlowFrame = 0;
let cursor = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Without the mouse captured, the hidden cursor can wander off the page, where clicks
  // don't reach the game. Say how to get it back.
  document.body.classList.toggle("unlocked", state === "playing" && !touch && !locked());

  if (state === "playing") {
    edgeTurn(dt);
    move(dt);
    if (!touch) {
      const next = stationAt();
      if (next !== target) {
        target = next;
        highlight(target);
        ui.setHover(target);
      }
    }
  } else {
    camera.position.set(player.x, EYE + player.y, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
  }

  if (now - lastSlowFrame > 90) {
    lastSlowFrame = now;
    if (tvOnAt !== null) {
      T.drawTV(tvCtx, (now - tvOnAt) / 1000);
      tvScreen.map.needsUpdate = true;
    }
    T.drawDream(dreamCtx, dreamBackground, now / 1000);
    dreamGlass.map.needsUpdate = true;
  }
  candleLight.intensity = 0.55 + Math.sin(now * 0.013) * 0.08 + Math.sin(now * 0.037) * 0.05;
  const blink = Math.floor(now / 530) % 2;
  if (blink !== cursor) {
    cursor = blink;
    monitorCtx.drawImage(cursorFrames[blink], 0, 0);
    monitorScreen.map.needsUpdate = true;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// For poking around from the console: apartment.goto(x, z, yaw)
window.apartment = {
  goto(x, z, yaw = player.yaw, pitch = player.pitch) {
    Object.assign(player, { x, z, yaw, pitch, y: 0, vy: 0 });
  },
  where: () => ({ x: player.x, y: player.y, z: player.z, yaw: player.yaw }),
  use,
};
