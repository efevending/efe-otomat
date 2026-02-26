import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';

export default function MachineDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [machine, setMachine] = useState<any>(null);
  const [maps, setMaps] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/machines/${id}`).then(r => setMachine(r.data));
    api.get(`/product-maps/${id}`).then(r => setMaps(r.data.maps));
    api.get('/products?active=1').then(r => setProducts(r.data));
  }, [id]);

  if (!machine) return <div className="text-center py-12 text-gray-500">Yükleniyor...</div>;

  const totalSpirals = machine.spiral_rows * machine.spiral_cols;

  const handleProductChange = (spiralNumber: number, productId: string) => {
    const existing = maps.find((m: any) => m.spiral_number === spiralNumber);
    if (existing) {
      setMaps(maps.map(m => m.spiral_number === spiralNumber ? { ...m, product_id: productId ? Number(productId) : null, product_name: products.find(p => p.id === Number(productId))?.name || '' } : m));
    } else {
      setMaps([...maps, { spiral_number: spiralNumber, product_id: productId ? Number(productId) : null, product_name: products.find(p => p.id === Number(productId))?.name || '', capacity: 10 }]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = [];
      for (let i = 1; i <= totalSpirals; i++) {
        const map = maps.find(m => m.spiral_number === i);
        payload.push({
          spiral_number: i,
          product_id: map?.product_id || null,
          capacity: map?.capacity || 10
        });
      }
      await api.put(`/product-maps/${id}/bulk`, { maps: payload });
      alert('Ürün haritası kaydedildi!');
    } catch {
      alert('Kaydetme hatası!');
    } finally {
      setSaving(false);
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'field_worker';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/machines" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{machine.name}</h2>
          <p className="text-sm text-gray-500">Makina No: {machine.machine_no} | {machine.location_description || 'Konum belirtilmemiş'} | {machine.spiral_rows}x{machine.spiral_cols} spiral</p>
        </div>
      </div>

      {/* Product Map Editor */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Ürün Haritası</h3>
          {canEdit && (
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Save size={16} />{saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${machine.spiral_cols}, minmax(100px, 1fr))` }}>
              {Array.from({ length: totalSpirals }, (_, i) => {
                const spiralNum = i + 1;
                const row = Math.floor(i / machine.spiral_cols) + 1;
                const col = (i % machine.spiral_cols) + 1;
                const map = maps.find(m => m.spiral_number === spiralNum);

                return (
                  <div key={spiralNum} className="border border-gray-200 rounded-lg p-2 bg-gray-50 hover:bg-blue-50 transition-colors">
                    <div className="text-[10px] text-gray-400 mb-1">S{spiralNum} ({row}-{col})</div>
                    {canEdit ? (
                      <select
                        value={map?.product_id || ''}
                        onChange={e => handleProductChange(spiralNum, e.target.value)}
                        className="w-full text-xs border rounded px-1 py-1 bg-white"
                      >
                        <option value="">Boş</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-xs font-medium text-gray-700 truncate">
                        {map?.product_name || <span className="text-gray-300">Boş</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Machine Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold mb-3">Makina Bilgileri</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Makina No:</dt><dd className="font-medium">{machine.machine_no}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Konum:</dt><dd className="font-medium">{machine.location_description || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Depo:</dt><dd className="font-medium">{machine.warehouse_name || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Durum:</dt><dd className="font-medium">{machine.status}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Spiral:</dt><dd className="font-medium">{machine.spiral_rows} x {machine.spiral_cols} = {totalSpirals}</dd></div>
          </dl>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold mb-3">Hızlı Bağlantılar</h3>
          <div className="space-y-2">
            <Link to={`/loadings?machine_id=${machine.id}`} className="block p-3 rounded-lg bg-blue-50 text-blue-700 text-sm hover:bg-blue-100">Yükleme Geçmişi</Link>
            <Link to={`/counts?machine_id=${machine.id}`} className="block p-3 rounded-lg bg-green-50 text-green-700 text-sm hover:bg-green-100">Sayım Geçmişi</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
