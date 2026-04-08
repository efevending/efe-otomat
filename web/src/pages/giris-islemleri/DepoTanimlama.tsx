import { useEffect, useState } from 'react';
import { Warehouse as WarehouseIcon } from 'lucide-react';
import api from '../../api/client';

interface Warehouse {
  id: number;
  name: string;
  type: string;
  special_code: string;
  responsible_user_id: number | null;
  responsible_user_name: string | null;
  supplier_id: number | null;
}

interface User {
  id: number;
  full_name: string;
}

const DEPO_TYPES = [
  { value: 'sanal', label: 'HAREKETLİ DEPO (ARAÇ)' },
  { value: 'sabit', label: 'SABİT DEPO' },
  { value: 'tedarikci', label: 'TEDARİKÇİ' },
];

const typeLabel = (type: string) => DEPO_TYPES.find(d => d.value === type)?.label || type;

const emptyForm = {
  name: '',
  type: 'sanal',
  special_code: '',
  responsible_user_id: '' as number | '',
};

export default function DepoTanimlama() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isNew, setIsNew] = useState(true);

  const [filters, setFilters] = useState({ name: '', special_code: '', type: '', responsible: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [whRes, usrRes] = await Promise.all([
      api.get('/warehouses'),
      api.get('/users'),
    ]);
    setWarehouses(whRes.data);
    setUsers(usrRes.data);
  };

  const handleSelect = (w: Warehouse) => {
    setSelectedWarehouse(w);
    setIsNew(false);
    setForm({
      name: w.name,
      type: w.type,
      special_code: w.special_code || '',
      responsible_user_id: w.responsible_user_id || '',
    });
  };

  const handleNew = () => {
    setSelectedWarehouse(null);
    setIsNew(true);
    setForm({ ...emptyForm });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Depo adı zorunlu');
    try {
      const payload = {
        name: form.name,
        type: form.type,
        special_code: form.special_code,
        responsible_user_id: form.responsible_user_id || null,
      };
      if (isNew) {
        await api.post('/warehouses', payload);
      } else if (selectedWarehouse) {
        await api.put(`/warehouses/${selectedWarehouse.id}`, payload);
      }
      loadAll();
      handleNew();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const handleDelete = async () => {
    if (!selectedWarehouse) return;
    if (!confirm('Bu depoyu silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/warehouses/${selectedWarehouse.id}`);
      loadAll();
      handleNew();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const getTanimliArac = (w: Warehouse) => {
    if (w.responsible_user_name) {
      return `${w.responsible_user_name} - ${w.name}`;
    }
    return '-';
  };

  const filteredWarehouses = warehouses.filter(w => {
    if (filters.name && !w.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.special_code && !(w.special_code || '').toLowerCase().includes(filters.special_code.toLowerCase())) return false;
    if (filters.type && !typeLabel(w.type).toLowerCase().includes(filters.type.toLowerCase())) return false;
    if (filters.responsible && !getTanimliArac(w).toLowerCase().includes(filters.responsible.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <WarehouseIcon className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Depo Tanımlama</h1>
      </div>

      <div className="flex flex-col gap-4 h-[calc(100vh-140px)]">
        {/* ÜST - Depolar Tablosu */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
          <div className="p-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Depolar ({filteredWarehouses.length})</span>
            <button onClick={handleNew} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">
              DEPO EKLE
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-700 border-b">DEPO ADI</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-700 border-b w-28">DEPO ÖZEL KOD</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-700 border-b w-44">DEPO TİPİ</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-700 border-b">TANIMLI ARAÇ</th>
                </tr>
                <tr className="bg-amber-50">
                  <th className="px-2 py-1 border-b">
                    <input value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" />
                  </th>
                  <th className="px-2 py-1 border-b">
                    <input value={filters.special_code} onChange={e => setFilters({ ...filters, special_code: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" />
                  </th>
                  <th className="px-2 py-1 border-b">
                    <input value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" />
                  </th>
                  <th className="px-2 py-1 border-b">
                    <input value={filters.responsible} onChange={e => setFilters({ ...filters, responsible: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWarehouses.map(w => (
                  <tr
                    key={w.id}
                    onClick={() => handleSelect(w)}
                    className={`cursor-pointer border-b border-gray-100 ${selectedWarehouse?.id === w.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-3 py-2">{w.name}</td>
                    <td className="px-3 py-2">{w.special_code || ''}</td>
                    <td className="px-3 py-2">{typeLabel(w.type)}</td>
                    <td className="px-3 py-2">{getTanimliArac(w)}</td>
                  </tr>
                ))}
                {filteredWarehouses.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Depo bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ALT - Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Sol */}
            <div className="col-span-4 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">DEPO ADI</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">DEPO ÖZEL KOD</label>
                <input value={form.special_code} onChange={e => setForm({ ...form, special_code: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
            </div>

            {/* Orta */}
            <div className="col-span-4 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">DEPO TİPİ</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                  {DEPO_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">TANIMLI ARAÇ</label>
                <select value={form.responsible_user_id} onChange={e => setForm({ ...form, responsible_user_id: Number(e.target.value) || '' })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                  <option value="">-- Seçiniz --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            </div>

            {/* Sağ - Butonlar */}
            <div className="col-span-4 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" checked={isNew} onChange={() => handleNew()} />
                  Yeni
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" checked={!isNew} readOnly />
                  Güncelle
                </label>
              </div>
              <button onClick={handleSave} className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
                {isNew ? 'DEPO EKLE' : 'GÜNCELLE'}
              </button>
              {!isNew && (
                <button onClick={handleDelete} className="w-full px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600">
                  Depoyu Sil
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
