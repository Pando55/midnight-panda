import type { LicenseDuration } from '@/types';

export type Feature =
  | 'signals'
  | 'realTimeAlerts'
  | 'riskCalculator'
  | 'economicCalendar'
  | 'pushNotifications'
  | 'multiAsset'
  | 'highProbabilitySignals'
  | 'chartScanner'
  | 'vipSignals'
  | 'marketSentiment'
  | 'communityChat'
  | 'leaderboard'
  | 'tradingAcademy'
  | 'eaDownloads'
  | 'masterSignals'
  | 'strategyInsights'
  | 'oneOnOneGuidance'
  | 'earlyAccess'
  | 'aiVoiceAssistant'
  | 'legacyMembership'
  | 'prioritySupport';

export interface TierInfo {
  duration: LicenseDuration;
  label: string;
  shortLabel: string;
  price: string;
  color: string;
  badge?: string;
  features: Feature[];
  highlights: string[];
}

const T1: Feature[] = ['signals', 'realTimeAlerts', 'riskCalculator', 'economicCalendar'];
const T2: Feature[] = [...T1, 'highProbabilitySignals', 'multiAsset', 'pushNotifications'];
const T3: Feature[] = [...T2, 'vipSignals', 'chartScanner', 'marketSentiment', 'communityChat'];
const T4: Feature[] = [...T3, 'leaderboard', 'tradingAcademy', 'masterSignals', 'strategyInsights', 'oneOnOneGuidance', 'earlyAccess'];
const TLIFE: Feature[] = [...T4, 'eaDownloads', 'aiVoiceAssistant', 'legacyMembership', 'prioritySupport'];

export const TIERS: Record<LicenseDuration, TierInfo> = {
  '3months': {
    duration: '3months', label: '3 Months', shortLabel: 'P-Basic', price: 'R1,299',
    color: 'text-blue-400',
    features: T1,
    highlights: ['Precision Signals', 'Real-Time Alerts', 'Risk Calculator', 'Economic Calendar'],
  },
  '6months': {
    duration: '6months', label: '6 Months', shortLabel: 'P-Advanced', price: 'R2,499',
    color: 'text-cyan-400', badge: 'BEST VALUE',
    features: T2,
    highlights: ['All Basic Features', 'High-Probability Signals', 'Multi-Asset Access', 'Push Notifications'],
  },
  '12months': {
    duration: '12months', label: '12 Months', shortLabel: 'P-Elite', price: 'R4,999',
    color: 'text-trading-orange', badge: 'MOST POPULAR',
    features: T3,
    highlights: ['All Advanced Features', 'VIP Signal Access', 'AI Chart Scanner', 'Market Sentiment', 'Community Chat'],
  },
  '18months': {
    duration: '18months', label: '18 Months', shortLabel: 'P-Master', price: 'R7,999',
    color: 'text-yellow-400',
    features: T4,
    highlights: ['All Elite Features', 'Exclusive Master Signals', 'Strategy Insights', '1-on-1 Guidance', 'Early Access Alphas'],
  },
  lifetime: {
    duration: 'lifetime', label: 'Lifetime', shortLabel: 'P-Legend', price: 'R12,999',
    color: 'text-purple-400', badge: 'EVERYTHING',
    features: TLIFE,
    highlights: ['All Master Features', '🎙️ AI Voice Assistant', 'EA Downloads', 'Legacy Membership', 'Highest Priority Support', 'Lifetime Updates'],
  },
};

export const TIER_ORDER: LicenseDuration[] = ['3months', '6months', '12months', '18months', 'lifetime'];

export function hasFeature(duration: LicenseDuration | undefined | null, feature: Feature): boolean {
  if (!duration) return false;
  return TIERS[duration]?.features.includes(feature) ?? false;
}
