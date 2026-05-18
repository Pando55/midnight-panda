import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Plus, Trash2, TrendingUp, TrendingDown, Target, Percent, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface JournalEntry {
  id: string;
  date: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  exit: number;
  pips: number;
  rr: number;
  outcome: 'WIN' | 'LOSS' | 'BE';
  notes: string;
}

const STORAGE_KEY = 'mp_journal_entries_v1';

function load(): JournalEntry[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function save(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    pair: 'XAUUSD', direction: 'BUY' as 'BUY' | 'SELL',
    entry: '', exit: '', pips: '', rr: '', outcome: 'WIN' as 'WIN' | 'LOSS' | 'BE', notes: '',
  });

  useEffect(() => { setEntries(load()); }, []);

  const stats = useMemo(() => {
    const total = entries.length;
    const wins = entries.filter(e => e.outcome === 'WIN').length;
    const losses = entries.filter(e => e.outcome === 'LOSS').length;
    const winRate = total ? Math.round((wins / total) * 100) : 0;
    const totalPips = entries.reduce((s, e) => s + (Number(e.pips) || 0), 0);
    const avgRR = total ? (entries.reduce((s, e) => s + (Number(e.rr) || 0), 0) / total).toFixed(2) : '0.00';
    return { total, wins, losses, winRate, totalPips, avgRR };
  }, [entries]);

  const addEntry = () => {
    const entry: JournalEntry = {
      id: 'j_' + Date.now(),
      date: new Date().toISOString(),
      pair: form.pair.toUpperCase(),
      direction: form.direction,
      entry: Number(form.entry) || 0,
      exit: Number(form.exit) || 0,
      pips: Number(form.pips) || 0,
      rr: Number(form.rr) || 0,
      outcome: form.outcome,
      notes: form.notes,
    };
    const next = [entry, ...entries];
    setEntries(next); save(next);
    setForm({ pair: 'XAUUSD', direction: 'BUY', entry: '', exit: '', pips: '', rr: '', outcome: 'WIN', notes: '' });
    setShowForm(false);
  };

  const remove = (id: string) => {
    const next = entries.filter(e => e.id !== id);
    setEntries(next); save(next);
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-trading-orange" /> Trade Journal
        </h1>
        <Button onClick={() => setShowForm(s => !s)} className="bg-trading-orange hover:opacity-90 text-foreground h-9 px-3">
          <Plus className="w-4 h-4 mr-1" /> Log Trade
        </Button>
      </header>

      <div className="px-4 py-5 space-y-5">
        {/* Performance Dashboard */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Win Rate" value={`${stats.winRate}%`} icon={Percent} color="text-trading-green" />
          <StatCard label="Total Pips" value={stats.totalPips > 0 ? `+${stats.totalPips}` : `${stats.totalPips}`} icon={Activity} color={stats.totalPips >= 0 ? 'text-trading-green' : 'text-trading-red'} />
          <StatCard label="Avg R:R" value={stats.avgRR} icon={Target} color="text-trading-orange" />
          <StatCard label="Trades" value={`${stats.total}`} icon={BookOpen} color="text-cyan-400" sub={`${stats.wins}W · ${stats.losses}L`} />
        </section>

        {showForm && (
          <section className="glass-card rounded-xl p-4 space-y-3 animate-slide-up">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pair" value={form.pair} onChange={v => setForm({ ...form, pair: v })} />
              <SelectField label="Direction" value={form.direction} options={['BUY', 'SELL']} onChange={v => setForm({ ...form, direction: v as 'BUY' | 'SELL' })} />
              <Field label="Entry" value={form.entry} onChange={v => setForm({ ...form, entry: v })} type="number" />
              <Field label="Exit" value={form.exit} onChange={v => setForm({ ...form, exit: v })} type="number" />
              <Field label="Pips" value={form.pips} onChange={v => setForm({ ...form, pips: v })} type="number" />
              <Field label="R:R" value={form.rr} onChange={v => setForm({ ...form, rr: v })} type="number" />
              <SelectField label="Outcome" value={form.outcome} options={['WIN', 'LOSS', 'BE']} onChange={v => setForm({ ...form, outcome: v as 'WIN' | 'LOSS' | 'BE' })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="What was the setup? What did you learn?"
                className="w-full mt-1 rounded-md bg-background border border-border p-2 text-sm text-foreground"
              />
            </div>
            <Button onClick={addEntry} className="w-full bg-trading-orange hover:opacity-90 text-foreground">Save Trade</Button>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Entries</h3>
          {entries.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">
              No trades logged yet. Tap <span className="text-trading-orange">Log Trade</span> to start tracking your edge.
            </div>
          ) : entries.map(e => (
            <div key={e.id} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn('px-2 py-0.5 text-xs font-bold rounded', e.direction === 'BUY' ? 'bg-trading-green/20 text-trading-green' : 'bg-trading-red/20 text-trading-red')}>
                    {e.direction === 'BUY' ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                    {e.direction}
                  </span>
                  <span className="font-semibold text-foreground">{e.pair}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded border',
                    e.outcome === 'WIN' ? 'border-trading-green/40 text-trading-green' :
                    e.outcome === 'LOSS' ? 'border-trading-red/40 text-trading-red' :
                    'border-muted text-muted-foreground'
                  )}>{e.outcome}</span>
                </div>
                <button onClick={() => remove(e.id)} className="text-muted-foreground hover:text-trading-red">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <Cell label="Entry" value={e.entry} />
                <Cell label="Exit" value={e.exit} />
                <Cell label="Pips" value={e.pips > 0 ? `+${e.pips}` : e.pips} color={e.pips >= 0 ? 'text-trading-green' : 'text-trading-red'} />
                <Cell label="R:R" value={e.rr} />
              </div>
              {e.notes && <p className="mt-3 text-xs text-muted-foreground italic">{e.notes}</p>}
              <p className="text-[10px] text-muted-foreground mt-2">{new Date(e.date).toLocaleString()}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: any; color: string; sub?: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <Icon className={cn('w-4 h-4 mb-2', color)} />
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} type={type} className="mt-1 bg-background border-border text-foreground" />
    </div>
  );
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full mt-1 h-10 rounded-md bg-background border border-border px-3 text-sm text-foreground">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Cell({ label, value, color = 'text-foreground' }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className={cn('font-mono font-semibold', color)}>{value}</p>
    </div>
  );
}
