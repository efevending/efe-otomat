import { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import api from '../../api/client';

interface Supplier {
  id: number;
  name: string;
  address: string;
  phone: string;
  tax_no: string;
  tax_office: string;
  notes: string;
}

const emptyForm = {
  name: '',
  address: '',
  phone: '',
  tax_no: '',
  tax_office: '',
  notes: '',
};

export default function TedarikciTanimlama() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isNew, setIsNew] = useState(true);

  const [filters, setFilters] = useState({ name: '', address: '', phone: '', tax_no: '', tax_office: '' });

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    const res = await api.get('/suppliers');
    setSuppliers(res.data);
  };

  const handleSelect = (s: Supplier) => {
    setSelectedSupplier(s);
    setIsNew(false);
    setForm({
      name: s.name,
      address: s.address || '',
      phone: s.phone || '',
      tax_no: s.tax_no || '',
      tax_office: s.tax_office || '',
      notes: s.notes || '',
    });
  };

  const handleNew = () => {
    setSelectedSupplier(null);
    setIsNew(true);
    setForm({ ...emptyForm });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Tedarikçi adı zorunlu');
    try {
      if (isNew) {
        await api.post('/suppliers', form);
      } else if (selectedSupplier) {
        await api.put(`/suppliers/${selectedSupplier.id}`, form);
      }
      loadSuppliers();
      handleNew();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    if (!confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return;
    await api.delete(`/suppliers/${selectedSupplier.id}`);
    loadSuppliers();
    handleNew();
  };

  const filteredSuppliers = suppliers.filter(s => {
    if (filters.name && !s.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.address && !(s.address || '').toLowerCase().includes(filters.address.toLowerCase())) return false;
    if (filters.phone && !(s.phone || '').toLowerCase().includes(filters.phone.toLowerCase())) return false;
    if (filters.tax_no && !(s.tax_no || '').toLowerCase().includes(filters.tax_no.toLowerCase())) return false;
    if (filters.tax_office && !(s.tax_office || '').toLowerCase().includes(filters.tax_office.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Truck className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Tedarikçi Tanımlama</h1>
      </div>

      <div className="flex flex-col gap-4 h-[calc(100vh-140px)]">
        {/* ÜST - Tedarikçiler Tablosu */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
          <div className="p-2 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-700 text-center block">Tedarikçiler ({filteredSuppliers.length})</span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Adı</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Adresi</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b w-28">Tel</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b w-28">Vergi No</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b w-32">Vergi Daire</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 border-b"><input value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.address} onChange={e => setFilters({ ...filters, address: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.phone} onChange={e => setFilters({ ...filters, phone: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.tax_no} onChange={e => setFilters({ ...filters, tax_no: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.tax_office} onChange={e => setFilters({ ...filters, tax_office: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    className={`cursor-pointer border-b border-gray-100 ${selectedSupplier?.id === s.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-3 py-2">{s.name}</td>
                    <td className="px-3 py-2">{s.address || ''}</td>
                    <td className="px-3 py-2">{s.phone || ''}</td>
                    <td className="px-3 py-2">{s.tax_no || ''}</td>
                    <td className="px-3 py-2">{s.tax_office || ''}</td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Tedarikçi bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ALT - Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Sol */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">TEDARİKÇİ ADI</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
              <div className="flex items-start gap-3">
                <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0 mt-1">ADRES</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
              <div className="flex items-start gap-3">
                <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0 mt-1">NOT</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
            </div>

            {/* Orta */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">TELEFON</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">VERGİ NUMARASI</label>
                <input value={form.tax_no} onChange={e => setForm({ ...form, tax_no: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">VERGİ DAİRESİ</label>
                <input value={form.tax_office} onChange={e => setForm({ ...form, tax_office: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
              </div>
            </div>

            {/* Sağ - Butonlar */}
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" checked={isNew} onChange={() => handleNew()} />
                  Yeni Oluştur
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="radio" checked={!isNew} readOnly />
                  Güncelle
                </label>
              </div>
              <button onClick={handleSave} className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
                {isNew ? 'YENİ OLUŞTUR' : 'GÜNCELLE'}
              </button>
              {!isNew && (
                <button onClick={handleDelete} className="w-full px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600">
                  Tedarikçiyi Sil
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
