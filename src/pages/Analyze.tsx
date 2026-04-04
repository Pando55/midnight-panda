import { useState } from 'react';
import { TrendingUp, TrendingDown, Search, ArrowUpRight, ArrowDownRight, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { marketData, categoryColors, formatPrice } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AssetCategory, MarketData } from '@/types';

interface AnalyzeProps { onNavigate: (page: string) => void; }

export default function Analyze({ onNavigate }: AnalyzeProps) {
  const { checkLicenseValidity } = useAuth();
  const hasValidLicense = checkLicenseValidity();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'ALL'>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<MarketData | null>(null);

  const categories: AssetCategory[] = ['FOREX', 'COMMODITIES', 'METALS', 'INDICES', 'CRYPTO'];
  const filteredMarkets = marketData.filter(m => {
    const matchesSearch = m.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || m.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  if (!hasValidLicense) {
    return (
      <div className="min-h-screen pb-24 bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="px-4 py-4"><h1 className="text-xl font-semibold text-foreground">Market Analysis</h1></div>
        </header>
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="w-20 h-20 rounded-full bg-trading-orange/10 flex items-center justify-center mb-6"><Lock className="w-10 h-10 text-trading-orange" /></div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">License Required</h2>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">Activate your license to access market analysis.</p>
          <Button onClick={() => onNavigate('profile')} className="btn-primary">Activate License</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground">Market Analysis</h1>
          <p className="text-sm text-muted-foreground">AI-powered technical insights</p>
        </div>
      </header>
      <div className="px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search markets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border text-foreground" />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button onClick={() => setSelectedCategory('ALL')}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              selectedCategory === 'ALL' ? 'bg-trading-orange text-foreground' : 'glass-card text-muted-foreground')}>All</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                selectedCategory === cat ? 'bg-trading-orange text-foreground' : 'glass-card text-muted-foreground')}>{cat}</button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {filteredMarkets.map((market) => (
            <button key={market.symbol} onClick={() => setSelectedAsset(market)}
              className={cn('glass-card rounded-xl p-4 text-left transition-all card-hover', selectedAsset?.symbol === market.symbol && 'border-trading-orange/50')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', market.change >= 0 ? 'bg-trading-green/10' : 'bg-trading-red/10')}>
                    {market.change >= 0 ? <TrendingUp className="w-5 h-5 text-trading-green" /> : <TrendingDown className="w-5 h-5 text-trading-red" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{market.symbol}</span>
                      <span className={cn('px-1.5 py-0.5 text-[10px] rounded border', categoryColors[market.category])}>{market.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{market.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-bold text-foreground">{formatPrice(market.price, market.category)}</p>
                  <p className={cn('text-sm flex items-center justify-end gap-1', market.change >= 0 ? 'text-trading-green' : 'text-trading-red')}>
                    {market.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {market.changePercent > 0 ? '+' : ''}{market.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
