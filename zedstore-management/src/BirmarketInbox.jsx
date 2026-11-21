import React from 'react';
import { MessageSquareText, RefreshCw, Clock3, Smartphone, ShieldCheck, Radio, Hash } from 'lucide-react';

const dateParts = value => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('az-AZ', {
    timeZone: 'Asia/Baku',
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
  const time = new Intl.DateTimeFormat('az-AZ', {
    timeZone: 'Asia/Baku',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  }).format(date);
  return { date: parts, time, full: parts + ' · ' + time, epoch: date.getTime() };
};

const ago = value => {
  const parsed = dateParts(value);
  if (!parsed) return 'Vaxt qeydə alınmayıb';
  const seconds = Math.max(0, Math.floor((Date.now() - parsed.epoch) / 1000));
  if (seconds < 60) return 'İndicə qəbul edilib';
  if (seconds < 3600) return seconds < 120 ? '1 dəqiqə əvvəl' : Math.floor(seconds / 60) + ' dəqiqə əvvəl';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' saat əvvəl';
  return Math.floor(seconds / 86400) + ' gün əvvəl';
};

export default function BirmarketInbox({ rows = [], onRefresh, busy = false }) {
  const latest = rows.reduce((best, row) => {
    const current = dateParts(row.received_at);
    return current && (!best || current.epoch > best.epoch) ? current : best;
  }, null);

  return (
    <div className="birmarket-inbox">
      <section className="birmarket-inbox-hero">
        <div className="birmarket-inbox-hero-copy">
          <div className="birmarket-inbox-eyebrow"><Radio size={14}/> CANLI SMS İNTEQRASİYASI</div>
          <h2>Birmarket SMS</h2>
          <p>Telefonuna gələn yeni Birmarket sifariş bildirişləri burada avtomatik qeydə alınır.</p>
        </div>
        <button className="birmarket-refresh" type="button" onClick={onRefresh} disabled={busy}>
          <RefreshCw size={16} className={busy ? 'birmarket-spin' : ''}/> Yenilə
        </button>
      </section>

      <section className="birmarket-inbox-stats">
        <article className="birmarket-stat-card">
          <span className="birmarket-stat-icon"><MessageSquareText size={19}/></span>
          <div><small>Ümumi SMS sifarişləri</small><strong>{rows.length}</strong><span>Qeydə alınmış sifariş nömrələri</span></div>
        </article>
        <article className="birmarket-stat-card">
          <span className="birmarket-stat-icon"><Clock3 size={19}/></span>
          <div><small>Son SMS-in vaxtı</small><strong className="birmarket-stat-time">{latest?.time || '—'}</strong><span>{latest?.date || 'Hələ SMS daxil olmayıb'}</span></div>
        </article>
        <article className="birmarket-stat-card birmarket-stat-live">
          <span className="birmarket-stat-icon"><Smartphone size={19}/></span>
          <div><small>İnteqrasiya</small><strong>Aktiv</strong><span>Telefon bildirişləri qəbul edilir</span></div>
        </article>
      </section>

      <section className="birmarket-inbox-panel">
        <div className="birmarket-panel-head">
          <div><h3>Qəbul edilmiş sifarişlər</h3><p>SMS-in telefonda qəbul edildiyi vaxt göstərilir.</p></div>
          <span className="birmarket-count">{rows.length} qeyd</span>
        </div>
        {rows.length ? (
          <div className="birmarket-sms-list">
            {rows.map(row => {
              const stamp = dateParts(row.received_at);
              return (
                <article className="birmarket-sms-row" key={row.id}>
                  <span className="birmarket-sms-symbol"><MessageSquareText size={19}/></span>
                  <div className="birmarket-sms-main">
                    <small>BİRMARKET SİFARİŞ NÖMRƏSİ</small>
                    <strong><Hash size={14}/>{row.order_id}</strong>
                    <span className="birmarket-sms-time"><Clock3 size={13}/>{stamp ? stamp.full + ' · Bakı vaxtı' : 'Qəbul vaxtı mövcud deyil'}</span>
                  </div>
                  <div className="birmarket-sms-meta">
                    <span className="birmarket-sms-badge"><span/>SMS qəbul edilib</span>
                    <small>{ago(row.received_at)}</small>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="birmarket-empty">
            <span><MessageSquareText size={27}/></span>
            <strong>Hələ SMS qeydə alınmayıb</strong>
            <p>Yeni Birmarket sifariş SMS-i telefona daxil olduqda sifariş nömrəsi burada görünəcək.</p>
          </div>
        )}
      </section>

      <section className="birmarket-inbox-note">
        <ShieldCheck size={19}/>
        <div><strong>İnteqrasiya məlumatı</strong><p>Bu bölmə SMS-dən sifariş nömrəsini qəbul edir. Məhsul detalları və Birmarket statusu ayrıca məlumat mənbəyindən alınır. Vaxt Bakı saat qurşağında (UTC+4) göstərilir.</p></div>
      </section>
    </div>
  );
}
