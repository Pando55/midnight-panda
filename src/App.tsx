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
import Profile from '@/pages/Profile';
import BottomNav from '@/components/BottomNav';
import InstallBanner from '@/components/InstallBanner';
import { Loader2 } from 'lucide-react';
import type { TabName } from '@/types';

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

  useEffect(() => {
    if (isAuthenticated && currentPage !== 'dashboard') setCurrentPage('dashboard');
  }, [isAuthenticated, currentPage]);

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

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        {activeTab === 'dashboard' && <Dashboard onNavigate={(tab: string) => setActiveTab(tab as TabName)} />}
        {activeTab === 'analyze' && <Analyze onNavigate={(tab: string) => setActiveTab(tab as TabName)} />}
        {activeTab === 'signals' && <Signals onNavigate={(tab: string) => setActiveTab(tab as TabName)} />}
        {activeTab === 'calendar' && <EconomicCalendar />}
        {activeTab === 'risk-calc' && <RiskCalculator />}
        {activeTab === 'profile' && <Profile onNavigate={setCurrentPage} />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
