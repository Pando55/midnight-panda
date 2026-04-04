import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { isValidEmail, getPasswordStrength } from '@/lib/utils';

interface SignupProps {
  onNavigate: (page: 'login' | 'signup' | 'dashboard') => void;
}

export default function Signup({ onNavigate }: SignupProps) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!isValidEmail(email)) { setError('Please enter a valid email'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setIsLoading(true);
    const success = await signup(email, password, name);
    setIsLoading(false);
    if (success) { onNavigate('dashboard'); } else { setError('Signup failed. Please try again.'); }
  };

  const strengthColors = { weak: 'bg-trading-red', medium: 'bg-yellow-500', strong: 'bg-trading-green' };
  const strengthWidth = { weak: 'w-1/3', medium: 'w-2/3', strong: 'w-full' };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background via-background to-midnight-light overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-trading-orange/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="relative z-10 text-center mb-6">
        <img src="/panda-logo.png" alt="Midnight Panda" className="w-24 h-24 mx-auto mb-4 animate-float" />
        <h1 className="text-4xl font-display tracking-wider text-foreground">
          MIDNIGHT <span className="text-trading-orange text-glow">PANDA</span>
        </h1>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">Create Account</h2>
          {error && <div className="mb-4 p-3 rounded-lg bg-trading-red/10 border border-trading-red/30 text-trading-red text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground focus:border-trading-orange" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground focus:border-trading-orange" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-background border-border text-foreground focus:border-trading-orange" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                    <div className={`h-full ${strengthColors[passwordStrength]} ${strengthWidth[passwordStrength]} transition-all`} />
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{passwordStrength}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground focus:border-trading-orange" />
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full btn-primary h-12 text-lg">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </form>
          <p className="text-center text-muted-foreground mt-6">
            Already have an account?{' '}
            <button onClick={() => onNavigate('login')} className="text-trading-orange hover:text-trading-orange-light font-semibold transition-colors">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}
