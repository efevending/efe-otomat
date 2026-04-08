import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Giriş İşlemleri
import FirmaTanimlama from './pages/giris-islemleri/FirmaTanimlama';
import PersonelTanimlama from './pages/giris-islemleri/PersonelTanimlama';
import OtomatTanimlama from './pages/giris-islemleri/OtomatTanimlama';
import UrunTanimlama from './pages/giris-islemleri/UrunTanimlama';
import OtomatUrunHaritalari from './pages/giris-islemleri/OtomatUrunHaritalari';
import UrunFiyatTanimlama from './pages/giris-islemleri/UrunFiyatTanimlama';
import TedarikciTanimlama from './pages/giris-islemleri/TedarikciTanimlama';
import DepoTransfer from './pages/giris-islemleri/DepoTransfer';
import TahsilatGiris from './pages/giris-islemleri/TahsilatGiris';

// Mali Raporlar
import OtomatHareketleri from './pages/mali-raporlar/OtomatHareketleri';
import PersonelMesai from './pages/mali-raporlar/PersonelMesai';

// Süreç Yönetim Raporları
import IadeSikayet from './pages/surec-yonetim/IadeSikayet';
import DepoRaporlama from './pages/surec-yonetim/DepoRaporlama';
import MesaiRaporlama from './pages/surec-yonetim/MesaiRaporlama';
import DepoSayimOnaylama from './pages/surec-yonetim/DepoSayimOnaylama';
import SayimTahsilatRaporlama from './pages/surec-yonetim/SayimTahsilatRaporlama';
import DepoAracTanimlama from './pages/surec-yonetim/DepoAracTanimlama';

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
        {/* Ana Sayfa */}
        <Route index element={<Dashboard />} />

        {/* Giriş İşlemleri */}
        <Route path="firma-tanimlama" element={<FirmaTanimlama />} />
        <Route path="personel-tanimlama" element={<PersonelTanimlama />} />
        <Route path="otomat-tanimlama" element={<OtomatTanimlama />} />
        <Route path="urun-tanimlama" element={<UrunTanimlama />} />
        <Route path="otomat-urun-haritalari" element={<OtomatUrunHaritalari />} />
        <Route path="urun-fiyat-tanimlama" element={<UrunFiyatTanimlama />} />
        <Route path="tedarikci-tanimlama" element={<TedarikciTanimlama />} />
        <Route path="depo-transfer" element={<DepoTransfer />} />
        <Route path="tahsilat-giris" element={<TahsilatGiris />} />

        {/* Mali Raporlar */}
        <Route path="otomat-hareketleri" element={<OtomatHareketleri />} />
        <Route path="personel-mesai" element={<PersonelMesai />} />

        {/* Süreç Yönetim Raporları */}
        <Route path="iade-sikayet" element={<IadeSikayet />} />
        <Route path="depo-raporlama" element={<DepoRaporlama />} />
        <Route path="mesai-raporlama" element={<MesaiRaporlama />} />
        <Route path="depo-sayim-onaylama" element={<DepoSayimOnaylama />} />
        <Route path="sayim-tahsilat-raporlama" element={<SayimTahsilatRaporlama />} />
        <Route path="depo-arac-tanimlama" element={<DepoAracTanimlama />} />
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
