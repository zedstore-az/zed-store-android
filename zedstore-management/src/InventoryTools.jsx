import React,{useEffect,useRef,useState} from 'react';
import {ScanBarcode,Camera,CameraOff,Search,PackageCheck,RotateCcw,ArrowLeftRight,AlertTriangle,CheckCircle2} from 'lucide-react';

const money=n=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN'}).format(Number(n||0));
const dateText=d=>d?new Date(d).toLocaleString('az-AZ'):'—';

export function BarcodePanel({products}){
 const [code,setCode]=useState(''),[streaming,setStreaming]=useState(false),[cameraError,setCameraError]=useState(''),[selected,setSelected]=useState(null);
 const video=useRef(null),stream=useRef(null),raf=useRef(0),lastScan=useRef(0);
 const matches=products.filter(p=>code.trim()&&[p.barcode,p.sku].some(v=>String(v||'').toLocaleLowerCase('az').includes(code.trim().toLocaleLowerCase('az'))));
 const stop=()=>{cancelAnimationFrame(raf.current);if(stream.current)stream.current.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;setStreaming(false)};
 useEffect(()=>()=>stop(),[]);
 async function start(){
  setCameraError('');
  if(!navigator.mediaDevices?.getUserMedia){setCameraError('Bu brauzerdə kamera dəstəyi yoxdur. Barkodu əl ilə daxil edə bilərsən.');return}
  if(!('BarcodeDetector' in window)){setCameraError('Bu brauzer barkodun avtomatik oxunmasını dəstəkləmir. Barkodu əl ilə daxil et.');return}
  try{
   const detector=new window.BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']});
   stream.current=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
   if(!video.current)return;
   video.current.srcObject=stream.current;await video.current.play();setStreaming(true);
   const scan=async()=>{if(!stream.current||!video.current)return;const now=Date.now();if(now-lastScan.current>350&&video.current.readyState>=2){lastScan.current=now;try{const found=await detector.detect(video.current);if(found?.length){setCode(found[0].rawValue||'');stop();return}}catch{}}raf.current=requestAnimationFrame(scan)};
   raf.current=requestAnimationFrame(scan);
  }catch(e){stop();setCameraError(e?.name==='NotAllowedError'?'Kamera icazəsi verilmədi. Brauzer ayarlarından kameraya icazə ver.':e.message||'Kamera açıla bilmədi.')}
 }
 return <div className="barcode-page">
  <div className="toolbar"><div><h2>Barkod skaneri</h2><p>Kameradan barkodu oxut və ya kodu əl ilə daxil edərək məhsulu tap.</p></div><ScanBarcode size={28}/></div>
  <section className="panel barcode-scanner">
   <div className="barcode-actions"><button className="primary" type="button" onClick={streaming?stop:start}>{streaming?<><CameraOff size={17}/> Kameranı bağla</>:<><Camera size={17}/> Kameranı aç</>}</button><span>Telefonun arxa kamerasından istifadə olunur.</span></div>
   {streaming&&<video ref={video} className="barcode-video" playsInline muted/>}
   {cameraError&&<div className="barcode-warning"><AlertTriangle size={17}/>{cameraError}</div>}
   <label className="barcode-input-label">Barkod / SKU<input autoComplete="off" value={code} onChange={e=>{setCode(e.target.value);setSelected(null)}} placeholder="Barkodu skan et və ya daxil et"/></label>
   <div className="barcode-results">{matches.map(p=><button type="button" key={p.id} className={'barcode-result '+(selected?.id===p.id?'active':'')} onClick={()=>setSelected(p)}><span>{p.image_url?<img src={p.image_url} alt=""/>:<ScanBarcode/>}</span><span><b>{p.name}</b><small>{p.barcode||'Barkod yoxdur'} · SKU: {p.sku||'—'}</small></span><strong>{p.stock_qty} ədəd</strong></button>)}{code.trim()&&!matches.length&&<p className="empty">Bu barkod və ya SKU ilə məhsul tapılmadı. Məhsul kartına barkod əlavə et.</p>}</div>
   {selected&&<div className="barcode-selected"><CheckCircle2/><div><b>{selected.name}</b><small>Anbar qalığı: {selected.stock_qty} · Maya: {money(selected.cost_price)}</small></div></div>}
  </section>
  <p className="barcode-note">Qeyd: Kamera skaneri yalnız brauzer kamera icazəsi verdikdə və cihaz brauzeri BarcodeDetector dəstəklədikdə işləyir. Əl ilə axtarış hər zaman mövcuddur.</p>
 </div>
}

