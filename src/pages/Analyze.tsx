import { useState } from 'react';
import { TrendingUp, TrendingDown, Search, ArrowUpRight, ArrowDownRight, Lock, Loader2, Target, AlertTriangle, BarChart3, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { marketData, categoryColors, formatPrice } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { AssetCategory, MarketData } from '@/types';

interface AnalyzeProps { onNavigate: (page: string) => void; }

interface AIAnalysis {
  sentiment: string;
  confidence: number;
  summary: string;
  entry: { price: number; reason: string };
  stopLoss: { price: number; reason: string };
  takeProfit: { price: number; reason: string };
  riskReward: string;
  keyLevels: { support: number; resistance: number };
  indicators: string[];
  timeframe: string;
  warning: string;
}

export default function Analyze({ onNavigate }: AnalyzeProps) {
  const { checkLicenseValidity } = useAuth();
  const hasValidLicense = checkLicenseValidity();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'ALL'>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<MarketData | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const categories: AssetCategory[] = ['FOREX', 'COMMODITIES', 'METALS', 'INDICES', 'CRYPTO'];
  const filteredMarkets = marketData.filter(m => {
    const matchesSearch = m.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || m.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleAnalyze = async (market: MarketData) => {
    setSelectedAsset(market);
    setAnalysis(null);
    setAnalysisError('');
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-market', {
        body: {
          asset: market.symbol,
          price: market.price,
          change: market.change,
          changePercent: market.changePercent,
          category: market.category,
        },
      });

      if (error) throw new Error(error.message || 'Analysis failed');
      if (data?.error) throw new Error(data.error);
      if (data?.analysis) {
        setAnalysis(data.analysis);
      } else {
        throw new Error('No analysis returned');
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!hasValidLicense) {
    return (
      <div className="min-h-screen pb-24 bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="px-4 py-4"><h1 className="text-xl font-semibold text-foreground">Market Analysis</h1></div>
        </header>
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="w-20 h-20 rounded-full bg-trading-orange/10 flex items-center justify-center mb-6"><Lock className="w-10 h-10 text-trading-orange" /></div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">License Required</h2>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">Activate your license to access AI-powered market analysis.</p>
          <Button onClick={() => onNavigate('profile')} className="btn-primary">Activate License</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground">AI Market Analysis</h1>
          <p className="text-sm text-muted-foreground">Tap any asset for real-time AI insights</p>
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

        {/* AI Analysis Result */}
        {(isAnalyzing || analysis || analysisError) && selectedAsset && (
          <div className="glass-card rounded-xl p-5 border border-trading-orange/30 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-trading-orange" />
                <h3 className="text-lg font-semibold text-foreground">{selectedAsset.symbol} Analysis</h3>
              </div>
              {analysis && (
                <span className={cn('px-3 py-1 rounded-full text-xs font-bold border',
                  analysis.sentiment === 'BULLISH' ? 'bg-trading-green/20 text-trading-green border-trading-green/30' :
                  analysis.sentiment === 'BEARISH' ? 'bg-trading-red/20 text-trading-red border-trading-red/30' :
                  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30')}>
                  {analysis.sentiment} ({analysis.confidence}%)
                </span>
              )}
            </div>

            {isAnalyzing && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-trading-orange animate-spin" />
                <span className="ml-3 text-muted-foreground">AI analyzing {selectedAsset.symbol}...</span>
              </div>
            )}

            {analysisError && (
              <div className="p-3 rounded-lg bg-trading-red/10 border border-trading-red/30 text-trading-red text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />{analysisError}
              </div>
            )}

            {analysis && (
              <>
                <p className="text-sm text-muted-foreground">{analysis.summary}</p>

                {/* Entry, SL, TP with reasons */}
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-trading-orange/5 border border-trading-orange/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Entry Price</span>
                      <span className="text-lg font-mono font-bold text-trading-orange">{analysis.entry.price}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{analysis.entry.reason}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-trading-red/5 border border-trading-red/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Stop Loss</span>
                      <span className="text-lg font-mono font-bold text-trading-red">{analysis.stopLoss.price}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{analysis.stopLoss.reason}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-trading-green/5 border border-trading-green/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Take Profit</span>
                      <span className="text-lg font-mono font-bold text-trading-green">{analysis.takeProfit.price}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{analysis.takeProfit.reason}</p>
                  </div>
                </div>

                {/* Risk:Reward & Timeframe */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-background/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Risk : Reward</p>
                    <p className="text-lg font-bold text-foreground">{analysis.riskReward}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3" />Timeframe</p>
                    <p className="text-lg font-bold text-foreground">{analysis.timeframe}</p>
                  </div>
                </div>

                {/* Key Levels */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-trading-green/5 border border-trading-green/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Support</p>
                    <p className="text-sm font-mono font-bold text-trading-green">{analysis.keyLevels.support}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-trading-red/5 border border-trading-red/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Resistance</p>
                    <p className="text-sm font-mono font-bold text-trading-red">{analysis.keyLevels.resistance}</p>
                  </div>
                </div>

                {/* Indicators */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Technical Indicators</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.indicators.map((ind, i) => (
                      <span key={i} className="px-2 py-1 text-xs rounded-lg glass-card text-muted-foreground">{ind}</span>
                    ))}
                  </div>
                </div>

                {/* Warning */}
                {analysis.warning && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {analysis.warning}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Markets Grid */}
        <div className="grid grid-cols-1 gap-3">
          {filteredMarkets.map((market) => (
            <button key={market.symbol} onClick={() => handleAnalyze(market)}
              className={cn('glass-card rounded-xl p-4 text-left transition-all card-hover',
                selectedAsset?.symbol === market.symbol && 'border-trading-orange/50')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
                    market.change >= 0 ? 'bg-trading-green/10' : 'bg-trading-red/10')}>
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
