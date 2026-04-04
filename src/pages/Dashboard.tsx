import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Globe, AlertTriangle, Zap, Target, BarChart3, ArrowRight, Copy, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCopy } from '@/hooks/useCopy';
import { useMarketData } from '@/hooks/useMarketData';
import { newsItems, sampleSignals, categoryColors, formatPrice } from '@/lib/data';
import { getMarketSessions } from '@/lib/data';
import { cn, timeAgo } from '@/lib/utils';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { user, checkLicenseValidity } = useAuth();
  const hasValidLicense = checkLicenseValidity();
  const { copied, copy } = useCopy();
  const { data: liveMarketData, lastUpdated, refresh: refreshMarkets, isLoading: marketsLoading } = useMarketData();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sessions = getMarketSessions();
  const activeSignals = sampleSignals.filter(s => s.status === 'ACTIVE');
  const recentSignals = sampleSignals.slice(0, 4);

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/panda-logo.png" alt="Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
              <p className="text-xs text-muted-foreground">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshMarkets} disabled={marketsLoading}
              className="p-2 rounded-lg glass-card text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className={cn("w-4 h-4", marketsLoading && "animate-spin")} />
            </button>
            {!hasValidLicense && (
              <span className="px-2 py-1 text-xs bg-trading-red/20 text-trading-red rounded-full border border-trading-red/30">No License</span>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        <div className="animate-slide-up">
          <h2 className="text-2xl font-semibold text-foreground">
            Welcome back, <span className="text-trading-orange">{user?.name || 'Trader'}</span>
          </h2>
          <p className="text-muted-foreground mt-1">
            {hasValidLicense ? 'Your license is active. Access all premium signals.' : 'Activate your license to access premium signals.'}
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">Prices updated: {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>

        <section className="animate-slide-up animation-delay-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Market Sessions</h3>
            <Globe className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {sessions.map((session) => (
              <div key={session.name} className={cn('glass-card rounded-xl p-3 text-center transition-all', session.isOpen && 'border-trading-green/30')}>
                <div className={cn('w-2 h-2 rounded-full mx-auto mb-2', session.isOpen ? 'bg-trading-green shadow-glow-green' : 'bg-muted-foreground/30')} />
                <p className="text-xs font-medium text-foreground">{session.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{session.isOpen ? 'Open' : 'Closed'}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="animate-slide-up animation-delay-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">High Impact News</h3>
            <AlertTriangle className="w-4 h-4 text-trading-orange" />
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="ticker-wrap bg-trading-orange/10 border-y border-trading-orange/20">
              <div className="ticker-content py-2">
                {[...newsItems, ...newsItems].map((news, i) => (
                  <span key={`${news.id}-${i}`} className="inline-flex items-center gap-2 px-4">
                    <span className={cn('px-1.5 py-0.5 text-[10px] font-bold rounded', news.impact === 'HIGH' ? 'bg-trading-red text-foreground' : 'bg-yellow-500 text-background')}>
                      {news.impact}
                    </span>
                    <span className="text-sm text-foreground">{news.title}</span>
                    <span className="text-xs text-muted-foreground">({news.currency})</span>
                    <span className="text-xs text-trading-orange">{news.time}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="animate-slide-up animation-delay-300">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Active Signals', value: activeSignals.length, icon: Zap, color: 'text-trading-orange' },
              { label: 'Win Rate', value: '89%', icon: Target, color: 'text-trading-green' },
              { label: 'Monthly Pips', value: '+540', icon: BarChart3, color: 'text-trading-green' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card rounded-xl p-4 text-center card-hover">
                <stat.icon className={cn('w-5 h-5 mx-auto mb-2', stat.color)} />
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live Market Ticker */}
        <section className="animate-slide-up animation-delay-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Markets</h3>
            <button onClick={() => onNavigate('analyze')} className="flex items-center gap-1 text-sm text-trading-orange hover:text-trading-orange-light transition-colors">
              Analyze <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {liveMarketData.slice(0, 6).map((m) => (
              <div key={m.symbol} className="glass-card rounded-xl p-3 card-hover" onClick={() => onNavigate('analyze')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{m.symbol}</span>
                  {m.change >= 0 ? <TrendingUp className="w-3 h-3 text-trading-green" /> : <TrendingDown className="w-3 h-3 text-trading-red" />}
                </div>
                <p className="text-sm font-mono font-bold text-foreground mt-1">{formatPrice(m.price, m.category)}</p>
                <p className={cn('text-xs', m.change >= 0 ? 'text-trading-green' : 'text-trading-red')}>
                  {m.changePercent > 0 ? '+' : ''}{m.changePercent.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="animate-slide-up animation-delay-400">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Signals</h3>
            <button onClick={() => onNavigate('signals')} className="flex items-center gap-1 text-sm text-trading-orange hover:text-trading-orange-light transition-colors">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentSignals.map((signal) => (
              <div key={signal.id} className="glass-card rounded-xl p-4 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={cn('px-2 py-1 text-xs font-bold rounded', signal.direction === 'BUY' ? 'badge-buy' : 'badge-sell')}>{signal.direction}</span>
                    <span className="font-semibold text-foreground">{signal.asset}</span>
                    <span className={cn('px-2 py-0.5 text-[10px] rounded border', categoryColors[signal.category])}>{signal.category}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(signal.createdAt)}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Entry', value: formatPrice(signal.entryPrice, signal.category), color: 'text-foreground' },
                    { label: 'SL', value: formatPrice(signal.stopLoss, signal.category), color: 'text-trading-red' },
                    { label: 'TP', value: formatPrice(signal.takeProfit, signal.category), color: 'text-trading-green' },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                      <div className="flex items-center gap-1">
                        <p className={cn('text-sm font-mono', item.color)}>{item.value}</p>
                        <button onClick={() => copy(item.value)} className="copy-btn">
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
