import { useEffect, useState } from 'react';
import { Package, Download, EyeOff, Eye } from 'lucide-react';
import api from '../../api/client';

interface LookupItem { id: number; name: string; }

interface Product {
  id: number;
  name: string;
  short_name: string;
  barcode: string;
  box_barcode: string;
  case_barcode: string;
  product_type_id: number | null;
  type_name: string | null;
  brand_id: number | null;
  brand_name: string | null;
  variety_id: number | null;
  variety_name: string | null;
  unit_type: string;
  unit_value: string;
  kdv_rate: number;
  cost_price: number;
  sale_price: number;
  default_unit: string;
  shelf_life: string;
  case_quantity: number;
  box_quantity: number;
  stock_no: string;
  default_spiral_capacity: number;
  active: number;
}

const unitTypes = ['GRAM', 'MİLİLİTRE', 'ADET', 'LİTRE', 'KİLOGRAM'];

const emptyForm = {
  name: '',
  short_name: '',
  barcode: '',
  box_barcode: '',
  case_barcode: '',
  product_type_id: null as number | null,
  brand_id: null as number | null,
  variety_id: null as number | null,
  unit_type: 'GRAM',
  unit_value: '',
  kdv_rate: 0,
  cost_price: 0,
  sale_price: 0,
  default_unit: '',
  shelf_life: '',
  case_quantity: 1,
  box_quantity: 1,
  stock_no: '',
  default_spiral_capacity: 8,
};

