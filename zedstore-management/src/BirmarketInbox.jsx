import React from 'react';
import { MessageSquareText, RefreshCw } from 'lucide-react';

const dt = value => value ? new Date(value).toLocaleString('az-AZ') : '—';
const labels = {
  new_order: 'Yeni sifariş',
  cancelled: 'Ləğv edilib',
  delivered: 'Təhvil edilib',
  status_update: 'Status yenilənib',
  legacy: 'Əvvəlki qeyd',
};
const badgeClass = type => type === 'new_order' ? 'green' : type === 'cancelled' ? 'red' : type === 'delivered' ? 'blue' : 'yellow';

export default function BirmarketInbox({ rows = [], onRefresh, busy = false }) {
  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Birmarket sifariş bildirişləri</h2>
          <p>Birmarket-dən gələn Azərbaycan və rus dilində sifariş bildirişlərinin tarixçəsi.</p>
        </div>
        <button className="outline" type="button" onClick={onRefresh} disabled={busy}>
          <RefreshCw size={16} /> Yenilə
        </button>
      </div>
      <section className="panel">
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e8eaf0' }}>
          <b>{rows.length} bildiriş qeydi</b>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Eyni sifarişin fərqli status bildirişləri ayrıca tarixçə qeydi kimi saxlanılır.
          </p>
        </div>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Bildiriş mətni</th><th>Sifariş kodu</th><th>Bildiriş növü</th><th>Qəbul vaxtı</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}>
              <td style={{ minWidth: 260, whiteSpace: 'normal' }}>{row.message_text || 'Əvvəlki SMS qeydi'}</td>
              <td><b>{row.order_id}</b></td>
              <td><span className={`badge ${badgeClass(row.event_type)}`}>{labels[row.event_type] || 'Sifariş bildirişi'}</span></td>
              <td>{dt(row.received_at)}</td>
            </tr>)}</tbody>
          </table>
          {!rows.length && <div className="empty">
            <MessageSquareText size={28} /><p>Hələ Birmarket sifariş bildirişi qeydə alınmayıb.</p>
            <small>Telefon bildirişləri yönləndirildikdən sonra burada görünəcək.</small>
          </div>}
        </div>
      </section>
      <section className="panel" style={{ marginTop: 16, padding: 18 }}>
        <b>Vacib məlumat</b>
        <p className="muted" style={{ marginBottom: 0 }}>
          Bu tarixçə Birmarket hesabından məhsul və sifariş detalları oxumur, anbar qalığını dəyişmir və sifarişi avtomatik yaratmır.
          Yalnız telefon bildirişində olan sifariş mətnini və kodunu qeydə alır.
        </p>
      </section>
    </>
  );
}
