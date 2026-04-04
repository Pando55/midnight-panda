import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { marketData as fallbackData } from '@/lib/data';
import type { MarketData } from '@/types';

export function useMarketData() {
  const [data, setData] = useState<MarketData[]>(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const { data: result, error: err } = await supabase.functions.invoke('fetch-market-data');

      if (err) throw new Error(err.message);
      if (result?.error) throw new Error(result.error);
      if (result?.data && Array.isArray(result.data)) {
        setData(result.data);
        setLastUpdated(new Date(result.timestamp));
      }
    } catch (e) {
      console.error('Failed to fetch market data:', e);
      setError(e instanceof Error ? e.message : 'Failed to load');
      // Keep showing fallback data
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, isLoading, error, lastUpdated, refresh: fetchData };
}
