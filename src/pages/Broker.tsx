import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  Cable, Copy, Download, Loader2, Play, ShieldAlert, Square, ScanLine, Send, Unlink, KeyRound,
} from 'lucide-react';
import { useCopy } from '@/hooks/useCopy';

interface Account {
  id: string; broker: string; platform: string; account_number: string; server: string;
  is_demo: boolean; currency: string; balance: number; equity: number;
  selected_symbol: string; selected_timeframe: string; stopped: boolean;
  last_sync_at: string | null; paired_at: string | null; connected: boolean;
  max_risk_percent: number; max_exposure_lots: number; daily_loss_percent: number;
  authorization_expires_at: string | null; live_enabled: boolean;
}
interface RequestRow {
  id: string; kind: string; mode: string; status: string; created_at: string;
  payload: { orders?: number; lot?: number }; result: { filled?: number; requested?: number };
}
interface ScanResult {
  scan_id: string; outcome: string; symbol: string; timeframe: string;
  reasons?: string[]; missing?: string[];
  setup?: { direction: 'BUY' | 'SELL'; entry: number; sl: number; tp: number; rr: number } | null;
}

async function bridge(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('terminal-bridge', {
    body,
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
  });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function Broker() {
  const { license } = useAuth();
  const { copy } = useCopy();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Pair form
  const [broker, setBroker] = useState('Exness');
  const [platform, setPlatform] = useState<'MT4' | 'MT5'>('MT5');
  const [accountNumber, setAccountNumber] = useState('');
  const [server, setServer] = useState('');
  const [pairCode, setPairCode] = useState<string | null>(null);

  // Trade form
  const [lot, setLot] = useState('0.01');
  const [orders, setOrders] = useState('1');
  const [trailing, setTrailing] = useState('0');
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [authKey, setAuthKey] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await bridge({ action: 'status' });
      setAccounts(data.accounts || []);
      setRequests(data.requests || []);
    } catch { /* keep last known state */ }
  }, []);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [refresh]);

  const run = async (fn: () => Promise<void>) => {
    setError(null); setBusy(true);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setBusy(false); }
  };

  const startPair = () => run(async () => {
    const data = await bridge({ action: 'pair_start', broker, platform, account_number: accountNumber, server });
    setPairCode(data.code);
  });

  const doScan = (accountId: string) => run(async () => {
    setScanning(true);
    try { setScan(await bridge({ action: 'scan', account_id: accountId })); }
    finally { setScanning(false); }
  });

  const doExecute = (accountId: string) => run(async () => {
    if (!scan) return;
    await bridge({
      action: 'execute', account_id: accountId, scan_id: scan.scan_id,
      lot: Number(lot), orders: Number(orders), trailing_stop_pips: Number(trailing),
      mode: 'manual', idempotency_key: crypto.randomUUID(),
    });
    setScan(null);
    await refresh();
  });

  const account = accounts[0];

  return (
    <div className="min-h-screen pb-24 bg-background px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-trading-orange/15 border border-trading-orange/40 flex items-center justify-center">
          <Cable className="w-5 h-5 text-trading-orange" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Broker Connection</h1>
          <p className="text-xs text-muted-foreground">Direct MT4/MT5 bridge — no MetaAPI, no copier</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground flex gap-2">
        <ShieldAlert className="w-4 h-4 text-trading-orange shrink-0 mt-0.5" />
        <span>Demo accounts only for now. Scanning a chart or entering a license never places a trade — only the Execute button does, and only while your terminal is connected. Live trading unlocks after demo verification.</span>
      </div>

      {error && <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {!account && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-foreground">Pair your trading account</h2>
          <div className="grid grid-cols-2 gap-2">
            <select value={broker} onChange={(e) => setBroker(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground">
              <option>Exness</option><option>XM</option><option>Other</option>
            </select>
            <select value={platform} onChange={(e) => setPlatform(e.target.value as 'MT4' | 'MT5')} className="rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground">
              <option>MT5</option><option>MT4</option>
            </select>
          </div>
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number" inputMode="numeric" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground" />
          <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="Server (e.g. Exness-MT5Trial9)" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground" />
          <button onClick={startPair} disabled={busy || !accountNumber || !server} className="w-full rounded-xl bg-trading-orange text-foreground font-semibold py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Get pairing code
          </button>

          {pairCode && (
            <div className="rounded-xl border border-trading-orange/40 bg-trading-orange/10 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Enter this code in the EA within 10 minutes:</p>
              <p className="text-2xl font-bold tracking-[0.3em] text-trading-orange">{pairCode}</p>
              <button onClick={() => copy(pairCode)} className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1.5 pt-1">
            <p className="font-semibold text-foreground">Setup on your computer or VPS:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Download the bridge EA below and copy it into MQL4/Experts or MQL5/Experts.</li>
              <li>In MetaTrader: Tools → Options → Expert Advisors → allow WebRequest for <span className="text-foreground">https://jjksgqkkiliknfwthsed.supabase.co</span></li>
              <li>Attach the EA to your chart, paste the pairing code, enable Algo Trading.</li>
              <li>Copy the account ID and token from the Experts log into the EA inputs and re-attach.</li>
            </ol>
            <div className="flex gap-2 pt-1">
              <a href="/ea/MidnightPandaBridge.mq5" download className="flex-1 rounded-lg border border-border py-2 text-center text-foreground text-xs font-medium flex items-center justify-center gap-1"><Download className="w-3 h-3" /> MT5 EA</a>
              <a href="/ea/MidnightPandaBridge.mq4" download className="flex-1 rounded-lg border border-border py-2 text-center text-foreground text-xs font-medium flex items-center justify-center gap-1"><Download className="w-3 h-3" /> MT4 EA</a>
            </div>
          </div>
        </div>
      )}

      {account && (
        <>
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{account.broker} {account.platform} · {account.account_number}</p>
                <p className="text-xs text-muted-foreground">{account.server}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${account.connected ? 'bg-green-500/15 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                {account.connected ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="rounded-lg bg-background p-2"><p className="text-[10px] text-muted-foreground">Balance</p><p className="text-sm font-semibold text-foreground">{account.balance.toFixed(2)} {account.currency}</p></div>
              <div className="rounded-lg bg-background p-2"><p className="text-[10px] text-muted-foreground">Equity</p><p className="text-sm font-semibold text-foreground">{account.equity.toFixed(2)}</p></div>
              <div className="rounded-lg bg-background p-2"><p className="text-[10px] text-muted-foreground">Mode</p><p className={`text-sm font-semibold ${account.is_demo ? 'text-green-400' : 'text-trading-orange'}`}>{account.is_demo ? 'DEMO' : 'LIVE 🔒'}</p></div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Chart: <span className="text-foreground">{account.selected_symbol || '—'} · {account.selected_timeframe}</span></p>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <label className="text-[10px] text-muted-foreground">Risk %<input type="number" step="0.1" defaultValue={account.max_risk_percent} onBlur={(e) => bridge({ action: 'set_risk', account_id: account.id, max_risk_percent: Number(e.target.value) }).catch(() => {})} className="mt-0.5 w-full rounded-lg bg-background border border-border px-2 py-1.5 text-sm text-foreground" /></label>
              <label className="text-[10px] text-muted-foreground">Max lots<input type="number" step="0.01" defaultValue={account.max_exposure_lots} onBlur={(e) => bridge({ action: 'set_risk', account_id: account.id, max_exposure_lots: Number(e.target.value) }).catch(() => {})} className="mt-0.5 w-full rounded-lg bg-background border border-border px-2 py-1.5 text-sm text-foreground" /></label>
              <label className="text-[10px] text-muted-foreground">Daily loss %<input type="number" step="0.5" defaultValue={account.daily_loss_percent} onBlur={(e) => bridge({ action: 'set_risk', account_id: account.id, daily_loss_percent: Number(e.target.value) }).catch(() => {})} className="mt-0.5 w-full rounded-lg bg-background border border-border px-2 py-1.5 text-sm text-foreground" /></label>
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={() => run(async () => { await bridge({ action: account.stopped ? 'resume' : 'stop', account_id: account.id }); await refresh(); })} className={`flex-1 rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5 ${account.stopped ? 'bg-green-600 text-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                {account.stopped ? <><Play className="w-4 h-4" /> Resume</> : <><Square className="w-4 h-4" /> Stop trading</>}
              </button>
              <button onClick={() => run(async () => { await bridge({ action: 'unpair', account_id: account.id }); setAccounts([]); })} className="rounded-xl border border-border px-3 text-muted-foreground" title="Unpair"><Unlink className="w-4 h-4" /></button>
            </div>

            {license && (
              <div className="mt-3 rounded-xl border border-border bg-background p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Authorize auto-execution for 12h by re-entering your active license key:</p>
                <div className="flex gap-2">
                  <input value={authKey} onChange={(e) => setAuthKey(e.target.value)} placeholder="P-XXXX-XXXX-XXXX" className="flex-1 rounded-lg bg-card border border-border px-2 py-1.5 text-xs text-foreground" />
                  <button onClick={() => run(async () => { await bridge({ action: 'authorize', account_id: account.id, license_key: authKey }); setAuthKey(''); })} className="rounded-lg bg-trading-orange px-3 text-xs font-semibold text-foreground">Authorize</button>
                </div>
                {account.authorization_expires_at && new Date(account.authorization_expires_at) > new Date() && (
                  <p className="text-[10px] text-green-400 mt-1">Authorized until {new Date(account.authorization_expires_at).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-foreground">Broker scan</h2>
              <button onClick={() => doScan(account.id)} disabled={busy || scanning || !account.connected} className="rounded-xl bg-trading-orange text-foreground text-sm font-semibold px-4 py-2 disabled:opacity-50 flex items-center gap-1.5">
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />} Scan {account.selected_timeframe}
              </button>
            </div>
            {!account.connected && <p className="text-xs text-muted-foreground">Terminal offline — open MetaTrader with the bridge EA attached.</p>}

            {scan && (
              <div className="mt-2 space-y-2">
                <p className={`text-sm font-bold ${scan.outcome === 'VALID_SETUP' ? 'text-green-400' : scan.outcome === 'WAIT_CONFIRMATION' ? 'text-trading-orange' : 'text-muted-foreground'}`}>
                  {scan.outcome === 'VALID_SETUP' ? `${scan.setup?.direction} setup on ${scan.symbol}` : scan.outcome === 'WAIT_CONFIRMATION' ? 'Waiting for confirmation' : 'No trade'}
                </p>
                {scan.reasons?.map((r, i) => <p key={i} className="text-xs text-muted-foreground">• {r}</p>)}
                {scan.missing?.map((m, i) => <p key={i} className="text-xs text-trading-orange">⚠ {m}</p>)}
                {scan.setup && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-background p-2"><p className="text-[10px] text-muted-foreground">Entry</p><p className="text-sm font-semibold text-foreground">{scan.setup.entry}</p></div>
                    <div className="rounded-lg bg-background p-2"><p className="text-[10px] text-muted-foreground">SL</p><p className="text-sm font-semibold text-destructive">{scan.setup.sl}</p></div>
                    <div className="rounded-lg bg-background p-2"><p className="text-[10px] text-muted-foreground">TP</p><p className="text-sm font-semibold text-green-400">{scan.setup.tp}</p></div>
                  </div>
                )}
                {scan.outcome === 'VALID_SETUP' && (
                  <div className="pt-1 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <label className="text-[10px] text-muted-foreground">Lot size<input value={lot} onChange={(e) => setLot(e.target.value)} inputMode="decimal" className="mt-0.5 w-full rounded-lg bg-background border border-border px-2 py-1.5 text-sm text-foreground" /></label>
                      <label className="text-[10px] text-muted-foreground">Positions<input value={orders} onChange={(e) => setOrders(e.target.value)} inputMode="numeric" className="mt-0.5 w-full rounded-lg bg-background border border-border px-2 py-1.5 text-sm text-foreground" /></label>
                      <label className="text-[10px] text-muted-foreground">Trail (pips)<input value={trailing} onChange={(e) => setTrailing(e.target.value)} inputMode="numeric" className="mt-0.5 w-full rounded-lg bg-background border border-border px-2 py-1.5 text-sm text-foreground" /></label>
                    </div>
                    <button onClick={() => doExecute(account.id)} disabled={busy || account.stopped} className="w-full rounded-xl bg-green-600 text-foreground font-semibold py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" /> Execute on {account.platform} (demo)
                    </button>
                    {account.stopped && <p className="text-[10px] text-trading-orange">Trading is stopped — tap Resume above first.</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {requests.length > 0 && (
            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <h2 className="font-semibold text-foreground mb-2">Recent executions</h2>
              <div className="space-y-1.5">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs rounded-lg bg-background px-3 py-2">
                    <span className="text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()} · {r.payload.orders ?? 1}× {r.payload.lot ?? '?'} lots</span>
                    <span className={`font-semibold ${r.status === 'filled' ? 'text-green-400' : r.status === 'rejected' || r.status === 'expired' ? 'text-destructive' : 'text-trading-orange'}`}>
                      {r.status}{r.result.filled != null ? ` (${r.result.filled}/${r.result.requested ?? r.payload.orders ?? 1})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
