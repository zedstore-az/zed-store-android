import React,{useMemo,useState} from 'react';
import {ArrowDownToLine,ArrowUpFromLine,RotateCcw,Search,Plus,PackageCheck,AlertCircle} from 'lucide-react';

const money=n=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN'}).format(Number(n||0));
const date=d=>d?new Date(d).toLocaleString('az-AZ',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';

export function StockMovementsPanel({rows,products,orders,csv}){
 const [query,Q]=useState(''),[kind,K]=useState('all');
 const productById=useMemo(()=>new Map(products.map(p=>[p.id,p])),[products]);
 const orderById=useMemo(()=>new Map(orders.map(o=>[o.id,o])),[orders]);
 const filtered=rows.filter(r=>{const p=productById.get(r.product_id);const text=[p?.name,r.note,r.movement_type,r.reference_type].join(' ').toLocaleLowerCase('az');return text.includes(query.toLocaleLowerCase('az'))&&(kind==='all'||r.movement_type===kind)});
 const labels={opening:'Başlanğıc qalığı',purchase:'Mal qəbulu',sale:'Satış',return:'Qaytarma',adjustment:'Stok düzəlişi',cancellation:'Sifariş ləğvi'};
 const totalIn=filtered.filter(x=>+x.quantity_delta>0).reduce((n,x)=>n+Number(x.quantity_delta),0),totalOut=filtered.filter(x=>+x.quantity_delta<0).reduce((n,x)=>n+Math.abs(Number(x.quantity_delta)),0);
 return <><div className="toolbar"><div><h2>Stok hərəkətləri</h2><p>Anbara giriş, satış çıxışı, qaytarma və düzəlişlərin tam tarixçəsi.</p></div><button className="outline" onClick={()=>csv(filtered.map(x=>({Tarix:date(x.created_at),Mehsul:productById.get(x.product_id)?.name||'—',Emeliyyat:labels[x.movement_type]||x.movement_type,Miqdar:x.quantity_delta,Maya:x.unit_cost,Sebeb:x.note,Sifaris:orderById.get(x.reference_id)?.order_number||''})),'zedstore-stok-hereketleri')}><ArrowDownToLine size={16}/> CSV ixracı</button></div>
 <div className="stock-history-metrics"><div className="cancel-metric"><small>Giriş miqdarı</small><b className="good">+{totalIn}</b><span>Seçilmiş qeydlər üzrə</span></div><div className="cancel-metric"><small>Çıxış miqdarı</small><b className="bad">−{totalOut}</b><span>Seçilmiş qeydlər üzrə</span></div><div className="cancel-metric"><small>Əməliyyat sayı</small><b>{filtered.length}</b><span>Tarixçə qeydləri</span></div></div>
 <div className="tools"><div className="search"><Search/><input placeholder="Məhsul və ya əməliyyat axtar" value={query} onChange={e=>Q(e.target.value)}/></div><select value={kind} onChange={e=>K(e.target.value)}><option value="all">Bütün əməliyyatlar</option>{Object.entries(labels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div>
 <section className="panel"><div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Məhsul</th><th>Əməliyyat</th><th>Miqdar</th><th>Maya dəyəri</th><th>Səbəb / qeyd</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td>{date(r.created_at)}</td><td><b>{productById.get(r.product_id)?.name||'Məhsul arxivdədir'}</b></td><td>{labels[r.movement_type]||r.movement_type}</td><td className={+r.quantity_delta>0?'good':'bad'}>{+r.quantity_delta>0?'+':''}{r.quantity_delta}</td><td>{money(r.unit_cost)}</td><td>{r.note||'—'}</td></tr>)}</tbody></table>{!filtered.length&&<p className="empty">Bu filtr üzrə stok hərəkəti tapılmadı.</p>}</div></section></>;
}

export function ReturnsPanel({sb,user,rows,products,orders,sales=[],say,load}){
 const [orderNumber,ON]=useState(''),[orderId,O]=useState(''),[itemId,I]=useState(''),[qty,Q]=useState(1),[reason,R]=useState('Müştəri qaytardı'),[condition,C]=useState('restock'),[refund,F]=useState(''),[busy,B]=useState(false),[search,S]=useState('');
 const [searched,SE]=useState(false);
 const normalizeOrder=value=>String(value||'').trim().replace(/^#+/,'').toLocaleLowerCase('az');
 const matches=searched&&normalizeOrder(orderNumber)?orders.filter(o=>normalizeOrder(o.order_number)===normalizeOrder(orderNumber)&&o.delivery_status==='delivered'&&(o.order_items||[]).some(i=>sales.some(s=>s.order_item_id===i.id))):[];
 const selectedOrder=matches.length===1?matches[0]:null;
 const soldItems=(selectedOrder?.order_items||[]).map(i=>{
  const sold=sales.filter(s=>s.order_item_id===i.id).reduce((n,s)=>n+Number(s.quantity||0),0);
  const returned=rows.filter(r=>r.order_item_id===i.id&&r.return_type==='return').reduce((n,r)=>n+Number(r.quantity||0),0);
  return {...i,soldQuantity:sold,returnedQuantity:returned,remaining:Math.max(0,sold-returned)};
 }).filter(i=>i.remaining>0);
 const item=soldItems.find(i=>i.id===itemId);
 const product=products.find(p=>p.id===item?.product_id);
 const remaining=item?.remaining||0;
 const visible=rows.filter(r=>{const p=products.find(x=>x.id===r.product_id);return [p?.name,r.reason,r.return_type].join(' ').toLocaleLowerCase('az').includes(search.toLocaleLowerCase('az'))});
 function findOrder(e){e.preventDefault();O('');I('');Q(1);F('');SE(true);if(!normalizeOrder(orderNumber)){say('Sifariş nömrəsini daxil et.');return}const found=orders.filter(o=>normalizeOrder(o.order_number)===normalizeOrder(orderNumber)&&o.delivery_status==='delivered'&&(o.order_items||[]).some(i=>sales.some(s=>s.order_item_id===i.id)));if(found.length===0)say('Bu nömrə ilə satılmış və təhvil verilmiş sifariş tapılmadı. Sifariş nömrəsini yoxla.');else if(found.length>1)say('Bu sifariş nömrəsi bir neçə sifarişdə mövcuddur. Dəqiq nömrə ilə yoxla.');else O(found[0].id)}
 async function submit(e){e.preventDefault();if(!selectedOrder||!item||!product)return say('Əvvəlcə sifarişi və qaytarılacaq məhsulu seç.');if(+qty<1||+qty>remaining)return say('Qaytarılan miqdar qalan satılmış miqdardan çox ola bilməz.');B(true);try{const result=await sb.from('returns').insert({owner_id:user.id,order_id:orderId,order_item_id:item.id,product_id:item.product_id,quantity:Number(qty),return_type:'return',item_condition:condition,reason:reason.trim(),refund_amount:Number(refund||0)});if(result.error)throw result.error;say('Qaytarma qeydə alındı. Satış hesabatları yenilənir, stok hərəkəti avtomatik yaradılır.');I('');Q(1);R('Müştəri qaytardı');C('restock');F('');await load()}catch(err){say(err.message||'Qaytarma qeydə alınmadı.')}finally{B(false)}}
 const productById=new Map(products.map(p=>[p.id,p]));
 return <><div className="toolbar"><div><h2>Qaytarma</h2><p>Yalnız sistemdə satılmış və təhvil verilmiş sifarişlər üzrə qaytarma qeydə alınır.</p></div><div className="return-toolbar-badge"><RotateCcw size={17}/> {rows.length} qeyd</div></div>
 <div className="return-layout"><section className="panel return-form-panel"><div className="return-form-head"><PackageCheck size={20}/><div><b>Yeni qaytarma</b><small>Sifariş nömrəsi ilə satılmış məhsulu tap</small></div></div><form className="return-form" onSubmit={findOrder}>
 <label>Sifariş nömrəsi<input type="text" inputMode="text" autoComplete="off" placeholder="Məsələn: 123456789" value={orderNumber} onChange={e=>{ON(e.target.value);SE(false);O('');I('')}} required/></label>
 <button className="primary" type="submit"><Search size={16}/> Sifarişi tap</button>
 </form>
 {searched&&matches.length===1&&selectedOrder&&<div className="return-order-summary"><div><small>Sifariş nömrəsi</small><b>#{selectedOrder.order_number}</b></div><div><small>Müştəri</small><b>{selectedOrder.customer_name||'—'}</b></div><div><small>Telefon</small><b>{selectedOrder.customer_phone||'—'}</b></div><div><small>Sifariş tarixi</small><b>{date(selectedOrder.ordered_at)}</b></div><div><small>Status</small><span className="badge green">Təhvil verilib · Satış qeydi var</span></div></div>}
 {searched&&matches.length===1&&<form className="return-form" onSubmit={submit}>
 <label>Satılmış məhsul<select required value={itemId} onChange={e=>{I(e.target.value);Q(1);F('')}}><option value="">Məhsul seç</option>{soldItems.map(i=><option key={i.id} value={i.id}>{i.product_name} · Satılıb: {i.soldQuantity} · Qaytarıla bilər: {i.remaining}</option>)}</select></label>
 {item&&<div className="return-product-summary"><b>{item.product_name}</b><span>Satılmış miqdar: {item.soldQuantity} ədəd</span><span>Əvvəl qaytarılıb: {item.returnedQuantity} ədəd</span><span>Qaytarıla bilən miqdar: {remaining} ədəd</span><span>Vahid satış qiyməti: {money(item.unit_sale_price)}</span><span>Ümumi satış məbləği: {money(Number(item.unit_sale_price||0)*item.soldQuantity)}</span></div>}
 <div className="return-fields"><label>Qaytarılan miqdar<input type="number" min="1" max={remaining||1} step="1" value={qty} onChange={e=>Q(e.target.value)} required disabled={!item}/></label><label>Geri ödəniş (AZN)<input type="number" min="0" step="0.01" value={refund} onChange={e=>F(e.target.value)} placeholder="0.00" disabled={!item}/></label></div>
 <label>Məhsulun vəziyyəti<select value={condition} onChange={e=>C(e.target.value)} disabled={!item}><option value="restock">Yararlıdır — anbara qaytar</option><option value="damaged">Zədəlidir — anbara əlavə etmə</option></select></label>
 <label>Qaytarılma səbəbi<textarea rows="3" required value={reason} onChange={e=>R(e.target.value)} placeholder="Qaytarılma səbəbini qeyd et" disabled={!item}/></label>
 <div className="return-warning"><AlertCircle size={16}/><span>Qeyd təsdiqlənəndə qaytarılan satış miqdarı və məbləği hesabatlardan çıxarılır. Yararlı məhsul stoka avtomatik əlavə olunur; zədələnmiş məhsul stok qalığına əlavə edilmir.</span></div>
 <button className="primary" disabled={busy||!item}>{busy?'Yadda saxlanılır…':<><Plus size={16}/> Qaytarmanı təsdiqlə</>}</button>
 </form>}
 {searched&&matches.length===1&&soldItems.length===0&&<p className="empty">Bu sifarişdə qaytarıla bilən məhsul qalmayıb.</p>}
 <section className="panel return-history-panel"><div className="return-history-head"><div><b>Qaytarma tarixçəsi</b><small>Bütün qeydə alınmış əməliyyatlar</small></div><div className="search"><Search/><input placeholder="Məhsul və səbəb axtar" value={search} onChange={e=>S(e.target.value)}/></div></div><div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Məhsul</th><th>Miqdar</th><th>Vəziyyət</th><th>Geri ödəniş</th><th>Səbəb</th></tr></thead><tbody>{visible.map(r=><tr key={r.id}><td>{date(r.created_at)}</td><td>{productById.get(r.product_id)?.name||'Məhsul arxivdədir'}</td><td>{r.quantity}</td><td><span className={'badge '+(r.item_condition==='restock'?'green':'yellow')}>{r.item_condition==='restock'?'Stoka qaytarılıb':'Zədəlidir'}</span></td><td>{money(r.refund_amount)}</td><td>{r.reason}</td></tr>)}</tbody></table>{!visible.length&&<p className="empty">Hələ qaytarma qeydi yoxdur.</p>}</div></section></section></div></>;
}
