import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { Plus } from 'lucide-react';

export default function CountList() {
  const [counts, setCounts] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  const [machines, setMachines] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ machine_id: '', items: [{ spiral_number: '1', product_id: '', quantity: '0' }] as any[], notes: '' });

  const load = () => {
    const params = new URLSearchParams();
    const machineId = searchParams.get('machine_id');
    if (machineId) params.set('machine_id', machineId);
    api.get(`/counts?${params}`).then(r => setCounts(r.data));
  };

  useEffect(() => {
    load();
    api.get('/machines').then(r => setMachines(r.data));
    api.get('/products?active=1').then(r => setProducts(r.data));
  }, [searchParams.toString()]);

  const addItem = () => setForm({ ...form, items: [...form.items, { spiral_number: '', product_id: '', quantity: '0' }] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i: number, field: string, value: string) => {
    const items = [...form.items]; items[i] = { ...items[i], [field]: value }; setForm({ ...form, items });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/counts', {
      machine_id: Number(form.machine_id),
      items: form.items.map(i => ({ spiral_number: Number(i.spiral_number), product_id: i.product_id ? Number(i.product_id) : null, quantity: Number(i.quantity) })),
      notes: form.notes || undefined
    });
    setShowForm(false);
    setForm({ machine_id: '', items: [{ spiral_number: '1', product_id: '', quantity: '0' }], notes: '' });
    load();
  };

  // Makina ürün haritasından otomatik doldur
  const loadMachineMap = async (machineId: string) => {
    setForm(f => ({ ...f, machine_id: machineId }));
    if (machineId) {
      const res = await api.get(`/product-maps/${machineId}`);
      if (res.data.maps.length > 0) {
        setForm(f => ({
          ...f,
          machine_id: machineId,
          items: res.data.maps.map((m: any) => ({
            spiral_number: m.spiral_number.toString(),
            product_id: m.product_id?.toString() || '',
            quantity: '0'
          }))
        }));
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sayımlar</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Yeni Sayım
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">Yeni Sayım</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Makina *</label>
              <select required value={form.machine_id} onChange={e => loadMachineMap(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Seçiniz (seçince ürün haritası otomatik yüklenir)</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.machine_no} - {m.name}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Spiral Sayımları</label>
                <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline">+ Ekle</button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 w-8">S{item.spiral_number}</span>
                    <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} className="flex-1 px-2 py-1.5 border rounded text-sm">
                      <option value="">Boş</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" placeholder="Adet" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="w-20 px-2 py-1.5 border rounded text-sm" min="0" />
                    {form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-500 text-xs">X</button>}
                  </div>
                ))}
              </div>
            </div>

            <div><label className="block text-sm font-medium mb-1">Not</label><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>

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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Saat</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Makina</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Çalışan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Toplam Stok</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {counts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{c.count_date}</td>
                  <td className="px-4 py-3 text-gray-500">{c.count_time}</td>
                  <td className="px-4 py-3"><span className="font-mono text-blue-600">{c.machine_no}</span> {c.machine_name}</td>
                  <td className="px-4 py-3">{c.user_name}</td>
                  <td className="px-4 py-3 text-right font-medium">{c.total_items || 0}</td>
                  <td className="px-4 py-3"><Link to={`/counts/${c.id}/sales`} className="text-green-600 hover:underline text-xs font-medium">Satış Analizi</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {counts.length === 0 && <div className="text-center py-8 text-gray-400">Sayım bulunamadı</div>}
      </div>
    </div>
  );
}
