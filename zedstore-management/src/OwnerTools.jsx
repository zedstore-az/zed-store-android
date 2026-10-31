import React,{useEffect,useMemo,useState} from "react";
import {ArrowDownToLine,ArrowUpFromLine,Boxes,CalendarDays,CheckCircle2,Clock3,Download,LockKeyhole,Plus,RefreshCw,ShieldCheck,Store,Trash2,Upload,Wallet} from "lucide-react";
import "./OwnerTools.css";

const money=n=>new Intl.NumberFormat("az-AZ",{style:"currency",currency:"AZN"}).format(Number(n||0));
const dateKey=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
const monthKey=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")};
const dateLabel=d=>{if(!d)return "—";const x=new Date(d);return String(x.getDate()).padStart(2,"0")+"."+String(x.getMonth()+1).padStart(2,"0")+"."+x.getFullYear()};
const todayKey=dateKey(new Date());
const currentMonth=monthKey(new Date());

export function DashboardPanel({products=[],sales=[],financeEntries=[],orders=[],purchases=[],returns=[],navigate=()=>{},load=()=>{}}){
 const [period,setPeriod]=useState("14");
 const [selectedDay,setSelectedDay]=useState(dateKey(new Date()));
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==="visible")load()},10000);return()=>clearInterval(timer)},[]);
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
 const chart=useMemo(()=>{const count=Number(period);return Array.from({length:count},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(count-1-i));const key=dateKey(d);const dayOrders=orders.filter(x=>dateKey(x.ordered_at||x.created_at)===key);return {key,label:String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0"),fullDate:dateLabel(d),count:dayOrders.length}})},[orders,period]);
 const maxChart=Math.max(1,...chart.map(x=>x.count));
 const selectedDayOrders=orders.filter(x=>dateKey(x.ordered_at||x.created_at)===selectedDay);
 const selectedDayLabel=selectedDay?selectedDay.split("-").reverse().join("."):"—";
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
   <section className="owner-card owner-chart-card"><div className="owner-card-head"><div><h3>Satış dinamikası</h3><p>Günlər üzrə yalnız yeni yaradılmış sifarişlərin sayı. Sütuna toxunaraq həmin günü seç.</p></div><select value={period} onChange={e=>{setPeriod(e.target.value);setSelectedDay(dateKey(new Date()))}}><option value="7">7 gün</option><option value="14">14 gün</option><option value="30">30 gün</option></select></div><div className="owner-chart">{chart.map(x=><button type="button" className={"owner-chart-col owner-chart-day"+(selectedDay===x.key?" selected":"")} key={x.key} aria-pressed={selectedDay===x.key} onClick={()=>setSelectedDay(x.key)} title={x.fullDate+" · "+x.count+" sifariş"}><span className="owner-chart-count">{x.count}</span><div className="owner-chart-bar-wrap"><i style={{height:(x.count/maxChart*100)+"%"}}/></div><small>{x.label}</small></button>)}</div><div className="owner-selected-day"><div><small>Seçilmiş gün</small><b>{selectedDayLabel}</b></div><strong>{selectedDayOrders.length}</strong><span>yeni sifariş</span></div><div className="owner-chart-refresh-note">Yeni sifarişlər avtomatik olaraq hər 10 saniyədən bir yoxlanılır. Paneldə yaradılan sifarişdən sonra məlumat dərhal yenilənir.</div></section>
  </div>
  <div className="owner-shortcuts">
   <button onClick={()=>navigate("orders")}><Store size={18}/><span><b>{activeOrders.length}</b><small>Prosesdə sifariş</small></span></button>
   <button onClick={()=>navigate("stock")}><Boxes size={18}/><span><b>{low.length}</b><small>Az qalan məhsul</small></span></button>
   <button onClick={()=>navigate("purchases")}><ArrowDownToLine size={18}/><span><b>{money(purchaseTotal)}</b><small>Bu ay alışlar</small></span></button>
   <button onClick={()=>navigate("finance")}><Wallet size={18}/><span><b>{money(waitingAmount+payable)}</b><small>Gözləyən məbləğ + borc</small></span></button>
  </div>
  <p className="owner-footnote">“Satış dinamikası” sifarişin yaradılma tarixinə əsaslanır, bütün yeni sifarişləri statusundan asılı olmayaraq sayır və məbləğ göstərmir. “Bu ay dövriyyə” yalnız təhvil verilmiş və ödənişi təsdiqlənmiş satışların komissiyalar çıxıldıqdan sonra köçən məbləğini göstərir. “Gözləmədə” yalnız təhvil verilmiş, lakin ödənişi təsdiqlənməmiş satışları göstərir.</p>
 </div>
}
export function PurchasesPanel({sb,user,products=[],purchases=[],suppliers=[],say,load}){
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState({name:"",category:"",weight:"0",birmarket:"",quantity:"1",cost:"0"});
 const [items,setItems]=useState([]);
 const [confirm,setConfirm]=useState(false);
 const [saving,setSaving]=useState(false);
 const [expanded,setExpanded]=useState({});
 const [supplierName,setSupplierName]=useState("");
 const [supplierPhone,setSupplierPhone]=useState("");
 const category=BIRM_CATEGORIES.find(x=>x.name===draft.category);
 const calc=(item)=>{
  const price=Math.max(0,Number(item.birmarket)||0),weight=Math.max(0,Number(item.weight)||0);
  const rate=Number(BIRM_CATEGORIES.find(x=>x.name===item.category)?.rate||0);
  let cls=weight>60?3:weight>30?2:weight>1?1:0;
  const logistics=price<10?0:([[1,2],[2,5],[7,11],[12,15]][cls][price>=50?1:0]);
  const commission=price*rate/100,bank=price*1.5/100;
  const payout=Math.max(0,Math.round((price-commission-bank-logistics+Number.EPSILON)*100)/100);
  return {rate,commission,bank,logistics,payout};
 };
 const preview=calc(draft);
 function addItem(e){
  e.preventDefault();
  if(!draft.name.trim()||!draft.category||!(Number(draft.birmarket)>0)||!(Number(draft.quantity)>0)||!(Number(draft.weight)>=0)||!(Number(draft.cost)>=0)){say("Məhsulun adını, kateqoriyasını, çəkisini, miqdarını və Birmarket qiymətini düzgün daxil et.");return}
  setItems(old=>[...old,{...draft,id:crypto.randomUUID(),name:draft.name.trim()}]);
  setDraft({name:"",category:"",weight:"0",birmarket:"",quantity:"1",cost:"0"});
 }
 function removeItem(id){setItems(old=>old.filter(x=>x.id!==id))}
 async function addSupplier(){if(!supplierName.trim())return;const r=await sb.from("suppliers").insert({owner_id:user.id,name:supplierName.trim(),phone:supplierPhone.trim()||null}).select().single();if(r.error){say("Təchizatçı əlavə edilmədi: "+r.error.message);return}setSupplierName("");setSupplierPhone("");say("Təchizatçı əlavə edildi");await load()}
 async function registerReceipt(){
  if(!items.length||saving)return;
  setSaving(true);
  const receiptNo="MQ-"+new Date().toISOString().replace(/[-:T.Z]/g,"").slice(0,14);
  const created=[];
  try{
   const productRows=items.map(item=>{const c=calc(item);return {owner_id:user.id,name:item.name,category:item.category,weight_kg:Number(item.weight),birmarket_price:Number(item.birmarket),sale_price:c.payout,cost_price:Number(item.cost),stock_qty:0,low_stock_threshold:1,is_active:true,notes:"MQ mal qəbulu · Komissiya "+c.rate+"%"}});
   const inserted=await sb.from("products").insert(productRows).select("id,name");
   if(inserted.error)throw new Error("Məhsullar yaradıla bilmədi: "+inserted.error.message);
   created.push(...(inserted.data||[]));
   const purchaseRows=items.map((item,index)=>({owner_id:user.id,product_id:created[index]?.id,quantity:Number(item.quantity),unit_cost:Number(item.cost),total_amount:Number(item.quantity)*Number(item.cost),paid_amount:Number(item.quantity)*Number(item.cost),payment_status:"paid",payment_account:"marketplace",purchased_at:new Date().toISOString(),invoice_no:receiptNo,notes:"MQ mal qəbulu · "+item.name,stock_applied:false}));
   const purchasesResult=await sb.from("purchases").insert(purchaseRows);
   if(purchasesResult.error)throw new Error("Mal qəbulu stoka köçürülmədi: "+purchasesResult.error.message);
   say("MQ "+items.length+" çeşid üzrə qeydiyyata alındı və mallar anbara əlavə edildi.");
   setItems([]);setConfirm(false);setOpen(false);setExpanded(old=>({...old,[receiptNo]:true}));
   await load();
  }catch(error){
   if(created.length){const ids=created.map(x=>x.id);await sb.from("products").delete().in("id",ids)}
   say("Mal qəbulu tamamlanmadı: "+error.message);
  }
  setSaving(false);
 }
 const rows=[...purchases].sort((a,b)=>new Date(b.purchased_at||b.created_at)-new Date(a.purchased_at||a.created_at));
 const groups=Object.values(rows.reduce((acc,row)=>{const key=row.invoice_no||("single-"+row.id);if(!acc[key])acc[key]={key,rows:[],date:row.purchased_at||row.created_at};acc[key].rows.push(row);return acc},{}));
 const totalQty=items.reduce((n,x)=>n+Number(x.quantity||0),0);
 return <div className="owner-purchases">
  <div className="toolbar"><div><h2>Mal qəbulu qeyd et</h2><p>MQ — yeni malları siyahıya əlavə et, qeydiyyatdan keçir və avtomatik anbara köçür.</p></div><div className="owner-mq-head-actions"><div className="owner-purchase-total"><small>Qəbul jurnalı</small><b>{groups.length}</b></div><button className="primary" onClick={()=>setOpen(true)}><Plus size={16}/> MQ · Mal qəbulu</button></div></div>
  {open&&<div className="shade" onClick={e=>e.target===e.currentTarget&&!confirm&&setOpen(false)}><section className="modal owner-mq-modal"><header><b>MQ · Mal qəbulu</b><button type="button" onClick={()=>{setOpen(false);setConfirm(false)}}><X/></button></header>
   <div className="owner-mq-content">
    <form className="owner-mq-form" onSubmit={addItem}>
     <label>Məhsulun adı<input value={draft.name} onChange={e=>setDraft(x=>({...x,name:e.target.value}))} placeholder="Məsələn: Maus T5" required/></label>
     <label>Kateqoriya<select value={draft.category} onChange={e=>setDraft(x=>({...x,category:e.target.value}))} required><option value="">Kateqoriya seç</option>{BIRM_CATEGORIES.map(x=><option key={x.name} value={x.name}>{x.name} · {x.rate}%</option>)}</select></label>
     <div className="owner-form-two"><label>Çəki (kq)<input type="number" min="0" step="0.001" value={draft.weight} onChange={e=>setDraft(x=>({...x,weight:e.target.value}))} required/></label><label>Miqdar (ədəd)<input type="number" min="1" step="1" value={draft.quantity} onChange={e=>setDraft(x=>({...x,quantity:e.target.value}))} required/></label></div>
     <div className="owner-form-two"><label>Birmarket satış qiyməti (₼)<input type="number" min="0.01" step="0.01" value={draft.birmarket} onChange={e=>setDraft(x=>({...x,birmarket:e.target.value}))} required/></label><label>1 ədədin maya dəyəri (₼)<input type="number" min="0" step="0.01" value={draft.cost} onChange={e=>setDraft(x=>({...x,cost:e.target.value}))} required/></label></div>
     <div className="owner-mq-calculation"><div><span>Komissiya</span><b>{preview.rate.toFixed(2)}%</b></div><div><span>Komissiya məbləği</span><b>{money(preview.commission)}</b></div><div><span>Bank + logistika</span><b>{money(preview.bank+preview.logistics)}</b></div><div className="owner-mq-payout"><span>Sizə köçən məbləğ / satış qiyməti</span><b>{money(preview.payout)}</b></div></div>
     <button className="primary" type="submit"><Plus size={16}/> Siyahıya əlavə et</button>
    </form>
    <section className="owner-mq-list"><div className="finance-list-head"><h3>Qəbul siyahısı</h3><span>{items.length} çeşid · {totalQty} ədəd</span></div>
     {items.map((item,index)=>{const c=calc(item);return <article className="owner-mq-item" key={item.id}><div><b>{index+1}. {item.name}</b><small>{item.category} · {item.weight} kq · {item.quantity} ədəd</small><small>Birmarket: {money(item.birmarket)} · Komissiya: {c.rate}% · Sizə köçən: {money(c.payout)}</small></div><button type="button" className="tiny bad" onClick={()=>removeItem(item.id)} aria-label="Siyahıdan sil"><Trash2 size={15}/></button></article>})}
     {!items.length&&<p className="empty">Hələ mal əlavə edilməyib. Soldakı formanı doldur və “Siyahıya əlavə et” düyməsinə bas.</p>}
    </section>
   </div>
   <footer className="owner-mq-footer"><span>{items.length} çeşid / {totalQty} ədəd</span><button type="button" className="primary" disabled={!items.length} onClick={()=>setConfirm(true)}>Registrasiya et</button></footer>
   {confirm&&<div className="owner-mq-confirm"><div className="owner-mq-confirm-box"><h3>Mal qəbulunu təsdiqlə</h3><p>{items.length} çeşid, ümumilikdə {totalQty} ədəd məhsul bu günün tarixi ilə MQ jurnalına yazılacaq və anbar stokuna əlavə olunacaq.</p><div><button type="button" className="outline" onClick={()=>setConfirm(false)}>Geri</button><button type="button" className="primary" disabled={saving} onClick={registerReceipt}>{saving?"Qeydiyyat aparılır...":"OK · Qeydiyyatı tamamla"}</button></div></div></div>}
  </section></div>}
  <section className="panel owner-mq-journal"><div className="finance-list-head"><h3>Mal qəbulu jurnalı</h3><span>{groups.length} qəbul</span></div><div className="tablewrap"><table><thead><tr><th>Tarix</th><th>MQ nömrəsi</th><th>Çeşid sayı</th><th>Ümumi miqdar</th><th>Məhsullar</th></tr></thead><tbody>{groups.map(group=><React.Fragment key={group.key}><tr><td>{dateLabel(group.date)}</td><td><b>{group.key.startsWith("single-")?"Alış":group.key}</b></td><td>{group.rows.length}</td><td>{group.rows.reduce((n,x)=>n+Number(x.quantity||0),0)} ədəd</td><td><button type="button" className="owner-mq-expand" onClick={()=>setExpanded(old=>({...old,[group.key]:!old[group.key]}))}>{expanded[group.key]?"Gizlət":"Ətraflı bax"}</button></td></tr>{expanded[group.key]&&group.rows.map(row=>{const p=products.find(x=>x.id===row.product_id);return <tr className="owner-mq-detail" key={row.id}><td></td><td colSpan="2"><b>{p?.name||"Məhsul"}</b></td><td>{row.quantity} ədəd</td><td>Maya: {money(row.unit_cost)} · Cəmi: {money(row.total_amount)}</td></tr>})}</React.Fragment>)}</tbody></table>{!groups.length&&<p className="empty">Hələ mal qəbulu qeydə alınmayıb.</p>}</div></section>
  <section className="panel owner-supplier-panel"><div className="finance-list-head"><h3>Təchizatçılar</h3><span>{suppliers.length}</span></div><div className="owner-inline-supplier"><input value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="Yeni təchizatçı adı"/><input value={supplierPhone} onChange={e=>setSupplierPhone(e.target.value)} placeholder="Telefon (istəyə bağlı)"/><button type="button" className="outline" onClick={addSupplier} disabled={!supplierName.trim()}><Plus size={15}/> Əlavə et</button></div></section>
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
