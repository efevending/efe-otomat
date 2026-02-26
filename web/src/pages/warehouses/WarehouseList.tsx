import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Warehouse } from 'lucide-react';

export default function WarehouseList() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', type: 'field', address: '', manager_id: '' });

  const load = () => { api.get('/warehouses').then(r => setWarehouses(r.data)); };
  useEffect(() => { load(); api.get('/users').then(r => setUsers(r.data)); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, manager_id: form.manager_id ? Number(form.manager_id) : null };
    if (editId) { await api.put(`/warehouses/${editId}`, payload); } else { await api.post('/warehouses', payload); }
    setShowForm(false); setEditId(null); load();
  };

  const typeLabels: Record<string, string> = { central: 'Merkez', field: 'Saha' };
  const typeColors: Record<string, string> = { central: 'bg-purple-100 text-purple-700', field: 'bg-teal-100 text-teal-700' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Depolar</h2>
        {user?.role === 'admin' && (
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', type: 'field', address: '', manager_id: '' }); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Yeni Depo
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">{editId ? 'Depo Düzenle' : 'Yeni Depo'}</h3>
            <div><label className="block text-sm font-medium mb-1">Depo Adı *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Tip</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="central">Merkez</option><option value="field">Saha</option></select></div>
            <div><label className="block text-sm font-medium mb-1">Adres</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Sorumlu</label><select value={form.manager_id} onChange={e => setForm({ ...form, manager_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Seçiniz</option>{users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select></div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">İptal</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Kaydet</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map(w => (
          <div key={w.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-gray-100 p-2.5 rounded-lg"><Warehouse size={20} className="text-gray-600" /></div>
              <div>
                <h3 className="font-semibold">{w.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${typeColors[w.type]}`}>{typeLabels[w.type]}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">{w.address || 'Adres belirtilmemiş'}</p>
            {w.manager_name && <p className="text-xs text-gray-400">Sorumlu: {w.manager_name}</p>}
            <div className="mt-4 flex gap-2">
              <Link to={`/warehouses/${w.id}/stock`} className="flex-1 text-center text-sm bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100">Stok Görüntüle</Link>
              {user?.role === 'admin' && (
                <button onClick={() => { setForm({ name: w.name, type: w.type, address: w.address || '', manager_id: w.manager_id?.toString() || '' }); setEditId(w.id); setShowForm(true); }} className="text-sm text-orange-600 px-3 py-2 hover:bg-orange-50 rounded-lg">Düzenle</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
