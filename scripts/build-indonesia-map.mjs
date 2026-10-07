#!/usr/bin/env node
/**
 * Membangun path SVG peta Indonesia dari Natural Earth (public domain).
 *
 * Pemakaian:
 *   node scripts/build-indonesia-map.mjs <ne_10m_admin_0_countries.geojson>
 * Sumber: https://github.com/nvkelso/natural-earth-vector (geojson/ne_10m_admin_0_countries.geojson)
 *
 * Hasil: src/components/map/indonesia-map-data.ts — path per korwil (pengelompokan
 * pulau/provinsi berdasarkan titik tengah poligon) + negara tetangga sebagai konteks.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src) {
  console.error("Pemakaian: node scripts/build-indonesia-map.mjs <ne_10m_admin_0_countries.geojson>");
  process.exit(1);
}

// Proyeksi ekuirektangular sederhana (di sekitar khatulistiwa distorsinya kecil).
const LON0 = 94.6;
const LAT0 = 6.4;
const LON1 = 141.4;
const LAT1 = -11.4;
const W = 1000;
const K = W / (LON1 - LON0);
const H = Math.round((LAT0 - LAT1) * K);
const px = ([lon, lat]) => [(lon - LON0) * K, (LAT0 - lat) * K];

function sqSegDist(p, a, b) {
  let [x, y] = a;
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx || dy) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) [x, y] = b;
    else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplify(points, tol) {
  if (points.length <= 3) return points;
  const sq = tol * tol;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let max = sq;
    let idx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(points[i], points[first], points[last]);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (idx > -1) {
      keep[idx] = 1;
      stack.push([first, idx], [idx, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function area(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(a / 2);
}

function centroid(ring) {
  let x = 0;
  let y = 0;
  for (const p of ring) {
    x += p[0];
    y += p[1];
  }
  return [x / ring.length, y / ring.length];
}

/** Korwil berdasarkan titik tengah pulau (lon, lat). */
function korwilOf([lon, lat]) {
  if (lat < -7.9 && lon >= 114.4 && lon < 125.6) return "Bali dan Nusa Tenggara";
  if (lon >= 105 && lon <= 116.6 && lat <= -5.4 && lat >= -7.95) return "Jawa";
  if (lon < 108.6) return "Sumatera";
  if (lon < 119.6 && lat > -4.8) return "Kalimantan";
  if (lon >= 127 || (lon >= 124.5 && lat < 0.5) || (lon >= 125.9 && lat < 2.5)) return "Maluku dan Papua";
  return "Sulawesi";
}

function ringToPath(ring) {
  return (
    ring
      .map((p, i) => {
        const [x, y] = px(p);
        return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join("") + "Z"
  );
}

const TOL_DEG = 0.012;
const MIN_AREA_DEG = 0.0006;

const geo = JSON.parse(readFileSync(src, "utf8"));
const byCode = new Map(geo.features.map((f) => [f.properties.ADM0_A3, f]));

function polygons(code) {
  const g = byCode.get(code)?.geometry;
  if (!g) throw new Error(`Negara ${code} tidak ditemukan`);
  return g.type === "Polygon" ? [g.coordinates] : g.coordinates;
}

const korwil = {};
const centers = {};
let points = 0;
for (const poly of polygons("IDN")) {
  const outer = poly[0];
  if (area(outer) < MIN_AREA_DEG) continue;
  const simp = simplify(outer, TOL_DEG);
  if (simp.length < 4) continue;
  const c = centroid(outer);
  const k = korwilOf(c);
  korwil[k] ??= [];
  korwil[k].push(ringToPath(simp));
  points += simp.length;
  // Titik label: pusat berbobot luas per korwil.
  const a = area(outer);
  centers[k] ??= { x: 0, y: 0, a: 0 };
  const [cx, cy] = px(c);
  centers[k].x += cx * a;
  centers[k].y += cy * a;
  centers[k].a += a;
}

const neighbors = [];
for (const code of ["MYS", "BRN", "PNG", "TLS", "SGP", "PHL", "THA", "AUS"]) {
  if (!byCode.has(code)) continue;
  for (const poly of polygons(code)) {
    const outer = poly[0];
    if (area(outer) < 0.02) continue;
    const xs = outer.map(px);
    if (xs.every(([x, y]) => x < -20 || x > W + 20 || y < -20 || y > H + 20)) continue;
    neighbors.push(ringToPath(simplify(outer, TOL_DEG * 2)));
  }
}

const labelPoints = Object.fromEntries(Object.entries(centers).map(([k, v]) => [k, [+(v.x / v.a).toFixed(1), +(v.y / v.a).toFixed(1)]]));

const out = `// DIHASILKAN OTOMATIS oleh scripts/build-indonesia-map.mjs — jangan diedit manual.
// Sumber geometri: Natural Earth 1:10m Admin 0 (public domain), disederhanakan.
// Pengelompokan pulau ke korwil berdasarkan titik tengah poligon.

export const MAP_WIDTH = ${W};
export const MAP_HEIGHT = ${H};

export const KORWIL_PATHS: Record<string, string> = ${JSON.stringify(Object.fromEntries(Object.entries(korwil).map(([k, v]) => [k, v.join("")])), null, 2)};

export const KORWIL_CENTERS: Record<string, [number, number]> = ${JSON.stringify(labelPoints, null, 2)};

export const NEIGHBOR_PATH = ${JSON.stringify(neighbors.join(""))};
`;
const target = join(root, "src/components/map/indonesia-map-data.ts");
writeFileSync(target, out);
console.log(`Ditulis ${target}: ${points} titik, ${Object.values(korwil).reduce((s, v) => s + v.length, 0)} pulau, ukuran ${out.length.toLocaleString()} karakter.`);
console.log(Object.fromEntries(Object.entries(korwil).map(([k, v]) => [k, v.length])));
