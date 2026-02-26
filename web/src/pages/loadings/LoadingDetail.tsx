import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { ArrowLeft } from 'lucide-react';

export default function LoadingDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState<any>(null);

  useEffect(() => { api.get(`/loadings/${id}`).then(r => setLoading(r.data)); }, [id]);

  if (!loading) return <div className="text-center py-12 text-gray-500">Yükleniyor...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/loadings" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Yükleme Detayı</h2>
          <p className="text-sm text-gray-500">{loading.machine_no} - {loading.machine_name} | {loading.loading_date} {loading.loading_time}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold mb-3">Yükleme Bilgileri</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Makina:</dt><dd className="font-medium">{loading.machine_no} - {loading.machine_name}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Çalışan:</dt><dd className="font-medium">{loading.user_name}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Tarih:</dt><dd className="font-medium">{loading.loading_date}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Saat:</dt><dd className="font-medium">{loading.loading_time}</dd></div>
            {loading.notes && <div className="flex justify-between"><dt className="text-gray-500">Not:</dt><dd className="font-medium">{loading.notes}</dd></div>}
          </dl>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold mb-3">Yüklenen Ürünler ({loading.items?.length || 0})</h3>
          <div className="space-y-2">
            {loading.items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <div>
                  <span className="font-medium">{item.product_name}</span>
                  <span className="text-gray-400 ml-2">Spiral {item.spiral_number}</span>
                </div>
                <span className="font-bold text-blue-600">{item.quantity} adet</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t flex justify-between font-semibold text-sm">
            <span>Toplam:</span>
            <span className="text-blue-600">{loading.items?.reduce((s: number, i: any) => s + i.quantity, 0)} adet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