export function ReturnsPanel({sb,user,products,orders,say,load}){
 const [history,setHistory]=useState([]),[busy,setBusy]=useState(false),[orderItemId,setOrderItemId]=useState(''),[returnType,setReturnType]=useState('return'),[condition,setCondition]=useState('restock'),[quantity,setQuantity]=useState(1),[reason,setReason]=useState(''),[refund,setRefund]=useState('0'),[replacementId,setReplacementId]=useState(''),[replacementQty,setReplacementQty]=useState(1);
 const deliveredItems=orders.filter(o=>o.delivery_status==='delivered').flatMap(o=>(o.order_items||[]).map(item=>({...item,order:o})));
 const chosen=deliveredItems.find(x=>x.id===orderItemId);
 const replacement=products.find(x=>x.id===replacementId);
 async function refresh(){const r=await sb.from('returns').select('*,products(name,sku),orders(order_number,customer_name)').order('created_at',{ascending:false}).limit(100);if(r.error)say('Qaytarılma tarixçəsi yüklənmədi: '+r.error.message);else setHistory(r.data||[])}
 useEffect(()=>{refresh()},[]);
 useEffect(()=>{if(chosen){setQuantity(1);setRefund(String(Number(chosen.unit_sale_price||0).toFixed(2))) }},[orderItemId]);
 useEffect(()=>{if(returnType==='exchange'&&!replacementId){const candidate=products.find(p=>p.id!==chosen?.product_id&&Number(p.stock_qty)>0);if(candidate)setReplacementId(candidate.id)}},[returnType,products,chosen]);
 async function submit(e){
  e.preventDefault();
  if(!chosen)return say('Qaytarılan sifariş məhsulunu seç.');
  if(!reason.trim())return say('Qaytarılma səbəbini qeyd et.');
  if(Number(quantity)<=0||Number(quantity)>Number(chosen.quantity))return say('Miqdar düzgün deyil.');
  if(returnType==='exchange'&&(!replacement||Number(replacementQty)<=0||Number(replacementQty)>Number(replacement.stock_qty)))return say('Əvəz məhsulun miqdarını və stokunu yoxla.');
  setBusy(true);
  const payload={owner_id:user.id,order_id:chosen.order.id,order_item_id:chosen.id,product_id:chosen.product_id,quantity:Number(quantity),return_type:returnType,item_condition:condition,reason:reason.trim(),refund_amount:returnType==='return'?Math.max(0,Number(refund)||0):0,replacement_product_id:returnType==='exchange'?replacementId:null,replacement_quantity:returnType==='exchange'?Number(replacementQty):0};
  const r=await sb.from('returns').insert(payload).select().single();
  if(r.error){say('Əməliyyat alınmadı: '+r.error.message)}else{say(returnType==='exchange'?'Məhsul dəyişdirildi, stok hərəkəti qeydə alındı.':'Qaytarılma qeydə alındı, stok avtomatik yeniləndi.');setOrderItemId('');setReason('');setRefund('0');setReturnType('return');setReplacementId('');await Promise.all([refresh(),load()])}
  setBusy(false);
 }
 return <div className="returns-page">
  <div className="toolbar"><div><h2>Qaytarılma və dəyişdirilmə</h2><p>Təhvil verilmiş sifarişdə məhsulu geri qəbul et və ya başqa məhsulla dəyiş.</p></div><RotateCcw size={27}/></div>
  <section className="panel return-form-panel"><form className="formmodal return-form" onSubmit={submit}>
   <label>Sifarişdəki məhsul<select required value={orderItemId} onChange={e=>setOrderItemId(e.target.value)}><option value="">Məhsul seç...</option>{deliveredItems.map(item=><option key={item.id} value={item.id}>#{item.order.order_number||item.order.id.slice(0,8)} · {item.order.customer_name} · {item.product_name} × {item.quantity}</option>)}</select></label>
   {chosen&&<div className="return-selected"><b>{chosen.product_name}</b><small>Sifariş miqdarı: {chosen.quantity} · Müştəri: {chosen.order.customer_name}</small></div>}
   <div className="fields"><label>Qaytarılan miqdar<input type="number" min="1" max={chosen?.quantity||1} step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} disabled={!chosen}/></label><label>Əməliyyat növü<select value={returnType} onChange={e=>setReturnType(e.target.value)}><option value="return">Qaytarılma</option><option value="exchange">Dəyişdirilmə</option></select></label><label>Məhsulun vəziyyəti<select value={condition} onChange={e=>setCondition(e.target.value)}><option value="restock">Yenidən satışa yararlıdır — stoka qaytar</option><option value="damaged">Zədəlidir — stoka əlavə etmə</option></select></label>{returnType==='return'&&<label>Geri qaytarılan məbləğ (₼)<input type="number" min="0" step="0.01" value={refund} onChange={e=>setRefund(e.target.value)}/></label>}</div>
   {returnType==='exchange'&&<div className="fields"><label>Əvəz məhsul<select required value={replacementId} onChange={e=>setReplacementId(e.target.value)}><option value="">Məhsul seç...</option>{products.filter(p=>Number(p.stock_qty)>0).map(p=><option key={p.id} value={p.id}>{p.name} · stok {p.stock_qty}</option>)}</select></label><label>Veriləcək miqdar<input type="number" min="1" step="1" max={replacement?.stock_qty||1} value={replacementQty} onChange={e=>setReplacementQty(e.target.value)}/></label></div>}
   <label>Səbəb<textarea required rows="3" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Məs: Məhsul uyğun gəlmədi..."/></label>
   <div className="return-stock-note"><PackageCheck size={17}/><span>Stok hərəkətləri bazada avtomatik və birlikdə icra olunur. Dəyişdirilmədə əvəz məhsulun stokdan çıxılması da yoxlanılır.</span></div>
   <button className="primary" disabled={busy||!chosen}>{busy?'Emal olunur...':'Qaytarılmanı qeydə al'}</button>
  </form></section>
  <section className="panel"><div className="return-history-head"><h3>Son qaytarılmalar</h3><button type="button" className="outline" onClick={refresh}>Yenilə</button></div><div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Müştəri / sifariş</th><th>Məhsul</th><th>Əməliyyat</th><th>Miqdar</th><th>Vəziyyət</th><th>Məbləğ</th></tr></thead><tbody>{history.map(r=><tr key={r.id}><td>{dateText(r.created_at)}</td><td>{r.orders?.customer_name||'—'}<small>#{r.orders?.order_number||r.order_id?.slice(0,8)||'—'}</small></td><td>{r.products?.name||'—'}</td><td>{r.return_type==='exchange'?'Dəyişdirilmə':'Qaytarılma'}</td><td>{r.quantity}</td><td>{r.item_condition==='restock'?'Stoka qaytarıldı':'Zədəlidir'}</td><td>{money(r.refund_amount)}</td></tr>)}</tbody></table>{!history.length&&<p className="empty">Hələ qaytarılma qeydi yoxdur.</p>}</div></section>
 </div>
}
