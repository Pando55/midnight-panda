//+------------------------------------------------------------------+
//| MidnightPandaBridge.mq4 — connects MT4 to your Midnight Panda    |
//| account. Attach to the chart you want scanned/traded.            |
//| Requires: Tools > Options > Expert Advisors > Allow WebRequest   |
//| for https://jjksgqkkiliknfwthsed.supabase.co                     |
//+------------------------------------------------------------------+
#property copyright "Midnight Panda"
#property version   "1.00"
#property strict

input string InpBridgeUrl   = "https://jjksgqkkiliknfwthsed.supabase.co/functions/v1/terminal-bridge";
input string InpPairCode    = "";        // 6-char code from the app (first run only)
input string InpToken       = "";        // filled after pairing; keep it
input string InpAccountId   = "";        // filled after pairing
input int    InpTimerSec    = 3;
input int    InpCandles     = 300;
input int    InpMaxRetries  = 3;
input int    InpSlippagePts = 30;

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

string Extract(string src, string start, string end)
{
   int a = StringFind(src, start);
   if(a < 0) return "";
   a += StringLen(start);
   int b = StringFind(src, end, a);
   if(b < 0) return "";
   return StringSubstr(src, a, b - a);
}

int OnInit()
{
   if(!IsTradeAllowed()) { Alert("Enable AutoTrading, then re-attach the bridge."); return INIT_FAILED; }
   EventSetTimer(MathMax(1, InpTimerSec));
   if(InpToken == "" && InpPairCode != "")
   {
      string resp = Post(StringFormat("{\"action\":\"pair_confirm\",\"code\":\"%s\",\"account_number\":\"%d\"}",
                                      InpPairCode, AccountNumber()));
      string id = Extract(resp, "\"account_id\":\"", "\"");
      string tok = Extract(resp, "\"token\":\"", "\"");
      if(id != "" && tok != "")
      {
         Print("Paired! Save into EA inputs: InpAccountId=", id, "  InpToken=", tok);
         Alert("Midnight Panda paired! Copy account_id and token from the Experts log into the EA inputs, then re-attach.");
      }
      else Print("Pairing failed: ", resp);
   }
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) { EventKillTimer(); }

double g_trailingPips = 0;
bool g_directionBuy = true;
double g_sl = 0, g_tp = 0;

void SendHeartbeat()
{
   string candles = "";
   int n = MathMin(InpCandles, Bars);
   for(int i = n - 1; i >= 0; i--)
   {
      if(candles != "") candles += ",";
      candles += StringFormat("{\"t\":%d,\"o\":%s,\"h\":%s,\"l\":%s,\"c\":%s}",
         (int)Time[i], DoubleToString(Open[i], Digits), DoubleToString(High[i], Digits),
         DoubleToString(Low[i], Digits), DoubleToString(Close[i], Digits));
   }
   string positions = "";
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() != Symbol() || OrderType() > OP_SELL) continue;
      if(positions != "") positions += ",";
      positions += StringFormat("{\"ticket\":%d,\"type\":\"%s\",\"volume\":%s,\"open\":%s}",
         OrderTicket(), OrderType() == OP_BUY ? "BUY" : "SELL",
         DoubleToString(OrderLots(), 2), DoubleToString(OrderOpenPrice(), Digits));
   }
   bool demo = !IsTradeContextBusy() && AccountServer() != "" && StringFind(StringLower(AccountCompany()), "demo") >= 0;
   // MT4 has no direct demo flag; IsDemo() covers it.
   demo = IsDemo();
   string payload = StringFormat(
      "{\"action\":\"heartbeat\",\"account_id\":\"%s\",\"token\":\"%s\",\"symbol\":\"%s\",\"timeframe\":\"%s\","
      "\"balance\":%s,\"equity\":%s,\"free_margin\":%s,\"currency\":\"%s\",\"is_demo\":%s,"
      "\"server_time\":\"%s\",\"positions\":[%s],\"candles\":[%s]}",
      InpAccountId, InpToken, Symbol(), TfName(),
      DoubleToString(AccountBalance(), 2), DoubleToString(AccountEquity(), 2),
      DoubleToString(AccountFreeMargin(), 2), AccountCurrency(), demo ? "true" : "false",
      TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS), positions, candles);
   Post(payload);
}

bool OpenWithRetry(double lot)
{
   for(int attempt = 0; attempt < InpMaxRetries; attempt++)
   {
      RefreshRates();
      int type = g_directionBuy ? OP_BUY : OP_SELL;
      double price = g_directionBuy ? Ask : Bid;
      int ticket = OrderSend(Symbol(), type, lot, price, InpSlippagePts, g_sl, g_tp,
                             "MidnightPanda", 20261020, 0, clrNONE);
      if(ticket > 0) return true;
      int err = GetLastError();
      if(err == ERR_REQUOTE || err == ERR_PRICE_CHANGED || err == ERR_OFF_QUOTES) continue; // retry
      Print("Order rejected: ", err);
      return false;
   }
   return false;
}

void ClaimAndExecute()
{
   string resp = Post(StringFormat("{\"action\":\"claim\",\"account_id\":\"%s\",\"token\":\"%s\"}", InpAccountId, InpToken));
   string rid = Extract(resp, "\"id\":\"", "\"");
   if(rid == "") return;
   if(Extract(resp, "\"kind\":\"", "\"") != "EXECUTE") return;

   int orders = (int)StringToInteger(Extract(resp, "\"orders\":", ","));
   double lot = StringToDouble(Extract(resp, "\"lot\":", ","));
   double trail = StringToDouble(Extract(resp, "\"trailing_stop_pips\":", "}"));
   if(orders < 1) orders = 1;

   int filled = 0;
   for(int i = 0; i < orders; i++)
   {
      string perm = Post(StringFormat("{\"action\":\"permit\",\"account_id\":\"%s\",\"token\":\"%s\",\"request_id\":\"%s\",\"order_index\":%d}",
                                      InpAccountId, InpToken, rid, i));
      if(Extract(perm, "\"permitted\":", "}") != "true") break;
      if(OpenWithRetry(lot)) filled++;
   }
   Post(StringFormat("{\"action\":\"report\",\"account_id\":\"%s\",\"token\":\"%s\",\"request_id\":\"%s\",\"status\":\"%s\",\"result\":{\"filled\":%d,\"requested\":%d}}",
                     InpAccountId, InpToken, rid, filled == orders ? "filled" : (filled > 0 ? "partial" : "rejected"), filled, orders));
   if(trail > 0) g_trailingPips = trail;
}

void TrailPositions()
{
   if(g_trailingPips <= 0) return;
   double dist = g_trailingPips * Point * 10;
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() != Symbol() || OrderMagicNumber() != 20261020 || OrderType() > OP_SELL) continue;
      RefreshRates();
      if(OrderType() == OP_BUY && Bid - OrderOpenPrice() > dist)
      {
         double nsl = Bid - dist;
         if(nsl > OrderStopLoss()) OrderModify(OrderTicket(), OrderOpenPrice(), nsl, OrderTakeProfit(), 0, clrNONE);
      }
      else if(OrderType() == OP_SELL && OrderOpenPrice() - Ask > dist)
      {
         double nsl = Ask + dist;
         if(OrderStopLoss() == 0 || nsl < OrderStopLoss()) OrderModify(OrderTicket(), OrderOpenPrice(), nsl, OrderTakeProfit(), 0, clrNONE);
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

string StringLower(string s) { StringToLower(s); return s; }
//+------------------------------------------------------------------+
