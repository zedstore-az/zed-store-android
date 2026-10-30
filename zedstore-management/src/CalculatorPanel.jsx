import React,{useMemo,useState} from 'react';
import BIRM_CATEGORIES from './data/birmarketCategories.json';

const RATE_BY_MONTH={3:1.5,6:4,9:5,12:6,18:8.2,24:10.2};
const fmt=n=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN'}).format(Number(n||0));

export default function CalculatorPanel(){
 const [f,F]=useState({cost:'',price:'',category:'',qty:1,weight:'',length:'',width:'',height:'',payment:'card',months:3});
 const [query,Q]=useState('');
 const set=(key,value)=>F(old=>({...old,[key]:value}));
 const matches=useMemo(()=>BIRM_CATEGORIES.map((x,i)=>({...x,index:i})).filter(x=>!query||(x.name+' '+x.group+' '+x.vertical).toLocaleLowerCase('az').includes(query.toLocaleLowerCase('az'))),[query]);
 const category=f.category===''?null:BIRM_CATEGORIES[Number(f.category)];
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
    <label>Kateqoriyanı axtar
     <input type="search" placeholder="Məsələn: qulaqlıq, ütü, telefon..." value={query} onChange={e=>Q(e.target.value)}/>
    </label>
    <label>Kateqoriya — komissiya faizi
     <select value={f.category} onChange={e=>set('category',e.target.value)}>
      <option value="">Kateqoriya seçin...</option>
      {matches.map(x=><option key={x.index} value={x.index}>{x.name} — {x.rate}%</option>)}
     </select>
     <small>{query?matches.length+' uyğun kateqoriya':'Tarif bazasında '+BIRM_CATEGORIES.length.toLocaleString('az-AZ')+' kateqoriya var.'}</small>
    </label>
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
   <div className="calcfields">
    <label>Ödəniş növü<select value={f.payment} onChange={e=>set('payment',e.target.value)}>
     <option value="card">Kart — 1.5%</option><option value="credit">Kredit müraciəti — 1.5%</option><option value="installment">Taksit</option>
    </select></label>
    {f.payment==='installment'&&<label>Taksit müddəti<select value={f.months} onChange={e=>set('months',Number(e.target.value))}>
     {[3,6,9,12,18,24].map(n=><option key={n} value={n}>{n} ay — {RATE_BY_MONTH[n]}%</option>)}
    </select></label>}
   </div>
   <button type="button" className="outline calcreset" onClick={()=>{F({cost:'',price:'',category:'',qty:1,weight:'',length:'',width:'',height:'',payment:'card',months:3});Q('')}}>Sıfırla</button>
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
