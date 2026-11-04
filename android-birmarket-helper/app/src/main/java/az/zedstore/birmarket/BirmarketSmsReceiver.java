package az.zedstore.birmarket;

import android.content.*;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.util.Log;
import org.json.JSONObject;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.*;

public class BirmarketSmsReceiver extends BroadcastReceiver {
 static final String ENDPOINT="https://xisqlegehabwjjrjvimj.supabase.co/functions/v1/birmarket-sms-ingest";
 static final Pattern ORDER=Pattern.compile("(?<!\\\\d)\\\\d{11}(?!\\\\d)");
 @Override public void onReceive(Context context,Intent intent) {
  if(intent==null||!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction()))return;
  SmsMessage[] parts=Telephony.Sms.Intents.getMessagesFromIntent(intent);
  if(parts==null||parts.length==0)return;
  String sender=parts[0].getDisplayOriginatingAddress();
  StringBuilder body=new StringBuilder();
  for(SmsMessage p:parts)if(p!=null)body.append(p.getMessageBody());
  String text=body.toString();
  String norm=(sender+" "+text).toLowerCase(Locale.ROOT).replace('ı','i');
  if(!norm.contains("birmarket")&&!norm.contains("umico"))return;
  SharedPreferences prefs=context.getSharedPreferences("zed",0);
  prefs.edit().putString("last_seen","Birmarket SMS-i birbaşa qəbul edildi").apply();
  if(!norm.contains("zed store")){prefs.edit().putString("last_seen","Birmarket SMS-i alındı, ZED STORE mətni tapılmadı").apply();return;}
  Matcher m=ORDER.matcher(text);
  if(!m.find()){prefs.edit().putString("last_seen","Birmarket SMS-i alındı, 11 rəqəmli sifariş kodu tapılmadı").apply();return;}
  String id=m.group(),key=prefs.getString("key","");
  if(key.isEmpty()){prefs.edit().putString("last_seen","Sifariş tapıldı, server açarı daxil edilməyib").apply();return;}
  String event=id+"|"+text;
  String hash=Integer.toHexString(event.hashCode());
  if(hash.equals(prefs.getString("last_sms_hash",""))){prefs.edit().putString("last_seen","Bu SMS artıq ötürülüb").apply();return;}
  prefs.edit().putString("last_sms_hash",hash).putString("last_seen","Sifariş "+id+" serverə göndərilir").apply();
  final PendingResult pending=goAsync();
  new Thread(()->{
   HttpURLConnection c=null;
   try{
    JSONObject j=new JSONObject();j.put("order_id",id);j.put("message_text","Göndərən: "+sender+"\\n"+text);
    c=(HttpURLConnection)new URL(ENDPOINT).openConnection();c.setRequestMethod("POST");c.setConnectTimeout(15000);c.setReadTimeout(15000);c.setDoOutput(true);
    c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("x-zed-birmarket-key",key);
    try(OutputStream o=c.getOutputStream()){o.write(j.toString().getBytes(StandardCharsets.UTF_8));}
    int code=c.getResponseCode();
    prefs.edit().putString("last_seen",code>=200&&code<300?"Sifariş "+id+" serverə ötürüldü":"Server xətası: HTTP "+code).apply();
   }catch(Exception e){prefs.edit().putString("last_seen","SMS ötürmə xətası: "+e.getClass().getSimpleName()).apply();}
   finally{if(c!=null)c.disconnect();pending.finish();}
  }).start();
 }
}