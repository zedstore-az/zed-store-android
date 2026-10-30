import React, { useMemo, useState } from 'react';
import { Bot, Send, Package, AlertTriangle, ShoppingCart, TrendingUp, MessageSquareText } from 'lucide-react';

const money = value => new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN' }).format(Number(value || 0));
const norm = value => String(value || '').toLocaleLowerCase('az').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const monthKey = value => {
  if (!value) return '';
  const date = new Date(value);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
};

export default function AIManager({ inventory = [], orders = [], sales = [] }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: 'Salam! Mən ZED STORE anbar köməkçisiyəm. Məhsul qalığını, azalan stokları, sifarişləri və satış hesabatlarını yoxlaya bilərəm. Sualını yaz və ya qısa əmrlərdən istifadə et.'
  }]);
  const products = useMemo(() => inventory.filter(item => item.is_active !== false), [inventory]);
  const shortcuts = ['Azalan stokları göstər', 'Anbarımın ümumi xülasəsini göstər', 'Bu ay satış və mənfəət nə qədərdir?', 'Ən çox satılan 5 məhsulu göstər', 'Sifarişlərin vəziyyətini göstər'];

  function answer(raw) {
    const q = norm(raw);
    const matched = products.find(item => {
      const name = norm(item.name);
      return name.length > 2 && q.includes(name);
    });

    if (q.includes('azalan') || q.includes('az qalan') || q.includes('az stok') || q.includes('stokda olmayan')) {
      const low = products.filter(item => Number(item.stock_qty || 0) <= Number(item.low_stock_threshold || 0));
      if (!low.length) return 'Hazırda az stok həddinə düşən aktiv məhsul yoxdur.';
      return 'Azalan və ya bitmiş stok məhsulları (' + low.length + '):\n' +
        low.slice(0, 30).map((item, index) => (index + 1) + '. ' + item.name + ' — ' + Number(item.stock_qty || 0) + ' ədəd qalıb (hədd: ' + Number(item.low_stock_threshold || 0) + ')').join('\n') +
        (low.length > 30 ? '\n... və daha ' + (low.length - 30) + ' məhsul.' : '');
    }

    if (matched) {
      return matched.name + '\nAnbar qalığı: ' + Number(matched.stock_qty || 0) + ' ədəd\nAz stok həddi: ' + Number(matched.low_stock_threshold || 0) +
        '\nMaya qiyməti: ' + money(matched.cost_price) + '\nSatış qiyməti: ' + money(matched.sale_price) +
        (matched.sku ? '\nSKU: ' + matched.sku : '') + (matched.category ? '\nKateqoriya: ' + matched.category : '');
    }

    if (q.includes('ən çox sat') || q.includes('cox sat') || q.includes('top məhsul') || q.includes('top mehsul')) {
      const totals = new Map();
      sales.forEach(item => {
        const key = item.product_name || 'Adsız məhsul';
        totals.set(key, (totals.get(key) || 0) + Number(item.quantity || 0));
      });
      const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      return top.length ? 'Ən çox satılan məhsullar:\n' + top.map((item, index) => (index + 1) + '. ' + item[0] + ' — ' + item[1] + ' ədəd').join('\n') : 'Hələ satış qeydi yoxdur.';
    }

    if (q.includes('bu ay') || q.includes('satış') || q.includes('satis') || q.includes('mənfəət') || q.includes('menfeet') || q.includes('dövriyyə') || q.includes('dovriyye')) {
      const currentMonth = monthKey(new Date());
      const rows = sales.filter(item => item.paid_at && monthKey(item.paid_at) === currentMonth);
      const units = rows.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const turnover = rows.reduce((sum, item) => sum + Number(item.transferred_amount || 0) * Number(item.quantity || 0), 0);
      const profit = rows.reduce((sum, item) => sum + Number(item.net_profit || 0), 0);
      return 'Bu ayın ödənişi təsdiqlənmiş satışları:\nSatış qeydi: ' + rows.length +
        '\nSatılan məhsul sayı: ' + units + ' ədəd\nKöçən məbləğ: ' + money(turnover) +
        '\nXalis mənfəət: ' + money(profit);
    }

    if (q.includes('sifariş') || q.includes('sifaris')) {
      const labels = { new: 'Yeni', ready: 'Təhvilə hazır', courier: 'Kuryerdə', pickup_point: 'Paylama məntəqəsində', delivered: 'Təhvil verilib', cancelled: 'Ləğv edilib' };
      const counts = {};
      orders.forEach(item => { const key = item.delivery_status || 'naməlum'; counts[key] = (counts[key] || 0) + 1; });
      const pending = orders.filter(item => !['delivered', 'cancelled'].includes(item.delivery_status)).length;
      return 'Sifarişlərin ümumi sayı: ' + orders.length + '\nProsesdə olan sifarişlər: ' + pending + '\n' +
        (Object.entries(counts).map(([key, count]) => (labels[key] || key) + ': ' + count).join('\n') || 'Sifariş yoxdur.');
    }

    if (q.includes('anbar') || q.includes('stok') || q.includes('qalıq') || q.includes('qaliq') || q.includes('xülasə') || q.includes('xulase')) {
      const units = products.reduce((sum, item) => sum + Number(item.stock_qty || 0), 0);
      const empty = products.filter(item => Number(item.stock_qty || 0) <= 0).length;
      const low = products.filter(item => Number(item.stock_qty || 0) <= Number(item.low_stock_threshold || 0)).length;
      const costValue = products.reduce((sum, item) => sum + Number(item.stock_qty || 0) * Number(item.cost_price || 0), 0);
      const saleValue = products.reduce((sum, item) => sum + Number(item.stock_qty || 0) * Number(item.sale_price || 0), 0);
      return 'ZED STORE anbar xülasəsi:\nAktiv məhsul sayı: ' + products.length +
        '\nÜmumi stok: ' + units + ' ədəd\nAzalan stok: ' + low +
        '\nStokda olmayan məhsul: ' + empty +
        '\nAnbarın maya dəyəri: ' + money(costValue) +
        '\nSatış qiyməti ilə ümumi dəyər: ' + money(saleValue);
    }

    if (q.includes('kömək') || q.includes('komək') || q.includes('nə edə') || q.includes('ne ede')) {
      return 'Bunları yoxlaya bilərəm:\n• Azalan stokları göstər\n• Anbarımın ümumi xülasəsini göstər\n• Məhsulun adını yazıb qalığını öyrən\n• Bu ay satış və mənfəəti göstər\n• Ən çox satılan məhsulları göstər\n• Sifarişlərin vəziyyətini göstər';
    }

    return 'Bu sualı hələ avtomatik tanıya bilmədim. “Azalan stoklar”, “anbar xülasəsi”, “bu ayın mənfəəti”, “ən çox satılan məhsullar” və ya məhsulun adını yaz.';
  }

  function send(event) {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    setMessages(previous => [...previous, { role: 'user', text: value }, { role: 'assistant', text: answer(value) }]);
    setInput('');
  }

  return <section className="ai-manager">
    <div className="ai-head">
      <span className="ai-avatar"><Bot /></span>
      <div><h2>AI Manager</h2><p>ZED STORE · lokal anbar köməkçisi</p></div>
      <span className="ai-status">Ödənişsiz rejim</span>
    </div>
    <div className="ai-shortcuts">
      <button type="button" onClick={() => setInput(shortcuts[0])}><AlertTriangle /> Azalan stoklar</button>
      <button type="button" onClick={() => setInput(shortcuts[1])}><Package /> Anbar xülasəsi</button>
      <button type="button" onClick={() => setInput(shortcuts[2])}><TrendingUp /> Bu ayın mənfəəti</button>
      <button type="button" onClick={() => setInput(shortcuts[3])}><TrendingUp /> Ən çox satılanlar</button>
      <button type="button" onClick={() => setInput(shortcuts[4])}><ShoppingCart /> Sifarişlər</button>
    </div>
    <div className="ai-messages" aria-live="polite">
      {messages.map((message, index) => <div className={'ai-message ' + message.role} key={index}>
        <span>{message.role === 'assistant' ? <Bot /> : <MessageSquareText />}</span>
        <p>{message.text}</p>
      </div>)}
    </div>
    <form className="ai-compose" onSubmit={send}>
      <input value={input} onChange={event => setInput(event.target.value)} placeholder="Məhsul adı, stok, satış və ya sifariş yaz..." aria-label="AI Manager mesajı" />
      <button className="primary" type="submit" disabled={!input.trim()}><Send size={17} /> Göndər</button>
    </form>
    <p className="ai-disclaimer">Bu rejim ayrıca AI API açarı və ödəniş tələb etmir. Məlumatlar yalnız bu proqramda yoxlanılır; müştəri şəxsi məlumatları istifadə edilmir. Hazırkı versiya stok və sifarişləri dəyişmir.</p>
  </section>;
}
