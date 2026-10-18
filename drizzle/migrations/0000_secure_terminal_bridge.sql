ALTER TABLE public.license_keys ADD COLUMN IF NOT EXISTS auto_trading_enabled boolean NOT NULL DEFAULT true;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles, public.user_licenses TO authenticated;
GRANT ALL ON public.profiles, public.user_roles, public.license_keys, public.user_licenses TO service_role;
CREATE OR REPLACE FUNCTION public.assign_profile_roles() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.user_roles(user_id,role) VALUES(NEW.user_id,'user') ON CONFLICT(user_id,role) DO NOTHING;
 IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id=NEW.user_id AND u.email_confirmed_at IS NOT NULL AND lower(u.email)='mohalethapelo93@gmail.com') THEN
 INSERT INTO public.user_roles(user_id,role) VALUES(NEW.user_id,'admin') ON CONFLICT(user_id,role) DO NOTHING;
 END IF;
 RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.assign_profile_roles() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.activate_license_key(_license_key text)
RETURNS TABLE(license_key text,duration public.license_duration,activated_at timestamptz,expires_at timestamptz,is_active boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); k public.license_keys%ROWTYPE; atime timestamptz; etime timestamptz;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified sign-in required'; END IF;
 SELECT * INTO k FROM public.license_keys lk WHERE upper(lk.license_key)=upper(trim(_license_key)) FOR UPDATE;
 IF NOT FOUND OR NOT k.is_active THEN RAISE EXCEPTION 'Invalid or inactive license key'; END IF;
 IF lower(k.customer_email)<>lower(coalesce(auth.jwt()->>'email','')) THEN RAISE EXCEPTION 'Use the email assigned to this license'; END IF;
 IF k.activated_by_user_id IS NOT NULL AND k.activated_by_user_id<>uid THEN RAISE EXCEPTION 'License belongs to another account'; END IF;
 atime:=coalesce(k.activated_at,now());
 etime:=CASE WHEN k.duration='lifetime' THEN NULL ELSE coalesce(k.expires_at,atime+CASE k.duration WHEN '3months' THEN interval '90 days' WHEN '6months' THEN interval '180 days' WHEN '12months' THEN interval '365 days' WHEN '18months' THEN interval '547 days' END) END;
 IF etime IS NOT NULL AND etime<=now() THEN RAISE EXCEPTION 'License expired'; END IF;
 UPDATE public.license_keys SET activated_by_user_id=uid,activated_at=atime,expires_at=etime WHERE id=k.id;
 INSERT INTO public.user_licenses(user_id,license_key_id,license_key,duration,activated_at,expires_at,is_active) VALUES(uid,k.id,k.license_key,k.duration,atime,etime,true)
 ON CONFLICT(user_id) DO UPDATE SET license_key_id=excluded.license_key_id,license_key=excluded.license_key,duration=excluded.duration,activated_at=excluded.activated_at,expires_at=excluded.expires_at,is_active=true,updated_at=now();
 RETURN QUERY SELECT k.license_key,k.duration,atime,etime,true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.activate_license_key(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.activate_license_key(text) TO authenticated;
CREATE TABLE public.trading_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,broker text NOT NULL,platform text NOT NULL CHECK(platform IN ('MT4','MT5')),account_number text NOT NULL,server text NOT NULL,
 pair_code_hash text, pair_expires_at timestamptz,credential_hash text,paired_at timestamptz,last_sync_at timestamptz,
 is_demo boolean NOT NULL DEFAULT true,account_mode text NOT NULL DEFAULT 'unknown',currency text NOT NULL DEFAULT '',balance numeric NOT NULL DEFAULT 0,equity numeric NOT NULL DEFAULT 0,free_margin numeric NOT NULL DEFAULT 0,
 snapshot jsonb NOT NULL DEFAULT '{}',selected_symbol text NOT NULL DEFAULT '',selected_timeframe text NOT NULL DEFAULT 'M1',
 stopped boolean NOT NULL DEFAULT true,max_risk_percent numeric NOT NULL DEFAULT 1,max_exposure_lots numeric NOT NULL DEFAULT 0.1,daily_loss_percent numeric NOT NULL DEFAULT 3,
 authorization_license_id uuid REFERENCES public.license_keys(id),authorization_expires_at timestamptz,demo_verified_at timestamptz,live_enabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,platform,account_number,server)
);
GRANT SELECT ON public.trading_accounts TO authenticated;
GRANT ALL ON public.trading_accounts TO service_role;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_account_read ON public.trading_accounts FOR SELECT TO authenticated USING(auth.uid()=user_id);
-- Credential hashes are backend-only; browser reads are deliberately revoked, all reads use the verified edge function.
REVOKE SELECT ON public.trading_accounts FROM authenticated;
CREATE TABLE public.chart_scans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,account_id uuid REFERENCES public.trading_accounts(id),symbol text NOT NULL,timeframe text NOT NULL,source text NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('VALID_SETUP','WAIT_CONFIRMATION','NO_TRADE','INSUFFICIENT_DATA')),analysis jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now(),invalidated boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.chart_scans TO authenticated;
GRANT ALL ON public.chart_scans TO service_role;
ALTER TABLE public.chart_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_scan_read ON public.chart_scans FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE TABLE public.trade_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,account_id uuid NOT NULL REFERENCES public.trading_accounts(id),scan_id uuid REFERENCES public.chart_scans(id),idempotency_key uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('QUOTE','EXECUTE')),mode text NOT NULL DEFAULT 'manual',status text NOT NULL DEFAULT 'queued',payload jsonb NOT NULL,result jsonb NOT NULL DEFAULT '{}',
 claimed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '30 seconds',UNIQUE(user_id,idempotency_key)
);
GRANT SELECT ON public.trade_requests TO authenticated;
GRANT ALL ON public.trade_requests TO service_role;
ALTER TABLE public.trade_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_request_read ON public.trade_requests FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE INDEX trading_requests_queue ON public.trade_requests(account_id,status,created_at);
CREATE OR REPLACE FUNCTION public.claim_terminal_request(aid uuid) RETURNS SETOF public.trade_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid;
BEGIN
 UPDATE public.trade_requests SET status='expired' WHERE account_id=aid AND status='queued' AND expires_at<=now();
 SELECT id INTO rid FROM public.trade_requests WHERE account_id=aid AND status='queued' AND expires_at>now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
 IF rid IS NULL THEN RETURN; END IF;
 RETURN QUERY UPDATE public.trade_requests SET status='claimed',claimed_at=now() WHERE id=rid RETURNING *;
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_terminal_request(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_terminal_request(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.queue_terminal_request(uid uuid,aid uuid,sid uuid,idem uuid,knd text,md text,body jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.trading_accounts%ROWTYPE; s public.chart_scans%ROWTYPE; rid uuid;
BEGIN
 SELECT * INTO a FROM public.trading_accounts WHERE id=aid AND user_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
 SELECT id INTO rid FROM public.trade_requests WHERE user_id=uid AND idempotency_key=idem;
 IF rid IS NOT NULL THEN RETURN rid; END IF;
 IF a.last_sync_at IS NULL OR a.last_sync_at<now()-interval '15 seconds' THEN RAISE EXCEPTION 'Terminal is disconnected'; END IF;
 IF NOT a.is_demo THEN RAISE EXCEPTION 'Live execution is locked until external demo verification'; END IF;
 IF knd='EXECUTE' THEN
 SELECT * INTO s FROM public.chart_scans WHERE id=sid AND user_id=uid AND account_id=aid FOR UPDATE;
 IF NOT FOUND OR s.invalidated OR s.expires_at<=now() OR s.outcome<>'VALID_SETUP' OR s.source<>'broker' THEN RAISE EXCEPTION 'A fresh valid broker scan is required'; END IF;
 IF EXISTS(SELECT 1 FROM public.trade_requests WHERE scan_id=sid AND kind='EXECUTE' AND status NOT IN ('rejected','cancelled','expired')) THEN RAISE EXCEPTION 'This scan was already submitted'; END IF;
 IF md='auto' AND (a.stopped OR a.authorization_expires_at IS NULL OR a.authorization_expires_at<=now() OR NOT EXISTS(SELECT 1 FROM public.license_keys WHERE id=a.authorization_license_id AND activated_by_user_id=uid AND is_active AND auto_trading_enabled AND (expires_at IS NULL OR expires_at>now()))) THEN RAISE EXCEPTION 'Re-enter your active license to authorize this account'; END IF;
 IF EXISTS(SELECT 1 FROM public.trade_requests WHERE account_id=aid AND kind='EXECUTE' AND status IN ('queued','claimed','executing','unknown')) THEN RAISE EXCEPTION 'Resolve the previous execution before starting another'; END IF;
 END IF;
 INSERT INTO public.trade_requests(user_id,account_id,scan_id,idempotency_key,kind,mode,payload) VALUES(uid,aid,sid,idem,knd,md,body) RETURNING id INTO rid;
 RETURN rid;
END; $$;
REVOKE EXECUTE ON FUNCTION public.queue_terminal_request(uuid,uuid,uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.queue_terminal_request(uuid,uuid,uuid,uuid,text,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.consume_trade_permit(rid uuid,order_index integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.trade_requests%ROWTYPE; n integer;
BEGIN
 SELECT * INTO r FROM public.trade_requests WHERE id=rid FOR UPDATE;
 IF NOT FOUND OR r.kind<>'EXECUTE' OR r.status NOT IN ('claimed','executing') OR r.expires_at<=now() THEN RETURN false; END IF;
 n:=coalesce((r.result->>'permitted')::integer,0);
 IF order_index<>n OR n>=(r.payload->>'orders')::integer THEN RETURN false; END IF;
 UPDATE public.trade_requests SET status='executing',result=jsonb_set(result,'{permitted}',to_jsonb(n+1)) WHERE id=rid;
 RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.consume_trade_permit(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_trade_permit(uuid,integer) TO service_role;