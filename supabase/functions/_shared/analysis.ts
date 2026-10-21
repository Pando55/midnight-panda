// Deterministic, timeframe-local technical analysis on broker candles.
// Every drawing is anchored to candle time (unix seconds) and price.
export type Bar = { t: number; o: number; h: number; l: number; c: number };
export type Drawing =
  | { kind: "level"; role: "support" | "resistance"; price: number; t1: number; t2: number; touches: number; stage: number }
  | { kind: "trendline"; dir: "up" | "down"; t1: number; p1: number; t2: number; p2: number; stage: number }
  | { kind: "swing"; label: "HH" | "HL" | "LH" | "LL"; t: number; price: number; stage: number }
  | { kind: "event"; label: string; t: number; price: number; stage: number }
  | { kind: "zone"; label: "entry" | "stop" | "target"; price: number; t1: number; stage: number };

export const STAGES = [
  "Reading candles",
  "Finding support and resistance",
  "Mapping market structure",
  "Drawing trendlines",
  "Checking patterns",
  "Checking entry conditions",
];

function atr(b: Bar[], n = 14) {
  const tr = b.slice(1).map((x, i) => Math.max(x.h - x.l, Math.abs(x.h - b[i].c), Math.abs(x.l - b[i].c)));
  const s = tr.slice(-n);
  return s.reduce((a, v) => a + v, 0) / Math.max(1, s.length);
}

function pivots(b: Bar[], k = 3) {
  const hi: number[] = [], lo: number[] = [];
  for (let i = k; i < b.length - k; i++) {
    let isH = true, isL = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      if (b[j].h >= b[i].h) isH = false;
      if (b[j].l <= b[i].l) isL = false;
    }
    if (isH) hi.push(i);
    if (isL) lo.push(i);
  }
  return { hi, lo };
}

