import { useState } from 'react';
import { Search, Filter, Copy, Check, Lock, AlertCircle, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCopy } from '@/hooks/useCopy';
import { sampleSignals, categoryColors, formatPrice, calculateRiskReward } from '@/lib/data';
import { cn, timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SendToBrokerDialog from '@/components/SendToBrokerDialog';
import type { TradingSignal, AssetCategory } from '@/types';

interface SignalsProps { onNavigate: (page: string) => void; }

export default function Signals({ onNavigate }: SignalsProps) {
  const { checkLicenseValidity } = useAuth();
  const hasValidLicense = checkLicenseValidity();
  const { copied, copy } = useCopy();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'ALL'>('ALL');
  const [brokerSignal, setBrokerSignal] = useState<TradingSignal | null>(null);

  const filteredSignals = sampleSignals.filter(signal => {
    const matchesSearch = signal.asset.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || signal.category === selectedCategory;
    const matchesStatus = activeTab === 'active' ? signal.status === 'ACTIVE' : signal.status !== 'ACTIVE';
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories: AssetCategory[] = ['FOREX', 'COMMODITIES', 'METALS', 'INDICES', 'CRYPTO'];

  if (!hasValidLicense) {
    return (
      <div className="min-h-screen pb-24 bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="px-4 py-4"><h1 className="text-xl font-semibold text-foreground">Trading Signals</h1></div>
        </header>
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="w-20 h-20 rounded-full bg-trading-orange/10 flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-trading-orange" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">License Required</h2>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">Activate your license to access premium trading signals.</p>
          <Button onClick={() => onNavigate('profile')} className="btn-primary">Activate License</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground">Trading Signals</h1>
          <p className="text-sm text-muted-foreground">AI-powered trade setups</p>
        </div>
      </header>
      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-2">
          {(['active', 'history'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all',
                activeTab === tab ? 'bg-trading-orange text-foreground shadow-glow' : 'glass-card text-muted-foreground')}>
              {tab === 'active' ? 'Active Signals' : 'History'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search pairs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border text-foreground" />
          </div>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as AssetCategory | 'ALL')}
            className="appearance-none bg-card border border-border text-foreground px-4 py-2 pr-10 rounded-lg text-sm focus:outline-none focus:border-trading-orange">
            <option value="ALL">All</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          {filteredSignals.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-semibold mb-2">No signals found</p>
            </div>
          ) : (
            filteredSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onCopy={copy}
                copied={copied}
                onSendToBroker={() => setBrokerSignal(signal)}
              />
            ))
          )}
        </div>
      </div>
      <SendToBrokerDialog
        signal={brokerSignal}
        open={!!brokerSignal}
        onOpenChange={(o) => !o && setBrokerSignal(null)}
      />
    </div>
  );
}

function SignalCard({ signal, onCopy, copied, onSendToBroker }: { signal: TradingSignal; onCopy: (t: string) => void; copied: boolean; onSendToBroker: () => void }) {
  const rr = calculateRiskReward(signal.entryPrice, signal.stopLoss, signal.takeProfit, signal.direction);
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-trading-orange/20 text-trading-orange border-trading-orange/30',
    HIT_TP: 'bg-trading-green/20 text-trading-green border-trading-green/30',
    HIT_SL: 'bg-trading-red/20 text-trading-red border-trading-red/30',
    EXPIRED: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="glass-card rounded-xl p-4 card-hover">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-1 text-xs font-bold rounded', signal.direction === 'BUY' ? 'badge-buy' : 'badge-sell')}>{signal.direction}</span>
          <span className="font-semibold text-foreground">{signal.asset}</span>
          <span className={cn('px-2 py-0.5 text-[10px] rounded border', categoryColors[signal.category])}>{signal.category}</span>
        </div>
        <span className={cn('px-2 py-0.5 text-[10px] rounded border', statusColors[signal.status])}>{signal.status}</span>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-2">
        {[
          { l: 'Entry', v: formatPrice(signal.entryPrice, signal.category), c: 'text-foreground' },
          { l: 'SL', v: formatPrice(signal.stopLoss, signal.category), c: 'text-trading-red' },
          { l: 'TP', v: formatPrice(signal.takeProfit, signal.category), c: 'text-trading-green' },
        ].map(item => (
          <div key={item.l}>
            <p className="text-[10px] text-muted-foreground uppercase">{item.l}</p>
            <div className="flex items-center gap-1">
              <p className={cn('text-sm font-mono', item.c)}>{item.v}</p>
              <button onClick={() => onCopy(item.v)} className="copy-btn">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>R:R {rr.toFixed(1)}</span>
        <span>{timeAgo(signal.createdAt)}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{signal.analysis}</p>
      {signal.status === 'ACTIVE' && (
        <Button
          onClick={onSendToBroker}
          size="sm"
          className="w-full mt-3 bg-trading-orange hover:bg-trading-orange/90 text-foreground"
        >
          <Send className="w-3.5 h-3.5 mr-2" />
          Send to MT4 / MT5
        </Button>
      )}
    </div>
  );
}
