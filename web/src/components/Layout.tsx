import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import {
  LogIn, Building2, Users, Monitor, Package, Map, Tag, Truck, ArrowLeftRight, Banknote,
  BarChart3, Clock,
  AlertTriangle, Warehouse, Timer, ClipboardCheck, Receipt, CarFront,
  LogOut, Menu, X, ChevronDown
} from 'lucide-react';

interface SubItem {
  to: string;
  icon: any;
  label: string;
}

interface MenuGroup {
  label: string;
  icon: any;
  items: SubItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'Giriş İşlemleri',
    icon: LogIn,
    items: [
      { to: '/firma-tanimlama', icon: Building2, label: 'Firma Tanımlama' },
      { to: '/personel-tanimlama', icon: Users, label: 'Personel Tanımlama' },
      { to: '/otomat-tanimlama', icon: Monitor, label: 'Otomat Tanımlama' },
      { to: '/urun-tanimlama', icon: Package, label: 'Ürün Tanımlama' },
      { to: '/otomat-urun-haritalari', icon: Map, label: 'Otomat Ürün Haritaları' },
      { to: '/urun-fiyat-tanimlama', icon: Tag, label: 'Ürün Fiyat Tanımlama' },
      { to: '/tedarikci-tanimlama', icon: Truck, label: 'Tedarikçi Tanımlama' },
      { to: '/depo-tanimlama', icon: Warehouse, label: 'Depo Tanımlama' },
      { to: '/depo-transfer', icon: ArrowLeftRight, label: 'Depo Transfer İşlemleri' },
      { to: '/tahsilat-giris', icon: Banknote, label: 'Tahsilat Giriş' },
    ]
  },
  {
    label: 'Mali Raporlar',
    icon: BarChart3,
    items: [
      { to: '/otomat-hareketleri', icon: Monitor, label: 'Otomat Hareketleri' },
      { to: '/personel-mesai', icon: Clock, label: 'Personel Mesai İşlemleri' },
    ]
  },
  {
    label: 'Süreç Yönetim Raporları',
    icon: ClipboardCheck,
    items: [
      { to: '/iade-sikayet', icon: AlertTriangle, label: 'İade ve Şikayet Talepleri' },
      { to: '/depo-raporlama', icon: Warehouse, label: 'Depo Raporlama' },
      { to: '/mesai-raporlama', icon: Timer, label: 'Mesai Raporlama' },
      { to: '/depo-sayim-onaylama', icon: ClipboardCheck, label: 'Depo Sayım Onaylama' },
      { to: '/sayim-tahsilat-raporlama', icon: Receipt, label: 'Sayım/Tahsilat Raporlama' },
      { to: '/depo-arac-tanimlama', icon: CarFront, label: 'Depo/Araç Tanımlama' },
    ]
  }
];

const roleLabels: Record<string, string> = {
  admin: 'Yönetici',
  warehouse_manager: 'Depo Sorumlusu',
  field_worker: 'Saha Çalışanı'
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Auto-open the group that contains current route
    const initial: Record<string, boolean> = {};
    menuGroups.forEach(group => {
      const hasActive = group.items.some(item => location.pathname === item.to);
      if (hasActive) initial[group.label] = true;
    });
    // Default: open first group
    if (Object.keys(initial).length === 0) initial['Giriş İşlemleri'] = true;
    return initial;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-blue-600">Efe Otomat</h1>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Otomat Yönetim Sistemi</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuGroups.map(group => {
            const isOpen = openGroups[group.label] || false;
            const hasActive = group.items.some(item => location.pathname === item.to);

            return (
              <div key={group.label}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    hasActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <group.icon size={18} />
                    {group.label}
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Sub items */}
                {isOpen && (
                  <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                    {group.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                            isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`
                        }
                      >
                        <item.icon size={15} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.full_name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500">{roleLabels[user?.role || '']}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 mt-1 w-full text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900">
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold text-blue-600">Efe Otomat</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
