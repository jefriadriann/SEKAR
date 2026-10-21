/**
 * Ilustrasi siluet landmark 46 wilayah KPw (dekoratif, buatan sendiri — bukan foto).
 * Semua bentuk memakai currentColor; bagian putih (#fff) berfungsi sebagai "potongan"
 * jendela/detail. Transparansi diatur oleh pemakai (lihat LandmarkBackdrop).
 * viewBox 480×280, garis tanah y=262.
 */
import type { ReactNode } from "react";

const G = 262;
const CUT = "#fff";

// ------------------------------------------------------------------ primitif
const ground = (y = G) => <rect x="0" y={y} width="480" height={280 - y} />;
const water = (y = 238) => (
  <>
    <rect x="0" y={y} width="480" height={280 - y} opacity={0.55} />
    {[0, 1, 2].map((r) => (
      <path key={r} d={`M0 ${y + 10 + r * 11} ${Array.from({ length: 12 }, (_, i) => `q 20 -6 40 0`).join(" ")}`} fill="none" stroke={CUT} strokeWidth="2" opacity={0.7} />
    ))}
  </>
);
/** Kubah setengah lingkaran (alas di y=base). */
const dome = (cx: number, base: number, r: number) => <path d={`M${cx - r} ${base} A ${r} ${r} 0 0 1 ${cx + r} ${base} Z`} />;
/** Kubah bawang. */
const onion = (cx: number, base: number, w: number, h: number) => (
  <path d={`M${cx - w / 2} ${base} C ${cx - w * 0.75} ${base - h * 0.45}, ${cx - w * 0.18} ${base - h * 0.62}, ${cx} ${base - h} C ${cx + w * 0.18} ${base - h * 0.62}, ${cx + w * 0.75} ${base - h * 0.45}, ${cx + w / 2} ${base} Z`} />
);
/** Menara masjid: badan, balkon, kubah kecil, ujung. */
const minaret = (x: number, base: number, w: number, h: number) => (
  <g>
    <rect x={x - w / 2} y={base - h} width={w} height={h} />
    <rect x={x - w * 0.85} y={base - h * 0.72} width={w * 1.7} height={4} />
    <rect x={x - w * 0.85} y={base - h * 0.98} width={w * 1.7} height={4} />
    {onion(x, base - h, w * 1.3, w * 1.8)}
    <rect x={x - 1} y={base - h - w * 1.8 - 10} width={2} height={12} />
  </g>
);
const windows = (x: number, y: number, n: number, w: number, h: number, gap: number, arched = false) =>
  Array.from({ length: n }, (_, i) =>
    arched ? (
      <path key={i} d={`M${x + i * (w + gap)} ${y + h} v${-h + w / 2} a ${w / 2} ${w / 2} 0 0 1 ${w} 0 v${h - w / 2} z`} fill={CUT} />
    ) : (
      <rect key={i} x={x + i * (w + gap)} y={y} width={w} height={h} fill={CUT} />
    ),
  );
const hills = (pts: string) => <path d={`M0 ${G} ${pts} L480 ${G} Z`} opacity={0.35} />;
const sun = (cx = 400, cy = 70, r = 26) => <circle cx={cx} cy={cy} r={r} opacity={0.3} />;
/** Atap tumpang (bertingkat) khas masjid Nusantara. */
const tieredRoof = (cx: number, base: number, w: number, tiers: number, th = 16) => (
  <g>
    {Array.from({ length: tiers }, (_, i) => {
      const ww = w * (1 - i / (tiers + 0.6));
      const y = base - i * th;
      return <path key={i} d={`M${cx - ww / 2} ${y} L${cx - ww / 2 + ww * 0.18} ${y - th + 2} L${cx + ww / 2 - ww * 0.18} ${y - th + 2} L${cx + ww / 2} ${y} Z`} />;
    })}
    <rect x={cx - 1.5} y={base - tiers * th - 14} width={3} height={16} />
  </g>
);
/** Rangka busur jembatan. */
const archSpan = (x1: number, x2: number, deck: number, rise: number, sw = 7) => (
  <g fill="none" stroke="currentColor">
    <path d={`M${x1} ${deck} Q ${(x1 + x2) / 2} ${deck - rise * 2} ${x2} ${deck}`} strokeWidth={sw} />
    {Array.from({ length: 9 }, (_, i) => {
      const t = (i + 1) / 10;
      const x = x1 + (x2 - x1) * t;
      const y = deck - rise * 4 * t * (1 - t);
      return <line key={i} x1={x} y1={y} x2={x} y2={deck} strokeWidth={2} />;
    })}
  </g>
);
const deckLine = (y: number, x1 = 0, x2 = 480, h = 9) => <rect x={x1} y={y} width={x2 - x1} height={h} />;

