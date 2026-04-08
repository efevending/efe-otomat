import { useEffect, useState } from 'react';
import { Warehouse as WarehouseIcon } from 'lucide-react';
import api from '../../api/client';

interface Warehouse {
  id: number;
  name: string;
  type: string;
  special_code: string;
  vehicle_id: number | null;
  vehicle_plate: string | null;
  vehicle_driver_name: string | null;
}

interface Vehicle {
  id: number;
  plate: string;
  driver_name: string;
  notes: string;
}

const DEPO_TYPES = [
  { value: 'sanal', label: 'HAREKETLİ DEPO (ARAÇ)' },
  { value: 'sabit', label: 'SABİT DEPO' },
];

const typeLabel = (type: string) => DEPO_TYPES.find(d => d.value === type)?.label || type;

type TabType = 'depo' | 'arac';

export default function DepoTanimlama() {
  const [activeTab, setActiveTab] = useState<TabType>('depo');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Depo state
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [depoForm, setDepoForm] = useState({ name: '', type: 'sanal', special_code: '', vehicle_id: '' as number | '' });
  const [isNewDepo, setIsNewDepo] = useState(true);
  const [depoFilters, setDepoFilters] = useState({ name: '', special_code: '', type: '', vehicle: '' });

  // Araç state
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [aracForm, setAracForm] = useState({ plate: '', driver_name: '', notes: '' });
  const [isNewArac, setIsNewArac] = useState(true);
  const [aracFilters, setAracFilters] = useState({ plate: '', driver_name: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [whRes, vhRes] = await Promise.all([
      api.get('/warehouses'),
      api.get('/vehicles'),
    ]);
    setWarehouses(whRes.data);
    setVehicles(vhRes.data);
  };

  // === DEPO ===
  const handleSelectDepo = (w: Warehouse) => {
    setSelectedWarehouse(w);
    setIsNewDepo(false);
    setDepoForm({ name: w.name, type: w.type, special_code: w.special_code || '', vehicle_id: w.vehicle_id || '' });
  };

  const handleNewDepo = () => {
    setSelectedWarehouse(null);
    setIsNewDepo(true);
    setDepoForm({ name: '', type: 'sanal', special_code: '', vehicle_id: '' });
  };

  const handleSaveDepo = async () => {
    if (!depoForm.name.trim()) return alert('Depo adı zorunlu');
    try {
      const payload = { name: depoForm.name, type: depoForm.type, special_code: depoForm.special_code, vehicle_id: depoForm.vehicle_id || null };
      if (isNewDepo) {
        await api.post('/warehouses', payload);
      } else if (selectedWarehouse) {
        await api.put(`/warehouses/${selectedWarehouse.id}`, payload);
      }
      loadAll();
      handleNewDepo();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const handleDeleteDepo = async () => {
    if (!selectedWarehouse) return;
    if (!confirm('Bu depoyu silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/warehouses/${selectedWarehouse.id}`);
      loadAll();
      handleNewDepo();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const getTanimliArac = (w: Warehouse) => {
    if (w.vehicle_plate) {
      return w.vehicle_driver_name ? `${w.vehicle_driver_name} - ${w.vehicle_plate}` : w.vehicle_plate;
    }
    return '-';
  };

  const filteredWarehouses = warehouses.filter(w => {
    if (w.type === 'tedarikci') return false;
    if (depoFilters.name && !w.name.toLowerCase().includes(depoFilters.name.toLowerCase())) return false;
    if (depoFilters.special_code && !(w.special_code || '').toLowerCase().includes(depoFilters.special_code.toLowerCase())) return false;
    if (depoFilters.type && !typeLabel(w.type).toLowerCase().includes(depoFilters.type.toLowerCase())) return false;
    if (depoFilters.vehicle && !getTanimliArac(w).toLowerCase().includes(depoFilters.vehicle.toLowerCase())) return false;
    return true;
  });

  // === ARAÇ ===
  const handleSelectArac = (v: Vehicle) => {
    setSelectedVehicle(v);
    setIsNewArac(false);
    setAracForm({ plate: v.plate, driver_name: v.driver_name || '', notes: v.notes || '' });
  };

  const handleNewArac = () => {
    setSelectedVehicle(null);
    setIsNewArac(true);
    setAracForm({ plate: '', driver_name: '', notes: '' });
  };

  const handleSaveArac = async () => {
    if (!aracForm.plate.trim()) return alert('Plaka zorunlu');
    try {
      if (isNewArac) {
        await api.post('/vehicles', aracForm);
      } else if (selectedVehicle) {
        await api.put(`/vehicles/${selectedVehicle.id}`, aracForm);
      }
      loadAll();
      handleNewArac();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const handleDeleteArac = async () => {
    if (!selectedVehicle) return;
    if (!confirm('Bu aracı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/vehicles/${selectedVehicle.id}`);
      loadAll();
      handleNewArac();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    if (aracFilters.plate && !v.plate.toLowerCase().includes(aracFilters.plate.toLowerCase())) return false;
    if (aracFilters.driver_name && !(v.driver_name || '').toLowerCase().includes(aracFilters.driver_name.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <WarehouseIcon className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Depo Tanımlama</h1>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-0 mb-4">
        <button
          onClick={() => setActiveTab('depo')}
          className={`px-5 py-2 text-sm font-bold border rounded-l-lg ${activeTab === 'depo' ? 'bg-teal-700 text-white border-teal-700' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`}
        >
          DEPO EKLE
        </button>
        <button
          onClick={() => setActiveTab('arac')}
          className={`px-5 py-2 text-sm font-bold border rounded-r-lg ${activeTab === 'arac' ? 'bg-teal-700 text-white border-teal-700' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`}
        >
          ARAÇ EKLE
        </button>
      </div>

      {/* DEPO SEKMESİ */}
      {activeTab === 'depo' && (
        <div className="flex flex-col gap-4 h-[calc(100vh-200px)]">
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
            <div className="p-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Depolar ({filteredWarehouses.length})</span>
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
                    <th className="px-2 py-1 border-b"><input value={depoFilters.name} onChange={e => setDepoFilters({ ...depoFilters, name: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                    <th className="px-2 py-1 border-b"><input value={depoFilters.special_code} onChange={e => setDepoFilters({ ...depoFilters, special_code: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                    <th className="px-2 py-1 border-b"><input value={depoFilters.type} onChange={e => setDepoFilters({ ...depoFilters, type: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                    <th className="px-2 py-1 border-b"><input value={depoFilters.vehicle} onChange={e => setDepoFilters({ ...depoFilters, vehicle: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarehouses.map(w => (
                    <tr key={w.id} onClick={() => handleSelectDepo(w)}
                      className={`cursor-pointer border-b border-gray-100 ${selectedWarehouse?.id === w.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}>
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

          {/* Depo Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">DEPO ADI</label>
                  <input value={depoForm.name} onChange={e => setDepoForm({ ...depoForm, name: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">DEPO ÖZEL KOD</label>
                  <input value={depoForm.special_code} onChange={e => setDepoForm({ ...depoForm, special_code: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
                </div>
              </div>
              <div className="col-span-4 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">DEPO TİPİ</label>
                  <select value={depoForm.type} onChange={e => setDepoForm({ ...depoForm, type: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                    {DEPO_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">TANIMLI ARAÇ</label>
                  <select value={depoForm.vehicle_id} onChange={e => setDepoForm({ ...depoForm, vehicle_id: Number(e.target.value) || '' })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                    <option value="">-- Seçiniz --</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.driver_name ? `${v.driver_name} - ${v.plate}` : v.plate}</option>)}
                  </select>
                </div>
              </div>
              <div className="col-span-4 flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1 text-sm"><input type="radio" checked={isNewDepo} onChange={() => handleNewDepo()} /> Yeni</label>
                  <label className="flex items-center gap-1 text-sm"><input type="radio" checked={!isNewDepo} readOnly /> Güncelle</label>
                </div>
                <button onClick={handleSaveDepo} className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
                  {isNewDepo ? 'DEPO EKLE' : 'GÜNCELLE'}
                </button>
                {!isNewDepo && (
                  <button onClick={handleDeleteDepo} className="w-full px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600">Depoyu Sil</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARAÇ SEKMESİ */}
      {activeTab === 'arac' && (
        <div className="flex flex-col gap-4 h-[calc(100vh-200px)]">
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
            <div className="p-2 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Araçlar ({filteredVehicles.length})</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-amber-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-700 border-b">PLAKA</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700 border-b">SÜRÜCÜ ADI</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700 border-b">NOT</th>
                  </tr>
                  <tr className="bg-amber-50">
                    <th className="px-2 py-1 border-b"><input value={aracFilters.plate} onChange={e => setAracFilters({ ...aracFilters, plate: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                    <th className="px-2 py-1 border-b"><input value={aracFilters.driver_name} onChange={e => setAracFilters({ ...aracFilters, driver_name: e.target.value })} placeholder="Filtre..." className="w-full text-xs border border-gray-300 rounded px-2 py-1 font-normal" /></th>
                    <th className="px-2 py-1 border-b"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(v => (
                    <tr key={v.id} onClick={() => handleSelectArac(v)}
                      className={`cursor-pointer border-b border-gray-100 ${selectedVehicle?.id === v.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}>
                      <td className="px-3 py-2">{v.plate}</td>
                      <td className="px-3 py-2">{v.driver_name || ''}</td>
                      <td className="px-3 py-2">{v.notes || ''}</td>
                    </tr>
                  ))}
                  {filteredVehicles.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">Araç bulunamadı</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Araç Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">PLAKA</label>
                  <input value={aracForm.plate} onChange={e => setAracForm({ ...aracForm, plate: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" placeholder="34 ABC 123" />
                </div>
              </div>
              <div className="col-span-4 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">SÜRÜCÜ ADI</label>
                  <input value={aracForm.driver_name} onChange={e => setAracForm({ ...aracForm, driver_name: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-600 w-28 flex-shrink-0">NOT</label>
                  <input value={aracForm.notes} onChange={e => setAracForm({ ...aracForm, notes: e.target.value })} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5" />
                </div>
              </div>
              <div className="col-span-4 flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1 text-sm"><input type="radio" checked={isNewArac} onChange={() => handleNewArac()} /> Yeni</label>
                  <label className="flex items-center gap-1 text-sm"><input type="radio" checked={!isNewArac} readOnly /> Güncelle</label>
                </div>
                <button onClick={handleSaveArac} className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
                  {isNewArac ? 'ARAÇ EKLE' : 'GÜNCELLE'}
                </button>
                {!isNewArac && (
                  <button onClick={handleDeleteArac} className="w-full px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600">Aracı Sil</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
