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
 ExecutorService ex=Executors.newSingleThreadExecutor();

 @Override public void onNotificationPosted(StatusBarNotification n) {
  if(n==null || n.getNotification()==null)return;
  Bundle b=n.getNotification().extras;
  if(b==null)return;
  String pkg=n.getPackageName()==null?"":n.getPackageName().toLowerCase(Locale.ROOT);
  String title=s(b.getCharSequence(Notification.EXTRA_TITLE));
  StringBuilder all=new StringBuilder();
  all.append(title).append("\\n");
  append(all,b.getCharSequence(Notification.EXTRA_TEXT));
  append(all,b.getCharSequence(Notification.EXTRA_BIG_TEXT));
  append(all,b.getCharSequence(Notification.EXTRA_SUB_TEXT));
  append(all,b.getCharSequence(Notification.EXTRA_SUMMARY_TEXT));
  CharSequence[] lines=b.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
  if(lines!=null)for(CharSequence line:lines)append(all,line);
  String msg=all.toString().trim();
  String normalized=(title+" "+msg).toLowerCase(Locale.ROOT).replace('ı','i');
  boolean smsApp=pkg.contains("messaging")||pkg.contains("message")||pkg.contains("sms");
  boolean sender=normalized.contains("birmarket")||pkg.contains("birmarket")||pkg.contains("umico");
  SharedPreferences prefs=getSharedPreferences("zed",0);
  if(!sender){return;}
  prefs.edit().putString("last_seen","Birmarket bildirişi aşkarlandı").apply();
  if(!normalized.contains("zed store")){prefs.edit().putString("last_seen","Birmarket bildirişi alındı, ZED STORE mətni tapılmadı").apply();return;}
  Matcher m=ORDER.matcher(msg);
  if(!m.find()){prefs.edit().putString("last_seen","ZED STORE mesajı alındı, 11 rəqəmli sifariş kodu tapılmadı").apply();return;}
  String id=m.group();
  String key=prefs.getString("key","");
  if(key.isEmpty()){prefs.edit().putString("last_seen","Sifariş tapıldı, server açarı daxil edilməyib").apply();return;}
  prefs.edit().putString("last_seen","Sifariş "+id+" serverə göndərilir").apply();
  ex.execute(()->post(id,msg,key));
 }
 static void append(StringBuilder b,CharSequence c){if(c!=null&&!c.toString().trim().isEmpty())b.append(c).append("\\n");}
 static String s(CharSequence c){return c==null?"":c.toString();}
 void post(String id,String msg,String key){
  HttpURLConnection c=null;
  try{
   JSONObject j=new JSONObject();j.put("order_id",id);j.put("message_text",msg);
   c=(HttpURLConnection)new URL(URL_API).openConnection();
   c.setRequestMethod("POST");c.setConnectTimeout(10000);c.setReadTimeout(10000);c.setDoOutput(true);
   c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("x-zed-birmarket-key",key);
   try(OutputStream o=c.getOutputStream()){o.write(j.toString().getBytes(StandardCharsets.UTF_8));}
   int code=c.getResponseCode();
   SharedPreferences p=getSharedPreferences("zed",0);
   p.edit().putString("last_seen",code>=200&&code<300?"Sifariş "+id+" serverə ötürüldü":"Server xətası: HTTP "+code).apply();
  }catch(Exception e){getSharedPreferences("zed",0).edit().putString("last_seen","Ötürmə xətası: "+e.getClass().getSimpleName()).apply();}
  finally{if(c!=null)c.disconnect();}
 }
}