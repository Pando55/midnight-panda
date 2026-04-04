import type { 
  TradingSignal, 
  MarketData, 
  MarketSession, 
  NewsItem, 
  PerformanceStats,
  AssetCategory,
  EconomicEvent
} from '@/types';

export const marketData: MarketData[] = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'FOREX', price: 1.0842, change: 0.24, changePercent: 0.22 },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'FOREX', price: 1.2631, change: 0.18, changePercent: 0.14 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', category: 'FOREX', price: 149.82, change: -0.12, changePercent: -0.08 },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', category: 'FOREX', price: 0.8824, change: 0.08, changePercent: 0.09 },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', category: 'FOREX', price: 0.6524, change: -0.08, changePercent: -0.12 },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', category: 'FOREX', price: 1.3521, change: 0.15, changePercent: 0.11 },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', category: 'FOREX', price: 0.8582, change: 0.06, changePercent: 0.07 },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', category: 'FOREX', price: 0.6124, change: -0.05, changePercent: -0.08 },
  { symbol: 'XAU/USD', name: 'Gold / US Dollar', category: 'METALS', price: 2045.80, change: 8.50, changePercent: 0.42 },
  { symbol: 'XAG/USD', name: 'Silver / US Dollar', category: 'METALS', price: 23.42, change: 0.18, changePercent: 0.77 },
  { symbol: 'US30', name: 'Dow Jones Industrial', category: 'INDICES', price: 38420.15, change: 172.80, changePercent: 0.45 },
  { symbol: 'US500', name: 'S&P 500', category: 'INDICES', price: 4950.25, change: 28.50, changePercent: 0.58 },
  { symbol: 'NAS100', name: 'NASDAQ 100', category: 'INDICES', price: 17520.80, change: 125.40, changePercent: 0.72 },
  { symbol: 'UK100', name: 'FTSE 100', category: 'INDICES', price: 7680.40, change: 42.20, changePercent: 0.55 },
  { symbol: 'GER40', name: 'DAX 40', category: 'INDICES', price: 16980.60, change: 95.80, changePercent: 0.57 },
  { symbol: 'WTI', name: 'Crude Oil', category: 'COMMODITIES', price: 78.45, change: 1.25, changePercent: 1.62 },
  { symbol: 'BRENT', name: 'Brent Oil', category: 'COMMODITIES', price: 82.80, change: 1.40, changePercent: 1.72 },
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', category: 'CRYPTO', price: 52340.00, change: 1240.50, changePercent: 2.43 },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', category: 'CRYPTO', price: 2890.40, change: 68.20, changePercent: 2.42 },
];

