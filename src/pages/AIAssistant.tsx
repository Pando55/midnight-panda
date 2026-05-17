import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Sparkles, Lock, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasFeature } from '@/lib/licenseTiers';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Msg { role: 'user' | 'assistant'; content: string; }

// Web Speech API typings (loose)
type AnySpeech = any;

export default function AIAssistant() {
  const { license, checkLicenseValidity } = useAuth();
  const hasAccess = checkLicenseValidity() && hasFeature(license?.duration, 'aiVoiceAssistant');

  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "MP-Voice online. Ask for a market read, a signal, or talk strategy. I'm listening." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const recRef = useRef<AnySpeech>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const speak = (text: string) => {
    if (!voiceOn || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 0.95;
    window.speechSynthesis.speak(u);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const next = [...messages, { role: 'user' as const, content: text.trim() }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: { messages: next.map(m => ({ role: m.role, content: m.content })) },
      });
      if (error || !data?.reply) throw new Error(error?.message ?? 'No response');
      setMessages([...next, { role: 'assistant', content: data.reply }]);
      speak(data.reply);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: 'Connection lost. Try again in a sec.' }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleListen = () => {
    const SR: AnySpeech = (window as AnySpeech).SpeechRecognition || (window as AnySpeech).webkitSpeechRecognition;
    if (!SR) { alert('Voice input not supported on this browser. Use Chrome on Android.'); return; }
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.continuous = false;
    rec.onresult = (e: AnySpeech) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      sendMessage(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen pb-24 bg-background flex flex-col">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" /> MP-Voice AI
          </h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="mx-auto w-20 h-20 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mb-4">
              <Lock className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">P-Legend Only</h2>
            <p className="text-muted-foreground mb-4">
              The MP-Voice AI Assistant is exclusive to <span className="text-purple-400 font-semibold">Lifetime members</span>.
              Talk to it. Ask for signals. No charts needed.
            </p>
            <p className="text-xs text-muted-foreground">WhatsApp 078 427 8143 to upgrade.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" /> MP-Voice AI
        </h1>
        <button
          onClick={() => { setVoiceOn(v => !v); if (voiceOn) window.speechSynthesis?.cancel(); }}
          className="p-2 rounded-lg glass-card"
          title={voiceOn ? 'Mute voice' : 'Enable voice'}
        >
          {voiceOn ? <Volume2 className="w-4 h-4 text-trading-orange" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
              m.role === 'user'
                ? 'bg-trading-orange text-foreground rounded-br-sm'
                : 'glass-card text-foreground rounded-bl-sm border border-purple-500/20'
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="glass-card rounded-2xl rounded-bl-sm px-4 py-3 border border-purple-500/20">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border bg-background/95 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleListen}
            className={cn(
              'p-3 rounded-full transition-all',
              listening ? 'bg-trading-red animate-pulse' : 'bg-purple-500/20 border border-purple-500/40'
            )}
            title="Voice input"
          >
            {listening ? <MicOff className="w-5 h-5 text-foreground" /> : <Mic className="w-5 h-5 text-purple-400" />}
          </button>
          <Input
            placeholder='Ask MP-Voice… e.g. "Give me a XAUUSD signal"'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            disabled={loading}
            className="bg-background border-border text-foreground"
          />
          <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="btn-primary px-3">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <MessageSquare className="w-3 h-3" /> Tap mic to talk. Tap speaker to mute responses.
        </p>
      </div>
    </div>
  );
}
