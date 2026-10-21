export const TF_SECONDS: Record<string, number> = { M1:60, M5:300, M15:900, M30:1800, H1:3600, H4:14400, D1:86400, W1:604800 };
export function validateTrade(body: Record<string, unknown>) {
  if (!Number.isInteger(body.orders) || Number(body.orders)<1 || Number(body.orders)>5) return 'Order count must be a whole number from 1 to 5';
  if (typeof body.lot !== 'number' || !Number.isFinite(body.lot) || body.lot<=0 || body.lot>50) return 'Lot size must be positive and at most 50';
  if (typeof body.trailing_stop_pips !== 'number' || !Number.isFinite(body.trailing_stop_pips) || body.trailing_stop_pips<0 || body.trailing_stop_pips>10000) return 'Trailing distance must be between 0 and 10000 pips';
  if (!['manual','auto'].includes(String(body.mode))) return 'Select manual or auto execution';
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(String(body.idempotency_key))) return 'A valid request identifier is required';
  return null;
}
export function candleIssue(candles: unknown, timeframe: string, now: number) {
  if (!TF_SECONDS[timeframe]) return 'Unsupported timeframe';
  if (!Array.isArray(candles) || candles.length<60) return 'At least 60 closed broker candles are required';
  let prev=0;
  for (const b of candles) {
    if (!b || !['t','o','h','l','c'].every(k => typeof b[k]==='number' && Number.isFinite(b[k])) || b.t<=prev || b.o<=0 || b.c<=0 || b.l<=0 || b.h<Math.max(b.o,b.c,b.l) || b.l>Math.min(b.o,b.c) || b.t>now+TF_SECONDS[timeframe]) return 'Invalid or unordered broker candles';
    prev=b.t;
  }
  if (now-prev>TF_SECONDS[timeframe]*2+30) return 'Broker candles are stale; wait for fresh market data';
  return null;
}
