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
  const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const quantity=Number(sale.quantity)||0;
  const unitPrice=Number(sale.customer_sale_price||sale.transferred_amount||0);
  const total=unitPrice*quantity;
  const receiptDate=date(sale.sold_at);
  const status=sale.paid_at?'Ödənilib':'Ödəniş gözləyir';
  const receiptNo=String(sale.id||'').slice(-8).toUpperCase()||'—';
  const html='<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZED STORE — Nağd satış qəbzi</title><style>@page{size:80mm auto;margin:4mm}*{box-sizing:border-box}body{width:72mm;margin:0 auto;color:#111;background:#fff;font:12px Arial,sans-serif}.center{text-align:center}.brand{font-size:20px;font-weight:800;letter-spacing:2px;margin:3mm 0 1mm}.sub{font-size:11px;margin-bottom:4mm}.rule{border:0;border-top:1px dashed #555;margin:3mm 0}.row{display:flex;justify-content:space-between;gap:8px;margin:2mm 0}.muted{color:#444;font-size:10px}.item{font-weight:700;line-height:1.35;margin:3mm 0}.total{font-size:16px;font-weight:800}.footer{font-size:10px;line-height:1.5;margin-top:5mm}.status{font-weight:700}@media screen{body{padding:5mm}}@media print{body{padding:0}}</style></head><body><div class="center"><div class="brand">ZED STORE</div><div class="sub">NAĞD SATIŞ QƏBZİ</div></div><hr class="rule"><div class="row"><span>Qəbz №</span><b>'+escape(receiptNo)+'</b></div><div class="row"><span>Tarix</span><span>'+escape(receiptDate)+'</span></div><div class="row"><span>Müştəri</span><span>'+escape(sale.customer_name||'Pərakəndə müştəri')+'</span></div><hr class="rule"><div class="item">'+escape(sale.product_name||'Məhsul')+'</div><div class="row"><span>'+quantity+' ədəd × '+escape(money(unitPrice))+'</span><b>'+escape(money(total))+'</b></div><hr class="rule"><div class="row total"><span>CƏMİ</span><span>'+escape(money(total))+'</span></div><div class="row"><span>Ödəniş statusu</span><span class="status">'+status+'</span></div><hr class="rule"><div class="center footer">Alışınız üçün təşəkkür edirik!<br/>ZED STORE</div><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),250));window.addEventListener("afterprint",()=>window.close());</script></body></html>';
  const win=window.open('','_blank','width=420,height=720');
  if(!win){window.alert('Qəbz pəncərəsi bloklandı. Brauzerdə pop-up icazəsi ver.');return}
  win.document.open();win.document.write(html);win.document.close();
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
  <section className="panel cash-sales-list"><div className="cash-sales-list-head"><b>Satış tarixçəsi</b><span>{rows.length} qeyd</span></div>{rows.map(s=><article className="cash-sale-row" key={s.id}><div className="cash-sale-thumb">{s.product_image_url?<img src={s.product_image_url} alt=""/>:<Boxes size={23}/>}</div><div className="cash-sale-info"><b>{s.product_name}</b><small>{s.customer_name?`Müştəri: ${s.customer_name} · `:''}{date(s.sold_at)} · {s.quantity} ədəd · Maya: {money(Number(s.unit_cost)*Number(s.quantity))}</small><small>Satış qiyməti: {money(s.customer_sale_price)} × {s.quantity} · Mənfəət: {money(s.net_profit)}</small></div><div className="cash-sale-total"><b>{money(Number(s.customer_sale_price)*Number(s.quantity))}</b><span className={s.paid_at?'is-paid':'is-unpaid'}>{s.paid_at?'Ödənilib':'Ödəniş gözləyir'}</span><button type="button" className="pay" onClick={()=>printReceipt(s)}><Printer size={14}/> Qəbz çıxart</button>{!s.paid_at&&<button className="pay pay-confirm" disabled={busy} onClick={()=>confirmPaid(s)}><CheckCircle2 size={14}/> Ödənilib qeyd et</button>}</div></article>)}{!rows.length&&<p className="empty">Hələ nağd satış yaradılmayıb.</p>}</section>
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
