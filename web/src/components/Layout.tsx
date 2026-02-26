import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { LayoutDashboard, Monitor, Package, Truck, ClipboardList, Warehouse, ArrowLeftRight, Route, Users, BarChart3, LogOut, Menu, X } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'warehouse_manager', 'field_worker'] },
  { to: '/machines', icon: Monitor, label: 'Makinalar', roles: ['admin', 'warehouse_manager', 'field_worker'] },
  { to: '/products', icon: Package, label: 'Ürünler', roles: ['admin', 'warehouse_manager', 'field_worker'] },
  { to: '/loadings', icon: Truck, label: 'Yüklemeler', roles: ['admin', 'warehouse_manager', 'field_worker'] },
  { to: '/counts', icon: ClipboardList, label: 'Sayımlar', roles: ['admin', 'warehouse_manager', 'field_worker'] },
  { to: '/warehouses', icon: Warehouse, label: 'Depolar', roles: ['admin', 'warehouse_manager'] },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transferler', roles: ['admin', 'warehouse_manager'] },
  { to: '/routes', icon: Route, label: 'Rotalar', roles: ['admin', 'field_worker'] },
  { to: '/users', icon: Users, label: 'Kullanıcılar', roles: ['admin'] },
  { to: '/reports', icon: BarChart3, label: 'Raporlar', roles: ['admin', 'warehouse_manager'] },
];

const roleLabels: Record<string, string> = {
  admin: 'Yönetici',
  warehouse_manager: 'Depo Sorumlusu',
  field_worker: 'Saha Çalışanı'
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
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
          {filteredNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
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
