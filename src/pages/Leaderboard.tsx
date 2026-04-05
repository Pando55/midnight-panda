import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Flame, Star, TrendingUp, Award, Target, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TraderProfile {
  id: string;
  user_id: string;
  username: string;
  avatar_emoji: string;
  total_pips: number;
  win_rate: number;
  total_trades: number;
  winning_trades: number;
  streak: number;
  badges: string[];
  rank: string;
}

const RANKS = [
  { name: 'Rookie', minPips: 0, color: 'text-muted-foreground' },
  { name: 'Apprentice', minPips: 100, color: 'text-blue-400' },
  { name: 'Trader', minPips: 500, color: 'text-green-400' },
  { name: 'Pro Trader', minPips: 1500, color: 'text-purple-400' },
  { name: 'Master', minPips: 5000, color: 'text-amber-400' },
  { name: 'Legend', minPips: 15000, color: 'text-red-400' },
];

const BADGES = [
  { id: 'first_trade', label: 'First Trade', icon: Star, description: 'Completed first trade' },
  { id: 'win_streak_5', label: '5 Win Streak', icon: Flame, description: '5 consecutive wins' },
  { id: 'win_streak_10', label: '10 Win Streak', icon: Zap, description: '10 consecutive wins' },
  { id: '100_pips', label: '100 Pips Club', icon: Target, description: 'Earned 100+ pips' },
  { id: '1000_pips', label: '1K Pips Club', icon: Trophy, description: 'Earned 1000+ pips' },
  { id: '50_trades', label: 'Veteran', icon: Award, description: '50+ trades completed' },
  { id: '70_winrate', label: 'Sharpshooter', icon: TrendingUp, description: '70%+ win rate' },
];

// Demo leaderboard data
const demoTraders: TraderProfile[] = [
  { id: '1', user_id: 'u1', username: 'PandaKing', avatar_emoji: '🐼', total_pips: 8420, win_rate: 78, total_trades: 234, winning_trades: 182, streak: 12, badges: ['first_trade', '1000_pips', 'win_streak_10', '70_winrate', '50_trades'], rank: 'Master' },
  { id: '2', user_id: 'u2', username: 'ForexWolf', avatar_emoji: '🐺', total_pips: 6280, win_rate: 72, total_trades: 189, winning_trades: 136, streak: 7, badges: ['first_trade', '1000_pips', 'win_streak_5', '70_winrate', '50_trades'], rank: 'Master' },
  { id: '3', user_id: 'u3', username: 'GoldHunter', avatar_emoji: '🦁', total_pips: 4150, win_rate: 68, total_trades: 145, winning_trades: 98, streak: 4, badges: ['first_trade', '1000_pips', '50_trades'], rank: 'Pro Trader' },
  { id: '4', user_id: 'u4', username: 'CryptoNinja', avatar_emoji: '🥷', total_pips: 3200, win_rate: 65, total_trades: 120, winning_trades: 78, streak: 3, badges: ['first_trade', '1000_pips', '50_trades'], rank: 'Pro Trader' },
  { id: '5', user_id: 'u5', username: 'PipMachine', avatar_emoji: '🤖', total_pips: 2100, win_rate: 71, total_trades: 95, winning_trades: 67, streak: 6, badges: ['first_trade', '1000_pips', '70_winrate'], rank: 'Pro Trader' },
  { id: '6', user_id: 'u6', username: 'BullishBear', avatar_emoji: '🐻', total_pips: 1200, win_rate: 62, total_trades: 78, winning_trades: 48, streak: 2, badges: ['first_trade', '100_pips', '50_trades'], rank: 'Trader' },
  { id: '7', user_id: 'u7', username: 'ScalpQueen', avatar_emoji: '👑', total_pips: 890, win_rate: 74, total_trades: 210, winning_trades: 155, streak: 8, badges: ['first_trade', '100_pips', '70_winrate', '50_trades', 'win_streak_5'], rank: 'Trader' },
  { id: '8', user_id: 'u8', username: 'NewbiePanda', avatar_emoji: '🐣', total_pips: 150, win_rate: 55, total_trades: 22, winning_trades: 12, streak: 1, badges: ['first_trade', '100_pips'], rank: 'Apprentice' },
];

