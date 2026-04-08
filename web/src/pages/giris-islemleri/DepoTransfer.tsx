import { useEffect, useState } from 'react';
import { ArrowLeftRight, Plus, Trash2, Send, Check, X, FileDown, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/client';

interface Warehouse {
  id: number;
  name: string;
  type: string;
  supplier_id: number | null;
  supplier_name: string | null;
}

interface Supplier { id: number; name: string; }
interface Product { id: number; name: string; barcode: string; }

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

interface CompletedRow {
  transfer_id: number;
  from_warehouse_name: string;
  from_warehouse_type: string;
  to_warehouse_name: string;
  to_warehouse_type: string;
  urun_adi: string;
  urun_cesidi: string;
  adet: number;
  alis_fiyati: number;
  ekleyen: string;
  onaylayan: string;
  ekleme_tarihi: string;
  onaylama_tarihi: string;
  fis_notu: string;
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

type TabType = 'transfer_islemi' | 'tamamlanmis_transferler' | 'tamamlanmis_irsaliyeler';

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function DepoTransfer() {
  const [activeTab, setActiveTab] = useState<TabType>('transfer_islemi');
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
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  // Tamamlanmış sekmeler
  const [completedRows, setCompletedRows] = useState<CompletedRow[]>([]);
  const [completedSearch, setCompletedSearch] = useState('');
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [dateStart, setDateStart] = useState(formatDate(thirtyDaysAgo));
  const [dateEnd, setDateEnd] = useState(formatDate(now));

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

  const loadCompleted = async (type: 'transfer' | 'irsaliye') => {
    const res = await api.get('/transfers/completed-detail', {
      params: { type, start_date: dateStart, end_date: dateEnd },
    });
    setCompletedRows(res.data);
  };

  const handleReport = () => {
    if (activeTab === 'tamamlanmis_transferler') loadCompleted('transfer');
    else if (activeTab === 'tamamlanmis_irsaliyeler') loadCompleted('irsaliye');
  };

  // Auto-load when switching tabs
  useEffect(() => {
    if (activeTab === 'tamamlanmis_transferler') loadCompleted('transfer');
    else if (activeTab === 'tamamlanmis_irsaliyeler') loadCompleted('irsaliye');
    setCompletedSearch('');
  }, [activeTab]);

  const getDepotOptions = (type: string) => warehouses.filter(w => w.type === type);

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
    const existing = transferItems.find(i => i.product_id === selectedProductId);
    if (existing) {
      setTransferItems(transferItems.map(i =>
        i.product_id === selectedProductId ? { ...i, quantity: i.quantity + selectedQuantity } : i
      ));
    } else {
      setTransferItems([...transferItems, { product_id: product.id, product_name: product.name, quantity: selectedQuantity }]);
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
    try { await api.post(`/transfers/${id}/approve`); loadAll(); setSelectedTransfer(null); } catch (err: any) { alert(err.response?.data?.error || 'Hata'); }
  };
  const handleReject = async (id: number) => {
    if (!confirm('Bu transferi reddetmek istediğinize emin misiniz?')) return;
    try { await api.post(`/transfers/${id}/reject`); loadAll(); setSelectedTransfer(null); } catch (err: any) { alert(err.response?.data?.error || 'Hata'); }
  };
  const handleComplete = async (id: number) => {
    if (!confirm('Transfer tamamlansın mı? Stoklar güncellenecektir.')) return;
    try { await api.post(`/transfers/${id}/complete`); loadAll(); setSelectedTransfer(null); } catch (err: any) { alert(err.response?.data?.error || 'Hata'); }
  };
  const handleDelete = async (id: number) => {
    if (!confirm('Bu transferi silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/transfers/${id}`); loadAll(); setSelectedTransfer(null); } catch (err: any) { alert(err.response?.data?.error || 'Hata'); }
  };

  const handleSelectTransfer = async (t: Transfer) => {
    try { const res = await api.get(`/transfers/${t.id}`); setSelectedTransfer(res.data); } catch { setSelectedTransfer(t); }
  };

  const typeLabel = (type: string) => DEPOT_TYPES.find(d => d.value === type)?.label || type;

  // Filtreleme
  const filteredCompleted = completedRows.filter(r => {
    if (!completedSearch) return true;
    const s = completedSearch.toLowerCase();
    return (
      r.urun_adi?.toLowerCase().includes(s) ||
      r.from_warehouse_name?.toLowerCase().includes(s) ||
      r.to_warehouse_name?.toLowerCase().includes(s) ||
      r.ekleyen?.toLowerCase().includes(s) ||
      r.onaylayan?.toLowerCase().includes(s) ||
      r.fis_notu?.toLowerCase().includes(s)
    );
  });

  // Excel export
  const handleExcelExport = () => {
    const isIrsaliye = activeTab === 'tamamlanmis_irsaliyeler';
    const data = filteredCompleted.map(r => {
      if (isIrsaliye) {
        return {
          'Ted. Adı': r.from_warehouse_name,
          'Alıcı Depo Adı': r.to_warehouse_name,
          'Ürün Çeşidi': r.urun_cesidi || '',
          'Ürün Adı': r.urun_adi,
          'Adet': r.adet,
          'Alış Fiyatı': r.alis_fiyati || 0,
          'Maliyet': (r.adet * (r.alis_fiyati || 0)).toFixed(2),
          'Ekleyen': r.ekleyen,
          'Ekleme Tarihi': r.ekleme_tarihi,
          'Onaylayan': r.onaylayan || '',
          'Onaylama Tarihi': r.onaylama_tarihi || '',
          'Fiş Notu': r.fis_notu || '',
        };
      }
      return {
        'Gönderici Depo Adı': r.from_warehouse_name,
        'Alıcı Depo Adı': r.to_warehouse_name,
        'Ürün Adı': r.urun_adi,
        'Adet': r.adet,
        'Alış Fiyatı': r.alis_fiyati || 0,
        'Maliyet': (r.adet * (r.alis_fiyati || 0)).toFixed(2),
        'Ekleyen': r.ekleyen,
        'Ekleme Tarihi': r.ekleme_tarihi,
        'Onaylayan': r.onaylayan || '',
        'Onaylama Tarihi': r.onaylama_tarihi || '',
        'Fiş Notu': r.fis_notu || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isIrsaliye ? 'İrsaliyeler' : 'Transferler');
    XLSX.writeFile(wb, `${isIrsaliye ? 'irsaliyeler' : 'transferler'}_${dateStart}_${dateEnd}.xlsx`);
  };

  // Depot seçici bileşeni
  const DepotSelector = ({ type, setType, warehouseId, setWarehouseId, label, color }: {
    type: string; setType: (v: string) => void;
    warehouseId: number | ''; setWarehouseId: (v: number | '') => void;
    label: string; color: string;
  }) => (
    <div>
      <h3 className={`text-sm font-bold ${color} mb-2`}>{label}</h3>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-500">Depo Tipi</label>
          <select value={type} onChange={e => { setType(e.target.value); setWarehouseId(''); }}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5">
            {DEPOT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">{type === 'tedarikci' ? 'Tedarikçi Seçin' : 'Depo Seçin'}</label>
          {type === 'tedarikci' ? (
            <select value={warehouseId}
              onChange={async e => {
                const supId = Number(e.target.value);
                if (supId) { const whId = await ensureSupplierWarehouse(supId); setWarehouseId(whId); }
                else setWarehouseId('');
              }}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5">
              <option value="">-- Seçiniz --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ) : (
            <select value={warehouseId} onChange={e => setWarehouseId(Number(e.target.value) || '')}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5">
              <option value="">-- Seçiniz --</option>
              {getDepotOptions(type).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <ArrowLeftRight className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Depo Transfer İşlemleri</h1>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-0 mb-4">
        {([
          { key: 'transfer_islemi', label: 'TRANSFER İŞLEMİ' },
          { key: 'tamamlanmis_transferler', label: 'TAMAMLANMIŞ TRANSFERLER' },
          { key: 'tamamlanmis_irsaliyeler', label: 'TAMAMLANMIŞ İRSALİYELER' },
        ] as { key: TabType; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 text-sm font-bold border ${activeTab === tab.key
              ? 'bg-teal-700 text-white border-teal-700'
              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
            } ${tab.key === 'transfer_islemi' ? 'rounded-l-lg' : ''} ${tab.key === 'tamamlanmis_irsaliyeler' ? 'rounded-r-lg' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transfer İşlemi Sekmesi */}
      {activeTab === 'transfer_islemi' && (
        <div className="flex flex-col gap-4 h-[calc(100vh-200px)]">
          {/* Transfer Formu */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3 border-r border-gray-200 pr-4">
                <DepotSelector type={fromType} setType={setFromType} warehouseId={fromWarehouseId} setWarehouseId={setFromWarehouseId} label="GÖNDERİCİ DEPO" color="text-red-600" />
              </div>
              <div className="col-span-6">
                <h3 className="text-sm font-bold text-gray-700 mb-2">TRANSFER ÜRÜNLERİ</h3>
                <div className="flex gap-2 mb-2">
                  <select value={selectedProductId} onChange={e => setSelectedProductId(Number(e.target.value) || '')}
                    className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5">
                    <option value="">-- Ürün Seçiniz --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.barcode ? ` (${p.barcode})` : ''}</option>)}
                  </select>
                  <input type="number" min={1} value={selectedQuantity} onChange={e => setSelectedQuantity(Number(e.target.value))}
                    className="w-20 text-sm border border-gray-300 rounded px-2 py-1.5 text-center" placeholder="Adet" />
                  <button onClick={handleAddItem} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1">
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
                            <input type="number" min={1} value={item.quantity}
                              onChange={e => setTransferItems(transferItems.map(i => i.product_id === item.product_id ? { ...i, quantity: Number(e.target.value) || 1 } : i))}
                              className="w-16 text-center text-sm border border-gray-300 rounded px-1 py-0.5" />
                          </td>
                          <td className="px-2 py-1 text-center">
                            <button onClick={() => handleRemoveItem(item.product_id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
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
                  <input value={notes} onChange={e => setNotes(e.target.value)} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1" placeholder="Transfer notu..." />
                </div>
              </div>
              <div className="col-span-3 border-l border-gray-200 pl-4">
                <DepotSelector type={toType} setType={setToType} warehouseId={toWarehouseId} setWarehouseId={setToWarehouseId} label="ALICI DEPO" color="text-green-600" />
                <button onClick={handleCreateTransfer}
                  className="w-full mt-4 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                  <Send size={16} /> TRANSFER OLUŞTUR
                </button>
              </div>
            </div>
          </div>

          {/* Transfer Listesi */}
          <div className="flex-1 flex gap-4 min-h-0">
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
                      <tr key={t.id} onClick={() => handleSelectTransfer(t)}
                        className={`cursor-pointer border-b border-gray-100 ${selectedTransfer?.id === t.id ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}>
                        <td className="px-3 py-2">{t.id}</td>
                        <td className="px-3 py-2"><span className="text-xs text-gray-400">[{typeLabel(t.from_warehouse_type)}]</span> {t.from_warehouse_name}</td>
                        <td className="px-3 py-2"><span className="text-xs text-gray-400">[{typeLabel(t.to_warehouse_type)}]</span> {t.to_warehouse_name}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[t.status]?.color || ''}`}>{STATUS_LABELS[t.status]?.label || t.status}</span>
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

            {selectedTransfer && (
              <div className="w-80 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
                <div className="p-3 border-b border-gray-200">
                  <span className="text-sm font-semibold text-gray-700">Transfer #{selectedTransfer.id} Detay</span>
                </div>
                <div className="flex-1 overflow-auto p-3 space-y-3">
                  <div><label className="text-xs text-gray-500">Gönderici</label><p className="text-sm font-medium">{selectedTransfer.from_warehouse_name}</p></div>
                  <div><label className="text-xs text-gray-500">Alıcı</label><p className="text-sm font-medium">{selectedTransfer.to_warehouse_name}</p></div>
                  <div><label className="text-xs text-gray-500">Durum</label>
                    <p><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[selectedTransfer.status]?.color || ''}`}>{STATUS_LABELS[selectedTransfer.status]?.label || selectedTransfer.status}</span></p>
                  </div>
                  {selectedTransfer.notes && <div><label className="text-xs text-gray-500">Not</label><p className="text-sm">{selectedTransfer.notes}</p></div>}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Ürünler</label>
                    <div className="border border-gray-200 rounded">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50"><tr><th className="text-left px-2 py-1 border-b">Ürün</th><th className="text-center px-2 py-1 border-b w-14">Adet</th></tr></thead>
                        <tbody>
                          {(selectedTransfer.items || []).map((item: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100"><td className="px-2 py-1">{item.product_name}</td><td className="px-2 py-1 text-center">{item.quantity}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2">
                    {selectedTransfer.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(selectedTransfer.id)} className="w-full px-3 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1"><Check size={14} /> ONAYLA</button>
                        <button onClick={() => handleReject(selectedTransfer.id)} className="w-full px-3 py-2 bg-orange-500 text-white rounded text-xs font-bold hover:bg-orange-600 flex items-center justify-center gap-1"><X size={14} /> REDDET</button>
                        <button onClick={() => handleDelete(selectedTransfer.id)} className="w-full px-3 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 flex items-center justify-center gap-1"><Trash2 size={12} /> SİL</button>
                      </>
                    )}
                    {selectedTransfer.status === 'approved' && (
                      <button onClick={() => handleComplete(selectedTransfer.id)} className="w-full px-3 py-2 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 flex items-center justify-center gap-1"><Check size={14} /> TAMAMLA (Stok Güncelle)</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tamamlanmış Transferler / İrsaliyeler Sekmeleri */}
      {(activeTab === 'tamamlanmis_transferler' || activeTab === 'tamamlanmis_irsaliyeler') && (
        <div className="flex flex-col gap-3 h-[calc(100vh-200px)]">
          {/* Üst bar: tarih filtre + butonlar */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-teal-700 bg-teal-50 border border-teal-300 px-3 py-1.5 rounded">
              {activeTab === 'tamamlanmis_transferler' ? 'TAMAMLANMIŞ TRANSFERLER' : 'TAMAMLANMIŞ İRSALİYELER'}
            </span>
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1.5" />
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1.5" />
            <button onClick={handleReport} className="px-5 py-2 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700">RAPORLA</button>
            <button onClick={handleExcelExport} className="px-4 py-2 bg-gray-600 text-white rounded text-sm font-bold hover:bg-gray-700 flex items-center gap-1">
              <FileDown size={14} /> EXCEL'E GÖNDER
            </button>
          </div>

          {/* Arama */}
          <div className="flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <input value={completedSearch} onChange={e => setCompletedSearch(e.target.value)}
              placeholder="Enter text to search..." className="text-sm border border-gray-300 rounded px-3 py-1.5 w-80" />
          </div>

          {/* Tablo */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-0">
            <div className="flex-1 overflow-auto">
              {activeTab === 'tamamlanmis_transferler' ? (
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b">GÖNDERİCİ DEPO ADI</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b">ALICI DEPO ADI</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b">ÜRÜN ADI</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-700 border-b w-16">ADET</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-700 border-b w-20">ALIŞ FİYATI</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-700 border-b w-20">MALİYET</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b w-24">EKLEYEN</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b w-36">EKLEME TARİHİ</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b w-24">ONAYLAYAN</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b w-36">ONAYLAMA TARİHİ</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b">FİŞ NOTU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompleted.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-2 py-1.5">{r.from_warehouse_name}</td>
                        <td className="px-2 py-1.5">{r.to_warehouse_name}</td>
                        <td className="px-2 py-1.5">{r.urun_adi}</td>
                        <td className="px-2 py-1.5 text-right">{r.adet}</td>
                        <td className="px-2 py-1.5 text-right">{(r.alis_fiyati || 0).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right">{(r.adet * (r.alis_fiyati || 0)).toFixed(2)}</td>
                        <td className="px-2 py-1.5">{r.ekleyen}</td>
                        <td className="px-2 py-1.5">{r.ekleme_tarihi}</td>
                        <td className="px-2 py-1.5">{r.onaylayan || ''}</td>
                        <td className="px-2 py-1.5">{r.onaylama_tarihi || ''}</td>
                        <td className="px-2 py-1.5">{r.fis_notu || ''}</td>
                      </tr>
                    ))}
                    {filteredCompleted.length === 0 && (
                      <tr><td colSpan={11} className="px-3 py-6 text-center text-gray-400">Kayıt bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b">TED. ADI</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b">ALICI DEPO ADI</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b w-24">ÜRÜN ÇEŞİDİ</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b">ÜRÜN ADI</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-700 border-b w-16">ADET</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-700 border-b w-20">ALIŞ FİYATI</th>
                      <th className="text-right px-2 py-2 font-semibold text-gray-700 border-b w-20">MALİYET</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b w-24">EKLEYEN</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b w-36">EKLEME TARİHİ</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b w-24">ONAYLAYAN</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b w-36">ONAYLAMA TARİHİ</th>
                      <th className="text-left px-2 py-2 font-semibold text-gray-700 border-b">FİŞ NOTU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompleted.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-2 py-1.5">{r.from_warehouse_name}</td>
                        <td className="px-2 py-1.5">{r.to_warehouse_name}</td>
                        <td className="px-2 py-1.5">{r.urun_cesidi || ''}</td>
                        <td className="px-2 py-1.5">{r.urun_adi}</td>
                        <td className="px-2 py-1.5 text-right">{r.adet}</td>
                        <td className="px-2 py-1.5 text-right">{(r.alis_fiyati || 0).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right">{(r.adet * (r.alis_fiyati || 0)).toFixed(2)}</td>
                        <td className="px-2 py-1.5">{r.ekleyen}</td>
                        <td className="px-2 py-1.5">{r.ekleme_tarihi}</td>
                        <td className="px-2 py-1.5">{r.onaylayan || ''}</td>
                        <td className="px-2 py-1.5">{r.onaylama_tarihi || ''}</td>
                        <td className="px-2 py-1.5">{r.fis_notu || ''}</td>
                      </tr>
                    ))}
                    {filteredCompleted.length === 0 && (
                      <tr><td colSpan={12} className="px-3 py-6 text-center text-gray-400">Kayıt bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
