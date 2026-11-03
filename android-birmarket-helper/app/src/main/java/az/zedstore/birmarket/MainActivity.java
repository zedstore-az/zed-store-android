package az.zedstore.birmarket;
import android.app.*;import android.os.*;import android.content.*;import android.provider.Settings;import android.text.InputType;import android.graphics.Color;import android.widget.*;
public class MainActivity extends Activity {
 LinearLayout root; TextView status;
 public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(Color.rgb(12,28,50));root=new LinearLayout(this);root.setPadding(24,32,24,24);root.setOrientation(1);root.setBackgroundColor(0xfff4f6fa);
 TextView h=new TextView(this);h.setText("ZED STORE");h.setTextSize(26);h.setTextColor(0xff10243e);h.setTypeface(null,1);root.addView(h);
 TextView sub=new TextView(this);sub.setText("Birmarket bildiriş ötürücü");sub.setTextSize(18);sub.setPadding(0,12,0,24);root.addView(sub);
 status=new TextView(this);status.setTextSize(15);root.addView(status);
 Button perm=new Button(this);perm.setText("Bildiriş icazəsini aktiv et");perm.setOnClickListener(v->startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));root.addView(perm);
 Button key=new Button(this);key.setText("Server açarını daxil et");key.setOnClickListener(v->showKey());root.addView(key);
 TextView note=new TextView(this);note.setText("Yalnız Birmarket göndəricisi, ZED STORE mətni və 11 rəqəmli sifariş kodu olan bildirişlər ötürülür. SMS oxunmur. Yalnız quraşdırmadan sonrakı bildirişlər qəbul olunur.");note.setPadding(0,24,0,0);root.addView(note);setContentView(root);refresh();}
 void refresh(){String x=Settings.Secure.getString(getContentResolver(),"enabled_notification_listeners");boolean ok=x!=null&&x.contains(getPackageName());String k=getSharedPreferences("zed",0).getString("key","");status.setText("Bildiriş icazəsi: "+(ok?"AKTİVDİR":"AKTİV DEYİL")+"\nServer açarı: "+(k.isEmpty()?"yoxdur":"saxlanılıb"));}
 void showKey(){EditText e=new EditText(this);e.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);new AlertDialog.Builder(this).setTitle("Server açarı").setMessage("Supabase BIRM_SMS_WEBHOOK_SECRET dəyərini daxil et. Heç kimlə paylaşma.").setView(e).setPositiveButton("Saxla",(d,w)->{getSharedPreferences("zed",0).edit().putString("key",e.getText().toString().trim()).apply();refresh();}).setNegativeButton("Ləğv",null).show();}
 protected void onResume(){super.onResume();if(status!=null)refresh();}
}