import { useState } from 'react';
import { LayoutDashboard, Zap, User, GraduationCap, Camera, Calendar, Sparkles, BookOpen, Eye, MoreHorizontal, Cable, Users, Trophy, Calculator, ChartNoAxesCombined } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { TabName } from '@/types';

interface BottomNavProps { activeTab: TabName; onTabChange: (tab: TabName) => void }
const tabs: { id: TabName; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'chart-analysis', label: 'Analyze', icon: Camera },
  { id: 'broker', label: 'Trade', icon: Cable },
  { id: 'profile', label: 'Profile', icon: User },
];
const moreTabs: typeof tabs = [
  { id: 'signals', label: 'Signal Desk', icon: Zap },
  { id: 'live-overlay', label: 'Live Overlay', icon: Eye },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'education', label: 'Academy', icon: GraduationCap },
  { id: 'ai-assistant', label: 'MP-Voice', icon: Sparkles },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'risk-calc', label: 'Risk Calculator', icon: Calculator },
  { id: 'sentiment', label: 'Sentiment', icon: ChartNoAxesCombined },
];
export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const [open, setOpen] = useState(false);
  return <>
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="grid grid-cols-5 max-w-lg mx-auto px-2 py-2">
        {tabs.map(tab => <Button variant="ghost" key={tab.id} onClick={() => onTabChange(tab.id)} aria-current={activeTab === tab.id ? 'page' : undefined} className={cn('h-12 flex-col gap-1 px-1 hover:bg-secondary', activeTab === tab.id ? 'text-primary' : 'text-muted-foreground')}>
          <tab.icon className="w-5 h-5" /><span className="text-[10px]">{tab.label}</span>
        </Button>)}
        <Button variant="ghost" onClick={() => setOpen(true)} className={cn('h-12 flex-col gap-1 px-1 hover:bg-secondary', moreTabs.some(t => t.id === activeTab) ? 'text-primary' : 'text-muted-foreground')}><MoreHorizontal /><span className="text-[10px]">More</span></Button>
      </div>
    </nav>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="pb-24 max-h-[85dvh] overflow-y-auto">
        <SheetTitle>Midnight Panda</SheetTitle><SheetDescription className="sr-only">More sections</SheetDescription>
        <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto mt-5">
          {moreTabs.map(tab => <Button key={tab.id} variant="secondary" className="justify-start h-12 whitespace-normal" onClick={() => { onTabChange(tab.id); setOpen(false); }}><tab.icon className="text-primary" />{tab.label}</Button>)}
        </div>
      </SheetContent>
    </Sheet>
  </>;
}
