import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search } from 'lucide-react';

export default function ProductList() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', barcode: '', category: '', cost_price: '', sale_price: '' });

  const load = () => { api.get('/products').then(r => setProducts(r.data)); };
  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode || '').includes(search) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, cost_price: Number(form.cost_price), sale_price: Number(form.sale_price) };
    if (editId) {
      await api.put(`/products/${editId}`, payload);
    } else {
      await api.post('/products', payload);
    }
    setShowForm(false);
    setEditId(null);
    setForm({ name: '', barcode: '', category: '', cost_price: '', sale_price: '' });
    load();
  };

  const startEdit = (p: any) => {
    setForm({ name: p.name, barcode: p.barcode || '', category: p.category || '', cost_price: p.cost_price.toString(), sale_price: p.sale_price.toString() });
    setEditId(p.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Ürünler</h2>
        {user?.role === 'admin' && (
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', barcode: '', category: '', cost_price: '', sale_price: '' }); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Yeni Ürün
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input type="text" placeholder="Ürün ara..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">{editId ? 'Ürün Düzenle' : 'Yeni Ürün'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-sm font-medium mb-1">Ürün Adı *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Barkod</label><input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Kategori</label><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Örn: İçecek, Atıştırmalık" /></div>
              <div><label className="block text-sm font-medium mb-1">Maliyet (TL)</label><input type="number" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Satış Fiyatı (TL)</label><input type="number" step="0.01" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">İptal</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Kaydet</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ürün Adı</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Barkod</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Maliyet</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Satış Fiyatı</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Kar</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
                {user?.role === 'admin' && <th className="text-left px-4 py-3 font-medium text-gray-600">İşlem</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.barcode || '-'}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{p.category || '-'}</span></td>
                  <td className="px-4 py-3 text-right">{p.cost_price.toFixed(2)} TL</td>
                  <td className="px-4 py-3 text-right font-medium">{p.sale_price.toFixed(2)} TL</td>
                  <td className="px-4 py-3 text-right text-green-600">{(p.sale_price - p.cost_price).toFixed(2)} TL</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.active ? 'Aktif' : 'Pasif'}</span></td>
                  {user?.role === 'admin' && (
                    <td className="px-4 py-3">
                      <button onClick={() => startEdit(p)} className="text-orange-600 hover:underline text-xs">Düzenle</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-8 text-gray-400">Ürün bulunamadı</div>}
      </div>
    </div>
  );
}
