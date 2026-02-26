import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search } from 'lucide-react';

export default function MachineList() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [form, setForm] = useState({ machine_no: '', name: '', location_description: '', warehouse_id: '', spiral_rows: '8', spiral_cols: '10' });
  const [editId, setEditId] = useState<number | null>(null);

  const load = () => { api.get('/machines').then(r => setMachines(r.data)); };
  useEffect(() => { load(); api.get('/warehouses').then(r => setWarehouses(r.data)); }, []);

  const filtered = machines.filter(m =>
    m.machine_no.toLowerCase().includes(search.toLowerCase()) ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.location_description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null, spiral_rows: Number(form.spiral_rows), spiral_cols: Number(form.spiral_cols) };
    if (editId) {
      await api.put(`/machines/${editId}`, payload);
    } else {
      await api.post('/machines', payload);
    }
    setShowForm(false);
    setEditId(null);
    setForm({ machine_no: '', name: '', location_description: '', warehouse_id: '', spiral_rows: '8', spiral_cols: '10' });
    load();
  };

  const startEdit = (m: any) => {
    setForm({ machine_no: m.machine_no, name: m.name, location_description: m.location_description || '', warehouse_id: m.warehouse_id?.toString() || '', spiral_rows: m.spiral_rows.toString(), spiral_cols: m.spiral_cols.toString() });
    setEditId(m.id);
    setShowForm(true);
  };

  const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-700', inactive: 'bg-red-100 text-red-700', maintenance: 'bg-yellow-100 text-yellow-700' };
  const statusLabels: Record<string, string> = { active: 'Aktif', inactive: 'Pasif', maintenance: 'Bakımda' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Makinalar</h2>
        {user?.role === 'admin' && (
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ machine_no: '', name: '', location_description: '', warehouse_id: '', spiral_rows: '8', spiral_cols: '10' }); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Yeni Makina
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input type="text" placeholder="Makina ara..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">{editId ? 'Makina Düzenle' : 'Yeni Makina'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Makina No *</label><input required value={form.machine_no} onChange={e => setForm({ ...form, machine_no: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Makina Adı *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="col-span-2"><label className="block text-sm font-medium mb-1">Konum</label><input value={form.location_description} onChange={e => setForm({ ...form, location_description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Depo</label><select value={form.warehouse_id} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Seçiniz</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
              <div className="flex gap-2">
                <div><label className="block text-sm font-medium mb-1">Satır</label><input type="number" value={form.spiral_rows} onChange={e => setForm({ ...form, spiral_rows: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Sütun</label><input type="number" value={form.spiral_cols} onChange={e => setForm({ ...form, spiral_cols: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">No</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Makina Adı</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Konum</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Depo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Spiral</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{m.machine_no}</td>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-gray-500">{m.location_description || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.warehouse_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.spiral_rows}x{m.spiral_cols}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[m.status]}`}>{statusLabels[m.status]}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/machines/${m.id}`} className="text-blue-600 hover:underline text-xs">Detay</Link>
                      {user?.role === 'admin' && <button onClick={() => startEdit(m)} className="text-orange-600 hover:underline text-xs">Düzenle</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-8 text-gray-400">Makina bulunamadı</div>}
      </div>
    </div>
  );
}
