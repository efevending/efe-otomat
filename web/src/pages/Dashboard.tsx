import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Monitor, Package, Users, Warehouse, Truck, ClipboardList, Route, ArrowLeftRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get('/reports/dashboard').then(res => setData(res.data));
  }, []);

  if (!data) return <div className="text-center py-12 text-gray-500">Yükleniyor...</div>;

  const { summary, last7DaysLoadings, recentLoadings, recentCounts } = data;

  const statCards = [
    { label: 'Aktif Makinalar', value: summary.totalMachines, icon: Monitor, color: 'bg-blue-500', link: '/machines' },
    { label: 'Ürün Çeşidi', value: summary.totalProducts, icon: Package, color: 'bg-green-500', link: '/products' },
    { label: 'Kullanıcılar', value: summary.totalUsers, icon: Users, color: 'bg-purple-500', link: '/users' },
    { label: 'Depolar', value: summary.totalWarehouses, icon: Warehouse, color: 'bg-orange-500', link: '/warehouses' },
    { label: 'Bugünkü Yüklemeler', value: summary.todayLoadings, icon: Truck, color: 'bg-cyan-500', link: '/loadings' },
    { label: 'Bugünkü Sayımlar', value: summary.todayCounts, icon: ClipboardList, color: 'bg-pink-500', link: '/counts' },
    { label: 'Aktif Rotalar', value: summary.activeRoutes, icon: Route, color: 'bg-teal-500', link: '/routes' },
    { label: 'Bekleyen Transferler', value: summary.pendingTransfers, icon: ArrowLeftRight, color: 'bg-amber-500', link: '/transfers' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Link key={card.label} to={card.link} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`${card.color} p-2.5 rounded-lg text-white`}>
                <card.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Son 7 Gün Yükleme</h3>
        {last7DaysLoadings.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={last7DaysLoadings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="Yükleme Sayısı" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-center py-8">Henüz yükleme verisi yok</p>
        )}
      </div>

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Yüklemeler</h3>
          <div className="space-y-3">
            {recentLoadings.length === 0 && <p className="text-gray-400 text-sm">Henüz yükleme yok</p>}
            {recentLoadings.slice(0, 5).map((l: any) => (
              <Link key={l.id} to={`/loadings/${l.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{l.machine_name}</p>
                  <p className="text-xs text-gray-500">{l.user_name} - {l.loading_date}</p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{l.machine_no}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Sayımlar</h3>
          <div className="space-y-3">
            {recentCounts.length === 0 && <p className="text-gray-400 text-sm">Henüz sayım yok</p>}
            {recentCounts.slice(0, 5).map((c: any) => (
              <Link key={c.id} to={`/counts/${c.id}/sales`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.machine_name}</p>
                  <p className="text-xs text-gray-500">{c.user_name} - {c.count_date}</p>
                </div>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">{c.machine_no}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
