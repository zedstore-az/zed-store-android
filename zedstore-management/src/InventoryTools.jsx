import React,{useEffect,useRef,useState} from 'react';
import './InventoryTools.css';
import {ScanBarcode,Camera,CameraOff,PackageCheck,RotateCcw,ArrowLeftRight,AlertTriangle,CheckCircle2} from 'lucide-react';

const money=n=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN'}).format(Number(n||0));
const dateValue=d=>{if(!d)return null;if(typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)){const [y,m,day]=d.split('-').map(Number);return new Date(y,m-1,day)}const x=new Date(d);return Number.isNaN(x.getTime())?null:x};
const dateText=d=>{const x=dateValue(d);if(!x)return '—';const day=String(x.getDate()).padStart(2,'0'),month=String(x.getMonth()+1).padStart(2,'0'),year=x.getFullYear();const date=day+'.'+month+'.'+year;return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)?date:date+', '+String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0')};

export function BarcodePanel({products}){
 const [code,setCode]=useState(''),[streaming,setStreaming]=useState(false),[cameraError,setCameraError]=useState(''),[selected,setSelected]=useState(null),[bulk,setBulk]=useState({});
 const video=useRef(null),stream=useRef(null),raf=useRef(0),lastScan=useRef(0),detector=useRef(null);
 const matches=products.filter(p=>code.trim()&&[p.barcode,p.sku].some(v=>String(v||'').toLocaleLowerCase('az').includes(code.trim().toLocaleLowerCase('az'))));
 function setBulkQty(id,value){setBulk(old=>({...old,[id]:value}))}
 const bulkProducts=products.filter(p=>Object.prototype.hasOwnProperty.call(bulk,p.id));
 function printBulk(){
  const rows=bulkProducts.filter(p=>String(p.barcode||'').trim()&&Number(bulk[p.id])>0);
  if(!rows.length){window.alert('Barkodu olan məhsulları seç və etiket sayını daxil et.');return}
  const safe=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  let labels='';
  rows.forEach(p=>{for(let i=0;i<Math.min(100,Math.max(1,Number(bulk[p.id])||1));i++){labels+='<article class="label"><div class="name">'+safe(p.name)+'</div><svg class="barcode"></svg><div class="digits">'+safe(p.barcode)+'</div>'+(p.sku?'<div class="sku">Kod: '+safe(p.sku)+'</div>':'')+'</article>'}});
  const html='<!doctype html><html lang="az"><head><meta charset="utf-8"><title>Barkod etiketləri</title><style>@page{size:58mm 40mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:58mm;background:#fff;color:#000;font-family:Arial,sans-serif}.label{width:58mm;height:40mm;padding:2mm 2.5mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;page-break-after:always;break-after:page}.label:last-child{page-break-after:auto;break-after:auto}.name{font-size:10pt;font-weight:700;line-height:1.1;text-align:center;max-height:8mm;overflow:hidden;width:100%;margin-bottom:1mm}.barcode{width:52mm;height:19mm;max-width:100%}.digits{font-size:9pt;letter-spacing:1.2px;line-height:1.1;margin-top:.3mm}.sku{font-size:7pt;margin-top:1mm}@media screen{body{margin:10px auto}.label{outline:1px dashed #ddd}}@media print{body{margin:0}.label{outline:0}}</style></head><body>'+labels+'<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\\/script><script>function render(){if(!window.JsBarcode){document.body.insertAdjacentHTML("afterbegin","<p>Barkod kitabxanası yüklənmədi. İnterneti yoxla.</p>");return}document.querySelectorAll(".label").forEach(el=>{const svg=el.querySelector("svg"),value=el.querySelector(".digits").textContent;try{JsBarcode(svg,value,{format:"CODE128",displayValue:false,margin:0,width:1.7,height:58})}catch(e){svg.outerHTML="<div>Barkod yaradıla bilmədi</div>"}});setTimeout(()=>window.print(),350)}if(document.readyState==="complete")render();else window.addEventListener("load",render)</script></body></html>';
  const win=window.open('','_blank','width=500,height=700');if(!win){window.alert('Çap pəncərəsi bloklandı. Pop-up icazəsi ver.');return}win.document.open();win.document.write(html);win.document.close();
 }
 const stop=()=>{cancelAnimationFrame(raf.current);if(stream.current)stream.current.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;setStreaming(false)};
 useEffect(()=>()=>stop(),[]);
 async function makeDetector(){
  if(!('BarcodeDetector' in window))return null;
  try{
   const supported=await window.BarcodeDetector.getSupportedFormats();
   const formats=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code','itf'].filter(x=>supported.includes(x));
   return formats.length?new window.BarcodeDetector({formats}):null;
  }catch{return null}
 }
 async function start(){
  setCameraError('');
  if(!navigator.mediaDevices?.getUserMedia){setCameraError('Bu brauzerdə kamera açılmır. Səhifəni HTTPS bağlantısı ilə aç və kamera icazəsini yoxla.');return}
  try{
   detector.current=await makeDetector();
   stream.current=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
   if(!video.current){stop();return}
   video.current.srcObject=stream.current;
   await video.current.play();
   setStreaming(true);
   if(!detector.current){setCameraError('Kamera açıldı, amma bu brauzer canlı barkod oxumağı dəstəkləmir. Fiziki barkod skanerindən istifadə edə və ya kodu əl ilə daxil edə bilərsən.')}
   const scan=async()=>{
    if(!stream.current||!video.current)return;
    const now=Date.now();
    if(detector.current&&now-lastScan.current>500&&video.current.readyState>=2){
     lastScan.current=now;
     try{const found=await detector.current.detect(video.current);if(found?.length){const value=String(found[0].rawValue||'').trim();setCode(value);const product=products.find(p=>[p.barcode,p.sku].some(v=>String(v||'').trim()===value));setSelected(product||null);setCameraError(product?'Məhsul tapıldı.':'Barkod oxundu, amma bu kodla məhsul tapılmadı.');stop();return}}catch{}
    }
    raf.current=requestAnimationFrame(scan);
   };
   raf.current=requestAnimationFrame(scan);
  }catch(e){
   stop();
   setCameraError(e?.name==='NotAllowedError'?'Kamera icazəsi verilməyib. Telefon ayarlarından brauzerə kamera icazəsi ver.':e?.name==='NotFoundError'?'Cihazda kamera tapılmadı.':e?.message||'Kamera açıla bilmədi.');
  }
 }
 function handleScannerKeyDown(e){
  if(e.key!=='Enter')return;
  e.preventDefault();
  const value=code.trim();
  if(!value)return;
  const product=products.find(p=>[p.barcode,p.sku].some(v=>String(v||'').trim()===value));
  setSelected(product||null);
  setCameraError(product?'Skaner barkodu oxudu — məhsul tapıldı.':'Barkod oxundu, amma bu kodla məhsul tapılmadı.');
 }
 return <div className="barcode-page">
  <div className="toolbar"><div><h2>Barkod skaneri</h2><p>Telefon kamerası ilə barkodu oxut və ya fiziki barkod skanerini qoş.</p></div><ScanBarcode size={28}/></div>
  <section className="panel barcode-scanner">
   <div className="barcode-actions">
    <button className="primary" type="button" onClick={streaming?stop:start}>{streaming?<><CameraOff size={17}/> Kameranı bağla</>:<><Camera size={17}/> Kamera ilə oxut</>}</button>
   </div>
   <video ref={video} className="barcode-video" playsInline muted autoPlay hidden={!streaming}/>
   {cameraError&&<div className="barcode-warning"><AlertTriangle size={17}/>{cameraError}</div>}
   <label className="barcode-input-label">Fiziki skaner / Barkod / SKU<input autoComplete="off" value={code} onChange={e=>{setCode(e.target.value);setSelected(null);setCameraError('')}} onKeyDown={handleScannerKeyDown} placeholder="Skaner ilə oxutmaq üçün bura kliklə, sonra barkodu oxut"/></label>
   <div className="barcode-bulk-title"><b>Toplu barkod çapı</b><small>{bulkProducts.length} məhsul seçilib · Hər məhsul üçün istədiyin etiket sayını yaz</small></div>
   <div className="barcode-results">{matches.map(p=><div className="barcode-bulk-row" key={p.id}><label className="barcode-bulk-select"><input type="checkbox" checked={Object.prototype.hasOwnProperty.call(bulk,p.id)} disabled={!String(p.barcode||'').trim()} onChange={e=>setBulk(old=>{const next={...old};if(e.target.checked)next[p.id]=1;else delete next[p.id];return next})}/></label><div className="barcode-result"><span>{p.image_url?<img src={p.image_url} alt=""/>:<ScanBarcode/>}</span><span><b>{p.name}</b><small>{p.barcode||'Barkod yoxdur'} · SKU: {p.sku||'—'}</small></span><strong>Stok: {p.stock_qty}</strong></div>{Object.prototype.hasOwnProperty.call(bulk,p.id)&&<label className="barcode-bulk-qty">Etiket sayı<input type="number" min="1" max="100" step="1" value={bulk[p.id]} onChange={e=>setBulkQty(p.id,e.target.value)}/></label>}</div>)}{code.trim()&&!matches.length&&<p className="empty">Bu barkod və ya SKU ilə məhsul tapılmadı. Məhsul kartına barkod əlavə et.</p>}</div>
   <div className="barcode-bulk-footer"><button type="button" className="outline" onClick={()=>setBulk({})} disabled={!bulkProducts.length}>Seçimi təmizlə</button><button type="button" className="primary" onClick={printBulk} disabled={!bulkProducts.some(p=>String(p.barcode||'').trim()&&Number(bulk[p.id])>0)}><ScanBarcode size={16}/> Seçilmiş barkodları çap et</button></div>
   {selected&&<div className="barcode-selected"><CheckCircle2/><div><b>{selected.name}</b><small>Anbar qalığı: {selected.stock_qty} · Maya: {money(selected.cost_price)}</small></div></div>}
  </section>
  <p className="barcode-note">İstifadə: kameranı aç və barkodu kameraya tərəf tut. Fiziki USB/Bluetooth skanerini qoşduqda yuxarıdakı kod xanasına kliklə və skan et — skaner klaviatura kimi kodu avtomatik daxil edib Enter göndərməlidir.</p>
 </div>
}
export function ReturnsPanel({sb,user,products,orders,say,load}){
 const [history,setHistory]=useState([]),[busy,setBusy]=useState(false),[orderItemId,setOrderItemId]=useState(''),[returnType,setReturnType]=useState('return'),[condition,setCondition]=useState('restock'),[quantity,setQuantity]=useState(1),[reason,setReason]=useState(''),[refund,setRefund]=useState('0'),[replacementId,setReplacementId]=useState(''),[replacementQty,setReplacementQty]=useState(1);
 const deliveredItems=orders.filter(o=>o.delivery_status==='delivered').flatMap(o=>(o.order_items||[]).map(item=>({...item,order:o})));
 const chosen=deliveredItems.find(x=>x.id===orderItemId);
 const replacement=products.find(x=>x.id===replacementId);
 async function refresh(){const r=await sb.from('returns').select('*,products(name,sku),orders(order_number,customer_name)').order('created_at',{ascending:false}).limit(100);if(r.error)say('Qaytarılma tarixçəsi yüklənmədi: '+r.error.message);else setHistory(r.data||[])}
 useEffect(()=>{refresh()},[]);
 useEffect(()=>{if(chosen){setQuantity(1);setRefund(String((Number(chosen.birmarket_price||0)*Number(quantity||1)).toFixed(2))) }},[orderItemId]);
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
   <div className="fields"><label>Qaytarılan miqdar<input type="number" min="1" max={chosen?.quantity||1} step="1" value={quantity} onChange={e=>{setQuantity(e.target.value);setRefund((Number(chosen?.birmarket_price||0)*Number(e.target.value||0)).toFixed(2))}} disabled={!chosen}/></label><label>Əməliyyat növü<select value={returnType} onChange={e=>setReturnType(e.target.value)}><option value="return">Qaytarılma</option><option value="exchange">Dəyişdirilmə</option></select></label><label>Məhsulun vəziyyəti<select value={condition} onChange={e=>setCondition(e.target.value)}><option value="restock">Yenidən satışa yararlıdır — stoka qaytar</option><option value="damaged">Zədəlidir — stoka əlavə etmə</option></select></label>{returnType==='return'&&<label>Geri qaytarılan məbləğ (₼)<input type="number" min="0" step="0.01" value={refund} onChange={e=>setRefund(e.target.value)}/></label>}</div>
   {returnType==='exchange'&&<div className="fields"><label>Əvəz məhsul<select required value={replacementId} onChange={e=>setReplacementId(e.target.value)}><option value="">Məhsul seç...</option>{products.filter(p=>Number(p.stock_qty)>0).map(p=><option key={p.id} value={p.id}>{p.name} · stok {p.stock_qty}</option>)}</select></label><label>Veriləcək miqdar<input type="number" min="1" step="1" max={replacement?.stock_qty||1} value={replacementQty} onChange={e=>setReplacementQty(e.target.value)}/></label></div>}
   <label>Səbəb<textarea required rows="3" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Məs: Məhsul uyğun gəlmədi..."/></label>
   <div className="return-stock-note"><PackageCheck size={17}/><span>Stok hərəkətləri bazada avtomatik və birlikdə icra olunur. Dəyişdirilmədə əvəz məhsulun stokdan çıxılması da yoxlanılır.</span></div>
   <button className="primary" disabled={busy||!chosen}>{busy?'Emal olunur...':'Qaytarılmanı qeydə al'}</button>
  </form></section>
  <section className="panel"><div className="return-history-head"><h3>Son qaytarılmalar</h3><button type="button" className="outline" onClick={refresh}>Yenilə</button></div><div className="tablewrap"><table><thead><tr><th>Tarix</th><th>Müştəri / sifariş</th><th>Məhsul</th><th>Əməliyyat</th><th>Miqdar</th><th>Vəziyyət</th><th>Məbləğ</th></tr></thead><tbody>{history.map(r=><tr key={r.id}><td>{dateText(r.created_at)}</td><td>{r.orders?.customer_name||'—'}<small>#{r.orders?.order_number||r.order_id?.slice(0,8)||'—'}</small></td><td>{r.products?.name||'—'}</td><td>{r.return_type==='exchange'?'Dəyişdirilmə':'Qaytarılma'}</td><td>{r.quantity}</td><td>{r.item_condition==='restock'?'Stoka qaytarıldı':'Zədəlidir'}</td><td>{money(r.refund_amount)}</td></tr>)}</tbody></table>{!history.length&&<p className="empty">Hələ qaytarılma qeydi yoxdur.</p>}</div></section>
 </div>
}

export function BarcodePrintButton({product,compact=false}){
 const [count,setCount]=useState(1);
 function printLabels(){
  const code=String(product?.barcode||'').trim();
  if(!code){window.alert('Bu məhsul üçün barkod qeyd edilməyib. Əvvəlcə məhsulu redaktə edib barkod əlavə et.');return}
  const safe=value=>String(value??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const copies=Math.max(1,Math.min(100,Number(count)||1));
  const labels=Array.from({length:copies},()=>`<article class="label"><div class="name">${safe(product.name)}</div><svg class="barcode"></svg><div class="digits">${safe(code)}</div>${product.sku?`<div class="sku">Kod: ${safe(product.sku)}</div>`:''}</article>`).join('');
  const html=`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>Barkod etiketi</title><style>
   @page{size:58mm 40mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:58mm;background:#fff;color:#000;font-family:Arial,sans-serif}
   .label{width:58mm;height:40mm;padding:2mm 2.5mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;page-break-after:always;break-after:page}
   .label:last-child{page-break-after:auto;break-after:auto}.name{font-size:10pt;font-weight:700;line-height:1.1;text-align:center;max-height:8mm;overflow:hidden;width:100%;margin-bottom:1mm}
   .barcode{width:52mm;height:19mm;max-width:100%}.digits{font-size:9pt;letter-spacing:1.2px;line-height:1.1;margin-top:.3mm}.sku{font-size:7pt;margin-top:1mm}
   @media screen{body{margin:10px auto}.label{outline:1px dashed #ddd}}
   @media print{body{margin:0}.label{outline:0}}
  </style></head><body>${labels}<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script><script>
   function render(){if(!window.JsBarcode){document.body.insertAdjacentHTML('afterbegin','<p style="padding:8px;font:12px Arial">Barkod kitabxanası yüklənmədi. İnternet bağlantısını yoxlayıb yenidən çap et.</p>');return}
    document.querySelectorAll('.label').forEach(el=>{const svg=el.querySelector('svg');const value=el.querySelector('.digits').textContent;try{JsBarcode(svg,value,{format:'CODE128',displayValue:false,margin:0,width:1.7,height:58});}catch(e){svg.outerHTML='<div style="font:8px Arial">Barkod yaradıla bilmədi</div>'}});
    setTimeout(()=>window.print(),300);
   }if(document.readyState==='complete')render();else window.addEventListener('load',render);
  </script></body></html>`;
  const win=window.open('','_blank','width=500,height=700');
  if(!win){window.alert('Çap pəncərəsi bloklandı. Brauzerdə pop-up icazəsi ver.');return}
  win.document.open();win.document.write(html);win.document.close();
 }
 return <div className="barcode-print-control">
  <input aria-label="Çap ediləcək etiket sayı" type="number" min="1" max="100" value={count} onChange={e=>setCount(e.target.value)} />
  <button type="button" className={compact?'outline':'outline'} onClick={printLabels}><ScanBarcode size={15}/> Barkod çap et</button>
 </div>
}
