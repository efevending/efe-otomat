import { useEffect, useState } from 'react';
import { Tag, Download, Plus } from 'lucide-react';
import api from '../../api/client';

interface Firm {
  id: number;
  firma_adi: string;
  group_name: string | null;
  price_list_name: string;
}

interface ProductPrice {
  id: number;
  name: string;
  cost_price: number;
  default_sale_price: number;
  variety_name: string | null;
  firm_sale_price: number | null;
}

interface PriceList {
  id: number;
  name: string;
}

export default function UrunFiyatTanimlama() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [products, setProducts] = useState<ProductPrice[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);

  const [selectedFirmIds, setSelectedFirmIds] = useState<number[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductPrice | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [selectedPriceListId, setSelectedPriceListId] = useState<number | null>(null);

  // Filtreler
  const [firmFilter, setFirmFilter] = useState({ group: '', name: '', list: '' });
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState({ name: '', variety: '' });

  // Yeni fiyat listesi ekleme
  const [newListName, setNewListName] = useState('');

  // Fiyat gösterim firmId (ilk seçili firma)
  const displayFirmId = selectedFirmIds.length > 0 ? selectedFirmIds[0] : null;

  useEffect(() => {
    loadFirms();
    loadPriceLists();
  }, []);

  useEffect(() => {
    if (displayFirmId) loadProducts();
    else setProducts([]);
  }, [displayFirmId]);

  const loadFirms = async () => {
    const res = await api.get('/firms');
    setFirms(res.data);
  };

  const loadProducts = async () => {
    if (!displayFirmId) return;
    const res = await api.get(`/prices/products-with-prices/${displayFirmId}`);
    setProducts(res.data);
  };

  const loadPriceLists = async () => {
    const res = await api.get('/prices/lists');
    setPriceLists(res.data);
  };

  // Firma çift tıkla → seçili listeye ekle
  const handleFirmDoubleClick = (firmId: number) => {
    setSelectedFirmIds(prev =>
      prev.includes(firmId) ? prev.filter(id => id !== firmId) : [...prev, firmId]
    );
  };

  const handleClearSelection = () => {
    setSelectedFirmIds([]);
    setSelectedProduct(null);
    setNewPrice('');
  };

  const handleProductSelect = (product: ProductPrice) => {
    setSelectedProduct(product);
    setNewPrice(product.firm_sale_price?.toString() || product.default_sale_price?.toString() || '0');
  };

  // Seçili firmalarda fiyat güncelle
  const handleUpdatePrice = async () => {
    if (!selectedProduct || selectedFirmIds.length === 0) return;
    const price = parseFloat(newPrice);
    if (isNaN(price)) return alert('Geçerli bir fiyat girin');

    try {
      await api.post('/prices/update-firms', {
        firm_ids: selectedFirmIds,
        product_id: selectedProduct.id,
        sale_price: price,
      });
      loadProducts();
      alert(`${selectedFirmIds.length} firmada fiyat güncellendi`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  // Fiyat listesini seçili firmalara uygula
  const handleApplyPriceList = async () => {
    if (!selectedPriceListId || selectedFirmIds.length === 0) {
      return alert('Fiyat listesi ve firma seçin');
    }
    if (!confirm(`Seçili ${selectedFirmIds.length} firmaya bu fiyat listesini uygulamak istediğinize emin misiniz?`)) return;

    try {
      await api.post(`/prices/lists/${selectedPriceListId}/apply`, {
        firm_ids: selectedFirmIds,
      });
      loadProducts();
      alert('Fiyat listesi uygulandı');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const handleAddPriceList = async () => {
    if (!newListName.trim()) return;
    await api.post('/prices/lists', { name: newListName.trim() });
    setNewListName('');
    loadPriceLists();
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const data = filteredProducts.map(p => ({
      'Ürün Adı': p.name,
      'Çeşidi': p.variety_name || '',
      'Alış': p.cost_price,
      'Satış': p.firm_sale_price ?? p.default_sale_price ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürün Fiyatları');
    XLSX.writeFile(wb, 'urun_fiyatlari.xlsx');
  };

  // Filtreleme
  const filteredFirms = firms.filter(f => {
    if (firmFilter.group && !(f.group_name || '').toLowerCase().includes(firmFilter.group.toLowerCase())) return false;
    if (firmFilter.name && !f.firma_adi.toLowerCase().includes(firmFilter.name.toLowerCase())) return false;
    if (firmFilter.list && !(f.price_list_name || '').toLowerCase().includes(firmFilter.list.toLowerCase())) return false;
    return true;
  });

  const filteredProducts = products.filter(p => {
    if (productSearch && !p.name.toLowerCase().includes(productSearch.toLowerCase())) return false;
    if (productFilter.name && !p.name.toLowerCase().includes(productFilter.name.toLowerCase())) return false;
    if (productFilter.variety && !(p.variety_name || '').toLowerCase().includes(productFilter.variety.toLowerCase())) return false;
    return true;
  });

  const selectedFirmNames = firms.filter(f => selectedFirmIds.includes(f.id)).map(f => f.firma_adi);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Tag className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Ürün Fiyat Tanımlama</h1>
      </div>

      <div className="flex gap-3 h-[calc(100vh-140px)]">
        {/* SOL PANEL - Firmalar */}
        <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col">
          <div className="p-2 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-700">FİRMALAR</span>
          </div>
          <div className="px-2 py-1 border-b border-gray-200">
            <p className="text-[10px] text-red-500 font-medium">LİSTEYE FİRMA EKLEMEK İÇİN FİRMA ADINA ÇİFT TIKLAYIN</p>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1 font-medium text-gray-600 border-b">Firma Grubu</th>
                  <th className="text-left px-2 py-1 font-medium text-gray-600 border-b">Firma Adı</th>
                  <th className="text-left px-2 py-1 font-medium text-gray-600 border-b">Fiyat Listesi</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="px-1 py-0.5 border-b"><input value={firmFilter.group} onChange={e => setFirmFilter({ ...firmFilter, group: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={firmFilter.name} onChange={e => setFirmFilter({ ...firmFilter, name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={firmFilter.list} onChange={e => setFirmFilter({ ...firmFilter, list: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                </tr>
              </thead>
              <tbody>
                {filteredFirms.map(f => (
                  <tr
                    key={f.id}
                    onDoubleClick={() => handleFirmDoubleClick(f.id)}
                    className={`cursor-pointer border-b border-gray-100 ${selectedFirmIds.includes(f.id) ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-2 py-1.5">{f.group_name || ''}</td>
                    <td className="px-2 py-1.5">{f.firma_adi}</td>
                    <td className="px-2 py-1.5">{f.price_list_name || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ORTA PANEL - Seçili Firmalar + Fiyat Güncelleme */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3">
          {/* Seçili Firmalar */}
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col flex-1">
            <div className="p-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">SEÇİLİ FİRMALAR</span>
              <button onClick={handleClearSelection} className="px-2 py-1 bg-green-500 text-white rounded text-[10px] hover:bg-green-600">
                Listeyi Temizle
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {selectedFirmNames.length === 0 ? (
                <p className="text-xs text-gray-400 text-center mt-4">Firma seçilmedi</p>
              ) : (
                <div className="space-y-1">
                  {selectedFirmNames.map((name, i) => (
                    <div key={i} className="text-xs bg-blue-50 px-2 py-1 rounded">{name}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fiyat Güncelleme */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <p className="text-[10px] text-yellow-800 font-bold">DİKKAT</p>
              <p className="text-[10px] text-yellow-700">Yukarıda seçili olan firmaların hepsinde aşağıdaki ürünün fiyatı güncellenecektir.</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Ürün Adı</label>
              <p className="text-xs mt-0.5 bg-gray-50 rounded px-2 py-1.5 min-h-[28px]">{selectedProduct?.name || '-'}</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Fiyatı</label>
              <input
                type="number"
                step="0.01"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5"
                disabled={!selectedProduct}
              />
              <button
                onClick={handleUpdatePrice}
                disabled={!selectedProduct || selectedFirmIds.length === 0}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
              >
                Güncelle
              </button>
            </div>
            <p className="text-[10px] text-gray-400">TL</p>
          </div>

          {/* Standart Fiyat Listeleri */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-700 text-center">STANDART ÜRÜN FİYAT LİSTELERİ</p>
            <div className="flex gap-1">
              <select
                value={selectedPriceListId || ''}
                onChange={e => setSelectedPriceListId(e.target.value ? Number(e.target.value) : null)}
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5"
              >
                <option value="">Seçiniz</option>
                {priceLists.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
              </select>
              <div className="flex gap-1">
                <input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Yeni" className="w-16 text-[10px] border border-gray-300 rounded px-1 py-1.5" onKeyDown={e => e.key === 'Enter' && handleAddPriceList()} />
                <button onClick={handleAddPriceList} className="w-6 h-6 bg-red-500 text-white rounded flex items-center justify-center hover:bg-red-600">
                  <Plus size={12} />
                </button>
              </div>
            </div>
            <button
              onClick={handleApplyPriceList}
              disabled={!selectedPriceListId || selectedFirmIds.length === 0}
              className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"
            >
              SEÇİLİ FİRMALARDA GÜNCELLE
            </button>
          </div>
        </div>

        {/* SAĞ PANEL - Ürün Fiyatları */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-w-0">
          <div className="p-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">ÜRÜN FİYATLARI</span>
            <button onClick={handleExportExcel} className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-[10px] hover:bg-green-600">
              <Download size={10} /> Excel'e Gönder
            </button>
          </div>
          <div className="px-2 py-1 border-b border-gray-200">
            <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Ara..." className="w-full text-xs border border-gray-300 rounded px-2 py-1" />
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Ürün Adı</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b w-24">Çeşidi</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b w-16">Alış</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b w-16">Satış</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="px-1 py-0.5 border-b"><input value={productFilter.name} onChange={e => setProductFilter({ ...productFilter, name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={productFilter.variety} onChange={e => setProductFilter({ ...productFilter, variety: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b" colSpan={2}></th>
                </tr>
              </thead>
              <tbody>
                {displayFirmId ? (
                  filteredProducts.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => handleProductSelect(p)}
                      className={`cursor-pointer border-b border-gray-100 ${selectedProduct?.id === p.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-2 py-1.5">{p.name}</td>
                      <td className="px-2 py-1.5">{p.variety_name || ''}</td>
                      <td className="px-2 py-1.5">{p.cost_price?.toFixed(2) || '0,00'}</td>
                      <td className="px-2 py-1.5">{(p.firm_sale_price ?? p.default_sale_price ?? 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-2 py-8 text-center text-gray-400">Fiyatları görmek için sol panelden firma seçin</td></tr>
                )}
                {displayFirmId && filteredProducts.length === 0 && (
                  <tr><td colSpan={4} className="px-2 py-6 text-center text-gray-400">Ürün bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
