import { useEffect, useState } from 'react';
import { ArrowLeftRight, Plus, Trash2, Send, Check, X } from 'lucide-react';
import api from '../../api/client';

interface Warehouse {
  id: number;
  name: string;
  type: string;
  address: string;
  supplier_id: number | null;
  supplier_name: string | null;
}

interface Supplier {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  barcode: string;
}

interface TransferItem {
  product_id: number;
  product_name: string;
  quantity: number;
}

interface Transfer {
  id: number;
  from_warehouse_name: string;
  from_warehouse_type: string;
  to_warehouse_name: string;
  to_warehouse_type: string;
  status: string;
  requested_by_name: string;
  approved_by_name: string | null;
  notes: string;
  created_at: string;
  items?: TransferItem[];
}

const DEPOT_TYPES = [
  { value: 'sanal', label: 'Sanal Depo' },
  { value: 'sabit', label: 'Sabit Depo' },
  { value: 'tedarikci', label: 'Tedarikçi' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Onaylandı', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
};

export default function DepoTransfer() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  // Form state
  const [fromType, setFromType] = useState('sanal');
  const [toType, setToType] = useState('sabit');
  const [fromWarehouseId, setFromWarehouseId] = useState<number | ''>('');
  const [toWarehouseId, setToWarehouseId] = useState<number | ''>('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState('');

  // Ürün ekleme
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Detay
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [whRes, supRes, prodRes, trRes] = await Promise.all([
      api.get('/warehouses'),
      api.get('/suppliers'),
      api.get('/products'),
      api.get('/transfers'),
    ]);
    setWarehouses(whRes.data);
    setSuppliers(supRes.data);
    setProducts(prodRes.data);
    setTransfers(trRes.data);
  };

  // Gönderici/Alıcı depo listesi
  const getDepotOptions = (type: string) => {
    if (type === 'tedarikci') {
      // Tedarikçi seçildiğinde tedarikçi listesinden göster
      // Ama tedarikçiye ait depo kaydı lazım
      return warehouses.filter(w => w.type === 'tedarikci');
    }
    return warehouses.filter(w => w.type === type);
  };

  // Tedarikçi seçildiğinde, o tedarikçiye ait depo yoksa oluştur
  const ensureSupplierWarehouse = async (supplierId: number): Promise<number> => {
    const existing = warehouses.find(w => w.type === 'tedarikci' && w.supplier_id === supplierId);
    if (existing) return existing.id;

    const supplier = suppliers.find(s => s.id === supplierId);
    const res = await api.post('/warehouses', {
      name: `${supplier?.name || 'Tedarikçi'} Deposu`,
      type: 'tedarikci',
      supplier_id: supplierId,
    });
    await loadAll();
    return res.data.id;
  };

  const handleAddItem = () => {
    if (!selectedProductId || selectedQuantity <= 0) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    // Aynı ürün varsa miktarı artır
    const existing = transferItems.find(i => i.product_id === selectedProductId);
    if (existing) {
      setTransferItems(transferItems.map(i =>
        i.product_id === selectedProductId ? { ...i, quantity: i.quantity + selectedQuantity } : i
      ));
    } else {
      setTransferItems([...transferItems, {
        product_id: product.id,
        product_name: product.name,
        quantity: selectedQuantity,
      }]);
    }
    setSelectedProductId('');
    setSelectedQuantity(1);
  };

  const handleRemoveItem = (productId: number) => {
    setTransferItems(transferItems.filter(i => i.product_id !== productId));
  };

  const handleCreateTransfer = async () => {
    if (!fromWarehouseId || !toWarehouseId) return alert('Gönderici ve alıcı depo seçiniz');
    if (fromWarehouseId === toWarehouseId) return alert('Gönderici ve alıcı depo aynı olamaz');
    if (transferItems.length === 0) return alert('En az bir ürün ekleyiniz');

    try {
      await api.post('/transfers', {
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        items: transferItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        notes,
      });
      setTransferItems([]);
      setNotes('');
      setFromWarehouseId('');
      setToWarehouseId('');
      loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata oluştu');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/transfers/${id}/approve`);
      loadAll();
      setSelectedTransfer(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata');
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Bu transferi reddetmek istediğinize emin misiniz?')) return;
    try {
      await api.post(`/transfers/${id}/reject`);
      loadAll();
      setSelectedTransfer(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata');
    }
  };

  const handleComplete = async (id: number) => {
    if (!confirm('Transfer tamamlansın mı? Stoklar güncellenecektir.')) return;
    try {
      await api.post(`/transfers/${id}/complete`);
      loadAll();
      setSelectedTransfer(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu transferi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/transfers/${id}`);
      loadAll();
      setSelectedTransfer(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata');
    }
  };

  const handleSelectTransfer = async (t: Transfer) => {
    try {
      const res = await api.get(`/transfers/${t.id}`);
      setSelectedTransfer(res.data);
    } catch {
      setSelectedTransfer(t);
    }
  };

  const typeLabel = (type: string) => DEPOT_TYPES.find(d => d.value === type)?.label || type;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <ArrowLeftRight className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Depo Transfer İşlemleri</h1>
      </div>

      <div className="flex flex-col gap-4 h-[calc(100vh-140px)]">
        {/* ÜST - Transfer Formu */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Sol - Gönderici Depo */}
            <div className="col-span-3 border-r border-gray-200 pr-4">
              <h3 className="text-sm font-bold text-red-600 mb-2">GÖNDERİCİ DEPO</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Depo Tipi</label>
                  <select
                    value={fromType}
                    onChange={e => { setFromType(e.target.value); setFromWarehouseId(''); }}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                  >
                    {DEPOT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    {fromType === 'tedarikci' ? 'Tedarikçi Seçin' : 'Depo Seçin'}
                  </label>
                  {fromType === 'tedarikci' ? (
                    <select
                      value={fromWarehouseId}
                      onChange={async e => {
                        const supId = Number(e.target.value);
                        if (supId) {
                          const whId = await ensureSupplierWarehouse(supId);
                          setFromWarehouseId(whId);
                        } else {
                          setFromWarehouseId('');
                        }
                      }}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Seçiniz --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={fromWarehouseId}
                      onChange={e => setFromWarehouseId(Number(e.target.value) || '')}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Seçiniz --</option>
                      {getDepotOptions(fromType).map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Orta - Ürünler */}
            <div className="col-span-6">
              <h3 className="text-sm font-bold text-gray-700 mb-2">TRANSFER ÜRÜNLERİ</h3>
              <div className="flex gap-2 mb-2">
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(Number(e.target.value) || '')}
                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5"
                >
                  <option value="">-- Ürün Seçiniz --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.barcode ? ` (${p.barcode})` : ''}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={selectedQuantity}
                  onChange={e => setSelectedQuantity(Number(e.target.value))}
                  className="w-20 text-sm border border-gray-300 rounded px-2 py-1.5 text-center"
                  placeholder="Adet"
                />
                <button
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Ekle
                </button>
              </div>

              <div className="border border-gray-200 rounded max-h-32 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1 font-medium text-gray-600 border-b">Ürün</th>
                      <th className="text-center px-2 py-1 font-medium text-gray-600 border-b w-20">Adet</th>
                      <th className="text-center px-2 py-1 font-medium text-gray-600 border-b w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferItems.map(item => (
                      <tr key={item.product_id} className="border-b border-gray-100">
                        <td className="px-2 py-1">{item.product_name}</td>
                        <td className="px-2 py-1 text-center">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={e => setTransferItems(transferItems.map(i =>
                              i.product_id === item.product_id ? { ...i, quantity: Number(e.target.value) || 1 } : i
                            ))}
                            className="w-16 text-center text-sm border border-gray-300 rounded px-1 py-0.5"
                          />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button onClick={() => handleRemoveItem(item.product_id)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {transferItems.length === 0 && (
                      <tr><td colSpan={3} className="px-2 py-3 text-center text-gray-400 text-xs">Ürün eklenmedi</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-gray-500">Not:</label>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                  placeholder="Transfer notu..."
                />
              </div>
            </div>

            {/* Sağ - Alıcı Depo + Buton */}
            <div className="col-span-3 border-l border-gray-200 pl-4">
              <h3 className="text-sm font-bold text-green-600 mb-2">ALICI DEPO</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Depo Tipi</label>
                  <select
                    value={toType}
                    onChange={e => { setToType(e.target.value); setToWarehouseId(''); }}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                  >
                    {DEPOT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    {toType === 'tedarikci' ? 'Tedarikçi Seçin' : 'Depo Seçin'}
                  </label>
                  {toType === 'tedarikci' ? (
                    <select
                      value={toWarehouseId}
                      onChange={async e => {
                        const supId = Number(e.target.value);
                        if (supId) {
                          const whId = await ensureSupplierWarehouse(supId);
                          setToWarehouseId(whId);
                        } else {
                          setToWarehouseId('');
                        }
                      }}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Seçiniz --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={toWarehouseId}
                      onChange={e => setToWarehouseId(Number(e.target.value) || '')}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Seçiniz --</option>
                      {getDepotOptions(toType).map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <button
                onClick={handleCreateTransfer}
                className="w-full mt-4 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Send size={16} /> TRANSFER OLUŞTUR
              </button>
            </div>
          </div>
        </div>

        {/* ALT - Transfer Geçmişi */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Transfer Listesi */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
            <div className="p-2 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700 text-center block">Transfer Geçmişi ({transfers.length})</span>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 border-b w-10">#</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Gönderici</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 border-b">Alıcı</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 border-b w-24">Durum</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 border-b w-28">Talep Eden</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 border-b w-36">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map(t => (
                    <tr
                      key={t.id}
                      onClick={() => handleSelectTransfer(t)}
                      className={`cursor-pointer border-b border-gray-100 ${selectedTransfer?.id === t.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-2">{t.id}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-gray-400">[{typeLabel(t.from_warehouse_type)}]</span> {t.from_warehouse_name}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-gray-400">[{typeLabel(t.to_warehouse_type)}]</span> {t.to_warehouse_name}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[t.status]?.color || ''}`}>
                          {STATUS_LABELS[t.status]?.label || t.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">{t.requested_by_name}</td>
                      <td className="px-3 py-2 text-xs">{t.created_at}</td>
                    </tr>
                  ))}
                  {transfers.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Henüz transfer yok</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transfer Detay */}
          {selectedTransfer && (
            <div className="w-80 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
              <div className="p-3 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Transfer #{selectedTransfer.id} Detay</span>
              </div>
              <div className="flex-1 overflow-auto p-3 space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Gönderici</label>
                  <p className="text-sm font-medium">{selectedTransfer.from_warehouse_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Alıcı</label>
                  <p className="text-sm font-medium">{selectedTransfer.to_warehouse_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Durum</label>
                  <p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[selectedTransfer.status]?.color || ''}`}>
                      {STATUS_LABELS[selectedTransfer.status]?.label || selectedTransfer.status}
                    </span>
                  </p>
                </div>
                {selectedTransfer.notes && (
                  <div>
                    <label className="text-xs text-gray-500">Not</label>
                    <p className="text-sm">{selectedTransfer.notes}</p>
                  </div>
                )}

                {/* Ürünler */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ürünler</label>
                  <div className="border border-gray-200 rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-2 py-1 border-b">Ürün</th>
                          <th className="text-center px-2 py-1 border-b w-14">Adet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedTransfer.items || []).map((item: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="px-2 py-1">{item.product_name}</td>
                            <td className="px-2 py-1 text-center">{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Aksiyonlar */}
                <div className="space-y-2 pt-2">
                  {selectedTransfer.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(selectedTransfer.id)}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        <Check size={14} /> ONAYLA
                      </button>
                      <button
                        onClick={() => handleReject(selectedTransfer.id)}
                        className="w-full px-3 py-2 bg-orange-500 text-white rounded text-xs font-bold hover:bg-orange-600 flex items-center justify-center gap-1"
                      >
                        <X size={14} /> REDDET
                      </button>
                      <button
                        onClick={() => handleDelete(selectedTransfer.id)}
                        className="w-full px-3 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 flex items-center justify-center gap-1"
                      >
                        <Trash2 size={12} /> SİL
                      </button>
                    </>
                  )}
                  {selectedTransfer.status === 'approved' && (
                    <button
                      onClick={() => handleComplete(selectedTransfer.id)}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> TAMAMLA (Stok Güncelle)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
