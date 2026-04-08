import { ArrowLeftRight } from 'lucide-react';

export default function DepoTransfer() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ArrowLeftRight className="text-blue-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Depo Transfer İşlemleri</h1>
          <p className="text-sm text-gray-500">Depolar arası transfer işlemlerini yönetin</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        Bu sayfa yakında aktif olacak
      </div>
    </div>
  );
}
