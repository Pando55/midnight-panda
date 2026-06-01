import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ScanLine, Play, Square, Loader2, TrendingUp, TrendingDown, Eye, AlertTriangle } from 'lucide-react';

type Sentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
type Reliability = 'HIGH' | 'MEDIUM' | 'LOW';

interface OverlaySignal {
  sentiment: Sentiment;
  confidence: number;
  reliability: Reliability;
  summary: string;
  entry?: { price: string; reason: string };
  stopLoss?: { price: string; reason: string };
  takeProfit?: { price: string; reason: string };
  riskReward?: string;
  warning?: string;
  ts: number;
}

export default function LiveOverlay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [signal, setSignal] = useState<OverlaySignal | null>(null);
  const [pair, setPair] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('M15');
  const [intervalSec, setIntervalSec] = useState(20);
  const strategy = (localStorage.getItem('mp_strategy') || 'intraday') as string;

  const stop = () => {
    if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsStreaming(false);
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    try {
      // @ts-ignore - getDisplayMedia exists at runtime
      const stream: MediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 2 } as any,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      stream.getVideoTracks()[0].addEventListener('ended', stop);
      setIsStreaming(true);
      toast({ title: 'Overlay live', description: 'AI is now watching your chart.' });
      // First scan immediately, then on interval
      scanFrame();
      intervalRef.current = window.setInterval(scanFrame, intervalSec * 1000);
    } catch (e: any) {
      toast({
        title: 'Screen share denied',
        description: e?.message || 'Your device may not support screen capture in a browser.',
        variant: 'destructive',
      });
    }
  };

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isScanning) return;
    const v = videoRef.current;
    if (!v.videoWidth) return;
    setIsScanning(true);
    try {
      const c = canvasRef.current;
      const maxW = 1280;
      const scale = Math.min(1, maxW / v.videoWidth);
      c.width = Math.floor(v.videoWidth * scale);
      c.height = Math.floor(v.videoHeight * scale);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.7);
      const base64 = dataUrl.split(',')[1];

      const { data, error } = await supabase.functions.invoke('analyze-chart', {
        body: {
          imageBase64: base64,
          mimeType: 'image/jpeg',
          pair,
          timeframe,
          strategy,
          notes: 'Live overlay scan — read price + structure directly from the visible chart.',
        },
      });
      if (error) throw error;
      const a = data?.analysis;
      if (!a) throw new Error('No analysis returned');
      setSignal({
        sentiment: a.sentiment,
        confidence: a.confidence,
        reliability: a.reliability,
        summary: a.summary,
        entry: a.entry,
        stopLoss: a.stopLoss,
        takeProfit: a.takeProfit,
        riskReward: a.riskReward,
        warning: a.warning,
        ts: Date.now(),
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Scan failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setIsScanning(false);
    }
  };

  const sentColor = (s?: Sentiment) =>
    s === 'BULLISH' ? 'bg-trading-green text-white'
    : s === 'BEARISH' ? 'bg-trading-red text-white'
    : 'bg-muted text-foreground';

  const relColor = (r?: Reliability) =>
    r === 'HIGH' ? 'bg-trading-green/20 text-trading-green border-trading-green/40'
    : r === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
    : 'bg-trading-red/20 text-trading-red border-trading-red/40';

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="w-6 h-6 text-trading-orange" />
        <h1 className="text-2xl font-bold">AI Live Overlay</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Share your chart window (MT4/MT5, TradingView, broker app) and the AI reads price action in real time.
      </p>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Pair</Label>
            <Input value={pair} onChange={(e) => setPair(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs">Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['M1','M5','M15','M30','H1','H4','D1','W1'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Scan every (sec)</Label>
            <Input type="number" min={10} max={120} value={intervalSec}
              onChange={(e) => setIntervalSec(Math.max(10, parseInt(e.target.value) || 20))} />
          </div>
          <div>
            <Label className="text-xs">Strategy</Label>
            <Input value={strategy} disabled className="capitalize" />
          </div>
        </div>

        {!isStreaming ? (
          <Button onClick={start} className="w-full bg-trading-orange hover:bg-trading-orange/90">
            <Play className="w-4 h-4 mr-2" /> Start Overlay (Share Chart)
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={scanFrame} disabled={isScanning} className="flex-1">
              {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanLine className="w-4 h-4 mr-2" />}
              Scan Now
            </Button>
            <Button onClick={stop} variant="destructive" className="flex-1">
              <Square className="w-4 h-4 mr-2" /> Stop
            </Button>
          </div>
        )}
      </Card>

      <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video">
        <video ref={videoRef} className="w-full h-full object-contain" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <Eye className="w-10 h-10 mb-3 text-trading-orange/60" />
            <p className="text-sm">Tap <b>Start Overlay</b> and pick your chart window or tab.</p>
            <p className="text-xs mt-1">Tip: On mobile, share your browser tab with TradingView open.</p>
          </div>
        )}

        {isStreaming && isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-0 right-0 h-0.5 bg-trading-orange shadow-[0_0_20px_rgba(255,107,0,0.8)] animate-scan-line" />
          </div>
        )}

        {signal && (
          <div className="absolute top-2 left-2 right-2 backdrop-blur-md bg-background/80 border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Badge className={sentColor(signal.sentiment)}>
                {signal.sentiment === 'BULLISH' ? <TrendingUp className="w-3 h-3 mr-1" /> : signal.sentiment === 'BEARISH' ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                {signal.sentiment} · {signal.confidence}%
              </Badge>
              <Badge variant="outline" className={relColor(signal.reliability)}>{signal.reliability}</Badge>
              {signal.riskReward && <Badge variant="outline">RR {signal.riskReward}</Badge>}
            </div>
            <p className="text-xs text-foreground/90 leading-snug">{signal.summary}</p>
            {(signal.entry || signal.stopLoss || signal.takeProfit) && (
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="bg-card/60 rounded p-1.5">
                  <div className="text-muted-foreground">Entry</div>
                  <div className="font-mono font-bold">{signal.entry?.price || '—'}</div>
                </div>
                <div className="bg-trading-red/10 rounded p-1.5">
                  <div className="text-muted-foreground">SL</div>
                  <div className="font-mono font-bold text-trading-red">{signal.stopLoss?.price || '—'}</div>
                </div>
                <div className="bg-trading-green/10 rounded p-1.5">
                  <div className="text-muted-foreground">TP</div>
                  <div className="font-mono font-bold text-trading-green">{signal.takeProfit?.price || '—'}</div>
                </div>
              </div>
            )}
            {signal.warning && (
              <div className="flex items-start gap-1.5 text-[10px] text-yellow-400">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{signal.warning}</span>
              </div>
            )}
            <div className="text-[9px] text-muted-foreground text-right">
              Updated {new Date(signal.ts).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      <Card className="p-3 text-xs text-muted-foreground">
        <p><b className="text-foreground">How it works:</b> The AI samples a frame from your shared chart every {intervalSec}s, reads price & structure, and overlays a live signal. Your screen never leaves your device — only a single frame is sent for analysis.</p>
      </Card>
    </div>
  );
}
