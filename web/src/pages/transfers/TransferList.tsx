import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Check, X, Truck } from 'lucide-react';

export default function TransferList() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [form, setForm] = useState({ from_warehouse_id: '', to_warehouse_id: '', items: [{ product_id: '', quantity: '' }] as any[], notes: '' });

  const load = () => { api.get('/transfers').then(r => setTransfers(r.data)); };
  useEffect(() => { load(); api.get('/warehouses').then(r => setWarehouses(r.data)); api.get('/products?active=1').then(r => setProducts(r.data)); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/transfers', {
      from_warehouse_id: Number(form.from_warehouse_id), to_warehouse_id: Number(form.to_warehouse_id),
      items: form.items.filter(i => i.product_id && i.quantity).map(i => ({ product_id: Number(i.product_id), quantity: Number(i.quantity) })),
      notes: form.notes
    });
    setShowForm(false); setForm({ from_warehouse_id: '', to_warehouse_id: '', items: [{ product_id: '', quantity: '' }], notes: '' }); load();
  };

  const handleAction = async (id: number, action: 'approve' | 'reject' | 'complete') => {
    await api.post(`/transfers/${id}/${action}`);
    load();
    if (showDetail?.id === id) {
      api.get(`/transfers/${id}`).then(r => setShowDetail(r.data));
    }
  };

  const viewDetail = async (id: number) => {
    const res = await api.get(`/transfers/${id}`);
    setShowDetail(res.data);
  };

  const statusColors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-blue-100 text-blue-700', rejected: 'bg-red-100 text-red-700', completed: 'bg-green-100 text-green-700' };
  const statusLabels: Record<string, string> = { pending: 'Bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi', completed: 'Tamamlandı' };

  const canApprove = user?.role === 'admin';
  const canComplete = user?.role === 'admin' || user?.role === 'warehouse_manager';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Transferler</h2>
        {(user?.role === 'admin' || user?.role === 'warehouse_manager') && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Yeni Transfer
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">Yeni Transfer Talebi</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Kaynak Depo *</label><select required value={form.from_warehouse_id} onChange={e => setForm({ ...form, from_warehouse_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Seçiniz</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Hedef Depo *</label><select required value={form.to_warehouse_id} onChange={e => setForm({ ...form, to_warehouse_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Seçiniz</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ürünler</label>
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <select value={item.product_id} onChange={e => { const items = [...form.items]; items[i].product_id = e.target.value; setForm({ ...form, items }); }} className="flex-1 px-2 py-2 border rounded-lg text-sm" required><option value="">Ürün seç</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  <input type="number" placeholder="Adet" value={item.quantity} onChange={e => { const items = [...form.items]; items[i].quantity = e.target.value; setForm({ ...form, items }); }} className="w-24 px-2 py-2 border rounded-lg text-sm" required min="1" />
                </div>
              ))}
              <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { product_id: '', quantity: '' }] })} className="text-xs text-blue-600 hover:underline">+ Ürün Ekle</button>
            </div>
            <div><label className="block text-sm font-medium mb-1">Not</label><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">İptal</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Talep Oluştur</button>
            </div>
          </form>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Transfer Detayı</h3>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Kaynak:</dt><dd className="font-medium">{showDetail.from_warehouse_name}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Hedef:</dt><dd className="font-medium">{showDetail.to_warehouse_name}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Talep Eden:</dt><dd>{showDetail.requested_by_name}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Durum:</dt><dd><span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[showDetail.status]}`}>{statusLabels[showDetail.status]}</span></dd></div>
              {showDetail.approved_by_name && <div className="flex justify-between"><dt className="text-gray-500">Onaylayan:</dt><dd>{showDetail.approved_by_name}</dd></div>}
            </dl>
            <div>
              <h4 className="font-semibold text-sm mb-2">Ürünler</h4>
              {showDetail.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between p-2 bg-gray-50 rounded mb-1 text-sm">
                  <span>{item.product_name}</span><span className="font-bold">{item.quantity} adet</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              {showDetail.status === 'pending' && canApprove && (
                <>
                  <button onClick={() => handleAction(showDetail.id, 'approve')} className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"><Check size={14} />Onayla</button>
                  <button onClick={() => handleAction(showDetail.id, 'reject')} className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"><X size={14} />Reddet</button>
                </>
              )}
              {showDetail.status === 'approved' && canComplete && (
                <button onClick={() => handleAction(showDetail.id, 'complete')} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Truck size={14} />Tamamla</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kaynak</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Hedef</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Talep Eden</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transfers.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{t.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">{t.from_warehouse_name}</td>
                <td className="px-4 py-3">{t.to_warehouse_name}</td>
                <td className="px-4 py-3">{t.requested_by_name}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[t.status]}`}>{statusLabels[t.status]}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => viewDetail(t.id)} className="text-blue-600 hover:underline text-xs">Detay</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transfers.length === 0 && <div className="text-center py-8 text-gray-400">Transfer bulunamadı</div>}
      </div>
    </div>
  );
}
