#property copyright "Midnight Panda"
#property version "2.00"
#property strict
input string InpBridgeUrl="https://jjksgqkkiliknfwthsed.supabase.co/functions/v1/terminal-bridge";
input string InpPairCode="";
input bool InpEnableDemoExecution=false; // Enable only for supervised demo verification
input int InpSlippagePts=30;

string Login(){return IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));}
string Server(){return AccountInfoString(ACCOUNT_SERVER);}
string Platform(){return "MT5";}
bool Demo(){return AccountInfoInteger(ACCOUNT_TRADE_MODE)==ACCOUNT_TRADE_MODE_DEMO;}
bool Netting(){return AccountInfoInteger(ACCOUNT_MARGIN_MODE)!=ACCOUNT_MARGIN_MODE_RETAIL_HEDGING;}
int DigitsCount(){return (int)SymbolInfoInteger(_Symbol,SYMBOL_DIGITS);}
double PointSize(){return SymbolInfoDouble(_Symbol,SYMBOL_POINT);}
double BidPrice(){return SymbolInfoDouble(_Symbol,SYMBOL_BID);}
double AskPrice(){return SymbolInfoDouble(_Symbol,SYMBOL_ASK);}
double LotMin(){return SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MIN);}
double LotMax(){return SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MAX);}
double LotStep(){return SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP);}
double StopDistance(){return MathMax(SymbolInfoInteger(_Symbol,SYMBOL_TRADE_STOPS_LEVEL),SymbolInfoInteger(_Symbol,SYMBOL_TRADE_FREEZE_LEVEL))*PointSize();}
double Equity(){return AccountInfoDouble(ACCOUNT_EQUITY);}
double FreeMargin(){return AccountInfoDouble(ACCOUNT_MARGIN_FREE);}
bool FreshTick(){MqlTick tick;if(!SymbolInfoTick(_Symbol,tick))return false;return TimeTradeServer()-tick.time<=15;}
bool TradingAllowed(){return TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) && MQLInfoInteger(MQL_TRADE_ALLOWED) && AccountInfoInteger(ACCOUNT_TRADE_ALLOWED) && AccountInfoInteger(ACCOUNT_TRADE_EXPERT) && SymbolInfoInteger(_Symbol,SYMBOL_TRADE_MODE)==SYMBOL_TRADE_MODE_FULL;}
double OpenLots(){double n=0;for(int i=0;i<PositionsTotal();i++){if(PositionGetTicket(i)>0)n+=PositionGetDouble(POSITION_VOLUME);}for(int i=0;i<OrdersTotal();i++){if(OrderGetTicket(i)>0)n+=OrderGetDouble(ORDER_VOLUME_CURRENT);}return n;}
bool Estimate(bool buy,double lot,int orders,double price,double sl,double &loss,double &margin){double profit=0,m=0;if(!OrderCalcProfit(buy?ORDER_TYPE_BUY:ORDER_TYPE_SELL,_Symbol,lot,price,sl,profit)||!OrderCalcMargin(buy?ORDER_TYPE_BUY:ORDER_TYPE_SELL,_Symbol,lot,price,m))return false;loss=MathAbs(profit)*orders;margin=m*orders;return loss>0 && margin>=0;}
bool Heartbeat(){MqlRates b[];int n=CopyRates(_Symbol,PERIOD_CURRENT,1,300,b);string candles="";long offset=(long)(TimeTradeServer()-TimeGMT());
 for(int i=0;i<n;i++){if(i>0)candles+=",";candles+=StringFormat("{\"t\":%lld,\"o\":%.8f,\"h\":%.8f,\"l\":%.8f,\"c\":%.8f}",(long)b[i].time-offset,b[i].open,b[i].high,b[i].low,b[i].close);}
 string r=Post(Auth("heartbeat")+","+Identity()+StringFormat(",\"symbol\":\"%s\",\"timeframe\":\"%s\",\"utc_time\":%lld,\"digits\":%d,\"balance\":%.2f,\"equity\":%.2f,\"free_margin\":%.2f,\"currency\":\"%s\",\"is_demo\":%s,\"candles\":[%s]}",_Symbol,TfName(),(long)TimeGMT(),DigitsCount(),AccountInfoDouble(ACCOUNT_BALANCE),Equity(),FreeMargin(),AccountInfoString(ACCOUNT_CURRENCY),Demo()?"true":"false",candles));return Value(r,"ok")=="true";}
int SendOrder(bool buy,double lot,double sl,double tp,long &ticket,double &actual){MqlTradeRequest req={};MqlTradeResult res={};req.action=TRADE_ACTION_DEAL;req.symbol=_Symbol;req.type=buy?ORDER_TYPE_BUY:ORDER_TYPE_SELL;req.volume=lot;req.price=buy?AskPrice():BidPrice();req.sl=NormalizeDouble(sl,DigitsCount());req.tp=NormalizeDouble(tp,DigitsCount());req.magic=20261020;req.deviation=InpSlippagePts;req.comment="MidnightPanda";
 long fills=SymbolInfoInteger(_Symbol,SYMBOL_FILLING_MODE);req.type_filling=(fills&SYMBOL_FILLING_FOK)==SYMBOL_FILLING_FOK?ORDER_FILLING_FOK:ORDER_FILLING_IOC;
 bool sent=OrderSend(req,res);if(res.retcode==TRADE_RETCODE_DONE||res.retcode==TRADE_RETCODE_DONE_PARTIAL){actual=res.volume;ticket=(long)res.order;if(res.deal>0 && HistoryDealSelect(res.deal))ticket=HistoryDealGetInteger(res.deal,DEAL_POSITION_ID);return 1;}
 if(!sent && res.retcode==0 || res.retcode==TRADE_RETCODE_TIMEOUT || res.retcode==TRADE_RETCODE_CONNECTION || res.retcode==TRADE_RETCODE_PLACED)return -1;return 0;}
void TrailPositions(){for(int i=PositionsTotal()-1;i>=0;i--){ulong ticket=PositionGetTicket(i);if(ticket==0 || PositionGetInteger(POSITION_MAGIC)!=20261020 || PositionGetString(POSITION_SYMBOL)!=_Symbol)continue;
 long id=PositionGetInteger(POSITION_IDENTIFIER);string key=TrailKey(id);if(!GlobalVariableCheck(key))continue;double dist=MathMax(GlobalVariableGet(key)*Pip(),StopDistance()+PointSize());bool buy=PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY;double price=buy?BidPrice():AskPrice(),open=PositionGetDouble(POSITION_PRICE_OPEN),old=PositionGetDouble(POSITION_SL),sl=NormalizeDouble(buy?price-dist:price+dist,DigitsCount());
 if((buy && price-open>dist && sl>old)||(!buy && open-price>dist && (old==0||sl<old))){MqlTradeRequest req={};MqlTradeResult res={};req.action=TRADE_ACTION_SLTP;req.position=ticket;req.symbol=_Symbol;req.sl=sl;req.tp=PositionGetDouble(POSITION_TP);if(!OrderSend(req,res)||res.retcode!=TRADE_RETCODE_DONE)Print("Trailing modification not confirmed: ",res.retcode);}}}

#include "MidnightPandaCommon.mqh"
