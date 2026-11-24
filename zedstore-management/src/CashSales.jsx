import React,{useMemo,useState} from 'react';
import {Plus,Search,CheckCircle2,Clock3,Boxes,Wallet,Printer} from 'lucide-react';

const money=n=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN'}).format(Number(n||0));
const date=d=>d?new Date(d).toLocaleString('az-AZ'):'—';

export default function CashSales({client,products=[],sales=[],onRefresh=()=>{}}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[customerName,setCustomerName]=useState(''),[productId,setProductId]=useState(''),[qty,setQty]=useState(1),[price,setPrice]=useState(''),[busy,setBusy]=useState(false);
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
 function startCreate(){setProductId('');setQty(1);setPrice('');setQuery('');setCustomerName('');setOpen(true)}
 async function createSale(e){
  e.preventDefault();
  if(!chosen)return alert('Əvvəlcə məhsul seç.');
  const q=Number(qty),unitPrice=Number(price);
  if(!Number.isInteger(q)||q<1||q>Number(chosen.stock_qty))return alert('Miqdar mövcud anbar qalığına uyğun olmalıdır.');
  if(!Number.isFinite(unitPrice)||unitPrice<=0)return alert('Satış qiymətini düzgün daxil et.');
  setBusy(true);
  const {data,error}=await client.rpc('create_cash_sale',{
   p_product_id:chosen.id,p_quantity:q,p_unit_price:unitPrice
  });
  if(error){setBusy(false);alert('Nağd satış yaradılmadı: '+error.message);return}
  const saleId=typeof data==='string'?data:(data?.id||data?.sale_id||data?.sale?.id);
  const cleanName=customerName.trim();
  if(cleanName&&saleId){
   const {error:nameError}=await client.from('sales').update({customer_name:cleanName}).eq('id',saleId);
   if(nameError){setBusy(false);alert('Satış yaradıldı, amma müştəri adı yadda saxlanmadı: '+nameError.message);await onRefresh();return}
  }
  setBusy(false);setOpen(false);await onRefresh();
 }
 function printReceipt(sale){
  const quantity=Number(sale.quantity)||0;
  const unitPrice=Number(sale.customer_sale_price||sale.transferred_amount||0);
  const total=unitPrice*quantity;
  const receiptNo=String(sale.id||'').slice(0,8).toUpperCase()||'—';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const receiptDate=date(sale.sold_at);
  const html='<!doctype html><html lang="az"><head><meta charset="utf-8"><title>Qəbz</title><style>body{font:14px Arial,sans-serif;color:#111;padding:28px;max-width:720px;margin:auto}h1{font-size:24px;margin:0 0 4px}.muted{color:#555;font-size:12px}.top{display:flex;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:16px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0}.meta div{padding:8px;background:#f5f5f5}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{text-align:left;padding:10px 6px;border-bottom:1px solid #ddd}th:last-child,td:last-child{text-align:right}.total{text-align:right;font-size:19px;font-weight:bold;margin-top:18px}.foot{margin-top:28px;border-top:1px solid #ddd;padding-top:12px}@media print{button{display:none}body{padding:1.5cm 0 0}}</style></head><body><div class="top"><div><h1>ZED STORE satış qəbzi</h1><div class="muted">Kassa: 1</div><div class="muted">Telefon: (+994)10 529 83 19</div></div><div><b>Qəbz #'+esc(receiptNo)+'</b><div class="muted">'+esc(receiptDate)+'</div></div></div><div class="meta"><div><b>Müştəri</b><br>'+esc(String(sale.customer_name||'').trim()||'—')+'</div><div><b>Mənbə</b><br>Nağd satış<br><span class="muted">Satış növü: Pərakəndə</span></div></div><table><thead><tr><th>Məhsul</th><th>Miqdar</th><th>Qiymət</th><th>Cəmi</th></tr></thead><tbody><tr><td>'+esc(sale.product_name||'Məhsul')+'</td><td>'+quantity+'</td><td>'+money(unitPrice)+'</td><td>'+money(total)+'</td></tr></tbody></table><div class="total">Yekun: '+money(total)+'</div><div class="foot muted">Təşəkkür edirik! ZED STORE</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>';
  const w=window.open('','_blank','width=800,height=900');
  if(!w){alert('Qəbz pəncərəsi bloklandı. Brauzerdə pop-up icazəsi ver.');return}
  w.document.open();w.document.write(html);w.document.close();
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
  <section className="panel cash-sales-list"><div className="cash-sales-list-head"><b>Satış tarixçəsi</b><span>{rows.length} qeyd</span></div>{rows.map(s=><article className="cash-sale-row" key={s.id}><div className="cash-sale-thumb">{s.product_image_url?<img src={s.product_image_url} alt=""/>:<Boxes size={23}/>}</div><div className="cash-sale-info"><b>{s.product_name}</b><small>{s.customer_name?`Müştəri: ${s.customer_name} · `:''}{date(s.sold_at)} · {s.quantity} ədəd · Maya: {money(Number(s.unit_cost)*Number(s.quantity))}</small><small>Satış qiyməti: {money(s.customer_sale_price)} × {s.quantity} · Mənfəət: {money(s.net_profit)}</small></div><div className="cash-sale-total"><b>{money(Number(s.customer_sale_price)*Number(s.quantity))}</b><span className={s.paid_at?'is-paid':'is-unpaid'}>{s.paid_at?'Ödənilib':'Ödəniş gözləyir'}</span><button type="button" className="primary" onClick={()=>printReceipt(s)}><Printer size={15}/> Qəbz çap et</button>{!s.paid_at&&<button className="pay pay-confirm" disabled={busy} onClick={()=>confirmPaid(s)}><CheckCircle2 size={14}/> Ödənilib qeyd et</button>}</div></article>)}{!rows.length&&<p className="empty">Hələ nağd satış yaradılmayıb.</p>}</section>
  {open&&<div className="shade" onClick={e=>e.target===e.currentTarget&&!busy&&setOpen(false)}><section className="modal cash-sale-modal"><header><b>Yeni nağd satış</b><button type="button" onClick={()=>setOpen(false)}>×</button></header><form className="formmodal" onSubmit={createSale}>
   <label>Müştərinin adı<input type="text" value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Müştərinin adını daxil et" autoComplete="off"/></label>
   <div className="search cash-product-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{
    if(e.key!=='Enter')return;
    e.preventDefault();e.stopPropagation();
    const scanned=String(e.currentTarget.value||'').normalize('NFKC').trim();
    if(!scanned)return;
    const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/[\s-]/g,'').toLocaleUpperCase('en-US');
    const code=normalize(scanned);
    const found=available.find(p=>normalize(p.barcode)===code);
    if(found){setProductId(found.id);setPrice(String(found.sale_price||''));}
    else alert('Bu barkodla aktiv və stokda olan məhsul tapılmadı: '+scanned);
   }} placeholder="Məhsul adı, SKU yaz və ya barkodu skan et..."/></div>
   <div className="cash-product-list">{matches.slice(0,40).map(p=><button type="button" key={p.id} className={'cash-product-option '+(productId===p.id?'selected':'')} onClick={()=>{setProductId(p.id);setPrice(String(p.sale_price||''))}}><span>{(p.image_urls?.[0]||p.image_url)?<img src={p.image_urls?.[0]||p.image_url} alt=""/>:<Boxes size={20}/>}</span><b>{p.name}</b><small>Stok: {p.stock_qty} · SKU: {p.sku||'yoxdur'}<br/>Barkod: {p.barcode||'yoxdur'}</small></button>)}{!matches.length&&<p className="empty">Məhsul tapılmadı.</p>}</div>
   {chosen&&<><div className="cash-selected"><b>{chosen.name}</b><span>Maya dəyəri: {money(chosen.cost_price)} / ədəd</span></div><div className="fields"><label>Miqdar<input type="number" min="1" max={chosen.stock_qty} step="1" value={qty} onChange={e=>setQty(e.target.value)}/></label><label>Satış qiyməti (AZN)<input type="number" min="0.01" step="0.01" required value={price} onChange={e=>setPrice(e.target.value)} placeholder="Öz qiymətini yaz"/></label></div><div className="cash-sale-preview"><span>Komissiya <b>0,00 AZN</b></span><span>Yekun satış <b>{money(total)}</b></span><span>Gözlənilən mənfəət <b>{money(profit)}</b></span></div><p className="cash-sale-note">Satışı yaratdıqda məhsul dərhal anbardan çıxacaq və Nağd satış bölməsində “Ödəniş gözləyir” statusu ilə saxlanacaq. Ödəniş təsdiqlənənədək hesabatlara daxil edilməyəcək.</p></>}
   <button className="primary" disabled={busy||!chosen}>Nağd satışı yarat</button>
  </form></section></div>}
 </div>
}
