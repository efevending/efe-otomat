import { useEffect, useState } from 'react';
import { Building2, Plus, X, Download } from 'lucide-react';
import api from '../../api/client';

interface FirmaGroup {
  id: number;
  name: string;
}

interface FirmaType {
  id: number;
  name: string;
}

interface Firm {
  id: number;
  firma_group_id: number | null;
  firma_adi: string;
  unvan: string;
  adres: string;
  telefon: string;
  vergi_no: string;
  firma_type_id: number | null;
  type_name: string | null;
  group_name: string | null;
  fatura_listesi: number;
  otomat_gelir_listesi: number;
  kota_var: number;
  ucret_degisiklik_tarihi: string | null;
}

const emptyForm = {
  firma_group_id: null as number | null,
  firma_adi: '',
  unvan: '',
  adres: '',
  telefon: '',
  vergi_no: '',
  firma_type_id: null as number | null,
  fatura_listesi: 1,
  otomat_gelir_listesi: 1,
  kota_var: 0,
  ucret_degisiklik_tarihi: new Date().toISOString().split('T')[0],
};

export default function FirmaTanimlama() {
  const [groups, setGroups] = useState<FirmaGroup[]>([]);
  const [types, setTypes] = useState<FirmaType[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isNew, setIsNew] = useState(true);

  // Grup ekleme/düzenleme
  const [showGroupAdd, setShowGroupAdd] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editGroupName, setEditGroupName] = useState('');

  // Firma çeşidi ekleme
  const [newTypeName, setNewTypeName] = useState('');
  const [showTypeManager, setShowTypeManager] = useState(false);

  // Filtreler
  const [filters, setFilters] = useState({ firma_adi: '', unvan: '', adres: '', type_name: '' });

  useEffect(() => {
    loadGroups();
    loadTypes();
    loadFirms();
  }, []);

  useEffect(() => {
    loadFirms();
  }, [selectedGroupId]);

  const loadGroups = async () => {
    const res = await api.get('/firms/groups');
    setGroups(res.data);
  };

  const loadTypes = async () => {
    const res = await api.get('/firms/types');
    setTypes(res.data);
  };

  const loadFirms = async () => {
    const params = selectedGroupId ? { group_id: selectedGroupId } : {};
    const res = await api.get('/firms', { params });
    setFirms(res.data);
  };

  const handleGroupSelect = (groupId: number | null) => {
    setSelectedGroupId(groupId);
    if (groupId) {
      const group = groups.find(g => g.id === groupId);
      setEditGroupName(group?.name || '');
    }
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    await api.post('/firms/groups', { name: newGroupName.trim() });
    setNewGroupName('');
    setShowGroupAdd(false);
    loadGroups();
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroupId || !editGroupName.trim()) return;
    await api.put(`/firms/groups/${selectedGroupId}`, { name: editGroupName.trim() });
    loadGroups();
    loadFirms();
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    if (!confirm('Bu grubu silmek istediğinize emin misiniz?')) return;
    await api.delete(`/firms/groups/${selectedGroupId}`);
    setSelectedGroupId(null);
    loadGroups();
    loadFirms();
  };

  const handleFirmSelect = (firm: Firm) => {
    setSelectedFirm(firm);
    setIsNew(false);
    setForm({
      firma_group_id: firm.firma_group_id,
      firma_adi: firm.firma_adi,
      unvan: firm.unvan || '',
      adres: firm.adres || '',
      telefon: firm.telefon || '',
      vergi_no: firm.vergi_no || '',
      firma_type_id: firm.firma_type_id,
      fatura_listesi: firm.fatura_listesi,
      otomat_gelir_listesi: firm.otomat_gelir_listesi,
      kota_var: firm.kota_var,
      ucret_degisiklik_tarihi: firm.ucret_degisiklik_tarihi || new Date().toISOString().split('T')[0],
    });
  };

  const handleNewFirm = () => {
    setSelectedFirm(null);
    setIsNew(true);
    setForm({ ...emptyForm, firma_group_id: selectedGroupId });
  };

  const handleSave = async () => {
    if (!form.firma_adi.trim()) return alert('Firma adı zorunlu');
    if (isNew) {
      await api.post('/firms', form);
    } else if (selectedFirm) {
      await api.put(`/firms/${selectedFirm.id}`, form);
    }
    loadFirms();
    handleNewFirm();
  };

  const handleDelete = async () => {
    if (!selectedFirm) return;
    if (!confirm('Bu firmayı silmek istediğinize emin misiniz?')) return;
    await api.delete(`/firms/${selectedFirm.id}`);
    loadFirms();
    handleNewFirm();
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    await api.post('/firms/types', { name: newTypeName.trim() });
    setNewTypeName('');
    loadTypes();
  };

  const handleDeleteType = async (typeId: number) => {
    if (!confirm('Bu firma çeşidini silmek istediğinize emin misiniz?')) return;
    await api.delete(`/firms/types/${typeId}`);
    loadTypes();
    loadFirms();
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const data = filteredFirms.map(f => ({
      'Firma Adı': f.firma_adi,
      'Unvan': f.unvan,
      'Adres': f.adres,
      'Telefon': f.telefon,
      'Vergi No': f.vergi_no,
      'Firma Çeşidi': f.type_name || '',
      'Grup': f.group_name || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Firmalar');
    XLSX.writeFile(wb, 'firmalar.xlsx');
  };

  // Filtreleme
  const filteredFirms = firms.filter(f => {
    if (filters.firma_adi && !f.firma_adi.toLowerCase().includes(filters.firma_adi.toLowerCase())) return false;
    if (filters.unvan && !f.unvan?.toLowerCase().includes(filters.unvan.toLowerCase())) return false;
    if (filters.adres && !f.adres?.toLowerCase().includes(filters.adres.toLowerCase())) return false;
    if (filters.type_name && !(f.type_name || '').toLowerCase().includes(filters.type_name.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Building2 className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Firma Tanımlama</h1>
      </div>

      <div className="flex gap-4 h-[calc(100vh-140px)]">
        {/* SOL PANEL - Firma Grupları */}
        <div className="w-56 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Firma Grubu</span>
            <button onClick={() => setShowGroupAdd(true)} className="w-6 h-6 bg-green-500 text-white rounded flex items-center justify-center hover:bg-green-600">
              <Plus size={14} />
            </button>
          </div>

          {showGroupAdd && (
            <div className="p-2 border-b border-gray-200 flex gap-1">
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Grup adı" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1" onKeyDown={e => e.key === 'Enter' && handleAddGroup()} />
              <button onClick={handleAddGroup} className="px-2 py-1 bg-green-500 text-white rounded text-xs">Ekle</button>
              <button onClick={() => { setShowGroupAdd(false); setNewGroupName(''); }} className="px-1 py-1 text-gray-500 hover:text-gray-700"><X size={14} /></button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div
              onClick={() => handleGroupSelect(null)}
              className={`px-3 py-2 text-sm cursor-pointer border-b border-gray-100 ${selectedGroupId === null ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Tümü
            </div>
            {groups.map(g => (
              <div
                key={g.id}
                onClick={() => handleGroupSelect(g.id)}
                className={`px-3 py-2 text-sm cursor-pointer border-b border-gray-100 ${selectedGroupId === g.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {g.name}
              </div>
            ))}
          </div>

          {/* Seçili grup düzenleme */}
          {selectedGroupId && (
            <div className="p-3 border-t border-gray-200 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Grup Düzenle</p>
              <input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
              <div className="flex gap-1">
                <button onClick={handleUpdateGroup} className="flex-1 px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">Güncelle</button>
                <button onClick={handleDeleteGroup} className="px-2 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600">Sil</button>
              </div>
            </div>
          )}
        </div>

        {/* ORTA PANEL - Firmalar Tablosu */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-w-0">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Firmalar {selectedGroupId ? `(${groups.find(g => g.id === selectedGroupId)?.name})` : '(Tümü)'}
            </span>
            <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded text-xs hover:bg-green-600">
              <Download size={14} />
              Excel'e Aktar
            </button>
          </div>

          {/* Tablo */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Firma Adı</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Unvan</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Firma Adresi</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Firma Çeşidi</th>
                </tr>
                {/* Filtre satırı */}
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 border-b"><input value={filters.firma_adi} onChange={e => setFilters({ ...filters, firma_adi: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.unvan} onChange={e => setFilters({ ...filters, unvan: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.adres} onChange={e => setFilters({ ...filters, adres: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  <th className="px-2 py-1 border-b"><input value={filters.type_name} onChange={e => setFilters({ ...filters, type_name: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                </tr>
              </thead>
              <tbody>
                {filteredFirms.map(f => (
                  <tr
                    key={f.id}
                    onClick={() => handleFirmSelect(f)}
                    className={`cursor-pointer border-b border-gray-100 ${selectedFirm?.id === f.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-3 py-2">{f.firma_adi}</td>
                    <td className="px-3 py-2">{f.unvan}</td>
                    <td className="px-3 py-2">{f.adres}</td>
                    <td className="px-3 py-2">{f.type_name || '-'}</td>
                  </tr>
                ))}
                {filteredFirms.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-400">Firma bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SAĞ PANEL - Firma Detay Formu */}
        <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{isNew ? 'Yeni Firma' : 'Firma Düzenle'}</span>
            {!isNew && selectedFirm && (
              <button onClick={handleDelete} className="w-6 h-6 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600 text-xs">-</button>
            )}
          </div>

          <div className="p-3 space-y-3 flex-1">
            {/* Firma Grup Adı */}
            <div>
              <label className="text-xs font-medium text-gray-600">Firma Grup Adı</label>
              <select value={form.firma_group_id || ''} onChange={e => setForm({ ...form, firma_group_id: e.target.value ? Number(e.target.value) : null })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                <option value="">Seçiniz</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            {/* Firma Adı */}
            <div>
              <label className="text-xs font-medium text-gray-600">Firma Adı</label>
              <input value={form.firma_adi} onChange={e => setForm({ ...form, firma_adi: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* Unvan */}
            <div>
              <label className="text-xs font-medium text-gray-600">Unvan</label>
              <input value={form.unvan} onChange={e => setForm({ ...form, unvan: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* Adres */}
            <div>
              <label className="text-xs font-medium text-gray-600">Adres</label>
              <textarea value={form.adres} onChange={e => setForm({ ...form, adres: e.target.value })} rows={2} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* Telefon */}
            <div>
              <label className="text-xs font-medium text-gray-600">Telefon</label>
              <input value={form.telefon} onChange={e => setForm({ ...form, telefon: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* Vergi No */}
            <div>
              <label className="text-xs font-medium text-gray-600">Vergi No</label>
              <input value={form.vergi_no} onChange={e => setForm({ ...form, vergi_no: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>

            {/* Firma Çeşidi */}
            <div>
              <label className="text-xs font-medium text-emerald-700 font-bold">FİRMA ÇEŞİDİ</label>
              <div className="flex gap-1 mt-1">
                <select value={form.firma_type_id || ''} onChange={e => setForm({ ...form, firma_type_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                  <option value="">Tüm Firmalar</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button onClick={() => setShowTypeManager(!showTypeManager)} className="mt-1 w-full px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium hover:bg-emerald-200">
                Firma Çeşidi Tanımla / Çıkar
              </button>

              {showTypeManager && (
                <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 space-y-2">
                  <div className="flex gap-1">
                    <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Yeni çeşit adı" className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" onKeyDown={e => e.key === 'Enter' && handleAddType()} />
                    <button onClick={handleAddType} className="px-2 py-1 bg-green-500 text-white rounded text-xs">Ekle</button>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {types.map(t => (
                      <div key={t.id} className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded">
                        <span>{t.name}</span>
                        <button onClick={() => handleDeleteType(t.id)} className="text-red-500 hover:text-red-700"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fatura Listesine Eklensin mi? */}
            <div>
              <label className="text-xs font-medium text-gray-600">Fatura Listesine Eklensin mi?</label>
              <select value={form.fatura_listesi} onChange={e => setForm({ ...form, fatura_listesi: Number(e.target.value) })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                <option value={1}>EVET</option>
                <option value={0}>HAYIR</option>
              </select>
            </div>

            {/* Otomat Gelir Listesine Eklensin mi? */}
            <div>
              <label className="text-xs font-medium text-gray-600">Otomat Gelir Listesine Eklensin mi?</label>
              <select value={form.otomat_gelir_listesi} onChange={e => setForm({ ...form, otomat_gelir_listesi: Number(e.target.value) })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                <option value={1}>EVET</option>
                <option value={0}>HAYIR</option>
              </select>
            </div>

            {/* Kota Var mı? */}
            <div>
              <label className="text-xs font-medium text-orange-600 font-bold">KOTA VARMI?</label>
              <select value={form.kota_var} onChange={e => setForm({ ...form, kota_var: Number(e.target.value) })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                <option value={0}>HAYIR</option>
                <option value={1}>EVET</option>
              </select>
            </div>

            {/* Ücret Değişiklik Tarihi */}
            <div>
              <label className="text-xs font-medium text-blue-600 font-bold">ÜCRET DEĞİŞİKLİK TARİHİ</label>
              <input type="date" value={form.ucret_degisiklik_tarihi || ''} onChange={e => setForm({ ...form, ucret_degisiklik_tarihi: e.target.value })} className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
            </div>
          </div>

          {/* Kaydet/Yeni Oluştur */}
          <div className="p-3 border-t border-gray-200 space-y-2">
            <button onClick={handleSave} className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              {isNew ? 'Yeni Oluştur' : 'Güncelle'}
            </button>
            {!isNew && (
              <button onClick={handleNewFirm} className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                Yeni Firma
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
