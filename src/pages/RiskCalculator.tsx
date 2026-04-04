import { useState, useMemo } from 'react';
import { Calculator, DollarSign, Percent, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { calculatePositionSize } from '@/lib/data';

export default function RiskCalculator() {
  const [accountBalance, setAccountBalance] = useState('10000');
  const [riskPercent, setRiskPercent] = useState('2');
  const [stopLossPips, setStopLossPips] = useState('50');
  const [selectedPair, setSelectedPair] = useState('EUR/USD');

  const result = useMemo(() => {
    const balance = parseFloat(accountBalance) || 0;
    const risk = parseFloat(riskPercent) || 0;
    const sl = parseFloat(stopLossPips) || 0;
    if (balance <= 0 || risk <= 0 || sl <= 0) return null;
    return calculatePositionSize(balance, risk, sl);
  }, [accountBalance, riskPercent, stopLossPips]);

  const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTC/USD'];

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground">Risk Calculator</h1>
          <p className="text-sm text-muted-foreground">Position size & risk management</p>
        </div>
      </header>
      <div className="px-4 py-6 space-y-6">
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" /> Account Balance</Label>
            <Input type="number" value={accountBalance} onChange={(e) => setAccountBalance(e.target.value)}
              className="bg-background border-border text-foreground focus:border-trading-orange" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2"><Percent className="w-4 h-4" /> Risk %</Label>
            <Input type="number" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} step="0.5"
              className="bg-background border-border text-foreground focus:border-trading-orange" />
            <div className="flex gap-2">
              {[0.5, 1, 2, 3, 5].map(v => (
                <button key={v} onClick={() => setRiskPercent(v.toString())}
                  className={cn('px-3 py-1 rounded-lg text-xs transition-colors',
                    parseFloat(riskPercent) === v ? 'bg-trading-orange text-foreground' : 'glass-card text-muted-foreground')}>{v}%</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2"><Target className="w-4 h-4" /> Stop Loss (pips)</Label>
            <Input type="number" value={stopLossPips} onChange={(e) => setStopLossPips(e.target.value)}
              className="bg-background border-border text-foreground focus:border-trading-orange" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Trading Pair</Label>
            <div className="flex gap-2 flex-wrap">
              {pairs.map(p => (
                <button key={p} onClick={() => setSelectedPair(p)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    selectedPair === p ? 'bg-trading-orange text-foreground' : 'glass-card text-muted-foreground')}>{p}</button>
              ))}
            </div>
          </div>
        </div>
        {result && (
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Results
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-background/50 rounded-xl">
                <p className="text-2xl font-bold text-trading-orange">{result.lotSize}</p>
                <p className="text-xs text-muted-foreground mt-1">Lot Size</p>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-xl">
                <p className="text-2xl font-bold text-trading-red">${result.riskAmount}</p>
                <p className="text-xs text-muted-foreground mt-1">Risk Amount</p>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-xl">
                <p className="text-2xl font-bold text-foreground">{result.units.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Units</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
