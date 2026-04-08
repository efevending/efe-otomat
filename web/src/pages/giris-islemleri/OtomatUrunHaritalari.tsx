import { useEffect, useState } from 'react';
import { Map, Download, Copy } from 'lucide-react';
import api from '../../api/client';

interface Firm {
  id: number;
  firma_adi: string;
  group_name: string | null;
}

interface Machine {
  id: number;
  machine_no: string;
  name: string;
  model_name: string | null;
  region_name: string | null;
  firm_id: number | null;
}

interface SpiralMap {
  id: number;
  spiral_number: number;
  product_id: number | null;
  product_name: string | null;
  brand_name: string | null;
  sale_price: number;
  capacity: number;
}

interface Product {
  id: number;
  name: string;
  brand_name: string | null;
  sale_price: number;
  default_spiral_capacity: number;
  active: number;
}

export default function OtomatUrunHaritalari() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [spiralMaps, setSpiralMaps] = useState<SpiralMap[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedFirmId, setSelectedFirmId] = useState<number | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  // Filtreler
  const [firmFilter, setFirmFilter] = useState({ firma_adi: '', group_name: '' });
  const [machineFilter, setMachineFilter] = useState({ model: '', region: '' });
  const [spiralFilter, setSpiralFilter] = useState({ spiral: '', name: '', brand: '' });
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState({ name: '', brand: '' });

  // Kopyalama
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyTargetId, setCopyTargetId] = useState<number | null>(null);

  useEffect(() => {
    loadFirms();
    loadProducts();
  }, []);

  useEffect(() => {
    loadMachines();
  }, [selectedFirmId]);

  useEffect(() => {
    if (selectedMachine) loadSpiralMaps();
    else setSpiralMaps([]);
  }, [selectedMachine]);

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

  const loadProducts = async () => {
    const res = await api.get('/products');
    setProducts(res.data);
  };

  const loadSpiralMaps = async () => {
    if (!selectedMachine) return;
    const res = await api.get(`/product-maps/${selectedMachine.id}`);
    setSpiralMaps(res.data.maps);
  };

  const handleFirmSelect = (firmId: number | null) => {
    setSelectedFirmId(firmId);
    setSelectedMachine(null);
  };

  const handleMachineSelect = (m: Machine) => {
    setSelectedMachine(m);
  };

  // Ürüne çift tıkla → spirale ekle
  const handleAddProduct = async (product: Product) => {
    if (!selectedMachine) return alert('Önce bir otomat seçin');

    // Sonraki boş spiral numarasını bul
    const usedSpirals = spiralMaps.map(s => s.spiral_number);
    let nextSpiral = 1;
    while (usedSpirals.includes(nextSpiral)) nextSpiral++;

    try {
      await api.post(`/product-maps/${selectedMachine.id}/spiral`, {
        spiral_number: nextSpiral,
        product_id: product.id,
        capacity: product.default_spiral_capacity || 6,
        sale_price: product.sale_price || 0,
      });
      loadSpiralMaps();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  // Spiral'e çift tıkla → ürünü çıkar
  const handleRemoveSpiral = async (spiralNumber: number) => {
    if (!selectedMachine) return;
    if (!confirm(`Spiral ${spiralNumber} ürününü çıkarmak istediğinize emin misiniz?`)) return;
    await api.delete(`/product-maps/${selectedMachine.id}/spiral/${spiralNumber}`);
    loadSpiralMaps();
  };

  // Listeyi kopyala
  const handleCopyList = async () => {
    if (!selectedMachine || !copyTargetId) return;
    try {
      await api.post(`/product-maps/${selectedMachine.id}/copy-to/${copyTargetId}`);
      alert('Liste başarıyla kopyalandı');
      setShowCopyDialog(false);
      setCopyTargetId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const handleExportExcel = async () => {
    if (!selectedMachine || spiralMaps.length === 0) return;
    const XLSX = await import('xlsx');
    const data = spiralMaps.filter(s => s.product_id).map(s => ({
      'Spiral No': s.spiral_number,
      'Ürün Adı': s.product_name || '',
      'Marka': s.brand_name || '',
      'Satış Fiyatı': s.sale_price,
      'Spiral Kap.': s.capacity,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürün Haritası');
    XLSX.writeFile(wb, `otomat_${selectedMachine.machine_no}_harita.xlsx`);
  };

  // Firma filtreleme
  const filteredFirms = firms.filter(f => {
    if (firmFilter.firma_adi && !f.firma_adi.toLowerCase().includes(firmFilter.firma_adi.toLowerCase())) return false;
    if (firmFilter.group_name && !(f.group_name || '').toLowerCase().includes(firmFilter.group_name.toLowerCase())) return false;
    return true;
  });

  // Makina filtreleme
  const filteredMachines = machines.filter(m => {
    if (machineFilter.model && !(m.model_name || '').toLowerCase().includes(machineFilter.model.toLowerCase())) return false;
    if (machineFilter.region && !(m.region_name || '').toLowerCase().includes(machineFilter.region.toLowerCase())) return false;
    return true;
  });

  // Spiral filtreleme
  const filteredSpirals = spiralMaps.filter(s => {
    if (!s.product_id) return false;
    if (spiralFilter.name && !(s.product_name || '').toLowerCase().includes(spiralFilter.name.toLowerCase())) return false;
    if (spiralFilter.brand && !(s.brand_name || '').toLowerCase().includes(spiralFilter.brand.toLowerCase())) return false;
    return true;
  });

  // Ürün filtreleme
  const filteredProducts = products.filter(p => {
    if (productSearch && !p.name.toLowerCase().includes(productSearch.toLowerCase()) && !(p.brand_name || '').toLowerCase().includes(productSearch.toLowerCase())) return false;
    if (productFilter.name && !p.name.toLowerCase().includes(productFilter.name.toLowerCase())) return false;
    if (productFilter.brand && !(p.brand_name || '').toLowerCase().includes(productFilter.brand.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Map className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Otomat Ürün Haritaları</h1>
      </div>

      <div className="flex gap-3 h-[calc(100vh-140px)]">
        {/* SOL PANEL - Firmalar + Cihazlar */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-3">
          {/* Firmalar */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
            <div className="p-2 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-700">Firmalar</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1 font-medium text-gray-600 border-b">Firma Adı</th>
                    <th className="text-left px-2 py-1 font-medium text-gray-600 border-b">F. Grup</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="px-1 py-0.5 border-b"><input value={firmFilter.firma_adi} onChange={e => setFirmFilter({ ...firmFilter, firma_adi: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                    <th className="px-1 py-0.5 border-b"><input value={firmFilter.group_name} onChange={e => setFirmFilter({ ...firmFilter, group_name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  </tr>
                </thead>
                <tbody>
                  <tr onClick={() => handleFirmSelect(null)} className={`cursor-pointer border-b border-gray-100 ${selectedFirmId === null ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}>
                    <td className="px-2 py-1.5" colSpan={2}>Tüm Firmalar</td>
                  </tr>
                  {filteredFirms.map(f => (
                    <tr key={f.id} onClick={() => handleFirmSelect(f.id)} className={`cursor-pointer border-b border-gray-100 ${selectedFirmId === f.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}>
                      <td className="px-2 py-1.5">{f.firma_adi}</td>
                      <td className="px-2 py-1.5">{f.group_name || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cihazlar */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
            <div className="p-2 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-700">Cihazlar</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1 font-medium text-gray-600 border-b">Cihaz Modeli</th>
                    <th className="text-left px-2 py-1 font-medium text-gray-600 border-b">Bölge</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="px-1 py-0.5 border-b"><input value={machineFilter.model} onChange={e => setMachineFilter({ ...machineFilter, model: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                    <th className="px-1 py-0.5 border-b"><input value={machineFilter.region} onChange={e => setMachineFilter({ ...machineFilter, region: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMachines.map(m => (
                    <tr key={m.id} onClick={() => handleMachineSelect(m)} className={`cursor-pointer border-b border-gray-100 ${selectedMachine?.id === m.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}>
                      <td className="px-2 py-1.5">{m.model_name || m.name}</td>
                      <td className="px-2 py-1.5">{m.region_name || ''}</td>
                    </tr>
                  ))}
                  {filteredMachines.length === 0 && (
                    <tr><td colSpan={2} className="px-2 py-4 text-center text-gray-400">Cihaz yok</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ORTA PANEL - Spiral Ürün Haritası */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-w-0">
          <div className="p-2 border-b border-gray-200 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-700">Cihaz Ürün Tanımlamaları</span>
            <div className="flex-1" />
            {selectedMachine && (
              <>
                <button onClick={() => setShowCopyDialog(true)} className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600">
                  <Copy size={10} /> Listeyi Kopyala
                </button>
                <button onClick={handleExportExcel} className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-[10px] hover:bg-green-600">
                  <Download size={10} /> Excel
                </button>
                <button onClick={loadSpiralMaps} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-[10px] hover:bg-gray-300">
                  Listeyi Yenile
                </button>
              </>
            )}
          </div>

          {/* Kopyalama Dialog */}
          {showCopyDialog && (
            <div className="p-2 border-b border-gray-200 bg-blue-50 flex items-center gap-2">
              <span className="text-xs text-gray-700">Hedef otomat:</span>
              <select value={copyTargetId || ''} onChange={e => setCopyTargetId(e.target.value ? Number(e.target.value) : null)} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                <option value="">Seçiniz</option>
                {machines.filter(m => m.id !== selectedMachine?.id).map(m => (
                  <option key={m.id} value={m.id}>{m.model_name || m.name} - {m.region_name || m.machine_no}</option>
                ))}
              </select>
              <button onClick={handleCopyList} disabled={!copyTargetId} className="px-2 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50">Kopyala</button>
              <button onClick={() => { setShowCopyDialog(false); setCopyTargetId(null); }} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">İptal</button>
            </div>
          )}

          {!selectedMachine ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Sol panelden bir cihaz seçin
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b w-16">Spiral No</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Ürün Adı</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b w-20">Marka</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b w-20">Satış Fiy.</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b w-16">Spir.</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="px-1 py-0.5 border-b"><input value={spiralFilter.spiral} onChange={e => setSpiralFilter({ ...spiralFilter, spiral: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                    <th className="px-1 py-0.5 border-b"><input value={spiralFilter.name} onChange={e => setSpiralFilter({ ...spiralFilter, name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                    <th className="px-1 py-0.5 border-b"><input value={spiralFilter.brand} onChange={e => setSpiralFilter({ ...spiralFilter, brand: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                    <th className="px-1 py-0.5 border-b" colSpan={2}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpirals.map(s => (
                    <tr
                      key={s.spiral_number}
                      onDoubleClick={() => handleRemoveSpiral(s.spiral_number)}
                      className="cursor-pointer border-b border-gray-100 hover:bg-red-50"
                      title="Çıkarmak için çift tıklayın"
                    >
                      <td className="px-2 py-1.5 font-medium">{s.spiral_number}</td>
                      <td className="px-2 py-1.5">{s.product_name || ''}</td>
                      <td className="px-2 py-1.5">{s.brand_name || ''}</td>
                      <td className="px-2 py-1.5">{s.sale_price?.toFixed(4) || '0'}</td>
                      <td className="px-2 py-1.5">{s.capacity}</td>
                    </tr>
                  ))}
                  {filteredSpirals.length === 0 && (
                    <tr><td colSpan={5} className="px-2 py-6 text-center text-gray-400">
                      {spiralMaps.length === 0 ? 'Bu otomata henüz ürün eklenmemiş' : 'Filtre sonucu bulunamadı'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-2 border-t border-gray-200">
            <p className="text-[10px] text-red-500 font-medium">LİSTEDEN ÜRÜN ÇIKARMAK İÇİN ÜRÜNE ÇİFT TIKLAYIN</p>
          </div>
        </div>

        {/* SAĞ PANEL - Ürünler */}
        <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col">
          <div className="p-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">Ürünler</span>
          </div>
          <div className="px-2 py-1 border-b border-gray-200">
            <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Ara..." className="w-full text-xs border border-gray-300 rounded px-2 py-1" />
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Ürün Adı</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b w-16">Marka</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b w-16">Satış Fiy.</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b w-12">V.Sp.</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="px-1 py-0.5 border-b"><input value={productFilter.name} onChange={e => setProductFilter({ ...productFilter, name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={productFilter.brand} onChange={e => setProductFilter({ ...productFilter, brand: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b" colSpan={2}></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr
                    key={p.id}
                    onDoubleClick={() => handleAddProduct(p)}
                    className="cursor-pointer border-b border-gray-100 hover:bg-green-50"
                    title="Eklemek için çift tıklayın"
                  >
                    <td className="px-2 py-1.5">{p.name}</td>
                    <td className="px-2 py-1.5">{p.brand_name || ''}</td>
                    <td className="px-2 py-1.5">{p.sale_price?.toFixed(4) || '0'}</td>
                    <td className="px-2 py-1.5">{p.default_spiral_capacity || ''}</td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={4} className="px-2 py-6 text-center text-gray-400">Ürün bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-2 border-t border-gray-200">
            <p className="text-[10px] text-red-500 font-medium">LİSTEYE ÜRÜN EKLEMEK İÇİN ÜRÜNE ÇİFT TIKLAYIN</p>
          </div>
        </div>
      </div>
    </div>
  );
}