function getMedalIcon(position: number) {
  if (position === 0) return <span className="text-2xl">🥇</span>;
  if (position === 1) return <span className="text-2xl">🥈</span>;
  if (position === 2) return <span className="text-2xl">🥉</span>;
  return <span className="text-sm text-muted-foreground font-bold w-8 text-center">#{position + 1}</span>;
}

function getRankColor(rank: string) {
  return RANKS.find(r => r.name === rank)?.color || 'text-muted-foreground';
}

export default function Leaderboard() {
  const [traders, setTraders] = useState<TraderProfile[]>(demoTraders);
  const [sortBy, setSortBy] = useState<'pips' | 'winrate' | 'trades'>('pips');

  const sorted = [...traders].sort((a, b) => {
    if (sortBy === 'pips') return b.total_pips - a.total_pips;
    if (sortBy === 'winrate') return b.win_rate - a.win_rate;
    return b.total_trades - a.total_trades;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground font-display">Leaderboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">Top traders ranked by performance</p>
      </div>

      {/* Top 3 Podium */}
      <div className="px-4 mb-4">
        <div className="flex items-end justify-center gap-3 py-4">
          {[1, 0, 2].map((idx) => {
            const trader = sorted[idx];
            if (!trader) return null;
            const isFirst = idx === 0;
            return (
              <div key={trader.id} className={`flex flex-col items-center ${isFirst ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                <span className="text-3xl mb-1">{trader.avatar_emoji}</span>
                <span className="text-xs font-semibold text-foreground truncate max-w-[80px]">{trader.username}</span>
                <span className={`text-[10px] font-medium ${getRankColor(trader.rank)}`}>{trader.rank}</span>
                <div className={`mt-1 rounded-t-lg flex items-center justify-center ${isFirst ? 'bg-amber-500/20 w-20 h-20' : 'bg-secondary w-16 h-14'}`}>
                  <div className="text-center">
                    {getMedalIcon(idx)}
                    <p className="text-xs font-bold text-foreground">{trader.total_pips.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">pips</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sort Tabs */}
      <div className="px-4 mb-3 flex gap-2">
        {(['pips', 'winrate', 'trades'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              sortBy === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {s === 'pips' ? '🎯 Pips' : s === 'winrate' ? '📊 Win Rate' : '📈 Trades'}
          </button>
        ))}
      </div>

      {/* Full Rankings */}
      <div className="px-4 space-y-2 pb-4">
        {sorted.map((trader, i) => (
          <Card key={trader.id} className={`border-border/50 ${i < 3 ? 'border-primary/20' : ''}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 flex justify-center shrink-0">
                {getMedalIcon(i)}
              </div>
              <span className="text-2xl">{trader.avatar_emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{trader.username}</span>
                  <span className={`text-[10px] font-medium ${getRankColor(trader.rank)}`}>{trader.rank}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                  <span>{trader.total_pips.toLocaleString()} pips</span>
                  <span>{trader.win_rate}% WR</span>
                  <span>{trader.total_trades} trades</span>
                  {trader.streak >= 3 && <span className="text-amber-400">🔥{trader.streak}</span>}
                </div>
                <div className="flex gap-1 mt-1">
                  {trader.badges.slice(0, 4).map(b => {
                    const badge = BADGES.find(bg => bg.id === b);
                    if (!badge) return null;
                    const Icon = badge.icon;
                    return (
                      <div key={b} className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center" title={badge.label}>
                        <Icon className="w-3 h-3 text-primary" />
                      </div>
                    );
                  })}
                  {trader.badges.length > 4 && (
                    <span className="text-[9px] text-muted-foreground self-center">+{trader.badges.length - 4}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Badges Legend */}
      <div className="px-4 pb-6">
        <h2 className="text-sm font-semibold text-foreground mb-2">🏅 All Badges</h2>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map(badge => {
            const Icon = badge.icon;
            return (
              <div key={badge.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{badge.label}</p>
                  <p className="text-[9px] text-muted-foreground">{badge.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
