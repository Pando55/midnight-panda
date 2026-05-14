import { useState, useMemo } from 'react';
import { Copy, Check, Download, ExternalLink, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCopy } from '@/hooks/useCopy';
import { formatPrice } from '@/lib/data';
import { cn } from '@/lib/utils';
import type { TradingSignal } from '@/types';

interface SendToBrokerDialogProps {
  signal: TradingSignal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Strip slashes/spaces — MT symbols are usually e.g. EURUSD, XAUUSD
function normalizeSymbol(asset: string): string {
  return asset.replace(/[\s/]/g, '').toUpperCase();
}

export default function SendToBrokerDialog({ signal, open, onOpenChange }: SendToBrokerDialogProps) {
  const [lotSize, setLotSize] = useState('0.01');
  const [platform, setPlatform] = useState<'mt4' | 'mt5'>('mt5');
  const { copied, copy } = useCopy();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const symbol = signal ? normalizeSymbol(signal.asset) : '';

  const orderTicket = useMemo(() => {
    if (!signal) return '';
    return [
      `=== MIDNIGHT PANDA ORDER TICKET ===`,
      `Symbol:    ${symbol}`,
      `Type:      ${signal.direction} ${signal.direction === 'BUY' ? 'LIMIT/MARKET' : 'LIMIT/MARKET'}`,
      `Volume:    ${lotSize} lots`,
      `Entry:     ${formatPrice(signal.entryPrice, signal.category)}`,
      `Stop Loss: ${formatPrice(signal.stopLoss, signal.category)}`,
      `Take Prft: ${formatPrice(signal.takeProfit, signal.category)}`,
      ``,
      `Platform:  ${platform.toUpperCase()}`,
      `Generated: ${new Date().toLocaleString()}`,
    ].join('\n');
  }, [signal, symbol, lotSize, platform]);

  if (!signal) return null;

  const handleCopy = (value: string, field: string) => {
    copy(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Deep link to open MetaTrader mobile app on the symbol's chart.
  // Supported scheme: metatrader5://chart?symbol=XYZ (mt4 analogous).
  const deepLink = platform === 'mt5'
    ? `metatrader5://chart?symbol=${symbol}`
    : `metatrader4://chart?symbol=${symbol}`;

  const downloadTicket = () => {
    const blob = new Blob([orderTicket], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${symbol}_${signal.direction}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fields = [
    { label: 'Symbol', value: symbol },
    { label: 'Direction', value: signal.direction },
    { label: 'Volume (lots)', value: lotSize },
    { label: 'Entry', value: formatPrice(signal.entryPrice, signal.category) },
    { label: 'Stop Loss', value: formatPrice(signal.stopLoss, signal.category) },
    { label: 'Take Profit', value: formatPrice(signal.takeProfit, signal.category) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send to MT4 / MT5</DialogTitle>
          <DialogDescription>
            Open this signal in MetaTrader and place the order in seconds.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={platform} onValueChange={(v) => setPlatform(v as 'mt4' | 'mt5')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="mt5">MetaTrader 5</TabsTrigger>
            <TabsTrigger value="mt4">MetaTrader 4</TabsTrigger>
          </TabsList>

          <TabsContent value={platform} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="lot" className="text-xs">Lot size</Label>
              <Input
                id="lot"
                type="number"
                step="0.01"
                min="0.01"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                className="bg-secondary"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Adjust based on your risk per trade.
              </p>
            </div>

            {/* Quick copy fields */}
            <div className="space-y-2">
              {fields.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase">{f.label}</p>
                    <p className="text-sm font-mono text-foreground truncate">{f.value}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(f.value, f.label)}
                    className="ml-2 p-2 rounded hover:bg-background transition-colors shrink-0"
                  >
                    {copiedField === f.label ? (
                      <Check className="w-4 h-4 text-trading-green" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 gap-2 pt-2">
              <Button
                onClick={() => handleCopy(orderTicket, 'ticket')}
                variant="secondary"
                className="w-full justify-start"
              >
                {copiedField === 'ticket' ? (
                  <Check className="w-4 h-4 mr-2 text-trading-green" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Copy full order ticket
              </Button>

              <Button onClick={downloadTicket} variant="secondary" className="w-full justify-start">
                <Download className="w-4 h-4 mr-2" />
                Download as .txt
              </Button>

              <a
                href={deepLink}
                className={cn(
                  'inline-flex items-center justify-start gap-2 w-full rounded-md px-4 py-2 text-sm font-medium',
                  'bg-trading-orange text-foreground hover:opacity-90 transition-opacity'
                )}
              >
                <Smartphone className="w-4 h-4" />
                Open {platform.toUpperCase()} on {symbol}
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </div>

            <div className="rounded-lg border border-border bg-card/50 p-3 text-[11px] text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-1">How it works</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Tap <strong>Open {platform.toUpperCase()}</strong> — your MetaTrader app launches on this symbol.</li>
                <li>Tap "New Order" inside MT, paste the values above (already copied to your clipboard).</li>
                <li>Confirm the trade. Done.</li>
              </ol>
              <p className="mt-2">
                Need help connecting your broker? WhatsApp <strong>078 427 8143</strong>.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
