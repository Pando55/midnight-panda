//+------------------------------------------------------------------+
//| MidnightPandaBridge.mq5 — connects MT5 to your Midnight Panda    |
//| account. Attach to the chart you want scanned/traded.            |
//| Requires: Tools > Options > Expert Advisors > Allow WebRequest   |
//| for https://jjksgqkkiliknfwthsed.supabase.co                     |
//+------------------------------------------------------------------+
#property copyright "Midnight Panda"
#property version   "1.00"
#property strict

input string InpBridgeUrl   = "https://jjksgqkkiliknfwthsed.supabase.co/functions/v1/terminal-bridge";
input string InpPairCode    = "";        // 6-char code from the app (first run only)
input string InpToken       = "";        // filled automatically after pairing; keep it
input string InpAccountId   = "";        // filled automatically after pairing
input int    InpTimerSec    = 3;         // heartbeat / poll interval
input int    InpCandles     = 300;       // candles sent for scanning
input int    InpMaxRetries  = 3;         // order retry attempts
input int    InpSlippagePts = 30;        // max slippage in points

string TfName()
{
   switch(Period())
   {
      case PERIOD_M1: return "M1";
      case PERIOD_M5: return "M5";
      case PERIOD_M15: return "M15";
      case PERIOD_M30: return "M30";
      case PERIOD_H1: return "H1";
      case PERIOD_H4: return "H4";
      case PERIOD_D1: return "D1";
      case PERIOD_W1: return "W1";
   }
   return "M1";
}

string Post(string payload)
{
   char post[], result[];
   string headers = "Content-Type: application/json\r\n";
   StringToCharArray(payload, post, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(post, ArraySize(post) - 1);
   string resultHeaders;
   int code = WebRequest("POST", InpBridgeUrl, headers, 8000, post, result, resultHeaders);
   if(code == -1) { Print("WebRequest error: ", GetLastError()); return ""; }
   return CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
}

int OnInit()
{
   if(!MQLInfoInteger(MQL_TRADE_ALLOWED)) { Alert("Enable Algo Trading, then re-attach the bridge."); return INIT_FAILED; }
   EventSetTimer(MathMax(1, InpTimerSec));
   if(InpToken == "" && InpPairCode != "") TryPair();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) { EventKillTimer(); }

void TryPair()
{
   string payload = StringFormat("{\"action\":\"pair_confirm\",\"code\":\"%s\",\"account_number\":\"%lld\"}",
                                 InpPairCode, AccountInfoInteger(ACCOUNT_LOGIN));
   string resp = Post(payload);
   // Minimal JSON extraction (MQL5 has no built-in JSON).
   string id = Extract(resp, "\"account_id\":\"", "\"");
   string tok = Extract(resp, "\"token\":\"", "\"");
   if(id != "" && tok != "")
   {
      Print("Paired with Midnight Panda. Save these into the EA inputs:");
      Print("InpAccountId = ", id);
      Print("InpToken = ", tok);
      Alert("Midnight Panda paired! Copy account_id and token from the Experts log into the EA inputs, then re-attach.");
   }
   else Print("Pairing failed: ", resp);
}

string Extract(string src, string start, string end)
{
   int a = StringFind(src, start);
   if(a < 0) return "";
   a += StringLen(start);
   int b = StringFind(src, end, a);
   if(b < 0) return "";
   return StringSubstr(src, a, b - a);
}

void SendHeartbeat()
{
   MqlRates rates[];
   int got = CopyRates(_Symbol, PERIOD_CURRENT, 0, InpCandles, rates);
   string candles = "";
   if(got > 0)
   {
      ArraySetAsSeries(rates, false);
      for(int i = 0; i < got; i++)
      {
         if(i > 0) candles += ",";
         candles += StringFormat("{\"t\":%lld,\"o\":%s,\"h\":%s,\"l\":%s,\"c\":%s}",
            (long)rates[i].time,
            DoubleToString(rates[i].open, _Digits), DoubleToString(rates[i].high, _Digits),
            DoubleToString(rates[i].low, _Digits), DoubleToString(rates[i].close, _Digits));
      }
   }
   string positions = "";
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if(positions != "") positions += ",";
      positions += StringFormat("{\"ticket\":%llu,\"type\":\"%s\",\"volume\":%s,\"open\":%s}",
         ticket, PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "BUY" : "SELL",
         DoubleToString(PositionGetDouble(POSITION_VOLUME), 2),
         DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), _Digits));
   }
   bool demo = AccountInfoInteger(ACCOUNT_TRADE_MODE) != ACCOUNT_TRADE_MODE_REAL;
   string payload = StringFormat(
      "{\"action\":\"heartbeat\",\"account_id\":\"%s\",\"token\":\"%s\",\"symbol\":\"%s\",\"timeframe\":\"%s\","
      "\"balance\":%s,\"equity\":%s,\"free_margin\":%s,\"currency\":\"%s\",\"is_demo\":%s,"
      "\"server_time\":\"%s\",\"positions\":[%s],\"candles\":[%s]}",
      InpAccountId, InpToken, _Symbol, TfName(),
      DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2),
      DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2),
      DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2),
      AccountInfoString(ACCOUNT_CURRENCY), demo ? "true" : "false",
      TimeToString(TimeTradeServer(), TIME_DATE|TIME_SECONDS), positions, candles);
   Post(payload);
}

