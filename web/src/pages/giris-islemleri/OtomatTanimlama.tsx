import { useEffect, useState } from 'react';
import { Monitor, Download } from 'lucide-react';
import api from '../../api/client';

interface Firm {
  id: number;
  firma_adi: string;
  unvan: string;
  group_name: string | null;
  firma_group_id: number | null;
}

interface Machine {
  id: number;
  machine_no: string;
  name: string;
  serial_no: string;
  firm_id: number | null;
  firm_name: string | null;
  firm_group_name: string | null;
  otomat_model_id: number | null;
  model_name: string | null;
  otomat_region_id: number | null;
  region_name: string | null;
  otomat_type_id: number | null;
  type_name: string | null;
  address: string;
  sales_quota: number;
  responsible_user_id: number | null;
  responsible_name: string | null;
  is_filling: number;
  credit_card: number;
  cup_capacity_1: number;
  cup_capacity_2: number;
  warehouse_id: number | null;
  warehouse_name: string | null;
  drink_group_id: number | null;
  drink_group_name: string | null;
  otomat_group_id: number | null;
  otomat_group_name: string | null;
  yandolap_depo: string;
  dia_depo: string;
  status: string;
}

interface LookupItem { id: number; name: string; }
interface UserItem { id: number; full_name: string; surname: string; username: string; }
interface Warehouse { id: number; name: string; }

const emptyForm = {
  machine_no: '',
  name: '',
  serial_no: '',
  firm_id: null as number | null,
  otomat_model_id: null as number | null,
  otomat_region_id: null as number | null,
  otomat_type_id: null as number | null,
  address: '',
  sales_quota: 1,
  responsible_user_id: null as number | null,
  is_filling: 1,
  credit_card: 0,
  cup_capacity_1: 0,
  cup_capacity_2: 0,
  warehouse_id: null as number | null,
  drink_group_id: null as number | null,
  otomat_group_id: null as number | null,
  yandolap_depo: '',
  dia_depo: '',
};

