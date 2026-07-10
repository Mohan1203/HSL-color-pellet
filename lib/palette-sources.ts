// Reusable, seed-agnostic generator files offered for download from the
// palette preview UI. Kept as plain strings so the "web" and "app" export
// buttons can hand the user a standalone file with no project imports.

export const PALETTE_TS_SOURCE = `// palette.ts — one function, one primary color -> tints.dev-exact 50...950 scale.
// Single source of truth for the WEB side. palette.dart implements the
// identical algorithm for the APP side.
//
// Rule (matches tints.dev exactly):
//   - hold the primary's HUE + SATURATION constant
//   - apply a fixed LIGHTNESS ramp to every stop (95/90/80...10/5)
//   - keep the primary UNTOUCHED at stop 500

export type Palette = Record<number, string>;

export const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const LIGHTNESS: Record<number, number> = {
  50: 0.95, 100: 0.90, 200: 0.80, 300: 0.70, 400: 0.60,
  500: 0.50, 600: 0.40, 700: 0.30, 800: 0.20, 900: 0.10, 950: 0.05,
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => {
    const n = Math.round(v);
    const c = n < 0 ? 0 : n > 255 ? 255 : n;
    return c.toString(16).padStart(2, "0");
  };
  return "#" + to(r) + to(g) + to(b);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
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

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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

export type Anchor = "exact" | "even";

export function generatePalette(primaryHex: string, anchor: Anchor = "exact"): Palette {
  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [h, s] = rgbToHsl(pr, pg, pb);
  const out: Palette = {};
  for (const stop of STOPS) {
    if (stop === 500 && anchor === "exact") {
      out[stop] = rgbToHex(pr, pg, pb);
    } else {
      const [r, g, b] = hslToRgb(h, s, LIGHTNESS[stop]);
      out[stop] = rgbToHex(r, g, b);
    }
  }
  return out;
}

export function toThemeCss(primaryHex: string, name = "primary"): string {
  const p = generatePalette(primaryHex);
  const lines = STOPS.map((s) => \`  --color-\${name}-\${s}: \${p[s]};\`);
  return \`@theme {\\n\${lines.join("\\n")}\\n}\`;
}
`;

export const PALETTE_DART_SOURCE = `// palette.dart — one function, one primary color -> tints.dev-exact 50...950 scale.
// Single source of truth for the APP side. Implements the IDENTICAL
// algorithm to palette.ts (web). Run \`dart run palette.dart\` to self-verify.

import 'dart:math' as math;
// import 'package:flutter/material.dart'; // uncomment in the app for Color()

const List<int> stops = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const Map<int, double> _lightness = {
  50: 0.95, 100: 0.90, 200: 0.80, 300: 0.70, 400: 0.60,
  500: 0.50, 600: 0.40, 700: 0.30, 800: 0.20, 900: 0.10, 950: 0.05,
};

List<int> _hexToRgb(String hex) {
  var h = hex.replaceAll('#', '').trim();
  if (h.length == 3) h = h.split('').map((c) => '\$c\$c').join();
  return [
    int.parse(h.substring(0, 2), radix: 16),
    int.parse(h.substring(2, 4), radix: 16),
    int.parse(h.substring(4, 6), radix: 16),
  ];
}

String _rgbToHex(double r, double g, double b) {
  String to(double v) {
    var n = v.round();
    if (n < 0) n = 0;
    if (n > 255) n = 255;
    return n.toRadixString(16).padLeft(2, '0');
  }
  return '#\${to(r)}\${to(g)}\${to(b)}';
}

List<double> _rgbToHsl(double r, double g, double b) {
  r /= 255; g /= 255; b /= 255;
  final max = math.max(r, math.max(g, b));
  final min = math.min(r, math.min(g, b));
  final d = max - min;
  double h = 0, s = 0;
  final l = (max + min) / 2;
  if (d != 0) {
    s = d / (1 - (2 * l - 1).abs());
    if (max == r) h = (g - b) / d;
    else if (max == g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    if (h < 0) h += 6;
    h *= 60;
  }
  return [h, s, l];
}

List<double> _hslToRgb(double h, double s, double l) {
  final c = (1 - (2 * l - 1).abs()) * s;
  final x = c * (1 - (((h / 60) % 2) - 1).abs());
  final m = l - c / 2;
  double r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

Map<int, String> generatePalette(String primaryHex, {String anchor = 'exact'}) {
  final p = _hexToRgb(primaryHex);
  final hsl = _rgbToHsl(p[0].toDouble(), p[1].toDouble(), p[2].toDouble());
  final out = <int, String>{};
  for (final stop in stops) {
    if (stop == 500 && anchor == 'exact') {
      out[stop] = _rgbToHex(p[0].toDouble(), p[1].toDouble(), p[2].toDouble());
    } else {
      final rgb = _hslToRgb(hsl[0], hsl[1], _lightness[stop]!);
      out[stop] = _rgbToHex(rgb[0], rgb[1], rgb[2]);
    }
  }
  return out;
}

// In the Flutter app, turn a hex into a Color like this:
//   Color hexToColor(String hex) => Color(int.parse('FF\${hex.substring(1)}', radix: 16));
// Map<int, Color> swatch =
//   generatePalette('#1a73e8').map((k, v) => MapEntry(k, hexToColor(v)));

void main() {
  const golden = {
    50: '#e8f1fd', 100: '#d1e3fa', 200: '#a2c6f6', 300: '#74aaf1', 400: '#468eec',
    500: '#1a73e8', 600: '#135bb9', 700: '#0e448b', 800: '#092d5d', 900: '#05172e',
    950: '#020b17',
  };
  final got = generatePalette('#1a73e8');
  var ok = true;
  for (final s in stops) {
    final match = got[s] == golden[s];
    if (!match) ok = false;
    print('  \$s: \${got[s]}  \${match ? "== " : "!= "} \${golden[s]}  \${match ? "✓" : "✗"}');
  }
  print(ok
      ? '\\nMATCH ✓  Dart output is identical to the web output (11/11 stops).'
      : '\\nMISMATCH ✗  something differs - do not ship until this prints MATCH.');
}
`;
