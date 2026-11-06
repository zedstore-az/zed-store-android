import React,{useEffect,useMemo,useState} from "react";
import {ArrowDownToLine,ArrowUpFromLine,Boxes,CalendarDays,CheckCircle2,Clock3,Download,LockKeyhole,Plus,RefreshCw,ShieldCheck,Store,Trash2,Upload,X} from "lucide-react";
import BIRM_CATEGORIES from "./data/birmarketCategories.json";
import "./OwnerTools.css";

const money=n=>new Intl.NumberFormat("az-AZ",{style:"currency",currency:"AZN"}).format(Number(n||0));
const dateKey=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
const monthKey=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")};
const dateValue=d=>{if(!d)return null;if(typeof d==="string"&&/^\\d{4}-\\d{2}-\\d{2}$/.test(d)){const [y,m,day]=d.split("-").map(Number);return new Date(y,m-1,day)}const x=new Date(d);return Number.isNaN(x.getTime())?null:x};
const dateLabel=d=>{const x=dateValue(d);return x?String(x.getDate()).padStart(2,"0")+"."+String(x.getMonth()+1).padStart(2,"0")+"."+x.getFullYear():"—"};
const dateTimeLabel=d=>{const x=dateValue(d);return x?dateLabel(d)+", "+String(x.getHours()).padStart(2,"0")+":"+String(x.getMinutes()).padStart(2,"0"):"—"};
const todayKey=dateKey(new Date());
const currentMonth=monthKey(new Date());

