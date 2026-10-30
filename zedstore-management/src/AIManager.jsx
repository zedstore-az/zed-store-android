import React,{useMemo,useState} from 'react';
import {Bot,Send,Package,AlertTriangle,ShoppingCart,TrendingUp,MessageSquareText} from 'lucide-react';

const money=n=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN'}).format(Number(n||0));
const monthKey=d=>{if(!d)return '';const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')};

export default function AIManager({products=[],orders=[],sales=[]}){
 const [input,setInput]=useState('');
 const [messages,setMessages]=useState([{role:'assistant',text:'Salam! Mən ZED STORE AI Manager-in ilkin versiyasıyam. Anbar, məhsul qalığı, azalan stok, sifarişlər və satışlar barədə sual verə bilərsən. Hələlik yalnız məlumat oxuyuram; heç nəyi dəyişmirəm.'}]);
 const active=useMemo(()=>products.filter(p=>p.is_active),[products]);
 const low=useMemo(()=>active.filter(p=>Number(p.stock_qty)<=Number(p.low_stock_threshold)),[active]);
 function answer(raw){
  const q=raw.toLocaleLowerCase('az');
  if(/azalan|az stok|bitir|qurtar|low stock/.test(q)){
   if(!low.length)return 'Hazırda az stok xəbərdarlığı olan məhsul yoxdur.';
   return 'Az stokda olan məhsullar:\n'+low.map(p=>'• '+p.name+' — '+p.stock_qty+' ədəd qalıb (hədd: '+p.low_stock_threshold+')').join('\n');
  }
  if(/sifariş|order/.test(q)){
   const pending=orders.filter(o=>!['delivered','cancelled'].includes(o.delivery_status));
   return 'Ümumi sifariş: '+orders.length+'\nProsesdə: '+pending.length+'\nTəhvil verilən: '+orders.filter(o=>o.delivery_status==='delivered').length+'\nLəğv edilən: '+orders.filter(o=>o.delivery_status==='cancelled').length;
  }
  if(/satış|mənfəət|qazanc|dövriyyə|profit/.test(q)){
   const m=sales.filter(s=>monthKey(s.sold_at)===monthKey(new Date()));
   const profit=m.reduce((a,s)=>a+Number(s.net_profit||0),0);
   const turnover=m.reduce((a,s)=>a+Number(s.transferred_amount||0)*Number(s.quantity||0),0);
   return 'Bu ayın satış xülasəsi:\nSatış qeydləri: '+m.length+'\nKöçən məbləğ: '+money(turnover)+'\nXalis mənfəət: '+money(profit);
  }
  if(/stok|anbar|qalıq|məhsul sayı|neçə məhsul/.test(q)){
   const total=active.reduce((a,p)=>a+Number(p.stock_qty||0),0);
   const stockValue=active.reduce((a,p)=>a+Number(p.cost_price||0)*Number(p.stock_qty||0),0);
   const named=active.filter(p=>q.includes(String(p.name||'').toLocaleLowerCase('az'))|| (p.sku&&q.includes(String(p.sku).toLocaleLowerCase('az'))));
   if(named.length)return named.map(p=>p.name+': '+p.stock_qty+' ədəd qalıb. Maya qiyməti '+money(p.cost_price)+', satış qiyməti '+money(p.sale_price)+'.').join('\n');
   return 'Anbar xülasəsi:\nAktiv məhsul çeşidi: '+active.length+'\nÜmumi ədəd: '+total+'\nAz stokda: '+low.length+'\nMaya dəyəri ilə stok: '+money(stockValue);
  }
  const matches=active.filter(p=>(p.name+' '+(p.sku||'')+' '+(p.brand||'')).toLocaleLowerCase('az').includes(q.trim()));
  if(matches.length&&q.trim().length>1)return matches.slice(0,8).map(p=>p.name+' — '+p.stock_qty+' ədəd, satış '+money(p.sale_price)).join('\n');
  return 'Bu sualı hələ dəqiq başa düşmədim. Məsələn, “Anbarda neçə məhsul var?”, “Azalan stokları göstər”, “Bu ay mənfəət nə qədərdir?” və ya məhsulun adını yaza bilərsən.';
 }
 function send(e){e.preventDefault();const value=input.trim();if(!value)return;setMessages(old=>[...old,{role:'user',text:value},{role:'assistant',text:answer(value)}]);setInput('');}
 return <section className="ai-manager">
  <div className="ai-head"><span className="ai-avatar"><Bot/></span><div><h2>AI Manager</h2><p>ZED STORE anbar köməkçisi · yalnız oxuma rejimi</p></div><span className="ai-status">Aktiv</span></div>
  <div className="ai-shortcuts">
   <button type="button" onClick={()=>setInput('Azalan stokları göstər')}><AlertTriangle/> Azalan stoklar</button>
   <button type="button" onClick={()=>setInput('Anbarımın xülasəsini göstər')}><Package/> Anbar xülasəsi</button>
   <button type="button" onClick={()=>setInput('Bu ay satış və mənfəət nə qədərdir?')}><TrendingUp/> Bu ayın mənfəəti</button>
   <button type="button" onClick={()=>setInput('Sifarişlərin vəziyyətini göstər')}><ShoppingCart/> Sifarişlər</button>
  </div>
  <div className="ai-messages" aria-live="polite">{messages.map((m,i)=><div className={'ai-message '+m.role} key={i}><span>{m.role==='assistant'?<Bot/>:<MessageSquareText/>}</span><p>{m.text}</p></div>)}</div>
  <form className="ai-compose" onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Məhsul, stok və ya satış barədə soruş..." aria-label="AI Manager mesajı"/><button className="primary" type="submit" disabled={!input.trim()}><Send size={17}/> Göndər</button></form>
  <p className="ai-disclaimer">İlkin versiya: cavablar proqramdakı məlumatlardan hazırlanır. Hələ heç bir məhsulu, stoku və ya sifarişi dəyişmir.</p>
 </section>;
}
