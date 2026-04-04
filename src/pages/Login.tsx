import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, TrendingUp, Target, Zap } from 'lucide-react';
import { isValidEmail } from '@/lib/utils';

interface LoginProps {
  onNavigate: (page: 'login' | 'signup' | 'dashboard') => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) { setError('Please enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);
    if (success) { onNavigate('dashboard'); } else { setError('Invalid email or password'); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background via-background to-midnight-light overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-trading-orange/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-trading-orange/40 rounded-full animate-float" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-trading-orange/30 rounded-full animate-float animation-delay-200" />
      </div>

      <div className="relative z-10 text-center mb-6">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-trading-orange/30 blur-[60px] rounded-full scale-150 animate-pulse" />
          <img src="/panda-logo.png" alt="Midnight Panda" className="relative w-40 h-40 md:w-52 md:h-52 mx-auto animate-float drop-shadow-2xl" />
          <div className="absolute inset-0 -m-8 border-2 border-trading-orange/20 rounded-full animate-spin" style={{ animationDuration: '20s' }} />
        </div>
        <h1 className="text-5xl md:text-7xl font-display tracking-wider text-foreground mb-2">
          MIDNIGHT <span className="text-trading-orange text-glow">PANDA</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground tracking-wide">Precision Trading Signals</p>
        <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-full">
            <TrendingUp className="w-4 h-4 text-trading-green" />
            <span className="text-sm text-foreground">89% Accuracy</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-full">
            <Target className="w-4 h-4 text-trading-orange" />
            <span className="text-sm text-foreground">10K+ Traders</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-full">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-foreground">Real-Time</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 shadow-2xl border-trading-orange/20">
          <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">Welcome Back</h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-trading-red/10 border border-trading-red/30 text-trading-red text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-trading-orange focus:ring-trading-orange/20" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-trading-orange focus:ring-trading-orange/20" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(c as boolean)}
                  className="border-border data-[state=checked]:bg-trading-orange data-[state=checked]:border-trading-orange" />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</Label>
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full btn-primary h-12 text-lg">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-card text-muted-foreground">or</span></div>
          </div>
          <p className="text-center text-muted-foreground">
            Don't have an account?{' '}
            <button onClick={() => onNavigate('signup')} className="text-trading-orange hover:text-trading-orange-light font-semibold transition-colors">Sign up</button>
          </p>
        </div>
      </div>
    </div>
  );
}
