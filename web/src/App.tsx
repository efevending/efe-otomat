import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MachineList from './pages/machines/MachineList';
import MachineDetail from './pages/machines/MachineDetail';
import ProductList from './pages/products/ProductList';
import LoadingList from './pages/loadings/LoadingList';
import LoadingDetail from './pages/loadings/LoadingDetail';
import CountList from './pages/counts/CountList';
import SalesAnalysis from './pages/counts/SalesAnalysis';
import WarehouseList from './pages/warehouses/WarehouseList';
import WarehouseStock from './pages/warehouses/WarehouseStock';
import TransferList from './pages/transfers/TransferList';
import RouteList from './pages/routes/RouteList';
import UserList from './pages/users/UserList';
import Reports from './pages/reports/Reports';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-lg text-gray-500">Yükleniyor...</div></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-lg text-gray-500">Yükleniyor...</div></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="machines" element={<MachineList />} />
        <Route path="machines/:id" element={<MachineDetail />} />
        <Route path="products" element={<ProductList />} />
        <Route path="loadings" element={<LoadingList />} />
        <Route path="loadings/:id" element={<LoadingDetail />} />
        <Route path="counts" element={<CountList />} />
        <Route path="counts/:id/sales" element={<SalesAnalysis />} />
        <Route path="warehouses" element={<WarehouseList />} />
        <Route path="warehouses/:id/stock" element={<WarehouseStock />} />
        <Route path="transfers" element={<TransferList />} />
        <Route path="routes" element={<RouteList />} />
        <Route path="users" element={<UserList />} />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
