import React,{useState} from 'react';
import {Bot,Send,Package,AlertTriangle,ShoppingCart,TrendingUp,MessageSquareText,LoaderCircle} from 'lucide-react';

export default function AIManager({supabase}){
 const [input,setInput]=useState('');
 const [busy,setBusy]=useState(false);
 const [messages,setMessages]=useState([{role:'assistant',text:'Salam! Mən ZED STORE AI Managerəm. Anbar, məhsul qalığı, azalan stok, sifarişlər və satışlar barədə sərbəst sual verə bilərsən. Məlumatları yalnız oxuyuram; heç nəyi özbaşına dəyişmirəm.'}]);
 async function send(e){
  e.preventDefault();
  const value=input.trim();
  if(!value||busy)return;
  setInput('');
  setMessages(old=>[...old,{role:'user',text:value}]);
  setBusy(true);
  try{
   const {data,error}=await supabase.functions.invoke('zed-ai-manager',{body:{message:value}});
   if(error)throw error;
   if(data?.error)throw new Error(data.error);
   setMessages(old=>[...old,{role:'assistant',text:data?.answer||'AI cavabı boş oldu. Yenidən cəhd et.'}]);
  }catch(err){
   const msg=String(err?.message||'Bağlantı xətası');
   setMessages(old=>[...old,{role:'assistant',text:msg.includes('OPENAI_API_KEY')||msg.includes('Function returned')?'AI serveri hələ tam aktivləşdirilməyib. Serverdə AI açarı konfiqurasiya olunmalıdır.': 'AI Manager bağlantısında problem yarandı: '+msg}]);
  }finally{setBusy(false);}
 }
 const shortcuts=['Azalan stokları göstər','Anbarımın xülasəsini göstər','Bu ay satış və mənfəət nə qədərdir?','Sifarişlərin vəziyyətini göstər'];
 return <section className="ai-manager">
  <div className="ai-head"><span className="ai-avatar"><Bot/></span><div><h2>AI Manager</h2><p>ZED STORE AI köməkçisi · təhlükəsiz oxuma rejimi</p></div><span className="ai-status">Serverə qoşulur</span></div>
  <div className="ai-shortcuts">
   <button type="button" onClick={()=>setInput(shortcuts[0])}><AlertTriangle/> Azalan stoklar</button>
   <button type="button" onClick={()=>setInput(shortcuts[1])}><Package/> Anbar xülasəsi</button>
   <button type="button" onClick={()=>setInput(shortcuts[2])}><TrendingUp/> Bu ayın mənfəəti</button>
   <button type="button" onClick={()=>setInput(shortcuts[3])}><ShoppingCart/> Sifarişlər</button>
  </div>
  <div className="ai-messages" aria-live="polite">{messages.map((m,i)=><div className={'ai-message '+m.role} key={i}><span>{m.role==='assistant'?<Bot/>:<MessageSquareText/>}</span><p>{m.text}</p></div>)}{busy&&<div className="ai-message assistant"><span><Bot/></span><p className="ai-thinking"><LoaderCircle/> Məlumatlar yoxlanılır, cavab hazırlanır...</p></div>}</div>
  <form className="ai-compose" onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Məhsul, stok və ya satış barədə soruş..." aria-label="AI Manager mesajı" disabled={busy}/><button className="primary" type="submit" disabled={!input.trim()||busy}>{busy?<LoaderCircle size={17}/>:<Send size={17}/>} Göndər</button></form>
  <p className="ai-disclaimer">AI cavabları yalnız sənin giriş etdiyin hesabın RLS ilə qorunan məlumatlarından hazırlanır. Müştəri telefonları və şəxsi məlumatları AI xidmətinə ötürülmür. Bu versiya heç bir məlumatı dəyişmir.</p>
 </section>;
}
