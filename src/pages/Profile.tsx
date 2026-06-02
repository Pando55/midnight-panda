import { useState } from 'react';
import { User, Key, Calendar, Check, Copy, LogOut, Clock, AlertCircle, Loader2, Crown, Mail, Trash2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCopy } from '@/hooks/useCopy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, isValidEmail } from '@/lib/utils';
import { hasFeature } from '@/lib/licenseTiers';
import type { LicenseDuration } from '@/types';

interface ProfileProps { onNavigate: (page: 'login' | 'signup' | 'dashboard') => void; }

const LICENSE_TIERS: { duration: LicenseDuration; label: string; color: string }[] = [
  { duration: '3months', label: '3 Months', color: 'bg-blue-500' },
  { duration: '6months', label: '6 Months', color: 'bg-cyan-500' },
  { duration: '12months', label: '12 Months', color: 'bg-trading-orange' },
  { duration: '18months', label: '18 Months', color: 'bg-yellow-500' },
  { duration: 'lifetime', label: 'Lifetime', color: 'bg-purple-500' },
];

export default function Profile({ onNavigate }: ProfileProps) {
  const { user, license, logout, activateLicense, checkLicenseValidity, isAdmin, getGeneratedKeys, generateAndStoreKey, deactivateKey, deleteKey } = useAuth();
  const { copied, copy } = useCopy();
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [genEmail, setGenEmail] = useState('');
  const [selectedTier, setSelectedTier] = useState<LicenseDuration>('3months');
  const [showGeneratedKey, setShowGeneratedKey] = useState<string | null>(null);

  const hasValidLicense = checkLicenseValidity();
  const generatedKeys = getGeneratedKeys();
  const admin = isAdmin();

  const handleActivate = async () => {
    setActivationError('');
    setActivationSuccess(false);
    if (!licenseKey.trim()) { setActivationError('Please enter a license key'); return; }
    setIsActivating(true);
    const success = await activateLicense(licenseKey.trim().toUpperCase());
    setIsActivating(false);
    if (success) { setActivationSuccess(true); setLicenseKey(''); } 
    else { setActivationError('Invalid or inactive license key. Format: P-XXXX-XXXX-XXXX'); }
  };

  const handleGenerateKey = async () => {
    if (!isValidEmail(genEmail.trim())) { setActivationError('Please enter a valid email'); return; }
    const newKey = await generateAndStoreKey(genEmail.trim(), selectedTier);
    if (!newKey) { setActivationError('Failed to generate key. Are you signed in as admin?'); return; }
    setShowGeneratedKey(newKey.id);
    setGenEmail('');
    setActivationError('');
  };

  const handleLogout = () => { logout(); onNavigate('login'); };

  const getExpirationText = () => {
    if (!license) return 'No license';
    if (license.duration === 'lifetime') return 'Never expires';
    if (!license.expiresAt) return 'Unknown';
    const daysLeft = Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'Expired';
    if (daysLeft === 0) return 'Expires today';
    return `${daysLeft} days remaining`;
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-4"><h1 className="text-xl font-semibold text-foreground">My Account</h1></div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Profile Card */}
        {(() => {
          const isLegend = license?.duration === 'lifetime' && hasValidLicense;
          return (
            <div className={cn(
              'glass-card rounded-xl p-6 text-center',
              isLegend && 'border-2 border-yellow-500/60 shadow-[0_0_40px_rgba(234,179,8,0.25)] bg-gradient-to-br from-yellow-500/5 to-transparent'
            )}>
              <div className="relative inline-block mb-4">
                <div className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center',
                  isLegend
                    ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-700 ring-4 ring-yellow-500/30'
                    : 'bg-gradient-to-br from-trading-orange to-trading-orange-light'
                )}>
                  {isLegend
                    ? <Crown className="w-10 h-10 text-background" />
                    : <User className="w-10 h-10 text-foreground" />}
                </div>
                {hasValidLicense && !isLegend && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-trading-green flex items-center justify-center border-2 border-card">
                    <Check className="w-4 h-4 text-foreground" />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-semibold text-foreground">{user?.name || 'Trader'}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className={cn('px-3 py-1 rounded-full text-xs font-semibold border',
                  hasValidLicense ? 'bg-trading-green/20 text-trading-green border-trading-green/30' : 'bg-trading-red/20 text-trading-red border-trading-red/30')}>
                  {hasValidLicense ? 'Premium Active' : 'Free Plan'}
                </span>
                {isLegend && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold border bg-gradient-to-r from-yellow-500/30 to-yellow-700/30 text-yellow-300 border-yellow-500/50 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> FOUNDERS ACCESS
                  </span>
                )}
                {admin && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-trading-orange/20 text-trading-orange border-trading-orange/30">Admin</span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Strategy Mode (Elite+) */}
        <StrategyModeCard />

        {/* License Status */}
        {license && (
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">License Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center gap-2 text-muted-foreground"><Key className="w-4 h-4" /><span className="text-sm">Key</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground font-mono">{license.key.slice(0, 8)}...{license.key.slice(-4)}</span>
                  <button onClick={() => copy(license.key)} className="copy-btn">{copied ? <Check className="w-3 h-3 text-trading-green" /> : <Copy className="w-3 h-3" />}</button>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center gap-2 text-muted-foreground"><Crown className="w-4 h-4" /><span className="text-sm">Plan</span></div>
                <span className="text-sm text-foreground capitalize">{LICENSE_TIERS.find(t => t.duration === license.duration)?.label}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4" /><span className="text-sm">Activated</span></div>
                <span className="text-sm text-foreground">{new Date(license.activatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" /><span className="text-sm">Status</span></div>
                <span className={cn('text-sm font-semibold', hasValidLicense ? 'text-trading-green' : 'text-trading-red')}>{getExpirationText()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Telegram MT5 bridge */}
        <TelegramBridgeCard />


        {/* License Activation (for all users) */}
        {!hasValidLicense && (
          <div className="glass-card rounded-xl p-5 space-y-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Activate License</h3>
            {activationError && (
              <div className="p-3 rounded-lg bg-trading-red/10 border border-trading-red/30 text-trading-red text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />{activationError}
              </div>
            )}
            {activationSuccess && (
              <div className="p-3 rounded-lg bg-trading-green/10 border border-trading-green/30 text-trading-green text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />License activated successfully!
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">License Key (P-XXXX-XXXX-XXXX)</Label>
              <Input placeholder="P-XXXX-XXXX-XXXX" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                className="bg-background border-border text-foreground font-mono tracking-wider focus:border-trading-orange" maxLength={16} />
            </div>
            <Button onClick={handleActivate} disabled={isActivating} className="w-full btn-primary">
              {isActivating ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Activate <Key className="w-4 h-4 ml-2" /></>}
            </Button>
          </div>
        )}

        {/* Admin: Key Generator */}
        {admin && (
          <div className="glass-card rounded-xl p-5 space-y-5 border border-trading-orange/30">
            <h3 className="text-sm font-semibold text-trading-orange uppercase tracking-wider flex items-center gap-2">
              <Crown className="w-4 h-4" /> Admin — License Key Generator
            </h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="w-4 h-4" /> Client Email</Label>
                <Input placeholder="client@example.com" value={genEmail} onChange={(e) => setGenEmail(e.target.value)}
                  className="bg-background border-border text-foreground focus:border-trading-orange" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">License Duration</Label>
                <div className="grid grid-cols-2 gap-2">
                  {LICENSE_TIERS.map(tier => (
                    <button key={tier.duration} onClick={() => setSelectedTier(tier.duration)}
                      className={cn('py-2 px-3 rounded-lg text-sm font-medium transition-all border',
                        selectedTier === tier.duration ? 'bg-trading-orange text-foreground border-trading-orange' : 'glass-card text-muted-foreground border-border')}>
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleGenerateKey} className="w-full btn-primary">Generate Key</Button>
            </div>

            {/* Generated Keys List */}
            {generatedKeys.length > 0 && (
              <div className="space-y-3 mt-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Generated Keys ({generatedKeys.length})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {generatedKeys.map(gk => (
                    <div key={gk.id} className={cn('p-3 rounded-lg border transition-all',
                      showGeneratedKey === gk.id ? 'border-trading-orange/50 bg-trading-orange/5' : 'border-border bg-background/50',
                      !gk.isActive && 'opacity-50')}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{gk.email}</span>
                        <div className="flex items-center gap-1">
                          <span className={cn('px-2 py-0.5 text-[10px] rounded',
                            gk.isActive ? 'bg-trading-green/20 text-trading-green' : 'bg-trading-red/20 text-trading-red')}>
                            {gk.isActive ? 'Active' : 'Deactivated'}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">
                            {LICENSE_TIERS.find(t => t.duration === gk.duration)?.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-foreground">{gk.key}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => copy(gk.key)} className="copy-btn p-1">
                            {copied ? <Check className="w-3 h-3 text-trading-green" /> : <Copy className="w-3 h-3" />}
                          </button>
                          {gk.isActive && (
                            <button onClick={() => deactivateKey(gk.id)} className="p-1 text-muted-foreground hover:text-trading-red transition-colors" title="Deactivate">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => deleteKey(gk.id)} className="p-1 text-muted-foreground hover:text-trading-red transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(gk.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <Button onClick={handleLogout} variant="outline" className="w-full border-border text-muted-foreground hover:text-trading-red hover:border-trading-red/30">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}

function StrategyModeCard() {
  const { license, checkLicenseValidity } = useAuth();
  const valid = checkLicenseValidity();
  const allowed = valid && hasFeature(license?.duration, 'strategyMode');
  const [mode, setMode] = useState<string>(() => localStorage.getItem('mp_strategy_mode') || 'intraday');

  if (!allowed) return null;
  const options = [
    { id: 'scalping', label: 'Scalping', desc: 'M1–M5 · fast entries', icon: '⚡' },
    { id: 'intraday', label: 'Intraday', desc: 'M15–H1 · same-day', icon: '📈' },
    { id: 'swing', label: 'Swing', desc: 'H4–D · multi-day bias', icon: '🌊' },
  ];

  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        🧠 Strategy Mode
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {options.map(o => (
          <button
            key={o.id}
            onClick={() => { setMode(o.id); localStorage.setItem('mp_strategy_mode', o.id); }}
            className={cn(
              'rounded-xl p-3 text-center transition-all border',
              mode === o.id
                ? 'border-trading-orange bg-trading-orange/10 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="text-xl mb-1">{o.icon}</div>
            <div className="text-xs font-semibold">{o.label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{o.desc}</div>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">Signals and AI analysis adapt to your selected style.</p>
    </div>
  );
}

function TelegramBridgeCard() {
  const { user } = useAuth();
  const [chatId, setChatId] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // lazy import to avoid top-level cycles
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { supabase } = require('@/integrations/supabase/client') as typeof import('@/integrations/supabase/client');

  useState(() => {
    if (!user) { setLoading(false); return; }
    (supabase.from('profiles') as any)
      .select('telegram_chat_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.telegram_chat_id) setChatId(data.telegram_chat_id);
        setLoading(false);
      });
  });

  const save = async () => {
    if (!user) return;
    setSaving(true); setErr('');
    const { error } = await (supabase.from('profiles') as any)
      .update({ telegram_chat_id: chatId.trim() || null })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="glass-card rounded-xl p-5 space-y-3 border border-trading-orange/20">
      <h3 className="text-sm font-semibold text-trading-orange uppercase tracking-wider">MT4 / MT5 Telegram Bridge</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Connect a Telegram channel so signals auto-post in a copier-bot-friendly format. Pair with <b>TeleTrader</b>, <b>TelegramFX Copier</b>, or <b>Profit-Way</b> on your MT5 to fire trades hands-free.
      </p>
      <ol className="text-[11px] text-muted-foreground list-decimal pl-4 space-y-1">
        <li>Create a private Telegram channel.</li>
        <li>Add <b>@MidnightPandaBot</b> as admin (or message <b>@userinfobot</b> to grab your chat ID).</li>
        <li>Paste your numeric chat ID below (e.g. <code className="text-foreground">-1001234567890</code>).</li>
        <li>On MT5, install a Telegram copier EA and point it at the same channel.</li>
      </ol>
      <div className="space-y-2">
        <Label className="text-xs">Telegram Chat ID</Label>
        <Input
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="-1001234567890"
          className="bg-background border-border font-mono"
          disabled={loading}
        />
      </div>
      {err && <p className="text-xs text-trading-red">{err}</p>}
      <Button onClick={save} disabled={saving || loading} className="w-full btn-primary">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4 mr-2" /> Saved</> : 'Save Chat ID'}
      </Button>
    </div>
  );
}


