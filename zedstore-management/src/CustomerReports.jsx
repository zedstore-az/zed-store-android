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


export function MonthlyReportsPanel({orders=[],sales=[],returns=[],financeEntries=[],sb,user,say,load}){
 const today=dayKey(new Date());
 const currentMonth=monthKey(new Date());
 const [fromDate,setFromDate]=useState(currentMonth+'-01');
 const [toDate,setToDate]=useState(today);
 const [detail,setDetail]=useState('orders');
 const [expenseTitle,setExpenseTitle]=useState('');
 const [expenseAmount,setExpenseAmount]=useState('');
 const [expenseDate,setExpenseDate]=useState(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10));
 const [expenseNotes,setExpenseNotes]=useState('');
 const [expenseAccount,setExpenseAccount]=useState('cash');
 const [expenseSaving,setExpenseSaving]=useState(false);
 const monthLabel=m=>new Date(Number(m.slice(0,4)),Number(m.slice(5,7))-1,1).toLocaleDateString('az-AZ',{month:'long',year:'numeric'});
 const moneyValue=n=>money(n);
 const inSelected=value=>{if(!value)return false;const key=dayKey(value);return !!key&&(!fromDate||key>=fromDate)&&(!toDate||key<=toDate)};
 const rangeLabel=(fromDate||'Başlanğıcdan')+' — '+(toDate||'bu günə qədər');
 const rangeMonths=useMemo(()=>{if(!fromDate||!toDate||fromDate>toDate)return [];const out=[];const a=new Date(fromDate+'T12:00:00'),b=new Date(toDate+'T12:00:00');const x=new Date(a.getFullYear(),a.getMonth(),1);while(x<=b){out.push(x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'));x.setMonth(x.getMonth()+1)}return out},[fromDate,toDate]);
 const incomingOrders=orders.filter(o=>inSelected(o.ordered_at));
 const deliveredOrders=orders.filter(o=>o.delivery_status==='delivered'&&inSelected(o.delivered_at||o.ordered_at));
 const paidOrderIds=new Set(orders.filter(o=>o.delivery_status==='delivered'&&o.payment_status==='paid'&&!!o.paid_at).map(o=>o.id));
 const allPaidSales=sales.filter(s=>!!s.paid_at&&paidOrderIds.has(s.order_id));
 const paidSales=allPaidSales.filter(s=>inSelected(s.paid_at));
 const paidSalesByItem=new Map(allPaidSales.map(s=>[s.order_item_id,s]));
 const paidExpenses=financeEntries.filter(e=>e.entry_type==='expense'&&e.status==='paid'&&inSelected(e.paid_at||e.created_at));
 const selectedReturns=returns.filter(r=>r.return_type==='return'&&inSelected(r.created_at)&&paidSalesByItem.has(r.order_item_id));
 const refundTotal=selectedReturns.reduce((n,r)=>n+Number(r.refund_amount||0),0);
 const returnProfitAdjustment=selectedReturns.reduce((n,r)=>{const sale=paidSalesByItem.get(r.order_item_id);return n-Number(r.refund_amount||0)+(r.item_condition==='restock'?Number(sale?.unit_cost||0)*Number(r.quantity||0):0)},0);
 const collected=paidSales.reduce((n,s)=>n+Number(s.transferred_amount||0)*Number(s.quantity||0),0)-refundTotal;
 const salesProfit=paidSales.reduce((n,s)=>n+Number(s.net_profit||0),0)+returnProfitAdjustment;
 const expenseTotal=paidExpenses.reduce((n,e)=>n+Number(e.amount||0),0);
 const netProfit=salesProfit-expenseTotal;
 const monthly=rangeMonths.map(month=>{
  const ordersInMonth=orders.filter(o=>inSelected(o.ordered_at)&&monthKey(o.ordered_at)===month);
  const deliveredInMonth=orders.filter(o=>o.delivery_status==='delivered'&&inSelected(o.delivered_at||o.ordered_at)&&monthKey(o.delivered_at||o.ordered_at)===month);
  const monthSales=sales.filter(s=>!!s.paid_at&&paidOrderIds.has(s.order_id)&&inSelected(s.paid_at)&&monthKey(s.paid_at)===month);
  const monthReturns=returns.filter(r=>r.return_type==='return'&&inSelected(r.created_at)&&monthKey(r.created_at)===month&&paidSalesByItem.has(r.order_item_id));
  const monthExpenses=financeEntries.filter(e=>e.entry_type==='expense'&&e.status==='paid'&&inSelected(e.paid_at||e.created_at)&&monthKey(e.paid_at||e.created_at)===month);
  const refunds=monthReturns.reduce((n,r)=>n+Number(r.refund_amount||0),0);
  const returnAdjustment=monthReturns.reduce((n,r)=>{const sale=paidSalesByItem.get(r.order_item_id);return n-Number(r.refund_amount||0)+(r.item_condition==='restock'?Number(sale?.unit_cost||0)*Number(r.quantity||0):0)},0);
  const cash=monthSales.reduce((n,s)=>n+Number(s.transferred_amount||0)*Number(s.quantity||0),0)-refunds;
  const profit=monthSales.reduce((n,s)=>n+Number(s.net_profit||0),0)+returnAdjustment-monthExpenses.reduce((n,e)=>n+Number(e.amount||0),0);
  return {month,incoming:ordersInMonth.length,delivered:deliveredInMonth.length,cash,profit,paidCount:new Set(monthSales.map(s=>s.order_id)).size,expenses:monthExpenses.reduce((n,e)=>n+Number(e.amount||0),0)};
 });
 const visibleOrders=detail==='orders'?incomingOrders:deliveredOrders;
 const printReports=(()=>{
  const rows=allPaidSales.filter(s=>inSelected(s.paid_at)).map(s=>{
   const relatedReturns=returns.filter(r=>r.return_type==='return'&&r.order_item_id===s.order_item_id&&inSelected(r.created_at));
   const returnedQty=relatedReturns.reduce((n,r)=>n+Number(r.quantity||0),0);
   const quantity=Math.max(0,Number(s.quantity||0)-returnedQty);
   const unitCost=Number(s.unit_cost||0);
   const unitBirmarket=Number(s.birmarket_sale_price??s.unit_sale_price??0);
   const unitMarketplace=Number(s.marketplace_commission||0);
   const unitLogistics=Number(s.logistics_fee||0);
   const unitBank=Number(s.bank_fee||0);
   const feesPerUnit=unitMarketplace+unitLogistics+unitBank;
   const unitSale=unitBirmarket-feesPerUnit;
   const cost=unitCost*quantity;
   const sale=unitBirmarket*quantity;
   const marketplace=unitMarketplace*quantity;
   const logistics=unitLogistics*quantity;
   const bank=unitBank*quantity;
   const fees=marketplace+logistics+bank;
   const saleAfterCommission=sale-fees;
   const finalSale=saleAfterCommission;
   const profit=finalSale-cost;
   const orderNumber=orders.find(o=>o.id===s.order_id)?.order_number||String(s.order_id||'').slice(0,8).toUpperCase();
   return {id:s.id,date:s.paid_at,order:orderNumber,product:s.product_name||'Məhsul',quantity,unitCost,unitSale,unitBirmarket,cost,sale,saleAfterCommission,finalSale,marketplace,logistics,bank,fees,profit};
  }).filter(x=>x.quantity>0);
  return {rows,units:rows.reduce((n,x)=>n+x.quantity,0),cost:rows.reduce((n,x)=>n+x.cost,0),sale:rows.reduce((n,x)=>n+x.sale,0),saleAfterCommission:rows.reduce((n,x)=>n+x.saleAfterCommission,0),marketplace:rows.reduce((n,x)=>n+x.marketplace,0),logistics:rows.reduce((n,x)=>n+x.logistics,0),bank:rows.reduce((n,x)=>n+x.bank,0),finalSale:rows.reduce((n,x)=>n+x.finalSale,0),fees:rows.reduce((n,x)=>n+x.fees,0),profit:rows.reduce((n,x)=>n+x.profit,0)};
 })();
 const paymentRows=[
  ...paidSales.map(s=>({id:'sale-'+s.id,type:'Ödəniş',date:s.paid_at,orderId:s.order_id,product:s.product_name,quantity:Number(s.quantity||0),cash:Number(s.transferred_amount||0)*Number(s.quantity||0),profit:Number(s.net_profit||0)})),
  ...selectedReturns.map(r=>{const sale=paidSalesByItem.get(r.order_item_id);return {id:'return-'+r.id,type:'Qaytarılma',date:r.created_at,orderId:sale?.order_id,product:r.product_name||sale?.product_name,quantity:Number(r.quantity||0),cash:-Number(r.refund_amount||0),profit:-Number(r.refund_amount||0)+(r.item_condition==='restock'?Number(sale?.unit_cost||0)*Number(r.quantity||0):0)}})
 ].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
 async function addExpense(e){
  e.preventDefault();
  const amount=Number(expenseAmount);
  if(!expenseTitle.trim()||!Number.isFinite(amount)||amount<=0||!expenseDate)return say?.('Xərc adı, tarix və müsbət məbləğ daxil et.');
  if(!user?.id||!sb)return say?.('Xərc əlavə etmək üçün admin sessiyası tapılmadı.');
  setExpenseSaving(true);
  const paidAt=new Date(expenseDate+'T12:00:00').toISOString();
  const result=await sb.from('finance_entries').insert({owner_id:user.id,entry_type:'expense',amount,status:'paid',title:expenseTitle.trim(),notes:expenseNotes.trim()||null,payment_account:expenseAccount,source_type:'manual',paid_at:paidAt});
  if(result.error)say?.('Xərc saxlanmadı: '+result.error.message);
  else{say?.('Xərc hesabat üçün qeydə alındı.');setExpenseTitle('');setExpenseAmount('');setExpenseNotes('');await load?.()}
  setExpenseSaving(false);
 }
 function addMonth(){if(!/^\\d{4}-\\d{2}$/.test(monthDraft)||selectedSet.has(monthDraft))return;setSelectedMonths(old=>[...old,monthDraft].sort())}
 function exportCsv(){
  const rows=[['Ay','Daxil olan sifarişlər','Təhvil verilmiş sifarişlər','Ödənişi təsdiqlənmiş sifarişlər','Köçən pul (AZN)','Xalis mənfəət (AZN)','Əməliyyat xərcləri (AZN)'],...monthly.map(x=>[monthLabel(x.month),x.incoming,x.delivered,x.paidCount,x.cash.toFixed(2),x.profit.toFixed(2),x.expenses.toFixed(2)])];
  const csv='\\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\\r\\n');
  downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),'zed-store-tarix-araligi-hesabati.csv');
 }
 return <div className="cr-page monthly-report-page">
  <div className="toolbar"><div><h2>Hesabatlar</h2><p>İstədiyin tarix aralığı üzrə sifariş, ödəniş və mənfəət hesabatı.</p></div><div className="monthly-report-actions"><button className="outline" onClick={exportCsv} disabled={!fromDate||!toDate||fromDate>toDate}><Download size={16}/> CSV yüklə</button><button className="primary" onClick={()=>window.print()} disabled={!fromDate||!toDate||fromDate>toDate}><Printer size={16}/> Seçilmiş tarixi çap et</button></div></div>
  <section className="panel monthly-selector"><div className="monthly-selector-head"><div><b>Hesabat dövrü</b><small>Başlanğıc və son günü seç. Seçilmiş tarix aralığı hesabat və çap üçün tətbiq olunur.</small></div><span>{rangeLabel}</span></div><div className="monthly-add-row"><label>Başlanğıc tarix<input type="date" value={fromDate} max={toDate||undefined} onChange={e=>setFromDate(e.target.value)}/></label><label>Son tarix<input type="date" value={toDate} min={fromDate||undefined} onChange={e=>setToDate(e.target.value)}/></label><button className="outline" type="button" onClick={()=>{setFromDate(currentMonth+'-01');setToDate(today)}}>Bu ay</button><button className="outline" type="button" onClick={()=>{setFromDate(today);setToDate(today)}}>Bu gün</button><button className="outline" type="button" onClick={()=>{const d=new Date();const first=new Date(d.getFullYear(),d.getMonth(),d.getDate()-29);setFromDate(dayKey(first));setToDate(today)}}>Son 30 gün</button></div><small className="cr-range-note">Hesabat dövrü: {rangeLabel}</small></section>
  {fromDate&&toDate&&fromDate<=toDate?<><div className="cr-stats monthly-kpis">
   <div className="cr-stat"><ShoppingCart/><small>Daxil olunan sifarişlər</small><b>{incomingOrders.length}</b><span>Seçilmiş tarix aralığında yaradılan bütün sifarişlər</span></div>
   <div className="cr-stat"><PackageCheck/><small>Təhvil verilmiş sifarişlər</small><b>{deliveredOrders.length}</b><span>Çatdırılma statusu təsdiqlənən sifarişlər</span></div>
   <div className="cr-stat"><Wallet/><small>Köçən pul</small><b>{moneyValue(collected)}</b><span>Ödənişi təsdiqlənmiş sifarişlərdən, qaytarılmalar çıxılmaqla</span></div>
   <div className="cr-stat"><TrendingUp/><small>Xalis mənfəət</small><b className={netProfit>=0?'good':'bad'}>{moneyValue(netProfit)}</b><span>Satış mənfəəti + qaytarılma düzəlişi − ödənilmiş xərclər</span></div>
  </div>
  <section className="panel cr-panel"><SectionTitle title="Aylıq müqayisə" description="Hər ayın göstəriciləri ayrıca göstərilir. Sifariş, təhvil və ödəniş tarixləri öz hadisə tarixinə görə hesablanır."/><div className="tablewrap"><table><thead><tr><th>Ay</th><th>Daxil olan sifarişlər</th><th>Təhvil verilmiş</th><th>Ödənişi təsdiqlənmiş</th><th>Köçən pul</th><th>Xalis mənfəət</th></tr></thead><tbody>{monthly.map(x=><tr key={x.month}><td><b>{monthLabel(x.month)}</b></td><td>{x.incoming}</td><td>{x.delivered}</td><td>{x.paidCount}</td><td>{moneyValue(x.cash)}</td><td className={x.profit>=0?'good':'bad'}><b>{moneyValue(x.profit)}</b></td></tr>)}</tbody><tfoot><tr><th>YEKUN</th><th>{incomingOrders.length}</th><th>{deliveredOrders.length}</th><th>{new Set(paidSales.map(s=>s.order_id)).size}</th><th>{moneyValue(collected)}</th><th className={netProfit>=0?'good':'bad'}>{moneyValue(netProfit)}</th></tr></tfoot></table></div></section>
  <section className="panel cr-panel monthly-detail-panel"><div className="monthly-detail-head"><div><h3>Ətraflı məlumat</h3><p>Seçilmiş dövr üzrə sifariş və ödəniş qeydləri.</p></div><div className="monthly-detail-tabs"><button type="button" className={detail==='orders'?'active':''} onClick={()=>setDetail('orders')}>Daxil olanlar ({incomingOrders.length})</button><button type="button" className={detail==='delivered'?'active':''} onClick={()=>setDetail('delivered')}>Təhvil verilənlər ({deliveredOrders.length})</button><button type="button" className={detail==='payments'?'active':''} onClick={()=>setDetail('payments')}>Ödənişlər / qaytarılmalar ({new Set(paidSales.map(s=>s.order_id)).size})</button></div></div>
   {detail==='payments'?<div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Əməliyyat</th><th>Sifariş</th><th>Məhsul</th><th>Miqdar</th><th>Köçən pul</th><th>Mənfəət düzəlişi</th></tr></thead><tbody>{paymentRows.map(row=><tr key={row.id}><td>{date(row.date)}</td><td>{row.type}</td><td>#{String(row.orderId||'').slice(0,8).toUpperCase()||'—'}</td><td>{row.product||'—'}</td><td>{row.quantity}</td><td className={row.cash>=0?'good':'bad'}>{moneyValue(row.cash)}</td><td className={row.profit>=0?'good':'bad'}>{moneyValue(row.profit)}</td></tr>)}</tbody></table>{!paymentRows.length&&<p className="empty">Seçilmiş aylarda təsdiqlənmiş ödəniş və ya qaytarılma yoxdur.</p>}</div>:<div className="tablewrap"><table><thead><tr><th>Sifariş</th><th>Müştəri</th><th>Sifariş tarixi</th><th>Təhvil tarixi</th><th>Status</th><th>Ödəniş</th></tr></thead><tbody>{visibleOrders.map(o=><tr key={o.id}><td><b>#{o.order_number||String(o.id).slice(0,8).toUpperCase()}</b><small>{(o.order_items||[]).map(i=>(i.product_name||'Məhsul')+' × '+i.quantity).join(', ')}</small></td><td>{o.customer_name||'—'}<small>{o.customer_phone||''}</small></td><td>{date(o.ordered_at)}</td><td>{date(o.delivered_at)}</td><td><span className={'badge '+(o.delivery_status==='delivered'?'green':o.delivery_status==='cancelled'?'red':'yellow')}>{o.delivery_status==='delivered'?'Təhvil verilib':o.delivery_status==='cancelled'?'Ləğv edilib':'Prosesdə'}</span></td><td>{o.payment_status==='paid'?'Təsdiqlənib':'Gözləyir'}</td></tr>)}</tbody></table>{!visibleOrders.length&&<p className="empty">Bu bölmə üzrə seçilmiş aylarda qeyd yoxdur.</p>}</div>}
  </section>
  <section className="panel cr-panel monthly-expense-panel"><SectionTitle title="Əməliyyat xərcləri" description="Bu xərclər seçilmiş ayın xalis mənfəətindən çıxılır. Məhsul alışları burada təkrar xərc kimi daxil edilmir."/><form className="monthly-expense-form" onSubmit={addExpense}><label>Xərcin adı<input required value={expenseTitle} onChange={e=>setExpenseTitle(e.target.value)} placeholder="Məs: çatdırılma, reklam, qablaşdırma"/></label><label>Məbləğ (₼)<input type="number" min="0.01" step="0.01" required value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value)} placeholder="0.00"/></label><label>Tarix<input type="date" required value={expenseDate} onChange={e=>setExpenseDate(e.target.value)}/></label><label>Hesab<select value={expenseAccount} onChange={e=>setExpenseAccount(e.target.value)}><option value="cash">Kassa</option><option value="bank">Bank</option><option value="marketplace">Marketplace</option></select></label><label className="monthly-expense-notes">Qeyd<input value={expenseNotes} onChange={e=>setExpenseNotes(e.target.value)} placeholder="İstəyə bağlı qeyd"/></label><button className="primary" disabled={expenseSaving}>{expenseSaving?'Saxlanır...':'Xərci əlavə et'}</button></form><div className="monthly-expense-list"><div className="monthly-expense-list-head"><b>Seçilmiş dövr üzrə qeydə alınmış xərclər</b><strong>{moneyValue(expenseTotal)}</strong></div><div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Xərc</th><th>Hesab</th><th>Qeyd</th><th>Məbləğ</th></tr></thead><tbody>{paidExpenses.map(e=><tr key={e.id}><td>{date(e.paid_at||e.created_at)}</td><td>{e.title||'Xərc'}</td><td>{{cash:'Kassa',bank:'Bank',marketplace:'Marketplace'}[e.payment_account||'cash']}</td><td>{e.notes||'—'}</td><td>{moneyValue(e.amount)}</td></tr>)}</tbody></table>{!paidExpenses.length&&<p className="empty">Seçilmiş aylarda ödənilmiş əməliyyat xərci yoxdur.</p>}</div></div></section>
  <section className="monthly-report-note"><b>Hesablama qaydası</b><p>“Daxil olunan sifarişlər” sifarişin yaradıldığı aya, “Təhvil verilmişlər” təhvil tarixinə, “Köçən pul” ödənişin təsdiq edildiyi aya görə hesablanır və qaytarılmaların geri ödənişi çıxılır. Xalis mənfəət satış mənfəətinə qaytarılma düzəlişləri əlavə edilməklə, həmin ay ödənilmiş əməliyyat xərcləri çıxılaraq göstərilir. Məhsul alışları stok investisiyasıdır və ikinci dəfə xərc kimi çıxılmır.</p></section>
  </>:<section className="panel report-empty"><b>Tarix aralığı düzgün seçilməyib</b><p>Başlanğıc tarix son tarixdən gec ola bilməz.</p></section>}
  <div id="monthly-print-report" aria-hidden="true">
   <header className="monthly-print-header"><div className="monthly-print-brand">ZED STORE</div><div className="monthly-print-title">AYLIQ SATIŞ HESABATI</div><div className="monthly-print-subtitle">Seçilmiş tarix aralığı: {rangeLabel} · Yalnız təhvil verilmiş və ödənişi təsdiqlənmiş satışlar · Hazırlanma tarixi: {new Date().toLocaleDateString('az-AZ')}</div></header>
   <section className="monthly-print-month">
    <div className="monthly-print-month-head"><h2>Seçilmiş tarix aralığı</h2><span>{rangeLabel}</span></div>
    <div className="monthly-print-summary"><div><small>Satılan məhsul sayı</small><b>{report.units} ədəd</b></div><div><small>Ümumi satış məbləği (Birmarket)</small><b>{moneyValue(report.sale)}</b></div><div><small>Ümumi maya dəyəri</small><b>{moneyValue(report.cost)}</b></div><div><small>Komissiya və xidmət haqları</small><b>{moneyValue(report.fees)}</b></div><div><small>Xalis mənfəət</small><b>{moneyValue(report.profit)}</b></div></div>
    <div className="monthly-print-table-title">SATILMIŞ MƏHSULLARIN SİYAHISI</div>
    <table className="monthly-print-table monthly-print-products"><thead><tr><th>Sifariş №</th><th>Məhsulun adı</th><th>Miqdar</th><th>Maya qiyməti</th><th>Satış qiyməti (komissiyalar çıxıldıqdan sonra)</th><th>Mənfəət</th><th>Yekun satış məbləği (komissiyalar çıxıldıqdan sonra)</th></tr></thead><tbody>{report.rows.map(row=><tr key={row.id}><td>{String(row.order||'—').slice(0,14)}</td><td>{row.product}</td><td>{row.quantity}</td><td>{moneyValue(row.unitCost)}</td><td>{moneyValue(row.unitSale)}</td><td>{moneyValue(row.profit)}</td><td>{moneyValue(row.finalSale)}</td></tr>)}</tbody><tfoot><tr><th colSpan="2">CƏMİ</th><th>{report.units}</th><th>{moneyValue(report.cost)}</th><th>—</th><th>{moneyValue(report.profit)}</th><th>{moneyValue(report.finalSale)}</th></tr></tfoot></table>
    {!report.rows.length&&<p className="monthly-print-empty">Bu ayda təhvil verilmiş və ödənişi təsdiqlənmiş satış yoxdur.</p>}
    <div className="monthly-print-total"><span>AYLIQ XALİS MƏNFƏƏT</span><b>{moneyValue(report.profit)}</b></div>
   </section>
   <footer className="monthly-print-footer">Hesabat yalnız təhvil verilmiş və ödənişi təsdiqlənmiş satışlardan hazırlanır. Komissiyalar çıxıldıqdan sonra vahid satış məbləği = Birmarket satış qiyməti − marketplace komissiyası − logistika haqqı − bank haqqı. Yekun satış məbləği = komissiyalar çıxıldıqdan sonrakı vahid məbləğ × miqdar. Mənfəət = yekun satış məbləği − ümumi maya dəyəri. <span>ZED STORE · {new Date().toLocaleDateString('az-AZ')}</span></footer>
  </div>
 </div>;
}
