import { Lock, Key } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LicenseGateProps {
  children: React.ReactNode;
  feature?: string;
  onGoToProfile: () => void;
}

export default function LicenseGate({ children, feature = 'this feature', onGoToProfile }: LicenseGateProps) {
  const { checkLicenseValidity } = useAuth();
  if (checkLicenseValidity()) return <>{children}</>;

  return (
    <div className="min-h-screen pb-24 bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-sm animate-slide-up">
        <div className="mx-auto w-24 h-24 rounded-full bg-trading-orange/15 border border-trading-orange/40 flex items-center justify-center mb-5 relative">
          <Lock className="w-12 h-12 text-trading-orange" />
          <div className="absolute inset-0 rounded-full border-2 border-trading-orange/30 animate-ping" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">License Key Required</h2>
        <p className="text-muted-foreground mb-5">
          {feature} is reserved for licensed members. Activate a key to unlock the full Midnight Panda arsenal.
        </p>
        <button
          onClick={onGoToProfile}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-trading-orange text-foreground font-semibold hover:opacity-90 transition-opacity"
        >
          <Key className="w-4 h-4" /> Activate License
        </button>
        <p className="text-xs text-muted-foreground mt-4">WhatsApp 078 427 8143 to purchase a key.</p>
      </div>
    </div>
  );
}
