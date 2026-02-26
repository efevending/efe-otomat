import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Play, Square } from 'lucide-react';

export default function RouteList() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<any[]>([]);

  const load = () => { api.get('/routes').then(r => setRoutes(r.data)); };
  useEffect(() => { load(); }, []);

  const startRoute = async () => {
    try {
      await api.post('/routes/start');
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Hata');
    }
  };

  const endRoute = async (id: number) => {
    await api.post(`/routes/${id}/end`);
    load();
  };

  const canStartRoute = user?.role === 'field_worker' || user?.role === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Rotalar</h2>
        {canStartRoute && (
          <button onClick={startRoute} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            <Play size={16} /> Rota Başlat
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Çalışan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Başlangıç</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Bitiş</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Süre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Yükleme</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {routes.map(r => {
              let duration = '-';
              if (r.start_time && r.end_time) {
                const [sh, sm] = r.start_time.split(':').map(Number);
                const [eh, em] = r.end_time.split(':').map(Number);
                const mins = (eh * 60 + em) - (sh * 60 + sm);
                duration = `${Math.floor(mins / 60)}s ${mins % 60}dk`;
              }
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3 font-medium">{r.user_name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.start_time || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.end_time || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{duration}</td>
                  <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{r.loading_count}</span></td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.status === 'active' ? 'Aktif' : 'Tamamlandı'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'active' && (user?.role === 'admin' || user?.id === r.user_id) && (
                      <button onClick={() => endRoute(r.id)} className="flex items-center gap-1 text-red-600 hover:underline text-xs"><Square size={12} />Bitir</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {routes.length === 0 && <div className="text-center py-8 text-gray-400">Rota bulunamadı</div>}
      </div>
    </div>
  );
}
