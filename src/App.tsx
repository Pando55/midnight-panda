import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import Signals from '@/pages/Signals';
import Analyze from '@/pages/Analyze';
import RiskCalculator from '@/pages/RiskCalculator';
import EconomicCalendar from '@/pages/EconomicCalendar';
import Education from '@/pages/Education';
import Community from '@/pages/Community';
import Leaderboard from '@/pages/Leaderboard';
import ChartAnalysis from '@/pages/ChartAnalysis';
import Sentiment from '@/pages/Sentiment';
import Profile from '@/pages/Profile';
import AIAssistant from '@/pages/AIAssistant';
import Journal from '@/pages/Journal';
import BottomNav from '@/components/BottomNav';
import InstallBanner from '@/components/InstallBanner';
import LicenseGate from '@/components/LicenseGate';
import SplashScreen from '@/components/SplashScreen';
import { Loader2 } from 'lucide-react';
import type { TabName } from '@/types';

// All tabs except Dashboard & Profile are license-gated to drive activations.
const GATED_TABS: TabName[] = ['analyze', 'signals', 'risk-calc', 'calendar', 'education', 'community', 'leaderboard', 'chart-analysis', 'sentiment', 'ai-assistant', 'journal'];

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<'login' | 'signup' | 'dashboard'>('login');
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [splashDone, setSplashDone] = useState(() => sessionStorage.getItem('mp_splash_done') === '1');

  useEffect(() => {
    if (isAuthenticated && currentPage !== 'dashboard') setCurrentPage('dashboard');
  }, [isAuthenticated, currentPage]);

  if (!splashDone) {
    return <SplashScreen onDone={() => { sessionStorage.setItem('mp_splash_done', '1'); setSplashDone(true); }} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-trading-orange animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {currentPage === 'login' && <Login onNavigate={setCurrentPage} />}
        {currentPage === 'signup' && <Signup onNavigate={setCurrentPage} />}
        <InstallBanner />
      </div>
    );
  }

  const goProfile = () => setActiveTab('profile');
  const gated = (node: React.ReactNode, label: string) =>
    GATED_TABS.includes(activeTab)
      ? <LicenseGate feature={label} onGoToProfile={goProfile}>{node}</LicenseGate>
      : node;

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        {activeTab === 'dashboard' && <Dashboard onNavigate={(tab: string) => setActiveTab(tab as TabName)} />}
        {activeTab === 'analyze' && gated(<Analyze onNavigate={(tab: string) => setActiveTab(tab as TabName)} />, 'Market Analysis')}
        {activeTab === 'signals' && gated(<Signals onNavigate={(tab: string) => setActiveTab(tab as TabName)} />, 'Premium Signals')}
        {activeTab === 'calendar' && gated(<EconomicCalendar />, 'Economic Calendar')}
        {activeTab === 'education' && gated(<Education />, 'Trading Academy')}
        {activeTab === 'community' && gated(<Community />, 'Community Chat')}
        {activeTab === 'leaderboard' && gated(<Leaderboard />, 'Leaderboard')}
        {activeTab === 'chart-analysis' && gated(<ChartAnalysis onNavigate={(tab: string) => setActiveTab(tab as TabName)} />, 'AI Chart Scanner')}
        {activeTab === 'risk-calc' && gated(<RiskCalculator />, 'Risk Calculator')}
        {activeTab === 'sentiment' && gated(<Sentiment />, 'Market Sentiment')}
        {activeTab === 'ai-assistant' && gated(<AIAssistant />, 'MP-Voice AI')}
        {activeTab === 'journal' && gated(<Journal />, 'Trade Journal')}
        {activeTab === 'profile' && <Profile onNavigate={setCurrentPage} />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
