// Shared flat-command parser and terminal-local credential storage. No credentials are printed.
string g_token="",g_account="";
string Escape(string s){ StringReplace(s,"\\","\\\\"); StringReplace(s,"\"","\\\""); StringReplace(s,"\r"," "); StringReplace(s,"\n"," "); return s; }
string Value(string src,string key){
 int p=StringFind(src,"\""+key+"\""); if(p<0)return "";
 p=StringFind(src,":",p); if(p<0)return ""; p++;
 while(p<StringLen(src) && StringGetCharacter(src,p)<=32)p++;
 if(StringSubstr(src,p,1)=="\""){ int e=p+1; while(e<StringLen(src)){ if(StringSubstr(src,e,1)=="\"" && StringSubstr(src,e-1,1)!="\\")break; e++; } return StringSubstr(src,p+1,e-p-1); }
 int e=p; while(e<StringLen(src) && StringSubstr(src,e,1)!="," && StringSubstr(src,e,1)!="}" && StringGetCharacter(src,e)>32)e++;
 return StringSubstr(src,p,e-p);
}
string Post(string payload){ char data[],result[]; string headers;
 StringToCharArray(payload,data,0,WHOLE_ARRAY,CP_UTF8); ArrayResize(data,ArraySize(data)-1);
 int code=WebRequest("POST",InpBridgeUrl,"Content-Type: application/json\r\n",8000,data,result,headers);
 if(code<200 || code>=300)return "";
 return CharArrayToString(result,0,WHOLE_ARRAY,CP_UTF8);
}
string Identity(){ return "\"account_number\":\""+Login()+"\",\"server\":\""+Escape(Server())+"\",\"platform\":\""+Platform()+"\""; }
string Auth(string action){ return "{\"action\":\""+action+"\",\"account_id\":\""+g_account+"\",\"token\":\""+g_token+"\""; }
string CredentialFile(){return "MidnightPanda_"+Platform()+"_"+Login()+"_"+IntegerToString(StringLen(Server()))+".dat";}
bool LoadPair(){ int f=FileOpen(CredentialFile(),FILE_READ|FILE_TXT); if(f==INVALID_HANDLE)return false;
 string server=FileReadString(f); g_account=FileReadString(f);g_token=FileReadString(f);FileClose(f);
 if(server!=Server()){g_token="";g_account="";return false;}return g_token!="" && g_account!="";
}
bool Pair(){ string r=Post("{\"action\":\"pair_confirm\",\"code\":\""+Escape(InpPairCode)+"\","+Identity()+"}");
 g_account=Value(r,"account_id"); g_token=Value(r,"token"); if(g_account==""||g_token=="")return false;
 int f=FileOpen(CredentialFile(),FILE_WRITE|FILE_TXT);if(f==INVALID_HANDLE)return false;
 FileWrite(f,Server());FileWrite(f,g_account);FileWrite(f,g_token);FileClose(f);return true;
}
string TfName(){switch(Period()){case PERIOD_M1:return "M1";case PERIOD_M5:return "M5";case PERIOD_M15:return "M15";case PERIOD_M30:return "M30";case PERIOD_H1:return "H1";case PERIOD_H4:return "H4";case PERIOD_D1:return "D1";case PERIOD_W1:return "W1";}return "UNSUPPORTED";}
double Pip(){return PointSize()*((DigitsCount()==3||DigitsCount()==5)?10:1);}
string TrailKey(long ticket){return "MP_T_"+Login()+"_"+IntegerToString(ticket);}
void Report(string rid,string status,string result){Post(Auth("report")+",\"request_id\":\""+rid+"\",\"status\":\""+status+"\",\"result\":"+result+"}");}
int OnInit(){
 if(!LoadPair() && (InpPairCode=="" || !Pair())){Alert("Midnight Panda: pairing required or failed. Check the account/server and WebRequest permission.");return INIT_FAILED;}
 EventSetTimer(3);Print("Midnight Panda paired. Credentials saved locally; live entries are disabled.");return INIT_SUCCEEDED;
}
void OnDeinit(const int reason){EventKillTimer();}
void OnTimer(){TrailPositions();if(!Heartbeat())return;ProcessCommand();}
void ProcessCommand(){
 string r=Post(Auth("claim")+"}");string kind=Value(r,"command"),rid=Value(r,"request_id");
 if(rid=="" || (kind!="QUOTE" && kind!="EXECUTE"))return;
 string direction=Value(r,"direction"),symbol=Value(r,"symbol"),tf=Value(r,"timeframe");
 double lot=StringToDouble(Value(r,"lot")),sl=StringToDouble(Value(r,"sl")),tp=StringToDouble(Value(r,"tp")),entry=StringToDouble(Value(r,"entry")),trail=StringToDouble(Value(r,"trailing_stop_pips"));
 int orders=(int)StringToInteger(Value(r,"orders"));bool buy=direction=="BUY";
 if(symbol!=Symbol() || tf!=TfName() || (direction!="BUY" && direction!="SELL") || orders<1 || orders>5 || lot<=0 || sl<=0 || tp<=0 || entry<=0){Report(rid,"rejected","{\"error\":\"Invalid command or chart changed\"}");return;}
 double loss=0,margin=0,exposure=0;string why="";
 bool allowed=RiskCheck(buy,lot,orders,entry,sl,tp,StringToDouble(Value(r,"max_risk_percent")),StringToDouble(Value(r,"max_exposure_lots")),StringToDouble(Value(r,"daily_loss_percent")),loss,margin,exposure,why);
 if(kind=="QUOTE"){
 Report(rid,"quoted",StringFormat("{\"allowed\":%s,\"loss\":%.8f,\"margin\":%.8f,\"exposure\":%.8f,\"netting\":%s,\"error\":\"%s\"}",allowed?"true":"false",loss,margin,exposure,Netting()?"true":"false",Escape(why)));return;
 }
 if(!InpEnableDemoExecution || !Demo() || !allowed){Report(rid,"rejected","{\"error\":\""+Escape(InpEnableDemoExecution?why:"Demo execution is disabled in EA inputs")+"\"}");return;}
 string guard="MP_R_"+StringSubstr(rid,0,32);
 if(GlobalVariableCheck(guard)){Report(rid,"unknown","{\"error\":\"Submission already attempted; inspect broker history\"}");return;}
 GlobalVariableSet(guard,TimeLocal());GlobalVariablesFlush();
 int filled=0;double volume=0;bool unknown=false;string tickets="";
 for(int i=0;i<orders;i++){
 if(!RiskCheck(buy,lot,orders-i,entry,sl,tp,StringToDouble(Value(r,"max_risk_percent")),StringToDouble(Value(r,"max_exposure_lots")),StringToDouble(Value(r,"daily_loss_percent")),loss,margin,exposure,why))break;
 string permit=Post(Auth("permit")+",\"request_id\":\""+rid+"\",\"order_index\":"+IntegerToString(i)+"}");
 if(Value(permit,"permitted")!="true")break;
 // One broker submission per consumed permit. Never retry ambiguous acceptance.
 long ticket=0;double actual=0;int outcome=SendOrder(buy,lot,sl,tp,ticket,actual);
 if(outcome<0){unknown=true;break;}
 if(outcome==0)break;
 filled++;volume+=actual;if(tickets!="")tickets+=",";tickets+=IntegerToString(ticket);
 if(trail>0 && ticket>0){GlobalVariableSet(TrailKey(ticket),trail);GlobalVariablesFlush();}
 if(actual<lot-0.0000001)break;
 }
 string status=unknown?"unknown":((filled==orders && volume>=lot*orders-0.0000001)?"filled":(filled>0?"partial":"rejected"));
 Report(rid,status,StringFormat("{\"filled\":%d,\"requested\":%d,\"filled_volume\":%.8f,\"tickets\":[%s],\"error\":\"%s\"}",filled,orders,volume,tickets,Escape(why)));
}
bool RiskCheck(bool buy,double lot,int orders,double entry,double sl,double tp,double maxRisk,double maxLots,double dailyLimit,double &loss,double &margin,double &exposure,string &why){
 double bid=BidPrice(),ask=AskPrice(),price=buy?ask:bid,risk=MathAbs(price-sl),step=LotStep();
 if(!Demo()){why="Live entries are locked";return false;}
 if(!TradingAllowed() || bid<=0 || ask<=bid || !FreshTick()){why="Trading unavailable or price stale";return false;}
 if(lot<LotMin() || lot>LotMax() || step<=0 || MathAbs(lot/step-MathRound(lot/step))>0.000001){why="Broker lot min/max/step violation";return false;}
 if((buy && (sl>=bid || tp<=ask)) || (!buy && (sl<=ask || tp>=bid)) || MathMin(MathAbs(price-sl),MathAbs(tp-price))<StopDistance()){why="Stops violate direction or broker distance";return false;}
 if(risk<=0 || MathAbs(price-entry)>risk*0.25 || ask-bid>risk*0.2){why="Price moved or spread too wide; rescan";return false;}
 if(!Estimate(buy,lot,orders,price,sl,loss,margin)){why="Risk/margin estimate unavailable";return false;}
 exposure=OpenLots()+lot*orders;
 string day="MP_D_"+Login()+"_"+IntegerToString((int)(TimeGMT()/86400));
 if(!GlobalVariableCheck(day)){GlobalVariableSet(day,Equity());GlobalVariablesFlush();}
 double start=GlobalVariableGet(day);
 if(maxRisk<=0 || maxLots<=0 || dailyLimit<=0 || loss>Equity()*maxRisk/100 || exposure>maxLots || margin>FreeMargin()){why="Total risk, exposure or margin limit exceeded";return false;}
 if(start<=0 || (start-Equity())/start*100>=dailyLimit){why="Daily equity loss limit reached";return false;}
 why="";return true;
}