export default function OtomatTanimlama() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [models, setModels] = useState<LookupItem[]>([]);
  const [regions, setRegions] = useState<LookupItem[]>([]);
  const [types, setTypes] = useState<LookupItem[]>([]);
  const [drinkGroups, setDrinkGroups] = useState<LookupItem[]>([]);
  const [otomatGroups, setOtomatGroups] = useState<LookupItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [selectedFirmId, setSelectedFirmId] = useState<number | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isNew, setIsNew] = useState(true);

  // Filtreler
  const [firmFilters, setFirmFilters] = useState({ group_name: '', firma_adi: '', unvan: '' });
  const [machineFilters, setMachineFilters] = useState({
    serial_no: '', model_name: '', type_name: '', region_name: '', drink_group_name: '', sales_quota: '', yandolap_depo: ''
  });

  // Yeni model/bölge ekleme
  const [newModelName, setNewModelName] = useState('');
  const [newRegionName, setNewRegionName] = useState('');

  useEffect(() => {
    loadFirms();
    loadLookups();
  }, []);

  useEffect(() => {
    loadMachines();
  }, [selectedFirmId]);

  const loadFirms = async () => {
    const res = await api.get('/firms');
    setFirms(res.data);
  };

  const loadMachines = async () => {
    const params: any = {};
    if (selectedFirmId) params.firm_id = selectedFirmId;
    const res = await api.get('/machines', { params });
    setMachines(res.data);
  };

  const loadLookups = async () => {
    const [modelsRes, regionsRes, typesRes, drinkRes, groupsRes, usersRes, whRes] = await Promise.all([
      api.get('/machines/models'),
      api.get('/machines/regions'),
      api.get('/machines/types'),
      api.get('/machines/drink-groups'),
      api.get('/users/otomat-groups/list'),
      api.get('/users'),
      api.get('/warehouses'),
    ]);
    setModels(modelsRes.data);
    setRegions(regionsRes.data);
    setTypes(typesRes.data);
    setDrinkGroups(drinkRes.data);
    setOtomatGroups(groupsRes.data);
    setUsers(usersRes.data);
    setWarehouses(whRes.data);
  };

  const handleMachineSelect = (m: Machine) => {
    setSelectedMachine(m);
    setIsNew(false);
    setForm({
      machine_no: m.machine_no,
      name: m.name,
      serial_no: m.serial_no || '',
      firm_id: m.firm_id,
      otomat_model_id: m.otomat_model_id,
      otomat_region_id: m.otomat_region_id,
      otomat_type_id: m.otomat_type_id,
      address: m.address || '',
      sales_quota: m.sales_quota ?? 1,
      responsible_user_id: m.responsible_user_id,
      is_filling: m.is_filling ?? 1,
      credit_card: m.credit_card ?? 0,
      cup_capacity_1: m.cup_capacity_1 ?? 0,
      cup_capacity_2: m.cup_capacity_2 ?? 0,
      warehouse_id: m.warehouse_id,
      drink_group_id: m.drink_group_id,
      otomat_group_id: m.otomat_group_id,
      yandolap_depo: m.yandolap_depo || '',
      dia_depo: m.dia_depo || '',
    });
  };

  const handleNewMachine = () => {
    setSelectedMachine(null);
    setIsNew(true);
    setForm({ ...emptyForm, firm_id: selectedFirmId });
  };

  const handleSave = async () => {
    if (!form.machine_no.trim()) return alert('Otomat numarası zorunlu');
    if (!form.name.trim()) return alert('Otomat adı zorunlu');
    try {
      if (isNew) {
        await api.post('/machines', form);
      } else if (selectedMachine) {
        await api.put(`/machines/${selectedMachine.id}`, form);
      }
      loadMachines();
      handleNewMachine();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const handleDeactivate = async () => {
    if (!selectedMachine) return;
    if (!confirm('Bu otomatı pasif yapmak istediğinize emin misiniz?')) return;
    await api.delete(`/machines/${selectedMachine.id}`);
    loadMachines();
    handleNewMachine();
  };

  const handleAddModel = async () => {
    if (!newModelName.trim()) return;
    const res = await api.post('/machines/models', { name: newModelName.trim() });
    setNewModelName('');
    setModels(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleAddRegion = async () => {
    if (!newRegionName.trim()) return;
    const res = await api.post('/machines/regions', { name: newRegionName.trim() });
    setNewRegionName('');
    setRegions(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const data = filteredMachines.map(m => ({
      'Otomat No': m.machine_no,
      'Seri No': m.serial_no || '',
      'Model': m.model_name || '',
      'Tip': m.type_name || '',
      'Bölge': m.region_name || '',
      'İçecek Grubu': m.drink_group_name || '',
      'Satış Kotası': m.sales_quota,
      'Yandolap Depo': m.yandolap_depo || '',
      'Firma': m.firm_name || '',
      'Adres': m.address || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Otomatlar');
    XLSX.writeFile(wb, 'otomatlar.xlsx');
  };

  // Firma filtreleme
  const filteredFirms = firms.filter(f => {
    if (firmFilters.group_name && !(f.group_name || '').toLowerCase().includes(firmFilters.group_name.toLowerCase())) return false;
    if (firmFilters.firma_adi && !f.firma_adi.toLowerCase().includes(firmFilters.firma_adi.toLowerCase())) return false;
    if (firmFilters.unvan && !(f.unvan || '').toLowerCase().includes(firmFilters.unvan.toLowerCase())) return false;
    return true;
  });

  // Otomat filtreleme
  const filteredMachines = machines.filter(m => {
    if (machineFilters.serial_no && !(m.serial_no || '').toLowerCase().includes(machineFilters.serial_no.toLowerCase())) return false;
    if (machineFilters.model_name && !(m.model_name || '').toLowerCase().includes(machineFilters.model_name.toLowerCase())) return false;
    if (machineFilters.type_name && !(m.type_name || '').toLowerCase().includes(machineFilters.type_name.toLowerCase())) return false;
    if (machineFilters.region_name && !(m.region_name || '').toLowerCase().includes(machineFilters.region_name.toLowerCase())) return false;
    if (machineFilters.drink_group_name && !(m.drink_group_name || '').toLowerCase().includes(machineFilters.drink_group_name.toLowerCase())) return false;
    if (machineFilters.yandolap_depo && !(m.yandolap_depo || '').toLowerCase().includes(machineFilters.yandolap_depo.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Monitor className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Otomat Tanımlama</h1>
      </div>

      <div className="flex gap-3 h-[calc(100vh-140px)]">
        {/* SOL PANEL - Firmalar */}
        <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col">
          <div className="p-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">FİRMALAR</span>
            <button onClick={handleExportExcel} className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-[10px] hover:bg-green-600">
              <Download size={10} />
              Excel
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1 font-medium text-gray-600 border-b">Firma Grup</th>
                  <th className="text-left px-2 py-1 font-medium text-gray-600 border-b">Firma Adı</th>
                  <th className="text-left px-2 py-1 font-medium text-gray-600 border-b">Unvan</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="px-1 py-0.5 border-b"><input value={firmFilters.group_name} onChange={e => setFirmFilters({ ...firmFilters, group_name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={firmFilters.firma_adi} onChange={e => setFirmFilters({ ...firmFilters, firma_adi: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={firmFilters.unvan} onChange={e => setFirmFilters({ ...firmFilters, unvan: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  onClick={() => setSelectedFirmId(null)}
                  className={`cursor-pointer border-b border-gray-100 ${selectedFirmId === null ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-2 py-1.5" colSpan={3}>Tüm Firmalar</td>
                </tr>
                {filteredFirms.map(f => (
                  <tr
                    key={f.id}
                    onClick={() => setSelectedFirmId(f.id)}
                    className={`cursor-pointer border-b border-gray-100 ${selectedFirmId === f.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-2 py-1.5">{f.group_name || ''}</td>
                    <td className="px-2 py-1.5">{f.firma_adi}</td>
                    <td className="px-2 py-1.5">{f.unvan || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ORTA PANEL - Otomatlar Tablosu + Form */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Otomatlar Tablosu */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
            <div className="p-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">
                OTOMATLAR ({filteredMachines.length})
                {selectedMachine && <span className="ml-2 text-blue-600">| Otomat No: {selectedMachine.machine_no}</span>}
              </span>
              {selectedMachine && (
                <button onClick={handleDeactivate} className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                  Otomatı Pasif Yap
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Seri No</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Otom. Model</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Otom. Tipi</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Otom. Bölge</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">İç.Grup</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Sat.Kota</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Tanımlı Yandolap Depo</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="px-1 py-0.5 border-b"><input value={machineFilters.serial_no} onChange={e => setMachineFilters({ ...machineFilters, serial_no: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                    <th className="px-1 py-0.5 border-b"><input value={machineFilters.model_name} onChange={e => setMachineFilters({ ...machineFilters, model_name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                    <th className="px-1 py-0.5 border-b"><input value={machineFilters.type_name} onChange={e => setMachineFilters({ ...machineFilters, type_name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                    <th className="px-1 py-0.5 border-b"><input value={machineFilters.region_name} onChange={e => setMachineFilters({ ...machineFilters, region_name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                    <th className="px-1 py-0.5 border-b"><input value={machineFilters.drink_group_name} onChange={e => setMachineFilters({ ...machineFilters, drink_group_name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                    <th className="px-1 py-0.5 border-b"><input value={machineFilters.sales_quota} onChange={e => setMachineFilters({ ...machineFilters, sales_quota: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                    <th className="px-1 py-0.5 border-b"><input value={machineFilters.yandolap_depo} onChange={e => setMachineFilters({ ...machineFilters, yandolap_depo: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMachines.map(m => (
                    <tr
                      key={m.id}
                      onClick={() => handleMachineSelect(m)}
                      className={`cursor-pointer border-b border-gray-100 ${selectedMachine?.id === m.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'} ${m.status === 'inactive' ? 'opacity-40' : ''}`}
                    >
                      <td className="px-2 py-1.5">{m.serial_no || ''}</td>
                      <td className="px-2 py-1.5">{m.model_name || ''}</td>
                      <td className="px-2 py-1.5">{m.type_name || ''}</td>
                      <td className="px-2 py-1.5">{m.region_name || ''}</td>
                      <td className="px-2 py-1.5">{m.drink_group_name || ''}</td>
                      <td className="px-2 py-1.5">{m.sales_quota ?? ''}</td>
                      <td className="px-2 py-1.5">{m.yandolap_depo || ''}</td>
                    </tr>
                  ))}
                  {filteredMachines.length === 0 && (
                    <tr><td colSpan={7} className="px-2 py-6 text-center text-gray-400">Otomat bulunamadı</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Otomat Detay Formu */}
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="grid grid-cols-3 gap-3">
              {/* Sol kolon */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-red-600 w-24 flex-shrink-0">OTOMAT NO</label>
                  <input value={form.machine_no} onChange={e => setForm({ ...form, machine_no: e.target.value })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">OTOMAT ADI</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-red-600 w-24 flex-shrink-0">SERİ NUMARASI</label>
                  <input value={form.serial_no} onChange={e => setForm({ ...form, serial_no: e.target.value })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">OTOMAT MODELİ</label>
                  <select value={form.otomat_model_id || ''} onChange={e => setForm({ ...form, otomat_model_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                    <option value="">Seçiniz</option>
                    {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <input value={newModelName} onChange={e => setNewModelName(e.target.value)} placeholder="Yeni" className="w-16 text-[10px] border border-gray-300 rounded px-1 py-1" onKeyDown={e => e.key === 'Enter' && handleAddModel()} />
                    <button onClick={handleAddModel} className="px-1.5 py-1 bg-green-500 text-white rounded text-[10px]">Ekle</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">OTOMAT BÖLGE</label>
                  <select value={form.otomat_region_id || ''} onChange={e => setForm({ ...form, otomat_region_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                    <option value="">Seçiniz</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <input value={newRegionName} onChange={e => setNewRegionName(e.target.value)} placeholder="Yeni" className="w-16 text-[10px] border border-gray-300 rounded px-1 py-1" onKeyDown={e => e.key === 'Enter' && handleAddRegion()} />
                    <button onClick={handleAddRegion} className="px-1.5 py-1 bg-green-500 text-white rounded text-[10px]">Ekle</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">OTOMAT TİPİ</label>
                  <select value={form.otomat_type_id || ''} onChange={e => setForm({ ...form, otomat_type_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                    <option value="">Seçiniz</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">ADRES</label>
                  <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-orange-600 w-24 flex-shrink-0">SATIŞ KOTASI</label>
                  <input type="number" step="0.01" value={form.sales_quota} onChange={e => setForm({ ...form, sales_quota: Number(e.target.value) })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">OTOM. SORUML.</label>
                  <select value={form.responsible_user_id || ''} onChange={e => setForm({ ...form, responsible_user_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                    <option value="">Seçiniz</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name} {u.surname || ''}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">DOLUM VAR MI?</label>
                  <select value={form.is_filling} onChange={e => setForm({ ...form, is_filling: Number(e.target.value) })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                    <option value={1}>EVET</option>
                    <option value={0}>HAYIR</option>
                  </select>
                </div>
              </div>

              {/* Orta kolon */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">KREDİ KARTI</label>
                  <select value={form.credit_card} onChange={e => setForm({ ...form, credit_card: Number(e.target.value) })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                    <option value={0}>HAYIR</option>
                    <option value={1}>EVET</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">BARDAK KPS.</label>
                  <input type="number" value={form.cup_capacity_1} onChange={e => setForm({ ...form, cup_capacity_1: Number(e.target.value) })} className="w-16 text-xs border border-gray-300 rounded px-2 py-1" />
                  <input type="number" value={form.cup_capacity_2} onChange={e => setForm({ ...form, cup_capacity_2: Number(e.target.value) })} className="w-16 text-xs border border-gray-300 rounded px-2 py-1" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">FİRMA</label>
                  <select value={form.firm_id || ''} onChange={e => setForm({ ...form, firm_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                    <option value="">Seçiniz</option>
                    {firms.map(f => <option key={f.id} value={f.id}>{f.firma_adi}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">YANDOLAP DEPO</label>
                  <input value={form.yandolap_depo} onChange={e => setForm({ ...form, yandolap_depo: e.target.value })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">DİA DEPO</label>
                  <input value={form.dia_depo} onChange={e => setForm({ ...form, dia_depo: e.target.value })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">İÇECEK GRUBU</label>
                  <select value={form.drink_group_id || ''} onChange={e => setForm({ ...form, drink_group_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                    <option value="">Seçiniz</option>
                    {drinkGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">OTOMAT GRUBU</label>
                  <select value={form.otomat_group_id || ''} onChange={e => setForm({ ...form, otomat_group_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                    <option value="">Seçiniz</option>
                    {otomatGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">TANIMLI DEPO</label>
                  <select value={form.warehouse_id || ''} onChange={e => setForm({ ...form, warehouse_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                    <option value="">Seçiniz</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Sağ kolon - Butonlar */}
              <div className="flex flex-col gap-2 justify-center items-center">
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" checked={isNew} onChange={() => handleNewMachine()} />
                    Yeni Oluştur
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="radio" checked={!isNew} readOnly />
                    Güncelle
                  </label>
                </div>
                <button onClick={handleSave} className="w-full px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600">
                  {isNew ? 'YENİ OTOMAT OLUŞTUR' : 'OTOMAT BİLGİLERİNİ GÜNCELLE'}
                </button>
                <button onClick={handleNewMachine} className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">
                  Formu Temizle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
