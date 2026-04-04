import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EconomicEvent } from '@/types';

export function useEconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const { data, error: err } = await supabase.functions.invoke('fetch-economic-calendar');

      if (err) throw new Error(err.message);
      if (data?.error) throw new Error(data.error);
      if (data?.events && Array.isArray(data.events)) {
        const parsed: EconomicEvent[] = data.events.map((e: any) => ({
          ...e,
          date: new Date(e.date),
        }));
        setEvents(parsed);
      }
    } catch (e) {
      console.error('Failed to fetch economic calendar:', e);
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, isLoading, error, refresh: fetchEvents };
}
