import type { LicenseDuration } from '@/types';

export type Feature =
  | 'signals'
  | 'realTimeAlerts'
  | 'riskCalculator'
  | 'economicCalendar'
  | 'tradeJournal'
  | 'marketSessions'
  | 'newsImpactMeter'
  | 'pushNotifications'
  | 'smartNotifications'
  | 'multiAsset'
  | 'highProbabilitySignals'
  | 'chartScanner'
  | 'vipSignals'
  | 'marketSentiment'
  | 'heatmap'
  | 'communityChat'
  | 'leaderboard'
  | 'tradingAcademy'
  | 'strategyMode'
  | 'eaDownloads'
  | 'masterSignals'
  | 'strategyInsights'
  | 'oneOnOneGuidance'
  | 'earlyAccess'
  | 'aiVoiceAssistant'
  | 'foundersAccess'
  | 'goldBadge'
  | 'exclusiveTheme'
  | 'privateAiMode'
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

// Each tier is strictly a superset of the previous one.
const T1: Feature[] = ['signals', 'realTimeAlerts', 'riskCalculator', 'economicCalendar', 'marketSessions', 'newsImpactMeter'];
const T2: Feature[] = [...T1, 'highProbabilitySignals', 'multiAsset', 'pushNotifications', 'tradeJournal'];
const T3: Feature[] = [...T2, 'vipSignals', 'chartScanner', 'marketSentiment', 'heatmap', 'communityChat', 'smartNotifications', 'strategyMode'];
const T4: Feature[] = [...T3, 'leaderboard', 'tradingAcademy', 'masterSignals', 'strategyInsights', 'oneOnOneGuidance', 'earlyAccess'];
const TLIFE: Feature[] = [...T4, 'eaDownloads', 'aiVoiceAssistant', 'foundersAccess', 'goldBadge', 'exclusiveTheme', 'privateAiMode', 'legacyMembership', 'prioritySupport'];

export const TIERS: Record<LicenseDuration, TierInfo> = {
  '3months': {
    duration: '3months', label: '3 Months', shortLabel: 'P-Basic', price: 'R1,299',
    color: 'text-blue-400',
    features: T1,
    highlights: ['Precision Signals', 'Real-Time Alerts', 'Risk Calculator', 'Economic Calendar', 'Market Sessions', 'News Impact Meter'],
  },
  '6months': {
    duration: '6months', label: '6 Months', shortLabel: 'P-Advanced', price: 'R2,499',
    color: 'text-cyan-400',
    features: T2,
    highlights: ['Everything in Basic', 'High-Probability Signals', 'Multi-Asset Access', 'Push Notifications', 'Trade Journal'],
  },
  '12months': {
    duration: '12months', label: '12 Months', shortLabel: 'P-Elite', price: 'R4,999',
    color: 'text-trading-orange', badge: 'MOST POPULAR',
    features: T3,
    highlights: ['Everything in Advanced', 'VIP Signal Access', 'AI Chart Scanner', 'Market Sentiment + Heatmap', 'Community Chat', 'Smart Notifications', 'Strategy Mode'],
  },
  '18months': {
    duration: '18months', label: '18 Months', shortLabel: 'P-Master', price: 'R7,999',
    color: 'text-yellow-400', badge: 'BEST VALUE',
    features: T4,
    highlights: ['Everything in Elite', 'Exclusive Master Signals', 'Strategy Insights', '1-on-1 Guidance', 'Early Access Alphas', 'Trading Academy', 'Leaderboard'],
  },
  lifetime: {
    duration: 'lifetime', label: 'Lifetime', shortLabel: 'P-Legend', price: 'R12,999',
    color: 'text-purple-400', badge: '👑 EVERYTHING',
    features: TLIFE,
    highlights: [
      'Everything in Master',
      '🎙️ MP-Voice AI Assistant',
      '🤖 Private AI Mode',
      '⚙️ EA Downloads',
      '👑 Founders Access Badge',
      '🎨 Exclusive Gold Theme',
      '♾️ Legacy Lifetime Membership',
      '⚡ Highest Priority Support',
    ],
  },
};

export const TIER_ORDER: LicenseDuration[] = ['3months', '6months', '12months', '18months', 'lifetime'];

export function hasFeature(duration: LicenseDuration | undefined | null, feature: Feature): boolean {
  if (!duration) return false;
  return TIERS[duration]?.features.includes(feature) ?? false;
}
