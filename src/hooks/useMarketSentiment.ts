import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SentimentData {
  asset: string;
  category: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  change: string;
  drivers: string[];
}

export function useMarketSentiment() {
  const [data, setData] = useState<SentimentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const { data: res, error: err } = await supabase.functions.invoke('fetch-sentiment');
      if (err) throw new Error(err.message);
      if (res?.error) throw new Error(res.error);
      if (res?.sentiments) setData(res.sentiments);
    } catch (e) {
      console.error('Sentiment fetch failed:', e);
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, isLoading, error, refresh: fetch_ };
}
