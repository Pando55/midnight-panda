import { useState } from 'react';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketSentiment } from '@/hooks/useMarketSentiment';

const categories = ['ALL', 'FOREX', 'CRYPTO', 'COMMODITIES', 'INDICES'] as const;

export default function Sentiment() {
  const { data, isLoading, error, refresh } = useMarketSentiment();
  const [filter, setFilter] = useState<string>('ALL');

  const filtered = filter === 'ALL' ? data : data.filter(d => d.category === filter);

  const getSentimentColor = (score: number) => {
    if (score >= 65) return 'text-[hsl(var(--trading-green))]';
    if (score <= 35) return 'text-destructive';
    return 'text-yellow-400';
  };

  const getSentimentBg = (score: number) => {
    if (score >= 65) return 'bg-[hsl(var(--trading-green))]/10 border-[hsl(var(--trading-green))]/20';
    if (score <= 35) return 'bg-destructive/10 border-destructive/20';
    return 'bg-yellow-500/10 border-yellow-500/20';
  };

  const getBarColor = (score: number) => {
    if (score >= 65) return 'bg-[hsl(var(--trading-green))]';
    if (score <= 35) return 'bg-destructive';
    return 'bg-yellow-500';
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" /> Sentiment Heatmap
            </h1>
            <p className="text-sm text-muted-foreground">AI-powered market mood</p>
          </div>
          <button onClick={refresh} disabled={isLoading}
            className="p-2 rounded-lg glass-card text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                filter === cat ? 'bg-primary text-primary-foreground' : 'glass-card text-muted-foreground')}>
              {cat === 'ALL' ? 'All' : cat}
            </button>
          ))}
        </div>

        {isLoading && data.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading sentiment data...</span>
          </div>
        )}

        {error && data.length === 0 && (
          <div className="glass-card rounded-xl p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <p className="text-foreground font-semibold">Failed to load sentiment</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <button onClick={refresh} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Retry</button>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.asset} className={cn('rounded-xl p-4 border transition-all', getSentimentBg(item.score))}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {item.score >= 65 ? <TrendingUp className="w-4 h-4 text-[hsl(var(--trading-green))]" /> :
                   item.score <= 35 ? <TrendingDown className="w-4 h-4 text-destructive" /> :
                   <Minus className="w-4 h-4 text-yellow-400" />}
                  <span className="font-semibold text-foreground">{item.asset}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{item.category}</span>
                </div>
                <div className="text-right">
                  <span className={cn('text-lg font-bold font-mono', getSentimentColor(item.score))}>{item.score}</span>
                  <span className={cn('ml-1 text-xs', parseFloat(item.change) >= 0 ? 'text-[hsl(var(--trading-green))]' : 'text-destructive')}>
                    {parseFloat(item.change) >= 0 ? '+' : ''}{item.change}
                  </span>
                </div>
              </div>
              {/* Score bar */}
              <div className="w-full h-1.5 rounded-full bg-muted mb-2">
                <div className={cn('h-full rounded-full transition-all', getBarColor(item.score))}
                  style={{ width: `${item.score}%` }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.drivers.map((d, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-background/50 text-muted-foreground">{d}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-foreground font-semibold">No data</p>
          </div>
        )}
      </div>
    </div>
  );
}