export const sampleSignals: TradingSignal[] = [
  { id: 'sig_001', asset: 'EUR/USD', category: 'FOREX', direction: 'BUY', entryPrice: 1.0842, stopLoss: 1.0790, takeProfit: 1.0940, status: 'ACTIVE', analysis: 'Price Action: H4 Bullish Engulfing at Daily Support + RSI Oversold (32). Confluence with 200 EMA bounce.', createdAt: new Date(Date.now() - 2 * 60 * 1000) },
  { id: 'sig_002', asset: 'GBP/USD', category: 'FOREX', direction: 'SELL', entryPrice: 1.2631, stopLoss: 1.2680, takeProfit: 1.2530, status: 'ACTIVE', analysis: 'Technical Confluence: Double Top formation on H1 + Bearish Divergence on MACD.', createdAt: new Date(Date.now() - 15 * 60 * 1000) },
  { id: 'sig_003', asset: 'XAU/USD', category: 'METALS', direction: 'BUY', entryPrice: 2045.80, stopLoss: 2035.00, takeProfit: 2065.00, status: 'ACTIVE', analysis: 'Safe Haven Flow: Geopolitical tensions rising + USD weakness. Golden Cross on Daily.', createdAt: new Date(Date.now() - 32 * 60 * 1000) },
  { id: 'sig_004', asset: 'US30', category: 'INDICES', direction: 'BUY', entryPrice: 38420, stopLoss: 38200, takeProfit: 38800, status: 'HIT_TP', analysis: 'Trend Continuation: Strong earnings season. Breaking ATH resistance.', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), closedAt: new Date(Date.now() - 30 * 60 * 1000), pips: 380 },
  { id: 'sig_005', asset: 'USD/JPY', category: 'FOREX', direction: 'SELL', entryPrice: 149.82, stopLoss: 150.50, takeProfit: 148.20, status: 'HIT_SL', analysis: 'Reversal Setup: Overbought RSI + Bearish Pin Bar on Daily.', createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), closedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), pips: -68 },
  { id: 'sig_006', asset: 'WTI', category: 'COMMODITIES', direction: 'BUY', entryPrice: 78.45, stopLoss: 76.80, takeProfit: 82.00, status: 'ACTIVE', analysis: 'Supply Constraints: OPEC+ cuts extended. Bull flag breakout on H4.', createdAt: new Date(Date.now() - 45 * 60 * 1000) },
  { id: 'sig_007', asset: 'BTC/USD', category: 'CRYPTO', direction: 'BUY', entryPrice: 52340, stopLoss: 50800, takeProfit: 55500, status: 'ACTIVE', analysis: 'Institutional Flow: ETF inflows accelerating + Halving anticipation.', createdAt: new Date(Date.now() - 20 * 60 * 1000) },
  { id: 'sig_008', asset: 'NAS100', category: 'INDICES', direction: 'BUY', entryPrice: 17520, stopLoss: 17350, takeProfit: 17850, status: 'HIT_TP', analysis: 'Tech Rally: AI sector momentum + Strong NFP data.', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), closedAt: new Date(Date.now() - 18 * 60 * 60 * 1000), pips: 330 },
];

export const marketSessions: MarketSession[] = [
  { name: 'Sydney', isOpen: true, opensAt: '22:00', closesAt: '07:00' },
  { name: 'Tokyo', isOpen: true, opensAt: '00:00', closesAt: '09:00' },
  { name: 'London', isOpen: false, opensAt: '08:00', closesAt: '17:00' },
  { name: 'New York', isOpen: false, opensAt: '13:00', closesAt: '22:00' },
];

export const newsItems: NewsItem[] = [
  { id: 'news_001', title: 'NFP - Non-Farm Payrolls', impact: 'HIGH', time: 'Today 13:30', currency: 'USD' },
  { id: 'news_002', title: 'CPI - Consumer Price Index', impact: 'HIGH', time: 'Tomorrow 13:30', currency: 'USD' },
  { id: 'news_003', title: 'FOMC Interest Rate Decision', impact: 'HIGH', time: 'Wed 19:00', currency: 'USD' },
  { id: 'news_004', title: 'ECB Press Conference', impact: 'HIGH', time: 'Thu 14:30', currency: 'EUR' },
  { id: 'news_005', title: 'GDP - Gross Domestic Product', impact: 'MEDIUM', time: 'Fri 13:30', currency: 'USD' },
];

export const performanceStats: PerformanceStats[] = [
  { month: 'January', totalPips: 485, winRate: 87, totalSignals: 45, winningSignals: 39, losingSignals: 6 },
  { month: 'February', totalPips: 620, winRate: 89, totalSignals: 52, winningSignals: 46, losingSignals: 6 },
  { month: 'March', totalPips: 540, winRate: 85, totalSignals: 48, winningSignals: 41, losingSignals: 7 },
];

