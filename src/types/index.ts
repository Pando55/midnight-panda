export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  isAdmin?: boolean;
}

export type LicenseDuration = '3months' | '6months' | '12months' | 'lifetime';

export interface License {
  key: string;
  duration: LicenseDuration;
  activatedAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
}

export interface GeneratedKey {
  id: string;
  email: string;
  key: string;
  duration: LicenseDuration;
  createdAt: Date;
  isActive: boolean;
}

export type SignalDirection = 'BUY' | 'SELL';
export type SignalStatus = 'ACTIVE' | 'HIT_TP' | 'HIT_SL' | 'EXPIRED';
export type AssetCategory = 'FOREX' | 'COMMODITIES' | 'METALS' | 'INDICES' | 'CRYPTO';

export interface TradingSignal {
  id: string;
  asset: string;
  category: AssetCategory;
  direction: SignalDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  status: SignalStatus;
  analysis: string;
  createdAt: Date;
  closedAt?: Date;
  pips?: number;
}

export interface MarketData {
  symbol: string;
  name: string;
  category: AssetCategory;
  price: number;
  change: number;
  changePercent: number;
}

export type SessionName = 'Sydney' | 'Tokyo' | 'London' | 'New York';

export interface MarketSession {
  name: SessionName;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  time: string;
  currency: string;
}

export interface PerformanceStats {
  totalPips: number;
  winRate: number;
  totalSignals: number;
  winningSignals: number;
  losingSignals: number;
  month: string;
}

export interface PositionSizeInput {
  accountBalance: number;
  riskPercent: number;
  stopLossPips: number;
  pair: string;
}

export interface PositionSizeResult {
  lotSize: number;
  riskAmount: number;
  units: number;
}

export type TabName = 'dashboard' | 'analyze' | 'signals' | 'risk-calc' | 'calendar' | 'education' | 'community' | 'leaderboard' | 'profile';

export interface AuthState {
  user: User | null;
  license: License | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  currency: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  date: Date;
  time: string;
  actual?: string;
  forecast?: string;
  previous?: string;
}
