import { LayoutDashboard, BarChart3, Zap, Calculator, Calendar, User, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabName } from '@/types';

interface BottomNavProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

const tabs: { id: TabName; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'analyze', label: 'Markets', icon: BarChart3 },
  { id: 'signals', label: 'Signals', icon: Zap },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'education', label: 'Learn', icon: GraduationCap },
  { id: 'risk-calc', label: 'Risk', icon: Calculator },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg transition-all min-w-0',
              activeTab === tab.id
                ? 'text-trading-orange'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className={cn('w-5 h-5', activeTab === tab.id && 'drop-shadow-[0_0_6px_rgba(255,107,0,0.5)]')} />
            <span className="text-[10px] font-medium truncate">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
