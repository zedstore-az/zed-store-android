import React,{useMemo,useState} from "react";
import {ArrowDownToLine,ArrowUpFromLine,Boxes,CalendarDays,CheckCircle2,Clock3,Download,LockKeyhole,Plus,RefreshCw,ShieldCheck,Store,Trash2,Upload,Wallet} from "lucide-react";
import "./OwnerTools.css";

const money=n=>new Intl.NumberFormat("az-AZ",{style:"currency",currency:"AZN"}).format(Number(n||0));
const dateKey=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
const monthKey=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")};
const dateLabel=d=>d?new Date(d).toLocaleDateString("az-AZ"):"—";
const todayKey=dateKey(new Date());
const currentMonth=monthKey(new Date());

export function DashboardPanel({products=[],sales=[],financeEntries=[],orders=[],purchases=[],returns=[],navigate=()=>{},load=()=>{}}){
 const [period,setPeriod]=useState("14");
 const todayKey=dateKey(new Date()),currentMonth=monthKey(new Date());
 const previousMonth=monthKey(new Date(new Date().getFullYear(),new Date().getMonth()-1,1));
 const orderPayout=order=>(order.order_items||[]).reduce((n,item)=>n+Number(item.transferred_amount||0)*Number(item.quantity||0),0);
 const paidOrderIds=new Set(orders.filter(x=>x.delivery_status==="delivered"&&x.payment_status==="paid"&&!!x.paid_at).map(x=>x.id));
 const paidSales=sales.filter(x=>!!x.paid_at&&paidOrderIds.has(x.order_id));
 const currentSales=paidSales.filter(x=>monthKey(x.paid_at)===currentMonth);
 const previousSales=paidSales.filter(x=>monthKey(x.paid_at)===previousMonth);
 const turnover=list=>list.reduce((n,x)=>n+Number(x.transferred_amount||0)*Number(x.quantity||0),0);
 const todayOrders=orders.filter(x=>x.delivery_status!=="cancelled"&&dateKey(x.ordered_at||x.created_at)===todayKey);
 const todayTurnover=todayOrders.reduce((n,x)=>n+orderPayout(x),0);
 const monthTurnover=turnover(currentSales),previousTurnover=turnover(previousSales);
 const monthlyExpenses=financeEntries.filter(x=>x.entry_type==="expense"&&x.status==="paid"&&monthKey(x.paid_at||x.created_at)===currentMonth);
 const operatingExpenses=monthlyExpenses.filter(x=>x.source_type!=="purchase").reduce((n,x)=>n+Number(x.amount||0),0);
 const profit=currentSales.reduce((n,x)=>n+Number(x.net_profit||0),0)-operatingExpenses;
 const stockValue=products.reduce((n,x)=>n+Number(x.cost_price||0)*Number(x.stock_qty||0),0);
 const deliveredUnpaid=sales.filter(x=>!x.paid_at&&orders.some(o=>o.id===x.order_id&&o.delivery_status==="delivered"&&o.payment_status!=="paid"));
 const waitingAmount=deliveredUnpaid.reduce((n,x)=>n+Number(x.transferred_amount||0)*Number(x.quantity||0),0);
 const payable=financeEntries.filter(x=>x.entry_type==="payable"&&x.status==="pending").reduce((n,x)=>n+Number(x.amount||0),0);
 const purchaseTotal=purchases.filter(x=>monthKey(x.purchased_at||x.created_at)===currentMonth).reduce((n,x)=>n+Number(x.total_amount||0),0);
 const change=previousTurnover?((monthTurnover-previousTurnover)/previousTurnover)*100:(monthTurnover?100:0);
 const chart=useMemo(()=>{const count=Number(period);return Array.from({length:count},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(count-1-i));const key=dateKey(d);const dayOrders=orders.filter(x=>x.delivery_status!=="cancelled"&&dateKey(x.ordered_at||x.created_at)===key);const value=dayOrders.reduce((n,x)=>n+orderPayout(x),0);return {key,label:d.toLocaleDateString("az-AZ",{day:"2-digit",month:"short"}),fullDate:d.toLocaleDateString("az-AZ"),value,count:dayOrders.length}})},[orders,period]);
 const maxChart=Math.max(1,...chart.map(x=>x.value));
 const low=products.filter(x=>Number(x.stock_qty||0)<=Number(x.low_stock_threshold||0));
 const activeOrders=orders.filter(x=>!["delivered","cancelled"].includes(x.delivery_status));
 return <div className="owner-dashboard">
  <div className="owner-welcome"><div><span className="owner-kicker">SAHİBKAR PANELİ</span><h2>ZED STORE — Biznes icmalı</h2><p>Sifariş, ödəniş, mənfəət, anbar və pul axınını bir ekranda izlə.</p></div><button className="owner-refresh" onClick={load}><RefreshCw size={16}/> Yenilə</button></div>
  <div className="owner-metrics">
   <article className="owner-metric accent"><span>Bu gün satış</span><b>{money(todayTurnover)}</b><small>{todayOrders.length} yeni sifariş · komissiyalar çıxıldıqdan sonra</small></article>
   <article className="owner-metric"><span>Bu ay dövriyyə</span><b>{money(monthTurnover)}</b><small className={change>=0?"positive":"negative"}>{change>=0?"↑":"↓"} {Math.abs(change).toFixed(1)}% · yalnız ödənişi təsdiqlənənlər</small></article>
   <article className="owner-metric"><span>Gözləmədə</span><b>{money(waitingAmount)}</b><small>{deliveredUnpaid.length} təhvil verilmiş, ödənişi gözləyən satış</small></article>
   <article className="owner-metric"><span>Xalis mənfəət</span><b>{money(profit)}</b><small>Ödənişi təsdiqlənmiş satış mənfəəti − əlavə əməliyyat xərcləri</small></article>
   <article className="owner-metric"><span>Anbarın maya dəyəri</span><b>{money(stockValue)}</b><small>{products.length} aktiv məhsul</small></article>
  </div>
  <div className="owner-dashboard-grid">
   <section className="owner-card owner-chart-card"><div className="owner-card-head"><div><h3>Satış dinamikası</h3><p>Ləğv edilməmiş yeni sifarişlər üzrə günün köçəcək məbləği və sifariş sayı</p></div><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="7">7 gün</option><option value="14">14 gün</option><option value="30">30 gün</option></select></div><div className="owner-chart">{chart.map(x=><div className="owner-chart-col" key={x.key} title={x.fullDate+": "+money(x.value)+" · Sifariş sayı: "+x.count}><div className="owner-chart-bar-wrap"><i style={{height:(x.value/maxChart*100)+"%"}}/></div><small>{x.label}</small></div>)}</div><div className="owner-order-days">{chart.filter(x=>x.count>0).slice().reverse().map(x=><div className="owner-order-day" key={x.key}><b>{x.fullDate}</b><strong>{money(x.value)}</strong><small>Sifariş sayı: {x.count}</small></div>)}{!chart.some(x=>x.count>0)&&<p className="owner-order-empty">Seçilmiş müddətdə yeni sifariş yoxdur.</p>}</div></section>
  </div>
  <div className="owner-shortcuts">
   <button onClick={()=>navigate("orders")}><Store size={18}/><span><b>{activeOrders.length}</b><small>Prosesdə sifariş</small></span></button>
   <button onClick={()=>navigate("stock")}><Boxes size={18}/><span><b>{low.length}</b><small>Az qalan məhsul</small></span></button>
   <button onClick={()=>navigate("purchases")}><ArrowDownToLine size={18}/><span><b>{money(purchaseTotal)}</b><small>Bu ay alışlar</small></span></button>
   <button onClick={()=>navigate("finance")}><Wallet size={18}/><span><b>{money(waitingAmount+payable)}</b><small>Gözləyən məbləğ + borc</small></span></button>
  </div>
  <p className="owner-footnote">“Bu gün satış” və “Satış dinamikası” sifarişlərin yaradılma tarixinə əsaslanır və ləğv edilənləri saymır. “Bu ay dövriyyə” yalnız təhvil verilmiş və ödənişi təsdiqlənmiş satışların komissiyalar çıxıldıqdan sonra köçən məbləğini göstərir. “Gözləmədə” yalnız təhvil verilmiş, lakin ödənişi təsdiqlənməmiş satışları göstərir.</p>
 </div>
}
export function PurchasesPanel({sb,user,products=[],purchases=[],suppliers=[],say,load}){
 const [productId,setProductId]=useState("");
 const [supplierId,setSupplierId]=useState("");
 const [quantity,setQuantity]=useState("1");
 const [unitCost,setUnitCost]=useState("");
 const [purchasedAt,setPurchasedAt]=useState(new Date().toISOString().slice(0,10));
 const [paymentStatus,setPaymentStatus]=useState("paid");
 const [paidAmount,setPaidAmount]=useState("");
 const [account,setAccount]=useState("cash");
 const [invoice,setInvoice]=useState("");
 const [notes,setNotes]=useState("");
 const [supplierName,setSupplierName]=useState("");
 const [supplierPhone,setSupplierPhone]=useState("");
 const [saving,setSaving]=useState(false);
 const selected=products.find(x=>x.id===productId);
 const total=Math.max(0,Number(quantity)||0)*Math.max(0,Number(unitCost)||0);
 const paid=paymentStatus==="paid"?total:paymentStatus==="pending"?0:Math.min(total,Math.max(0,Number(paidAmount)||0));
 async function addSupplier(){if(!supplierName.trim())return;const r=await sb.from("suppliers").insert({owner_id:user.id,name:supplierName.trim(),phone:supplierPhone.trim()||null}).select().single();if(r.error){say("Təchizatçı əlavə edilmədi: "+r.error.message);return}setSupplierId(r.data.id);setSupplierName("");setSupplierPhone("");say("Təchizatçı əlavə edildi");await load()}
 async function save(e){e.preventDefault();if(!productId||!(Number(quantity)>0)||!(Number(unitCost)>=0)){say("Məhsul, miqdar və alış qiymətini düzgün daxil et.");return}if(paymentStatus==="partial"&&!(paid>0&&paid<total)){say("Qismən ödəniş üçün ödənilmiş məbləğ ümumi alışdan az və sıfırdan böyük olmalıdır.");return}setSaving(true);const payload={owner_id:user.id,product_id:productId,supplier_id:supplierId||null,quantity:Number(quantity),unit_cost:Number(unitCost),total_amount:total,paid_amount:paid,payment_status:paymentStatus,payment_account:account,purchased_at:new Date(purchasedAt+"T12:00:00").toISOString(),invoice_no:invoice.trim()||null,notes:notes.trim()||null,stock_applied:false};const r=await sb.from("purchases").insert(payload);if(r.error)say("Alış qeydi saxlanmadı: "+r.error.message);else{say("Alış qeydə alındı, anbar qalığı və maliyyə dəftəri yeniləndi.");setProductId("");setQuantity("1");setUnitCost("");setInvoice("");setNotes("");setPaymentStatus("paid");setPaidAmount("");await load()}setSaving(false)}
 const rows=[...purchases].sort((a,b)=>new Date(b.purchased_at||b.created_at)-new Date(a.purchased_at||a.created_at));
 return <div className="owner-purchases">
  <div className="toolbar"><div><h2>Alış və təchizat</h2><p>Məhsul alışlarını, təchizatçıları, maya dəyərini və anbar daxilolmalarını izləy.</p></div><div className="owner-purchase-total"><small>Ümumi alış qeydləri</small><b>{rows.length}</b></div></div>
  <div className="owner-purchase-grid">
   <section className="panel owner-purchase-form"><h3>Yeni məhsul alışı</h3><form onSubmit={save}>
    <label>Məhsul<select required value={productId} onChange={e=>{setProductId(e.target.value);const p=products.find(x=>x.id===e.target.value);if(p)setUnitCost(String(p.cost_price||""))}}><option value="">Məhsul seç</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} · stok: {p.stock_qty}</option>)}</select></label>
    <label>Təchizatçı<select value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Təchizatçı seçilməyib</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <div className="owner-inline-supplier"><input value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="Yeni təchizatçı adı"/><input value={supplierPhone} onChange={e=>setSupplierPhone(e.target.value)} placeholder="Telefon (istəyə bağlı)"/><button type="button" className="outline" onClick={addSupplier} disabled={!supplierName.trim()}><Plus size={15}/> Əlavə et</button></div>
    <div className="owner-form-two"><label>Miqdar<input type="number" min="0.001" step="0.001" required value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label>1 ədədin alış qiyməti (₼)<input type="number" min="0" step="0.01" required value={unitCost} onChange={e=>setUnitCost(e.target.value)}/></label></div>
    <div className="owner-purchase-total-line"><span>Alışın ümumi məbləği</span><b>{money(total)}</b></div>
    <div className="owner-form-two"><label>Alış tarixi<input type="date" required value={purchasedAt} onChange={e=>setPurchasedAt(e.target.value)}/></label><label>Ödəniş statusu<select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value)}><option value="paid">Tam ödənilib</option><option value="partial">Qismən ödənilib</option><option value="pending">Ödənilməyib</option></select></label></div>
    {paymentStatus==="partial"&&<label>İndiyə qədər ödənilən (₼)<input type="number" min="0.01" max={Math.max(0,total-0.01)} step="0.01" required value={paidAmount} onChange={e=>setPaidAmount(e.target.value)}/></label>}
    <label>Ödəniş hesabı<select value={account} onChange={e=>setAccount(e.target.value)}><option value="cash">Kassa</option><option value="bank">Bank</option><option value="marketplace">Marketplace</option></select></label>
    <label>Qaimə / faktura nömrəsi<input value={invoice} onChange={e=>setInvoice(e.target.value)} placeholder="İstəyə bağlı"/></label>
    <label>Qeyd<textarea rows="2" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Əlavə məlumat..."/></label>
    <button className="primary" disabled={saving||!selected}><Plus size={16}/>{saving?"Saxlanır...":"Alışı qeydə al"}</button>
   </form></section>
   <section className="panel owner-supplier-panel"><h3>Təchizatçılar</h3><div className="owner-supplier-list">{suppliers.map(s=><div key={s.id}><span className="owner-supplier-avatar">{s.name.slice(0,1).toUpperCase()}</span><span><b>{s.name}</b><small>{s.phone||s.email||"Əlaqə məlumatı yoxdur"}</small></span></div>)}{!suppliers.length&&<p className="empty">Təchizatçı əlavə edilməyib.</p>}</div><div className="owner-stock-note"><Boxes size={17}/><span>Alış təsdiqləndikdə məhsulun anbar qalığı avtomatik artırılır. Maya dəyəri çəkili orta qiymətlə yenilənir.</span></div></section>
  </div>
  <section className="panel"><div className="finance-list-head"><h3>Alış tarixçəsi</h3><span>{rows.length} qeyd</span></div><div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Məhsul</th><th>Təchizatçı</th><th>Miqdar</th><th>Vahid maya</th><th>Cəmi</th><th>Ödənilib</th><th>Status</th></tr></thead><tbody>{rows.map(x=>{const product=products.find(p=>p.id===x.product_id);const supplier=suppliers.find(s=>s.id===x.supplier_id);return <tr key={x.id}><td>{dateLabel(x.purchased_at)}</td><td><b>{product?.name||"Məhsul arxivdə yoxdur"}</b></td><td>{supplier?.name||"—"}</td><td>{x.quantity}</td><td>{money(x.unit_cost)}</td><td><b>{money(x.total_amount)}</b></td><td>{money(x.paid_amount)}</td><td><span className={"badge "+(x.payment_status==="paid"?"green":"yellow")}>{x.payment_status==="paid"?"Ödənilib":x.payment_status==="partial"?"Qismən":"Gözləyir"}</span></td></tr>})}</tbody></table>{!rows.length&&<p className="empty">Hələ alış qeydi yoxdur.</p>}</div></section>
 </div>
}

