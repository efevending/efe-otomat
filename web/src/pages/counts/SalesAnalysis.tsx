import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesAnalysis() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => { api.get(`/counts/${id}/sales`).then(r => setData(r.data)); }, [id]);

  if (!data) return <div className="text-center py-12 text-gray-500">Yükleniyor...</div>;

  const { current_count, previous_count, period, sales, summary } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/counts" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Satış Analizi</h2>
          <p className="text-sm text-gray-500">{current_count.machine_no} - {current_count.machine_name} | {period}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg"><ShoppingCart size={20} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{summary.total_sold}</p><p className="text-xs text-gray-500">Toplam Satış</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg"><DollarSign size={20} className="text-green-600" /></div>
            <div><p className="text-2xl font-bold">{summary.total_revenue.toFixed(0)} TL</p><p className="text-xs text-gray-500">Toplam Ciro</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg"><BarChart3 size={20} className="text-red-600" /></div>
            <div><p className="text-2xl font-bold">{summary.total_cost.toFixed(0)} TL</p><p className="text-xs text-gray-500">Toplam Maliyet</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg"><TrendingUp size={20} className="text-purple-600" /></div>
            <div><p className="text-2xl font-bold">{summary.total_profit.toFixed(0)} TL</p><p className="text-xs text-gray-500">Toplam Kar</p></div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {sales.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Ürün Bazlı Satış</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sales.slice(0, 15)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="product_name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any, name?: string) => [name === 'revenue' ? `${value.toFixed(2)} TL` : value, name === 'sold' ? 'Satış Adedi' : 'Ciro']} />
              <Bar dataKey="sold" fill="#3b82f6" name="Satış Adedi" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Period Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border text-sm">
          <h4 className="font-semibold mb-2">Mevcut Sayım</h4>
          <p>Tarih: {current_count.count_date} {current_count.count_time}</p>
        </div>
        {previous_count && (
          <div className="bg-white rounded-xl p-4 shadow-sm border text-sm">
            <h4 className="font-semibold mb-2">Önceki Sayım</h4>
            <p>Tarih: {previous_count.count_date} {previous_count.count_time}</p>
          </div>
        )}
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ürün</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Önceki Stok</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Yüklenen</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Mevcut Stok</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Satılan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Birim Fiyat</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ciro</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Kar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map((s: any) => (
                <tr key={s.product_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.product_name}</td>
                  <td className="px-4 py-3 text-right">{s.previous_count}</td>
                  <td className="px-4 py-3 text-right text-blue-600">+{s.loaded}</td>
                  <td className="px-4 py-3 text-right">{s.current_count}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{s.sold}</td>
                  <td className="px-4 py-3 text-right">{s.sale_price.toFixed(2)} TL</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{s.revenue.toFixed(2)} TL</td>
                  <td className="px-4 py-3 text-right text-purple-600">{s.profit.toFixed(2)} TL</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              <tr>
                <td className="px-4 py-3">Toplam</td>
                <td className="px-4 py-3 text-right" colSpan={3}></td>
                <td className="px-4 py-3 text-right text-red-600">{summary.total_sold}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right text-green-600">{summary.total_revenue.toFixed(2)} TL</td>
                <td className="px-4 py-3 text-right text-purple-600">{summary.total_profit.toFixed(2)} TL</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {sales.length === 0 && <div className="text-center py-8 text-gray-400">Satış verisi bulunamadı</div>}
      </div>
    </div>
  );
}
