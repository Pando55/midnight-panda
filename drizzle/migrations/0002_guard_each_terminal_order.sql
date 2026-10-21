CREATE OR REPLACE FUNCTION public.consume_trade_permit(rid uuid,order_index integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.trade_requests%ROWTYPE; a public.trading_accounts%ROWTYPE; s public.chart_scans%ROWTYPE; n integer;
BEGIN
 SELECT account_id INTO a.id FROM public.trade_requests WHERE id=rid;
 SELECT * INTO a FROM public.trading_accounts WHERE id=a.id FOR UPDATE;
 SELECT * INTO r FROM public.trade_requests WHERE id=rid FOR UPDATE;
 IF NOT FOUND OR r.kind<>'EXECUTE' OR r.status NOT IN ('claimed','executing') OR r.expires_at<=now() THEN RETURN false; END IF;
 IF a.stopped OR NOT a.is_demo OR a.last_sync_at<now()-interval '15 seconds' OR a.credential_hash IS NULL THEN RETURN false; END IF;
 SELECT * INTO s FROM public.chart_scans WHERE id=r.scan_id;
 IF NOT FOUND OR s.invalidated OR s.expires_at<=now() OR s.outcome<>'VALID_SETUP' OR s.symbol<>a.selected_symbol OR s.timeframe<>a.selected_timeframe THEN RETURN false; END IF;
 IF r.mode='auto' AND (a.authorization_expires_at IS NULL OR a.authorization_expires_at<=now() OR NOT EXISTS(SELECT 1 FROM public.license_keys k JOIN public.user_licenses u ON u.license_key_id=k.id WHERE k.id=a.authorization_license_id AND u.user_id=a.user_id AND u.is_active AND k.activated_by_user_id=a.user_id AND k.is_active AND k.auto_trading_enabled AND (k.expires_at IS NULL OR k.expires_at>now()) AND (u.expires_at IS NULL OR u.expires_at>now()))) THEN RETURN false; END IF;
 n:=coalesce((r.result->>'permitted')::integer,0);
 IF order_index<>n OR n>=(r.payload->>'orders')::integer THEN RETURN false; END IF;
 UPDATE public.trade_requests SET status='executing',result=jsonb_set(result,'{permitted}',to_jsonb(n+1)) WHERE id=rid;
 RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.consume_trade_permit(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_trade_permit(uuid,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.queue_terminal_request(uid uuid,aid uuid,sid uuid,idem uuid,knd text,md text,body jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.trading_accounts%ROWTYPE; s public.chart_scans%ROWTYPE; q public.trade_requests%ROWTYPE; rid uuid;
BEGIN
 SELECT * INTO a FROM public.trading_accounts WHERE id=aid AND user_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
 SELECT id INTO rid FROM public.trade_requests WHERE user_id=uid AND idempotency_key=idem;
 IF rid IS NOT NULL THEN RETURN rid; END IF;
 IF a.last_sync_at IS NULL OR a.last_sync_at<now()-interval '15 seconds' THEN RAISE EXCEPTION 'Terminal is disconnected'; END IF;
 IF NOT a.is_demo THEN RAISE EXCEPTION 'Live execution is locked until external demo verification'; END IF;
 SELECT * INTO s FROM public.chart_scans WHERE id=sid AND user_id=uid AND account_id=aid FOR UPDATE;
 IF NOT FOUND OR s.invalidated OR s.expires_at<=now() OR s.outcome<>'VALID_SETUP' OR s.source<>'broker' OR s.symbol<>a.selected_symbol OR s.timeframe<>a.selected_timeframe THEN RAISE EXCEPTION 'A fresh valid broker scan is required'; END IF;
 IF knd NOT IN ('QUOTE','EXECUTE') OR md NOT IN ('manual','auto') OR (body->>'orders')::integer NOT BETWEEN 1 AND 5 OR (body->>'lot')::numeric<=0 THEN RAISE EXCEPTION 'Invalid trade parameters'; END IF;
 IF knd='EXECUTE' THEN
 IF a.stopped THEN RAISE EXCEPTION 'Trading is stopped'; END IF;
 SELECT * INTO q FROM public.trade_requests WHERE id=(body->>'quote_id')::uuid AND user_id=uid AND account_id=aid AND scan_id=sid AND kind='QUOTE' AND status='quoted' AND created_at>now()-interval '15 seconds';
 IF NOT FOUND OR q.payload->>'lot'<>body->>'lot' OR q.payload->>'orders'<>body->>'orders' OR coalesce((q.result->>'allowed')::boolean,false)=false THEN RAISE EXCEPTION 'Review a fresh terminal risk estimate before executing'; END IF;
 IF (q.result->>'loss')::numeric>a.equity*a.max_risk_percent/100 OR (q.result->>'exposure')::numeric>a.max_exposure_lots OR (q.result->>'margin')::numeric>a.free_margin THEN RAISE EXCEPTION 'Account risk or margin limit exceeded'; END IF;
 IF EXISTS(SELECT 1 FROM public.trade_requests WHERE scan_id=sid AND kind='EXECUTE' AND status NOT IN ('rejected','cancelled','expired')) THEN RAISE EXCEPTION 'This scan was already submitted'; END IF;
 IF md='auto' AND (a.authorization_expires_at IS NULL OR a.authorization_expires_at<=now() OR NOT EXISTS(SELECT 1 FROM public.license_keys k JOIN public.user_licenses u ON u.license_key_id=k.id WHERE k.id=a.authorization_license_id AND k.activated_by_user_id=uid AND u.user_id=uid AND u.is_active AND k.is_active AND k.auto_trading_enabled AND (k.expires_at IS NULL OR k.expires_at>now()) AND (u.expires_at IS NULL OR u.expires_at>now()))) THEN RAISE EXCEPTION 'Re-enter your active license to authorize this account'; END IF;
 IF EXISTS(SELECT 1 FROM public.trade_requests WHERE account_id=aid AND kind='EXECUTE' AND status IN ('queued','claimed','executing','unknown')) THEN RAISE EXCEPTION 'Resolve the previous execution before starting another'; END IF;
 END IF;
 INSERT INTO public.trade_requests(user_id,account_id,scan_id,idempotency_key,kind,mode,payload) VALUES(uid,aid,sid,idem,knd,md,body) RETURNING id INTO rid;
 RETURN rid;
END; $$;
REVOKE EXECUTE ON FUNCTION public.queue_terminal_request(uuid,uuid,uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.queue_terminal_request(uuid,uuid,uuid,uuid,text,text,jsonb) TO service_role;