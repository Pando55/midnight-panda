import { useState } from 'react';
import { Calendar, AlertTriangle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEconomicCalendar } from '@/hooks/useEconomicCalendar';
import type { EconomicEvent } from '@/types';

export default function EconomicCalendar() {
  const { events, isLoading, error, refresh } = useEconomicCalendar();
  const [impactFilter, setImpactFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');

  const currencies = [...new Set(events.map(e => e.currency))];

  const filtered = events.filter(e => {
    const matchesImpact = impactFilter === 'ALL' || e.impact === impactFilter;
    const matchesCurrency = currencyFilter === 'ALL' || e.currency === currencyFilter;
    return matchesImpact && matchesCurrency;
  }).sort((a, b) => a.date.getTime() - b.date.getTime());

  const grouped = filtered.reduce<Record<string, EconomicEvent[]>>((acc, event) => {
    const dateKey = event.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  const impactColors = {
    HIGH: 'bg-trading-red text-foreground',
    MEDIUM: 'bg-yellow-500 text-background',
    LOW: 'bg-trading-green text-foreground',
  };

  const countryFlags: Record<string, string> = {
    US: '🇺🇸', EU: '🇪🇺', UK: '🇬🇧', JP: '🇯🇵', AU: '🇦🇺', CN: '🇨🇳', CH: '🇨🇭', CA: '🇨🇦', NZ: '🇳🇿',
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-trading-orange" /> Economic Calendar
            </h1>
            <p className="text-sm text-muted-foreground">Live market-moving events</p>
          </div>
          <button onClick={refresh} disabled={isLoading}
            className="p-2 rounded-lg glass-card text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Impact Filter */}
        <div className="flex gap-2">
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(impact => (
            <button key={impact} onClick={() => setImpactFilter(impact)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                impactFilter === impact ? 'bg-trading-orange text-foreground' : 'glass-card text-muted-foreground')}>
              {impact === 'ALL' ? 'All' : impact}
            </button>
          ))}
        </div>

        {/* Currency Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button onClick={() => setCurrencyFilter('ALL')}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
              currencyFilter === 'ALL' ? 'bg-trading-orange text-foreground' : 'glass-card text-muted-foreground')}>All</button>
          {currencies.map(cur => (
            <button key={cur} onClick={() => setCurrencyFilter(cur)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                currencyFilter === cur ? 'bg-trading-orange text-foreground' : 'glass-card text-muted-foreground')}>{cur}</button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && events.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-trading-orange animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading live calendar...</span>
          </div>
        )}

        {/* Error State */}
        {error && events.length === 0 && (
          <div className="glass-card rounded-xl p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-trading-red mx-auto mb-3" />
            <p className="text-foreground font-semibold">Failed to load calendar</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <button onClick={refresh} className="mt-4 px-4 py-2 bg-trading-orange text-foreground rounded-lg text-sm font-medium">
              Retry
            </button>
          </div>
        )}

        {/* Events by Day */}
        {Object.entries(grouped).map(([dateStr, dayEvents]) => (
          <div key={dateStr}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-trading-orange" />
              <h3 className="text-sm font-semibold text-foreground">{dateStr}</h3>
              <span className="text-xs text-muted-foreground">({dayEvents.length} events)</span>
            </div>
            <div className="space-y-2">
              {dayEvents.map(event => (
                <div key={event.id} className="glass-card rounded-xl p-4 card-hover">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{countryFlags[event.country] || '🌐'}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.currency}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('px-1.5 py-0.5 text-[10px] font-bold rounded', impactColors[event.impact])}>{event.impact}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />{event.time}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    {event.forecast && (
                      <div><span className="text-muted-foreground">Forecast: </span><span className="text-foreground font-mono">{event.forecast}</span></div>
                    )}
                    {event.previous && (
                      <div><span className="text-muted-foreground">Previous: </span><span className="text-foreground font-mono">{event.previous}</span></div>
                    )}
                    {event.actual && (
                      <div><span className="text-muted-foreground">Actual: </span><span className="text-trading-green font-mono font-bold">{event.actual}</span></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {!isLoading && Object.keys(grouped).length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-semibold">No events found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
