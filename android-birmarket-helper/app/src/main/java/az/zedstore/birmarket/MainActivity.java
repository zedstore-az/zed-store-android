package az.zedstore.birmarket;
import android.app.*;import android.os.*;import android.content.*;import android.provider.Settings;import android.text.InputType;import android.graphics.Color;import android.widget.*;import android.content.pm.PackageManager;
public class MainActivity extends Activity {
 LinearLayout root; TextView status;
 public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(Color.rgb(12,28,50));root=new LinearLayout(this);root.setPadding(24,32,24,24);root.setOrientation(1);root.setBackgroundColor(0xfff4f6fa);
 TextView h=new TextView(this);h.setText("ZED STORE");h.setTextSize(26);h.setTextColor(0xff10243e);h.setTypeface(null,1);root.addView(h);
 TextView sub=new TextView(this);sub.setText("Birmarket bildiriş ötürücü");sub.setTextSize(18);sub.setPadding(0,12,0,24);root.addView(sub);
 status=new TextView(this);status.setTextSize(15);root.addView(status);
 Button perm=new Button(this);perm.setText("SMS qəbul icazəsini aktiv et");perm.setOnClickListener(v->{if(Build.VERSION.SDK_INT>=23&&checkSelfPermission("android.permission.RECEIVE_SMS")!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{"android.permission.RECEIVE_SMS"},41);else Toast.makeText(this,"SMS icazəsi artıq aktivdir",Toast.LENGTH_SHORT).show();});root.addView(perm);
 Button notif=new Button(this);notif.setText("Bildiriş icazəsini aktiv et");notif.setOnClickListener(v->startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));root.addView(notif);
 Button key=new Button(this);key.setText("Server açarını daxil et");key.setOnClickListener(v->showKey());root.addView(key);
 TextView note=new TextView(this);note.setText("Birmarket SMS-ləri birbaşa qəbul edilir. Göndərici Birmarket/Umico, mətn ZED STORE və 11 rəqəmli sifariş kodu olduqda serverə ötürülür. SMS icazəsini telefonda təsdiqlə.");note.setPadding(0,24,0,0);root.addView(note);setContentView(root);refresh();}
 void refresh(){String x=Settings.Secure.getString(getContentResolver(),"enabled_notification_listeners");boolean ok=x!=null&&x.contains(getPackageName());String k=getSharedPreferences("zed",0).getString("key","");String last=getSharedPreferences("zed",0).getString("last_seen","Hələ Birmarket bildirişi qəbul edilməyib");status.setText("Bildiriş icazəsi: "+(ok?"AKTİVDİR":"AKTİV DEYİL")+"
Server açarı: "+(k.isEmpty()?"yoxdur":"saxlanılıb")+"
Son vəziyyət: "+last);}
 void showKey(){EditText e=new EditText(this);e.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);new AlertDialog.Builder(this).setTitle("Server açarı").setMessage("Supabase BIRM_SMS_WEBHOOK_SECRET dəyərini daxil et. Heç kimlə paylaşma.").setView(e).setPositiveButton("Saxla",(d,w)->{getSharedPreferences("zed",0).edit().putString("key",e.getText().toString().trim()).apply();refresh();}).setNegativeButton("Ləğv",null).show();}
 protected void onResume(){super.onResume();if(status!=null)refresh();}
}