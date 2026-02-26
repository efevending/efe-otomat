import { useEffect, useState } from 'react';
import api from '../../api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function Reports() {
  const [tab, setTab] = useState<'sales' | 'products' | 'employees' | 'machines'>('products');
  const [productStats, setProductStats] = useState<any[]>([]);
  const [employeeStats, setEmployeeStats] = useState<any[]>([]);
  const [machineStats, setMachineStats] = useState<any[]>([]);

  useEffect(() => {
    api.get('/reports/products').then(r => setProductStats(r.data));
    api.get('/reports/employees').then(r => setEmployeeStats(r.data));
    api.get('/reports/machines').then(r => setMachineStats(r.data));
  }, []);

  const exportExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rapor');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const tabs = [
    { key: 'products', label: 'Ürün Raporu' },
    { key: 'employees', label: 'Çalışan Performansı' },
    { key: 'machines', label: 'Makina Raporu' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Raporlar</h2>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => exportExcel(productStats, 'urun-raporu')} className="flex items-center gap-2 text-sm text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg border border-green-200"><Download size={16} />Excel İndir</button>
          </div>

          {productStats.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="font-semibold mb-4">En Çok Yüklenen Ürünler</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productStats.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total_loaded" fill="#3b82f6" name="Toplam Yükleme" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="font-semibold mb-4">Kategori Dağılımı</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={(() => {
                      const cats = new Map<string, number>();
                      productStats.forEach(p => cats.set(p.category || 'Diğer', (cats.get(p.category || 'Diğer') || 0) + p.total_loaded));
                      return Array.from(cats, ([name, value]) => ({ name, value }));
                    })()} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {Array.from({ length: 10 }, (_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ürün</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kategori</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Maliyet</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Satış Fiyatı</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Toplam Yükleme</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Yükleme Sayısı</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Makina Sayısı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productStats.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category || '-'}</td>
                    <td className="px-4 py-3 text-right">{p.cost_price.toFixed(2)} TL</td>
                    <td className="px-4 py-3 text-right">{p.sale_price.toFixed(2)} TL</td>
                    <td className="px-4 py-3 text-right font-bold">{p.total_loaded}</td>
                    <td className="px-4 py-3 text-right">{p.loading_count}</td>
                    <td className="px-4 py-3 text-right">{p.machine_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => exportExcel(employeeStats, 'calisan-raporu')} className="flex items-center gap-2 text-sm text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg border border-green-200"><Download size={16} />Excel İndir</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Çalışan</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Rota Sayısı</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Yükleme Sayısı</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Sayım Sayısı</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Hizmet Verilen Makina</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employeeStats.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{e.full_name}</td>
                    <td className="px-4 py-3 text-right">{e.route_count}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">{e.loading_count}</td>
                    <td className="px-4 py-3 text-right">{e.count_count}</td>
                    <td className="px-4 py-3 text-right">{e.machines_served}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employeeStats.length === 0 && <div className="text-center py-8 text-gray-400">Çalışan verisi yok</div>}
          </div>
        </div>
      )}

      {tab === 'machines' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => exportExcel(machineStats, 'makina-raporu')} className="flex items-center gap-2 text-sm text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg border border-green-200"><Download size={16} />Excel İndir</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Makina No</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ad</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Depo</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Toplam Yükleme</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Toplam Sayım</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Son Yükleme</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Son Sayım</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {machineStats.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-600">{m.machine_no}</td>
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-gray-500">{m.warehouse_name || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold">{m.total_loadings}</td>
                    <td className="px-4 py-3 text-right">{m.total_counts}</td>
                    <td className="px-4 py-3 text-gray-500">{m.last_loading_date || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{m.last_count_date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
