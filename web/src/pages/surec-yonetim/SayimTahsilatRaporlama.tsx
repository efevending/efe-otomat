import { Receipt } from 'lucide-react';

export default function SayimTahsilatRaporlama() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Receipt className="text-blue-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sayım/Tahsilat Raporlama</h1>
          <p className="text-sm text-gray-500">Sayım ve tahsilat raporlarını görüntüleyin</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        Bu sayfa yakında aktif olacak
      </div>
    </div>
  );
}