export const categoryColors: Record<AssetCategory, string> = {
  FOREX: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  COMMODITIES: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  METALS: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  INDICES: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CRYPTO: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

export function formatPrice(price: number, category: AssetCategory): string {
  if (category === 'CRYPTO' || category === 'INDICES' || category === 'METALS') {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toFixed(4);
}

export function formatPips(pips: number): string {
  const sign = pips >= 0 ? '+' : '';
  return `${sign}${pips.toFixed(1)}`;
}

export function calculateRiskReward(entry: number, sl: number, tp: number, _direction: 'BUY' | 'SELL'): number {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  return reward / risk;
}

export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  stopLossPips: number,
  pipValue: number = 10
): { lotSize: number; riskAmount: number; units: number } {
  const riskAmount = accountBalance * (riskPercent / 100);
  const riskPerPip = riskAmount / stopLossPips;
  const lotSize = riskPerPip / pipValue;
  const units = lotSize * 100000;
  return {
    lotSize: Math.round(lotSize * 100) / 100,
    riskAmount: Math.round(riskAmount * 100) / 100,
    units: Math.round(units),
  };
}

// Economic Calendar Data
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

export const economicEvents: EconomicEvent[] = [
  { id: 'eco_001', title: 'Non-Farm Payrolls', country: 'US', currency: 'USD', impact: 'HIGH', date: new Date(today.getTime()), time: '13:30', forecast: '180K', previous: '175K' },
  { id: 'eco_002', title: 'CPI m/m', country: 'US', currency: 'USD', impact: 'HIGH', date: new Date(today.getTime() + 86400000), time: '13:30', forecast: '0.3%', previous: '0.4%' },
  { id: 'eco_003', title: 'FOMC Statement', country: 'US', currency: 'USD', impact: 'HIGH', date: new Date(today.getTime() + 2 * 86400000), time: '19:00', forecast: '5.50%', previous: '5.50%' },
  { id: 'eco_004', title: 'ECB Interest Rate Decision', country: 'EU', currency: 'EUR', impact: 'HIGH', date: new Date(today.getTime() + 3 * 86400000), time: '13:15', forecast: '4.50%', previous: '4.50%' },
  { id: 'eco_005', title: 'GDP q/q', country: 'US', currency: 'USD', impact: 'MEDIUM', date: new Date(today.getTime() + 4 * 86400000), time: '13:30', forecast: '3.2%', previous: '3.3%' },
  { id: 'eco_006', title: 'Retail Sales m/m', country: 'US', currency: 'USD', impact: 'MEDIUM', date: new Date(today.getTime()), time: '13:30', forecast: '0.4%', previous: '0.6%' },
  { id: 'eco_007', title: 'BoE Interest Rate Decision', country: 'UK', currency: 'GBP', impact: 'HIGH', date: new Date(today.getTime() + 3 * 86400000), time: '12:00', forecast: '5.25%', previous: '5.25%' },
  { id: 'eco_008', title: 'Unemployment Claims', country: 'US', currency: 'USD', impact: 'MEDIUM', date: new Date(today.getTime() + 3 * 86400000), time: '13:30', forecast: '210K', previous: '215K' },
  { id: 'eco_009', title: 'RBA Rate Statement', country: 'AU', currency: 'AUD', impact: 'HIGH', date: new Date(today.getTime() + 1 * 86400000), time: '03:30', forecast: '4.35%', previous: '4.35%' },
  { id: 'eco_010', title: 'Core PCE Price Index m/m', country: 'US', currency: 'USD', impact: 'HIGH', date: new Date(today.getTime() + 4 * 86400000), time: '13:30', forecast: '0.2%', previous: '0.3%' },
  { id: 'eco_011', title: 'Trade Balance', country: 'CN', currency: 'CNY', impact: 'MEDIUM', date: new Date(today.getTime() + 5 * 86400000), time: '03:00', forecast: '75.0B', previous: '68.4B' },
  { id: 'eco_012', title: 'PMI Manufacturing', country: 'US', currency: 'USD', impact: 'MEDIUM', date: new Date(today.getTime() + 1 * 86400000), time: '14:45', forecast: '50.2', previous: '49.8' },
  { id: 'eco_013', title: 'BoJ Policy Rate', country: 'JP', currency: 'JPY', impact: 'HIGH', date: new Date(today.getTime() + 5 * 86400000), time: '03:00', forecast: '-0.10%', previous: '-0.10%' },
  { id: 'eco_014', title: 'SNB Policy Rate', country: 'CH', currency: 'CHF', impact: 'HIGH', date: new Date(today.getTime() + 3 * 86400000), time: '08:30', forecast: '1.75%', previous: '1.75%' },
];
