import React,{useMemo,useState} from 'react';
import {Download,FileSpreadsheet,FileText,Search,Users,Repeat2,CalendarDays,Printer,ShoppingCart,PackageCheck,Wallet,TrendingUp,Plus,Trash2} from 'lucide-react';
import './CustomerReports.css';

const money=n=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN'}).format(Number(n||0));
const date=d=>d?new Date(d).toLocaleDateString('az-AZ'):'—';
const dayKey=d=>{if(!d)return '';const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const monthKey=d=>dayKey(d).slice(0,7);
const norm=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('az-AZ').replace(/[^\p{L}\p{N}]/gu,'');
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function exportExcel(sheets,name){
 const xml='<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#123B70" ss:Pattern="Solid"/></Style></Styles>'+
 sheets.map(sheet=>'<Worksheet ss:Name="'+esc(sheet.name.slice(0,31))+'"><Table>'+sheet.rows.map((row,i)=>'<Row>'+row.map(v=>{const numeric=typeof v==='number'&&Number.isFinite(v);return '<Cell'+(i===0?' ss:StyleID="h"':'')+'><Data ss:Type="'+(numeric?'Number':'String')+'">'+esc(v)+'</Data></Cell>'}).join('')+'</Row>').join('')+'</Table></Worksheet>').join('')+'</Workbook>';
 downloadBlob(new Blob([xml],{type:'application/vnd.ms-excel;charset=utf-8'}),name+'.xls');
}
function SectionTitle({title,description}){return <div className="cr-section-title"><div><h3>{title}</h3><p>{description}</p></div></div>}

export function CustomerAnalyticsPanel({orders=[],sales=[],returns=[],searchValue=''}) {
 const [query,Q]=useState(searchValue),[selected,S]=useState('');
 const customers=useMemo(()=>{
  const completed=orders.filter(o=>o.delivery_status==='delivered');
  const byKey=new Map();
  for(const order of completed){
   const name=String(order.customer_name||'Adı qeyd edilməyib').trim()||'Adı qeyd edilməyib';
   const phone=String(order.customer_phone||'').trim();
   const key=phone?('phone:'+norm(phone)):('name:'+norm(name));
   if(!byKey.has(key))byKey.set(key,{key,name,phone,orders:[],total:0,quantity:0,last:null,products:new Map()});
   const c=byKey.get(key);c.orders.push(order);
   if(!c.phone&&phone)c.phone=phone;
  }
  for(const sale of sales){
   const order=completed.find(o=>o.id===sale.order_id);
   if(!order)continue;
   const name=String(order.customer_name||'Adı qeyd edilməyib').trim()||'Adı qeyd edilməyib';
   const phone=String(order.customer_phone||'').trim();
   const key=phone?('phone:'+norm(phone)):('name:'+norm(name));
   const c=byKey.get(key);if(!c)continue;
   const qty=Number(sale.quantity||0);
   c.total+=Number(sale.transferred_amount||0)*qty;c.quantity+=qty;
   const soldAt=sale.sold_at||order.delivered_at||order.ordered_at;
   if(!c.last||new Date(soldAt)>new Date(c.last))c.last=soldAt;
   c.products.set(sale.product_name,(c.products.get(sale.product_name)||0)+qty);
  }
  return [...byKey.values()].map(c=>({...c,orderCount:c.orders.length,orders:c.orders.sort((a,b)=>new Date(b.delivered_at||b.ordered_at)-new Date(a.delivered_at||a.ordered_at))})).sort((a,b)=>b.total-a.total||b.orderCount-a.orderCount);
 },[orders,sales]);
 const filtered=customers.filter(c=>(c.name+' '+c.phone).toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az')));
 const repeat=customers.filter(c=>c.orderCount>=2);
 const chosen=customers.find(c=>c.key===selected);
 return <div className="cr-page">
  <div className="cr-stats"><div className="cr-stat"><Users/><small>Alış etmiş müştərilər</small><b>{customers.length}</b></div><div className="cr-stat"><Repeat2/><small>Təkrar alış edənlər</small><b>{repeat.length}</b></div><div className="cr-stat"><FileText/><small>Ümumi satış dövriyyəsi</small><b>{money(customers.reduce((n,c)=>n+c.total,0))}</b></div><div className="cr-stat"><CalendarDays/><small>Satış qeydi olanlar</small><b>{customers.filter(c=>c.total>0).length}</b></div></div>
  <section className="panel cr-panel"><SectionTitle title="Müştəri reytinqi" description="Təhvil edilmiş sifarişlər əsasında. Ləğv edilən və tamamlanmamış sifarişlər hesablanmır."/>
   <div className="cr-toolbar"><div className="search"><Search/><input placeholder="Müştəri adı və ya telefon axtar..." value={query} onChange={e=>Q(e.target.value)}/></div><span>{filtered.length} müştəri</span></div>
   <div className="tablewrap"><table><thead><tr><th>Müştəri</th><th>Telefon</th><th>Sifariş sayı</th><th>Ümumi satış</th><th>Məhsul sayı</th><th>Son alış</th><th></th></tr></thead><tbody>{filtered.map(c=><tr key={c.key}><td><b>{c.name}</b></td><td>{c.phone||'—'}</td><td><span className={'badge '+(c.orderCount>=2?'green':'yellow')}>{c.orderCount}</span></td><td><b>{money(c.total)}</b></td><td>{c.quantity}</td><td>{date(c.last)}</td><td><button className="outline cr-detail-button" onClick={()=>S(selected===c.key?'':c.key)}>{selected===c.key?'Bağla':'Tarixçə'}</button></td></tr>)}</tbody></table>{!filtered.length&&<p className="empty">Müştəri tapılmadı.</p>}</div>
  </section>
  <section className="panel cr-panel"><SectionTitle title="Təkrar alış edən müştərilər" description="İki və daha çox təhvil edilmiş sifarişi olan müştərilər."/>
   <div className="tablewrap"><table><thead><tr><th>Müştəri</th><th>Telefon</th><th>Alış sayı</th><th>Ümumi satış</th><th>Son alış</th></tr></thead><tbody>{repeat.map(c=><tr key={c.key}><td><b>{c.name}</b></td><td>{c.phone||'—'}</td><td>{c.orderCount}</td><td>{money(c.total)}</td><td>{date(c.last)}</td></tr>)}</tbody></table>{!repeat.length&&<p className="empty">Hələ təkrar alış qeydi yoxdur.</p>}</div>
  </section>
  {chosen&&<section className="panel cr-panel"><SectionTitle title={chosen.name+' — alış tarixçəsi'} description={(chosen.phone||'Telefon qeyd edilməyib')+' · '+chosen.orderCount+' təhvil edilmiş sifariş'}/><div className="tablewrap"><table><thead><tr><th>Sifariş</th><th>Mənbə</th><th>Tarix</th><th>Məhsullar</th><th>Ödəniş</th></tr></thead><tbody>{chosen.orders.map(o=><tr key={o.id}><td>#{o.order_number||String(o.id).slice(0,8).toUpperCase()}</td><td>{o.source||'—'}</td><td>{date(o.delivered_at||o.ordered_at)}</td><td>{(o.order_items||[]).map(i=>i.product_name+' × '+i.quantity).join(', ')||'—'}</td><td>{o.payment_status==='paid'?'Ödənilib':'Gözləyir'}</td></tr>)}</tbody></table></div></section>}
  <p className="cr-footnote">Qeyd: telefon nömrəsi yoxdursa, müştərilər adına görə qruplaşdırılır. Eyni adlı fərqli şəxslər birləşə bilər.</p>
 </div>;
}

export function BusinessReportsPanel({sales=[],orders=[],products=[],purchases=[],suppliers=[],financeEntries=[],returns=[],adjustedSales=[]}){
 const today=dayKey(new Date()),month=monthKey(new Date());
 const [from,F]=useState(month+'-01'),[to,T]=useState(today);
 const inRange=d=>{const k=dayKey(d);return !!k&&(!from||k>=from)&&(!to||k<=to)};
 const successfulOrderIds=new Set(orders.filter(o=>o.delivery_status==='delivered'&&o.payment_status==='paid'&&!!o.paid_at).map(o=>o.id));
 const sold=adjustedSales.filter(s=>!!s.paid_at&&successfulOrderIds.has(s.order_id)&&inRange(s.paid_at||s.sold_at));
 const dailyRows=sold.map(s=>({Tarix:date(s.paid_at||s.sold_at),Məhsul:s.product_name,Miqdar:Number(s.quantity||0),Dövriyyə:Number(s.transferred_amount||0)*Number(s.quantity||0),Mənfəət:Number(s.net_profit||0),Ödəniş:'Ödənilib'}));
 const successfulQuantity=sold.reduce((n,s)=>n+Number(s.quantity||0),0);
 const successfulCost=sold.reduce((n,s)=>n+Number(s.unit_cost||0)*Number(s.quantity||0),0);
 const successfulGross=sold.reduce((n,s)=>n+Number(s.birmarket_sale_price||0)*Number(s.quantity||0),0);
 const successfulPayout=sold.reduce((n,s)=>n+Number(s.transferred_amount||0)*Number(s.quantity||0),0);
 const successfulProfit=sold.reduce((n,s)=>n+Number(s.net_profit||0),0);
 const productMap=new Map(products.map(p=>[p.id,p]));
 const productGroups=[...sold.reduce((map,s)=>{const p=productMap.get(s.product_id)||{};const key=s.product_id||((s.product_name||'')+'|'+(p.sku||''));const row=map.get(key)||{name:s.product_name||p.name||'Məhsul',sku:p.sku||s.sku||'—',quantity:0,cost:0,gross:0,payout:0};const q=Number(s.quantity||0);row.quantity+=q;row.cost+=Number(s.unit_cost||0)*q;row.gross+=Number(s.birmarket_sale_price||0)*q;row.payout+=Number(s.transferred_amount||0)*q;map.set(key,row);return map},new Map()).values()].map(x=>({...x,unitCost:x.quantity?x.cost/x.quantity:0,unitSale:x.quantity?x.gross/x.quantity:0})).sort((a,b)=>b.quantity-a.quantity);
 const expenses=financeEntries.filter(e=>e.entry_type==='expense'&&e.status==='paid'&&inRange(e.paid_at||e.created_at));
 const purchasesInRange=purchases.filter(p=>inRange(p.purchased_at));
 const stockRows=products.map(p=>({Məhsul:p.name,SKU:p.sku||'',Kateqoriya:p.category||'',Qalıq:Number(p.stock_qty||0),Maya:Number(p.cost_price||0),Anbar_dəyəri:Number(p.stock_qty||0)*Number(p.cost_price||0)}));
 const purchaseRows=purchasesInRange.map(p=>({Tarix:date(p.purchased_at),Məhsul:products.find(x=>x.id===p.product_id)?.name||'Məhsul',Təchizatçı:p.supplier_name||suppliers.find(s=>s.id===p.supplier_id)?.name||'—',Miqdar:Number(p.quantity||0),Vahid_maya:Number(p.unit_cost||0),Cəmi:Number(p.total_amount||0),Ödənilib:Number(p.paid_amount||0),Status:p.payment_status||'—'}));
 const expenseRows=expenses.map(e=>({Tarix:date(e.paid_at||e.created_at),Kateqoriya:e.title||e.entry_type,Məbləğ:Number(e.amount||0),Hesab:e.payment_account||'—',Qeyd:e.notes||''}));
 const turnover=successfulPayout;
 const grossProfit=successfulProfit;
 const expenseTotal=expenses.reduce((n,e)=>n+Number(e.amount||0),0);
 const profitLoss=grossProfit-expenseTotal;
 const purchaseTotal=purchasesInRange.reduce((n,p)=>n+Number(p.total_amount||0),0);
 const sheets=[
  {name:'Uğurlu satış icmalı',rows:[['Göstərici','Nəticə'],['Hesabat dövrü',(from||'Başlanğıcdan')+' — '+(to||'bu günə qədər')],['Yalnız ödənilmiş və təhvil verilmiş satışlar',sold.length],['Satılmış malların ümumi sayı (ədəd)',successfulQuantity],['Maya dəyəri — cəmi AZN',successfulCost],['Komissiyalar çıxıldıqdan sonra köçən pul AZN',successfulPayout],['Mənfəət AZN',successfulProfit],['Komissiyasız ümumi satış qiyməti AZN',successfulGross]]},
  {name:'Satılmış mallar',rows:[['Məhsul adı','SKU','Miqdar','Vahid maya AZN','Ümumi maya AZN','Vahid satış qiyməti AZN','Ümumi satış qiyməti AZN','Köçən pul AZN'],...productGroups.map(x=>[x.name,x.sku,x.quantity,x.unitCost,x.cost,x.unitSale,x.gross,x.payout])]},
  {name:'Gündəlik satış',rows:[['Tarix','Məhsul','Miqdar','Köçən pul AZN','Mənfəət AZN','Ödəniş'],...dailyRows.map(x=>[x.Tarix,x.Məhsul,x.Miqdar,x.Dövriyyə,x.Mənfəət,x.Ödəniş])]},
  {name:'Mənfəət-zərər',rows:[['Göstərici','Məbləğ AZN'],['Satışlardan xalis mənfəət',grossProfit],['Əməliyyat xərcləri',expenseTotal],['Yekun mənfəət / zərər',profitLoss]]},
  {name:'Anbar',rows:[['Məhsul','SKU','Kateqoriya','Qalıq','Vahid maya','Anbar dəyəri'],...stockRows.map(x=>[x.Məhsul,x.SKU,x.Kateqoriya,x.Qalıq,x.Maya,x.Anbar_dəyəri])]},
  {name:'Alışlar',rows:[['Tarix','Məhsul','Təchizatçı','Miqdar','Vahid maya','Cəmi','Ödənilib','Status'],...purchaseRows.map(x=>[x.Tarix,x.Məhsul,x.Təchizatçı,x.Miqdar,x.Vahid_maya,x.Cəmi,x.Ödənilib,x.Status])]},
  {name:'Xərclər',rows:[['Tarix','Kateqoriya','Məbləğ','Hesab','Qeyd'],...expenseRows.map(x=>[x.Tarix,x.Kateqoriya,x.Məbləğ,x.Hesab,x.Qeyd])]}
 ];
 const exportPdf=()=>{const body=document.body;body.classList.add('zed-print-documents');const cleanup=()=>body.classList.remove('zed-print-documents');window.addEventListener('afterprint',cleanup,{once:true});window.print();window.setTimeout(cleanup,5000)};
 return <div className="cr-page cr-reports">
  <div className="toolbar"><div><h2>Sənədlər və hesabatlar</h2><p>Tarix aralığına görə real satış, anbar, alış və xərc məlumatları.</p></div><div className="cr-export-actions"><button className="outline" onClick={()=>exportExcel(sheets,'zedstore-hesabatlar')}><FileSpreadsheet size={16}/> Excel (.xls) yüklə</button><button className="primary" onClick={exportPdf}><Printer size={16}/> PDF / Çap</button></div></div>
  <section className="panel cr-panel cr-filter-panel"><div className="cr-date-filters"><label>Başlanğıc tarix<input type="date" value={from} onChange={e=>F(e.target.value)}/></label><label>Son tarix<input type="date" value={to} onChange={e=>T(e.target.value)}/></label><button className="outline" onClick={()=>{F(month+'-01');T(today)}}>Bu ay</button><button className="outline" onClick={()=>{F(today);T(today)}}>Bu gün</button></div><small className="cr-range-note">Hesabat dövrü: {from||'Başlanğıcdan'} — {to||'bu günə qədər'}</small></section>
  <div className="cr-stats"><div className="cr-stat"><FileText/><small>Ödənilmiş satış sətirləri</small><b>{sold.length}</b></div><div className="cr-stat"><Download/><small>Satılmış malların sayı</small><b>{successfulQuantity}</b></div><div className="cr-stat"><Users/><small>Köçən pul (komissiyasız)</small><b>{money(successfulPayout)}</b></div><div className="cr-stat"><FileText/><small>Satış mənfəəti</small><b>{money(successfulProfit)}</b></div></div>
  <section className="panel cr-panel report-print successful-summary"><SectionTitle title="Uğurlu satışların yekun hesabatı" description="Yalnız təhvil verilmiş və ödənişi təsdiqlənmiş satışlar. Gözləmədə olan və ləğv edilən sifarişlər daxil edilmir."/><div className="cr-pl-grid"><div><small>Satılmış malların ümumi sayı</small><b>{successfulQuantity} ədəd</b></div><div><small>Maya dəyəri — cəmi</small><b>{money(successfulCost)}</b></div><div><small>Komissiyalar çıxıldıqdan sonra köçən pul</small><b>{money(successfulPayout)}</b></div><div><small>Mənfəət</small><b className={successfulProfit>=0?'good':'bad'}>{money(successfulProfit)}</b></div><div><small>Komissiyasız satış dəyəri</small><b>{money(successfulGross)}</b></div><div><small>Məhsul çeşidi</small><b>{productGroups.length}</b></div></div></section>
  <section className="panel cr-panel report-print"><SectionTitle title="Satılmış malların siyahısı" description="Məhsul və SKU üzrə qruplaşdırılıb; miqdar və ümumi maya/satış dəyərləri toplanıb."/><div className="tablewrap"><table><thead><tr><th>Məhsul</th><th>SKU</th><th>Miqdar</th><th>Vahid maya</th><th>Ümumi maya</th><th>Vahid satış qiyməti</th><th>Ümumi satış qiyməti</th><th>Köçən pul</th></tr></thead><tbody>{productGroups.map((x,i)=><tr key={i}><td>{x.name}</td><td>{x.sku||'—'}</td><td>{x.quantity}</td><td>{money(x.unitCost)}</td><td>{money(x.cost)}</td><td>{money(x.unitSale)}</td><td>{money(x.gross)}</td><td>{money(x.payout)}</td></tr>)}</tbody></table>{!productGroups.length&&<p className="empty">Bu tarix aralığında ödənişi alınmış uğurlu satış yoxdur.</p>}</div></section>
  <section className="panel cr-panel report-print"><SectionTitle title="Gündəlik satış hesabatı" description="Ödənişi təsdiqlənmiş satışlar; seçilmiş tarix aralığı."/><div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Məhsul</th><th>Miqdar</th><th>Dövriyyə</th><th>Mənfəət</th><th>Ödəniş</th></tr></thead><tbody>{dailyRows.map((x,i)=><tr key={i}><td>{x.Tarix}</td><td>{x.Məhsul}</td><td>{x.Miqdar}</td><td>{money(x.Dövriyyə)}</td><td>{money(x.Mənfəət)}</td><td>{x.Ödəniş}</td></tr>)}</tbody></table>{!dailyRows.length&&<p className="empty">Bu tarix aralığında ödənilmiş satış yoxdur.</p>}</div></section>
  <section className="panel cr-panel report-print"><SectionTitle title="Aylıq mənfəət-zərər hesabatı" description="Satışların xalis mənfəətindən ödənilmiş əməliyyat xərcləri çıxılır. Alışlar stok investisiyası kimi ayrıca göstərilir, ikinci dəfə xərc sayılmır."/><div className="cr-pl-grid"><div><small>Satışlardan xalis mənfəət</small><b>{money(grossProfit)}</b></div><div><small>Ödənilmiş əməliyyat xərcləri</small><b>{money(expenseTotal)}</b></div><div><small>Yekun mənfəət / zərər</small><b className={profitLoss>=0?'good':'bad'}>{money(profitLoss)}</b></div></div></section>
  <section className="panel cr-panel report-print"><SectionTitle title="Anbar hesabatı" description="Mövcud qalıq və maya dəyəri əsasında hesablanır."/><div className="tablewrap"><table><thead><tr><th>Məhsul</th><th>SKU</th><th>Kateqoriya</th><th>Qalıq</th><th>Vahid maya</th><th>Anbar dəyəri</th></tr></thead><tbody>{stockRows.map((x,i)=><tr key={i}><td>{x.Məhsul}</td><td>{x.SKU||'—'}</td><td>{x.Kateqoriya||'—'}</td><td>{x.Qalıq}</td><td>{money(x.Maya)}</td><td>{money(x.Anbar_dəyəri)}</td></tr>)}</tbody></table></div></section>
  <section className="panel cr-panel report-print"><SectionTitle title="Alış hesabatı" description="Seçilmiş tarix aralığında qeydə alınmış məhsul alışları."/><div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Məhsul</th><th>Təchizatçı</th><th>Miqdar</th><th>Vahid maya</th><th>Cəmi</th><th>Ödənilib</th><th>Status</th></tr></thead><tbody>{purchaseRows.map((x,i)=><tr key={i}><td>{x.Tarix}</td><td>{x.Məhsul}</td><td>{x.Təchizatçı}</td><td>{x.Miqdar}</td><td>{money(x.Vahid_maya)}</td><td>{money(x.Cəmi)}</td><td>{money(x.Ödənilib)}</td><td>{x.Status}</td></tr>)}</tbody></table>{!purchaseRows.length&&<p className="empty">Bu tarix aralığında alış yoxdur.</p>}</div></section>
  <section className="panel cr-panel report-print"><SectionTitle title="Xərc hesabatı" description="Yalnız ödənilmiş maliyyə xərcləri."/><div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Kateqoriya</th><th>Məbləğ</th><th>Hesab</th><th>Qeyd</th></tr></thead><tbody>{expenseRows.map((x,i)=><tr key={i}><td>{x.Tarix}</td><td>{x.Kateqoriya}</td><td>{money(x.Məbləğ)}</td><td>{x.Hesab}</td><td>{x.Qeyd}</td></tr>)}</tbody></table>{!expenseRows.length&&<p className="empty">Bu tarix aralığında xərc yoxdur.</p>}</div></section>
  <div className="cr-print-foot">ZED STORE · Hesabat yaradılma tarixi: {new Date().toLocaleString('az-AZ')}</div>
 </div>;
}


export function MonthlyReportsPanel({orders=[],sales=[],returns=[],products=[],financeEntries=[]}){
 const today=dayKey(new Date());
 const currentMonth=monthKey(new Date());
 const [fromDate,setFromDate]=useState(currentMonth+'-01');
 const [toDate,setToDate]=useState(today);
 const inSelected=value=>{if(!value)return false;const key=dayKey(value);return !!key&&(!fromDate||key>=fromDate)&&(!toDate||key<=toDate)};
 const rangeLabel=(fromDate||'Başlanğıcdan')+' — '+(toDate||'bu günə qədər');
 const orderMap=new Map(orders.map(o=>[o.id,o]));
 const productMap=new Map(products.map(p=>[p.id,p]));
 const paidOrderIds=new Set(orders.filter(o=>o.delivery_status==='delivered'&&o.payment_status==='paid'&&!!o.paid_at).map(o=>o.id));
 const rows=sales.filter(s=>!!s.paid_at&&paidOrderIds.has(s.order_id)&&inSelected(s.paid_at)).map(s=>{
  const relatedReturns=returns.filter(r=>r.return_type==='return'&&r.order_item_id===s.order_item_id&&inSelected(r.created_at));
  const originalQty=Math.max(0,Number(s.quantity||0));
  const returnedQty=Math.min(originalQty,relatedReturns.reduce((n,r)=>n+Number(r.quantity||0),0));
  const quantity=Math.max(0,originalQty-returnedQty);
  const refund=relatedReturns.reduce((n,r)=>n+Number(r.refund_amount||0),0);
  const unitCost=Number(s.unit_cost||0);
  const grossUnit=Number(s.birmarket_sale_price??s.unit_sale_price??0);
  const feesUnit=Number(s.marketplace_commission||0)+Number(s.logistics_fee||0)+Number(s.bank_fee||0);
  const computedPayout=Math.max(0,grossUnit-feesUnit);
  const payoutUnit=Number.isFinite(Number(s.transferred_amount))&&s.transferred_amount!==null?Number(s.transferred_amount):computedPayout;
  const totalSale=Math.max(0,payoutUnit*quantity-refund);
  const totalCost=unitCost*quantity;
  const totalProfit=totalSale-totalCost;
  const product=productMap.get(s.product_id)||{};
  const order=orderMap.get(s.order_id)||{};
  const orderNumber=order.order_number||String(s.order_id||'').slice(0,8).toUpperCase();
  const image=product.image_urls?.[0]||product.image_url||s.product_image_url||'';
  return {id:s.id,orderNumber,product:s.product_name||product.name||'Məhsul',image,sku:product.sku||s.sku||'',quantity,unitCost,unitSale:quantity?totalSale/quantity:0,unitProfit:quantity?totalProfit/quantity:0,totalCost,totalSale,totalProfit,refund};
 }).filter(x=>x.quantity>0);
 const totals=rows.reduce((a,x)=>({quantity:a.quantity+x.quantity,cost:a.cost+x.totalCost,sale:a.sale+x.totalSale,profit:a.profit+x.totalProfit}),{quantity:0,cost:0,sale:0,profit:0});
 const validRange=!!fromDate&&!!toDate&&fromDate<=toDate;
 function exportCsv(){
  const data=[['Sifariş №','Məhsul','SKU','Miqdar','Vahid maya (AZN)','Vahid xalis satış (AZN)','Vahid mənfəət (AZN)','Ümumi maya (AZN)','Ümumi satış (AZN)','Ümumi mənfəət (AZN)'],...rows.map(x=>[x.orderNumber,x.product,x.sku,x.quantity,x.unitCost.toFixed(2),x.unitSale.toFixed(2),x.unitProfit.toFixed(2),x.totalCost.toFixed(2),x.totalSale.toFixed(2),x.totalProfit.toFixed(2)])];
  const csv='\\uFEFF'+data.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\\r\\n');
  downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),'zed-store-satis-hesabati.csv');
 }
 const printMoney=n=>money(n);
 return <div className="cr-page monthly-report-page sales-ledger-page">
  <div className="toolbar"><div><h2>Hesabatlar</h2><p>Yalnız təhvil verilmiş və ödənişi təsdiqlənmiş sifarişlər üzrə satış hesabatı.</p></div><div className="monthly-report-actions"><button className="outline" onClick={exportCsv} disabled={!validRange}><Download size={16}/> Excel / CSV yüklə</button><button className="primary" onClick={()=>window.print()} disabled={!validRange}><Printer size={16}/> PDF / Çap</button></div></div>
  <section className="panel monthly-selector"><div className="monthly-selector-head"><div><b>Hesabat dövrü</b><small>Tarix aralığını seçərək uğurlu sifarişlərin siyahısını süzgəcdən keçir.</small></div><span>{rangeLabel}</span></div><div className="monthly-add-row"><label>Başlanğıc tarix<input type="date" value={fromDate} max={toDate||undefined} onChange={e=>setFromDate(e.target.value)}/></label><label>Son tarix<input type="date" value={toDate} min={fromDate||undefined} onChange={e=>setToDate(e.target.value)}/></label><button className="outline" type="button" onClick={()=>{setFromDate(currentMonth+'-01');setToDate(today)}}>Bu ay</button><button className="outline" type="button" onClick={()=>{setFromDate(today);setToDate(today)}}>Bu gün</button><button className="outline" type="button" onClick={()=>{const d=new Date();setFromDate(dayKey(new Date(d.getFullYear(),d.getMonth(),d.getDate()-29)));setToDate(today)}}>Son 30 gün</button></div><small className="cr-range-note">Hesabat dövrü: {rangeLabel}</small></section>
  {validRange?<section className="panel cr-panel sales-ledger-panel">
   <div className="sales-ledger-heading"><div><span className="sales-ledger-kicker">ZED STORE · SATIŞ REYESTRİ</span><h3>Uğurlu sifarişlər</h3><p>Təhvil verilib və ödənişi təsdiqlənib · {rows.length} məhsul sətri · {totals.quantity} ədəd</p></div><span className="sales-ledger-period">{rangeLabel}</span></div>
   <div className="sales-ledger-summary">
    <div className="sales-ledger-metric"><small>Ümumi maya dəyəri</small><b>{money(totals.cost)}</b><span>Maya × miqdar</span></div>
    <div className="sales-ledger-metric"><small>Xalis satış dövriyyəsi</small><b>{money(totals.sale)}</b><span>Komissiya, bank və logistika çıxıldıqdan sonra</span></div>
    <div className="sales-ledger-metric"><small>Ümumi mənfəət</small><b className={totals.profit>=0?'good':'bad'}>{money(totals.profit)}</b><span>Xalis satış − ümumi maya</span></div>
   </div>
   <div className="tablewrap sales-ledger-table-wrap"><table className="sales-ledger-table"><thead><tr><th>Sifariş №</th><th>Məhsul</th><th>Miqdar</th><th>Maya</th><th>Satış</th><th>Mənfəət</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><b className="sales-ledger-order">#{row.orderNumber}</b></td><td><div className="sales-ledger-product">{row.image?<img src={row.image} alt="" loading="lazy"/>:<span className="sales-ledger-product-placeholder"><ShoppingCart size={16}/></span>}<span><b>{row.product}</b>{row.sku&&<small>SKU: {row.sku}</small>}</span></div></td><td>{row.quantity}</td><td><b>{money(row.unitCost)}</b></td><td><b>{money(row.unitSale)}</b></td><td className={row.unitProfit>=0?'good':'bad'}><b>{money(row.unitProfit)}</b></td></tr>)}</tbody><tfoot><tr><th colSpan="2">YEKUN</th><th>{totals.quantity}</th><th>{money(totals.cost)}</th><th>{money(totals.sale)}</th><th className={totals.profit>=0?'good':'bad'}>{money(totals.profit)}</th></tr></tfoot></table>{!rows.length&&<div className="sales-ledger-empty"><PackageCheck size={25}/><b>Bu tarix aralığında uğurlu sifariş yoxdur</b><span>Yalnız təhvil verilmiş və ödənişi təsdiqlənmiş sifarişlər burada görünəcək.</span></div>}</div>
   <div className="sales-ledger-bottom"><div><small>Dövriyyə</small><b>{money(totals.sale)}</b><span>Komissiyalar çıxıldıqdan sonra</span></div><div><small>Maya</small><b>{money(totals.cost)}</b><span>Satılmış malların maya dəyəri</span></div><div><small>Mənfəət</small><b className={totals.profit>=0?'good':'bad'}>{money(totals.profit)}</b><span>Dövriyyə − maya</span></div></div>
   <p className="sales-ledger-note">Hesabatda Birmarket komissiyası, bank faizi və logistika haqqı çıxıldıqdan sonra qalan satış məbləği göstərilir. Məhsulun maya dəyəri çıxıldıqdan sonra mənfəət hesablanır. Qaytarılmış məhsul miqdarı və geri ödənişlər nəzərə alınır.</p>
  </section>:<section className="panel report-empty"><b>Tarix aralığı düzgün seçilməyib</b><p>Başlanğıc tarix son tarixdən gec ola bilməz.</p></section>}
  <div id="monthly-print-report" aria-hidden="true">
   <header className="monthly-print-header"><div className="monthly-print-brand">ZED STORE</div><div className="monthly-print-title">UĞURLU SİFARİŞLƏR ÜZRƏ SATIŞ HESABATI</div><div className="monthly-print-subtitle">Tarix aralığı: {rangeLabel} · Yalnız təhvil verilmiş və ödənişi təsdiqlənmiş sifarişlər · {new Date().toLocaleDateString('az-AZ')}</div></header>
   <section className="monthly-print-month">
    <div className="monthly-print-summary"><div><small>Ümumi maya</small><b>{printMoney(totals.cost)}</b></div><div><small>Xalis satış dövriyyəsi</small><b>{printMoney(totals.sale)}</b></div><div><small>Ümumi mənfəət</small><b>{printMoney(totals.profit)}</b></div><div><small>Məhsul sayı</small><b>{totals.quantity} ədəd</b></div></div>
    <table className="monthly-print-table monthly-print-products"><thead><tr><th>Sifariş №</th><th>Məhsul</th><th>Miqdar</th><th>Maya</th><th>Satış</th><th>Mənfəət</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>#{row.orderNumber}</td><td>{row.product}</td><td>{row.quantity}</td><td>{printMoney(row.unitCost)}</td><td>{printMoney(row.unitSale)}</td><td>{printMoney(row.unitProfit)}</td></tr>)}</tbody><tfoot><tr><th colSpan="2">YEKUN</th><th>{totals.quantity}</th><th>{printMoney(totals.cost)}</th><th>{printMoney(totals.sale)}</th><th>{printMoney(totals.profit)}</th></tr></tfoot></table>
    {!rows.length&&<p className="monthly-print-empty">Bu tarix aralığında uğurlu sifariş yoxdur.</p>}
    <div className="monthly-print-total"><span>DÖVR ÜZRƏ MƏNFƏƏT</span><b>{printMoney(totals.profit)}</b></div>
   </section>
   <footer className="monthly-print-footer">Satış məbləği = Birmarket qiyməti − kateqoriya komissiyası − bank faizi − logistika haqqı. Mənfəət = satış məbləği − maya dəyəri. <span>ZED STORE · {new Date().toLocaleDateString('az-AZ')}</span></footer>
  </div>
 </div>;
}
