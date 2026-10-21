#property copyright "Midnight Panda"
#property version "2.00"
#property strict
input string InpBridgeUrl="https://jjksgqkkiliknfwthsed.supabase.co/functions/v1/terminal-bridge";
input string InpPairCode="";
input bool InpEnableDemoExecution=false; // Enable only for supervised demo verification
input int InpSlippagePts=30;

string Login(){return IntegerToString(AccountNumber());}string Server(){return AccountServer();}string Platform(){return "MT4";}
bool Demo(){return IsDemo();}bool Netting(){return false;}int DigitsCount(){return Digits;}double PointSize(){return Point;}
double BidPrice(){RefreshRates();return Bid;}double AskPrice(){RefreshRates();return Ask;}
double LotMin(){return MarketInfo(Symbol(),MODE_MINLOT);}double LotMax(){return MarketInfo(Symbol(),MODE_MAXLOT);}double LotStep(){return MarketInfo(Symbol(),MODE_LOTSTEP);}
double StopDistance(){return MathMax(MarketInfo(Symbol(),MODE_STOPLEVEL),MarketInfo(Symbol(),MODE_FREEZELEVEL))*Point;}
double Equity(){return AccountEquity();}double FreeMargin(){return AccountFreeMargin();}
bool FreshTick(){return TimeCurrent()-(datetime)MarketInfo(Symbol(),MODE_TIME)<=15;}
bool TradingAllowed(){return IsConnected() && IsTradeAllowed() && MarketInfo(Symbol(),MODE_TRADEALLOWED)>0;}
double OpenLots(){double n=0;for(int i=0;i<OrdersTotal();i++){if(OrderSelect(i,SELECT_BY_POS,MODE_TRADES))n+=OrderLots();}return n;}
bool Estimate(bool buy,double lot,int orders,double price,double sl,double &loss,double &margin){double tick=MarketInfo(Symbol(),MODE_TICKSIZE),value=MarketInfo(Symbol(),MODE_TICKVALUE);if(tick<=0||value<=0)return false;loss=MathAbs(price-sl)/tick*value*lot*orders;ResetLastError();double remaining=AccountFreeMarginCheck(Symbol(),buy?OP_BUY:OP_SELL,lot*orders);margin=AccountFreeMargin()-remaining;return GetLastError()==0 && remaining>0 && margin>=0;}
bool Heartbeat(){string candles="";int n=MathMin(300,Bars-1);long offset=(long)(TimeCurrent()-TimeGMT());for(int i=n;i>=1;i--){if(candles!="")candles+=",";candles+=StringFormat("{\"t\":%lld,\"o\":%.8f,\"h\":%.8f,\"l\":%.8f,\"c\":%.8f}",(long)Time[i]-offset,Open[i],High[i],Low[i],Close[i]);}
 string r=Post(Auth("heartbeat")+","+Identity()+StringFormat(",\"symbol\":\"%s\",\"timeframe\":\"%s\",\"utc_time\":%lld,\"digits\":%d,\"balance\":%.2f,\"equity\":%.2f,\"free_margin\":%.2f,\"currency\":\"%s\",\"is_demo\":%s,\"candles\":[%s]}",Symbol(),TfName(),(long)TimeGMT(),Digits,AccountBalance(),Equity(),FreeMargin(),AccountCurrency(),Demo()?"true":"false",candles));return Value(r,"ok")=="true";}
int SendOrder(bool buy,double lot,double sl,double tp,long &ticket,double &actual){RefreshRates();ResetLastError();int t=OrderSend(Symbol(),buy?OP_BUY:OP_SELL,lot,buy?Ask:Bid,InpSlippagePts,NormalizeDouble(sl,Digits),NormalizeDouble(tp,Digits),"MidnightPanda",20261020,0,clrNONE);if(t>0){ticket=t;actual=lot;return 1;}int err=GetLastError();if(err==128||err==6||err==0)return -1;return 0;}
void TrailPositions(){for(int i=OrdersTotal()-1;i>=0;i--){if(!OrderSelect(i,SELECT_BY_POS,MODE_TRADES)||OrderSymbol()!=Symbol()||OrderMagicNumber()!=20261020||OrderType()>OP_SELL)continue;string key=TrailKey(OrderTicket());if(!GlobalVariableCheck(key))continue;RefreshRates();double dist=MathMax(GlobalVariableGet(key)*Pip(),StopDistance()+Point);bool buy=OrderType()==OP_BUY;double price=buy?Bid:Ask,sl=NormalizeDouble(buy?price-dist:price+dist,Digits);if((buy&&price-OrderOpenPrice()>dist&&sl>OrderStopLoss())||(!buy&&OrderOpenPrice()-price>dist&&(OrderStopLoss()==0||sl<OrderStopLoss()))){if(!OrderModify(OrderTicket(),OrderOpenPrice(),sl,OrderTakeProfit(),0,clrNONE))Print("Trailing modification not confirmed: ",GetLastError());}}}

#include "MidnightPandaCommon.mqh"
