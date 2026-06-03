
CREATE TABLE public.telegram_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  license_key TEXT,
  linked_user_id UUID,
  broker TEXT,
  account_number TEXT,
  account_type TEXT,
  instrument TEXT,
  timeframe TEXT,
  lot_size NUMERIC,
  max_positions INTEGER,
  trailing_stop_pips NUMERIC,
  wizard_state TEXT NOT NULL DEFAULT 'idle',
  wizard_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_users TO authenticated;
GRANT ALL ON public.telegram_users TO service_role;

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all telegram users"
ON public.telegram_users FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all telegram users"
ON public.telegram_users FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_telegram_users_updated_at
BEFORE UPDATE ON public.telegram_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.telegram_updates (
  update_id BIGINT NOT NULL PRIMARY KEY,
  chat_id BIGINT,
  raw_update JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.telegram_updates TO authenticated;
GRANT ALL ON public.telegram_updates TO service_role;

ALTER TABLE public.telegram_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view telegram updates"
ON public.telegram_updates FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