export function DashboardPanel({products=[],sales=[],financeEntries=[],orders=[],cancellations=[],purchases=[],returns=[],navigate=()=>{},load=()=>{}}){
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
 const cancelledOrderIds=new Set(cancellations.map(x=>String(x.order_id||"")).filter(Boolean));
 const todayOrders=orders.filter(x=>!["cancelled","canceled"].includes(String(x.delivery_status||"").trim().toLowerCase())&&!x.cancelled_at&&!cancelledOrderIds.has(String(x.id))&&dateKey(x.ordered_at||x.created_at)===todayKey);
 const todayTurnover=todayOrders.reduce((n,x)=>n+orderPayout(x),0);
 const monthTurnover=turnover(currentSales),previousTurnover=turnover(previousSales);
 const monthlyExpenses=financeEntries.filter(x=>x.entry_type==="expense"&&x.status==="paid"&&monthKey(x.paid_at||x.created_at)===currentMonth);
 const operatingExpenses=monthlyExpenses.filter(x=>x.source_type!=="purchase").reduce((n,x)=>n+Number(x.amount||0),0);
 const profit=currentSales.reduce((n,x)=>n+Number(x.net_profit||0),0)-operatingExpenses;
 const stockValue=products.reduce((n,x)=>n+Number(x.cost_price||0)*Number(x.stock_qty||0),0);
 const deliveredUnpaid=sales.filter(x=>!x.paid_at&&orders.some(o=>o.id===x.order_id&&o.delivery_status==="delivered"&&o.payment_status!=="paid"));
 const waitingAmount=deliveredUnpaid.reduce((n,x)=>n+Number(x.transferred_amount||0)*Number(x.quantity||0),0);
 const purchaseTotal=purchases.filter(x=>monthKey(x.purchased_at||x.created_at)===currentMonth).reduce((n,x)=>n+Number(x.total_amount||0),0);
 const change=previousTurnover?((monthTurnover-previousTurnover)/previousTurnover)*100:(monthTurnover?100:0);
 const chart=useMemo(()=>{const count=Number(period);return Array.from({length:count},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(count-1-i));const key=dateKey(d);const dayOrders=orders.filter(x=>dateKey(x.ordered_at||x.created_at)===key);return {key,label:String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0"),fullDate:dateLabel(d),count:dayOrders.length}})},[orders,period]);
 const maxChart=Math.max(1,...chart.map(x=>x.count));
 const selectedDayOrders=orders.filter(x=>dateKey(x.ordered_at||x.created_at)===selectedDay);
 const selectedDayLabel=selectedDay?selectedDay.split("-").reverse().join("."):"—";
 const low=products.filter(x=>Number(x.stock_qty||0)<=Number(x.low_stock_threshold||0));
 const activeOrders=orders.filter(x=>!["delivered","cancelled"].includes(x.delivery_status));
 return <div className="owner-dashboard">
  <div className="owner-welcome"><div><span className="owner-kicker">SAHİBKAR PANELİ</span><h2>ZED STORE — Biznes icmalı</h2><p>Sifariş, satış dinamikası və anbar vəziyyətini bir ekranda izlə.</p></div><button className="owner-refresh" onClick={load}><RefreshCw size={16}/> Yenilə</button></div>
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
  </div>
  <p className="owner-footnote">“Satış dinamikası” sifarişin yaradılma tarixinə əsaslanır, bütün yeni sifarişləri statusundan asılı olmayaraq sayır və məbləğ göstərmir. “Bu ay dövriyyə” yalnız təhvil verilmiş və ödənişi təsdiqlənmiş satışların komissiyalar çıxıldıqdan sonra köçən məbləğini göstərir. “Gözləmədə” yalnız təhvil verilmiş, lakin ödənişi təsdiqlənməmiş satışları göstərir.</p>
 </div>
}
export function PurchasesPanel({sb,user,products=[],purchases=[],suppliers=[],say,load,calculateProductPayout}){
 const [open,setOpen]=useState(false),[items,setItems]=useState([]),[confirm,setConfirm]=useState(false),[saving,setSaving]=useState(false),[expanded,setExpanded]=useState({});
 const [supplierName,setSupplierName]=useState(""),[supplierPhone,setSupplierPhone]=useState(""),[supplierId,setSupplierId]=useState("");
 const emptyDraft={name:"",sku:"",barcode:"",brand:"",category:"",weight_kg:"0",birmarket_price:"",quantity:"1",cost_price:"0",low_stock_threshold:"1",notes:""};
 const [draft,setDraft]=useState(emptyDraft),[draftImages,setDraftImages]=useState([]),[categoryFocused,setCategoryFocused]=useState(false);
 const matchingCategories=BIRM_CATEGORIES.filter(x=>(x.name+" "+(x.group||"")+" "+(x.vertical||"")).toLocaleLowerCase("az").includes(draft.category.trim().toLocaleLowerCase("az"))).slice(0,12);
 const pricing=calculateProductPayout({...draft,category:draft.category,birmarket_price:Number(draft.birmarket_price),weight_kg:Number(draft.weight_kg)});
 const totalQty=items.reduce((n,x)=>n+Number(x.quantity||0),0);
 function addImages(files){
  const valid=files.filter(f=>["image/jpeg","image/png","image/webp"].includes(f.type)&&f.size<=5*1024*1024);
  if(valid.length!==files.length)say("JPG, PNG və WebP şəkilləri qəbul olunur; hər biri maksimum 5 MB.");
  const count=draftImages.length;
  const added=valid.slice(0,Math.max(0,12-count)).map(file=>({file,url:URL.createObjectURL(file)}));
  if(added.length<valid.length)say("Bir məhsul üçün maksimum 12 şəkil əlavə etmək olar.");
  setDraftImages(old=>[...old,...added]);
 }
 function addItem(e){
  e.preventDefault();
  if(!draft.name.trim()||!draft.category||!pricing.ready||!(Number(draft.birmarket_price)>0)||!(Number(draft.quantity)>0)||!(Number(draft.weight_kg)>=0)||!(Number(draft.cost_price)>=0)){say("Məhsulun adını, tarif kateqoriyasını, qiymətini, çəkisini və miqdarını yoxla.");return}
  setItems(old=>[...old,{...draft,id:crypto.randomUUID(),name:draft.name.trim(),images:draftImages}]);
  setDraft(emptyDraft);setDraftImages([]);setCategoryFocused(false);
 }
 function removeItem(id){setItems(old=>{const item=old.find(x=>x.id===id);(item?.images||[]).forEach(im=>URL.revokeObjectURL(im.url));return old.filter(x=>x.id!==id)})}
 async function addSupplier(){if(!supplierName.trim())return;const r=await sb.from("suppliers").insert({owner_id:user.id,name:supplierName.trim(),phone:supplierPhone.trim()||null}).select().single();if(r.error){say("Təchizatçı əlavə edilmədi: "+r.error.message);return}setSupplierName("");setSupplierPhone("");say("Təchizatçı əlavə edildi");await load()}
 async function registerReceipt(){
  if(!items.length||saving)return;
  setSaving(true);
  const receiptNo="MQ-"+new Date().toISOString().replace(/[-:T.Z]/g,"").slice(0,14),created=[],uploaded=[];
  try{
   for(const item of items){
    const paths=[];
    for(const image of item.images||[]){
     const file=image.file,path=user.id+"/"+crypto.randomUUID()+"."+file.name.split(".").pop().toLowerCase();
     const storage=sb.storage.from("zedstore-products");
     let up=null,uploadError=null;
     for(let attempt=1;attempt<=3;attempt++){
      try{
       up=await storage.upload(path,file,{cacheControl:"3600",upsert:true,contentType:file.type});
       if(!up.error)break;
       uploadError=up.error;
       const status=Number(up.error.statusCode||up.error.status||0);
       if(status&&status<500&&status!==408&&status!==429)throw up.error;
      }catch(err){
       uploadError=err;
       const status=Number(err?.statusCode||err?.status||0);
       const retryable=!status||status>=500||status===408||status===429||/failed to fetch|network/i.test(String(err?.message||""));
       if(!retryable||attempt===3){
        if(/failed to fetch|networkerror|load failed/i.test(String(err?.message||"")))throw new Error("Supabase Storage serverinə qoşulmaq mümkün olmadı. İnternet bağlantısını yoxla və yenidən cəhd et.");
        throw err;
       }
      }
      if(attempt<3)await new Promise(resolve=>setTimeout(resolve,700*attempt));
     }
     if(up?.error)throw uploadError||up.error;
     paths.push(path);uploaded.push(path);
    }
    const urls=paths.map(path=>sb.storage.from("zedstore-products").getPublicUrl(path).data.publicUrl);
    const row={owner_id:user.id,name:item.name,supplier_id:supplierId||null,sku:item.sku||null,barcode:item.barcode||null,brand:item.brand||null,category:item.category,weight_kg:Number(item.weight_kg),birmarket_price:Number(item.birmarket_price),sale_price:Number(calculateProductPayout(item).payout),cost_price:Number(item.cost_price),stock_qty:0,low_stock_threshold:Number(item.low_stock_threshold)||1,is_active:true,notes:item.notes||("MQ mal qəbulu · "+receiptNo),image_paths:paths,image_urls:urls,image_path:paths[0]||null,image_url:urls[0]||null};
    const inserted=await sb.from("products").insert(row).select("id,name").single();
    if(inserted.error)throw new Error("Məhsul yaradıla bilmədi: "+inserted.error.message);
    created.push({id:inserted.data.id,item});
   }
   const purchaseRows=created.map(({id,item})=>({owner_id:user.id,product_id:id,supplier_id:supplierId||null,quantity:Number(item.quantity),unit_cost:Number(item.cost_price),total_amount:Number(item.quantity)*Number(item.cost_price),paid_amount:Number(item.quantity)*Number(item.cost_price),payment_status:"paid",payment_account:"marketplace",purchased_at:new Date().toISOString(),invoice_no:receiptNo,notes:"MQSNAP:"+JSON.stringify({name:item.name,sku:item.sku||"",barcode:item.barcode||"",brand:item.brand||"",category:item.category||"",sale_price:Number(calculateProductPayout(item).payout),birmarket_price:Number(item.birmarket_price),weight_kg:Number(item.weight_kg),notes:item.notes||""}),stock_applied:false}));
   const purchasesResult=await sb.from("purchases").insert(purchaseRows);
   if(purchasesResult.error)throw new Error("Mal qəbulu jurnala yazılmadı: "+purchasesResult.error.message);
   (items.flatMap(x=>x.images||[])).forEach(im=>URL.revokeObjectURL(im.url));
   say("MQ "+items.length+" çeşid üzrə qeydiyyata alındı və mallar anbara əlavə edildi.");
   setItems([]);setConfirm(false);setOpen(false);setExpanded(old=>({...old,[receiptNo]:true}));await load();
  }catch(error){
   if(created.length)await sb.from("products").delete().in("id",created.map(x=>x.id));
   if(uploaded.length)await sb.storage.from("zedstore-products").remove(uploaded);
   say("Mal qəbulu tamamlanmadı: "+error.message);
  }finally{setSaving(false)}
 }
 function receiptSnapshot(row){try{const raw=String(row.notes||"");return raw.startsWith("MQSNAP:")?JSON.parse(raw.slice(7)):{} }catch{return {}}}
 const rows=[...purchases].sort((a,b)=>new Date(b.purchased_at||b.created_at)-new Date(a.purchased_at||a.created_at));
 const groups=Object.values(rows.reduce((acc,row)=>{const key=row.invoice_no||("single-"+row.id);if(!acc[key])acc[key]={key,rows:[],date:row.purchased_at||row.created_at};acc[key].rows.push(row);return acc},{}));
 return <div className="owner-purchases">
  <div className="toolbar"><div><h2>Mal qəbulu</h2><p>MQ — malları əlavə et, qeydiyyatdan keçir və anbara köçür.</p></div><div className="owner-mq-head-actions"><div className="owner-purchase-total"><small>Qəbul jurnalı</small><b>{groups.length}</b></div><button className="primary" onClick={()=>setOpen(true)}><Plus size={16}/> MQ · Mal qəbulu</button></div></div>
  {open&&<div className="owner-mq-window-host" onClick={e=>e.stopPropagation()}><section className="owner-mq-modal"><header className="owner-mq-titlebar"><b>MQ · Mal qəbulu</b><button type="button" onClick={()=>{setOpen(false);setConfirm(false)}} title="Pəncərəni bağla"><X/></button></header>
   <form className="owner-mq-form owner-mq-product-form" onSubmit={addItem}>
    <label className="owner-mq-supplier-select">Təchizatçı <select value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Təchizatçı seçilməyib</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}{s.phone?" · "+s.phone:""}</option>)}</select><small>Əvvəlcədən yaradılmış təchizatçılardan birini seç. Seçim bu MQ qəbzindəki bütün məhsullara tətbiq olunacaq.</small></label>
    <div className="owner-mq-fields">
     { [["Məhsul adı","name","text"],["SKU","sku","text"],["Barkod","barcode","text"],["Brend","brand","text"],["Maya qiyməti","cost_price","number"],["Birmarket qiyməti","birmarket_price","number"],["Çəki (kq)","weight_kg","number"],["Miqdar (ədəd)","quantity","number"],["Az stok həddi","low_stock_threshold","number"]].map(([label,key,type])=><label key={key}>{label}<input type={type} step="any" min={type==="number"?"0":undefined} required={key==="name"||key==="birmarket_price"} value={draft[key]} onChange={e=>setDraft(x=>({...x,[key]:e.target.value}))}/></label>)}
     <label className="owner-mq-category-field">Birmarket tarif kateqoriyası
      <div className="owner-mq-category-wrap"><input value={draft.category} placeholder="Məs: Qulaqlıqlar və qarnituralar" autoComplete="off" onFocus={()=>setCategoryFocused(true)} onBlur={()=>setTimeout(()=>setCategoryFocused(false),160)} onChange={e=>{setDraft(x=>({...x,category:e.target.value}));setCategoryFocused(true)}}/>{draft.category&&<button type="button" onClick={()=>setDraft(x=>({...x,category:""}))}>×</button>}
      {categoryFocused&&<div className="owner-mq-category-options">{matchingCategories.map(x=><button type="button" key={x.name} onMouseDown={e=>e.preventDefault()} onClick={()=>{setDraft(v=>({...v,category:x.name}));setCategoryFocused(false)}}><span><b>{x.name}</b><small>{x.group||""} · {x.vertical||""}</small></span><strong>{x.rate}%</strong></button>)}{!matchingCategories.length&&<small>Uyğun kateqoriya tapılmadı.</small>}</div>}</div>
      <small>Tarif faylındakı {BIRM_CATEGORIES.length.toLocaleString("az-AZ")} kateqoriyadan axtar. Seçim zamanı komissiya avtomatik götürülür.</small>
     </label>
    </div>
    <label className="owner-mq-own-price">Öz satış qiyməti<input type="text" readOnly value={pricing.ready?Number(pricing.payout).toFixed(2).replace(".",",")+" ₼":""} placeholder="Kateqoriya və Birmarket qiyməti seçildikdə avtomatik hesablanacaq"/><small>Komissiya, kart haqqı və logistika çıxıldıqdan sonra sizə köçəcək məbləğ.</small></label>
     <div className="owner-mq-pricing-preview">{pricing.ready?<><div className="owner-mq-pricing-head"><span>1 ədəd üçün hesablanmış öz satış qiyməti</span><strong>{money(pricing.payout)}</strong></div><div className="owner-mq-pricing-lines"><div><span>Kateqoriya komissiyası ({pricing.rate}%)</span><b>{money(pricing.categoryFee)}</b></div><div><span>Kart komissiyası (1,5%)</span><b>{money(pricing.bankFee)}</b></div><div><span>Logistika — {pricing.parcelName}</span><b>{money(pricing.logistics)}</b></div></div><small>Hesablama Birmarket qiymətindən komissiya, 1,5% kart haqqı və logistika çıxılaraq aparılır. Vergi daxil deyil.</small></>:<div className="empty">Öz satış qiymətini hesablamaq üçün Birmarket tarif kateqoriyasını seç və qiyməti daxil et.</div>}</div>
    <div className="owner-mq-images"><div className="owner-mq-images-head"><div><b>Məhsul şəkilləri</b><small>{draftImages.length}/12 şəkil seçilib · JPG, PNG, WebP · maksimum 5 MB</small></div><label className="image-pick-button"><Plus size={17}/> Şəkil seç<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={e=>{addImages(Array.from(e.target.files||[]));e.target.value=""}}/></label></div><div className="image-grid">{draftImages.map((im,i)=><div className="image-tile" key={im.url}><img src={im.url} alt={"Məhsul şəkli "+(i+1)}/><button type="button" className="image-remove" onClick={()=>{URL.revokeObjectURL(im.url);setDraftImages(old=>old.filter((_,j)=>j!==i))}}><X size={16}/></button><span className="image-index">{i+1}</span></div>)}</div>{!draftImages.length&&<div className="image-empty"><Boxes size={27}/><b>Hələ şəkil seçilməyib</b><span>Seçdiyin şəkillər burada görünəcək.</span></div>}</div>
    <label className="owner-mq-notes">Qeyd<textarea value={draft.notes} onChange={e=>setDraft(x=>({...x,notes:e.target.value}))}/></label>
    <div className="owner-mq-add-row"><button className="primary" type="submit"><Plus size={16}/> Siyahıya əlavə et</button></div>
   </form>
   <section className="owner-mq-list"><div className="finance-list-head"><h3>Qəbul siyahısı</h3><span>{items.length} çeşid · {totalQty} ədəd</span></div>{items.map((item,index)=>{const c=calculateProductPayout(item);return <article className="owner-mq-item" key={item.id}><div className="owner-mq-item-main">{item.images?.[0]&&<img src={item.images[0].url} alt=""/>}<div><b>{index+1}. {item.name}</b><small>{item.category} · {item.weight_kg} kq · {item.quantity} ədəd</small><small>Birmarket: {money(item.birmarket_price)} · Komissiya: {c.rate}% · Sizə köçən: {money(c.payout)}</small><small>{item.images?.length||0} şəkil · Maya: {money(item.cost_price)}</small></div></div><button type="button" className="tiny bad" onClick={()=>removeItem(item.id)} aria-label="Siyahıdan sil"><Trash2 size={15}/></button></article>})}{!items.length&&<p className="empty">Məhsul məlumatlarını doldur və “Siyahıya əlavə et” düyməsinə bas.</p>}</section>
   <footer className="owner-mq-footer"><span>{items.length} çeşid / {totalQty} ədəd</span><button type="button" className="primary" disabled={!items.length||saving} onClick={()=>setConfirm(true)}>Registrasiya et</button></footer>
   {confirm&&<div className="owner-mq-confirm"><div className="owner-mq-confirm-box"><h3>Mal qəbulunu təsdiqlə</h3><p>{items.length} çeşid, ümumilikdə {totalQty} ədəd məhsul MQ jurnalına yazılacaq və anbara əlavə olunacaq.</p><div><button type="button" className="outline" onClick={()=>setConfirm(false)}>Geri</button><button type="button" className="primary" disabled={saving} onClick={registerReceipt}>{saving?"Qeydiyyat aparılır...":"OK · Qeydiyyatı tamamla"}</button></div></div></div>}
  </section></div>}
  <section className="panel owner-mq-journal"><div className="finance-list-head"><h3>Mal qəbulu jurnalı</h3><span>{groups.length} qəbul</span></div><div className="tablewrap"><table><thead><tr><th>Tarix</th><th>MQ nömrəsi</th><th>Çeşid sayı</th><th>Ümumi miqdar</th><th>Məhsullar</th></tr></thead><tbody>{groups.map(group=><React.Fragment key={group.key}><tr><td>{dateLabel(group.date)}</td><td><b>{group.key.startsWith("single-")?"Alış":group.key}</b></td><td>{group.rows.length}</td><td>{group.rows.reduce((n,x)=>n+Number(x.quantity||0),0)} ədəd</td><td><button type="button" className="owner-mq-expand" onClick={()=>setExpanded(old=>({...old,[group.key]:!old[group.key]}))}>{expanded[group.key]?"Gizlət":"Ətraflı bax"}</button></td></tr>{expanded[group.key]&&<tr className="owner-mq-detail" key={group.key+"-file"}><td colSpan="5"><div className="owner-mq-file"><div className="owner-mq-file-head"><div><b>📁 {group.key.startsWith("single-")?"Alış qəbzi":group.key}</b><small>Qəbul edilmiş məhsulların detallı siyahısı</small></div><span>{group.rows.length} çeşid · {group.rows.reduce((n,x)=>n+Number(x.quantity||0),0)} ədəd</span></div><div className="tablewrap"><table className="owner-mq-file-table"><thead><tr><th>Malın adı</th><th>SKU</th><th>Artikul / Barkod</th><th>Qəbul miqdarı</th><th>1 ədəd maya</th><th>1 ədəd satış</th><th>Yekun maya</th><th>Yekun satış</th></tr></thead><tbody>{group.rows.map(row=>{const p=products.find(x=>x.id===row.product_id)||{},snap=receiptSnapshot(row),qty=Number(row.quantity||0),cost=Number(row.unit_cost||0),sale=Number(snap.sale_price??p.sale_price??0),deleted=!p.id;return deleted?<tr key={row.id} className="owner-mq-deleted-row"><td colSpan="3"><b>{snap.name||String(row.notes||"").replace(/^MQ mal qəbulu · /,"").replace(/^MQSNAP:.*$/,"").trim()||"Məhsul"}</b><small className="owner-mq-deleted-tag">Anbardan silinib · yalnız qəbul tarixçəsi</small></td><td>{qty} ədəd</td><td>{money(cost)}</td><td colSpan="3">—</td></tr>:<tr key={row.id}><td><b>{p.name||snap.name||"Məhsul"}</b></td><td>{p.sku||snap.sku||"—"}</td><td>{p.barcode||snap.barcode||"—"}</td><td>{qty} ədəd</td><td>{money(cost)}</td><td>{money(sale)}</td><td><b>{money(Number(row.total_amount??qty*cost))}</b></td><td><b>{money(qty*sale)}</b></td></tr>})}</tbody><tfoot><tr><th colSpan="3">AKTİV MƏHSULLAR ÜZRƏ YEKUN</th><th>{group.rows.filter(x=>products.some(p=>p.id===x.product_id)).reduce((n,x)=>n+Number(x.quantity||0),0)} ədəd</th><th>—</th><th>—</th><th>{money(group.rows.filter(x=>products.some(p=>p.id===x.product_id)).reduce((n,x)=>n+Number(x.total_amount??Number(x.quantity||0)*Number(x.unit_cost||0)),0))}</th><th>{money(group.rows.filter(x=>products.some(p=>p.id===x.product_id)).reduce((n,x)=>{const p=products.find(y=>y.id===x.product_id)||{},snap=receiptSnapshot(x);return n+Number(x.quantity||0)*Number(snap.sale_price??p.sale_price??0)},0))}</th></tr></tfoot></table></div></div></td></tr>}</React.Fragment>)}</tbody></table>{!groups.length&&<p className="empty">Hələ mal qəbulu qeydə alınmayıb.</p>}</div></section>
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
  <section className="panel owner-login-history"><div className="finance-list-head"><h3>Giriş tarixçəsi</h3><span>{loginEvents.length} hadisə</span></div><div className="tablewrap"><table><thead><tr><th>Hadisə</th><th>Cihaz / brauzer məlumatı</th><th>Tarix və saat</th></tr></thead><tbody>{loginEvents.map(x=><tr key={x.id}><td><span className={"badge "+(x.event_type==="sign_in"?"green":"yellow")}>{x.event_type==="sign_in"?"Uğurlu giriş":"Çıxış"}</span></td><td className="owner-device-cell">{x.device_info||"Cihaz məlumatı yoxdur"}</td><td>{dateTimeLabel(x.created_at)}</td></tr>)}</tbody></table>{!loginEvents.length&&<p className="empty">Giriş hadisəsi qeydə alınmayıb. Növbəti uğurlu girişdən sonra burada görünəcək.</p>}</div></section>
  <div className="owner-backup-note"><CheckCircle2 size={18}/><span><b>Platforma ehtiyat nüsxələri:</b> Supabase-in avtomatik verilənlər bazası backup və bərpa imkanları layihənin tarifindən asılıdır. Bu paneldəki düymə isə əlavə JSON nüsxəsi yaradır. Faylda sifariş və müştəri məlumatları ola bilər; onu təhlükəsiz yerdə saxla və mütəmadi yenilə.</span></div>
 </div>
}


