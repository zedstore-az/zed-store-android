import React,{useMemo,useState} from 'react';
import {Plus,Search,CheckCircle2,Clock3,Boxes,Wallet} from 'lucide-react';

const money=n=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN'}).format(Number(n||0));
const date=d=>d?new Date(d).toLocaleString('az-AZ'):'—';

export default function CashSales({client,products=[],sales=[],onRefresh=()=>{}}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[productId,setProductId]=useState(''),[qty,setQty]=useState(1),[price,setPrice]=useState(''),[busy,setBusy]=useState(false);
 const available=useMemo(()=>products.filter(p=>p.is_active!==false&&Number(p.stock_qty)>0),[products]);
 const chosen=available.find(p=>p.id===productId)||null;
 const rows=useMemo(()=>sales.filter(s=>s.sale_channel==='cash').sort((a,b)=>new Date(b.sold_at)-new Date(a.sold_at)),[sales]);
 const financials=useMemo(()=>rows.reduce((acc,s)=>{
  const quantity=Number(s.quantity)||0;
  const revenue=Number(s.customer_sale_price||s.transferred_amount||0)*quantity;
  const cost=Number(s.unit_cost||0)*quantity;
  acc.revenue+=revenue;
  acc.cost+=cost;
  acc.profit+=revenue-cost;
  if(!s.paid_at)acc.pending+=revenue;
  return acc;
 },{revenue:0,cost:0,profit:0,pending:0}),[rows]);
 const matches=available.filter(p=>(p.name+' '+(p.sku||'')+' '+(p.barcode||'')).toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az')));
 const total=Math.max(0,Number(price)||0)*Math.max(1,Number(qty)||1);
 const profit=(Math.max(0,Number(price)||0)-Number(chosen?.cost_price||0))*Math.max(1,Number(qty)||1);
 function startCreate(){setProductId('');setQty(1);setPrice('');setQuery('');setOpen(true)}
 async function createSale(e){
  e.preventDefault();
  if(!chosen)return alert('Əvvəlcə məhsul seç.');
  const q=Number(qty),unitPrice=Number(price);
  if(!Number.isInteger(q)||q<1||q>Number(chosen.stock_qty))return alert('Miqdar mövcud anbar qalığına uyğun olmalıdır.');
  if(!Number.isFinite(unitPrice)||unitPrice<=0)return alert('Satış qiymətini düzgün daxil et.');
  setBusy(true);
  const {error}=await client.rpc('create_cash_sale',{
   p_product_id:chosen.id,p_quantity:q,p_unit_price:unitPrice
  });
  setBusy(false);
  if(error){alert('Nağd satış yaradılmadı: '+error.message);return}
  setOpen(false);await onRefresh();
 }
 async function confirmPaid(sale){
  if(!window.confirm('Ödənişi təsdiqləyirsən? Məhsul artıq satış yaradılan anda anbardan çıxarılıb. Təsdiqdən sonra satış hesabatlara daxil ediləcək.'))return;
  setBusy(true);
  const {error}=await client.rpc('confirm_cash_sale_payment',{p_sale_id:sale.id});
  setBusy(false);
  if(error){alert('Ödənişi təsdiqləmək olmadı: '+error.message);return}
  await onRefresh();
 }
 return <div className="cash-sales">
  <div className="toolbar"><div><h2>Nağd satış</h2><p>Satış qiymətini özün təyin et. Komissiya və əlavə tutulma yoxdur.</p></div><button className="primary" onClick={startCreate}><Plus size={17}/> Yeni nağd satış</button></div>
  <div className="cash-sales-summary"><div><Wallet/><span><small>Ümumi nağd satış</small><b>{money(financials.revenue)}</b></span></div><div><Boxes/><span><small>Ümumi maya dəyəri</small><b>{money(financials.cost)}</b></span></div><div><CheckCircle2/><span><small>Ümumi mənfəət</small><b>{money(financials.profit)}</b></span></div><div><Clock3/><span><small>Köçürülməsi gözlənilən</small><b>{money(financials.pending)}</b></span></div><div><span><small>Satış qeydləri</small><b>{rows.length}</b></span></div></div>
  <section className="panel cash-sales-list"><div className="cash-sales-list-head"><b>Satış tarixçəsi</b><span>{rows.length} qeyd</span></div>{rows.map(s=><article className="cash-sale-row" key={s.id}><div className="cash-sale-thumb">{s.product_image_url?<img src={s.product_image_url} alt=""/>:<Boxes size={23}/>}</div><div className="cash-sale-info"><b>{s.product_name}</b><small>{date(s.sold_at)} · {s.quantity} ədəd · Maya: {money(Number(s.unit_cost)*Number(s.quantity))}</small><small>Satış qiyməti: {money(s.customer_sale_price)} × {s.quantity} · Mənfəət: {money(s.net_profit)}</small></div><div className="cash-sale-total"><b>{money(Number(s.customer_sale_price)*Number(s.quantity))}</b><span className={s.paid_at?'is-paid':'is-unpaid'}>{s.paid_at?'Ödənilib':'Ödəniş gözləyir'}</span>{!s.paid_at&&<button className="pay pay-confirm" disabled={busy} onClick={()=>confirmPaid(s)}><CheckCircle2 size={14}/> Ödənilib qeyd et</button>}</div></article>)}{!rows.length&&<p className="empty">Hələ nağd satış yaradılmayıb.</p>}</section>
  {open&&<div className="shade" onClick={e=>e.target===e.currentTarget&&!busy&&setOpen(false)}><section className="modal cash-sale-modal"><header><b>Yeni nağd satış</b><button type="button" onClick={()=>setOpen(false)}>×</button></header><form className="formmodal" onSubmit={createSale}>
   <div className="search cash-product-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Məhsul adı, SKU və ya barkod axtar..."/></div>
   <div className="cash-product-list">{matches.slice(0,40).map(p=><button type="button" key={p.id} className={'cash-product-option '+(productId===p.id?'selected':'')} onClick={()=>{setProductId(p.id);setPrice(String(p.sale_price||''))}}><span>{(p.image_urls?.[0]||p.image_url)?<img src={p.image_urls?.[0]||p.image_url} alt=""/>:<Boxes size={20}/>}</span><b>{p.name}</b><small>Stok: {p.stock_qty} · {p.sku||'SKU yoxdur'}</small></button>)}{!matches.length&&<p className="empty">Məhsul tapılmadı.</p>}</div>
   {chosen&&<><div className="cash-selected"><b>{chosen.name}</b><span>Maya dəyəri: {money(chosen.cost_price)} / ədəd</span></div><div className="fields"><label>Miqdar<input type="number" min="1" max={chosen.stock_qty} step="1" value={qty} onChange={e=>setQty(e.target.value)}/></label><label>Satış qiyməti (AZN)<input type="number" min="0.01" step="0.01" required value={price} onChange={e=>setPrice(e.target.value)} placeholder="Öz qiymətini yaz"/></label></div><div className="cash-sale-preview"><span>Komissiya <b>0,00 AZN</b></span><span>Yekun satış <b>{money(total)}</b></span><span>Gözlənilən mənfəət <b>{money(profit)}</b></span></div><p className="cash-sale-note">Satışı yaratdıqda məhsul dərhal anbardan çıxacaq və Nağd satış bölməsində “Ödəniş gözləyir” statusu ilə saxlanacaq. Ödəniş təsdiqlənənədək hesabatlara daxil edilməyəcək.</p></>}
   <button className="primary" disabled={busy||!chosen}>Nağd satışı yarat</button>
  </form></section></div>}
 </div>
}