void ClaimAndExecute()
{
   string resp = Post(StringFormat("{\"action\":\"claim\",\"account_id\":\"%s\",\"token\":\"%s\"}", InpAccountId, InpToken));
   string rid = Extract(resp, "\"id\":\"", "\"");
   if(rid == "") return;
   string kind = Extract(resp, "\"kind\":\"", "\"");
   if(kind != "EXECUTE") return;

   int orders = (int)StringToInteger(Extract(resp, "\"orders\":", ","));
   double lot = StringToDouble(Extract(resp, "\"lot\":", ","));
   double trail = StringToDouble(Extract(resp, "\"trailing_stop_pips\":", "}"));
   if(orders < 1) orders = 1;

   int filled = 0;
   for(int i = 0; i < orders; i++)
   {
      // Server-side permit: exactly one order per permit, duplicates impossible.
      string perm = Post(StringFormat("{\"action\":\"permit\",\"account_id\":\"%s\",\"token\":\"%s\",\"request_id\":\"%s\",\"order_index\":%d}",
                                      InpAccountId, InpToken, rid, i));
      if(Extract(perm, "\"permitted\":", "}") != "true") break;
      if(OpenWithRetry(lot)) filled++;
   }
   Post(StringFormat("{\"action\":\"report\",\"account_id\":\"%s\",\"token\":\"%s\",\"request_id\":\"%s\",\"status\":\"%s\",\"result\":{\"filled\":%d,\"requested\":%d}}",
                     InpAccountId, InpToken, rid, filled == orders ? "filled" : (filled > 0 ? "partial" : "rejected"), filled, orders));
   if(trail > 0) g_trailingPips = trail;
}

double g_trailingPips = 0;

bool OpenWithRetry(double lot)
{
   MqlTradeRequest req; ZeroMemory(req);
   MqlTradeResult  res; ZeroMemory(res);
   for(int attempt = 0; attempt < InpMaxRetries; attempt++)
   {
      MqlTick tick;
      if(!SymbolInfoTick(_Symbol, tick)) continue;
      req.action = TRADE_ACTION_DEAL;
      req.symbol = _Symbol;
      req.volume = lot;
      req.deviation = InpSlippagePts;
      req.magic = 20261020;
      req.comment = "MidnightPanda";
      // Direction comes from the scan payload; default to market buy only when
      // the queued request says BUY. (Parsed in ClaimAndExecute via payload.)
      req.type = g_directionBuy ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
      req.price = g_directionBuy ? tick.ask : tick.bid;
      req.sl = g_sl;
      req.tp = g_tp;
      if(OrderSend(req, res))
      {
         if(res.retcode == TRADE_RETCODE_DONE || res.retcode == TRADE_RETCODE_DONE_PARTIAL) return true; // partial fill accepted and reported
         if(res.retcode == TRADE_RETCODE_REQUOTE || res.retcode == TRADE_RETCODE_PRICE_CHANGED) continue; // retry
         Print("Order rejected: ", res.retcode, " ", res.comment);
         return false;
      }
   }
   return false;
}

bool g_directionBuy = true;
double g_sl = 0, g_tp = 0;

void TrailPositions()
{
   if(g_trailingPips <= 0) return;
   double dist = g_trailingPips * _Point * 10;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC) != 20261020) continue;
      MqlTick tick; if(!SymbolInfoTick(_Symbol, tick)) continue;
      long type = PositionGetInteger(POSITION_TYPE);
      double sl = PositionGetDouble(POSITION_SL);
      double tp = PositionGetDouble(POSITION_TP);
      MqlTradeRequest req; ZeroMemory(req);
      MqlTradeResult  res; ZeroMemory(res);
      req.action = TRADE_ACTION_SLTP;
      req.position = ticket;
      req.symbol = _Symbol;
      req.tp = tp;
      if(type == POSITION_TYPE_BUY && tick.bid - PositionGetDouble(POSITION_PRICE_OPEN) > dist)
      {
         double nsl = tick.bid - dist;
         if(nsl > sl) { req.sl = nsl; OrderSend(req, res); }
      }
      else if(type == POSITION_TYPE_SELL && PositionGetDouble(POSITION_PRICE_OPEN) - tick.ask > dist)
      {
         double nsl = tick.ask + dist;
         if(sl == 0 || nsl < sl) { req.sl = nsl; OrderSend(req, res); }
      }
   }
}

void OnTimer()
{
   if(InpToken == "" || InpAccountId == "") return;
   SendHeartbeat();
   ClaimAndExecute();
   TrailPositions();
}
//+------------------------------------------------------------------+