export function SecurityPanel({sb,user,loginEvents=[],say,load}){
 const [backupBusy,setBackupBusy]=useState(false);
 const [restoreBusy,setRestoreBusy]=useState(false);
 const [sessionBusy,setSessionBusy]=useState(false);
 async function createBackup(){setBackupBusy(true);const tables=["store_settings","products","suppliers","purchases","orders","order_items","sales","cancellations","expenses","finance_entries","stock_movements","returns"];const backup={app:"ZED STORE MANAGEMENT",version:1,created_at:new Date().toISOString(),owner_id:user.id,tables:{}};for(const table of tables){const r=await sb.from(table).select("*");if(r.error){say("Ehtiyat nüsxə yaradıla bilmədi ("+table+"): "+r.error.message);setBackupBusy(false);return}backup.tables[table]=r.data||[]}const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="zed-store-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);say("Ehtiyat nüsxə faylı hazırdır.");setBackupBusy(false)}
 async function restoreBackup(e){const file=e.target.files?.[0];e.target.value="";if(!file)return;setRestoreBusy(true);try{const backup=JSON.parse(await file.text());if(backup.app!=="ZED STORE MANAGEMENT"||backup.owner_id!==user.id||!backup.tables)throw new Error("Bu fayl ZED STORE hesabına aid ehtiyat nüsxə deyil.");if(!window.confirm("Ehtiyat nüsxədəki məlumatlar mövcud məlumatlarla birləşdiriləcək. Mövcud qeydlər silinməyəcək. Davam edilsin?")){setRestoreBusy(false);return}const order=["store_settings","products","suppliers","purchases","orders","order_items","sales","cancellations","expenses","finance_entries","stock_movements","returns"];for(const table of order){const rows=backup.tables[table]||[];for(let i=0;i<rows.length;i+=200){const batch=rows.slice(i,i+200).filter(row=>row.owner_id===user.id).map(row=>{const copy={...row};delete copy.net_profit;if(table==="purchases")copy.stock_applied=true;return copy});if(!batch.length)continue;const r=await sb.from(table).upsert(batch,{onConflict:"id",ignoreDuplicates:true});if(r.error)throw new Error(table+": "+r.error.message)}}say("Ehtiyat nüsxədəki qeydlər bərpa edildi. Mövcud məlumatlar silinməyib.");await load()}catch(err){say("Bərpa xətası: "+err.message)}setRestoreBusy(false)}
 async function signOutOtherSessions(){if(!window.confirm("Bu cihazdan başqa bütün aktiv giriş sessiyaları bağlansın?"))return;setSessionBusy(true);const r=await sb.auth.signOut({scope:"others"});if(r.error)say("Sessiyalar bağlanmadı: "+r.error.message);else say("Digər cihazlardakı sessiyalar bağlandı.");setSessionBusy(false)}
 return <div className="owner-security"><div className="toolbar"><div><h2>Təhlükəsizlik və ehtiyat nüsxə</h2><p>Admin girişlərini, əməliyyat tarixçəsini və məlumatların qorunmasını idarə et.</p></div><ShieldCheck size={28}/></div>
  <div className="owner-security-grid"><section className="panel owner-security-card"><div className="owner-security-icon"><LockKeyhole/></div><h3>Hesab və sessiya təhlükəsizliyi</h3><p>Aktiv hesab: <b>{user.email}</b></p><p>Bu cihazdakı giriş saxlanılır; digər cihazlardakı sessiyaları ayrıca bağlaya bilərsən. Ləğv edilən sessiyanın access token-i müddəti bitənədək qısa müddət işləyə bilər.</p><button className="outline" onClick={signOutOtherSessions} disabled={sessionBusy}>{sessionBusy?"Bağlanır...":"Digər cihazlardan çıxış et"}</button><small>Qeyd: sessiyanın maksimum müddəti və boş qalma limiti Supabase Auth təhlükəsizlik sazlamalarında idarə olunur.</small></section>
   <section className="panel owner-security-card"><div className="owner-security-icon"><Download/></div><h3>Ehtiyat nüsxə yarat</h3><p>Məhsullar, sifarişlər, satışlar, alışlar, maliyyə qeydləri və anbar hərəkətləri JSON faylına ixrac edilir.</p><button className="primary" onClick={createBackup} disabled={backupBusy}>{backupBusy?"Hazırlanır...":"İndi ehtiyat nüsxə yarat"}</button><small>Şəkil faylları Storage-da saxlanılır və bu JSON faylına daxil deyil.</small></section>
   <section className="panel owner-security-card"><div className="owner-security-icon"><Upload/></div><h3>Ehtiyat nüsxədən bərpa</h3><p>Əvvəlki ZED STORE JSON ehtiyat nüsxəsini seç. Bərpa mövcud qeydləri silmədən çatışmayanları əlavə edir.</p><label className="owner-file-button"><Upload size={16}/> {restoreBusy?"Bərpa edilir...":"Backup faylını seç"}<input type="file" accept="application/json,.json" disabled={restoreBusy} onChange={restoreBackup}/></label><small>Bərpa əməliyyatı yalnız eyni admin hesabına aid ehtiyat nüsxəni qəbul edir.</small></section></div>
  <section className="panel owner-login-history"><div className="finance-list-head"><h3>Giriş tarixçəsi</h3><span>{loginEvents.length} hadisə</span></div><div className="tablewrap"><table><thead><tr><th>Hadisə</th><th>Cihaz / brauzer məlumatı</th><th>Tarix və saat</th></tr></thead><tbody>{loginEvents.map(x=><tr key={x.id}><td><span className={"badge "+(x.event_type==="sign_in"?"green":"yellow")}>{x.event_type==="sign_in"?"Uğurlu giriş":"Çıxış"}</span></td><td className="owner-device-cell">{x.device_info||"Cihaz məlumatı yoxdur"}</td><td>{x.created_at?new Date(x.created_at).toLocaleString("az-AZ"):"—"}</td></tr>)}</tbody></table>{!loginEvents.length&&<p className="empty">Giriş hadisəsi qeydə alınmayıb. Növbəti uğurlu girişdən sonra burada görünəcək.</p>}</div></section>
  <div className="owner-backup-note"><CheckCircle2 size={18}/><span><b>Platforma ehtiyat nüsxələri:</b> Supabase-in avtomatik verilənlər bazası backup və bərpa imkanları layihənin tarifindən asılıdır. Bu paneldəki düymə isə əlavə JSON nüsxəsi yaradır. Faylda sifariş və müştəri məlumatları ola bilər; onu təhlükəsiz yerdə saxla və mütəmadi yenilə.</span></div>
 </div>
}
