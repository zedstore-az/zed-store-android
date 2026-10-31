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
 const exportPdf=()=>window.print();
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


export function MonthlyReportsPanel({orders=[],adjustedSales=[],financeEntries=[]}){
 const currentMonth=monthKey(new Date());
 const [selectedMonths,setSelectedMonths]=useState([currentMonth]);
 const [monthDraft,setMonthDraft]=useState(currentMonth);
 const [detail,setDetail]=useState('orders');
 const selectedSet=useMemo(()=>new Set(selectedMonths),[selectedMonths]);
 const monthLabel=m=>new Date(Number(m.slice(0,4)),Number(m.slice(5,7))-1,1).toLocaleDateString('az-AZ',{month:'long',year:'numeric'});
 const moneyValue=n=>money(n);
 const inSelected=(value)=>!!value&&selectedSet.has(monthKey(value));
 const incomingOrders=orders.filter(o=>inSelected(o.ordered_at));
 const deliveredOrders=orders.filter(o=>o.delivery_status==='delivered'&&inSelected(o.delivered_at||o.ordered_at));
 const paidOrderIds=new Set(orders.filter(o=>o.delivery_status==='delivered'&&o.payment_status==='paid'&&!!o.paid_at).map(o=>o.id));
 const paidSales=adjustedSales.filter(s=>!!s.paid_at&&paidOrderIds.has(s.order_id)&&inSelected(s.paid_at));
 const paidExpenses=financeEntries.filter(e=>e.entry_type==='expense'&&e.status==='paid'&&inSelected(e.paid_at||e.created_at));
 const collected=paidSales.reduce((n,s)=>n+Number(s.transferred_amount||0)*Number(s.quantity||0),0);
 const salesProfit=paidSales.reduce((n,s)=>n+Number(s.net_profit||0),0);
 const expenseTotal=paidExpenses.reduce((n,e)=>n+Number(e.amount||0),0);
 const netProfit=salesProfit-expenseTotal;
 const monthly=selectedMonths.map(month=>{
  const ordersInMonth=orders.filter(o=>monthKey(o.ordered_at)===month);
  const deliveredInMonth=orders.filter(o=>o.delivery_status==='delivered'&&monthKey(o.delivered_at||o.ordered_at)===month);
  const monthSales=adjustedSales.filter(s=>!!s.paid_at&&paidOrderIds.has(s.order_id)&&monthKey(s.paid_at)===month);
  const monthExpenses=financeEntries.filter(e=>e.entry_type==='expense'&&e.status==='paid'&&monthKey(e.paid_at||e.created_at)===month);
  const cash=monthSales.reduce((n,s)=>n+Number(s.transferred_amount||0)*Number(s.quantity||0),0);
  const profit=monthSales.reduce((n,s)=>n+Number(s.net_profit||0),0)-monthExpenses.reduce((n,e)=>n+Number(e.amount||0),0);
  return {month,incoming:ordersInMonth.length,delivered:deliveredInMonth.length,cash,profit,paidCount:new Set(monthSales.map(s=>s.order_id)).size,expenses:monthExpenses.reduce((n,e)=>n+Number(e.amount||0),0)};
 });
 const visibleOrders=detail==='orders'?incomingOrders:deliveredOrders;
 const visibleSales=paidSales;
 function addMonth(){if(!/^\\d{4}-\\d{2}$/.test(monthDraft)||selectedSet.has(monthDraft))return;setSelectedMonths(old=>[...old,monthDraft].sort())}
 function exportCsv(){
  const rows=[['Ay','Daxil olan sifarişlər','Təhvil verilmiş sifarişlər','Ödənişi təsdiqlənmiş sifarişlər','Köçən pul (AZN)','Xalis mənfəət (AZN)','Əməliyyat xərcləri (AZN)'],...monthly.map(x=>[monthLabel(x.month),x.incoming,x.delivered,x.paidCount,x.cash.toFixed(2),x.profit.toFixed(2),x.expenses.toFixed(2)])];
  const csv='\\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\\r\\n');
  downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),'zed-store-ayliq-hesabat.csv');
 }
 return <div className="cr-page monthly-report-page">
  <div className="toolbar"><div><h2>Hesabatlar</h2><p>Seçdiyin aylar üzrə sifariş, təhvil, təsdiqlənmiş ödəniş və xalis mənfəət.</p></div><div className="monthly-report-actions"><button className="outline" onClick={exportCsv} disabled={!selectedMonths.length}><Download size={16}/> CSV yüklə</button><button className="primary" onClick={()=>window.print()} disabled={!selectedMonths.length}><Printer size={16}/> PDF / Çap</button></div></div>
  <section className="panel monthly-selector"><div className="monthly-selector-head"><div><b>Hesabat dövrü</b><small>Bir və ya bir neçə ay əlavə et. Hər ay ayrıca hesablanır.</small></div><span>{selectedMonths.length} ay seçilib</span></div><div className="monthly-add-row"><label>Ay seç<input type="month" value={monthDraft} onChange={e=>setMonthDraft(e.target.value)}/></label><button className="primary" type="button" onClick={addMonth} disabled={!monthDraft||selectedSet.has(monthDraft)}><Plus size={15}/> Ayı əlavə et</button><button className="outline" type="button" onClick={()=>setSelectedMonths([currentMonth])}>Yalnız bu ay</button><button className="outline" type="button" onClick={()=>{const d=new Date();setSelectedMonths([0,1,2].map(n=>{const x=new Date(d.getFullYear(),d.getMonth()-n,1);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')} ).sort())}}>Son 3 ay</button></div><div className="month-chips">{selectedMonths.map(m=><span className="month-chip" key={m}>{monthLabel(m)}<button type="button" aria-label={monthLabel(m)+' ayını çıxart'} onClick={()=>setSelectedMonths(old=>old.filter(x=>x!==m))}>×</button></span>)}{!selectedMonths.length&&<span className="month-empty">Hesabat üçün ən azı bir ay seç.</span>}</div></section>
  {selectedMonths.length>0?<><div className="cr-stats monthly-kpis">
   <div className="cr-stat"><ShoppingCart/><small>Daxil olunan sifarişlər</small><b>{incomingOrders.length}</b><span>Seçilmiş aylarda yaradılan bütün sifarişlər</span></div>
   <div className="cr-stat"><PackageCheck/><small>Təhvil verilmiş sifarişlər</small><b>{deliveredOrders.length}</b><span>Çatdırılma statusu təsdiqlənən sifarişlər</span></div>
   <div className="cr-stat"><Wallet/><small>Köçən pul</small><b>{moneyValue(collected)}</b><span>Ödənişi təsdiqlənmiş sifarişlərdən</span></div>
   <div className="cr-stat"><TrendingUp/><small>Xalis mənfəət</small><b className={netProfit>=0?'good':'bad'}>{moneyValue(netProfit)}</b><span>Satış mənfəəti − ödənilmiş əməliyyat xərcləri</span></div>
  </div>
  <section className="panel cr-panel"><SectionTitle title="Aylıq müqayisə" description="Hər ayın göstəriciləri ayrıca göstərilir. Sifariş, təhvil və ödəniş tarixləri öz hadisə tarixinə görə hesablanır."/><div className="tablewrap"><table><thead><tr><th>Ay</th><th>Daxil olan sifarişlər</th><th>Təhvil verilmiş</th><th>Ödənişi təsdiqlənmiş</th><th>Köçən pul</th><th>Xalis mənfəət</th></tr></thead><tbody>{monthly.map(x=><tr key={x.month}><td><b>{monthLabel(x.month)}</b></td><td>{x.incoming}</td><td>{x.delivered}</td><td>{x.paidCount}</td><td>{moneyValue(x.cash)}</td><td className={x.profit>=0?'good':'bad'}><b>{moneyValue(x.profit)}</b></td></tr>)}</tbody><tfoot><tr><th>YEKUN</th><th>{incomingOrders.length}</th><th>{deliveredOrders.length}</th><th>{new Set(paidSales.map(s=>s.order_id)).size}</th><th>{moneyValue(collected)}</th><th className={netProfit>=0?'good':'bad'}>{moneyValue(netProfit)}</th></tr></tfoot></table></div></section>
  <section className="panel cr-panel monthly-detail-panel"><div className="monthly-detail-head"><div><h3>Ətraflı məlumat</h3><p>Seçilmiş dövr üzrə sifariş və ödəniş qeydləri.</p></div><div className="monthly-detail-tabs"><button type="button" className={detail==='orders'?'active':''} onClick={()=>setDetail('orders')}>Daxil olanlar ({incomingOrders.length})</button><button type="button" className={detail==='delivered'?'active':''} onClick={()=>setDetail('delivered')}>Təhvil verilənlər ({deliveredOrders.length})</button><button type="button" className={detail==='payments'?'active':''} onClick={()=>setDetail('payments')}>Ödənişlər ({new Set(paidSales.map(s=>s.order_id)).size})</button></div></div>
   {detail==='payments'?<div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Sifariş</th><th>Məhsul</th><th>Miqdar</th><th>Köçən pul</th><th>Mənfəət</th></tr></thead><tbody>{visibleSales.map((s,i)=><tr key={s.id||i}><td>{date(s.paid_at)}</td><td>#{s.order_number||String(s.order_id||'').slice(0,8)}</td><td>{s.product_name||'—'}</td><td>{Number(s.quantity||0)}</td><td>{moneyValue(Number(s.transferred_amount||0)*Number(s.quantity||0))}</td><td className={Number(s.net_profit||0)>=0?'good':'bad'}>{moneyValue(s.net_profit)}</td></tr>)}</tbody></table>{!visibleSales.length&&<p className="empty">Seçilmiş aylarda təsdiqlənmiş ödəniş yoxdur.</p>}</div>:<div className="tablewrap"><table><thead><tr><th>Sifariş</th><th>Müştəri</th><th>Sifariş tarixi</th><th>Təhvil tarixi</th><th>Status</th><th>Ödəniş</th></tr></thead><tbody>{visibleOrders.map(o=><tr key={o.id}><td><b>#{o.order_number||String(o.id).slice(0,8).toUpperCase()}</b><small>{(o.order_items||[]).map(i=>(i.product_name||'Məhsul')+' × '+i.quantity).join(', ')}</small></td><td>{o.customer_name||'—'}<small>{o.customer_phone||''}</small></td><td>{date(o.ordered_at)}</td><td>{date(o.delivered_at)}</td><td><span className={'badge '+(o.delivery_status==='delivered'?'green':o.delivery_status==='cancelled'?'red':'yellow')}>{o.delivery_status==='delivered'?'Təhvil verilib':o.delivery_status==='cancelled'?'Ləğv edilib':'Prosesdə'}</span></td><td>{o.payment_status==='paid'?'Təsdiqlənib':'Gözləyir'}</td></tr>)}</tbody></table>{!visibleOrders.length&&<p className="empty">Bu bölmə üzrə seçilmiş aylarda qeyd yoxdur.</p>}</div>}
  </section>
  <section className="monthly-report-note"><b>Hesablama qaydası</b><p>“Daxil olunan sifarişlər” sifarişin yaradıldığı aya, “Təhvil verilmişlər” təhvil tarixinə, “Köçən pul” isə ödənişin təsdiq edildiyi aya görə hesablanır. Xalis mənfəət satış qeydlərindəki mənfəətdən həmin ay ödənilmiş əməliyyat xərcləri çıxılmaqla göstərilir. Məhsul alışları ayrıca stok investisiyasıdır və ikinci dəfə xərc kimi çıxılmır.</p></section>
  </>:<section className="panel report-empty"><b>Hesabat dövrü seçilməyib</b><p>Yuxarıdan ən azı bir ay əlavə et.</p></section>}
 </div>;
}