export function SupplierManagerPanel({sb,user,suppliers=[],say,load}){
 const [supplierName,setSupplierName]=useState("");
 const [supplierPhone,setSupplierPhone]=useState("");
 const [saving,setSaving]=useState(false);
 async function addSupplier(){
  const name=supplierName.trim();
  if(!name||saving)return;
  setSaving(true);
  const r=await sb.from("suppliers").insert({owner_id:user.id,name,phone:supplierPhone.trim()||null}).select().single();
  if(r.error){say("Təchizatçı əlavə edilmədi: "+r.error.message);setSaving(false);return}
  setSupplierName("");
  setSupplierPhone("");
  say("Təchizatçı əlavə edildi");
  await load();
  setSaving(false);
 }
 return <section className="panel owner-supplier-panel">
  <div className="finance-list-head"><h3>Təchizatçılar</h3><span>{suppliers.length}</span></div>
  <div className="owner-inline-supplier">
   <input value={supplierName} onChange={e=>setSupplierName(e.target.value)} placeholder="Yeni təchizatçı adı" aria-label="Yeni təchizatçı adı"/>
   <input value={supplierPhone} onChange={e=>setSupplierPhone(e.target.value)} placeholder="Telefon (istəyə bağlı)" aria-label="Təchizatçı telefonu"/>
   <button type="button" className="outline" onClick={addSupplier} disabled={!supplierName.trim()||saving}><Plus size={15}/> {saving?"Əlavə edilir...":"Əlavə et"}</button>
  </div>
 </section>
}
