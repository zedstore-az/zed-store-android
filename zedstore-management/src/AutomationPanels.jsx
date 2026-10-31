import React,{useState} from 'react';
import {Bell,CheckCheck,History,Send,BrainCircuit,RefreshCw} from 'lucide-react';

const when=value=>value?new Date(value).toLocaleString('az-AZ'):'—';

export function NotificationPanel({rows,onRead,onReadAll,busy}){
  const unread=rows.filter(x=>!x.read_at).length;
  return <section className="panel">
    <div className="toolbar" style={{marginBottom:16}}>
      <div><h2>Bildiriş mərkəzi</h2><p>{unread} oxunmamış bildiriş</p></div>
      <button className="outline" disabled={!unread||busy} onClick={onReadAll}><CheckCheck size={16}/> Hamısını oxunmuş et</button>
    </div>
    {!rows.length?<p className="empty">Hələ bildiriş yoxdur.</p>:rows.map(x=><article key={x.id} className="alertrow" style={{alignItems:'flex-start',gap:12,opacity:x.read_at ? 0.65 : 1}}>
      <Bell size={17}/>
      <div style={{flex:1}}><b>{x.title}</b><p style={{margin:'5px 0'}}>{x.message}</p><small className="muted">{when(x.created_at)} · {x.severity==='critical'?'Təcili':x.severity==='warning'?'Diqqət':x.severity==='success'?'Uğurlu':'Məlumat'}</small></div>
      {!x.read_at&&<button className="tiny" title="Oxunmuş et" onClick={()=>onRead(x.id)}><CheckCheck size={16}/></button>}
    </article>)}
  </section>;
}

export function ActivityPanel({rows}){
  return <section className="panel">
    <div className="toolbar" style={{marginBottom:16}}><div><h2>Fəaliyyət tarixçəsi</h2><p>Məhsul, sifariş və xərclər üzrə son dəyişikliklər.</p></div><span className="muted">{rows.length} qeyd</span></div>
    {!rows.length?<p className="empty">Hələ fəaliyyət qeydə alınmayıb.</p>:<div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Bölmə</th><th>Əməliyyat</th><th>Dəyişən sahələr</th><th>İstifadəçi</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{when(x.created_at)}</td><td>{x.entity_type}</td><td>{x.action==='created'?'Yaradıldı':x.action==='updated'?'Yeniləndi':'Silindi'}</td><td>{(x.changed_fields||[]).join(', ')||'—'}</td><td>{x.actor_id?String(x.actor_id).slice(0,8)+'…':'Sistem'}</td></tr>)}</tbody></table></div>}
  </section>;
}

export function ZedAIPanel({supabase}){
  const [message,setMessage]=useState('');
  const [items,setItems]=useState([{role:'assistant',text:'Salam! Mən ZED AI köməkçisiyəm. Anbar, sifariş və satış məlumatları ilə bağlı sualını verə bilərsən.'}]);
  const [busy,setBusy]=useState(false);
  async function send(e){
    e.preventDefault();
    const prompt=message.trim();
    if(!prompt||busy)return;
    setMessage('');
    setItems(old=>[...old,{role:'user',text:prompt}]);
    setBusy(true);
    const {data,error}=await supabase.functions.invoke('zed-ai-manager',{body:{message:prompt}});
    if(error||data?.error)setItems(old=>[...old,{role:'assistant',text:data?.error||error?.message||'AI xidməti hazırda cavab verə bilmir.'}]);
    else setItems(old=>[...old,{role:'assistant',text:data.answer}]);
    setBusy(false);
  }
  return <section className="panel">
    <div className="toolbar" style={{marginBottom:16}}><div><h2>ZED AI</h2><p>Mağazanın real məlumatlarına əsaslanan süni intellekt köməkçisi.</p></div><BrainCircuit size={22}/></div>
    <div style={{display:'grid',gap:12,marginBottom:16}}>
      {items.map((x,i)=><div key={i} className="alertrow" style={{display:'block',maxWidth:'100%',whiteSpace:'pre-wrap'}}><b>{x.role==='assistant'?'ZED AI':'Sən'}</b><p style={{margin:'6px 0 0'}}>{x.text}</p></div>)}
    </div>
    <form onSubmit={send} style={{display:'flex',gap:8}}>
      <input style={{flex:1,minWidth:0}} value={message} onChange={e=>setMessage(e.target.value)} maxLength={2000} placeholder="Məsələn: Bu ay ən çox qazanc gətirən məhsul hansıdır?"/>
      <button className="primary" disabled={busy||!message.trim()}>{busy?<RefreshCw size={16}/>:<Send size={16}/>} Göndər</button>
    </form>
    <small className="muted">ZED AI yalnız analiz və məsləhət verir; məlumatları sənin təsdiqin olmadan dəyişmir.</small>
  </section>;
}
