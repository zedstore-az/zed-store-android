from pathlib import Path
import re

html_path = Path("project/app/src/main/assets/index.html")
if not html_path.exists():
    raise SystemExit(f"Web asset not found: {html_path}")

html = html_path.read_text(encoding="utf-8")
if "zed-ambar-products" in html:
    print("Ambar products view already injected; skipping")
    raise SystemExit(0)

injection = r"""
<style id="zed-ambar-products-style">
#zed-ambar-products{display:none;position:fixed;inset:0;z-index:99999;background:#081426;color:#eef4ff;font-family:Arial,sans-serif;overflow:auto;padding:18px;box-sizing:border-box}
#zed-ambar-products *{box-sizing:border-box}
#zed-ambar-products .zap-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:18px}
#zed-ambar-products .zap-title{font-size:22px;font-weight:800}
#zed-ambar-products .zap-btn{border:0;border-radius:10px;padding:11px 14px;background:#1769e0;color:white;font-weight:700;cursor:pointer}
#zed-ambar-products .zap-muted{color:#a8bad5;font-size:13px;line-height:1.5}
#zed-ambar-products .zap-search{width:100%;padding:13px 14px;border-radius:12px;border:1px solid #2b405f;background:#10213a;color:#fff;font-size:16px;margin:12px 0}
#zed-ambar-products .zap-card{display:flex;gap:12px;align-items:center;background:#10213a;border:1px solid #213958;border-radius:14px;padding:14px;margin:10px 0}
#zed-ambar-products .zap-icon{width:48px;height:48px;flex:0 0 48px;border-radius:12px;background:#1a3152;display:grid;place-items:center;font-size:23px}
#zed-ambar-products .zap-info{min-width:0;flex:1}
#zed-ambar-products .zap-name{font-weight:700;overflow-wrap:anywhere;margin-bottom:5px}
#zed-ambar-products .zap-meta{font-size:12px;color:#a8bad5;line-height:1.6}
#zed-ambar-products .zap-price{font-weight:800;color:#8ebcff;margin-top:5px}
#zed-ambar-products .zap-status{padding:13px;border-radius:12px;background:#10213a;color:#c4d5ed;line-height:1.5}
#zed-ambar-products .zap-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
#zed-ambar-open{position:fixed;right:14px;bottom:84px;z-index:9998;border:0;border-radius:999px;padding:12px 16px;background:#1769e0;color:#fff;font-weight:800;box-shadow:0 5px 20px #0005}
@media(min-width:700px){#zed-ambar-products{padding:28px 8vw}}
</style>
<button id="zed-ambar-open" type="button">📦 Ambar · Məhsullarım</button>
<section id="zed-ambar-products" aria-label="Ambar Məhsullarım">
  <div class="zap-head"><div><div class="zap-title">📦 Ambar / Məhsullarım</div><div class="zap-muted">Birmarket mağazanızdakı məhsulların siyahısı</div></div><button id="zed-ambar-close" class="zap-btn" type="button">Bağla ✕</button></div>
  <input id="zed-ambar-search" class="zap-search" type="search" placeholder="Məhsul adı və ya ID ilə axtar..." autocomplete="off">
  <div class="zap-actions"><button id="zed-ambar-refresh" class="zap-btn" type="button">↻ Yenilə</button><button id="zed-ambar-portal" class="zap-btn" type="button">🔐 Birmarket satıcı portalı</button></div>
  <div id="zed-ambar-status" class="zap-status">Sınaq rejimi: açıq məhsul səhifəsindən təsdiqlənmiş məlumat. Bu üsul hələ bütün mağaza məhsullarını avtomatik tapmır.</div>
  <div class="zap-actions"><button id="zed-ambar-open-product" class="zap-btn" type="button">↗ Məhsulu Birmarket-də aç</button></div>
  <div id="zed-ambar-list"></div>
</section>
<script id="zed-ambar-products-script">
(function(){
 const panel=document.getElementById('zed-ambar-products');
 const open=document.getElementById('zed-ambar-open');
 const close=document.getElementById('zed-ambar-close');
 const status=document.getElementById('zed-ambar-status');
 const search=document.getElementById('zed-ambar-search');
 const list=document.getElementById('zed-ambar-list');
 const refresh=document.getElementById('zed-ambar-refresh');
 const portal=document.getElementById('zed-ambar-portal');
 const openProduct=document.getElementById('zed-ambar-open-product');
 const productUrl='https://umico.az/product/3034575';
 let products=[{id:'3034575',sku:'3034575',name:'Ağıllı saat HK11 Ultra 3 Beige',price:'95.00',image:'',url:productUrl}];
 function show(){panel.style.display='block';}
 function hide(){panel.style.display='none';}
 open.addEventListener('click',show); close.addEventListener('click',hide);
 portal.addEventListener('click',()=>{ window.location.href='https://business.umico.az/sign-in'; });
 function render(){
   const q=search.value.trim().toLocaleLowerCase();
   list.replaceChildren();
   const found=products.filter(p=>[p.name,p.id,p.sku].some(v=>String(v||'').toLocaleLowerCase().includes(q)));
   if(!found.length && products.length){
     const empty=document.createElement('div');empty.className='zap-status';empty.textContent='Axtarışa uyğun məhsul tapılmadı.';list.appendChild(empty);return;
   }
   found.forEach(p=>{
     const card=document.createElement('article');card.className='zap-card';
     card.style.cursor='pointer';
     card.addEventListener('click',()=>{if(p.url) window.location.href=p.url;});
     const icon=document.createElement('div');icon.className='zap-icon';
     if(p.image){const img=document.createElement('img');img.src=p.image;img.alt='';img.style.cssText='width:100%;height:100%;object-fit:contain;border-radius:10px';img.onerror=()=>{icon.textContent='📦'};icon.appendChild(img)}else icon.textContent='📦';
     const info=document.createElement('div');info.className='zap-info';
     const name=document.createElement('div');name.className='zap-name';name.textContent=p.name||'Adsız məhsul';
     const meta=document.createElement('div');meta.className='zap-meta';meta.textContent='ID: '+(p.id||'—')+' · SKU: '+(p.sku||'—');
     const price=document.createElement('div');price.className='zap-price';price.textContent=p.price!=null?String(p.price)+' ₼':'Qiymət: —';
     info.append(name,meta,price);card.append(icon,info);list.appendChild(card);
   });
 }
 search.addEventListener('input',render);
 openProduct.addEventListener('click',()=>window.location.href=productUrl);
 refresh.addEventListener('click',()=>{
   render();
   status.textContent='Siyahı yeniləndi. Hazırda yalnız sınaq üçün əlavə edilmiş 3034575 kodlu məhsul göstərilir. Umico-nun açıq səhifəsi bütün mağaza məhsullarının siyahısını təqdim etmədiyindən, tam avtomatik sinxronizasiya bu üsulla hələ təsdiqlənməyib.';
 });
})();
</script>
"""
if re.search(r"</body\s*>", html, flags=re.I):
    html = re.sub(r"</body\s*>", injection + "\n</body>", html, count=1, flags=re.I)
else:
    html += injection

html_path.write_text(html, encoding="utf-8")
print("Injected Ambar / Məhsullarım UI into existing index.html")
