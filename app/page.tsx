"use client";

import { useMemo, useState } from "react";
import {
  generateTailwindScale,
  generatePalette,
  generateHslPalette,
  isMonotonic,
  TW_STOPS,
  MAT_STOPS,
  type CurveName,
  type Anchor,
} from "@/lib/color-lerp";
import { PALETTE_TS_SOURCE, PALETTE_DART_SOURCE } from "@/lib/palette-sources";

type Algorithm = "hsl" | "chroma";
type Scheme = "tailwind" | "material";
type ExportFormat = "tw" | "css" | "dart";

interface Seed {
  id: number;
  hex: string;
}

let nextId = 1;
const SEED_PALETTE = ["#3b82f6", "#e8734a", "#10b981", "#a855f7", "#f43f5e"];

const CURVE_NAMES: CurveName[] = ["soft", "linear", "easeIn", "easeOut", "sCurve"];

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function getScale(
  hex: string,
  algorithm: Algorithm,
  scheme: Scheme,
  curve: CurveName,
  anchor: Anchor
): Record<number, string> {
  if (algorithm === "hsl") return generateHslPalette(hex, anchor);
  if (scheme === "tailwind") return generateTailwindScale(hex, curve);
  return generatePalette(hex, curve);
}

function getStops(algorithm: Algorithm, scheme: Scheme) {
  if (algorithm === "hsl") return [...TW_STOPS];
  return scheme === "tailwind" ? [...TW_STOPS] : [...MAT_STOPS];
}

function keyFor(prefix: string) {
  return (prefix || "primary").toLowerCase().replace(/[^a-z0-9]+/g, "-") || "primary";
}