export default function UrunTanimlama() {
  const [products, setProducts] = useState<Product[]>([]);
  const [types, setTypes] = useState<LookupItem[]>([]);
  const [brands, setBrands] = useState<LookupItem[]>([]);
  const [varieties, setVarieties] = useState<LookupItem[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isNew, setIsNew] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch] = useState('');

  // Inline add
  const [newTypeName, setNewTypeName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newVarietyName, setNewVarietyName] = useState('');

  // Filtreler
  const [filters, setFilters] = useState({
    brand_name: '', name: '', type_name: '', shelf_life: '', case_quantity: '',
    cost_price: '', barcode: '', box_barcode: '', case_barcode: '', kdv_rate: '', unit_type: ''
  });

  useEffect(() => {
    loadProducts();
    loadLookups();
  }, [showHidden]);

  const loadProducts = async () => {
    const params: any = {};
    if (showHidden) params.show_hidden = '1';
    const res = await api.get('/products', { params });
    setProducts(res.data);
  };

  const loadLookups = async () => {
    const [typesRes, brandsRes, varietiesRes] = await Promise.all([
      api.get('/products/types'),
      api.get('/products/brands'),
      api.get('/products/varieties'),
    ]);
    setTypes(typesRes.data);
    setBrands(brandsRes.data);
    setVarieties(varietiesRes.data);
  };

  const handleProductSelect = (p: Product) => {
    setSelectedProduct(p);
    setIsNew(false);
    setForm({
      name: p.name,
      short_name: p.short_name || '',
      barcode: p.barcode || '',
      box_barcode: p.box_barcode || '',
      case_barcode: p.case_barcode || '',
      product_type_id: p.product_type_id,
      brand_id: p.brand_id,
      variety_id: p.variety_id,
      unit_type: p.unit_type || 'GRAM',
      unit_value: p.unit_value || '',
      kdv_rate: p.kdv_rate || 0,
      cost_price: p.cost_price || 0,
      sale_price: p.sale_price || 0,
      default_unit: p.default_unit || '',
      shelf_life: p.shelf_life || '',
      case_quantity: p.case_quantity || 1,
      box_quantity: p.box_quantity || 1,
      stock_no: p.stock_no || '',
      default_spiral_capacity: p.default_spiral_capacity || 8,
    });
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setIsNew(true);
    setForm({ ...emptyForm });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Ürün adı zorunlu');
    try {
      if (isNew) {
        await api.post('/products', form);
      } else if (selectedProduct) {
        await api.put(`/products/${selectedProduct.id}`, form);
      }
      loadProducts();
      handleNewProduct();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const handleHideProduct = async () => {
    if (!selectedProduct) return;
    if (!confirm('Bu ürünü gizlemek istediğinize emin misiniz?')) return;
    await api.delete(`/products/${selectedProduct.id}`);
    loadProducts();
    handleNewProduct();
  };

  const handleActivateProduct = async () => {
    if (!selectedProduct) return;
    await api.put(`/products/${selectedProduct.id}/activate`);
    loadProducts();
    handleNewProduct();
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    const res = await api.post('/products/types', { name: newTypeName.trim() });
    setNewTypeName('');
    setTypes(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) return;
    const res = await api.post('/products/brands', { name: newBrandName.trim() });
    setNewBrandName('');
    setBrands(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleAddVariety = async () => {
    if (!newVarietyName.trim()) return;
    const res = await api.post('/products/varieties', { name: newVarietyName.trim() });
    setNewVarietyName('');
    setVarieties(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const data = filteredProducts.map(p => ({
      'Marka': p.brand_name || '',
      'Ürün Adı': p.name,
      'Ürün Türü': p.type_name || '',
      'Raf Ömrü': p.shelf_life || '',
      '1 Koli Adet': p.case_quantity,
      'Alış Fiyatı': p.cost_price,
      'Adet Barkod': p.barcode || '',
      'Kutu Barkod': p.box_barcode || '',
      'Koli Barkod': p.case_barcode || '',
      'KDV': p.kdv_rate,
      'Birim': p.unit_type,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
    XLSX.writeFile(wb, 'urunler.xlsx');
  };

  // Filtreleme
  const filteredProducts = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.brand_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.brand_name && !(p.brand_name || '').toLowerCase().includes(filters.brand_name.toLowerCase())) return false;
    if (filters.name && !p.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.type_name && !(p.type_name || '').toLowerCase().includes(filters.type_name.toLowerCase())) return false;
    if (filters.shelf_life && !(p.shelf_life || '').toLowerCase().includes(filters.shelf_life.toLowerCase())) return false;
    if (filters.barcode && !(p.barcode || '').toLowerCase().includes(filters.barcode.toLowerCase())) return false;
    if (filters.box_barcode && !(p.box_barcode || '').toLowerCase().includes(filters.box_barcode.toLowerCase())) return false;
    if (filters.case_barcode && !(p.case_barcode || '').toLowerCase().includes(filters.case_barcode.toLowerCase())) return false;
    if (filters.unit_type && !p.unit_type.toLowerCase().includes(filters.unit_type.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Package className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Ürün Tanımlama</h1>
      </div>

      <div className="flex gap-3 h-[calc(100vh-140px)]">
        {/* SOL PANEL - Ürün Tablosu */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-w-0">
          {/* Üst butonlar */}
          <div className="p-2 border-b border-gray-200 flex items-center gap-2 flex-wrap">
            {selectedProduct && (
              selectedProduct.active ? (
                <button onClick={handleHideProduct} className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 flex items-center gap-1">
                  <EyeOff size={12} /> Ürünü Gizle
                </button>
              ) : (
                <button onClick={handleActivateProduct} className="px-3 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 flex items-center gap-1">
                  <Eye size={12} /> Ürünü Aktif Yap
                </button>
              )
            )}
            <label className="flex items-center gap-1 text-xs text-gray-600 ml-2">
              <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} className="rounded" />
              Gizli Ürünleri Göster
            </label>
            <div className="flex-1" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ara..." className="w-48 text-xs border border-gray-300 rounded px-2 py-1.5" />
            <button onClick={handleExportExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded text-xs hover:bg-green-600">
              <Download size={12} /> Excel
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Marka</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Ürün Adı</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Ürün Türü</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Raf Ömrü</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">1 Kl.A.</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Alış Fiyatı</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Adet Bar.</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Kutu Bar.</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Koli Bark.</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">KDV</th>
                  <th className="text-left px-2 py-1.5 font-medium text-gray-600 border-b">Birim</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="px-1 py-0.5 border-b"><input value={filters.brand_name} onChange={e => setFilters({ ...filters, brand_name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={filters.type_name} onChange={e => setFilters({ ...filters, type_name: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={filters.shelf_life} onChange={e => setFilters({ ...filters, shelf_life: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={filters.case_quantity} onChange={e => setFilters({ ...filters, case_quantity: e.target.value })} placeholder="=" className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={filters.cost_price} onChange={e => setFilters({ ...filters, cost_price: e.target.value })} placeholder="=" className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={filters.barcode} onChange={e => setFilters({ ...filters, barcode: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={filters.box_barcode} onChange={e => setFilters({ ...filters, box_barcode: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={filters.case_barcode} onChange={e => setFilters({ ...filters, case_barcode: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={filters.kdv_rate} onChange={e => setFilters({ ...filters, kdv_rate: e.target.value })} placeholder="=" className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                  <th className="px-1 py-0.5 border-b"><input value={filters.unit_type} onChange={e => setFilters({ ...filters, unit_type: e.target.value })} placeholder="..." className="w-full text-[10px] border border-gray-300 rounded px-1 py-0.5 font-normal" /></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => handleProductSelect(p)}
                    className={`cursor-pointer border-b border-gray-100 ${selectedProduct?.id === p.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'} ${!p.active ? 'opacity-40' : ''}`}
                  >
                    <td className="px-2 py-1.5">{p.brand_name || ''}</td>
                    <td className="px-2 py-1.5">{p.name}</td>
                    <td className="px-2 py-1.5">{p.type_name || ''}</td>
                    <td className="px-2 py-1.5">{p.shelf_life || ''}</td>
                    <td className="px-2 py-1.5">{p.case_quantity}</td>
                    <td className="px-2 py-1.5">{p.cost_price?.toFixed(4) || '0'}</td>
                    <td className="px-2 py-1.5">{p.barcode || 'YOK'}</td>
                    <td className="px-2 py-1.5">{p.box_barcode || 'YOK'}</td>
                    <td className="px-2 py-1.5">{p.case_barcode || 'YOK'}</td>
                    <td className="px-2 py-1.5">{p.kdv_rate}</td>
                    <td className="px-2 py-1.5">{p.unit_type}</td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={11} className="px-2 py-6 text-center text-gray-400">Ürün bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SAĞ PANEL - Ürün Formu */}
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{isNew ? 'Yeni Ürün' : 'Ürün Düzenle'}</span>
          </div>

          <div className="p-3 space-y-2.5 flex-1">
            {/* Barkodlar */}
            <div>
              <label className="text-xs font-medium text-gray-600">ADET BRKOD</label>
              <input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">BOX BRKOD</label>
              <input value={form.box_barcode} onChange={e => setForm({ ...form, box_barcode: e.target.value })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">KOLİ BRKOD</label>
              <input value={form.case_barcode} onChange={e => setForm({ ...form, case_barcode: e.target.value })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
            </div>

            {/* Ürün Adları */}
            <div>
              <label className="text-xs font-medium text-gray-600">ÜRÜN ADI</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Ürün Adı (KISA)</label>
              <input value={form.short_name} onChange={e => setForm({ ...form, short_name: e.target.value })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
            </div>

            {/* Ürün Türü */}
            <div>
              <label className="text-xs font-medium text-gray-600">Ürün Türü</label>
              <div className="flex gap-1 mt-0.5">
                <select value={form.product_type_id || ''} onChange={e => setForm({ ...form, product_type_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                  <option value="">Seçiniz</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Yeni" className="w-16 text-[10px] border border-gray-300 rounded px-1 py-1" onKeyDown={e => e.key === 'Enter' && handleAddType()} />
                <button onClick={handleAddType} className="px-1.5 py-1 bg-green-500 text-white rounded text-[10px]">Ekle</button>
              </div>
            </div>

            {/* Ürün Marka */}
            <div>
              <label className="text-xs font-medium text-gray-600">Ürün Marka</label>
              <div className="flex gap-1 mt-0.5">
                <select value={form.brand_id || ''} onChange={e => setForm({ ...form, brand_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                  <option value="">Seçiniz</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Yeni" className="w-16 text-[10px] border border-gray-300 rounded px-1 py-1" onKeyDown={e => e.key === 'Enter' && handleAddBrand()} />
                <button onClick={handleAddBrand} className="px-1.5 py-1 bg-green-500 text-white rounded text-[10px]">Ekle</button>
              </div>
            </div>

            {/* Ürün Çeşit */}
            <div>
              <label className="text-xs font-medium text-gray-600">Ürün Çeşit</label>
              <div className="flex gap-1 mt-0.5">
                <select value={form.variety_id || ''} onChange={e => setForm({ ...form, variety_id: e.target.value ? Number(e.target.value) : null })} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                  <option value="">Seçiniz</option>
                  {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <input value={newVarietyName} onChange={e => setNewVarietyName(e.target.value)} placeholder="Yeni" className="w-16 text-[10px] border border-gray-300 rounded px-1 py-1" onKeyDown={e => e.key === 'Enter' && handleAddVariety()} />
                <button onClick={handleAddVariety} className="px-1.5 py-1 bg-green-500 text-white rounded text-[10px]">Ekle</button>
              </div>
            </div>

            {/* Birim Tipi & Birim */}
            <div>
              <label className="text-xs font-medium text-gray-600">BİRİM TİPİ</label>
              <select value={form.unit_type} onChange={e => setForm({ ...form, unit_type: e.target.value })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1">
                {unitTypes.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">BİRİM</label>
              <input value={form.unit_value} onChange={e => setForm({ ...form, unit_value: e.target.value })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
            </div>

            {/* KDV & Fiyat */}
            <div>
              <label className="text-xs font-medium text-gray-600">KDV ORANI</label>
              <input type="number" value={form.kdv_rate} onChange={e => setForm({ ...form, kdv_rate: Number(e.target.value) })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">ALIŞ FİYATI</label>
              <input type="number" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: Number(e.target.value) })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
            </div>

            {/* Varsayılan Birim */}
            <div>
              <label className="text-xs font-medium text-yellow-700 font-bold bg-yellow-100 px-1 rounded">VARS. BİRİM</label>
              <input value={form.default_unit} onChange={e => setForm({ ...form, default_unit: e.target.value })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
            </div>

            {/* Raf Ömrü */}
            <div>
              <label className="text-xs font-medium text-gray-600">RAF ÖMRÜ</label>
              <input value={form.shelf_life} onChange={e => setForm({ ...form, shelf_life: e.target.value })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
            </div>

            {/* Koli/Kutu Adet + Stok No + Spiral Kapasite */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600">1 KOLİ ADET</label>
                <input type="number" value={form.case_quantity} onChange={e => setForm({ ...form, case_quantity: Number(e.target.value) })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">1 KUTU ADET</label>
                <input type="number" value={form.box_quantity} onChange={e => setForm({ ...form, box_quantity: Number(e.target.value) })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600">STOK NUMARASI</label>
                <input value={form.stock_no} onChange={e => setForm({ ...form, stock_no: e.target.value })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">VARS. SPİRAL KAP.</label>
                <input type="number" value={form.default_spiral_capacity} onChange={e => setForm({ ...form, default_spiral_capacity: Number(e.target.value) })} className="w-full mt-0.5 text-xs border border-gray-300 rounded px-2 py-1" />
              </div>
            </div>
          </div>

          {/* Kaydet */}
          <div className="p-3 border-t border-gray-200 space-y-2">
            <button onClick={handleSave} className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              {isNew ? 'Yeni Oluştur' : 'Güncelle'}
            </button>
            {!isNew && (
              <button onClick={handleNewProduct} className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">
                Yeni Ürün
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
