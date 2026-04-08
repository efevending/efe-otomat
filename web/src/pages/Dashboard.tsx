import { useAuth } from '../contexts/AuthContext';
import { LogIn, BarChart3, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const menuSections = [
  {
    title: 'Giriş İşlemleri',
    icon: LogIn,
    color: 'bg-blue-500',
    description: 'Firma, personel, otomat, ürün ve tedarikçi tanımlamaları',
    link: '/firma-tanimlama',
    count: 9,
  },
  {
    title: 'Operasyonel Raporlar',
    icon: BarChart3,
    color: 'bg-emerald-500',
    description: 'Otomat hareketleri ve personel mesai işlemleri',
    link: '/otomat-hareketleri',
    count: 2,
  },
  {
    title: 'Süreç Yönetim Raporları',
    icon: ClipboardCheck,
    color: 'bg-purple-500',
    description: 'İade/şikayet, depo raporlama, sayım ve tahsilat',
    link: '/iade-sikayet',
    count: 6,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hoş Geldiniz, {user?.full_name}</h1>
        <p className="text-gray-500 mt-1">Efe Otomat Yönetim Sistemi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {menuSections.map(section => (
          <div
            key={section.title}
            onClick={() => navigate(section.link)}
            className="bg-white rounded-xl border border-gray-200 p-6 cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 ${section.color} rounded-xl flex items-center justify-center`}>
                <section.icon size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
                <span className="text-xs text-gray-400">{section.count} alt modül</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">{section.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
