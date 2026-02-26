import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Plus } from 'lucide-react';

export default function UserList() {
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ username: '', full_name: '', password: '', role: 'field_worker', phone: '' });

  const load = () => { api.get('/users').then(r => setUsers(r.data)); };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const payload: any = { full_name: form.full_name, role: form.role, phone: form.phone };
      if (form.password) payload.password = form.password;
      await api.put(`/users/${editId}`, payload);
    } else {
      await api.post('/users', form);
    }
    setShowForm(false); setEditId(null); setForm({ username: '', full_name: '', password: '', role: 'field_worker', phone: '' }); load();
  };

  const roleLabels: Record<string, string> = { admin: 'Yönetici', warehouse_manager: 'Depo Sorumlusu', field_worker: 'Saha Çalışanı' };
  const roleColors: Record<string, string> = { admin: 'bg-red-100 text-red-700', warehouse_manager: 'bg-purple-100 text-purple-700', field_worker: 'bg-blue-100 text-blue-700' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Kullanıcılar</h2>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ username: '', full_name: '', password: '', role: 'field_worker', phone: '' }); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Yeni Kullanıcı
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold">{editId ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h3>
            {!editId && <div><label className="block text-sm font-medium mb-1">Kullanıcı Adı *</label><input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>}
            <div><label className="block text-sm font-medium mb-1">Ad Soyad *</label><input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">{editId ? 'Yeni Şifre (boş bırakılabilir)' : 'Şifre *'}</label><input type="password" required={!editId} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Rol</label><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="admin">Yönetici</option><option value="warehouse_manager">Depo Sorumlusu</option><option value="field_worker">Saha Çalışanı</option></select></div>
            <div><label className="block text-sm font-medium mb-1">Telefon</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">İptal</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Kaydet</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kullanıcı Adı</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ad Soyad</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Telefon</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{u.username}</td>
                <td className="px-4 py-3 font-medium">{u.full_name}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[u.role]}`}>{roleLabels[u.role]}</span></td>
                <td className="px-4 py-3 text-gray-500">{u.phone || '-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.active ? 'Aktif' : 'Pasif'}</span></td>
                <td className="px-4 py-3">
                  <button onClick={() => { setForm({ username: u.username, full_name: u.full_name, password: '', role: u.role, phone: u.phone || '' }); setEditId(u.id); setShowForm(true); }} className="text-orange-600 hover:underline text-xs">Düzenle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
