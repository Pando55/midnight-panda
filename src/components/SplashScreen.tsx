import { useEffect, useState } from 'react';

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 1800);
    const t2 = setTimeout(onDone, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        phase === 'out' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Pulse rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-40 h-40 rounded-full border-2 border-trading-orange/40 animate-ping" />
          <div className="absolute w-56 h-56 rounded-full border border-trading-orange/20 animate-ping [animation-delay:0.4s]" />
        </div>
        {/* Logo */}
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-trading-orange/30 to-trading-orange/5 border border-trading-orange/50 flex items-center justify-center shadow-[0_0_60px_rgba(255,107,0,0.4)]">
          <img src="/panda-logo.png" alt="Midnight Panda" className="w-24 h-24 animate-pulse" />
          {/* Scanning line */}
          <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-trading-orange to-transparent animate-[scan_1.8s_ease-in-out_infinite]" />
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground tracking-wider">
          MIDNIGHT <span className="text-trading-orange">PANDA</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground uppercase tracking-[0.3em]">Scanning markets…</p>
      </div>
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