// ------------------------------------------------------------------ landmark
export const LANDMARKS: Record<string, () => ReactNode> = {
  "masjid-baiturrahman": () => (
    <>
      {ground()}
      <rect x="110" y="188" width="260" height="74" />
      {windows(122, 206, 9, 18, 40, 10, true)}
      <rect x="200" y="160" width="80" height="30" />
      {onion(240, 162, 92, 92)}
      <rect x="238" y="58" width="4" height="16" />
      {onion(160, 190, 50, 50)}
      {onion(320, 190, 50, 50)}
      {onion(125, 190, 26, 30)}
      {onion(355, 190, 26, 30)}
      {minaret(70, G, 16, 150)}
      {minaret(410, G, 16, 150)}
    </>
  ),
  "masjid-islamic-center-lhokseumawe": () => (
    <>
      {ground()}
      <rect x="140" y="182" width="200" height="80" />
      {windows(156, 200, 7, 16, 44, 9, true)}
      {dome(240, 184, 70)}
      <rect x="238" y="96" width="4" height="22" />
      {minaret(110, G, 13, 170)}
      {minaret(370, G, 13, 170)}
      {minaret(80, G, 10, 120)}
      {minaret(400, G, 10, 120)}
    </>
  ),
  "istana-maimun": () => (
    <>
      {ground()}
      <rect x="60" y="196" width="360" height="66" />
      {windows(72, 212, 13, 16, 34, 10, true)}
      <path d="M180 198 L200 160 L280 160 L300 198 Z" />
      <path d="M196 162 Q 240 120 284 162 Z" />
      <rect x="226" y="122" width="28" height="16" />
      {onion(240, 124, 30, 34)}
      {onion(90, 198, 24, 26)}
      {onion(390, 198, 24, 26)}
      <rect x="230" y="200" width="20" height="62" fill={CUT} />
    </>
  ),
  "danau-toba": () => (
    <>
      {hills("L0 170 Q 80 120 160 160 Q 260 110 340 150 Q 410 120 480 160")}
      {water(222)}
      <rect x="170" y="170" width="140" height="44" />
      <path d="M150 176 Q 170 112 200 132 Q 240 150 280 132 Q 310 112 330 176 Z" />
      {windows(190, 184, 5, 14, 18, 10)}
      <rect x="182" y="214" width="8" height="12" />
      <rect x="290" y="214" width="8" height="12" />
    </>
  ),
  "teluk-sibolga": () => (
    <>
      <path d="M0 200 L0 160 Q 70 90 150 150 Q 190 176 220 200 Z" opacity={0.35} />
      <path d="M300 200 Q 380 120 480 150 L480 200 Z" opacity={0.35} />
      {water(200)}
      <path d="M150 214 L330 214 L306 244 L176 244 Z" />
      <rect x="236" y="120" width="5" height="96" />
      <path d="M241 124 L310 206 L241 206 Z" />
      <path d="M236 132 L176 206 L236 206 Z" opacity={0.75} />
      <rect x="196" y="196" width="34" height="20" />
      {windows(202, 202, 2, 8, 8, 6)}
      {sun(110, 70)}
    </>
  ),
  "jam-gadang": () => (
    <>
      {ground()}
      <rect x="190" y="160" width="100" height="102" />
      <rect x="180" y="236" width="120" height="26" />
      <rect x="198" y="104" width="84" height="58" />
      <circle cx="240" cy="132" r="20" fill={CUT} />
      <path d="M240 132 L240 118 M240 132 L250 138" stroke="currentColor" strokeWidth="3" />
      <path d="M182 108 Q 196 88 210 92 Q 224 70 240 62 Q 256 70 270 92 Q 284 88 298 108 Z" />
      <path d="M182 108 L168 84 L190 100 Z M298 108 L312 84 L290 100 Z M240 64 L240 40" stroke="currentColor" strokeWidth="3" />
      {windows(204, 176, 3, 18, 40, 13, true)}
    </>
  ),
  "masjid-annur": () => (
    <>
      {water(236)}
      <rect x="130" y="176" width="220" height="60" />
      {windows(146, 194, 7, 16, 32, 13, true)}
      {dome(240, 178, 62)}
      {dome(170, 178, 24)}
      {dome(310, 178, 24)}
      <rect x="238" y="100" width="4" height="18" />
      {minaret(96, 236, 12, 150)}
      {minaret(384, 236, 12, 150)}
    </>
  ),
  "jembatan-barelang": () => (
    <>
      {water(226)}
      {deckLine(200)}
      {[150, 330].map((x) => (
        <g key={x}>
          <path d={`M${x - 22} 226 L${x - 4} 70 L${x + 4} 70 L${x + 22} 226 Z`} />
          <rect x={x - 16} y="150" width="32" height="6" />
          <g fill="none" stroke="currentColor" strokeWidth="1.6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <g key={i}>
                <line x1={x} y1={80 + i * 6} x2={x - i * 22} y2={200} />
                <line x1={x} y1={80 + i * 6} x2={x + i * 22 > 480 ? 480 : x + i * 22} y2={200} />
              </g>
            ))}
          </g>
        </g>
      ))}
    </>
  ),
  "gentala-arasy": () => (
    <>
      {water(230)}
      <path d="M40 230 Q 170 150 300 230" fill="none" stroke="currentColor" strokeWidth="8" />
      <path d="M40 218 Q 170 138 300 218" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="340" y="110" width="44" height="120" />
      {windows(350, 124, 2, 9, 90, 6)}
      <rect x="334" y="104" width="56" height="10" />
      {onion(362, 106, 52, 54)}
      <rect x="360" y="38" width="4" height="16" />
      <rect x="320" y="222" width="84" height="10" />
    </>
  ),
  "jembatan-ampera": () => (
    <>
      {water(222)}
      {deckLine(196)}
      {[150, 330].map((x) => (
        <g key={x}>
          <rect x={x - 14} y="70" width="28" height="152" />
          <path d={`M${x - 18} 70 L${x} 52 L${x + 18} 70 Z`} />
          {windows(x - 6, 86, 1, 12, 90, 0)}
        </g>
      ))}
      <rect x="164" y="78" width="152" height="10" />
      <rect x="164" y="100" width="152" height="6" />
      <g stroke="currentColor" strokeWidth="2">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={168 + i * 18} y1="88" x2={176 + i * 18} y2="100" />
        ))}
      </g>
    </>
  ),
  "benteng-marlborough": () => (
    <>
      {ground()}
      <path d="M60 262 L60 190 L110 170 L160 190 L320 190 L370 170 L420 190 L420 262 Z" />
      {windows(170, 172, 9, 10, 14, 6)}
      <path d="M210 262 v-40 a 30 30 0 0 1 60 0 v40 z" fill={CUT} />
      <rect x="238" y="110" width="3" height="80" />
      <path d="M241 112 h40 l-8 10 l8 10 h-40 z" />
    </>
  ),
  "menara-siger": () => (
    <>
      {hills("L0 230 Q 120 200 240 222 Q 360 196 480 228")}
      <rect x="140" y="170" width="200" height="92" />
      {windows(156, 188, 7, 16, 52, 12)}
      <path d="M126 172 L126 120 L150 140 L168 96 L190 132 L212 84 L240 70 L268 84 L290 132 L312 96 L330 140 L354 120 L354 172 Z" />
      {[168, 212, 268, 312].map((x) => (
        <circle key={x} cx={x} cy={x === 212 || x === 268 ? 84 : 96} r="5" fill={CUT} />
      ))}
      <rect x="238" y="44" width="4" height="28" />
    </>
  ),
  "mercusuar-belitung": () => (
    <>
      {water(226)}
      <path d="M190 226 L206 70 L234 70 L250 226 Z" />
      {[100, 140, 180].map((y) => (
        <rect key={y} x="196" y={y} width="48" height="10" fill={CUT} transform={`translate(${(y - 100) * -0.02 * 0} 0)`} />
      ))}
      <rect x="198" y="52" width="44" height="20" />
      <rect x="204" y="56" width="32" height="12" fill={CUT} />
      {dome(220, 52, 20)}
      <path d="M40 240 Q 50 180 110 186 Q 150 160 170 230 Z" />
      <path d="M300 236 Q 310 196 360 200 Q 400 176 430 236 Z" />
      <path d="M380 210 Q 400 168 450 186 Q 470 200 470 232 Z" opacity={0.8} />
    </>
  ),
  "masjid-banten": () => (
    <>
      {ground()}
      <rect x="90" y="208" width="170" height="54" />
      {windows(102, 220, 6, 16, 30, 10)}
      {tieredRoof(175, 210, 190, 5, 18)}
      <path d="M330 262 L340 120 L370 120 L380 262 Z" />
      <rect x="326" y="150" width="58" height="8" />
      <rect x="332" y="112" width="46" height="10" />
      <rect x="340" y="88" width="30" height="24" />
      {dome(355, 90, 18)}
      {windows(349, 170, 1, 12, 60, 0)}
    </>
  ),
  monas: () => (
    <>
      {ground()}
      <path d="M120 262 L140 222 L340 222 L360 262 Z" />
      <path d="M170 222 L190 196 L290 196 L310 222 Z" />
      <path d="M226 196 L232 70 L248 70 L254 196 Z" />
      <path d="M214 74 L266 74 L256 60 L224 60 Z" />
      <path d="M240 60 C 222 44, 236 30, 232 14 C 250 26, 256 44, 240 60 Z" />
      {windows(150, 234, 6, 20, 10, 12)}
    </>
  ),
  "gedung-sate": () => (
    <>
      {ground()}
      <rect x="50" y="194" width="380" height="68" />
      <path d="M40 196 L80 176 L400 176 L440 196 Z" />
      {windows(64, 210, 14, 14, 32, 11, true)}
      <rect x="208" y="140" width="64" height="56" />
      <path d="M196 142 L240 104 L284 142 Z" />
      <rect x="238" y="58" width="4" height="48" />
      {[64, 72, 80, 88, 96, 104].map((y) => (
        <circle key={y} cx="240" cy={y} r={y === 64 ? 4 : 5} />
      ))}
      <rect x="226" y="160" width="28" height="36" fill={CUT} />
    </>
  ),
  "keraton-kasepuhan": () => (
    <>
      {ground()}
      <path d="M90 262 L100 160 L120 150 L130 120 L150 112 L170 120 L176 160 L196 170 L196 262 Z" />
      <path d="M390 262 L380 160 L360 150 L350 120 L330 112 L310 120 L304 160 L284 170 L284 262 Z" />
      {[180, 200, 220, 240].map((y) => (
        <g key={y}>
          <rect x="108" y={y} width="80" height="3" fill={CUT} />
          <rect x="292" y={y} width="80" height="3" fill={CUT} />
        </g>
      ))}
      <rect x="40" y="212" width="50" height="50" />
      <rect x="390" y="212" width="50" height="50" />
      {sun(240, 120, 30)}
    </>
  ),
  "payung-geulis": () => (
    <>
      {ground()}
      {[
        [150, 130, 74],
        [300, 110, 86],
        [230, 170, 60],
      ].map(([cx, cy, r]) => (
        <g key={cx}>
          <path d={`M${cx - r} ${cy} Q ${cx} ${cy - r * 1.2} ${cx + r} ${cy} Z`} />
          {Array.from({ length: 7 }, (_, i) => (
            <line key={i} x1={cx} y1={cy - r * 0.6} x2={cx - r + (i * 2 * r) / 6} y2={cy} stroke={CUT} strokeWidth="1.6" />
          ))}
          <path d={`M${cx - r} ${cy} ${Array.from({ length: 6 }, () => `q ${r / 6} 10 ${r / 3} 0`).join(" ")}`} fill="none" stroke="currentColor" strokeWidth="3" />
          <rect x={cx - 2} y={cy - r * 0.6} width="4" height={G - cy + r * 0.6} />
        </g>
      ))}
    </>
  ),
  "lawang-sewu": () => (
    <>
      {ground()}
      <rect x="40" y="170" width="400" height="92" />
      <path d="M30 172 L60 150 L420 150 L450 172 Z" />
      {windows(52, 186, 16, 14, 26, 10, true)}
      {windows(52, 226, 16, 14, 30, 10, true)}
      {[180, 300].map((x) => (
        <g key={x}>
          <rect x={x - 22} y="96" width="44" height="76" />
          {dome(x, 98, 22)}
          <rect x={x - 2} y="64" width="4" height="14" />
          {windows(x - 12, 110, 2, 9, 30, 6, true)}
        </g>
      ))}
    </>
  ),
  "sangga-buwana": () => (
    <>
      {ground()}
      <rect x="120" y="226" width="240" height="36" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={196 + i * 4} y={196 - i * 38} width={88 - i * 8} height="34" />
          <path d={`M${184 + i * 4} ${200 - i * 38} L${200 + i * 4} ${186 - i * 38} L${280 - i * 4} ${186 - i * 38} L${296 - i * 4} ${200 - i * 38} Z`} />
          <rect x={214 + i * 4} y={204 - i * 38} width={52 - i * 8} height="16" fill={CUT} />
        </g>
      ))}
      <path d="M220 72 L240 30 L260 72 Z" />
    </>
  ),
  "menara-teratai": () => (
    <>
      {hills("L0 210 Q 120 170 240 200 Q 360 168 480 206")}
      {ground()}
      <rect x="230" y="110" width="20" height="152" />
      <rect x="214" y="236" width="52" height="26" />
      <path d="M240 112 C 200 100, 196 64, 214 42 C 222 60, 232 64, 240 40 C 248 64, 258 60, 266 42 C 284 64, 280 100, 240 112 Z" />
      <path d="M240 98 C 222 90, 222 70, 232 58 M240 98 C 258 90, 258 70, 248 58" fill="none" stroke={CUT} strokeWidth="2" />
    </>
  ),
  "teh-poci": () => (
    <>
      {ground()}
      <path d="M150 262 Q 110 250 112 200 Q 116 150 190 146 Q 264 150 268 200 Q 270 250 230 262 Z" />
      <path d="M262 186 Q 320 170 340 130 L350 136 Q 340 196 270 214 Z" />
      <path d="M118 172 Q 80 170 86 206 Q 90 232 122 228" fill="none" stroke="currentColor" strokeWidth="10" />
      <rect x="156" y="132" width="68" height="16" rx="6" />
      <circle cx="190" cy="124" r="10" />
      <path d="M330 262 Q 312 262 312 236 L384 236 Q 384 262 366 262 Z" />
      <path d="M160 190 h60" stroke={CUT} strokeWidth="3" />
    </>
  ),
  "tugu-jogja": () => (
    <>
      {ground()}
      <rect x="196" y="236" width="88" height="26" />
      <rect x="206" y="214" width="68" height="24" />
      <path d="M214 214 L222 104 L258 104 L266 214 Z" />
      {windows(232, 130, 1, 16, 60, 0)}
      <rect x="216" y="96" width="48" height="10" />
      <path d="M226 96 Q 240 40 254 96 Z" />
      <path d="M240 48 L240 24" stroke="currentColor" strokeWidth="4" />
      <circle cx="240" cy="70" r="6" fill={CUT} />
    </>
  ),
  "tugu-pahlawan": () => (
    <>
      {ground()}
      <rect x="160" y="244" width="160" height="18" />
      <path d="M200 244 Q 212 230 218 216 L226 40 L240 18 L254 40 L262 216 Q 268 230 280 244 Z" />
      {[60, 100, 140, 180].map((y) => (
        <rect key={y} x={234} y={y} width="12" height="26" fill={CUT} />
      ))}
      <rect x="196" y="214" width="88" height="6" />
    </>
  ),
  "tugu-malang": () => (
    <>
      {water(240)}
      <path d="M100 244 Q 240 216 380 244" fill="none" stroke="currentColor" strokeWidth="6" />
      <rect x="216" y="210" width="48" height="30" />
      <path d="M226 210 L232 76 L248 76 L254 210 Z" />
      {[110, 140, 170].map((y) => (
        <rect key={y} x="224" y={y} width="32" height="5" />
      ))}
      <path d="M232 76 L240 50 L248 76 Z" />
      {[140, 330].map((x) => (
        <path key={x} d={`M${x - 18} 238 Q ${x} 212 ${x + 18} 238 Z`} />
      ))}
    </>
  ),
  "simpang-lima-gumul": () => (
    <>
      {ground()}
      <rect x="110" y="96" width="260" height="166" />
      <rect x="100" y="86" width="280" height="14" />
      <path d="M190 262 v-80 a 50 50 0 0 1 100 0 v80 z" fill={CUT} />
      <path d="M126 262 v-40 a 16 16 0 0 1 32 0 v40 z M322 262 v-40 a 16 16 0 0 1 32 0 v40 z" fill={CUT} />
      {windows(126, 112, 9, 18, 10, 8)}
      <rect x="126" y="140" width="228" height="4" fill={CUT} />
    </>
  ),
  "tanjung-papuma": () => (
    <>
      {water(214)}
      <path d="M60 236 L80 140 Q 96 112 118 136 L140 236 Z" />
      <path d="M170 236 L186 96 Q 210 66 232 100 L250 236 Z" />
      <path d="M290 236 L300 170 Q 320 150 336 172 L350 236 Z" />
      <path d="M380 236 Q 400 196 430 200 Q 460 210 470 236 Z" opacity={0.75} />
      {sun(420, 80)}
    </>
  ),
  "pura-bali": () => (
    <>
      {ground()}
      <path d="M60 262 L72 130 L88 120 L96 92 L112 86 L128 92 L132 130 L150 140 L150 262 Z" />
      <path d="M420 262 L408 130 L392 120 L384 92 L368 86 L352 92 L348 130 L330 140 L330 262 Z" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${200 + i * 5} ${230 - i * 22} L${240} ${208 - i * 22} L${280 - i * 5} ${230 - i * 22} Z`} />
      ))}
      <rect x="226" y="228" width="28" height="34" />
      <rect x="238" y="58" width="4" height="22" />
      {[150, 190, 230].map((y) => (
        <rect key={y} x="74" y={y} width="70" height="3" fill={CUT} />
      ))}
    </>
  ),
  "islamic-center-ntb": () => (
    <>
      {hills("L0 200 Q 140 150 260 196 Q 360 130 480 190")}
      {ground()}
      <rect x="120" y="190" width="200" height="72" />
      {windows(134, 208, 7, 16, 36, 10, true)}
      {dome(220, 192, 62)}
      {dome(150, 192, 20)}
      {dome(290, 192, 20)}
      <rect x="218" y="116" width="4" height="16" />
      {minaret(380, G, 14, 220)}
    </>
  ),
  komodo: () => (
    <>
      {hills("L0 180 Q 100 110 200 170 Q 300 100 480 170")}
      {ground()}
      <path d="M70 236 Q 120 220 170 226 Q 220 206 290 214 Q 340 216 380 228 L420 222 Q 432 226 420 234 L384 240 Q 340 252 290 248 L270 262 L254 262 L262 246 Q 220 248 196 246 L184 262 L168 262 L176 244 Q 130 248 70 250 Q 20 252 10 246 Q 30 238 70 236 Z" />
      <circle cx="404" cy="226" r="2.5" fill={CUT} />
      <path d="M422 230 l18 -3 l-6 4 l6 3 z" />
    </>
  ),
  "tugu-khatulistiwa": () => (
    <>
      {ground()}
      <rect x="140" y="236" width="200" height="26" />
      {[180, 214, 266, 300].map((x) => (
        <rect key={x} x={x - 7} y="120" width="14" height="116" />
      ))}
      <rect x="168" y="112" width="144" height="12" />
      <circle cx="240" cy="80" r="34" fill="none" stroke="currentColor" strokeWidth="7" />
      <ellipse cx="240" cy="80" rx="34" ry="10" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M150 80 L330 80 M330 80 l-14 -8 M330 80 l-14 8" stroke="currentColor" strokeWidth="6" fill="none" />
      <rect x="236" y="112" width="8" height="10" />
    </>
  ),
  "jembatan-kahayan": () => (
    <>
      {water(226)}
      {deckLine(200)}
      {archSpan(30, 170, 200, 44)}
      {archSpan(170, 310, 200, 44)}
      {archSpan(310, 450, 200, 44)}
      {[30, 170, 310, 450].map((x) => (
        <rect key={x} x={x - 6} y="200" width="12" height="30" />
      ))}
    </>
  ),
  "pasar-terapung": () => (
    <>
      {water(196)}
      {[
        [130, 226, 1.35],
        [350, 246, 1.5],
      ].map(([x, y, k]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${k})`}>
          <path d="M-105 0 Q 0 30 105 0 L88 12 Q 0 34 -88 12 Z" />
          <path d="M-60 -4 L-40 -4 L-40 -16 L-60 -16 Z M-30 -4 L-10 -4 L-10 -20 L-30 -20 Z" />
          <circle cx="-48" cy="-22" r="7" />
          <circle cx="-20" cy="-26" r="7" />
          <rect x="22" y="-46" width="16" height="44" rx="6" />
          <path d="M2 -46 Q 30 -74 58 -46 Z" />
          <circle cx="30" cy="-54" r="8" />
          <path d="M40 -30 L80 -8" stroke="currentColor" strokeWidth="4" />
        </g>
      ))}
    </>
  ),
  "islamic-center-samarinda": () => (
    <>
      {water(236)}
      <rect x="130" y="176" width="220" height="60" />
      {windows(146, 194, 7, 16, 32, 13, true)}
      {dome(240, 178, 64)}
      {dome(170, 178, 22)}
      {dome(310, 178, 22)}
      <rect x="238" y="98" width="4" height="18" />
      {minaret(240, 112, 9, 70)}
      {minaret(96, 236, 12, 170)}
      {minaret(384, 236, 12, 170)}
      {minaret(66, 236, 8, 110)}
      {minaret(414, 236, 8, 110)}
    </>
  ),
  "beruang-madu": () => (
    <>
      {hills("L0 200 Q 120 160 240 196 Q 360 150 480 196")}
      {ground()}
      <path d="M182 262 L184 214 Q 172 170 192 138 L200 134 Q 194 112 204 96 Q 218 80 240 80 Q 262 80 276 96 Q 286 112 280 134 L288 138 Q 308 170 296 214 L298 262 L270 262 L268 228 L212 228 L210 262 Z" />
      <circle cx="206" cy="88" r="12" />
      <circle cx="274" cy="88" r="12" />
      <path d="M226 112 Q 240 104 254 112 Q 252 128 240 130 Q 228 128 226 112 Z" fill={CUT} opacity={0.75} />
      <circle cx="226" cy="100" r="3" fill={CUT} />
      <circle cx="254" cy="100" r="3" fill={CUT} />
      <path d="M208 150 Q 240 190 272 150 Q 258 168 240 170 Q 222 168 208 150 Z" fill={CUT} />
      <path d="M186 168 Q 166 196 172 222 L184 220 Q 182 196 198 176 Z M294 168 Q 314 196 308 222 L296 220 Q 298 196 282 176 Z" />
    </>
  ),
  bekantan: () => (
    <>
      <path d="M0 176 Q 160 160 300 186 Q 400 200 480 190 L480 202 Q 400 212 300 198 Q 160 172 0 188 Z" />
      <path d="M196 184 Q 180 140 200 108 Q 214 86 244 86 Q 276 88 286 118 Q 298 150 284 184 Z" />
      <circle cx="244" cy="78" r="24" />
      <path d="M244 82 Q 276 80 280 104 Q 270 116 254 110 Q 246 100 244 90 Z" />
      <circle cx="236" cy="72" r="3" fill={CUT} />
      <path d="M210 140 Q 240 160 270 140" fill="none" stroke={CUT} strokeWidth="3" opacity={0.7} />
      <path d="M276 176 Q 316 214 306 262 L294 262 Q 300 222 266 194 Z" />
      <path d="M204 160 L186 192 L198 196 L214 168 Z M276 160 L296 190 L284 196 L268 168 Z" />
    </>
  ),
  "yesus-memberkati": () => (
    <>
      {hills("L0 230 Q 160 150 240 160 Q 340 160 480 220")}
      <rect x="218" y="190" width="44" height="72" />
      <circle cx="240" cy="190" r="26" />
      <path d="M226 166 L224 98 L256 98 L254 166 Z" />
      <path d="M226 106 L150 90 L150 98 L226 116 Z M254 106 L330 90 L330 98 L254 116 Z" />
      <circle cx="240" cy="86" r="12" />
      <path d="M224 166 L216 182 L264 182 L256 166 Z" />
    </>
  ),
  "menara-limboto": () => (
    <>
      {ground()}
      <path d="M170 262 L220 120 L260 120 L310 262 L284 262 L246 150 L234 150 L196 262 Z" />
      <g stroke="currentColor" strokeWidth="2.5">
        <line x1="200" y1="220" x2="280" y2="220" />
        <line x1="212" y1="180" x2="268" y2="180" />
        <line x1="196" y1="262" x2="268" y2="180" />
        <line x1="284" y1="262" x2="212" y2="180" />
      </g>
      <rect x="226" y="70" width="28" height="52" />
      <rect x="208" y="96" width="64" height="12" />
      {dome(240, 72, 20)}
      <rect x="238" y="30" width="4" height="22" />
    </>
  ),
  "jembatan-ponulele": () => (
    <>
      {water(226)}
      {hills("L0 170 Q 60 130 120 170 L120 226 L0 226 Z")}
      {deckLine(206, 40, 440, 8)}
      <path d="M90 214 Q 240 40 390 214" fill="none" stroke="currentColor" strokeWidth="11" />
      <g stroke="currentColor" strokeWidth="2">
        {Array.from({ length: 13 }, (_, i) => {
          const x = 110 + i * 20;
          const t = (x - 90) / 300;
          const y = 214 - 4 * 87 * t * (1 - t);
          return <line key={i} x1={x} y1={y} x2={x} y2={206} />;
        })}
      </g>
    </>
  ),
  "pinisi-losari": () => (
    <>
      {water(222)}
      <path d="M90 214 L380 214 L350 244 L120 244 Z" />
      <path d="M90 214 L60 200 L96 206 Z" />
      <rect x="196" y="70" width="5" height="146" />
      <rect x="276" y="86" width="5" height="130" />
      <path d="M198 76 L120 196 L198 196 Z" />
      <path d="M204 84 L260 196 L204 196 Z" />
      <path d="M278 92 L340 196 L282 196 Z" />
      <path d="M198 70 L60 200 L66 202 L198 90 Z" opacity={0.8} />
      <path d="M198 66 l16 4 l-16 4 z M278 82 l16 4 l-16 4 z" />
    </>
  ),
  "perahu-sandeq": () => (
    <>
      {water(224)}
      <path d="M100 222 Q 240 238 400 220 L392 230 Q 240 248 108 232 Z" />
      <path d="M80 244 L420 244" stroke="currentColor" strokeWidth="3" />
      <path d="M150 226 L140 246 M330 224 L340 246" stroke="currentColor" strokeWidth="3" />
      <rect x="236" y="60" width="5" height="164" />
      <path d="M241 62 L360 214 L246 214 Z" />
      <path d="M236 90 L150 212 L234 212 Z" opacity={0.8} />
      {sun(110, 80)}
    </>
  ),
  "tugu-persatuan-kendari": () => (
    <>
      {ground()}
      <rect x="150" y="240" width="180" height="22" />
      <rect x="180" y="220" width="120" height="22" />
      <path d="M220 220 L230 70 L250 70 L260 220 Z" />
      <path d="M230 70 L240 44 L250 70 Z" />
      <path d="M240 26 l5 11 h12 l-10 7 l4 12 l-11 -7 l-11 7 l4 -12 l-10 -7 h12 z" />
      {[110, 150, 190].map((y) => (
        <rect key={y} x="226" y={y} width="28" height="4" fill={CUT} />
      ))}
    </>
  ),
  "gong-perdamaian": () => (
    <>
      {ground()}
      <rect x="150" y="236" width="180" height="26" />
      <rect x="120" y="70" width="14" height="168" />
      <rect x="346" y="70" width="14" height="168" />
      <rect x="110" y="62" width="260" height="14" />
      <circle cx="240" cy="154" r="74" />
      <circle cx="240" cy="154" r="56" fill={CUT} opacity={0.6} />
      <circle cx="240" cy="154" r="22" />
      <path d="M200 76 L210 84 M280 76 L270 84" stroke="currentColor" strokeWidth="4" />
    </>
  ),
  gamalama: () => (
    <>
      <path d="M40 262 L190 80 Q 200 70 214 72 Q 230 70 240 82 L400 262 Z" opacity={0.45} />
      <path d="M200 76 Q 210 54 226 74" fill="none" stroke="currentColor" strokeWidth="5" opacity={0.6} />
      {ground()}
      <rect x="250" y="222" width="150" height="40" />
      {windows(262, 232, 6, 12, 22, 10)}
      {tieredRoof(325, 224, 170, 7, 13)}
    </>
  ),
  "jembatan-youtefa": () => (
    <>
      {hills("L0 150 Q 80 110 160 160 L160 226 L0 226 Z")}
      {hills("L320 226 L320 160 Q 400 100 480 140 L480 226 Z")}
      {water(226)}
      {deckLine(204, 20, 460, 8)}
      {archSpan(60, 230, 204, 52, 9)}
      {archSpan(250, 420, 204, 52, 9)}
      {[60, 240, 420].map((x) => (
        <rect key={x} x={x - 8} y="204" width="16" height="30" />
      ))}
    </>
  ),
  "raja-ampat": () => (
    <>
      {water(206)}
      {[
        [80, 230, 34, 60],
        [170, 222, 46, 90],
        [270, 232, 30, 54],
        [340, 220, 52, 100],
        [430, 232, 30, 50],
      ].map(([x, y, w, h]) => (
        <g key={x}>
          <path d={`M${x - w * 0.55} ${y} Q ${x - w * 0.6} ${y - h * 0.5} ${x - w} ${y - h * 0.75} Q ${x} ${y - h * 1.15} ${x + w} ${y - h * 0.75} Q ${x + w * 0.6} ${y - h * 0.5} ${x + w * 0.55} ${y} Z`} />
        </g>
      ))}
      {sun(250, 70)}
    </>
  ),
};

export function LandmarkArt({ landmark, className, title }: { landmark: string; className?: string; title?: string }) {
  const draw = LANDMARKS[landmark];
  if (!draw) return null;
  return (
    <svg viewBox="0 0 480 280" fill="currentColor" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {draw()}
    </svg>
  );
}
