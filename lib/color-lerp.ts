// Exact TypeScript port of color_lerp_palette.dart (ChromaCraft algorithm)

export type RGB = [number, number, number];
export type CurveName = "soft" | "linear" | "easeIn" | "easeOut" | "sCurve";

interface Point { x: number; y: number }

// ── Curve presets — identical to Dart ChromaCurve presets ─────────────────────

export const CURVES: Record<CurveName, Point[]> = {
  soft: [
    { x: 0,    y: 0    },
    { x: 0.25, y: 0.15 },
    { x: 0.5,  y: 0.5  },
    { x: 0.75, y: 0.85 },
    { x: 1,    y: 1    },
  ],
  linear: [
    { x: 0,   y: 0   },
    { x: 0.5, y: 0.5 },
    { x: 1,   y: 1   },
  ],
  easeIn: [
    { x: 0,   y: 0   },
    { x: 0.4, y: 0.1 },
    { x: 0.7, y: 0.5 },
    { x: 1,   y: 1   },
  ],
  easeOut: [
    { x: 0,   y: 0   },
    { x: 0.3, y: 0.5 },
    { x: 0.6, y: 0.9 },
    { x: 1,   y: 1   },
  ],
  sCurve: [
    { x: 0,   y: 0    },
    { x: 0.2, y: 0.08 },
    { x: 0.4, y: 0.35 },
    { x: 0.6, y: 0.65 },
    { x: 0.8, y: 0.92 },
    { x: 1,   y: 1    },
  ],
};

// Tone keys: 0=darkest, 50=base/seed, 100=lightest — matches Dart toneKeys
export const TONE_KEYS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

// Tailwind stops: 50=lightest → 950=darkest (reverse of tone keys)
export const TW_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

// Material stops: direct 1:1 with tone keys
export const MAT_STOPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = (g - b) / d;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    if (h < 0) h += 6;
    h *= 60;
  }
  return [h, s, l];
}

export function hslToRgb([h, s, l]: [number, number, number]): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export function luminance([r, g, b]: RGB): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(from: RGB, to: RGB, t: number): RGB {
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];
}

// ── Catmull-Rom spline — exact port of Dart ChromaCurve.transform ─────────────

function catmullRom(points: Point[], t: number): number {
  const n = points.length;

  let seg = 0;
  for (let i = 0; i < n - 1; i++) {
    if (t >= points[i].x && t <= points[i + 1].x) { seg = i; break; }
  }

  const p0 = points[Math.max(0, seg - 1)];
  const p1 = points[seg];
  const p2 = points[Math.min(n - 1, seg + 1)];
  const p3 = points[Math.min(n - 1, seg + 2)];

  const dt = p2.x - p1.x;
  const u  = dt < 1e-9 ? 0 : Math.min(1, Math.max(0, (t - p1.x) / dt));
  const u2 = u * u;
  const u3 = u2 * u;

  const v = 0.5 * (
    (2 * p1.y) +
    (-p0.y + p2.y) * u +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3
  );

  return Math.min(1, Math.max(0, v));
}

// ── Core generator — exact port of Dart ColorLerpPalette._generate ─────────────
//
// Returns Record<toneKey, hex> where toneKey ∈ [0,10,20,...,100]
// tone 0 = darkest, tone 50 = base (seed), tone 100 = lightest

export function generatePalette(
  baseHex: string,
  curve: CurveName = "soft",
  darkHex  = "#000000",
  lightHex = "#ffffff",
): Record<number, string> {
  const base  = hexToRgb(baseHex);
  const dark  = hexToRgb(darkHex);
  const light = hexToRgb(lightHex);
  const pts   = CURVES[curve];
  const n     = TONE_KEYS.length; // 11

  const result: Record<number, string> = {};

  for (let i = 0; i < n; i++) {
    const t  = i / (n - 1);          // 0.0 → 1.0
    const ct = catmullRom(pts, t);   // 0=dark anchor, 1=light anchor

    let color: RGB;
    if (ct <= 0.5) {
      color = lerpRgb(dark, base, ct * 2);          // dark half
    } else {
      color = lerpRgb(base, light, (ct - 0.5) * 2); // light half
    }

    result[TONE_KEYS[i]] = rgbToHex(color);
  }

  return result;
}

// ── Tailwind convenience — maps tone 100→50, tone 0→950 ──────────────────────

export function generateTailwindScale(
  baseHex: string,
  curve: CurveName = "soft",
  darkHex  = "#000000",
  lightHex = "#ffffff",
): Record<number, string> {
  const palette = generatePalette(baseHex, curve, darkHex, lightHex);
  const result: Record<number, string> = {};
  // Tailwind 50 = tone 100 (lightest), Tailwind 950 = tone 0 (darkest)
  TW_STOPS.forEach((twStop, i) => {
    result[twStop] = palette[TONE_KEYS[TONE_KEYS.length - 1 - i]];
  });
  return result;
}

// ── HSL ramp — tints.dev-exact algorithm ───────────────────────────────────────
//
// Instead of lerping toward pure white/black, this holds the seed's HUE and
// SATURATION constant and applies a fixed LIGHTNESS ramp per stop. The seed
// itself stays untouched at 500 ("exact") or gets folded onto the ramp too
// ("even", always monotonic). No stop ever reaches pure white or pure black.

export type Anchor = "exact" | "even";

export const HSL_LIGHTNESS: Record<number, number> = {
  50: 0.95, 100: 0.90, 200: 0.80, 300: 0.70, 400: 0.60,
  500: 0.50, 600: 0.40, 700: 0.30, 800: 0.20, 900: 0.10, 950: 0.05,
};

export function generateHslPalette(
  baseHex: string,
  anchor: Anchor = "exact",
): Record<number, string> {
  const base = hexToRgb(baseHex);
  const [h, s] = rgbToHsl(base);
  const out: Record<number, string> = {};
  for (const stop of TW_STOPS) {
    if (stop === 500 && anchor === "exact") {
      out[stop] = rgbToHex(base);
    } else {
      out[stop] = rgbToHex(hslToRgb([h, s, HSL_LIGHTNESS[stop]]));
    }
  }
  return out;
}

// True if lightness decreases steadily 50 → 950 (can break when an
// off-center seed is pinned exactly at 500 with anchor="exact").
export function isMonotonic(scale: Record<number, string>): boolean {
  const ls = TW_STOPS.map((s) => luminance(hexToRgb(scale[s])));
  for (let i = 1; i < ls.length; i++) {
    if (ls[i] > ls[i - 1] + 1e-4) return false;
  }
  return true;
}
