package az.zedstore.birmarket;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.*;
import android.content.SharedPreferences;
import org.json.JSONObject;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import java.util.regex.*;
import java.util.Locale;

public class BirmarketNotificationListener extends NotificationListenerService {
 static final String URL_API="https://xisqlegehabwjjrjvimj.supabase.co/functions/v1/birmarket-sms-ingest";
 static final Pattern ORDER=Pattern.compile("(?<!\\\\d)\\\\d{11}(?!\\\\d)");
 private final ExecutorService ex=Executors.newSingleThreadExecutor();

 @Override public void onNotificationPosted(StatusBarNotification n) {
  if(n==null || n.getNotification()==null)return;
  Bundle b=n.getNotification().extras;
  if(b==null)return;
  String pkg=n.getPackageName()==null?"":n.getPackageName().toLowerCase(Locale.ROOT);
  String title=s(b.getCharSequence(Notification.EXTRA_TITLE));
  StringBuilder all=new StringBuilder();
  append(all,b.getCharSequence(Notification.EXTRA_TEXT));
  append(all,b.getCharSequence(Notification.EXTRA_BIG_TEXT));
  append(all,b.getCharSequence(Notification.EXTRA_SUB_TEXT));
  append(all,b.getCharSequence(Notification.EXTRA_SUMMARY_TEXT));
  append(all,n.getNotification().tickerText);
  CharSequence[] lines=b.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
  if(lines!=null)for(CharSequence line:lines)append(all,line);
  String body=all.toString().trim();
  String normalized=(title+" "+body).toLowerCase(Locale.ROOT).replace('ı','i');
  // Only handle SMS/message notifications whose sender is Birmarket.
  boolean messageApp=pkg.contains("messaging")||pkg.contains("message")||pkg.contains("sms");
  boolean sender=title.toLowerCase(Locale.ROOT).contains("birmarket") ||
                 (messageApp && body.toLowerCase(Locale.ROOT).contains("birmarket")) ||
                 pkg.contains("birmarket") || pkg.contains("umico");
  if(!sender)return;
  SharedPreferences prefs=getSharedPreferences("zed",0);
  prefs.edit().putString("last_seen","Birmarket mesajı aşkarlandı").apply();
  if(!normalized.contains("zed store")) {
   prefs.edit().putString("last_seen","Birmarket mesajı alındı, ZED STORE mətni tapılmadı").apply();return;
  }
  Matcher m=ORDER.matcher(title+" "+body);
  if(!m.find()) {
   prefs.edit().putString("last_seen","ZED STORE mesajı alındı, 11 rəqəmli sifariş kodu tapılmadı").apply();return;
  }
  String id=m.group();
  String key=prefs.getString("key","");
  if(key.isEmpty()) {
   prefs.edit().putString("last_seen","Sifariş tapıldı, server açarı daxil edilməyib").apply();return;
  }
  prefs.edit().putString("last_seen","Sifariş "+id+" serverə göndərilir").apply();
  ex.execute(()->post(id,(title+"\n"+body).trim(),key));
 }
 static void append(StringBuilder b,CharSequence c){if(c!=null&&!c.toString().trim().isEmpty()){if(b.length()>0)b.append("\\n");b.append(c);}}
 static String s(CharSequence c){return c==null?"":c.toString();}
 void post(String id,String msg,String key){
  HttpURLConnection c=null;
  try{
   JSONObject j=new JSONObject();j.put("order_id",id);j.put("message_text",msg);
   c=(HttpURLConnection)new URL(URL_API).openConnection();
   c.setRequestMethod("POST");c.setConnectTimeout(15000);c.setReadTimeout(15000);c.setDoOutput(true);
   c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("x-zed-birmarket-key",key);
   try(OutputStream o=c.getOutputStream()){o.write(j.toString().getBytes(StandardCharsets.UTF_8));}
   int code=c.getResponseCode();
   getSharedPreferences("zed",0).edit().putString("last_seen",code>=200&&code<300?
     "Sifariş "+id+" serverə ötürüldü":"Server xətası: HTTP "+code).apply();
  }catch(Exception e){
   getSharedPreferences("zed",0).edit().putString("last_seen","Ötürmə xətası: "+e.getClass().getSimpleName()).apply();
  }finally{if(c!=null)c.disconnect();}
 }
}