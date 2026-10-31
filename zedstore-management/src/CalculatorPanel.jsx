import React,{useMemo,useState} from 'react';
import BIRM_CATEGORIES from './data/birmarketCategories.json';

const RATE_BY_MONTH={3:1.5,6:4,9:5,12:6,18:8.2,24:10.2};
const fmt=n=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN'}).format(Number(n||0));
const normalize=s=>String(s||'').toLocaleLowerCase('az').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();

export default function CalculatorPanel(){
 const [f,F]=useState({cost:'',price:'',category:'',qty:1,weight:'',length:'',width:'',height:'',payment:'card',months:3});
 const [query,Q]=useState('');
 const [open,Open]=useState(false);
 const [active,A]=useState(0);
 const set=(key,value)=>F(old=>({...old,[key]:value}));
 const matches=useMemo(()=>{
  const q=normalize(query);
  if(!q)return [];
  const words=q.split(/\s+/).filter(Boolean);
  return BIRM_CATEGORIES.map((x,i)=>{
   const name=normalize(x.name),group=normalize(x.group),vertical=normalize(x.vertical);
   const hay=name+' '+group+' '+vertical;
   if(!words.every(w=>hay.includes(w)))return null;
   const score=(name.startsWith(q)?100:name.includes(q)?60:0)+(group.startsWith(q)?20:0)+(vertical.startsWith(q)?10:0);
   return {...x,index:i,score};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'az')).slice(0,9);
 },[query]);
 const category=f.category===''?null:BIRM_CATEGORIES[Number(f.category)];
 const choose=x=>{set('category',String(x.index));Q('');Open(false);A(0)};
 const qty=Math.max(1,Math.floor(Number(f.qty)||1));
 const total=Math.max(0,Number(f.price)||0)*qty;
 const cost=Math.max(0,Number(f.cost)||0)*qty;
 const weight=Math.max(0,Number(f.weight)||0);
 const dims=[f.length,f.width,f.height].map(v=>v===''?null:Number(v));
 const hasDims=dims.every(v=>v!==null&&v>0);
 const volume=hasDims?dims[0]*dims[1]*dims[2]/1000000:null;
 const side=hasDims?Math.max(...dims)/100:null;
 let cls=0;
 if(weight>60||(volume!==null&&volume>0.46))cls=3;
 else if(weight>30||(volume!==null&&volume>0.12)||(side!==null&&side>1.2))cls=2;
 else if(weight>1||(volume!==null&&volume>0.0038)||(side!==null&&side>0.35))cls=1;
 const parcelNames=['Paket','Standart','KQT','KQT+'];
 const logistics=total<10?0:([[1,2],[2,5],[7,11],[12,15]][cls][total>=50?1:0]);
 const bankRate=f.payment==='installment'?(RATE_BY_MONTH[Number(f.months)]||1.5):1.5;
 const commissionRate=category?Number(category.rate):0;
 const commission=total*commissionRate/100;
 const bank=total*bankRate/100;
 const payout=total-commission-bank-logistics;
 const profit=payout-cost;
 return <div className="calcgrid">
  <section className="panel">
   <h3>1. Məhsul və Birmarket tarifi</h3>
   <div className="calcfields">
    <div className="category-picker">
     <label htmlFor="category-search">Kateqoriyanı axtar</label>
     <div className="category-searchbox">
      <input id="category-search" type="search" autoComplete="off" placeholder="Məsələn: qulaq..., ütü, telefon..." value={query} aria-expanded={open&&matches.length>0} aria-controls="category-suggestions" onFocus={()=>Open(true)} onChange={e=>{Q(e.target.value);Open(true);A(0)}} onKeyDown={e=>{
       if(e.key==='ArrowDown'&&matches.length){e.preventDefault();Open(true);A(v=>Math.min(v+1,matches.length-1))}
       else if(e.key==='ArrowUp'&&matches.length){e.preventDefault();A(v=>Math.max(v-1,0))}
       else if(e.key==='Enter'&&open&&matches[active]){e.preventDefault();choose(matches[active])}
       else if(e.key==='Escape')Open(false);
      }}/>
      {query&&<button type="button" className="category-clear" aria-label="Axtarışı təmizlə" onClick={()=>{Q('');Open(true)}}>×</button>}
     </div>
     {open&&query&&<div className="category-suggestions" id="category-suggestions" role="listbox">
      {matches.length?matches.map((x,i)=><button type="button" role="option" aria-selected={active===i} className={'category-option '+(active===i?'active':'')} key={x.index} onMouseEnter={()=>A(i)} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(x)}>
       <span><b>{x.name}</b><small>{x.group||x.vertical||'Birmarket kateqoriyası'}</small></span><strong>{x.rate}%</strong>
      </button>):<div className="category-noresults">Uyğun kateqoriya tapılmadı. Axtarış sözünü qısaldın.</div>}
     </div>}
     {category?<div className="selected-category"><span><small>SEÇİLMİŞ KATEQORİYA</small><b>{category.name}</b><em>{category.rate}% komissiya</em></span><button type="button" onClick={()=>{set('category','');Q('');Open(true)}} aria-label="Kateqoriyanı sil">×</button></div>:<small className="category-hint">Axtarış zamanı uyğun adlar dərhal burada görünəcək. {BIRM_CATEGORIES.length.toLocaleString('az-AZ')} tarif mövcuddur.</small>}
    </div>
    <label>Maya qiyməti (1 ədəd, ₼)<input type="number" min="0" step="0.01" value={f.cost} onChange={e=>set('cost',e.target.value)}/></label>
    <label>Birmarket satış qiyməti (1 ədəd, ₼)<input type="number" min="0" step="0.01" value={f.price} onChange={e=>set('price',e.target.value)}/></label>
    <label>Sifarişdə say<input type="number" min="1" step="1" value={f.qty} onChange={e=>set('qty',e.target.value)}/></label>
   </div>
   <h3 className="subhead">2. Logistika — bağlamanın çəkisi və ölçüləri</h3>
   <p className="muted">Çəki kq, ölçülər sm ilə daxil edilir. Paket sinfi və logistika haqqı avtomatik hesablanır.</p>
   <div className="calcfields">
    <label>Bağlamanın çəkisi (kq)<input type="number" min="0" step="0.01" value={f.weight} onChange={e=>set('weight',e.target.value)}/></label>
    <label>Uzunluq (sm)<input type="number" min="0" step="0.1" value={f.length} onChange={e=>set('length',e.target.value)}/></label>
    <label>En (sm)<input type="number" min="0" step="0.1" value={f.width} onChange={e=>set('width',e.target.value)}/></label>
    <label>Hündürlük (sm)<input type="number" min="0" step="0.1" value={f.height} onChange={e=>set('height',e.target.value)}/></label>
   </div>
   <h3 className="subhead">3. Bank və ödəniş komissiyası</h3>
   <div className="payment-selector">
    <label>Ödəniş növü</label>
    <div className="choice-buttons" role="group" aria-label="Ödəniş növü">
     {[['card','Kart'],['credit','Kredit'],['installment','Taksit']].map(([value,label])=><button type="button" key={value} className={f.payment===value?'choice active':'choice'} aria-pressed={f.payment===value} onClick={()=>set('payment',value)}>{label}</button>)}
    </div>
    {f.payment==='installment'&&<div className="installment-picker"><label>Taksit müddətini seç</label><div className="choice-buttons months">{[3,6,9,12,18,24].map(n=><button type="button" key={n} className={Number(f.months)===n?'choice active':'choice'} aria-pressed={Number(f.months)===n} onClick={()=>set('months',n)}><b>{n} ay</b><small>{RATE_BY_MONTH[n]}%</small></button>)}</div></div>}
   </div>
   <button type="button" className="outline calcreset" onClick={()=>{F({cost:'',price:'',category:'',qty:1,weight:'',length:'',width:'',height:'',payment:'card',months:3});Q('');Open(false)}}>Sıfırla</button>
  </section>
  <section className="calcresult">
   <small>HESABLAMA NƏTİCƏSİ</small><span>Hesaba köçəcək məbləğ</span><strong>{fmt(payout)}</strong>
   <div><span>Sifariş cəmi</span><b>{fmt(total)}</b></div>
   <div><span>Kateqoriya komissiyası ({category?commissionRate+'%':'—'})</span><b>{fmt(commission)}</b></div>
   <div><span>Bank komissiyası ({bankRate}%)</span><b>{fmt(bank)}</b></div>
   <div><span>Logistika — {parcelNames[cls]}</span><b>{fmt(logistics)}</b></div>
   <div><span>Maya dəyəri</span><b>{fmt(cost)}</b></div>
   <hr/><span>Xalis mənfəət</span><strong className={profit>=0?'good':'bad'}>{fmt(profit)}</strong>
   <small>{category?'Seçilmiş kateqoriya: '+category.name:'Komissiyanı hesablamaq üçün kateqoriya seç.'}<br/>Logistika: 10 ₼-dan aşağı sifariş 0 ₼; 10–49.99 ₼ və 50 ₼+ üçün sinfə uyğun tarif tətbiq olunur.</small>
  </section>
 </div>;
}
