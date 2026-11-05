import React from 'react';
import { MessageSquareText, RefreshCw } from 'lucide-react';

const dt = value => value ? new Date(value).toLocaleString('az-AZ') : '—';

export default function BirmarketInbox({ rows = [], onRefresh, busy = false }) {
  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Birmarket SMS sifarişləri</h2>
          <p>Telefonuna gələn Birmarket SMS-lərindən alınan sifariş nömrələri.</p>
        </div>
        <button className="outline" type="button" onClick={onRefresh} disabled={busy}>
          <RefreshCw size={16} /> Yenilə
        </button>
      </div>

      <section className="panel">
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border, #e8eaf0)' }}>
          <b>{rows.length} sifariş nömrəsi</b>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Burada yalnız SMS-dən gələn nömrələr görünür. Məhsul, miqdar və Birmarket statusu hələ əldə edilmir.
          </p>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Birmarket sifariş nömrəsi</th>
                <th>SMS-in qəbul vaxtı</th>
                <th>Mərhələ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td><b>{row.order_id}</b></td>
                  <td>{dt(row.received_at)}</td>
                  <td><span className="badge yellow">SMS qəbul edilib</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="empty">
              <MessageSquareText size={28} />
              <p>Hələ Birmarket SMS sifarişi qeydə alınmayıb.</p>
              <small>İlk uyğun SMS gəldikdən sonra sifariş nömrəsi burada görünəcək.</small>
            </div>
          )}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16, padding: 18 }}>
        <b>Vacib məlumat</b>
        <p className="muted" style={{ marginBottom: 0 }}>
          Bu siyahı Birmarket hesabından canlı sifariş detalları oxumur və anbar qalığını dəyişmir.
          Məhsul və status məlumatlarının alınması ayrıca inteqrasiya mərhələsidir.
        </p>
      </section>
    </>
  );
}
