import React,{useMemo,useState} from 'react';
import { MessageSquareText, RefreshCw, Clock3, Smartphone, ShieldCheck, Radio, Hash, Check, Archive, Inbox, RotateCcw, AlertCircle, Volume2, VolumeX, Play } from 'lucide-react';

const dateParts = value => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const dateText = new Intl.DateTimeFormat('az-AZ',{timeZone:'Asia/Baku',day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
  const timeText = new Intl.DateTimeFormat('az-AZ',{timeZone:'Asia/Baku',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date);
  return {date:dateText,time:timeText,full:dateText+' · '+timeText,epoch:date.getTime()};
};
function playPremiumSmsChime(ctx){
  const now=ctx.currentTime;
  const notes=[659.25,830.61,987.77];
  notes.forEach((frequency,index)=>{
    const start=now+index*0.14;
    const master=ctx.createGain();
    master.gain.setValueAtTime(0.0001,start);
    master.gain.exponentialRampToValueAtTime(0.075,start+0.025);
    master.gain.exponentialRampToValueAtTime(0.0001,start+0.62);
    master.connect(ctx.destination);
    [[frequency,'sine',1],[frequency*2,'sine',0.16],[frequency*0.5,'triangle',0.08]].forEach(([hz,type,level])=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type=type;osc.frequency.setValueAtTime(hz,start);
      gain.gain.value=level;
      osc.connect(gain);gain.connect(master);
      osc.start(start);osc.stop(start+0.64);
    });
  });
}
const ago = value => {
  const p=dateParts(value); if(!p)return 'Vaxt qeydə alınmayıb';
  const sec=Math.max(0,Math.floor((Date.now()-p.epoch)/1000));
  if(sec<60)return 'İndicə';
  if(sec<3600)return Math.floor(sec/60)+' dəq. əvvəl';
  if(sec<86400)return Math.floor(sec/3600)+' saat əvvəl';
  return Math.floor(sec/86400)+' gün əvvəl';
};

export default function BirmarketInbox({rows=[],onRefresh,busy=false,client}) {
  const [view,setView]=useState('new'),[saving,setSaving]=useState(''),[error,setError]=useState(''),[soundOn,setSoundOn]=useState(()=>localStorage.getItem('zed_birmarket_sms_sound')!=='off');
  const unread=useMemo(()=>rows.filter(x=>!x.is_read),[rows]);
  const read=useMemo(()=>rows.filter(x=>!!x.is_read),[rows]);
  const latest=rows.reduce((best,row)=>{const p=dateParts(row.received_at);return p&&(!best||p.epoch>best.epoch)?p:best},null);
  const visible=view==='new'?unread:read;
  function toggleSound(){const next=!soundOn;setSoundOn(next);localStorage.setItem('zed_birmarket_sms_sound',next?'on':'off')}
  function previewSound(){
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx){setError('Bu brauzer səs önizləməsini dəstəkləmir.');return}
      const ctx=new AudioCtx();
      const play=()=>playPremiumSmsChime(ctx);
      if(ctx.state==='suspended')ctx.resume().then(play).catch(()=>setError('Səs səsləndirilə bilmədi.'));
      else play();
      window.setTimeout(()=>ctx.close().catch(()=>{}),1800);
    }catch(err){setError('Səs səsləndirilə bilmədi. Brauzerin səs icazəsini yoxla.')}
  }
  async function setRead(row,next){
    if(!client||saving)return;
    setSaving(row.id);setError('');
    const patch={is_read:next,read_at:next?new Date().toISOString():null};
    const result=await client.from('birmarket_sms_events').update(patch).eq('id',row.id).select('id,is_read,read_at').maybeSingle();
    if(result.error){setError('Status dəyişdirilmədi: '+result.error.message);setSaving('');return}
    if(!result.data){setError('Dəyişiklik təsdiqlənmədi. Admin icazəsini yoxla.');setSaving('');return}
    await onRefresh?.();
    setSaving('');
  }

  return <div className="birmarket-inbox premium-inbox">
    <section className="birmarket-inbox-hero">
      <div className="birmarket-inbox-hero-copy">
        <div className="birmarket-inbox-eyebrow"><Radio size={14}/> CANLI SMS İNTEQRASİYASI <i/></div>
        <h2>Birmarket <span>SMS</span></h2>
        <p>Birmarket-dən gələn sifariş bildirişlərini bir yerdə idarə et.</p>
      </div>
      <div className="birmarket-hero-actions"><button className="birmarket-sound-toggle" type="button" onClick={toggleSound} aria-pressed={soundOn}><span>{soundOn?<Volume2 size={16}/>:<VolumeX size={16}/>}</span>{soundOn?'Səs aktiv':'Səs bağlı'}</button><button className="birmarket-sound-preview" type="button" onClick={previewSound}><Play size={14}/> Səsi yoxla</button><button className="birmarket-refresh" type="button" onClick={onRefresh} disabled={busy}><RefreshCw size={16} className={busy?'birmarket-spin':''}/> Yenilə</button></div>
      <div className="birmarket-hero-glow"/>
    </section>

    <section className="birmarket-inbox-stats">
      <article className="birmarket-stat-card"><span className="birmarket-stat-icon"><Inbox size={19}/></span><div><small>Yeni bildirişlər</small><strong>{unread.length}</strong><span>Diqqət gözləyən SMS-lər</span></div></article>
      <article className="birmarket-stat-card"><span className="birmarket-stat-icon"><Archive size={19}/></span><div><small>Oxunmuş SMS-lər</small><strong>{read.length}</strong><span>Arxivə keçirilən bildirişlər</span></div></article>
      <article className="birmarket-stat-card birmarket-stat-live"><span className="birmarket-stat-icon"><Smartphone size={19}/></span><div><small>Son SMS</small><strong className="birmarket-stat-time">{latest?.time||'—'}</strong><span>{latest?.date||'Hələ SMS daxil olmayıb'} · Bakı vaxtı</span></div></article>
    </section>

    <section className="birmarket-inbox-panel">
      <div className="birmarket-panel-head">
        <div><h3>SMS bildirişləri</h3><p>Yeni SMS-ləri oxunmuş kimi işarələ və arxivdə saxla.</p></div>
        <span className="birmarket-count">{rows.length} ümumi</span>
      </div>
      <div className="birmarket-inbox-tabs" role="tablist" aria-label="SMS filtri">
        <button type="button" className={view==='new'?'active':''} onClick={()=>setView('new')}><Inbox size={15}/> Yeni <b>{unread.length}</b></button>
        <button type="button" className={view==='read'?'active':''} onClick={()=>setView('read')}><Archive size={15}/> Köhnə / oxunmuş <b>{read.length}</b></button>
      </div>
      {error&&<div className="birmarket-inbox-error"><AlertCircle size={15}/>{error}</div>}
      {visible.length? <div className="birmarket-sms-list">{visible.map(row=>{
        const stamp=dateParts(row.received_at),isRead=!!row.is_read,isSaving=saving===row.id;
        return <article className={'birmarket-sms-row '+(isRead?'is-read':'is-new')} key={row.id}>
          <span className="birmarket-sms-symbol">{isRead?<Check size={19}/>:<MessageSquareText size={19}/>}</span>
          <div className="birmarket-sms-main">
            <small>{isRead?'ARXİVLƏNMİŞ BİLDİRİŞ':'YENİ BİRMARKET SİFARİŞİ'}</small>
            <strong><Hash size={14}/>{row.order_id}</strong>
            <span className="birmarket-sms-time"><Clock3 size={13}/>{stamp?stamp.full+' · Bakı vaxtı':'Qəbul vaxtı mövcud deyil'}</span>
            <span className="birmarket-sms-ago">{ago(row.received_at)}</span>
          </div>
          <div className="birmarket-sms-meta">
            <span className={'birmarket-sms-badge '+(isRead?'read':'new')}><span/>{isRead?'Oxunub':'Yeni SMS'}</span>
            <button type="button" className={'birmarket-read-action '+(isRead?'undo':'mark')} disabled={isSaving||!!saving} onClick={()=>setRead(row,!isRead)}>
              {isSaving?<RefreshCw size={14} className="birmarket-spin"/>:isRead?<RotateCcw size={14}/>:<Check size={14}/>}
              {isSaving?'Gözlə...':isRead?'Yeni kimi et':'Oxundu'}
            </button>
          </div>
        </article>
      })}</div>:<div className="birmarket-empty"><span>{view==='new'?<Check size={27}/>:<Archive size={27}/>}</span><strong>{view==='new'?'Yeni SMS yoxdur':'Arxiv hələ boşdur'}</strong><p>{view==='new'?'Bütün bildirişlər oxunub. Yeni sifariş SMS-i gələndə burada görünəcək.':'Oxunmuş kimi işarələdiyin SMS-lər burada saxlanılacaq.'}</p></div>}
    </section>

    <section className="birmarket-inbox-note"><ShieldCheck size={19}/><div><strong>Bildirişlərin idarə olunması</strong><p>Yeni SMS-lər avtomatik “Yeni” siyahısında görünür. “Oxundu” düyməsi ilə arxivə keçir; istənilən vaxt “Yeni kimi et” düyməsi ilə geri qaytara bilərsən. SMS-in qəbul vaxtı Bakı saatı ilə göstərilir.</p></div></section>
  </div>;
}
