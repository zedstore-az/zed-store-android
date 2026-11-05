import React, { useMemo, useState } from 'react';
import { Bot, Send, Package, AlertTriangle, ShoppingCart, TrendingUp, MessageSquareText } from 'lucide-react';

const money = value => new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN' }).format(Number(value || 0));
const norm = value => String(value || '').toLocaleLowerCase('az')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/ı/g, 'i').replace(/ə/g, 'e').replace(/ş/g, 's')
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o')
  .replace(/ü/g, 'u').replace(/\s+/g, ' ').trim();
const monthKey = value => {
  if (!value) return '';
  const date = new Date(value);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
};
const parseQty = value => {
  const match = String(value || '').match(/\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const number = Number(match[0].replace(',', '.'));
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export default function AIManager({ inventory = [], orders = [], sales = [], onStockChange }) {
  const [input, setInput] = useState('');
  const [pendingAddition, setPendingAddition] = useState(null);
  const [working, setWorking] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: 'Salam! Mən ZED STORE anbar köməkçisiyəm. Məhsul qalığını yoxlaya və anbar dəyişikliklərini yerinə yetirə bilərəm. Məsələn: “Lenovo LS105 miqdarını 5 ədəd et”.'
  }]);
  const allProducts = useMemo(() => inventory, [inventory]);
  const products = useMemo(() => inventory.filter(item => item.is_active !== false), [inventory]);
  const shortcuts = ['Azalan stokları göstər', 'Anbarımın ümumi xülasəsini göstər', 'Bu ay satış və mənfəət nə qədərdir?', 'Ən çox satılan 5 məhsulu göstər', 'Sifarişlərin vəziyyətini göstər'];

  function findProduct(q) {
    const matches = allProducts.filter(item => {
      const name = norm(item.name);
      const sku = norm(item.sku);
      return (name.length > 2 && q.includes(name)) || (sku.length > 1 && q.includes(sku));
    }).sort((a, b) => Math.max(norm(b.name).length, norm(b.sku).length) - Math.max(norm(a.name).length, norm(a.sku).length));
    if (!matches.length) return { product: null, ambiguous: false };
    const bestLength = Math.max(norm(matches[0].name).length, norm(matches[0].sku).length);
    const best = matches.filter(item => Math.max(norm(item.name).length, norm(item.sku).length) === bestLength);
    return best.length === 1 ? { product: best[0], ambiguous: false } : { product: null, ambiguous: true };
  }

  function quantityText(q, product) {
    let text = q;
    const name = norm(product.name);
    const sku = norm(product.sku);
    if (name) text = text.replace(name, ' ');
    if (sku) text = text.replace(sku, ' ');
    return text;
  }

  function requestedQuantity(q, product) {
    const text = quantityText(q, product);
    const setMatch = text.match(/(?:miqdar(?:ini|i)?|stok(?:unu|u)?|qaligini|sayini)\s*(?:ne? qeder|=|:)?\s*(\d+(?:[.,]\d+)?)/);
    if (setMatch) return Number(setMatch[1].replace(',', '.'));
    const afterUnit = text.match(/(\d+(?:[.,]\d+)?)\s*(?:eded|ed)\s*(?:et|olsun|qoy)/);
    if (afterUnit) return Number(afterUnit[1].replace(',', '.'));
    const allNumbers = text.match(/\d+(?:[.,]\d+)?/g);
    if (allNumbers?.length) return Number(allNumbers[allNumbers.length - 1].replace(',', '.'));
    return null;
  }

  async function changeStock(product, newQty, note, successLead) {
    if (!onStockChange) return 'Anbar dəyişiklik funksiyası qoşulmayıb. Səhifəni yenilə və yenidən yoxla.';
    if (!Number.isFinite(newQty) || newQty < 0) return 'Miqdar düzgün deyil. Sıfır və ya daha böyük rəqəm yaz.';
    setWorking(true);
    try {
      const result = await onStockChange(product.id, newQty, note);
      const oldQty = Number(result?.old_stock_qty ?? product.stock_qty ?? 0);
      const savedQty = Number(result?.new_stock_qty ?? newQty);
      const delta = savedQty - oldQty;
      return successLead + '\n' + product.name + '\nƏvvəlki qalıq: ' + oldQty +
        ' ədəd\nDəyişiklik: ' + (delta > 0 ? '+' : '') + delta +
        ' ədəd\nYeni anbar qalığı: ' + savedQty + ' ədəd.';
    } catch (error) {
      return 'Dəyişiklik yadda saxlanmadı: ' + (error?.message || 'Naməlum xəta');
    } finally {
      setWorking(false);
    }
  }

  async function answer(raw) {
    const q = norm(raw);

    if (pendingAddition) {
      if (q.includes('legv et') || q === 'legv' || q === 'dayandir') {
        setPendingAddition(null);
        return 'Anbara əlavə etmə əmri ləğv edildi.';
      }
      const qty = parseQty(q);
      if (qty === null || qty <= 0) return 'Zəhmət olmasa əlavə ediləcək miqdarı rəqəmlə yaz. Məsələn: 5';
      const product = allProducts.find(item => item.id === pendingAddition.productId);
      setPendingAddition(null);
      if (!product) return 'Məhsul siyahıda tapılmadı. Məhsul məlumatlarını yenilə və yenidən cəhd et.';
      return changeStock(product, Number(product.stock_qty || 0) + qty, 'AI Manager: anbara ' + qty + ' ədəd əlavə edildi', 'Miqdar anbara əlavə edildi.');
    }

    const { product: matched, ambiguous } = findProduct(q);
    const removeAll = ['satisdan cixart', 'anbardan cixart', 'ambardan cixart', 'stokdan cixart', 'anbardan sil'].some(phrase => q.includes(phrase));
    const addIntent = ['satisa cixart', 'anbara elave et', 'ambara elave et', 'anbarima elave et', 'stoka elave et', 'stok elave et'].some(phrase => q.includes(phrase));
    const setIntent = /(miqdarini|miqdari|stokunu|qaligini|sayini)/.test(q);
    const setQty = matched && setIntent ? requestedQuantity(q, matched) : null;
    const subtractIntent = !removeAll && !addIntent && !setIntent &&
      (q.includes('eded cix') || q.includes('eded azalt') || q.includes('stokdan ') || q.includes('anbardan '));
    const subtractQty = matched && subtractIntent ? requestedQuantity(q, matched) : null;

    if (removeAll || addIntent || setIntent || subtractIntent) {
      if (ambiguous) return 'Bu ada uyğun bir neçə məhsul tapıldı. Zəhmət olmasa məhsulun tam adını və ya SKU kodunu yaz.';
      if (!matched) return 'Məhsulu tapa bilmədim. Məhsulun adını və ya SKU kodunu dəqiq yaz.';
      const current = Number(matched.stock_qty || 0);

      if (removeAll) {
        return changeStock(matched, 0, 'AI Manager: məhsulun anbar qalığı sıfırlandı', 'Məhsulun bütün qalığı anbardan çıxarıldı.');
      }
      if (addIntent) {
        const qty = requestedQuantity(q, matched);
        if (qty === null || qty <= 0) {
          setPendingAddition({ productId: matched.id, productName: matched.name });
          return matched.name + ' üçün hazırkı qalıq ' + current + ' ədəddir. Neçə ədəd əlavə edim? Sadəcə rəqəmi yaz. Ləğv etmək üçün “ləğv et” yaz.';
        }
        return changeStock(matched, current + qty, 'AI Manager: anbara ' + qty + ' ədəd əlavə edildi', 'Miqdar anbara əlavə edildi.');
      }
      if (setIntent) {
        if (setQty === null || !Number.isFinite(setQty)) return 'Yeni miqdarı qeyd et. Məsələn: “' + matched.name + ' miqdarını 5 ədəd et”.';
        return changeStock(matched, setQty, 'AI Manager: anbar qalığı ' + setQty + ' ədədə təyin edildi', 'Anbar qalığı yeniləndi.');
      }
      if (subtractIntent) {
        if (subtractQty === null || subtractQty <= 0) return 'Neçə ədəd çıxılacağını rəqəmlə yaz.';
        if (subtractQty > current) return 'Anbarda yalnız ' + current + ' ədəd var. Bundan artıq çıxmaq mümkün deyil.';
        return changeStock(matched, current - subtractQty, 'AI Manager: anbardan ' + subtractQty + ' ədəd çıxıldı', 'Məhsul qalığı azaldıldı.');
      }
    }

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
      return 'Bunları edə bilərəm:\n• Məhsulun adını yazıb qalığını öyrən\n• “Məhsul adı satışdan çıxart” — qalığı sıfırla\n• “Məhsul adı satışa çıxart” — əlavə ediləcək miqdarı soruş\n• “Məhsul adı miqdarını 5 ədəd et” — qalığı 5 et\n• “Məhsul adı 2 ədəd çıx” — qalıqdan 2 çıx\n• Azalan stokları, anbar xülasəsini, satışları və sifarişləri göstər';
    }

    return 'Bu əmri hələ tanımadım. Anbar əmrləri üçün məhsulun adını və istədiyin dəyişikliyi yaz. Məsələn: “Lenovo LS105 miqdarını 5 ədəd et”.';
  }

  async function send(event) {
    event.preventDefault();
    const value = input.trim();
    if (!value || working) return;
    setMessages(previous => [...previous, { role: 'user', text: value }]);
    setInput('');
    const response = await answer(value);
    setMessages(previous => [...previous, { role: 'assistant', text: response }]);
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
      <button className="primary" type="submit" disabled={!input.trim() || working}><Send size={17} /> {working ? 'İcra olunur...' : 'Göndər'}</button>
    </form>
    <p className="ai-disclaimer">Anbar dəyişiklikləri birbaşa hesabında yadda saxlanılır və hər dəyişiklik stok tarixçəsinə yazılır. Bu lokal köməkçi ayrıca AI API açarı və ödəniş tələb etmir.</p>
  </section>;
}
