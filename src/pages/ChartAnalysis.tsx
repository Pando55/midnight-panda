import { useState, useRef } from 'react';
import { Upload, Loader2, Target, AlertTriangle, TrendingUp, Shield, BarChart3, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChartAnalysisProps {
  onNavigate: (page: string) => void;
}

interface ChartAIAnalysis {
  asset: string;
  timeframe: string;
  sentiment: string;
  confidence: number;
  summary: string;
  patterns: string[];
  entry: { price: string; reason: string };
  stopLoss: { price: string; reason: string };
  takeProfit: { price: string; reason: string };
  riskReward: string;
  keyLevels: string[];
  indicators: string[];
  warning: string;
}

export default function ChartAnalysis({ onNavigate }: ChartAnalysisProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pair, setPair] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [notes, setNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ChartAIAnalysis | null>(null);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setAnalysis(null);
    setError('');
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setAnalysis(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setError('');
    setAnalysis(null);

    try {
      const imageBase64 = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type || 'image/jpeg';

      const { data, error: fnError } = await supabase.functions.invoke('analyze-chart', {
        body: { imageBase64, mimeType, pair, timeframe, notes },
      });

      if (fnError) throw new Error(fnError.message || 'Analysis failed');
      if (data?.error) throw new Error(data.error);
      if (data?.analysis) {
        setAnalysis(data.analysis);
      } else {
        throw new Error('No analysis returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground font-display">📊 Chart Analysis</h1>
          <p className="text-sm text-muted-foreground">Upload your chart for AI-powered Entry, SL & TP</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Upload area */}
        {!preview ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/50 transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Tap to upload chart</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG — max 5MB</p>
            </div>
          </button>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img src={preview} alt="Chart preview" className="w-full max-h-64 object-contain bg-card" />
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Optional details */}
        {preview && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Pair (optional)</label>
                <Input
                  placeholder="e.g. EUR/USD"
                  value={pair}
                  onChange={e => setPair(e.target.value)}
                  className="bg-card border-border text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Timeframe (optional)</label>
                <Input
                  placeholder="e.g. H4, D1"
                  value={timeframe}
                  onChange={e => setTimeframe(e.target.value)}
                  className="bg-card border-border text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
              <Textarea
                placeholder="Any context about your setup..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="bg-card border-border text-sm resize-none"
                rows={2}
              />
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Chart...</>
              ) : (
                <><BarChart3 className="w-4 h-4" /> Analyze My Chart</>
              )}
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Analysis result */}
        {analysis && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-card rounded-xl p-4 border border-primary/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{analysis.asset}</h3>
                  <span className="text-xs text-muted-foreground">{analysis.timeframe}</span>
                </div>
                <span className={cn('px-3 py-1 rounded-full text-xs font-bold border',
                  analysis.sentiment === 'BULLISH' ? 'bg-[hsl(var(--trading-green))]/20 text-[hsl(var(--trading-green))] border-[hsl(var(--trading-green))]/30' :
                  analysis.sentiment === 'BEARISH' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30')}>
                  {analysis.sentiment} ({analysis.confidence}%)
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{analysis.summary}</p>
            </div>

            {analysis.patterns.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Patterns Identified</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.patterns.map((p, i) => (
                    <span key={i} className="px-2.5 py-1 text-xs rounded-lg bg-primary/10 text-primary border border-primary/20">{p}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
                    <Target className="w-3 h-3" /> Entry
                  </span>
                  <span className="text-lg font-mono font-bold text-primary">{analysis.entry.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">{analysis.entry.reason}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Stop Loss
                  </span>
                  <span className="text-lg font-mono font-bold text-destructive">{analysis.stopLoss.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">{analysis.stopLoss.reason}</p>
              </div>
              <div className="p-3 rounded-lg bg-[hsl(var(--trading-green))]/5 border border-[hsl(var(--trading-green))]/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Take Profit
                  </span>
                  <span className="text-lg font-mono font-bold text-[hsl(var(--trading-green))]">{analysis.takeProfit.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">{analysis.takeProfit.reason}</p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Risk : Reward</p>
              <p className="text-2xl font-bold text-foreground">{analysis.riskReward}</p>
            </div>

            {analysis.keyLevels.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Key Levels</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.keyLevels.map((lv, i) => (
                    <span key={i} className="px-2 py-1 text-xs font-mono rounded bg-secondary text-foreground">{lv}</span>
                  ))}
                </div>
              </div>
            )}

            {analysis.indicators.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Indicators</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.indicators.map((ind, i) => (
                    <span key={i} className="px-2 py-1 text-xs rounded-lg bg-muted text-muted-foreground">{ind}</span>
                  ))}
                </div>
              </div>
            )}

            {analysis.warning && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {analysis.warning}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
