import { AlertTriangle } from 'lucide-react';

export default function IadeSikayet() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="text-blue-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İade ve Şikayet Talepleri</h1>
          <p className="text-sm text-gray-500">İade ve şikayet taleplerini yönetin</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        Bu sayfa yakında aktif olacak
      </div>
    </div>
  );
}