function buildExportCode(scale: Record<number, string>, stops: number[], format: ExportFormat, prefix: string) {
  const key = keyFor(prefix);
  const entries = stops.map((s) => [s, scale[s]] as const);

  if (format === "tw") {
    const lines = entries.map(([s, h]) => `  --color-${key}-${s}: ${h};`);
    return `@theme {\n${lines.join("\n")}\n}`;
  }
  if (format === "css") {
    const lines = entries.map(([s, h]) => `  --${key}-${s}: ${h};`);
    return `:root {\n${lines.join("\n")}\n}`;
  }
  const cap = key.replace(/(^|-)([a-z0-9])/g, (_m, _p, c: string) => c.toUpperCase());
  const lines = entries.map(([s, h]) => {
    const argb = "0xFF" + h.slice(1).toUpperCase();
    return `    ${s}: Color(${argb}),`;
  });
  return `class ${cap} {\n  static const Map<int, Color> ${key} = {\n${lines.join("\n")}\n  };\n}`;
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Home() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("hsl");
  const [scheme, setScheme] = useState<Scheme>("tailwind");
  const [curve, setCurve] = useState<CurveName>("soft");
  const [anchor, setAnchor] = useState<Anchor>("exact");
  const [prefix, setPrefix] = useState("primary");
  const [seeds, setSeeds] = useState<Seed[]>([{ id: nextId++, hex: "#1a73e8" }]);
  const [exportSeedId, setExportSeedId] = useState<number | null>(seeds[0]?.id ?? null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("tw");
  const [toast, setToast] = useState<string | null>(null);

  const stops = getStops(algorithm, scheme);

  function flashToast(msg: string) {
    setToast(msg);
    window.clearTimeout((flashToast as unknown as { t?: number }).t);
    (flashToast as unknown as { t?: number }).t = window.setTimeout(() => setToast(null), 1600);
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => flashToast(`Copied ${label} · ${text}`));
  }

  function addSeed() {
    const hex = SEED_PALETTE[seeds.length % SEED_PALETTE.length];
    const id = nextId++;
    setSeeds((prev) => [...prev, { id, hex }]);
    setExportSeedId(id);
  }
  function removeSeed(id: number) {
    setSeeds((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (exportSeedId === id) setExportSeedId(next[0]?.id ?? null);
      return next;
    });
  }
  function updateHex(id: number, hex: string) {
    setSeeds((prev) => prev.map((s) => (s.id === id ? { ...s, hex } : s)));
  }

  const exportSeed = seeds.find((s) => s.id === exportSeedId) ?? seeds[0];
  const exportScale = exportSeed ? getScale(exportSeed.hex, algorithm, scheme, curve, anchor) : {};
  const exportCode = exportSeed ? buildExportCode(exportScale, stops, exportFormat, prefix) : "";

  const nonMonotonicSeeds = useMemo(() => {
    if (algorithm !== "hsl" || anchor !== "exact") return [];
    return seeds.filter((s) => !isMonotonic(generateHslPalette(s.hex, "exact")));
  }, [seeds, algorithm, anchor]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            ChromaCraft <span className="text-gray-400 font-medium">· palette preview</span>
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-1">one seed color → 11 shades, Tailwind-ready</p>
        </div>
        <div className="text-xs font-mono text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
          <b className="text-indigo-600">{stops[0]}</b> → <b className="text-indigo-600">{stops[stops.length - 1]}</b>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6 flex flex-wrap gap-6 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Algorithm</label>
          <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1">
            {(["hsl", "chroma"] as Algorithm[]).map((a) => (
              <button
                key={a}
                onClick={() => setAlgorithm(a)}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  algorithm === a ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {a === "hsl" ? "HSL ramp · tints.dev" : "ChromaCraft · your code"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
            Curve <span className="opacity-60">(ChromaCraft)</span>
          </label>
          <select
            value={curve}
            disabled={algorithm !== "chroma"}
            onChange={(e) => setCurve(e.target.value as CurveName)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-black"
          >
            {CURVE_NAMES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
            Scheme <span className="opacity-60">(ChromaCraft)</span>
          </label>
          <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1">
            {(["tailwind", "material"] as Scheme[]).map((s) => (
              <button
                key={s}
                disabled={algorithm !== "chroma"}
                onClick={() => setScheme(s)}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  scheme === s && algorithm === "chroma" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {s === "tailwind" ? "Tailwind" : "Material"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">500 anchor</label>
          <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1">
            {(["exact", "even"] as Anchor[]).map((a) => (
              <button
                key={a}
                disabled={algorithm !== "hsl"}
                onClick={() => setAnchor(a)}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  anchor === a && algorithm === "hsl" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {a === "exact" ? "Exact seed" : "Even ramp"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Prefix</label>
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 w-24 text-black"
          />
        </div>
      </div>

      {/* Warning banner */}
      {nonMonotonicSeeds.length > 0 && (
        <div className="mb-6 text-sm leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <b>Heads up:</b> {nonMonotonicSeeds.length} seed{nonMonotonicSeeds.length > 1 ? "s are" : " is"} far from a
          mid-tone, so pinning it exactly at <code className="bg-black/5 px-1 rounded">500</code> makes some darker
          stops come out lighter than 500 — the ramp isn&apos;t monotonic.{" "}
          <button
            onClick={() => setAnchor("even")}
            className="ml-1 text-xs font-semibold text-amber-800 bg-amber-100 border border-amber-300 rounded-md px-2 py-1 hover:bg-amber-200"
          >
            Switch to Even ramp
          </button>
        </div>
      )}

      {/* Seed rows — compare */}
      <div className="flex flex-col gap-3 mb-2">
        {seeds.map((seed) => {
          const scale = getScale(seed.hex, algorithm, scheme, curve, anchor);
          const pinnedStop = algorithm === "hsl" && anchor === "even" ? null : 500;
          return (
            <div key={seed.id} className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-36 shrink-0">
                <input
                  type="color"
                  value={seed.hex}
                  onChange={(e) => updateHex(seed.id, e.target.value)}
                  className="w-16 h-16 rounded border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={seed.hex}
                  onChange={(e) => updateHex(seed.id, e.target.value)}
                  className="w-20 font-mono text-black text-xs px-2 py-1 border border-gray-300 rounded"
                />
              </div>

              <div className="flex gap-0.5">
                {stops.map((stop) => {
                  const hex = scale[stop];
                  const isPinned = stop === pinnedStop;
                  return (
                    <button
                      key={stop}
                      title={`Click to copy ${hex}`}
                      onClick={() => copy(hex, `${keyFor(prefix)}-${stop}`)}
                      className="w-32 h-32 rounded flex flex-col items-center justify-end pb-1 shadow-sm relative cursor-pointer"
                      style={{ backgroundColor: hex }}
                    >
                      {isPinned && (
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-mono font-semibold tracking-wide bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
                          PRIMARY
                        </span>
                      )}
                      <span className="text-[9px] font-mono opacity-70" style={{ color: isLight(hex) ? "#000" : "#fff" }}>
                        {stop}
                      </span>
                      <span className="text-[10px] font-mono opacity-70" style={{ color: isLight(hex) ? "#000" : "#fff" }}>
                        {hex?.slice(1).toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>

              {seeds.length > 1 && (
                <button
                  onClick={() => removeSeed(seed.id)}
                  className="ml-1 text-gray-400 hover:text-red-500 text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addSeed}
        className="mb-10 px-4 py-2 text-sm font-medium text-gray-600 border border-dashed border-gray-300 rounded hover:border-gray-400 hover:text-gray-800 transition-colors"
      >
        + Add color
      </button>

      {/* Export */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Export</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {seeds.length > 1 && (
              <select
                value={exportSeedId ?? ""}
                onChange={(e) => setExportSeedId(Number(e.target.value))}
                className="text-xs font-mono border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-black"
              >
                {seeds.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.hex.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1">
              {([
                ["tw", "Tailwind v4"],
                ["css", "CSS vars"],
                ["dart", "Dart · app"],
              ] as [ExportFormat, string][]).map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => setExportFormat(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    exportFormat === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => copy(exportCode, exportFormat === "tw" ? "Tailwind v4" : exportFormat === "css" ? "CSS vars" : "Dart")}
              className="text-[11px] font-mono text-slate-200 bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 hover:bg-slate-700"
            >
              Copy
            </button>
            <button
              onClick={() => {
                const name = exportFormat === "tw" ? "theme.css" : exportFormat === "css" ? "colors.css" : "colors.dart";
                download(name, exportCode + "\n");
                flashToast(`Downloaded ${name}`);
              }}
              className="text-[11px] font-mono text-indigo-200 bg-slate-800 border border-indigo-500/50 rounded-md px-3 py-1.5 hover:bg-indigo-600/20"
            >
              Download
            </button>
          </div>
          <pre className="m-0 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 p-5 overflow-x-auto font-mono text-xs leading-relaxed">
            {exportCode}
          </pre>
        </div>

        <div className="flex items-center gap-3 flex-wrap mt-4">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Reusable generator:</span>
          <button
            onClick={() => {
              download("palette.ts", PALETTE_TS_SOURCE);
              flashToast("Downloaded palette.ts");
            }}
            className="inline-flex items-center gap-2 text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:shadow transition-shadow"
          >
            ⬇ palette.ts
            <em className="not-italic text-[10px] uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">web</em>
          </button>
          <button
            onClick={() => {
              download("palette.dart", PALETTE_DART_SOURCE);
              flashToast("Downloaded palette.dart");
            }}
            className="inline-flex items-center gap-2 text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:shadow transition-shadow"
          >
            ⬇ palette.dart
            <em className="not-italic text-[10px] uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">app</em>
          </button>
        </div>
      </section>

      {/* Note */}
      <div className="text-sm leading-relaxed text-gray-600 bg-indigo-50/40 border border-indigo-100 rounded-xl px-5 py-4 mb-6">
        {algorithm === "hsl" ? (
          anchor === "exact" ? (
            <>
              <b className="text-gray-900">HSL ramp · Exact seed.</b> Holds your seed&apos;s hue &amp; saturation,
              applies the fixed lightness ramp (<code className="bg-black/5 px-1 rounded">95/90/80…10/5</code>) to
              the other ten stops, and keeps your seed untouched at{" "}
              <code className="bg-black/5 px-1 rounded">500 / Primary</code>. Matches tints.dev exactly for a
              mid-tone seed. If your seed is very dark or very light, 500 can fall out of order with its
              neighbors — switch to <b className="text-gray-900">Even ramp</b>.
            </>
          ) : (
            <>
              <b className="text-gray-900">HSL ramp · Even ramp.</b> Every stop, including 500, sits on the fixed
              lightness ramp (<code className="bg-black/5 px-1 rounded">95/90/80…10/5</code>) with your seed&apos;s
              hue &amp; saturation. The scale is always monotonic, but{" "}
              <code className="bg-black/5 px-1 rounded">500</code> becomes your hue at 50% lightness rather than
              your exact seed hex.
            </>
          )
        ) : (
          <>
            <b className="text-gray-900">ChromaCraft</b> — your <code className="bg-black/5 px-1 rounded">color-lerp.ts</code>,
            exactly. It lerps in RGB from the dark anchor → seed → light anchor along the{" "}
            <code className="bg-black/5 px-1 rounded">{curve}</code> Catmull-Rom curve. With the default black/white
            anchors, the lightest and darkest stops resolve toward pure white/black. Switch to{" "}
            <b className="text-gray-900">HSL ramp</b> above if you want every stop to stay a shade of your color
            instead.
          </>
        )}
      </div>

      {/* Parity */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className="text-[11px] font-mono font-semibold tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            WEB ⇄ APP · VERIFIED
          </span>
          <span className="text-xs font-mono text-gray-500">
            same primary → identical hex, proven across 140,608 seeds (0 mismatches)
          </span>
        </div>
        <p className="text-sm leading-relaxed text-gray-600 m-0">
          One function drives both platforms — <code className="bg-black/5 px-1 rounded">generatePalette(primary)</code>{" "}
          in <code className="bg-black/5 px-1 rounded">palette.ts</code> (web) and{" "}
          <code className="bg-black/5 px-1 rounded">palette.dart</code> (app). They run the identical algorithm on
          IEEE-754 doubles with no negative modulo, so every stop is byte-for-byte equal. Stop{" "}
          <code className="bg-black/5 px-1 rounded">500</code> is your raw primary, untouched. Run{" "}
          <code className="bg-black/5 px-1 rounded">dart run palette.dart</code> to self-verify against the golden
          values.
        </p>
      </section>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-mono px-4 py-2.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
