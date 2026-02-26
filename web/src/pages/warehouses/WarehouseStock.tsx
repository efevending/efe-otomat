import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Plus, Minus } from 'lucide-react';

export default function WarehouseStock() {
  const { id } = useParams();
  const { user } = useAuth();
  const [warehouse, setWarehouse] = useState<any>(null);
  const [stock, setStock] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryType, setEntryType] = useState<'in' | 'out'>('in');
  const [entryItems, setEntryItems] = useState([{ product_id: '', quantity: '' }]);
  const [entryNotes, setEntryNotes] = useState('');
  const [tab, setTab] = useState<'stock' | 'transactions'>('stock');

  const load = () => {
    api.get(`/warehouses/${id}`).then(r => setWarehouse(r.data));
    api.get(`/warehouses/${id}/stock`).then(r => setStock(r.data));
    api.get(`/warehouses/${id}/transactions`).then(r => setTransactions(r.data));
  };

  useEffect(() => { load(); api.get('/products?active=1').then(r => setProducts(r.data)); }, [id]);

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = entryItems.filter(i => i.product_id && i.quantity).map(i => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) }));
    const endpoint = entryType === 'in' ? 'stock-entry' : 'stock-exit';
    await api.post(`/warehouses/${id}/${endpoint}`, { items, notes: entryNotes });
    setShowEntryForm(false);
    setEntryItems([{ product_id: '', quantity: '' }]);
    setEntryNotes('');
    load();
  };

  const canEdit = user?.role === 'admin' || user?.role === 'warehouse_manager';
  const refTypeLabels: Record<string, string> = { purchase: 'Alım', transfer: 'Transfer', loading: 'Yükleme', adjustment: 'Düzeltme' };

  if (!warehouse) return <div className="text-center py-12 text-gray-500">Yükleniyor...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/warehouses" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{warehouse.name}</h2>
          <p className="text-sm text-gray-500">{warehouse.address || 'Adres yok'}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={() => { setEntryType('in'); setShowEntryForm(true); }} className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700"><Plus size={16} />Giriş</button>
            <button onClick={() => { setEntryType('out'); setShowEntryForm(true); }} className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700"><Minus size={16} />Çıkış</button>
          </div>
        )}
      </div>

      {showEntryForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEntry} className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">Stok {entryType === 'in' ? 'Girişi' : 'Çıkışı'}</h3>
            {entryItems.map((item, i) => (
              <div key={i} className="flex gap-2">
                <select value={item.product_id} onChange={e => { const items = [...entryItems]; items[i].product_id = e.target.value; setEntryItems(items); }} className="flex-1 px-3 py-2 border rounded-lg text-sm" required>
                  <option value="">Ürün seç</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" placeholder="Adet" value={item.quantity} onChange={e => { const items = [...entryItems]; items[i].quantity = e.target.value; setEntryItems(items); }} className="w-24 px-3 py-2 border rounded-lg text-sm" required min="1" />
              </div>
            ))}
            <button type="button" onClick={() => setEntryItems([...entryItems, { product_id: '', quantity: '' }])} className="text-xs text-blue-600 hover:underline">+ Ürün Ekle</button>
            <div><label className="block text-sm font-medium mb-1">Not</label><input value={entryNotes} onChange={e => setEntryNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowEntryForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">İptal</button>
              <button type="submit" className={`px-4 py-2 text-sm text-white rounded-lg ${entryType === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Kaydet</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('stock')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'stock' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}>Mevcut Stok</button>
        <button onClick={() => setTab('transactions')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'transactions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}>Hareketler</button>
      </div>

      {tab === 'stock' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ürün</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Miktar</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Birim Maliyet</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Toplam Değer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stock.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.category || '-'}</td>
                  <td className={`px-4 py-3 text-right font-bold ${s.quantity <= 10 ? 'text-red-600' : s.quantity <= 30 ? 'text-orange-600' : 'text-gray-900'}`}>{s.quantity}</td>
                  <td className="px-4 py-3 text-right">{s.cost_price.toFixed(2)} TL</td>
                  <td className="px-4 py-3 text-right font-medium">{(s.quantity * s.cost_price).toFixed(2)} TL</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              <tr>
                <td className="px-4 py-3" colSpan={2}>Toplam</td>
                <td className="px-4 py-3 text-right">{stock.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right">{stock.reduce((s, i) => s + i.quantity * i.cost_price, 0).toFixed(2)} TL</td>
              </tr>
            </tfoot>
          </table>
          {stock.length === 0 && <div className="text-center py-8 text-gray-400">Stok verisi yok</div>}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ürün</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tip</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Referans</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Miktar</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">İşlemi Yapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{t.created_at}</td>
                  <td className="px-4 py-3 font-medium">{t.product_name}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${t.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.type === 'in' ? 'Giriş' : 'Çıkış'}</span></td>
                  <td className="px-4 py-3 text-gray-500">{refTypeLabels[t.reference_type] || '-'}</td>
                  <td className={`px-4 py-3 text-right font-bold ${t.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'in' ? '+' : '-'}{t.quantity}</td>
                  <td className="px-4 py-3 text-gray-500">{t.created_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && <div className="text-center py-8 text-gray-400">Hareket bulunamadı</div>}
        </div>
      )}
    </div>
  );
}
