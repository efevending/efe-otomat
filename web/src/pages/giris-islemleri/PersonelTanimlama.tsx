import { useEffect, useState } from 'react';
import { Users, X, Download } from 'lucide-react';
import api from '../../api/client';

interface OtomatGroup {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
  type: string;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  surname: string;
  role: string;
  phone: string;
  address: string;
  salary: number;
  agi: number;
  shift_start: string;
  shift_end: string;
  warehouse_id: number | null;
  warehouse_name: string | null;
  active: number;
  otomat_groups: OtomatGroup[];
  otomat_group_names: string;
}

const roleLabels: Record<string, string> = {
  admin: 'ADMIN',
  warehouse_manager: 'DEPO YÖNETİCİ',
  field_worker: 'İŞÇİ',
};

const roleOptions = [
  { value: 'admin', label: 'ADMIN' },
  { value: 'warehouse_manager', label: 'DEPO YÖNETİCİ' },
  { value: 'field_worker', label: 'İŞÇİ' },
];

const emptyForm = {
  username: '',
  full_name: '',
  surname: '',
  password: '',
  role: 'field_worker',
  phone: '',
  address: '',
  salary: 0,
  agi: 0,
  shift_start: '08:00',
  shift_end: '17:00',
  warehouse_id: null as number | null,
  otomat_group_ids: [] as number[],
};