export function analyze(bars: Bar[], symbol: string, timeframe: string, opts: { minRR?: number; digits?: number } = {}) {
  const minRR = opts.minRR ?? 1.5;
  const drawings: Drawing[] = [];
  if (bars.length < 60) {
    return { outcome: "INSUFFICIENT_DATA", symbol, timeframe, drawings, reasons: [`Only ${bars.length} ${timeframe} candles received; 60+ required.`], missing: ["More candle history from the terminal"], setup: null };
  }
  const b = bars.slice(-300);
  const a = atr(b);
  const last = b[b.length - 1];
  const { hi, lo } = pivots(b);

  // Stage 1: S/R clusters from pivots
  const raw = [...hi.map((i) => ({ p: b[i].h, i, r: "resistance" as const })), ...lo.map((i) => ({ p: b[i].l, i, r: "support" as const }))];
  const clusters: { price: number; touches: number; first: number }[] = [];
  for (const x of raw.sort((m, n) => m.p - n.p)) {
    const c = clusters.find((c) => Math.abs(c.price - x.p) <= a * 0.6);
    if (c) { c.price = (c.price * c.touches + x.p) / (c.touches + 1); c.touches++; c.first = Math.min(c.first, x.i); }
    else clusters.push({ price: x.p, touches: 1, first: x.i });
  }
  const strong = clusters.filter((c) => c.touches >= 2).sort((m, n) => n.touches - m.touches).slice(0, 6);
  for (const c of strong) drawings.push({ kind: "level", role: c.price > last.c ? "resistance" : "support", price: c.price, t1: b[c.first].t, t2: last.t, touches: c.touches, stage: 1 });

  // Stage 2: structure
  const swings = [...hi.map((i) => ({ i, h: true })), ...lo.map((i) => ({ i, h: false }))].sort((m, n) => m.i - n.i);
  let lastH: number | null = null, lastL: number | null = null;
  const labels: string[] = [];
  for (const s of swings.slice(-10)) {
    if (s.h) {
      const p = b[s.i].h; const lab = lastH === null ? null : p > lastH ? "HH" : "LH";
      if (lab) { drawings.push({ kind: "swing", label: lab as any, t: b[s.i].t, price: p, stage: 2 }); labels.push(lab); }
      lastH = p;
    } else {
      const p = b[s.i].l; const lab = lastL === null ? null : p > lastL ? "HL" : "LL";
      if (lab) { drawings.push({ kind: "swing", label: lab as any, t: b[s.i].t, price: p, stage: 2 }); labels.push(lab); }
      lastL = p;
    }
  }
  const recent = labels.slice(-4);
  const bull = recent.filter((x) => x === "HH" || x === "HL").length;
  const bear = recent.filter((x) => x === "LH" || x === "LL").length;
  const trend = bull >= 3 ? "uptrend" : bear >= 3 ? "downtrend" : "range";
  // BOS: last close beyond most recent swing
  const lastHiI = hi[hi.length - 1], lastLoI = lo[lo.length - 1];
  let bos: "bullish" | "bearish" | null = null;
  if (lastHiI !== undefined && b.slice(lastHiI + 1).some((x) => x.c > b[lastHiI].h)) bos = "bullish";
  if (lastLoI !== undefined && b.slice(lastLoI + 1).some((x) => x.c < b[lastLoI].l) && (lastLoI > (lastHiI ?? -1) || !bos)) bos = "bearish";
  if (bos) {
    const i = bos === "bullish" ? lastHiI : lastLoI;
    drawings.push({ kind: "event", label: `BOS ${bos}`, t: b[i].t, price: bos === "bullish" ? b[i].h : b[i].l, stage: 2 });
  }

  // Stage 3: trendline through last two pivots in trend direction
  if (trend === "uptrend" && lo.length >= 2) {
    const [i1, i2] = lo.slice(-2);
    drawings.push({ kind: "trendline", dir: "up", t1: b[i1].t, p1: b[i1].l, t2: b[i2].t, p2: b[i2].l, stage: 3 });
  } else if (trend === "downtrend" && hi.length >= 2) {
    const [i1, i2] = hi.slice(-2);
    drawings.push({ kind: "trendline", dir: "down", t1: b[i1].t, p1: b[i1].h, t2: b[i2].t, p2: b[i2].h, stage: 3 });
  }

  // Stage 4: patterns (double top/bottom, engulfing on last candle)
  const patterns: string[] = [];
  if (hi.length >= 2 && Math.abs(b[hi[hi.length - 1]].h - b[hi[hi.length - 2]].h) < a * 0.3) patterns.push("Double top");
  if (lo.length >= 2 && Math.abs(b[lo[lo.length - 1]].l - b[lo[lo.length - 2]].l) < a * 0.3) patterns.push("Double bottom");
  const p2 = b[b.length - 2];
  if (last.c > last.o && p2.c < p2.o && last.c > p2.o && last.o < p2.c) patterns.push("Bullish engulfing");
  if (last.c < last.o && p2.c > p2.o && last.c < p2.o && last.o > p2.c) patterns.push("Bearish engulfing");
  for (const p of patterns) drawings.push({ kind: "event", label: p, t: last.t, price: p.includes("top") || p.includes("Bear") ? last.h : last.l, stage: 4 });

  // Stage 5: entry conditions on this timeframe only
  const supports = strong.filter((c) => c.price < last.c).sort((m, n) => n.price - m.price);
  const resist = strong.filter((c) => c.price > last.c).sort((m, n) => m.price - n.price);
  const reasons: string[] = [`${timeframe} structure: ${trend} (${recent.join(", ") || "no clear swings"}).`];
  if (bos) reasons.push(`Last structural event: ${bos} break of structure.`);
  const missing: string[] = [];
  let setup: null | { direction: "BUY" | "SELL"; entry: number; sl: number; tp: number; rr: number } = null;

  const tryBuy = trend !== "downtrend" && supports[0] && (last.c - supports[0].price) <= a * 1.2;
  const trySell = trend !== "uptrend" && resist[0] && (resist[0].price - last.c) <= a * 1.2;
  if (tryBuy) {
    const sl = supports[0].price - a * 0.5;
    const tp = resist[0] ? resist[0].price - a * 0.2 : last.c + (last.c - sl) * 2;
    const rr = (tp - last.c) / (last.c - sl);
    reasons.push(`Price is reacting near ${timeframe} support ${supports[0].price.toFixed(opts.digits ?? 5)} (${supports[0].touches} touches).`);
    if (rr >= minRR) setup = { direction: "BUY", entry: last.c, sl, tp, rr };
    else missing.push(`Reward-to-risk to next resistance is 1:${rr.toFixed(2)}, below 1:${minRR}.`);
  } else if (trySell) {
    const sl = resist[0].price + a * 0.5;
    const tp = supports[0] ? supports[0].price + a * 0.2 : last.c - (sl - last.c) * 2;
    const rr = (last.c - tp) / (sl - last.c);
    reasons.push(`Price is reacting near ${timeframe} resistance ${resist[0].price.toFixed(opts.digits ?? 5)} (${resist[0].touches} touches).`);
    if (rr >= minRR) setup = { direction: "SELL", entry: last.c, sl, tp, rr };
    else missing.push(`Reward-to-risk to next support is 1:${rr.toFixed(2)}, below 1:${minRR}.`);
  } else {
    missing.push(trend === "range"
      ? `Price is mid-range on ${timeframe}; wait for a test of support or resistance.`
      : `Price is not near a ${timeframe} level aligned with the ${trend}; wait for a pullback to a level.`);
  }
  if (setup) {
    const confirm = setup.direction === "BUY" ? last.c > last.o || patterns.includes("Bullish engulfing") : last.c < last.o || patterns.includes("Bearish engulfing");
    if (!confirm) {
      missing.push(`Last ${timeframe} candle has not confirmed the ${setup.direction.toLowerCase()} reaction yet.`);
      for (const [label, price] of [["entry", setup.entry], ["stop", setup.sl], ["target", setup.tp]] as const) drawings.push({ kind: "zone", label, price, t1: last.t, stage: 5 });
      return { outcome: "WAIT_CONFIRMATION", symbol, timeframe, trend, patterns, drawings, reasons, missing, setup };
    }
    for (const [label, price] of [["entry", setup.entry], ["stop", setup.sl], ["target", setup.tp]] as const) drawings.push({ kind: "zone", label, price, t1: last.t, stage: 5 });
    reasons.push(`Candle confirmation present; SL beyond the level, TP before the next opposing level (1:${setup.rr.toFixed(2)}).`);
    return { outcome: "VALID_SETUP", symbol, timeframe, trend, patterns, drawings, reasons, missing, setup };
  }
  return { outcome: "NO_TRADE", symbol, timeframe, trend, patterns, drawings, reasons, missing, setup: null };
}