export default function PersonelTanimlama() {
  const [users, setUsers] = useState<User[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [otomatGroups, setOtomatGroups] = useState<OtomatGroup[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isNew, setIsNew] = useState(true);

  // Otomat grubu ekleme
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Filtreler
  const [filters, setFilters] = useState({
    username: '', full_name: '', surname: '', phone: '', role: '', warehouse_name: '', otomat_group_names: ''
  });

  useEffect(() => {
    loadUsers();
    loadWarehouses();
    loadOtomatGroups();
  }, []);

  const loadUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  const loadWarehouses = async () => {
    const res = await api.get('/warehouses');
    setWarehouses(res.data);
  };

  const loadOtomatGroups = async () => {
    const res = await api.get('/users/otomat-groups/list');
    setOtomatGroups(res.data);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setIsNew(false);
    setForm({
      username: user.username,
      full_name: user.full_name,
      surname: user.surname || '',
      password: '',
      role: user.role,
      phone: user.phone || '',
      address: user.address || '',
      salary: user.salary || 0,
      agi: user.agi || 0,
      shift_start: user.shift_start || '08:00',
      shift_end: user.shift_end || '17:00',
      warehouse_id: user.warehouse_id,
      otomat_group_ids: user.otomat_groups?.map(g => g.id) || [],
    });
  };

  const handleNewUser = () => {
    setSelectedUser(null);
    setIsNew(true);
    setForm({ ...emptyForm });
  };

  const handleSave = async () => {
    if (!form.username.trim()) return alert('Kullanıcı adı zorunlu');
    if (!form.full_name.trim()) return alert('Adı zorunlu');
    if (isNew && !form.password) return alert('Şifre zorunlu');

    try {
      if (isNew) {
        await api.post('/users', form);
      } else if (selectedUser) {
        const updateData: any = { ...form };
        if (!updateData.password) delete updateData.password;
        await api.put(`/users/${selectedUser.id}`, updateData);
      }
      loadUsers();
      handleNewUser();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    if (!confirm('Bu personeli deaktif etmek istediğinize emin misiniz?')) return;
    await api.delete(`/users/${selectedUser.id}`);
    loadUsers();
    handleNewUser();
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    await api.post('/users/otomat-groups', { name: newGroupName.trim() });
    setNewGroupName('');
    loadOtomatGroups();
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Bu otomat grubunu silmek istediğinize emin misiniz?')) return;
    await api.delete(`/users/otomat-groups/${groupId}`);
    loadOtomatGroups();
    loadUsers();
  };

  const toggleOtomatGroup = (groupId: number) => {
    setForm(prev => ({
      ...prev,
      otomat_group_ids: prev.otomat_group_ids.includes(groupId)
        ? prev.otomat_group_ids.filter(id => id !== groupId)
        : [...prev.otomat_group_ids, groupId]
    }));
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const data = filteredUsers.map(u => ({
      'Kullanıcı Adı': u.username,
      'Adı': u.full_name,
      'Soyadı': u.surname || '',
      'Telefon': u.phone || '',
      'Yetki': roleLabels[u.role] || u.role,
      'Tanımlı Depo': u.warehouse_name || '',
      'Otomat Grubu': u.otomat_group_names || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personeller');
    XLSX.writeFile(wb, 'personeller.xlsx');
  };

  // Filtreleme
  const filteredUsers = users.filter(u => {
    if (filters.username && !u.username.toLowerCase().includes(filters.username.toLowerCase())) return false;
    if (filters.full_name && !u.full_name.toLowerCase().includes(filters.full_name.toLowerCase())) return false;
    if (filters.surname && !(u.surname || '').toLowerCase().includes(filters.surname.toLowerCase())) return false;
    if (filters.phone && !(u.phone || '').toLowerCase().includes(filters.phone.toLowerCase())) return false;
    if (filters.role && !(roleLabels[u.role] || u.role).toLowerCase().includes(filters.role.toLowerCase())) return false;
    if (filters.warehouse_name && !(u.warehouse_name || '').toLowerCase().includes(filters.warehouse_name.toLowerCase())) return false;
    if (filters.otomat_group_names && !(u.otomat_group_names || '').toLowerCase().includes(filters.otomat_group_names.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Users className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Personel Tanımlama</h1>
      </div>

      <div className="flex gap-4 h-[calc(100vh-140px)]">
        {/* SOL PANEL - Personel Tablosu */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-w-0">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Personeller ({filteredUsers.length})</span>
            <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded text-xs hover:bg-green-600">
              <Download size={14} />
              Excel'e Aktar
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Kullanıcı Adı</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Adı</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Soyadı</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Telefon</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Yetki</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Tanımlı Depo</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Otomat Grubu</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 border-b"><input value={filters.username} onChange={e => setFilters({ ...filters, username: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.full_name} onChange={e => setFilters({ ...filters, full_name: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.surname} onChange={e => setFilters({ ...filters, surname: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.phone} onChange={e => setFilters({ ...filters, phone: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.role} onChange={e => setFilters({ ...filters, role: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.warehouse_name} onChange={e => setFilters({ ...filters, warehouse_name: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.otomat_group_names} onChange={e => setFilters({ ...filters, otomat_group_names: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr
                    key={u.id}
                    onClick={() => handleUserSelect(u)}
                    className={`cursor-pointer border-b border-gray-100 ${selectedUser?.id === u.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'} ${!u.active ? 'opacity-40' : ''}`}
                  >
                    <td className="px-3 py-2">{u.username}</td>
                    <td className="px-3 py-2">{u.full_name}</td>
                    <td className="px-3 py-2">{u.surname || ''}</td>
                    <td className="px-3 py-2">{u.phone || ''}</td>
                    <td className="px-3 py-2">{roleLabels[u.role] || u.role}</td>
                    <td className="px-3 py-2">{u.warehouse_name || ''}</td>
                    <td className="px-3 py-2">{u.otomat_group_names || ''}</td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Personel bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SAĞ PANEL - Personel Detay Formu */}
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{isNew ? 'Yeni Personel' : 'Personel Düzenle'}</span>
            {!isNew && selectedUser && (
              <button onClick={handleDelete} className="w-6 h-6 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600 text-xs">-</button>
            )}
          </div>

          <div className="p-3 space-y-3 flex-1">
            {/* Kullanıcı Adı */}
            <div>
              <label className="text-xs font-medium text-gray-600">KULLANICI ADI</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={!isNew} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5 disabled:bg-gray-100" />
            </div>

            {/* Şifre */}
            <div>
              <label className="text-xs font-medium text-gray-600">{isNew ? 'ŞİFRE' : 'YENİ ŞİFRE (boş bırakılırsa değişmez)'}</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* Adı */}
            <div>
              <label className="text-xs font-medium text-gray-600">ADI</label>
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* Soyadı */}
            <div>
              <label className="text-xs font-medium text-gray-600">SOYADI</label>
              <input value={form.surname} onChange={e => setForm({ ...form, surname: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* Adres */}
            <div>
              <label className="text-xs font-medium text-gray-600">ADRES</label>
              <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* Telefon */}
            <div>
              <label className="text-xs font-medium text-gray-600">TELEFON</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* Maaş */}
            <div>
              <label className="text-xs font-medium text-gray-600">MAAŞ</label>
              <input type="number" value={form.salary} onChange={e => setForm({ ...form, salary: Number(e.target.value) })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* AGİ */}
            <div>
              <label className="text-xs font-medium text-gray-600">AGİ</label>
              <input type="number" value={form.agi} onChange={e => setForm({ ...form, agi: Number(e.target.value) })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* Kullanıcı Yetkisi */}
            <div>
              <label className="text-xs font-medium text-gray-600">KULLANICI YETKİSİ</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {/* Otomat Grubu */}
            <div>
              <label className="text-xs font-medium text-emerald-700 font-bold">OTOMAT GRUBU</label>
              <div className="mt-1 border border-gray-300 rounded max-h-28 overflow-y-auto">
                {otomatGroups.map(g => (
                  <div
                    key={g.id}
                    onClick={() => toggleOtomatGroup(g.id)}
                    className={`px-2 py-1.5 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 ${form.otomat_group_ids.includes(g.id) ? 'bg-emerald-50 text-emerald-700 font-medium' : 'hover:bg-gray-50'}`}
                  >
                    {g.name}
                  </div>
                ))}
                {otomatGroups.length === 0 && (
                  <div className="px-2 py-2 text-xs text-gray-400 text-center">Grup tanımlı değil</div>
                )}
              </div>
              <button onClick={() => setShowGroupManager(!showGroupManager)} className="mt-1 w-full px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium hover:bg-emerald-200">
                Bölge Ekle / Çıkar
              </button>

              {showGroupManager && (
                <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 space-y-2">
                  <div className="flex gap-1">
                    <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Yeni bölge adı" className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" onKeyDown={e => e.key === 'Enter' && handleAddGroup()} />
                    <button onClick={handleAddGroup} className="px-2 py-1 bg-green-500 text-white rounded text-xs">Ekle</button>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {otomatGroups.map(g => (
                      <div key={g.id} className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded">
                        <span>{g.name}</span>
                        <button onClick={() => handleDeleteGroup(g.id)} className="text-red-500 hover:text-red-700"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mesai Saatleri */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-blue-600 font-bold">MESAİ BAŞ. SAATİ</label>
                <input type="time" value={form.shift_start} onChange={e => setForm({ ...form, shift_start: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
              <div>
                <label className="text-xs font-medium text-blue-600 font-bold">MESAİ BİT. SAATİ</label>
                <input type="time" value={form.shift_end} onChange={e => setForm({ ...form, shift_end: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
            </div>

            {/* Tanımlı Depo */}
            <div>
              <label className="text-xs font-medium text-gray-600">TANIMLI DEPO</label>
              <select value={form.warehouse_id || ''} onChange={e => setForm({ ...form, warehouse_id: e.target.value ? Number(e.target.value) : null })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                <option value="">Seçiniz</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          {/* Kaydet/Yeni Oluştur */}
          <div className="p-3 border-t border-gray-200 space-y-2">
            <button onClick={handleSave} className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              {isNew ? 'Yeni Personel Ekle' : 'Güncelle'}
            </button>
            {!isNew && (
              <button onClick={handleNewUser} className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Yeni Personel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
